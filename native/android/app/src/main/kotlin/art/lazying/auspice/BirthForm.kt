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
                    if (profile.isComplete) summary(profile) else "Add your birth details",
                    style = Type.display(17), color = Palette.ink
                )
                Text(
                    if (profile.isComplete) {
                        "${profile.place} · ${if (profile.timeKnown) "time known" else "time unknown"}"
                    } else {
                        "The hour matters: without it a pillar is missing."
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
            Text("Birth details", style = Type.display(22), color = Palette.ink)

            NumberRow("Year", draft.year) { draft = draft.copy(year = it) }
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                Box(Modifier.weight(1f)) { NumberRow("Month", draft.month) { draft = draft.copy(month = it) } }
                Box(Modifier.weight(1f)) { NumberRow("Day", draft.day) { draft = draft.copy(day = it) } }
            }
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                Box(Modifier.weight(1f)) { NumberRow("Hour", draft.hour) { draft = draft.copy(hour = it) } }
                Box(Modifier.weight(1f)) { NumberRow("Minute", draft.minute) { draft = draft.copy(minute = it) } }
            }
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("I know the hour", style = Type.sans(16), color = Palette.inkSoft, modifier = Modifier.weight(1f))
                Switch(
                    checked = draft.timeKnown,
                    onCheckedChange = { draft = draft.copy(timeKnown = it) },
                    colors = SwitchDefaults.colors(checkedTrackColor = Palette.gold)
                )
            }

            FieldLabel("Place")
            TextRow(draft.place) { draft = draft.copy(place = it) }
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                Box(Modifier.weight(1f)) { DecimalRow("Latitude", draft.latitude) { draft = draft.copy(latitude = it) } }
                Box(Modifier.weight(1f)) { DecimalRow("Longitude", draft.longitude) { draft = draft.copy(longitude = it) } }
            }
            DecimalRow("Hours from UTC", draft.utcOffsetHours) { draft = draft.copy(utcOffsetHours = it) }
            Text(
                "Longitude and the offset give true solar time, which is what the hour pillar is taken from.",
                style = Type.sans(13), color = Palette.inkMute
            )

            FieldLabel("Name, if you want it on the chart")
            TextRow(draft.name) { draft = draft.copy(name = it) }
            FlowRowOf {
                Chip("Female", "女", draft.gender == "female") { draft = draft.copy(gender = "female") }
                Chip("Male", "男", draft.gender == "male") { draft = draft.copy(gender = "male") }
            }

            PrimaryButton("Save") { onSave(draft); onDismiss() }
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
