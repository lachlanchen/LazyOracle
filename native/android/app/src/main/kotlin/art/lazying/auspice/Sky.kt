package art.lazying.auspice

import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import kotlin.math.sin
import kotlin.random.Random

/**
 * The night behind every screen: real points drawn on a canvas, each with its
 * own phase so the sky never pulses as one, drifting upward over ninety
 * seconds exactly as the web app's does.
 */
@Composable
fun Sky(modifier: Modifier = Modifier) {
    val stars = remember {
        val random = Random(0x5EEDFACE)
        List(110) {
            Star(
                x = random.nextFloat(),
                y = random.nextFloat(),
                radius = 0.5f + random.nextFloat() * 1.1f,
                phase = random.nextFloat() * 6.283f,
                gold = it % 7 == 0
            )
        }
    }
    val transition = rememberInfiniteTransition(label = "sky")
    val clock by transition.animateFloat(
        initialValue = 0f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(tween(90_000, easing = LinearEasing), RepeatMode.Restart),
        label = "drift"
    )

    Box(
        modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(
                    0f to Color(0xFF0D1026),
                    0.45f to Palette.night,
                    1f to Color(0xFF07081A)
                )
            )
    ) {
        Canvas(Modifier.fillMaxSize()) {
            drawRect(
                Brush.radialGradient(
                    listOf(Color(0xFF23265A), Color(0x0023265A)),
                    center = Offset(size.width / 2, -size.height * 0.1f),
                    radius = size.width * 1.1f
                )
            )
            val drift = clock * 60f
            val seconds = clock * 90f
            stars.forEach { star ->
                val twinkle = 0.55f + 0.35f * sin(seconds * 0.7f + star.phase)
                var y = star.y * size.height - drift
                if (y < 0) y += size.height
                drawCircle(
                    color = if (star.gold) Palette.gold.copy(alpha = twinkle) else Color.White.copy(alpha = twinkle * 0.9f),
                    radius = star.radius,
                    center = Offset(star.x * size.width, y)
                )
            }
        }
    }
}

private data class Star(val x: Float, val y: Float, val radius: Float, val phase: Float, val gold: Boolean)
