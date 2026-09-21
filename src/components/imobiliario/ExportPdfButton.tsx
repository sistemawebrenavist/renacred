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
  const handleExport = () => {
    const doc = new jsPDF();

    // Topo / Cabeçalho
    doc.setFillColor(11, 19, 37); // Renacred Navy
    doc.rect(0, 0, 210, 32, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('RENACRED - REDE NACIONAL DE PROTEÇÃO AO CRÉDITO', 14, 18);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Relatório Oficial de Auditoria Imobiliária e Certidões Cartorárias (DOI)', 14, 25);

    // Metadados da Consulta
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('DADOS DA CONSULTA:', 14, 42);

    doc.setFont('helvetica', 'normal');
    doc.text(`Documento Consultado: ${documento}`, 14, 48);
    doc.text(`Total de Declarações Encontradas: ${totalDeclaracoes}`, 14, 54);
    if (periodo) doc.text(`Período de Cobertura: ${periodo}`, 14, 60);
    doc.text(`Data de Emissão: ${new Date().toLocaleString('pt-BR')}`, 14, 66);

    // Tabela Consolidada de Imóveis
    const tableData = declaracoes.map((dec, idx) => {
      const alienantesText = (dec.alienantes || []).map(a => `${a.nome} (${a.cpfCnpj})`).join(', ') || '-';
      const adquirentesText = (dec.adquirentes || []).map(a => `${a.nome} (${a.cpfCnpj})`).join(', ') || '-';

      return [
        idx + 1,
        dec.dataLavratura || '-',
        dec.matricula || '-',
        dec.cartorio || 'Cartório de Imóveis',
        alienantesText,
        adquirentesText,
      ];
    });

    autoTable(doc, {
      startY: 74,
      head: [['#', 'Data Reg.', 'Matrícula', 'Cartório', 'Alienante(s)', 'Adquirente(s)']],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [29, 78, 216], // Renacred Royal Blue #1D4ED8
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 8,
      },
      styles: {
        fontSize: 7,
        cellPadding: 3,
        overflow: 'linebreak',
      },
      columnStyles: {
        0: { cellWidth: 8 },
        1: { cellWidth: 20 },
        2: { cellWidth: 20 },
        3: { cellWidth: 45 },
        4: { cellWidth: 45 },
        5: { cellWidth: 45 },
      },
    });

    // Salvar arquivo
    doc.save(`Renacred_Historico_Imobiliario_${documento}_${Date.now()}.pdf`);
  };

  return (
    <button
      onClick={handleExport}
      className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition shadow-sm"
    >
      <FileDown className="w-4 h-4 mr-2 text-blue-400" />
      Exportar Relatório PDF
    </button>
  );
};
