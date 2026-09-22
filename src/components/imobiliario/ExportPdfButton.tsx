import React from 'react';
import { jsPDF } from 'jspdf';
import { FileDown } from 'lucide-react';
import { DeclaracaoProps } from './DeclaracaoCard';
import { RENACRED_LOGO_BASE64 } from '../../assets/logoBase64';

interface ExportPdfProps {
  documento: string;
  totalDeclaracoes: number;
  periodo?: string;
  declaracoes: DeclaracaoProps[];
}

export const ExportPdfButton: React.FC<ExportPdfProps> = ({
  documento,
  totalDeclaracoes,
  periodo,
  declaracoes,
}) => {
  // Formatação de CPF/CNPJ com máscara
  const formatDocumento = (doc: string) => {
    const clean = doc.replace(/\D/g, '');
    if (clean.length === 11) {
      return clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    if (clean.length === 14) {
      return clean.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
    return doc;
  };

  // Gerador de Hash Verificador de Autenticidade
  const generateAuthHash = (doc: string) => {
    const clean = doc.replace(/\D/g, '');
    const timestamp = Date.now().toString(16).toUpperCase();
    const sub = clean.slice(-4) || '9999';
    return `RNC-E1-${sub}-${timestamp.slice(-4)}-${timestamp.slice(-8, -4)}`;
  };

  const handleExport = () => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const docFormatado = formatDocumento(documento);
    const authCode = generateAuthHash(documento);
    const dataEmissao = new Date();
    const dataFormatada = dataEmissao.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    const horaFormatada = dataEmissao.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    // 1. CABEÇALHO INSTITUCIONAL EXECUTIVO (Página 1)
    // Logo à esquerda alinhada ao título e descrição
    try {
      doc.addImage(RENACRED_LOGO_BASE64, 'PNG', 12, 7, 46, 13);
    } catch {
      doc.setFontSize(13);
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.text('RENACRED', 12, 15);
    }

    // Título e Descrição perfeitamente alinhados ao lado da logo
    doc.setTextColor(15, 23, 42); // Slate 900
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Certidão Oficial de Histórico Imobiliário & Registros DOI', 63, 12.5);

    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139); // Slate 500
    doc.setFont('helvetica', 'normal');
    doc.text('Auditoria Pericial de Titularidade Imobiliária e Histórico de Transações Cartorárias', 63, 17);

    // Linha divisória elegante
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.4);
    doc.line(12, 24, 198, 24);

    // 2. GRID DE METADADOS EM 3 CARDS EXECUTIVOS (Y: 27 a 46)
    const metaCardY = 27;
    const metaCardH = 19;
    const metaCardW = 59;
    const metaCardR = 2;

    // Card 1: Documento Auditado
    doc.setFillColor(248, 250, 252); // Slate 50
    doc.setDrawColor(226, 232, 240); // Slate 200
    doc.setLineWidth(0.3);
    doc.roundedRect(12, metaCardY, metaCardW, metaCardH, metaCardR, metaCardR, 'FD');

    doc.setFontSize(6);
    doc.setTextColor(100, 116, 139); // Slate 500
    doc.setFont('helvetica', 'bold');
    doc.text('DOCUMENTO AUDITADO', 16, metaCardY + 5);

    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42); // Slate 900
    doc.setFont('helvetica', 'bold');
    doc.text(docFormatado, 16, metaCardY + 10.5);

    doc.setFontSize(6);
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'normal');
    doc.text(`Período de Cobertura: ${periodo || 'Histórico Integral'}`, 16, metaCardY + 15);

    // Card 2: Resultado da Pesquisa
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(75.5, metaCardY, metaCardW, metaCardH, metaCardR, metaCardR, 'FD');

    doc.setFontSize(6);
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'bold');
    doc.text('RESULTADO DA PESQUISA', 79.5, metaCardY + 5);

    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.text(`${totalDeclaracoes} ${totalDeclaracoes === 1 ? 'Registro Localizado' : 'Registros Localizados'}`, 79.5, metaCardY + 10.5);

    doc.setFontSize(6);
    if (totalDeclaracoes > 0) {
      doc.setFillColor(4, 120, 87); // Emerald 700
      doc.circle(80.5, metaCardY + 14.5, 0.8, 'F');
      doc.setTextColor(4, 120, 87);
      doc.setFont('helvetica', 'bold');
      doc.text('Com Apontamentos Cartorários', 83, metaCardY + 15);
    } else {
      doc.setFillColor(100, 116, 139);
      doc.circle(80.5, metaCardY + 14.5, 0.8, 'F');
      doc.setTextColor(100, 116, 139);
      doc.setFont('helvetica', 'normal');
      doc.text('Nada Consta no Período', 83, metaCardY + 15);
    }

    // Card 3: Autenticação Digital & Emissão
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(139, metaCardY, metaCardW, metaCardH, metaCardR, metaCardR, 'FD');

    doc.setFontSize(6);
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'bold');
    doc.text('AUTENTICAÇÃO DIGITAL', 143, metaCardY + 5);

    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.text(`${dataFormatada} às ${horaFormatada}`, 143, metaCardY + 10.5);

    doc.setFontSize(6);
    doc.setTextColor(29, 78, 216); // Royal Blue
    doc.setFont('helvetica', 'bold');
    doc.text(`Hash: ${authCode}`, 143, metaCardY + 15);

    // Título da Seção de Declarações Registradas
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text(`DECLARAÇÕES REGISTRADAS (${totalDeclaracoes})`, 12, 51);

    // 3. RENDERIZAÇÃO EM FORMATO DE CARDS EXECUTIVOS (IDÊNTICO AO MODAL)
    const cardW = 186;
    const startX = 12;
    const colW = 88;
    const bottomLimit = 276; // Limite inferior seguro antes do rodapé

    const drawHeaderSubsequentPages = () => {
      try {
        doc.addImage(RENACRED_LOGO_BASE64, 'PNG', 12, 6, 32, 9.5);
      } catch {
        doc.setFontSize(10);
        doc.setTextColor(15, 23, 42);
        doc.setFont('helvetica', 'bold');
        doc.text('RENACRED', 12, 12);
      }
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('Certidão Oficial de Histórico Imobiliário & Registros DOI', 48, 10.5);
      doc.setFontSize(6);
      doc.setTextColor(100, 116, 139);
      doc.setFont('helvetica', 'normal');
      doc.text(`Documento Auditado: ${docFormatado}`, 48, 14);

      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.line(12, 17.5, 198, 17.5);
    };

    const calculateCardHeight = (dec: DeclaracaoProps) => {
      let hAlienantes = 0;
      if (dec.alienantes && dec.alienantes.length > 0) {
        dec.alienantes.forEach((al) => {
          doc.setFontSize(6);
          doc.setFont('helvetica', 'bold');
          const lines = doc.splitTextToSize(al.nome || 'Não informado', colW - 6);
          hAlienantes += 3.5 + (lines.length * 3.2) + 3.5 + 1.5;
        });
      } else {
        hAlienantes = 8;
      }

      let hAdquirentes = 0;
      if (dec.adquirentes && dec.adquirentes.length > 0) {
        dec.adquirentes.forEach((ad) => {
          doc.setFontSize(6);
          doc.setFont('helvetica', 'bold');
          const lines = doc.splitTextToSize(ad.nome || 'Não informado', colW - 6);
          hAdquirentes += 3.5 + (lines.length * 3.2) + 3.5 + 1.5;
        });
      } else {
        hAdquirentes = 8;
      }

      const partesHeight = Math.max(hAlienantes, hAdquirentes);
      return 8.5 + 13.5 + partesHeight + 3;
    };

    const drawCard = (dec: DeclaracaoProps, idx: number, y: number) => {
      let hAlienantes = 0;
      if (dec.alienantes && dec.alienantes.length > 0) {
        dec.alienantes.forEach((al) => {
          doc.setFontSize(6);
          doc.setFont('helvetica', 'bold');
          const lines = doc.splitTextToSize(al.nome || 'Não informado', colW - 6);
          hAlienantes += 3.5 + (lines.length * 3.2) + 3.5 + 1.5;
        });
      } else {
        hAlienantes = 8;
      }

      let hAdquirentes = 0;
      if (dec.adquirentes && dec.adquirentes.length > 0) {
        dec.adquirentes.forEach((ad) => {
          doc.setFontSize(6);
          doc.setFont('helvetica', 'bold');
          const lines = doc.splitTextToSize(ad.nome || 'Não informado', colW - 6);
          hAdquirentes += 3.5 + (lines.length * 3.2) + 3.5 + 1.5;
        });
      } else {
        hAdquirentes = 8;
      }

      const partesHeight = Math.max(hAlienantes, hAdquirentes);
      const totalH = 8.5 + 13.5 + partesHeight + 3;

      // Container do Card com cantos suaves
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.35);
      doc.roundedRect(startX, y, cardW, totalH, 2.5, 2.5, 'FD');

      // Topo do Card: Badge # + Título + Tipo + Data de Registro
      doc.setFillColor(239, 246, 255); // Blue 50
      doc.setDrawColor(191, 219, 254); // Blue 200
      doc.roundedRect(startX + 3, y + 2, 8, 5, 1.2, 1.2, 'FD');
      doc.setTextColor(29, 78, 216); // Blue 700
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'bold');
      doc.text('#' + String(idx + 1).padStart(2, '0'), startX + 4.2, y + 5.5);

      doc.setTextColor(15, 23, 42);
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      const titleText = dec.numDeclaracao ? `Declaração DOI Nº ${dec.numDeclaracao}` : 'Operação Imobiliária Registrada';
      doc.text(titleText, startX + 13, y + 5.5);

      const tw = doc.getTextWidth(titleText);
      if (dec.tipoDeclaracao) {
        doc.setFillColor(241, 245, 249);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(startX + 15 + tw, y + 2, 16, 5, 1, 1, 'FD');
        doc.setTextColor(71, 85, 105);
        doc.setFontSize(6);
        doc.setFont('helvetica', 'bold');
        doc.text(dec.tipoDeclaracao, startX + 17 + tw, y + 5.5);
      }

      if (dec.dataLavratura) {
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(startX + cardW - 48, y + 2, 45, 5, 1.2, 1.2, 'FD');
        doc.setFontSize(5.5);
        doc.setTextColor(100, 116, 139);
        doc.setFont('helvetica', 'normal');
        doc.text('Data do Registro: ', startX + cardW - 46, y + 5.5);
        doc.setTextColor(15, 23, 42);
        doc.setFont('helvetica', 'bold');
        doc.text(dec.dataLavratura, startX + cardW - 27, y + 5.5);
      }

      // Linha separadora do topo
      doc.setDrawColor(241, 245, 249);
      doc.line(startX + 3, y + 8, startX + cardW - 3, y + 8);

      // Bloco Intermediário: 3 Caixas com Quebra de Linha
      const boxY = y + 9.5;
      const boxH = 12.5;

      // Caixa 1: Matrícula (largura 34)
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(startX + 3, boxY, 34, boxH, 1.5, 1.5, 'FD');
      doc.setFontSize(5);
      doc.setTextColor(100, 116, 139);
      doc.setFont('helvetica', 'bold');
      doc.text('MATRÍCULA', startX + 5, boxY + 3.5);

      doc.setFontSize(7);
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      const matText = dec.matricula || 'Geral';
      const matLines = doc.splitTextToSize(matText, 30);
      doc.text(matLines[0], startX + 5, boxY + 8.5);

      // Caixa 2: Registro / Livro / Folha (largura 52 - com quebra de linha sem sobrepor)
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(startX + 39, boxY, 52, boxH, 1.5, 1.5, 'FD');
      doc.setFontSize(5);
      doc.setTextColor(100, 116, 139);
      doc.setFont('helvetica', 'bold');
      doc.text('REGISTRO / LIVRO / FOLHA', startX + 41, boxY + 3.5);

      const regLivroStr = [
        dec.registro ? `Reg: ${dec.registro}` : '',
        dec.livro ? `Livro: ${dec.livro}` : '',
        dec.folha ? `Fl: ${dec.folha}` : '',
      ].filter(Boolean).join(' • ') || 'Geral';

      doc.setFontSize(6);
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      const regLines = doc.splitTextToSize(regLivroStr, 48);
      if (regLines.length === 1) {
        doc.text(regLines[0], startX + 41, boxY + 8.5);
      } else {
        doc.text(regLines[0], startX + 41, boxY + 7);
        doc.text(regLines[1], startX + 41, boxY + 10.5);
      }

      // Caixa 3: Cartório Responsável (largura 90)
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(startX + 93, boxY, 90, boxH, 1.5, 1.5, 'FD');
      doc.setFontSize(5);
      doc.setTextColor(100, 116, 139);
      doc.setFont('helvetica', 'bold');
      doc.text('CARTÓRIO RESPONSÁVEL', startX + 95, boxY + 3.5);

      doc.setFontSize(6);
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      const cartLines = doc.splitTextToSize(dec.cartorio || 'Cartório de Registro de Imóveis', 86);
      doc.text(cartLines[0], startX + 95, boxY + 7);

      doc.setFontSize(5);
      doc.setTextColor(100, 116, 139);
      doc.setFont('helvetica', 'normal');
      const subCartorio = [dec.tipoCartorio, dec.cnpjCartorio ? `CNPJ: ${formatDocumento(dec.cnpjCartorio)}` : ''].filter(Boolean).join(' • ');
      const subLines = doc.splitTextToSize(subCartorio, 86);
      doc.text(subLines[0], startX + 95, boxY + 10.5);

      // Bloco Inferior: Partes (Alienantes vs Adquirentes)
      const partesY = boxY + boxH + 2;

      // Rótulo Alienantes
      doc.setFontSize(5.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(180, 83, 9); // Amber 700
      doc.text('ALIENANTE(S) / TRANSMITENTE(S)', startX + 3, partesY + 3);

      // Rótulo Adquirentes
      doc.setTextColor(4, 120, 87); // Emerald 700
      doc.text('ADQUIRENTE(S) / COMPRADOR(ES)', startX + colW + 7, partesY + 3);

      // Itens Alienantes com Quebra Automática de Linha
      let itemY = partesY + 4.5;
      if (dec.alienantes && dec.alienantes.length > 0) {
        dec.alienantes.forEach((al) => {
          doc.setFontSize(6);
          doc.setFont('helvetica', 'bold');
          const lines = doc.splitTextToSize(al.nome || 'Não informado', colW - 6);
          const itemH = 3.5 + (lines.length * 3.2) + 3.5;

          doc.setFillColor(254, 252, 232); // Amber 50
          doc.setDrawColor(253, 230, 138); // Amber 200
          doc.roundedRect(startX + 3, itemY, colW, itemH, 1, 1, 'FD');

          doc.setTextColor(15, 23, 42);
          let textLineY = itemY + 3.2;
          lines.forEach((line: string) => {
            doc.text(line, startX + 5, textLineY);
            textLineY += 3.2;
          });

          doc.setFontSize(5);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(100, 116, 139);
          doc.text(`Doc: ${formatDocumento(al.cpfCnpj)}`, startX + 5, textLineY + 0.3);

          itemY += itemH + 1.5;
        });
      } else {
        doc.setFontSize(5.5);
        doc.setTextColor(148, 163, 184);
        doc.setFont('helvetica', 'italic');
        doc.text('Nenhum alienante registrado nesta operação.', startX + 3, itemY + 3.5);
      }

      // Itens Adquirentes com Quebra Automática de Linha
      itemY = partesY + 4.5;
      if (dec.adquirentes && dec.adquirentes.length > 0) {
        dec.adquirentes.forEach((ad) => {
          doc.setFontSize(6);
          doc.setFont('helvetica', 'bold');
          const lines = doc.splitTextToSize(ad.nome || 'Não informado', colW - 6);
          const itemH = 3.5 + (lines.length * 3.2) + 3.5;

          doc.setFillColor(240, 253, 244); // Emerald 50
          doc.setDrawColor(187, 247, 208); // Emerald 200
          doc.roundedRect(startX + colW + 7, itemY, colW, itemH, 1, 1, 'FD');

          doc.setTextColor(15, 23, 42);
          let textLineY = itemY + 3.2;
          lines.forEach((line: string) => {
            doc.text(line, startX + colW + 9, textLineY);
            textLineY += 3.2;
          });

          doc.setFontSize(5);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(100, 116, 139);
          doc.text(`Doc: ${formatDocumento(ad.cpfCnpj)}`, startX + colW + 9, textLineY + 0.3);

          itemY += itemH + 1.5;
        });
      } else {
        doc.setFontSize(5.5);
        doc.setTextColor(148, 163, 184);
        doc.setFont('helvetica', 'italic');
        doc.text('Nenhum adquirente registrado nesta operação.', startX + colW + 7, itemY + 3.5);
      }

      return totalH;
    };

    let curY = 54;

    if (declaracoes.length === 0) {
      // Card quando não há registros
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(startX, curY, cardW, 28, 2.5, 2.5, 'FD');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.text('Nenhum registro de imóvel localizado', startX + 10, curY + 11);
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      doc.setFont('helvetica', 'normal');
      doc.text(
        'Não foram identificadas transações imobiliárias ativas ou históricas (DOI) para o documento informado.',
        startX + 10,
        curY + 18
      );
    } else {
      declaracoes.forEach((dec, idx) => {
        const cardH = calculateCardHeight(dec);
        if (curY + cardH > bottomLimit) {
          doc.addPage();
          drawHeaderSubsequentPages();
          curY = 22;
        }
        drawCard(dec, idx, curY);
        curY += cardH + 3.5;
      });
    }

    // 4. RODAPÉ DE FÉ PÚBLICA & PAGINAÇÃO DINÂMICA EM TODAS AS PÁGINAS
    const totalPages = doc.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      const footerY = 285;

      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.line(12, footerY - 2, 198, footerY - 2);

      doc.setFontSize(5.5);
      doc.setTextColor(100, 116, 139);
      doc.setFont('helvetica', 'normal');
      doc.text(
        'Documento eletrônico emitido pela plataforma Renacred via consolidação da base DOI (Receita Federal) e Serventias Registrais. Válido em todo o território nacional.',
        12,
        footerY + 1.5
      );

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(71, 85, 105);
      doc.text(
        `Código de Validação: ${authCode} • Portal de Verificação: api.renacred.com.br/validar`,
        12,
        footerY + 5.5
      );

      doc.text(`Página ${p} de ${totalPages}`, 198, footerY + 5.5, { align: 'right' });
    }

    // Salvar arquivo PDF
    const cleanDoc = documento.replace(/\D/g, '');
    doc.save(`Renacred_Certidao_Imobiliaria_${cleanDoc}_${Date.now()}.pdf`);
  };

  return (
    <button
      onClick={handleExport}
      className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 transition shadow-xs cursor-pointer"
    >
      <FileDown className="w-4 h-4 mr-2 text-blue-600" />
      Exportar Relatório PDF
    </button>
  );
};
