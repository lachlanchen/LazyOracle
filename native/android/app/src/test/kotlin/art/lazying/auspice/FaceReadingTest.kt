package art.lazying.auspice

import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import org.junit.Assert.*
import org.junit.Test

class FaceReadingTest {
    private val codec = Json { ignoreUnknownKeys = true; encodeDefaults = true }
    @Test fun olderSnapshotsDecodeAndNewClassificationSurvivesPersistence() {
        val old = codec.decodeFromString<FaceFeatures>("""{"element":"mixed","heightRatio":1.2,"jawRatio":0.8,"foreheadRatio":0.98,"measurement":{"version":2,"samples":8,"typeCandidates":["fire","metal","water"],"limitations":[]}}""")
        assertNull(old.classification)
        val resolved = old.copy(element = "water", classification = FaceClassification(
            1, "five-form-outline-v1", "water", FaceShapeRatios(1.2, .8, 1.0),
            "Shorter, rounder outline with a narrower jaw", "Water: flow", "Try a smaller first step."
        ))
        val restored = codec.decodeFromString<FaceFeatures>(codec.encodeToString(resolved))
        assertEquals(resolved, restored)
        assertEquals(old.foreheadRatio, restored.foreheadRatio, 0.0)
        assertEquals("water", restored.classification?.primary)
    }
}
