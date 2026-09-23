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
    var date by remember { mutableStateOf(LocalDate.now()) }
    var activity by remember { mutableStateOf<String?>(null) }
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
        }.onFailure { error = it.message }
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
                    .clickable { date = date.minusDays(1) }.padding(10.dp)
            )
            Column(Modifier.weight(1f), horizontalAlignment = Alignment.CenterHorizontally) {
                Text(
                    date.format(DateTimeFormatter.ofPattern("EEEE, d MMMM")),
                    style = Type.display(18), color = Palette.ink
                )
                day?.let { Text(it.lunar.text, style = Type.serif(15), color = Palette.inkMute) }
            }
            Icon(
                Icons.Default.ChevronRight, "Next day", tint = Palette.inkSoft,
                modifier = Modifier.size(44.dp).clip(CircleShape)
                    .clickable { date = date.plusDays(1) }.padding(10.dp)
            )
        }

        error?.let {
            Panel(title = t("common.notComputed")) { Text(it, style = Type.serif(16), color = Palette.inkSoft) }
        }

        day?.let { d ->
            Panel {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(standingWord(d.standing), style = Type.display(26), color = standingColour(d.standing))
                    Spacer(Modifier.width(10.dp))
                    Text("${d.lunar.dayGanZhi}日", style = Type.serif(18), color = Palette.inkSoft)
                    Spacer(Modifier.weight(1f))
                    Text(
                        "${d.dayOfficer}日",
                        style = Type.sans(13, FontWeight.Bold),
                        color = Palette.gold,
                        modifier = Modifier.clip(CircleShape).background(Palette.goldSoft)
                            .padding(horizontal = 10.dp, vertical = 6.dp)
                    )
                }
                Text(
                    "${d.spirit.name} governs the day on the ${d.spirit.road}, and the officer is ${d.dayOfficer}. " +
                        "It clashes with the ${d.clash}, and its harm stands to the ${d.harmDirection}.",
                    style = Type.serif(17), color = Palette.inkSoft
                )
            }

            Panel(title = t("almanac.canIDoIt")) {
                FlowRowOf {
                    activities.forEach { item ->
                        Chip(if (Localisation.code.startsWith("zh")) item.name.zh else item.name.en, null, activity == item.id) {
                            activity = if (activity == item.id) null else item.id
                        }
                    }
                }
                d.judgement?.let { judgement ->
                    Column(verticalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.padding(top = 4.dp)) {
                        Text(verdictWord(judgement.verdict), style = Type.display(22), color = verdictColour(judgement.verdict))
                        Text(judgement.basis.en, style = Type.serif(17), color = Palette.inkSoft)
                        Text(judgement.basis.zh, style = Type.serif(16), color = Palette.inkMute)
                    }
                }
            }

            Panel {
                Row(horizontalArrangement = Arrangement.spacedBy(14.dp)) {
                    TermColumn("宜", t("common.suits"), d.yi, Palette.gold, Modifier.weight(1f))
                    TermColumn("忌", t("common.avoid"), d.ji, Palette.rose, Modifier.weight(1f))
                }
            }

            Panel(title = t("almanac.hours")) {
                d.hours.forEachIndexed { index, hour ->
                    Row(Modifier.fillMaxWidth().padding(vertical = 7.dp), verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            hour.ganzhi, style = Type.display(16),
                            color = if (hour.lucky) Palette.gold else Palette.inkMute,
                            modifier = Modifier.width(44.dp)
                        )
                        Text(hour.range, style = Type.sans(14), color = Palette.inkSoft, modifier = Modifier.width(112.dp))
                        Text(hour.spirit, style = Type.serif(16), color = Palette.inkSoft)
                    }
                    if (index < d.hours.lastIndex) HorizontalDivider(color = Palette.line)
                }
            }

            Panel(title = t("almanac.tables")) {
                TableRow("干支", "${d.lunar.yearGanZhi}年 ${d.lunar.monthGanZhi}月 ${d.lunar.dayGanZhi}日 · 属${d.lunar.zodiac}")
                TableRow("建除", "${d.dayOfficer}日")
                TableRow("二十八宿", "${d.mansion.name}${d.mansion.animal} · ${d.mansion.direction}方${d.mansion.beast}")
                TableRow("值日", "${d.spirit.name} · ${d.spirit.road} · ${d.spirit.luck}")
                TableRow("冲煞", "冲${d.clash} · 煞${d.harmDirection}")
                if (d.solarTerm != null) TableRow("节气", d.solarTerm)
                else TableRow("下一节气", "${d.nextSolarTerm.name} · ${d.nextSolarTerm.date}")
                if (d.auspicious.isNotEmpty()) TableRow("吉神", d.auspicious.joinToString(" "))
                if (d.inauspicious.isNotEmpty()) TableRow("凶煞", d.inauspicious.joinToString(" "))
                if (d.pengzu.isNotEmpty()) TableRow("彭祖百忌", d.pengzu.joinToString("，"))
            }
        }
    }
}

@Composable
private fun TermColumn(mark: String, label: String, terms: List<String>, colour: Color, modifier: Modifier = Modifier) {
    Column(modifier, verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
            Text(mark, style = Type.display(20), color = colour)
            Text(
                label.uppercase(),
                style = Type.sans(11, FontWeight.Bold).copy(letterSpacing = 1.8.sp),
                color = Palette.inkMute
            )
        }
        (terms.ifEmpty { listOf("—") }).forEach {
            Text(it, style = Type.serif(17), color = Palette.inkSoft)
        }
    }
}

@Composable
private fun TableRow(label: String, value: String) {
    Row(Modifier.fillMaxWidth().padding(vertical = 4.dp), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        Text(
            label,
            style = Type.sans(12, FontWeight.Bold).copy(letterSpacing = 1.4.sp),
            color = Palette.inkMute,
            modifier = Modifier.width(80.dp)
        )
        Text(value, style = Type.serif(16), color = Palette.inkSoft)
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
