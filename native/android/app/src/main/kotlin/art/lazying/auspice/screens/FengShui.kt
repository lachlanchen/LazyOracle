package art.lazying.auspice.screens

import android.content.Context
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.drawIntoCanvas
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.graphics.nativeCanvas
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavController
import art.lazying.auspice.*
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.roundToInt
import kotlin.math.sin
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject

private val DIRECTIONS = listOf("N", "NE", "E", "SE", "S", "SW", "W", "NW")

/** The device compass. Rotation vector first; it is steadier than the raw magnetometer. */
@Composable
private fun rememberHeading(): State<Float?> {
    val context = LocalContext.current
    val heading = remember { mutableStateOf<Float?>(null) }
    DisposableEffect(Unit) {
        val manager = context.getSystemService(Context.SENSOR_SERVICE) as? SensorManager
        val sensor = manager?.getDefaultSensor(Sensor.TYPE_ROTATION_VECTOR)
        val matrix = FloatArray(9)
        val orientation = FloatArray(3)
        val listener = object : SensorEventListener {
            override fun onSensorChanged(event: SensorEvent) {
                SensorManager.getRotationMatrixFromVector(matrix, event.values)
                SensorManager.getOrientation(matrix, orientation)
                val degrees = Math.toDegrees(orientation[0].toDouble()).toFloat()
                heading.value = (degrees + 360f) % 360f
            }

            override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {}
        }
        if (sensor != null) manager.registerListener(listener, sensor, SensorManager.SENSOR_DELAY_UI)
        onDispose { manager?.unregisterListener(listener) }
    }
    return heading
}

@Composable
fun FengShuiScreen(navController: NavController) {
    var mansions by remember { mutableStateOf<EightMansions?>(null) }
    var facing by remember { mutableStateOf<String?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var editing by remember { mutableStateOf(false) }
    val profile = Profiles.profile
    val heading by rememberHeading()

    LaunchedEffect(profile) {
        if (!profile.isComplete) { mansions = null; return@LaunchedEffect }
        runCatching {
            Engines.evaluateAs<EightMansions>("fengshui.mansions", buildJsonObject {
                put("year", JsonPrimitive(profile.year))
                put("month", JsonPrimitive(profile.month))
                put("day", JsonPrimitive(profile.day))
                put("gender", JsonPrimitive(profile.gender))
            })
        }.onSuccess { mansions = it; error = null }.onFailure { error = it.message }
    }

    LaunchedEffect(heading?.roundToInt()) {
        val degrees = heading ?: return@LaunchedEffect
        facing = runCatching {
            Engines.evaluateAs<String>(
                "fengshui.sector",
                buildJsonObject { put("heading", JsonPrimitive(degrees)) }
            )
        }.getOrNull()
    }

    if (editing) BirthFormDialog(profile, { editing = false }) { Profiles.save(it) }

    ScreenScaffold(
        navController,
        eyebrow = t("practice.fengshui"),
        title = t("fengshui.title"),
        tagline = t("fengshui.tagline")
    ) {
        BirthSummary(profile) { editing = true }

        error?.let { Panel(title = t("common.notComputed")) { Text(it, style = Type.serif(16), color = Palette.inkSoft) } }

        mansions?.let { m ->
            Panel {
                BaguaRose(m, heading)
                val sector = facing?.let { name -> m.sectors.firstOrNull { it.direction == name } }
                if (heading != null && sector != null) {
                    Column(
                        Modifier.fillMaxWidth(),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(3.dp)
                    ) {
                        Text(
                            "${t("fengshui.facing")} ${sector.direction} · ${heading!!.roundToInt()}°",
                            style = Type.display(18), color = Palette.ink
                        )
                        Text(
                            "${sector.quality.name.zh} ${sector.quality.name.en}",
                            style = Type.serif(17),
                            color = if (sector.quality.auspicious) Palette.gold else Palette.rose
                        )
                        Text(
                            sector.quality.use.en,
                            style = Type.serif(15), color = Palette.inkSoft, textAlign = TextAlign.Center
                        )
                    }
                } else {
                    Text(
                        t("fengshui.noCompass"),
                        style = Type.sans(13), color = Palette.inkMute,
                        modifier = Modifier.fillMaxWidth(), textAlign = TextAlign.Center
                    )
                }
            }

            Panel(title = t("fengshui.yourGua")) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text(m.gua, style = Type.display(40), color = Palette.gold)
                    Column(verticalArrangement = Arrangement.spacedBy(3.dp)) {
                        Text(
                            "${m.guaNumber} · ${if (m.group == "east") "East group 东四命" else "West group 西四命"}",
                            style = Type.display(18), color = Palette.ink
                        )
                        Text(
                            "Counted from the BaZi year ${m.year}, which begins at 立春 rather than on 1 January.",
                            style = Type.serif(15), color = Palette.inkMute
                        )
                    }
                }
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    Badge(t("fengshui.best"), m.best, Palette.gold)
                    Badge(t("fengshui.worst"), m.worst, Palette.rose)
                }
            }

            Panel(title = t("fengshui.sectors")) {
                m.sectors.forEachIndexed { index, sector ->
                    Row(
                        Modifier.fillMaxWidth().padding(vertical = 6.dp),
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        Text(
                            sector.direction,
                            style = Type.display(18),
                            color = if (sector.quality.auspicious) Palette.gold else Palette.rose,
                            modifier = Modifier.width(36.dp)
                        )
                        Column(verticalArrangement = Arrangement.spacedBy(3.dp)) {
                            Text(
                                "${sector.quality.name.zh} · ${sector.quality.name.en}",
                                style = Type.serif(17), color = Palette.ink
                            )
                            Text(sector.quality.use.en, style = Type.serif(15), color = Palette.inkSoft)
                            Text(sector.quality.use.zh, style = Type.serif(14), color = Palette.inkMute)
                        }
                    }
                    if (index < m.sectors.lastIndex) HorizontalDivider(color = Palette.line)
                }
            }
        }
    }
}

