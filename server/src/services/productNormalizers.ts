/**
 * Funções de Normalização e Higienização de Dados (Padrão Impeccable)
 * Garante que dados de contingência resultem exatamente no mesmo layout pericial,
 * remove códigos duplicados (ex: código numérico do município) e expurga campos nulos/vazios.
 */

export interface NormalizedResult {
  totalRegistros: number;
  dados: any;
}

/**
 * Remove recursivamente chaves nulas, vazias, strings "null", "N/A"
 * e descarta códigos duplicados redundantes.
 */
export function cleanObject(obj: any): any {
  if (obj === null || obj === undefined) return undefined;
  if (typeof obj === 'string') {
    const trimmed = obj.trim();
    if (trimmed === '' || trimmed.toLowerCase() === 'null' || trimmed.toLowerCase() === 'n/a') {
      return undefined;
    }
    return trimmed;
  }
  if (typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    const cleanedArr = obj
      .map(cleanObject)
      .filter((item) => item !== undefined && item !== null);
    return cleanedArr.length > 0 ? cleanedArr : [];
  }

  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    // Ignorar chaves técnicas internas da API central
    if (key === 'api_central') continue;

    // Regra Impeccable: Descartar códigos de município e outros IDs redundantes quando houver descrição
    if (
      key === 'codigoMunicipio' ||
      key === 'codigo_municipio' ||
      key === 'cod_municipio' ||
      key === 'codigoMunicipioEmplacamento'
    ) {
      continue;
    }

    const cleanedVal = cleanObject(value);
    if (cleanedVal !== undefined && cleanedVal !== null) {
      cleaned[key] = cleanedVal;
    }
  }

  return Object.keys(cleaned).length > 0 ? cleaned : undefined;
}

/**
 * Normalizador E1: Histórico Imobiliário & Cartórios (DOI)
 */
export function normalizeE1(raw: any): NormalizedResult {
  const declaracoes = Array.isArray(raw?.declaracoes) ? raw.declaracoes : [];
  return {
    totalRegistros: declaracoes.length,
    dados: cleanObject({
      periodo: raw?.periodo,
      total_declaracoes: declaracoes.length,
      declaracoes: declaracoes.map((d: any) => ({
        numDeclaracao: d.numDeclaracao,
        matricula: d.matricula,
        registro: d.registro,
        livro: d.livro,
        folha: d.folha,
        dataLavratura: d.dataLavratura || d.infoData,
        cartorio: d.cartorio,
        tipoCartorio: d.tipoCartorio,
        alienantes: d.alienantes || [],
        adquirentes: d.adquirentes || []
      }))
    }) || null
  };
}

/**
 * Normalizador E2: Histórico de Proprietários Veiculares
 */
export function normalizeE2(raw: any): NormalizedResult {
  const historico = Array.isArray(raw?.historico) ? raw.historico : [];
  return {
    totalRegistros: historico.length,
    dados: cleanObject({
      placa: raw?.placa,
      renavam: raw?.renavam,
      proprietario_atual: raw?.proprietario_atual,
      historico
    }) || null
  };
}

/**
 * Normalizador E3: Busca de Frota Veicular
 */
export function normalizeE3(raw: any): NormalizedResult {
  const veiculos = Array.isArray(raw?.veiculos) ? raw.veiculos : [];
  const aviso = raw?.message || raw?.mensagem;
  const orientacao = raw?.hint || raw?.orientacao;

  return {
    totalRegistros: veiculos.length,
    dados: cleanObject({
      documento: raw?.documento,
      proprietario: raw?.proprietario,
      quantidade_veiculos: veiculos.length,
      aviso: aviso,
      orientacao: orientacao,
      veiculos: veiculos.map((v: any) => ({
        placa: v.placa,
        chassi: v.chassi,
        renavam: v.renavam,
        uf: v.uf,
        marca_modelo: v.marca_modelo || v.marcaModelo,
        cor: v.cor,
        ano_fabricacao: v.ano_fabricacao || v.anoFabricacao,
        situacao: v.situacao
      }))
    }) || null
  };
}

