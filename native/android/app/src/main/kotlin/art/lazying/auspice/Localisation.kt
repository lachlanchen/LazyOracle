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
 * What is *not* translated: the traditions' own vocabulary. 宜 stays 宜 in
 * every language, as do 忌, 日主, 甲子 and 生气, because they are the subject of
 * the reading rather than part of the interface.
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
    Catalogue.table[key]?.get(Localisation.code)
        ?: Catalogue.table[key]?.get("en")
        ?: key
