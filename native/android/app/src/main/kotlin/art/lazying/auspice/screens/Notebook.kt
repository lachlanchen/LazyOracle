package art.lazying.auspice.screens

import android.content.Intent
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.text.selection.SelectionContainer
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.unit.dp
import androidx.navigation.NavController
import art.lazying.auspice.*
import java.text.DateFormat
import java.util.Date
import kotlinx.coroutines.launch

@Composable fun SaveReadingButton(practice: String, facts: String) {
    val saved = NotebookStore.entries.any { it.id == NotebookStore.identity(practice, facts) }
    val scope = rememberCoroutineScope()
    var busy by remember(facts) { mutableStateOf(false) }
    OutlinedButton(onClick = { busy = true; scope.launch { try { NotebookStore.save(practice, facts) } finally { busy = false } } }, enabled = !saved && !busy, modifier = Modifier.fillMaxWidth().heightIn(min = 44.dp).testTag("notebook.save")) {
        Text(t(if (saved) "notebook.saved" else "notebook.save"))
    }
    NotebookStore.error?.let { Text(t(it), color = Palette.rose) }
}

@Composable fun NotebookScreen(navController: NavController) {
    var pending by remember { mutableStateOf(false) }
    ScreenScaffold(navController, t("app.name"), t("notebook.title"), t("notebook.tagline")) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Text(t("notebook.pending"), color = Palette.ink)
            Switch(pending, { pending = it })
        }
        NotebookStore.error?.let { Text(t(it), color = Palette.rose) }
        val entries = NotebookStore.entries.filter { !pending || !it.reviewed }
        if (entries.isEmpty()) Panel { Text(t("notebook.empty"), color = Palette.inkSoft) }
        entries.forEach { entry ->
            Panel(Modifier.clickable { navController.navigate("notebook/${entry.id}") }.testTag("notebook.entry.${entry.practice}")) {
                Text(notebookName(entry.practice), style = Type.display(22), color = Palette.gold)
                Text(DateFormat.getDateInstance().format(Date(entry.createdAt)) + " · " + t(if (entry.reviewed) "notebook.reviewed" else "notebook.pending"), style = Type.sans(12), color = Palette.inkMute)
                if (entry.summary.question.isNotBlank()) Text(entry.summary.question, color = Palette.ink)
                Text(notebookLines(entry.summary), style = Type.serif(17), color = Palette.inkSoft, maxLines = 3)
            }
        }
        Text(t("notebook.privacy"), style = Type.sans(13), color = Palette.inkMute)
    }
}

@Composable fun NotebookDetail(navController: NavController, id: String) {
    val original = NotebookStore.entries.find { it.id == id }
    if (original == null) { NotebookScreen(navController); return }
    var reflection by remember(id) { mutableStateOf(original.reflection) }
    var action by remember(id) { mutableStateOf(original.action) }
    var observation by remember(id) { mutableStateOf(original.observation) }
    var reviewed by remember(id) { mutableStateOf(original.reviewed) }
    var saved by remember(id) { mutableStateOf(false) }
    val context = LocalContext.current
    val focus = LocalFocusManager.current
    ScreenScaffold(navController, t("notebook.title"), notebookName(original.practice), DateFormat.getDateTimeInstance().format(Date(original.createdAt))) {
        Panel(title = t("notebook.original")) {
            if (original.summary.question.isNotBlank()) Text(original.summary.question, color = Palette.gold)
            SelectionContainer { Text(notebookLines(original.summary), style = Type.serif(18), color = Palette.ink, modifier = Modifier.testTag("notebook.original")) }
        }
        Panel {
            FieldLabel(t("notebook.reflection")); AuspiceField(reflection) { reflection = it; saved = false }
            FieldLabel(t("notebook.action")); AuspiceField(action) { action = it; saved = false }
            FieldLabel(t("notebook.observation")); AuspiceField(observation) { observation = it; saved = false }
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text(t("notebook.reviewed"), color = Palette.ink)
                Switch(reviewed, { reviewed = it; saved = false })
            }
            PrimaryButton(t(if (saved) "notebook.notesSaved" else "notebook.saveNotes")) {
                saved = NotebookStore.update(original.copy(reflection = reflection, action = action, observation = observation, reviewed = reviewed))
                if (saved) focus.clearFocus()
            }
            NotebookStore.error?.let { Text(t(it), color = Palette.rose) }
        }
        TextButton(onClick = {
            val text = listOf("LazyOracle · " + notebookName(original.practice), DateFormat.getDateTimeInstance().format(Date(original.createdAt)), original.summary.question,
                t("notebook.original"), notebookLines(original.summary), t("notebook.reflection"), reflection,
                t("notebook.action"), action, t("notebook.observation"), observation).joinToString("\n\n")
            context.startActivity(Intent.createChooser(Intent(Intent.ACTION_SEND).apply { type = "text/plain"; putExtra(Intent.EXTRA_TEXT, text) }, t("notebook.export")))
        }) { Text(t("notebook.export")) }
        Text(t("notebook.privacy"), style = Type.sans(13), color = Palette.inkMute)
    }
}