/**
 * Normalizador E4: Endereço do Proprietário Veicular
 */
export function normalizeE4(raw: any): NormalizedResult {
  const veic = raw?.veiculo || {};
  const prop = raw?.proprietario || {};
  const end = raw?.endereco || prop?.endereco || {};
  const hasData = !!(raw?.placa || prop.nome || veic.chassi || end.logradouro);

  return {
    totalRegistros: hasData ? 1 : 0,
    dados: cleanObject({
      placa: raw?.placa || veic.placa,
      renavam: raw?.renavam || veic.renavam,
      veiculo: {
        chassi: veic.chassi,
        marca_modelo: veic.cod_marca_modelo_descricao || veic.marca_modelo,
        ano_fabricacao: veic.ano_fabricacao,
        uf_jurisdicao: veic.uf_juridicao || veic.uf
      },
      proprietario: {
        nome: prop.nome,
        documento: prop.num_documento || prop.documento,
        tipo_documento: prop.tipo_documento_descricao || prop.tipo_documento,
        origem_endereco: prop.origem_endereco_descricao || prop.origem_endereco,
        data_atualizacao_endereco: prop.data_atualizacao_endereco_iso || prop.data_atualizacao_endereco,
        logradouro: end.logradouro || prop.logradouro,
        numero: end.numero || prop.numero,
        complemento: end.complemento || prop.complemento,
        bairro: end.bairro || prop.bairro,
        municipio: end.cod_municipio_descricao || end.municipio || prop.municipio,
        uf: end.uf || prop.uf,
        cep: end.cep || prop.cep
      },
      endereco: {
        logradouro: end.logradouro || prop.logradouro,
        numero: end.numero || prop.numero,
        complemento: end.complemento || prop.complemento,
        bairro: end.bairro || prop.bairro,
        municipio: end.cod_municipio_descricao || end.municipio || prop.municipio,
        uf: end.uf || prop.uf,
        cep: end.cep || prop.cep
      }
    }) || null
  };
}

/**
 * Normalizador E5: Histórico de Roubo e Furto (com Contingência Senatran)
 */
export function normalizeE5(raw: any): NormalizedResult {
  let ocorrencias: any[] = [];
  const rawList = Array.isArray(raw?.ocorrencias) ? raw.ocorrencias : [];

  ocorrencias = rawList.map((o: any) => {
    const bo = o.boletim_ocorrencia || {};
    const numBo = bo.num || o.num_bo || bo.numero || o.numeroBoletimAno || o.numero;
    const anoBo = bo.ano || o.ano_bo;
    const numFormatado = numBo ? (anoBo && !String(numBo).includes(String(anoBo)) ? `${numBo}/${anoBo}` : String(numBo)) : undefined;

    return cleanObject({
      tipo: o.cod_indicador_categoria_descricao || o.tipo || 'OCORRÊNCIA',
      data: bo.data || o.data || (anoBo ? `Ano ${anoBo}` : undefined),
      ano: anoBo,
      municipio: bo.municipio || o.municipio,
      uf: bo.uf || o.uf_boletim || o.uf,
      numero_boletim: numFormatado,
      orgao_seguranca: bo.orgao_seguranca || o.orgao_seguranca || (bo.cod_orgao_seguranca || o.cod_orgao_seguranca ? `Cód. ${bo.cod_orgao_seguranca || o.cod_orgao_seguranca}` : undefined),
      descricao: o.descricao,
      chassi: o.chassi
    });
  }).filter(Boolean);

  const chassiGeral = raw?.chassi || rawList[0]?.chassi;

  return {
    totalRegistros: ocorrencias.length,
    dados: cleanObject({
      placa: raw?.placa || raw?.placa_consultada || raw?.placa_resposta,
      chassi: chassiGeral,
      total_ocorrencias: ocorrencias.length,
      ocorrencias
    }) || null
  };
}

/**
 * Normalizador E6: CNH com Imagem Oficial (Senatran)
 */
