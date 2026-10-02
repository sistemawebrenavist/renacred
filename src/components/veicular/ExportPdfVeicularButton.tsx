import React from 'react';
import { jsPDF } from 'jspdf';
import { FileDown } from 'lucide-react';
import { RENACRED_LOGO_BASE64 } from '../../assets/logoBase64';

interface ProprietarioItem {
  ordem: number;
  documento: string;
  tipo: string;
  nome: string;
  razao_social?: string;
  nome_fantasia?: string;
  data: string;
  hora: string;
  uf: string;
  municipio: string;
  evento: string | null;
  atual: boolean;
  tempoPosse?: string;
}

interface ExportPdfVeicularProps {
  placa: string;
  renavam?: string;
  total: number;
  proprietarioAtual?: any;
  historico: ProprietarioItem[];
}

export const ExportPdfVeicularButton: React.FC<ExportPdfVeicularProps> = ({
  placa,
  renavam,
  total,
  proprietarioAtual,
  historico,
}) => {
  const formatDocumento = (doc: string) => {
    if (!doc) return '-';
    const clean = doc.replace(/\D/g, '');
    if (clean.length === 11) {
      return clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    if (clean.length === 14) {
      return clean.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
    return doc;
  };

  const generateAuthHash = (p: string) => {
    const clean = p.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const timestamp = Date.now().toString(16).toUpperCase();
    return `RNC-E2-${clean}-${timestamp.slice(-4)}-${timestamp.slice(-8, -4)}`;
  };

  const handleExport = () => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const cleanPlaca = placa.toUpperCase();
    const authCode = generateAuthHash(cleanPlaca);
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
    try {
      doc.addImage(RENACRED_LOGO_BASE64, 'PNG', 12, 7, 46, 13);
    } catch {
      doc.setFontSize(13);
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.text('RENACRED', 12, 15);
    }

    doc.setTextColor(15, 23, 42); // Slate 900
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Laudo Oficial de Histórico de Proprietários Veiculares', 63, 12.5);

    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139); // Slate 500
    doc.setFont('helvetica', 'normal');
    doc.text('Auditoria de Cadeia Dominial, Transferências e Registros Oficiais de Veículos', 63, 17);

    // Linha divisória elegante
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.4);
    doc.line(12, 24, 198, 24);

    // 2. GRID DE METADADOS EM 3 CARDS EXECUTIVOS
    const metaCardY = 27;
    const metaCardH = 19;
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
    doc.text('VEÍCULO AUDITADO', 16, metaCardY + 5);

    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.text(`PLACA: ${cleanPlaca}`, 16, metaCardY + 10.5);

    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'normal');
    doc.text(`Renavam: ${renavam || 'Não informado'}`, 16, metaCardY + 15);

    // Card 2: Resultado da Auditoria
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(75.5, metaCardY, metaCardW, metaCardH, metaCardR, metaCardR, 'FD');

    doc.setFontSize(6);
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'bold');
    doc.text('CADEIA DOMINIAL LOCALIZADA', 79.5, metaCardY + 5);

    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.text(`${total} ${total === 1 ? 'Proprietário Registrado' : 'Proprietários Registrados'}`, 79.5, metaCardY + 10.5);

    doc.setFontSize(6);
    doc.setFillColor(4, 120, 87); // Emerald 700
    doc.circle(80.5, metaCardY + 14.5, 0.8, 'F');
    doc.setTextColor(4, 120, 87);
    doc.setFont('helvetica', 'bold');
    doc.text('Cadeia Dominial Identificada', 83, metaCardY + 15);

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

    let currentY = 48;

    // Card de Destaque: Proprietário Atual Vigente (se houver)
    if (proprietarioAtual) {
      const cardAtualH = 18;
      doc.setFillColor(239, 246, 255); // Blue 50
      doc.setDrawColor(191, 219, 254); // Blue 200
      doc.setLineWidth(0.4);
      doc.roundedRect(12, currentY, 186, cardAtualH, 1.5, 1.5, 'FD');

      // Friso lateral azul institucional
      doc.setFillColor(29, 78, 216);
      doc.roundedRect(12, currentY, 2, cardAtualH, 1, 0, 'F');

      // Tag de destaque
      doc.setFillColor(29, 78, 216);
      doc.roundedRect(16, currentY + 2.5, 36, 4, 1, 1, 'F');
      doc.setFontSize(5.5);
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.text('PROPRIETÁRIO ATUAL VIGENTE', 17.5, currentY + 5.3);

      if (proprietarioAtual.tempoPosse) {
        doc.setFontSize(6.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(4, 120, 87); // Emerald 700
        doc.text(`Tempo de Posse: ${proprietarioAtual.tempoPosse} (Vigente)`, 194, currentY + 5.3, { align: 'right' });
      }

      // Razão Social / Nome
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      const nomeTitular = proprietarioAtual.razao_social || proprietarioAtual.nome || 'NÃO IDENTIFICADO';
      doc.text(nomeTitular, 16, currentY + 10.5);

      // Documento, Localização e Evento
      doc.setFontSize(6.5);
      doc.setTextColor(71, 85, 105);
      doc.setFont('helvetica', 'normal');
      const isAtualPj = String(proprietarioAtual.documento || '').replace(/\D/g, '').length === 14;
      const docTipo = `${isAtualPj ? 'Pessoa jurídica' : (proprietarioAtual.tipo || 'Pessoa física')} • ${formatDocumento(proprietarioAtual.documento || '')}`;
      const localizacao = `${proprietarioAtual.municipio || ''}${proprietarioAtual.uf ? ` - ${proprietarioAtual.uf}` : ''}`;
      doc.text(`${docTipo}  |  Município: ${localizacao || 'Não informado'}`, 16, currentY + 15);

      if (proprietarioAtual.data) {
        doc.setFontSize(6);
        doc.setTextColor(100, 116, 139);
        doc.text(`Desde: ${proprietarioAtual.data}${proprietarioAtual.hora ? ` às ${proprietarioAtual.hora}` : ''}`, 194, currentY + 15, { align: 'right' });
      }

      currentY += cardAtualH + 3.5;
    }

    // Título da Seção do Histórico Cronológico
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text(`CADEIA DOMINIAL CRONOLÓGICA (${historico.length} REGISTROS)`, 12, currentY);
    currentY += 3.5;

    const bottomLimit = 276;

    const drawHeaderSubsequent = () => {
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
      doc.text('Laudo Oficial de Histórico de Proprietários Veiculares (Continuação)', 48, 10.5);
      doc.setFontSize(6);
      doc.setTextColor(100, 116, 139);
      doc.setFont('helvetica', 'normal');
      doc.text(`Veículo Auditado: Placa ${cleanPlaca}`, 48, 14);

      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.line(12, 17.5, 198, 17.5);
    };

    // Renderização Compacta e Executiva (evita páginas espaçadas ou com poucos registros soltos)
    const cardHeight = 15;
    const cardSpacing = 1.8;

    historico.forEach((item, idx) => {
      if (currentY + cardHeight > bottomLimit) {
        doc.addPage();
        drawHeaderSubsequent();
        currentY = 22;
      }

      const isAtual = item.atual;

      // Card do Proprietário
      if (isAtual) {
        doc.setFillColor(240, 253, 244); // Green 50
        doc.setDrawColor(187, 247, 208); // Green 200
      } else {
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(226, 232, 240);
      }
      doc.setLineWidth(0.3);
      doc.roundedRect(12, currentY, 186, cardHeight, 1.2, 1.2, 'FD');

      // Friso lateral
      if (isAtual) {
        doc.setFillColor(22, 163, 74); // Green 600
        doc.roundedRect(12, currentY, 1.8, cardHeight, 1, 0, 'F');
      }

      // Linha 1: Badge ordinal e Data/Hora
      doc.setFontSize(6);
      doc.setFont('helvetica', 'bold');
      if (isAtual) {
        doc.setTextColor(22, 163, 74);
        doc.text(`#${idx + 1} • PROPRIETÁRIO ATUAL (VIGENTE)`, 16, currentY + 3.8);
      } else if (idx === 0) {
        doc.setTextColor(29, 78, 216);
        doc.text(`#1 • PRIMEIRO REGISTRO HISTÓRICO`, 16, currentY + 3.8);
      } else {
        doc.setTextColor(100, 116, 139);
        doc.text(`#${idx + 1} • REGISTRO DE PROPRIEDADE`, 16, currentY + 3.8);
      }

      // Data e Hora do evento à direita
      doc.setFontSize(6);
      doc.setTextColor(100, 116, 139);
      doc.setFont('helvetica', 'normal');
      doc.text(`Registro: ${item.data || '-'} às ${item.hora || '-'}`, 194, currentY + 3.8, { align: 'right' });

      // Linha 2: Razão Social / Nome e Localização
      doc.setFontSize(7.5);
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      const nomeExibicao = item.razao_social || item.nome || 'NÃO INFORMADO';
      doc.text(nomeExibicao, 16, currentY + 8);

      doc.setFontSize(6.5);
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      const locStr = `${item.municipio || ''}${item.uf ? ` - ${item.uf}` : ''}`;
      doc.text(locStr || 'Município não informado', 194, currentY + 8, { align: 'right' });

      // Linha 3: Documento, Tipo, Evento e Tempo de Posse
      doc.setFontSize(6);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      const isItemPj = String(item.documento || '').replace(/\D/g, '').length === 14;
      const docStr = `${isItemPj ? 'Pessoa jurídica' : (item.tipo || 'Pessoa física')} | Doc: ${formatDocumento(item.documento || '')}`;
      const eventoStr = item.evento ? ` | Evento: ${item.evento}` : '';
      doc.text(`${docStr}${eventoStr}`, 16, currentY + 12.3);

      if (item.tempoPosse) {
        doc.setFontSize(6);
        doc.setFont('helvetica', 'bold');
        if (isAtual) {
          doc.setTextColor(22, 163, 74);
          doc.text(`Tempo de Posse: ${item.tempoPosse}`, 194, currentY + 12.3, { align: 'right' });
        } else {
          doc.setTextColor(71, 85, 105);
          doc.text(`Tempo de Posse: ${item.tempoPosse}`, 194, currentY + 12.3, { align: 'right' });
        }
      }

      currentY += cardHeight + cardSpacing;
    });

    // 4. RODAPÉ DE FÉ PÚBLICA EM TODAS AS PÁGINAS
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
        'Este documento é um relatório pericial emitido pela plataforma RENACRED a partir de fontes oficiais de registros veiculares nacionais.',
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

    doc.save(`Renacred_Veicular_${cleanPlaca}_${Date.now()}.pdf`);
  };

  return (
    <button
      onClick={handleExport}
      className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-semibold bg-[#1D4ED8] hover:bg-[#1E40AF] text-white transition shadow-xs cursor-pointer"
    >
      <FileDown className="w-4 h-4 mr-2" />
      Exportar Laudo PDF
    </button>
  );
};
