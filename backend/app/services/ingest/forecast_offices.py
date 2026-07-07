import json
from functools import lru_cache
from importlib import resources


@lru_cache(maxsize=1)
def _load_office_data() -> tuple[dict[str, str], dict[str, str]]:
    raw = resources.files(__package__).joinpath("nws_forecast_offices.json").read_text(encoding="utf-8")
    data = json.loads(raw)
    return data.get("wfo", {}), data.get("cccc", {})


def lookup_office_name(cccc: str | None) -> str | None:
    """Resolve a WMO CCCC or WFO id to a human-readable office name."""
    if not cccc:
        return None

    code = cccc.strip().upper()
    if not code:
        return None

    wfo_names, cccc_names = _load_office_data()
    if code in cccc_names:
        return cccc_names[code]

    if len(code) == 3 and code in wfo_names:
        return f"NWS Forecast Office {wfo_names[code]}"

    if len(code) == 4 and code.startswith("K"):
        wfo_id = code[1:]
        if wfo_id in wfo_names:
            return f"NWS Forecast Office {wfo_names[wfo_id]}"

    if len(code) == 4 and code.startswith(("P", "T")):
        wfo_id = code[1:]
        if wfo_id in wfo_names:
            return f"NWS Forecast Office {wfo_names[wfo_id]}"
        wfo_id = code[2:]
        if wfo_id in wfo_names:
            return f"NWS Forecast Office {wfo_names[wfo_id]}"

    return None


def list_known_offices() -> list[dict[str, str]]:
    wfo_names, cccc_names = _load_office_data()
    return [
        {"code": code, "name": name}
        for code, name in sorted(wfo_names.items(), key=lambda item: item[1])
    ]
