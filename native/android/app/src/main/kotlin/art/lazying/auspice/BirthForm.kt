package art.lazying.auspice

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material3.Icon
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog

/** The line at the top of a charted screen: who this chart is for. */
@Composable
fun BirthSummary(profile: BirthProfile, onEdit: () -> Unit) {
    Panel(Modifier.clickable(onClick = onEdit)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) {
                Text(
                    if (profile.isComplete) summary(profile) else t("birth.add"),
                    style = Type.display(17), color = Palette.ink
                )
                Text(
                    if (profile.isComplete) {
                        if (profile.timeKnown) profile.place else "${profile.place} · ${t("birth.timeUnknown")}"
                    } else {
                        t("birth.hourMatters")
                    },
                    style = Type.serif(15), color = Palette.inkMute
                )
            }
            Icon(Icons.Default.Edit, "Edit", tint = Palette.gold)
        }
    }
}

private fun summary(profile: BirthProfile): String {
    val time = if (profile.timeKnown) String.format(" %02d:%02d", profile.hour, profile.minute) else ""
    return String.format("%d-%02d-%02d%s", profile.year, profile.month, profile.day, time)
}

/** The form itself. Everything on it stays on the device. */
@Composable
fun BirthFormDialog(profile: BirthProfile, onDismiss: () -> Unit, onSave: (BirthProfile) -> Unit) {
    var draft by remember { mutableStateOf(profile) }
    Dialog(onDismissRequest = onDismiss) {
        Column(
            Modifier
                .fillMaxWidth()
                .heightIn(max = 620.dp)
                .clip(RoundedCornerShape(22.dp))
                .background(Palette.night2)
                .border(1.dp, Palette.line, RoundedCornerShape(22.dp))
                .verticalScroll(rememberScrollState())
                .padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Text(t("birth.details"), style = Type.display(22), color = Palette.ink)

            NumberRow(t("bazi.year"), draft.year) { draft = draft.copy(year = it) }
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                Box(Modifier.weight(1f)) { NumberRow(t("bazi.month"), draft.month) { draft = draft.copy(month = it) } }
                Box(Modifier.weight(1f)) { NumberRow(t("bazi.day"), draft.day) { draft = draft.copy(day = it) } }
            }
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                Box(Modifier.weight(1f)) { NumberRow(t("bazi.hour"), draft.hour) { draft = draft.copy(hour = it) } }
                Box(Modifier.weight(1f)) { NumberRow(t("birth.utcOffset"), draft.minute) { draft = draft.copy(minute = it) } }
            }
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(t("birth.timeKnown"), style = Type.sans(16), color = Palette.inkSoft, modifier = Modifier.weight(1f))
                Switch(
                    checked = draft.timeKnown,
                    onCheckedChange = { draft = draft.copy(timeKnown = it) },
                    colors = SwitchDefaults.colors(checkedTrackColor = Palette.gold)
                )
            }

            FieldLabel(t("birth.place"))
            TextRow(draft.place) { draft = draft.copy(place = it) }
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                Box(Modifier.weight(1f)) { DecimalRow(t("birth.latitude"), draft.latitude) { draft = draft.copy(latitude = it) } }
                Box(Modifier.weight(1f)) { DecimalRow(t("birth.longitude"), draft.longitude) { draft = draft.copy(longitude = it) } }
            }
            DecimalRow(t("birth.utcOffset"), draft.utcOffsetHours) { draft = draft.copy(utcOffsetHours = it) }
            Text(
                t("birth.solarNote"),
                style = Type.sans(13), color = Palette.inkMute
            )

            FieldLabel(t("birth.name"))
            TextRow(draft.name) { draft = draft.copy(name = it) }
            FlowRowOf {
                Chip(t("birth.female"), null, draft.gender == "female") { draft = draft.copy(gender = "female") }
                Chip(t("birth.male"), null, draft.gender == "male") { draft = draft.copy(gender = "male") }
            }

            PrimaryButton(t("common.save")) { onSave(draft); onDismiss() }
        }
    }
}

@Composable
private fun TextRow(value: String, onChange: (String) -> Unit) {
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

@Composable
private fun NumberRow(label: String, value: Int, onChange: (Int) -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
        FieldLabel(label)
        NumericField(value.toString()) { text -> text.toIntOrNull()?.let(onChange) }
    }
}

@Composable
private fun DecimalRow(label: String, value: Double, onChange: (Double) -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
        FieldLabel(label)
        NumericField(value.toString()) { text -> text.toDoubleOrNull()?.let(onChange) }
    }
}

@Composable
private fun NumericField(initial: String, onChange: (String) -> Unit) {
    var text by remember(initial) { mutableStateOf(initial) }
    Box(
        Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp))
            .background(Color(0x40000000))
            .border(1.dp, Palette.line, RoundedCornerShape(14.dp))
            .padding(horizontal = 14.dp, vertical = 12.dp)
    ) {
        BasicTextField(
            value = text,
            onValueChange = { text = it; onChange(it) },
            textStyle = Type.serif(18).copy(color = Palette.ink),
            cursorBrush = SolidColor(Palette.gold),
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
            modifier = Modifier.fillMaxWidth()
        )
    }
}
