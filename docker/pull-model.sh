#!/usr/bin/env bash
# Pulls the configured Ollama model. Run after `docker compose up -d`.
set -euo pipefail

MODEL="${OLLAMA_MODEL:-phi3:3.8b-mini-4k-instruct-q4_K_M}"
OLLAMA_URL="${OLLAMA_BASE_URL:-http://localhost:11434}"

echo "Pulling model: $MODEL"
echo "Ollama URL: $OLLAMA_URL"

# Wait for Ollama to be ready
until curl -sf "$OLLAMA_URL/api/tags" > /dev/null 2>&1; do
  echo "Waiting for Ollama…"
  sleep 3
done

curl -sf -X POST "$OLLAMA_URL/api/pull" \
  -H "Content-Type: application/json" \
  -d "{\"name\": \"$MODEL\"}" | jq -r '.status // .'

echo "Done — model $MODEL is ready."