export function normalizeE6(raw: any): NormalizedResult {
  const cond = raw?.condutor || raw?.data || raw;
  const hasCond = !!(cond?.nome || cond?.cpf);
  const foto = cond?.retrato || cond?.foto || cond?.imagem || cond?.foto_base64;

  return {
    totalRegistros: hasCond ? 1 : 0,
    dados: cleanObject({
      nome: cond.nome,
      cpf: cond.cpf,
      numero_registro: cond.numeroRegistro || cond.num_registro,
      renach: cond.formCnh || cond.num_renach,
      categoria: cond.categoria,
      data_emissao: cond.dataEmissao,
      data_validade: cond.dataValidade,
      validade_vencida: cond.dataValidadeVencida,
      uf: cond.uf,
      nome_mae: cond.nomeMae || cond.mae,
      observacoes: cond.observacoes,
      bloqueios: Array.isArray(cond.bloqueios) && cond.bloqueios.length > 0 ? cond.bloqueios : undefined,
      possui_retencao: cond.possuiRetencaoAdministrativa,
      cursos_especiais: cond.mensagemCursosEspeciais || (Array.isArray(cond.cursosEspeciais) && cond.cursosEspeciais.length > 0 ? cond.cursosEspeciais : undefined),
      foto_base64: foto,
      assinatura_base64: cond.assinatura || cond.assinatura_base64
    }) || null
  };
}

/**
 * Normalizador E7: CNH sem Imagem (com Contingência PWN/Renach)
 */
export function normalizeE7(raw: any): NormalizedResult {
  const data = raw?.data || raw?.condutor || raw;
  const hasData = !!(data?.name || data?.nome || data?.cpf);
  const cnhObj = typeof data?.cnh === 'object' && data?.cnh !== null ? data.cnh : {};
  const rgObj = typeof data?.rg === 'object' && data?.rg !== null ? data.rg : {};
  const pointsObj = typeof data?.points === 'object' && data?.points !== null ? data.points : {};

  return {
    totalRegistros: hasData ? 1 : 0,
    dados: cleanObject({
      nome: data.name || data.nome,
      cpf: data.cpf,
      data_nascimento: data.birthday || data.data_nascimento,
      sexo: data.gender || data.sexo,
      nome_mae: data.mother || data.nome_mae,
      renach: data.renach || data.num_renach || data.formCnh,
      numero_registro: cnhObj.number || (typeof data.cnh === 'string' ? data.cnh : undefined) || data.num_registro || data.numeroRegistro,
      categoria: cnhObj.category || data.category || data.categoria,
      data_validade: cnhObj.dueDate || data.validade || data.data_validade,
      uf: cnhObj.state || data.uf || data.birthState,
      cidade_nascimento: data.birthCity || data.municipio_nascimento,
      rg_numero: rgObj.number || (typeof data.rg === 'string' ? data.rg : undefined),
      rg_orgao: rgObj.dispatcher,
      rg_uf: rgObj.uf,
      pontos_cnh: typeof pointsObj.total === 'number' ? pointsObj.total : undefined,
      impedimento: data.block || data.num_lista_impedimento,
      observacoes: data.observation || data.observacoes
    }) || null
  };
}

/**
 * Normalizador E8: RENAINF - Infrações e Multas Nacionais
 */
