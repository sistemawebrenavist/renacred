import { logger } from '../utils/logger';
import { infosinistrosService, InfoSinistrosPreVistoriaResponse } from './infosinistrosService';
import { fetchbrasilService } from './fetchbrasil.service';
import { syncVeicularToInfosinistros } from './syncToInfosinistrosService';
import { cleanObject } from './productNormalizers';

export interface E20EntidadeDetectada {
  nome: string;
  documento?: string;
  tipoDocumento?: string;
  tipoEntidade: 'locadora' | 'seguradora' | 'frota_publica' | 'financeira' | 'particular';
  data?: string;
  ordem?: number;
  atual?: boolean;
}

export interface E20ConsolidadoResponse {
  placa: string;
  chassi?: string;
  renavam?: string;
  contingenciaRenavamAplicada: boolean;
  custoInternoTotal: number;
  veiculo: {
    placa: string;
    placaModeloAntigo?: string;
    placaModeloNovo?: string;
    chassi?: string;
    renavam?: string;
    motor?: string;
    marca?: string;
    modelo?: string;
    marcaModelo?: string;
    anoFabricacao?: string | number;
    anoModelo?: string | number;
    cor?: string;
    combustivel?: string;
    potencia?: string | number;
    cilindradas?: string | number;
    pesoBrutoTotal?: string | number;
    capacidadeCarga?: string | number;
    qtdPax?: string | number;
    eixos?: string | number;
    nacionalidade?: string;
    especieVeiculo?: string;
    tipoVeiculo?: string;
    carroceria?: string;
    tipoMontagem?: string;
    situacaoChassi?: string;
    situacaoVeiculo?: string;
    municipio?: string;
    uf?: string;
    faturadoCnpj?: string;
    tipoDocFaturado?: string;
    ufFaturado?: string;
    dataAtualizacao?: string;
  };
  roubo_furto: {
    status: 'alerta' | 'recuperado' | 'regular';
    temQueixaAtiva: boolean;
    mensagem: string;
    totalOcorrencias: number;
    ocorrencias: Array<{
      tipo: string;
      data?: string;
      ano?: string | number;
      municipio?: string;
      uf?: string;
      numero_boletim?: string;
      orgao_seguranca?: string;
      descricao?: string;
      fonte: 'Bases Policiais' | 'Base Cadastral Interna';
    }>;
  };
  locadoras: {
    status: 'positivo' | 'negativo';
    mensagem: string;
    total: number;
    registros: Array<{
      empresa: string;
      documento?: string;
      data?: string;
      detalhes?: string;
      fonte: 'Histórico Dominial E2' | 'Base Cadastral de Frotas';
    }>;
  };
  seguradoras: {
    status: 'positivo' | 'negativo';
    mensagem: string;
    total: number;
    indenizacaoIntegral: boolean;
    registros: Array<{
      seguradora: string;
      tipoEvento?: string;
      ano?: string | number;
      data?: string;
      documento?: string;
      detalhes?: string;
      fonte: 'Histórico Dominial E2' | 'Registro de Remarketing / Salvados';
    }>;
  };
  frota_publica: {
    status: 'positivo' | 'negativo';
    mensagem: string;
    total: number;
    isViatura: boolean;
    registros: Array<{
      orgao: string;
      tipoUso?: string;
      data?: string;
      documento?: string;
      fonte: 'Histórico Dominial E2' | 'Base de Frotas Públicas';
    }>;
  };
  financeiras: {
    status: 'positivo' | 'negativo';
    total: number;
    registros: Array<{
      instituicao: string;
      tipo?: string;
      data?: string;
      fonte: string;
    }>;
  };
  proprietarios: {
    total: number;
    proprietario_atual?: any;
    historico: any[];
  };
  outros_produtos: {
    leiloes?: any;
    salvados?: any;
    sinistro_recuperado?: any;
    historico_km?: any;
    laudo_cautelar?: any;
    banco_imagens?: any;
    demanda_judicial?: any;
    csv?: any;
    fipe?: any;
  };
  raw_sources: {
    infosinistrosSuccess: boolean;
    e5Success: boolean;
    e2Success: boolean;
    e19Triggered: boolean;
  };
}

