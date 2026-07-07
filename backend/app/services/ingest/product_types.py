import json
from functools import lru_cache
from importlib import resources
from typing import Literal

ProductClass = Literal[
    "warning",
    "watch",
    "advisory",
    "statement",
    "forecast",
    "discussion",
    "marine",
    "climate",
    "admin",
    "alert",
    "other",
]

MARINE_CATEGORY_CODES = frozenset(
    {
        "HSF",
        "CWF",
        "OFF",
        "OML",
        "GLF",
        "MRF",
        "MWW",
        "MWS",
        "MIA",
        "MAF",
        "CPF",
        "FSS",
        "FWC",
        "FWO",
    }
)
ALERT_CATEGORY_CODES = frozenset(
    {
        "TOR",
        "SVR",
        "FFW",
        "FLW",
        "BZW",
        "HUW",
        "EWW",
        "SRW",
        "MAW",
        "DSW",
        "AVW",
        "EQW",
        "CDW",
        "CEM",
        "CAE",
        "EVI",
        "SPW",
        "HMW",
        "WSW",
        "NPW",
        "RFW",
        "FWW",
        "FRW",
        "ISW",
        "TSW",
        "SSW",
        "SUW",
        "VOW",
        "HWW",
        "LWY",
        "CFW",
        "GLW",
        "SCY",
        "TRA",
        "TSA",
        "SSA",
        "FFA",
        "WSA",
        "AQA",
        "BLU",
    }
)

VTEC_PHENOMENA = {
    "AF": "Ashfall",
    "AS": "Air Stagnation",
    "AV": "Avalanche",
    "BH": "Beach Hazard",
    "BS": "Blowing Snow",
    "BW": "Brisk Wind",
    "CF": "Coastal Flood",
    "CW": "Cold Weather",
    "DF": "Debris Flow",
    "DS": "Dust Storm",
    "DU": "Blowing Dust",
    "EC": "Extreme Cold",
    "EH": "Excessive Heat",
    "EW": "Extreme Wind",
    "FA": "Flood",
    "FF": "Flash Flood",
    "FG": "Dense Fog",
    "FL": "Flood",
    "FR": "Frost",
    "FW": "Fire Weather",
    "FZ": "Freeze",
    "GL": "Gale",
    "HF": "Hurricane Force Wind",
    "HI": "Inland Hurricane",
    "HS": "Heavy Snow",
    "HT": "Heat",
    "HU": "Hurricane",
    "HW": "High Wind",
    "HY": "Hydrologic",
    "IP": "Sleet",
    "IS": "Ice Storm",
    "LB": "Lake Effect Snow and Blowing Snow",
    "LE": "Lake Effect Snow",
    "LO": "Low Water",
    "LS": "Lakeshore Flood",
    "LW": "Lake Wind",
    "MA": "Marine",
    "MF": "Marine Dense Fog",
    "MH": "Marine Ashfall",
    "MS": "Marine Dense Smoke",
    "RB": "Rip Current",
    "RP": "Rip Current",
    "SC": "Small Craft",
    "SE": "Hazardous Seas",
    "SI": "Small Craft for Winds",
    "SM": "Dense Smoke",
    "SQ": "Snow Squall",
    "SR": "Storm",
    "SS": "Storm Surge",
    "SU": "High Surf",
    "SV": "Severe Thunderstorm",
    "SW": "Small Craft for Hazardous Seas",
    "TI": "Inland Tropical Storm",
    "TO": "Tornado",
    "TR": "Tropical Storm",
    "TS": "Tsunami",
    "TY": "Typhoon",
    "UP": "Heavy Freezing Spray",
    "VO": "Volcano",
    "WC": "Wind Chill",
    "WI": "Wind",
    "WS": "Winter Storm",
    "WW": "Winter Weather",
    "XH": "Extreme Heat",
    "ZF": "Freezing Fog",
    "ZR": "Freezing Rain",
}

VTEC_SIGNIFICANCE = {
    "W": "Warning",
    "A": "Watch",
    "Y": "Advisory",
    "S": "Statement",
    "F": "Forecast",
    "O": "Outlook",
    "N": "Synopsis",
}

VTEC_ACTIONS = {
    "NEW": "New",
    "CON": "Continue",
    "CAN": "Cancel",
    "EXP": "Expire",
    "EXT": "Extend",
    "UPG": "Upgrade",
    "COR": "Correction",
    "ROU": "Routine",
}


@lru_cache(maxsize=1)
def _load_product_types() -> dict[str, str]:
    raw = resources.files(__package__).joinpath("nws_product_types.json").read_text(encoding="utf-8")
    return json.loads(raw)


def lookup_product_type(category_code: str) -> str | None:
    if not category_code:
        return None
    return _load_product_types().get(category_code.upper())


def parse_awips_pil(awips_id: str) -> tuple[str, str | None]:
    """Split AWIPS PIL into 3-char category (NNN) and optional designator."""
    pil = (awips_id or "").strip().upper()
    if not pil or pil == "UNKNWN":
        return "UNK", None
    if len(pil) <= 3:
        return pil[:3], None
    return pil[:3], pil[3:] or None


def classify_product(
    *,
    category_code: str,
    type_name: str | None,
    vtec_significance: str | None = None,
) -> ProductClass:
    category = category_code.upper()
    if category in MARINE_CATEGORY_CODES:
        return "marine"

    if vtec_significance == "W":
        return "warning"
    if vtec_significance == "A":
        return "watch"
    if vtec_significance == "Y":
        return "advisory"
    if vtec_significance == "S":
        return "statement"

    name = (type_name or "").lower()
    if "warning" in name:
        return "warning"
    if "watch" in name:
        return "watch"
    if "advisory" in name:
        return "advisory"
    if "statement" in name:
        return "statement"
    if "discussion" in name:
        return "discussion"
    if any(token in name for token in ("forecast", "outlook", "guidance")):
        return "forecast"
    if any(token in name for token in ("marine", "seas", "coastal waters", "offshore")):
        return "marine"
    if any(token in name for token in ("climatolog", "climate")):
        return "climate"
    if any(token in name for token in ("administrative", "admin")):
        return "admin"
    if category_code in {"CAP", "ADA", "ADM", "ADR"}:
        return "alert"

    if category in ALERT_CATEGORY_CODES:
        if category.endswith("W") or category in {"TOR", "SVR", "FFW", "FLW", "TSW", "HUW"}:
            return "warning"
        if category.endswith("A") or category in {"FFA", "WSA", "AVA"}:
            return "watch"

    return "other"


def is_alert_product(product_class: ProductClass, category_code: str) -> bool:
    if product_class in {"warning", "watch", "alert"}:
        return True
    return category_code.upper() in ALERT_CATEGORY_CODES


def list_product_types() -> list[dict[str, str]]:
    return [
        {"code": code, "name": name}
        for code, name in sorted(_load_product_types().items())
    ]
