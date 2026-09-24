package art.lazying.auspice

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.coroutines.launch
import kotlinx.coroutines.ensureActive
import kotlinx.serialization.json.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.util.concurrent.TimeUnit

/**
 * Talking to the reading service, and letting it use the engines.
 *
 * The service is our own relay, which holds the provider keys; the app never
 * carries one. The native apps talk to the Huanayun mirror, which is the
 * faster of the two hosts from most networks here.
 */
object Relay {
    private val ENDPOINTS = listOf("https://oracle-fast.lazying.art/v1", "https://oracle.lazying.art/v1")

    private val client = OkHttpClient.Builder()
        .connectTimeout(20, TimeUnit.SECONDS)
        .readTimeout(20, TimeUnit.SECONDS)
        .callTimeout(45, TimeUnit.SECONDS)
        .build()

    private val json = Json { ignoreUnknownKeys = true; encodeDefaults = true }

    data class ToolCall(val id: String, val name: String, val arguments: String)

    data class Answer(val text: String, val toolCalls: List<ToolCall>)

    class Failure(message: String) : Exception(message)

    /** One streamed completion; `onDelta` receives text as it arrives. */
    suspend fun stream(
        messages: List<JsonObject>,
        tools: JsonArray?,
        tier: String,
        onDelta: suspend (String) -> Unit
    ): Answer {
        var last: Exception = Failure("The reading service could not be reached.")
        for (endpoint in ENDPOINTS) {
            var emitted = false
            try {
                return streamAt(endpoint, messages, tools, tier) { piece -> emitted = true; onDelta(piece) }
            } catch (cancelled: kotlinx.coroutines.CancellationException) { throw cancelled }
            catch (error: Exception) {
                last = error
                if (emitted || error.message?.contains("answered 400") == true || error.message?.contains("answered 429") == true) throw error
            }
        }
        throw last
    }

    private suspend fun streamAt(
        endpoint: String, messages: List<JsonObject>, tools: JsonArray?, tier: String,
        onDelta: suspend (String) -> Unit
    ): Answer = withContext(Dispatchers.IO) {
        val body = buildJsonObject {
            put("model", JsonPrimitive(tier))
            put("stream", JsonPrimitive(true))
            put("temperature", JsonPrimitive(0.3))
            put("messages", JsonArray(messages))
            if (tools != null && tools.isNotEmpty()) {
                put("tools", tools)
                put("tool_choice", JsonPrimitive("auto"))
                put("parallel_tool_calls", JsonPrimitive(false))
            }
        }
        val request = Request.Builder()
            .url("$endpoint/chat/completions")
            .post(body.toString().toRequestBody("application/json".toMediaType()))
            .build()

        val call = client.newCall(request)
        // A separate cancellation hook closes the blocking response body as
        // soon as Stop or the overall deadline cancels this coroutine.
        kotlinx.coroutines.coroutineScope {
        val cancellation = launch(start = kotlinx.coroutines.CoroutineStart.UNDISPATCHED) {
            try { kotlinx.coroutines.awaitCancellation() } finally { call.cancel() }
        }
        try { call.execute().use { response ->
            if (!response.isSuccessful) {
                val detail = response.body?.string()?.take(160).orEmpty()
                throw Failure(
                    if (response.code == 503) "The reading service has no model available just now."
                    else "The reading service answered ${response.code}. $detail"
                )
            }
            val source = response.body?.source() ?: throw Failure("The reading service sent nothing.")
            val text = StringBuilder()
            val assembling = linkedMapOf<Int, MutableList<String>>()
            val names = linkedMapOf<Int, String>()
            val ids = linkedMapOf<Int, String>()

            var finished = false
            while (true) {
                kotlinx.coroutines.currentCoroutineContext().ensureActive()
                val line = source.readUtf8Line() ?: break
                if (!line.startsWith("data:")) continue
                val payload = line.removePrefix("data:").trim()
                if (payload == "[DONE]") { finished = true; break }
                val chunk = runCatching { json.parseToJsonElement(payload).jsonObject }.getOrNull() ?: continue
                if (chunk["error"] != null) throw Failure("The reading was interrupted.")
                val delta = chunk["choices"]?.jsonArray?.firstOrNull()?.jsonObject?.get("delta")?.jsonObject ?: continue
                delta["content"]?.jsonPrimitive?.contentOrNull?.takeIf { it.isNotEmpty() }?.let {
                    text.append(it)
                    withContext(Dispatchers.Main.immediate) { onDelta(it) }
                }
                // Tool calls arrive in fragments: the name in one chunk, the
                // arguments a few characters at a time in the ones after.
                delta["tool_calls"]?.jsonArray?.forEach { element ->
                    val fragment = element.jsonObject
                    val index = fragment["index"]?.jsonPrimitive?.intOrNull ?: 0
                    fragment["id"]?.jsonPrimitive?.contentOrNull?.let { ids[index] = it }
                    val function = fragment["function"]?.jsonObject
                    function?.get("name")?.jsonPrimitive?.contentOrNull
                        ?.takeIf { it.isNotEmpty() }?.let { names[index] = it }
                    function?.get("arguments")?.jsonPrimitive?.contentOrNull?.let {
                        assembling.getOrPut(index) { mutableListOf() }.add(it)
                    }
                }
            }
            if (!finished) throw Failure("The reading was interrupted.")
            if (text.isBlank() && names.isEmpty()) throw Failure("The reading service sent no answer.")
            Answer(
                text.toString(),
                names.keys.sorted().map { index ->
                    ToolCall(
                        id = ids[index] ?: "call_$index",
                        name = names[index].orEmpty(),
                        arguments = assembling[index]?.joinToString("") ?: "{}"
                    )
                }
            )
        } } finally { cancellation.cancel() }
        }
    }

