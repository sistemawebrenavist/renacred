import { logger } from '../utils/logger';
import { infosinistrosService, InfoSinistrosPreVistoriaResponse } from './infosinistrosService';
import { fetchbrasilService } from './fetchbrasil.service';
import { syncVeicularToInfosinistros } from './syncToInfosinistrosService';
import { cleanObject } from './productNormalizers';

export type TipoEntidadeClassificada =
  | 'locadora'
  | 'seguradora'
  | 'frota_publica'
  | 'viatura'
  | 'financeira'
  | 'seguranca_privada'
  | 'religiosa'
  | 'salvados'
  | 'taxi_pcd'
  | 'empresa_privada'
  | 'particular';

export interface E20EntidadeDetectada {
  nome: string;
  documento?: string;
  tipoDocumento?: string;
  tipoEntidade: TipoEntidadeClassificada;
  cnae?: string;
  cnaeDescricao?: string;
  data?: string;
  ordem?: number;
  atual?: boolean;
}

export interface E20IndicadorItem {
  codigo: string;          // e.g. 'P1', 'P2' (não exibido no título do frontend)
  titulo: string;          // Título limpo sem "P1 | " (e.g. 'HISTÓRICO DE VENDA DIRETA/REMARKETING (SEGURADORAS)')
  status: 'positivo' | 'negativo';
  mensagem: string;        // 'NENHUM REGISTRO LOCALIZADO NA BASE INTERNA' ou mensagem do apontamento
  total?: number;
  conteudo?: any;
  fonte?: string;
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
  indicadores: E20IndicadorItem[];
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
    registros: any[];
  };
  seguradoras: {
    status: 'positivo' | 'negativo';
    mensagem: string;
    total: number;
    indenizacaoIntegral: boolean;
    registros: any[];
  };
  frota_publica: {
    status: 'positivo' | 'negativo';
    mensagem: string;
    total: number;
    isViatura: boolean;
    registros: any[];
  };
  financeiras: {
    status: 'positivo' | 'negativo';
    mensagem: string;
    total: number;
    registros: any[];
  };
  proprietarios: {
    total: number;
    proprietario_atual?: any;
    historico: any[];
  };
  fipe?: {
    mesReferencia?: string;
    codigoFipe?: string;
    valor?: string;
    dataConsulta?: string;
  } | null;
  outros_produtos: Record<string, any>;
  raw_sources: {
    infosinistrosSuccess: boolean;
    e5Success: boolean;
    e2Success: boolean;
    e19Triggered: boolean;
  };
}

/**
 * Catálogo Oficial de Títulos de Indicadores InfoSinistros (sem prefixos técnicos P1, P2...)
 */
export const INFOSINISTROS_TITULOS: Record<string, string> = {
  P1: 'HISTÓRICO DE VENDA DIRETA/REMARKETING (SEGURADORAS)',
  P2: 'HISTÓRICO DE OPERAÇÃO/USO COMO VIATURA POLICIAL (PM, PC, PF, GM)',
  P3: 'HISTÓRICO DE EX-FROTA PÚBLICA',
  P4: 'HISTÓRICO DE EX-FROTA DE LOCADORA',
  P5: 'HISTÓRICO DE EX-FROTA DE ENTIDADE RELIGIOSA',
  P6: 'HISTÓRICO DE EX-FROTA DE SEGURANÇA PRIVADA',
  P7: 'HISTÓRICO DE VENDA DIRETA / REMARKETING POR BANCOS / FINANCEIRAS',
  P8: 'HISTÓRICO DE COMERCIALIZAÇÃO EM LOJAS DE SALVADOS',
  P9: 'HISTÓRICO DE RESTRIÇÃO PARA EMISSÃO DE APÓLICE DE SEGUROS',
  P10: 'HISTÓRICO DE BOLETINS DE ROUBO E FURTO E OCORRÊNCIAS DIVERSAS',
  P11: 'HISTÓRICO DE NOTIFICAÇÃO/OFERTA EM EDITAL ELETRÔNICO DE LEILÃO',
  P12: 'HISTÓRICO DE ACIDENTES DE TRÂNSITO',
  P13: 'HISTÓRICO DE ACIDENTES DE TRÂNSITO DETALHADO',
  P14: 'INDENIZAÇÃO INTEGRAL POR CIA SEGURADORA',
  P15: 'HISTÓRICO DE DANOS E AVARIAS',
  P16: 'SUSPEITA DE CHASSI ADULTERADO',
  P17: 'HISTÓRICO DE PROPRIETÁRIOS',
  P18: 'VEÍCULO UTILIZADO PARA COMETIMENTO DE CRIMES',
  P19: 'HISTÓRICO DE RECUPERADO DE SINISTRO (BRF)',
  P20: 'HISTÓRICO DE SINISTRO RECUPERADO (ACT)',
  P21: 'HISTÓRICO DE KM',
  P22: 'HISTÓRICO DE LAUDO CAUTELAR',
  P23: 'HISTÓRICO DE FROTA DE EMPRESA PRIVADA',
  P24: 'INDICADOR DE EXPOSIÇÃO A SINISTRO E INTEGRIDADE DE COMPONENTES',
  P25: 'BANCO DE IMAGENS DE FLAGRANTES DE TRÂNSITO',
  P26: 'HISTÓRICO DE ATENDIMENTO A SINISTROS',
  P27: 'INDÍCIO DE USO COMO TÁXI/PCD',
  P28: 'HISTÓRICO DE DEMANDA JUDICIAL BÁSICO',
  P29: 'HISTÓRICO DE DEMANDA JUDICIAL DETALHADO',
  P30: 'HISTÓRICO DE EMISSÃO DE CERTIFICADO DE SEGURANÇA VEICULAR (CSV)',
  P31: 'HISTÓRICO DE CIRCULAÇÃO',
  P32: 'HISTÓRICO DE MOVIMENTAÇÃO / ALTERAÇÃO DE CADASTRO',
  P33: 'VERIFICAÇÃO DE ALTERAÇÃO DE CARACTERÍSTICAS',
  P34: 'INDÍCIO DE GRANDES FROTISTAS',
  P35: 'FICHA TÉCNICA E CADASTRO BIN FABRIL',
  P36: 'HISTÓRICO DE VALOR DE MERCADO (FIPE)',
  P37: 'HISTÓRICO DE PROPRIETÁRIOS PAGANTES DO DPVAT (ONLINE)'
};

