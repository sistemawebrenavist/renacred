import React from 'react';
import * as XLSX from 'xlsx';
import { Table } from 'lucide-react';
import { DeclaracaoProps } from './DeclaracaoCard';

interface ExportExcelProps {
  documento: string;
  declaracoes: DeclaracaoProps[];
}

export const ExportExcelButton: React.FC<ExportExcelProps> = ({ documento, declaracoes }) => {
  const handleExport = () => {
    const formattedData = declaracoes.map((dec, idx) => ({
      Item: idx + 1,
      Numero_Declaracao_DOI: dec.numDeclaracao || '',
      Tipo_Declaracao: dec.tipoDeclaracao || 'Original',
      Data_Registro: dec.dataLavratura || '',
      Matricula: dec.matricula || '',
      Registro: dec.registro || '',
      Livro: dec.livro || '',
      Folha: dec.folha || '',
      Cartorio: dec.cartorio || '',
      CNPJ_Cartorio: dec.cnpjCartorio || '',
      Tipo_Cartorio: dec.tipoCartorio || '',
      Alienantes: (dec.alienantes || []).map(a => `${a.nome} (${a.cpfCnpj})`).join('; '),
      Adquirentes: (dec.adquirentes || []).map(a => `${a.nome} (${a.cpfCnpj})`).join('; '),
    }));

    const worksheet = XLSX.utils.json_to_sheet(formattedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Declaracoes_Imobiliarias');

    XLSX.writeFile(workbook, `Renacred_Imobiliario_${documento}_${Date.now()}.xlsx`);
  };

  return (
    <button
      onClick={handleExport}
      className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 transition shadow-xs"
    >
      <Table className="w-4 h-4 mr-2 text-emerald-600" />
      Exportar Planilha Excel
    </button>
  );
};