export function normalizeE8(raw: any): NormalizedResult {
  const multas = Array.isArray(raw?.multas) ? raw.multas : [];
  return {
    totalRegistros: multas.length,
    dados: cleanObject({
      placa: raw?.placa || raw?.placa_consultada || raw?.placa_resposta,
      total_multas: typeof raw?.quantidade === 'number' ? raw.quantidade : multas.length,
      valor_total: raw?.valor_total,
      valor_total_exigivel: raw?.valor_total_exigivel,
      valor_total_nao_exigivel: raw?.valor_total_nao_exigivel,
      multas: multas.map((m: any) => {
        let dataStr = m.data_infracao_iso || m.data_infracao;
        if (dataStr && /^\d{6}$/.test(String(dataStr))) {
          const s = String(dataStr);
          dataStr = `20${s.substring(0, 2)}-${s.substring(2, 4)}-${s.substring(4, 6)}`;
        }
        const exigivelDesc = m.exigivel === '1' || m.exigivel === 1 ? 'Exigível' : (m.exigivel === '0' || m.exigivel === 0 ? 'Não Exigível' : undefined);
        const situacaoFinal = m.situacao_descricao || m.situacao || exigivelDesc || 'Autuada';

        return cleanObject({
          auto_infracao: m.auto_infracao,
          codigo_infracao: m.codigo_completo || m.cod_infracao || m.codigo,
          orgao_autuador: m.orgao_autuador_descricao || m.orgao_autuador,
          data_infracao: dataStr,
          hora_infracao: m.hora_infracao || m.hora,
          local: m.local_infracao || m.local,
          descricao_infracao: m.descricao || m.cod_infracao_descricao || m.descricao_infracao || m.infracao,
          valor: m.valor_multa || m.valor_infracao || m.valor,
          situacao: situacaoFinal,
          gravidade: m.nivel_gravidade,
          pontos: m.pontos ? `${m.pontos} pts` : undefined,
          artigo_ctb: m.artigo_ctb
        });
      })
    }) || null
  };
}

/**
 * Normalizador E9: RENAJUD - Restrições e Processos Judiciais
 */
export function normalizeE9(raw: any): NormalizedResult {
  const processos = Array.isArray(raw?.processos) ? raw.processos : [];
  return {
    totalRegistros: processos.length,
    dados: cleanObject({
      placa: raw?.placa || raw?.placa_resposta,
      renavam: raw?.renavam || raw?.renavam_resposta,
      total_processos: processos.length,
      processos: processos.map((p: any) => ({
        numero_processo: p.numero_processo,
        tribunal: p.codigo_tribunal || p.tribunal,
        orgao_judiciario: p.nome_orgao_judiciario || p.orgao_judiciario,
        data_inclusao: p.data_inclusao_iso || p.data_inclusao,
        tipo_restricao: p.descricao_tipo_restricao || p.tipo_restricao || 'Restrição Judicial',
        situacao: p.situacao_descricao || p.situacao || 'Ativa'
      }))
    }) || null
  };
}

/**
 * Normalizador E10: Comunicação de Venda Veicular
 */
export function normalizeE10(raw: any): NormalizedResult {
  const ocorrencias = Array.isArray(raw?.ocorrencias) && raw.ocorrencias.length > 0
    ? raw.ocorrencias
    : raw?.comunicacao_venda
      ? [raw.comunicacao_venda]
      : [];

  const cartorio = raw?.dados_veiculo_cartorio || {};
  const compradorRoot = raw?.comprador || {};
  const enderecoRoot = raw?.endereco_comprador || {};
  const controle = raw?.dados_controle || {};

  return {
    totalRegistros: ocorrencias.length,
    dados: cleanObject({
      placa: raw?.placa || raw?.veiculo?.placa,
      renavam: raw?.renavam || raw?.veiculo?.renavam,
      total_comunicados: ocorrencias.length,
      proprietario_crv: cleanObject({
        documento: cartorio.numero_documento_proprietario_crv,
        tipo_documento: cartorio.tipo_documento_proprietario_crv_descricao,
        nome: cartorio.nome_proprietario_crv,
        numero_crv: cartorio.numero_crv && cartorio.numero_crv !== '000000000000' ? cartorio.numero_crv : undefined
      }),
      comunicados: ocorrencias.map((o: any) => {
        let dataVendaStr = o.data_venda_iso || o.data_venda;
        if (dataVendaStr && /^\d{8}$/.test(String(dataVendaStr))) {
          const s = String(dataVendaStr);
          dataVendaStr = `${s.substring(0, 4)}-${s.substring(4, 6)}-${s.substring(6, 8)}`;
        }
        let dataRegistroStr = o.data_registro_iso || o.data_registro || controle.data_registro_iso || controle.data_registro;
        if (dataRegistroStr && /^\d{8}$/.test(String(dataRegistroStr))) {
          const s = String(dataRegistroStr);
          dataRegistroStr = `${s.substring(0, 4)}-${s.substring(4, 6)}-${s.substring(6, 8)}`;
        }

        return cleanObject({
          tipo_documento_comprador: o.tipo_documento_comprador_descricao || compradorRoot.tipo_documento_descricao,
          documento_comprador: o.numero_documento_comprador || compradorRoot.documento,
          nome_comprador: o.nome_comprador || compradorRoot.nome,
          logradouro_comprador: o.logradouro_comprador || enderecoRoot.logradouro,
          numero_imovel_comprador: o.numero_imovel_comprador || enderecoRoot.numero,
          complemento_imovel_comprador: o.complemento_imovel_comprador || enderecoRoot.complemento,
          bairro_imovel_comprador: o.bairro_imovel_comprador || enderecoRoot.bairro,
          municipio_comprador: o.cod_municipio_imovel_comprador_descricao || enderecoRoot.cod_municipio_descricao,
          uf_comprador: o.uf_imovel_comprador || enderecoRoot.uf,
          cep_comprador: o.cep_imovel_comprador || enderecoRoot.cep,
          local_venda: o.cod_municipio_local_venda_descricao,
          data_venda: dataVendaStr,
          data_registro: dataRegistroStr,
          situacao: o.indicador_situacao_descricao || controle.indicador_situacao_descricao || 'Ativo',
          numero_protocolo: o.numero_protocolo
        });
      })
    }) || null
  };
}

