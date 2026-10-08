import { logger } from '../utils/logger';

export interface FipeResultado {
  valor: string;
  codigoFipe: string;
  mesReferencia: string;
  marca: string;
  modelo: string;
  anoModelo: number | string;
  combustivel: string;
  autenticacao?: string;
  tipoVeiculo?: number;
  sucesso: boolean;
  fonte: string;
}

interface ItemFipe {
  codigo: string | number;
  nome: string;
}

// Cache em memória de marcas e modelos para alta performance (TTL 6 horas)
const cacheMarcas: { [tipo: string]: { timestamp: number; dados: ItemFipe[] } } = {};
const cacheModelos: { [marcaCodigo: string]: { timestamp: number; dados: ItemFipe[] } } = {};
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

export class FipeGratisService {
  private readonly baseUrl = 'https://parallelum.com.br/fipe/api/v1';

  /**
   * Normaliza o nome da marca para compatibilidade com o catálogo da FIPE
   */
  private normalizarMarca(marcaRaw: string): string {
    return marcaRaw
      .replace(/^[iI]\//, '')
      .replace(/^IMP\//i, '')
      .replace(/[\/\-_]/g, ' ')
      .trim()
      .toLowerCase();
  }

  /**
   * Mapeamento de sinônimos conhecidos de montadoras
   */
  private resolverSinonimoMarca(marca: string): string {
    const m = marca.toLowerCase();
    if (m === 'gm' || m === 'chev' || m.includes('chevrolet')) return 'gm - chevrolet';
    if (m === 'vw' || m.includes('volks')) return 'vw - volkswagen';
    if (m.includes('mercedes')) return 'mercedes-benz';
    if (m.includes('citroen') || m.includes('citroën')) return 'citroën';
    if (m.includes('fiat')) return 'fiat';
    if (m.includes('ford')) return 'ford';
    if (m.includes('peugeot')) return 'peugeot';
    if (m.includes('renault')) return 'renault';
    if (m.includes('toyota')) return 'toyota';
    if (m.includes('honda')) return 'honda';
    if (m.includes('hyundai')) return 'hyundai';
    if (m.includes('nissan')) return 'nissan';
    if (m.includes('jeep')) return 'jeep';
    if (m.includes('mitsubishi')) return 'mitsubishi';
    if (m.includes('bmw')) return 'bmw';
    if (m.includes('audi')) return 'audi';
    if (m.includes('volvo')) return 'volvo';
    if (m.includes('byd')) return 'byd';
    if (m.includes('gwm')) return 'gwm';
    if (m.includes('caoa') || m.includes('chery')) return 'caoa chery';
    return m;
  }

  /**
   * Obtém a lista de marcas da FIPE com cache
   */
  private async obterMarcas(tipoVeiculo: 'carros' | 'motos' | 'caminhoes' = 'carros'): Promise<ItemFipe[]> {
    const cached = cacheMarcas[tipoVeiculo];
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.dados;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4500);

      const resp = await fetch(`${this.baseUrl}/${tipoVeiculo}/marcas`, {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' }
      });
      clearTimeout(timeoutId);

      if (!resp.ok) return [];
      const lista: ItemFipe[] = await resp.json();
      cacheMarcas[tipoVeiculo] = { timestamp: Date.now(), dados: lista };
      return lista;
    } catch (err: any) {
      logger.warn(`[FipeGratis] Falha ao carregar lista de marcas: ${err.message}`);
      return cached?.dados || [];
    }
  }

  /**
   * Obtém os modelos de uma marca com cache
   */
  private async obterModelos(tipoVeiculo: 'carros' | 'motos' | 'caminhoes', marcaCodigo: string | number): Promise<ItemFipe[]> {
    const key = `${tipoVeiculo}_${marcaCodigo}`;
    const cached = cacheModelos[key];
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.dados;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4500);

