import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { logger } from './utils/logger';

// Carregar variáveis de ambiente
dotenv.config();

import authRoutes from './routes/authRoutes';
import imobiliarioRoutes from './routes/imobiliarioRoutes';
import paymentRoutes from './routes/paymentRoutes';
import webhookRoutes from './routes/webhookRoutes';
import apiKeyRoutes from './routes/apiKeyRoutes';
import adminRoutes from './routes/adminRoutes';
import v1Routes from './routes/v1Routes';

const app = express();
const PORT = process.env.PORT || 3002;

// Middlewares
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Healthcheck
app.get('/health', (req, res) => {
  res.json({
    status: 'online',
    app: 'Renacred API',
    timestamp: new Date().toISOString(),
    port: PORT,
  });
});

// Rotas do Painel Web
app.use('/api/auth', authRoutes);
app.use('/api/imobiliario', imobiliarioRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/keys', apiKeyRoutes);
app.use('/api/admin', adminRoutes);

// Rotas da API Externa para Desenvolvedores
app.use('/v1', v1Routes);

// Tratamento de rotas não encontradas
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Rota ${req.method} ${req.url} não encontrada no servidor Renacred.`,
  });
});

// Inicialização do Servidor
app.listen(PORT, () => {
  logger.info(`====================================================`);
  logger.info(`🚀 RENACRED API rodando com sucesso na porta :${PORT}`);
  logger.info(`📡 API Desenvolvedores: http://localhost:${PORT}/v1/imobiliario/historico`);
  logger.info(`💳 Webhook InfinityPay: http://localhost:${PORT}/api/webhooks/infinitypay`);
  logger.info(`====================================================`);
});
