.PHONY: dev

dev:
	uv run fastapi dev

test:
	docker compose -f docker-compose.test.yml down 2>/dev/null; docker compose -f docker-compose.test.yml up -d --wait
	uv run --extra test pytest; EXIT=$$?; docker compose -f docker-compose.test.yml down; exit $$EXIT
