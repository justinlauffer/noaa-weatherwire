import re

CAP_POLYGON_RE = re.compile(r"<polygon>([^<]+)</polygon>", re.IGNORECASE)


def parse_cap_polygons(raw_body: str) -> list[list[list[list[float]]]]:
    """Return GeoJSON Polygon coordinates (list of rings) for each CAP polygon."""
    polygons: list[list[list[list[float]]]] = []
    for match in CAP_POLYGON_RE.finditer(raw_body):
        ring: list[list[float]] = []
        for token in match.group(1).split():
            if "," not in token:
                continue
            lat_str, lon_str = token.split(",", 1)
            try:
                lat = float(lat_str)
                lon = float(lon_str)
            except ValueError:
                continue
            ring.append([lon, lat])
        if len(ring) >= 3:
            if ring[0] != ring[-1]:
                ring.append(ring[0])
            polygons.append([ring])
    return polygons
