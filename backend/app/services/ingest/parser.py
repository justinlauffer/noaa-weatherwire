import re
import xml.etree.ElementTree as ET
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any

from nwws_receiver import NoaaPortMessage

from app.services.ingest.body_parser import ParsedBodyMetadata, parse_message_body

WMO_HEADING_RE = re.compile(
    r"^([A-Z]{4}\d{2})\s+([A-Z]{4})\s+(\d{6})\s*$",
    re.MULTILINE,
)


@dataclass
class ParsedNwwsPayload:
    nwws_id: str
    issuing_office: str
    wmo_product_id: str
    awips_id: str
    issued_at: datetime
    summary: str
    raw_body: str
    wmo_heading: str | None
    ingest_pid: int | None
    sequence_num: int | None
    nwws_delay_at: datetime | None
    product_category: str = "UNK"
    product_designator: str | None = None
    product_type_name: str | None = None
    product_class: str = "other"
    is_alert: bool = False
    parsed_metadata: dict[str, Any] = field(default_factory=dict)


def _apply_body_metadata(payload: ParsedNwwsPayload, metadata: ParsedBodyMetadata) -> None:
    payload.product_category = metadata.product_category
    payload.product_designator = metadata.product_designator
    payload.product_type_name = metadata.product_type_name
    payload.product_class = metadata.product_class
    payload.is_alert = metadata.is_alert
    payload.parsed_metadata = metadata.as_dict()


def parse_nwws_id(nwws_id: str) -> tuple[int | None, int | None]:
    if "." not in nwws_id:
        return None, None
    prefix, seq_str = nwws_id.rsplit(".", 1)
    try:
        sequence_num = int(seq_str)
    except ValueError:
        return None, None
    ingest_pid = hash(prefix) & 0x7FFFFFFF
    return ingest_pid, sequence_num


def parse_wmo_heading(raw_body: str) -> str | None:
    lines = [line.strip() for line in raw_body.strip().splitlines() if line.strip()]
    for line in lines:
        if WMO_HEADING_RE.match(line):
            return line
    return None


def parse_nwws_attributes_from_xml(raw_xml: str) -> dict[str, str]:
    try:
        root = ET.fromstring(raw_xml)
    except ET.ParseError:
        return {}

    for elem in root.iter():
        if elem.tag.endswith("x") and elem.get("xmlns") == "nwws-oi":
            return {
                "nwws_id": elem.get("id", ""),
                "issuing_office": elem.get("cccc", ""),
                "wmo_product_id": elem.get("ttaaii", ""),
                "awips_id": elem.get("awipsid", ""),
                "issue": elem.get("issue", ""),
            }

    return {}


def from_noaaport_message(message: NoaaPortMessage) -> ParsedNwwsPayload | None:
    if not message.id:
        return None

    raw_body = message.noaaport or ""
    ingest_pid, sequence_num = parse_nwws_id(message.id)
    awips_id = message.awipsid if message.awipsid != "NONE" else "UNKNWN"
    wmo_heading = parse_wmo_heading(raw_body)
    metadata = parse_message_body(raw_body=raw_body, awips_id=awips_id, wmo_heading=wmo_heading)

    payload = ParsedNwwsPayload(
        nwws_id=message.id,
        issuing_office=(message.cccc or "UNKN")[:4],
        wmo_product_id=(message.ttaaii or "UNKNWN")[:6],
        awips_id=awips_id[:6],
        issued_at=message.issue,
        summary=message.subject or f"{message.cccc} issues {awips_id}",
        raw_body=raw_body,
        wmo_heading=wmo_heading,
        ingest_pid=ingest_pid,
        sequence_num=sequence_num,
        nwws_delay_at=message.delay_stamp,
    )
    _apply_body_metadata(payload, metadata)
    return payload


def build_parsed_payload(
    *,
    raw_xml: str,
    subject: str,
    content: str,
    source: str,
    awipsid: str,
    timestamp: datetime | None,
) -> ParsedNwwsPayload | None:
    attrs = parse_nwws_attributes_from_xml(raw_xml)
    nwws_id = attrs.get("nwws_id", "")
    if not nwws_id:
        return None

    issuing_office = attrs.get("issuing_office") or source or "UNKN"
    wmo_product_id = attrs.get("wmo_product_id") or "UNKNWN"
    awips_id = attrs.get("awips_id") or awipsid or "UNKNWN"
    issued_at = _parse_issue_time(attrs.get("issue", ""), timestamp)
    raw_body = content or ""
    ingest_pid, sequence_num = parse_nwws_id(nwws_id)
    wmo_heading = parse_wmo_heading(raw_body)
    metadata = parse_message_body(raw_body=raw_body, awips_id=awips_id, wmo_heading=wmo_heading)

    payload = ParsedNwwsPayload(
        nwws_id=nwws_id,
        issuing_office=issuing_office[:4],
        wmo_product_id=wmo_product_id[:6],
        awips_id=awips_id[:6],
        issued_at=issued_at,
        summary=subject or f"{issuing_office} issues {awips_id}",
        raw_body=raw_body,
        wmo_heading=wmo_heading,
        ingest_pid=ingest_pid,
        sequence_num=sequence_num,
        nwws_delay_at=_parse_delay_from_xml(raw_xml),
    )
    _apply_body_metadata(payload, metadata)
    return payload


def _parse_issue_time(issue: str, fallback: datetime | None = None) -> datetime:
    if issue:
        try:
            return datetime.fromisoformat(issue.replace("Z", "+00:00"))
        except ValueError:
            pass
    return fallback or datetime.now(timezone.utc)


def _parse_delay_from_xml(raw_xml: str) -> datetime | None:
    try:
        root = ET.fromstring(raw_xml)
    except ET.ParseError:
        return None

    for elem in root.iter():
        if elem.tag.endswith("delay"):
            stamp = elem.get("stamp")
            if stamp:
                return datetime.fromisoformat(stamp.replace("Z", "+00:00"))
    return None
