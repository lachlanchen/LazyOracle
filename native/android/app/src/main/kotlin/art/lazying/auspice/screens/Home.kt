package art.lazying.auspice.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.GridItemSpan
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowUpward
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import art.lazying.auspice.*
import java.time.LocalDate
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject

@Composable
fun HomeScreen(
    ready: Boolean,
    open: (Practice) -> Unit,
    openChat: (String) -> Unit,
    openSettings: () -> Unit
) {
    var today by remember { mutableStateOf<AlmanacDay?>(null) }
    var draft by remember { mutableStateOf("") }

    LaunchedEffect(ready) {
        if (ready && today == null) {
            today = runCatching {
                Engines.evaluateAs<AlmanacDay>(
                    "almanac.day",
                    buildJsonObject { put("date", JsonPrimitive(LocalDate.now().toString())) }
                )
            }.getOrNull()
        }
    }

    Box(Modifier.fillMaxSize()) {
        LazyVerticalGrid(
            columns = GridCells.Fixed(2),
            modifier = Modifier
                .fillMaxSize()
                .windowInsetsPadding(WindowInsets.systemBars)
                .dismissKeyboardOnScroll()
                .padding(horizontal = 18.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
            contentPadding = PaddingValues(bottom = 96.dp)
        ) {
            item(span = { GridItemSpan(2) }) {
                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Row(
                        Modifier.fillMaxWidth().padding(top = 6.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Box(
                            Modifier
                                .size(22.dp)
                                .clip(CircleShape)
                                .background(
                                    Brush.radialGradient(
                                        listOf(Color(0xFFFFE9A8), Palette.gold, Color(0xFF7A5C1C))
                                    )
                                )
                        )
                        Text(
                            "  AUSPICE",
                            style = Type.display(17).copy(letterSpacing = 1.4.sp),
                            color = Palette.ink
                        )
                        Spacer(Modifier.weight(1f))
                        Icon(
                            Icons.Default.Settings,
                            contentDescription = "Settings",
                            tint = Palette.inkSoft,
                            modifier = Modifier
                                .size(44.dp)
                                .clip(CircleShape)
                                .clickable(onClick = openSettings)
                                .padding(11.dp)
                        )
                    }
                    Text("宜时", style = Type.display(44), color = Palette.ink, modifier = Modifier.padding(top = 8.dp))
                    Text(
                        "A sign read from what is actually there.",
                        style = Type.serif(19).copy(fontStyle = FontStyle.Italic),
                        color = Palette.inkSoft
                    )
                }
            }

            today?.let { day ->
                item(span = { GridItemSpan(2) }) {
                    Panel(Modifier.clickable { open(Practice.ALMANAC) }) {
                        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) {
                                Text(
                                    "TODAY",
                                    style = Type.sans(11, FontWeight.Bold).copy(letterSpacing = 2.sp),
                                    color = Palette.gold
                                )
                                Text(day.lunar.text, style = Type.display(17), color = Palette.ink)
                                Text(
                                    "${day.lunar.dayGanZhi}日 · ${day.dayOfficer}日",
                                    style = Type.sans(13),
                                    color = Palette.inkMute
                                )
                            }
                            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(5.dp)) {
                                MiniTerms("宜", day.yi, Palette.gold)
                                MiniTerms("忌", day.ji, Palette.rose)
                            }
                        }
                    }
                }
            }

            items(Practice.entries) { practice ->
                Tile(practice) { open(practice) }
            }

            item(span = { GridItemSpan(2) }) {
                Text(
                    "Every chart, hexagram and draw is computed on this device. Nothing about your birth leaves it unless you ask for a reading in words.",
                    style = Type.sans(12),
                    color = Palette.inkMute,
                    modifier = Modifier.padding(top = 6.dp, start = 8.dp, end = 8.dp)
                )
            }
        }

        // The ask bar, pinned above the navigation bar.
        Row(
            Modifier
                .align(Alignment.BottomCenter)
                .windowInsetsPadding(WindowInsets.systemBars)
                .padding(horizontal = 18.dp, vertical = 10.dp)
                .fillMaxWidth()
                .clip(CircleShape)
                .background(Color(0xCC131634))
                .border(1.dp, Palette.goldLine, CircleShape)
                .padding(horizontal = 16.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Box(Modifier.weight(1f)) {
                if (draft.isEmpty()) {
                    Text(
                        "Ask about today, a chart, a card…",
                        style = Type.sans(16),
                        color = Palette.inkMute
                    )
                }
                BasicTextField(
                    value = draft,
                    onValueChange = { draft = it },
                    textStyle = Type.sans(16).copy(color = Palette.ink),
                    cursorBrush = SolidColor(Palette.gold),
                    modifier = Modifier.fillMaxWidth()
                )
            }
            Icon(
                Icons.Default.ArrowUpward,
                contentDescription = "Ask",
                tint = Palette.gold,
                modifier = Modifier
                    .size(40.dp)
                    .clip(CircleShape)
                    .clickable { openChat(draft.trim()) }
                    .padding(8.dp)
            )
        }
    }
}

@Composable
private fun MiniTerms(mark: String, terms: List<String>, colour: Color) {
    Row(horizontalArrangement = Arrangement.spacedBy(7.dp)) {
        Text(mark, style = Type.display(15), color = colour)
        Text(
            terms.take(3).joinToString(" ") + if (terms.size > 3) " …" else "",
            style = Type.serif(15),
            color = Palette.inkSoft,
            maxLines = 1
        )
    }
}

@Composable
private fun Tile(practice: Practice, onClick: () -> Unit) {
    Box(
        Modifier
            .fillMaxWidth()
            .heightIn(min = 140.dp)
            .clip(RoundedCornerShape(20.dp))
            .background(
                Brush.linearGradient(
                    if (practice == Practice.TAROT) {
                        listOf(Color(0x2ED9B45A), Color(0x14E28B7A), Color(0x05FFFFFF))
                    } else {
                        listOf(Color(0x12FFFFFF), Color(0x05FFFFFF))
                    }
                )
            )
            .border(
                1.dp,
                if (practice == Practice.TAROT) Palette.goldLine else Palette.line,
                RoundedCornerShape(20.dp)
            )
            .clickable(onClick = onClick)
            .padding(horizontal = 14.dp, vertical = 16.dp)
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Box(
                Modifier
                    .size(38.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(Palette.gold.copy(alpha = 0.15f)),
                contentAlignment = Alignment.Center
            ) {
                Text(practice.chinese.take(1), style = Type.display(18), color = Palette.gold)
            }
            Text(practice.title, style = Type.display(19), color = Palette.ink, modifier = Modifier.padding(top = 2.dp))
            Text(practice.blurb, style = Type.serif(15), color = Palette.inkSoft)
        }
        Text(
            practice.chinese,
            style = Type.serif(14),
            color = Palette.inkMute,
            modifier = Modifier.align(Alignment.TopEnd)
        )
    }
}
