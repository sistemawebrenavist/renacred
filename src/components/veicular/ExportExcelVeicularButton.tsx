import React from 'react';
import * as XLSX from 'xlsx';
import { Table } from 'lucide-react';

interface ExportExcelVeicularProps {
  placa: string;
  renavam?: string;
  historico: any[];
}

export const ExportExcelVeicularButton: React.FC<ExportExcelVeicularProps> = ({ placa, renavam, historico }) => {
  const handleExport = () => {
    const formattedData = historico.map((item, idx) => ({
      Ordem_Cronologica: idx + 1,
      Data_Registro: item.data || '',
      Hora_Registro: item.hora || '',
      Nome_Proprietario: item.nome || '',
      Documento: item.documento || '',
      Tipo_Pessoa: item.tipo || '',
      Municipio: item.municipio || '',
      UF: item.uf || '',
      Evento: item.evento || 'Registro de Propriedade',
      Situacao: item.atual ? 'Proprietário Atual (Vigente)' : 'Anterior',
    }));

    const worksheet = XLSX.utils.json_to_sheet(formattedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Historico_Proprietarios');

    XLSX.writeFile(workbook, `Renacred_Veicular_${placa}_${Date.now()}.xlsx`);
  };

  return (
    <button
      onClick={handleExport}
      className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 transition shadow-xs cursor-pointer"
    >
      <Table className="w-4 h-4 mr-2 text-emerald-600" />
      Exportar Planilha Excel
    </button>
  );
};
