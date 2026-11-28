/**
 * Funções de Normalização e Higienização de Dados (Padrão Impeccable)
 * Garante que dados de contingência resultem exatamente no mesmo layout pericial,
 * remove códigos duplicados (ex: código numérico do município) e expurga campos nulos/vazios.
 */
import { translateCBO, translateMosaic } from '../utils/cboMosaicUtils';
import { translateOrgaoAutuador } from '../utils/orgaosAutuadoresUtils';

export interface NormalizedResult {
  totalRegistros: number;
  dados: any;
}

/**
 * Expurga metadados técnicos de provedores externos, URLs e tokens,
 * garantindo conformidade 100% Whitelabel com fé pública Renacred.
 */
export function sanitizeWhitelabel(obj: any): any {
  if (obj === null || obj === undefined) return undefined;
  if (typeof obj === 'string') {
    let text = obj.trim();
    if (text === '' || text.toLowerCase() === 'null' || text.toLowerCase() === 'n/a') {
      return undefined;
    }
    // Higienização de termos e URLs de fornecedores terceiros
    text = text.replace(/https?:\/\/[^\s]*fetchbrasil[^\s]*/gi, '');
    text = text.replace(/fetchbrasil(\.pro)?/gi, 'Bases Oficiais');
    text = text.replace(/FB-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}/gi, '');
    return text.trim() || undefined;
  }
  if (typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    const arr = obj
      .map(sanitizeWhitelabel)
      .filter((item) => item !== undefined && item !== null);
    return arr.length > 0 ? arr : [];
  }

  const result: Record<string, any> = {};
  for (const [key, val] of Object.entries(obj)) {
    // Ignorar chaves técnicas de fornecedores externos
    if (
      key === 'api_central' ||
      key === 'fornecedor' ||
      key === 'provedor' ||
      key === 'token' ||
      key === 'tempo_resposta_ms' ||
      (key === 'origem' && typeof val === 'string' && val.toLowerCase().includes('fetch'))
    ) {
      continue;
    }
    const sanitizedVal = sanitizeWhitelabel(val);
    if (sanitizedVal !== undefined && sanitizedVal !== null) {
      result[key] = sanitizedVal;
    }
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

/**
 * Higienização estrita Whitelabel que preserva 100% dos campos, strings vazias (""),
 * booleanos e arrays nativos retornados pela API oficial sem descartar chaves.
 */
export function sanitizeProviderRawPreserve(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') {
    let text = obj;
    text = text.replace(/https?:\/\/[^\s]*fetchbrasil[^\s]*/gi, '');
    text = text.replace(/fetchbrasil(\.pro)?/gi, 'Bases Oficiais');
    text = text.replace(/FB-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}/gi, '');
    return text;
  }
  if (typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map(sanitizeProviderRawPreserve);
  }

  const result: Record<string, any> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (
      key === 'api_central' ||
      key === 'fornecedor' ||
      key === 'provedor' ||
      key === 'token' ||
      key === 'tempo_resposta_ms' ||
      (key === 'origem' && typeof val === 'string' && val.toLowerCase().includes('fetch'))
    ) {
      continue;
    }
    result[key] = sanitizeProviderRawPreserve(val);
  }
  return result;
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
    // Higienização preventiva de marcas de fornecedor
    if (trimmed.toLowerCase().includes('fetchbrasil') || /^FB-[A-Z0-9-]{19}$/i.test(trimmed)) {
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
    // Ignorar chaves técnicas internas da API central e marcas de fornecedores terceiros
    if (
      key === 'api_central' ||
      key === 'fornecedor' ||
      key === 'provedor' ||
      key === 'token' ||
      key === 'tempo_resposta_ms'
    ) {
      continue;
    }

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
 * Higieniza tipos de documento para a convenção moderna: 'CGC' -> 'CNPJ'
 */
export function sanitizeTipoDocumento(tipo?: string | null): string {
  if (!tipo) return 'CNPJ';
  const trimmed = String(tipo).trim().toUpperCase();
  if (trimmed === 'CGC' || trimmed === '2') return 'CNPJ';
  if (trimmed === '1') return 'CPF';
  return trimmed;
}

/**
 * Normalizador E1: Histórico Imobiliário & Cartórios (DOI)
 */
export function normalizeE1(raw: any): NormalizedResult {
  const declaracoes = Array.isArray(raw?.declaracoes) ? raw.declaracoes : [];
  const mensagem = raw?.message || raw?.mensagem || (raw?.isNotFound || declaracoes.length === 0 ? 'Nenhum histórico imobiliário encontrado para o documento informado.' : undefined);
  return {
    totalRegistros: declaracoes.length,
    dados: cleanObject({
      periodo: raw?.periodo,
      total_declaracoes: declaracoes.length,
      mensagem: declaracoes.length === 0 ? mensagem : undefined,
      declaracoes: declaracoes.map((d: any) => {
        const cnpjCartorio = d.cnpjCartorio || d.cnpj_cartorio || d.cnpj;
        return cleanObject({
          numDeclaracao: d.numDeclaracao,
          nome: d.nome,
          tipoParte: d.tipoParte,
          tipoDeclaracao: d.tipoDeclaracao,
          matricula: d.matricula,
          registro: d.registro,
          livro: d.livro,
          folha: d.folha,
          dataLavratura: d.dataLavratura || d.infoData,
          cnpjCartorio: cnpjCartorio,
          cnpj_cartorio: cnpjCartorio,
          cartorio: d.cartorio,
          tipoCartorio: d.tipoCartorio,
          alienantes: d.alienantes || [],
          adquirentes: d.adquirentes || []
        });
      })
    }) || { total_declaracoes: 0, declaracoes: [], mensagem: mensagem || 'Nenhum histórico imobiliário encontrado para o documento informado.' }
  };
}

/**
 * Normalizador E2: Histórico de Proprietários Veiculares
 */
export function normalizeE2(raw: any): NormalizedResult {
  const historico = Array.isArray(raw?.historico) ? raw.historico : [];
  const propAtual = raw?.proprietario_atual;
  const isCnpjDoc = (d: any) => String(d || '').replace(/\D/g, '').length === 14;

  const normalizedPropAtual = propAtual ? {
    ...propAtual,
    nome: propAtual.nome || propAtual.razao_social || undefined,
    razao_social: propAtual.razao_social || (isCnpjDoc(propAtual.documento) ? (propAtual.nome || undefined) : undefined)
  } : undefined;

  const normalizedHistorico = historico.map((h: any) => {
    const isDocCnpj = isCnpjDoc(h.documento || h.cpfcnpj);
    const resolvedName = h.nome || h.razao_social || h.razaoSocial || undefined;
    return {
      ...h,
      nome: resolvedName,
      razao_social: h.razao_social || (isDocCnpj ? resolvedName : undefined)
    };
  });

  const mensagem = raw?.message || raw?.mensagem || (raw?.isNotFound || normalizedHistorico.length === 0 ? 'Nenhum histórico de proprietários encontrado para a placa informada.' : undefined);

  return {
    totalRegistros: normalizedHistorico.length,
    dados: cleanObject({
      placa: raw?.placa,
      renavam: raw?.renavam,
      proprietario_atual: normalizedPropAtual,
      historico: normalizedHistorico,
      mensagem: normalizedHistorico.length === 0 ? mensagem : undefined
    }) || { total: 0, historico: [], mensagem: mensagem || 'Nenhum histórico de proprietários encontrado para a placa informada.' }
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
        tipo_documento: sanitizeTipoDocumento(prop.tipo_documento_descricao || prop.tipo_documento),
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
  const cond = raw?.condutor || {};
  const data = raw?.data || raw?.condutor || raw;
  const cnhObj = (typeof raw?.cnh === 'object' && raw?.cnh !== null)
    ? raw.cnh
    : (typeof data?.cnh === 'object' && data?.cnh !== null ? data.cnh : {});
  const docObj = (typeof raw?.documento === 'object' && raw?.documento !== null)
    ? raw.documento
    : (typeof data?.rg === 'object' && data?.rg !== null ? data.rg : {});
  const endObj = (typeof raw?.address === 'object' && raw?.address !== null)
    ? raw.address
    : (typeof raw?.endereco === 'object' && raw?.endereco !== null)
      ? raw.endereco
      : (typeof data?.address === 'object' && data?.address !== null)
        ? data.address
        : (typeof data?.endereco === 'object' && data?.endereco !== null)
          ? data.endereco
          : (typeof cond?.address === 'object' && cond?.address !== null)
            ? cond.address
            : (typeof cond?.endereco === 'object' && cond?.endereco !== null)
              ? cond.endereco
              : {};
  const pointsObj = typeof data?.points === 'object' && data?.points !== null ? data.points : {};

  // Extração exaustiva do endereço residencial/cadastral (suporta chaves em inglês e português)
  const streetVal = endObj.street || endObj.logradouro || endObj.rua || raw?.street || raw?.logradouro || raw?.rua || data?.street || data?.logradouro;
  const numberVal = endObj.number || endObj.numero || raw?.number || raw?.numero || data?.number || data?.numero;
  const complementVal = endObj.complement || endObj.complemento || raw?.complement || raw?.complemento || data?.complement || data?.complemento;
  const neighborhoodVal = endObj.neighborhood || endObj.bairro || raw?.neighborhood || raw?.bairro || data?.neighborhood || data?.bairro;
  const cityVal = endObj.city || endObj.municipio || endObj.cidade || raw?.city || raw?.municipio || raw?.cidade || data?.city || data?.municipio || data?.cidade;
  const stateVal = endObj.state || endObj.uf || endObj.estado || raw?.state || raw?.uf || raw?.estado || data?.state || data?.uf || data?.estado;
  const postalCodeVal = endObj.postalCode || endObj.cep || raw?.postalCode || raw?.cep || data?.postalCode || data?.cep;

  const hasEndereco = !!(streetVal || neighborhoodVal || cityVal || postalCodeVal || numberVal);

  const enderecoNormalizado = hasEndereco ? cleanObject({
    logradouro: streetVal ? String(streetVal).trim() : undefined,
    numero: numberVal !== undefined && numberVal !== null ? String(numberVal).trim() : undefined,
    complemento: complementVal ? String(complementVal).trim() : undefined,
    bairro: neighborhoodVal ? String(neighborhoodVal).trim() : undefined,
    municipio: cityVal ? String(cityVal).trim() : undefined,
    uf: stateVal ? String(stateVal).trim().toUpperCase() : undefined,
    cep: postalCodeVal ? String(postalCodeVal).replace(/\D/g, '') : undefined,
    street: streetVal ? String(streetVal).trim() : undefined,
    number: numberVal !== undefined && numberVal !== null ? String(numberVal).trim() : undefined,
    complement: complementVal ? String(complementVal).trim() : undefined,
    neighborhood: neighborhoodVal ? String(neighborhoodVal).trim() : undefined,
    city: cityVal ? String(cityVal).trim() : undefined,
    state: stateVal ? String(stateVal).trim().toUpperCase() : undefined,
    postalCode: postalCodeVal ? String(postalCodeVal).replace(/\D/g, '') : undefined
  }) : undefined;

  const hasData = !!(data?.name || data?.nome || cond.nome || data?.cpf || docObj.cpf || raw?.numero || hasEndereco);

  let sexoFormatado = cond.cod_sexo_descricao || data.gender || data.sexo;
  if (!sexoFormatado && cond.cod_sexo) {
    sexoFormatado = cond.cod_sexo === '1' ? 'MASCULINO' : cond.cod_sexo === '2' ? 'FEMININO' : cond.cod_sexo;
  }

  const dataNasc = cond.data_nascimento_iso || data.birthday || cond.data_nascimento || data.data_nascimento;
  const renachVal = cond.num_renach || data.renach || data.num_renach || data.formCnh || raw?.formCnh;
  const rgNumero = docObj.numero || docObj.number || (typeof data.rg === 'string' ? data.rg : undefined);
  const rgOrgao = docObj.orgao_expedidor || docObj.dispatcher;
  const rgUf = docObj.uf;

  const categoria = cnhObj.categoria || cnhObj.category || data.category || data.categoria;
  const dataValidade = cnhObj.validade_iso || cnhObj.dueDate || cnhObj.validade || data.validade || data.data_validade;
  const numRegistro = cond.num_registro || cnhObj.number || cnhObj.num_cnh || cond.num_cnh || (typeof data.cnh === 'string' ? data.cnh : undefined) || data.num_registro || data.numeroRegistro;
  const cidadeNasc = data.birthCity || endObj.cod_municipio_descricao || data.municipio_nascimento;
  const ufNasc = cond.uf || cnhObj.state || cnhObj.uf_cnh || data.uf || data.birthState || endObj.uf;

  return {
    totalRegistros: hasData ? 1 : 0,
    dados: cleanObject({
      nome: cond.nome || data.name || data.nome,
      cpf: data.cpf || docObj.cpf || raw?.numero,
      data_nascimento: dataNasc,
      sexo: sexoFormatado,
      nome_mae: cond.nome_mae || data.mother || data.nome_mae,
      nome_pai: cond.nome_pai || data.father || data.nome_pai,
      renach: renachVal,
      numero_registro: numRegistro,
      categoria: categoria,
      data_validade: dataValidade,
      uf: ufNasc,
      cidade_nascimento: cidadeNasc,
      rg_numero: rgNumero,
      rg_orgao: rgOrgao,
      rg_uf: rgUf,
      pontos_cnh: typeof pointsObj.total === 'number' ? pointsObj.total : undefined,
      impedimento: cond.num_lista_impedimento || data.block || data.num_lista_impedimento,
      observacoes: data.observation || data.observacoes,
      // Endereço Residencial do Condutor
      endereco: enderecoNormalizado,
      street: streetVal ? String(streetVal).trim() : undefined,
      number: numberVal !== undefined && numberVal !== null ? String(numberVal).trim() : undefined,
      complement: complementVal ? String(complementVal).trim() : undefined,
      neighborhood: neighborhoodVal ? String(neighborhoodVal).trim() : undefined,
      city: cityVal ? String(cityVal).trim() : undefined,
      state: stateVal ? String(stateVal).trim().toUpperCase() : undefined,
      postalCode: postalCodeVal ? String(postalCodeVal).replace(/\D/g, '') : undefined,
      logradouro: streetVal ? String(streetVal).trim() : undefined,
      numero_endereco: numberVal !== undefined && numberVal !== null ? String(numberVal).trim() : undefined,
      complemento: complementVal ? String(complementVal).trim() : undefined,
      bairro: neighborhoodVal ? String(neighborhoodVal).trim() : undefined,
      municipio: cityVal ? String(cityVal).trim() : undefined,
      cep: postalCodeVal ? String(postalCodeVal).replace(/\D/g, '') : undefined
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
        const exigivelDesc = m.exigivel === '1' || m.exigivel === 1 ? 'Pendente de Pagamento' : (m.exigivel === '0' || m.exigivel === 0 ? 'Em Processamento' : undefined);
        let situacaoFinal = m.situacao_descricao || m.situacao || exigivelDesc || 'Autuada';
        if (typeof situacaoFinal === 'string') {
          const sLower = situacaoFinal.toLowerCase();
          if (sLower.includes('não exigível') || sLower.includes('nao exigivel')) {
            situacaoFinal = 'Em Processamento';
          } else if (sLower.includes('exigível') || sLower.includes('exigivel')) {
            situacaoFinal = 'Pendente de Pagamento';
          }
        }

        const rawOrgao = m.orgao_autuador_descricao || m.orgao_autuador;
        const codigoOrgao = m.orgao_autuador || m.codigo_orgao_autuador || m.cod_orgao;
        const orgaoInfo = translateOrgaoAutuador(rawOrgao, codigoOrgao);

        return cleanObject({
          auto_infracao: m.auto_infracao,
          codigo_infracao: m.codigo_completo || m.cod_infracao || m.codigo,
          orgao_autuador: orgaoInfo?.descricao || rawOrgao,
          codigo_orgao_autuador: orgaoInfo?.codigo || (codigoOrgao && /^\d+$/.test(String(codigoOrgao)) ? String(codigoOrgao) : undefined),
          orgao_autuador_uf: orgaoInfo?.uf,
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

  const nomeVendedor = cartorio.nome_proprietario_crv || 
                       raw?.veiculo_detalhes?.nomeProprietario || 
                       raw?.proprietario?.nome || 
                       raw?.nome_proprietario;

  return {
    totalRegistros: ocorrencias.length,
    dados: cleanObject({
      placa: raw?.placa || raw?.veiculo?.placa,
      renavam: raw?.renavam || raw?.veiculo?.renavam,
      total_comunicados: ocorrencias.length,
      proprietario_crv: cleanObject({
        documento: cartorio.numero_documento_proprietario_crv,
        tipo_documento: sanitizeTipoDocumento(cartorio.tipo_documento_proprietario_crv_descricao),
        nome: nomeVendedor,
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
          tipo_documento_comprador: sanitizeTipoDocumento(o.tipo_documento_comprador_descricao || compradorRoot.tipo_documento_descricao),
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
  const extra = raw?.extra || veic?.extra || {};
  const hasData = !!(veic.chassi || raw.chassi || veic.placa || raw.placa || extra.chassi || extra.placa);

  // Extração inteligente de Marca e Modelo se vier na string única (ex: "I/MMC PAJERO HPE 3.2 D" ou "VW/GOL 1.0")
  let marca = raw.MARCA || extra.marca || veic.marca;
  let modelo = raw.MODELO || extra.modelo || veic.modelo;
  const marcaModeloFull = raw.descricaoMarcaModelo || veic.marcaModelo || veic.marca_modelo || extra.modelo || '';

  if (!marca && marcaModeloFull) {
    if (marcaModeloFull.includes('/')) {
      const slashParts = marcaModeloFull.split('/');
      if (slashParts[0] === 'I' || slashParts[0] === 'IMP') {
        const afterI = slashParts[1].trim();
        const spaceIdx = afterI.indexOf(' ');
        marca = spaceIdx > -1 ? afterI.slice(0, spaceIdx) : afterI;
        if (!modelo) modelo = spaceIdx > -1 ? afterI.slice(spaceIdx + 1) : marcaModeloFull;
      } else {
        marca = slashParts[0].trim();
        if (!modelo) modelo = slashParts.slice(1).join('/').trim();
      }
    }
  }

  // Funções auxiliares para tratamento pericial de restrições veiculares da BIN
  const formatBinRestricao = (rawDesc: any): string => {
    if (!rawDesc || typeof rawDesc !== 'string') return 'SEM RESTRIÇÃO';
    let str = rawDesc.trim();
    if (!str) return 'SEM RESTRIÇÃO';

    const norm = str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();
    if (
      norm === '0' ||
      norm === '00' ||
      norm === '-' ||
      norm.includes('SEM RESTRICAO') ||
      norm.includes('INEXISTENTE') ||
      norm.includes('NADA CONSTA') ||
      norm.includes('NENHUMA') ||
      norm.includes('NAO CONSTA')
    ) {
      return 'SEM RESTRIÇÃO';
    }

    const mapDesc: Record<string, string> = {
      'ALIENACAO_FIDUCIARIA_FILE_VEICULOS': 'Alienação Fiduciária',
      'ALIENACAO_FIDUCIARIA': 'Alienação Fiduciária',
      'RESTRICAO_ADMINISTRATIVA_FILE_VEICULOS': 'Restrição Administrativa',
      'RESTRICAO_ADMINISTRATIVA': 'Restrição Administrativa',
      'RESTRICAO_TRIBUTARIA_FILE_VEICULOS': 'Restrição Tributária',
      'RESTRICAO_TRIBUTARIA': 'Restrição Tributária',
      'RESTRICAO_JUDICIAL_FILE_VEICULOS': 'Restrição Judicial (RENAJUD)',
      'RESTRICAO_JUDICIAL': 'Restrição Judicial (RENAJUD)',
      'RESTRICAO_GUINCHO_FILE_VEICULOS': 'Restrição de Guincho',
      'RESTRICAO_GUINCHO': 'Restrição de Guincho',
      'RESTRICAO_ROUBO_FURTO_FILE_VEICULOS': 'Restrição de Roubo/Furto',
      'RESTRICAO_ROUBO_FURTO': 'Restrição de Roubo/Furto',
      'ARRENDAMENTO_MERCANTIL_FILE_VEICULOS': 'Arrendamento Mercantil',
      'ARRENDAMENTO_MERCANTIL': 'Arrendamento Mercantil',
      'RESERVA_DE_DOMINIO_FILE_VEICULOS': 'Reserva de Domínio',
      'RESERVA_DE_DOMINIO': 'Reserva de Domínio',
      'PENHOR_FILE_VEICULOS': 'Penhor',
      'PENHOR': 'Penhor',
      'COMUNICACAO_DE_VENDA': 'Comunicação de Venda'
    };

    if (mapDesc[norm]) {
      return mapDesc[norm];
    }

    if (str.includes('\n')) {
      return str.split('\n').map((s: string) => s.trim()).filter(Boolean).join(' / ');
    }

    str = str.replace(/_FILE_VEICULOS/gi, '');
    if (str.includes('_')) {
      str = str.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    }

    return str;
  };

  const isBinRestricaoAtiva = (valor: any): boolean => {
    if (!valor || typeof valor !== 'string') return false;
    const norm = valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();
    if (
      norm === '' ||
      norm === '0' ||
      norm === '00' ||
      norm === '-' ||
      norm.includes('SEM RESTRICAO') ||
      norm.includes('NADA CONSTA') ||
      norm.includes('INEXISTENTE') ||
      norm.includes('NAO CONSTA') ||
      norm.includes('NENHUMA') ||
      norm === 'NORMAL' ||
      norm === 'REGULAR'
    ) {
      return false;
    }
    return true;
  };

  // Tratamento de restrições da BIN (Serpro, Senatran e contingências)
  const r1Raw = raw.descricaoRestricao1 || veic.descricaoRestricao1 || raw.restricao1 || veic.restricao1 || extra.restricao_1 || raw.restricao_1;
  const r2Raw = raw.descricaoRestricao2 || veic.descricaoRestricao2 || raw.restricao2 || veic.restricao2 || extra.restricao_2 || raw.restricao_2;
  const r3Raw = raw.descricaoRestricao3 || veic.descricaoRestricao3 || raw.restricao3 || veic.restricao3 || extra.restricao_3 || raw.restricao_3;
  const r4Raw = raw.descricaoRestricao4 || veic.descricaoRestricao4 || raw.restricao4 || veic.restricao4 || extra.restricao_4 || raw.restricao_4;

  const listaRestricoes: Array<{ label: string; valor: string }> = [
    { label: 'Restrição 1', valor: formatBinRestricao(r1Raw) },
    { label: 'Restrição 2', valor: formatBinRestricao(r2Raw) },
    { label: 'Restrição 3', valor: formatBinRestricao(r3Raw) },
    { label: 'Restrição 4', valor: formatBinRestricao(r4Raw) }
  ];

  // Adicionar restrições adicionais específicas se constarem ativas no Serpro / Senatran
  if (raw.indicadorRestricaoRenajud === true || veic.possuiRestricaoJudicial === true) {
    const alreadyListed = listaRestricoes.some(r => isBinRestricaoAtiva(r.valor) && (r.valor.toUpperCase().includes('JUDICIAL') || r.valor.toUpperCase().includes('RENAJUD')));
    if (!alreadyListed) {
      listaRestricoes.push({ label: 'Restrição RENAJUD', valor: 'Consta Bloqueio Judicial (RENAJUD)' });
    }
  }

  if (raw.indicadorRouboFurto === true || veic.possuiOcorrenciaRouboFurto === true) {
    const alreadyListed = listaRestricoes.some(r => isBinRestricaoAtiva(r.valor) && (r.valor.toUpperCase().includes('ROUBO') || r.valor.toUpperCase().includes('FURTO')));
    if (!alreadyListed) {
      listaRestricoes.push({ label: 'Alerta Roubo/Furto', valor: 'Consta Alerta Ativo de Roubo/Furto' });
    }
  }

  if (raw.indicadorComunicacaoVenda === true) {
    const alreadyListed = listaRestricoes.some(r => isBinRestricaoAtiva(r.valor) && r.valor.toUpperCase().includes('COMUNICACAO'));
    if (!alreadyListed) {
      listaRestricoes.push({ label: 'Comunicação de Venda', valor: 'Consta Comunicação de Venda Ativa' });
    }
  }

  if (raw.descricaoRestricaoRfb && !['INEXISTENTE', '0', '00', 'SEM RESTRICAO'].includes(String(raw.descricaoRestricaoRfb).toUpperCase())) {
    listaRestricoes.push({ label: 'Restrição RFB', valor: String(raw.descricaoRestricaoRfb) });
  }

  // Se houver indicador de restrição de Renavam sem descrição mapeada
  const hasSomeActive = listaRestricoes.some(r => isBinRestricaoAtiva(r.valor));
  if ((raw.indicadorRestricaoRenvm === 'S' || veic.indicadorRestricaoRenvm === 'S') && !hasSomeActive) {
    listaRestricoes.push({
      label: 'Restrição Renavam',
      valor: raw.descricaoRestricaoRenavam || veic.descricaoRestricaoRenavam || 'Consta Restrição Ativa no Órgão de Trânsito'
    });
  }

  const temRestricaoAtiva = listaRestricoes.some(r => isBinRestricaoAtiva(r.valor));

  return {
    totalRegistros: hasData ? 1 : 0,
    dados: cleanObject({
      placa: raw.placa || extra.placa || extra.placa_modelo_antigo || veic.placa,
      placa_modelo_antigo: extra.placa_modelo_antigo || raw.placa,
      placa_modelo_novo: extra.placa_modelo_novo,
      renavam: raw.codigoRenavam || extra.renavam || veic.renavam || raw.renavam,
      chassi: raw.chassi || extra.chassi || veic.chassi,
      marca: marca,
      modelo: modelo || marcaModeloFull,
      submodelo: raw.SUBMODELO || extra.grupo,
      versao: raw.VERSAO,
      marca_modelo: marcaModeloFull || (marca && modelo ? `${marca}/${modelo}` : undefined),
      ano_fabricacao: raw.ano || extra.ano_fabricacao || raw.anoFabricacao || veic.anoFabricacao || veic.ano_fabricacao,
      ano_modelo: raw.anoModelo || extra.ano_modelo || veic.anoModelo || veic.ano_modelo,
      cor: raw.cor || extra.cor || raw.descricaoCor || veic.cor,
      combustivel: extra.combustivel || raw.descricaoCombustivel || veic.combustivel,
      tipo_veiculo: extra.tipo_veiculo || raw.descricaoTipoVeiculo || veic.tipo,
      especie: extra.especie || extra['s.especie'] || raw.descricaoEspecieVeiculo,
      segmento: extra.segmento,
      sub_segmento: extra.sub_segmento,
      nacionalidade: extra.nacionalidade,
      municipio: extra.municipio || raw.descricaoMunicipioEmplacamento || veic.municipio,
      uf: extra.uf || extra.uf_placa || raw.ufJurisdicao || veic.uf,

      // Dados de motor e mecânica
      motor: raw.numeroMotor || veic.numeroMotor || extra.motor || raw.motor,
      carroceria: raw.descricaoTipoCarroceria || extra.carroceria,
      caixa_cambio: extra.caixa_cambio,
      cilindradas: extra.cilindradas && extra.cilindradas !== '0' ? extra.cilindradas : undefined,
      eixos: extra.eixos && extra.eixos !== '0' ? extra.eixos : undefined,
      cap_maxima_tracao: extra.cap_maxima_tracao && extra.cap_maxima_tracao !== '0' ? extra.cap_maxima_tracao : undefined,
      peso_bruto_total: extra.peso_bruto_total && extra.peso_bruto_total !== '0' ? extra.peso_bruto_total : undefined,
      quantidade_passageiro: extra.quantidade_passageiro && extra.quantidade_passageiro !== '0' ? extra.quantidade_passageiro : undefined,
      tipo_montagem: extra.tipo_montagem,

      // Proprietário Registrado (BIN / DETRAN)
      proprietario_nome: raw.nomeProprietario || veic.nomeProprietario || raw.proprietario_nome || extra.proprietario || raw.proprietario || extra.nome_proprietario,
      proprietario_documento: raw.numeroIdentificacaoProprietario || veic.niProprietario || veic.documentoProprietario || raw.documento_proprietario || extra.documento_proprietario || extra.cpf_cnpj_proprietario,
      tipo_doc_prop: raw.descricaoTipoProprietario || extra.tipo_doc_prop || raw.tipo_doc_prop,
      data_emissao_crv: raw.dataEmissaoCrv || raw.data_emissao_crv || extra.data_emissao_crv,

      // Dados Fiscais e Faturamento
      faturado_documento: raw.numeroIdFaturamento || raw.faturado_documento || extra.faturado || extra.faturado_documento || raw.faturado,
      tipo_doc_faturado: raw.tipoDocFaturado || raw.tipo_doc_faturado || extra.tipo_doc_faturado,
      uf_faturado: raw.ufFaturado || raw.uf_faturado || extra.uf_faturado,
      di: extra.di && extra.di !== '0' ? extra.di : undefined,
      registro_di: extra.registro_di,

      // Restrições e Situação
      situacao_veiculo: raw.situacaoVeiculo ? (raw.situacaoVeiculo === 'EM_CIRCULACAO' ? 'Em Circulação (Regular)' : raw.situacaoVeiculo) : (extra.situacao_veiculo === 'S' ? 'Em Circulação (Regular)' : (extra.situacao_veiculo || raw.situacao || 'Regular')),
      situacao_chassi: extra.situacao_chassi === 'N' ? 'Normal (Não Remarcado)' : (extra.situacao_chassi || 'Normal'),
      limite_restricao_trib: extra.limite_restricao_trib,
      tem_restricao: temRestricaoAtiva,
      restricoes: listaRestricoes,
      data_registro_base: raw.data
    }) || null
  };
}

/**
 * Normalizador E13: Consulta CPF Nível I (Cadastral Básico)
 */
export function normalizeE13(raw: any): NormalizedResult {
  const d = raw?.DADOS || raw?.dados || raw || {};
  const hasData = !!(d?.NOME || d?.nome || d?.CPF || d?.cpf);

  // Score
  const rawScore = Array.isArray(d?.SCORE) ? d.SCORE[0] : (d?.score || d?.SCORE);
  const csbaVal = rawScore?.CSBA ?? rawScore?.csba ?? (typeof rawScore === 'number' ? rawScore : undefined);
  const csbaFaixa = rawScore?.CSBA_FAIXA || rawScore?.csba_faixa || rawScore?.faixa;

  // Telefones
  const rawTels = Array.isArray(d?.TELEFONES) ? d.TELEFONES : (Array.isArray(d?.telefones) ? d.telefones : []);
  const telefonesFormatados = rawTels.map((t: any) => {
    if (typeof t === 'string') {
      return cleanObject({
        numero: t,
        data_atualizacao: undefined
      });
    }
    const ddd = t.DDD || t.ddd;
    const tel = t.TELEFONE || t.telefone || t.numero;
    let strTelFormatado = '';
    if (ddd && tel) {
      const strTel = String(tel).trim();
      if (strTel.length === 9) {
        strTelFormatado = `(${ddd}) ${strTel.substring(0, 5)}-${strTel.substring(5)}`;
      } else if (strTel.length === 8) {
        strTelFormatado = `(${ddd}) ${strTel.substring(0, 4)}-${strTel.substring(4)}`;
      } else {
        strTelFormatado = `(${ddd}) ${strTel}`;
      }
    } else {
      strTelFormatado = String(t.TELEFONE || t.telefone || t.numero || t);
    }

    const dt = t.DT_INCLUSAO || t.DT_INFORMACAO || t.data_atualizacao || t.dt_inclusao || t.dt_informacao || t.data;

    return cleanObject({
      numero: strTelFormatado,
      data_atualizacao: dt,
      tipo: t.TIPO_TELEFONE === 1 ? 'Fixo' : (t.TIPO_TELEFONE === 2 ? 'Móvel' : undefined),
      classificacao: t.CLASSIFICACAO
    });
  }).filter((item: any) => item && item.numero);

  // E-mails
  const rawEmails = Array.isArray(d?.EMAILS) ? d.EMAILS : (Array.isArray(d?.emails) ? d.emails : []);
  const emailsFormatados = rawEmails.map((e: any) => {
    if (typeof e === 'string') {
      return cleanObject({
        email: e,
        data_atualizacao: undefined
      });
    }
    const emailVal = e.EMAIL || e.email;
    const dt = e.DT_INCLUSAO || e.DT_INFORMACAO || e.data_atualizacao || e.dt_inclusao || e.dt_informacao || e.data;

    return cleanObject({
      email: emailVal,
      data_atualizacao: dt,
      score: e.EMAIL_SCORE,
      status: e.STATUS_VT
    });
  }).filter((item: any) => item && item.email);

  // Endereços
  const rawEnds = Array.isArray(d?.ENDERECOS) ? d.ENDERECOS : (Array.isArray(d?.enderecos) ? d.enderecos : []);
  const enderecosFormatados = rawEnds.map((end: any) => {
    const tipo = end.LOGR_TIPO || end.tipo_logradouro;
    const nome = end.LOGR_NOME || end.logradouro || end.rua;
    const logradouroFull = [tipo, nome].filter(Boolean).join(' ') || end.logradouro;
    return cleanObject({
      logradouro: logradouroFull,
      numero: end.LOGR_NUMERO || end.numero,
      complemento: end.LOGR_COMPLEMENTO || end.complemento,
      bairro: end.BAIRRO || end.bairro,
      cidade: end.CIDADE || end.cidade || end.municipio,
      uf: end.UF || end.uf,
      cep: end.CEP || end.cep
    });
  }).filter(Boolean);

  // RG
  const rgNumero = d.RG || d.rg || (typeof d.documentos?.rg === 'object' ? d.documentos?.rg?.numero : d.documentos?.rg);
  const rgOrgao = d.ORGAO_EMISSOR || d.orgao_emissor || d.documentos?.rg?.orgao_emissor;
  const rgUf = d.UF_EMISSAO || d.uf_emissao || d.documentos?.rg?.uf;

  // Título de Eleitor
  const titulo = d.TITULO_ELEITOR || d.titulo_eleitor;
  const zona = d.ZONA || d.zona;
  const secao = d.SECAO || d.secao;

  // CBO & Perfil Socioeconômico (Serasa Mosaic Brasil Novo tem prioridade sobre o legado)
  const rawCbo = d.CBO || d.cbo;
  const cboInfo = translateCBO(rawCbo);
  const rawMosaic = 
    d.CD_MOSAIC_NOVO ||
    d.cd_mosaic_novo ||
    d.MOSAIC_NOVO ||
    d.mosaic_novo ||
    d.CD_MOSAIC ||
    d.cd_mosaic ||
    d.MOSAIC ||
    d.mosaic ||
    d.CD_MOSAIC_SECUNDARIO;
  const mosaicInfo = translateMosaic(rawMosaic);

  return {
    totalRegistros: hasData ? 1 : 0,
    dados: cleanObject({
      cpf: d.CPF || d.cpf,
      nome: d.NOME || d.nome,
      data_nascimento: d.NASC || d.data_nascimento,
      sexo: d.SEXO || d.sexo,
      nome_mae: d.NOME_MAE || d.nome_mae,
      nome_pai: d.NOME_PAI || d.nome_pai,
      estado_civil: d.ESTCIV || d.estado_civil,
      nacionalidade: d.NACIONALID || d.nacionalidade || 'Brasileira',
      cbo: cboInfo?.codigo || rawCbo,
      cbo_titulo: cboInfo?.titulo,
      cbo_formatado: cboInfo?.formatado,
      mosaic: mosaicInfo?.codigo || rawMosaic,
      mosaic_novo: d.CD_MOSAIC_NOVO || d.cd_mosaic_novo,
      mosaic_legado: d.CD_MOSAIC || d.cd_mosaic,
      mosaic_descricao: mosaicInfo?.descricaoCompleta,
      mosaic_texto: mosaicInfo?.descricaoTexto,
      perfil_socioeconomico: mosaicInfo?.descricaoCompleta || rawMosaic,
      perfil_socioeconomico_info: mosaicInfo ? {
        codigo: mosaicInfo.codigo,
        grupo: mosaicInfo.grupoNome,
        grupo_descricao: mosaicInfo.grupoDescricao,
        segmento: mosaicInfo.segmento,
        descricao: mosaicInfo.descricaoCompleta,
        texto: mosaicInfo.descricaoTexto
      } : undefined,
      renda: d.RENDA || d.renda,
      rg: rgNumero ? {
        numero: rgNumero,
        orgao_emissor: rgOrgao,
        uf: rgUf
      } : undefined,
      titulo_eleitor: titulo ? {
        numero: String(titulo),
        zona: zona,
        secao: secao
      } : undefined,
      situacao_cadastral: d.SITUACAO || d.situacao || (d.DT_SIT_CAD ? 'REGULAR' : 'REGULAR'),
      data_situacao_cadastral: d.DT_SIT_CAD || d.dt_sit_cad || d.data_situacao_cadastral,
      data_inscricao: d.DT_INFORMACAO || d.dt_informacao || d.data_inscricao,
      obito: d.DT_OB || d.dt_ob ? { data: d.DT_OB || d.dt_ob, consta: true } : { consta: false },
      score: csbaVal ? {
        csba: csbaVal,
        csba_faixa: csbaFaixa
      } : undefined,
      telefones: telefonesFormatados,
      emails: emailsFormatados,
      enderecos: enderecosFormatados
    }) || null
  };
}

/**
 * Normalizador E14: SNG Gravames Financeiros
 */
export function normalizeE14(raw: any): NormalizedResult {
  const v = raw?.veiculo || raw || {};
  const gravamesList = Array.isArray(raw?.gravames) ? raw.gravames : (raw?.gravame ? [raw.gravame] : (Array.isArray(v?.gravames) ? v.gravames : []));
  const qtdGravames = typeof raw?.qtd_gravames === 'number' ? raw.qtd_gravames : gravamesList.length;
  const hasRealVehicle = !!(v.chassi || raw.chassi || v.renavam || raw.renavam);
  const hasData = hasRealVehicle || gravamesList.length > 0;

  // Processamento da lista de gravames
  const gravamesFormatados = gravamesList.map((g: any) => {
    // Limpeza de data de contrato (ex: "20180322indicativo_" -> "2018-03-22")
    let dtContrato = g.data_contrato_iso || g.data_contrato;
    if (dtContrato && typeof dtContrato === 'string') {
      const match = dtContrato.match(/^(\d{4})(\d{2})(\d{2})/);
      if (match) {
        dtContrato = `${match[1]}-${match[2]}-${match[3]}`;
      }
    }

    let dtStatus = g.data_status_iso || g.data_status;
    if (dtStatus && typeof dtStatus === 'string') {
      const match = dtStatus.match(/^(\d{4})(\d{2})(\d{2})/);
      if (match) {
        dtStatus = `${match[1]}-${match[2]}-${match[3]}`;
      }
    }

    const statusDesc = g.status_veiculo_descricao || g.status_descricao || g.status || g.situacao;
    const isBaixado = statusDesc && /baixad|desalienad|cancelad|liberad/i.test(statusDesc);
    const isAtivo = !isBaixado && (g.ativo !== false && g.situacao !== 'BAIXADO');

    // Desacolchoar CPF caso venha com padding de 14 dígitos (padrão SNG B3: 000 + 11 dígitos do CPF)
    let docFinanciado = g.documento_financiado || g.documento || g.cpf_cnpj || g.cpf;
    if (docFinanciado) {
      const cleanDoc = String(docFinanciado).replace(/\D/g, '');
      if (cleanDoc.length === 14 && cleanDoc.startsWith('000')) {
        docFinanciado = cleanDoc.slice(3); // 11 dígitos do CPF legítimo
      } else {
        docFinanciado = cleanDoc;
      }
    }

    return cleanObject({
      status_descricao: statusDesc || (isAtivo ? 'Gravame Ativo' : 'Gravame Baixado'),
      situacao: isAtivo ? 'ATIVO' : 'BAIXADO',
      nome_agente: g.nome_agente || g.agente_financeiro,
      cnpj_agente: g.cnpj_agente ? String(g.cnpj_agente).replace(/\D/g, '') : undefined,
      numero_contrato: g.numero_contrato || g.contrato,
      data_contrato: dtContrato,
      numero_restricao: g.numero_restricao,
      nome_financiado: g.nome_financiado,
      documento_financiado: docFinanciado,
      uf_licenciamento: g.uf_licenciamento || v.uf_licenciamento,
      informante_restricao: g.informante_restricao_descricao || g.informante,
      assinatura_eletronica: g.assinatura_eletronica,
      registro_contrato: g.indicativo_registro_contrato_descricao,
      data_status: dtStatus,
      hora_status: g.hora_status_iso || g.hora_status
    });
  }).filter(Boolean);

  // Status consolidado do veículo perante o SNG
  const statusVeiculoDesc = v.status_veiculo_descricao || raw.status_veiculo_descricao;
  const temGravameAtivo = gravamesFormatados.some((g: any) => g.situacao === 'ATIVO');
  const situacaoGeral = temGravameAtivo 
    ? 'ALIENADO / GRAVAME ATIVO' 
    : (gravamesFormatados.length > 0 ? 'DESALIENADO / GRAVAME BAIXADO' : 'NADA CONSTA / SEM GRAVAME');

  return {
    totalRegistros: hasData ? (gravamesFormatados.length > 0 ? gravamesFormatados.length : 1) : 0,
    dados: cleanObject({
      placa: v.placa || raw.placa,
      renavam: v.renavam || raw.renavam,
      chassi: v.chassi || raw.chassi,
      remarcacao: v.remarcacao_descricao || raw.remarcacao_descricao || v.remarcacao || 'Normal',
      remarcacao_descricao: v.remarcacao_descricao || raw.remarcacao_descricao || 'Normal',
      ano_fabricacao: v.ano_fab || v.ano_fabricacao || raw.ano_fab,
      ano_modelo: v.ano_modelo || v.ano_mod || raw.ano_modelo,
      uf_placa: v.uf_placa || v.uf || raw.uf_placa || raw.uf,
      uf_licenciamento: v.uf_licenciamento || raw.uf_licenciamento || v.uf_placa,
      status_veiculo: statusVeiculoDesc || situacaoGeral,
      status_veiculo_descricao: statusVeiculoDesc || situacaoGeral,
      situacao_geral: situacaoGeral,
      tem_gravame_ativo: temGravameAtivo,
      qtd_gravames: qtdGravames,
      gravames: gravamesFormatados,
      // Retrocompatibilidade caso algum componente acesse dados.gravame diretamente
      gravame: gravamesFormatados[0] || undefined,
      veiculo: v,
      _dadosCompletos: raw
    }) || null
  };
}

/**
 * Normalizador E15: Consulta CPF Nível II (Completo)
 */
export function normalizeE15(raw: any): NormalizedResult {
  const pessoa = raw?.pessoa || raw || {};
  const ident = pessoa?.identificacao || raw?.identificacao || pessoa || {};
  const docs = pessoa?.documentos || raw?.documentos || {};
  const fin = pessoa?.financeiro || raw?.financeiro || {};
  const ocup = pessoa?.ocupacao || raw?.ocupacao || {};
  const contatos = pessoa?.contatos || raw?.contatos || {};
  const juridico = pessoa?.juridico || raw?.juridico || {};
  const seguranca = pessoa?.seguranca || raw?.seguranca || {};

  const hasData = !!(ident?.nome || ident?.cpf || raw?.nome || raw?.cpf);

  // Extração e tratamento da Foto
  let fotoBase64: string | undefined = undefined;
  if (Array.isArray(contatos?.fotos) && contatos.fotos.length > 0) {
    fotoBase64 = contatos.fotos[0];
  } else if (Array.isArray(raw?.fotos) && raw.fotos.length > 0) {
    fotoBase64 = raw.fotos[0];
  } else if (typeof raw?.foto === 'string') {
    fotoBase64 = raw.foto;
  } else if (typeof raw?.foto_base64 === 'string') {
    fotoBase64 = raw.foto_base64;
  }

  if (fotoBase64 && typeof fotoBase64 === 'string') {
    const trimmed = fotoBase64.trim();
    if (!trimmed.startsWith('data:image')) {
      fotoBase64 = `data:image/jpeg;base64,${trimmed}`;
    }
  }

  // Situação Cadastral Receita Federal
  let sitCadastral = docs.situacao_cadastral || raw.situacao_cadastral || raw.situacao_receita;
  if (sitCadastral === '2' || sitCadastral === '0' || sitCadastral === 2 || sitCadastral === 0) {
    sitCadastral = 'REGULAR';
  } else if (sitCadastral === '1' || sitCadastral === 1) {
    sitCadastral = 'SUSPENSA';
  } else if (sitCadastral === '3' || sitCadastral === 3) {
    sitCadastral = 'CANCELADA';
  } else if (sitCadastral === '4' || sitCadastral === 4) {
    sitCadastral = 'PENDENTE DE REGULARIZAÇÃO';
  } else if (sitCadastral === '5' || sitCadastral === 5) {
    sitCadastral = 'NULA';
  }

  // Parentescos
  const rawParentes = Array.isArray(raw?.parentes)
    ? raw.parentes
    : (Array.isArray(contatos?.parentes) ? contatos.parentes : (Array.isArray(pessoa?.parentes) ? pessoa.parentes : []));

  const parentes = rawParentes.map((p: any) => {
    const cpfClean = p.cpf ? String(p.cpf).replace(/\D/g, '').padStart(11, '0') : undefined;
    return {
      nome: p.nome,
      vinculo: p.vinculo || p.grau_parentesco || 'FAMILIAR',
      cpf: cpfClean || p.cpf
    };
  });

  // Endereços
  const rawEnderecos = Array.isArray(raw?.enderecos)
    ? raw.enderecos
    : (Array.isArray(pessoa?.enderecos) ? pessoa.enderecos : []);

  // Contatos
  const telefones = Array.isArray(contatos?.telefones)
    ? contatos.telefones
    : (Array.isArray(raw?.telefones) ? raw.telefones : []);

  const emails = Array.isArray(contatos?.emails)
    ? contatos.emails
    : (Array.isArray(raw?.emails) ? raw.emails : []);

  // CNH
  const cnhObj = docs.cnh || pessoa.cnh || raw.cnh;
  const rgObj = docs.rg || pessoa.rg || raw.rg;
  const scoreObj = fin.score || pessoa.score || raw.score;

  // CBO & Perfil Socioeconômico (Serasa Mosaic Brasil Novo tem prioridade sobre legado)
  const rawCbo = ocup.cbo || raw.cbo || raw.CBO;
  const cboInfo = translateCBO(rawCbo);
  const rawMosaic = 
    raw.CD_MOSAIC_NOVO ||
    ocup.cd_mosaic_novo ||
    ocup.mosaic_novo ||
    raw.mosaic_novo ||
    raw.cd_mosaic_novo ||
    ocup.mosaic ||
    raw.mosaic ||
    raw.cd_mosaic ||
    ocup.cd_mosaic ||
    raw.CD_MOSAIC ||
    ocup.CD_MOSAIC ||
    raw.CD_MOSAIC_SECUNDARIO;
  const mosaicInfo = translateMosaic(rawMosaic);

  return {
    totalRegistros: hasData ? 1 : 0,
    dados: cleanObject({
      // Identificação
      cpf: ident.cpf || raw.cpf,
      nome: ident.nome || raw.nome,
      nome_mae: ident.nome_mae || raw.nome_mae,
      nome_pai: ident.nome_pai || raw.nome_pai,
      data_nascimento: ident.data_nascimento || raw.data_nascimento,
      sexo: ident.sexo || raw.sexo,
      nacionalidade: ident.nacionalidade || raw.nacionalidade || 'Brasileira',
      estrangeiro: ident.estrangeiro === 'True' || ident.estrangeiro === true,

      // Documentos Oficiais
      rg: rgObj ? {
        numero: rgObj.numero || (typeof rgObj === 'string' ? rgObj : undefined),
        orgao_emissor: rgObj.orgao_emissor || rgObj.orgao,
        uf: rgObj.uf
      } : undefined,
      titulo_eleitor: docs.titulo_eleitor || raw.titulo_eleitor,
      situacao_cadastral: sitCadastral || 'REGULAR',
      data_situacao_cadastral: docs.data_situacao_cadastral,
      data_inscricao: docs.data_inscricao,
      data_atualizacao: docs.data_atualizacao,
      estado_civil: docs.estado_civil,
      municipio_origem: docs.municipio,
      uf_origem: docs.uf,
      obito: docs.obito ? {
        ano: docs.obito.ano,
        data: docs.obito.data,
        consta: !!(docs.obito.ano || docs.obito.data)
      } : undefined,

      // CNH
      cnh: cnhObj ? {
        numero: cnhObj.numero || cnhObj.numeroRegistro || cnhObj.num_registro,
        categoria: cnhObj.categoria || cnhObj.category,
        uf: cnhObj.uf || cnhObj.state,
        emissao: cnhObj.emissao || cnhObj.data_emissao,
        validade: cnhObj.validade || cnhObj.data_validade || cnhObj.dueDate,
        validade_vencida: cnhObj.validade_vencida ?? false,
        renach: cnhObj.renach || cnhObj.formCnh,
        observacoes: cnhObj.observacoes,
        bloqueios: cnhObj.bloqueios,
        multas: cnhObj.multas,
        exame_toxicologico: cnhObj.exame_toxicologico ? {
          valido: cnhObj.exame_toxicologico.valido,
          mensagem: cnhObj.exame_toxicologico.mensagem
        } : undefined
      } : undefined,

      // Financeiro & Score
      score: {
        csba: scoreObj?.csba || (typeof scoreObj === 'number' ? scoreObj : undefined),
        csba_faixa: scoreObj?.csba_faixa || scoreObj?.faixa
      },
      renda_estimada: fin.renda || raw.renda_presumida || raw.renda,

      // Ocupação Profissional & Perfil Socioeconômico
      ocupacao: {
        cbo: cboInfo?.codigo || rawCbo,
        cbo_titulo: cboInfo?.titulo,
        cbo_formatado: cboInfo?.formatado,
        profissao: ocup.profissao || raw.profissao || cboInfo?.titulo,
        mosaic: mosaicInfo?.codigo || rawMosaic,
        mosaic_descricao: mosaicInfo?.descricaoCompleta,
        perfil_socioeconomico: mosaicInfo?.descricaoCompleta || rawMosaic,
        perfil_socioeconomico_info: mosaicInfo ? {
          codigo: mosaicInfo.codigo,
          grupo: mosaicInfo.grupoNome,
          segmento: mosaicInfo.segmento,
          descricao: mosaicInfo.descricaoCompleta
        } : undefined
      },

      // Biometria Facial / Fotográfica
      foto_base64: fotoBase64,

      // Canais de Contato
      telefones,
      emails,

      // Endereços
      enderecos: rawEnderecos.map((e: any) => ({
        logradouro: e.logradouro,
        numero: e.numero,
        complemento: e.complemento,
        bairro: e.bairro,
        cidade: e.cidade || e.municipio,
        uf: e.uf,
        cep: e.cep
      })),

      // Parentes
      parentes,

      // Jurídico e Vazamentos
      juridico: {
        total_processos: juridico.processos?.total ?? 0,
        processos: juridico.processos?.itens
      },
      seguranca: {
        vazamentos_encontrados: seguranca.vazamentos?.encontrado ?? false,
        total_vazamentos: seguranca.vazamentos?.total ?? 0
      }
    }) || null
  };
}

/**
 * Normalizador E16: Busca por Registro Geral (RG)
 */
export function normalizeE16(raw: any): NormalizedResult {
  const list = Array.isArray(raw?.registros)
    ? raw.registros
    : (Array.isArray(raw?.data) ? raw.data : (Array.isArray(raw) ? raw : (raw?.registro ? [raw.registro] : [])));
  
  const rgPesquisado = raw?.rg_pesquisado || raw?.meta?.rg || raw?.rg || list[0]?.rg;

  const registrosFormatados = list.map((item: any) => {
    const cpfDigits = item.cpf ? String(item.cpf).replace(/\D/g, '').padStart(11, '0') : undefined;
    return cleanObject({
      cpf: cpfDigits || item.cpf,
      nome: item.nome || item.name,
      rg: item.rg || item.numero || rgPesquisado,
      data_nascimento: item.data_nascimento || item.nascimento,
      uf: item.uf || item.estado
    });
  }).filter(Boolean);

  return {
    totalRegistros: registrosFormatados.length,
    dados: cleanObject({
      rg_pesquisado: rgPesquisado,
      total_localizados: registrosFormatados.length,
      registros: registrosFormatados
    }) || null
  };
}

/**
 * Normalizador E17: Busca por Nome Completo (Localizador de CPF)
 */
export function normalizeE17(raw: any, query?: string): NormalizedResult {
  const list = Array.isArray(raw?.RESULTADOS)
    ? raw.RESULTADOS
    : (Array.isArray(raw?.data) ? raw.data : (Array.isArray(raw) ? raw : []));

  const homonimos = list.map((item: any) => {
    const rawCpf = item.CPF || item.cpf;
    const cpfDigits = rawCpf ? String(rawCpf).replace(/\D/g, '').padStart(11, '0') : undefined;
    const sexoRaw = String(item.SEXO || item.sexo || '').trim().toUpperCase();
    const sexo = sexoRaw === 'M' ? 'Masculino' : (sexoRaw === 'F' ? 'Feminino' : (sexoRaw || 'Não informado'));

    let dataNascimento: string | undefined = undefined;
    let idade: number | undefined = undefined;
    const rawNasc = item.NASC || item.data_nascimento || item.nascimento;
    if (rawNasc) {
      const match = String(rawNasc).match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (match) {
        dataNascimento = `${match[3]}/${match[2]}/${match[1]}`;
        const anoNasc = parseInt(match[1], 10);
        const mesNasc = parseInt(match[2], 10);
        const diaNasc = parseInt(match[3], 10);
        const hoje = new Date();
        idade = hoje.getFullYear() - anoNasc;
        const mesDiff = hoje.getMonth() + 1 - mesNasc;
        if (mesDiff < 0 || (mesDiff === 0 && hoje.getDate() < diaNasc)) {
          idade--;
        }
      } else if (String(rawNasc).includes('/')) {
        dataNascimento = String(rawNasc).trim();
      }
    }

    return cleanObject({
      nome: item.NOME || item.nome,
      cpf: cpfDigits,
      sexo,
      nome_mae: item.NOME_MAE || item.nome_mae || null,
      mae: item.NOME_MAE || item.nome_mae || null,
      data_nascimento: dataNascimento,
      nascimento: dataNascimento,
      idade: idade !== undefined && !isNaN(idade) ? idade : undefined
    });
  }).filter(Boolean);

  return {
    totalRegistros: homonimos.length,
    dados: homonimos.length > 0 ? cleanObject({
      nome_pesquisado: query || raw?.meta?.nome || (homonimos[0]?.nome ?? null),
      nomePesquisado: query || raw?.meta?.nome || (homonimos[0]?.nome ?? null),
      total_homonimos: homonimos.length,
      totalHomonimos: homonimos.length,
      registros: homonimos,
      homonimos
    }) : null
  };
}

/**
 * Normalizador E18: Busca por Nome de Mãe/Pai (Filiação & Parentescos)
 */
export function normalizeE18(raw: any, query?: string, extraParams?: any): NormalizedResult {
  const list = Array.isArray(raw?.data)
    ? raw.data
    : (Array.isArray(raw?.filhos) ? raw.filhos : (Array.isArray(raw) ? raw : []));

  const tipoGenitor = extraParams?.tipo || raw?.meta?.tipo || 'mae';

  const filhos = list.map((item: any) => {
    const rawCpf = item.cpf || item.CPF;
    const cpfDigits = rawCpf ? String(rawCpf).replace(/\D/g, '').padStart(11, '0') : undefined;
    return cleanObject({
      cpf: cpfDigits,
      nome: item.nome || item.NOME,
      nascimento: item.nascimento || item.data_nascimento || item.NASC,
      data_nascimento: item.nascimento || item.data_nascimento || item.NASC,
      uf: item.uf || item.UF || item.estado,
      nome_mae: item.nome_mae || item.NOME_MAE,
      mae: item.nome_mae || item.NOME_MAE,
      nome_pai: item.nome_pai || item.NOME_PAI || null,
      pai: item.nome_pai || item.NOME_PAI || null
    });
  }).filter(Boolean);

  return {
    totalRegistros: filhos.length,
    dados: filhos.length > 0 ? cleanObject({
      tipo_pesquisado: tipoGenitor,
      tipo: tipoGenitor,
      nome_pesquisado: query || raw?.meta?.nome,
      nomePesquisado: query || raw?.meta?.nome,
      total_filhos: filhos.length,
      totalFilhos: filhos.length,
      registros: filhos,
      filhos
    }) : null
  };
}

/**
 * Normalizador E19: Busca de RENAVAM por Placa (Exibição Estrita)
 * Requisito estrito: Retornar exclusivamente name, type, year, yearManufacture, renavam e plate
 */
export function normalizeE19(raw: any, query?: string): NormalizedResult {
  const isNotFound = !!(raw?.isNotFound || raw?.isVeiculoInexistente);
  const v = raw?.vehicle || raw?.veiculo || {};
  const m = v?.model || v?.modelo || {};
  const renavamRaw = v?.renavam || raw?.renavam || raw?.codigoRenavam || v?.codigoRenavam || raw?.veiculo?.codigoRenavam;
  const renavam = renavamRaw ? String(renavamRaw).trim() : null;

  if (!renavam || isNotFound) {
    const cleanPlaca = query ? String(query).toUpperCase().trim() : (raw?.placa_consultada || raw?.placa || null);
    const msg = raw?.mensagem || (cleanPlaca
      ? `O veículo de placa ${cleanPlaca} não existe nas bases oficiais de trânsito (SERPRO/SENATRAN).`
      : 'Veículo não encontrado nas bases oficiais de trânsito.');

    return {
      totalRegistros: 0,
      dados: {
        status: 'REGISTRO_NAO_ENCONTRADO',
        mensagem: msg,
        parametro_pesquisado: cleanPlaca,
        total_registros: 0,
        laudo_pericial: cleanPlaca
          ? `Certidão Negativa: Veículo ${cleanPlaca} inexistente nas bases oficiais do SERPRO/SENATRAN.`
          : 'Certidão Negativa: Registro inexistente nas bases oficiais.',
        certidao_negativa: true,
        veiculo_inexistente: true,
        provedor_consultado: raw?.api_central?.api_utilizada || 'placa_serpro',
        consultado_em: new Date().toISOString()
      }
    };
  }

  const name = m.name || v.name || raw?.descricaoMarcaModelo || raw?.marcaModelo || raw?.modelo || 'NÃO INFORMADO';
  const type = m.type || v.type || raw?.descricaoTipoVeiculo || raw?.tipoVeiculo || raw?.especie || 'AUTOMOVEL';
  const year = m.year || v.year || raw?.anoModelo || raw?.ano;
  const yearManufacture = m.yearManufacture || v.yearManufacture || raw?.anoFabricacao;
  const plate = v.plate || raw?.placa || (query ? String(query).toUpperCase().trim() : null);

  return {
    totalRegistros: 1,
    dados: cleanObject({
      name: String(name).trim(),
      type: String(type).trim(),
      year: year ? String(year).trim() : null,
      yearManufacture: yearManufacture ? String(yearManufacture).trim() : null,
      renavam: renavam,
      plate: plate ? String(plate).toUpperCase().trim() : null
    }) || null
  };
}

/**
 * Normalizador E20: Pré Vistoria Veicular Consolidada
 * Consolida 100% da Pré Vistoria InfoSinistros + E5 (Roubo/Furto) + E2 (Proprietários) + Contingência E19 (RENAVAM)
 * com distribuição cruzada inteligente de locadoras, seguradoras, frotas públicas e financeiras.
 */
export function normalizeE20(raw: any, query?: string): NormalizedResult {
  if (!raw) {
    return {
      totalRegistros: 0,
      dados: null
    };
  }

  // Verifica presença de dados materiais de identificação veicular ou histórico
  const temVeiculo = Boolean(raw.veiculo?.placa || raw.veiculo?.chassi || raw.placa);
  const temOcorrencias = Boolean(raw.roubo_furto?.totalOcorrencias || (raw.roubo_furto?.status && raw.roubo_furto.status !== 'regular'));
  const temProprietarios = Boolean(raw.proprietarios?.total || raw.proprietarios?.proprietario_atual);
  const temIndicadores = Boolean(raw.indicadores && Array.isArray(raw.indicadores) && raw.indicadores.length > 0);

  if (!temVeiculo && !temOcorrencias && !temProprietarios && !temIndicadores) {
    return {
      totalRegistros: 0,
      dados: null
    };
  }

  return {
    totalRegistros: 1,
    dados: cleanObject(raw) || null
  };
}

/**
 * Normalizador E21: CNH Customizada (Código SER_JUS_2026) - Base SERPRO
 * Preserva 100% dos dados nativos com organização lógica e expurgo de fornecedor.
 */
export function normalizeE21(raw: any, query?: string): NormalizedResult {
  if (!raw || raw.isNotFound) {
    return {
      totalRegistros: 0,
      dados: {
        cpf: query,
        status: 'REGISTRO_NAO_ENCONTRADO',
        mensagem: raw?.mensagem || raw?.message || 'Nenhum registro de condutor localizado na base SERPRO para o CPF informado.'
      }
    };
  }

  // 100% dos dados brutos sanitizados Whitelabel sem perda de chaves, strings vazias ou arrays
  const sanitized = sanitizeProviderRawPreserve(raw) || {};

  const formatDate = (val?: any) => {
    if (!val) return undefined;
    const str = String(val).trim();
    if (/^\d{2}\/\d{2}\/\d{4}/.test(str)) return str;
    if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
      const parts = str.split('T')[0].split('-');
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return str;
  };

  // Cursos Especializados: compilar e filtrar inexistentes
  const cursosEspecializados: any[] = [];
  const mapeamentoCursos = [
    { sigla: 'Tpp', nome: 'Transporte Coletivo de Passageiros', classif: sanitized.classificacaoCursoTpp, desc: sanitized.descricaoClassificacaoCursoTpp, uf: sanitized.ufCursoTpp, data: sanitized.dataCursoTpp },
    { sigla: 'Te', nome: 'Transporte de Escolares', classif: sanitized.classificacaoCursoTe, desc: sanitized.descricaoClassificacaoCursoTe, uf: sanitized.ufCursoTe, data: sanitized.dataCursoTe },
    { sigla: 'Tcp', nome: 'Transporte de Produtos Perigosos (MOPP)', classif: sanitized.classificacaoCursoTcp, desc: sanitized.descricaoClassificacaoCursoTcp, uf: sanitized.ufCursoTcp, data: sanitized.dataCursoTcp },
    { sigla: 'Tve', nome: 'Veículos de Emergência', classif: sanitized.classificacaoCursoTve, desc: sanitized.descricaoClassificacaoCursoTve, uf: sanitized.ufCursoTve, data: sanitized.dataCursoTve },
    { sigla: 'Tci', nome: 'Transporte de Carga Indivisível', classif: sanitized.classificacaoCursoTci, desc: sanitized.descricaoClassificacaoCursoTci, uf: sanitized.ufCursoTci, data: sanitized.dataCursoTci },
    { sigla: 'Tmt', nome: 'Mototaxista', classif: sanitized.classificacaoCursoTmt, desc: sanitized.descricaoClassificacaoCursoTmt, uf: sanitized.ufCursoTmt, data: sanitized.dataCursoTmt },
    { sigla: 'Tmf', nome: 'Motofretista', classif: sanitized.classificacaoCursoTmf, desc: sanitized.descricaoClassificacaoCursoTmf, uf: sanitized.ufCursoTmf, data: sanitized.dataCursoTmf },
  ];

  for (const c of mapeamentoCursos) {
    const isAtivo = c.classif && String(c.classif).trim() !== '' && c.desc !== 'INEXISTENTE';
    if (isAtivo) {
      cursosEspecializados.push({
        sigla: c.sigla,
        nome: c.nome,
        classificacao: c.classif,
        descricao: c.desc || c.classif,
        uf: c.uf || undefined,
        data: formatDate(c.data)
      });
    }
  }

  // Motivos de Requerimento
  const motivosRequerimento: string[] = [];
  [
    sanitized.descricaoMotivoRequerimento1 || sanitized.motivoRequerimento1,
    sanitized.descricaoMotivoRequerimento2 || sanitized.motivoRequerimento2,
    sanitized.descricaoMotivoRequerimento3 || sanitized.motivoRequerimento3,
    sanitized.descricaoMotivoRequerimento4 || sanitized.motivoRequerimento4
  ].forEach(m => {
    if (m && String(m).trim() !== '' && String(m).toUpperCase() !== 'INEXISTENTE') {
      motivosRequerimento.push(String(m).trim());
    }
  });

  const hasCondutor = !!(sanitized.nome || sanitized.numeroRegistro || sanitized.cpf);

  // 100% dos dados nativos brutos da FetchBrasil copiados sem nenhuma omissão
  const dados: Record<string, any> = {
    // Todos os campos originais da API do SERPRO preservados na raiz de dados
    ...sanitized,

    // Blocos estruturados para visualização gráfica no laudo web
    documentoIdentidade: {
      numero: sanitized.numeroDocumento,
      tipo: sanitized.tipoDocumento,
      descricao: sanitized.descricaoDocumento,
      orgaoExpedidor: sanitized.orgaoExpedidorDocumento,
      uf: sanitized.ufExpedidorDocumento
    },
    endereco: {
      logradouro: sanitized.enderecoLogradouro,
      numero: sanitized.enderecoNumero,
      complemento: sanitized.enderecoComplemento,
      bairro: sanitized.enderecoBairro,
      cep: sanitized.enderecoCep,
      municipio: sanitized.descricaoEnderecoMunicipio || sanitized.enderecoMunicipio,
      uf: sanitized.enderecoUf
    },
    pid: {
      possuiPid: !!(sanitized.numeroFormularioPid && sanitized.numeroFormularioPid !== '000000000'),
      numeroFormularioPid: sanitized.numeroFormularioPid,
      dataValidadePid: formatDate(sanitized.dataValidadePid),
      ufExpedicaoPid: sanitized.ufExpedicaoPid,
      numeroFormularioCnhBasePid: sanitized.numeroFormularioCnhBasePid,
      motivoRequerimentoPid: sanitized.descricaoMotivoRequerimentoPid1 || sanitized.motivoRequerimentoPid1,
      situacaoPid: sanitized.situacaoPid
    },
    cursos: {
      atualizacaoRenovacao: {
        uf: sanitized.ufCursoAtualizacaoRenovacaoCnh,
        data: formatDate(sanitized.dataCursoAtualizacaoRenovacaoCnh),
        modalidade: sanitized.descricaoModalidadeCursoAtualizacaoRenovacaoCnh || sanitized.modalidadeCursoAtualizacaoRenovacaoCnh
      },
      reciclagemInfrator: {
        uf: sanitized.ufCursoReciclagemInfrator || undefined,
        data: formatDate(sanitized.dataCursoReciclagemInfrator),
        modalidade: (sanitized.descricaoModalidadeCursoReciclagemInfrator && sanitized.descricaoModalidadeCursoReciclagemInfrator !== 'INEXISTENTE') 
          ? sanitized.descricaoModalidadeCursoReciclagemInfrator 
          : (sanitized.modalidadeCursoReciclagemInfrator && sanitized.modalidadeCursoReciclagemInfrator !== 'INEXISTENTE' ? sanitized.modalidadeCursoReciclagemInfrator : undefined)
      },
      cursosEspecializados
    },
    impedimentos: {
      numeroListaImpedimento: sanitized.numeroListaImpedimento,
      quantidadeOcorrenciasImpedimentos: sanitized.quantidadeOcorrenciasImpedimentos || 0,
      restricoesMedicas: sanitized.restricoesMedicas || undefined,
      ocorrencias: Array.isArray(sanitized.ocorrencias) ? sanitized.ocorrencias : []
    },
    habilitacaoEstrangeira: {
      paisOrigem: sanitized.descricaoPaisOrigemHabilitacaoEstrangeira !== 'INEXISTENTE' ? sanitized.descricaoPaisOrigemHabilitacaoEstrangeira : undefined,
      registroNacionalEstrangeiro: sanitized.registroNacionalEstrangeiro || undefined,
      identificacao: sanitized.identificacaoHabilitacaoEstrangeira || undefined,
      dataValidade: formatDate(sanitized.dataValidadeHabilitacaoEstrangeira)
    },
    motivosRequerimento,
    isValidadeVencida: sanitized.dataValidadeCnh ? new Date(sanitized.dataValidadeCnh).getTime() < Date.now() : false,

    // Aliases para compatibilidade total 1:1 com integrações e auditoria
    dados_condutor: sanitized,
    _dadosCompletos: sanitized,
    _rawApi: sanitized
  };

  return {
    totalRegistros: hasCondutor ? 1 : 0,
    dados
  };
}

/**
 * Normalizador E22: CNH Customizada (Código SEN_JUS_2026) - Base SENATRAN
 * Preserva 100% dos dados nativos da FetchBrasil (incluindo retrato, campos vazios e estruturas originais).
 */
export function normalizeE22(raw: any, query?: string): NormalizedResult {
  if (!raw || raw.isNotFound) {
    return {
      totalRegistros: 0,
      dados: {
        cpf: query,
        status: 'REGISTRO_NAO_ENCONTRADO',
        mensagem: raw?.mensagem || raw?.message || 'Nenhum registro de condutor localizado na base SENATRAN para o CPF informado.'
      }
    };
  }

  // Sanitização Whitelabel estrita preservando todos os campos, valores vazios e booleanos
  const sanitized = sanitizeProviderRawPreserve(raw) || {};
  const condRaw = sanitized.condutor || sanitized;

  // Extração segura do retrato em Base64
  let fotoBase64: string | undefined = condRaw.retrato || condRaw.foto || condRaw.imagem || condRaw.foto_base64;
  if (fotoBase64 && typeof fotoBase64 === 'string') {
    fotoBase64 = fotoBase64.trim();
    if (!fotoBase64.startsWith('data:image')) {
      fotoBase64 = `data:image/jpeg;base64,${fotoBase64}`;
    }
  } else {
    fotoBase64 = undefined;
  }

  const hasCondutor = !!(condRaw.nome || condRaw.numeroRegistro || condRaw.cpf);

  // 100% dos dados nativos brutos do condutor copiados exatamente da FetchBrasil
  const condutorExact: Record<string, any> = {
    formCnh: condRaw.formCnh !== undefined ? condRaw.formCnh : '',
    numeroRegistro: condRaw.numeroRegistro !== undefined ? condRaw.numeroRegistro : '',
    nome: condRaw.nome !== undefined ? condRaw.nome : '',
    cpf: condRaw.cpf !== undefined ? condRaw.cpf : (query || ''),
    uf: condRaw.uf !== undefined ? condRaw.uf : '',
    nomeMae: condRaw.nomeMae !== undefined ? condRaw.nomeMae : '',
    dataEmissao: condRaw.dataEmissao !== undefined ? condRaw.dataEmissao : '',
    dataValidade: condRaw.dataValidade !== undefined ? condRaw.dataValidade : '',
    dataValidadeVencida: condRaw.dataValidadeVencida !== undefined ? condRaw.dataValidadeVencida : false,
    categoria: condRaw.categoria !== undefined ? condRaw.categoria : '',
    observacoes: condRaw.observacoes !== undefined ? condRaw.observacoes : '',
    bloqueios: Array.isArray(condRaw.bloqueios) ? condRaw.bloqueios : [],
    multas: Array.isArray(condRaw.multas) ? condRaw.multas : [],
    ocorrencias: Array.isArray(condRaw.ocorrencias) ? condRaw.ocorrencias : [],
    mensagemCursosEspeciais: condRaw.mensagemCursosEspeciais !== undefined ? condRaw.mensagemCursosEspeciais : '',
    cursosEspeciais: Array.isArray(condRaw.cursosEspeciais) ? condRaw.cursosEspeciais : [],
    possuiRetencaoAdministrativa: condRaw.possuiRetencaoAdministrativa !== undefined ? condRaw.possuiRetencaoAdministrativa : false,
    retrato: condRaw.retrato !== undefined ? condRaw.retrato : '',
    mensagemExameToxicologico: condRaw.mensagemExameToxicologico !== undefined ? condRaw.mensagemExameToxicologico : '',
    exameToxicologicoValido: condRaw.exameToxicologicoValido !== undefined ? condRaw.exameToxicologicoValido : true,
    mostrarAlertaExameToxicologico: condRaw.mostrarAlertaExameToxicologico !== undefined ? condRaw.mostrarAlertaExameToxicologico : false,
    fraseToxicologicoValido: condRaw.fraseToxicologicoValido !== undefined ? condRaw.fraseToxicologicoValido : '',
    cpfDesformatado: condRaw.cpfDesformatado !== undefined ? condRaw.cpfDesformatado : (condRaw.cpf ? String(condRaw.cpf).replace(/\D/g, '') : (query || '')),
    ehabilitado: condRaw.ehabilitado !== undefined ? condRaw.ehabilitado : true,
    ...condRaw // Preserva quaisquer outros campos extras que o fornecedor envie
  };

  const dados: Record<string, any> = {
    // 1. Cópia exata 1:1 de todos os campos da FetchBrasil na raiz de dados
    ...condutorExact,

    // 2. Objeto 'condutor' idêntico ao retornado pela API da FetchBrasil
    condutor: condutorExact,

    // 3. Blocos auxiliares para componentes e cards de laudo pericial
    biometria: {
      fotoBase64,
      possuiFoto: !!fotoBase64
    },
    exameToxicologico: {
      valido: condutorExact.exameToxicologicoValido,
      mostrarAlerta: !!condutorExact.mostrarAlertaExameToxicologico,
      mensagem: condutorExact.mensagemExameToxicologico,
      fraseRegulamentar: condutorExact.fraseToxicologicoValido
    },
    cursosEspeciaisPainel: {
      mensagem: condutorExact.mensagemCursosEspeciais,
      lista: condutorExact.cursosEspeciais
    },
    _dadosCompletos: {
      success: true,
      condutor: condutorExact
    },
    _rawApi: condutorExact
  };

  return {
    totalRegistros: hasCondutor ? 1 : 0,
    dados
  };
}

/**
 * Normalizador E23: CNH Customizada (Código REN_JUS_2026) - Base RENACH / DETRAN
 * Preserva 100% dos dados nativos com sanitização estrita Whitelabel (0% de vazamento de fornecedor).
 */
export function normalizeE23(raw: any, query?: string): NormalizedResult {
  if (!raw || raw.isNotFound) {
    return {
      totalRegistros: 0,
      dados: {
        cpf: query,
        status: 'REGISTRO_NAO_ENCONTRADO',
        mensagem: raw?.mensagem || raw?.message || 'Nenhum prontuário de condutor localizado na base RENACH para o CPF informado.'
      }
    };
  }

  // Sanitização Whitelabel estrita preservando todos os campos e estruturas originais
  const sanitized = sanitizeProviderRawPreserve(raw) || {};
  delete sanitized.api_central;
  delete sanitized.fornecedor;
  delete sanitized.provedor;
  delete sanitized.token;

  const formatDate = (val?: any) => {
    if (!val) return undefined;
    const str = String(val).trim();
    if (/^\d{2}\/\d{2}\/\d{4}/.test(str)) return str;
    if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
      const parts = str.split('T')[0].split('-');
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    if (/^\d{8}$/.test(str)) {
      return `${str.substring(6, 8)}/${str.substring(4, 6)}/${str.substring(0, 4)}`;
    }
    return str;
  };

  const condutor = sanitized.condutor || {};
  const documento = sanitized.documento || {};
  const endereco = sanitized.endereco || {};
  const nacionalidade = sanitized.nacionalidade || {};
  const contato = sanitized.contato || {};
  const cnh = sanitized.cnh || {};
  const controle = sanitized.controle || {};
  const exames = Array.isArray(sanitized.exames) ? sanitized.exames : [];
  const cursos = Array.isArray(sanitized.cursos) ? sanitized.cursos : [];
  const eventos = Array.isArray(sanitized.eventos) ? sanitized.eventos : [];
  const impedimentos = Array.isArray(sanitized.impedimentos) ? sanitized.impedimentos : [];
  const ocorrencias = Array.isArray(sanitized.ocorrencias) ? sanitized.ocorrencias : [];
  const infracoes = Array.isArray(sanitized.infracoes) ? sanitized.infracoes : [];
  const liberacoes = Array.isArray(sanitized.liberacoes) ? sanitized.liberacoes : [];
  const escolas = Array.isArray(sanitized.escolas) ? sanitized.escolas : [];

  // Formatação amigável de celular
  let telefoneFormatado = contato.telefone_celular;
  if (contato.ddd_celular && contato.telefone_celular) {
    const rawTel = String(contato.telefone_celular).replace(/\D/g, '');
    if (rawTel.length === 9) {
      telefoneFormatado = `(${contato.ddd_celular}) ${rawTel.substring(0, 5)}-${rawTel.substring(5)}`;
    } else if (rawTel.length === 8) {
      telefoneFormatado = `(${contato.ddd_celular}) ${rawTel.substring(0, 4)}-${rawTel.substring(4)}`;
    } else {
      telefoneFormatado = `(${contato.ddd_celular}) ${contato.telefone_celular}`;
    }
  }

  // Normalização de exames médicos periciais
  const examesNormalizados = exames.map((ex: any) => ({
    tipoEvento: ex.tipo_evento_descricao || ex.tipo_evento || 'EXAME',
    tipoAtualizacao: ex.tipo_atualizacao_descricao || ex.tipo_atualizacao || 'SUBSTITUIÇÃO',
    codExame: ex.cod_exame,
    descricaoExame: ex.cod_exame_descricao || ex.codigo_descricao || 'APTIDÃO FÍSICA E MENTAL',
    codigo: ex.codigo,
    dataExame: formatDate(ex.data_exame_iso || ex.data_exame),
    resultado: ex.resultado_descricao || (ex.resultado === '1' ? 'APTO' : ex.resultado || 'APTO'),
    dataValidade: formatDate(ex.data_validade_iso || ex.data_validade),
    cpfExaminador: ex.cpf_examinador1 || ex.cpf_examinador2 || undefined,
    cnpjClinicaCredenciada: ex.cnpj_entidade_creden || undefined,
    municipioExame: ex.cod_municipio_exame_descricao || undefined,
    ufExame: ex.uf_exame || undefined,
    categoriaPretendida: ex.cat_pretendida || undefined,
    categoriaPermitida: ex.cat_permitida || undefined,
    observacoes: ex.observacoes && ex.observacoes !== '99' ? ex.observacoes : undefined,
    restricoes: ex.restricoes_x || undefined
  }));

  // Normalização de cursos de renovação e especializações
  const cursosNormalizados = cursos.map((c: any) => ({
    tipoEvento: c.tipo_evento_descricao || c.tipo_evento || 'CURSO',
    tipoAtualizacao: c.tipo_atualizacao_descricao || c.tipo_atualizacao || 'INCLUSÃO',
    codCurso: c.cod_curso,
    descricaoCurso: c.cod_curso_descricao || c.codigo_descricao || 'ATUALIZAÇÃO PARA RENOVAÇÃO DA CNH',
    codigo: c.codigo,
    modalidade: c.modalidade_descricao || (c.modalidade === '1' ? 'PRESENCIAL (Integral)' : c.modalidade),
    dataInicio: formatDate(c.data_inicio_iso || c.data_inicio),
    dataFim: formatDate(c.data_fim_iso || c.data_fim),
    cargaHoraria: c.carga_horaria && c.carga_horaria !== '000' ? `${c.carga_horaria} horas` : undefined,
    cnpjEntidade: c.cnpj_entidade || undefined,
    ufCurso: c.uf_curso || undefined,
    observacoes: c.observacoes_curso && c.observacoes_curso !== '99' ? c.observacoes_curso : undefined
  }));

  // Histórico de categorias habilitadas
  const categoriasHistorico = [
    { categoria: 'A', dataInicio: formatDate(controle.data_inicio_categoria_a_iso || controle.data_inicio_categoria_a) },
    { categoria: 'B', dataInicio: formatDate(controle.data_inicio_categoria_b_iso || controle.data_inicio_categoria_b) },
    { categoria: 'C', dataInicio: formatDate(controle.data_inicio_categoria_c_iso || controle.data_inicio_categoria_c) },
    { categoria: 'D', dataInicio: formatDate(controle.data_inicio_categoria_d_iso || controle.data_inicio_categoria_d) },
    { categoria: 'E', dataInicio: formatDate(controle.data_inicio_categoria_e_iso || controle.data_inicio_categoria_e) }
  ].filter(cat => !!cat.dataInicio);

  const hasCondutor = !!(condutor.nome || condutor.num_registro || condutor.cpf || sanitized.numero || query);

  const dados: Record<string, any> = {
    // 1. Cópia completa 1:1 sanitizada de todos os nós originais
    ...sanitized,

    // 2. Blocos padronizados com garantias tipográficas para a UI
    condutor: {
      ...condutor,
      cpf: condutor.cpf || sanitized.numero || query,
      dataNascimento: formatDate(condutor.data_nascimento_iso || condutor.data_nascimento),
      sexo: condutor.cod_sexo_descricao || (condutor.cod_sexo === '1' ? 'MASCULINO' : condutor.cod_sexo === '2' ? 'FEMININO' : undefined)
    },
    documento: {
      ...documento,
      tipo: documento.cod_tipo === '1' ? 'RG / IDENTIDADE' : documento.cod_tipo
    },
    endereco: {
      ...endereco,
      municipio: endereco.cod_municipio_descricao || endereco.municipio
    },
    nacionalidade: {
      ...nacionalidade,
      descricao: nacionalidade.cod_nacionalidade_descricao || 'BRASILEIRO'
    },
    contato: {
      ...contato,
      telefoneFormatado
    },
    cnh: {
      ...cnh,
      primeiraHabilitacao: formatDate(cnh.primeira_habilitacao_iso || cnh.primeira_habilitacao),
      validade: formatDate(cnh.validade_iso || cnh.validade),
      situacao: cnh.situacao_codigo_descricao || 'CONFIRMADA',
      motivoRequerimento: cnh.motivo_requerimento_descricao?.['5'] || 'RENOVAÇÃO DE EXAMES',
      isValidadeVencida: cnh.validade_iso ? new Date(cnh.validade_iso).getTime() < Date.now() : false
    },
    controle: {
      ...controle,
      dataUltimaEmissao: formatDate(controle.data_ultima_emissao_historico_iso || controle.data_ultima_emissao_historico),
      categoriasHistorico
    },
    exames: examesNormalizados,
    cursos: cursosNormalizados,
    eventos,
    impedimentos,
    ocorrencias,
    infracoes,
    liberacoes,
    escolas,

    // 3. Aliases Whitelabel completos para compatibilidade 1:1
    _dadosCompletos: sanitized,
    _rawApi: sanitized
  };

  return {
    totalRegistros: hasCondutor ? 1 : 0,
    dados
  };
}

/**
 * Normalizador E24: BDVII - Base de Dados de Veículos Indenizados Integralmente
 */
export function normalizeE24(raw: any, query?: string): NormalizedResult {
  const placa = String(raw?.placa || query || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  const positivo = Boolean(raw?.positivo);

  const dados = {
    placa,
    positivo,
    status: positivo ? 'POSITIVO' : 'NEGATIVO',
    consta_indenizacao: positivo,
    mensagem: raw?.mensagem || (positivo
      ? 'Consta registro de Sinistro com Indenização Integral (BDVII).'
      : 'Nenhum registro de sinistro com indenização integral localizado.'),
    bloco01_entidade: raw?.bloco01Entidade
      ? {
          entidade: raw.bloco01Entidade.entidade,
          razao_social: raw.bloco01Entidade.entidade,
          cnpj: raw.bloco01Entidade.cnpj,
          codigo_susep: raw.bloco01Entidade.codigoSusep
        }
      : null,
    bloco02_sinistro: raw?.bloco02Sinistro
      ? {
          ramo: raw.bloco02Sinistro.ramo,
          tipo_seguro: raw.bloco02Sinistro.tipoSeguro,
          status: raw.bloco02Sinistro.status,
          data_sinistro: raw.bloco02Sinistro.dataSinistro,
          data_posse_seguradora: raw.bloco02Sinistro.dataPosseSeguradora,
          cidade_uf: raw.bloco02Sinistro.cidadeUf
        }
      : null,
    bloco03_segurado: raw?.bloco03Segurado
      ? {
          nome_completo: raw.bloco03Segurado.nomeCompleto,
          tipo_documento: raw.bloco03Segurado.tipoDocumento,
          documento: raw.bloco03Segurado.documento
        }
      : null,
    bloco04_veiculo: raw?.bloco04Veiculo
      ? {
          placa: raw.bloco04Veiculo.placa,
          chassi: raw.bloco04Veiculo.chassi,
          renavam: raw.bloco04Veiculo.renavam,
          marca: raw.bloco04Veiculo.marca,
          modelo: raw.bloco04Veiculo.modelo,
          ano_fabricacao: raw.bloco04Veiculo.anoFabricacao,
          ano_modelo: raw.bloco04Veiculo.anoModelo,
          cor: raw.bloco04Veiculo.cor,
          fipe: raw.bloco04Veiculo.fipe,
          valor: raw.bloco04Veiculo.valor
        }
      : null,
    metadados: {
      total_proprietarios_analisados: raw?.metadados?.totalProprietariosAnalisados ?? 0,
      consultado_em: raw?.metadados?.consultadoEm || new Date().toISOString()
    }
  };

  return {
    totalRegistros: positivo ? 1 : 0,
    dados
  };
}

/**
 * Mapeador Central de Normalizadores por Código do Produto (E1 a E24)
 */
export function normalizeProductResult(code: string, raw: any, query?: string, extraParams?: any): NormalizedResult {
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
    case 'E17': return normalizeE17(raw, query);
    case 'E18': return normalizeE18(raw, query, extraParams);
    case 'E19': return normalizeE19(raw, query);
    case 'E20': return normalizeE20(raw, query);
    case 'E21': return normalizeE21(raw, query);
    case 'E22': return normalizeE22(raw, query);
    case 'E23': return normalizeE23(raw, query);
    case 'E24': return normalizeE24(raw, query);
    default:
      return { totalRegistros: raw ? 1 : 0, dados: cleanObject(raw) };
  }
}

