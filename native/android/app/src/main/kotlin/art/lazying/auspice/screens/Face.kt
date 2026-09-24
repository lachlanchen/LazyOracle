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
import kotlin.math.roundToInt
import kotlinx.serialization.json.buildJsonObject

private val COURT_NAMES = mapOf(
    "upper" to "Upper court", "middle" to "Middle court", "lower" to "Lower court"
)
private val ELEMENT_FACES = mapOf(
    "wood" to "Wood", "fire" to "Fire", "earth" to "Earth",
    "metal" to "Metal", "water" to "Water"
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
    DisposableEffect(Unit) { onDispose { session.stop() } }

    var features by rememberPracticeState<FaceFeatures?>("face.capture", null)
    var error by remember { mutableStateOf<String?>(null) }
    var reads by remember { mutableIntStateOf(0) }
    LaunchedEffect(features) { Router.face = features }

    LaunchedEffect(reads) {
        if (reads == 0) return@LaunchedEffect
        val frames = session.captureFrames()
        if (frames.isEmpty()) { error = t("vision.hold"); return@LaunchedEffect }
        runCatching {
            Engines.evaluateAs<FaceFeatures>("face.capture", buildJsonObject { put("frames", frames) })
        }.onSuccess { features = it; Router.face = it; error = null }.onFailure { error = visionError(it) }
    }

    ScreenScaffold(
        navController,
        eyebrow = t("practice.face"),
        title = t("face.title"),
        tagline = t("face.tagline")
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
                    LandmarkOverlay(session.overlay, joined = false, modifier = Modifier.fillMaxSize(), imageAspect = session.imageAspect)
                    if (!session.detecting) {
                        Text(
                            t("face.hint"),
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
                if (features == null) t("face.read") else t("palm.readAgain"),
                enabled = session.ready
            ) { reads++ }
            Text(
                t("face.privacy"),
                style = Type.sans(12), color = Palette.inkMute
            )
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
            Panel(title = t("face.element")) {
                Text(if(f.element=="mixed") t("vision.mixed") else l(ELEMENT_FACES[f.element] ?: f.element), style = Type.display(28), color = Palette.gold)
                Text(l("Read from the height of the face against its width, and from how the jaw and forehead stand against the cheekbones."),
                    style = Type.serif(16), color = Palette.inkSoft
                )
            }

            Panel(title = t("face.courts")) {
                f.courts.forEach { court ->
                    Row(
                        Modifier.fillMaxWidth().padding(vertical = 4.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Text(l(COURT_NAMES[court.court] ?: court.court),
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
                Text(t("vision.courts"),
                    style = Type.sans(13), color = Palette.inkMute
                )
            }

            Panel(title = t("face.proportion")) {
                Measure(l("Eyes across the face") + " (5.00)", String.format("%.2f", f.eyesAcross))
                Measure(l("Gap between the eyes") + " (1.00)", String.format("%.2f", f.eyeGap))
                Measure(l("Height to width"), String.format("%.2f", f.heightRatio))
                Measure(l("Jaw to cheekbones"), String.format("%.2f", f.jawRatio))
                Measure(l("Forehead to cheekbones"), String.format("%.2f", f.foreheadRatio))
                Measure(l("Symmetry") + " (1.000)", String.format("%.3f", f.symmetry))
            }

            Panel(title = t("face.palaces")) {
                f.palaces.forEach { palace ->
                    Row(
                        Modifier.fillMaxWidth().padding(vertical = 3.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Text(l(palace.palace), style = Type.serif(17),
                            color = if (palace.state == "generous") Palette.gold else Palette.ink,
                            modifier = Modifier.width(70.dp)
                        )
                        Text(visionState(palace.state), style = Type.sans(13, FontWeight.SemiBold), color = Palette.inkSoft)
                        Spacer(Modifier.weight(1f))
                        Text(String.format("%.2f", palace.value), style = Type.sans(13), color = Palette.inkMute)
                    }
                }
                if (f.strongPalaces.isNotEmpty()) {
                    Text(
                        lf("Standing out: {0}", f.strongPalaces.joinToString(" · ") { l(it) }),
                        style = Type.serif(16), color = Palette.gold
                    )
                }
            }

            Panel(title = t("common.method")) {
                Text(t("vision.faceMethod"),
                    style = Type.serif(16), color = Palette.inkSoft
                )
            }
            ExplainReading(Json.encodeToString(f))
        }
    }
}
