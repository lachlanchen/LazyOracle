package art.lazying.auspice.screens

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.layout.Layout
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavController
import art.lazying.auspice.*
import kotlinx.coroutines.delay
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject

@Composable
fun TarotScreen(navController: NavController) {
    var spreadId by remember { mutableStateOf("three") }
    var question by remember { mutableStateOf("") }
    var draw by remember { mutableStateOf<TarotDraw?>(null) }
    var revealed by remember { mutableStateOf(setOf<String>()) }
    var error by remember { mutableStateOf<String?>(null) }
    var dealCount by remember { mutableIntStateOf(0) }

    LaunchedEffect(dealCount) {
        if (dealCount == 0) return@LaunchedEffect
        runCatching {
            Engines.evaluateAs<TarotDraw>("tarot.draw", buildJsonObject {
                put("spread", JsonPrimitive(spreadId))
                if (question.isNotBlank()) put("question", JsonPrimitive(question))
            })
        }.onSuccess {
            draw = it
            revealed = emptySet()
            error = null
            delay(550)
            it.cards.firstOrNull()?.let { first -> revealed = revealed + first.position.id }
        }.onFailure { error = l("This reading could not be computed. Please try again.") }
    }

    ScreenScaffold(
        navController,
        eyebrow = t("practice.tarot"),
        title = t("tarot.title"),
        tagline = t("tarot.tagline")
    ) {
        Panel {
            FlowRowOf {
                Chip(l("One card"), null, spreadId == "one") { spreadId = "one"; draw = null }
                Chip(l("Past · Present · Future"), null, spreadId == "three") { spreadId = "three"; draw = null }
                Chip(l("Celtic cross"), null, spreadId == "celtic") { spreadId = "celtic"; draw = null }
            }
            FieldLabel(t("tarot.question"))
            AuspiceField(question) { question = it }
            PrimaryButton(if (draw == null) t("tarot.draw") else t("tarot.drawAgain")) { dealCount++ }
        }

        error?.let { Panel(title = t("common.notComputed")) { Text(it, style = Type.serif(16), color = Palette.inkSoft) } }

        draw?.let { result ->
            ExplainReading(Json.encodeToString(result))
            Panel {
                SpreadStage(result, revealed) { card ->
                    revealed = revealed + card.position.id
                }
                if (revealed.size < result.cards.size) {
                    Text(
                        t("tarot.tapToTurn"),
                        style = Type.sans(13), color = Palette.inkMute,
                        modifier = Modifier.fillMaxWidth(), textAlign = TextAlign.Center
                    )
                }
            }
            result.cards.filter { revealed.contains(it.position.id) }.forEach { CardReading(it) }
        }
    }
}

@Composable
fun AuspiceField(value: String, onChange: (String) -> Unit) {
    Box(
        Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp))
            .background(Color(0x40000000))
            .border(1.dp, Palette.line, RoundedCornerShape(14.dp))
            .padding(horizontal = 14.dp, vertical = 12.dp)
    ) {
        BasicTextField(
            value = value,
            onValueChange = onChange,
            textStyle = Type.serif(18).copy(color = Palette.ink),
            cursorBrush = SolidColor(Palette.gold),
            modifier = Modifier.fillMaxWidth()
        )
    }
}

/** The cards, placed by the spread's own 0–1 layout grid. */
@Composable
private fun SpreadStage(draw: TarotDraw, revealed: Set<String>, onTap: (DrawnCard) -> Unit) {
    val tall = draw.cards.size > 3
    val cardWidth = if (tall) 56.dp else 88.dp
    Layout(
        content = {
            draw.cards.forEach { card ->
                Box(Modifier.graphicsLayer {
                    rotationZ = if (card.position.layout.rotate == true) 90f else 0f
                }) {
                    TarotCardView(card, revealed.contains(card.position.id), cardWidth) { onTap(card) }
                }
            }
        },
        modifier = Modifier
            .fillMaxWidth()
            .height(if (tall) 420.dp else if (draw.cards.size == 1) 220.dp else 200.dp)
    ) { measurables, constraints ->
        val placeables = measurables.map { it.measure(constraints.copy(minWidth = 0, minHeight = 0)) }
        layout(constraints.maxWidth, constraints.maxHeight) {
            placeables.forEachIndexed { index, placeable ->
                val layout = draw.cards[index].position.layout
                placeable.place(
                    x = (layout.x * constraints.maxWidth - placeable.width / 2).toInt(),
                    y = (layout.y * constraints.maxHeight - placeable.height / 2).toInt()
                )
            }
        }
    }
}

