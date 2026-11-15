const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const { Client } = require('../server/node_modules/pg');

async function main() {
  console.log('================================================================');
  console.log('🚀 GERAÇÃO DA BASE DE LEILÃO POSITIVO - PRODUTO E2 (HISTÓRICO)');
  console.log('================================================================\n');

  // 1. Ler planilha de entrada
  const inputPath = path.resolve(__dirname, '../Teste_Leilão_Positivo.xlsx');
  console.log(`[1/5] Lendo arquivo de entrada: ${inputPath}...`);
  const wbInput = xlsx.readFile(inputPath);
  const sheetInput = wbInput.Sheets[wbInput.SheetNames[0]];
  const rawRows = xlsx.utils.sheet_to_json(sheetInput, { header: 1 });

  // Linhas de dados começam no índice 7 (cabeçalho no índice 6)
  const dataRows = rawRows.slice(7).filter(r => r && r[8]);
  console.log(`✓ Total de linhas com ID Consulta: ${dataRows.length}`);

  // Mapear por Query ID e Placas
  const queryIds = Array.from(new Set(dataRows.map(r => String(r[8]).trim())));
  console.log(`✓ Total de IDs de consulta únicos: ${queryIds.length}`);

  // 2. Conectar ao PostgreSQL (via túnel VPS)
  console.log('\n[2/5] Conectando ao PostgreSQL (renacred_production)...');
  const client = new Client({
    connectionString: 'postgresql://infosinistros_user:Infosinistros2025Secure@127.0.0.1:5433/renacred_production'
  });
  await client.connect();
  console.log('✓ Conectado ao banco de dados com sucesso.');

  // 3. Buscar os JSONs gravados nas consultas
  console.log('\n[3/5] Consultando retornos JSON das consultas no banco...');
  const res = await client.query(
    'SELECT id, identifier, status, "resultData" FROM queries WHERE id = ANY($1::text[])',
    [queryIds]
  );
  console.log(`✓ Retornos encontrados no banco: ${res.rows.length} de ${queryIds.length}`);
  await client.end();

  const queryMap = new Map();
  res.rows.forEach(r => queryMap.set(r.id, r));

  // 4. Processar e cruzar os históricos
  console.log('\n[4/5] Processando cadeia dominial e filtrando proprietários anteriores PJ...');

  // Agrupar consultas por placa
  const platesMap = new Map(); // plate -> array de linhas da planilha
  dataRows.forEach(r => {
    const plate = String(r[1]).trim().toUpperCase();
    const qId = String(r[8]).trim();
    if (!platesMap.has(plate)) {
      platesMap.set(plate, []);
    }
    platesMap.get(plate).push({ qId, row: r });
  });

  const previousCnpjList = []; // { placa, cnpj, razaoSocial, ordem, data }
  const currentOnlyCnpjList = []; // { placa, cnpj, razaoSocial, data }
  const seenPairAnterior = new Set();
  const seenPairAtual = new Set();

  let totalPlacasAnalisadas = platesMap.size;
  let placasComHistorico = 0;
  let placasSemHistorico = 0;
  let placasComCnpjAnterior = 0;
  let placasComCnpjApenasAtual = 0;
  let placasApenasPessoaFisica = 0;

  for (const [plate, list] of platesMap.entries()) {
    // Obter consulta com dados
    let bestResultData = null;
    for (const item of list) {
      const q = queryMap.get(item.qId);
      if (q?.resultData?.historico && Array.isArray(q.resultData.historico) && q.resultData.historico.length > 0) {
        bestResultData = q.resultData;
        break;
      }
    }

    if (!bestResultData) {
      // Tentar a primeira consulta mesmo sem historico
      const qFirst = queryMap.get(list[0].qId);
      bestResultData = qFirst?.resultData;
    }

    if (!bestResultData || !Array.isArray(bestResultData.historico) || bestResultData.historico.length === 0) {
      placasSemHistorico++;
      continue;
    }

    placasComHistorico++;
    const hist = bestResultData.historico;

    // Verificar se tem proprietário anterior PJ (atual === false)
    const pjAnteriores = [];
    const pjAtuais = [];

    hist.forEach(h => {
      const cleanDoc = String(h.documento || '').replace(/\D/g, '');
      const isCnpj = cleanDoc.length === 14 || h.tipo === 'Pessoa juridica';
      if (!isCnpj) return;

      const razao = String(h.razao_social || h.nome || '').trim();
      const docFormatado = formatCnpj(h.documento || cleanDoc);

      if (h.atual === false) {
        pjAnteriores.push({
          placa: plate,
          cnpj: docFormatado,
          razaoSocial: razao,
          cleanDoc,
          ordem: h.ordem || 99,
          data: h.data || ''
        });
      } else if (h.atual === true) {
        pjAtuais.push({
          placa: plate,
          cnpj: docFormatado,
          razaoSocial: razao,
          cleanDoc,
          data: h.data || ''
        });
      }
    });

    if (pjAnteriores.length > 0) {
      placasComCnpjAnterior++;
      pjAnteriores.forEach(item => {
        const key = `${plate}___${item.cleanDoc}`;
        if (!seenPairAnterior.has(key)) {
          seenPairAnterior.add(key);
          previousCnpjList.push(item);
        }
      });
    } else if (pjAtuais.length > 0) {
      placasComCnpjApenasAtual++;
      pjAtuais.forEach(item => {
        const key = `${plate}___${item.cleanDoc}`;
        if (!seenPairAtual.has(key)) {
          seenPairAtual.add(key);
          currentOnlyCnpjList.push(item);
        }
      });
    } else {
      placasApenasPessoaFisica++;
    }
  }

  // Ordenar por placa alfabética e ordem cronológica do histórico
  previousCnpjList.sort((a, b) => {
    if (a.placa !== b.placa) return a.placa.localeCompare(b.placa);
    return a.ordem - b.ordem;
  });

  currentOnlyCnpjList.sort((a, b) => a.placa.localeCompare(b.placa));

  console.log(`\n--- RESULTADOS DA EXTRAÇÃO ---`);
  console.log(`Total de placas distintas na planilha: ${totalPlacasAnalisadas}`);
  console.log(`Placas com dados de histórico no banco: ${placasComHistorico}`);
  console.log(`Placas sem histórico gravado: ${placasSemHistorico}`);
  console.log(`Placas com apenas Pessoas Físicas na cadeia: ${placasApenasPessoaFisica}`);
  console.log(`Placas com CNPJ como PROPRIETÁRIO ANTERIOR (atual = false): ${placasComCnpjAnterior}`);
  console.log(`Total de vínculos (Placa + CNPJ Anterior) extraídos: ${previousCnpjList.length}`);
  console.log(`Placas com CNPJ apenas como TITULAR VIGENTE (atual = true): ${placasComCnpjApenasAtual}`);
  console.log(`Total de vínculos (Placa + Titular Vigente PJ): ${currentOnlyCnpjList.length}`);

  // 5. Gerar arquivo Excel (.xlsx) com a estrutura EXATA exigida
  console.log('\n[5/5] Gerando arquivo Excel e CSV de saída...');

  // Aba 1: Estrutura EXATA pedida pelo usuário:
  // Coluna A: Placa
  // Coluna B: CNPJ do proprietário anterior
  // Coluna C: Razão Social do proprietário anterior
  const rowsSheet1 = [
    ['Placa', 'CNPJ do proprietário anterior', 'Razão Social do proprietário anterior']
  ];

  previousCnpjList.forEach(item => {
    rowsSheet1.push([
      item.placa,
      item.cnpj,
      item.razaoSocial
    ]);
  });

  // Aba 2: Titulares Vigentes PJ (Atual) - Caso o usuário também deseje para o produto
  const rowsSheet2 = [
    ['Placa', 'CNPJ do titular vigente', 'Razão Social do titular vigente']
  ];

  currentOnlyCnpjList.forEach(item => {
    rowsSheet2.push([
      item.placa,
      item.cnpj,
      item.razaoSocial
    ]);
  });

  // Aba 3: Resumo Analítico
  const rowsSheet3 = [
    ['MÉTRICA / INDICADOR', 'VALOR'],
    ['Total de Linhas na Planilha Origem (Rede CredAuto)', dataRows.length],
    ['Total de Placas Únicas Analisadas', totalPlacasAnalisadas],
    ['Placas com Histórico Dominial Localizado', placasComHistorico],
    ['Placas sem Histórico', placasSemHistorico],
    ['Placas apenas com Pessoas Físicas no Histórico', placasApenasPessoaFisica],
    ['Placas com CNPJ como PROPRIETÁRIO ANTERIOR', placasComCnpjAnterior],
    ['Total de Registros Extraídos (Placa + CNPJ Anterior)', previousCnpjList.length],
    ['Placas com CNPJ apenas como TITULAR ATUAL/VIGENTE', placasComCnpjApenasAtual],
    ['Data da Extração', new Date().toLocaleString('pt-BR')],
    ['Fonte dos Dados', 'Banco de Dados Renacred (Consultas E2 - Histórico de Proprietários)']
  ];

  const wbOut = xlsx.utils.book_new();

  const ws1 = xlsx.utils.aoa_to_sheet(rowsSheet1);
  // Ajustar largura das colunas da Aba 1
  ws1['!cols'] = [
    { wch: 12 }, // Placa
    { wch: 24 }, // CNPJ
    { wch: 55 }  // Razao Social
  ];
  xlsx.utils.book_append_sheet(wbOut, ws1, 'Leilão Positivo');

  const ws2 = xlsx.utils.aoa_to_sheet(rowsSheet2);
  ws2['!cols'] = [
    { wch: 12 },
    { wch: 24 },
    { wch: 55 }
  ];
  xlsx.utils.book_append_sheet(wbOut, ws2, 'Titulares Vigentes PJ');

  const ws3 = xlsx.utils.aoa_to_sheet(rowsSheet3);
  ws3['!cols'] = [
    { wch: 55 },
    { wch: 25 }
  ];
  xlsx.utils.book_append_sheet(wbOut, ws3, 'Resumo Analítico');

  // Caminhos de saída
  const localXlsx = path.resolve(__dirname, '../Leilao_Positivo_CNPJ_Anterior.xlsx');
  const localCsv = path.resolve(__dirname, '../Leilao_Positivo_CNPJ_Anterior.csv');
  const downloadsXlsx = 'C:/Users/Henrique - PC/Downloads/Leilao_Positivo_CNPJ_Anterior.xlsx';
  const downloadsCsv = 'C:/Users/Henrique - PC/Downloads/Leilao_Positivo_CNPJ_Anterior.csv';

  // Gravar XLSX local
  xlsx.writeFile(wbOut, localXlsx);
  console.log(`✓ Arquivo XLSX gravado no projeto: ${localXlsx}`);

  // Gravar CSV local (apenas a estrutura exata de 3 colunas)
  const csvContent = rowsSheet1
    .map(r => r.map(val => `"${String(val).replace(/"/g, '""')}"`).join(';'))
    .join('\r\n');
  fs.writeFileSync(localCsv, '\ufeff' + csvContent, 'utf8'); // BOM UTF-8 para Excel abrir sem quebrar acentuação
  console.log(`✓ Arquivo CSV gravado no projeto: ${localCsv}`);

  // Gravar no Downloads
  try {
    xlsx.writeFile(wbOut, downloadsXlsx);
    console.log(`✓ Arquivo XLSX copiado para Downloads: ${downloadsXlsx}`);
    fs.writeFileSync(downloadsCsv, '\ufeff' + csvContent, 'utf8');
    console.log(`✓ Arquivo CSV copiado para Downloads: ${downloadsCsv}`);
  } catch (err) {
    console.warn(`Aviso ao copiar para Downloads: ${err.message}`);
  }

  console.log('\n🎉 Extração concluída com sucesso!');
}

function formatCnpj(doc) {
  if (!doc) return '';
  const digits = String(doc).replace(/\D/g, '');
  if (digits.length === 14) {
    return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  }
  return doc;
}

main().catch(err => {
  console.error('Erro na execução:', err);
  process.exit(1);
});

