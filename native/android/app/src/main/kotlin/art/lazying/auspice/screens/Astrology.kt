package art.lazying.auspice.screens

import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.navigation.NavController
import art.lazying.auspice.*

@Composable
fun AstrologyScreen(navController: NavController) {
    ScreenScaffold(navController, "Astrology", "Astrology") {
        Panel { Text("Under construction.", style = Type.serif(17), color = Palette.inkSoft) }
    }
}
