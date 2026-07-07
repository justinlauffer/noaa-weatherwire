import re
from dataclasses import dataclass, field

from app.services.ingest.product_types import (
    VTEC_ACTIONS,
    VTEC_PHENOMENA,
    VTEC_SIGNIFICANCE,
    classify_product,
    is_alert_product,
    lookup_product_type,
    parse_awips_pil,
)

CONTROL_CHARS_RE = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f]")
VTEC_RE = re.compile(
    r"/([A-Z])\.([A-Z]{3})\.([A-Z]{4})\.([A-Z]{2})\.([A-Z])\.(\d{4})\.(\d{6}T\d{4}Z)-(\d{6}T\d{4}Z)/"
)
UGC_LINE_RE = re.compile(r"^UGC-(.+)$", re.MULTILINE)
CAP_VTEC_RE = re.compile(
    r"<valueName>\s*VTEC\s*</valueName>\s*<value>\s*(/[^<]+/)\s*</value>",
    re.IGNORECASE,
)
CAP_UGC_RE = re.compile(
    r"<valueName>\s*UGC\s*</valueName>\s*<value>\s*([^<]+)\s*</value>",
    re.IGNORECASE,
)
AWIPS_BODY_LINE_RE = re.compile(r"^([A-Z]{3}[A-Z0-9]{0,3})\s*$", re.MULTILINE)


@dataclass
class ParsedVtec:
    product_classification: str
    action: str
    office: str
    phenomena: str
    significance: str
    etn: str
    start_time: str
    end_time: str
    raw: str

    @property
    def action_label(self) -> str:
        return VTEC_ACTIONS.get(self.action, self.action)

    @property
    def phenomena_label(self) -> str:
        return VTEC_PHENOMENA.get(self.phenomena, self.phenomena)

    @property
    def significance_label(self) -> str:
        return VTEC_SIGNIFICANCE.get(self.significance, self.significance)

    def as_dict(self) -> dict[str, str]:
        return {
            "raw": self.raw,
            "product_classification": self.product_classification,
            "action": self.action,
            "action_label": self.action_label,
            "office": self.office,
            "phenomena": self.phenomena,
            "phenomena_label": self.phenomena_label,
            "significance": self.significance,
            "significance_label": self.significance_label,
            "etn": self.etn,
            "start_time": self.start_time,
            "end_time": self.end_time,
        }


@dataclass
class ParsedBodyMetadata:
    product_category: str
    product_designator: str | None
    product_type_name: str | None
    product_class: str
    is_alert: bool
    vtec: list[ParsedVtec] = field(default_factory=list)
    ugc_codes: list[str] = field(default_factory=list)
    format: str = "text"

    def as_dict(self) -> dict:
        return {
            "product_category": self.product_category,
            "product_designator": self.product_designator,
            "product_type_name": self.product_type_name,
            "product_class": self.product_class,
            "is_alert": self.is_alert,
            "format": self.format,
            "vtec": [entry.as_dict() for entry in self.vtec],
            "ugc_codes": self.ugc_codes,
        }


def normalize_body(raw_body: str) -> str:
    return CONTROL_CHARS_RE.sub("", raw_body or "")


def _parse_vtec_token(token: str) -> ParsedVtec | None:
    match = VTEC_RE.search(token)
    if not match:
        return None
    return ParsedVtec(
        product_classification=match.group(1),
        action=match.group(2),
        office=match.group(3),
        phenomena=match.group(4),
        significance=match.group(5),
        etn=match.group(6),
        start_time=match.group(7),
        end_time=match.group(8),
        raw=match.group(0),
    )


def extract_vtec(body: str) -> list[ParsedVtec]:
    entries: list[ParsedVtec] = []
    seen: set[str] = set()
    for match in VTEC_RE.finditer(body):
        raw = match.group(0)
        if raw in seen:
            continue
        seen.add(raw)
        parsed = _parse_vtec_token(raw)
        if parsed:
            entries.append(parsed)
    return entries


def extract_cap_vtec(body: str) -> list[ParsedVtec]:
    entries: list[ParsedVtec] = []
    seen: set[str] = set()
    for match in CAP_VTEC_RE.finditer(body):
        token = match.group(1).strip()
        if token in seen:
            continue
        seen.add(token)
        parsed = _parse_vtec_token(token)
        if parsed:
            entries.append(parsed)
    return entries


def extract_ugc_codes(body: str) -> list[str]:
    codes: list[str] = []
    seen: set[str] = set()

    for match in UGC_LINE_RE.finditer(body):
        for token in re.split(r"[-\s]+", match.group(1).strip()):
            code = token.strip().upper()
            if code and code not in seen:
                seen.add(code)
                codes.append(code)

    for match in CAP_UGC_RE.finditer(body):
        code = match.group(1).strip().upper()
        if code and code not in seen:
            seen.add(code)
            codes.append(code)

    return codes


def _infer_awips_from_body(body: str, wmo_heading: str | None) -> str | None:
    lines = [line.strip() for line in body.splitlines() if line.strip()]
    if not lines:
        return None

    start_index = 0
    if wmo_heading:
        for index, line in enumerate(lines):
            if line == wmo_heading:
                start_index = index + 1
                break

    for line in lines[start_index : start_index + 4]:
        if AWIPS_BODY_LINE_RE.fullmatch(line) and line != "NONE":
            return line
    return None


def parse_message_body(
    *,
    raw_body: str,
    awips_id: str,
    wmo_heading: str | None = None,
) -> ParsedBodyMetadata:
    body = normalize_body(raw_body)
    is_cap = "<alert" in body.lower() or "<cap:" in body.lower()

    category, designator = parse_awips_pil(awips_id)
    if category == "UNK":
        inferred = _infer_awips_from_body(body, wmo_heading)
        if inferred:
            category, designator = parse_awips_pil(inferred)

    vtec = extract_cap_vtec(body) if is_cap else extract_vtec(body)
    ugc_codes = extract_ugc_codes(body)

    type_name = lookup_product_type(category)
    primary_significance = vtec[0].significance if vtec else None
    product_class = classify_product(
        category_code=category,
        type_name=type_name,
        vtec_significance=primary_significance,
    )

    return ParsedBodyMetadata(
        product_category=category,
        product_designator=designator,
        product_type_name=type_name,
        product_class=product_class,
        is_alert=is_alert_product(product_class, category),
        vtec=vtec,
        ugc_codes=ugc_codes,
        format="cap" if is_cap else "text",
    )
