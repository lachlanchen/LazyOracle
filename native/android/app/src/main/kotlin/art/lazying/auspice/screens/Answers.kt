package art.lazying.auspice.screens

import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.navigation.NavController
import art.lazying.auspice.*

@Composable
fun AnswersScreen(navController: NavController) {
    ScreenScaffold(navController, "Answers", "Answers") {
        Panel { Text("Under construction.", style = Type.serif(17), color = Palette.inkSoft) }
    }
}
