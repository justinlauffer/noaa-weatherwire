from app.services.ingest.body_parser import parse_message_body
from app.services.ingest.product_types import lookup_product_type, parse_awips_pil


def test_parse_awips_pil() -> None:
    category, designator = parse_awips_pil("FFALWX")
    assert category == "FFA"
    assert designator == "LWX"


def test_lookup_product_type() -> None:
    assert lookup_product_type("FFA") == "Flash Flood Watch"
    assert lookup_product_type("HSF") == "High Seas Forecast"


def test_parse_vtec_from_text_warning() -> None:
    body = """
WGUS61 KLWX 070322
FFALWX

/O.CAN.KLWX.FA.A.0005.000000T0000Z-260707T0400Z/
/O.EXT.KLWX.FA.A.0005.000000T0000Z-260707T0600Z/

UGC-MDC013-029-033-510-VAZ025>053-070400-
"""
    metadata = parse_message_body(raw_body=body, awips_id="FFALWX")
    assert metadata.product_category == "FFA"
    assert metadata.product_type_name == "Flash Flood Watch"
    assert metadata.product_class == "watch"
    assert metadata.is_alert is True
    assert len(metadata.vtec) == 2
    assert metadata.vtec[0].action == "CAN"
    assert metadata.vtec[0].phenomena == "FA"
    assert metadata.vtec[0].significance == "A"
    assert "MDC013" in metadata.ugc_codes


def test_parse_high_seas_forecast() -> None:
    body = """
351
FZPN40 PHFO 070317
HSFNP

HIGH SEAS FORECAST
"""
    metadata = parse_message_body(raw_body=body, awips_id="HSFNP")
    assert metadata.product_category == "HSF"
    assert metadata.product_designator == "NP"
    assert metadata.product_type_name == "High Seas Forecast"
    assert metadata.product_class == "marine"
    assert metadata.is_alert is False
    assert metadata.vtec == []


def test_parse_cap_vtec() -> None:
    body = """
<alert>
  <info>
    <parameter>
      <valueName>VTEC</valueName>
      <value>/O.EXP.KILM.SV.W.0032.000000T0000Z-260707T0315Z/</value>
    </parameter>
    <area>
      <parameter>
        <valueName>UGC</valueName>
        <value>NCZ106</value>
      </parameter>
    </area>
  </info>
</alert>
"""
    metadata = parse_message_body(raw_body=body, awips_id="CAPILM")
    assert metadata.format == "cap"
    assert len(metadata.vtec) == 1
    assert metadata.vtec[0].action == "EXP"
    assert metadata.vtec[0].phenomena == "SV"
    assert metadata.vtec[0].significance == "W"
    assert metadata.ugc_codes == ["NCZ106"]
    assert metadata.product_class == "warning"
