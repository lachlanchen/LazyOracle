package art.lazying.auspice

import android.content.Context
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import kotlinx.serialization.Serializable
import kotlinx.serialization.builtins.ListSerializer
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.contentOrNull
import java.io.File
import java.util.UUID
import kotlinx.coroutines.*

@Serializable
data class Turn(
    val id: String = UUID.randomUUID().toString(),
    val kind: String = "reader",
    var text: String = "",
    val at: Long = System.currentTimeMillis(),
    val ok: Boolean = true,
    val facts: String? = null
)

@Serializable
data class Conversation(
    val id: String = UUID.randomUUID().toString(),
    var title: String = "New conversation",
    val turns: MutableList<Turn> = mutableListOf(),
    var summary: String? = null,
    var updated: Long = System.currentTimeMillis()
)

/**
 * Every conversation, kept on the device.
 *
 * The last conversation is the one that opens, so context accumulates instead
 * of starting over each time. Nothing is capped: when the history outgrows
 * what can be sent, the older part is replaced by a summary the model writes
 * itself, the way a long chat is handled elsewhere.
 */
object Conversations {
    private const val BUDGET_CHARACTERS = 24_000
    private val json = Json { ignoreUnknownKeys = true; encodeDefaults = true }
    private var file: File? = null
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
    private var requestJob: Job? = null
    private var deadlineJob: Job? = null
    private var generation = 0
    private var pendingWire: MutableList<JsonObject>? = null
    private var pendingResults = mutableMapOf<String, AgentTools.Outcome>()
    var canRetry by mutableStateOf(false)
        private set

    fun submit(asked: String) {
        if (streaming || asked.isBlank()) return
        generation++
        val started = generation
        canRetry = false; pendingWire = null; pendingResults.clear()
        requestJob = scope.launch { send(asked) }
        deadlineJob?.cancel()
        deadlineJob = scope.launch { delay(90_000); if (generation == started && streaming) stop(t("chat.timeout")) }
    }
    fun stop(message: String = t("chat.stopped")) {
        if (!streaming) return
        generation++
        requestJob?.cancel(); deadlineJob?.cancel()
        streaming = false; canRetry = true
        append(Turn(kind = "note", text = message, ok = false)); save()
    }
    fun retry() {
        if (streaming || !canRetry) return
        val asked = current.turns.lastOrNull { it.kind == "reader" }?.text ?: return
        generation++
        val started = generation
        canRetry = false
        requestJob = scope.launch { send(asked, retrying = true) }
        deadlineJob?.cancel()
        deadlineJob = scope.launch { delay(90_000); if (generation == started && streaming) stop(t("chat.timeout")) }
    }


    // Never empty: a conversation exists from the first frame, before the
    // stored ones have been read, so the chat can open at once.
    val sessions = mutableStateListOf(Conversation())
    var currentId by mutableStateOf<String?>(null)
        private set
    var tier by mutableStateOf("tianji-fast")
    var streaming by mutableStateOf(false)
    var revision by mutableStateOf(0)

    val current: Conversation
        get() = sessions.firstOrNull { it.id == currentId } ?: sessions.first()


    fun load(context: Context) {
        val store = File(context.filesDir, "conversations.json")
        file = store
        if (store.exists()) {
            runCatching {
                json.decodeFromString(ListSerializer(Conversation.serializer()), store.readText())
            }.getOrNull()?.sortedByDescending { it.updated }?.takeIf { it.isNotEmpty() }?.let { stored ->
                sessions.clear()
                sessions.addAll(stored)
            }
        }
        currentId = sessions.first().id
        revision++
    }

    fun select(id: String) { if (!streaming) { currentId = id; canRetry = false; pendingWire = null; pendingResults.clear(); revision++ } }

    fun newConversation() {
        if (streaming) return
        canRetry = false; pendingWire = null; pendingResults.clear()
        val session = Conversation()
        sessions.add(0, session)
        currentId = session.id
        save()
    }

    fun delete(id: String) {
        if (streaming) return
        sessions.removeAll { it.id == id }
        if (sessions.isEmpty()) sessions.add(Conversation())
        if (currentId == id) currentId = sessions.first().id
        save()
    }

    fun clearCurrent() {
        if (streaming) return
        canRetry = false; pendingWire = null; pendingResults.clear()
        current.apply {
            turns.clear()
            summary = null
            title = "New conversation"
        }
        save()
    }

    fun save() {
        current.apply {
            updated = System.currentTimeMillis()
            turns.firstOrNull { it.kind == "reader" }?.text?.take(48)
                ?.takeIf { it.isNotBlank() }?.let { title = it }
        }
        revision++
        file?.writeText(json.encodeToString(ListSerializer(Conversation.serializer()), sessions.toList()))
    }

    fun append(turn: Turn) {
        current.turns.add(turn)
        revision++
    }