/**
 * Classificador inteligente de entidades a partir de nomes, documentos e CNAE de proprietários
 */
export function classificarEntidadeProprietario(
  nomeBruto?: string,
  docBruto?: string,
  cnaeBruto?: string,
  cnaeDescBruto?: string
): TipoEntidadeClassificada {
  const nome = String(nomeBruto || '').toUpperCase().trim();
  const docLimpo = String(docBruto || '').replace(/\D/g, '');
  const cnae = String(cnaeBruto || '').replace(/\D/g, '');
  const cnaeDesc = String(cnaeDescBruto || '').toUpperCase().trim();

  if (!nome && !docLimpo) return 'particular';
  if (docLimpo.length === 11) return 'particular';

  // 1. Viatura Policial / Segurança Pública (P2)
  const regexViatura = /\b(POLICIA|POLICIA MILITAR|POLICIA CIVIL|POLICIA FEDERAL|POLICIA RODOVIARIA|GUARDA MUNICIPAL|CORPO DE BOMBEIROS|PMERJ|PMESP|PMMG|PMPR|PMSC|PMRJ|PCERJ|PCESP|PCMG|PF |PRF|SEGURANCA PUBLICA)\b/i;
  if (regexViatura.test(nome) || regexViatura.test(cnaeDesc)) {
    return 'viatura';
  }

  // 2. Locadoras de Veículos (P4)
  const regexLocadora = /\b(LOCADORA|RENT A CAR|LOCACAO DE VEICULOS|LOCADORA DE VEICULOS|MOVIDA|LOCALIZA|UNIDAS|LOCAMERICA|OURO VERDE|LEADIS|VAMOS LOCACAO|FROTA LOCADORA|ALUGA|RENTAL|CAR RENTAL|FROTA)\b/i;
  const cnpjsLocadorasConhecidas = new Set([
    '16670085000155', // Localiza Fleet
    '04437534000130', // Unidas
    '07976147000160', // Movida
    '00604122000197', // Locamerica
    '18059880000154', // Ouro Verde
  ]);
  const isCnaeLocadora = cnae.startsWith('7711') || cnaeDesc.includes('LOCACAO DE AUTOMOVEIS') || cnaeDesc.includes('LOCADORA');
  if (regexLocadora.test(nome) || cnpjsLocadorasConhecidas.has(docLimpo) || isCnaeLocadora) {
    return 'locadora';
  }

  // 3. Seguradoras (P1, P14)
  const regexSeguradora = /\b(SEGURADORA|SEGUROS|COMPANHIA DE SEGUROS|CIA DE SEGUROS|PORTO SEGURO|BRADESCO AUTO|BRADESCO SEGUROS|TOKIO MARINE|AZUL SEGUROS|MAPFRE|ALLIANZ|SUL AMERICA|SULAMERICA|HDI SEGUROS|LIBERTY|SOMPO|ZURICH|CHUBB|ITAU SEGUROS|CAIXA SEGURADORA|ALFA SEGUROS|SUHAI)\b/i;
  const isCnaeSeguradora = cnae.startsWith('6511') || cnae.startsWith('6512') || cnaeDesc.includes('SEGURO');
  if (regexSeguradora.test(nome) || isCnaeSeguradora) {
    return 'seguradora';
  }

  // 4. Bancos, Financeiras & Leasing (P7)
  const regexFinanceira = /\b(BANCO|FINANCEIRA|LEASING|ARRENDAMENTO MERCANTIL|BV FINANCEIRA|SANTANDER|ITAU|BRADESCO FINANCIAMENTOS|SAFRA|PANAMERICANO|BANCO PAN|OMNI|AYMORE|CREDITAS|DIBENS LEASING|FINANCIAMENTO)\b/i;
  const isCnaeFinanceira = cnae.startsWith('6491') || cnae.startsWith('6422') || cnae.startsWith('6424') || cnae.startsWith('6431') || cnae.startsWith('6432') || cnaeDesc.includes('ARRENDAMENTO MERCANTIL') || cnaeDesc.includes('LEASING') || cnaeDesc.includes('FINANCEIRA');
  if (regexFinanceira.test(nome) || isCnaeFinanceira) {
    return 'financeira';
  }

  // 5. Órgãos Públicos / Frota Pública (P3)
  const regexFrotaPublica = /\b(PREFEITURA|MUNICIPIO DE|ESTADO DE|GOVERNO DO ESTADO|SECRETARIA DE|SECRETARIA DA|MINISTERIO|CAMARA MUNICIPAL|TRIBUNAL|FUNDO MUNICIPAL|AUTARQUIA|RECEITA FEDERAL|DNIT|DER |DEPARTAMENTO DE ESTRADAS)\b/i;
  const isCnaePublico = cnae.startsWith('8411') || cnae.startsWith('8412') || cnaeDesc.includes('ADMINISTRACAO PUBLICA');
  if (regexFrotaPublica.test(nome) || isCnaePublico) {
    return 'frota_publica';
  }

  // 6. Entidade Religiosa (P5)
  const regexReligiosa = /\b(IGREJA|MITRA|DIOCESE|CONGREGACAO|ASSOCIACAO RELIGIOSA|PAROQUIA|TEMPLO|EVANGELICA|CATOLICA|BATISTA|ADVENTISTA|PRESBITERIANA|ESPIRITA)\b/i;
  const isCnaeReligioso = cnae.startsWith('9491') || cnaeDesc.includes('RELIGIOS');
  if (regexReligiosa.test(nome) || isCnaeReligioso) {
    return 'religiosa';
  }

  // 7. Segurança Privada (P6)
  const regexSeguranca = /\b(SEGURANCA PRIVADA|VIGILANCIA|TRANSPORTE DE VALORES|PROSEGUR|BRINKS|PROTEGE|SEGURANCA PATRIMONIAL)\b/i;
  const isCnaeSeguranca = cnae.startsWith('8011') || cnae.startsWith('8012') || cnaeDesc.includes('VIGILANCIA') || cnaeDesc.includes('SEGURANCA PRIVADA');
  if (regexSeguranca.test(nome) || isCnaeSeguranca) {
    return 'seguranca_privada';
  }

  // 8. Lojas de Salvados (P8)
  const regexSalvados = /\b(SALVADOS|AUTO SALVADOS|COMERCIO DE SALVADOS|PECAS SALVADOS)\b/i;
  if (regexSalvados.test(nome) || cnaeDesc.includes('SALVADOS')) {
    return 'salvados';
  }

  // 9. Táxi / PCD (P27)
  const regexTaxi = /\b(TAXI|RADIO TAXI|PCD|TRANSPORTE DE PASSAGEIROS INDIVIDUAL)\b/i;
  const isCnaeTaxi = cnae.startsWith('4923') || cnaeDesc.includes('TAXI');
  if (regexTaxi.test(nome) || isCnaeTaxi) {
    return 'taxi_pcd';
  }

  // 10. Empresa Privada (P23)
  if (docLimpo.length === 14) {
    return 'empresa_privada';
  }

  return 'particular';
}

