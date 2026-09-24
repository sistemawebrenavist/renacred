export interface ServerProductConfig {
  code: string;
  slug: string;
  name: string;
  category: 'imobiliario' | 'veicular' | 'cadastral' | 'juridico';
  inputType: 'cpf_cnpj' | 'cpf' | 'placa' | 'rg' | 'chassi' | 'renavam';
  apiPrimary: string;
  apiContingencies: string[];
  defaultCost: number;
  defaultPrice: number;
  slugAliases: string[];
}

export const SERVER_PRODUCTS: ServerProductConfig[] = [
  {
    code: 'E1',
    slug: 'imobiliario',
    name: 'Histórico Imobiliário & Cartórios',
    category: 'imobiliario',
    inputType: 'cpf_cnpj',
    apiPrimary: 'historico_imobiliario',
    apiContingencies: [],
    defaultCost: 0.00,
    defaultPrice: 5.00,
    slugAliases: ['imoveis', 'cartorios', 'doi']
  },
  {
    code: 'E2',
    slug: 'proprietarios',
    name: 'Histórico de Proprietários Veiculares',
    category: 'veicular',
    inputType: 'placa',
    apiPrimary: 'historico_proprietario',
    apiContingencies: [],
    defaultCost: 0.00,
    defaultPrice: 5.00,
    slugAliases: ['historico-proprietario', 'veicular-proprietarios']
  },
  {
    code: 'E3',
    slug: 'frota',
    name: 'Busca de Frota Veicular por Documento',
    category: 'veicular',
    inputType: 'cpf_cnpj',
    apiPrimary: 'renavam_frota',
    apiContingencies: [],
    defaultCost: 0.10,
    defaultPrice: 1.32,
    slugAliases: ['renavam-frota', 'veiculos-titular']
  },
  {
    code: 'E4',
    slug: 'endereco-veiculo',
    name: 'Endereço do Proprietário Veicular',
    category: 'veicular',
    inputType: 'placa',
    apiPrimary: 'renavam_endereco_proprietario',
    apiContingencies: [],
    defaultCost: 0.10,
    defaultPrice: 1.32,
    slugAliases: ['endereco-proprietario', 'localizacao-veiculo']
  },
  {
    code: 'E5',
    slug: 'roubo-furto',
    name: 'Histórico de Roubo e Furto',
    category: 'veicular',
    inputType: 'placa',
    apiPrimary: 'renavam_ocorrencia',
    apiContingencies: ['ocorrencias_senatran'],
    defaultCost: 0.15,
    defaultPrice: 1.32,
    slugAliases: ['ocorrencia', 'roubo', 'furto', 'senatran-ocorrencia']
  },
  {
    code: 'E6',
    slug: 'cnh-imagem',
    name: 'Busca de CNH com Imagem Oficial',
    category: 'cadastral',
    inputType: 'cpf',
    apiPrimary: 'cnh_senatran',
    apiContingencies: [],
    defaultCost: 0.30,
    defaultPrice: 1.32,
    slugAliases: ['cnh-foto', 'espelho-cnh', 'senatran-cnh']
  },
  {
    code: 'E7',
    slug: 'cnh-dados',
    name: 'Busca de CNH (Dados Cadastrais)',
    category: 'cadastral',
    inputType: 'cpf',
    apiPrimary: 'cnh_pwn',
    apiContingencies: ['renach_cnh'],
    defaultCost: 0.30,
    defaultPrice: 1.32,
    slugAliases: ['cnh', 'renach', 'condutor']
  },
  {
    code: 'E8',
    slug: 'multas',
    name: 'RENAINF - Infrações e Multas Nacionais',
    category: 'veicular',
    inputType: 'placa',
    apiPrimary: 'renainf_multas',
    apiContingencies: [],
    defaultCost: 0.15,
    defaultPrice: 1.32,
    slugAliases: ['renainf', 'infracoes', 'multas-veiculo']
  },
  {
    code: 'E9',
    slug: 'renajud',
    name: 'RENAJUD - Restrições e Bloqueios Judiciais',
    category: 'juridico',
    inputType: 'placa',
    apiPrimary: 'renajud_restricoes',
    apiContingencies: ['renajud_processos'],
    defaultCost: 0.15,
    defaultPrice: 1.32,
    slugAliases: ['bloqueio-judicial', 'processos-veiculo', 'penhora']
  },
  {
    code: 'E10',
    slug: 'comunicacao-venda',
    name: 'Comunicação de Venda Veicular',
    category: 'veicular',
    inputType: 'placa',
    apiPrimary: 'renavam_comunicacao_venda',
    apiContingencies: [],
    defaultCost: 0.10,
    defaultPrice: 1.32,
    slugAliases: ['venda-veiculo', 'comunicado-venda']
  },
  {
    code: 'E11',
    slug: 'parentes',
    name: 'Vínculos & Parentescos de 1º Grau',
    category: 'cadastral',
    inputType: 'cpf',
    apiPrimary: 'parentes',
    apiContingencies: [],
    defaultCost: 0.03,
    defaultPrice: 1.32,
    slugAliases: ['familiares', 'vinculos', 'arvore-genealogica']
  },
  {
    code: 'E12',
    slug: 'bin',
    name: 'BIN Online - Base de Índice Nacional',
    category: 'veicular',
    inputType: 'placa',
    apiPrimary: 'placa_serpro',
    apiContingencies: ['placa_senatran', 'renavam_endereco_proprietario'],
    defaultCost: 0.30,
    defaultPrice: 1.32,
    slugAliases: ['bin-online', 'dados-veiculo', 'serpro-placa']
  },
  {
    code: 'E13',
    slug: 'cpf-basico',
    name: 'Consulta CPF Nível I (Cadastral Básico)',
    category: 'cadastral',
    inputType: 'cpf',
    apiPrimary: 'cpf_basica',
    apiContingencies: [],
    defaultCost: 0.03,
    defaultPrice: 1.32,
    slugAliases: ['cpf-nivel-1', 'cpf-simples', 'receita-cpf']
  },
  {
    code: 'E14',
    slug: 'gravame',
    name: 'SNG Gravame Financeiro',
    category: 'veicular',
    inputType: 'placa',
    apiPrimary: 'sng_gravames',
    apiContingencies: [],
    defaultCost: 0.15,
    defaultPrice: 1.32,
    slugAliases: ['sng', 'alienacao', 'financiamento-veiculo']
  },
  {
    code: 'E15',
    slug: 'cpf-completo',
    name: 'Consulta CPF Nível II (Cadastral Completo)',
    category: 'cadastral',
    inputType: 'cpf',
    apiPrimary: 'cpf_pwn',
    apiContingencies: [],
    defaultCost: 0.35,
    defaultPrice: 1.32,
    slugAliases: ['cpf-nivel-2', 'raio-x-cpf', 'score-cpf']
  },
  {
    code: 'E16',
    slug: 'rg',
    name: 'Busca por Registro Geral (RG)',
    category: 'cadastral',
    inputType: 'rg',
    apiPrimary: 'reg_rg',
    apiContingencies: [],
    defaultCost: 0.03,
    defaultPrice: 1.32,
    slugAliases: ['identidade', 'documento-rg']
  }
];

export function findServerProduct(identifier: string): ServerProductConfig | undefined {
  if (!identifier) return undefined;
  const clean = identifier.trim().toLowerCase();
  return SERVER_PRODUCTS.find(
    (p) =>
      p.code.toLowerCase() === clean ||
      p.slug.toLowerCase() === clean ||
      p.apiPrimary.toLowerCase() === clean ||
      p.slugAliases.some((alias) => alias.toLowerCase() === clean)
  );
}