/**
 * Normalizador E11: Vínculos & Parentes
 */
export function normalizeE11(raw: any): NormalizedResult {
  const list = Array.isArray(raw?.RESULTADOS) ? raw.RESULTADOS : Array.isArray(raw?.data) ? raw.data : [];
  return {
    totalRegistros: list.length,
    dados: cleanObject({
      cpf_pesquisado: raw?.cpf || raw?.CPF || raw?.query || raw?.meta?.cpf,
      nome_pesquisado: raw?.nome || raw?.NOME || raw?.nome_pesquisado,
      total_vinculos: list.length,
      parentes: list.map((item: any) => {
        const cpfRaw = item.CPF_VINCULO || item.cpf;
        const cpfDigits = cpfRaw ? String(cpfRaw).replace(/\D/g, '').padStart(11, '0') : undefined;
        return cleanObject({
          vinculo: item.VINCULO || item.tipo_vinculo || 'FAMILIAR',
          nome: item.NOME_VINCULO || item.nome,
          cpf: cpfDigits || cpfRaw
        });
      })
    }) || null
  };
}

/**
 * Normalizador E12: BIN Online Veicular (com Tripla Contingência)
 */
export function normalizeE12(raw: any): NormalizedResult {
  const veic = raw?.veiculo || raw || {};
  const hasData = !!(veic.chassi || raw.chassi || veic.placa || raw.placa);
  return {
    totalRegistros: hasData ? 1 : 0,
    dados: cleanObject({
      placa: raw.placa || veic.placa,
      renavam: raw.codigoRenavam || veic.renavam || raw.renavam,
      chassi: raw.chassi || veic.chassi,
      marca_modelo: raw.descricaoMarcaModelo || veic.marcaModelo || veic.marca_modelo,
      ano_fabricacao: raw.anoFabricacao || veic.anoFabricacao || veic.ano_fabricacao,
      ano_modelo: raw.anoModelo || veic.anoModelo || veic.ano_modelo,
      cor: raw.descricaoCor || veic.cor,
      combustivel: raw.descricaoCombustivel || veic.combustivel,
      tipo_veiculo: raw.descricaoTipoVeiculo || veic.tipo,
      situacao: raw.situacao || veic.situacao,
      municipio: raw.descricaoMunicipioEmplacamento || veic.municipio,
      uf: raw.ufJurisdicao || veic.uf
    }) || null
  };
}

/**
 * Normalizador E13: Consulta CPF Nível I (Básica)
 */
