package art.lazying.auspice

import kotlinx.coroutines.runBlocking
import kotlinx.serialization.json.*
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test

class ConversationsTest {
    private val facts = """{"date":"2026-09-23","yi":["祭祀"],"ji":["出行"]}"""
    private val answer = "今天宜祭祀，忌出行。這是今日黃曆列出的宜忌。"
    private val calls = listOf(
        Relay.ToolCall("date-1", "today", "{}"),
        Relay.ToolCall("day-1", "almanac_day", """{"date":"2026-09-23","activity":"travel"}""")
    )

    @Before fun reset() { Conversations.clearCurrent() }

    private fun assertFacts(messages: List<JsonObject>) {
        val tools = messages.filter { it["role"]?.jsonPrimitive?.content == "tool" }
        assertTrue("The next request must receive both engine results", tools.size >= 2)
        assertEquals(facts, tools.last()["content"]?.jsonPrimitive?.content)
        val assistant = messages.first { it["tool_calls"] != null }
        assertEquals("A batch belongs to one assistant message", 2, assistant["tool_calls"]!!.jsonArray.size)
    }

    @Test fun retainsResultsAndAnswersTheReportedQuestion() = runBlocking {
        var requests = 0
        val computed = mutableListOf<String>()
        Conversations.send("今天適合做什麼", stream = { messages, _, _, delta ->
            requests++
            if (requests == 1) Relay.Answer("我先看今天的日子。", calls)
            else {
                assertFacts(messages)
                delta(answer)
                Relay.Answer(answer, emptyList())
            }
        }, runTool = { name, _ -> computed.add(name); AgentTools.Outcome(name, facts, true) })
        assertEquals(2, requests)
        assertEquals(listOf("today", "almanac_day"), computed)
        assertEquals(answer, Conversations.current.turns.last().text)
        assertFalse(Conversations.streaming)
        assertTrue("Follow-up questions must retain the actual facts",
            Conversations.wire().any { it["content"]?.jsonPrimitive?.content?.contains(facts) == true })
    }

    @Test fun repeatsUseCachedFactsThenDisableToolsWithoutAnotherUiRow() = runBlocking {
        var requests = 0
        var computations = 0
        Conversations.send("今天適合做什麼", stream = { messages, tools, _, _ ->
            requests++
            when (requests) {
                1 -> Relay.Answer("", calls)
                2 -> {
                    assertFacts(messages)
                    // Whitespace/key order changes must not evade deduplication.
                    Relay.Answer("", listOf(Relay.ToolCall("again", "almanac_day",
                        """{ "activity": "travel", "date": "2026-09-23" }""")))
                }
                else -> {
                    assertFacts(messages)
                    assertNull("A repeated request must force a final answer", tools)
                    Relay.Answer(answer, emptyList())
                }
            }
        }, runTool = { name, _ -> computations++; AgentTools.Outcome(name, facts, true) })
        assertEquals(3, requests)
        assertEquals(2, computations)
        assertEquals(2, Conversations.current.turns.count { it.kind == "tool" })
        assertTrue(Conversations.current.turns.none { it.text.contains("Already computed") })
        assertEquals(answer, Conversations.current.turns.last().text)
    }

    @Test fun emptyReplyRetriesWithTheSameComputedFacts() = runBlocking {
        var requests = 0
        Conversations.send("今天適合做什麼", stream = { messages, _, _, _ ->
            requests++
            if (requests == 1) Relay.Answer("", calls) else {
                assertFacts(messages)
                Relay.Answer(if (requests == 2) "" else answer, emptyList())
            }
        }, runTool = { name, _ -> AgentTools.Outcome(name, facts, true) })
        assertEquals(3, requests)
        assertEquals(answer, Conversations.current.turns.last().text)
    }

    @Test fun stepBudgetLeavesOneRequestForTheReading() = runBlocking {
        var requests = 0
        Conversations.send("比較幾天", stream = { _, tools, _, _ ->
            requests++
            if (requests <= AgentTools.MAX_STEPS) Relay.Answer("", listOf(
                Relay.ToolCall("day-$requests", "almanac_day", """{"date":"2026-09-$requests"}""")
            )) else {
                assertNull(tools)
                Relay.Answer(answer, emptyList())
            }
        }, runTool = { name, _ -> AgentTools.Outcome(name, facts, true) })
        assertEquals(AgentTools.MAX_STEPS + 1, requests)
        assertEquals(answer, Conversations.current.turns.last().text)
    }
}