    fun message(role: String, content: String?, toolCallId: String? = null, name: String? = null, call: ToolCall? = null, calls: List<ToolCall>? = null) =
        buildJsonObject {
            put("role", JsonPrimitive(role))
            put("content", JsonPrimitive(content ?: ""))
            val batch = calls ?: call?.let { listOf(it) }
            if (batch != null) {
                put("tool_calls", buildJsonArray {
                    batch.forEach { call -> add(buildJsonObject {
                        put("id", JsonPrimitive(call.id))
                        put("type", JsonPrimitive("function"))
                        put("function", buildJsonObject {
                            put("name", JsonPrimitive(call.name))
                            put("arguments", JsonPrimitive(call.arguments))
                        })
                    }) }
                })
            }
            if (toolCallId != null) put("tool_call_id", JsonPrimitive(toolCallId))
            if (name != null) put("name", JsonPrimitive(name))
        }
}

/**
 * The tools the conversation may use: each one runs a deterministic engine on
 * this device and hands back the computed facts. The model never invents a
 * card, a hexagram or a pillar — it asks for one and reads what it is given.
 */
object AgentTools {
    const val MAX_STEPS = 6

    data class Outcome(val label: String, val output: String, val ok: Boolean)

    fun schemas(): JsonArray = buildJsonArray {
        fun tool(name: String, description: String, properties: JsonObject = JsonObject(emptyMap())) {
            add(buildJsonObject {
                put("type", JsonPrimitive("function"))
                put("function", buildJsonObject {
                    put("name", JsonPrimitive(name))
                    put("description", JsonPrimitive(description))
                    put("parameters", buildJsonObject {
                        put("type", JsonPrimitive("object"))
                        put("properties", properties)
                    })
                })
            })
        }
        fun property(type: String, description: String, options: List<String>? = null) = buildJsonObject {
            put("type", JsonPrimitive(type))
            put("description", JsonPrimitive(description))
            if (options != null) put("enum", JsonArray(options.map { JsonPrimitive(it) }))
        }

        tool("draw_tarot", "Draw a tarot spread from a full shuffle and return the cards with their positions and keywords.", buildJsonObject {
            put("spread", property("string", "One card, three, or the ten-card Celtic Cross.", listOf("one", "three", "celtic")))
            put("question", property("string", "The question the cards are drawn for."))
        })
        tool("cast_iching", "Cast a hexagram and return the lines, the primary and resulting hexagrams, and where the classical rule says to read.", buildJsonObject {
            put("method", property("string", "Three coins, or yarrow stalks.", listOf("coins", "yarrow")))
            put("question", property("string", "The question the hexagram is cast for."))
        })
        tool("four_pillars", "Compute the reader's BaZi chart from their saved birth details.")
        tool("natal_chart", "Compute the reader's natal chart, and today's transits against it.")
        tool("eight_mansions", "Compute the reader's eight mansions: their gua, group and the quality of each direction.")
        tool("open_book", "Open a page of the Book of Answers or the Book of Questions.", buildJsonObject {
            put("book", property("string", "Which book to open.", listOf("answers", "questions")))
            put("question", property("string", "What is being asked."))
        })
        tool("birth_details", "Report the birth details saved on this device, so you know whether a chart can be computed.")
        tool("almanac_day", "The almanac for a date: 宜, 忌, the day officer, the mansion, the spirits and the lucky hours, with a verdict for one undertaking if given.", buildJsonObject {
            put("date", property("string", "ISO date, e.g. 2026-09-23. Defaults to today."))
            put("activity", property("string", "One of: marry, travel, move, business, contract, build, bed, ritual, medicine, study, meet, grooming."))
        })
        tool("today", "Today's date, the lunar date, and the day's stem and branch.")
        tool("read_palm", "Read a hand. If a hand has already been measured on the palmistry screen, this returns those measurements. If not, it opens the camera on that screen so the reader can present a palm — their own or the person opposite — and you should then tell them to hold the palm up and tap Read this hand.")
        tool("read_face", "Read a face. If a face has already been measured on the face-reading screen, this returns those measurements. If not, it opens the camera on that screen and you should tell them to face it and tap Read this face.")
    }

