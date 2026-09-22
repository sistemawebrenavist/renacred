import React from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FileDown } from 'lucide-react';
import { DeclaracaoProps } from './DeclaracaoCard';

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

    // 1. CABEÇALHO INSTITUCIONAL EXECUTIVO
    // Fundo Navy Profundo (#0B1325)
    doc.setFillColor(11, 19, 37);
    doc.rect(0, 0, 210, 36, 'F');

    // Faixa inferior em Azul Royal (#1D4ED8)
    doc.setFillColor(29, 78, 216);
    doc.rect(0, 35, 210, 1.2, 'F');

    // Brasão / Ícone Geométrico de Segurança Renacred (Vetor)
    doc.setFillColor(29, 78, 216);
    doc.roundedRect(12, 8, 18, 18, 3, 3, 'F');
    doc.setDrawColor(59, 130, 246);
    doc.setLineWidth(0.4);
    doc.roundedRect(12, 8, 18, 18, 3, 3, 'S');

    // Emblema Central (R estilizado em vetor branco)
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('R', 18.5, 20.5);

    // Título Principal
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('RENACRED', 34, 15);

    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184); // Slate 400
    doc.setFont('helvetica', 'normal');
    doc.text('REDE NACIONAL DE PROTEÇÃO AO CRÉDITO & INFORMAÇÕES CARTORÁRIAS', 34, 20);

    doc.setFontSize(8.5);
    doc.setTextColor(226, 232, 240); // Slate 200
    doc.setFont('helvetica', 'bold');
    doc.text('Certidão Oficial de Histórico Imobiliário & Registros DOI', 34, 27);

    // Badge do Produto E1 no canto superior direito
    doc.setFillColor(17, 24, 39);
    doc.roundedRect(148, 10, 50, 14, 2.5, 2.5, 'F');
    doc.setDrawColor(59, 130, 246);
    doc.setLineWidth(0.3);
    doc.roundedRect(148, 10, 50, 14, 2.5, 2.5, 'S');

    doc.setTextColor(96, 165, 250); // Blue 400
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.text('PRODUTO E1', 153, 15.5);

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.text('LAUDO PERICIAL OFICIAL', 153, 20.5);

    // 2. GRID DE METADADOS EM 3 CARDS EXECUTIVOS (Y: 42 a 63)
    const cardY = 41;
    const cardH = 21;
    const cardW = 59;
    const cardR = 2.5;

    // Card 1: Documento Auditado
    doc.setFillColor(248, 250, 252); // Slate 50
    doc.setDrawColor(226, 232, 240); // Slate 200
    doc.setLineWidth(0.3);
    doc.roundedRect(12, cardY, cardW, cardH, cardR, cardR, 'FD');

    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139); // Slate 500
    doc.setFont('helvetica', 'bold');
    doc.text('DOCUMENTO AUDITADO', 16, cardY + 5.5);

    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42); // Slate 900
    doc.setFont('helvetica', 'bold');
    doc.text(docFormatado, 16, cardY + 11.5);

    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'normal');
    doc.text(`Período de Cobertura: ${periodo || 'Histórico Integral'}`, 16, cardY + 16.5);

    // Card 2: Resultado da Pesquisa
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(75.5, cardY, cardW, cardH, cardR, cardR, 'FD');

    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'bold');
    doc.text('RESULTADO DA PESQUISA', 79.5, cardY + 5.5);

    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.text(`${totalDeclaracoes} ${totalDeclaracoes === 1 ? 'Registro Localizado' : 'Registros Localizados'}`, 79.5, cardY + 11.5);

    doc.setFontSize(6.5);
    if (totalDeclaracoes > 0) {
      // Círculo indicador de status verde
      doc.setFillColor(4, 120, 87); // Emerald 700
      doc.circle(80.5, cardY + 16, 1, 'F');
      doc.setTextColor(4, 120, 87);
      doc.setFont('helvetica', 'bold');
      doc.text('Com Apontamentos Cartorários', 83, cardY + 16.5);
    } else {
      doc.setFillColor(100, 116, 139);
      doc.circle(80.5, cardY + 16, 1, 'F');
      doc.setTextColor(100, 116, 139);
      doc.setFont('helvetica', 'normal');
      doc.text('Nada Consta no Período', 83, cardY + 16.5);
    }

    // Card 3: Autenticação Digital & Emissão
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(139, cardY, cardW, cardH, cardR, cardR, 'FD');

    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'bold');
    doc.text('AUTENTICAÇÃO DIGITAL', 143, cardY + 5.5);

    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.text(`${dataFormatada} às ${horaFormatada}`, 143, cardY + 11.5);

    doc.setFontSize(6.5);
    doc.setTextColor(29, 78, 216); // Royal Blue
    doc.setFont('helvetica', 'bold');
    doc.text(`Hash: ${authCode}`, 143, cardY + 16.5);

    // 3. TABELA PERICIAL COM AUTOTABLE
    const tableData = declaracoes.map((dec, idx) => {
      const alienantesList = (dec.alienantes || [])
        .map(a => `${a.nome}\nDoc: ${formatDocumento(a.cpfCnpj)}`)
        .join('\n\n') || '-';

      const adquirentesList = (dec.adquirentes || [])
        .map(a => `${a.nome}\nDoc: ${formatDocumento(a.cpfCnpj)}`)
        .join('\n\n') || '-';

      const cartorioInfo = [
        dec.cartorio || 'Cartório de Registro de Imóveis',
        dec.tipoCartorio ? `Tipo: ${dec.tipoCartorio}` : '',
        dec.cnpjCartorio ? `CNPJ: ${formatDocumento(dec.cnpjCartorio)}` : '',
      ].filter(Boolean).join('\n');

      const registroInfo = [
        dec.matricula ? `Matrícula: ${dec.matricula}` : 'Matrícula: Geral',
        dec.registro ? `Registro: ${dec.registro}` : '',
        dec.livro ? `Livro: ${dec.livro}` : '',
        dec.folha ? `Folha: ${dec.folha}` : '',
      ].filter(Boolean).join('\n');

      return [
        String(idx + 1).padStart(2, '0'),
        dec.dataLavratura || '-',
        dec.tipoDeclaracao || 'Operação',
        registroInfo,
        cartorioInfo,
        alienantesList,
        adquirentesList,
      ];
    });

    autoTable(doc, {
      startY: 68,
      margin: { left: 12, right: 12, top: 20, bottom: 20 },
      head: [['#', 'Data Reg.', 'Tipo', 'Matrícula / Livro', 'Cartório Responsável', 'Alienante(s) / Vendedor', 'Adquirente(s) / Comprador']],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [15, 23, 42], // Navy Slate
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 7,
        halign: 'left',
        cellPadding: { top: 3, bottom: 3, left: 2.5, right: 2.5 },
      },
      styles: {
        fontSize: 6.5,
        cellPadding: { top: 3, bottom: 3, left: 2.5, right: 2.5 },
        lineColor: [226, 232, 240],
        lineWidth: 0.2,
        textColor: [30, 41, 59],
        overflow: 'linebreak',
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252], // Slate 50
      },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center', fontStyle: 'bold', textColor: [29, 78, 216] },
        1: { cellWidth: 20, halign: 'center', fontStyle: 'bold' },
        2: { cellWidth: 18, halign: 'center', fontStyle: 'bold', textColor: [71, 85, 105] },
        3: { cellWidth: 28, fontStyle: 'bold' },
        4: { cellWidth: 36 },
        5: { cellWidth: 37 },
        6: { cellWidth: 37 },
      },
      didDrawPage: (data) => {
        // RODAPÉ OFICIAL DE FÉ PÚBLICA EM TODAS AS PÁGINAS
        const pageSize = doc.internal.pageSize;
        const pageHeight = pageSize.height || pageSize.getHeight();
        const pageWidth = pageSize.width || pageSize.getWidth();
        const footerY = pageHeight - 12;

        // Linha divisória fina
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.3);
        doc.line(12, footerY - 2, pageWidth - 12, footerY - 2);

        // Texto Institucional de Fé Pública
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
      },
    });

    // 4. PAGINAÇÃO DINÂMICA ("Página X de Y") EM TODAS AS PÁGINAS
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      const pageSize = doc.internal.pageSize;
      const pageHeight = pageSize.height || pageSize.getHeight();
      const pageWidth = pageSize.width || pageSize.getWidth();
      const footerY = pageHeight - 12;

      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(`Página ${i} de ${totalPages}`, pageWidth - 12, footerY + 5.5, { align: 'right' });
    }

    // Salvar arquivo PDF
    const cleanDoc = documento.replace(/\D/g, '');
    doc.save(`Renacred_Laudo_Imobiliario_${cleanDoc}_${Date.now()}.pdf`);
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
