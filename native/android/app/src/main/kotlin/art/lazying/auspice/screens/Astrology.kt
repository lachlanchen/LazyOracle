package art.lazying.auspice.screens

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.*
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.scale
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.drawIntoCanvas
import androidx.compose.ui.graphics.nativeCanvas
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavController
import art.lazying.auspice.*
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.roundToInt
import kotlin.math.sin
import kotlinx.serialization.json.buildJsonObject

@Composable
fun AstrologyScreen(navController: NavController) {
    var chart by remember { mutableStateOf<NatalChart?>(null) }
    var report by remember { mutableStateOf<TransitReport?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var editing by remember { mutableStateOf(false) }
    val profile = Profiles.profile

    LaunchedEffect(profile) {
        if (!profile.isComplete) { chart = null; return@LaunchedEffect }
        runCatching { Engines.evaluateAs<NatalChart>("astrology.chart", profile.engineInput()) }
            .onSuccess { chart = it; error = null }
            .onFailure { error = it.message }
        report = runCatching {
            Engines.evaluateAs<TransitReport>(
                "astrology.transits",
                buildJsonObject { put("birth", profile.engineInput()) }
            )
        }.getOrNull()
    }

    if (editing) BirthFormDialog(profile, { editing = false }) { Profiles.save(it) }

    ScreenScaffold(
        navController,
        eyebrow = t("practice.astrology"),
        title = t("astro.title"),
        tagline = t("astro.tagline")
    ) {
        BirthSummary(profile) { editing = true }

        error?.let { Panel(title = t("common.notComputed")) { Text(it, style = Type.serif(16), color = Palette.inkSoft) } }

        chart?.let { c ->
            Panel {
                ChartWheel(c)
                Row(
                    Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceEvenly
                ) {
                    AngleLabel(t("astro.ascendant"), c.ascendant)
                    AngleLabel(t("astro.midheaven"), c.midheaven)
                }
            }

            Panel(title = t("astro.placements")) {
                c.placements.forEachIndexed { index, placement ->
                    Row(
                        Modifier.fillMaxWidth().padding(vertical = 5.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        Text(
                            Zodiac.bodySymbols[placement.body] ?: "",
                            style = Type.display(21), color = Palette.gold, modifier = Modifier.width(26.dp)
                        )
                        Text(
                            placement.body,
                            style = Type.sans(15, FontWeight.SemiBold), color = Palette.ink,
                            modifier = Modifier.width(80.dp)
                        )
                        Text(degreeText(placement.longitude), style = Type.serif(16), color = Palette.inkSoft)
                        if (placement.retrograde) Text("℞", style = Type.display(15), color = Palette.rose)
                        Spacer(Modifier.weight(1f))
                        Text("${t("astro.house")} ${placement.house}", style = Type.sans(12), color = Palette.inkMute)
                    }
                    if (index < c.placements.lastIndex) HorizontalDivider(color = Palette.line)
                }
            }

            if (c.aspects.isNotEmpty()) {
                Panel(title = t("astro.aspects")) {
                    c.aspects.forEach { aspect ->
                        Row(
                            Modifier.fillMaxWidth().padding(vertical = 4.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            Text(
                                "${Zodiac.bodySymbols[aspect.a] ?: ""} ${aspectGlyph(aspect.type)} ${Zodiac.bodySymbols[aspect.b] ?: ""}",
                                style = Type.display(18), color = aspectColour(aspect.type)
                            )
                            Text(
                                "${aspect.a} ${aspect.type} ${aspect.b}",
                                style = Type.serif(15), color = Palette.inkSoft
                            )
                            Spacer(Modifier.weight(1f))
                            Text(String.format("%.1f°", aspect.orb), style = Type.sans(12), color = Palette.inkMute)
                        }
                    }
                }
            }

            report?.takeIf { it.transits.isNotEmpty() }?.let { r ->
                Panel(title = t("astro.transits")) {
                    r.transits.take(12).forEach { transit ->
                        Row(
                            Modifier.fillMaxWidth().padding(vertical = 3.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            Text(
                                "${Zodiac.bodySymbols[transit.transiting] ?: ""} ${aspectGlyph(transit.type)} ${Zodiac.bodySymbols[transit.natal] ?: ""}",
                                style = Type.display(18), color = aspectColour(transit.type)
                            )
                            Text(
                                "transiting ${transit.transiting} ${transit.type} natal ${transit.natal}",
                                style = Type.serif(15), color = Palette.inkSoft
                            )
                        }
                    }
                }
            }

            Panel(title = t("common.method")) {
                Text(
                    "Positions come from the astronomy engine for the exact instant of birth in UTC, with " +
                        "whole-sign houses counted from the ascendant. The moon stands at " +
                        "${(c.moonPhase * 100).roundToInt()}% of its cycle.",
                    style = Type.serif(16), color = Palette.inkSoft
                )
            }
        }
    }
}

@Composable
private fun AngleLabel(label: String, degrees: Double) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(
            label.uppercase(),
            style = Type.sans(10, FontWeight.Bold).copy(letterSpacing = 1.6.sp),
            color = Palette.inkMute
        )
        Text(degreeText(degrees), style = Type.display(17), color = Palette.gold)
    }
}

/** Signs on the rim, whole-sign houses from the ascendant, aspects across the middle. */
@Composable
private fun ChartWheel(chart: NatalChart) {
    var appeared by remember { mutableStateOf(false) }
    LaunchedEffect(chart) { appeared = true }
    val enter by animateFloatAsState(if (appeared) 1f else 0f, tween(1100), label = "wheel")

    Canvas(
        Modifier
            .fillMaxWidth()
            .aspectRatio(1f)
            .alpha(enter)
            .scale(0.92f + 0.08f * enter)
    ) {
        val centre = Offset(size.width / 2, size.height / 2)
        val extent = minOf(size.width, size.height)
        val outer = extent * 0.47f
        val inner = extent * 0.33f
        val aspectRadius = extent * 0.30f

        fun at(radius: Float, longitude: Double): Offset {
            val angle = (180 - longitude) * PI / 180
            return Offset(centre.x + (cos(angle) * radius).toFloat(), centre.y - (sin(angle) * radius).toFloat())
        }

        drawCircle(Palette.goldLine, outer, centre, style = Stroke(1f))
        drawCircle(Palette.line, inner, centre, style = Stroke(1f))
        for (index in 0 until 12) {
            val longitude = index * 30.0
            drawLine(Palette.line, at(inner, longitude), at(outer, longitude), 1f)
            val house = chart.ascendantSign * 30.0 + index * 30.0
            drawLine(Palette.gold.copy(alpha = 0.25f), at(aspectRadius, house), at(inner, house), 1f)
        }
        chart.aspects.forEach { aspect ->
            val a = chart.placements.firstOrNull { it.body == aspect.a } ?: return@forEach
            val b = chart.placements.firstOrNull { it.body == aspect.b } ?: return@forEach
            drawLine(
                when (aspect.type) {
                    "trine", "sextile" -> Color(0x8C7BC47F)
                    "square", "opposition" -> Palette.rose.copy(alpha = 0.5f)
                    else -> Palette.gold.copy(alpha = 0.5f)
                },
                at(aspectRadius, a.longitude), at(aspectRadius, b.longitude), 1f
            )
        }
        drawLine(Palette.gold, at(aspectRadius, chart.ascendant), at(outer, chart.ascendant), 2f)

        drawIntoCanvas { canvas ->
            val paint = android.graphics.Paint().apply {
                color = android.graphics.Color.argb(128, 244, 239, 228)
                textAlign = android.graphics.Paint.Align.CENTER
                textSize = extent * 0.05f
                isAntiAlias = true
            }
            for (index in 0 until 12) {
                val point = at((outer + inner) / 2, index * 30.0 + 15)
                canvas.nativeCanvas.drawText(Zodiac.signs[index].third, point.x, point.y + paint.textSize / 3, paint)
            }
            paint.color = android.graphics.Color.rgb(217, 180, 90)
            paint.textSize = extent * 0.062f
            chart.placements.forEach { placement ->
                val point = at(inner * 0.86f, placement.longitude)
                canvas.nativeCanvas.drawText(
                    Zodiac.bodySymbols[placement.body] ?: "",
                    point.x, point.y + paint.textSize / 3, paint
                )
            }
        }
    }
}

private fun degreeText(longitude: Double): String {
    val sign = ((longitude / 30).toInt()) % 12
    val within = longitude - sign * 30
    val degrees = within.toInt()
    val minutes = ((within - degrees) * 60).toInt()
    return String.format("%d°%02d′ %s %s", degrees, minutes, Zodiac.signs[sign].third, Zodiac.signs[sign].second)
}

private fun aspectGlyph(type: String) = when (type) {
    "conjunction" -> "☌"
    "sextile" -> "⚹"
    "square" -> "□"
    "trine" -> "△"
    else -> "☍"
}

private fun aspectColour(type: String) = when (type) {
    "trine", "sextile" -> Color(0xFF7BC47F)
    "square", "opposition" -> Palette.rose
    else -> Palette.gold
}
