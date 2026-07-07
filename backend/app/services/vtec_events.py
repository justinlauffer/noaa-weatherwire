from uuid import UUID

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.vtec_event import VtecEventDetail, VtecEventMessage, VtecEventSummary
from app.services.ingest.forecast_offices import lookup_office_name
from app.services.ingest.product_types import VTEC_ACTIONS, VTEC_PHENOMENA, VTEC_SIGNIFICANCE
from app.services.ingest.ugc_zones import enrich_ugc_metadata

TERMINAL_ACTIONS = frozenset({"EXP", "CAN"})

_VTEC_OFFICE = "jsonb_extract_path_text(vtec_row.vtec, 'office')"
_VTEC_PHENOMENA = "jsonb_extract_path_text(vtec_row.vtec, 'phenomena')"
_VTEC_SIGNIFICANCE = "jsonb_extract_path_text(vtec_row.vtec, 'significance')"
_VTEC_ETN = "jsonb_extract_path_text(vtec_row.vtec, 'etn')"
_VTEC_ACTION = "jsonb_extract_path_text(vtec_row.vtec, 'action')"
_EVENT_KEY = (
    f"({_VTEC_OFFICE} || '.' || {_VTEC_PHENOMENA} || '.' || "
    f"{_VTEC_SIGNIFICANCE} || '.' || {_VTEC_ETN})"
)
_PARTITION = f"{_VTEC_OFFICE}, {_VTEC_PHENOMENA}, {_VTEC_SIGNIFICANCE}, {_VTEC_ETN}"


def build_event_key(office: str, phenomena: str, significance: str, etn: str) -> str:
    return f"{office}.{phenomena}.{significance}.{etn}"


def parse_event_key(event_key: str) -> tuple[str, str, str, str]:
    office, phenomena, significance, etn = event_key.split(".", 3)
    return office, phenomena, significance, etn


def _event_labels(phenomena: str, significance: str) -> tuple[str, str]:
    return (
        VTEC_PHENOMENA.get(phenomena, phenomena),
        VTEC_SIGNIFICANCE.get(significance, significance),
    )


def _vtec_event_sql(*, where_clause: str, active_filter: str, paging: str = "") -> str:
    return f"""
        SELECT
            event_key,
            latest_action,
            phenomena,
            significance,
            office,
            etn,
            weather_message_id,
            issued_at,
            summary,
            message_count
        FROM (
            SELECT
                {_EVENT_KEY} AS event_key,
                {_VTEC_ACTION} AS latest_action,
                {_VTEC_PHENOMENA} AS phenomena,
                {_VTEC_SIGNIFICANCE} AS significance,
                {_VTEC_OFFICE} AS office,
                {_VTEC_ETN} AS etn,
                wm.weather_message_id,
                wm.issued_at,
                wm.summary,
                COUNT(*) OVER (PARTITION BY {_PARTITION}) AS message_count,
                ROW_NUMBER() OVER (
                    PARTITION BY {_PARTITION}
                    ORDER BY wm.issued_at DESC
                ) AS rn
            FROM weather_message wm
            CROSS JOIN LATERAL jsonb_array_elements(wm.parsed_metadata->'vtec') AS vtec_row(vtec)
            WHERE {where_clause}
        ) ranked
        WHERE rn = 1
        {active_filter}
        ORDER BY issued_at DESC
        {paging}
    """


def _vtec_event_count_sql(*, where_clause: str, active_filter: str) -> str:
    return f"""
        SELECT COUNT(*) FROM (
            SELECT event_key, latest_action
            FROM (
                SELECT
                    {_EVENT_KEY} AS event_key,
                    {_VTEC_ACTION} AS latest_action,
                    ROW_NUMBER() OVER (
                        PARTITION BY {_PARTITION}
                        ORDER BY wm.issued_at DESC
                    ) AS rn
                FROM weather_message wm
                CROSS JOIN LATERAL jsonb_array_elements(wm.parsed_metadata->'vtec') AS vtec_row(vtec)
                WHERE {where_clause}
            ) ranked
            WHERE rn = 1
            {active_filter}
        ) events
    """


