#!/usr/bin/env bash
# Build the Kochbuch image locally (linux/amd64 for TrueNAS x86) and export
# it as a gzipped tar so it can be loaded on the NAS via `docker load`.
#
# Usage:
#   ./scripts/build-and-save.sh [version]
#
# Default version is read from package.json.
set -euo pipefail

cd "$(dirname "$0")/.."

VERSION="${1:-$(node -p "require('./package.json').version")}"
TAG="kochbuch:local-${VERSION}"
OUT="kochbuch-image-${VERSION}.tar.gz"

echo "▶ Building $TAG (linux/amd64) …"
docker buildx build \
  --platform linux/amd64 \
  --tag "$TAG" \
  --load \
  .

echo ""
echo "▶ Exporting → $OUT …"
docker save "$TAG" | gzip > "$OUT"

SIZE=$(du -h "$OUT" | cut -f1)
echo ""
echo "✓ Done."
echo "  Image: $TAG"
echo "  File:  $OUT  ($SIZE)"
echo ""
echo "Next steps on the NAS:"
echo "  scp $OUT root@<nas-ip>:/tmp/"
echo "  ssh root@<nas-ip> 'gunzip -c /tmp/$OUT | docker load && rm /tmp/$OUT'"
