#!/usr/bin/env python3
"""Assemble a Mac inference/engine lifecycle harness from production sources."""
from pathlib import Path
import sys

root = Path(__file__).resolve().parents[1]
native = root / 'native/ios/Auspice'
engine = (native / 'Engines.swift').read_text().replace(
    'Bundle.main.url(forResource: "lazyoracle-engines", withExtension: "js")',
    'Optional(URL(fileURLWithPath: CommandLine.arguments[4]))')
source = engine + (native / 'Models.swift').read_text()
source += (native / 'VisionCapture.swift').read_text().split('func visionError')[0]
source += (root / 'native/macos/MacVision.swift').read_text()
source += (root / 'tools/macos-vision-test.swift').read_text()
Path(sys.argv[1]).write_text(source)
