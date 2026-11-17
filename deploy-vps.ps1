# Script de Automação de Deploy VPS Renacred
# Executa git push e aciona o script de build/restart na VPS via SSH

$VPS_USER = "root"
$VPS_HOST = "209.50.245.165"

Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "      INICIANDO DEPLOY EM PRODUÇÃO - RENACRED VPS     " -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan

# 1. Verificar se há alterações não comitadas
$gitStatus = git status --porcelain
if ($gitStatus) {
    Write-Host "`n! Atenção: Você possui alterações locais pendentes de commit:" -ForegroundColor Yellow
    git status -s
    $confirm = Read-Host "`nDeseja continuar o deploy apenas com o que já foi comitado? (s/n)"
    if ($confirm -ne 'n' -and $confirm -ne 'N') {
        Write-Host "Prosseguindo com o commit atual..." -ForegroundColor Gray
    } else {
        Write-Host "Deploy cancelado pelo usuário." -ForegroundColor Red
        exit 1
    }
}

# 2. Garantir push para a branch main
Write-Host "`n[1/3] Enviando alterações para o repositório remoto (git push origin main)..." -ForegroundColor Yellow
git push origin main
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Falha ao enviar alterações para o Git." -ForegroundColor Red
    exit 1
}
Write-Host "✓ Código sincronizado com sucesso no GitHub!" -ForegroundColor Green

# 3. Executar o script remoto na VPS
Write-Host "`n[2/3] Conectando via SSH à VPS ($VPS_HOST) e executando deploy..." -ForegroundColor Yellow
$remoteCommand = "chmod +x /opt/renacred/deploy.sh && /opt/renacred/deploy.sh"
ssh -o StrictHostKeyChecking=no "$VPS_USER@$VPS_HOST" $remoteCommand

if ($LASTEXITCODE -ne 0) {
    Write-Host "`n✗ Ocorreu um erro durante a execução do deploy na VPS." -ForegroundColor Red
    exit 1
}

# 4. Verificação Externa da API em Produção
Write-Host "`n[3/3] Realizando validação externa de produção (https://api.renacred.com.br)..." -ForegroundColor Yellow

try {
    $health = Invoke-RestMethod -Uri "https://api.renacred.com.br/health" -Method Get -TimeoutSec 10
    Write-Host "✓ API Externa Online: $($health | ConvertTo-Json -Compress)" -ForegroundColor Green
} catch {
    Write-Host "! Aviso: Não foi possível obter resposta imediata de https://api.renacred.com.br/health ($($_.Exception.Message))" -ForegroundColor DarkYellow
}

Write-Host "`n======================================================" -ForegroundColor Cyan
Write-Host "           DEPLOY NA VPS CONCLUÍDO COM SUCESSO!       " -ForegroundColor Green
Write-Host "======================================================" -ForegroundColor Cyan
