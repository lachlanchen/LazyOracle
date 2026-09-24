package art.lazying.auspice.screens

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavController
import art.lazying.auspice.*
import kotlinx.coroutines.delay
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject

@Composable
fun IChingScreen(navController: NavController) {
    var method by rememberPracticeState("iching.method", "coins")
    var question by rememberPracticeState("iching.question", "")
    var cast by rememberPracticeState<IChingCast?>("iching.cast", null)
    var shown by rememberPracticeState("iching.shown", 0)
    var error by remember { mutableStateOf<String?>(null) }
    var casts by remember { mutableIntStateOf(0) }

    LaunchedEffect(casts) {
        if (casts == 0) { if (cast != null) shown = 6; return@LaunchedEffect }
        runCatching {
            Engines.evaluateAs<IChingCast>("iching.cast", buildJsonObject {
                put("method", JsonPrimitive(method))
                if (question.isNotBlank()) put("question", JsonPrimitive(question))
            })
        }.onSuccess {
            cast = it
            error = null
            shown = 0
            repeat(6) { step ->
                delay(280)
                shown = step + 1
            }
        }.onFailure { error = l("This reading could not be computed. Please try again.") }
    }

    ScreenScaffold(
        navController,
        eyebrow = t("practice.iching"),
        title = t("iching.title"),
        tagline = t("iching.tagline")
    ) {
        Panel {
            FlowRowOf {
                Chip(t("iching.coins"), null, method == "coins") { method = "coins" }
                Chip(t("iching.yarrow"), null, method == "yarrow") { method = "yarrow" }
            }
            FieldLabel(t("tarot.question"))
            AuspiceField(question) { question = it }
            PrimaryButton(t("iching.title")) { casts++ }
        }

        error?.let { Panel(title = t("common.notComputed")) { Text(it, style = Type.serif(16), color = Palette.inkSoft) } }

        cast?.let { result ->
            Panel {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(22.dp)) {
                    HexagramView(result.lines, shown)
                    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Text(
                            "${result.primary.number}",
                            style = Type.sans(12, FontWeight.Bold).copy(letterSpacing = 2.sp),
                            color = Palette.gold
                        )
                        Text(l(result.primary.name.en), style = Type.display(17), color = Palette.inkSoft)
                        Text(
                            lf("{0} over {1}", result.primary.upperTrigram.name.zh, result.primary.lowerTrigram.name.zh),
                            style = Type.serif(15), color = Palette.inkMute
                        )
                    }
                }
            }

            if (shown >= 6) {
                Panel(title = t("iching.judgement")) {
                    Text(l(result.primary.judgement), style = Type.serif(20), color = Palette.ink)
                    Text(l(result.primary.sense.en), style = Type.serif(17), color = Palette.inkSoft)
                }
                Panel(title = t("iching.whereToRead")) {
                    Text(focusLine(result), style = Type.serif(17), color = Palette.inkSoft)
                    Text(
                        l("Zhu Xi’s method chooses the text by the number of changing lines."),
                        style = Type.sans(13), color = Palette.inkMute
                    )
                }
                result.resulting?.let { resulting ->
                    Panel(title = t("iching.becomes")) {
                        Row(horizontalArrangement = Arrangement.spacedBy(20.dp)) {
                            HexagramView(
                                resulting.lines.map { CastLine(value = it, yang = it == 1, changing = false) },
                                6
                            )
                            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                Text("${resulting.number} · ${l(resulting.name.en)}", style = Type.display(22), color = Palette.ink)
                                Text(l(resulting.sense.en), style = Type.serif(15), color = Palette.inkMute)
                            }
                        }
                    }
                }
                Panel(title = t("iching.behind")) {
                    Relative(l("Nuclear hexagram"), result.nuclear)
                    Relative(l("Opposite hexagram"), result.opposite)
                    Relative(l("Inverse hexagram"), result.inverse)
                }
            }
            ExplainReading(Json.encodeToString(result))
        }
    }
}

@Composable
private fun Relative(label: String, hexagram: Hexagram) {
    Row(Modifier.fillMaxWidth().padding(vertical = 3.dp), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        Text(l(label),
            style = Type.sans(12, FontWeight.Bold).copy(letterSpacing = 1.4.sp),
            color = Palette.inkMute,
            modifier = Modifier.width(134.dp)
        )
        Text("${hexagram.number} · ${l(hexagram.name.en)}", style = Type.serif(16), color = Palette.inkSoft)
    }
}

/** Six lines, drawn from the bottom up; a moving line carries its mark. */
@Composable
fun HexagramView(lines: List<CastLine>, shown: Int) {
    Column(
        Modifier.width(92.dp),
        verticalArrangement = Arrangement.spacedBy(7.dp)
    ) {
        lines.indices.reversed().forEach { index ->
            val line = lines[index]
            val visible by animateFloatAsState(if (index < shown) 1f else 0f, tween(400), label = "line")
            Box(Modifier.alpha(visible), contentAlignment = Alignment.Center) {
                if (line.yang) {
                    Box(
                        Modifier.fillMaxWidth().height(9.dp).clip(CircleShape)
                            .background(if (line.changing) Palette.rose else Palette.gold)
                    )
                } else {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        repeat(2) {
                            Box(
                                Modifier.weight(1f).height(9.dp).clip(CircleShape)
                                    .background(if (line.changing) Palette.rose else Palette.gold)
                            )
                        }
                    }
                }
                if (line.changing) {
                    Text(if (line.yang) "○" else "×", style = Type.sans(9, FontWeight.Bold), color = Palette.night)
                }
            }
        }
    }
}

private fun focusLine(cast: IChingCast): String = l(cast.focus.rule.en)
