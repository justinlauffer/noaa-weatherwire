from datetime import datetime, timezone

from nwws_receiver import NoaaPortMessage

from app.services.ingest.parser import from_noaaport_message, parse_wmo_heading


def test_parse_wmo_heading() -> None:
    body = "987\nSRUS43 KLMK 040254\nRRMLMK\nProduct text"
    assert parse_wmo_heading(body) == "SRUS43 KLMK 040254"


def test_from_noaaport_message() -> None:
    message = NoaaPortMessage(
        subject="KLMK issues RRM valid 2022-02-04T02:54:00Z",
        noaaport="987\nSRUS43 KLMK 040254\nRRMLMK\nProduct text",
        id="14425.25117",
        issue=datetime(2022, 2, 4, 2, 54, tzinfo=timezone.utc),
        ttaaii="SRUS43",
        cccc="KLMK",
        awipsid="RRMLMK",
        delay_stamp=None,
    )
    payload = from_noaaport_message(message)
    assert payload is not None
    assert payload.nwws_id == "14425.25117"
    assert payload.sequence_num == 25117
    assert payload.ingest_pid == hash("14425") & 0x7FFFFFFF
    assert payload.wmo_heading == "SRUS43 KLMK 040254"
    assert payload.product_category == "RRM"
    assert payload.product_designator == "LMK"
    assert payload.product_type_name == "Miscellaneous Hydrologic Data"
