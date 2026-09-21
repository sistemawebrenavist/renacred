#!/usr/bin/env bash
# ==============================================================================
# Renacred - Script de Deploy Automático na VPS (Bash)
# Execução: ./deploy-vps.sh
# ==============================================================================

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

VPS_HOST="209.50.245.165"
VPS_USER="root"

echo -e "${BLUE}======================================================${NC}"
echo -e "${BLUE}       RENACRED - DISPARADOR DE DEPLOY NA VPS         ${NC}"
echo -e "${BLUE}======================================================${NC}"

# 1. Verificar status Git local
echo -e "\n${YELLOW}[1/4] Verificando alterações locais no Git...${NC}"
if [ -n "$(git status --porcelain)" ]; then
    echo -e "${YELLOW}Detectadas alterações locais não comitadas:${NC}"
    git status -s
    read -p "Deseja comitar e enviar tudo para o branch main agora? (S/n): " CONFIRM
    if [[ "$CONFIRM" =~ ^[Nn]$ ]]; then
        echo -e "${RED}Deploy cancelado.${NC}"
        exit 1
    fi
    read -p "Mensagem do commit (pressione Enter para padrão): " COMMIT_MSG
    if [ -z "$COMMIT_MSG" ]; then
        COMMIT_MSG="chore: atualizações antes do deploy na vps"
    fi
    git add .
    git commit -m "$COMMIT_MSG"
fi

# 2. Enviar para o GitHub
echo -e "\n${YELLOW}[2/4] Enviando código para o GitHub (origin main)...${NC}"
git push origin main
echo -e "${GREEN}✓ Código sincronizado com o GitHub.${NC}"

# 3. Executar deploy na VPS
echo -e "\n${YELLOW}[3/4] Conectando à VPS ($VPS_USER@$VPS_HOST) e executando deploy.sh...${NC}"
ssh -o StrictHostKeyChecking=no "$VPS_USER@$VPS_HOST" "chmod +x /opt/renacred/deploy.sh && /opt/renacred/deploy.sh"

# 4. Validação Externa
echo -e "\n${YELLOW}[4/4] Realizando validação externa de produção (https://api.renacred.com.br)...${NC}"
HEALTH=$(curl -s --max-time 10 https://api.renacred.com.br/health || echo "FAIL")
if [[ "$HEALTH" == *"online"* ]]; then
    echo -e "${GREEN}✓ API Externa Online: $HEALTH${NC}"
else
    echo -e "${YELLOW}! Aviso: Não foi possível obter resposta imediata de https://api.renacred.com.br/health${NC}"
fi

echo -e "\n${BLUE}======================================================${NC}"
echo -e "${GREEN}           DEPLOY NA VPS CONCLUÍDO COM SUCESSO!       ${NC}"
echo -e "${BLUE}======================================================${NC}"
