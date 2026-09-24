package art.lazying.auspice.screens

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavController
import art.lazying.auspice.*
import java.time.LocalDate
import kotlin.math.roundToInt

private val ELEMENT_ORDER = listOf("木", "火", "土", "金", "水")
private val ELEMENT_NAMES = mapOf("木" to "Wood", "火" to "Fire", "土" to "Earth", "金" to "Metal", "水" to "Water")

fun elementColour(element: String) = when (element) {
    "木" -> Color(0xFF7BC47F)
    "火" -> Palette.rose
    "土" -> Color(0xFFCBA96B)
    "金" -> Color(0xFFE3E3EA)
    "水" -> Color(0xFF7FAEE0)
    else -> Palette.ink
}

@Composable
fun BaziScreen(navController: NavController) {
    var chart by remember { mutableStateOf<BaziChart?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var editing by remember { mutableStateOf(false) }
    val profile = Profiles.profile

    LaunchedEffect(profile) {
        if (!profile.isComplete) { chart = null; return@LaunchedEffect }
        runCatching { Engines.evaluateAs<BaziChart>("bazi.chart", profile.engineInput()) }
            .onSuccess { chart = it; error = null }
            .onFailure { error = l("This reading could not be computed. Please try again.") }
    }

    if (editing) {
        BirthFormDialog(profile, { editing = false }) { Profiles.save(it) }
    }

    ScreenScaffold(
        navController,
        eyebrow = t("practice.bazi"),
        title = t("bazi.title"),
        tagline = t("bazi.tagline")
    ) {
        BirthSummary(profile) { editing = true }

        error?.let { Panel(title = t("common.notComputed")) { Text(it, style = Type.serif(16), color = Palette.inkSoft) } }

        chart?.let { c ->
            ExplainReading(Json.encodeToString(c))
            Panel {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    PillarColumn(t("bazi.hour"), c.pillars.hour, false, Modifier.weight(1f))
                    PillarColumn(t("bazi.day"), c.pillars.day, true, Modifier.weight(1f))
                    PillarColumn(t("bazi.month"), c.pillars.month, false, Modifier.weight(1f))
                    PillarColumn(t("bazi.year"), c.pillars.year, false, Modifier.weight(1f))
                }
            }

            Panel(title = t("bazi.dayMaster")) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text(l(c.dayMaster.stem), style = Type.display(40), color = elementColour(c.dayMaster.element))
                    Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                        Text(
                            "${l(c.dayMaster.yinYang)} · ${l(c.dayMaster.element)}",
                            style = Type.display(19), color = Palette.ink
                        )
                        Text(strengthLine(c.strength), style = Type.serif(16), color = Palette.inkSoft)
                    }
                }
                if (c.favourable.isNotEmpty()) {
                    Text(
                        t("bazi.favourable") + ": " + c.favourable.joinToString(" · ") { l(it) },
                        style = Type.serif(16), color = Palette.inkSoft
                    )
                }
                Text(
                    lf("Year {0}: {1}. Relationship to the day master: {2}.", c.currentYear.year.toString(), c.currentYear.ganzhi, c.currentYear.god),
                    style = Type.serif(16), color = Palette.inkMute
                )
            }

            Panel(title = t("bazi.elements")) {
                ELEMENT_ORDER.forEach { element ->
                    val value = c.elements[element] ?: 0.0
                    val fraction by animateFloatAsState(
                        (value / 8.0).coerceIn(0.0, 1.0).toFloat(),
                        tween(800), label = "element"
                    )
                    Row(
                        Modifier.fillMaxWidth().padding(vertical = 5.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Text(l(element), style = Type.display(18), color = elementColour(element), modifier = Modifier.widthIn(min = 48.dp))
                        Box(
                            Modifier.weight(1f).height(8.dp).clip(CircleShape).background(Color(0x0FFFFFFF))
                        ) {
                            Box(
                                Modifier.fillMaxHeight().fillMaxWidth(fraction)
                                    .clip(CircleShape).background(elementColour(element))
                            )
                        }
                        Text(
                            String.format("%.1f", value),
                            style = Type.sans(13, FontWeight.SemiBold), color = Palette.inkSoft,
                            modifier = Modifier.width(32.dp), textAlign = TextAlign.End
                        )
                    }
                }
            }

            Panel(title = t("bazi.luck")) {
                Text(
                    lf("The first cycle begins {0} years and {1} months after birth, counted to the governing solar term.", c.luckStart.years.toString(), c.luckStart.months.toString()),
                    style = Type.serif(16), color = Palette.inkSoft
                )
                Row(
                    Modifier.horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    val thisYear = LocalDate.now().year
                    c.luckCycles.forEach { cycle ->
                        val current = thisYear in cycle.startYear..cycle.endYear
                        Column(
                            Modifier
                                .clip(RoundedCornerShape(14.dp))
                                .background(if (current) Palette.goldSoft else Color(0x0AFFFFFF))
                                .border(1.dp, if (current) Palette.goldLine else Palette.line, RoundedCornerShape(14.dp))
                                .padding(horizontal = 14.dp, vertical = 10.dp),
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.spacedBy(3.dp)
                        ) {
                            Text(l(cycle.ganzhi), style = Type.display(21), color = if (current) Palette.gold else Palette.ink)
                            Text("${cycle.startAge}–${cycle.startAge + 9}", style = Type.sans(12), color = Palette.inkMute)
                            Text("${cycle.startYear}", style = Type.sans(11), color = Palette.inkMute)
                        }
                    }
                }
            }

            Panel(title = t("common.method")) {
                Text(
                    lf("The Ziping method uses solar terms and true solar time. Your birth time was corrected by {0} minutes for longitude and the equation of time.", c.solarCorrectionMinutes.roundToInt().toString()),
                    style = Type.serif(16), color = Palette.inkSoft
                )
                Text(
                    lf("Between {0} and {1}", c.lunar.jieQiBefore, c.lunar.jieQiAfter),
                    style = Type.serif(15), color = Palette.inkMute
                )
            }
        }
    }
}

@Composable
private fun PillarColumn(label: String, pillar: Pillar, isDay: Boolean, modifier: Modifier = Modifier) {
    Column(modifier, horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Text(
            label.uppercase(),
            style = Type.sans(10, FontWeight.Bold).copy(letterSpacing = 1.4.sp),
            color = Palette.inkMute
        )
        Text(l(pillar.stemGod),
            style = Type.sans(12, FontWeight.SemiBold),
            color = if (isDay) Palette.gold else Palette.inkSoft,
            maxLines = 1
        )
        Column(
            Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(14.dp))
                .background(if (isDay) Palette.goldSoft else Color(0x0AFFFFFF))
                .border(1.dp, if (isDay) Palette.goldLine else Palette.line, RoundedCornerShape(14.dp))
                .padding(vertical = 8.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(l(pillar.stem), style = Type.display(30), color = elementColour(pillar.element))
            Text(l(pillar.branch), style = Type.display(30), color = Palette.ink)
        }
        pillar.hiddenStems.forEach {
            Text("${l(it.stem)} · ${l(it.god)}", style = Type.sans(10), color = Palette.inkMute, maxLines = 1)
        }
        Text(l(pillar.naYin), style = Type.serif(12), color = Palette.inkMute, maxLines = 1)
    }
}

private fun strengthLine(strength: String) = when (strength) {
    "strong" -> t("bazi.strong")
    "weak" -> t("bazi.weak")
    else -> t("bazi.balanced")
}
