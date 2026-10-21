import fs from 'fs';
import path from 'path';
import { SERVER_PRODUCTS, ServerProductConfig } from '../config/productsCatalog';
import { logger } from '../utils/logger';

export interface ProductPricingOverride {
  cost?: number;
  price?: number;
  isActive?: boolean;
  updatedAt?: string;
}

export interface ProductPricingItem {
  code: string;
  slug: string;
  name: string;
  category: string;
  inputType: string;
  originalCost: number;
  originalPrice: number;
  currentCost: number;
  currentPrice: number;
  isActive: boolean;
  margin: number;
  marginPercent: number;
  isModified: boolean;
}

// Valores padrão de fábrica imutáveis para cálculo de rollback e detecção de alterações
const FACTORY_DEFAULTS: Record<string, { cost: number; price: number; isActive: boolean }> = {};

SERVER_PRODUCTS.forEach((p) => {
  FACTORY_DEFAULTS[p.code] = {
    cost: p.defaultCost,
    price: p.defaultPrice,
    isActive: true
  };
});

class ProductPricingService {
  private overridesFilePath: string;
  private overrides: Record<string, ProductPricingOverride> = {};

  constructor() {
    this.overridesFilePath = path.join(__dirname, '../config/pricing-overrides.json');
    this.loadOverridesFromDisk();
    this.applyOverridesToCatalog();
  }

  /**
   * Carrega os overrides persistidos em disco com fallback seguro
   */
  private loadOverridesFromDisk(): void {
    try {
      if (fs.existsSync(this.overridesFilePath)) {
        const content = fs.readFileSync(this.overridesFilePath, 'utf-8');
        this.overrides = JSON.parse(content);
        logger.info(`[ProductPricing] ${Object.keys(this.overrides).length} overrides de preços carregados com sucesso.`);
      } else {
        this.overrides = {};
      }
    } catch (err: any) {
      logger.error(`[ProductPricing] Falha ao ler ${this.overridesFilePath}: ${err.message}. Mantendo catálogo padrão.`);
      this.overrides = {};
    }
  }

  /**
   * Salva os overrides de volta ao disco de forma atômica
   */
  private saveOverridesToDisk(): void {
    try {
      const dir = path.dirname(this.overridesFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.overridesFilePath, JSON.stringify(this.overrides, null, 2), 'utf-8');
      logger.info(`[ProductPricing] Overrides persistidos com sucesso em ${this.overridesFilePath}`);
    } catch (err: any) {
      logger.error(`[ProductPricing] Erro ao salvar overrides em disco: ${err.message}`);
    }
  }

  /**
   * Sincroniza os preços em SERVER_PRODUCTS em tempo de execução
   * para que faturamento, rotas de consulta e catálogo reflitam imediatamente
   */
  public applyOverridesToCatalog(): void {
    for (const p of SERVER_PRODUCTS) {
      const override = this.overrides[p.code];
      const factory = FACTORY_DEFAULTS[p.code] || { cost: p.defaultCost, price: p.defaultPrice, isActive: true };

      if (override) {
        if (typeof override.cost === 'number' && !isNaN(override.cost) && override.cost >= 0) {
          p.defaultCost = override.cost;
        }
        if (typeof override.price === 'number' && !isNaN(override.price) && override.price >= 0) {
          p.defaultPrice = override.price;
        }
        if (typeof override.isActive === 'boolean') {
          p.isActive = override.isActive;
        }
      } else {
        p.defaultCost = factory.cost;
        p.defaultPrice = factory.price;
        p.isActive = factory.isActive;
      }
    }
  }

  /**
   * Retorna a matriz completa de precificação para o painel administrativo
   */
  public getPricingTable(): {
    produtos: ProductPricingItem[];
    resumo: {
      total: number;
      ativos: number;
      ticketMedio: number;
      custoMedio: number;
      margemMediaPercent: number;
    };
  } {
    this.applyOverridesToCatalog();

    const produtos: ProductPricingItem[] = SERVER_PRODUCTS.map((p) => {
      const factory = FACTORY_DEFAULTS[p.code] || { cost: p.defaultCost, price: p.defaultPrice, isActive: true };
      const currentCost = p.defaultCost;
      const currentPrice = p.defaultPrice;
      const isActive = p.isActive !== false;

      const margin = currentPrice - currentCost;
      const marginPercent = currentCost > 0 ? ((margin / currentCost) * 100) : 100;
      const isModified =
        Math.abs(currentCost - factory.cost) > 0.001 ||
        Math.abs(currentPrice - factory.price) > 0.001 ||
        isActive !== factory.isActive;

      return {
        code: p.code,
        slug: p.slug,
        name: p.name,
        category: p.category,
        inputType: p.inputType,
        originalCost: factory.cost,
        originalPrice: factory.price,
        currentCost,
        currentPrice,
        isActive,
        margin: Math.round(margin * 100) / 100,
        marginPercent: Math.round(marginPercent * 10) / 10,
        isModified
      };
    });

    const ativosList = produtos.filter((p) => p.isActive);
    const total = produtos.length;
    const ativos = ativosList.length;

    const somaPrecos = ativosList.reduce((acc, p) => acc + p.currentPrice, 0);
    const somaCustos = ativosList.reduce((acc, p) => acc + p.currentCost, 0);

    const ticketMedio = ativos > 0 ? Math.round((somaPrecos / ativos) * 100) / 100 : 0;
    const custoMedio = ativos > 0 ? Math.round((somaCustos / ativos) * 100) / 100 : 0;
    const margemMediaPercent = custoMedio > 0 ? Math.round((((ticketMedio - custoMedio) / custoMedio) * 100) * 10) / 10 : 0;

    return {
      produtos,
      resumo: {
        total,
        ativos,
        ticketMedio,
        custoMedio,
        margemMediaPercent
      }
    };
  }

  /**
   * Atualiza preços e/ou custos de um lote de produtos
   */
  public updatePricing(
    items: Array<{
      code: string;
      cost?: number;
      price?: number;
      isActive?: boolean;
    }>
  ): ReturnType<typeof this.getPricingTable> {
    for (const item of items) {
      if (!item.code) continue;
      const code = item.code.trim().toUpperCase();
      const product = SERVER_PRODUCTS.find((p) => p.code === code);
      if (!product) continue;

      const currentOverride = this.overrides[code] || {};

      if (typeof item.cost === 'number' && !isNaN(item.cost) && item.cost >= 0) {
        currentOverride.cost = Math.round(item.cost * 100) / 100;
      }
      if (typeof item.price === 'number' && !isNaN(item.price) && item.price >= 0) {
        currentOverride.price = Math.round(item.price * 100) / 100;
      }
      if (typeof item.isActive === 'boolean') {
        currentOverride.isActive = item.isActive;
      }
      currentOverride.updatedAt = new Date().toISOString();

      this.overrides[code] = currentOverride;
    }

    this.saveOverridesToDisk();
    this.applyOverridesToCatalog();

    return this.getPricingTable();
  }

  /**
   * Restaura os valores padrão de fábrica de todos ou de produtos específicos
   */
  public resetToFactoryDefaults(codes?: string[]): ReturnType<typeof this.getPricingTable> {
    if (codes && codes.length > 0) {
      for (const rawCode of codes) {
        const code = rawCode.trim().toUpperCase();
        delete this.overrides[code];
      }
    } else {
      this.overrides = {};
    }

    this.saveOverridesToDisk();
    this.applyOverridesToCatalog();

    return this.getPricingTable();
  }
}

export const productPricingService = new ProductPricingService();
