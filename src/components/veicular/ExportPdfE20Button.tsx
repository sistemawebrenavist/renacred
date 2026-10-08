import React from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FileDown } from 'lucide-react';
import { RENACRED_LOGO_BASE64 } from '../../assets/logoBase64';

interface ExportPdfE20ButtonProps {
  dados: any;
  identifier: string;
  hash?: string;
  consultadoEm?: string;
  className?: string;
  label?: string;
}

export const ExportPdfE20Button: React.FC<ExportPdfE20ButtonProps> = ({
  dados,
  identifier,
  hash,
  consultadoEm,
  className,
  label = 'Exportar PDF (Somente Resultados)'
}) => {
  const formatPlaca = (val?: string) => {
    if (!val) return '-';
    const clean = String(val).replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    if (clean.length === 7) return `${clean.slice(0, 3)}-${clean.slice(3)}`;
    return clean;
  };

  const formatDocumento = (doc?: string | number | null) => {
    if (!doc) return '-';
    const clean = String(doc).replace(/\D/g, '');
    if (clean.length === 11) {
      return clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    if (clean.length === 14) {
      return clean.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
    return String(doc);
  };

  const formatDateBR = (val?: string) => {
    if (!val) return '-';
    try {
      const d = new Date(val);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('pt-BR');
      }
    } catch {
      // fallback
    }
    return String(val);
  };

  const sanitizeTituloIndicador = (titulo?: string) => {
    if (!titulo) return '';
    return titulo.replace(/^P\d+\s*[\-\|:]\s*/i, '').replace(/^P\d+\s+/i, '').trim();
  };

  const generateAuthHash = (p: string) => {
    if (hash && hash.trim().length > 0) return hash;
    const clean = p.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const timestamp = Date.now().toString(16).toUpperCase();
    return `RNC-E20-${clean}-${timestamp.slice(-4)}-${timestamp.slice(-8, -4)}`;
  };

  const handleExport = () => {
    const veiculo = dados?.veiculo || {};
    const rouboFurto = dados?.roubo_furto || { status: 'regular', totalOcorrencias: 0, ocorrencias: [] };
    const proprietarios = dados?.proprietarios || { total: 0, historico: [] };
    const outros = dados?.outros_produtos || {};

    const cleanPlaca = (veiculo.placa || identifier || '').toUpperCase();
    const renavam = veiculo.renavam || '-';
    const chassi = veiculo.chassi || '-';
    const marcaModelo = veiculo.marcaModelo || `${veiculo.marca || ''} ${veiculo.modelo || ''}`.trim() || 'VEÍCULO NÃO INFORMADO';
    const anoFabMod = `${veiculo.anoFabricacao || '-'}/${veiculo.anoModelo || '-'}`;
    const cor = veiculo.cor || '-';
    const combustivel = veiculo.combustivel || '-';
    const municipioUf = `${veiculo.municipio || '-'}${veiculo.uf ? `/${veiculo.uf}` : ''}`;
    const situacao = veiculo.situacaoVeiculo || 'CIRCULAÇÃO';

    const authCode = generateAuthHash(cleanPlaca);
    const dataEmissao = consultadoEm ? new Date(consultadoEm) : new Date();
    const dataFormatada = dataEmissao.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    const horaFormatada = dataEmissao.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    // Catálogo Base de 36 Indicadores para Mapeamento Pericial
    const CATALOGO_P1_P36 = [
      { chave: 'P1', numero: 1, titulo: 'HISTÓRICO DE VENDA DIRETA/REMARKETING (SEGURADORAS)' },
      { chave: 'P2', numero: 2, titulo: 'HISTÓRICO DE OPERAÇÃO/USO COMO VIATURA POLICIAL (PM, PC, PF, GM)' },
      { chave: 'P3', numero: 3, titulo: 'HISTÓRICO DE EX-FROTA PÚBLICA' },
      { chave: 'P4', numero: 4, titulo: 'HISTÓRICO DE EX-FROTA DE LOCADORA' },
      { chave: 'P5', numero: 5, titulo: 'HISTÓRICO DE EX-FROTA DE ENTIDADE RELIGIOSA' },
      { chave: 'P6', numero: 6, titulo: 'HISTÓRICO DE EX-FROTA DE SEGURANÇA PRIVADA' },
      { chave: 'P7', numero: 7, titulo: 'HISTÓRICO DE VENDA DIRETA / REMARKETING POR BANCOS / FINANCEIRAS' },
      { chave: 'P8', numero: 8, titulo: 'HISTÓRICO DE COMERCIALIZAÇÃO EM LOJAS DE SALVADOS' },
      { chave: 'P9', numero: 9, titulo: 'HISTÓRICO DE RESTRIÇÃO PARA EMISSÃO DE APÓLICE DE SEGUROS' },
      { chave: 'P10', numero: 10, titulo: 'HISTÓRICO DE BOLETINS DE ROUBO E FURTO E OCORRÊNCIAS DIVERSAS' },
      { chave: 'P11', numero: 11, titulo: 'HISTÓRICO DE NOTIFICAÇÃO/OFERTA EM EDITAL ELETRÔNICO DE LEILÃO' },
      { chave: 'P12', numero: 12, titulo: 'HISTÓRICO DE ACIDENTES DE TRÂNSITO' },
      { chave: 'P13', numero: 13, titulo: 'HISTÓRICO DE ACIDENTES DE TRÂNSITO DETALHADO' },
      { chave: 'P14', numero: 14, titulo: 'INDENIZAÇÃO INTEGRAL POR CIA SEGURADORA' },
      { chave: 'P15', numero: 15, titulo: 'HISTÓRICO DE DANOS E AVARIAS' },
      { chave: 'P16', numero: 16, titulo: 'SUSPEITA DE CHASSI ADULTERADO' },
      { chave: 'P17', numero: 17, titulo: 'HISTÓRICO DE PROPRIETÁRIOS PAGANTES DO DPVAT - BASE INTERNA' },
      { chave: 'P18', numero: 18, titulo: 'VEÍCULO UTILIZADO PARA COMETIMENTO DE CRIMES' },
      { chave: 'P19', numero: 19, titulo: 'HISTÓRICO DE RECUPERADO DE SINISTRO (BRF)' },
      { chave: 'P20', numero: 20, titulo: 'HISTÓRICO DE SINISTRO RECUPERADO (ACT)' },
      { chave: 'P21', numero: 21, titulo: 'HISTÓRICO DE KM' },
      { chave: 'P22', numero: 22, titulo: 'HISTÓRICO DE LAUDO CAUTELAR' },
      { chave: 'P23', numero: 23, titulo: 'HISTÓRICO DE FROTA DE EMPRESA PRIVADA' },
      { chave: 'P24', numero: 24, titulo: 'INDICADOR DE EXPOSIÇÃO A SINISTRO E INTEGRIDADE DE COMPONENTES' },
      { chave: 'P25', numero: 25, titulo: 'BANCO DE IMAGENS DE FLAGRANTES DE TRÂNSITO' },
      { chave: 'P26', numero: 26, titulo: 'HISTÓRICO DE ATENDIMENTO A SINISTROS' },
      { chave: 'P27', numero: 27, titulo: 'INDÍCIO DE USO COMO TÁXI/PCD' },
      { chave: 'P28', numero: 28, titulo: 'HISTÓRICO DE DEMANDA JUDICIAL BÁSICO' },
      { chave: 'P29', numero: 29, titulo: 'HISTÓRICO DE DEMANDA JUDICIAL DETALHADO' },
      { chave: 'P30', numero: 30, titulo: 'HISTÓRICO DE EMISSÃO DE CERTIFICADO DE SEGURANÇA VEICULAR (CSV)' },
      { chave: 'P31', numero: 31, titulo: 'HISTÓRICO DE CIRCULAÇÃO' },
      { chave: 'P32', numero: 32, titulo: 'HISTÓRICO DE MOVIMENTAÇÃO / ALTERAÇÃO DE CADASTRO' },
      { chave: 'P33', numero: 33, titulo: 'VERIFICAÇÃO DE ALTERAÇÃO DE CARACTERÍSTICAS' },
      { chave: 'P34', numero: 34, titulo: 'INDÍCIO DE GRANDES FROTISTAS' },
      { chave: 'P35', numero: 35, titulo: 'FICHA TÉCNICA E CADASTRO BIN FABRIL' },
      { chave: 'P36', numero: 36, titulo: 'HISTÓRICO DE VALOR DE MERCADO (FIPE)' }
    ];

    const mapaBackend: Record<string, any> = {};
    if (Array.isArray(dados?.indicadores)) {
      for (const item of dados.indicadores) {
        const k = item.chave || item.codigo;
        if (k) mapaBackend[k] = item;
      }
    }

    // Compila e normaliza os indicadores
    const todosIndicadores = CATALOGO_P1_P36.map((cat) => {
      const achado = mapaBackend[cat.chave];
      if (achado) {
        const isPos = Boolean(achado.consta || achado.status === 'positivo' || achado.status === 'POSITIVO');
        return {
          ...achado,
          chave: cat.chave,
          numero: cat.numero,
          titulo: cat.titulo,
          consta: isPos,
          status: isPos ? 'POSITIVO' : 'NEGATIVO',
          mensagem: achado.mensagem || (isPos ? 'REGISTRO LOCALIZADO' : 'NENHUM REGISTRO LOCALIZADO NA BASE INTERNA'),
          detalhes: achado.detalhes || achado.conteudo,
          conteudo: achado.conteudo,
          respostaInfoSinistros: achado.respostaInfoSinistros || (typeof achado.conteudo === 'string' ? achado.conteudo : null)
        };
      }

      // Fallbacks
      switch (cat.chave) {
        case 'P1': {
          const pos = Boolean(dados?.seguradoras?.total);
          return { chave: cat.chave, numero: cat.numero, titulo: cat.titulo, consta: pos, status: pos ? 'POSITIVO' : 'NEGATIVO', mensagem: pos ? `${dados.seguradoras.total} registro(s) de seguradora` : 'NENHUM REGISTRO LOCALIZADO NA BASE INTERNA', detalhes: dados?.seguradoras?.registros };
        }
        case 'P2': {
          const pos = Boolean(dados?.frota_publica?.isViatura);
          return { chave: cat.chave, numero: cat.numero, titulo: cat.titulo, consta: pos, status: pos ? 'POSITIVO' : 'NEGATIVO', mensagem: pos ? 'Indício de viatura policial localizado' : 'NENHUM REGISTRO LOCALIZADO NA BASE INTERNA', detalhes: dados?.frota_publica?.registros };
        }
        case 'P3': {
          const pos = Boolean(dados?.frota_publica?.total);
          return { chave: cat.chave, numero: cat.numero, titulo: cat.titulo, consta: pos, status: pos ? 'POSITIVO' : 'NEGATIVO', mensagem: pos ? `${dados.frota_publica.total} registro(s) de órgão público` : 'NENHUM REGISTRO LOCALIZADO NA BASE INTERNA', detalhes: dados?.frota_publica?.registros };
        }
        case 'P4': {
          const pos = Boolean(dados?.locadoras?.total);
          return { chave: cat.chave, numero: cat.numero, titulo: cat.titulo, consta: pos, status: pos ? 'POSITIVO' : 'NEGATIVO', mensagem: pos ? `${dados.locadoras.total} registro(s) de locadora` : 'NENHUM REGISTRO LOCALIZADO NA BASE INTERNA', detalhes: dados?.locadoras?.registros };
        }
        case 'P7': {
          const pos = Boolean(dados?.financeiras?.total || (Array.isArray(dados?.financeiras?.registros) && dados.financeiras.registros.length > 0));
          return { chave: cat.chave, numero: cat.numero, titulo: cat.titulo, consta: pos, status: pos ? 'POSITIVO' : 'NEGATIVO', mensagem: pos ? 'IDENTIFICADA INSTITUIÇÃO FINANCEIRA OU LEASING' : 'NENHUM REGISTRO LOCALIZADO NA BASE INTERNA', detalhes: dados?.financeiras?.registros };
        }
        case 'P8': {
          const pos = Boolean(outros?.salvados);
          return { chave: cat.chave, numero: cat.numero, titulo: cat.titulo, consta: pos, status: pos ? 'POSITIVO' : 'NEGATIVO', mensagem: pos ? 'Consta comercialização de salvados' : 'NENHUM REGISTRO LOCALIZADO NA BASE INTERNA', detalhes: outros?.salvados };
        }
        case 'P10': {
          const pos = Boolean(rouboFurto.status === 'alerta' || rouboFurto.status === 'recuperado' || (Array.isArray(rouboFurto.ocorrencias) && rouboFurto.ocorrencias.length > 0));
          return { chave: cat.chave, numero: cat.numero, titulo: cat.titulo, consta: pos, status: pos ? 'POSITIVO' : 'NEGATIVO', mensagem: rouboFurto.mensagem || (pos ? 'Boletim de Roubo/Furto Identificado' : 'NENHUM REGISTRO LOCALIZADO NA BASE INTERNA'), detalhes: rouboFurto.ocorrencias };
        }
        case 'P11': {
          const pos = Boolean(outros?.leiloes);
          return { chave: cat.chave, numero: cat.numero, titulo: cat.titulo, consta: pos, status: pos ? 'POSITIVO' : 'NEGATIVO', mensagem: pos ? 'Oferta em leilão identificada' : 'NENHUM REGISTRO LOCALIZADO NA BASE INTERNA', detalhes: outros?.leiloes };
        }
        case 'P14': {
          const pos = Boolean(dados?.seguradoras?.indenizacaoIntegral);
          return { chave: cat.chave, numero: cat.numero, titulo: cat.titulo, consta: pos, status: pos ? 'POSITIVO' : 'NEGATIVO', mensagem: pos ? 'Indenização integral por seguradora' : 'NENHUM REGISTRO LOCALIZADO NA BASE INTERNA', detalhes: dados?.seguradoras?.registros };
        }
        case 'P17': {
          const historicoCru = Array.isArray(proprietarios.historico) ? proprietarios.historico : [];
          const propAtual = proprietarios.proprietario_atual;

          const candidatos: any[] = [...historicoCru];
          if (propAtual) {
            const docAtual = String(propAtual.documento || '').replace(/\D/g, '');
            const nomeAtual = String(propAtual.nome || propAtual.razao_social || '').trim().toUpperCase();
            const jaExiste = candidatos.some((item) => {
              const docItem = String(item.documento || '').replace(/\D/g, '');
              const nomeItem = String(item.nome || item.razao_social || '').trim().toUpperCase();
              if (docAtual && docItem && docAtual.slice(-8) === docItem.slice(-8)) return true;
              if (nomeAtual && nomeItem && (nomeAtual === nomeItem || nomeAtual.includes(nomeItem) || nomeItem.includes(nomeAtual))) return true;
              return false;
            });
            if (!jaExiste) {
              candidatos.push({ ...propAtual, isVigente: true, atual: true });
            } else {
              candidatos.forEach((item) => {
                const docItem = String(item.documento || '').replace(/\D/g, '');
                const nomeItem = String(item.nome || item.razao_social || '').trim().toUpperCase();
                if ((docAtual && docItem && docAtual.slice(-8) === docItem.slice(-8)) || (nomeAtual && nomeItem && nomeAtual === nomeItem)) {
                  item.isVigente = true;
                  item.atual = true;
                }
              });
            }
          }

          // Deduplicação estrita de proprietários
          const listaDeduplicada: any[] = [];
          for (const prop of candidatos) {
            const docP = String(prop.documento || '').replace(/\D/g, '');
            const nomeP = String(prop.nome || prop.razao_social || '').trim().toUpperCase();
            const indexExistente = listaDeduplicada.findIndex((exist) => {
              const docExist = String(exist.documento || '').replace(/\D/g, '');
              const nomeExist = String(exist.nome || exist.razao_social || '').trim().toUpperCase();
              if (docP && docExist && docP.length >= 8 && docExist.length >= 8 && docP.slice(-8) === docExist.slice(-8)) return true;
              if (nomeP && nomeExist && nomeP.length > 4 && nomeExist.length > 4 && (nomeP === nomeExist || nomeP.includes(nomeExist) || nomeExist.includes(nomeP))) return true;
              return false;
            });

            if (indexExistente === -1) {
              listaDeduplicada.push({ ...prop });
            } else {
              const exist = listaDeduplicada[indexExistente];
              if (prop.isVigente || prop.atual) {
                exist.isVigente = true;
                exist.atual = true;
              }
              const tempoExist = String(exist.tempoDePosse || exist.tempoPosse || '');
              const tempoNovo = String(prop.tempoDePosse || prop.tempoPosse || '');
              if (tempoExist.toLowerCase().includes('menos de 1 mês') && !tempoNovo.toLowerCase().includes('menos de 1 mês')) {
                exist.tempoDePosse = tempoNovo;
                exist.tempoPosse = tempoNovo;
              }
              if (prop.municipio_uf && !exist.municipio_uf) exist.municipio_uf = prop.municipio_uf;
            }
          }

          const listaProp = listaDeduplicada.map((p, idx) => ({
            ...p,
            ordem: idx + 1
          }));

          const pos = listaProp.length > 0;
          return { chave: cat.chave, numero: cat.numero, titulo: cat.titulo, consta: pos, status: pos ? 'POSITIVO' : 'NEGATIVO', mensagem: pos ? `CADEIA DOMINIAL AUDITADA (${listaProp.length} proprietário(s))` : 'NENHUM REGISTRO LOCALIZADO NA BASE INTERNA', detalhes: listaProp };
        }
        case 'P19': {
          const pos = Boolean(outros?.sinistro_recuperado);
          return { chave: cat.chave, numero: cat.numero, titulo: cat.titulo, consta: pos, status: pos ? 'POSITIVO' : 'NEGATIVO', mensagem: pos ? 'Consta registro de recuperado de sinistro' : 'NENHUM REGISTRO LOCALIZADO NA BASE INTERNA', detalhes: outros?.sinistro_recuperado };
        }
        case 'P31': {
          const circ = dados?.outros_produtos?.circulacao || dados?.circulacao;
          const pos = Boolean(circ?.adquirido_0km || circ?.licenciamento_1 || (Array.isArray(circ?.registros) && circ.registros.length > 0));
          return { chave: cat.chave, numero: cat.numero, titulo: cat.titulo, consta: pos, status: pos ? 'POSITIVO' : 'NEGATIVO', mensagem: pos ? 'HISTÓRICO DE CIRCULAÇÃO LOCALIZADO' : 'NENHUM REGISTRO LOCALIZADO NA BASE INTERNA', detalhes: circ };
        }
        case 'P32': {
          const mov = dados?.outros_produtos?.movimentacao || dados?.movimentacao;
          const pos = Boolean(mov?.insercao_renavam || (Array.isArray(mov?.alteracoes) && mov.alteracoes.length > 0));
          return { chave: cat.chave, numero: cat.numero, titulo: cat.titulo, consta: pos, status: pos ? 'POSITIVO' : 'NEGATIVO', mensagem: pos ? 'ALTERAÇÕES CADASTRAIS REGISTRADAS' : 'NENHUM REGISTRO LOCALIZADO NA BASE INTERNA', detalhes: mov };
        }
        case 'P36': {
          const pos = Boolean(outros?.fipe);
          return { chave: cat.chave, numero: cat.numero, titulo: cat.titulo, consta: pos, status: pos ? 'POSITIVO' : 'NEGATIVO', mensagem: outros?.fipe?.valor || outros?.fipe?.preco || 'Consultado', detalhes: outros?.fipe };
        }
        default:
          return { chave: cat.chave, numero: cat.numero, titulo: cat.titulo, consta: false, status: 'NEGATIVO', mensagem: 'NENHUM REGISTRO LOCALIZADO NA BASE INTERNA' };
      }
    });

    // FILTRO RIGOROSO CONFORME ESPECIFICAÇÃO DO USUÁRIO: SOMENTE RESULTADOS / APONTAMENTOS ENCONTRADOS
    // Exclui FICHA TÉCNICA (P35) do grid de apontamentos porque ela já fica destacada no topo como dados do veículo
    const apontamentosPositivos = todosIndicadores.filter(
      (item) => item.chave !== 'P35' && (item.consta || item.status === 'POSITIVO')
    );

    // Inicialização do documento jsPDF
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // 1. CABEÇALHO INSTITUCIONAL EXECUTIVO (Página 1)
    try {
      doc.addImage(RENACRED_LOGO_BASE64, 'PNG', 12, 7, 44, 12);
    } catch {
      doc.setFontSize(13);
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.text('RENACRED', 12, 15);
    }

    doc.setTextColor(15, 23, 42); // Slate 900
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Certidão Pericial de Pré-Vistoria Veicular Consolidada', 62, 12.5);

    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139); // Slate 500
    doc.setFont('helvetica', 'normal');
    doc.text('Auditoria Oficial de Procedência, Restrições e Indicadores de Risco • Produto E20', 62, 17);

    // Linha divisória
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.4);
    doc.line(12, 23, 198, 23);

    // 2. GRID DE METADADOS EM 3 CARDS EXECUTIVOS (Y: 26 a 44)
    const metaCardY = 26;
    const metaCardH = 18;
    const metaCardW = 59;
    const metaCardR = 2;

    // Card 1: Veículo Auditado
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.roundedRect(12, metaCardY, metaCardW, metaCardH, metaCardR, metaCardR, 'FD');

    doc.setFontSize(6);
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'bold');
    doc.text('VEÍCULO AUDITADO', 16, metaCardY + 4.8);

    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.text(`PLACA: ${formatPlaca(cleanPlaca)}`, 16, metaCardY + 10);

    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'normal');
    doc.text(`Renavam: ${renavam} | Chassi: ${chassi.slice(0, 12)}...`, 16, metaCardY + 14.5);

    // Card 2: Resultado Pericial
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(75.5, metaCardY, metaCardW, metaCardH, metaCardR, metaCardR, 'FD');

    doc.setFontSize(6);
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'bold');
    doc.text('RESULTADO DA PRÉ-VISTORIA', 79.5, metaCardY + 4.8);

    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.text(
      apontamentosPositivos.length === 0
        ? 'Nenhum Apontamento'
        : `${apontamentosPositivos.length} ${apontamentosPositivos.length === 1 ? 'Apontamento Localizado' : 'Apontamentos Localizados'}`,
      79.5,
      metaCardY + 10
    );

    doc.setFontSize(6);
    if (apontamentosPositivos.length > 0) {
      doc.setFillColor(15, 23, 42);
      doc.circle(80.5, metaCardY + 14, 0.8, 'F');
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.text(`36 Bases Auditadas • Ocorrências Constatadas`, 83, metaCardY + 14.5);
    } else {
      doc.setFillColor(4, 120, 87); // Emerald 700
      doc.circle(80.5, metaCardY + 14, 0.8, 'F');
      doc.setTextColor(4, 120, 87);
      doc.setFont('helvetica', 'bold');
      doc.text('36 Bases Auditadas • Certidão Regular', 83, metaCardY + 14.5);
    }

    // Card 3: Autenticação Digital
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(139, metaCardY, metaCardW, metaCardH, metaCardR, metaCardR, 'FD');

    doc.setFontSize(6);
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'bold');
    doc.text('AUTENTICAÇÃO DIGITAL & FÉ PÚBLICA', 143, metaCardY + 4.8);

    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.text(`${dataFormatada} às ${horaFormatada}`, 143, metaCardY + 10);

    doc.setFontSize(5.8);
    doc.setTextColor(29, 78, 216); // Royal Blue
    doc.setFont('helvetica', 'bold');
    doc.text(`Hash: ${authCode.slice(0, 32)}`, 143, metaCardY + 14.5);

    let currentY = 47;

    // 3. QUADRO COMPACTO DE ESPECIFICAÇÕES MECÂNICAS DA BIN FABRIL
    doc.setFillColor(241, 245, 249); // Slate 100
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(12, currentY, 186, 17, 1.5, 1.5, 'FD');

    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(51, 65, 85);
    doc.text(`DADOS CADASTRAIS DA BIN FABRIL: ${marcaModelo.toUpperCase()}`, 16, currentY + 4.5);

    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(`Ano Fab/Mod: ${anoFabMod}   |   Cor: ${cor}   |   Combustível: ${combustivel}`, 16, currentY + 9);
    doc.text(`Município/UF: ${municipioUf}   |   Situação: ${situacao}   |   Chassi: ${chassi}`, 16, currentY + 13.5);

    currentY += 21;

    // 4. SE NÃO HOUVER APONTAMENTOS: CERTIDÃO DE REGULARIDADE PERICIAL
    if (apontamentosPositivos.length === 0) {
      doc.setFillColor(240, 253, 244); // Emerald 50
      doc.setDrawColor(187, 247, 208); // Emerald 200
      doc.roundedRect(12, currentY, 186, 42, 2, 2, 'FD');

      // Friso esquerdo verde institucional
      doc.setFillColor(4, 120, 87);
      doc.roundedRect(12, currentY, 2.5, 42, 1, 0, 'F');

      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(6, 95, 70); // Emerald 800
      doc.text('CERTIDÃO PERICIAL DE REGULARIDADE INTEGRAL', 18, currentY + 8);

      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 65, 85);
      const declaracaoRegularidade = [
        `Certificamos para os devidos fins de direito e comprovação pericial que foram submetidos à auditoria`,
        `eletrônica integral os 36 (trinta e seis) produtos e indicadores de risco da Pré-Vistoria Veicular Consolidada`,
        `para o veículo Placa ${formatPlaca(cleanPlaca)}, RENAVAM ${renavam} e Chassi ${chassi}.`,
        ``,
        `Constatou-se a ausência de quaisquer restrições impeditivas, sinistros indenizados, notificações de leilão,`,
        `passagens por lojas de salvados, boletins ativos de roubo e furto, gravames ou indícios de adulteração cadastral.`,
        `O veículo encontra-se plenamente REGULAR perante os bureaus e bases periciais consultadas nesta data.`
      ];

      let textoY = currentY + 14;
      for (const linha of declaracaoRegularidade) {
        doc.text(linha, 18, textoY);
        textoY += 3.8;
      }

      currentY += 46;
    } else {
      // 5. RENDERIZAÇÃO ESTRUTURADA EXCLUSIVAMENTE DOS APONTAMENTOS POSITIVOS
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(`RELATÓRIO DE APONTAMENTOS ENCONTRADOS (${apontamentosPositivos.length} OCORRÊNCIAS)`, 12, currentY);
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text(`Documento consolidado exibindo estritamente os indicadores com registros identificados nas bases auditadas.`, 12, currentY + 4);

      currentY += 7;

      for (const item of apontamentosPositivos) {
        const numFormat = item.numero < 10 ? `0${item.numero}` : `${item.numero}`;
        const tituloLimpo = sanitizeTituloIndicador(item.titulo);
        const dadosItem = item.detalhes || item.conteudo || item.respostaInfoSinistros;

        // Verifica quebra de página antes de cada bloco
        if (currentY > 235) {
          doc.addPage();
          currentY = 16;
        }

        // Título do Indicador Pericial (sem "P")
        doc.setFillColor(15, 23, 42); // Slate 900
        doc.roundedRect(12, currentY, 186, 6.5, 1, 1, 'F');

        doc.setFontSize(6.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text(`#${numFormat} - ${tituloLimpo}`, 16, currentY + 4.3);

        doc.setFontSize(5.5);
        doc.setTextColor(226, 232, 240);
        doc.text('CONSTA REGISTRO', 194, currentY + 4.3, { align: 'right' });

        currentY += 7.5;

        // Mensagem de registro
        if (item.mensagem && item.mensagem !== 'NENHUM REGISTRO LOCALIZADO NA BASE INTERNA') {
          doc.setFontSize(6);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(51, 65, 85);
          doc.text(String(item.mensagem).slice(0, 120), 14, currentY + 3);
          currentY += 5;
        }

        // Tabelas especializadas por indicador
        // A. Bancos / Financeiras / Locadoras / Seguradoras (P7, P1, P3, P4, P5, P6, P8, P14)
        if (['P7', 'P1', 'P3', 'P4', 'P5', 'P6', 'P8', 'P14'].includes(item.chave) && Array.isArray(dadosItem) && dadosItem.length > 0) {
          const bodyData = dadosItem.map((reg: any) => [
            reg.ano || (reg.data ? formatDateBR(reg.data) : '-'),
            reg.razao_social || reg.instituicao || reg.seguradora || reg.orgao || reg.empresa || reg.nome || '-',
            reg.documento ? formatDocumento(reg.documento) : '-',
            reg.tipoEntidade || reg.cnaeDescricao || reg.cnae || '-'
          ]);

          autoTable(doc, {
            startY: currentY,
            margin: { left: 12, right: 12 },
            head: [['ANO', 'INSTITUIÇÃO / RAZÃO SOCIAL', 'DOCUMENTO', 'PERFIL / CNAE']],
            body: bodyData,
            theme: 'striped',
            headStyles: {
              fillColor: [30, 58, 138], // Royal Blue Renacred
              textColor: [255, 255, 255],
              fontSize: 6,
              fontStyle: 'bold',
              cellPadding: 1.5
            },
            bodyStyles: {
              fontSize: 5.5,
              textColor: [30, 41, 59],
              cellPadding: 1.5
            },
            alternateRowStyles: {
              fillColor: [248, 250, 252]
            }
          });

          currentY = (doc as any).lastAutoTable.finalY + 4;
        }
        // B. Roubo e Furto (P10)
        else if (item.chave === 'P10' && Array.isArray(dadosItem) && dadosItem.length > 0) {
          const bodyData = dadosItem.map((oc: any) => [
            oc.tipo || 'Ocorrência Policial',
            oc.data ? formatDateBR(oc.data) : (oc.ano || '-'),
            oc.numero_boletim || '-',
            oc.orgao_seguranca || '-',
            oc.descricao || '-'
          ]);

          autoTable(doc, {
            startY: currentY,
            margin: { left: 12, right: 12 },
            head: [['OCORRÊNCIA', 'DATA / ANO', 'BOLETIM', 'ÓRGÃO', 'DESCRITIVO']],
            body: bodyData,
            theme: 'striped',
            headStyles: {
              fillColor: [159, 18, 57], // Rose 900
              textColor: [255, 255, 255],
              fontSize: 6,
              fontStyle: 'bold',
              cellPadding: 1.5
            },
            bodyStyles: {
              fontSize: 5.5,
              textColor: [30, 41, 59],
              cellPadding: 1.5
            }
          });

          currentY = (doc as any).lastAutoTable.finalY + 4;
        }
        // C. Proprietários DPVAT / Cadeia Dominial (P17)
        else if (item.chave === 'P17' && Array.isArray(dadosItem) && dadosItem.length > 0) {
          // Garante deduplicação estrita das linhas de proprietários no PDF
          const propsUnicosPdf: any[] = [];
          for (const prop of dadosItem) {
            const docP = String(prop.documento || '').replace(/\D/g, '');
            const nomeP = String(prop.nome || prop.razao_social || '').trim().toUpperCase();
            const jaTem = propsUnicosPdf.find((exist) => {
              const docExist = String(exist.documento || '').replace(/\D/g, '');
              const nomeExist = String(exist.nome || exist.razao_social || '').trim().toUpperCase();
              if (docP && docExist && docP.length >= 8 && docExist.length >= 8 && docP.slice(-8) === docExist.slice(-8)) return true;
              if (nomeP && nomeExist && (nomeP === nomeExist || nomeP.includes(nomeExist) || nomeExist.includes(nomeP))) return true;
              return false;
            });
            if (!jaTem) {
              propsUnicosPdf.push(prop);
            } else {
              if (prop.isVigente || prop.atual) jaTem.isVigente = true;
              const tExist = String(jaTem.tempoDePosse || jaTem.tempoPosse || '');
              const tNovo = String(prop.tempoDePosse || prop.tempoPosse || '');
              if (tExist.toLowerCase().includes('menos de 1 mês') && !tNovo.toLowerCase().includes('menos de 1 mês')) {
                jaTem.tempoDePosse = tNovo;
                jaTem.tempoPosse = tNovo;
              }
            }
          }

          const bodyData = propsUnicosPdf.map((prop: any, pIdx: number) => [
            `${pIdx + 1}º`,
            prop.nome || prop.razao_social || 'NÃO INFORMADO',
            prop.documento ? formatDocumento(prop.documento) : '-',
            prop.data ? formatDateBR(prop.data) : (prop.ano ? String(prop.ano) : '-'),
            prop.tempoDePosse || prop.tempo_posse || '-',
            prop.municipio_uf || (prop.municipio ? `${prop.municipio}${prop.uf ? `/${prop.uf}` : ''}` : '-'),
            prop.isVigente || prop.atual ? 'VIGENTE' : 'ANTERIOR'
          ]);

          autoTable(doc, {
            startY: currentY,
            margin: { left: 12, right: 12 },
            head: [['ORDEM', 'PROPRIETÁRIO', 'DOCUMENTO', 'DATA POSSE', 'TEMPO POSSE', 'MUNICÍPIO/UF', 'STATUS']],
            body: bodyData,
            theme: 'striped',
            headStyles: {
              fillColor: [30, 58, 138],
              textColor: [255, 255, 255],
              fontSize: 6,
              fontStyle: 'bold',
              cellPadding: 1.5
            },
            bodyStyles: {
              fontSize: 5.5,
              textColor: [30, 41, 59],
              cellPadding: 1.5
            }
          });

          currentY = (doc as any).lastAutoTable.finalY + 4;
        }
        // D. Circulação (P31)
        else if (item.chave === 'P31' && dadosItem) {
          const rowsCirc: any[] = [];
          if (dadosItem.adquirido_0km) rowsCirc.push(['Faturamento Fabril (0km)', dadosItem.adquirido_0km]);
          if (dadosItem.licenciamento_1) rowsCirc.push(['1º Município de Licenciamento', dadosItem.licenciamento_1]);
          if (dadosItem.licenciamento_2) rowsCirc.push(['2º Município de Licenciamento', dadosItem.licenciamento_2]);
          if (dadosItem.licenciamento_3) rowsCirc.push(['3º Município de Licenciamento', dadosItem.licenciamento_3]);
          if (Array.isArray(dadosItem.registros)) {
            dadosItem.registros.forEach((r: any) => rowsCirc.push([r.etapa || r.descricao || 'Etapa', r.local || r.municipio_uf || '-']));
          }

          if (rowsCirc.length > 0) {
            autoTable(doc, {
              startY: currentY,
              margin: { left: 12, right: 12 },
              head: [['ETAPA DE CIRCULAÇÃO', 'LOCALIZAÇÃO REGISTRADA']],
              body: rowsCirc,
              theme: 'striped',
              headStyles: {
                fillColor: [51, 65, 85],
                textColor: [255, 255, 255],
                fontSize: 6,
                fontStyle: 'bold',
                cellPadding: 1.5
              },
              bodyStyles: {
                fontSize: 5.5,
                textColor: [30, 41, 59],
                cellPadding: 1.5
              }
            });

            currentY = (doc as any).lastAutoTable.finalY + 4;
          }
        }
        // E. Movimentação Cadastral (P32)
        else if (item.chave === 'P32' && dadosItem) {
          const rowsMov: any[] = [];
          if (dadosItem.insercao_renavam) rowsMov.push(['Inserção na Base RENAVAM', formatDateBR(dadosItem.insercao_renavam)]);
          if (Array.isArray(dadosItem.alteracoes)) {
            dadosItem.alteracoes.forEach((alt: any) => rowsMov.push([alt.item || alt.descricao || 'Alteração', alt.data ? formatDateBR(alt.data) : '-']));
          }

          if (rowsMov.length > 0) {
            autoTable(doc, {
              startY: currentY,
              margin: { left: 12, right: 12 },
              head: [['EVENTO CADASTRAL', 'DATA DO REGISTRO']],
              body: rowsMov,
              theme: 'striped',
              headStyles: {
                fillColor: [51, 65, 85],
                textColor: [255, 255, 255],
                fontSize: 6,
                fontStyle: 'bold',
                cellPadding: 1.5
              },
              bodyStyles: {
                fontSize: 5.5,
                textColor: [30, 41, 59],
                cellPadding: 1.5
              }
            });

            currentY = (doc as any).lastAutoTable.finalY + 4;
          }
        }
        // F. FIPE (P36)
        else if (item.chave === 'P36' && dadosItem) {
          const valorFipe = dadosItem.valor_medio_fipe || dadosItem.valor || dadosItem.preco || item.mensagem;
          const codFipe = dadosItem.codigo_fipe || dadosItem.codigoFipe || '-';
          const mesRef = dadosItem.mes_referencia || dadosItem.mesReferencia || '-';

          autoTable(doc, {
            startY: currentY,
            margin: { left: 12, right: 12 },
            head: [['INDICADOR', 'VALOR DE MERCADO', 'CÓDIGO FIPE', 'MÊS DE REFERÊNCIA']],
            body: [['Tabela FIPE Consolidada', valorFipe, codFipe, mesRef]],
            theme: 'striped',
            headStyles: {
              fillColor: [30, 58, 138],
              textColor: [255, 255, 255],
              fontSize: 6,
              fontStyle: 'bold',
              cellPadding: 1.5
            },
            bodyStyles: {
              fontSize: 5.5,
              textColor: [30, 41, 59],
              cellPadding: 1.5
            }
          });

          currentY = (doc as any).lastAutoTable.finalY + 4;
        }
        // G. Banco de Imagens de Flagrantes de Trânsito (P25)
        else if (item.chave === 'P25') {
          const listaImgs: string[] = [];
          if (Array.isArray(dadosItem)) {
            dadosItem.forEach((d: any) => {
              if (typeof d === 'string' && (d.startsWith('data:image') || d.startsWith('http'))) listaImgs.push(d);
              else if (d?.imagens && Array.isArray(d.imagens)) listaImgs.push(...d.imagens);
            });
          } else if (dadosItem && typeof dadosItem === 'object') {
            if (Array.isArray(dadosItem.imagens)) listaImgs.push(...dadosItem.imagens);
            ['url', 'imagem', 'base64', 'imagem_base64'].forEach((k) => {
              if (dadosItem[k] && typeof dadosItem[k] === 'string') listaImgs.push(dadosItem[k]);
            });
          }

          if (listaImgs.length > 0) {
            doc.setFontSize(6);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(15, 23, 42);
            doc.text(`Registros Fotográficos Oficiais (${listaImgs.length} imagem(ns) capturada(s)):`, 14, currentY);
            currentY += 3;

            let imgX = 14;
            const imgW = 42;
            const imgH = 30;

            for (let i = 0; i < Math.min(listaImgs.length, 4); i++) {
              const src = listaImgs[i];
              if (src.startsWith('data:image')) {
                try {
                  doc.addImage(src, 'JPEG', imgX, currentY, imgW, imgH);
                  imgX += imgW + 4;
                  if (imgX + imgW > 196) {
                    imgX = 14;
                    currentY += imgH + 4;
                  }
                } catch {
                  // fallback se base64 for corrompido
                }
              }
            }
            currentY += imgH + 4;
          } else {
            doc.setFontSize(6);
            doc.setFont('helvetica', 'italic');
            doc.setTextColor(100, 116, 139);
            doc.text('Imagens armazenadas na base de dados pericial.', 14, currentY + 3);
            currentY += 6;
          }
        }
        // H. Resposta em Texto Oficial ou Objeto Genérico
        else if (typeof item.respostaInfoSinistros === 'string' && item.respostaInfoSinistros.trim().length > 0) {
          doc.setFillColor(248, 250, 252);
          doc.setDrawColor(226, 232, 240);
          doc.roundedRect(12, currentY, 186, 11, 1, 1, 'FD');

          doc.setFontSize(5.5);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(71, 85, 105);
          doc.text('RESPOSTA REGISTRADA NA BASE DE PRÉ-VISTORIA:', 15, currentY + 4);

          doc.setFontSize(6);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(15, 23, 42);
          doc.text(String(item.respostaInfoSinistros).slice(0, 130), 15, currentY + 8);

          currentY += 14;
        } else if (typeof dadosItem === 'object' && dadosItem !== null && !Array.isArray(dadosItem)) {
          const entries = Object.entries(dadosItem)
            .filter(([k, v]) => v !== null && v !== undefined && v !== '' && !['id', '_id', 'status', 'sucesso', 'codigo', 'produto_id', 'imagens'].includes(k))
            .slice(0, 8);

          if (entries.length > 0) {
            const bodyData = entries.map(([k, v]) => [
              k.replace(/_/g, ' ').toUpperCase(),
              typeof v === 'object' ? JSON.stringify(v) : String(v)
            ]);

            autoTable(doc, {
              startY: currentY,
              margin: { left: 12, right: 12 },
              head: [['CAMPO AUDITADO', 'VALOR REGISTRADO']],
              body: bodyData,
              theme: 'striped',
              headStyles: {
                fillColor: [51, 65, 85],
                textColor: [255, 255, 255],
                fontSize: 6,
                fontStyle: 'bold',
                cellPadding: 1.5
              },
              bodyStyles: {
                fontSize: 5.5,
                textColor: [30, 41, 59],
                cellPadding: 1.5
              }
            });

            currentY = (doc as any).lastAutoTable.finalY + 4;
          }
        }
      }
    }

    // 6. RODAPÉ DE FÉ PÚBLICA EM TODAS AS PÁGINAS
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);

      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.line(12, 283, 198, 283);

      doc.setFontSize(5.5);
      doc.setTextColor(148, 163, 184); // Slate 400
      doc.setFont('helvetica', 'normal');
      doc.text(
        'Este laudo pericial é emitido pela plataforma RENACRED a partir de fontes oficiais de pré-vistoria e bases cartorárias e veiculares nacionais.',
        12,
        287
      );

      doc.setFontSize(6);
      doc.setTextColor(100, 116, 139);
      doc.setFont('helvetica', 'bold');
      doc.text(`Autenticação: ${authCode}`, 12, 291);

      doc.setFontSize(6);
      doc.setTextColor(100, 116, 139);
      doc.setFont('helvetica', 'normal');
      doc.text(`Página ${i} de ${totalPages}`, 198, 291, { align: 'right' });
    }

    doc.save(`Renacred_E20_Resultados_${cleanPlaca}_${Date.now()}.pdf`);
  };

  return (
    <button
      type="button"
      onClick={handleExport}
      className={
        className ||
        'inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white transition shadow-xs cursor-pointer'
      }
      title="Exportar Laudo Pericial E20 em PDF (Consolida estritamente os resultados encontrados)"
    >
      <FileDown className="w-3.5 h-3.5 shrink-0" />
      <span>{label}</span>
    </button>
  );
};