async def list_vtec_events(
    session: AsyncSession,
    *,
    page: int = 1,
    page_size: int = 50,
    active_only: bool = False,
    office: str | None = None,
) -> tuple[list[VtecEventSummary], int]:
    page = max(page, 1)
    page_size = min(max(page_size, 1), 200)
    offset = (page - 1) * page_size

    filters = ["wm.parsed_metadata IS NOT NULL", "jsonb_array_length(wm.parsed_metadata->'vtec') > 0"]
    params: dict = {"limit": page_size, "offset": offset}

    if office:
        filters.append(f"{_VTEC_OFFICE} = :filter_office")
        params["filter_office"] = office.upper()

    where_clause = " AND ".join(filters)
    active_filter = "AND latest_action NOT IN ('EXP', 'CAN')" if active_only else ""

    total = (await session.execute(text(_vtec_event_count_sql(where_clause=where_clause, active_filter=active_filter)), params)).scalar_one()
    rows = (
        await session.execute(
            text(_vtec_event_sql(where_clause=where_clause, active_filter=active_filter, paging="LIMIT :limit OFFSET :offset")),
            params,
        )
    ).all()

    items: list[VtecEventSummary] = []
    for row in rows:
        phenomena_label, significance_label = _event_labels(row.phenomena, row.significance)
        items.append(
            VtecEventSummary(
                event_key=row.event_key,
                office=row.office,
                office_name=lookup_office_name(row.office),
                phenomena=row.phenomena,
                phenomena_label=phenomena_label,
                significance=row.significance,
                significance_label=significance_label,
                etn=row.etn,
                latest_action=row.latest_action,
                latest_action_label=VTEC_ACTIONS.get(row.latest_action, row.latest_action),
                is_active=row.latest_action not in TERMINAL_ACTIONS,
                message_count=row.message_count,
                latest_message_id=row.weather_message_id,
                latest_issued_at=row.issued_at,
                latest_summary=row.summary,
            )
        )

    return items, total


async def get_vtec_event(session: AsyncSession, event_key: str) -> VtecEventDetail | None:
    office, phenomena, significance, etn = parse_event_key(event_key)

    messages_sql = text(
        f"""
        SELECT
            wm.weather_message_id,
            wm.issued_at,
            wm.summary,
            wm.issuing_office,
            wm.is_alert,
            wm.parsed_metadata,
            vtec_row.vtec AS vtec
        FROM weather_message wm
        CROSS JOIN LATERAL jsonb_array_elements(wm.parsed_metadata->'vtec') AS vtec_row(vtec)
        WHERE {_VTEC_OFFICE} = :office
          AND {_VTEC_PHENOMENA} = :phenomena
          AND {_VTEC_SIGNIFICANCE} = :significance
          AND {_VTEC_ETN} = :etn
        ORDER BY wm.issued_at ASC
        """
    )
    rows = (
        await session.execute(
            messages_sql,
            {"office": office, "phenomena": phenomena, "significance": significance, "etn": etn},
        )
    ).all()

    if not rows:
        return None

    phenomena_label, significance_label = _event_labels(phenomena, significance)
    timeline: list[VtecEventMessage] = []
    ugc_codes: list[str] = []

    for row in rows:
        vtec = row.vtec if isinstance(row.vtec, dict) else dict(row.vtec)
        metadata = enrich_ugc_metadata(row.parsed_metadata)
        if metadata and metadata.get("ugc_codes"):
            for code in metadata["ugc_codes"]:
                if code not in ugc_codes:
                    ugc_codes.append(code)
        timeline.append(
            VtecEventMessage(
                weather_message_id=row.weather_message_id,
                issued_at=row.issued_at,
                summary=row.summary,
                issuing_office=row.issuing_office,
                issuing_office_name=lookup_office_name(row.issuing_office),
                action=vtec.get("action", ""),
                action_label=vtec.get("action_label") or VTEC_ACTIONS.get(vtec.get("action", ""), ""),
                start_time=vtec.get("start_time"),
                end_time=vtec.get("end_time"),
                vtec_raw=vtec.get("raw", ""),
            )
        )

    latest_action = timeline[-1].action
    metadata = {"ugc_codes": ugc_codes}
    enrich_ugc_metadata(metadata)

    return VtecEventDetail(
        event_key=event_key,
        office=office,
        office_name=lookup_office_name(office),
        phenomena=phenomena,
        phenomena_label=phenomena_label,
        significance=significance,
        significance_label=significance_label,
        etn=etn,
        latest_action=latest_action,
        latest_action_label=VTEC_ACTIONS.get(latest_action, latest_action),
        is_active=latest_action not in TERMINAL_ACTIONS,
        message_count=len(timeline),
        ugc_zones=metadata.get("ugc_zones", []),
        timeline=timeline,
    )
