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
import androidx.compose.runtime.remember
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
    var overlay by mutableStateOf<List<Offset>>(emptyList()); private set
    var front by mutableStateOf(true); private set
    var canFlip by mutableStateOf(false); private set
    var detecting by mutableStateOf(false); private set
    var ready by mutableStateOf(false); private set
    var imageAspect by mutableStateOf(0.75f); private set
    var message by mutableStateOf<String?>(null); private set
    private val window = CaptureWindow()
    private val main = android.os.Handler(android.os.Looper.getMainLooper())
    private val executor = Executors.newSingleThreadExecutor()
    private var handLandmarker: HandLandmarker? = null
    private var faceLandmarker: FaceLandmarker? = null
    private var surface: Preview.SurfaceProvider? = null
    private var provider: ProcessCameraProvider? = null
    private var uses: List<androidx.camera.core.UseCase> = emptyList()
    private var lastTimestamp = -1L
    @Volatile private var generation = 0
    @Volatile private var closed = false
    @Volatile private var paused = false

    fun captureFrames(): JsonArray = window.snapshot()
    fun pause() { paused=true; clear() }
    fun resume() { paused=false; clear() }

    fun start(context: Context, owner: LifecycleOwner, previewView: PreviewView) {
        surface = previewView.surfaceProvider
        val token = generation
        // Model creation, video inference and teardown share one serial worker.
        executor.execute {
            try {
                val base=BaseOptions.builder().setModelAssetPath(if(hands) "hand_landmarker.task" else "face_landmarker.task").build()
                if(hands) handLandmarker=HandLandmarker.createFromOptions(context,
                    HandLandmarker.HandLandmarkerOptions.builder().setBaseOptions(base).setRunningMode(RunningMode.VIDEO)
                        .setNumHands(1).setMinHandDetectionConfidence(0.7f).setMinHandPresenceConfidence(0.7f).setMinTrackingConfidence(0.7f).build())
                else faceLandmarker=FaceLandmarker.createFromOptions(context,
                    FaceLandmarker.FaceLandmarkerOptions.builder().setBaseOptions(base).setRunningMode(RunningMode.VIDEO)
                        .setNumFaces(1).setMinFaceDetectionConfidence(0.7f).setMinFacePresenceConfidence(0.7f).setMinTrackingConfidence(0.7f).build())
                main.post { if(!closed && token==generation) bind(context,owner) }
            } catch (_: LinkageError) {
                // MediaPipe does not ship every emulator/device ABI. Class
                // initialisation can fail again as NoClassDefFoundError.
                main.post { if(!closed) { clear();message=t("camera.unavailable") } }
            } catch (_: Exception) { main.post { if(!closed) { clear();message=t("camera.retry") } } }
        }
    }

    private fun bind(context: Context, owner: LifecycleOwner) {
        val token=generation
        val future=ProcessCameraProvider.getInstance(context)
        future.addListener({
            if(closed || token!=generation) return@addListener
            runCatching {
                val p=future.get(); provider=p
                canFlip=p.hasCamera(CameraSelector.DEFAULT_FRONT_CAMERA) && p.hasCamera(CameraSelector.DEFAULT_BACK_CAMERA)
                val preview=Preview.Builder().setTargetAspectRatio(androidx.camera.core.AspectRatio.RATIO_4_3).build().also { it.surfaceProvider=surface }
                val analysis=ImageAnalysis.Builder().setTargetResolution(android.util.Size(640,480))
                    .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                    .setOutputImageFormat(ImageAnalysis.OUTPUT_IMAGE_FORMAT_RGBA_8888).build()
                val mirror=front
                analysis.setAnalyzer(executor) { proxy -> analyse(proxy,token,mirror) }
                if(uses.isNotEmpty()) p.unbind(*uses.toTypedArray())
                uses=listOf(preview,analysis)
                p.bindToLifecycle(owner,if(front) CameraSelector.DEFAULT_FRONT_CAMERA else CameraSelector.DEFAULT_BACK_CAMERA,preview,analysis)
            }.onFailure { clear();message=t("camera.unavailable") }
        },ContextCompat.getMainExecutor(context))
    }

    private fun analyse(proxy: ImageProxy, token: Int, mirror: Boolean) {
        var source: android.graphics.Bitmap? = null
        var oriented: android.graphics.Bitmap? = null
        var image: com.google.mediapipe.framework.image.MPImage? = null
        try {
            val stamp=System.nanoTime()/1_000_000
            if(closed || paused || token!=generation || stamp-lastTimestamp<100) return
            lastTimestamp=stamp
            val bitmap=proxy.toBitmap();source=bitmap
            val matrix=android.graphics.Matrix().apply {
                postRotate(proxy.imageInfo.rotationDegrees.toFloat())
                if(mirror) postScale(-1f,1f)
            }
            val upright=android.graphics.Bitmap.createBitmap(bitmap,0,0,bitmap.width,bitmap.height,matrix,true);oriented=upright
            val input=BitmapImageBuilder(upright).build();image=input
            val points=if(hands) handLandmarker?.detectForVideo(input,stamp)?.landmarks()?.firstOrNull()
                else faceLandmarker?.detectForVideo(input,stamp)?.faceLandmarks()?.firstOrNull()
            val values=points?.map { listOf(it.x().toDouble(),it.y().toDouble(),it.z().toDouble()) } ?: emptyList()
            val frame=LandmarkFrame(values,upright.width,upright.height,stamp)
            main.post {
                if(!closed && !paused && token==generation) {
                    if(values.size<(if(hands)21 else 468) || values.any { p->p.any { !it.isFinite() } }) clear()
                    else {
                        window.append(frame);ready=window.ready;detecting=true;message=null
                        imageAspect=frame.width.toFloat()/frame.height
                        overlay=values.map { Offset(it[0].toFloat(),it[1].toFloat()) }
                    }
                }
            }
        } catch (_: Exception) { main.post { if(!closed && token==generation) { clear();message=t("camera.retry") } } }
        finally {
            image?.close()
            if(oriented!==source) oriented?.recycle()
            source?.recycle()
            proxy.close()
        }
    }

    private fun clear() { overlay=emptyList();detecting=false;ready=false;window.clear() }
    fun flip(context: Context,owner: LifecycleOwner) {
        if(closed || !canFlip) return
        generation++;front=!front;clear();bind(context,owner)
    }
    fun stop() {
        if(closed) return
        closed=true;generation++;clear()
        provider?.let { if(uses.isNotEmpty()) it.unbind(*uses.toTypedArray()) };uses=emptyList()
        executor.execute { handLandmarker?.close();faceLandmarker?.close();handLandmarker=null;faceLandmarker=null }
        executor.shutdown()
    }
}

