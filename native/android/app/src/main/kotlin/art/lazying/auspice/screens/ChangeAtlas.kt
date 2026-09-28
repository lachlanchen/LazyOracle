package art.lazying.auspice.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import androidx.navigation.NavController
import art.lazying.auspice.*
import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.*

@Serializable data class HexagramStudy(
    val kind: String, val version: Int, val primary: Hexagram, val resulting: Hexagram,
    val changingPositions: List<Int>, val nuclear: Hexagram, val opposite: Hexagram, val inverse: Hexagram
)

@Composable fun ChangeAtlasScreen(navController: NavController) {
    var number by rememberPracticeState("atlas.number", 11)
    var changing by rememberPracticeState("atlas.changing", emptyList<Int>())
    var study by remember { mutableStateOf<HexagramStudy?>(null) }
    var catalogue by remember { mutableStateOf<List<Hexagram>>(emptyList()) }
    var error by remember { mutableStateOf(false) }
    var choosing by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) {
        runCatching { (1..64).map { n -> Engines.evaluateAs<Hexagram>("iching.hexagram", buildJsonObject { put("number", n) }) } }
            .onSuccess { catalogue = it }.onFailure { error = true }
    }
    LaunchedEffect(number, changing) {
        runCatching { Engines.evaluateAs<HexagramStudy>("iching.explore", buildJsonObject { put("number", number); put("changing", JsonArray(changing.map(::JsonPrimitive))) }) }
            .onSuccess { study = it; error = false }.onFailure { study = null; error = true }
    }
    ScreenScaffold(navController, t("app.name"), t("study.title"), t("study.tagline")) {
        Panel {
            FieldLabel(t("study.choose"))
            Box {
                OutlinedButton(onClick = { choosing = true }, modifier = Modifier.testTag("atlas.choose")) {
                    Text("$number · ${study?.primary?.name?.en?.let { l(it) }.orEmpty()}")
                }
                DropdownMenu(choosing, { choosing = false }, modifier = Modifier.heightIn(max = 320.dp)) {
                    catalogue.forEach { hex -> DropdownMenuItem(text = { Text("${hex.number} · ${l(hex.name.en)}") }, onClick = { number = hex.number; changing = emptyList(); choosing = false }) }
                }
            }
            Text(t("study.hint"), style = Type.serif(17), color = Palette.inkSoft)
        }
        study?.takeIf { it.primary.number == number && it.changingPositions == changing.sorted() }?.let { value ->
            Panel(title = t("study.lines")) {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text(t("study.before"), color = Palette.inkMute); Text(t("study.after"), color = Palette.inkMute)
                }
                (6 downTo 1).forEach { position ->
                    Row(Modifier.fillMaxWidth().heightIn(min = 44.dp).clickable {
                        changing = if (position in changing) changing - position else changing + position
                    }.testTag("atlas.line.$position").semantics { contentDescription = "${t("study.lines")} $position: ${l(if (value.primary.lines[position - 1] == 1) "阳" else "阴")} ${l("→")} ${l(if (value.resulting.lines[position - 1] == 1) "阳" else "阴")}" }, verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                        Text(position.toString(), color = Palette.gold, modifier = Modifier.width(22.dp))
                        AtlasLine(value.primary.lines[position - 1] == 1, Modifier.weight(1f))
                        Text(l("→"), color = Palette.gold)
                        AtlasLine(value.resulting.lines[position - 1] == 1, Modifier.weight(1f))
                        Text(if (position in changing) "✓" else "○", color = Palette.gold, modifier = Modifier.width(24.dp))
                    }
                }
                TextButton(onClick = { changing = emptyList() }, modifier = Modifier.testTag("atlas.reset")) { Text(t("study.reset")) }
            }
            Panel(title = t("study.before")) { AtlasFigure(value.primary) }
            Panel(title = t("study.after"), modifier = Modifier.testTag("atlas.result")) { AtlasFigure(value.resulting) }
            Panel(title = "${t("study.before")} · ${value.primary.number}") {
                listOf("study.nuclear" to value.nuclear, "study.opposite" to value.opposite, "study.inverse" to value.inverse).forEach { (key, hex) ->
                    Column(Modifier.fillMaxWidth().heightIn(min = 54.dp).clickable { number = hex.number; changing = emptyList() }.testTag(key)) {
                        Text(t(key), style = Type.sans(13), color = Palette.inkMute)
                        Text("${hex.number} · ${l(hex.name.en)} ${l("→")}", style = Type.serif(18), color = Palette.gold)
                    }
                }
            }
            SaveReadingButton("atlas", Json.encodeToString(value))
            Text(t("study.source"), style = Type.sans(13), color = Palette.inkMute)
        }
        if (error) Text(l("This reading could not be computed. Please try again."), color = Palette.rose)
    }
}

@Composable private fun AtlasLine(yang: Boolean, modifier: Modifier) {
    Row(modifier, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        repeat(if (yang) 1 else 2) { Box(Modifier.weight(1f).height(7.dp).background(Palette.gold, RoundedCornerShape(2.dp))) }
    }
}
@Composable private fun AtlasFigure(hex: Hexagram) {
    Text("${hex.number} · ${l(hex.name.en)}", style = Type.display(24), color = Palette.gold)
    Text("${t("study.upper")}: ${l(hex.upperTrigram.name.en)}\n${t("study.lower")}: ${l(hex.lowerTrigram.name.en)}", style = Type.sans(14), color = Palette.inkMute)
    Text(l(hex.sense.en), style = Type.serif(18), color = Palette.ink)
    var source by remember(hex.number) { mutableStateOf(false) }
    TextButton(onClick = { source = !source }) { Text(hex.name.zh + if (source) " −" else " +") }
    if (source) Text(hex.judgement, style = Type.serif(18), color = Palette.inkSoft)
}
