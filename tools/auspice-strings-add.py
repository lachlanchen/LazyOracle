"""Append a batch of interface strings to the catalogue, in language order."""
import json, pathlib, sys

CATALOGUE = pathlib.Path(__file__).resolve().parent.parent / "i18n/app/strings.json"


def add(batch: dict) -> None:
    data = json.loads(CATALOGUE.read_text())
    langs = data["languages"]
    for key, values in batch.items():
        if len(values) != len(langs):
            raise SystemExit(f"{key}: {len(values)} values for {len(langs)} languages")
        data["strings"][key] = dict(zip(langs, values))
    CATALOGUE.write_text(json.dumps(data, ensure_ascii=False, indent=1) + "\n")
    print(f"catalogue now holds {len(data['strings'])} keys")
