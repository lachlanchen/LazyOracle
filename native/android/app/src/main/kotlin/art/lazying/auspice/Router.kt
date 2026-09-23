package art.lazying.auspice

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue

/**
 * What the conversation asks the app to show.
 *
 * A reading often needs something the chat cannot compute on its own: a hand
 * or a face has to be in front of the camera. When the model calls `read_palm`
 * or `read_face`, this is how the request reaches the interface — the
 * navigation host watches it and opens the screen — and the measurements the
 * reader then takes come back here for the next tool call to find.
 */
object Router {
    var requested by mutableStateOf<Practice?>(null)
        private set

    var palm by mutableStateOf<PalmFeatures?>(null)
    var face by mutableStateOf<FaceFeatures?>(null)

    fun show(practice: Practice) {
        requested = practice
    }

    fun consumed() {
        requested = null
    }
}
