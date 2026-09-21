# ==============================================================================
# Renacred - Script de Deploy Automático na VPS (PowerShell)
# Execução: ./deploy-vps.ps1 ou npm run deploy:vps
# ==============================================================================

$ErrorActionPreference = "Stop"

Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "       RENACRED - DISPARADOR DE DEPLOY NA VPS         " -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan

$VPS_HOST = "209.50.245.165"
$VPS_USER = "root"

# 1. Verificar status do Git local
Write-Host "`n[1/4] Verificando alterações locais no Git..." -ForegroundColor Yellow
$gitStatus = git status --porcelain

if ($gitStatus) {
    Write-Host "Detectadas alterações locais não comitadas:" -ForegroundColor DarkYellow
    git status -s
    $confirm = Read-Host "Deseja comitar e enviar tudo para o branch main agora? (S/n)"
    if ($confirm -ne 'n' -and $confirm -ne 'N') {
        $msg = Read-Host "Mensagem do commit (pressione Enter para mensagem padrão)"
        if (-not $msg) { $msg = "chore: atualizações antes do deploy na vps" }
        git add .
        git commit -m $msg
        Write-Host "✓ Commit realizado com sucesso." -ForegroundColor Green
    }
}

# 2. Enviar alterações para o GitHub
Write-Host "`n[2/4] Enviando código para o GitHub (origin main)..." -ForegroundColor Yellow
git push origin main
Write-Host "✓ Código sincronizado com o GitHub." -ForegroundColor Green

# 3. Disparar script de deploy na VPS via SSH
Write-Host "`n[3/4] Conectando à VPS ($VPS_USER@$VPS_HOST) e executando deploy.sh..." -ForegroundColor Yellow

$remoteCommand = "chmod +x /opt/renacred/deploy.sh && /opt/renacred/deploy.sh"
ssh -o StrictHostKeyChecking=no "$VPS_USER@$VPS_HOST" $remoteCommand

if ($LASTEXITCODE -ne 0) {
    Write-Host "`n✗ Ocorreu um erro durante a execução do deploy na VPS." -ForegroundColor Red
    exit 1
}

# 4. Verificação Externa da API em Produção
Write-Host "`n[4/4] Realizando validação externa de produção (https://api.renacred.com.br)..." -ForegroundColor Yellow

try {
    $health = Invoke-RestMethod -Uri "https://api.renacred.com.br/health" -Method Get -TimeoutSec 10
    Write-Host "✓ API Externa Online: $($health | ConvertTo-Json -Compress)" -ForegroundColor Green
} catch {
    Write-Host "! Aviso: Não foi possível obter resposta imediata de https://api.renacred.com.br/health ($($_.Exception.Message))" -ForegroundColor DarkYellow
}

Write-Host "`n======================================================" -ForegroundColor Cyan
Write-Host "           DEPLOY NA VPS CONCLUÍDO COM SUCESSO!       " -ForegroundColor Green
Write-Host "======================================================" -ForegroundColor Cyan
