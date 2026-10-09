import { logger } from '../utils/logger';
import { infosinistrosService, InfoSinistrosPreVistoriaResponse } from './infosinistrosService';
import { fetchbrasilService } from './fetchbrasil.service';
import { syncVeicularToInfosinistros } from './syncToInfosinistrosService';
import { cleanObject } from './productNormalizers';
import { fipeGratisService, FipeResultado } from './fipeGratisService';
import { enrichProprietariosWithCnpj } from './cnpjService';

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
  naturezaJuridica?: string;
  codigoNaturezaJuridica?: string;
  ano?: string;
  data?: string;
  ordem?: number;
  atual?: boolean;
}

export interface E20IndicadorItem {
  codigo: string;          // e.g. 'P1', 'P2' (não exibido no título do frontend)
  titulo: string;          // Título limpo sem "P1 | " (e.g. 'HISTÓRICO DE VENDA DIRETA/REMARKETING (SEGURADORAS)')
  status: 'positivo' | 'negativo';
  consta?: boolean;
  mensagem: string;        // 'NENHUM REGISTRO LOCALIZADO NA BASE INTERNA' ou mensagem do apontamento
  total?: number;
  conteudo?: any;
  detalhes?: any;
  respostaInfoSinistros?: any; // Resposta literal e completa da API InfoSinistros
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
  P17: 'HISTÓRICO DE ALGUNS PROPRIETÁRIOS PAGANTES DO DPVAT',
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
  P36: 'HISTÓRICO DE VALOR DE MERCADO (FIPE)'
};

/**
 * Utilitários de normalização de datas e cálculo de cronologia / tempo de posse
 */
export function parseDateToTimestamp(dInput: any): number {
  if (!dInput) return 0;
  if (dInput instanceof Date) return dInput.getTime();
  const str = String(dInput).trim();
  const brMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (brMatch) {
    const dia = parseInt(brMatch[1], 10);
    const mes = parseInt(brMatch[2], 10) - 1;
    const ano = parseInt(brMatch[3], 10);
    return new Date(Date.UTC(ano, mes, dia)).getTime();
  }
  const isoMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    const ano = parseInt(isoMatch[1], 10);
    const mes = parseInt(isoMatch[2], 10) - 1;
    const dia = parseInt(isoMatch[3], 10);
    return new Date(Date.UTC(ano, mes, dia)).getTime();
  }
  const yearMatch = str.match(/^(\d{4})$/);
  if (yearMatch) {
    const ano = parseInt(yearMatch[1], 10);
    return new Date(Date.UTC(ano, 0, 1)).getTime();
  }
  const parsed = new Date(str).getTime();
  return isNaN(parsed) ? 0 : parsed;
}

export function formatarDataBR(dInput: any): string | null {
  if (!dInput) return null;
  const str = String(dInput).trim();
  const brMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (brMatch) {
    return `${brMatch[1].padStart(2, '0')}/${brMatch[2].padStart(2, '0')}/${brMatch[3]}`;
  }
  const isoMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    return `${isoMatch[3].padStart(2, '0')}/${isoMatch[2].padStart(2, '0')}/${isoMatch[1]}`;
  }
  const yearMatch = str.match(/^(\d{4})$/);
  if (yearMatch) {
    return `01/01/${yearMatch[1]}`;
  }
  const d = new Date(dInput);
  if (!isNaN(d.getTime())) {
    const dia = String(d.getUTCDate()).padStart(2, '0');
    const mes = String(d.getUTCMonth() + 1).padStart(2, '0');
    const ano = d.getUTCFullYear();
    return `${dia}/${mes}/${ano}`;
  }
  return null;
}

export function calcularTempoDePosse(dataInicio: any, dataFim?: any): string {
  const tInicio = parseDateToTimestamp(dataInicio);
  if (!tInicio) return 'Tempo não informado';

  const dInicio = new Date(tInicio);
  const tFim = dataFim ? parseDateToTimestamp(dataFim) : Date.now();
  const dFim = new Date(tFim || Date.now());

  if (dFim.getTime() < dInicio.getTime()) {
    return 'Menos de 1 mês';
  }

  let anos = dFim.getUTCFullYear() - dInicio.getUTCFullYear();
  let meses = dFim.getUTCMonth() - dInicio.getUTCMonth();
  let dias = dFim.getUTCDate() - dInicio.getUTCDate();

  if (dias < 0) {
    meses -= 1;
  }
  if (meses < 0) {
    anos -= 1;
    meses += 12;
  }

  if (anos <= 0 && meses <= 0) {
    return 'Menos de 1 mês';
  }
  if (anos === 0) {
    return `${meses} ${meses === 1 ? 'mês' : 'meses'}`;
  }
  if (meses === 0) {
    return `${anos} ${anos === 1 ? 'ano' : 'anos'}`;
  }
  return `${anos} ${anos === 1 ? 'ano' : 'anos'} e ${meses} ${meses === 1 ? 'mês' : 'meses'}`;
}

export function mascararDocumento(docRaw?: string): string {
  if (!docRaw) return 'NÃO DIVULGADO';
  const limpo = String(docRaw).replace(/\D/g, '');
  if (limpo.length === 11) {
    return `***.${limpo.substring(3, 6)}.${limpo.substring(6, 9)}-**`;
  }
  if (limpo.length === 14) {
    return limpo.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  }
  return String(docRaw).trim();
}

/**
 * Extrai estritamente o ano com 4 dígitos de uma data, string ou número, retornando '-' se ausente
 */
export function extrairApenasAno(valor?: any): string {
  if (!valor) return '-';
  const str = String(valor).trim();
  const match = str.match(/\b(19\d{2}|20\d{2})\b/);
  if (match) return match[1];
  return str.length === 4 && /^\d{4}$/.test(str) ? str : '-';
}

/**
 * Classificador inteligente de entidades a partir de nomes, documentos, CNAE e Natureza Jurídica de proprietários
 */
