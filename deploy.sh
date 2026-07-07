#!/usr/bin/env bash
# ==============================================================================
# deploy.sh — simple, explicit deployment script
# Builds a Docker image, runs a health check, and swaps it in with minimal
# downtime. Intended as a readable starting point, not a full CI/CD system.
# ==============================================================================
set -euo pipefail  # exit on error, unset variable use, or failed pipe

APP_NAME="fullstack-project"
IMAGE_TAG="${APP_NAME}:$(date +%Y%m%d%H%M%S)"
CONTAINER_NAME="${APP_NAME}-running"
MAX_HEALTH_RETRIES=10

echo "==> Building image: ${IMAGE_TAG}"
docker build -t "${IMAGE_TAG}" .

echo "==> Starting new container for health check"
docker run -d --rm \
  --name "${CONTAINER_NAME}-candidate" \
  -p 3001:3000 \
  --env-file .env \
  "${IMAGE_TAG}"

echo "==> Waiting for candidate container to become healthy"
attempt=0
until curl -sf "http://localhost:3001/healthz" > /dev/null; do
  attempt=$((attempt + 1))
  if [ "${attempt}" -ge "${MAX_HEALTH_RETRIES}" ]; then
    echo "!! Health check failed after ${MAX_HEALTH_RETRIES} attempts. Rolling back."
    docker stop "${CONTAINER_NAME}-candidate" || true
    exit 1
  fi
  sleep 2
done
echo "==> Candidate is healthy"

echo "==> Stopping old container (if running)"
docker stop "${CONTAINER_NAME}" 2>/dev/null || true

echo "==> Promoting candidate to production port"
docker stop "${CONTAINER_NAME}-candidate"
docker run -d --rm \
  --name "${CONTAINER_NAME}" \
  -p 3000:3000 \
  --env-file .env \
  --restart unless-stopped \
  "${IMAGE_TAG}"

echo "==> Deployment complete. Running image: ${IMAGE_TAG}"

echo "==> Pruning old, unused images"
docker image prune -f
