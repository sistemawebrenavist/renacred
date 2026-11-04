import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { 
  Calendar, 
  Filter, 
  Search, 
  Eye, 
  Code, 
  Check, 
  Copy, 
  X, 
  ChevronLeft, 
  ChevronRight,
  RotateCw,
  FileSpreadsheet,
  FileText,
  Download,
  ChevronDown
} from 'lucide-react';
import { toast } from 'sonner';
import api from '../../services/api';
import { getProductByCode } from '../../config/productsCatalog';

interface ExtratoConsumoViewProps {
  companyId?: string;
  companyName?: string;
  isModal?: boolean;
}

export default function ExtratoConsumoView({ companyId, companyName, isModal = false }: ExtratoConsumoViewProps) {
  // Estado dos Filtros
  const [activeCyclePreset, setActiveCyclePreset] = useState<'current' | 'previous' | 'month' | 'last30'>('current');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [sourceFilter, setSourceFilter] = useState<'ALL' | 'API' | 'WEB'>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [limit] = useState<number>(50);

  // Dados do Backend
  const [loading, setLoading] = useState<boolean>(true);
  const [exporting, setExporting] = useState<boolean>(false);
  const [showExportMenu, setShowExportMenu] = useState<boolean>(false);
  const [companyInfo, setCompanyInfo] = useState<any>(null);
  const [kpis, setKpis] = useState<{
    totalQueries: number;
    billedQueries?: number;
    freeQueries?: number;
    failedQueries?: number;
    totalAmount: number;
    apiQueries: number;
    webQueries: number;
    averageTicket: number;
  }>({
    totalQueries: 0,
    billedQueries: 0,
    freeQueries: 0,
    failedQueries: 0,
    totalAmount: 0,
    apiQueries: 0,
    webQueries: 0,
    averageTicket: 0,
  });
  const [items, setItems] = useState<any[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 1,
  });

  // Modais de Detalhe
  const [selectedLaudo, setSelectedLaudo] = useState<any | null>(null);
  const [selectedJson, setSelectedJson] = useState<any | null>(null);
  const [copiedJson, setCopiedJson] = useState<boolean>(false);

  // Helper para formatar data ISO em YYYY-MM-DD
  const formatDateForInput = (d: Date): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Aplica o Preset de Ciclo nos inputs de data
  const applyCyclePreset = (preset: 'current' | 'previous' | 'month' | 'last30', billingDueDay: number = 10) => {
    setActiveCyclePreset(preset);
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const currentDay = now.getDate();
    const day = Math.min(Math.max(billingDueDay || 10, 1), 31);

    if (preset === 'current') {
      let startYear = currentYear;
      let startMonth = currentMonth;
      if (currentDay < day) {
        startMonth = currentMonth - 1;
        if (startMonth < 0) {
          startMonth = 11;
          startYear = currentYear - 1;
        }
      }
      const start = new Date(startYear, startMonth, day);
      let endMonth = startMonth + 1;
      let endYear = startYear;
      if (endMonth > 11) {
        endMonth = 0;
        endYear = startYear + 1;
      }
      const end = new Date(endYear, endMonth, day - 1);
      setStartDate(formatDateForInput(start));
      setEndDate(formatDateForInput(end));
    } else if (preset === 'previous') {
      let startYear = currentYear;
      let startMonth = currentMonth;
      if (currentDay < day) {
        startMonth = currentMonth - 2;
      } else {
        startMonth = currentMonth - 1;
      }
      if (startMonth < 0) {
        startMonth += 12;
        startYear -= 1;
      }
      const start = new Date(startYear, startMonth, day);
      let endMonth = startMonth + 1;
      let endYear = startYear;
      if (endMonth > 11) {
        endMonth = 0;
        endYear = startYear + 1;
      }
      const end = new Date(endYear, endMonth, day - 1);
      setStartDate(formatDateForInput(start));
      setEndDate(formatDateForInput(end));
    } else if (preset === 'month') {
      const start = new Date(currentYear, currentMonth, 1);
      const end = new Date(currentYear, currentMonth + 1, 0);
      setStartDate(formatDateForInput(start));
      setEndDate(formatDateForInput(end));
    } else if (preset === 'last30') {
      const start = new Date();
      start.setDate(now.getDate() - 30);
      setStartDate(formatDateForInput(start));
      setEndDate(formatDateForInput(now));
    }
  };

  // Carrega os dados do extrato
  const fetchStatement = async (overridePage?: number) => {
    setLoading(true);
    try {
      const activePage = overridePage !== undefined ? overridePage : page;
      const params: any = {
        page: activePage,
        limit,
      };

      if (companyId) params.companyId = companyId;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (sourceFilter !== 'ALL') params.source = sourceFilter;
      if (searchTerm.trim()) params.search = searchTerm.trim();

      const res = await api.get('/api/payment/consumption-statement', { params });
      if (res.data?.success) {
        const d = res.data.data;
        setCompanyInfo(d.company);
        setKpis(d.kpis);
        setItems(d.items);
        setPagination(d.pagination);

        if (!startDate && d.cycleInfo?.currentCycleStart) {
          const cStart = new Date(d.cycleInfo.currentCycleStart);
          const cEnd = new Date(d.cycleInfo.currentCycleEnd);
          setStartDate(formatDateForInput(cStart));
          setEndDate(formatDateForInput(cEnd));
        }
      }
    } catch (err: any) {
      console.error('Erro ao carregar extrato de consumo:', err);
      toast.error(err.response?.data?.message || 'Erro ao carregar extrato de consumo.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatement(1);
  }, [companyId, page]);

  const handleFilterSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setPage(1);
    fetchStatement(1);
  };

  const handleSelectPreset = (preset: 'current' | 'previous' | 'month' | 'last30') => {
    const dueDay = companyInfo?.billingDueDate || 10;
    applyCyclePreset(preset, dueDay);
    setPage(1);
    setTimeout(() => {
      fetchStatement(1);
    }, 50);
  };

  // Exportação completa de todas as consultas do período (Excel .xlsx ou CSV .csv)
  const handleExport = async (exportFormat: 'xlsx' | 'csv') => {
    setShowExportMenu(false);
    setExporting(true);
    const toastId = toast.loading(`Buscando todas as consultas do período para exportação (${exportFormat.toUpperCase()})...`);

    try {
      const params: any = {
        format: 'json'
      };
      if (companyId) params.companyId = companyId;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (sourceFilter !== 'ALL') params.source = sourceFilter;
      if (searchTerm.trim()) params.search = searchTerm.trim();

      const res = await api.get('/api/payment/consumption-statement/export', { params });
      if (!res.data?.success || !res.data?.data) {
        throw new Error(res.data?.message || 'Falha ao buscar dados de exportação.');
      }

      const { company, summary, items: exportItems } = res.data.data;
      if (!exportItems || exportItems.length === 0) {
        toast.dismiss(toastId);
        toast.error('Nenhum dado encontrado para exportar com os filtros atuais.');
        return;
      }

      const clientName = company?.razaoSocial || companyInfo?.razaoSocial || companyName || 'Cliente';
      const clientCnpj = company?.cnpjCpf || companyInfo?.cnpjCpf || '';
      const clientNameClean = clientName.replace(/[^a-zA-Z0-9]/g, '_');
      const periodLabel = `${startDate || 'inicio'}_${endDate || 'fim'}`;
      const emissionDate = new Date().toLocaleString('pt-BR');

      if (exportFormat === 'xlsx') {
        // Geração da Planilha Excel (.xlsx) com SheetJS
        const wb = XLSX.utils.book_new();

        const wsData: any[][] = [
          ['RELATÓRIO ANALÍTICO DE CONSUMO E TARIFAS - RENACRED'],
          ['Cliente:', clientName, 'CNPJ / CPF:', clientCnpj],
          ['Período de Leitura:', `${startDate || 'Início'} até ${endDate || 'Fim'}`, 'Emissão:', emissionDate],
          [
            'Total de Consultas:', Number(summary.totalQueries || exportItems.length),
            'Consultas Faturadas:', Number(summary.billedQueries || 0),
            'Não Cobradas (Isentas):', Number(summary.freeQueries || 0),
            'Falhas Técnicas:', Number(summary.failedQueries || 0)
          ],
          ['Valor Total Faturado:', Number(summary.totalAmount || 0)],
          [],
          ['Data / Hora', 'Placa / Identificador', 'Código Produto', 'Nome do Produto', 'Origem', 'Tarifa (R$)', 'Status da Consulta', 'ID Consulta']
        ];

        for (const it of exportItems) {
          wsData.push([
            new Date(it.createdAt).toLocaleString('pt-BR'),
            it.identifier,
            it.productCode,
            it.productName,
            it.sourceLabel,
            Number(it.cost || 0),
            it.statusLabel,
            it.id
          ]);
        }

        wsData.push([]);
        wsData.push([
          'TOTAL GERAL FATURADO',
          '',
          '',
          '',
          '',
          Number(summary.totalAmount || 0),
          `${summary.billedQueries || 0} consultas faturadas (falhas e isentas = R$ 0,00)`,
          ''
        ]);

        const ws = XLSX.utils.aoa_to_sheet(wsData);

        ws['!cols'] = [
          { wch: 20 },
          { wch: 22 },
          { wch: 15 },
          { wch: 38 },
          { wch: 14 },
          { wch: 16 },
          { wch: 32 },
          { wch: 38 },
        ];

        XLSX.utils.book_append_sheet(wb, ws, 'Extrato Consumo');
        XLSX.writeFile(wb, `extrato_consumo_${clientNameClean}_${periodLabel}.xlsx`);
        toast.dismiss(toastId);
        toast.success(`Relatório Excel exportado com sucesso! (${exportItems.length} consultas)`);

      } else {
        // Geração do Arquivo CSV com UTF-8 BOM e delimitador ';' para Excel BR
        const csvRows = [
          ['"RELATÓRIO ANALÍTICO DE CONSUMO E TARIFAS - RENACRED"'],
          [`"Cliente: ${clientName.replace(/"/g, '""')}"`, `"CNPJ/CPF: ${clientCnpj}"`],
          [`"Período de Leitura: ${startDate || 'Início'} até ${endDate || 'Fim'}"`, `"Emissão: ${emissionDate}"`],
          [
            `"Total de Consultas: ${summary.totalQueries || exportItems.length}"`,
            `"Faturadas: ${summary.billedQueries || 0}"`,
            `"Não Cobradas / Isentas: ${summary.freeQueries || 0}"`,
            `"Falhas Técnicas: ${summary.failedQueries || 0}"`
          ],
          [`"Valor Total Faturado: R$ ${Number(summary.totalAmount || 0).toFixed(2)}"`],
          [''],
          ['"Data / Hora"', '"Placa / Identificador"', '"Código Produto"', '"Nome do Produto"', '"Origem"', '"Tarifa (R$)"', '"Status da Consulta"', '"ID Consulta"'],
          ...exportItems.map((it: any) => [
            `"${new Date(it.createdAt).toLocaleString('pt-BR')}"`,
            `"${it.identifier}"`,
            `"${it.productCode}"`,
            `"${(it.productName || '').replace(/"/g, '""')}"`,
            `"${it.sourceLabel}"`,
            `"${Number(it.cost || 0).toFixed(2)}"`,
            `"${it.statusLabel}"`,
            `"${it.id}"`
          ]),
          [''],
          ['"TOTAL GERAL FATURADO"', '""', '""', '""', '""', `"${Number(summary.totalAmount || 0).toFixed(2)}"`, `"${summary.billedQueries || 0} consultas faturadas (falhas não cobradas)"`, '""']
        ];

        const csvContent = '\uFEFF' + csvRows.map(r => r.join(';')).join('\r\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `extrato_consumo_${clientNameClean}_${periodLabel}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.dismiss(toastId);
        toast.success(`Relatório CSV exportado com sucesso! (${exportItems.length} consultas)`);
      }

    } catch (err: any) {
      console.error('Erro ao exportar extrato de consumo:', err);
      toast.dismiss(toastId);
      toast.error(err.response?.data?.message || err.message || 'Erro ao exportar extrato de consumo.');
    } finally {
      setExporting(false);
    }
  };

  const handleCopyJson = () => {
    if (!selectedJson) return;
    navigator.clipboard.writeText(JSON.stringify(selectedJson, null, 2));
    setCopiedJson(true);
    toast.success('JSON copiado para a área de transferência!');
    setTimeout(() => setCopiedJson(false), 2000);
  };

  const billingDay = companyInfo?.billingDueDate || 10;

  return (
    <div className={`space-y-6 ${isModal ? 'p-1' : ''}`}>
      {/* 1. Barra Superior: Atalhos de Ciclo (Ciclo Vigente, Anterior, Mês, 30 Dias) */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-2 text-slate-700 text-xs font-semibold">
          <Calendar className="w-4 h-4 text-blue-600" />
          <span>Atalhos de Ciclo:</span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => handleSelectPreset('current')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer border ${
              activeCyclePreset === 'current'
                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            Ciclo Vigente (Dia {billingDay})
          </button>

          <button
            type="button"
            onClick={() => handleSelectPreset('previous')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer border ${
              activeCyclePreset === 'previous'
                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            Ciclo Anterior
          </button>

          <button
            type="button"
            onClick={() => handleSelectPreset('month')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer border ${
              activeCyclePreset === 'month'
                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            Mês Atual
          </button>

          <button
            type="button"
            onClick={() => handleSelectPreset('last30')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer border ${
              activeCyclePreset === 'last30'
                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            Últimos 30 Dias
          </button>
        </div>
      </div>

      {/* 2. Barra de Filtros Operacionais */}
      <form onSubmit={handleFilterSubmit} className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Período de / até */}
          <div className="md:col-span-5 flex items-center space-x-2">
            <span className="text-xs text-slate-500 font-semibold whitespace-nowrap">Período:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setActiveCyclePreset('' as any);
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
            />
            <span className="text-xs text-slate-400">até</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setActiveCyclePreset('' as any);
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Origem Dropdown */}
          <div className="md:col-span-3">
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value as any)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 font-medium focus:outline-hidden focus:ring-1 focus:ring-blue-500"
            >
              <option value="ALL">Todas as Origens (Web + API)</option>
              <option value="API">Somente Integração API</option>
              <option value="WEB">Somente Portal Web</option>
            </select>
          </div>

          {/* Busca por Placa / Doc */}
          <div className="md:col-span-2 relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Buscar placa, chassi..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-blue-500 uppercase"
            />
          </div>

          {/* Botões Filtrar & Exportar */}
          <div className="md:col-span-2 flex items-center space-x-2">
            <button
              type="submit"
              className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-semibold py-1.5 px-3 rounded-xl text-xs flex items-center justify-center transition cursor-pointer shadow-xs"
            >
              <Filter className="w-3.5 h-3.5 mr-1" />
              Filtrar
            </button>

            {/* Dropdown de Exportação (Excel / CSV) */}
            <div className="relative">
              <button
                type="button"
                disabled={exporting}
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold py-1.5 px-3 rounded-xl text-xs flex items-center justify-center transition cursor-pointer shadow-xs whitespace-nowrap gap-1"
                title="Exportar todas as consultas filtradas do período"
              >
                {exporting ? (
                  <RotateCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                <span>Exportar</span>
                <ChevronDown className="w-3 h-3 opacity-80" />
              </button>

              {showExportMenu && (
                <div
                  className="absolute right-0 mt-1 w-52 bg-white border border-slate-200 rounded-xl shadow-lg z-50 py-1 text-xs divide-y divide-slate-100"
                  onMouseLeave={() => setShowExportMenu(false)}
                >
                  <button
                    type="button"
                    onClick={() => handleExport('xlsx')}
                    className="w-full text-left px-3.5 py-2.5 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 flex items-center gap-2.5 cursor-pointer font-medium transition"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <span className="block font-bold">Planilha Excel (.xlsx)</span>
                      <span className="text-[10px] text-slate-400">Completa com cabeçalho e totais</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleExport('csv')}
                    className="w-full text-left px-3.5 py-2.5 hover:bg-blue-50 text-slate-700 hover:text-blue-800 flex items-center gap-2.5 cursor-pointer font-medium transition"
                  >
                    <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                    <div>
                      <span className="block font-bold">Arquivo CSV (.csv)</span>
                      <span className="text-[10px] text-slate-400">Padrão RFC4180 (UTF-8 BOM)</span>
                    </div>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </form>

      {/* 3. Cinco Cartões de Indicadores (KPIs Executivos Consolidados) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* TOTAL DE CONSULTAS */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
          <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider block">
            TOTAL DE CONSULTAS
          </span>
          <div className="text-2xl font-extrabold text-slate-900 font-mono mt-1">
            {kpis.totalQueries.toLocaleString('pt-BR')}
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">
            Volume bruto de requisições
          </span>
        </div>

        {/* CONSULTAS FATURADAS */}
        <div className="bg-white border border-blue-200/80 rounded-2xl p-4 shadow-xs bg-blue-50/20">
          <span className="text-[10.5px] font-bold text-blue-700 uppercase tracking-wider block">
            CONSULTAS FATURADAS
          </span>
          <div className="text-2xl font-extrabold text-blue-700 font-mono mt-1">
            {(kpis.billedQueries || 0).toLocaleString('pt-BR')}
          </div>
          <span className="text-[10px] text-blue-600/80 mt-0.5 block">
            Sucesso com tarifação
          </span>
        </div>

        {/* CONSULTAS ISENTAS */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
          <span className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider block">
            ISENTAS / CUSTO ZERO
          </span>
          <div className="text-2xl font-extrabold text-slate-600 font-mono mt-1">
            {(kpis.freeQueries || 0).toLocaleString('pt-BR')}
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">
            Nada consta / Não cobradas
          </span>
        </div>

        {/* FALHAS TÉCNICAS */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
          <span className="text-[10.5px] font-bold text-rose-600 uppercase tracking-wider block">
            FALHAS TÉCNICAS
          </span>
          <div className="text-2xl font-extrabold text-rose-600 font-mono mt-1">
            {(kpis.failedQueries || 0).toLocaleString('pt-BR')}
          </div>
          <span className="text-[10px] text-rose-500/80 mt-0.5 block">
            Isentas de cobrança (R$ 0,00)
          </span>
        </div>

        {/* TOTAL TARIFADO */}
        <div className="bg-white border border-emerald-200/80 rounded-2xl p-4 shadow-xs bg-emerald-50/20">
          <span className="text-[10.5px] font-bold text-emerald-800 uppercase tracking-wider block">
            TOTAL FATURADO
          </span>
          <div className="text-2xl font-extrabold text-emerald-700 font-mono mt-1">
            R$ {Number(kpis.totalAmount || 0).toFixed(2)}
          </div>
          <span className="text-[10px] text-emerald-600/80 mt-0.5 block">
            Médio: R$ {Number(kpis.averageTicket || 0).toFixed(2)} / fat.
          </span>
        </div>
      </div>

      {/* 4. Tabela de Extrato de Alta Densidade */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-0 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-xs text-slate-400 flex flex-col items-center justify-center space-y-2">
            <RotateCw className="w-6 h-6 animate-spin text-blue-600" />
            <span>Carregando extrato de consumo...</span>
          </div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center text-slate-400 space-y-1">
            <p className="text-sm font-semibold text-slate-600">Nenhuma consulta localizada para este período.</p>
            <p className="text-xs text-slate-400">Experimente alterar os filtros de período ou clicar em "Últimos 30 Dias".</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-slate-500 uppercase tracking-wider border-b border-slate-200 bg-slate-50/75 font-semibold text-[11px]">
                <tr>
                  <th className="py-3 px-4">DATA / HORA</th>
                  <th className="py-3 px-4">PLACA / IDENTIFICADOR</th>
                  <th className="py-3 px-4">PRODUTO / TIPO</th>
                  <th className="py-3 px-4">ORIGEM</th>
                  <th className="py-3 px-4">TARIFA COBRADA</th>
                  <th className="py-3 px-4">STATUS</th>
                  <th className="py-3 px-4 text-right">AÇÃO</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {items.map((row) => {
                  const isApi = row.source === 'API';
                  const prod = getProductByCode(row.productCode);
                  const displayProdName = row.productName || prod?.name || 'Consulta Integrada';

                  return (
                    <tr key={row.id} className="hover:bg-slate-50/80 transition">
                      {/* Data / Hora */}
                      <td className="py-3 px-4 text-slate-600 font-mono whitespace-nowrap">
                        {new Date(row.createdAt).toLocaleDateString('pt-BR')} {new Date(row.createdAt).toLocaleTimeString('pt-BR')}
                      </td>

                      {/* Placa / Identificador */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-mono font-bold tracking-wider text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-xs">
                          {row.identifier}
                        </span>
                      </td>

                      {/* Produto / Tipo */}
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-1.5">
                          <span className="font-mono font-bold text-[11px] text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                            {row.productCode}
                          </span>
                          <span className="text-slate-700 text-xs truncate max-w-[240px]" title={displayProdName}>
                            {displayProdName}
                          </span>
                        </div>
                      </td>

                      {/* Origem */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10.5px] font-bold ${
                            isApi
                              ? 'bg-purple-50 text-purple-700 border border-purple-200'
                              : 'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}
                        >
                          {row.sourceLabel}
                        </span>
                      </td>

                      {/* Tarifa Cobrada */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-mono font-bold text-slate-900 text-xs">
                          R$ {Number(row.cost).toFixed(2)}
                        </span>
                      </td>

                      {/* Status da Consulta */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {row.status === 'ERROR' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10.5px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            Falha Técnica
                          </span>
                        ) : Number(row.cost) > 0 ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10.5px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Sucesso (Tarifado)
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center px-2 py-0.5 rounded text-[10.5px] font-bold bg-slate-100 text-slate-600 border border-slate-200"
                            title="Consulta realizada sem ocorrências / custo zero"
                          >
                            Sem Cobrança (R$ 0,00)
                          </span>
                        )}
                      </td>

                      {/* Ações */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            type="button"
                            onClick={() => setSelectedLaudo(row)}
                            className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
                            title="Ver detalhes do laudo retornado"
                          >
                            <Eye className="w-3.5 h-3.5 mr-1 text-slate-500" />
                            Ver Laudo
                          </button>

                          <button
                            type="button"
                            onClick={() => setSelectedJson(row.resultData || row.requestData)}
                            className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 transition cursor-pointer"
                            title="Ver payload JSON puro retornado pela API"
                          >
                            <Code className="w-3.5 h-3.5 mr-1 text-purple-600" />
                            Ver JSON
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Rodapé de Paginação */}
        {pagination.totalPages > 1 && (
          <div className="border-t border-slate-200 px-4 py-3 flex items-center justify-between bg-slate-50/50">
            <span className="text-xs text-slate-500">
              Mostrando página <strong className="text-slate-900">{pagination.page}</strong> de{' '}
              <strong className="text-slate-900">{pagination.totalPages}</strong> ({pagination.total} consultas)
            </span>

            <div className="flex items-center space-x-1.5">
              <button
                type="button"
                disabled={pagination.page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center"
              >
                <ChevronLeft className="w-3.5 h-3.5 mr-0.5" />
                Anterior
              </button>

              <button
                type="button"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center"
              >
                Próximo
                <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 5. Modal: Ver Laudo Estruturado */}
      {selectedLaudo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            {/* Cabeçalho */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center space-x-3">
                <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-blue-100 text-blue-800">
                  {selectedLaudo.productCode}
                </span>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    {selectedLaudo.identifier} • {selectedLaudo.productName || 'Laudo de Consulta'}
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Realizada em {new Date(selectedLaudo.createdAt).toLocaleString('pt-BR')} via {selectedLaudo.sourceLabel}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedLaudo(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Conteúdo */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200 font-mono">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Tarifa Cobrada</span>
                  <span className="font-bold text-slate-900">R$ {Number(selectedLaudo.cost).toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Status</span>
                  <span className="font-bold text-emerald-700">{selectedLaudo.status}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Tempo Resp.</span>
                  <span className="font-bold text-slate-700">{selectedLaudo.processingTimeMs || 0}ms</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Itens Retornados</span>
                  <span className="font-bold text-blue-700">{selectedLaudo.totalDeclaracoes || 0}</span>
                </div>
              </div>

              {/* Renderização Inteligente de Multas / Veículo ou Declarações */}
              {selectedLaudo.resultData?.multas && Array.isArray(selectedLaudo.resultData.multas) ? (
                <div className="space-y-2">
                  <h5 className="font-bold text-slate-800 text-xs">
                    Infrações e Multas Encontradas ({selectedLaudo.resultData.multas.length})
                  </h5>
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                    {selectedLaudo.resultData.multas.map((m: any, idx: number) => (
                      <div key={idx} className="p-3 bg-white hover:bg-slate-50/80 text-[11px] space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-slate-900">{m.auto_infracao || `Infração #${idx + 1}`}</span>
                          <span className="font-mono font-bold text-red-600">R$ {m.valor || '0,00'}</span>
                        </div>
                        <p className="text-slate-600 text-[10.5px]">{m.descricao_infracao || 'Sem descrição'}</p>
                        <div className="flex gap-2 text-[10px] text-slate-400">
                          <span>Órgão: {m.orgao_autuador || 'N/A'}</span>
                          <span>• Data: {m.data_infracao || 'N/A'}</span>
                          <span>• Gravidade: {m.gravidade || 'N/A'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : selectedLaudo.resultData?.declaracoes && Array.isArray(selectedLaudo.resultData.declaracoes) ? (
                <div className="space-y-2">
                  <h5 className="font-bold text-slate-800 text-xs">
                    Declarações Cartorárias / DOI ({selectedLaudo.resultData.declaracoes.length})
                  </h5>
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                    {selectedLaudo.resultData.declaracoes.map((dec: any, idx: number) => (
                      <div key={idx} className="p-3 bg-white text-[11px] space-y-1">
                        <div className="flex justify-between font-bold text-slate-900">
                          <span>{dec.natureza_operacao || 'Operação Imobiliária'}</span>
                          <span className="text-blue-700 font-mono">R$ {dec.valor_alienacao || '0,00'}</span>
                        </div>
                        <p className="text-slate-600 text-[10.5px]">Cartório: {dec.serventia_nome || dec.cartorio || 'Serventia Notarial'}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <h5 className="font-bold text-slate-800 text-xs">Dados Retornados da Consulta:</h5>
                  <pre className="bg-slate-900 text-emerald-400 p-3 rounded-xl text-[11px] font-mono overflow-x-auto max-h-60">
                    {JSON.stringify(selectedLaudo.resultData, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedLaudo(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-xs"
              >
                Fechar Visualização
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Modal: Ver JSON Puro */}
      {selectedJson && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-slate-950 rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-800 overflow-hidden text-slate-100">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
              <div className="flex items-center space-x-2">
                <Code className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-mono font-bold text-slate-200">Payload JSON do Laudo</span>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleCopyJson}
                  className="px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-mono flex items-center text-slate-300 transition"
                >
                  {copiedJson ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400 mr-1" />
                      Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-400 mr-1" />
                      Copiar JSON
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedJson(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Código */}
            <div className="p-4 overflow-y-auto flex-1 font-mono text-[11px] leading-relaxed text-emerald-400 bg-slate-950">
              <pre>{JSON.stringify(selectedJson, null, 2)}</pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