export class E20Service {
  /**
   * Executa a composição completa do Produto E20:
   * 1. 100% da Pré-Vistoria via InfoSinistros (Admin API Key)
   * 2. Contingência E19 (placa_df) caso a BIN interna não traga RENAVAM (custo R$ 0,04)
   * 3. Histórico de Roubo e Furto oficial (E5: renavam_ocorrencia com contingência ocorrencias_senatran)
   * 4. Histórico de Proprietários oficial (E2: historico_proprietario com enriquecimento CNPJ/CNAE)
   * 5. Análise de CNPJ/CNAE com motor De/Para espelhado nos cartões de sinistros e frotas
   * 6. Consolidação completa dos indicadores P1 a P34 sem prefixos técnicos no título
   */
  async executarConsultaE20(placa: string): Promise<E20ConsolidadoResponse> {
    const cleanPlaca = placa.replace(/[^A-Z0-9]/gi, '').toUpperCase();
    const startTime = Date.now();
    logger.info(`[E20] Iniciando orquestração consolidada E20 para placa ${cleanPlaca}...`);

    let custoInternoTotal = 0.27; // Base padrão: E5 (0.10) + E2 (0.17)
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
      logger.warn(`[E20] E5 (Roubo/Furto) falhou para ${cleanPlaca}: ${(e5Settled as any).reason?.message}`);
    }
    if (e2Settled.status === 'rejected') {
      logger.warn(`[E20] E2 (Proprietários) falhou para ${cleanPlaca}: ${(e2Settled as any).reason?.message}`);
    }

    // 2. Extrair dados da BIN Fabril (P35 da InfoSinistros)
    const p35Bruto = infoResult?.resultados?.P35?.conteudo || {};
    let renavamFinal = p35Bruto.renavam && String(p35Bruto.renavam).trim() !== '' && String(p35Bruto.renavam).toUpperCase() !== 'NADA CONSTA'
      ? String(p35Bruto.renavam).trim()
      : null;

    // 3. Regra de Negócio: Garantia de RENAVAM via placa_df (E19)
    // "Se a nossa bin interna nao tiver renavam, pegar o renavam no placa_df ao custo de R$0,04"
    let dadosPlacaDf: any = null;
    if (!renavamFinal) {
      logger.info(`[E20] RENAVAM não localizado na BIN interna para ${cleanPlaca}. Acionando contingência placa_df (E19)...`);
      try {
        const e19Result = await fetchbrasilService.consultarProdutoComContingencia('E19', cleanPlaca);
        dadosPlacaDf = e19Result?.normalized?.dados;
        const renavamE19 = dadosPlacaDf?.renavam || dadosPlacaDf?.vehicle?.renavam;
        if (renavamE19 && String(renavamE19).trim() !== '') {
          renavamFinal = String(renavamE19).trim();
          contingenciaRenavamAplicada = true;
          custoInternoTotal += 0.04;
          logger.info(`[E20] RENAVAM recuperado com sucesso via placa_df: ${renavamFinal}`);
        }
      } catch (e19Err: any) {
        logger.warn(`[E20] Contingência placa_df (E19) falhou para ${cleanPlaca}: ${e19Err.message}`);
      }
    }

    // Se o E2 trouxer renavam e ainda estiver nulo, usar como fallback
    if (!renavamFinal && e2Result?.normalized?.dados?.renavam) {
      renavamFinal = String(e2Result.normalized.dados.renavam).trim();
    }

    // Ficha Técnica do Veículo (P35 enriquecido com placa_df / E5)
    const dadosVeiculo = {
      placa: cleanPlaca,
      placaModeloAntigo: p35Bruto.placaModeloAntigo || p35Bruto.placa || cleanPlaca,
      placaModeloNovo: p35Bruto.placaModeloNovo || null,
      chassi: p35Bruto.chassi || dadosPlacaDf?.chassi || dadosPlacaDf?.vehicle?.chassis || e5Result?.normalized?.dados?.chassi || null,
      renavam: renavamFinal || null,
      motor: p35Bruto.motor || null,
      marca: p35Bruto.marca || dadosPlacaDf?.vehicle?.model?.name?.split('/')[0] || null,
      modelo: p35Bruto.modelo || dadosPlacaDf?.vehicle?.model?.name || null,
      marcaModelo: p35Bruto.marcaModelo || dadosPlacaDf?.vehicle?.model?.name || [p35Bruto.marca, p35Bruto.modelo].filter(Boolean).join(' ') || null,
      anoFabricacao: p35Bruto.anoFabricacao || dadosPlacaDf?.vehicle?.model?.yearManufacture || null,
      anoModelo: p35Bruto.anoModelo || dadosPlacaDf?.vehicle?.model?.year || null,
      cor: p35Bruto.cor || dadosPlacaDf?.vehicle?.model?.color || null,
      combustivel: p35Bruto.combustivel || dadosPlacaDf?.vehicle?.model?.fuel || null,
      potencia: p35Bruto.potencia || null,
      cilindradas: p35Bruto.cilindradas || null,
      pesoBrutoTotal: p35Bruto.pesoBrutoTotal || null,
      capacidadeCarga: p35Bruto.capacidadeCarga || null,
      qtdPax: p35Bruto.qtdPax || null,
      eixos: p35Bruto.eixos || null,
      nacionalidade: p35Bruto.nacionalidade || null,
      especieVeiculo: p35Bruto.especieVeiculo || dadosPlacaDf?.vehicle?.model?.kind || null,
      tipoVeiculo: p35Bruto.tipoVeiculo || dadosPlacaDf?.vehicle?.model?.type || null,
      carroceria: p35Bruto.carroceria || null,
      tipoMontagem: p35Bruto.tipoMontagem || null,
      situacaoChassi: p35Bruto.situacaoChassi || null,
      situacaoVeiculo: p35Bruto.situacaoVeiculo || dadosPlacaDf?.vehicle?.situation || 'CIRCULACAO',
      municipio: p35Bruto.municipio || dadosPlacaDf?.vehicle?.state || null,
      uf: p35Bruto.uf || p35Bruto.ufPlaca || dadosPlacaDf?.vehicle?.state || null,
      faturadoCnpj: p35Bruto.faturadoCnpj || null,
      tipoDocFaturado: p35Bruto.tipoDocFaturado || null,
      ufFaturado: p35Bruto.ufFaturado || null,
      dataAtualizacao: p35Bruto.dataAtualizacao || null
    };