      const resp = await fetch(`${this.baseUrl}/${tipoVeiculo}/marcas/${marcaCodigo}/modelos`, {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' }
      });
      clearTimeout(timeoutId);

      if (!resp.ok) return [];
      const data: any = await resp.json();
      const lista: ItemFipe[] = Array.isArray(data?.modelos) ? data.modelos : [];
      cacheModelos[key] = { timestamp: Date.now(), dados: lista };
      return lista;
    } catch (err: any) {
      logger.warn(`[FipeGratis] Falha ao carregar modelos da marca ${marcaCodigo}: ${err.message}`);
      return cached?.dados || [];
    }
  }

  /**
   * Consulta o valor FIPE oficial e gratuito por marca, modelo e ano
   */
  public async consultarFipe(params: {
    marca?: string;
    modelo?: string;
    marcaModelo?: string;
    anoModelo?: string | number;
    anoFabricacao?: string | number;
    tipoVeiculo?: string;
  }): Promise<FipeResultado | null> {
    const marcaInput = params.marca || '';
    const modeloInput = params.modelo || '';
    const marcaModeloInput = params.marcaModelo || '';
    const anoDesejado = params.anoModelo || params.anoFabricacao || '';

    if (!marcaInput && !marcaModeloInput) {
      return null;
    }

    // Identifica o tipo (carros por padrão)
    let tipo: 'carros' | 'motos' | 'caminhoes' = 'carros';
    const tipoStr = String(params.tipoVeiculo || '').toUpperCase();
    if (tipoStr.includes('MOTO') || tipoStr.includes('CICLO')) tipo = 'motos';
    else if (tipoStr.includes('CAMINHAO') || tipoStr.includes('TRATOR') || tipoStr.includes('REBOQUE')) tipo = 'caminhoes';

    try {
      // 1. Obter marcas
      const marcas = await this.obterMarcas(tipo);
      if (!marcas || marcas.length === 0) return null;

      // 2. Localizar marca compatível
      const marcaNorm = this.resolverSinonimoMarca(this.normalizarMarca(marcaInput || marcaModeloInput));
      let marcaEncontrada = marcas.find(m => {
        const nomeM = m.nome.toLowerCase();
        return nomeM === marcaNorm || nomeM.includes(marcaNorm) || marcaNorm.includes(nomeM);
      });

      // Tentativa de busca por palavras da marcaModelo se não achou direta
      if (!marcaEncontrada && marcaModeloInput) {
        const primeiraPalavra = this.normalizarMarca(marcaModeloInput.split(' ')[0] || '');
        if (primeiraPalavra) {
          const sin = this.resolverSinonimoMarca(primeiraPalavra);
          marcaEncontrada = marcas.find(m => m.nome.toLowerCase().includes(sin) || sin.includes(m.nome.toLowerCase()));
        }
      }

      if (!marcaEncontrada) {
        logger.info(`[FipeGratis] Marca não localizada no catálogo FIPE: "${marcaInput || marcaModeloInput}"`);
        return null;
      }

      // 3. Obter modelos da marca
      const modelos = await this.obterModelos(tipo, marcaEncontrada.codigo);
      if (!modelos || modelos.length === 0) return null;

      // 4. Tokenização e ranqueamento do melhor modelo
      const textoModeloCompleto = `${modeloInput} ${marcaModeloInput}`
        .toLowerCase()
        .replace(/([0-9]+)([a-zA-Z]+)/g, '$1 $2')
        .replace(/[^a-zA-Z0-9]/g, ' ');

      const tokens = Array.from(new Set(textoModeloCompleto.split(/\s+/).filter(t => t.length >= 2)));

      let melhorModelo: ItemFipe | null = null;
      let melhorScore = 0;

      for (const mod of modelos) {
        const nomeMod = mod.nome
          .toLowerCase()
          .replace(/([0-9]+)([a-zA-Z]+)/g, '$1 $2')
          .replace(/[^a-zA-Z0-9]/g, ' ');

        let score = 0;
        for (const token of tokens) {
          if (nomeMod.includes(token)) {
            // Palavras específicas ou números de modelo valem mais
            score += /\d/.test(token) ? 5 : (token.length >= 3 ? 3 : 1);
          }
        }

        if (score > melhorScore) {
          melhorScore = score;
          melhorModelo = mod;
        }
      }

      if (!melhorModelo || melhorScore === 0) {
        logger.info(`[FipeGratis] Nenhum modelo correspondente para "${modeloInput || marcaModeloInput}" na marca ${marcaEncontrada.nome}`);
        return null;
      }

      // 5. Obter anos disponíveis para o modelo
      const controllerAnos = new AbortController();
      const timeoutAnos = setTimeout(() => controllerAnos.abort(), 4000);
      const respAnos = await fetch(`${this.baseUrl}/${tipo}/marcas/${marcaEncontrada.codigo}/modelos/${melhorModelo.codigo}/anos`, {
        signal: controllerAnos.signal,
        headers: { 'Accept': 'application/json' }
      });
      clearTimeout(timeoutAnos);

      if (!respAnos.ok) return null;
      const anosDisponiveis: ItemFipe[] = await respAnos.json();
      if (!Array.isArray(anosDisponiveis) || anosDisponiveis.length === 0) return null;

      // 6. Selecionar o ano mais aderente
      const anoAlvo = String(anoDesejado).trim();
      let anoEscolhido = anosDisponiveis.find(a => {
        const nomeA = a.nome.toLowerCase();
        const codA = String(a.codigo);
        return (anoAlvo && (nomeA.includes(anoAlvo) || codA.startsWith(anoAlvo)));
      });

      // Fallback para ano de fabricação se modelo não bateu
      if (!anoEscolhido && params.anoFabricacao) {
        const anoFab = String(params.anoFabricacao).trim();
        anoEscolhido = anosDisponiveis.find(a => a.nome.includes(anoFab) || String(a.codigo).startsWith(anoFab));
      }

      // Se ainda não achou, pega o mais próximo
      if (!anoEscolhido) {
        anoEscolhido = anosDisponiveis[0];
      }

      // 7. Consultar Preço e Detalhes Finais
      const controllerPreco = new AbortController();
      const timeoutPreco = setTimeout(() => controllerPreco.abort(), 4000);
      const respPreco = await fetch(
        `${this.baseUrl}/${tipo}/marcas/${marcaEncontrada.codigo}/modelos/${melhorModelo.codigo}/anos/${anoEscolhido.codigo}`,
        {
          signal: controllerPreco.signal,
          headers: { 'Accept': 'application/json' }
        }
      );
      clearTimeout(timeoutPreco);

      if (!respPreco.ok) return null;
      const precoFinal: any = await respPreco.json();

      if (precoFinal && precoFinal.Valor) {
        logger.info(`[FipeGratis] Preço FIPE obtido com sucesso para ${melhorModelo.nome} (${anoEscolhido.nome}): ${precoFinal.Valor}`);
        return {
          valor: precoFinal.Valor,
          codigoFipe: precoFinal.CodigoFipe || '-',
          mesReferencia: precoFinal.MesReferencia || 'Vigente',
          marca: precoFinal.Marca || marcaEncontrada.nome,
          modelo: precoFinal.Modelo || melhorModelo.nome,
          anoModelo: precoFinal.AnoModelo || anoEscolhido.nome,
          combustivel: precoFinal.Combustivel || '-',
          autenticacao: precoFinal.Autenticacao,
          tipoVeiculo: precoFinal.TipoVeiculo,
          sucesso: true,
          fonte: 'Tabela FIPE Oficial (API Pública)'
        };
      }

      return null;
    } catch (err: any) {
      logger.warn(`[FipeGratis] Erro ao consultar FIPE gratuita: ${err.message}`);
      return null;
    }
  }
}

export const fipeGratisService = new FipeGratisService();
