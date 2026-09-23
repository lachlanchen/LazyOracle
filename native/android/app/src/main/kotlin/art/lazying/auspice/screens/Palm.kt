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
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject

private val FINGER_NAMES = mapOf(
    "jupiter" to "Index · 木星丘", "saturn" to "Middle · 土星丘",
    "apollo" to "Ring · 太阳丘", "mercury" to "Little · 水星丘"
)

@Composable
fun PalmScreen(navController: NavController) {
    val context = LocalContext.current
    val owner = LocalLifecycleOwner.current
    val session = remember { LandmarkSession(hands = true) }
    var granted by remember {
        mutableStateOf(
            ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED
        )
    }
    val ask = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted = it }
    LaunchedEffect(Unit) { if (!granted) ask.launch(Manifest.permission.CAMERA) }
    DisposableEffect(Unit) { onDispose { session.stop(context) } }

    var lines by remember { mutableStateOf(LineTraits()) }
    var features by remember { mutableStateOf<PalmFeatures?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var reads by remember { mutableIntStateOf(0) }

    LaunchedEffect(reads) {
        if (reads == 0) return@LaunchedEffect
        val points = session.landmarksJson()
        if (points.size < 21) { error = "No hand is in view."; return@LaunchedEffect }
        runCatching {
            Engines.evaluateAs<PalmFeatures>("palm.features", buildJsonObject {
                put("landmarks", points)
                put("lines", buildJsonObject {
                    put("heart", JsonPrimitive(lines.heart))
                    put("head", JsonPrimitive(lines.head))
                    put("life", JsonPrimitive(lines.life))
                    put("fate", JsonPrimitive(lines.fate))
                })
            })
        }.onSuccess { features = it; error = null }.onFailure { error = it.message }
    }

    ScreenScaffold(
        navController,
        eyebrow = "手相 · Palmistry",
        title = "The hand, measured",
        tagline = "Twenty-one points, read for proportion rather than guessed at."
    ) {
        Panel {
            Box(
                Modifier
                    .fillMaxWidth()
                    .height(320.dp)
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
                    LandmarkOverlay(session.overlay, joined = true, modifier = Modifier.fillMaxSize())
                    if (!session.detecting) {
                        Text(
                            "Hold your open palm to the camera",
                            style = Type.serif(17), color = Palette.ink,
                            modifier = Modifier
                                .clip(CircleShape)
                                .background(Color(0x73000000))
                                .padding(horizontal = 14.dp, vertical = 8.dp)
                        )
                    }
                } else {
                    Text(
                        "Auspice needs the camera to read a hand.",
                        style = Type.serif(17), color = Palette.inkSoft, textAlign = TextAlign.Center
                    )
                }
            }
            session.message?.let { Text(it, style = Type.sans(13), color = Palette.inkMute) }
            PrimaryButton(
                if (features == null) "Read this hand" else "Read it again",
                enabled = session.detecting
            ) { reads++ }
        }

        Panel(title = "The lines") {
            Text(
                "The landmarker sees the shape of the hand, not the creases in it. These four are yours to " +
                    "answer, and the reading says which came from measurement and which from you.",
                style = Type.serif(16), color = Palette.inkSoft
            )
            LineChoice("Heart line ends", listOf("index" to "Under the index", "middle" to "Under the middle", "between" to "Between them"), lines.heart) {
                lines = lines.copy(heart = it); if (features != null) reads++
            }
            LineChoice("Head line", listOf("straight" to "Straight", "curved" to "Curved"), lines.head) {
                lines = lines.copy(head = it); if (features != null) reads++
            }
            LineChoice("Life line", listOf("wide" to "Sweeps wide", "close" to "Hugs the thumb"), lines.life) {
                lines = lines.copy(life = it); if (features != null) reads++
            }
            LineChoice("Fate line", listOf("present" to "Present", "absent" to "Absent", "unsure" to "Not sure"), lines.fate) {
                lines = lines.copy(fate = it); if (features != null) reads++
            }
        }

        error?.let { Panel(title = "Not read") { Text(it, style = Type.serif(16), color = Palette.inkSoft) } }

        features?.let { f ->
            Panel(title = "The hand") {
                Measure("Shape", f.shape.replace("-", " ").replaceFirstChar { it.uppercase() })
                Measure("Palm width to length", String.format("%.2f", f.palmRatio))
                Measure("Fingers to palm", String.format("%.2f", f.fingerRatio))
                Measure("Index to ring", String.format("%.2f", f.indexToRing))
                Measure("Thumb angle", String.format("%.0f°", f.thumbAngle))
                Measure("Openness", String.format("%.2f", f.openness))
            }
            Panel(title = "The fingers") {
                f.fingers.forEach { finger ->
                    Row(Modifier.fillMaxWidth().padding(vertical = 4.dp), verticalAlignment = Alignment.CenterVertically) {
                        Text(FINGER_NAMES[finger.finger] ?: finger.finger, style = Type.serif(16), color = Palette.ink)
                        Spacer(Modifier.weight(1f))
                        Text(finger.length, style = Type.sans(13, FontWeight.SemiBold), color = Palette.gold)
                        Spacer(Modifier.width(8.dp))
                        Text(String.format("%.2f", finger.ratioToSaturn), style = Type.sans(13), color = Palette.inkMute)
                    }
                }
            }
            Panel(title = "The eight mounts") {
                f.palaces.forEach { palace ->
                    Row(
                        Modifier.fillMaxWidth().padding(vertical = 3.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Text(
                            palace.palace, style = Type.serif(17),
                            color = if (palace.state == "full") Palette.gold else Palette.ink,
                            modifier = Modifier.width(74.dp)
                        )
                        Box(Modifier.weight(1f).height(7.dp).clip(CircleShape).background(Color(0x0FFFFFFF))) {
                            Box(
                                Modifier
                                    .fillMaxHeight()
                                    .fillMaxWidth(((palace.prominence + 0.1) / 0.2).coerceIn(0.02, 1.0).toFloat())
                                    .clip(CircleShape)
                                    .background(if (palace.state == "full") Palette.gold else Palette.inkMute)
                            )
                        }
                        Text(palace.state, style = Type.sans(12), color = Palette.inkMute, modifier = Modifier.width(44.dp))
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
                    "Proportions follow classical palmistry: the palm is square when its width reaches 0.86 of " +
                        "its length, the fingers long at 0.78 of the palm, and each finger is measured against " +
                        "the middle one. The mounts come from how far each stands out of the palm plane, which " +
                        "the landmarker reports as depth.",
                    style = Type.serif(16), color = Palette.inkSoft
                )
            }
        }
    }
}

@Composable
private fun LineChoice(label: String, options: List<Pair<String, String>>, selected: String, onPick: (String) -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(7.dp)) {
        FieldLabel(label)
        FlowRowOf {
            options.forEach { (key, title) ->
                Chip(title, null, selected == key) { onPick(key) }
            }
        }
    }
}

@Composable
fun Measure(label: String, value: String) {
    Row(Modifier.fillMaxWidth().padding(vertical = 3.dp), verticalAlignment = Alignment.CenterVertically) {
        Text(label, style = Type.serif(16), color = Palette.inkSoft)
        Spacer(Modifier.weight(1f))
        Text(value, style = Type.sans(15, FontWeight.SemiBold), color = Palette.ink)
    }
}
