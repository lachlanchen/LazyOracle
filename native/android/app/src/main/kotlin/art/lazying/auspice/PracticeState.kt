package art.lazying.auspice

import android.content.Context
import androidx.compose.runtime.*
import androidx.compose.ui.platform.LocalContext
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

@Composable
inline fun <reified T> rememberPracticeState(key: String, initial: T): MutableState<T> {
    val context = LocalContext.current
    return remember(key) {
        val prefs = context.getSharedPreferences("native-practices", Context.MODE_PRIVATE)
        val codec = Json { ignoreUnknownKeys = true; encodeDefaults = true }
        val stored = prefs.getString(key, null)
        val state = mutableStateOf(stored?.let { runCatching { codec.decodeFromString<T>(it) }.getOrNull() } ?: initial)
        object : MutableState<T> {
            override var value: T
                get() = state.value
                set(value) { state.value = value; prefs.edit().putString(key, codec.encodeToString(value)).apply() }
            override fun component1(): T = value
            override fun component2(): (T) -> Unit = { value = it }
        }
    }
}
