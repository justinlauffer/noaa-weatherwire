# NOAA WeatherWire

A self-hosted archive and viewer for [NOAA Weather Wire Service (NWWS) Open Interface](https://www.weather.gov/nwws/) products. WeatherWire connects over XMPP, parses WMO headings and product bodies (VTEC, UGC, CAP), stores every message in PostgreSQL, and serves a modern web UI with live updates.

## Features

- **Live ingest** — Subscribes to NWWS-OI via [`nwws-oi-receiver`](https://pypi.org/project/nwws-oi-receiver/) with STARTTLS
- **Permanent archive** — All ingested messages are kept indefinitely in PostgreSQL (no TTL or purge jobs)
- **Product parsing** — AWIPS product types, VTEC events, UGC zones, and CAP polygon extraction
- **Alerts dashboard** — Filter warnings, watches, and advisories with VTEC action badges
- **Map view** — Leaflet map of recent alert polygons and zones
- **VTEC event tracking** — Group products by event with timeline and detail pages
- **Live feed** — Server-Sent Events (SSE) with polling fallback
- **Reference catalog** — Browse NWS product codes and forecast office names

## Architecture

```
NWWS-OI (XMPP)  →  ingest worker  →  PostgreSQL  ←  FastAPI  ←  Next.js web
                         │                              │
                         └──────── pg_notify ─────────────┘
                                        (SSE stream)
```

| Service | Role |
|---------|------|
| **ingest** | Python worker; connects to NWWS, parses products, writes to the database |
| **api** | FastAPI REST API and SSE stream |
| **web** | Next.js App Router viewer |
| **db** | PostgreSQL 16 |
| **migrate** | One-shot Alembic migration container |

NWWS credentials allow **only one active session per account**. Run a single ingest container or process.

## Tech stack

| Layer | Stack |
|-------|-------|
| Backend | Python 3.12, FastAPI, SQLAlchemy (async), Alembic, asyncpg |
| Frontend | Next.js 16, React 19, Tailwind CSS 4, Leaflet |
| Database | PostgreSQL 16 |
| Ingest | `nwws-oi-receiver`, slixmpp (STARTTLS) |

## Prerequisites

- Docker and Docker Compose
- NWWS-OI credentials ([request form](https://www.weather.gov/nwws/nwws_oi_request))

## Quick start

1. Copy the environment file and add your credentials:

```bash
cp .env.example .env
# Edit .env — set NWWS_USER and NWWS_PASSWORD
```

2. Start the stack:

```bash
docker compose up --build -d
```

3. Run migrations (included automatically on first start via the `migrate` service):

```bash
docker compose exec migrate alembic upgrade head
```

4. Open the app:

| URL | Description |
|-----|-------------|
| http://localhost:3000 | Web UI |
| http://localhost:8000/docs | OpenAPI / Swagger |
| http://localhost:8000/health | Health check |

## Web UI

| Route | Description |
|-------|-------------|
| `/` | Message feed with filters and live SSE updates |
| `/alerts` | Warnings, watches, and advisories only |
| `/map` | Map of recent alert polygons and zones |
| `/events` | VTEC events grouped by phenomenon and office |
| `/events/[key]` | Single VTEC event timeline |
| `/messages/[id]` | Full message detail (VTEC, UGC, raw body) |
| `/reference` | Product type and forecast office catalog |

## Configuration

Environment variables (see `.env.example`):

| Variable | Default | Description |
|----------|---------|-------------|
| `NWWS_USER` | — | NWWS-OI username (required for ingest) |
| `NWWS_PASSWORD` | — | NWWS-OI password (required for ingest) |
| `NWWS_HISTORY` | `25` | Messages replayed from NWWS on reconnect (catch-up only) |
| `DATABASE_URL` | local Docker URL | PostgreSQL connection string |
| `POSTGRES_*` | `weatherwire` | Database credentials for the `db` service |
| `CORS_ORIGINS` | `http://localhost:3000` | Comma-separated allowed origins |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | API URL for browser requests |
| `INGEST_ONLY` | `false` | Set to `true` for ingest-only worker mode |

## Data retention

WeatherWire is designed as a **permanent archive**:

- Every successfully ingested message is stored in PostgreSQL with no automatic deletion
- Ingest deduplicates on `nwws_id` (`INSERT … ON CONFLICT DO NOTHING`) but never prunes old rows
- API and UI time filters (e.g. map `hours=24`) affect **display only**, not storage

**Gaps to be aware of:**

- Products missed while ingest is offline are not backfilled from NOAA
- On reconnect, only the last `NWWS_HISTORY` messages are replayed from NWWS
- `docker compose down -v` deletes the `postgres_data` volume and wipes the archive
- Plan disk capacity and regular backups for long-term retention

## API reference

Base path: `/api/v1`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | API, database, and ingest status |
| GET | `/messages` | Paginated message list (filters: office, awips_id, product_class, alerts_only, since, until, q) |
| GET | `/messages/{id}` | Message detail |
| GET | `/offices` | Distinct issuing offices |
| GET | `/product-types` | NWS product type catalog |
| GET | `/stats` | Archive and ingest statistics |
| GET | `/ingest-status` | Ingest connection status |
| GET | `/events` | VTEC events (filters: active_only, office) |
| GET | `/events/{key}` | VTEC event detail and timeline |
| GET | `/reference` | Product and office reference catalog |
| GET | `/map/features` | GeoJSON features for map (filters: hours, product_class, alerts_only) |
| GET | `/stream/messages` | SSE stream of new messages |

Interactive docs: http://localhost:8000/docs

## Local development

### Backend

```bash
cd backend
python3.12 -m venv .venv
source .venv/bin/activate
pip install -e .
export DATABASE_URL=postgresql+asyncpg://weatherwire:weatherwire@localhost:5432/weatherwire
alembic upgrade head
uvicorn app.main:app --reload
```

Ingest worker (separate terminal, same venv):

```bash
export NWWS_USER=your_username
export NWWS_PASSWORD=your_password
python -m app.ingest_main
```

### Frontend

```bash
cd frontend
npm install
export NEXT_PUBLIC_API_URL=http://localhost:8000
npm run dev
```

### Backfill parsed metadata

Re-parse existing rows after schema or parser changes:

```bash
docker compose exec api python -m app.scripts.backfill_parsed_metadata
```

### Tests

```bash
cd backend
source .venv/bin/activate
pip install pytest
pytest
```

## Project structure

```
noaa-weatherwire/
├── backend/
│   ├── app/
│   │   ├── ingest_main.py          # Ingest entrypoint
│   │   ├── routers/                # FastAPI routes
│   │   ├── services/
│   │   │   ├── ingest/             # NWWS client, parser, repository
│   │   │   ├── vtec_events.py      # VTEC event grouping
│   │   │   ├── map_features.py     # GeoJSON for map
│   │   │   └── stream.py           # SSE via pg_notify
│   │   └── scripts/                # Maintenance scripts
│   ├── alembic/                    # Database migrations
│   └── tests/
├── frontend/
│   └── src/
│       ├── app/                    # Next.js pages
│       ├── components/             # UI components
│       └── hooks/                  # SSE hook
├── docker-compose.yml
└── .env.example
```

## Production deployment

The Docker Compose layout maps cleanly to AWS ECS:

| Compose service | Production target |
|-----------------|-------------------|
| `ingest` | Fargate service, `desiredCount: 1` |
| `api` | Fargate behind an ALB |
| `web` | Fargate or static hosting (S3 + CloudFront) |
| `db` | Amazon RDS PostgreSQL with automated backups |

Store `NWWS_USER` and `NWWS_PASSWORD` in AWS Secrets Manager. Enable RDS point-in-time recovery for archive durability.

## License

MIT
