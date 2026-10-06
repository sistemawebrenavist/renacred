import { fetchbrasilService } from '../src/services/fetchbrasil.service';
import { e20Service } from '../src/services/e20Service';
import { SERVER_PRODUCTS } from '../src/config/productsCatalog';

interface TestResult {
  code: string;
  name: string;
  query: string;
  success: boolean;
  statusCode?: number;
  providerUsed?: string;
  totalRegistros: number;
  durationMs: number;
  message?: string;
  error?: string;
}

// Queries recomendadas por produto (baseadas em RENACRED.md e alvos oficiais)
const TEST_QUERIES: Record<string, { query: string; extraParams?: any }> = {
  E1: { query: '81261691920' }, // DOI Imobiliário (alvo real com 5 declarações)
  E2: { query: 'MIR2011' },     // Proprietários
  E3: { query: '16670085000155' }, // Frota (CNPJ válido)
  E4: { query: 'MIR2011' },     // Endereço Proprietário
  E5: { query: 'MIR2011' },     // Roubo e Furto
  E6: { query: '96238550953' }, // CNH Imagem
  E7: { query: '96238550953' }, // CNH Dados
  E8: { query: 'MIR2011' },     // RENAINF Multas
  E9: { query: 'MIR2011' },     // RENAJUD Restrições
  E10: { query: 'MIR2011' },    // Comunicação Venda
  E11: { query: '81261691920' },// Parentes
  E12: { query: 'MIR2011' },    // BIN Online
  E13: { query: '81261691920' },// CPF Básico
  E14: { query: 'MIR2011' },    // SNG Gravames
  E15: { query: '81261691920' },// CPF Completo
  E16: { query: '59681940' },   // RG
  E17: { query: 'HENRIQUE SILVA' }, // Busca Nome
  E18: { query: 'MARIA SILVA', extraParams: { tipo: 'mae' } }, // Filiação
  E19: { query: 'MIR2011' },    // Busca RENAVAM
  E20: { query: 'MIR2011' }     // Pré Vistoria Consolidada
};

async function testSingleProduct(code: string): Promise<TestResult> {
  const prod = SERVER_PRODUCTS.find(p => p.code === code);
  const target = TEST_QUERIES[code] || { query: 'MIR2011' };
  const query = target.query;
  const name = prod?.name || code;

  const startTime = Date.now();
  console.log(`\n⏳ Testando [${code}] ${name} com alvo '${query}'...`);

  try {
    if (code === 'E20') {
      const e20Res = await e20Service.executarConsultaE20(query);
      const durationMs = Date.now() - startTime;
      const temDados = Boolean(e20Res?.veiculo?.placa || e20Res?.chassi);
      return {
        code,
        name,
        query,
        success: true,
        statusCode: 200,
        providerUsed: 'InfoSinistros + E5 + E2 + Contingência E19',
        totalRegistros: temDados ? 1 : 0,
        durationMs,
        message: `Veículo: ${e20Res?.veiculo?.marcaModelo || 'Identificado'}, RENAVAM: ${e20Res?.renavam || '-'}`
      };
    }

    const res = await fetchbrasilService.consultarProdutoComContingencia(code, query, target.extraParams);
    const durationMs = Date.now() - startTime;
    const totalReg = res.normalized?.totalRegistros ?? 0;

    return {
      code,
      name,
      query,
      success: true,
      statusCode: 200,
      providerUsed: res.providerUsed,
      totalRegistros: totalReg,
      durationMs,
      message: totalReg > 0 ? `${totalReg} registro(s) obtido(s)` : 'Consulta concluída (zero registros / nada consta)'
    };
  } catch (err: any) {
    const durationMs = Date.now() - startTime;
    const status = err.response?.status;
    const msg = err.response?.data?.mensagem || err.response?.data?.erro || err.message;

    return {
      code,
      name,
      query,
      success: false,
      statusCode: status,
      providerUsed: prod?.apiPrimary,
      totalRegistros: 0,
      durationMs,
      error: msg
    };
  }
}

async function main() {
  console.log('================================================================================');
  console.log('🔍 AUDITORIA E BATERIA DE TESTES: CATÁLOGO RENACRED E1 A E20 (NOVO TOKEN FB)');
  console.log('Token Ativo: FB-2414-FE5E-D56B-F396');
  console.log('================================================================================');

  const results: TestResult[] = [];

  for (const prod of SERVER_PRODUCTS) {
    const res = await testSingleProduct(prod.code);
    results.push(res);
    const icon = res.success ? '✅' : '❌';
    console.log(`${icon} [${res.code}] ${res.success ? 'OK' : 'FALHA'} (${res.durationMs}ms) - ${res.message || res.error}`);
    // Pequeno intervalo entre requisições para evitar rate-limit agressivo
    await new Promise(r => setTimeout(r, 600));
  }

  console.log('\n\n================================================================================');
  console.log('📊 TABELA CONSOLIDADA DE RESULTADOS POR PRODUTO');
  console.log('================================================================================');
  console.log('| Código | Produto | Entrada | Status | Provedor/Endpoint | Duração | Registros | Detalhes |');
  console.log('|:---|:---|:---|:---|:---|:---|:---|:---|');

  for (const r of results) {
    const statusText = r.success ? '✅ Sucesso (200)' : `❌ Erro (${r.statusCode || 'Falha'})`;
    const detalhes = r.success ? (r.message || 'OK') : (r.error || 'Erro').substring(0, 45);
    console.log(`| **${r.code}** | ${r.name} | \`${r.query}\` | ${statusText} | \`${r.providerUsed || '-'}\` | ${r.durationMs}ms | ${r.totalRegistros} | ${detalhes} |`);
  }

  const sucessos = results.filter(r => r.success).length;
  const falhas = results.filter(r => !r.success).length;
  const tempoMedio = Math.round(results.reduce((acc, r) => acc + r.durationMs, 0) / results.length);

  console.log('\n================================================================================');
  console.log(`🎯 RESUMO GERAL: ${sucessos}/${results.length} PRODUTOS OPERACIONAIS (${falhas} falhas)`);
  console.log(`⏱️ Tempo Médio de Resposta: ${tempoMedio}ms`);
  console.log('================================================================================');

  if (falhas > 0) {
    console.log('\n⚠️ Produtos com observações ou falhas:');
    for (const f of results.filter(r => !r.success)) {
      console.log(`- [${f.code}] ${f.name}: ${f.error}`);
    }
  }

  process.exit(0);
}

main().catch(err => {
  console.error('Erro fatal no executor de testes:', err);
  process.exit(1);
});