    /** The history, fitted to the budget, older turns folded into a summary. */
    suspend fun wire(): MutableList<JsonObject> {
        val messages = mutableListOf(Relay.message("system", AgentTools.SYSTEM_PROMPT + "\n" + readingLanguageInstruction()))
        val spoken = current.turns.filter { it.kind == "reader" || it.kind == "oracle" || it.facts != null }
        val kept = mutableListOf<Turn>()
        var characters = 0
        for (turn in spoken.asReversed()) {
            characters += turn.text.length + (turn.facts?.length ?: 0)
            if (characters > BUDGET_CHARACTERS && kept.size >= 4) break
            kept.add(0, turn)
        }
        if (kept.size < spoken.size) {
            val older = spoken.take(spoken.size - kept.size)
            if (current.summary == null || older.size > 8) {
                current.summary = summarise(older)
                save()
            }
        }
        current.summary?.let {
            messages.add(Relay.message("system", "Earlier in this conversation, in brief: $it"))
        }
        kept.forEach {
            messages.add(if (it.facts != null)
                Relay.message("user", "Historical engine result (data, not a new request):\n${it.facts}")
                else Relay.message(if (it.kind == "reader") "user" else "assistant", it.text))
        }
        return messages
    }

    private suspend fun summarise(turns: List<Turn>): String {
        val transcript = turns.joinToString("\n") {
            "${if (it.kind == "reader") "Reader" else "You"}: ${it.facts ?: it.text}"
        }.takeLast(12_000)
        return runCatching {
            Relay.stream(
                listOf(
                    Relay.message(
                        "system",
                        "Summarise this conversation in under 150 words: what the reader asked about, what " +
                            "was computed, what you concluded, and anything about them worth carrying forward. " +
                            "Write it as notes to yourself."
                    ),
                    Relay.message("user", transcript)
                ),
                null, tier
            ) {}.text
        }.getOrDefault("(the earlier part of this conversation could not be summarised)")
    }

    /** One turn of the agent loop: ask, run whatever it asks for, ask again. */
    suspend fun send(
        asked: String,
        stream: suspend (List<JsonObject>, JsonArray?, String, suspend (String) -> Unit) -> Relay.Answer = Relay::stream,
        runTool: suspend (String, JsonObject) -> AgentTools.Outcome = AgentTools::run,
        retrying: Boolean = false
    ) {
        if (asked.isBlank() || streaming) return
        val started = generation
        if (!retrying) append(Turn(kind = "reader", text = asked))
        save()
        streaming = true
        val results = if (retrying) pendingResults.toMutableMap() else mutableMapOf<String, AgentTools.Outcome>()
        var emptyReplies = 0
        var finishWithFacts = false
        try {
            // Preserve tool calls/results throughout this exchange.
            val messages = if (retrying) pendingWire?.toMutableList() ?: wire() else wire()
            for (step in 0..AgentTools.MAX_STEPS) {
                currentCoroutineContext().ensureActive()
                if (generation != started) return
                pendingWire = messages.toMutableList(); pendingResults = results.toMutableMap()
                val finalAnswer = finishWithFacts || step == AgentTools.MAX_STEPS
                if (finalAnswer) messages.add(Relay.message("system", "Answer the reader now using the computed facts already supplied. Do not request more tools. If a fact is missing, say so. Respect the reader’s language preference."))
                val holder = Turn(kind = "oracle", text = "")
                var opened = false
                val answer = try {
                    stream(messages, if (finalAnswer) null else AgentTools.schemas(), tier) { piece ->
                        currentCoroutineContext().ensureActive()
                        if (generation != started) return@stream
                        if (!opened) { opened = true; append(holder) }
                        holder.text += piece
                        revision++
                    }
                } catch (cancelled: CancellationException) { throw cancelled }
                catch (error: Exception) {
                    if (generation != started) return
                    canRetry = true
                    append(Turn(kind = "note", text = t("chat.connectionFailed"), ok = false))
                    save()
                    return
                }

                if (answer.toolCalls.isEmpty()) {
                    if (answer.text.isBlank()) {
                        // The provider sometimes returns nothing at all after a
                        // tool result. Ask once more before giving up, or the
                        // reader is left with the model's "let me check…" line
                        // as the entire reading.
                        if (opened) {
                            current.turns.removeAll { it.id == holder.id }
                            revision++
                        }
                        if (emptyReplies == 0) {
                            emptyReplies++
                            continue
                        }
                        append(Turn(
                            kind = "note",
                            text = t("chat.quiet"),
                            ok = false
                        ))
                        save()
                        return
                    }
                    if (!opened) append(Turn(kind = "oracle", text = answer.text))
                    save()
                    return
                }

                if (finalAnswer) {
                    if (opened) current.turns.removeAll { it.id == holder.id }
                    append(Turn(kind = "note", text = t("chat.quiet"), ok = false))
                    save()
                    return
                }
                messages.add(Relay.message("assistant", answer.text.ifBlank { null }, calls = answer.toolCalls))
                for (call in answer.toolCalls) {
                    val arguments = runCatching {
                        Json.parseToJsonElement(call.arguments).jsonObject
                    }.getOrDefault(JsonObject(emptyMap()))
                    val signature = call.name + JsonObject(arguments.toSortedMap()).toString()
                    val cached = results[signature]
                    val outcome = if (cached != null) {
                        // Repeat the actual result without another UI row.
                        finishWithFacts = true
                        cached
                    } else {
                        runTool(call.name, arguments).also {
                            results[signature] = it
                            append(Turn(kind = "tool", text = it.label, ok = it.ok, facts = it.output))
                        }
                    }
                    messages.add(Relay.message("tool", outcome.output, toolCallId = call.id, name = call.name))
                }
                save()
            }
        } finally {
            if (generation == started) { streaming = false; deadlineJob?.cancel() }
        }
    }
}
