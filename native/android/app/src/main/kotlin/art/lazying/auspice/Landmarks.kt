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
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.draw.clip
import androidx.compose.ui.composed
import androidx.compose.ui.input.nestedscroll.NestedScrollConnection
import androidx.compose.ui.input.nestedscroll.NestedScrollSource
import androidx.compose.ui.input.nestedscroll.nestedScroll
import androidx.compose.ui.unit.dp
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
    /** One state object for the whole set: 478 face points as 478 separate
     *  state writes would recompose the overlay four hundred times a frame. */
    var overlay by mutableStateOf<List<Offset>>(emptyList())
        private set

    /** The front camera reads your own hand or face; the back one reads the
     *  person sitting opposite, which is how a reading is actually given. */
    var front by mutableStateOf(true)
        private set
    var canFlip by mutableStateOf(false)
        private set
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
                        .setErrorListener { message = t("camera.retry") }
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
                        .setErrorListener { message = t("camera.retry") }
                        .build()
                )
            }
        } catch (error: Throwable) {
            message = t("camera.retry")
            return
        }

        surface = previewView.surfaceProvider
        bind(context, owner)
    }

    private var surface: Preview.SurfaceProvider? = null

    private fun bind(context: Context, owner: LifecycleOwner) {
        val providerFuture = ProcessCameraProvider.getInstance(context)
        providerFuture.addListener({
            val provider = providerFuture.get()
            canFlip = provider.hasCamera(CameraSelector.DEFAULT_FRONT_CAMERA) &&
                provider.hasCamera(CameraSelector.DEFAULT_BACK_CAMERA)
            val preview = Preview.Builder().build().also { it.surfaceProvider = surface }
            val analysis = ImageAnalysis.Builder()
                .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                .setOutputImageFormat(ImageAnalysis.OUTPUT_IMAGE_FORMAT_RGBA_8888)
                .build()
            analysis.setAnalyzer(executor) { proxy -> analyse(proxy) }
            val lens = if (front) CameraSelector.DEFAULT_FRONT_CAMERA else CameraSelector.DEFAULT_BACK_CAMERA
            runCatching {
                provider.unbindAll()
                provider.bindToLifecycle(owner, lens, preview, analysis)
            }.onFailure { message = t("camera.unavailable") }
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
        overlay = values.map { Offset(it[0].toFloat(), it[1].toFloat()) }
        detecting = true
    }

    private fun clear() {
        overlay = emptyList()
        detecting = false
    }

    /** Turn the camera round, rebinding the same analyser to the other lens. */
    fun flip(context: Context, owner: LifecycleOwner) {
        front = !front
        clear()
        bind(context, owner)
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

/** The flip control, sitting over the preview; only shown if both lenses exist. */
@Composable
fun CameraFlipButton(
    session: LandmarkSession,
    owner: LifecycleOwner,
    modifier: Modifier = Modifier
) {
    val context = androidx.compose.ui.platform.LocalContext.current
    if (session.canFlip) {
        androidx.compose.material3.Text(
            if (session.front) t("camera.front") else t("camera.back"),
            style = Type.sans(13, androidx.compose.ui.text.font.FontWeight.SemiBold),
            color = Palette.ink,
            modifier = modifier
                .padding(10.dp)
                .clip(androidx.compose.foundation.shape.CircleShape)
                .background(Color(0x73000000))
                .border(1.dp, Palette.goldLine, androidx.compose.foundation.shape.CircleShape)
                .clickable { session.flip(context, owner) }
                .padding(horizontal = 14.dp, vertical = 9.dp)
        )
    }
}

/** Scrolling puts the keyboard away, the way every other chat app behaves. */
fun Modifier.dismissKeyboardOnScroll(): Modifier = composed {
    val keyboard = androidx.compose.ui.platform.LocalSoftwareKeyboardController.current
    val focus = androidx.compose.ui.platform.LocalFocusManager.current
    nestedScroll(remember {
        object : NestedScrollConnection {
            override fun onPreScroll(available: Offset, source: NestedScrollSource): Offset {
                if (kotlin.math.abs(available.y) > 6f) {
                    keyboard?.hide()
                    focus.clearFocus()
                }
                return Offset.Zero
            }
        }
    })
}
