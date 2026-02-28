#!/usr/bin/env pwsh
$ErrorActionPreference = "Stop"

function Write-Info($msg) { Write-Host "[INFO] $msg" -ForegroundColor Green }
function Write-Warn($msg) { Write-Host "[WARN] $msg" -ForegroundColor Yellow }
function Write-Error($msg) { Write-Host "[ERROR] $msg" -ForegroundColor Red; exit 1 }

# Check if working directory is clean
$status = git status --porcelain
if ($status) {
    Write-Error "Working directory is not clean. Commit or stash your changes first."
}

# Get current version
$packageJson = Get-Content "package.json" -Raw | ConvertFrom-Json
$currentVersion = $packageJson.version
Write-Info "Current version: $currentVersion"

Write-Host ""
Write-Host "Select version bump type:"
Write-Host "  1) patch  (bug fixes)          - e.g. 0.1.0 -> 0.1.1"
Write-Host "  2) minor  (new features)       - e.g. 0.1.0 -> 0.2.0"
Write-Host "  3) major  (breaking changes)   - e.g. 0.1.0 -> 1.0.0"
Write-Host ""
$choice = Read-Host "Enter choice [1/2/3]"

$bump = switch ($choice) {
    "1" { "patch" }
    "2" { "minor" }
    "3" { "major" }
    default { Write-Error "Invalid choice. Exiting." }
}

Write-Info "Bumping $bump version..."
$newVersion = npm version $bump -m "release: %s"
Write-Info "New version: $newVersion"

$confirm = Read-Host "Push $newVersion to trigger release? [y/N]"
if ($confirm -notmatch "^[Yy]$") {
    Write-Warn "Aborting. Undoing version bump..."
    git tag -d $newVersion
    git reset --hard HEAD~1
    exit 1
}

Write-Info "Pushing to GitHub..."
git push origin main
git push origin $newVersion

Write-Host ""
Write-Info "Tag $newVersion pushed!"
Write-Info "GitHub Actions will now automatically:"
Write-Info "  1. Run tests"
Write-Info "  2. Publish to npm"
Write-Info "  3. Create a GitHub Release"
Write-Host ""
Write-Info "Monitor progress at: https://github.com/IMvision12/txtcode/actions"
