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
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.contentOrNull
import java.io.File
import java.util.UUID

@Serializable
data class Turn(
    val id: String = UUID.randomUUID().toString(),
    val kind: String = "reader",
    var text: String = "",
    val at: Long = System.currentTimeMillis(),
    val ok: Boolean = true
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

    fun select(id: String) { currentId = id; revision++ }

    fun newConversation() {
        val session = Conversation()
        sessions.add(0, session)
        currentId = session.id
        save()
    }

    fun delete(id: String) {
        sessions.removeAll { it.id == id }
        if (sessions.isEmpty()) sessions.add(Conversation())
        if (currentId == id) currentId = sessions.first().id
        save()
    }

    fun clearCurrent() {
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
        val messages = mutableListOf(Relay.message("system", AgentTools.SYSTEM_PROMPT))
        val spoken = current.turns.filter { it.kind == "reader" || it.kind == "oracle" }
        val kept = mutableListOf<Turn>()
        var characters = 0
        for (turn in spoken.asReversed()) {
            characters += turn.text.length
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
            messages.add(Relay.message(if (it.kind == "reader") "user" else "assistant", it.text))
        }
        return messages
    }

    private suspend fun summarise(turns: List<Turn>): String {
        val transcript = turns.joinToString("\n") {
            "${if (it.kind == "reader") "Reader" else "You"}: ${it.text}"
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
    suspend fun send(asked: String) {
        if (asked.isBlank() || streaming) return
        append(Turn(kind = "reader", text = asked))
        save()
        streaming = true
        val attempted = mutableSetOf<String>()
        try {
            for (step in 0 until AgentTools.MAX_STEPS) {
                val messages = wire()
                val holder = Turn(kind = "oracle", text = "")
                var opened = false
                val answer = try {
                    Relay.stream(messages, AgentTools.schemas(), tier) { piece ->
                        if (!opened) { opened = true; append(holder) }
                        holder.text += piece
                        revision++
                    }
                } catch (error: Throwable) {
                    append(Turn(kind = "note", text = error.message ?: "The reading failed.", ok = false))
                    save()
                    return
                }

                if (answer.toolCalls.isEmpty()) {
                    if (!opened && answer.text.isNotBlank()) {
                        append(Turn(kind = "oracle", text = answer.text))
                    }
                    save()
                    return
                }

                for (call in answer.toolCalls) {
                    val signature = call.name + call.arguments
                    val arguments = runCatching {
                        Json.parseToJsonElement(call.arguments).jsonObject
                    }.getOrDefault(JsonObject(emptyMap()))
                    val outcome = if (!attempted.add(signature)) {
                        AgentTools.Outcome(
                            "Already computed",
                            """{"note":"You already called this with these arguments. Answer with what you have."}""",
                            false
                        )
                    } else {
                        AgentTools.run(call.name, arguments)
                    }
                    append(Turn(kind = "tool", text = outcome.label, ok = outcome.ok))
                    messages.add(Relay.message("assistant", answer.text.ifBlank { null }, call = call))
                    messages.add(Relay.message("tool", outcome.output, toolCallId = call.id, name = call.name))
                }
                save()
                if (step == AgentTools.MAX_STEPS - 1) {
                    append(Turn(
                        kind = "note",
                        text = "The reading stopped after ${AgentTools.MAX_STEPS} computations.",
                        ok = false
                    ))
                    save()
                }
            }
        } finally {
            streaming = false
        }
    }
}
