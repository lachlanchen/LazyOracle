#!/usr/bin/env python3
"""Entitlement/delivery contracts, isolated temporary ledgers, no live payments."""
import concurrent.futures
import importlib.util
import json
import os
from pathlib import Path
import tempfile
import threading
import time
import unittest
import uuid
import sys
from unittest.mock import patch, MagicMock
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'ops'))
from report_service import Reports, ReportError, StoreVerifier, SECTIONS, GOOGLE_PRODUCT

PROFILE = dict(year=1990, month=6, day=15, hour=8, minute=30, timeKnown=True, gender='female', longitude=121.47, utcOffsetHours=8, name='Not retained', place='Not retained')
OWNER = 'a' * 64
OTHER = 'b' * 64
REPORT = {key: 'A complete interpretive paragraph. ' * 20 for key in SECTIONS}

class Verifier:
    def __init__(self): self.consume_error = False; self.consumed = []; self.calls = 0
    def google(self, token, row):
        self.calls += 1
        if token == 'pending': raise ReportError(409, 'pending')
        if token == 'invalid': raise ReportError(403, 'invalid')
        return token, {'token': token}
    apple = google
    stripe = google
    def consume_google(self, receipt):
        if self.consume_error: raise RuntimeError('store offline')
        self.consumed.append(receipt['token'])
    def checkout(self, row): return {'id': 'cs_test_' + row['id'], 'url': 'https://checkout.stripe.com/example'}

