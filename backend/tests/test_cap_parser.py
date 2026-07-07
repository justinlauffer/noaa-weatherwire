from app.services.ingest.cap_parser import parse_cap_polygons


def test_parse_cap_polygon() -> None:
    body = """
    <polygon>43.49,-103.68 43.68,-103.55 43.54,-103.3 43.44,-103.59 43.49,-103.68</polygon>
    """
    polygons = parse_cap_polygons(body)
    assert len(polygons) == 1
    ring = polygons[0][0]
    assert ring[0] == [-103.68, 43.49]
    assert ring[-1] == ring[0]
