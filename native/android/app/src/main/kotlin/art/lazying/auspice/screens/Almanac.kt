package art.lazying.auspice.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ChevronLeft
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavController
import art.lazying.auspice.*
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject

@Composable
fun AlmanacScreen(navController: NavController) {
    var dateText by rememberPracticeState("almanac.date", LocalDate.now().toString())
    val date = LocalDate.parse(dateText)
    var activity by rememberPracticeState<String?>("almanac.activity", null)
    var day by remember { mutableStateOf<AlmanacDay?>(null) }
    var activities by remember { mutableStateOf<List<AlmanacActivity>>(emptyList()) }
    var error by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(date, activity) {
        runCatching {
            if (activities.isEmpty()) {
                activities = Engines.evaluateAs("almanac.activities")
            }
            day = Engines.evaluateAs(
                "almanac.day",
                buildJsonObject {
                    put("date", JsonPrimitive(date.toString()))
                    activity?.let { put("activity", JsonPrimitive(it)) }
                }
            )
            error = null
        }.onFailure { error = l("This reading could not be computed. Please try again.") }
    }

    ScreenScaffold(
        navController,
        eyebrow = t("practice.almanac"),
        title = t("almanac.title"),
        tagline = t("almanac.tagline")
    ) {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Icon(
                Icons.Default.ChevronLeft, "Previous day", tint = Palette.inkSoft,
                modifier = Modifier.size(44.dp).clip(CircleShape)
                    .clickable { dateText = date.minusDays(1).toString() }.padding(10.dp)
            )
            Column(Modifier.weight(1f), horizontalAlignment = Alignment.CenterHorizontally) {
                Text(
                    date.format(DateTimeFormatter.ofPattern("EEEE, d MMMM", java.util.Locale.forLanguageTag(Localisation.code))),
                    style = Type.display(18), color = Palette.ink
                )
                day?.let { Text(lunarDateText(it.lunar.text), style = Type.serif(15), color = Palette.inkMute) }
            }
            Icon(
                Icons.Default.ChevronRight, "Next day", tint = Palette.inkSoft,
                modifier = Modifier.size(44.dp).clip(CircleShape)
                    .clickable { dateText = date.plusDays(1).toString() }.padding(10.dp)
            )
        }

        error?.let {
            Panel(title = t("common.notComputed")) { Text(it, style = Type.serif(16), color = Palette.inkSoft) }
        }

        day?.let { d ->
            ExplainReading(Json.encodeToString(d))
            Panel {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(standingWord(d.standing), style = Type.display(26), color = standingColour(d.standing))
                    Spacer(Modifier.width(10.dp))
                    Text(l(d.lunar.dayGanZhi), style = Type.serif(18), color = Palette.inkSoft)
                    Spacer(Modifier.weight(1f))
                    Text(
                        l(d.dayOfficer),
                        style = Type.sans(13, FontWeight.Bold),
                        color = Palette.gold,
                        modifier = Modifier.clip(CircleShape).background(Palette.goldSoft)
                            .padding(horizontal = 10.dp, vertical = 6.dp)
                    )
                }
                Text(
                    lf("{0} governs the day on the {1}. The day officer is {2}. Clash: {3}; direction: {4}.", d.spirit.name, d.spirit.road, d.dayOfficer, d.clash, d.harmDirection),
                    style = Type.serif(17), color = Palette.inkSoft
                )
            }

            Panel(title = t("almanac.canIDoIt")) {
                FlowRowOf {
                    activities.forEach { item ->
                        Chip(l(item.name.en), null, activity == item.id) {
                            activity = if (activity == item.id) null else item.id
                        }
                    }
                }
                d.judgement?.let { judgement ->
                    Column(verticalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.padding(top = 4.dp)) {
                        Text(verdictWord(judgement.verdict), style = Type.display(22), color = verdictColour(judgement.verdict))
                        Text(if (judgement.matched != null) lf(if (judgement.verdict == "avoid") "The almanac lists {0} among activities to avoid." else "The almanac lists {0} among suitable activities.", judgement.matched) else lf("This activity is not explicitly listed. The day officer is {0}; the day spirit is {1}.", d.dayOfficer, d.spirit.name), style = Type.serif(17), color = Palette.inkSoft)
                    }
                }
            }

            Panel {
                Row(horizontalArrangement = Arrangement.spacedBy(14.dp)) {
                    TermColumn("", t("common.suits"), d.yi, Palette.gold, Modifier.weight(1f))
                    TermColumn("", t("common.avoid"), d.ji, Palette.rose, Modifier.weight(1f))
                }
            }

            Panel(title = t("almanac.hours")) {
                d.hours.forEachIndexed { index, hour ->
                    Row(Modifier.fillMaxWidth().padding(vertical = 7.dp), verticalAlignment = Alignment.CenterVertically) {
                        Text(l(hour.ganzhi), style = Type.display(16),
                            color = if (hour.lucky) Palette.gold else Palette.inkMute,
                            modifier = Modifier.width(44.dp)
                        )
                        Text(hour.range, style = Type.sans(14), color = Palette.inkSoft, modifier = Modifier.width(112.dp))
                        Text(l(hour.spirit), style = Type.serif(16), color = Palette.inkSoft)
                    }
                    if (index < d.hours.lastIndex) HorizontalDivider(color = Palette.line)
                }
            }

            Panel(title = t("almanac.tables")) {
                TableRow(l("Stems and branches"), lf("Year {0} · Month {1} · Day {2} · Zodiac {3}", d.lunar.yearGanZhi, d.lunar.monthGanZhi, d.lunar.dayGanZhi, d.lunar.zodiac))
                TableRow(l("Day officer"), l(d.dayOfficer))
                TableRow(l("Lunar mansion"), listOf(d.mansion.name, d.mansion.animal, d.mansion.direction, d.mansion.beast).joinToString(" · ") { l(it) })
                TableRow(l("Day spirit"), listOf(d.spirit.name, d.spirit.road, d.spirit.luck).joinToString(" · ") { l(it) })
                TableRow(l("Clash and direction"), lf("Clash: {0} · Direction: {1}", d.clash, d.harmDirection))
                if (d.solarTerm != null) TableRow(l("Solar term"), l(d.solarTerm))
                else TableRow(l("Next solar term"), "${l(d.nextSolarTerm.name)} · ${d.nextSolarTerm.date}")
                if (d.auspicious.isNotEmpty()) TableRow(l("Favourable spirits"), d.auspicious.joinToString(" · ") { l(it) })
                if (d.inauspicious.isNotEmpty()) TableRow(l("Unfavourable spirits"), d.inauspicious.joinToString(" · ") { l(it) })
                if (d.pengzu.isNotEmpty()) TableRow(l("Peng Zu taboos"), d.pengzu.joinToString(" · ") { l(it) })
            }
        }
    }
}

