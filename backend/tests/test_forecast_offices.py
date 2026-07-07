from app.services.ingest.forecast_offices import lookup_office_name


def test_lookup_conus_wfo() -> None:
    assert lookup_office_name("KLWX") == "NWS Forecast Office Baltimore/Washington D.C."
    assert lookup_office_name("LWX") == "NWS Forecast Office Baltimore/Washington D.C."


def test_lookup_national_center() -> None:
    assert lookup_office_name("KWNS") == "Storm Prediction Center (SPC)"
    assert lookup_office_name("KNHC") == "National Hurricane Center"


def test_lookup_pacific_wfo() -> None:
    assert lookup_office_name("PHFO") == "NWS Forecast Office Honolulu, HI"


def test_lookup_unknown_office() -> None:
    assert lookup_office_name("ZZZZ") is None
