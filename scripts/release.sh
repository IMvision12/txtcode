#!/usr/bin/env bash
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info()  { echo -e "${GREEN}[INFO]${NC} $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

if [ -n "$(git status --porcelain)" ]; then
  error "Working directory is not clean. Commit or stash your changes first."
fi

CURRENT_VERSION=$(node -p "require('./package.json').version" 2>/dev/null || node.exe -p "require('./package.json').version")
info "Current version: ${CURRENT_VERSION}"

echo ""
echo "Select version bump type:"
echo "  1) patch  (bug fixes)          — e.g. 0.1.0 → 0.1.1"
echo "  2) minor  (new features)       — e.g. 0.1.0 → 0.2.0"
echo "  3) major  (breaking changes)   — e.g. 0.1.0 → 1.0.0"
echo ""
read -rp "Enter choice [1/2/3]: " CHOICE

case $CHOICE in
  1) BUMP="patch" ;;
  2) BUMP="minor" ;;
  3) BUMP="major" ;;
  *) error "Invalid choice. Exiting." ;;
esac

info "Bumping ${BUMP} version..."
NEW_VERSION=$(npm version "$BUMP" -m "release: %s")
info "New version: ${NEW_VERSION}"

read -rp "Push ${NEW_VERSION} to trigger release? [y/N]: " CONFIRM
if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
  warn "Aborting. Undoing version bump..."
  git tag -d "${NEW_VERSION}"
  git reset --hard HEAD~1
  exit 1
fi

info "Pushing to GitHub..."
git push origin main
git push origin "${NEW_VERSION}"

echo ""
info "Tag ${NEW_VERSION} pushed!"
info "GitHub Actions will now automatically:"
info "  1. Run tests"
info "  2. Publish to npm"
info "  3. Create a GitHub Release"
echo ""
info "Monitor progress at: https://github.com/IMvision12/txtcode/actions"
