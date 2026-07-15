.PHONY: help env up down build restart logs ps migrate test backfill \
	backend-install backend-test backend-api backend-ingest \
	frontend-install frontend-dev frontend-build frontend-lint \
	clean

COMPOSE ?= docker compose
BACKEND_VENV ?= backend/.venv
PYTHON ?= python3.12
DATABASE_URL_LOCAL ?= postgresql+asyncpg://weatherwire:weatherwire@localhost:5432/weatherwire

help: ## Show available targets
	@awk 'BEGIN {FS = ":.*##"; printf "Usage: make \033[36m<target>\033[0m\n\nTargets:\n"} \
		/^[a-zA-Z_-]+:.*?##/ { printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2 }' $(MAKEFILE_LIST)

env: ## Copy .env.example to .env if missing
	@if [ ! -f .env ]; then \
		cp .env.example .env; \
		echo "Created .env — set NWWS_USER and NWWS_PASSWORD"; \
	else \
		echo ".env already exists"; \
	fi

up: env ## Build and start the full stack
	$(COMPOSE) up --build -d

down: ## Stop containers (keeps volumes)
	$(COMPOSE) down

build: ## Build images without starting
	$(COMPOSE) build

restart: ## Restart all services
	$(COMPOSE) restart

logs: ## Follow container logs
	$(COMPOSE) logs -f

ps: ## Show running services
	$(COMPOSE) ps

migrate: ## Run Alembic migrations via compose
	$(COMPOSE) exec migrate alembic upgrade head || \
		$(COMPOSE) run --rm migrate alembic upgrade head

test: backend-test ## Run backend tests (alias)

backfill: ## Re-parse stored message metadata
	$(COMPOSE) exec api python -m app.scripts.backfill_parsed_metadata

# --- Local backend ------------------------------------------------------------

backend-install: ## Create venv and install backend package
	cd backend && $(PYTHON) -m venv .venv
	backend/.venv/bin/pip install -e .
	backend/.venv/bin/pip install pytest

backend-test: ## Run pytest in backend
	@if [ -x $(BACKEND_VENV)/bin/pytest ]; then \
		cd backend && .venv/bin/pytest; \
	else \
		cd backend && $(PYTHON) -m pytest; \
	fi

backend-api: ## Run API locally with reload (requires DB)
	cd backend && DATABASE_URL=$(DATABASE_URL_LOCAL) \
		.venv/bin/uvicorn app.main:app --reload

backend-ingest: ## Run ingest worker locally (requires NWWS_* env)
	cd backend && DATABASE_URL=$(DATABASE_URL_LOCAL) \
		.venv/bin/python -m app.ingest_main

# --- Local frontend -----------------------------------------------------------

frontend-install: ## Install frontend npm dependencies
	cd frontend && npm install

frontend-dev: ## Run Next.js dev server
	cd frontend && NEXT_PUBLIC_API_URL=http://localhost:8000 npm run dev

frontend-build: ## Production build of the frontend
	cd frontend && npm run build

frontend-lint: ## Lint the frontend
	cd frontend && npm run lint

# --- Cleanup ------------------------------------------------------------------

clean: ## Stop stack and remove containers + volumes (wipes DB)
	$(COMPOSE) down -v
