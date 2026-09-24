package art.lazying.auspice

import android.content.Context
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.unit.LayoutDirection
import java.util.Locale

/**
 * The interface language, and the one function that looks a string up.
 *
 * The app follows the phone unless the reader chooses otherwise in Settings,
 * and a choice takes effect at once rather than on the next launch.
 *
 */
object Localisation {
    private const val FILE = "auspice"
    private const val KEY = "language"
    private var context: Context? = null

    /** null means "follow the phone". */
    var chosen by mutableStateOf<String?>(null)
        private set

    fun load(appContext: Context) {
        context = appContext.applicationContext
        ReadingCatalogue.load(appContext)
        chosen = context?.getSharedPreferences(FILE, Context.MODE_PRIVATE)?.getString(KEY, null)
    }

    fun choose(code: String?) {
        chosen = code
        val editor = context?.getSharedPreferences(FILE, Context.MODE_PRIVATE)?.edit() ?: return
        if (code == null) editor.remove(KEY) else editor.putString(KEY, code)
        editor.apply()
    }

    val code: String
        get() = chosen?.takeIf { c -> Catalogue.languages.any { it.first == c } } ?: match()

    val layoutDirection: LayoutDirection
        get() = if (Catalogue.rightToLeft.contains(code)) LayoutDirection.Rtl else LayoutDirection.Ltr

    /**
     * Chinese needs care: a phone set to zh-TW or zh-HK wants the traditional
     * text, and everything else zh wants the simplified one.
     */
    private fun match(): String {
        val available = Catalogue.languages.map { it.first }
        val locale = Locale.getDefault()
        val tag = locale.toLanguageTag().lowercase()
        if (tag.startsWith("zh")) {
            val traditional = listOf("hant", "tw", "hk", "mo").any { tag.contains(it) }
            return if (traditional) "zh-Hant" else "zh-Hans"
        }
        available.firstOrNull { it.lowercase() == tag }?.let { return it }
        val base = tag.substringBefore('-')
        available.firstOrNull { it.lowercase() == base }?.let { return it }
        return "en"
    }
}

/** Look a string up in the language in force. */
fun t(key: String): String =
    if (key == "app.name" && BuildConfig.APPLICATION_ID == "art.lazying.lazyoracle") "LazyOracle" else
    Catalogue.table[key]?.get(Localisation.code)
        ?: Catalogue.table[key]?.get("en")
        ?: key

/** Presentation translations never alter engine identifiers or facts. */
object ReadingCatalogue {
    var values: Map<String, Map<String, String>> = emptyMap()
        private set
    fun load(context: Context) {
        values = context.assets.open("auspice-content.json").bufferedReader().use {
            kotlinx.serialization.json.Json.decodeFromString(it.readText())
        }
    }
}
fun l(source: String): String {
    ReadingCatalogue.values[source]?.get(Localisation.code)?.let { return it }
    Catalogue.glossary[source]?.get(Localisation.code)?.let { return it }
    for (separator in listOf(" · ", "、", " / ")) {
        if (source.contains(separator)) return source.split(separator).joinToString(" · ") { l(it) }
    }
    return source
}
fun lf(template: String, vararg values: String): String {
    var result = l(template)
    values.forEachIndexed { i, value -> result = result.replace("{$i}", l(value)) }
    return result
}
fun glossed(term: String): String = l(term)
fun lunarDateText(source: String): String {
    if (Localisation.code.startsWith("zh")) return if (Localisation.code == "zh-Hant") source.replace("闰", "閏") else source
    val digits = "〇一二三四五六七八九".withIndex().associate { it.value to it.index.toString() } + ('零' to "0")
    fun number(text: String): String {
        if (text == "正") return "1"
        if (text == "冬") return "11"
        if (text == "腊") return "12"
        val cleaned = text.replace("初", "").replace("廿", "二十").replace("卅", "三十")
        if (cleaned.contains("十")) {
            val parts = cleaned.split("十")
            return (((parts[0].firstOrNull()?.let { digits[it]?.toInt() } ?: 1) * 10) + (parts.last().firstOrNull()?.let { digits[it]?.toInt() } ?: 0)).toString()
        }
        return cleaned.map { digits[it] ?: it.toString() }.joinToString("")
    }
    val parts = source.split('年', '月', '日').filter { it.isNotEmpty() }
    if (parts.size !in 2..3) return l(source)
    val date = parts.joinToString("-") { number(it.replace("闰", "")) }
    return lf(if (source.contains("闰")) "Lunar date: {0} (leap month)" else "Lunar date: {0}", date)
}

fun readingLanguageInstruction(): String = "The interface language is ${Localisation.code}. Use it as the default, but naturally follow the language the reader uses or explicitly requests. Keep each answer coherent and easy to understand. Occasional useful terms from another language are fine; avoid unnecessary switching or duplicate translated paragraphs."
