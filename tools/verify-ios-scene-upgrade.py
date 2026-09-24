#!/usr/bin/env python3
"""Regression for native-to-classic saved scenes. Run on a disposable simulator.

Installing an old build without launching/backgrounding it misses this crash.
This resets only art.lazying.auspice in the explicitly selected simulator.
"""
import argparse
from pathlib import Path
import plistlib
import subprocess
import time

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--device', required=True, help='Booted, disposable simulator UUID')
parser.add_argument('--from-app', required=True, type=Path, help='Prior native simulator .app')
parser.add_argument('--to-app', required=True, type=Path, help='New classic simulator .app')
parser.add_argument('--output', required=True, type=Path)
parser.add_argument('--reset-fixture', required=True, action='store_true')
args = parser.parse_args()
app_id = 'art.lazying.auspice'
for app in (args.from_app, args.to_app):
    info = plistlib.loads((app / 'Info.plist').read_bytes())
    assert info['CFBundleIdentifier'] == app_id, 'Both fixtures must be Auspice'
    assert info['CFBundleSupportedPlatforms'] == ['iPhoneSimulator'], 'Simulator builds only'
args.output.mkdir(parents=True, exist_ok=True)


def sim(*command, check=True):
    result = subprocess.run(['xcrun', 'simctl', *command], capture_output=True, text=True)
    if check:
        result.check_returncode()
    return result.stdout.strip()


sim('uninstall', args.device, app_id, check=False)
sim('install', args.device, str(args.from_app))
sim('launch', args.device, app_id)
time.sleep(4)
sim('launch', args.device, 'com.apple.Preferences')
time.sleep(3)
container = Path(sim('get_app_container', args.device, app_id, 'data'))
saved_scene = container / 'Library/Saved Application State' / f'{app_id}.savedState/KnownSceneSessions/data.data'
assert saved_scene.exists(), 'Prior build must actually save its scene before upgrading'
start = time.strftime('%Y-%m-%d %H:%M:%S')
sim('install', args.device, str(args.to_app))
pid = sim('launch', args.device, app_id)
time.sleep(6)
for cycle in range(4):
    sim('launch', args.device, 'com.apple.Preferences')
    time.sleep(2)
    assert sim('launch', args.device, app_id) == pid, f'App restarted in cycle {cycle}'
    time.sleep(2)
sim('io', args.device, 'screenshot', str(args.output / 'upgrade.png'))
logs = sim('spawn', args.device, 'log', 'show', '--start', start, '--style', 'compact',
           '--predicate', 'process == "App"')
(args.output / 'upgrade.log').write_text(logs)
assert 'Missing scene item' not in logs and 'Fatal error' not in logs
print('PASS: saved native scene restored into classic; four resumes retained the same process')