/**
 * Classificador inteligente de entidades a partir de nomes e documentos de proprietários
 */
export function classificarEntidadeProprietario(
  nomeBruto?: string,
  docBruto?: string
): 'locadora' | 'seguradora' | 'frota_publica' | 'financeira' | 'particular' {
  const nome = String(nomeBruto || '').toUpperCase().trim();
  const docLimpo = String(docBruto || '').replace(/\D/g, '');

  if (!nome && !docLimpo) return 'particular';

  // 1. Locadoras de Veículos (palavras-chave e CNPJs conhecidos)
  const regexLocadora =
    /\b(LOCADORA|RENT A CAR|LOCACAO DE VEICULOS|LOCADORA DE VEICULOS|MOVIDA|LOCALIZA|UNIDAS|LOCAMERICA|OURO VERDE|LEADIS|VAMOS LOCACAO|FROTA LOCADORA|ALUGA|RENTAL)\b/i;
  const cnpjsLocadorasConhecidas = new Set([
    '16670085000155', // Localiza Fleet
    '04437534000130', // Unidas
    '07976147000160', // Movida
    '16670085000155', // Localiza Rent a Car
    '00604122000197', // Locamerica
  ]);

  if (regexLocadora.test(nome) || cnpjsLocadorasConhecidas.has(docLimpo)) {
    return 'locadora';
  }

  // 2. Seguradoras & Previdência
  const regexSeguradora =
    /\b(SEGURADORA|SEGUROS|COMPANHIA DE SEGUROS|CIA DE SEGUROS|PORTO SEGURO|BRADESCO AUTO|TOKIO MARINE|AZUL SEGUROS|MAPFRE|ALLIANZ|SUL AMERICA|HDI SEGUROS|LIBERTY|SOMPO|ZURICH|CHUBB|ITAU SEGUROS|CAIXA SEGURADORA|ALFA SEGUROS|SUHAI)\b/i;
  if (regexSeguradora.test(nome)) {
    return 'seguradora';
  }

  // 3. Órgãos Públicos, Governos, Polícias e Autarquias
  const regexFrotaPublica =
    /\b(PREFEITURA|MUNICIPIO DE|ESTADO DE|GOVERNO DO ESTADO|SECRETARIA DE|SECRETARIA DA|MINISTERIO|POLICIA|POLICIA MILITAR|POLICIA CIVIL|POLICIA FEDERAL|CORPO DE BOMBEIROS|CAMARA MUNICIPAL|TRIBUNAL|FUNDO MUNICIPAL|AUTARQUIA|GUARDA MUNICIPAL|RECEITA FEDERAL|DNIT|DER |DEPARTAMENTO DE ESTRADAS)\b/i;
  if (regexFrotaPublica.test(nome)) {
    return 'frota_publica';
  }

  // 4. Bancos, Financeiras & Leasing
  const regexFinanceira =
    /\b(BANCO|FINANCEIRA|LEASING|ARRENDAMENTO MERCANTIL|BV FINANCEIRA|SANTANDER|ITAU UNIBANCO|BRADESCO FINANCIAMENTOS|SAFRA|PANAMERICANO|OMNI|AYMORE|CREDITAS)\b/i;
  if (regexFinanceira.test(nome)) {
    return 'financeira';
  }

  return 'particular';
}