    /** Runs one tool. A failure comes back as data, not as an exception. */
    suspend fun run(name: String, arguments: JsonObject): Outcome {
        val profile = Profiles.profile
        suspend fun engine(id: String, input: JsonObject, label: String): Outcome = try {
            Outcome(label, Engines.evaluate(id, input).toString(), true)
        } catch (error: Throwable) {
            Outcome(label, """{"error":${JsonPrimitive(error.message ?: "failed")}}""", false)
        }
        fun needProfile() = Outcome(
            "No birth details",
            """{"error":"No birth details are saved. Ask the reader for the year, month, day, hour and birthplace, or tell them to fill in birth details on any chart screen."}""",
            false
        )
        val text: (String) -> String? = { key -> arguments[key]?.jsonPrimitive?.contentOrNull }

        return when (name) {
            "draw_tarot" -> {
                val spread = text("spread") ?: "three"
                engine("tarot.draw", buildJsonObject {
                    put("spread", JsonPrimitive(spread))
                    put("question", JsonPrimitive(text("question").orEmpty()))
                }, "Drew " + when (spread) {
                    "one" -> "one card"; "celtic" -> "the Celtic cross"; else -> "three cards"
                })
            }
            "cast_iching" -> {
                val method = text("method") ?: "coins"
                engine("iching.cast", buildJsonObject {
                    put("method", JsonPrimitive(method))
                    put("question", JsonPrimitive(text("question").orEmpty()))
                }, "Cast the lines with ${if (method == "yarrow") "yarrow" else "three coins"}")
            }
            "four_pillars" -> if (profile.isComplete) engine("bazi.chart", profile.engineInput(), "Computed the four pillars") else needProfile()
            "natal_chart" -> if (profile.isComplete) {
                engine("astrology.transits", buildJsonObject { put("birth", profile.engineInput()) }, "Computed the natal chart and today's transits")
            } else needProfile()
            "eight_mansions" -> if (profile.isComplete) {
                engine("fengshui.mansions", buildJsonObject {
                    put("year", JsonPrimitive(profile.year))
                    put("month", JsonPrimitive(profile.month))
                    put("day", JsonPrimitive(profile.day))
                    put("gender", JsonPrimitive(profile.gender))
                }, "Computed the eight mansions")
            } else needProfile()
            "open_book" -> {
                val book = text("book") ?: "answers"
                engine("book.open", buildJsonObject {
                    put("book", JsonPrimitive(book))
                    put("question", JsonPrimitive(text("question").orEmpty()))
                }, "Opened the Book of ${if (book == "questions") "Questions" else "Answers"}")
            }
            "birth_details" -> if (!profile.isComplete) Outcome("No birth details", """{"saved":false,"note":"No birth details saved. Do not use form defaults as personal information."}""", true) else Outcome(
                "Read the saved birth details",
                buildJsonObject {
                    put("saved", JsonPrimitive(profile.isComplete))
                    put("year", JsonPrimitive(profile.year))
                    put("month", JsonPrimitive(profile.month))
                    put("day", JsonPrimitive(profile.day))
                    put("hour", JsonPrimitive(profile.hour))
                    put("minute", JsonPrimitive(profile.minute))
                    put("timeKnown", JsonPrimitive(profile.timeKnown))
                    put("gender", JsonPrimitive(profile.gender))
                    put("place", JsonPrimitive(profile.place))
                }.toString(),
                true
            )
            "almanac_day" -> engine("almanac.day", buildJsonObject {
                text("date")?.let { put("date", JsonPrimitive(it)) }
                text("activity")?.let { put("activity", JsonPrimitive(it)) }
            }, "Read the almanac")
            "today" -> engine("almanac.day", buildJsonObject {
                put("date", JsonPrimitive(java.time.LocalDate.now().toString()))
            }, "Checked today's date")
            "read_palm" -> Router.palm?.let {
                Outcome("Read the measured hand", Json.encodeToString(PalmFeatures.serializer(), it), true)
            } ?: run {
                Router.show(Practice.PALM)
                Outcome(
                    "Opened the camera for a hand",
                    """{"opened":"palm","note":"The camera is now open on the palmistry screen. No hand has been measured yet. Ask the reader to hold an open palm to the camera and tap 'Read this hand', then call read_palm again. They can switch to the back camera to read someone else's hand."}""",
                    true
                )
            }
            "read_face" -> Router.face?.let {
                Outcome("Read the measured face", Json.encodeToString(FaceFeatures.serializer(), it), true)
            } ?: run {
                Router.show(Practice.FACE)
                Outcome(
                    "Opened the camera for a face",
                    """{"opened":"face","note":"The camera is now open on the face-reading screen. No face has been measured yet. Ask the reader to face the camera in even light and tap 'Read this face', then call read_face again. They can switch to the back camera to read someone else's face."}""",
                    true
                )
            }
            else -> Outcome("Unknown tool", """{"error":"no such tool: $name"}""", false)
        }
    }

