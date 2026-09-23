package art.lazying.auspice

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.systemBars
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavController

/** The shell every screen sits in: a back arrow, the title, one column. */
@Composable
fun ScreenScaffold(
    navController: NavController,
    eyebrow: String,
    title: String,
    tagline: String? = null,
    content: @Composable ColumnScope.() -> Unit
) {
    Column(
        Modifier
            .fillMaxSize()
            .windowInsetsPadding(WindowInsets.systemBars)
            .dismissKeyboardOnScroll()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 18.dp)
            .padding(bottom = 40.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        Row(
            Modifier
                .fillMaxWidth()
                .heightIn(min = 44.dp)
                .clickable { navController.popBackStack() },
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back", tint = Palette.inkSoft)
            Text("  " + t("common.back"), style = Type.sans(14, FontWeight.SemiBold), color = Palette.inkSoft)
        }
        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Eyebrow(eyebrow)
            Text(title, style = Type.display(34), color = Palette.ink)
            if (tagline != null) {
                Text(
                    tagline,
                    style = Type.serif(19).copy(fontStyle = FontStyle.Italic),
                    color = Palette.inkSoft
                )
            }
        }
        content()
    }
}

/** A selectable pill: the spread, the method, the undertaking. */
@Composable
fun Chip(label: String, detail: String? = null, active: Boolean, onClick: () -> Unit) {
    Row(
        Modifier
            .clip(CircleShape)
            .background(if (active) Palette.goldSoft else Color(0x0AFFFFFF))
            .border(1.dp, if (active) Palette.goldLine else Palette.line, CircleShape)
            .clickable(onClick = onClick)
            .heightIn(min = 40.dp)
            .padding(horizontal = 14.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(7.dp)
    ) {
        Text(label, style = Type.sans(14, FontWeight.SemiBold), color = if (active) Palette.ink else Palette.inkSoft)
        if (detail != null) {
            Text(detail, style = Type.sans(13), color = if (active) Palette.gold else Palette.inkMute)
        }
    }
}

/** The gold call to action. */
@Composable
fun PrimaryButton(label: String, enabled: Boolean = true, modifier: Modifier = Modifier, onClick: () -> Unit) {
    Row(
        modifier
            .fillMaxWidth()
            .heightIn(min = 52.dp)
            .clip(RoundedCornerShape(16.dp))
            .background(
                if (enabled) {
                    Brush.horizontalGradient(listOf(Color(0xFFE6C777), Palette.gold, Color(0xFFB48B35)))
                } else {
                    Brush.horizontalGradient(listOf(Color(0x40D9B45A), Color(0x40D9B45A)))
                }
            )
            .clickable(enabled = enabled, onClick = onClick),
        horizontalArrangement = Arrangement.Center,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(label, style = Type.sans(16, FontWeight.ExtraBold), color = Color(0xFF1A1405))
    }
}

@Composable
fun FieldLabel(text: String) {
    Text(
        text.uppercase(),
        style = Type.sans(12, FontWeight.Bold).copy(letterSpacing = 2.1.sp),
        color = Palette.inkMute,
        modifier = Modifier.fillMaxWidth()
    )
}

/** A row of chips that wraps, which `flex-wrap` gives the web app for free. */
@Composable
fun FlowRowOf(
    modifier: Modifier = Modifier,
    spacing: Int = 8,
    content: @Composable () -> Unit
) {
    androidx.compose.foundation.layout.FlowRow(
        modifier = modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(spacing.dp),
        verticalArrangement = Arrangement.spacedBy(spacing.dp)
    ) { content() }
}