export class E20Service {
  /**
   * Executa a composição completa do Produto E20:
   * 1. 100% da Pré-Vistoria via InfoSinistros (Admin API Key)
   * 2. Contingência E19 caso a BIN interna não traga RENAVAM (custo R$ 0,04)
   * 3. Histórico de Roubo e Furto oficial (E5)
   * 4. Histórico de Proprietários oficial (E2)
   * 5. Motor de distribuição de respostas e consolidação pericial nos cards
   */
  async executarConsultaE20(placa: string): Promise<E20ConsolidadoResponse> {
    const cleanPlaca = placa.replace(/[^A-Z0-9]/gi, '').toUpperCase();
    const startTime = Date.now();
    logger.info(`[E20] Iniciando orquestração consolidada E20 para placa ${cleanPlaca}...`);

    let custoInternoTotal = 0.32; // Base: E5 (0.15) + E2 (0.17)
    let contingenciaRenavamAplicada = false;

    // 1. Disparar em paralelo as 3 fontes primárias
    const [infoSinistrosSettled, e5Settled, e2Settled] = await Promise.allSettled([
      infosinistrosService.consultarPreVistoria(cleanPlaca),
      fetchbrasilService.consultarProdutoComContingencia('E5', cleanPlaca),
      fetchbrasilService.consultarProdutoComContingencia('E2', cleanPlaca),
    ]);

    const infoResult: InfoSinistrosPreVistoriaResponse | null =
      infoSinistrosSettled.status === 'fulfilled' ? infoSinistrosSettled.value : null;
    const e5Result: any = e5Settled.status === 'fulfilled' ? e5Settled.value : null;
    const e2Result: any = e2Settled.status === 'fulfilled' ? e2Settled.value : null;

    if (infoSinistrosSettled.status === 'rejected') {
      logger.warn(`[E20] InfoSinistros falhou para ${cleanPlaca}: ${(infoSinistrosSettled as any).reason?.message}`);
    }
    if (e5Settled.status === 'rejected') {
      logger.warn(`[E20] E5 falhou para ${cleanPlaca}: ${(e5Settled as any).reason?.message}`);
    }
    if (e2Settled.status === 'rejected') {
      logger.warn(`[E20] E2 falhou para ${cleanPlaca}: ${(e2Settled as any).reason?.message}`);
    }

    // 2. Extrair dados da BIN Fabril (P35 da InfoSinistros)
    const p35Bruto = infoResult?.resultados?.P35?.conteudo || {};
    let renavamFinal = p35Bruto.renavam && String(p35Bruto.renavam).trim() !== '' && String(p35Bruto.renavam).toUpperCase() !== 'NADA CONSTA'
      ? String(p35Bruto.renavam).trim()
      : null;

    // 3. Regra de Negócio Crítica: Garantia de RENAVAM via E19
    // "caso não haja o renavam na BIN interna, buscar na E19 ao custo de R$0,04"
    if (!renavamFinal) {
      logger.info(`[E20] RENAVAM não localizado na BIN interna para ${cleanPlaca}. Acionando contingência E19 (custo R$ 0,04)...`);
      try {
        const e19Result = await fetchbrasilService.consultarProdutoComContingencia('E19', cleanPlaca);
        const renavamE19 = e19Result?.normalized?.dados?.renavam;
        if (renavamE19 && String(renavamE19).trim() !== '') {
          renavamFinal = String(renavamE19).trim();
          contingenciaRenavamAplicada = true;
          custoInternoTotal += 0.04; // Adiciona custo da contingência E19
          logger.info(`[E20] RENAVAM recuperado com sucesso via E19: ${renavamFinal}`);
        }
      } catch (e19Err: any) {
        logger.warn(`[E20] Contingência E19 falhou ao buscar RENAVAM da placa ${cleanPlaca}: ${e19Err.message}`);
      }
    }

    // Se o E2 trouxer renavam e ainda estiver nulo, usar como fallback
    if (!renavamFinal && e2Result?.normalized?.dados?.renavam) {
      renavamFinal = String(e2Result.normalized.dados.renavam).trim();
    }

    // Ficha Técnica do Veículo (P35 enriquecido)
    const dadosVeiculo = {
      placa: cleanPlaca,
      placaModeloAntigo: p35Bruto.placaModeloAntigo || p35Bruto.placa || cleanPlaca,
      placaModeloNovo: p35Bruto.placaModeloNovo || null,
      chassi: p35Bruto.chassi || e5Result?.normalized?.dados?.chassi || null,
      renavam: renavamFinal || null,
      motor: p35Bruto.motor || null,
      marca: p35Bruto.marca || null,
      modelo: p35Bruto.modelo || null,
      marcaModelo: p35Bruto.marcaModelo || [p35Bruto.marca, p35Bruto.modelo].filter(Boolean).join(' ') || null,
      anoFabricacao: p35Bruto.anoFabricacao || null,
      anoModelo: p35Bruto.anoModelo || null,
      cor: p35Bruto.cor || null,
      combustivel: p35Bruto.combustivel || null,
      potencia: p35Bruto.potencia || null,
      cilindradas: p35Bruto.cilindradas || null,
      pesoBrutoTotal: p35Bruto.pesoBrutoTotal || null,
      capacidadeCarga: p35Bruto.capacidadeCarga || null,
      qtdPax: p35Bruto.qtdPax || null,
      eixos: p35Bruto.eixos || null,
      nacionalidade: p35Bruto.nacionalidade || null,
      especieVeiculo: p35Bruto.especieVeiculo || null,
      tipoVeiculo: p35Bruto.tipoVeiculo || null,
      carroceria: p35Bruto.carroceria || null,
      tipoMontagem: p35Bruto.tipoMontagem || null,
      situacaoChassi: p35Bruto.situacaoChassi || null,
      situacaoVeiculo: p35Bruto.situacaoVeiculo || 'CIRCULACAO',
      municipio: p35Bruto.municipio || null,
      uf: p35Bruto.uf || p35Bruto.ufPlaca || null,
      faturadoCnpj: p35Bruto.faturadoCnpj || null,
      tipoDocFaturado: p35Bruto.tipoDocFaturado || null,
      ufFaturado: p35Bruto.ufFaturado || null,
      dataAtualizacao: p35Bruto.dataAtualizacao || null
    };

    // 4. Analisador da Cadeia Dominial do E2 para Distribuição nos Cards
    const historicoE2: any[] = Array.isArray(e2Result?.normalized?.dados?.historico)
      ? e2Result.normalized.dados.historico
      : [];
    const propAtualE2 = e2Result?.normalized?.dados?.proprietario_atual || null;

    const locadorasDetectadas: E20EntidadeDetectada[] = [];
    const seguradorasDetectadas: E20EntidadeDetectada[] = [];
    const frotasPublicasDetectadas: E20EntidadeDetectada[] = [];
    const financeirasDetectadas: E20EntidadeDetectada[] = [];

    // Avaliar proprietário atual
    if (propAtualE2) {
      const classif = classificarEntidadeProprietario(propAtualE2.nome || propAtualE2.razao_social, propAtualE2.documento);
      const item: E20EntidadeDetectada = {
        nome: propAtualE2.nome || propAtualE2.razao_social || 'NÃO INFORMADO',
        documento: propAtualE2.documento,
        tipoEntidade: classif,
        tipoDocumento: propAtualE2.tipo,
        data: propAtualE2.data,
        atual: true
      };
      if (classif === 'locadora') locadorasDetectadas.push(item);
      if (classif === 'seguradora') seguradorasDetectadas.push(item);
      if (classif === 'frota_publica') frotasPublicasDetectadas.push(item);
      if (classif === 'financeira') financeirasDetectadas.push(item);
    }

    // Avaliar histórico anterior
    for (const h of historicoE2) {
      const classif = classificarEntidadeProprietario(h.nome || h.razao_social, h.documento);
      const item: E20EntidadeDetectada = {
        nome: h.nome || h.razao_social || 'NÃO INFORMADO',
        documento: h.documento,
        tipoEntidade: classif,
        tipoDocumento: h.tipo,
        data: h.data,
        ordem: h.ordem,
        atual: Boolean(h.atual)
      };
      if (classif === 'locadora') locadorasDetectadas.push(item);
      if (classif === 'seguradora') seguradorasDetectadas.push(item);
      if (classif === 'frota_publica') frotasPublicasDetectadas.push(item);
      if (classif === 'financeira') financeirasDetectadas.push(item);
    }

    // 5. Distribuição e Consolidação: CARD DE ROUBO E FURTO (E5 + P10)
    const ocorrenciasE5: any[] = Array.isArray(e5Result?.normalized?.dados?.ocorrencias)
      ? e5Result.normalized.dados.ocorrencias
      : [];
    const p10 = infoResult?.resultados?.P10;
    const listaOcorrenciasConsolidada: any[] = [];

    // Ocorrências oficiais de E5
    for (const oc of ocorrenciasE5) {
      listaOcorrenciasConsolidada.push({
        tipo: oc.tipo || 'OCORRÊNCIA POLICIAL',
        data: oc.data,
        ano: oc.ano,
        municipio: oc.municipio,
        uf: oc.uf,
        numero_boletim: oc.numero_boletim,
        orgao_seguranca: oc.orgao_seguranca,
        descricao: oc.descricao,
        fonte: 'Bases Policiais' as const
      });
    }

    // Ocorrências internas de P10
    if (p10 && p10.status === 'positivo' && Array.isArray(p10.conteudo)) {
      for (const item of p10.conteudo) {
        listaOcorrenciasConsolidada.push({
          tipo: item.tipo || item.tipo_ocorrencia || 'BOLETIM DE OCORRÊNCIA',
          data: item.data || item.data_fato,
          ano: item.ano,
          municipio: item.cidade || item.municipio,
          uf: item.uf,
          numero_boletim: item.boletim || item.numero_boletim,
          orgao_seguranca: item.delegacia || item.orgao,
          descricao: item.descricao || item.historico,
          fonte: 'Base Cadastral Interna' as const
        });
      }
    }

    const temAlertaAtivo = listaOcorrenciasConsolidada.some((o) => {
      const t = String(o.tipo || '').toLowerCase();
      const d = String(o.descricao || '').toLowerCase();
      const isRecuperado = t.includes('recupera') || t.includes('devolu') || d.includes('recupera');
      return (t.includes('furto') || t.includes('roubo')) && !isRecuperado;
    });
    const temRecuperado = listaOcorrenciasConsolidada.some((o) => {
      const t = String(o.tipo || '').toLowerCase();
      const d = String(o.descricao || '').toLowerCase();
      return t.includes('recupera') || t.includes('devolu') || d.includes('recupera');
    });

    const statusRouboFurto: 'alerta' | 'recuperado' | 'regular' = temAlertaAtivo
      ? 'alerta'
      : temRecuperado
      ? 'recuperado'
      : 'regular';

    const cardRouboFurto = {
      status: statusRouboFurto,
      temQueixaAtiva: temAlertaAtivo,
      mensagem: temAlertaAtivo
        ? 'CONSTAM OCORRÊNCIAS DE ROUBO OU FURTO ATIVAS'
        : temRecuperado
        ? 'OCORRÊNCIA DE ROUBO/FURTO COM RECUPERAÇÃO REGISTRADA'
        : 'NADA CONSTA - VEÍCULO SEM QUEIXA ATIVA NAS BASES POLICIAIS',
      totalOcorrencias: listaOcorrenciasConsolidada.length,
      ocorrencias: listaOcorrenciasConsolidada
    };

    // 6. Distribuição e Consolidação: CARD DE LOCADORAS (P4 + E2)
    const p4 = infoResult?.resultados?.P4;
    const registrosLocadoras: any[] = [];

    // Dados de P4 (InfoSinistros)
    if (p4 && p4.status === 'positivo') {
      const itensP4 = Array.isArray(p4.conteudo) ? p4.conteudo : [p4.conteudo];
      for (const item of itensP4) {
        if (!item) continue;
        registrosLocadoras.push({
          empresa: typeof item === 'string' ? item : item.empresa || item.razao_social || item.nome || 'LOCADORA IDENTIFICADA',
          documento: item.cnpj || item.documento,
          data: item.data || item.periodo,
          detalhes: item.detalhes || item.observacao,
          fonte: 'Base Cadastral de Frotas' as const
        });
      }
    }

    // Registros detectados na cadeia dominial de E2
    for (const loc of locadorasDetectadas) {
      // Evitar duplicata por documento/nome
      const jaExiste = registrosLocadoras.some(
        (r) => (loc.documento && r.documento === loc.documento) || r.empresa.toUpperCase().includes(loc.nome.substring(0, 10))
      );
      if (!jaExiste) {
        registrosLocadoras.push({
          empresa: loc.nome,
          documento: loc.documento,
          data: loc.data ? `Posse registrada em ${loc.data}` : undefined,
          detalhes: loc.atual ? 'Proprietário Atual Vigente' : (loc.ordem ? `${loc.ordem}º Proprietário no Histórico` : 'Proprietário Anterior'),
          fonte: 'Histórico Dominial E2' as const
        });
      }
    }

    const cardLocadoras = {
      status: (registrosLocadoras.length > 0 ? 'positivo' : 'negativo') as 'positivo' | 'negativo',
      mensagem: registrosLocadoras.length > 0
        ? `IDENTIFICADO REGISTRO DE EX-FROTA DE LOCADORA (${registrosLocadoras.length} ocorrência(s))`
        : 'NENHUM REGISTRO DE LOCADORA LOCALIZADO',
      total: registrosLocadoras.length,
      registros: registrosLocadoras
    };

    // 7. Distribuição e Consolidação: CARD DE SEGURADORAS & SINISTROS (P1 + P14 + E2)
    const p1 = infoResult?.resultados?.P1;
    const p14 = infoResult?.resultados?.P14;
    const registrosSeguradoras: any[] = [];
    let indenizacaoIntegral = false;

    // Dados de P1 (Venda Direta Seguradoras)
    if (p1 && p1.status === 'positivo') {
      const itensP1 = Array.isArray(p1.conteudo) ? p1.conteudo : [p1.conteudo];
      for (const item of itensP1) {
        if (!item) continue;
        registrosSeguradoras.push({
          seguradora: typeof item === 'string' ? item : item.razao_social || item.nome || item.seguradora || 'SEGURADORA REGISTRADA',
          tipoEvento: 'Venda Direta / Remarketing',
          ano: item.ano || item.periodo,
          fonte: 'Registro de Remarketing / Salvados' as const
        });
      }
    }

    // Dados de P14 (Indenização Integral por Seguradora)
    if (p14 && p14.status === 'positivo') {
      indenizacaoIntegral = true;
      const itensP14 = Array.isArray(p14.conteudo) ? p14.conteudo : [p14.conteudo];
      for (const item of itensP14) {
        if (!item) continue;
        registrosSeguradoras.push({
          seguradora: typeof item === 'string' ? item : item.seguradora || item.razao_social || 'CIA SEGURADORA',
          tipoEvento: 'Indenização Integral de Sinistro',
          ano: item.ano,
          data: item.data,
          detalhes: 'Veículo indenizado integralmente por sinistro/perda',
          fonte: 'Registro de Remarketing / Salvados' as const
        });
      }
    }

    // Registros detectados na cadeia dominial de E2
    for (const seg of seguradorasDetectadas) {
      const jaExiste = registrosSeguradoras.some(
        (r) => (seg.documento && r.documento === seg.documento) || r.seguradora.toUpperCase().includes(seg.nome.substring(0, 10))
      );
      if (!jaExiste) {
        registrosSeguradoras.push({
          seguradora: seg.nome,
          documento: seg.documento,
          tipoEvento: 'Titularidade em Carteira de Seguradora',
          data: seg.data ? `Transferência registrada em ${seg.data}` : undefined,
          detalhes: seg.atual ? 'Proprietário Atual Vigente' : (seg.ordem ? `${seg.ordem}º Proprietário no Histórico` : 'Proprietário Anterior'),
          fonte: 'Histórico Dominial E2' as const
        });
      }
    }

    const cardSeguradoras = {
      status: (registrosSeguradoras.length > 0 ? 'positivo' : 'negativo') as 'positivo' | 'negativo',
      mensagem: registrosSeguradoras.length > 0
        ? `CONSTAM REGISTROS DE SEGURADORA OU SINISTRO (${registrosSeguradoras.length} registro(s))`
        : 'NENHUM HISTÓRICO DE SEGURADORA OU INDENIZAÇÃO LOCALIZADO',
      total: registrosSeguradoras.length,
      indenizacaoIntegral,
      registros: registrosSeguradoras
    };

    // 8. Distribuição e Consolidação: CARD DE FROTA PÚBLICA & VIATURAS (P2 + P3 + E2)
    const p2 = infoResult?.resultados?.P2;
    const p3 = infoResult?.resultados?.P3;
    const registrosFrotaPublica: any[] = [];
    let isViatura = false;

    if (p2 && p2.status === 'positivo') {
      isViatura = true;
      registrosFrotaPublica.push({
        orgao: typeof p2.conteudo === 'string' ? p2.conteudo : 'OPERAÇÃO COMO VIATURA POLICIAL / SEGURANÇA PÚBLICA',
        tipoUso: 'Viatura Policial / Operação Severa',
        fonte: 'Base de Frotas Públicas' as const
      });
    }

    if (p3 && p3.status === 'positivo') {
      const itensP3 = Array.isArray(p3.conteudo) ? p3.conteudo : [p3.conteudo];
      for (const item of itensP3) {
        if (!item) continue;
        registrosFrotaPublica.push({
          orgao: typeof item === 'string' ? item : item.orgao || item.ente_publico || 'ÓRGÃO PÚBLICO IDENTIFICADO',
          tipoUso: 'Ex-Frota Pública Governamental',
          data: item.data || item.periodo,
          fonte: 'Base de Frotas Públicas' as const
        });
      }
    }

    for (const pub of frotasPublicasDetectadas) {
      const jaExiste = registrosFrotaPublica.some(
        (r) => (pub.documento && r.documento === pub.documento) || r.orgao.toUpperCase().includes(pub.nome.substring(0, 10))
      );
      if (!jaExiste) {
        registrosFrotaPublica.push({
          orgao: pub.nome,
          documento: pub.documento,
          tipoUso: 'Órgão Público na Cadeia Dominial',
          data: pub.data ? `Aquisição em ${pub.data}` : undefined,
          fonte: 'Histórico Dominial E2' as const
        });
      }
    }

    const cardFrotaPublica = {
      status: (registrosFrotaPublica.length > 0 ? 'positivo' : 'negativo') as 'positivo' | 'negativo',
      mensagem: registrosFrotaPublica.length > 0
        ? `IDENTIFICADO REGISTRO DE USO PÚBLICO / GOVERNAMENTAL (${registrosFrotaPublica.length} registro(s))`
        : 'NENHUM REGISTRO DE USO PÚBLICO OU VIATURA LOCALIZADO',
      total: registrosFrotaPublica.length,
      isViatura,
      registros: registrosFrotaPublica
    };

    // 9. Card de Financeiras (P7 + E2)
    const p7 = infoResult?.resultados?.P7;
    const registrosFinanceiras: any[] = [];

    if (p7 && p7.status === 'positivo') {
      const itensP7 = Array.isArray(p7.conteudo) ? p7.conteudo : [p7.conteudo];
      for (const item of itensP7) {
        if (!item) continue;
        registrosFinanceiras.push({
          instituicao: typeof item === 'string' ? item : item.instituicao || item.banco || 'BANCO / FINANCEIRA',
          tipo: 'Venda Direta / Remarketing por Financeira',
          data: item.ano || item.data,
          fonte: 'Base Cadastral de Bancos'
        });
      }
    }

    for (const fin of financeirasDetectadas) {
      registrosFinanceiras.push({
        instituicao: fin.nome,
        tipo: 'Instituição Financeira / Leasing na Cadeia Dominial',
        data: fin.data,
        fonte: 'Histórico Dominial E2'
      });
    }

    // 10. Card Dominial Integral E2 com Anotação das Badges
    const historicoFormatado = historicoE2.map((item) => {
      const classif = classificarEntidadeProprietario(item.nome || item.razao_social, item.documento);
      return {
        ...item,
        classificacaoEntidade: classif
      };
    });

    const propAtualFormatado = propAtualE2 ? {
      ...propAtualE2,
      classificacaoEntidade: classificarEntidadeProprietario(propAtualE2.nome || propAtualE2.razao_social, propAtualE2.documento)
    } : null;

    // 11. Sincronização em tempo real de volta para a InfoSinistros (assíncrona)
    if (e2Result?.normalized?.dados) {
      setImmediate(() => {
        syncVeicularToInfosinistros(cleanPlaca, e2Result).catch((err) =>
          logger.error(`[SYNC INFOSINISTROS] Erro assíncrono E20: ${err.message}`)
        );
      });
    }

    const duracaoTotal = Date.now() - startTime;
    logger.info(`[E20] Orquestração para placa ${cleanPlaca} concluída com sucesso em ${duracaoTotal}ms`);

    return cleanObject({
      placa: cleanPlaca,
      chassi: dadosVeiculo.chassi,
      renavam: dadosVeiculo.renavam,
      contingenciaRenavamAplicada,
      custoInternoTotal,
      veiculo: dadosVeiculo,
      roubo_furto: cardRouboFurto,
      locadoras: cardLocadoras,
      seguradoras: cardSeguradoras,
      frota_publica: cardFrotaPublica,
      financeiras: {
        status: registrosFinanceiras.length > 0 ? 'positivo' : 'negativo',
        total: registrosFinanceiras.length,
        registros: registrosFinanceiras
      },
      proprietarios: {
        total: historicoFormatado.length,
        proprietario_atual: propAtualFormatado,
        historico: historicoFormatado
      },
      outros_produtos: {
        leiloes: infoResult?.resultados?.P11?.status === 'positivo' ? infoResult.resultados.P11.conteudo : null,
        salvados: infoResult?.resultados?.P8?.status === 'positivo' ? infoResult.resultados.P8.conteudo : null,
        sinistro_recuperado: infoResult?.resultados?.P19?.status === 'positivo' ? infoResult.resultados.P19.conteudo : (infoResult?.resultados?.P20?.status === 'positivo' ? infoResult.resultados.P20.conteudo : null),
        historico_km: infoResult?.resultados?.P21?.status === 'positivo' ? infoResult.resultados.P21.conteudo : null,
        laudo_cautelar: infoResult?.resultados?.P22?.status === 'positivo' ? infoResult.resultados.P22.conteudo : null,
        banco_imagens: infoResult?.resultados?.P25?.status === 'positivo' ? infoResult.resultados.P25.conteudo : null,
        demanda_judicial: infoResult?.resultados?.P28?.status === 'positivo' ? infoResult.resultados.P28.conteudo : (infoResult?.resultados?.P29?.status === 'positivo' ? infoResult.resultados.P29.conteudo : null),
        csv: infoResult?.resultados?.P30?.status === 'positivo' ? infoResult.resultados.P30.conteudo : null,
        fipe: infoResult?.resultados?.P36?.status === 'positivo' ? infoResult.resultados.P36.conteudo : null
      },
      raw_sources: {
        infosinistrosSuccess: infoSinistrosSettled.status === 'fulfilled' && Boolean(infoResult?.sucesso),
        e5Success: e5Settled.status === 'fulfilled',
        e2Success: e2Settled.status === 'fulfilled',
        e19Triggered: contingenciaRenavamAplicada
      }
    });
  }
}

export const e20Service = new E20Service();
