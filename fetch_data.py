#!/usr/bin/env python3
"""Fetch real healthcare facilities in Lucknow from OpenStreetMap Overpass."""
from __future__ import annotations

import json
import sys
import time
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen

BBOX = (26.70, 80.75, 26.95, 81.15)  # south, west, north, east
ENDPOINTS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
]
OUTPUT = Path(__file__).with_name("lucknow_hospitals.json")

QUERY = f"""
[out:json][timeout:120];
(
  nwr["amenity"~"^(hospital|clinic|doctors|pharmacy)$"]({BBOX[0]},{BBOX[1]},{BBOX[2]},{BBOX[3]});
  nwr["healthcare"]({BBOX[0]},{BBOX[1]},{BBOX[2]},{BBOX[3]});
);
out center tags;
"""


def fetch(endpoint: str) -> dict:
    request = Request(
        endpoint + "?" + urlencode({"data": QUERY}),
        headers={"User-Agent": "MediAlert/1.0 (public OSM data research)"},
    )
    with urlopen(request, timeout=150) as response:
        return json.loads(response.read().decode("utf-8"))


def clean(element: dict) -> dict | None:
    tags = element.get("tags", {})
    name = (tags.get("name") or tags.get("official_name") or "").strip()
    center = element.get("center", {})
    lat = element.get("lat", center.get("lat"))
    lon = element.get("lon", center.get("lon"))
    if not name or lat is None or lon is None:
        return None

    address_parts = [
        tags.get(key)
        for key in ("addr:housenumber", "addr:street", "addr:suburb", "addr:city", "addr:postcode")
        if tags.get(key)
    ]
    address = ", ".join(address_parts) or tags.get("addr:full") or "Address not listed in OpenStreetMap"
    amenity = tags.get("healthcare") or tags.get("amenity") or "healthcare"
    contact = next(
        (tags.get(key) for key in ("contact:phone", "phone", "contact:mobile", "email", "contact:website", "website") if tags.get(key)),
        None,
    )
    return {
        "id": f"osm-{element['type']}-{element['id']}",
        "name": name,
        "latitude": round(float(lat), 7),
        "longitude": round(float(lon), 7),
        "address": address,
        "amenity_type": amenity.replace("_", " ").title(),
        "contact": contact,
        "source": "OpenStreetMap",
        "osm_url": f"https://www.openstreetmap.org/{element['type']}/{element['id']}",
    }


def main() -> int:
    payload = None
    last_error = None
    for endpoint in ENDPOINTS:
        try:
            print(f"Fetching live OSM data from {endpoint} …", flush=True)
            payload = fetch(endpoint)
            break
        except Exception as error:  # try the next public mirror
            last_error = error
            print(f"Endpoint failed: {error}", file=sys.stderr, flush=True)
            time.sleep(1)
    if payload is None:
        raise RuntimeError(f"All Overpass endpoints failed: {last_error}")

    records, seen = [], set()
    for element in payload.get("elements", []):
        record = clean(element)
        if record and record["id"] not in seen:
            seen.add(record["id"])
            records.append(record)
    records.sort(key=lambda item: (item["amenity_type"], item["name"].lower()))
    OUTPUT.write_text(json.dumps(records, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Total records fetched: {len(records)}")
    print(f"JSON file size: {OUTPUT.stat().st_size:,} bytes")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())