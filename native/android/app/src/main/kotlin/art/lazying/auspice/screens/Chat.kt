package art.lazying.auspice.screens

import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.navigation.NavController
import art.lazying.auspice.*

@Composable
fun ChatScreen(navController: NavController, opening: String) {
    ScreenScaffold(navController, "Ask", "Conversation") {
        Panel { Text("Under construction.", style = Type.serif(17), color = Palette.inkSoft) }
    }
}

@Composable
fun SettingsScreen(navController: NavController) {
    ScreenScaffold(navController, "Auspice 宜时", "Settings") {
        Panel { Text("Under construction.", style = Type.serif(17), color = Palette.inkSoft) }
    }
}