@Composable
fun CameraPreview(session: LandmarkSession, owner: LifecycleOwner, modifier: Modifier = Modifier) {
    androidx.compose.runtime.DisposableEffect(owner,session) {
        val observer=androidx.lifecycle.LifecycleEventObserver { _, event ->
            if(event==androidx.lifecycle.Lifecycle.Event.ON_STOP) session.pause()
            if(event==androidx.lifecycle.Lifecycle.Event.ON_START) session.resume()
        }
        owner.lifecycle.addObserver(observer)
        onDispose { owner.lifecycle.removeObserver(observer) }
    }
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
fun LandmarkOverlay(points: List<Offset>, joined: Boolean, modifier: Modifier = Modifier, imageAspect: Float = 0.75f) {
    val bones = listOf(
        0 to 1, 1 to 2, 2 to 3, 3 to 4,
        0 to 5, 5 to 6, 6 to 7, 7 to 8,
        5 to 9, 9 to 10, 10 to 11, 11 to 12,
        9 to 13, 13 to 14, 14 to 15, 15 to 16,
        13 to 17, 17 to 18, 18 to 19, 19 to 20, 0 to 17
    )
    Canvas(modifier) {
        if (points.isEmpty()) return@Canvas
        val height = maxOf(size.height, size.width/imageAspect)
        val width = height*imageAspect
        val scaled = points.map { Offset(it.x*width-(width-size.width)/2, it.y*height-(height-size.height)/2) }
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
