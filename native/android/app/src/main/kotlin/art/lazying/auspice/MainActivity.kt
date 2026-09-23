package art.lazying.auspice

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import art.lazying.auspice.screens.AlmanacScreen
import art.lazying.auspice.screens.AnswersScreen
import art.lazying.auspice.screens.AstrologyScreen
import art.lazying.auspice.screens.BaziScreen
import art.lazying.auspice.screens.ChatScreen
import art.lazying.auspice.screens.FaceScreen
import art.lazying.auspice.screens.FengShuiScreen
import art.lazying.auspice.screens.HomeScreen
import art.lazying.auspice.screens.IChingScreen
import art.lazying.auspice.screens.PalmScreen
import art.lazying.auspice.screens.SettingsScreen
import art.lazying.auspice.screens.TarotScreen

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent { AuspiceApp() }
    }
}

/** The nine practices, in the order the home screen shows them. */
enum class Practice(
    val route: String,
    val title: String,
    val chinese: String,
    val blurb: String
) {
    ALMANAC("almanac", "Almanac", "黄历", "What today suits, and what it does not"),
    TAROT("tarot", "Tarot", "塔罗", "One card, three, or the Celtic cross"),
    BAZI("bazi", "BaZi", "八字", "Four pillars, from the hour you were born"),
    ICHING("iching", "I Ching", "易经", "Coins or yarrow, and the lines that change"),
    ASTROLOGY("astrology", "Astrology", "星盘", "The sky at your birth, and where it stands now"),
    FENGSHUI("fengshui", "Feng Shui", "风水", "Your eight mansions, and the sector you face"),
    PALM("palm", "Palmistry", "手相", "The hand, measured rather than guessed"),
    FACE("face", "Face Reading", "面相", "Three courts, five eyes, twelve palaces"),
    ANSWERS("answers", "Book of Answers", "答案之书", "Ask once. The page falls where it falls")
}

@Composable
fun AuspiceApp() {
    val context = LocalContext.current
    var loaded by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        Engines.start(context)
        Profiles.load(context)
        Conversations.load(context)
        loaded = true
    }

    MaterialTheme(
        colorScheme = darkColorScheme(
            primary = Palette.gold,
            background = Palette.night,
            surface = Palette.night2,
            onBackground = Palette.ink,
            onSurface = Palette.ink
        )
    ) {
        val navController = rememberNavController()
        Box(Modifier.fillMaxSize()) {
            Sky()
            NavHost(navController, startDestination = "home") {
                composable("home") {
                    HomeScreen(
                        ready = loaded,
                        open = { navController.navigate(it.route) },
                        openChat = { navController.navigate("chat?opening=$it") },
                        openSettings = { navController.navigate("settings") }
                    )
                }
                composable(Practice.ALMANAC.route) { AlmanacScreen(navController) }
                composable(Practice.TAROT.route) { TarotScreen(navController) }
                composable(Practice.BAZI.route) { BaziScreen(navController) }
                composable(Practice.ICHING.route) { IChingScreen(navController) }
                composable(Practice.ASTROLOGY.route) { AstrologyScreen(navController) }
                composable(Practice.FENGSHUI.route) { FengShuiScreen(navController) }
                composable(Practice.PALM.route) { PalmScreen(navController) }
                composable(Practice.FACE.route) { FaceScreen(navController) }
                composable(Practice.ANSWERS.route) { AnswersScreen(navController) }
                composable("settings") { SettingsScreen(navController) }
                composable("chat?opening={opening}") { entry ->
                    ChatScreen(navController, entry.arguments?.getString("opening").orEmpty())
                }
            }
        }
    }
}
