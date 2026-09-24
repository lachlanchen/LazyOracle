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
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
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
    "jupiter" to "Index finger", "saturn" to "Middle finger",
    "apollo" to "Ring finger", "mercury" to "Little finger"
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
    DisposableEffect(Unit) { onDispose { session.stop() } }

    var lines by rememberPracticeState("palm.lines", LineTraits())
    var features by rememberPracticeState<PalmFeatures?>("palm.capture", null)
    var error by remember { mutableStateOf<String?>(null) }
    var reads by remember { mutableIntStateOf(0) }
    LaunchedEffect(features) { Router.palm = features }

    LaunchedEffect(reads) {
        if (reads == 0) return@LaunchedEffect
        val frames = session.captureFrames()
        if (frames.isEmpty()) { error = t("vision.hold"); return@LaunchedEffect }
        runCatching {
            Engines.evaluateAs<PalmFeatures>("palm.capture", buildJsonObject {
                put("frames", frames)
                put("lines", buildJsonObject {
                    put("heart", JsonPrimitive(lines.heart))
                    put("head", JsonPrimitive(lines.head))
                    put("life", JsonPrimitive(lines.life))
                    put("fate", JsonPrimitive(lines.fate))
                })
            })
        }.onSuccess { features = it; Router.palm = it; error = null }.onFailure { error = visionError(it) }
    }

    ScreenScaffold(
        navController,
        eyebrow = t("practice.palm"),
        title = t("palm.title"),
        tagline = t("palm.tagline")
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
                    LandmarkOverlay(session.overlay, joined = true, modifier = Modifier.fillMaxSize(), imageAspect = session.imageAspect)
                    if (!session.detecting) {
                        Text(
                            t("palm.hint"),
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
                        t("camera.needed"),
                        style = Type.serif(17), color = Palette.inkSoft, textAlign = TextAlign.Center
                    )
                }
            }
            session.message?.let { Text(it, style = Type.sans(13), color = Palette.inkMute) }
            Text(t(if(session.ready) "vision.ready" else "vision.hold"), style = Type.sans(13), color = Palette.inkMute)
            PrimaryButton(
                if (features == null) t("palm.read") else t("palm.readAgain"),
                enabled = session.ready
            ) { reads++ }
            Text(t("face.privacy"), style = Type.sans(12), color = Palette.inkMute)
        }

        Panel(title = t("palm.lines")) {
            Text(
                t("palm.linesNote"),
                style = Type.serif(16), color = Palette.inkSoft
            )
            LineChoice(l("Heart line ends"), listOf("unsure" to "Not sure", "index" to "Under the index", "middle" to "Under the middle", "between" to "Between them"), lines.heart) {
                lines = lines.copy(heart = it); features = features?.copy(lines = lines); Router.palm = features
            }
            LineChoice(l("Head line"), listOf("unsure" to "Not sure", "straight" to "Straight", "curved" to "Curved"), lines.head) {
                lines = lines.copy(head = it); features = features?.copy(lines = lines); Router.palm = features
            }
            LineChoice(l("Life line"), listOf("unsure" to "Not sure", "wide" to "Sweeps wide", "close" to "Hugs the thumb"), lines.life) {
                lines = lines.copy(life = it); features = features?.copy(lines = lines); Router.palm = features
            }
            LineChoice(l("Fate line"), listOf("present" to "Present", "absent" to "Absent", "unsure" to "Not sure"), lines.fate) {
                lines = lines.copy(fate = it); features = features?.copy(lines = lines); Router.palm = features
            }
        }

        error?.let { Panel(title = t("common.notComputed")) { Text(it, style = Type.serif(16), color = Palette.inkSoft) } }

        features?.let { f ->
            Panel(title = t("vision.measurement")) {
                Text(t(if(f.measurement == null) "vision.legacy" else "vision.measured"), style=Type.sans(14), color=Palette.inkSoft)
                f.measurement?.takeIf { it.typeCandidates.size>1 }?.let { m ->
                    Text(m.typeCandidates.joinToString(" / ") { l(it.replaceFirstChar { c->c.uppercase() }) },style=Type.serif(17),color=Palette.gold)
                    Text(t("vision.boundary"),style=Type.sans(13),color=Palette.inkMute)
                }
            }
            Panel(title = t("palm.hand")) {
                Measure(l("Shape"), if(f.shape=="mixed") t("vision.mixed") else l(f.shape.replaceFirstChar { it.uppercase() }))
                Measure(l("Palm width to length"), String.format("%.2f", f.palmRatio))
                Measure(l("Fingers to palm"), String.format("%.2f", f.fingerRatio))
                Measure(l("Index to ring"), String.format("%.2f", f.indexToRing))
                Measure(l("Thumb angle"), String.format("%.0f°", f.thumbAngle))
                Measure(l("Openness"), String.format("%.2f", f.openness))
            }
            Panel(title = t("palm.fingers")) {
                f.fingers.forEach { finger ->
                    Row(Modifier.fillMaxWidth().padding(vertical = 4.dp), verticalAlignment = Alignment.CenterVertically) {
                        Text(l(FINGER_NAMES[finger.finger] ?: finger.finger), style = Type.serif(16), color = Palette.ink)
                        Spacer(Modifier.weight(1f))
                        Text(visionState(finger.length), style = Type.sans(13, FontWeight.SemiBold), color = Palette.gold)
                        Spacer(Modifier.width(8.dp))
                        Text(String.format("%.2f", finger.ratioToSaturn), style = Type.sans(13), color = Palette.inkMute)
                    }
                }
            }
            Panel(title = t("common.method")) {
                Text(t("vision.palmMethod"),
                    style = Type.serif(16), color = Palette.inkSoft
                )
            }
            ExplainReading(Json.encodeToString(f))
        }
    }
}

@Composable
private fun LineChoice(label: String, options: List<Pair<String, String>>, selected: String, onPick: (String) -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(7.dp)) {
        FieldLabel(label)
        FlowRowOf {
            options.forEach { (key, title) ->
                Chip(l(title), null, selected == key) { onPick(key) }
            }
        }
    }
}

@Composable
fun Measure(label: String, value: String) {
    Row(Modifier.fillMaxWidth().padding(vertical = 3.dp), verticalAlignment = Alignment.CenterVertically) {
        Text(l(label), style = Type.serif(16), color = Palette.inkSoft)
        Spacer(Modifier.weight(1f))
        Text(l(value), style = Type.sans(15, FontWeight.SemiBold), color = Palette.ink)
    }
}