export function normalizeE13(raw: any): NormalizedResult {
  const d = raw?.DADOS || raw?.dados || raw;
  const hasData = !!(d?.NOME || d?.nome || d?.CPF || d?.cpf);
  return {
    totalRegistros: hasData ? 1 : 0,
    dados: cleanObject({
      cpf: d.CPF || d.cpf,
      nome: d.NOME || d.nome,
      data_nascimento: d.NASC || d.data_nascimento,
      sexo: d.SEXO || d.sexo,
      nome_mae: d.NOME_MAE || d.nome_mae,
      rg: d.RG || d.rg,
      situacao_receita: d.SITUACAO || d.situacao_cadastral || 'REGULAR'
    }) || null
  };
}

/**
 * Normalizador E14: SNG Gravames Financeiros
 */
export function normalizeE14(raw: any): NormalizedResult {
  const v = raw?.veiculo || raw || {};
  const hasData = !!(v.chassi || raw.chassi || v.placa || raw.placa);
  return {
    totalRegistros: hasData ? 1 : 0,
    dados: cleanObject({
      placa: v.placa || raw.placa,
      renavam: v.renavam || raw.renavam,
      chassi: v.chassi || raw.chassi,
      remarcacao: v.remarcacao_descricao || raw.remarcacao_descricao || 'Normal',
      ano_fabricacao: v.ano_fab,
      ano_modelo: v.ano_mod,
      uf: v.uf_placa,
      gravame: cleanObject({
        ativo: raw.possui_gravame !== false,
        agente_financeiro: raw.agente_financeiro || raw.nome_agente,
        numero_contrato: raw.numero_contrato || raw.contrato,
        data_inclusao: raw.data_inclusao || raw.data_gravame
      })
    }) || null
  };
}

/**
 * Normalizador E15: Consulta CPF Nível II (Completo)
 */
export function normalizeE15(raw: any): NormalizedResult {
  const pessoa = raw?.pessoa || raw;
  const ident = pessoa?.identificacao || pessoa;
  const hasData = !!(ident?.nome || ident?.cpf);
  return {
    totalRegistros: hasData ? 1 : 0,
    dados: cleanObject({
      cpf: ident.cpf,
      nome: ident.nome,
      nome_mae: ident.nome_mae,
      nome_pai: ident.nome_pai,
      data_nascimento: ident.data_nascimento,
      sexo: ident.sexo,
      score: pessoa?.score,
      renda_estimada: pessoa?.renda_presumida || pessoa?.renda,
      enderecos: pessoa?.enderecos || [],
      telefones: pessoa?.telefones || [],
      emails: pessoa?.emails || []
    }) || null
  };
}

/**
 * Normalizador E16: Busca por Registro Geral (RG)
 */
export function normalizeE16(raw: any): NormalizedResult {
  const list = Array.isArray(raw?.data) ? raw.data : [];
  return {
    totalRegistros: list.length,
    dados: cleanObject({
      rg_pesquisado: raw?.meta?.rg,
      total_localizados: list.length,
      registros: list.map((item: any) => ({
        cpf: item.cpf,
        nome: item.nome,
        rg: item.rg,
        data_nascimento: item.nascimento,
        uf: item.uf
      }))
    }) || null
  };
}

/**
 * Mapeador Central de Normalizadores por Código do Produto (E1 a E16)
 */
export function normalizeProductResult(code: string, raw: any): NormalizedResult {
  const upper = code.trim().toUpperCase();
  switch (upper) {
    case 'E1': return normalizeE1(raw);
    case 'E2': return normalizeE2(raw);
    case 'E3': return normalizeE3(raw);
    case 'E4': return normalizeE4(raw);
    case 'E5': return normalizeE5(raw);
    case 'E6': return normalizeE6(raw);
    case 'E7': return normalizeE7(raw);
    case 'E8': return normalizeE8(raw);
    case 'E9': return normalizeE9(raw);
    case 'E10': return normalizeE10(raw);
    case 'E11': return normalizeE11(raw);
    case 'E12': return normalizeE12(raw);
    case 'E13': return normalizeE13(raw);
    case 'E14': return normalizeE14(raw);
    case 'E15': return normalizeE15(raw);
    case 'E16': return normalizeE16(raw);
    default:
      return { totalRegistros: raw ? 1 : 0, dados: cleanObject(raw) };
  }
}