class Contracts(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(); self.verifier = Verifier()
        self.service = Reports(self.temp.name + '/ledger.sqlite', self.verifier, lambda _: REPORT)
    def tearDown(self):
        for _ in range(100):
            if not self.service.jobs: break
            time.sleep(.01)
        self.temp.cleanup()
    def create(self, **kwargs):
        payload = dict(id=str(uuid.uuid4()), profile=PROFILE, language='en', question='Work?') | kwargs
        return self.service.request('create', OWNER, payload)
    def wait(self, id):
        for _ in range(100):
            row = self.service.get(id)
            if row['status'] != 'generating' and id not in self.service.jobs: return row
            time.sleep(.01)
        self.fail('job did not finish')
    def test_chart_uses_real_shared_engine_and_excludes_labels(self):
        row=self.create(); facts=row['facts']; self.assertEqual(facts['chart']['input']['hour'],8)
        self.assertNotIn('Not retained',json.dumps(facts)); self.assertIn(facts['chart']['dayMaster']['element'], '木火土金水')
    def test_unknown_hour_keeps_exact_free_chart_but_marks_provisional(self):
        row=self.create(profile=PROFILE | {'timeKnown':False}); self.assertFalse(row['facts']['timeKnown']); self.assertEqual(row['facts']['chart']['input']['hour'],8)
    def test_invalid_birth_date_never_creates_order(self):
        with self.assertRaises(ReportError): self.create(profile=PROFILE | {'month':2,'day':31})
        self.assertEqual(self.service.request('list',OWNER,{})['reports'],[])
    def test_capability_required_and_owner_isolated(self):
        row=self.create()
        for cap in ('', OTHER):
            with self.assertRaises(ReportError): self.service.request('get',cap,{'id':row['id']})
    def test_cancelled_purchase_reuses_the_same_unpaid_snapshot(self):
        first=self.create();second=self.create()
        self.assertEqual(first['id'],second['id'])
    def test_create_idempotent_and_facts_are_frozen(self):
        row=self.create(); again=self.create(id=row['id'],profile=PROFILE | {'year':2000})
        self.assertEqual(row,again)
    def test_unpaid_order_cannot_generate(self):
        row=self.create(); self.service.request('retry',OWNER,{'id':row['id']}); self.assertEqual(self.service.get(row['id'])['status'],'unpaid')
    def test_invalid_and_pending_receipts_grant_nothing(self):
        for receipt in ('invalid','pending'):
            row=self.create()
            with self.assertRaises(ReportError): self.service.request('verify',OWNER,dict(id=row['id'],platform='google',receipt=receipt))
            self.assertEqual(self.service.get(row['id'])['status'],'unpaid')
    def test_commit_precedes_google_consume_and_transient_consume_recovers(self):
        row=self.create(); self.verifier.consume_error=True
        response=self.service.request('verify',OWNER,dict(id=row['id'],platform='google',receipt='token1')); self.assertFalse(response['settled'])
        self.assertNotEqual(self.service.get(row['id'])['status'],'unpaid')
        self.verifier.consume_error=False
        response=self.service.request('verify',OWNER,dict(id=row['id'],platform='google',receipt='token1')); self.assertTrue(response['settled'])
        self.assertEqual(self.wait(row['id'])['status'],'ready')
    def test_same_receipt_cannot_buy_two_reports(self):
        first=self.create();second=self.create(question='Different report')
        self.service.request('verify',OWNER,dict(id=first['id'],platform='apple',receipt='same'))
        with self.assertRaises(ReportError): self.service.request('verify',OWNER,dict(id=second['id'],platform='apple',receipt='same'))
        self.assertEqual(self.service.get(second['id'])['status'],'unpaid')
    def test_generation_failure_retries_without_new_purchase(self):
        row=self.create(); self.service.generator=lambda _: {'overview':'partial'}
        self.service.request('verify',OWNER,dict(id=row['id'],platform='apple',receipt='one'))
        failed=self.wait(row['id']); self.assertEqual(failed['status'],'paid');self.assertEqual(failed['error'],'generation_retry')
        self.service.generator=lambda _: REPORT
        with self.service.connect() as db:db.execute('UPDATE reports SET updated=0 WHERE id=?',(row['id'],))
        self.service.request('retry',OWNER,{'id':row['id']})
        self.assertEqual(self.wait(row['id'])['status'],'ready');self.assertEqual(self.verifier.calls,1)
    def test_reopen_paid_and_ready_reports_without_repurchase(self):
        row=self.create();self.service.request('verify',OWNER,dict(id=row['id'],platform='apple',receipt='one'));self.wait(row['id'])
        reopened=Reports(self.service.database,self.verifier,lambda _: REPORT)
        saved=reopened.request('list',OWNER,{})['reports'][0]
        self.assertEqual(saved['status'],'ready');self.assertEqual(saved['report'],REPORT)
    def test_concurrent_replay_generates_only_once(self):
        row=self.create(); count=[]
        def generate(_):count.append(1);time.sleep(.05);return REPORT
        self.service.generator=generate
        with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
            results=list(executor.map(lambda _:self.service.request('verify',OWNER,dict(id=row['id'],platform='apple',receipt='same')),range(4)))
        self.wait(row['id']);self.assertEqual(len(count),1)
    def test_unsigned_webhook_does_not_unlock(self):
        os.environ['ORACLE_STRIPE_WEBHOOK']='testsecret'
        with self.assertRaises(ReportError): self.service.webhook(b'{}','t=0,v1=bad')
        del os.environ['ORACLE_STRIPE_WEBHOOK']

class StoreAdapters(unittest.TestCase):
    def setUp(self):
        self.order = {'id': str(uuid.uuid4())}
        self.verifier = StoreVerifier({'ORACLE_GOOGLE_CREDENTIALS': 'private.json', 'ORACLE_STRIPE_SECRET': 'test-only', 'ORACLE_STRIPE_PRICE': 'price_expected'})
        self.purchase = {'purchaseStateContext': {'purchaseState': 'PURCHASED'},
            'obfuscatedExternalProfileId': self.order['id'],
            'productLineItem': [{'productId': GOOGLE_PRODUCT, 'productOfferDetails': {'quantity': 1, 'refundableQuantity': 1, 'consumptionState': 'CONSUMPTION_STATE_YET_TO_BE_CONSUMED'}}]}
    def google(self, response):
        # Real adapter code, isolated store transport and credentials.
        with patch('google.oauth2.service_account.Credentials.from_service_account_file') as auth, patch('report_service.json_request', return_value=response):
            auth.return_value.token = 'test-access'
            return self.verifier.google('test-purchase-token', self.order)
    def test_google_current_state_and_order_binding(self):
        self.google(self.purchase)
        for response in [self.purchase | {'obfuscatedExternalProfileId': 'other'}, self.purchase | {'purchaseStateContext': {'purchaseState': 'PENDING'}}]:
            with self.assertRaises(ReportError): self.google(response)
    def test_google_refund_quantity_and_wrong_product(self):
        for offer in [{'quantity': 2}, {'quantity': 1, 'refundableQuantity': 0}]:
            bad = self.purchase | {'productLineItem': [{'productId': GOOGLE_PRODUCT, 'productOfferDetails': offer}]}
            with self.assertRaises(ReportError): self.google(bad)
        with self.assertRaises(ReportError): self.google(self.purchase | {'productLineItem': [{'productId': 'another_product'}]})
    def test_google_replay_of_consumed_purchase_does_not_consume_again(self):
        self.purchase['productLineItem'][0]['productOfferDetails']['consumptionState'] = 'CONSUMPTION_STATE_CONSUMED'
        _, receipt = self.google(self.purchase)
        with patch('urllib.request.urlopen') as transport:
            self.verifier.consume_google(receipt)
            transport.assert_not_called()
    def test_stripe_checks_current_paid_state_price_amount_and_binding(self):
        session = {'payment_status': 'paid', 'status': 'complete', 'mode': 'payment', 'amount_total': 499, 'currency': 'usd',
            'metadata': {'oracle_order': self.order['id']}, 'client_reference_id': self.order['id'],
            'line_items': {'data': [{'quantity': 1, 'price': {'id': 'price_expected'}}]}}
        with patch('report_service.json_request', return_value=session): self.verifier.stripe('cs_test_123', self.order)
        for change in [{'payment_status': 'unpaid'}, {'amount_total': 99}, {'currency': 'eur'}, {'client_reference_id': 'other'}, {'line_items': {'data': [{'quantity': 1, 'price': {'id': 'wrong'}}]}}]:
            with patch('report_service.json_request', return_value=session | change), self.assertRaises(ReportError): self.verifier.stripe('cs_test_123', self.order)
    def test_apple_local_storekit_environment_cannot_grant_production_report(self):
        import base64
        with tempfile.TemporaryDirectory() as folder:
            Path(folder, 'root.cer').write_bytes(b'test-root')
            verifier = StoreVerifier({'ORACLE_APPLE_ROOTS': folder})
            hint = base64.urlsafe_b64encode(json.dumps({'environment': 'Xcode'}).encode()).decode().rstrip('=')
            with self.assertRaises(ReportError): verifier.apple('header.' + hint + '.signature', self.order)

unittest.main()
