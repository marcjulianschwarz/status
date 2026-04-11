.PHONY: dev install

dev:
	mprocs --config mprocs.yaml

install:
	cd services/backend && uv sync
	cd services/frontend && pnpm install
