def test_fallback_ugc_zone() -> None:
    from app.services.ingest.ugc_zones import lookup_ugc_zone

    zone = lookup_ugc_zone("MDC013")
    assert zone["code"] == "MDC013"
    assert zone["name"]
    assert zone["state"] == "MD"


def test_enrich_ugc_metadata() -> None:
    from app.services.ingest.ugc_zones import enrich_ugc_metadata

    metadata = enrich_ugc_metadata({"ugc_codes": ["MDC013"], "vtec": []})
    assert metadata is not None
    assert metadata["ugc_zones"][0]["code"] == "MDC013"
