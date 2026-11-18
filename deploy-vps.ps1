# Script de Automacao de Deploy VPS Renacred
# Executa git push e aciona o script de build/restart na VPS via SSH

$VPS_USER = "root"
$VPS_HOST = "209.50.245.165"
$REPO_URL = "https://github.com/sistemawebrenavist/renacred.git"

Clear-Host
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "       INICIANDO PROCESSO DE DEPLOY NA VPS RENACRED    " -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan

# 1. Verificar se ha alteracoes nao commitadas
$gitStatus = git status --porcelain
if ($gitStatus) {
    Write-Host "`n[!] ATENCAO: Ha arquivos modificados que ainda nao foram commitados:" -ForegroundColor Yellow
    git status -s
    $confirm = Read-Host "`nDeseja prosseguir mesmo assim? (S/N)"
    if ($confirm -ne 'S' -and $confirm -ne 's') {
        Write-Host "Deploy cancelado pelo usuario." -ForegroundColor Red
        exit 1
    }
}

# 2. Garantir push para a branch main
Write-Host "`n[1/3] Enviando alteracoes para o repositorio remoto (git push origin main)..." -ForegroundColor Yellow
git push origin main
if ($LASTEXITCODE -ne 0) {
    Write-Host "Falha ao enviar alteracoes para o Git." -ForegroundColor Red
    exit 1
}
Write-Host "Codigo sincronizado com sucesso no GitHub!" -ForegroundColor Green

# 3. Executar o script remoto na VPS
Write-Host "`n[2/3] Conectando via SSH a VPS ($VPS_HOST) e executando deploy..." -ForegroundColor Yellow
$remoteCommand = "chmod +x /opt/renacred/deploy.sh; /opt/renacred/deploy.sh"
ssh -o StrictHostKeyChecking=no "$VPS_USER@$VPS_HOST" $remoteCommand

if ($LASTEXITCODE -ne 0) {
    Write-Host "`nOcorreu um erro durante a execucao do deploy na VPS." -ForegroundColor Red
    exit 1
}

# 4. Verificacao Externa da API em Producao
Write-Host "`n[3/3] Realizando validacao externa de producao (https://api.renacred.com.br)..." -ForegroundColor Yellow

try {
    $health = Invoke-RestMethod -Uri "https://api.renacred.com.br/health" -Method Get -TimeoutSec 10
    Write-Host "API Externa Online: $($health | ConvertTo-Json -Compress)" -ForegroundColor Green
} catch {
    Write-Host "Aviso: Nao foi possivel obter resposta imediata de https://api.renacred.com.br/health ($($_.Exception.Message))" -ForegroundColor DarkYellow
}

Write-Host "`n======================================================" -ForegroundColor Cyan
Write-Host "           DEPLOY NA VPS CONCLUIDO COM SUCESSO!       " -ForegroundColor Green
Write-Host "======================================================" -ForegroundColor Cyan
