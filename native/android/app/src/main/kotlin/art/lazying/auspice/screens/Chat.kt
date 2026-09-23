package art.lazying.auspice.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.interaction.collectIsDraggedAsState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ArrowDownward
import androidx.compose.material.icons.filled.History
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.FilledTonalButton
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
    val sessionId = Conversations.current.id
    var followLatest by remember(sessionId) { mutableStateOf(true) }
    val dragged by listState.interactionSource.collectIsDraggedAsState()
    val atBottom by remember { derivedStateOf { !listState.canScrollForward } }

    LaunchedEffect(Unit) {
        if (opening.isNotBlank() && Conversations.current.turns.isEmpty()) {
            Conversations.send(opening)
        }
    }

    val turns = remember(revision) { Conversations.current.turns.toList() }
    // Include the earlier-message row, activity row and final spacer.
    val bottomIndex = minOf(turns.size, VISIBLE_TURNS) +
        (if (turns.size > VISIBLE_TURNS || turns.isEmpty()) 1 else 0) +
        (if (Conversations.streaming) 1 else 0)
    LaunchedEffect(dragged, atBottom) {
        if (dragged) followLatest = atBottom
        else if (atBottom) followLatest = true
    }
    LaunchedEffect(revision, sessionId, listState.layoutInfo.viewportSize.height) {
        if (followLatest) listState.scrollToItem(bottomIndex)
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
                        "${turns.size - VISIBLE_TURNS} ${t("chat.earlier")}",
                        style = Type.sans(12), color = Palette.inkMute,
                        modifier = Modifier.fillMaxWidth().padding(vertical = 6.dp),
                        textAlign = TextAlign.Center
                    )
                }
            }
            if (turns.isEmpty()) {
                item {
                    Column(verticalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.padding(top = 8.dp)) {
                        Text(t("chat.opener"), style = Type.serif(20), color = Palette.inkSoft)
                        FlowRowOf {
                            listOf(
                                "Is today good for signing a contract?",
                                "Draw three cards about my work",
                                "What does my day master need?",
                                "Cast a hexagram for me"
                            ).forEach { suggestion ->
                                Chip(suggestion, null, false) { followLatest = true; scope.launch { Conversations.send(suggestion) } }
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
                        Text(t("chat.reading"), style = Type.sans(13), color = Palette.inkMute)
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
            if (!atBottom) {
                FilledTonalButton(
                    onClick = { followLatest = true; scope.launch { listState.animateScrollToItem(bottomIndex) } },
                    modifier = Modifier.align(Alignment.CenterHorizontally)
                ) {
                    Icon(Icons.Default.ArrowDownward, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(Modifier.width(6.dp))
                    Text(t("chat.latest"))
                }
            }
            Box(
                Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(16.dp))
                    .background(Color(0x47000000))
                    .border(1.dp, Palette.line, RoundedCornerShape(16.dp))
                    .padding(horizontal = 14.dp, vertical = 10.dp)
            ) {
                if (draft.isEmpty()) {
                    Text(t("chat.ask"), style = Type.serif(18), color = Palette.inkMute)
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
                        Text(t("common.clear"), style = Type.sans(14, FontWeight.Bold), color = Palette.gold)
                    }
                }
                Box(Modifier.weight(3f)) {
                    PrimaryButton(t("common.send"), enabled = !Conversations.streaming && draft.isNotBlank()) {
                        val text = draft
                        draft = ""
                        followLatest = true
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
            Text(t("chat.allConversations"), style = Type.display(22), color = Palette.ink)
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
                            Text("${session.turns.size} ${t("chat.messages")}", style = Type.sans(12), color = Palette.inkMute)
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
            PrimaryButton(t("chat.newConversation")) { Conversations.newConversation(); onDismiss() }
        }
    }
}

@Composable
fun SettingsScreen(navController: NavController) {
    var editing by remember { mutableStateOf(false) }
    val profile = Profiles.profile
    if (editing) BirthFormDialog(profile, { editing = false }) { Profiles.save(it) }

    ScreenScaffold(navController, t("app.name"), t("common.settings")) {
        BirthSummary(profile) { editing = true }

        Panel(title = t("settings.language")) {
            FlowRowOf {
                Chip(t("settings.languageSystem"), null, Localisation.chosen == null) {
                    Localisation.choose(null)
                }
                Catalogue.languages.forEach { (code, name) ->
                    Chip(name, null, Localisation.chosen == code) { Localisation.choose(code) }
                }
            }
        }

        Panel(title = t("settings.readings")) {
            Text(
                t("settings.readingsNote"),
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

        Panel(title = t("settings.rules")) {
            Text(
                if (Engines.ready) "Loaded, contract version ${Engines.EXPECTED_VERSION}"
                else Engines.startupError ?: "Loading…",
                style = Type.serif(16), color = if (Engines.ready) Palette.inkSoft else Palette.rose
            )
            Text(
                t("settings.rulesNote"),
                style = Type.sans(13), color = Palette.inkMute
            )
        }

        Panel(title = t("settings.about")) {
            Text("${t("app.name")} · LazyingArt LLC", style = Type.serif(17), color = Palette.ink)
            Text("${t("settings.version")} ${BuildConfig.VERSION_NAME} (${BuildConfig.VERSION_CODE})", style = Type.sans(13), color = Palette.inkMute)
        }
    }
}
