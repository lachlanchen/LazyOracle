package art.lazying.auspice.screens

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavController
import art.lazying.auspice.*
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject

@Composable
fun AnswersScreen(navController: NavController) {
    var book by remember { mutableStateOf("answers") }
    var question by remember { mutableStateOf("") }
    var opening by remember { mutableStateOf<BookOpening?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var opens by remember { mutableIntStateOf(0) }

    LaunchedEffect(opens) {
        if (opens == 0) return@LaunchedEffect
        runCatching {
            Engines.evaluateAs<BookOpening>("book.open", buildJsonObject {
                put("book", JsonPrimitive(book))
                if (question.isNotBlank()) put("question", JsonPrimitive(question))
            })
        }.onSuccess { opening = it; error = null }.onFailure { error = it.message }
    }

    val turn by animateFloatAsState(if (opening != null) 0f else 92f, tween(700), label = "page")

    ScreenScaffold(
        navController,
        eyebrow = t("practice.answers"),
        title = t("answers.title"),
        tagline = t("answers.tagline")
    ) {
        Panel {
            FlowRowOf {
                Chip(t("practice.answers"), null, book == "answers") { book = "answers" }
                Chip(t("answers.whatAsking"), null, book == "questions") { book = "questions" }
            }
            FieldLabel(t("answers.whatAsking"))
            AuspiceField(question) { question = it }
            PrimaryButton(t("answers.title")) { opens++ }
        }

        error?.let { Panel(title = t("common.notComputed")) { Text(it, style = Type.serif(16), color = Palette.inkSoft) } }

        opening?.let { page ->
            Column(
                Modifier
                    .fillMaxWidth()
                    .graphicsLayer { rotationX = turn; cameraDistance = 14f * density }
                    .clip(RoundedCornerShape(18.dp))
                    .background(Brush.verticalGradient(listOf(Palette.parchment, Palette.parchment2)))
                    .padding(22.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                Text(
                    "${t("answers.page")} ${page.page.number}",
                    style = Type.sans(11, FontWeight.Bold).copy(letterSpacing = 2.4.sp),
                    color = Color(0xFF8A6A22)
                )
                Text(page.page.en, style = Type.display(27), color = Color(0xFF2A1E06))
                Text(page.page.zh, style = Type.serif(21), color = Color(0xFF5A4413))
                if (page.question.isNotBlank()) {
                    HorizontalDivider(color = Color(0x4D8A6A22))
                    Text(
                        page.question,
                        style = Type.serif(16).copy(fontStyle = FontStyle.Italic),
                        color = Color(0xFF6B4E16)
                    )
                }
            }
        }
    }
}
