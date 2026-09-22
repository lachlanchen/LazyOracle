package art.lazying.auspice

import android.content.Context
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject

/**
 * The birth details the charted practices need, kept in this app's own
 * preferences and nowhere else. The same shape as the iOS app and the web app
 * use, so a person typing them a second time recognises the form.
 */
@Serializable
data class BirthProfile(
    val name: String = "",
    val year: Int = 1990,
    val month: Int = 6,
    val day: Int = 15,
    val hour: Int = 8,
    val minute: Int = 30,
    val timeKnown: Boolean = true,
    val gender: String = "female",
    val place: String = "",
    val latitude: Double = 31.23,
    val longitude: Double = 121.47,
    val utcOffsetHours: Double = 8.0
) {
    val isComplete: Boolean get() = year > 1800 && place.isNotBlank()

    fun engineInput(): JsonObject = buildJsonObject {
        put("name", JsonPrimitive(name))
        put("year", JsonPrimitive(year))
        put("month", JsonPrimitive(month))
        put("day", JsonPrimitive(day))
        put("hour", JsonPrimitive(hour))
        put("minute", JsonPrimitive(minute))
        put("timeKnown", JsonPrimitive(timeKnown))
        put("gender", JsonPrimitive(gender))
        put("place", JsonPrimitive(place))
        put("latitude", JsonPrimitive(latitude))
        put("longitude", JsonPrimitive(longitude))
        put("utcOffsetHours", JsonPrimitive(utcOffsetHours))
    }
}

object Profiles {
    private const val FILE = "auspice"
    private const val KEY = "profile"
    private val json = Json { ignoreUnknownKeys = true; encodeDefaults = true }
    private var context: Context? = null

    var profile by mutableStateOf(BirthProfile())
        private set

    fun load(appContext: Context) {
        context = appContext.applicationContext
        val stored = context?.getSharedPreferences(FILE, Context.MODE_PRIVATE)?.getString(KEY, null) ?: return
        profile = runCatching { json.decodeFromString<BirthProfile>(stored) }.getOrDefault(BirthProfile())
    }

    fun save(updated: BirthProfile) {
        profile = updated
        context?.getSharedPreferences(FILE, Context.MODE_PRIVATE)?.edit()
            ?.putString(KEY, json.encodeToString(BirthProfile.serializer(), updated))?.apply()
    }
}
