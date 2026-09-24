package art.lazying.auspice

import android.annotation.SuppressLint
import android.content.Context
import android.webkit.WebView
import android.webkit.WebViewClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import kotlinx.coroutines.*
import kotlinx.serialization.json.*
import java.io.ByteArrayInputStream
import java.util.UUID
import kotlin.coroutines.resume

/** Read former Capacitor localStorage locally; retain the originals for rollback. */
object LegacyImport {
    @SuppressLint("SetJavaScriptEnabled")
    suspend fun run(context: Context) {
        if (BuildConfig.APPLICATION_ID != "art.lazying.lazyoracle") return
        val prefs = context.getSharedPreferences("native-migration", Context.MODE_PRIVATE)
        if (prefs.getBoolean("classic-v1", false)) return
        withContext(Dispatchers.Main.immediate) {
            var web: WebView? = null
            try {
                withTimeoutOrNull(5_000) {
                    suspendCancellableCoroutine<Unit> { continuation ->
                        val view = WebView(context); web = view
                        view.settings.javaScriptEnabled = true
                        view.settings.domStorageEnabled = true
                        view.webViewClient = object : WebViewClient() {
                            override fun shouldInterceptRequest(view: WebView?, request: WebResourceRequest?): WebResourceResponse =
                                WebResourceResponse("text/html", "utf-8", ByteArrayInputStream("<!doctype html><meta charset=utf-8>".toByteArray()))
                            override fun onPageFinished(view: WebView, url: String) {
                                view.evaluateJavascript("JSON.stringify(Object.fromEntries(['lazyoracle.profile','lazyoracle.language','lazyoracle.chats'].map(k=>[k,localStorage.getItem(k)])))") { result ->
                                    if (!continuation.isActive) return@evaluateJavascript
                                    runCatching {
                                        val payload = Json.parseToJsonElement(Json.decodeFromString<String>(result)).jsonObject
                                        apply(context, payload)
                                        prefs.edit().putBoolean("classic-v1", true).apply()
                                    }
                                    continuation.resume(Unit)
                                }
                            }
                        }
                        view.loadUrl("https://localhost/")
                    }
                }
            } finally { web?.stopLoading(); web?.destroy() }
        }
    }
    fun apply(context: Context, payload: JsonObject) {
        val prefs = context.getSharedPreferences("auspice", Context.MODE_PRIVATE)
        context.getSharedPreferences("native-migration", Context.MODE_PRIVATE).edit().putString("classic-backup", payload.toString()).apply()
        fun value(key: String) = payload[key]?.jsonPrimitive?.contentOrNull
        val codec = Json { ignoreUnknownKeys = true; encodeDefaults = true }
        if (!prefs.contains("profile")) value("lazyoracle.profile")?.let { raw ->
            runCatching { codec.decodeFromString<BirthProfile>(raw) }.getOrNull()?.let { Profiles.save(it) }
        }
        if (!prefs.contains("language")) value("lazyoracle.language")?.let { code ->
            if (Catalogue.languages.any { it.first == code }) Localisation.choose(code)
        }
        val old = value("lazyoracle.chats")?.let { runCatching { codec.parseToJsonElement(it).jsonArray }.getOrNull() } ?: return
        old.forEach { item ->
            runCatching {
                val source = item.jsonObject
                val id = UUID.nameUUIDFromBytes(source.getValue("id").jsonPrimitive.content.toByteArray()).toString()
                if (Conversations.sessions.any { it.id == id }) return@runCatching
                val session = Conversation(id = id, title = source["title"]?.jsonPrimitive?.contentOrNull ?: "New conversation",
                    updated = source["updatedAt"]?.jsonPrimitive?.longOrNull ?: System.currentTimeMillis(),
                    summary = source["summary"]?.jsonPrimitive?.contentOrNull)
                source.getValue("turns").jsonArray.forEach { entry ->
                    val turn = entry.jsonObject; val role = turn.getValue("role").jsonPrimitive.content
                    val text = turn.getValue("content").jsonPrimitive.content
                    session.turns.add(Turn(kind = if (role == "user") "reader" else if (role == "tool") "tool" else "oracle",
                        text = text, facts = if (role == "tool") turn["facts"]?.jsonPrimitive?.contentOrNull else null))
                }
                Conversations.sessions.add(session)
            }
        }
        if (Conversations.current.turns.isEmpty()) Conversations.sessions.filter { it.turns.isNotEmpty() }.maxByOrNull { it.updated }?.let { Conversations.select(it.id) }
        Conversations.save()
    }
}
