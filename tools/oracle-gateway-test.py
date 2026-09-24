#!/usr/bin/env python3
"""Exercise the real HTTP relay with a local, deterministic upstream fixture."""
import importlib.util
import io
import json
from pathlib import Path
import threading
import unittest
from unittest.mock import patch
import urllib.request

spec = importlib.util.spec_from_file_location('gateway', Path(__file__).resolve().parent.parent / 'ops/oracle_gateway.py')
gateway = importlib.util.module_from_spec(spec)
spec.loader.exec_module(gateway)

class Upstream(io.BytesIO):
    pass

class GatewayTest(unittest.TestCase):
    def test_language_context_uses_reader_words_and_keeps_tool_facts(self):
        messages = [
            {"role":"system","content":"English is the interface default."},
            {"role":"user","content":"西边怎么样"},
            {"role":"assistant","content":"<tool>...</tool>"},
            {"role":"user","content":"TOOL RESULT: English engine facts"},
            {"role":"user","content":"Answer now using the computed facts above."},
        ]
        result = gateway.chat_language_context(messages, {"tools":[]})
        self.assertIn('"西边怎么样"', result[0]["content"])
        self.assertNotIn('English engine facts', result[0]["content"])
        self.assertEqual(result[1:], messages[1:])
        self.assertEqual(messages[0]["content"], "English is the interface default.")
        messages.append({"role":"user","content":"Please switch to English."})
        self.assertIn('"Please switch to English."', gateway.chat_language_context(messages, {"tools":[]})[0]["content"])

    def test_plain_reading_keeps_its_interface_language_prompt(self):
        messages = [{"role":"system","content":"Explain in the selected language"}, {"role":"user","content":"Computed facts"}]
        self.assertEqual(gateway.chat_language_context(messages, {}), messages)

    def test_both_tiers_keep_tool_history_and_reserve_tokens_for_visible_answers(self):
        received = []
        def upstream(request, **_):
            received.append(json.loads(request.data))
            return Upstream(b'data: {"choices":[{"delta":{"content":"Clear answer"}}]}\n\ndata: [DONE]\n\n')
        fixture = [('deepseek', 'https://example.invalid/chat/completions', 'test-token',
                    {'tianji-fast':'test-fast','tianji-pro':'test-pro'})]
        real_urlopen = urllib.request.urlopen
        with patch.object(gateway, 'PROVIDERS', fixture), patch.object(gateway.urllib.request, 'urlopen', side_effect=upstream):
            server = gateway.Server(('127.0.0.1', 0), gateway.Handler)
            thread = threading.Thread(target=server.serve_forever, daemon=True); thread.start()
            try:
                messages = [{'role':'user','content':'Explain my reading'},
                    {'role':'assistant','content':'','tool_calls':[{'id':'draw-1','type':'function','function':{'name':'draw_tarot','arguments':'{}'}}]},
                    {'role':'tool','tool_call_id':'draw-1','content':'{"seed":42,"cards":["the-star"]}'}]
                for tier in ['tianji-fast','tianji-pro']:
                    request = urllib.request.Request(f'http://127.0.0.1:{server.server_port}/v1/chat/completions',
                        data=json.dumps({'model':tier,'messages':messages}).encode(), headers={'Content-Type':'application/json'})
                    with real_urlopen(request, timeout=5) as response:
                        self.assertEqual(response.status, 200)
                        self.assertIn(b'Clear answer', response.read())
                    self.assertEqual(received[-1]['thinking'], {'type':'disabled'})
                    self.assertEqual(received[-1]['messages'][1:], messages)
                    self.assertEqual(received[-1]['messages'][0]['role'], 'system')
                    self.assertIn('Explain my reading', received[-1]['messages'][0]['content'])
                    self.assertTrue(received[-1]['stream'])
            finally:
                server.shutdown(); server.server_close(); thread.join()
        self.assertEqual([r['model'] for r in received], ['test-fast','test-pro'])

if __name__ == '__main__': unittest.main()
