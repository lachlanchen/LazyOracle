package art.lazying.auspice

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/** The same tokens the web app and the iOS app use, so the three look like one product. */
object Palette {
    val night = Color(0xFF0B0D1F)
    val night2 = Color(0xFF131634)
    val night3 = Color(0xFF1C1F45)
    val ink = Color(0xFFF4EFE4)
    val inkSoft = Color(0xB8F4EFE4)
    val inkMute = Color(0x80F4EFE4)
    val gold = Color(0xFFD9B45A)
    val goldSoft = Color(0x38D9B45A)
    val goldLine = Color(0x73D9B45A)
    val rose = Color(0xFFE28B7A)
    val parchment = Color(0xFFF3E9D2)
    val parchment2 = Color(0xFFE9DBB9)
    val line = Color(0x1FF4EFE4)
}

object Type {
    fun display(size: Int, weight: FontWeight = FontWeight.SemiBold) =
        TextStyle(fontFamily = FontFamily.Serif, fontSize = size.sp, fontWeight = weight)

    fun serif(size: Int, weight: FontWeight = FontWeight.Normal) =
        TextStyle(fontFamily = FontFamily.Serif, fontSize = size.sp, fontWeight = weight)

    fun sans(size: Int, weight: FontWeight = FontWeight.Normal) =
        TextStyle(fontFamily = FontFamily.SansSerif, fontSize = size.sp, fontWeight = weight)
}

@Composable
fun Eyebrow(text: String, modifier: Modifier = Modifier) {
    Text(
        text.uppercase(),
        style = Type.sans(12, FontWeight.Bold).copy(letterSpacing = 2.6.sp),
        color = Palette.gold,
        modifier = modifier
    )
}

/** The bordered, faintly lit card every section sits in. */
@Composable
fun Panel(
    modifier: Modifier = Modifier,
    title: String? = null,
    content: @Composable ColumnScope.() -> Unit
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(22.dp))
            .background(
                Brush.verticalGradient(listOf(Color(0x0DFFFFFF), Color(0x05FFFFFF)))
            )
            .border(1.dp, Palette.line, RoundedCornerShape(22.dp))
            .padding(18.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        if (title != null) {
            Text(
                title.uppercase(),
                style = Type.display(15).copy(letterSpacing = 2.1.sp),
                color = Palette.gold
            )
        }
        content()
    }
}
