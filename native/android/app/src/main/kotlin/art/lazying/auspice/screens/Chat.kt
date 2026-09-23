package art.lazying.auspice.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.History
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.navigation.NavController
import art.lazying.auspice.*
import kotlinx.coroutines.launch

private const val VISIBLE_TURNS = 30

@Composable
fun ChatScreen(navController: NavController, opening: String) {
    val scope = rememberCoroutineScope()
    var draft by remember { mutableStateOf("") }
    var showingSessions by remember { mutableStateOf(false) }
    val listState = rememberLazyListState()
    val revision = Conversations.revision

    LaunchedEffect(Unit) {
        if (opening.isNotBlank() && Conversations.current.turns.isEmpty()) {
            Conversations.send(opening)
        }
    }

    val turns = remember(revision) { Conversations.current.turns.toList() }
    LaunchedEffect(revision) {
        if (turns.isNotEmpty()) listState.animateScrollToItem(maxOf(0, minOf(turns.size, VISIBLE_TURNS) - 1))
    }

    if (showingSessions) {
        SessionList({ showingSessions = false })
    }

    Column(
        Modifier
            .fillMaxSize()
            .windowInsetsPadding(WindowInsets.systemBars)
            .imePadding()
    ) {
        Row(
            Modifier.fillMaxWidth().padding(horizontal = 12.dp).heightIn(min = 48.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                Icons.AutoMirrored.Filled.ArrowBack, "Back", tint = Palette.inkSoft,
                modifier = Modifier.size(44.dp).clip(CircleShape)
                    .clickable { navController.popBackStack() }.padding(10.dp)
            )
            Text(
                Conversations.current.title,
                style = Type.display(16), color = Palette.ink, maxLines = 1,
                modifier = Modifier.weight(1f).padding(horizontal = 8.dp)
            )
            Icon(
                Icons.Default.History, "All conversations", tint = Palette.inkSoft,
                modifier = Modifier.size(44.dp).clip(CircleShape)
                    .clickable { showingSessions = true }.padding(10.dp)
            )
            Icon(
                Icons.Default.Add, "New conversation", tint = Palette.gold,
                modifier = Modifier.size(44.dp).clip(CircleShape)
                    .clickable { Conversations.newConversation() }.padding(10.dp)
            )
        }

        // One scroll: the log fills what is left, the composer is pinned below.
        LazyColumn(
            state = listState,
            modifier = Modifier.weight(1f).fillMaxWidth()
                .dismissKeyboardOnScroll()
                .padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            if (turns.size > VISIBLE_TURNS) {
                item {
                    Text(
                        "${turns.size - VISIBLE_TURNS} earlier messages, kept and summarised",
                        style = Type.sans(12), color = Palette.inkMute,
                        modifier = Modifier.fillMaxWidth().padding(vertical = 6.dp),
                        textAlign = TextAlign.Center
                    )
                }
            }
            if (turns.isEmpty()) {
                item {
                    Column(verticalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.padding(top = 8.dp)) {
                        Text("Ask about today, or about a chart.", style = Type.serif(20), color = Palette.inkSoft)
                        FlowRowOf {
                            listOf(
                                "Is today good for signing a contract?",
                                "Draw three cards about my work",
                                "What does my day master need?",
                                "Cast a hexagram for me"
                            ).forEach { suggestion ->
                                Chip(suggestion, null, false) { scope.launch { Conversations.send(suggestion) } }
                            }
                        }
                    }
                }
            }
            items(turns.takeLast(VISIBLE_TURNS), key = { it.id }) { turn -> Bubble(turn) }
            if (Conversations.streaming) {
                item {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        CircularProgressIndicator(Modifier.size(14.dp), color = Palette.gold, strokeWidth = 2.dp)
                        Text("reading…", style = Type.sans(13), color = Palette.inkMute)
                    }
                }
            }
            item { Spacer(Modifier.height(4.dp)) }
        }

        Column(
            Modifier
                .fillMaxWidth()
                .background(Color(0xE6131634))
                .padding(horizontal = 16.dp, vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Box(
                Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(16.dp))
                    .background(Color(0x47000000))
                    .border(1.dp, Palette.line, RoundedCornerShape(16.dp))
                    .padding(horizontal = 14.dp, vertical = 10.dp)
            ) {
                if (draft.isEmpty()) {
                    Text("Ask…", style = Type.serif(18), color = Palette.inkMute)
                }
                BasicTextField(
                    value = draft,
                    onValueChange = { draft = it },
                    textStyle = Type.serif(18).copy(color = Palette.ink),
                    cursorBrush = SolidColor(Palette.gold),
                    modifier = Modifier.fillMaxWidth()
                )
            }
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                // Clear on the left quarter, Send filling the rest.
                Box(Modifier.weight(1f)) {
                    Row(
                        Modifier
                            .clip(CircleShape)
                            .border(1.dp, Palette.goldLine, CircleShape)
                            .clickable { Conversations.clearCurrent() }
                            .heightIn(min = 44.dp)
                            .padding(horizontal = 16.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text("Clear", style = Type.sans(14, FontWeight.Bold), color = Palette.gold)
                    }
                }
                Box(Modifier.weight(3f)) {
                    PrimaryButton("Send", enabled = !Conversations.streaming && draft.isNotBlank()) {
                        val text = draft
                        draft = ""
                        scope.launch { Conversations.send(text) }
                    }
                }
            }
        }
    }
}