/** One card, with a real turn rather than a cross-fade. */
@Composable
fun TarotCardView(card: DrawnCard, faceUp: Boolean, width: androidx.compose.ui.unit.Dp, onTap: () -> Unit) {
    val turn by animateFloatAsState(if (faceUp) 180f else 0f, tween(550), label = "turn")
    Box(
        Modifier
            .size(width, width * 1.62f)
            .graphicsLayer {
                rotationY = turn
                cameraDistance = 14f * density
            }
            .clip(RoundedCornerShape(9.dp))
            .clickable(onClick = onTap)
    ) {
        if (turn < 90f) {
            Box(
                Modifier
                    .fillMaxSize()
                    .background(Brush.linearGradient(listOf(Palette.night3, Palette.night2)))
                    .border(1.dp, Palette.goldLine, RoundedCornerShape(9.dp)),
                contentAlignment = Alignment.Center
            ) {
                Text("✦", style = Type.display((width.value * 0.3f).toInt()), color = Palette.gold.copy(alpha = 0.7f))
            }
        } else {
            Box(
                Modifier
                    .fillMaxSize()
                    .graphicsLayer { rotationY = 180f }
                    .background(Brush.verticalGradient(listOf(Palette.parchment, Palette.parchment2)))
                    .border(1.dp, Color(0x808A6A22), RoundedCornerShape(9.dp))
                    .graphicsLayer { rotationZ = if (card.reversed) 180f else 0f }
                    .padding(horizontal = 5.dp, vertical = 8.dp),
                contentAlignment = Alignment.Center
            ) {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(3.dp)
                ) {
                    Text(card.card.label, style = Type.display((width.value * 0.14f).toInt(), FontWeight.Bold), color = Color(0xFF6B4E16))
                    Text(elementGlyph(card.card.element), style = Type.display((width.value * 0.24f).toInt()), color = Color(0xFF8A6A22))
                    Text(l(card.card.text.en.name),
                        style = Type.display((width.value * 0.115f).toInt()),
                        color = Color(0xFF3A2A08),
                        textAlign = TextAlign.Center,
                        maxLines = 2
                    )
                }
            }
        }
    }
}

private fun elementGlyph(element: String) = when (element) {
    "fire" -> "🜂"
    "water" -> "🜄"
    "air" -> "🜁"
    "earth" -> "🜃"
    else -> "✶"
}

@Composable
private fun CardReading(card: DrawnCard) {
    Panel {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(l(card.position.name.en),
                style = Type.display(15).copy(letterSpacing = 1.6.sp),
                color = Palette.gold
            )
            Spacer(Modifier.width(8.dp))
            Spacer(Modifier.weight(1f))
            if (card.reversed) {
                Text(
                    t("tarot.reversed"),
                    style = Type.sans(10, FontWeight.Bold).copy(letterSpacing = 1.6.sp),
                    color = Palette.rose
                )
            }
        }
        Text(l(card.card.text.en.name), style = Type.display(21), color = Palette.ink)
        Text(l(card.position.question.en),
            style = Type.serif(16).copy(fontStyle = FontStyle.Italic),
            color = Palette.inkMute
        )
        FlowRowOf(spacing = 6) {
            val words = if (card.reversed) {
                l(card.card.text.en.reversed.joinToString(" · ")).split(" · ")
            } else {
                l(card.card.text.en.upright.joinToString(" · ")).split(" · ")
            }
            words.forEach { word ->
                Text(l(word),
                    style = Type.sans(13, FontWeight.SemiBold),
                    color = Palette.inkSoft,
                    modifier = Modifier
                        .clip(CircleShape)
                        .background(Color(0x0DFFFFFF))
                        .padding(horizontal = 10.dp, vertical = 6.dp)
                )
            }
        }
    }
}
