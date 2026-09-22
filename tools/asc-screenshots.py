"""Replace an App Store screenshot set with the images in store/screenshots/.

App Store Connect takes a screenshot in three steps: reserve a slot and be
told where to PUT the bytes, upload them, then commit with the file's MD5.
This does that for every image in a folder, after deleting whatever the set
held before, so the listing always matches what `tools/store-screenshots.py`
just rendered.

    python3 tools/asc-screenshots.py <appStoreVersionLocalization id> <display type> <folder>

For example:

    python3 tools/asc-screenshots.py 19a6d6e3-... IPHONE_67 store/screenshots/ios-6.7-en

Authentication reuses the App Store Connect key already on this machine; the
key itself is never printed.
"""
import hashlib
import json
import pathlib
import sys
import time
import urllib.error
import urllib.request

import jwt

KEY_ID = "6SSXT8QU6W"
ISSUER = "741adba6-ef89-4e36-8a69-ff43ebfa9ecc"
KEY_PATH = pathlib.Path("/home/lachlan/.config/echomind/private/AuthKey_6SSXT8QU6W.p8")
BASE = "https://api.appstoreconnect.apple.com"


def token() -> str:
    now = int(time.time())
    return jwt.encode(
        {"iss": ISSUER, "iat": now, "exp": now + 900, "aud": "appstoreconnect-v1"},
        KEY_PATH.read_text(),
        algorithm="ES256",
        headers={"kid": KEY_ID},
    )


def call(method: str, path: str, body: dict | None = None) -> dict:
    data = json.dumps(body).encode() if body is not None else None
    request = urllib.request.Request(
        BASE + path, data=data, method=method,
        headers={"Authorization": "Bearer " + token(), "Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(request, timeout=90) as response:
            raw = response.read()
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as error:
        detail = error.read().decode()[:600]
        raise SystemExit(f"{method} {path} failed: {error.code}\n{detail}")


def put_bytes(operation: dict, payload: bytes) -> None:
    """Follow one upload operation exactly as the API describes it."""
    headers = {header["name"]: header["value"] for header in operation.get("requestHeaders", [])}
    offset, length = operation["offset"], operation["length"]
    request = urllib.request.Request(operation["url"], data=payload[offset:offset + length], method=operation["method"], headers=headers)
    with urllib.request.urlopen(request, timeout=300) as response:
        if response.status not in (200, 201, 204):
            raise SystemExit(f"upload returned {response.status}")


def main() -> None:
    if len(sys.argv) != 4:
        raise SystemExit(__doc__)
    localization_id, display_type, folder = sys.argv[1], sys.argv[2], pathlib.Path(sys.argv[3])
    images = sorted(folder.glob("*.png"))
    if not images:
        raise SystemExit(f"no images in {folder}")

    sets = call("GET", f"/v1/appStoreVersionLocalizations/{localization_id}/appScreenshotSets?limit=20")
    existing = next((s for s in sets["data"] if s["attributes"]["screenshotDisplayType"] == display_type), None)
    if existing:
        current = call("GET", f"/v1/appScreenshotSets/{existing['id']}/appScreenshots?limit=20")
        for shot in current.get("data", []):
            call("DELETE", f"/v1/appScreenshots/{shot['id']}")
        print(f"cleared {len(current.get('data', []))} old screenshot(s)")
        set_id = existing["id"]
    else:
        created = call("POST", "/v1/appScreenshotSets", {
            "data": {"type": "appScreenshotSets", "attributes": {"screenshotDisplayType": display_type},
                     "relationships": {"appStoreVersionLocalization": {"data": {"type": "appStoreVersionLocalizations", "id": localization_id}}}}
        })
        set_id = created["data"]["id"]
        print("created a new set")

    for index, image in enumerate(images, start=1):
        payload = image.read_bytes()
        reserved = call("POST", "/v1/appScreenshots", {
            "data": {"type": "appScreenshots",
                     "attributes": {"fileName": image.name, "fileSize": len(payload)},
                     "relationships": {"appScreenshotSet": {"data": {"type": "appScreenshotSets", "id": set_id}}}}
        })
        shot_id = reserved["data"]["id"]
        for operation in reserved["data"]["attributes"]["uploadOperations"]:
            put_bytes(operation, payload)
        call("PATCH", f"/v1/appScreenshots/{shot_id}", {
            "data": {"type": "appScreenshots", "id": shot_id,
                     "attributes": {"uploaded": True, "sourceFileChecksum": hashlib.md5(payload).hexdigest()}}
        })
        print(f"  {index:2d}. {image.name}")

    print(f"{len(images)} screenshot(s) in {display_type}")


main()