@Composable
private fun Badge(label: String, direction: String, colour: Color) {
    Row(
        Modifier
            .clip(CircleShape)
            .background(colour.copy(alpha = 0.14f))
            .border(1.dp, colour.copy(alpha = 0.4f), CircleShape)
            .heightIn(min = 40.dp)
            .padding(horizontal = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(6.dp)
    ) {
        Text(
            label.uppercase(),
            style = Type.sans(10, FontWeight.Bold).copy(letterSpacing = 1.4.sp),
            color = Palette.inkMute
        )
        Text(direction, style = Type.display(17), color = colour)
    }
}

/** The eight directions as a rose, with the device heading as a needle over it. */
@Composable
private fun BaguaRose(mansions: EightMansions, heading: Float?) {
    val needle by animateFloatAsState(heading ?: 0f, tween(250), label = "needle")
    Canvas(Modifier.fillMaxWidth().aspectRatio(1f)) {
        val centre = Offset(size.width / 2, size.height / 2)
        val extent = minOf(size.width, size.height)
        val outer = extent * 0.46f
        val inner = extent * 0.19f

        DIRECTIONS.forEachIndexed { index, direction ->
            val sector = mansions.sectors.firstOrNull { it.direction == direction } ?: return@forEachIndexed
            val start = index * 45f - 22.5f - 90f
            val colour = if (sector.quality.auspicious) {
                Palette.gold.copy(alpha = if (direction == mansions.best) 0.34f else 0.17f)
            } else {
                Palette.rose.copy(alpha = if (direction == mansions.worst) 0.30f else 0.13f)
            }
            drawArc(
                colour,
                startAngle = start,
                sweepAngle = 45f,
                useCenter = true,
                topLeft = Offset(centre.x - outer, centre.y - outer),
                size = androidx.compose.ui.geometry.Size(outer * 2, outer * 2)
            )
            val path = Path().apply {
                moveTo(centre.x, centre.y)
                arcTo(
                    Rect(centre.x - outer, centre.y - outer, centre.x + outer, centre.y + outer),
                    start, 45f, false
                )
                close()
            }
            drawPath(path, Palette.line, style = Stroke(1f))
        }
        drawCircle(Palette.night, inner, centre)
        drawCircle(Palette.goldLine, inner, centre, style = Stroke(1f))

        drawIntoCanvas { canvas ->
            val paint = android.graphics.Paint().apply {
                color = android.graphics.Color.rgb(244, 239, 228)
                textAlign = android.graphics.Paint.Align.CENTER
                textSize = extent * 0.055f
                isAntiAlias = true
            }
            DIRECTIONS.forEachIndexed { index, direction ->
                val angle = (index * 45f - 90f) * PI / 180
                val radius = (outer + inner) / 2
                val x = centre.x + (cos(angle) * radius).toFloat()
                val y = centre.y + (sin(angle) * radius).toFloat()
                canvas.nativeCanvas.drawText(direction, x, y, paint)
                val sector = mansions.sectors.firstOrNull { it.direction == direction }
                if (sector != null) {
                    paint.textSize = extent * 0.045f
                    paint.color = android.graphics.Color.argb(184, 244, 239, 228)
                    canvas.nativeCanvas.drawText(sector.quality.name.zh, x, y + extent * 0.055f, paint)
                    paint.textSize = extent * 0.055f
                    paint.color = android.graphics.Color.rgb(244, 239, 228)
                }
            }
            paint.color = android.graphics.Color.rgb(217, 180, 90)
            paint.textSize = extent * 0.12f
            canvas.nativeCanvas.drawText(mansions.gua, centre.x, centre.y + paint.textSize / 3, paint)
        }

        if (heading != null) {
            rotate(-needle, centre) {
                val path = Path().apply {
                    moveTo(centre.x, centre.y - outer * 0.95f)
                    lineTo(centre.x + extent * 0.025f, centre.y)
                    lineTo(centre.x - extent * 0.025f, centre.y)
                    close()
                }
                drawPath(path, Palette.gold)
            }
        }
    }
}