    // BEGIN GENERATED PROMPT
    val SYSTEM_PROMPT = """
        You are the Tianji reader in this app (LazyOracle or Auspice). You do not invent readings: every card, hexagram, pillar, chart and almanac page comes from a tool that runs a deterministic engine on this device. Call the tool, then read what it returns. If a tool disagrees with what you were about to say, the tool is right.

        For greetings and questions about what the app can do, answer briefly without tools or claims about the reader’s personal details. Historical engine results are dated context, not current state. Fetch fresh birth details or calendar facts before presenting them as current.

        Use the interface language as the default, and naturally follow the language the reader uses or explicitly requests. Keep each answer coherent and easy to understand. Occasional useful traditional terms are fine; explain unfamiliar terms briefly, without unnecessary language switching or duplicate bilingual paragraphs.

        Write as a reader speaking to someone across a table, not as a report. No headings, no bullet lists, no bold labels such as "What was computed". Two to four short paragraphs. Open with the answer, give the one or two facts it rests on, and end with something the person can actually do. Name the source in passing — "the almanac lists signing agreements as suitable today" — rather than announcing a method section.

        Method, so the reading is grounded rather than decorative:
        - BaZi follows 子平法. Pillars come from the solar terms, not the lunar month, and the hour pillar from true solar time. Judge the day master's strength first, then name the favourable element.
        - The I Ching follows 朱熹《易学启蒙》: the number of moving lines decides where the answer is read. Do not read a line the rule does not point to.
        - Tarot is read by position: what the position asks of the card comes before the card's own keywords, and a reversal shifts the sense rather than negating it.
        - Astrology uses whole-sign houses from the ascendant. Name the placement and the aspect you are reading from.
        - Feng shui is 八宅: the gua of the birth year, the east or west group, and the eight sectors that follow.
        - Face readings use the one classification.primary returned by read_face; never relabel it or list boundary candidates as equal answers. Briefly explain its visible form, then develop the supplied element theme into a playful symbolic reflection and a concrete optional activity. The element is the reading's theme, not a discovered personal trait. Avoid repetitive caveats or an empty refusal to interpret. Face and palm appearance does not establish personality, health, wealth, relationships or future events. Use the reader's own context for follow-ups. Respect unknown observations; never invent detected palm lines, mounts or a hairline. If an older face result lacks classification, explain its proportions and invite a fresh capture once rather than guessing an element.
        - The almanac is the 通书 tables: 宜, 忌, 建除十二神, 二十八宿, the yellow and black roads, 吉神凶煞 and 彭祖百忌. Keep dayOfficer separate from spirit. Do not turn a day-level 彭祖百忌 into a rule about an hour. When the tables are silent about an undertaking, say so instead of inventing a verdict. Present 宜 and 忌 as traditional suggestions, not certain predictions or commands; do not infer someone's mood, health or personality from a clash. A practical suggestion is your suggestion, not another computed fact.

        If the person asks about a hand or a face, call read_palm or read_face. That opens the camera for them; tell them plainly what to do — hold an open palm up, or face the camera in even light, and tap the button — and read the measurements when they come back. They can turn the camera around to read someone else's hand or face.

        If a chart needs birth details and none are saved, ask for the year, month, day, hour and birthplace rather than guessing. If a tool fails, say what could not be computed instead of filling the gap. Never claim certainty about health, death, or the law.

        If a short question is ambiguous (for example “what about west?”), use the conversation to identify whether it means a compass direction or Western astrology. If the context does not settle it, ask one brief clarifying question instead of guessing or calling unrelated tools. Never present unsaved profile defaults as the reader’s actual birth details. When saved=false, no birth details are known.
    """.trimIndent()
    // END GENERATED PROMPT
}