@Composable
private fun Bubble(turn: Turn) {
    when (turn.kind) {
        "reader" -> Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
            Text(
                turn.text,
                style = Type.serif(17), color = Palette.ink,
                modifier = Modifier
                    .padding(start = 40.dp)
                    .clip(RoundedCornerShape(18.dp))
                    .background(Palette.goldSoft)
                    .border(1.dp, Palette.goldLine, RoundedCornerShape(18.dp))
                    .padding(horizontal = 14.dp, vertical = 10.dp)
            )
        }
        "oracle" -> Text(turn.text, style = Type.serif(18), color = Palette.ink)
        "tool" -> Text(
            turn.text,
            style = Type.sans(12, FontWeight.SemiBold),
            color = if (turn.ok) Palette.gold else Palette.rose,
            modifier = Modifier
                .clip(CircleShape)
                .background(Color(0x0DFFFFFF))
                .padding(horizontal = 10.dp, vertical = 6.dp)
        )
        else -> Text(turn.text, style = Type.sans(13), color = Palette.rose)
    }
}

@Composable
private fun SessionList(onDismiss: () -> Unit) {
    Dialog(onDismissRequest = onDismiss) {
        Column(
            Modifier
                .fillMaxWidth()
                .heightIn(max = 560.dp)
                .clip(RoundedCornerShape(22.dp))
                .background(Palette.night2)
                .border(1.dp, Palette.line, RoundedCornerShape(22.dp))
                .padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Text("Conversations", style = Type.display(22), color = Palette.ink)
            LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                items(Conversations.sessions.toList(), key = { it.id }) { session ->
                    Row(
                        Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(14.dp))
                            .background(Color(0x08FFFFFF))
                            .clickable { Conversations.select(session.id); onDismiss() }
                            .padding(12.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(Modifier.weight(1f)) {
                            Text(
                                session.title,
                                style = Type.serif(17),
                                color = if (session.id == Conversations.currentId) Palette.gold else Palette.ink,
                                maxLines = 1
                            )
                            Text("${session.turns.size} messages", style = Type.sans(12), color = Palette.inkMute)
                        }
                        Text(
                            "Delete",
                            style = Type.sans(12, FontWeight.Bold).copy(letterSpacing = 1.sp),
                            color = Palette.rose,
                            modifier = Modifier.clickable { Conversations.delete(session.id) }.padding(8.dp)
                        )
                    }
                }
            }
            PrimaryButton("New conversation") { Conversations.newConversation(); onDismiss() }
        }
    }
}

@Composable
fun SettingsScreen(navController: NavController) {
    var editing by remember { mutableStateOf(false) }
    val profile = Profiles.profile
    if (editing) BirthFormDialog(profile, { editing = false }) { Profiles.save(it) }

    ScreenScaffold(navController, "Auspice 宜时", "Settings") {
        BirthSummary(profile) { editing = true }

        Panel(title = "Readings") {
            Text(
                "Charts, hexagrams, draws and the almanac are computed on this device and never leave it. " +
                    "When you ask for a reading in words, the question and the computed facts go to our own " +
                    "reading service, which holds the provider keys so this app does not have to.",
                style = Type.serif(16), color = Palette.inkSoft
            )
            FlowRowOf {
                Chip("Tianji Fast", "天机快速版", Conversations.tier == "tianji-fast") {
                    Conversations.tier = "tianji-fast"
                }
                Chip("Tianji Pro", "天机专业版", Conversations.tier == "tianji-pro") {
                    Conversations.tier = "tianji-pro"
                }
            }
        }

        Panel(title = "Rules") {
            Text(
                if (Engines.ready) "Loaded, contract version ${Engines.EXPECTED_VERSION}"
                else Engines.startupError ?: "Loading…",
                style = Type.serif(16), color = if (Engines.ready) Palette.inkSoft else Palette.rose
            )
            Text(
                "The same rules the web app and the iOS app run, built from one source so the three can " +
                    "never disagree.",
                style = Type.sans(13), color = Palette.inkMute
            )
        }

        Panel(title = "About") {
            Text("Auspice 宜时 · LazyingArt LLC", style = Type.serif(17), color = Palette.ink)
            Text("Version ${BuildConfig.VERSION_NAME} (${BuildConfig.VERSION_CODE})", style = Type.sans(13), color = Palette.inkMute)
        }
    }
}