@Composable
private fun TermColumn(mark: String, label: String, terms: List<String>, colour: Color, modifier: Modifier = Modifier) {
    Column(modifier, verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
            Text(l(mark), style = Type.display(20), color = colour)
            Text(
                label.uppercase(),
                style = Type.sans(11, FontWeight.Bold).copy(letterSpacing = 1.8.sp),
                color = Palette.inkMute
            )
        }
        (terms.ifEmpty { listOf("—") }).forEach {
            Text(glossed(it), style = Type.serif(17), color = Palette.inkSoft)
        }
    }
}

@Composable
private fun TableRow(label: String, value: String) {
    Row(Modifier.fillMaxWidth().padding(vertical = 4.dp), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        Text(l(label),
            style = Type.sans(12, FontWeight.Bold).copy(letterSpacing = 1.4.sp),
            color = Palette.inkMute,
            modifier = Modifier.width(80.dp)
        )
        Text(l(value), style = Type.serif(16), color = Palette.inkSoft)
    }
}

private fun standingWord(standing: String) = when (standing) {
    "auspicious" -> t("almanac.yellowDay")
    "inauspicious" -> t("almanac.blackDay")
    else -> t("almanac.mixedDay")
}

private fun standingColour(standing: String) = when (standing) {
    "auspicious" -> Palette.gold
    "inauspicious" -> Palette.rose
    else -> Palette.ink
}

private fun verdictWord(verdict: String) = when (verdict) {
    "suitable" -> t("almanac.yes")
    "avoid" -> t("almanac.no")
    else -> t("almanac.silent")
}

private fun verdictColour(verdict: String) = when (verdict) {
    "suitable" -> Palette.gold
    "avoid" -> Palette.rose
    else -> Palette.inkSoft
}
