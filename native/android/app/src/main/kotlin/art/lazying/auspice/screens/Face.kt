package art.lazying.auspice.screens

import android.Manifest
import android.content.pm.PackageManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import androidx.navigation.NavController
import art.lazying.auspice.*
import kotlin.math.roundToInt
import kotlinx.serialization.json.buildJsonObject

private val COURT_NAMES = mapOf(
    "upper" to "上停 Upper court", "middle" to "中停 Middle court", "lower" to "下停 Lower court"
)
private val ELEMENT_FACES = mapOf(
    "wood" to "木形 Wood", "fire" to "火形 Fire", "earth" to "土形 Earth",
    "metal" to "金形 Metal", "water" to "水形 Water"
)

@Composable
fun FaceScreen(navController: NavController) {
    val context = LocalContext.current
    val owner = LocalLifecycleOwner.current
    val session = remember { LandmarkSession(hands = false) }
    var granted by remember {
        mutableStateOf(
            ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED
        )
    }
    val ask = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted = it }
    LaunchedEffect(Unit) { if (!granted) ask.launch(Manifest.permission.CAMERA) }
    DisposableEffect(Unit) { onDispose { session.stop(context) } }

    var features by remember { mutableStateOf<FaceFeatures?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var reads by remember { mutableIntStateOf(0) }

    LaunchedEffect(reads) {
        if (reads == 0) return@LaunchedEffect
        val points = session.landmarksJson()
        if (points.size < 400) { error = "No face is in view."; return@LaunchedEffect }
        runCatching {
            Engines.evaluateAs<FaceFeatures>("face.features", buildJsonObject { put("landmarks", points) })
        }.onSuccess { features = it; Router.face = it; error = null }.onFailure { error = it.message }
    }

    ScreenScaffold(
        navController,
        eyebrow = "面相 · Face reading",
        title = "Three courts, five eyes",
        tagline = "The proportions the old handbooks measure, measured."
    ) {
        Panel {
            Box(
                Modifier
                    .fillMaxWidth()
                    .height(360.dp)
                    .clip(RoundedCornerShape(16.dp))
                    .border(
                        1.dp,
                        if (session.detecting) Palette.goldLine else Palette.line,
                        RoundedCornerShape(16.dp)
                    ),
                contentAlignment = Alignment.Center
            ) {
                if (granted) {
                    CameraPreview(session, owner, Modifier.fillMaxSize())
                    LandmarkOverlay(session.overlay, joined = false, modifier = Modifier.fillMaxSize())
                    if (!session.detecting) {
                        Text(
                            "Face the camera, level, in even light",
                            style = Type.serif(17), color = Palette.ink,
                            modifier = Modifier
                                .clip(CircleShape)
                                .background(Color(0x73000000))
                                .padding(horizontal = 14.dp, vertical = 8.dp)
                        )
                    }
                    CameraFlipButton(session, owner, Modifier.align(Alignment.TopEnd))
                } else {
                    Text(
                        "Auspice needs the camera to read a face.",
                        style = Type.serif(17), color = Palette.inkSoft, textAlign = TextAlign.Center
                    )
                }
            }
            session.message?.let { Text(it, style = Type.sans(13), color = Palette.inkMute) }
            PrimaryButton(
                if (features == null) "Read this face" else "Read it again",
                enabled = session.detecting
            ) { reads++ }
            Text(
                "The picture is never saved and never leaves this device; only the measurements are kept, " +
                    "and only while you are on this screen.",
                style = Type.sans(12), color = Palette.inkMute
            )
        }

        error?.let { Panel(title = "Not read") { Text(it, style = Type.serif(16), color = Palette.inkSoft) } }

        features?.let { f ->
            Panel(title = "Five-element type") {
                Text(ELEMENT_FACES[f.element] ?: f.element, style = Type.display(28), color = Palette.gold)
                Text(
                    "Read from the height of the face against its width, and from how the jaw and forehead " +
                        "stand against the cheekbones.",
                    style = Type.serif(16), color = Palette.inkSoft
                )
            }

            Panel(title = "The three courts") {
                f.courts.forEach { court ->
                    Row(
                        Modifier.fillMaxWidth().padding(vertical = 4.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Text(
                            COURT_NAMES[court.court] ?: court.court,
                            style = Type.serif(16), color = Palette.ink,
                            modifier = Modifier.width(150.dp)
                        )
                        Box(Modifier.weight(1f).height(7.dp).clip(CircleShape).background(Color(0x0FFFFFFF))) {
                            Box(
                                Modifier
                                    .fillMaxHeight()
                                    .fillMaxWidth((court.share * 2.4).coerceIn(0.0, 1.0).toFloat())
                                    .clip(CircleShape)
                                    .background(if (court.state == "even") Palette.gold else Palette.rose)
                            )
                        }
                        Text(
                            "${(court.share * 100).roundToInt()}%",
                            style = Type.sans(12), color = Palette.inkMute, modifier = Modifier.width(40.dp)
                        )
                    }
                }
                Text(
                    "An even face gives each court a third. 上停 is judged for early life, 中停 for the middle " +
                        "years, 下停 for the later ones.",
                    style = Type.sans(13), color = Palette.inkMute
                )
            }

            Panel(title = "Proportion") {
                Measure("Eyes across the face (ideal 5.00)", String.format("%.2f", f.eyesAcross))
                Measure("Gap between the eyes (ideal 1.00)", String.format("%.2f", f.eyeGap))
                Measure("Height to width", String.format("%.2f", f.heightRatio))
                Measure("Jaw to cheekbones", String.format("%.2f", f.jawRatio))
                Measure("Forehead to cheekbones", String.format("%.2f", f.foreheadRatio))
                Measure("Symmetry (ideal 1.000)", String.format("%.3f", f.symmetry))
            }

            Panel(title = "The twelve palaces") {
                f.palaces.forEach { palace ->
                    Row(
                        Modifier.fillMaxWidth().padding(vertical = 3.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Text(
                            palace.palace, style = Type.serif(17),
                            color = if (palace.state == "generous") Palette.gold else Palette.ink,
                            modifier = Modifier.width(70.dp)
                        )
                        Text(palace.state, style = Type.sans(13, FontWeight.SemiBold), color = Palette.inkSoft)
                        Spacer(Modifier.weight(1f))
                        Text(String.format("%.2f", palace.value), style = Type.sans(13), color = Palette.inkMute)
                    }
                }
                if (f.strongPalaces.isNotEmpty()) {
                    Text(
                        "Standing out: " + f.strongPalaces.joinToString("、"),
                        style = Type.serif(16), color = Palette.gold
                    )
                }
            }

            Panel(title = "Method") {
                Text(
                    "三停五眼: the face is divided at the hairline, the brows, the base of the nose and the " +
                        "chin, and its width is counted in eye-widths. Eight of the twelve palaces are measured " +
                        "here; the rest ask for things a landmark mesh cannot see, and the app does not pretend " +
                        "otherwise.",
                    style = Type.serif(16), color = Palette.inkSoft
                )
            }
        }
    }
}