    // 4. Analisador da Cadeia Dominial do E2 para Distribuição nos Cards e De/Para
    const historicoE2: any[] = Array.isArray(e2Result?.normalized?.dados?.historico)
      ? e2Result.normalized.dados.historico
      : [];
    const propAtualE2 = e2Result?.normalized?.dados?.proprietario_atual || null;

    // Detectores de entidades
    const locadorasDetectadas: E20EntidadeDetectada[] = [];
    const seguradorasDetectadas: E20EntidadeDetectada[] = [];
    const financeirasDetectadas: E20EntidadeDetectada[] = [];
    const viaturasDetectadas: E20EntidadeDetectada[] = [];
    const frotasPublicasDetectadas: E20EntidadeDetectada[] = [];
    const religiosasDetectadas: E20EntidadeDetectada[] = [];
    const segurancaPrivadaDetectadas: E20EntidadeDetectada[] = [];
    const salvadosDetectados: E20EntidadeDetectada[] = [];
    const taxiPcdDetectados: E20EntidadeDetectada[] = [];
    const empresasPrivadasDetectadas: E20EntidadeDetectada[] = [];

    const registrarEntidade = (classif: TipoEntidadeClassificada, item: E20EntidadeDetectada) => {
      switch (classif) {
        case 'locadora': locadorasDetectadas.push(item); break;
        case 'seguradora': seguradorasDetectadas.push(item); break;
        case 'financeira': financeirasDetectadas.push(item); break;
        case 'viatura': viaturasDetectadas.push(item); break;
        case 'frota_publica': frotasPublicasDetectadas.push(item); break;
        case 'religiosa': religiosasDetectadas.push(item); break;
        case 'seguranca_privada': segurancaPrivadaDetectadas.push(item); break;
        case 'salvados': salvadosDetectados.push(item); break;
        case 'taxi_pcd': taxiPcdDetectados.push(item); break;
        case 'empresa_privada': empresasPrivadasDetectadas.push(item); break;
      }
    };

    // Avaliar proprietário atual
    if (propAtualE2) {
      const classif = classificarEntidadeProprietario(
        propAtualE2.nome || propAtualE2.razao_social,
        propAtualE2.documento,
        propAtualE2.cnae,
        propAtualE2.cnae_descricao
      );
      const item: E20EntidadeDetectada = {
        nome: propAtualE2.nome || propAtualE2.razao_social || 'NÃO INFORMADO',
        documento: propAtualE2.documento,
        tipoDocumento: propAtualE2.tipo,
        tipoEntidade: classif,
        cnae: propAtualE2.cnae,
        cnaeDescricao: propAtualE2.cnae_descricao,
        data: propAtualE2.data,
        atual: true
      };
      registrarEntidade(classif, item);
    }

    // Avaliar histórico anterior
    for (const h of historicoE2) {
      const classif = classificarEntidadeProprietario(
        h.nome || h.razao_social,
        h.documento,
        h.cnae,
        h.cnae_descricao
      );
      const item: E20EntidadeDetectada = {
        nome: h.nome || h.razao_social || 'NÃO INFORMADO',
        documento: h.documento,
        tipoDocumento: h.tipo,
        tipoEntidade: classif,
        cnae: h.cnae,
        cnaeDescricao: h.cnae_descricao,
        data: h.data,
        ordem: h.ordem,
        atual: Boolean(h.atual)
      };
      registrarEntidade(classif, item);
    }

    // 5. CARD DE ROUBO E FURTO (E5 + P10 CONSOLIDADOS)
    const ocorrenciasE5: any[] = Array.isArray(e5Result?.normalized?.dados?.ocorrencias)
      ? e5Result.normalized.dados.ocorrencias
      : [];
    const p10Info = infoResult?.resultados?.P10;
    const listaOcorrenciasConsolidada: any[] = [];

    // Ocorrências oficiais de E5 (FetchBrasil: renavam_ocorrencia / ocorrencias_senatran)
    for (const oc of ocorrenciasE5) {
      listaOcorrenciasConsolidada.push({
        tipo: oc.tipo || oc.descricao || 'OCORRÊNCIA POLICIAL',
        data: oc.data,
        ano: oc.ano,
        municipio: oc.municipio,
        uf: oc.uf,
        numero_boletim: oc.numero_boletim || oc.boletim,
        orgao_seguranca: oc.orgao_seguranca || oc.delegacia || oc.orgao,
        descricao: oc.descricao || oc.historico,
        fonte: 'Bases Policiais' as const
      });
    }

