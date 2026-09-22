package art.lazying.auspice

import android.content.Context
import androidx.concurrent.futures.await
import androidx.javascriptengine.JavaScriptIsolate
import androidx.javascriptengine.JavaScriptSandbox
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.decodeFromJsonElement
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive

/**
 * The divination rules, called from Kotlin.
 *
 * Every rule in this product is written once, in TypeScript, under
 * `src/engines/`, with golden-file tests. `lazyoracle-engines.js` is that same
 * code built into one bundle with no DOM and no network, and this object is the
 * only thing between it and the native screens.
 *
 * It runs in `androidx.javascriptengine`, a JavaScript sandbox in its own
 * process with no document, no storage and no network — the counterpart of
 * JavaScriptCore on iOS. Writing the rules a second time in Kotlin would look
 * like less work for a week and then quietly disagree with the other two apps
 * about someone's day master, with no test able to catch it.
 */
object Engines {
    const val EXPECTED_VERSION = 1

    class Failure(message: String) : Exception(message)

    private val json = Json { ignoreUnknownKeys = true; encodeDefaults = true }
    private val lock = Mutex()
    private var isolate: JavaScriptIsolate? = null
    private var sandbox: JavaScriptSandbox? = null

    var startupError: String? = null
        private set

    val ready: Boolean get() = isolate != null

    /** Loads the bundle once, at launch. */
    suspend fun start(context: Context) = withContext(Dispatchers.IO) {
        lock.withLock {
            if (isolate != null) return@withLock
            try {
                if (!JavaScriptSandbox.isSupported()) {
                    throw Failure("This device's system WebView is too old to run the rules.")
                }
                val box = JavaScriptSandbox.createConnectedInstanceAsync(context.applicationContext).await()
                val iso = box.createIsolate()
                val source = context.assets.open("lazyoracle-engines.js").bufferedReader().use { it.readText() }

                if (box.isFeatureSupported(JavaScriptSandbox.JS_FEATURE_EVALUATE_WITHOUT_TRANSACTION_LIMIT)) {
                    iso.evaluateJavaScriptAsync(source).await()
                } else if (box.isFeatureSupported(JavaScriptSandbox.JS_FEATURE_PROVIDE_CONSUME_ARRAY_BUFFER) &&
                    box.isFeatureSupported(JavaScriptSandbox.JS_FEATURE_PROMISE_RETURN)
                ) {
                    // The bundle is larger than a binder transaction, so it is
                    // handed over as named data and read back inside the sandbox.
                    iso.provideNamedData("rules", source.toByteArray())
                    iso.evaluateJavaScriptAsync(
                        """
                        android.consumeNamedDataAsArrayBuffer("rules").then((buffer) => {
                          (0, eval)(new TextDecoder().decode(buffer));
                          return typeof LazyOracle === "object" ? "ok" : "missing";
                        })
                        """.trimIndent()
                    ).await()
                } else {
                    throw Failure("This device's system WebView cannot load a bundle this size.")
                }

                sandbox = box
                isolate = iso
                startupError = null
            } catch (error: Throwable) {
                startupError = error.message ?: error.toString()
            }
        }
    }

    /**
     * Runs one engine and hands back its `data`. A failure comes back as an
     * exception carrying the engine's own words, never as a silent empty result.
     */
    suspend fun evaluate(engine: String, input: JsonObject = JsonObject(emptyMap())): JsonElement =
        withContext(Dispatchers.IO) {
            val iso = isolate ?: throw Failure(startupError ?: "The rules are not loaded yet.")
            val request = json.encodeToString(
                JsonObject.serializer(),
                buildJsonObject {
                    put("engine", JsonPrimitive(engine))
                    put("input", input)
                }
            )
            val literal = json.encodeToString(JsonPrimitive.serializer(), JsonPrimitive(request))
            val returned = lock.withLock {
                iso.evaluateJavaScriptAsync("LazyOracle.evaluateJson($literal)").await()
            }
            val envelope = json.parseToJsonElement(returned).jsonObject
            if (envelope["ok"]?.jsonPrimitive?.content != "true") {
                throw Failure(envelope["error"]?.jsonPrimitive?.content ?: "$engine failed")
            }
            val version = envelope["version"]?.jsonPrimitive?.content?.toIntOrNull()
            if (version != null && version != EXPECTED_VERSION) {
                throw Failure("The rules bundle speaks version $version; this app expects $EXPECTED_VERSION.")
            }
            envelope["data"] ?: throw Failure("$engine returned nothing")
        }

    /** The same call, decoded into a Kotlin type. */
    suspend inline fun <reified T> evaluateAs(engine: String, input: JsonObject = JsonObject(emptyMap())): T {
        val data = evaluate(engine, input)
        return lenient.decodeFromJsonElement(data)
    }

    val lenient = Json { ignoreUnknownKeys = true; isLenient = true; coerceInputValues = true }
}
