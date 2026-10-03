#!/usr/bin/env python3
"""Build an isolated native StoreKit harness from the production client source."""
from pathlib import Path
import sys,json,subprocess,shutil
root=Path(__file__).resolve().parents[1];target=Path(sys.argv[1]);target.mkdir(parents=True,exist_ok=True)
source=(root/'native/ios/Auspice/DeepReports.swift').read_text().split('let deepReportSections =')[0]
profile=(root/'native/ios/Auspice/Profile.swift').read_text().split('@Observable')[0]
models=(root/'native/ios/Auspice/Models.swift').read_text().split('// MARK: - BaZi')[1].split('// MARK: - Astrology')[0]
(target/'ReportClient.swift').write_text(source+'\n'+profile+'\n'+models+'\nenum Localisation { static let shared = LocalisationState() }; struct LocalisationState { let code = "en" }\n')
for name in ('BaziReport.storekit','BaziReportStoreKitTests.swift'):shutil.copyfile(root/'native/tests'/name,target/name)
chart=json.loads(subprocess.check_output(['node',str(root/'ops/report_engine.cjs')],input=json.dumps({'input':dict(year=1990,month=6,day=15,hour=8,minute=30,gender='female',longitude=121.47,utcOffsetHours=8),'year':2026}).encode()))
(target/'ReportSnapshot.json').write_text(json.dumps(dict(id='',created=1,language='en',question='',status='unpaid',facts=dict(chart=chart,timeKnown=True,engineVersion='bazi-v1'),report=None,error=None,checkoutSession=None)))
(target/'TestHost.swift').write_text('import AppKit\n@main struct TestHost {\n static func main() {\n  NSApplication.shared.setActivationPolicy(.regular)\n  let window = NSWindow(contentRect: NSRect(x: 0, y: 0, width: 360, height: 120), styleMask: [.titled, .closable], backing: .buffered, defer: false)\n  window.title = "LazyOracle local StoreKit tests"; window.isReleasedWhenClosed = false\n  window.makeKeyAndOrderFront(nil); NSApplication.shared.activate(ignoringOtherApps: true)\n  NSApplication.shared.run()\n }\n}\n')
