package art.lazying.auspice

import android.content.Context
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.ImageProxy
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.compose.foundation.Canvas
import androidx.compose.runtime.Composable
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import androidx.lifecycle.LifecycleOwner
import com.google.mediapipe.framework.image.BitmapImageBuilder
import com.google.mediapipe.tasks.core.BaseOptions
import com.google.mediapipe.tasks.vision.core.RunningMode
import com.google.mediapipe.tasks.vision.facelandmarker.FaceLandmarker
import com.google.mediapipe.tasks.vision.handlandmarker.HandLandmarker
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject
import java.util.concurrent.Executors

/**
 * The camera, and MediaPipe's landmarkers, behind one small object.
 *
 * The web app runs the same two models through MediaPipe's WebAssembly build
 * and the iOS app through its native framework. Here they run through the
 * Android one, with the same landmark numbering — 21 points for a hand, 478
 * for a face — so the palm and face engines receive exactly what they expect,
 * and the overlay tracks while the hand moves rather than measuring one still
 * photograph.
 */
class LandmarkSession(private val hands: Boolean) {
    val overlay = mutableStateListOf<Offset>()
    var points: List<List<Double>> = emptyList()
        private set
    var detecting by mutableStateOf(false)
        private set
    var message by mutableStateOf<String?>(null)

    private val executor = Executors.newSingleThreadExecutor()
    private var handLandmarker: HandLandmarker? = null
    private var faceLandmarker: FaceLandmarker? = null

    fun landmarksJson(): JsonArray = JsonArray(
        points.map { point ->
            buildJsonObject {
                put("x", JsonPrimitive(point[0]))
                put("y", JsonPrimitive(point[1]))
                put("z", JsonPrimitive(point[2]))
            }
        }
    )

    fun start(context: Context, owner: LifecycleOwner, previewView: PreviewView) {
        try {
            val base = BaseOptions.builder()
                .setModelAssetPath(if (hands) "hand_landmarker.task" else "face_landmarker.task")
                .build()
            if (hands) {
                handLandmarker = HandLandmarker.createFromOptions(
                    context,
                    HandLandmarker.HandLandmarkerOptions.builder()
                        .setBaseOptions(base)
                        .setRunningMode(RunningMode.LIVE_STREAM)
                        .setNumHands(1)
                        .setResultListener { result, _ ->
                            val hand = result.landmarks().firstOrNull()
                            if (hand == null || hand.size < 21) clear()
                            else publish(hand.map { listOf(it.x().toDouble(), it.y().toDouble(), it.z().toDouble()) })
                        }
                        .setErrorListener { message = it.message }
                        .build()
                )
            } else {
                faceLandmarker = FaceLandmarker.createFromOptions(
                    context,
                    FaceLandmarker.FaceLandmarkerOptions.builder()
                        .setBaseOptions(base)
                        .setRunningMode(RunningMode.LIVE_STREAM)
                        .setNumFaces(1)
                        .setResultListener { result, _ ->
                            val face = result.faceLandmarks().firstOrNull()
                            if (face == null || face.size < 400) clear()
                            else publish(face.map { listOf(it.x().toDouble(), it.y().toDouble(), it.z().toDouble()) })
                        }
                        .setErrorListener { message = it.message }
                        .build()
                )
            }
        } catch (error: Throwable) {
            message = "The landmark model would not load: ${error.message}"
            return
        }

        val providerFuture = ProcessCameraProvider.getInstance(context)
        providerFuture.addListener({
            val provider = providerFuture.get()
            val preview = Preview.Builder().build().also {
                it.surfaceProvider = previewView.surfaceProvider
            }
            val analysis = ImageAnalysis.Builder()
                .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                .setOutputImageFormat(ImageAnalysis.OUTPUT_IMAGE_FORMAT_RGBA_8888)
                .build()
            analysis.setAnalyzer(executor) { proxy -> analyse(proxy) }
            runCatching {
                provider.unbindAll()
                provider.bindToLifecycle(owner, CameraSelector.DEFAULT_FRONT_CAMERA, preview, analysis)
            }.onFailure { message = "The camera would not open: ${it.message}" }
        }, ContextCompat.getMainExecutor(context))
    }

    private fun analyse(proxy: ImageProxy) {
        try {
            val bitmap = proxy.toBitmap()
            val image = BitmapImageBuilder(bitmap).build()
            val stamp = proxy.imageInfo.timestamp / 1_000_000
            if (hands) handLandmarker?.detectAsync(image, stamp)
            else faceLandmarker?.detectAsync(image, stamp)
        } catch (_: Throwable) {
            // A dropped frame is not worth reporting; the next one arrives in 33ms.
        } finally {
            proxy.close()
        }
    }

    private fun publish(values: List<List<Double>>) {
        points = values
        overlay.clear()
        values.forEach { overlay.add(Offset(it[0].toFloat(), it[1].toFloat())) }
        detecting = true
    }

    private fun clear() {
        overlay.clear()
        detecting = false
    }

    fun stop(context: Context) {
        runCatching { ProcessCameraProvider.getInstance(context).get().unbindAll() }
        handLandmarker?.close()
        faceLandmarker?.close()
    }
}

@Composable
fun CameraPreview(session: LandmarkSession, owner: LifecycleOwner, modifier: Modifier = Modifier) {
    AndroidView(
        factory = { context ->
            PreviewView(context).also { view ->
                view.scaleType = PreviewView.ScaleType.FILL_CENTER
                session.start(context, owner, view)
            }
        },
        modifier = modifier
    )
}

/** The points themselves: small for a face mesh, larger and joined for a hand. */
@Composable
fun LandmarkOverlay(points: List<Offset>, joined: Boolean, modifier: Modifier = Modifier) {
    val bones = listOf(
        0 to 1, 1 to 2, 2 to 3, 3 to 4,
        0 to 5, 5 to 6, 6 to 7, 7 to 8,
        5 to 9, 9 to 10, 10 to 11, 11 to 12,
        9 to 13, 13 to 14, 14 to 15, 15 to 16,
        13 to 17, 17 to 18, 18 to 19, 19 to 20, 0 to 17
    )
    Canvas(modifier) {
        if (points.isEmpty()) return@Canvas
        val scaled = points.map { Offset(it.x * size.width, it.y * size.height) }
        if (joined && scaled.size >= 21) {
            bones.forEach { (a, b) ->
                drawLine(Palette.gold.copy(alpha = 0.75f), scaled[a], scaled[b], 2f)
            }
        }
        val radius = if (joined) 3.5f else 1.1f
        scaled.forEach {
            drawCircle(
                if (joined) Palette.gold else Palette.gold.copy(alpha = 0.65f),
                radius, it
            )
        }
    }
}
