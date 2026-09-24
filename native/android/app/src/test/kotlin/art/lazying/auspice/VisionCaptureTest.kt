package art.lazying.auspice

import org.junit.Assert.*
import org.junit.Test

class VisionCaptureTest {
    private fun frame(t:Long,width:Int=480)=LandmarkFrame(List(21){listOf(0.4,0.5,0.0)},width,640,t)
    @Test fun waitsForARealBurstAndExpiresStaleFrames() {
        val w=CaptureWindow()
        repeat(7){w.append(frame(it*100L),it*100L)}
        assertFalse(w.ready)
        w.append(frame(700),700)
        assertTrue(w.ready);assertEquals(8,w.snapshot(900).size)
        assertTrue(w.snapshot(1201).isEmpty())
    }
    @Test fun boundsMemoryAndResetsOnLossGapOrFormatChange() {
        val w=CaptureWindow()
        repeat(30){w.append(frame(it*100L),it*100L)}
        assertEquals(12,w.snapshot(2900).size)
        w.append(frame(3500),3500);assertFalse(w.ready)
        repeat(8){w.append(frame(3600+it*100L),3600+it*100L)}
        assertTrue(w.ready)
        w.append(frame(4400,640),4400);assertFalse(w.ready)
        w.append(LandmarkFrame(emptyList(),640,480,4500),4500)
        assertFalse(w.ready);assertTrue(w.snapshot(4500).isEmpty())
    }
    @Test fun duplicateTimestampsCannotPretendToBeIndependentSamples() {
        val w=CaptureWindow()
        repeat(20){w.append(frame(100),100)}
        assertFalse(w.ready);assertTrue(w.snapshot(100).isEmpty())
    }
}
