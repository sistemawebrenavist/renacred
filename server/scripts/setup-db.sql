-- ==========================================================
-- SCRIPT DE INICIALIZAÇÃO DO BANCO DE DADOS RENACRED NA VPS
-- ==========================================================
-- Execute este comando no terminal da VPS via psql ou docker exec:
-- psql -U postgres -h localhost -c "CREATE DATABASE renacred_production;"

-- 1. Criar o banco de dados caso não exista
SELECT 'CREATE DATABASE renacred_production'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'renacred_production')\gexec

-- 2. Conceder todas as permissões ao usuário do PostgreSQL
GRANT ALL PRIVILEGES ON DATABASE renacred_production TO infosinistros_user;

-- Pronto! O banco 'renacred_production' está 100% isolado do 'infosinistros_production'.
