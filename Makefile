.PHONY: help build start stop status clean

help:
	@echo "BenchX - Docker-based LLM Benchmarking"
	@echo ""
	@echo "Available commands:"
	@echo "  make build    - Build all Docker images"
	@echo "  make start    - Start all containers"
	@echo "  make stop     - Stop all containers"
	@echo "  make status   - Check container status"
	@echo "  make clean    - Remove all containers and images"
	@echo "  make logs     - Show container logs"
	@echo ""
	@echo "Or use the CLI:"
	@echo "  benchx build"
	@echo "  benchx run --config benchmark.json"

build:
	@echo "Building Docker images..."
	cd docker && docker-compose build

start:
	@echo "Starting containers..."
	cd docker && docker-compose up -d

stop:
	@echo "Stopping containers..."
	cd docker && docker-compose stop

status:
	@echo "Container status:"
	cd docker && docker-compose ps

clean:
	@echo "Removing containers and images..."
	cd docker && docker-compose down --rmi all

logs:
	@echo "Container logs:"
	cd docker && docker-compose logs -f
