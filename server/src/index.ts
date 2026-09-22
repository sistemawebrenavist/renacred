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
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key', 'X-Requested-With', 'Accept', 'Origin'],
}));

// Responder preflight OPTIONS para todas as rotas
app.options('*', cors());

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
app.use('/api/pagamentos', paymentRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/keys', apiKeyRoutes);
app.use('/api/admin', adminRoutes);

// Rotas da API Externa para Desenvolvedores
app.use('/v1', v1Routes);
app.use('/api/v1', v1Routes);

// Suporte para chamadas diretas na raiz caso passem token (ex: /?token=...&query=...)
app.use('/', (req, res, next) => {
  if (req.query.token || req.query.api_key || req.headers['x-api-key']) {
    return v1Routes(req, res, next);
  }
  next();
});

// Tratamento de rotas não encontradas
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Rota ${req.method} ${req.url} não encontrada no servidor Renacred.`,
  });
});

// Middleware global de tratamento de erros garantindo cabeçalhos CORS
app.use((err: any, req: any, res: any, next: any) => {
  logger.error(`[EXPRESS ERROR] ${req.method} ${req.url} - ${err.message}`);
  const origin = req.headers.origin;
  if (origin) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
  }
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Erro interno no servidor.',
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
