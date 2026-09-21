#!/usr/bin/env bash
# ==============================================================================
# Script Oficial de Deploy na VPS - Renacred API
# Executado na VPS em: /opt/renacred/deploy.sh
# ==============================================================================

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}======================================================${NC}"
echo -e "${BLUE}   RENACRED - INICIANDO DEPLOY NA VPS                ${NC}"
echo -e "${BLUE}======================================================${NC}"
echo -e "Data/Hora: $(date '+%Y-%m-%d %H:%M:%S')"

APP_DIR="/opt/renacred"
SERVER_DIR="/opt/renacred/server"
NGINX_CONF_DEST="/etc/icontainer/apps/openresty/openresty/conf/conf.d/api.renacred.com.br.conf"

cd "$APP_DIR"

# 1. Sincronizar com o repositório Git oficial
echo -e "\n${YELLOW}[1/5] Atualizando código-fonte via Git...${NC}"
git fetch origin main
git reset --hard origin/main
CURRENT_COMMIT=$(git log -1 --oneline)
echo -e "${GREEN}✓ Código atualizado para: ${CURRENT_COMMIT}${NC}"

# 2. Atualizar e recarregar configuração Nginx / OpenResty
echo -e "\n${YELLOW}[2/5] Verificando configuração do Nginx / OpenResty...${NC}"
if [ -f "$APP_DIR/nginx-renacred.conf" ]; then
    cp "$APP_DIR/nginx-renacred.conf" "$NGINX_CONF_DEST"
    docker exec ic-openresty-H2ty openresty -t
    docker exec ic-openresty-H2ty openresty -s reload
    echo -e "${GREEN}✓ Nginx / OpenResty recarregado com sucesso.${NC}"
else
    echo -e "${YELLOW}! nginx-renacred.conf não encontrado, mantendo configuração atual.${NC}"
fi

# 3. Compilar e reconstruir imagem Docker
echo -e "\n${YELLOW}[3/5] Reconstruindo imagem Docker (server-renacred-api)...${NC}"
cd "$SERVER_DIR"

# Se o .env não existir em server, avisa
if [ ! -f "$SERVER_DIR/.env" ]; then
    echo -e "${RED}ERRO: Arquivo $SERVER_DIR/.env não encontrado! Configure as variáveis antes de continuar.${NC}"
    exit 1
fi

docker compose build
echo -e "${GREEN}✓ Imagem Docker compilada com sucesso.${NC}"

# 4. Reiniciar Container com Zero Downtime perceptível
echo -e "\n${YELLOW}[4/5] Reiniciando container renacred-api...${NC}"
docker compose up -d --remove-orphans
echo -e "${GREEN}✓ Container iniciado.${NC}"

# 5. Validação de Saúde (Healthcheck)
echo -e "\n${YELLOW}[5/5] Validando saúde da API...${NC}"
sleep 3

HEALTH_RESPONSE=$(curl -s http://127.0.0.1:3002/health || echo "FAIL")

if [[ "$HEALTH_RESPONSE" == *"online"* ]]; then
    echo -e "${GREEN}✓ Healthcheck OK: ${HEALTH_RESPONSE}${NC}"
    echo -e "\n${BLUE}======================================================${NC}"
    echo -e "${GREEN}   DEPLOY CONCLUÍDO COM SUCESSO NA VPS!              ${NC}"
    echo -e "${BLUE}======================================================${NC}"
    docker ps | grep renacred-api
    exit 0
else
    echo -e "${RED}✗ Falha no Healthcheck. Resposta: ${HEALTH_RESPONSE}${NC}"
    echo -e "${YELLOW}Últimos logs do container:${NC}"
    docker logs --tail 30 renacred-api
    exit 1
fi