export function classificarEntidadeProprietario(
  nomeBruto?: string,
  docBruto?: string,
  cnaeBruto?: string,
  cnaeDescBruto?: string,
  naturezaJuridicaBruto?: string,
  codigoNaturezaJuridicaBruto?: string
): TipoEntidadeClassificada {
  const nome = String(nomeBruto || '').toUpperCase().trim();
  const docLimpo = String(docBruto || '').replace(/\D/g, '');
  const cnae = String(cnaeBruto || '').replace(/\D/g, '');
  const cnaeDesc = String(cnaeDescBruto || '').toUpperCase().trim();
  const natJuridica = String(naturezaJuridicaBruto || '').toUpperCase().trim();
  const codNatJuridica = String(codigoNaturezaJuridicaBruto || '').replace(/\D/g, '');

  if (!nome && !docLimpo) return 'particular';
  if (docLimpo.length === 11) return 'particular';

  // CONCLA/IBGE - Grupo 1: Administração Pública (Qualquer código iniciando pelo dígito 1, ex: 101-5, 1015, etc.)
  const isNaturezaPublica =
    codNatJuridica.startsWith('1') ||
    natJuridica.startsWith('1') ||
    /^(1\d{2,3}|1\d{2}-\d)/.test(natJuridica) ||
    natJuridica.includes('ORGAO PUBLICO') ||
    natJuridica.includes('ÓRGÃO PÚBLICO') ||
    natJuridica.includes('ADMINISTRACAO PUBLICA') ||
    natJuridica.includes('ADMINISTRAÇÃO PÚBLICA') ||
    natJuridica.includes('PODER EXECUTIVO') ||
    natJuridica.includes('PODER LEGISLATIVO') ||
    natJuridica.includes('PODER JUDICIARIO') ||
    natJuridica.includes('PODER JUDICIÁRIO') ||
    natJuridica.includes('AUTARQUIA') ||
    natJuridica.includes('FUNDACAO PUBLICA') ||
    natJuridica.includes('FUNDAÇÃO PÚBLICA');

  // 1. Viatura Policial / Segurança Pública (P2)
  const regexViatura = /\b(POLICIA|POLICIA MILITAR|POLICIA CIVIL|POLICIA FEDERAL|POLICIA RODOVIARIA|GUARDA MUNICIPAL|GUARDA CIVIL|GCM|DEFESA CIVIL|CORPO DE BOMBEIROS|PMERJ|PMESP|PMMG|PMPR|PMSC|PMRJ|PCERJ|PCESP|PCMG|PF\b|PRF\b|SEGURANCA PUBLICA|SEGURANÇA PÚBLICA)\b/i;
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
  const regexSeguradora = /\b(SEGURADORA|SEGUROS|COMPANHIA DE SEGUROS|CIA DE SEGUROS|PORTO SEGURO|BRADESCO AUTO|BRADESCO SEGUROS|TOKIO MARINE|AZUL SEGUROS|MAPFRE|ALLIANZ|SUL AMERICA|SULAMERICA|HDI SEGUROS|HDI|LIBERTY|SOMPO|ZURICH|CHUBB|ITAU SEGUROS|CAIXA SEGURADORA|ALFA SEGUROS|SUHAI|BB SEGUROS|YOUSE|WIZE)\b/i;
  const isCnaeSeguradora = cnae.startsWith('6511') || cnae.startsWith('6512') || cnaeDesc.includes('SEGURO');
  if (regexSeguradora.test(nome) || isCnaeSeguradora) {
    return 'seguradora';
  }

  // 4. Bancos, Financeiras & Leasing (P7)
  const regexFinanceira = /\b(BANCO|FINANCEIRA|LEASING|ARRENDAMENTO MERCANTIL|ARRENDAMENTO|BV FINANCEIRA|SANTANDER|ITAU|BRADESCO FINANCIAMENTOS|SAFRA|PANAMERICANO|BANCO PAN|OMNI|AYMORE|CREDITAS|DIBENS LEASING|FINANCIAMENTO|CREDITO|CRÉDITO|CONSORCIO|CONSÓRCIO|PORTOSEG|GMAC|TOYOTA|HONDA|SICREDI|CFI|BCO)\b/i;
  const isCnaeFinanceira = cnae.startsWith('6491') || cnae.startsWith('6422') || cnae.startsWith('6424') || cnae.startsWith('6431') || cnae.startsWith('6432') || cnae.startsWith('6436') || cnae.startsWith('6470') || cnae.startsWith('6492') || cnae.startsWith('6493') || cnaeDesc.includes('ARRENDAMENTO MERCANTIL') || cnaeDesc.includes('LEASING') || cnaeDesc.includes('FINANCEIRA') || cnaeDesc.includes('CONSORCIO');
  if (regexFinanceira.test(nome) || isCnaeFinanceira) {
    return 'financeira';
  }

  // 5. Órgãos Públicos / Frota Pública (P3) - CONCLA Grupo 1, Padrões Oficiais e CNAE 84
  const regexFrotaPublica = /\b(GABINETE|PREFEITO|PREFEITURA|MUNICIPAL|SUBSECRETARIA|SECRETARIA|MINISTERIO|MINISTÉRIO|MIN\s+(DA|DO|DE)\b|GOVERNO|GOVERNADOR|MUNICIPIO|MUNICÍPIO|ESTADO\s+(DE|DO|DA)\b|UNIAO|UNIÃO|CAMARA\s+MUNICIPAL|CÂMARA\s+MUNICIPAL|TRIBUNAL|TJ[A-Z]{2}|TRF\d?|TRE-[A-Z]{2}|TRT\d?|STF|STJ|FUNDO\s+MUNICIPAL|FUNDO\s+PUBLICO|FUNDO\s+PÚBLICO|AUTARQUIA|RECEITA\s+FEDERAL|DNIT|DER\b|DEPARTAMENTO\s+DE\s+ESTRADAS|DEFENSORIA|MINISTERIO\s+PUBLICO|MINISTÉRIO\s+PÚBLICO|MP[A-Z]{2}|CONSELHO\s+TUTELAR|IBAMA|INCRA|FUNAI|INSS|PODER\s+EXECUTIVO|PODER\s+LEGISLATIVO|PODER\s+JUDICIARIO|PODER\s+JUDICIÁRIO|ADMINISTRACAO\s+PUBLICA|ADMINISTRAÇÃO\s+PÚBLICA|ORGAO\s+PUBLICO|ÓRGÃO\s+PÚBLICO)\b/i;
  const isCnaePublico = cnae.startsWith('84') || cnaeDesc.includes('ADMINISTRACAO PUBLICA') || cnaeDesc.includes('ADMINISTRAÇÃO PÚBLICA');
  if (isNaturezaPublica || regexFrotaPublica.test(nome) || isCnaePublico) {
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
  const regexSalvados = /\b(SALVADOS|AUTO SALVADOS|COMERCIO DE SALVADOS|PECAS SALVADOS|SUCATA|SUCATAS|DESMANCHE|SINISTRADOS|SINISTRADO|BATIDOS|BATIDO)\b/i;
  if (regexSalvados.test(nome) || cnaeDesc.includes('SALVADOS')) {
    return 'salvados';
  }

  // 9. Táxi / PCD (P27)
  const regexTaxi = /\b(TAXI|RADIO TAXI|PCD|TRANSPORTE DE PASSAGEIROS INDIVIDUAL)\b/i;
  const isCnaeTaxi = cnae.startsWith('4923') || cnaeDesc.includes('TAXI');
  if (regexTaxi.test(nome) || isCnaeTaxi) {
    return 'taxi_pcd';
  }

  // 10. Empresa Privada (P23) - SOMENTE se NÃO pertencer ao Grupo 1 (Administração Pública)
  if (docLimpo.length === 14) {
    if (isNaturezaPublica) {
      return 'frota_publica';
    }
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
      submodelo: p35Bruto.submodelo || p35Bruto.grupo || null,
      versao: p35Bruto.versao || null,
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
      segmento: p35Bruto.segmento || null,
      subSegmento: p35Bruto.subSegmento || p35Bruto.sub_segmento || null,
      carroceria: p35Bruto.carroceria || null,
      caixaCambio: p35Bruto.caixaCambio || p35Bruto.caixa_cambio || null,
      tipoMontagem: p35Bruto.tipoMontagem || null,
      situacaoChassi: p35Bruto.situacaoChassi || null,
      situacaoVeiculo: p35Bruto.situacaoVeiculo || dadosPlacaDf?.vehicle?.situation || 'CIRCULACAO',
      municipio: p35Bruto.municipio || dadosPlacaDf?.vehicle?.state || null,
      uf: p35Bruto.uf || p35Bruto.ufPlaca || dadosPlacaDf?.vehicle?.state || null,
      // Proprietário registrado da BIN
      proprietarioNome: p35Bruto.proprietario_nome || p35Bruto.nomeProprietario || p35Bruto.proprietario || null,
      proprietarioDocumento: p35Bruto.proprietario_documento || p35Bruto.documentoProprietario || p35Bruto.niProprietario || null,
      tipoDocProp: p35Bruto.tipo_doc_prop || p35Bruto.descricaoTipoProprietario || null,
      dataEmissaoCrv: p35Bruto.data_emissao_crv || p35Bruto.dataEmissaoCrv || null,
      // Faturamento e dados fiscais de origem
      faturadoCnpj: p35Bruto.faturadoCnpj || p35Bruto.faturado_documento || p35Bruto.numeroIdFaturamento || p35Bruto.faturado || null,
      tipoDocFaturado: p35Bruto.tipoDocFaturado || p35Bruto.tipo_doc_faturado || null,
      ufFaturado: p35Bruto.ufFaturado || p35Bruto.uf_faturado || null,
      di: p35Bruto.di || null,
      registroDi: p35Bruto.registroDi || p35Bruto.registro_di || null,
      dataAtualizacao: p35Bruto.dataAtualizacao || null
    };

    // 3.1 Consulta de Contingência Gratuita à Tabela FIPE Oficial (P36)
    let fipeComplementar: FipeResultado | null = null;
    const p36InfoPrevia = infoResult?.resultados?.P36;
    const fipeInternaExiste = Boolean(
      p36InfoPrevia?.status === 'positivo' &&
      (p36InfoPrevia?.conteudo?.valor_medio_fipe || p36InfoPrevia?.conteudo?.valor || p36InfoPrevia?.conteudo?.preco)
    );

    if (!fipeInternaExiste && (dadosVeiculo.marca || dadosVeiculo.modelo || dadosVeiculo.marcaModelo)) {
      try {
        logger.info(`[E20] P36 ausente na base interna. Acionando API gratuita da FIPE para ${dadosVeiculo.marcaModelo || dadosVeiculo.modelo}...`);
        fipeComplementar = await fipeGratisService.consultarFipe({
          marca: dadosVeiculo.marca || undefined,
          modelo: dadosVeiculo.modelo || undefined,
          marcaModelo: dadosVeiculo.marcaModelo || undefined,
          anoModelo: dadosVeiculo.anoModelo || undefined,
          anoFabricacao: dadosVeiculo.anoFabricacao || undefined,
          tipoVeiculo: dadosVeiculo.tipoVeiculo || undefined
        });
        if (fipeComplementar?.sucesso) {
          logger.info(`[E20] FIPE gratuita retornou com sucesso para ${cleanPlaca}: ${fipeComplementar.modelo} -> ${fipeComplementar.valor} (Cód: ${fipeComplementar.codigoFipe})`);
        }
      } catch (errFipe: any) {
        logger.warn(`[E20] Falha ao consultar FIPE gratuita complementar: ${errFipe.message}`);
      }
    }

    // 4. Analisador da Cadeia Dominial Unificada (E2 Oficial + InfoSinistros P17/P37)
    const historicoE2: any[] = Array.isArray(e2Result?.normalized?.dados?.historico)
      ? e2Result.normalized.dados.historico
      : [];
    const propAtualE2 = e2Result?.normalized?.dados?.proprietario_atual || null;

    // Detectores de entidades especializadas
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

    // Coleta preliminar de todos os candidatos de proprietários
    const candidatosBrutos: any[] = [];

    if (propAtualE2) {
      candidatosBrutos.push({
        ...propAtualE2,
        atual: true
      });
    }

    for (const h of historicoE2) {
      candidatosBrutos.push({
        ...h,
        atual: Boolean(h.atual)
      });
    }

    // Integrar registros da InfoSinistros P37 (DPVAT Online incorporado na base interna)
    if (infoResult?.resultados?.P37?.conteudo) {
      const dpvatItens = Array.isArray(infoResult.resultados.P37.conteudo)
        ? infoResult.resultados.P37.conteudo
        : [infoResult.resultados.P37.conteudo];

      for (const d of dpvatItens) {
        if (!d) continue;
        candidatosBrutos.push({
          nome: d.nome || d.proprietario || 'PROPRIETÁRIO REGISTRADO',
          razao_social: d.razao_social || d.nome,
          documento: d.documento || d.cpfcnpj || d.cpf_cnpj,
          data: d.data,
          municipio: d.municipio || d.municipio_uf?.split('/')[0]?.trim(),
          uf: d.uf || d.municipio_uf?.split('/')[1]?.trim(),
          atual: Boolean(d.atual)
        });
      }
    }

    // Integrar registros de proprietários de P17 da InfoSinistros caso existam
    const p17Raw = infoResult?.resultados?.P17?.conteudo;
    if (p17Raw) {
      const p17Lista = Array.isArray(p17Raw)
        ? p17Raw
        : Array.isArray(p17Raw.proprietarios)
          ? p17Raw.proprietarios
          : [p17Raw];

      for (const p of p17Lista) {
        if (!p || typeof p !== 'object') continue;
        candidatosBrutos.push({
          nome: p.nome || p.razao_social || p.proprietario,
          razao_social: p.razao_social || p.nome,
          documento: p.documento || p.cpfcnpj || p.cpf_cnpj,
          data: p.data || p.anopropriedade || p.ano,
          municipio: p.municipio || p.municipio_uf?.split('/')[0]?.trim(),
          uf: p.uf || p.municipio_uf?.split('/')[1]?.trim(),
          atual: Boolean(p.atual)
        });
      }
    }

    // Deduplicação dos proprietários
    const proprietariosDeduplicados: any[] = [];
    for (const cand of candidatosBrutos) {
      const nomeCand = String(cand.nome || cand.razao_social || '').trim().toUpperCase();
      const docLimpo = String(cand.documento || '').replace(/\D/g, '');

      const jaExiste = proprietariosDeduplicados.find((p) => {
        const docExist = String(p.documento || '').replace(/\D/g, '');
        // 1. Coincidência de documento (se ambos tiverem dígitos significativos)
        if (docLimpo && docExist) {
          if (docLimpo === docExist) return true;
          // Se um tiver zeros à esquerda ou máscara parcial, compara os últimos 8 dígitos
          if (docLimpo.length >= 8 && docExist.length >= 8) {
            if (docLimpo.slice(-8) === docExist.slice(-8)) return true;
          }
        }
        // 2. Coincidência de nome completo (se tiver mais de 4 caracteres)
        const nomeExist = String(p.nome || p.razao_social || '').trim().toUpperCase();
        if (nomeCand && nomeExist && nomeCand.length > 4 && nomeExist.length > 4) {
          if (nomeCand === nomeExist) return true;
          // Substring significativa (ex: abreviações leves)
          if (nomeCand.includes(nomeExist) || nomeExist.includes(nomeCand)) return true;
        }
        return false;
      });

      if (!jaExiste) {
        proprietariosDeduplicados.push(cand);
      } else {
        // Enriquecer dados se o novo candidato trouxer campos mais completos
        if (!jaExiste.municipio && cand.municipio) jaExiste.municipio = cand.municipio;
        if (!jaExiste.uf && cand.uf) jaExiste.uf = cand.uf;
        if (!jaExiste.data && cand.data) jaExiste.data = cand.data;
        if (!jaExiste.cnae && cand.cnae) jaExiste.cnae = cand.cnae;
        if (!jaExiste.cnae_descricao && cand.cnae_descricao) jaExiste.cnae_descricao = cand.cnae_descricao;
        if (!jaExiste.natureza_juridica && cand.natureza_juridica) jaExiste.natureza_juridica = cand.natureza_juridica;
        if (!jaExiste.codigo_natureza_juridica && cand.codigo_natureza_juridica) jaExiste.codigo_natureza_juridica = cand.codigo_natureza_juridica;
        if (cand.atual) jaExiste.atual = true;
      }
    }

    // 4.1 Enriquecimento inteligente de CNPJ/Razão Social/Natureza Jurídica/CNAE para todos os proprietários PJ
    try {
      await enrichProprietariosWithCnpj({
        historico: proprietariosDeduplicados
      });
    } catch (errEnrich: any) {
      logger.warn(`[E20] Falha no enriquecimento de CNPJs dominiais: ${errEnrich.message}`);
    }

    // 5. Classificação Dominial e Extração de Entidades (Bancos P7, Seguradoras P1/P14, Locadoras P4, Frotas P2/P3, Salvados P8)
    const proprietariosRegulares: any[] = [];

    for (const p of proprietariosDeduplicados) {
      const nomeProp = p.nome || p.razao_social || 'NÃO INFORMADO';
      const classif = classificarEntidadeProprietario(
        nomeProp,
        p.documento,
        p.cnae,
        p.cnae_descricao,
        p.natureza_juridica || p.naturezaJuridica,
        p.codigo_natureza_juridica || p.codigoNaturezaJuridica
      );

      const entidadeItem: E20EntidadeDetectada = {
        nome: nomeProp,
        documento: p.documento,
        tipoDocumento: p.tipo,
        tipoEntidade: classif,
        cnae: p.cnae,
        cnaeDescricao: p.cnae_descricao,
        naturezaJuridica: p.natureza_juridica || p.naturezaJuridica,
        codigoNaturezaJuridica: p.codigo_natureza_juridica || p.codigoNaturezaJuridica,
        ano: extrairApenasAno(p.data),
        data: p.data,
        atual: Boolean(p.atual)
      };

      let isEntidadeEspecial = false;

      switch (classif) {
        case 'financeira':
          financeirasDetectadas.push(entidadeItem);
          isEntidadeEspecial = true;
          break;
        case 'seguradora':
          seguradorasDetectadas.push(entidadeItem);
          isEntidadeEspecial = true;
          break;
        case 'locadora':
          locadorasDetectadas.push(entidadeItem);
          isEntidadeEspecial = true;
          break;
        case 'viatura':
          viaturasDetectadas.push(entidadeItem);
          isEntidadeEspecial = true;
          break;
        case 'frota_publica':
          frotasPublicasDetectadas.push(entidadeItem);
          isEntidadeEspecial = true;
          break;
        case 'salvados':
          salvadosDetectados.push(entidadeItem);
          isEntidadeEspecial = true;
          break;
        case 'religiosa':
          religiosasDetectadas.push(entidadeItem);
          break;
        case 'seguranca_privada':
          segurancaPrivadaDetectadas.push(entidadeItem);
          break;
        case 'taxi_pcd':
          taxiPcdDetectados.push(entidadeItem);
          break;
        case 'empresa_privada':
          empresasPrivadasDetectadas.push(entidadeItem);
          break;
      }

      // Regra de Negócio InfoSinistros: Entidades com cards dedicados (P7, P1, P4, P2/P3, P8) são filtradas da lista regular P17
      if (!isEntidadeEspecial) {
        proprietariosRegulares.push({
          ...p,
          classificacaoEntidade: classif
        });
      }
    }

    // Safety guard: Se todos os proprietários fossem filtrados, manter os originais para evitar tabela vazia
    const proprietariosParaP17 = proprietariosRegulares.length > 0
      ? proprietariosRegulares
      : proprietariosDeduplicados.map((p) => ({
        ...p,
        classificacaoEntidade: classificarEntidadeProprietario(
          p.nome,
          p.documento,
          p.cnae,
          p.cnae_descricao,
          p.natureza_juridica || p.naturezaJuridica,
          p.codigo_natureza_juridica || p.codigoNaturezaJuridica
        )
      }));

    // Ordenação cronológica por data (do mais antigo para o mais recente / atual)
    proprietariosParaP17.sort((a, b) => {
      const tA = parseDateToTimestamp(a.data);
      const tB = parseDateToTimestamp(b.data);
      return tA - tB;
    });

    // Deduplicação pós-ordenação rigorosa para eliminar qualquer duplicata consecutiva por nome ou documento
    const proprietariosFiltradosUnicos: any[] = [];
    for (const p of proprietariosParaP17) {
      const nomeP = String(p.nome || p.razao_social || '').trim().toUpperCase();
      const docP = String(p.documento || '').replace(/\D/g, '');
      const jaAdicionado = proprietariosFiltradosUnicos.find((exist) => {
        const nomeExist = String(exist.nome || exist.razao_social || '').trim().toUpperCase();
        const docExist = String(exist.documento || '').replace(/\D/g, '');
        if (nomeP && nomeExist && nomeP === nomeExist) return true;
        if (docP && docExist && docP.length >= 8 && docExist.length >= 8 && docP.slice(-8) === docExist.slice(-8)) return true;
        return false;
      });

      if (!jaAdicionado) {
        proprietariosFiltradosUnicos.push(p);
      } else {
        if (p.atual) jaAdicionado.atual = true;
        if (p.municipio && !jaAdicionado.municipio) jaAdicionado.municipio = p.municipio;
        if (p.uf && !jaAdicionado.uf) jaAdicionado.uf = p.uf;
      }
    }

    // Calcular tempo de posse e formatar a lista final de P17
    const historicoFormatadoP17 = proprietariosFiltradosUnicos.map((item, idx) => {
      const proximo = proprietariosFiltradosUnicos[idx + 1];
      const isUltimo = idx === proprietariosFiltradosUnicos.length - 1;
      const tempoPosseCalc = isUltimo
        ? `${calcularTempoDePosse(item.data)}${item.atual ? ' (Vigente)' : ''}`
        : calcularTempoDePosse(item.data, proximo?.data);

      const docMascarado = mascararDocumento(item.documento);
      const dataFormatada = formatarDataBR(item.data) || item.data || '-';

      return {
        ordem: idx + 1,
        nome: item.nome || item.razao_social || 'PROPRIETÁRIO REGISTRADO',
        razao_social: item.nome || item.razao_social,
        documento: docMascarado,
        documentoOriginal: item.documento,
        tipo: item.tipo || (String(item.documento || '').replace(/\D/g, '').length === 14 ? 'Pessoa jurídica' : 'Pessoa física'),
        data: dataFormatada,
        dataRaw: item.data,
        tempoDePosse: tempoPosseCalc,
        tempoPosse: tempoPosseCalc,
        municipio: item.municipio || null,
        uf: item.uf || null,
        municipio_uf: item.municipio && item.uf ? `${item.municipio}/${item.uf}` : (item.municipio || item.uf || null),
        atual: isUltimo ? true : Boolean(item.atual),
        classificacaoEntidade: item.classificacaoEntidade || 'particular',
        cnae: item.cnae,
        cnae_descricao: item.cnae_descricao
      };
    });

    const propAtualFinal = historicoFormatadoP17.find((p) => p.atual) || historicoFormatadoP17[historicoFormatadoP17.length - 1] || null;

    const cardProprietarios = {
      total: historicoFormatadoP17.length,
      proprietario_atual: propAtualFinal,
      historico: historicoFormatadoP17
    };

    // 6. CARD DE ROUBO E FURTO (E5 + P10 CONSOLIDADOS)
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

    // 7. REGISTROS ESPECÍFICOS DE LOCADORAS, SEGURADORAS, FROTAS E BANCOS/FINANCEIRAS
    // Locadoras (P4)
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
      const jaExiste = registrosLocadoras.some((r) => (loc.documento && r.documento === loc.documento) || r.empresa?.includes(loc.nome?.substring(0, 8)));
      if (!jaExiste) {
        const anoCalc = extrairApenasAno(loc.data) !== '-' ? extrairApenasAno(loc.data) : (dadosVeiculo.anoModelo ? String(dadosVeiculo.anoModelo) : '-');
        registrosLocadoras.push({
          empresa: loc.nome,
          documento: loc.documento,
          tipoEntidade: 'locadora',
          ano: String(anoCalc),
          data: loc.data,
          cnae: loc.cnae,
          cnaeDescricao: loc.cnaeDescricao,
          detalhes: loc.atual ? 'Titular Vigente' : 'Proprietário Anterior',
          fonte: 'Histórico Dominial'
        });
      }
    }

    // Seguradoras (P1 - Venda Direta / Remarketing) e Indenização Integral (P14)
    const registrosSeguradoras: any[] = [];
    const registrosIndenizacaoIntegral: any[] = [];
    let indenizacaoIntegral = false;
    const p1Info = infoResult?.resultados?.P1;
    const p14Info = infoResult?.resultados?.P14;
    if (p1Info && p1Info.status === 'positivo' && p1Info.conteudo) {
      const itens = Array.isArray(p1Info.conteudo) ? p1Info.conteudo : [p1Info.conteudo];
      for (const it of itens) {
        if (!it) continue;
        if (typeof it === 'string' && (it.includes('NENHUM REGISTRO') || it.includes('NA BASE INTERNA'))) continue;
        const anoCalc = extrairApenasAno(it.ano || it.data || it.periodo) !== '-'
          ? extrairApenasAno(it.ano || it.data || it.periodo)
          : (dadosVeiculo.anoModelo ? String(dadosVeiculo.anoModelo) : '-');
        registrosSeguradoras.push({
          seguradora: typeof it === 'string' ? it : it.razao_social || it.nome || it.seguradora || 'SEGURADORA REGISTRADA',
          tipoEntidade: 'seguradora',
          tipoEvento: 'Venda Direta / Remarketing',
          ano: String(anoCalc),
          data: it.data || it.periodo,
          fonte: 'Registro de Remarketing / Salvados'
        });
      }
    }
    if (p14Info && p14Info.status === 'positivo' && p14Info.conteudo) {
      indenizacaoIntegral = true;
      const itens = Array.isArray(p14Info.conteudo) ? p14Info.conteudo : [p14Info.conteudo];
      for (const it of itens) {
        if (!it) continue;
        if (typeof it === 'string' && (it.includes('NENHUM REGISTRO') || it.includes('NA BASE INTERNA'))) continue;
        const anoCalc = extrairApenasAno(it.ano || it.data || it.periodo) !== '-'
          ? extrairApenasAno(it.ano || it.data || it.periodo)
          : (dadosVeiculo.anoModelo ? String(dadosVeiculo.anoModelo) : '-');
        registrosIndenizacaoIntegral.push({
          seguradora: typeof it === 'string' ? it : it.seguradora || it.razao_social || 'CIA SEGURADORA',
          tipoEntidade: 'seguradora',
          tipoEvento: 'Indenização Integral de Sinistro',
          ano: String(anoCalc),
          data: it.data,
          detalhes: 'Veículo indenizado integralmente por sinistro/perda',
          fonte: 'Registro de Sinistro / Indenização Integral'
        });
      }
    }
    for (const seg of seguradorasDetectadas) {
      const jaExiste = registrosSeguradoras.some((r) => (seg.documento && r.documento === seg.documento) || r.seguradora?.includes(seg.nome?.substring(0, 8)));
      if (!jaExiste) {
        const anoCalc = extrairApenasAno(seg.data) !== '-'
          ? extrairApenasAno(seg.data)
          : (dadosVeiculo.anoModelo ? String(dadosVeiculo.anoModelo) : '-');
        registrosSeguradoras.push({
          seguradora: seg.nome,
          documento: seg.documento,
          tipoEntidade: 'seguradora',
          tipoEvento: 'Titularidade em Carteira de Seguradora',
          ano: String(anoCalc),
          data: seg.data,
          cnae: seg.cnae,
          cnaeDescricao: seg.cnaeDescricao,
          detalhes: seg.atual ? 'Titular Vigente' : 'Proprietário Anterior',
          fonte: 'Histórico Dominial'
        });
      }
    }

    // Frotas Públicas e Viaturas (P2 + P3) - Estruturas separadas
    const registrosViaturas: any[] = [];
    const registrosFrotaPublica: any[] = [];
    let isViatura = viaturasDetectadas.length > 0;
    const p2Info = infoResult?.resultados?.P2;
    const p3Info = infoResult?.resultados?.P3;

    if (p2Info && p2Info.status === 'positivo') {
      isViatura = true;
      const conteudoP2 = p2Info.conteudo;
      if (Array.isArray(conteudoP2)) {
        for (const it of conteudoP2) {
          if (!it) continue;
          if (typeof it === 'object') {
            registrosViaturas.push({
              orgao: it.orgao || it.ente_publico || it.razao_social || it.nome || 'OPERAÇÃO COMO VIATURA POLICIAL / SEGURANÇA PÚBLICA',
              tipoEntidade: 'viatura',
              tipoUso: 'Viatura Policial / Operação Severa',
              ano: extrairApenasAno(it.ano || it.data || it.periodo),
              data: it.data || it.periodo,
              fonte: 'Base de Frotas Públicas'
            });
          }
        }
      }
      // Se conteudoP2 for string (ex: "ALERTA DE USO SEVERO!..."), NÃO criamos objeto sintético em registrosViaturas.
      // O alerta textual oficial é retornado em rawInfoConteudo / respostaInfoSinistros evitando duplicidade visual.
    }
    for (const v of viaturasDetectadas) {
      registrosViaturas.push({
        orgao: v.nome,
        documento: v.documento,
        tipoEntidade: 'viatura',
        tipoUso: 'Operação Policial / Segurança Pública',
        ano: extrairApenasAno(v.data),
        data: v.data,
        cnae: v.cnae,
        cnaeDescricao: v.cnaeDescricao,
        fonte: 'Histórico Dominial'
      });
    }

    if (p3Info && p3Info.status === 'positivo' && p3Info.conteudo) {
      const itens = Array.isArray(p3Info.conteudo) ? p3Info.conteudo : [p3Info.conteudo];
      for (const it of itens) {
        if (!it) continue;
        const anoCalc = extrairApenasAno(it.ano || it.data || it.periodo) !== '-'
          ? extrairApenasAno(it.ano || it.data || it.periodo)
          : (dadosVeiculo.anoModelo ? String(dadosVeiculo.anoModelo) : '-');
        const orgaoNome = typeof it === 'string'
          ? it
          : it.razaoSocial || it.razao_social || it.orgao || it.ente_publico || it.nome || 'ÓRGÃO PÚBLICO IDENTIFICADO';
        registrosFrotaPublica.push({
          orgao: orgaoNome,
          tipoEntidade: 'frota_publica',
          tipoUso: 'Ex-Frota Pública Governamental',
          ano: String(anoCalc),
          data: it.data || it.periodo,
          uf: it.uf || null,
          detalhes: it.texto || it.detalhes || null,
          fonte: 'Base de Frotas Públicas'
        });
      }
    }
    for (const pub of frotasPublicasDetectadas) {
      const anoCalc = extrairApenasAno(pub.data) !== '-'
        ? extrairApenasAno(pub.data)
        : (dadosVeiculo.anoModelo ? String(dadosVeiculo.anoModelo) : '-');
      const jaExiste = registrosFrotaPublica.some((r) =>
        (pub.documento && r.documento === pub.documento) ||
        r.orgao?.includes(pub.nome?.substring(0, 8)) ||
        pub.nome?.includes(r.orgao?.substring(0, 8))
      );
      if (!jaExiste) {
        registrosFrotaPublica.push({
          orgao: pub.nome,
          documento: pub.documento,
          tipoEntidade: 'frota_publica',
          tipoUso: 'Órgão Público na Cadeia Dominial',
          ano: String(anoCalc),
          data: pub.data,
          cnae: pub.cnae,
          cnaeDescricao: pub.cnaeDescricao,
          fonte: 'Histórico Dominial'
        });
      } else {
        const itemExistente = registrosFrotaPublica.find((r) =>
          r.orgao?.includes(pub.nome?.substring(0, 8)) || pub.nome?.includes(r.orgao?.substring(0, 8))
        );
        if (itemExistente && !itemExistente.documento && pub.documento) {
          itemExistente.documento = pub.documento;
          itemExistente.data = pub.data;
          itemExistente.cnae = pub.cnae;
          itemExistente.cnaeDescricao = pub.cnaeDescricao;
        }
      }
    }

    // Bancos / Financeiras / Leasing (P7) - Layout Oficial de 2 Colunas: Ano | Razão Social
    const registrosFinanceiras: any[] = [];
    const p7Info = infoResult?.resultados?.P7;
    if (p7Info && p7Info.status === 'positivo' && p7Info.conteudo) {
      const itens = Array.isArray(p7Info.conteudo) ? p7Info.conteudo : [p7Info.conteudo];
      for (const it of itens) {
        if (!it) continue;
        const anoCalc = it.ano || (it.data ? formatarDataBR(it.data)?.split('/')[2] || it.data : dadosVeiculo.anoModelo || '-');
        const razaoCalc = it.razao_social || it.instituicao || it.banco || it.nome || 'INSTITUIÇÃO FINANCEIRA';
        registrosFinanceiras.push({
          ano: String(anoCalc),
          razao_social: String(razaoCalc).toUpperCase(),
          instituicao: String(razaoCalc).toUpperCase(),
          tipoEntidade: 'financeira',
          tipo: 'Venda Direta / Remarketing por Financeira',
          data: it.ano || it.data,
          fonte: 'Base Cadastral de Bancos'
        });
      }
    }
    for (const fin of financeirasDetectadas) {
      const anoCalc = fin.data ? formatarDataBR(fin.data)?.split('/')[2] || fin.data : (dadosVeiculo.anoModelo || '-');
      const jaExiste = registrosFinanceiras.some(
        (r) => (fin.documento && r.documento === fin.documento) || r.razao_social?.includes(fin.nome?.substring(0, 8))
      );
      if (!jaExiste) {
        registrosFinanceiras.push({
          ano: String(anoCalc),
          razao_social: String(fin.nome).toUpperCase(),
          instituicao: String(fin.nome).toUpperCase(),
          documento: fin.documento,
          tipoEntidade: 'financeira',
          tipo: 'Instituição Financeira / Leasing na Cadeia Dominial',
          data: fin.data,
          cnae: fin.cnae,
          cnaeDescricao: fin.cnaeDescricao,
          fonte: 'Histórico Dominial'
        });
      }
    }

    // 8. HISTÓRICO DE CIRCULAÇÃO (P31) - ENRIQUECIDO COM CIDADES/UFS DOS PROPRIETÁRIOS
    const p31Info = infoResult?.resultados?.P31?.conteudo || {};
    const ufFaturado = dadosVeiculo.ufFaturado || dadosVeiculo.uf || p31Info.adquirido_0km || null;
    const adquirido0km = ufFaturado ? String(ufFaturado).toUpperCase().trim() : null;

    // Obter cidades distintas da cadeia dominial
    const cidadesDominio: Array<{ municipio: string; uf: string }> = [];
    for (const p of historicoFormatadoP17) {
      if (p.municipio && p.uf) {
        const munNorm = String(p.municipio).toUpperCase().trim();
        const ufNorm = String(p.uf).toUpperCase().trim();
        if (!cidadesDominio.some((c) => c.municipio === munNorm && c.uf === ufNorm)) {
          cidadesDominio.push({ municipio: munNorm, uf: ufNorm });
        }
      }
    }
    if (cidadesDominio.length === 0 && dadosVeiculo.municipio && dadosVeiculo.uf) {
      cidadesDominio.push({
        municipio: String(dadosVeiculo.municipio).toUpperCase().trim(),
        uf: String(dadosVeiculo.uf).toUpperCase().trim()
      });
    }

    const formatarLic = (mun?: string | null, uf?: string | null): string | null => {
      if (mun && uf) return `DETRAN - ${mun.toUpperCase().trim()} - ${uf.toUpperCase().trim()}`;
      if (mun) return `DETRAN - ${mun.toUpperCase().trim()}`;
      if (uf) return `DETRAN - ${uf.toUpperCase().trim()}`;
      return null;
    };

    const lic1 = cidadesDominio[0]
      ? formatarLic(cidadesDominio[0].municipio, cidadesDominio[0].uf)
      : (p31Info.licenciamento_1 || formatarLic(dadosVeiculo.municipio, dadosVeiculo.uf));

    const lic2 = cidadesDominio[1]
      ? formatarLic(cidadesDominio[1].municipio, cidadesDominio[1].uf)
      : (p31Info.licenciamento_2 || null);

    const lic3 = cidadesDominio[2]
      ? formatarLic(cidadesDominio[2].municipio, cidadesDominio[2].uf)
      : (p31Info.licenciamento_3 || null);

    const cardCirculacao = {
      adquirido_0km: adquirido0km,
      licenciamento_1: lic1,
      licenciamento_2: lic2,
      licenciamento_3: lic3
    };

    // 9. HISTÓRICO DE MOVIMENTAÇÃO / ALTERAÇÃO DE CADASTRO (P32) - DADOS OFICIAIS
    const p32Info = infoResult?.resultados?.P32?.conteudo || {};
    let cardMovimentacao: any = null;

    if (p32Info && (p32Info.insercao_renavam || (Array.isArray(p32Info.alteracoes) && p32Info.alteracoes.length > 0))) {
      // Prioridade 1: Dados cadastrais oficiais da InfoSinistros / DETRAN
      const insercao = p32Info.insercao_renavam ? formatarDataBR(p32Info.insercao_renavam) : null;
      const dataSysBR = dadosVeiculo.dataAtualizacao ? formatarDataBR(dadosVeiculo.dataAtualizacao) : null;
      const alteracoesOficiais: any[] = [];

      if (Array.isArray(p32Info.alteracoes)) {
        p32Info.alteracoes.forEach((alt: any) => {
          const dt = formatarDataBR(alt.data || alt);
          // Ignora caso a data coincida com a data de atualização de sistema/cache da API
          if (dt && dt !== dataSysBR) {
            alteracoesOficiais.push({
              item: alt.item || alt.descricao || null,
              data: dt
            });
          }
        });
      }

      // Re-enumera para manter sequência impecável: DATA DE ALTERAÇÃO 01, 02, etc.
      alteracoesOficiais.forEach((alt, idx) => {
        if (!alt.item || alt.item.startsWith('DATA DE ALTERAÇÃO') || alt.item.startsWith('Alteração')) {
          alt.item = `DATA DE ALTERAÇÃO ${String(idx + 1).padStart(2, '0')}`;
        }
      });

      cardMovimentacao = {
        insercao_renavam: insercao,
        alteracoes: alteracoesOficiais
      };
    } else {
      // Fallback inteligente apenas se P32 não constar no provedor:
      // Deriva exclusivamente das datas dos proprietários comprovados (SEM injetar dataAtualizacao de sistema)
      const datasDominiais: string[] = [];
      for (const cand of proprietariosDeduplicados) {
        if (cand.data) {
          const d = formatarDataBR(cand.data);
          if (d && !datasDominiais.includes(d)) datasDominiais.push(d);
        }
      }
      datasDominiais.sort((a, b) => parseDateToTimestamp(a) - parseDateToTimestamp(b));
      if (datasDominiais.length > 0) {
        cardMovimentacao = {
          insercao_renavam: datasDominiais[0],
          alteracoes: datasDominiais.slice(1).map((d, idx) => ({
            item: `DATA DE ALTERAÇÃO ${String(idx + 1).padStart(2, '0')}`,
            data: d
          }))
        };
      }
    }

    // 10. MOTOR DE CONSOLIDAÇÃO DOS INDICADORES PERICIAIS (P1 a P36)
    const montarIndicadorInterno = (codigo: string): E20IndicadorItem => {
      const titulo = INFOSINISTROS_TITULOS[codigo] || `INDICADOR ${codigo}`;
      const itemInfo = infoResult?.resultados ? infoResult.resultados[codigo] : null;
      const hasInfoSinistros =
        itemInfo?.status === 'positivo' &&
        itemInfo?.conteudo !== undefined &&
        itemInfo?.conteudo !== null &&
        itemInfo?.conteudo !== 'NENHUM REGISTRO LOCALIZADO NA BASE INTERNA';
      const rawInfoConteudo = hasInfoSinistros ? itemInfo?.conteudo : null;

      switch (codigo) {
        case 'P1': { // HISTÓRICO DE VENDA DIRETA/REMARKETING (SEGURADORAS)
          const positivo = registrosSeguradoras.length > 0 || hasInfoSinistros;
          return {
            codigo,
            titulo,
            status: positivo ? 'positivo' : 'negativo',
            mensagem: positivo
              ? (typeof rawInfoConteudo === 'string'
                ? rawInfoConteudo
                : `IDENTIFICADO REGISTRO DE SEGURADORA / REMARKETING (${registrosSeguradoras.length || 1} ocorrência(s))`)
              : 'NENHUM REGISTRO LOCALIZADO NA BASE INTERNA',
            conteudo: positivo ? (registrosSeguradoras.length > 0 ? registrosSeguradoras : rawInfoConteudo) : null,
            detalhes: positivo ? (registrosSeguradoras.length > 0 ? registrosSeguradoras : rawInfoConteudo) : null,
            respostaInfoSinistros: rawInfoConteudo,
            total: positivo ? registrosSeguradoras.length || 1 : 0
          };
        }

        case 'P2': { // HISTÓRICO DE OPERAÇÃO/USO COMO VIATURA POLICIAL
          const positivo = registrosViaturas.length > 0 || isViatura || hasInfoSinistros;
          return {
            codigo,
            titulo,
            status: positivo ? 'positivo' : 'negativo',
            mensagem: positivo
              ? (typeof rawInfoConteudo === 'string'
                ? rawInfoConteudo
                : 'IDENTIFICADA OPERAÇÃO SEVERA COMO VIATURA POLICIAL / SEGURANÇA PÚBLICA')
              : 'NENHUM REGISTRO LOCALIZADO NA BASE INTERNA',
            conteudo: positivo ? (registrosViaturas.length > 0 ? registrosViaturas : (viaturasDetectadas.length > 0 ? viaturasDetectadas : rawInfoConteudo)) : null,
            detalhes: positivo ? (registrosViaturas.length > 0 ? registrosViaturas : (viaturasDetectadas.length > 0 ? viaturasDetectadas : rawInfoConteudo)) : null,
            respostaInfoSinistros: rawInfoConteudo,
            total: positivo ? (registrosViaturas.length || viaturasDetectadas.length || 1) : 0
          };
        }

        case 'P3': { // HISTÓRICO DE EX-FROTA PÚBLICA
          const positivo = registrosFrotaPublica.length > 0 || frotasPublicasDetectadas.length > 0 || hasInfoSinistros;
          return {
            codigo,
            titulo,
            status: positivo ? 'positivo' : 'negativo',
            mensagem: positivo
              ? (typeof rawInfoConteudo === 'string'
                ? rawInfoConteudo
                : `IDENTIFICADO USO PÚBLICO GOVERNAMENTAL (${registrosFrotaPublica.length || frotasPublicasDetectadas.length || 1} registro(s))`)
              : 'NENHUM REGISTRO LOCALIZADO NA BASE INTERNA',
            conteudo: positivo ? (registrosFrotaPublica.length > 0 ? registrosFrotaPublica : (frotasPublicasDetectadas.length > 0 ? frotasPublicasDetectadas : rawInfoConteudo)) : null,
            detalhes: positivo ? (registrosFrotaPublica.length > 0 ? registrosFrotaPublica : (frotasPublicasDetectadas.length > 0 ? frotasPublicasDetectadas : rawInfoConteudo)) : null,
            respostaInfoSinistros: rawInfoConteudo,
            total: positivo ? (registrosFrotaPublica.length || frotasPublicasDetectadas.length || 1) : 0
          };
        }

        case 'P4': { // HISTÓRICO DE EX-FROTA DE LOCADORA
          const positivo = registrosLocadoras.length > 0 || hasInfoSinistros;
          return {
            codigo,
            titulo,
            status: positivo ? 'positivo' : 'negativo',
            mensagem: positivo
              ? (typeof rawInfoConteudo === 'string'
                ? rawInfoConteudo
                : `IDENTIFICADO REGISTRO DE EX-FROTA DE LOCADORA (${registrosLocadoras.length || 1} registro(s))`)
              : 'NENHUM REGISTRO LOCALIZADO NA BASE INTERNA',
            conteudo: positivo ? (registrosLocadoras.length > 0 ? registrosLocadoras : rawInfoConteudo) : null,
            detalhes: positivo ? (registrosLocadoras.length > 0 ? registrosLocadoras : rawInfoConteudo) : null,
            respostaInfoSinistros: rawInfoConteudo,
            total: positivo ? registrosLocadoras.length || 1 : 0
          };
        }

        case 'P5': { // HISTÓRICO DE EX-FROTA DE ENTIDADE RELIGIOSA
          const positivo = religiosasDetectadas.length > 0 || hasInfoSinistros;
          return {
            codigo,
            titulo,
            status: positivo ? 'positivo' : 'negativo',
            mensagem: positivo
              ? (typeof rawInfoConteudo === 'string'
                ? rawInfoConteudo
                : 'IDENTIFICADA TITULARIDADE DE ENTIDADE RELIGIOSA NA CADEIA DOMINIAL')
              : 'NENHUM REGISTRO LOCALIZADO NA BASE INTERNA',
            conteudo: positivo ? (religiosasDetectadas.length > 0 ? religiosasDetectadas : rawInfoConteudo) : null,
            detalhes: positivo ? (religiosasDetectadas.length > 0 ? religiosasDetectadas : rawInfoConteudo) : null,
            respostaInfoSinistros: rawInfoConteudo
          };
        }

        case 'P6': { // HISTÓRICO DE EX-FROTA DE SEGURANÇA PRIVADA
          const positivo = segurancaPrivadaDetectadas.length > 0 || hasInfoSinistros;
          return {
            codigo,
            titulo,
            status: positivo ? 'positivo' : 'negativo',
            mensagem: positivo
              ? (typeof rawInfoConteudo === 'string'
                ? rawInfoConteudo
                : 'IDENTIFICADA OPERAÇÃO POR EMPRESA DE SEGURANÇA PRIVADA / VIGILÂNCIA')
              : 'NENHUM REGISTRO LOCALIZADO NA BASE INTERNA',
            conteudo: positivo ? (segurancaPrivadaDetectadas.length > 0 ? segurancaPrivadaDetectadas : rawInfoConteudo) : null,
            detalhes: positivo ? (segurancaPrivadaDetectadas.length > 0 ? segurancaPrivadaDetectadas : rawInfoConteudo) : null,
            respostaInfoSinistros: rawInfoConteudo
          };
        }

        case 'P7': { // HISTÓRICO DE VENDA DIRETA / REMARKETING POR BANCOS / FINANCEIRAS (Layout 2 Colunas: Ano | Razão Social)
          const positivo = registrosFinanceiras.length > 0 || hasInfoSinistros;
          return {
            codigo,
            titulo,
            status: positivo ? 'positivo' : 'negativo',
            mensagem: positivo
              ? (registrosFinanceiras.length > 0
                ? `IDENTIFICADA INSTITUIÇÃO FINANCEIRA OU LEASING (${registrosFinanceiras.length} registro(s))`
                : (typeof rawInfoConteudo === 'string' ? rawInfoConteudo : 'IDENTIFICADA INSTITUIÇÃO FINANCEIRA OU LEASING'))
              : 'NENHUM REGISTRO LOCALIZADO NA BASE INTERNA',
            conteudo: positivo ? (registrosFinanceiras.length > 0 ? registrosFinanceiras : rawInfoConteudo) : null,
            detalhes: positivo ? (registrosFinanceiras.length > 0 ? registrosFinanceiras : rawInfoConteudo) : null,
            respostaInfoSinistros: rawInfoConteudo,
            total: positivo ? registrosFinanceiras.length || 1 : 0
          };
        }

        case 'P8': { // HISTÓRICO DE COMERCIALIZAÇÃO EM LOJAS DE SALVADOS
          const positivo = salvadosDetectados.length > 0 || hasInfoSinistros;
          return {
            codigo,
            titulo,
            status: positivo ? 'positivo' : 'negativo',
            mensagem: positivo
              ? (typeof rawInfoConteudo === 'string'
                ? rawInfoConteudo
                : 'IDENTIFICADO HISTÓRICO DE COMERCIALIZAÇÃO EM LOJAS DE SALVADOS')
              : 'NENHUM REGISTRO LOCALIZADO NA BASE INTERNA',
            conteudo: positivo ? (salvadosDetectados.length > 0 ? salvadosDetectados : rawInfoConteudo) : null,
            detalhes: positivo ? (salvadosDetectados.length > 0 ? salvadosDetectados : rawInfoConteudo) : null,
            respostaInfoSinistros: rawInfoConteudo
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
            detalhes: positivo ? cardRouboFurto.ocorrencias : null,
            respostaInfoSinistros: rawInfoConteudo,
            total: cardRouboFurto.totalOcorrencias
          };
        }

        case 'P11': { // HISTÓRICO DE NOTIFICAÇÃO/OFERTA EM EDITAL ELETRÔNICO DE LEILÃO
          const hasLeilaoDireto = hasInfoSinistros;
          const temFrotaPublica = registrosFrotaPublica.length > 0 || frotasPublicasDetectadas.length > 0 || p3Info?.status === 'positivo';
          const positivo = hasLeilaoDireto || temFrotaPublica;

          let registrosLeilao: any[] = [];
          if (hasLeilaoDireto && rawInfoConteudo) {
            registrosLeilao = Array.isArray(rawInfoConteudo) ? [...rawInfoConteudo] : [rawInfoConteudo];
          }

          if (temFrotaPublica) {
            // Regra Jurídica/Pericial Renacred: Veículos de órgãos públicos somente podem ser desmobilizados/alienados por leilão público (Lei 14.133/21 e Lei 8.666/93)
            const orgaoOrigem = registrosFrotaPublica[0]?.orgao || frotasPublicasDetectadas[0]?.nome || p3Info?.conteudo?.razaoSocial || 'ÓRGÃO PÚBLICO';
            const anoDesmob = registrosFrotaPublica[0]?.ano || extrairApenasAno(frotasPublicasDetectadas[0]?.data) || p3Info?.conteudo?.ano || (dadosVeiculo.anoModelo ? String(dadosVeiculo.anoModelo) : '-');
            const dataDesmob = registrosFrotaPublica[0]?.data || frotasPublicasDetectadas[0]?.data || null;

            const leilaoPublicoItem = {
              leiloeiro: 'LEILÃO ADMINISTRATIVO DE FROTA PÚBLICA',
              comitente: orgaoOrigem,
              orgao: orgaoOrigem,
              lote: 'Lote de Desmobilização',
              tipo: 'Desmobilização de Frota Pública por Edital de Leilão',
              evento: 'Alienação de Bem Público Inservível/Desmobilizado (Lei 14.133/21 e Lei 8.666/93)',
              edital: 'Edital de Leilão Público Governamental',
              ano: String(anoDesmob),
              data: dataDesmob,
              detalhes: `Veículo desmobilizado da administração pública (${orgaoOrigem}) mediante alienação obrigatória por edital de leilão público.`,
              fonte: 'Edital Administrativo / Cadeia Dominial Pública'
            };

            const jaTem = registrosLeilao.some((l: any) => (l.comitente && l.comitente === orgaoOrigem) || (l.tipo && l.tipo.includes('Frota Pública')));
            if (!jaTem) {
              registrosLeilao.push(leilaoPublicoItem);
            }
          }

          return {
            codigo,
            titulo,
            status: positivo ? 'positivo' : 'negativo',
            mensagem: positivo
              ? (hasLeilaoDireto && typeof rawInfoConteudo === 'string'
                ? rawInfoConteudo
                : (registrosLeilao.length > 0
                  ? `IDENTIFICADA NOTIFICAÇÃO / EDITAL DE LEILÃO (${registrosLeilao.length} registro(s))`
                  : 'IDENTIFICADA DESMOBILIZAÇÃO DE FROTA PÚBLICA POR EDITAL DE LEILÃO ADMINISTRATIVO'))
              : 'NENHUM REGISTRO LOCALIZADO NA BASE INTERNA',
            conteudo: positivo ? (registrosLeilao.length > 0 ? registrosLeilao : rawInfoConteudo) : null,
            detalhes: positivo ? (registrosLeilao.length > 0 ? registrosLeilao : rawInfoConteudo) : null,
            respostaInfoSinistros: rawInfoConteudo,
            total: positivo ? registrosLeilao.length || 1 : 0
          };
        }

        case 'P14': { // INDENIZAÇÃO INTEGRAL POR CIA SEGURADORA
          const positivo = registrosIndenizacaoIntegral.length > 0 || indenizacaoIntegral || hasInfoSinistros;
          return {
            codigo,
            titulo,
            status: positivo ? 'positivo' : 'negativo',
            mensagem: positivo
              ? (typeof rawInfoConteudo === 'string'
                ? rawInfoConteudo
                : (registrosIndenizacaoIntegral.length > 0
                  ? `IDENTIFICADA INDENIZAÇÃO INTEGRAL POR CIA SEGURADORA (${registrosIndenizacaoIntegral.length} registro(s))`
                  : 'IDENTIFICADA INDENIZAÇÃO INTEGRAL POR COMPANHIA SEGURADORA'))
              : 'NENHUM REGISTRO LOCALIZADO NA BASE INTERNA',
            conteudo: positivo ? (registrosIndenizacaoIntegral.length > 0 ? registrosIndenizacaoIntegral : rawInfoConteudo) : null,
            detalhes: positivo ? (registrosIndenizacaoIntegral.length > 0 ? registrosIndenizacaoIntegral : rawInfoConteudo) : null,
            respostaInfoSinistros: rawInfoConteudo,
            total: positivo ? (registrosIndenizacaoIntegral.length || 1) : 0
          };
        }

        case 'P17': { // HISTÓRICO DE ALGUNS PROPRIETÁRIOS PAGANTES DO DPVAT - BASE INTERNA
          const positivo = cardProprietarios.total > 0;
          return {
            codigo,
            titulo,
            status: positivo ? 'positivo' : 'negativo',
            mensagem: positivo
              ? `CADEIA DOMINIAL AUDITADA (${cardProprietarios.total} proprietário(s) registrado(s))`
              : 'NENHUM REGISTRO LOCALIZADO NA BASE INTERNA',
            conteudo: positivo ? cardProprietarios.historico : null,
            detalhes: positivo ? cardProprietarios.historico : null,
            respostaInfoSinistros: rawInfoConteudo,
            total: cardProprietarios.total
          };
        }

        case 'P23': { // HISTÓRICO DE FROTA DE EMPRESA PRIVADA
          const positivo = empresasPrivadasDetectadas.length > 0 || hasInfoSinistros;
          const msgInfo = typeof rawInfoConteudo === 'string' ? rawInfoConteudo : null;
          return {
            codigo,
            titulo,
            status: positivo ? 'positivo' : 'negativo',
            mensagem: positivo
              ? (msgInfo || `IDENTIFICADA EMPRESA PRIVADA NA CADEIA DOMINIAL (${empresasPrivadasDetectadas.length} registro(s))`)
              : 'NENHUM REGISTRO LOCALIZADO NA BASE INTERNA',
            conteudo: positivo ? (empresasPrivadasDetectadas.length > 0 ? empresasPrivadasDetectadas : rawInfoConteudo) : null,
            detalhes: positivo ? (empresasPrivadasDetectadas.length > 0 ? empresasPrivadasDetectadas : rawInfoConteudo) : null,
            respostaInfoSinistros: rawInfoConteudo,
            total: positivo ? empresasPrivadasDetectadas.length || 1 : 0
          };
        }

        case 'P27': { // INDÍCIO DE USO COMO TÁXI/PCD
          const positivo = taxiPcdDetectados.length > 0 || hasInfoSinistros;
          return {
            codigo,
            titulo,
            status: positivo ? 'positivo' : 'negativo',
            mensagem: positivo
              ? (typeof rawInfoConteudo === 'string'
                ? rawInfoConteudo
                : 'IDENTIFICADO INDÍCIO DE USO COMO TÁXI OU ISENÇÃO PCD')
              : 'NENHUM REGISTRO LOCALIZADO NA BASE INTERNA',
            conteudo: positivo ? (taxiPcdDetectados.length > 0 ? taxiPcdDetectados : rawInfoConteudo) : null,
            detalhes: positivo ? (taxiPcdDetectados.length > 0 ? taxiPcdDetectados : rawInfoConteudo) : null,
            respostaInfoSinistros: rawInfoConteudo
          };
        }

        case 'P31': { // HISTÓRICO DE CIRCULAÇÃO
          const temCirculacao = Boolean(cardCirculacao.adquirido_0km || cardCirculacao.licenciamento_1 || cardCirculacao.licenciamento_2);
          const positivo = temCirculacao || hasInfoSinistros;
          return {
            codigo,
            titulo,
            status: positivo ? 'positivo' : 'negativo',
            mensagem: positivo
              ? 'HISTÓRICO DE CIRCULAÇÃO E EMPLACAMENTO LOCALIZADO'
              : 'NENHUM REGISTRO LOCALIZADO NA BASE INTERNA',
            conteudo: positivo ? cardCirculacao : null,
            detalhes: positivo ? cardCirculacao : null,
            respostaInfoSinistros: rawInfoConteudo
          };
        }

        case 'P32': { // HISTÓRICO DE MOVIMENTAÇÃO / ALTERAÇÃO DE CADASTRO
          const temMov = Boolean(cardMovimentacao?.insercao_renavam);
          const positivo = temMov || hasInfoSinistros;
          return {
            codigo,
            titulo,
            status: positivo ? 'positivo' : 'negativo',
            mensagem: positivo
              ? `ALTERAÇÕES CADASTRAIS REGISTRADAS (${(cardMovimentacao?.alteracoes?.length || 0) + 1} evento(s))`
              : 'NENHUM REGISTRO LOCALIZADO NA BASE INTERNA',
            conteudo: positivo ? (cardMovimentacao || rawInfoConteudo) : null,
            detalhes: positivo ? (cardMovimentacao || rawInfoConteudo) : null,
            respostaInfoSinistros: rawInfoConteudo
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
            conteudo: temDadosBin ? dadosVeiculo : null,
            detalhes: temDadosBin ? dadosVeiculo : null,
            respostaInfoSinistros: rawInfoConteudo
          };
        }

        case 'P36': { // HISTÓRICO DE VALOR DE MERCADO (FIPE)
          const p36Info = infoResult?.resultados?.P36;
          const fipeValor = p36Info?.conteudo?.valor_medio_fipe || p36Info?.conteudo?.valor || p36Info?.conteudo?.preco || fipeComplementar?.valor;
          const fipeCod = p36Info?.conteudo?.codigo_fipe || p36Info?.conteudo?.codigoFipe || fipeComplementar?.codigoFipe;
          const fipeRef = p36Info?.conteudo?.mes_referencia || p36Info?.conteudo?.mesReferencia || fipeComplementar?.mesReferencia;
          const positivo = Boolean(fipeValor) || hasInfoSinistros;

          const conteudoFipe = positivo
            ? (p36Info?.conteudo || {
                valor_medio_fipe: fipeComplementar?.valor,
                valor: fipeComplementar?.valor,
                preco: fipeComplementar?.valor,
                codigo_fipe: fipeComplementar?.codigoFipe,
                codigoFipe: fipeComplementar?.codigoFipe,
                mes_referencia: fipeComplementar?.mesReferencia,
                mesReferencia: fipeComplementar?.mesReferencia,
                marca: fipeComplementar?.marca || dadosVeiculo.marca,
                modelo: fipeComplementar?.modelo || dadosVeiculo.modelo,
                ano_modelo: fipeComplementar?.anoModelo || dadosVeiculo.anoModelo,
                combustivel: fipeComplementar?.combustivel || dadosVeiculo.combustivel,
                fonte: fipeComplementar?.fonte || 'Tabela FIPE Oficial (API Pública)'
              })
            : null;

          return {
            codigo,
            titulo,
            status: positivo ? 'positivo' : 'negativo',
            mensagem: positivo
              ? `${fipeValor || 'VALOR CONSULTADO'} (Código: ${fipeCod || '-'}, Ref: ${fipeRef || '-'})`
              : 'NENHUM REGISTRO LOCALIZADO NA BASE INTERNA',
            conteudo: conteudoFipe,
            detalhes: conteudoFipe,
            respostaInfoSinistros: rawInfoConteudo
          };
        }

        default: {
          // Indicadores nativos da InfoSinistros (P9, P11, P12, P13, P15, P16, P18-P22, P24-P26, P28-P30, P33, P34)
          const positivo = hasInfoSinistros;
          let msg = 'NENHUM REGISTRO LOCALIZADO NA BASE INTERNA';
          if (positivo) {
            if (typeof rawInfoConteudo === 'string') {
              msg = rawInfoConteudo;
            } else if (Array.isArray(rawInfoConteudo)) {
              msg = `IDENTIFICADO(S) ${rawInfoConteudo.length} REGISTRO(S) NA BASE INTERNA`;
            } else if (rawInfoConteudo && typeof rawInfoConteudo === 'object') {
              msg = 'REGISTRO IDENTIFICADO NA BASE INTERNA';
            } else {
              msg = 'REGISTRO LOCALIZADO';
            }
          }
          return {
            codigo,
            titulo,
            status: positivo ? 'positivo' : 'negativo',
            mensagem: msg,
            conteudo: positivo ? rawInfoConteudo : null,
            detalhes: positivo ? rawInfoConteudo : null,
            respostaInfoSinistros: rawInfoConteudo
          };
        }
      }
    };

    const construirIndicador = (codigo: string): E20IndicadorItem => {
      const item = montarIndicadorInterno(codigo);
      return {
        ...item,
        consta: item.status === 'positivo'
      };
    };

    // 11. Dados Complementares: FIPE (P36)
    const p36Info = infoResult?.resultados?.P36;
    const dadosFipe = (p36Info?.status === 'positivo' && p36Info.conteudo && (p36Info.conteudo.valor_medio_fipe || p36Info.conteudo.valor)) ? {
      mesReferencia: p36Info.conteudo.mes_referencia || p36Info.conteudo.mesReferencia,
      codigoFipe: p36Info.conteudo.codigo_fipe || p36Info.conteudo.codigoFipe,
      valor: p36Info.conteudo.valor_medio_fipe || p36Info.conteudo.valor,
      dataConsulta: p36Info.conteudo.data_consulta || p36Info.conteudo.dataConsulta
    } : (fipeComplementar?.sucesso ? {
      mesReferencia: fipeComplementar.mesReferencia,
      codigoFipe: fipeComplementar.codigoFipe,
      valor: fipeComplementar.valor,
      marca: fipeComplementar.marca,
      modelo: fipeComplementar.modelo,
      anoModelo: fipeComplementar.anoModelo,
      combustivel: fipeComplementar.combustivel,
      dataConsulta: new Date().toLocaleDateString('pt-BR')
    } : null);

    // Catálogo Oficial Consolidado de P1 a P36 (sem P37 online, incorporado em P17)
    const codigosIndicadores = [
      'P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8', 'P9', 'P10',
      'P11', 'P12', 'P13', 'P14', 'P15', 'P16', 'P17', 'P18', 'P19', 'P20',
      'P21', 'P22', 'P23', 'P24', 'P25', 'P26', 'P27', 'P28', 'P29', 'P30',
      'P31', 'P32', 'P33', 'P34', 'P35', 'P36'
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

    const cardBin = {
      placa: cleanPlaca,
      placa_modelo_antigo: dadosVeiculo.placaModeloAntigo || cleanPlaca,
      placa_modelo_novo: dadosVeiculo.placaModeloNovo,
      renavam: dadosVeiculo.renavam,
      chassi: dadosVeiculo.chassi,
      situacao_chassi: dadosVeiculo.situacaoChassi || 'Normal',
      situacao_veiculo: dadosVeiculo.situacaoVeiculo || 'CIRCULACAO',
      marca: dadosVeiculo.marca,
      modelo: dadosVeiculo.modelo || dadosVeiculo.marcaModelo,
      marca_modelo: dadosVeiculo.marcaModelo,
      submodelo: dadosVeiculo.submodelo,
      versao: dadosVeiculo.versao,
      ano_fabricacao: dadosVeiculo.anoFabricacao,
      ano_modelo: dadosVeiculo.anoModelo || dadosVeiculo.anoFabricacao,
      cor: dadosVeiculo.cor,
      combustivel: dadosVeiculo.combustivel,
      municipio: dadosVeiculo.municipio,
      uf: dadosVeiculo.uf,
      motor: dadosVeiculo.motor,
      carroceria: dadosVeiculo.carroceria || 'NÃO APLICAVEL',
      especie: dadosVeiculo.especieVeiculo || 'PASSAGEIRO',
      segmento: dadosVeiculo.segmento || 'Auto',
      sub_segmento: dadosVeiculo.subSegmento,
      nacionalidade: dadosVeiculo.nacionalidade || 'Nacional',
      tipo_montagem: dadosVeiculo.tipoMontagem || '1 - Original',
      tipo_veiculo: dadosVeiculo.tipoVeiculo || 'AUTOMOVEL',
      caixa_cambio: dadosVeiculo.caixaCambio,
      cilindradas: dadosVeiculo.cilindradas,
      eixos: dadosVeiculo.eixos,
      peso_bruto_total: dadosVeiculo.pesoBrutoTotal,
      proprietario_nome: dadosVeiculo.proprietarioNome || propAtualFinal?.nome || 'PROPRIETÁRIO REGISTRADO',
      proprietario_documento: dadosVeiculo.proprietarioDocumento || propAtualFinal?.documento,
      tipo_doc_prop: dadosVeiculo.tipoDocProp || (propAtualFinal?.documento && String(propAtualFinal.documento).replace(/\D/g, '').length === 14 ? 'JURIDICA' : 'FISICA'),
      data_emissao_crv: dadosVeiculo.dataEmissaoCrv || propAtualFinal?.data,
      faturado_documento: dadosVeiculo.faturadoCnpj,
      uf_faturado: dadosVeiculo.ufFaturado,
      tipo_doc_faturado: dadosVeiculo.tipoDocFaturado || 'JURIDICA',
      di: dadosVeiculo.di,
      registro_di: dadosVeiculo.registroDi
    };

    const duracaoTotal = Date.now() - startTime;
    logger.info(`[E20] Orquestração para placa ${cleanPlaca} concluída com sucesso em ${duracaoTotal}ms`);

    return cleanObject({
      placa: cleanPlaca,
      chassi: dadosVeiculo.chassi,
      renavam: dadosVeiculo.renavam,
      contingenciaRenavamAplicada,
      custoInternoTotal,
      veiculo: dadosVeiculo,
      bin: cardBin,
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
        status: (registrosSeguradoras.length > 0 || registrosIndenizacaoIntegral.length > 0 ? 'positivo' : 'negativo') as 'positivo' | 'negativo',
        mensagem: (registrosSeguradoras.length > 0 || registrosIndenizacaoIntegral.length > 0)
          ? `IDENTIFICADO REGISTRO DE SEGURADORA OU SINISTRO (${registrosSeguradoras.length + registrosIndenizacaoIntegral.length} registro(s))`
          : 'NENHUM REGISTRO LOCALIZADO NA BASE INTERNA',
        total: registrosSeguradoras.length + registrosIndenizacaoIntegral.length,
        indenizacaoIntegral,
        registros: registrosSeguradoras,
        registrosIndenizacao: registrosIndenizacaoIntegral
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
        circulacao: cardCirculacao,
        movimentacao: cardMovimentacao,
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
