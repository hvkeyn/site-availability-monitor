# Только git push (репозиторий site-availability-monitor уже создан на github.com)
$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

foreach ($name in @("HTTP_PROXY", "HTTPS_PROXY", "ALL_PROXY", "http_proxy", "https_proxy", "all_proxy")) {
    Remove-Item "Env:$name" -ErrorAction SilentlyContinue
}

git config --local http.proxy ""
git config --local https.proxy ""
git branch -M main 2>$null

$remote = "https://github.com/hvkeyn/site-availability-monitor.git"
if (-not (git remote get-url origin 2>$null)) {
    git remote add origin $remote
}
git push -u origin main
Write-Host "Gotovo: https://github.com/hvkeyn/site-availability-monitor" -ForegroundColor Green
