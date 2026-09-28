package art.lazying.auspice

import android.content.Context
import android.util.AtomicFile
import androidx.compose.runtime.*
import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.*
import java.io.File
import java.security.MessageDigest
import kotlinx.coroutines.CancellationException

@Serializable data class NotebookSummary(val question: String = "", val lines: List<List<String>> = emptyList())
@Serializable data class NotebookEntry(
    val id: String, val practice: String, val createdAt: Long, val facts: String, val summary: NotebookSummary,
    val reflection: String = "", val action: String = "", val observation: String = "", val reviewed: Boolean = false
)
@Serializable data class NotebookArchive(val version: Int = 1, val entries: List<NotebookEntry> = emptyList())

/** Explicit, local snapshots. Load failures never overwrite an existing archive. */
object NotebookStore {
    private val codec = Json { ignoreUnknownKeys = true; encodeDefaults = true }
    private var file: AtomicFile? = null
    private var readable = true
    var entries by mutableStateOf<List<NotebookEntry>>(emptyList()); private set
    var error by mutableStateOf<String?>(null); private set
    fun load(context: Context) {
        if (file != null) return
        val target = AtomicFile(File(context.filesDir, "reading-notebook-v1.json"))
        file = target
        if (!target.baseFile.exists() && !File(target.baseFile.path + ".bak").exists()) return
        try {
            val archive = codec.decodeFromString<NotebookArchive>(target.readFully().decodeToString())
            require(archive.version == 1)
            entries = archive.entries
        } catch (_: Exception) { readable = false; error = "notebook.error" }
    }
    private fun canonical(value: JsonElement): JsonElement = when (value) {
        is JsonObject -> JsonObject(value.toSortedMap().mapValues { canonical(it.value) })
        is JsonArray -> JsonArray(value.map(::canonical))
        else -> value
    }
    fun identity(practice: String, facts: String): String {
        val normalized = runCatching { canonical(codec.parseToJsonElement(facts)).toString() }.getOrDefault(facts)
        return MessageDigest.getInstance("SHA-256").digest("$practice\n$normalized".toByteArray()).joinToString("") { "%02x".format(it) }
    }
    suspend fun save(practice: String, facts: String): Boolean {
        val id = identity(practice, facts)
        if (entries.any { it.id == id }) return true
        return try {
            val summary = Engines.evaluateAs<NotebookSummary>("notebook.summary", buildJsonObject { put("practice", practice); put("result", codec.parseToJsonElement(facts)) })
            if (entries.any { it.id == id }) true else persist(listOf(NotebookEntry(id, practice, System.currentTimeMillis(), facts, summary)) + entries)
        } catch (cancelled: CancellationException) { throw cancelled }
        catch (_: Exception) { error = "notebook.error"; false }
    }
    fun update(entry: NotebookEntry): Boolean {
        val previous = entries.find { it.id == entry.id } ?: return false
        if (previous.facts != entry.facts || previous.practice != entry.practice) return false
        val updated = previous.copy(reflection = entry.reflection, action = entry.action, observation = entry.observation, reviewed = entry.reviewed)
        return persist(entries.map { if (it.id == entry.id) updated else it })
    }
    private fun persist(next: List<NotebookEntry>): Boolean {
        if (!readable) return false
        val target = file ?: return false
        var stream: java.io.FileOutputStream? = null
        return try {
            stream = target.startWrite()
            stream.write(codec.encodeToString(NotebookArchive(entries = next)).toByteArray())
            target.finishWrite(stream)
            entries = next; error = null; true
        } catch (_: Exception) { target.failWrite(stream); error = "notebook.error"; false }
    }
}

fun notebookName(practice: String) = t(if (practice == "atlas") "study.title" else "practice.$practice")
fun notebookLines(summary: NotebookSummary) = summary.lines.joinToString("\n") { row -> row.joinToString(" · ") { l(it) } }
