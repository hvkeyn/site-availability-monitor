# Публикация на GitHub: gh repo create или git push (если репозиторий уже создан в браузере)
# Запуск: powershell -ExecutionPolicy Bypass -File scripts\push-github.ps1

$ErrorActionPreference = "Stop"
$RepoUrl = "https://github.com/hvkeyn/site-availability-monitor"
$RepoName = "site-availability-monitor"

Set-Location (Split-Path $PSScriptRoot -Parent)

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    Write-Error "Установите GitHub CLI: https://cli.github.com/"
}

# Сброс прокси (частая причина таймаута 192.168.137.1:443)
foreach ($name in @("HTTP_PROXY", "HTTPS_PROXY", "ALL_PROXY", "http_proxy", "https_proxy", "all_proxy", "GIT_HTTP_PROXY", "GIT_HTTPS_PROXY")) {
    Remove-Item "Env:$name" -ErrorAction SilentlyContinue
}
$env:NO_PROXY = "github.com,api.github.com,*.githubusercontent.com"

git config --local http.proxy ""
git config --local https.proxy ""
git branch -M main 2>$null

function Push-Origin {
    git push -u origin main
}

$hasRemote = $false
try {
    git remote get-url origin 2>$null | Out-Null
    $hasRemote = $true
} catch {}

if ($hasRemote) {
    Push-Origin
} else {
    Write-Host "Создаю репозиторий через gh..."
    try {
        gh repo create $RepoName `
            --public `
            --source=. `
            --remote=origin `
            --push `
            --description "Monitor dostupnosti saytov (PHP + JS)"
    } catch {
        Write-Host ""
        Write-Host "gh не смог подключиться к GitHub (часто из-за VPN/прокси)." -ForegroundColor Yellow
        Write-Host "Вариант без gh API:" -ForegroundColor Yellow
        Write-Host "  1. Откройте https://github.com/new" -ForegroundColor Yellow
        Write-Host "  2. Имя: $RepoName, Public, без README" -ForegroundColor Yellow
        Write-Host "  3. Затем выполните:" -ForegroundColor Yellow
        Write-Host "     git remote add origin $RepoUrl.git" -ForegroundColor Cyan
        Write-Host "     git push -u origin main" -ForegroundColor Cyan
        throw
    }
}

Write-Host ""
Write-Host ("Gotovo: " + $RepoUrl) -ForegroundColor Green
