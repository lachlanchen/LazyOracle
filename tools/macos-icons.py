#!/usr/bin/env python3
"""Produce the Mac icon sizes from LazyOracle's existing, owned app icon."""
from pathlib import Path
import json
from PIL import Image

root = Path(__file__).resolve().parents[1]
out = root / 'native/macos/Assets.xcassets/AppIcon.appiconset'
out.mkdir(parents=True, exist_ok=True)
source = Image.open(root / 'native/ios/Auspice/Assets.xcassets/LazyOracleIcon.appiconset/icon-1024.png')
images = []
for size in (16, 32, 128, 256, 512):
    for scale in (1, 2):
        name = f'icon-{size}@{scale}x.png'
        source.resize((size * scale, size * scale), Image.Resampling.LANCZOS).save(out / name)
        images.append(dict(idiom='mac', size=f'{size}x{size}', scale=f'{scale}x', filename=name))
(out / 'Contents.json').write_text(json.dumps(dict(images=images, info=dict(version=1, author='xcode')), indent=2) + '\n')
(out.parent / 'Contents.json').write_text('{"info":{"version":1,"author":"xcode"}}\n')
