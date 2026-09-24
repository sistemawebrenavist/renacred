export type ProductCategory = 'imobiliario' | 'veicular' | 'cadastral' | 'juridico';
export type ProductInputType = 'cpf_cnpj' | 'cpf' | 'placa' | 'rg' | 'chassi' | 'renavam';

export interface ProductDefinition {
  code: string;
  slug: string;
  name: string;
  shortName: string;
  category: ProductCategory;
  categoryLabel: string;
  inputType: ProductInputType;
  inputLabel: string;
  placeholder: string;
  description: string;
  highlights: string[];
  defaultCost: number;
  defaultPrice: number;
  hasContingency: boolean;
  badgeColor: {
    bg: string;
    text: string;
    border: string;
  };
}

export const PRODUCTS_CATALOG: ProductDefinition[] = [
  {
    code: 'E1',
    slug: 'imobiliario',
    name: 'Histórico Imobiliário & Cartórios',
    shortName: 'Histórico Imobiliário',
    category: 'imobiliario',
    categoryLabel: 'Imobiliário',
    inputType: 'cpf_cnpj',
    inputLabel: 'CPF ou CNPJ',
    placeholder: '000.000.000-00 ou 00.000.000/0000-00',
    description: 'Varredura nacional de escrituras, titularidade imobiliária (DOI) e registros cartorários vinculados ao documento.',
    highlights: [
      'Declarações sobre Operações Imobiliárias (DOI)',
      'Identificação de alienantes e adquirentes',
      'Matrícula, livro, folha e cartório de registro',
      'Data de lavratura oficial'
    ],
    defaultCost: 0.00,
    defaultPrice: 5.00,
    hasContingency: false,
    badgeColor: {
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      border: 'border-blue-200'
    }
  },
  {
    code: 'E2',
    slug: 'proprietarios',
    name: 'Histórico de Proprietários Veiculares',
    shortName: 'Proprietários Veiculares',
    category: 'veicular',
    categoryLabel: 'Veicular',
    inputType: 'placa',
    inputLabel: 'Placa do Veículo',
    placeholder: 'ABC-1234 ou ABC1D23',
    description: 'Linha do tempo cronológica ascendente de todos os proprietários anteriores e do titular vigente por placa.',
    highlights: [
      'Cronologia ordinal (#1 histórico até o vigente)',
      'Identificação do proprietário atual',
      'Município e UF de emplacamento',
      'Eventos de transferência e datas oficiais'
    ],
    defaultCost: 0.00,
    defaultPrice: 5.00,
    hasContingency: false,
    badgeColor: {
      bg: 'bg-emerald-50',
      text: 'text-emerald-800',
      border: 'border-emerald-200'
    }
  },
  {
    code: 'E3',
    slug: 'frota',
    name: 'Busca de Frota Veicular por Documento',
    shortName: 'Busca de Frota',
    category: 'veicular',
    categoryLabel: 'Veicular',
    inputType: 'cpf_cnpj',
    inputLabel: 'CPF ou CNPJ do Titular',
    placeholder: '000.000.000-00 ou 00.000.000/0000-00',
    description: 'Relação completa de todos os veículos registrados no território nacional sob a titularidade de uma pessoa física ou jurídica.',
    highlights: [
      'Contagem consolidada de veículos ativos',
      'Placa, chassi, Renavam e UF',
      'Marca/modelo, cor e ano de fabricação',
      'Situação cadastral de circulação'
    ],
    defaultCost: 0.10,
    defaultPrice: 1.32,
    hasContingency: false,
    badgeColor: {
      bg: 'bg-slate-100',
      text: 'text-slate-800',
      border: 'border-slate-300'
    }
  },
  {
    code: 'E4',
    slug: 'endereco-veiculo',
    name: 'Endereço do Proprietário Veicular',
    shortName: 'Endereço Proprietário',
    category: 'veicular',
    categoryLabel: 'Veicular',
    inputType: 'placa',
    inputLabel: 'Placa do Veículo',
    placeholder: 'ABC-1234 ou ABC1D23',
    description: 'Localização física e domiciliar cadastrada do proprietário oficial registrado no Detran/Senatran.',
    highlights: [
      'Logradouro, número, complemento e bairro',
      'Município, UF e CEP oficial',
      'Documento e nome do proprietário registrado',
      'Dados de jurisdição do emplacamento'
    ],
    defaultCost: 0.10,
    defaultPrice: 1.32,
    hasContingency: false,
    badgeColor: {
      bg: 'bg-slate-100',
      text: 'text-slate-800',
      border: 'border-slate-300'
    }
  },
  {
    code: 'E5',
    slug: 'roubo-furto',
    name: 'Histórico de Roubo e Furto',
    shortName: 'Roubo e Furto',
    category: 'veicular',
    categoryLabel: 'Veicular',
    inputType: 'placa',
    inputLabel: 'Placa do Veículo',
    placeholder: 'ABC-1234 ou ABC1D23',
    description: 'Auditoria de ocorrências ativas ou históricas de furto, roubo e recuperação com dupla contingência transparente.',
    highlights: [
      'Status pericial de circulação ou impedimento',
      'Número do boletim de ocorrência e data',
      'Órgão de segurança e UF emissora',
      'Histórico de recuperação e devolução'
    ],
    defaultCost: 0.15,
    defaultPrice: 1.32,
    hasContingency: true,
    badgeColor: {
      bg: 'bg-rose-50',
      text: 'text-rose-800',
      border: 'border-rose-200'
    }
  },
  {
    code: 'E6',
    slug: 'cnh-imagem',
    name: 'Busca de CNH com Imagem Oficial',
    shortName: 'CNH com Imagem',
    category: 'cadastral',
    categoryLabel: 'Cadastral',
    inputType: 'cpf',
    inputLabel: 'CPF do Condutor',
    placeholder: '000.000.000-00',
    description: 'Espelho oficial completo da Carteira Nacional de Habilitação com foto, assinatura e metadados oficiais.',
    highlights: [
      'Foto original e assinatura do condutor',
      'Número de registro e formulário Renach',
      'Categoria, emissão e data de validade',
      'Filiação e cidade de nascimento'
    ],
    defaultCost: 0.30,
    defaultPrice: 1.32,
    hasContingency: false,
    badgeColor: {
      bg: 'bg-indigo-50',
      text: 'text-indigo-800',
      border: 'border-indigo-200'
    }
  },
  {
    code: 'E7',
    slug: 'cnh-dados',
    name: 'Busca de CNH (Dados Cadastrais)',
    shortName: 'CNH sem Imagem',
    category: 'cadastral',
    categoryLabel: 'Cadastral',
    inputType: 'cpf',
    inputLabel: 'CPF do Condutor',
    placeholder: '000.000.000-00',
    description: 'Conferência cadastral de habilitação com validação de registro, categoria e impedimentos com contingência.',
    highlights: [
      'Número de registro da CNH e Renach',
      'Categoria da habilitação (A, B, C, D, E)',
      'Data de validade e primeira habilitação',
      'Impedimentos e bloqueios administrativos'
    ],
    defaultCost: 0.30,
    defaultPrice: 1.32,
    hasContingency: true,
    badgeColor: {
      bg: 'bg-indigo-50',
      text: 'text-indigo-800',
      border: 'border-indigo-200'
    }
  },
  {
    code: 'E8',
    slug: 'multas',
    name: 'RENAINF - Infrações e Multas Nacionais',
    shortName: 'Multas RENAINF',
    category: 'veicular',
    categoryLabel: 'Veicular',
    inputType: 'placa',
    inputLabel: 'Placa do Veículo',
    placeholder: 'ABC-1234 ou ABC1D23',
    description: 'Relação unificada de multas e autos de infração cometidos em todas as rodovias e estados da federação.',
    highlights: [
      'Autos de infração e órgãos autuadores',
      'Valor total exigível e não exigível',
      'Data, hora e local da ocorrência',
      'Enquadramento legal e pontuação'
    ],
    defaultCost: 0.15,
    defaultPrice: 1.32,
    hasContingency: false,
    badgeColor: {
      bg: 'bg-amber-50',
      text: 'text-amber-800',
      border: 'border-amber-200'
    }
  },
  {
    code: 'E9',
    slug: 'renajud',
    name: 'RENAJUD - Restrições e Bloqueios Judiciais',
    shortName: 'Restrições RENAJUD',
    category: 'juridico',
    categoryLabel: 'Jurídico',
    inputType: 'placa',
    inputLabel: 'Placa do Veículo',
    placeholder: 'ABC-1234 ou ABC1D23',
    description: 'Pesquisa detalhada de ordens judiciais de penhora, busca e apreensão e bloqueios de transferência.',
    highlights: [
      'Tribunal de origem e vara judicial',
      'Número do processo e ordem judicial',
      'Tipo de restrição (transferência, circulação, penhora)',
      'Data e status do registro judicial'
    ],
    defaultCost: 0.15,
    defaultPrice: 1.32,
    hasContingency: true,
    badgeColor: {
      bg: 'bg-purple-50',
      text: 'text-purple-800',
      border: 'border-purple-200'
    }
  },
  {
    code: 'E10',
    slug: 'comunicacao-venda',
    name: 'Comunicação de Venda Veicular',
    shortName: 'Comunicação de Venda',
    category: 'veicular',
    categoryLabel: 'Veicular',
    inputType: 'placa',
    inputLabel: 'Placa do Veículo',
    placeholder: 'ABC-1234 ou ABC1D23',
    description: 'Verificação de existência de comunicado formal de venda protocolado perante o órgão de trânsito.',
    highlights: [
      'Documento do comprador (CPF ou CNPJ)',
      'Data de protocolo da venda',
      'Status de efetivação do registro',
      'Segurança jurídica contra fraudes de titularidade'
    ],
    defaultCost: 0.10,
    defaultPrice: 1.32,
    hasContingency: false,
    badgeColor: {
      bg: 'bg-slate-100',
      text: 'text-slate-800',
      border: 'border-slate-300'
    }
  },
  {
    code: 'E11',
    slug: 'parentes',
    name: 'Vínculos & Parentescos de 1º Grau',
    shortName: 'Busca de Parentes',
    category: 'cadastral',
    categoryLabel: 'Cadastral',
    inputType: 'cpf',
    inputLabel: 'CPF do Pesquisado',
    placeholder: '000.000.000-00',
    description: 'Mapeamento genealógico de vínculos familiares (mãe, pai, filhos, irmãos e cônjuges) para investigação patrimonial.',
    highlights: [
      'Grau de parentesco identificado',
      'Nome completo do familiar vinculado',
      'Documento do vínculo familiar',
      'Apoio à localização e herança'
    ],
    defaultCost: 0.03,
    defaultPrice: 1.32,
    hasContingency: false,
    badgeColor: {
      bg: 'bg-teal-50',
      text: 'text-teal-800',
      border: 'border-teal-200'
    }
  },
  {
    code: 'E12',
    slug: 'bin',
    name: 'BIN Online - Base de Índice Nacional',
    shortName: 'BIN Online Veicular',
    category: 'veicular',
    categoryLabel: 'Veicular',
    inputType: 'placa',
    inputLabel: 'Placa do Veículo',
    placeholder: 'ABC-1234 ou ABC1D23',
    description: 'Ficha técnica original de fábrica e cadastro nacional do veículo com tripla contingência oficial.',
    highlights: [
      'Número do chassi e remarcação',
      'Código Renavam e situação cadastral',
      'Município e UF de jurisdição',
      'Cor, tipo de combustível e procedência'
    ],
    defaultCost: 0.30,
    defaultPrice: 1.32,
    hasContingency: true,
    badgeColor: {
      bg: 'bg-blue-50',
      text: 'text-blue-800',
      border: 'border-blue-200'
    }
  },
  {
    code: 'E13',
    slug: 'cpf-basico',
    name: 'Consulta CPF Nível I (Cadastral Básico)',
    shortName: 'CPF Nível I',
    category: 'cadastral',
    categoryLabel: 'Cadastral',
    inputType: 'cpf',
    inputLabel: 'CPF do Titular',
    placeholder: '000.000.000-00',
    description: 'Validação e conferência de dados básicos junto à base oficial da Receita Federal.',
    highlights: [
      'Nome civil completo',
      'Data de nascimento e idade',
      'Nome da mãe',
      'Número de RG e órgão emissor'
    ],
    defaultCost: 0.03,
    defaultPrice: 1.32,
    hasContingency: false,
    badgeColor: {
      bg: 'bg-slate-100',
      text: 'text-slate-800',
      border: 'border-slate-300'
    }
  },
  {
    code: 'E14',
    slug: 'gravame',
    name: 'SNG Gravame Financeiro',
    shortName: 'Gravame SNG',
    category: 'veicular',
    categoryLabel: 'Veicular',
    inputType: 'placa',
    inputLabel: 'Placa do Veículo',
    placeholder: 'ABC-1234 ou ABC1D23',
    description: 'Verificação no Sistema Nacional de Gravames sobre financiamentos, alienações fiduciárias e reservas de domínio.',
    highlights: [
      'Status de alienação fiduciária ativa',
      'Instituição financeira / credor fiduciário',
      'Número do contrato e data do gravame',
      'Chassi e remarcação'
    ],
    defaultCost: 0.15,
    defaultPrice: 1.32,
    hasContingency: false,
    badgeColor: {
      bg: 'bg-amber-50',
      text: 'text-amber-800',
      border: 'border-amber-200'
    }
  },
  {
    code: 'E15',
    slug: 'cpf-completo',
    name: 'Consulta CPF Nível II (Cadastral Completo)',
    shortName: 'CPF Nível II Completo',
    category: 'cadastral',
    categoryLabel: 'Cadastral',
    inputType: 'cpf',
    inputLabel: 'CPF do Titular',
    placeholder: '000.000.000-00',
    description: 'Raio-x cadastral aprofundado com endereços históricos, telefones, e-mails, renda presumida e dados complementares.',
    highlights: [
      'Histórico completo de endereços residenciais',
      'Telefones móveis e fixos vinculados',
      'E-mails e dados de contato',
      'Renda estimada e situação cadastral'
    ],
    defaultCost: 0.35,
    defaultPrice: 1.32,
    hasContingency: false,
    badgeColor: {
      bg: 'bg-emerald-50',
      text: 'text-emerald-800',
      border: 'border-emerald-200'
    }
  },
  {
    code: 'E16',
    slug: 'rg',
    name: 'Busca por Registro Geral (RG)',
    shortName: 'Busca por RG',
    category: 'cadastral',
    categoryLabel: 'Cadastral',
    inputType: 'rg',
    inputLabel: 'Número do RG',
    placeholder: 'Digite o número do RG',
    description: 'Localização do CPF e dados de registro civil de titular a partir do número da cédula de identidade.',
    highlights: [
      'Identificação do CPF correspondente',
      'Nome completo do titular',
      'Data de nascimento e filiação',
      'UF de expedição do documento'
    ],
    defaultCost: 0.03,
    defaultPrice: 1.32,
    hasContingency: false,
    badgeColor: {
      bg: 'bg-slate-100',
      text: 'text-slate-800',
      border: 'border-slate-300'
    }
  }
];

export const CATEGORIES_CONFIG = [
  { id: 'todos', label: 'Todos os Produtos', count: 16 },
  { id: 'veicular', label: 'Veicular', count: 8 },
  { id: 'cadastral', label: 'Cadastral', count: 5 },
  { id: 'juridico', label: 'Jurídico', count: 2 },
  { id: 'imobiliario', label: 'Imobiliário', count: 1 },
];

export function getProductByCode(code: string): ProductDefinition | undefined {
  if (!code) return undefined;
  const upper = code.trim().toUpperCase();
  return PRODUCTS_CATALOG.find((p) => p.code === upper || p.slug.toUpperCase() === upper);
}
