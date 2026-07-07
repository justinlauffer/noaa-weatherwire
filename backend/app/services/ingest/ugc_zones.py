import json
import re
from functools import lru_cache
from importlib import resources
from typing import TypedDict

import httpx

US_STATES: dict[str, str] = {
    "AL": "Alabama",
    "AK": "Alaska",
    "AZ": "Arizona",
    "AR": "Arkansas",
    "CA": "California",
    "CO": "Colorado",
    "CT": "Connecticut",
    "DE": "Delaware",
    "DC": "District of Columbia",
    "FL": "Florida",
    "GA": "Georgia",
    "HI": "Hawaii",
    "ID": "Idaho",
    "IL": "Illinois",
    "IN": "Indiana",
    "IA": "Iowa",
    "KS": "Kansas",
    "KY": "Kentucky",
    "LA": "Louisiana",
    "ME": "Maine",
    "MD": "Maryland",
    "MA": "Massachusetts",
    "MI": "Michigan",
    "MN": "Minnesota",
    "MS": "Mississippi",
    "MO": "Missouri",
    "MT": "Montana",
    "NE": "Nebraska",
    "NV": "Nevada",
    "NH": "New Hampshire",
    "NJ": "New Jersey",
    "NM": "New Mexico",
    "NY": "New York",
    "NC": "North Carolina",
    "ND": "North Dakota",
    "OH": "Ohio",
    "OK": "Oklahoma",
    "OR": "Oregon",
    "PA": "Pennsylvania",
    "PR": "Puerto Rico",
    "RI": "Rhode Island",
    "SC": "South Carolina",
    "SD": "South Dakota",
    "TN": "Tennessee",
    "TX": "Texas",
    "UT": "Utah",
    "VT": "Vermont",
    "VA": "Virginia",
    "WA": "Washington",
    "WV": "West Virginia",
    "WI": "Wisconsin",
    "WY": "Wyoming",
    "GU": "Guam",
    "VI": "U.S. Virgin Islands",
    "AS": "American Samoa",
    "MP": "Northern Mariana Islands",
}

UGC_CODE_RE = re.compile(r"^([A-Z]{2})([CZ])[0-9]{3}$")
NWS_USER_AGENT = "WeatherWire/0.1 (https://github.com/studio-tech/noaa-weatherwire)"


class UgcZoneInfo(TypedDict):
    code: str
    name: str
    state: str | None


@lru_cache(maxsize=1)
def _load_static_zones() -> dict[str, dict[str, str | None]]:
    path = resources.files(__package__).joinpath("nws_ugc_zones.json")
    if not path.is_file():
        return {}
    return json.loads(path.read_text(encoding="utf-8"))


@lru_cache(maxsize=4096)
def _fetch_zone_from_api(code: str) -> UgcZoneInfo | None:
    zone_type = "county" if code[2:3] == "C" else "forecast"
    url = f"https://api.weather.gov/zones/{zone_type}/{code}"
    try:
        with httpx.Client(timeout=5.0, headers={"User-Agent": NWS_USER_AGENT}) as client:
            response = client.get(url)
            if response.status_code != 200:
                return None
            props = response.json().get("properties", {})
            name = props.get("name")
            if not name:
                return None
            return UgcZoneInfo(code=code, name=name, state=props.get("state"))
    except httpx.HTTPError:
        return None


def _fallback_zone_name(code: str) -> UgcZoneInfo:
    match = UGC_CODE_RE.match(code)
    if match:
        state = match.group(1)
        zone_kind = "County" if match.group(2) == "C" else "Zone"
        state_name = US_STATES.get(state, state)
        return UgcZoneInfo(code=code, name=f"{state_name} {zone_kind} {code[3:]}", state=state)
    return UgcZoneInfo(code=code, name=code, state=code[:2] if len(code) >= 2 else None)


def lookup_ugc_zone(code: str) -> UgcZoneInfo:
    normalized = code.strip().upper().split(">")[0]
    if not normalized:
        return UgcZoneInfo(code=code, name=code, state=None)

    static = _load_static_zones()
    if normalized in static:
        entry = static[normalized]
        return UgcZoneInfo(
            code=normalized,
            name=str(entry.get("name", normalized)),
            state=entry.get("state"),
        )

    fetched = _fetch_zone_from_api(normalized)
    if fetched:
        return fetched

    return _fallback_zone_name(normalized)


def lookup_ugc_zones(codes: list[str]) -> list[UgcZoneInfo]:
    seen: set[str] = set()
    results: list[UgcZoneInfo] = []
    for code in codes:
        normalized = code.strip().upper().split(">")[0]
        if not normalized or normalized in seen:
            continue
        seen.add(normalized)
        results.append(lookup_ugc_zone(normalized))
    return results


def enrich_ugc_metadata(metadata: dict | None) -> dict | None:
    if not metadata:
        return metadata
    codes = metadata.get("ugc_codes", [])
    if codes:
        metadata = {**metadata, "ugc_zones": lookup_ugc_zones(codes)}
    return metadata
