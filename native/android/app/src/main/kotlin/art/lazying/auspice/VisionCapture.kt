package art.lazying.auspice

import kotlinx.serialization.Serializable
import kotlinx.serialization.json.*

data class LandmarkFrame(val points: List<List<Double>>, val width: Int, val height: Int, val timestamp: Long) {
    fun json() = buildJsonObject {
        put("width",width); put("height",height); put("timestamp",timestamp)
        put("landmarks",JsonArray(points.map { p -> buildJsonObject { put("x",p[0]);put("y",p[1]);put("z",p[2]) } }))
    }
}

/** Bounded, transient burst. All geometry rules are in the shared engine. */
class CaptureWindow {
    private val frames = mutableListOf<LandmarkFrame>()
    private var receivedAt = 0L
    val ready get() = frames.size >= 8 && frames.last().timestamp-frames.first().timestamp >= 650
    fun clear() { frames.clear(); receivedAt=0 }
    fun append(frame: LandmarkFrame, now: Long = System.nanoTime()/1_000_000) {
        if(frame.points.isEmpty() || frame.width<=0 || frame.height<=0) { clear();return }
        frames.lastOrNull()?.let { last ->
            if(frame.timestamp<=last.timestamp || frame.timestamp-last.timestamp>300 || frame.width!=last.width || frame.height!=last.height) clear()
        }
        frames.add(frame)
        while(frames.size>12 || frame.timestamp-frames.first().timestamp>1800) frames.removeAt(0)
        receivedAt=now
    }
    fun snapshot(now: Long = System.nanoTime()/1_000_000): JsonArray =
        if(ready && now-receivedAt<=500) JsonArray(frames.map { it.json() }) else JsonArray(emptyList())
}

@Serializable
data class VisionMeasurement(val version: Int=2,val samples: Int=8,val typeCandidates: List<String> = emptyList(),val limitations: List<String> = emptyList())

fun visionError(error: Throwable): String = error.message?.takeIf { it.startsWith("vision.") }?.let { t(it) }
    ?: l("This reading could not be computed. Please try again.")

fun visionState(value: String): String = if(value=="uncertain") t("vision.uncertain") else l(value)
