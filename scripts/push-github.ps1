# Создать репозиторий на GitHub и отправить код (нужны gh auth и интернет)
# Запуск: powershell -ExecutionPolicy Bypass -File scripts/push-github.ps1

$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    Write-Error 'Установите GitHub CLI: https://cli.github.com/'
}

$env:HTTP_PROXY = ''
$env:HTTPS_PROXY = ''
$env:ALL_PROXY = ''

git branch -M main 2>$null

if (git remote get-url origin 2>$null) {
    git push -u origin main
} else {
    gh repo create site-availability-monitor `
        --public `
        --source=. `
        --remote=origin `
        --push `
        --description 'Монитор доступности популярных сайтов (PHP + JS)'
}

Write-Host ''
Write-Host 'Готово: https://github.com/hvkeyn/site-availability-monitor' -ForegroundColor Green
