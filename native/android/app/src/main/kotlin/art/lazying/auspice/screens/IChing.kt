package art.lazying.auspice.screens

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Text
import androidx.compose.runtime.*
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
    var method by remember { mutableStateOf("coins") }
    var question by remember { mutableStateOf("") }
    var cast by remember { mutableStateOf<IChingCast?>(null) }
    var shown by remember { mutableIntStateOf(0) }
    var error by remember { mutableStateOf<String?>(null) }
    var casts by remember { mutableIntStateOf(0) }

    LaunchedEffect(casts) {
        if (casts == 0) return@LaunchedEffect
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
        }.onFailure { error = it.message }
    }

    ScreenScaffold(
        navController,
        eyebrow = "易经 · I Ching",
        title = "Cast the lines",
        tagline = "Six throws, from the bottom up, as the Zhou ritual has it."
    ) {
        Panel {
            FlowRowOf {
                Chip("Three coins", "三枚铜钱", method == "coins") { method = "coins" }
                Chip("Yarrow stalks", "蓍草", method == "yarrow") { method = "yarrow" }
            }
            FieldLabel("Your question")
            AuspiceField(question) { question = it }
            PrimaryButton(if (cast == null) "Cast the lines" else "Cast again") { casts++ }
        }

        error?.let { Panel(title = "Not cast") { Text(it, style = Type.serif(16), color = Palette.inkSoft) } }

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
                        Text(result.primary.name.zh, style = Type.display(30), color = Palette.ink)
                        Text(result.primary.name.en, style = Type.display(17), color = Palette.inkSoft)
                        Text(result.primary.name.pinyin, style = Type.sans(13), color = Palette.inkMute)
                        Text(
                            "${result.primary.upperTrigram.name.zh} over ${result.primary.lowerTrigram.name.zh}",
                            style = Type.serif(15), color = Palette.inkMute
                        )
                    }
                }
            }

            if (shown >= 6) {
                Panel(title = "The judgement") {
                    Text(result.primary.judgement, style = Type.serif(20), color = Palette.ink)
                    Text(result.primary.sense.en, style = Type.serif(17), color = Palette.inkSoft)
                    Text(result.primary.sense.zh, style = Type.serif(16), color = Palette.inkMute)
                }
                Panel(title = "Where to read") {
                    Text(focusLine(result), style = Type.serif(17), color = Palette.inkSoft)
                    Text(
                        "朱熹《易学启蒙》 decides this by the number of moving lines, not by preference.",
                        style = Type.sans(13), color = Palette.inkMute
                    )
                }
                result.resulting?.let { resulting ->
                    Panel(title = "It becomes") {
                        Row(horizontalArrangement = Arrangement.spacedBy(20.dp)) {
                            HexagramView(
                                resulting.lines.map { CastLine(value = it, yang = it == 1, changing = false) },
                                6
                            )
                            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                Text("${resulting.number} · ${resulting.name.zh}", style = Type.display(22), color = Palette.ink)
                                Text(resulting.name.en, style = Type.display(16), color = Palette.inkSoft)
                                Text(resulting.sense.en, style = Type.serif(15), color = Palette.inkMute)
                            }
                        }
                    }
                }
                Panel(title = "Behind the hexagram") {
                    Relative("互卦 Nuclear", result.nuclear)
                    Relative("错卦 Opposite", result.opposite)
                    Relative("综卦 Inverse", result.inverse)
                }
            }
        }
    }
}

@Composable
private fun Relative(label: String, hexagram: Hexagram) {
    Row(Modifier.fillMaxWidth().padding(vertical = 3.dp), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        Text(
            label,
            style = Type.sans(12, FontWeight.Bold).copy(letterSpacing = 1.4.sp),
            color = Palette.inkMute,
            modifier = Modifier.width(134.dp)
        )
        Text("${hexagram.number} ${hexagram.name.zh} · ${hexagram.name.en}", style = Type.serif(16), color = Palette.inkSoft)
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

private fun focusLine(cast: IChingCast): String {
    cast.focus.explain?.en?.takeIf { it.isNotBlank() }?.let { return it }
    return when (cast.focus.kind) {
        "judgement" -> "Nothing moves, so the judgement of the hexagram answers."
        "line" -> "One line moves; read that line."
        "two-lines" -> "Two lines move; read the upper of them."
        "both-judgements" -> "Three lines move; read both judgements."
        "resulting-lines" -> "Four lines move; read the still lines of the resulting hexagram."
        else -> "Read the judgement of the resulting hexagram."
    }
}