    // Ocorrências da base interna de P10
    if (p10Info && p10Info.status === 'positivo' && p10Info.conteudo) {
      const itensP10 = Array.isArray(p10Info.conteudo) ? p10Info.conteudo : [p10Info.conteudo];
      for (const item of itensP10) {
        if (!item) continue;
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
        : 'NENHUM REGISTRO LOCALIZADO NA BASE INTERNA',
      totalOcorrencias: listaOcorrenciasConsolidada.length,
      ocorrencias: listaOcorrenciasConsolidada
    };

    // 6. CARD DE PROPRIETÁRIOS (P17) FORMATADO
    const historicoFormatado = historicoE2.map((item) => {
      const classif = classificarEntidadeProprietario(
        item.nome || item.razao_social,
        item.documento,
        item.cnae,
        item.cnae_descricao
      );
      return {
        ...item,
        classificacaoEntidade: classif
      };
    });

    const propAtualFormatado = propAtualE2 ? {
      ...propAtualE2,
      classificacaoEntidade: classificarEntidadeProprietario(
        propAtualE2.nome || propAtualE2.razao_social,
        propAtualE2.documento,
        propAtualE2.cnae,
        propAtualE2.cnae_descricao
      )
    } : null;

    // Se o E2 não retornou proprietários, verificar se a InfoSinistros tem P37 ou P17
    let totalProprietarios = historicoFormatado.length;
    let listaProprietariosConsolidada = historicoFormatado;
    if (totalProprietarios === 0 && infoResult?.resultados?.P37?.conteudo) {
      const dpvatItens = Array.isArray(infoResult.resultados.P37.conteudo)
        ? infoResult.resultados.P37.conteudo
        : [infoResult.resultados.P37.conteudo];
      listaProprietariosConsolidada = dpvatItens.map((d: any, idx: number) => ({
        ordem: d.ordem || idx + 1,
        nome: d.nome || 'PROPRIETÁRIO REGISTRADO',
        documento: d.documento,
        data: d.data,
        municipio: d.municipio_uf?.split('/')[0]?.trim(),
        uf: d.municipio_uf?.split('/')[1]?.trim(),
        atual: Boolean(d.atual),
        classificacaoEntidade: classificarEntidadeProprietario(d.nome, d.documento)
      }));
      totalProprietarios = listaProprietariosConsolidada.length;
    }

    const cardProprietarios = {
      total: totalProprietarios,
      proprietario_atual: propAtualFormatado || (listaProprietariosConsolidada.find(p => p.atual) || listaProprietariosConsolidada[0] || null),
      historico: listaProprietariosConsolidada
    };

    // 7. REGISTROS ESPECÍFICOS DE LOCADORAS, SEGURADORAS, FROTAS E FINANCEIRAS
    // Locadoras (P4 + E2)
    const registrosLocadoras: any[] = [];
    const p4Info = infoResult?.resultados?.P4;
    if (p4Info && p4Info.status === 'positivo' && p4Info.conteudo) {
      const itens = Array.isArray(p4Info.conteudo) ? p4Info.conteudo : [p4Info.conteudo];
      for (const it of itens) {
        if (!it) continue;
        registrosLocadoras.push({
          empresa: typeof it === 'string' ? it : it.empresa || it.razao_social || it.nome || 'LOCADORA IDENTIFICADA',
          documento: it.cnpj || it.documento,
          data: it.data || it.periodo,
          detalhes: it.detalhes || it.observacao,
          fonte: 'Base Cadastral de Frotas'
        });
      }
    }
    for (const loc of locadorasDetectadas) {
      const jaExiste = registrosLocadoras.some(r => (loc.documento && r.documento === loc.documento) || r.empresa?.includes(loc.nome?.substring(0, 8)));
      if (!jaExiste) {
        registrosLocadoras.push({
          empresa: loc.nome,
          documento: loc.documento,
          data: loc.data ? `Posse registrada em ${loc.data}` : undefined,
          cnae: loc.cnae,
          detalhes: loc.atual ? 'Titular Vigente' : 'Proprietário Anterior',
          fonte: 'Histórico Dominial E2'
        });
      }
    }

    // Seguradoras (P1 + P14 + E2)
    const registrosSeguradoras: any[] = [];
    let indenizacaoIntegral = false;
    const p1Info = infoResult?.resultados?.P1;
    const p14Info = infoResult?.resultados?.P14;
    if (p1Info && p1Info.status === 'positivo' && p1Info.conteudo) {
      const itens = Array.isArray(p1Info.conteudo) ? p1Info.conteudo : [p1Info.conteudo];
      for (const it of itens) {
        if (!it) continue;
        registrosSeguradoras.push({
          seguradora: typeof it === 'string' ? it : it.razao_social || it.nome || it.seguradora || 'SEGURADORA REGISTRADA',
          tipoEvento: 'Venda Direta / Remarketing',
          ano: it.ano || it.periodo,
          fonte: 'Registro de Remarketing / Salvados'
        });
      }
    }
    if (p14Info && p14Info.status === 'positivo' && p14Info.conteudo) {
      indenizacaoIntegral = true;
      const itens = Array.isArray(p14Info.conteudo) ? p14Info.conteudo : [p14Info.conteudo];
      for (const it of itens) {
        if (!it) continue;
        registrosSeguradoras.push({
          seguradora: typeof it === 'string' ? it : it.seguradora || it.razao_social || 'CIA SEGURADORA',
          tipoEvento: 'Indenização Integral de Sinistro',
          ano: it.ano,
          data: it.data,
          detalhes: 'Veículo indenizado integralmente por sinistro/perda',
          fonte: 'Registro de Remarketing / Salvados'
        });
      }
    }
    for (const seg of seguradorasDetectadas) {
      const jaExiste = registrosSeguradoras.some(r => (seg.documento && r.documento === seg.documento) || r.seguradora?.includes(seg.nome?.substring(0, 8)));
      if (!jaExiste) {
        registrosSeguradoras.push({
          seguradora: seg.nome,
          documento: seg.documento,
          tipoEvento: 'Titularidade em Carteira de Seguradora',
          data: seg.data ? `Transferência registrada em ${seg.data}` : undefined,
          detalhes: seg.atual ? 'Titular Vigente' : 'Proprietário Anterior',
          fonte: 'Histórico Dominial E2'
        });
      }
    }

    // Frotas Públicas e Viaturas (P2 + P3 + E2)
    const registrosFrotaPublica: any[] = [];
    let isViatura = viaturasDetectadas.length > 0;
    const p2Info = infoResult?.resultados?.P2;
    const p3Info = infoResult?.resultados?.P3;
    if (p2Info && p2Info.status === 'positivo') {
      isViatura = true;
      registrosFrotaPublica.push({
        orgao: typeof p2Info.conteudo === 'string' ? p2Info.conteudo : 'OPERAÇÃO COMO VIATURA POLICIAL / SEGURANÇA PÚBLICA',
        tipoUso: 'Viatura Policial / Operação Severa',
        fonte: 'Base de Frotas Públicas'
      });
    }
    if (p3Info && p3Info.status === 'positivo' && p3Info.conteudo) {
      const itens = Array.isArray(p3Info.conteudo) ? p3Info.conteudo : [p3Info.conteudo];
      for (const it of itens) {
        if (!it) continue;
        registrosFrotaPublica.push({
          orgao: typeof it === 'string' ? it : it.orgao || it.ente_publico || 'ÓRGÃO PÚBLICO IDENTIFICADO',
          tipoUso: 'Ex-Frota Pública Governamental',
          data: it.data || it.periodo,
          fonte: 'Base de Frotas Públicas'
        });
      }
    }
    for (const v of viaturasDetectadas) {
      registrosFrotaPublica.push({
        orgao: v.nome,
        documento: v.documento,
        tipoUso: 'Operação Policial / Segurança Pública',
        data: v.data,
        fonte: 'Histórico Dominial E2'
      });
    }
    for (const pub of frotasPublicasDetectadas) {
      registrosFrotaPublica.push({
        orgao: pub.nome,
        documento: pub.documento,
        tipoUso: 'Órgão Público na Cadeia Dominial',
        data: pub.data,
        fonte: 'Histórico Dominial E2'
      });
    }

    // Bancos / Financeiras / Leasing (P7 + E2)
    const registrosFinanceiras: any[] = [];
    const p7Info = infoResult?.resultados?.P7;
    if (p7Info && p7Info.status === 'positivo' && p7Info.conteudo) {
      const itens = Array.isArray(p7Info.conteudo) ? p7Info.conteudo : [p7Info.conteudo];
      for (const it of itens) {
        if (!it) continue;
        registrosFinanceiras.push({
          instituicao: typeof it === 'string' ? it : it.instituicao || it.banco || 'BANCO / FINANCEIRA',
          tipo: 'Venda Direta / Remarketing por Financeira',
          data: it.ano || it.data,
          fonte: 'Base Cadastral de Bancos'
        });
      }
    }
    for (const fin of financeirasDetectadas) {
      registrosFinanceiras.push({
        instituicao: fin.nome,
        documento: fin.documento,
        tipo: 'Instituição Financeira / Leasing na Cadeia Dominial',
        data: fin.data,
        fonte: 'Histórico Dominial E2'
      });
    }

    // 8. MOTOR DE CONSOLIDAÇÃO DOS 34 INDICADORES PERICIAIS (P1 a P34)
    // Títulos limpos sem "P1 | ", layout elegante e padronizado:
    // Se negativo: 'NENHUM REGISTRO LOCALIZADO NA BASE INTERNA'
    // Se positivo: detalhes oficiais consolidados
    const construirIndicador = (codigo: string): E20IndicadorItem => {
      const titulo = INFOSINISTROS_TITULOS[codigo] || `INDICADOR ${codigo}`;
      const itemInfo = infoResult?.resultados ? infoResult.resultados[codigo] : null;

      // Casos com De/Para Especializado ou Fontes Oficiais Cruzadas:
      switch (codigo) {
        case 'P1': { // HISTÓRICO DE VENDA DIRETA/REMARKETING (SEGURADORAS)
          const positivo = registrosSeguradoras.length > 0 || itemInfo?.status === 'positivo';
          return {
            codigo,
            titulo,
            status: positivo ? 'positivo' : 'negativo',
            mensagem: positivo
              ? `IDENTIFICADO REGISTRO DE SEGURADORA / REMARKETING (${registrosSeguradoras.length} ocorrência(s))`
              : 'NENHUM REGISTRO LOCALIZADO NA BASE INTERNA',
            conteudo: positivo ? (registrosSeguradoras.length > 0 ? registrosSeguradoras : itemInfo?.conteudo) : null,
            total: positivo ? registrosSeguradoras.length || 1 : 0
          };
        }

        case 'P2': { // HISTÓRICO DE OPERAÇÃO/USO COMO VIATURA POLICIAL
          const positivo = isViatura || itemInfo?.status === 'positivo';
          return {
            codigo,
            titulo,
            status: positivo ? 'positivo' : 'negativo',
            mensagem: positivo
              ? 'IDENTIFICADA OPERAÇÃO SEVERA COMO VIATURA POLICIAL / SEGURANÇA PÚBLICA'
              : 'NENHUM REGISTRO LOCALIZADO NA BASE INTERNA',
            conteudo: positivo ? (viaturasDetectadas.length > 0 ? viaturasDetectadas : itemInfo?.conteudo) : null
          };
        }

        case 'P3': { // HISTÓRICO DE EX-FROTA PÚBLICA
          const positivo = frotasPublicasDetectadas.length > 0 || (itemInfo?.status === 'positivo' && !isViatura);
          return {
            codigo,
            titulo,
            status: positivo ? 'positivo' : 'negativo',
            mensagem: positivo
              ? `IDENTIFICADO USO PÚBLICO GOVERNAMENTAL (${frotasPublicasDetectadas.length} registro(s))`
              : 'NENHUM REGISTRO LOCALIZADO NA BASE INTERNA',
            conteudo: positivo ? (frotasPublicasDetectadas.length > 0 ? frotasPublicasDetectadas : itemInfo?.conteudo) : null
          };
        }

        case 'P4': { // HISTÓRICO DE EX-FROTA DE LOCADORA
          const positivo = registrosLocadoras.length > 0 || itemInfo?.status === 'positivo';
          return {
            codigo,
            titulo,
            status: positivo ? 'positivo' : 'negativo',
            mensagem: positivo
              ? `IDENTIFICADO REGISTRO DE EX-FROTA DE LOCADORA (${registrosLocadoras.length} registro(s))`
              : 'NENHUM REGISTRO LOCALIZADO NA BASE INTERNA',
            conteudo: positivo ? (registrosLocadoras.length > 0 ? registrosLocadoras : itemInfo?.conteudo) : null,
            total: positivo ? registrosLocadoras.length || 1 : 0
          };
        }

        case 'P5': { // HISTÓRICO DE EX-FROTA DE ENTIDADE RELIGIOSA
          const positivo = religiosasDetectadas.length > 0 || itemInfo?.status === 'positivo';
          return {
            codigo,
            titulo,
            status: positivo ? 'positivo' : 'negativo',
            mensagem: positivo
              ? 'IDENTIFICADA TITULARIDADE DE ENTIDADE RELIGIOSA NA CADEIA DOMINIAL'
              : 'NENHUM REGISTRO LOCALIZADO NA BASE INTERNA',
            conteudo: positivo ? (religiosasDetectadas.length > 0 ? religiosasDetectadas : itemInfo?.conteudo) : null
          };
        }

        case 'P6': { // HISTÓRICO DE EX-FROTA DE SEGURANÇA PRIVADA
          const positivo = segurancaPrivadaDetectadas.length > 0 || itemInfo?.status === 'positivo';
          return {
            codigo,
            titulo,
            status: positivo ? 'positivo' : 'negativo',
            mensagem: positivo
              ? 'IDENTIFICADA OPERAÇÃO POR EMPRESA DE SEGURANÇA PRIVADA / VIGILÂNCIA'
              : 'NENHUM REGISTRO LOCALIZADO NA BASE INTERNA',
            conteudo: positivo ? (segurancaPrivadaDetectadas.length > 0 ? segurancaPrivadaDetectadas : itemInfo?.conteudo) : null
          };
        }

        case 'P7': { // HISTÓRICO DE VENDA DIRETA / REMARKETING POR BANCOS / FINANCEIRAS
          const positivo = registrosFinanceiras.length > 0 || itemInfo?.status === 'positivo';
          return {
            codigo,
            titulo,
            status: positivo ? 'positivo' : 'negativo',
            mensagem: positivo
              ? `IDENTIFICADA INSTITUIÇÃO FINANCEIRA OU LEASING (${registrosFinanceiras.length} registro(s))`
              : 'NENHUM REGISTRO LOCALIZADO NA BASE INTERNA',
            conteudo: positivo ? (registrosFinanceiras.length > 0 ? registrosFinanceiras : itemInfo?.conteudo) : null,
            total: positivo ? registrosFinanceiras.length || 1 : 0
          };
        }

        case 'P8': { // HISTÓRICO DE COMERCIALIZAÇÃO EM LOJAS DE SALVADOS
          const positivo = salvadosDetectados.length > 0 || itemInfo?.status === 'positivo';
          return {
            codigo,
            titulo,
            status: positivo ? 'positivo' : 'negativo',
            mensagem: positivo
              ? 'IDENTIFICADO HISTÓRICO DE COMERCIALIZAÇÃO EM LOJAS DE SALVADOS'
              : 'NENHUM REGISTRO LOCALIZADO NA BASE INTERNA',
            conteudo: positivo ? (salvadosDetectados.length > 0 ? salvadosDetectados : itemInfo?.conteudo) : null
          };
        }

        case 'P10': { // HISTÓRICO DE BOLETINS DE ROUBO E FURTO E OCORRÊNCIAS DIVERSAS
          const positivo = cardRouboFurto.status === 'alerta' || cardRouboFurto.status === 'recuperado';
          return {
            codigo,
            titulo,
            status: positivo ? 'positivo' : 'negativo',
            mensagem: cardRouboFurto.mensagem,
            conteudo: positivo ? cardRouboFurto.ocorrencias : null,
            total: cardRouboFurto.totalOcorrencias
          };
        }

        case 'P14': { // INDENIZAÇÃO INTEGRAL POR CIA SEGURADORA
          const positivo = indenizacaoIntegral || itemInfo?.status === 'positivo';
          return {
            codigo,
            titulo,
            status: positivo ? 'positivo' : 'negativo',
            mensagem: positivo
              ? 'IDENTIFICADA INDENIZAÇÃO INTEGRAL POR COMPANHIA SEGURADORA'
              : 'NENHUM REGISTRO LOCALIZADO NA BASE INTERNA',
            conteudo: positivo ? (itemInfo?.conteudo || 'Registro de Indenização Integral detectado') : null
          };
        }

        case 'P17': { // HISTÓRICO DE PROPRIETÁRIOS
          const positivo = cardProprietarios.total > 0;
          return {
            codigo,
            titulo,
            status: positivo ? 'positivo' : 'negativo',
            mensagem: positivo
              ? `CADEIA DOMINIAL AUDITADA (${cardProprietarios.total} proprietário(s) registrado(s))`
              : 'NENHUM REGISTRO LOCALIZADO NA BASE INTERNA',
            conteudo: positivo ? cardProprietarios.historico : null,
            total: cardProprietarios.total
          };
        }

        case 'P23': { // HISTÓRICO DE FROTA DE EMPRESA PRIVADA
          const positivo = empresasPrivadasDetectadas.length > 0 || itemInfo?.status === 'positivo';
          return {
            codigo,
            titulo,
            status: positivo ? 'positivo' : 'negativo',
            mensagem: positivo
              ? `IDENTIFICADA EMPRESA PRIVADA NA CADEIA DOMINIAL (${empresasPrivadasDetectadas.length} registro(s))`
              : 'NENHUM REGISTRO LOCALIZADO NA BASE INTERNA',
            conteudo: positivo ? (empresasPrivadasDetectadas.length > 0 ? empresasPrivadasDetectadas : itemInfo?.conteudo) : null
          };
        }

        case 'P27': { // INDÍCIO DE USO COMO TÁXI/PCD
          const positivo = taxiPcdDetectados.length > 0 || itemInfo?.status === 'positivo';
          return {
            codigo,
            titulo,
            status: positivo ? 'positivo' : 'negativo',
            mensagem: positivo
              ? 'IDENTIFICADO INDÍCIO DE USO COMO TÁXI OU ISENÇÃO PCD'
              : 'NENHUM REGISTRO LOCALIZADO NA BASE INTERNA',
            conteudo: positivo ? (taxiPcdDetectados.length > 0 ? taxiPcdDetectados : itemInfo?.conteudo) : null
          };
        }

        case 'P35': { // FICHA TÉCNICA E CADASTRO BIN FABRIL
          const temDadosBin = Boolean(dadosVeiculo.marcaModelo || dadosVeiculo.modelo || dadosVeiculo.chassi || dadosVeiculo.renavam);
          return {
            codigo,
            titulo,
            status: temDadosBin ? 'positivo' : 'negativo',
            mensagem: temDadosBin
              ? `${dadosVeiculo.marcaModelo || dadosVeiculo.modelo || 'CADASTRO LOCALIZADO'} (Ano ${dadosVeiculo.anoFabricacao || '-'}/${dadosVeiculo.anoModelo || '-'}, Cor ${dadosVeiculo.cor || '-'})`
              : 'NENHUM REGISTRO LOCALIZADO NA BASE INTERNA',
            conteudo: temDadosBin ? dadosVeiculo : null
          };
        }

        case 'P36': { // HISTÓRICO DE VALOR DE MERCADO (FIPE)
          const p36Info = infoResult?.resultados?.P36;
          const fipeValor = p36Info?.conteudo?.valor_medio_fipe || p36Info?.conteudo?.valor;
          const positivo = Boolean(fipeValor) || p36Info?.status === 'positivo';
          return {
            codigo,
            titulo,
            status: positivo ? 'positivo' : 'negativo',
            mensagem: positivo
              ? `${fipeValor || 'VALOR CONSULTADO'} (Código: ${p36Info?.conteudo?.codigo_fipe || '-'}, Ref: ${p36Info?.conteudo?.mes_referencia || '-'})`
              : 'NENHUM REGISTRO LOCALIZADO NA BASE INTERNA',
            conteudo: positivo ? p36Info?.conteudo : null
          };
        }

        case 'P37': { // HISTÓRICO DE PROPRIETÁRIOS PAGANTES DO DPVAT (ONLINE)
          const positivo = itemInfo?.status === 'positivo';
          return {
            codigo,
            titulo,
            status: positivo ? 'positivo' : 'negativo',
            mensagem: positivo
              ? (typeof itemInfo?.conteudo === 'string' ? itemInfo.conteudo : `REGISTRO IDENTIFICADO NA BASE INTERNA`)
              : 'NENHUM REGISTRO LOCALIZADO NA BASE INTERNA',
            conteudo: positivo ? itemInfo?.conteudo : null
          };
        }

        default: {
          // Indicadores nativos da InfoSinistros (P9, P11, P12, P13, P15, P16, P18-P22, P24-P26, P28-P34)
          const positivo = itemInfo?.status === 'positivo';
          return {
            codigo,
            titulo,
            status: positivo ? 'positivo' : 'negativo',
            mensagem: positivo
              ? (typeof itemInfo?.conteudo === 'string' ? itemInfo.conteudo : `REGISTRO IDENTIFICADO NA BASE INTERNA`)
              : 'NENHUM REGISTRO LOCALIZADO NA BASE INTERNA',
            conteudo: positivo ? itemInfo?.conteudo : null
          };
        }
      }
    };

    // 9. Dados Complementares: FIPE (P36)
    const p36Info = infoResult?.resultados?.P36;
    const dadosFipe = p36Info?.status === 'positivo' && p36Info.conteudo ? {
      mesReferencia: p36Info.conteudo.mes_referencia || p36Info.conteudo.mesReferencia,
      codigoFipe: p36Info.conteudo.codigo_fipe || p36Info.conteudo.codigoFipe,
      valor: p36Info.conteudo.valor_medio_fipe || p36Info.conteudo.valor,
      dataConsulta: p36Info.conteudo.data_consulta || p36Info.conteudo.dataConsulta
    } : null;

    // Montar a lista sequencial de indicadores de P1 a P37 completa
    const codigosIndicadores = [
      'P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8', 'P9', 'P10',
      'P11', 'P12', 'P13', 'P14', 'P15', 'P16', 'P17', 'P18', 'P19', 'P20',
      'P21', 'P22', 'P23', 'P24', 'P25', 'P26', 'P27', 'P28', 'P29', 'P30',
      'P31', 'P32', 'P33', 'P34', 'P35', 'P36', 'P37'
    ];

    const listaIndicadores = codigosIndicadores.map(construirIndicador);

    // 10. Sincronização assíncrona em tempo real para a InfoSinistros
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
      indicadores: listaIndicadores,
      roubo_furto: cardRouboFurto,
      locadoras: {
        status: (registrosLocadoras.length > 0 ? 'positivo' : 'negativo') as 'positivo' | 'negativo',
        mensagem: registrosLocadoras.length > 0
          ? `IDENTIFICADO REGISTRO DE EX-FROTA DE LOCADORA (${registrosLocadoras.length} registro(s))`
          : 'NENHUM REGISTRO LOCALIZADO NA BASE INTERNA',
        total: registrosLocadoras.length,
        registros: registrosLocadoras
      },
      seguradoras: {
        status: (registrosSeguradoras.length > 0 ? 'positivo' : 'negativo') as 'positivo' | 'negativo',
        mensagem: registrosSeguradoras.length > 0
          ? `IDENTIFICADO REGISTRO DE SEGURADORA OU SINISTRO (${registrosSeguradoras.length} registro(s))`
          : 'NENHUM REGISTRO LOCALIZADO NA BASE INTERNA',
        total: registrosSeguradoras.length,
        indenizacaoIntegral,
        registros: registrosSeguradoras
      },
      frota_publica: {
        status: (registrosFrotaPublica.length > 0 ? 'positivo' : 'negativo') as 'positivo' | 'negativo',
        mensagem: registrosFrotaPublica.length > 0
          ? `IDENTIFICADO REGISTRO DE USO PÚBLICO / GOVERNAMENTAL (${registrosFrotaPublica.length} registro(s))`
          : 'NENHUM REGISTRO LOCALIZADO NA BASE INTERNA',
        total: registrosFrotaPublica.length,
        isViatura,
        registros: registrosFrotaPublica
      },
      financeiras: {
        status: (registrosFinanceiras.length > 0 ? 'positivo' : 'negativo') as 'positivo' | 'negativo',
        mensagem: registrosFinanceiras.length > 0
          ? `IDENTIFICADA INSTITUIÇÃO FINANCEIRA OU LEASING (${registrosFinanceiras.length} registro(s))`
          : 'NENHUM REGISTRO LOCALIZADO NA BASE INTERNA',
        total: registrosFinanceiras.length,
        registros: registrosFinanceiras
      },
      proprietarios: cardProprietarios,
      fipe: dadosFipe,
      outros_produtos: {
        leiloes: infoResult?.resultados?.P11?.status === 'positivo' ? infoResult.resultados.P11.conteudo : null,
        salvados: infoResult?.resultados?.P8?.status === 'positivo' ? infoResult.resultados.P8.conteudo : null,
        sinistro_recuperado: infoResult?.resultados?.P19?.status === 'positivo' ? infoResult.resultados.P19.conteudo : (infoResult?.resultados?.P20?.status === 'positivo' ? infoResult.resultados.P20.conteudo : null),
        historico_km: infoResult?.resultados?.P21?.status === 'positivo' ? infoResult.resultados.P21.conteudo : null,
        laudo_cautelar: infoResult?.resultados?.P22?.status === 'positivo' ? infoResult.resultados.P22.conteudo : null,
        banco_imagens: infoResult?.resultados?.P25?.status === 'positivo' ? infoResult.resultados.P25.conteudo : null,
        demanda_judicial: infoResult?.resultados?.P28?.status === 'positivo' ? infoResult.resultados.P28.conteudo : (infoResult?.resultados?.P29?.status === 'positivo' ? infoResult.resultados.P29.conteudo : null),
        csv: infoResult?.resultados?.P30?.status === 'positivo' ? infoResult.resultados.P30.conteudo : null,
        fipe: dadosFipe
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
