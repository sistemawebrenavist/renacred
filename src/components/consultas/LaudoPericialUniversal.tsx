import React from 'react';
import { ProductDefinition } from '../../config/productsCatalog';
import { Clock, User, MapPin, Building, Calendar, FileText, CheckCircle2, ShieldCheck, AlertCircle, Phone, Mail, Award, CreditCard, Briefcase, Users, Scale, ShieldAlert, Shield, CheckCircle, Car } from 'lucide-react';
import { ProprietarioTimelineCard } from '../veicular/ProprietarioTimelineCard';
import { processarHistoricoProprietarios } from '../../utils/veicularUtils';
import { ExportPdfVeicularButton } from '../veicular/ExportPdfVeicularButton';
import { ExportExcelVeicularButton } from '../veicular/ExportExcelVeicularButton';
import { DeclaracaoCard } from '../imobiliario/DeclaracaoCard';
import { ExportPdfButton } from '../imobiliario/ExportPdfButton';
import { ExportExcelButton } from '../imobiliario/ExportExcelButton';
import { translateCBO, translateMosaic } from '../../utils/cboMosaicUtils';
import { RenacredLogo } from '../ui/RenacredLogo';

// Formatação universal de CPF com 11 dígitos garantidos (preenchimento com zero à esquerda)
const formatCPF = (doc?: string | number | null): string => {
  if (!doc) return '-';
  const clean = String(doc).replace(/\D/g, '');
  if (!clean) return '-';
  const padded = clean.padStart(11, '0');
  if (padded.length === 11) {
    return padded.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }
  return formatDocumento(doc);
};

// Formatação universal de CPF/CNPJ/Placa
const formatDocumento = (doc?: string | number | null) => {
  if (!doc) return '-';
  const str = String(doc).trim();
  const clean = str.replace(/\D/g, '');
  if (clean.length > 0 && clean.length <= 11) {
    const padded = clean.padStart(11, '0');
    return padded.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }
  if (clean.length === 14) {
    return clean.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }
  return str.toUpperCase();
};

// Formatação universal de CEP (00000-000)
const formatCEP = (cep?: string | number | null): string => {
  if (!cep) return '-';
  const clean = String(cep).replace(/\D/g, '').padStart(8, '0');
  if (clean.length === 8) {
    return clean.replace(/(\d{5})(\d{3})/, '$1-$2');
  }
  return String(cep);
};

// Higienização universal de tipo de documento (CGC -> CNPJ)
const sanitizeTipoDoc = (tipo?: string | null): string => {
  if (!tipo) return 'CNPJ';
  const upper = String(tipo).trim().toUpperCase();
  if (upper === 'CGC' || upper === '2') return 'CNPJ';
  if (upper === '1') return 'CPF';
  return upper;
};

// Formatação universal de data brasileira (DD/MM/AAAA)
const formatDateBR = (val?: string | number | null): string => {
  if (val === undefined || val === null || val === '') return '-';
  const trimmed = String(val).trim();
  if (trimmed === '' || trimmed === 'null' || trimmed === 'undefined' || trimmed === '-') return '-';
  if (/^\d{2}\/\d{2}\/\d{4}/.test(trimmed)) {
    return trimmed;
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    const dateOnly = trimmed.split(/[T\s]/)[0];
    const parts = dateOnly.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
  }
  if (/^\d{8}$/.test(trimmed)) {
    const ano = trimmed.substring(0, 4);
    const mes = trimmed.substring(4, 6);
    const dia = trimmed.substring(6, 8);
    return `${dia}/${mes}/${ano}`;
  }
  if (/^\d{6}$/.test(trimmed)) {
    const ano = `20${trimmed.substring(0, 2)}`;
    const mes = trimmed.substring(2, 4);
    const dia = trimmed.substring(4, 6);
    return `${dia}/${mes}/${ano}`;
  }
  return trimmed;
};

interface LaudoPericialUniversalProps {
  produto: ProductDefinition;
  identifier: string;
  dados: any;
  hash: string;
  totalRegistros: number;
  custoDebitado: number;
  consultadoEm: string;
  tempoRespostaMs?: number;
}

export const LaudoPericialUniversal: React.FC<LaudoPericialUniversalProps> = ({
  produto,
  identifier,
  dados,
  hash,
  totalRegistros,
  custoDebitado,
  consultadoEm,
  tempoRespostaMs
}) => {
  const dataFormatada = new Date(consultadoEm).toLocaleString('pt-BR');

  const handleImprimir = () => {
    window.print();
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-6 print:border-none print:shadow-none print:p-0 print:m-0 print:w-full print:space-y-4">
      {/* Cabeçalho Institucional de Fé Pública Exclusivo para Impressão / PDF Oficial */}
      <div className="hidden print:flex items-center justify-between border-b-2 border-slate-900 pb-3 mb-4">
        <div className="flex items-center gap-3">
          <RenacredLogo size="md" badge={false} />
          <div>
            <div className="text-[12px] font-bold tracking-wider text-slate-900 uppercase">
              Rede Nacional de Proteção ao Crédito & Informações Cartorárias
            </div>
            <div className="text-[10px] text-slate-500 font-mono">
              Certidão Pericial Oficial • Emissão Eletrônica • renacred.com.br
            </div>
          </div>
        </div>
        <div className="text-right">
          <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold font-mono border ${produto.badgeColor.bg} ${produto.badgeColor.text} ${produto.badgeColor.border}`}>
            {produto.code} • {produto.categoryLabel}
          </span>
          <div className="text-[10px] text-slate-500 font-mono mt-0.5">
            Emissão: {dataFormatada}
          </div>
        </div>
      </div>

      {/* Topo do Laudo Pericial */}
      <div className="border-b border-slate-100 pb-5 flex flex-col md:flex-row md:items-center justify-between gap-4 print:pb-2 print:border-slate-200">
        <div>
          <div className="flex items-center space-x-2">
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono border ${produto.badgeColor.bg} ${produto.badgeColor.text} ${produto.badgeColor.border}`}>
              {produto.code}
            </span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Certidão Pericial Oficial • Renacred Bureau
            </span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 mt-1 print:text-base">
            {produto.name}
          </h2>
        </div>

        <div className="flex items-center space-x-2 shrink-0 print:hidden">
          <button
            onClick={handleImprimir}
            className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition cursor-pointer"
          >
            Imprimir / Salvar PDF
          </button>
        </div>
      </div>

      {/* Grid de 3 Cards Executivos de Metadados (Padrão Impeccable) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Card 1: Alvo Auditado */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3.5">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
            Alvo Auditado ({produto.inputLabel})
          </span>
          <span className="text-sm font-bold font-mono text-slate-900 mt-1 block">
            {formatDocumento(identifier)}
          </span>
          <span className="text-[11px] text-slate-500 mt-0.5 block">
            Categoria: {produto.categoryLabel}
          </span>
        </div>

        {/* Card 2: Resultado Oficial */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3.5">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
            Resultado da Varredura
          </span>
          <div className="flex items-center space-x-2 mt-1">
            <span className="text-sm font-bold font-mono text-slate-900">
              {totalRegistros} {totalRegistros === 1 ? 'registro' : 'registros'}
            </span>
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                dados?.aviso
                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                  : totalRegistros > 0
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-slate-200 text-slate-700'
              }`}
            >
              {dados?.aviso ? 'Aviso da Base' : totalRegistros > 0 ? 'Dados Localizados' : 'Sem Ocorrências'}
            </span>
          </div>
          <span className="text-[11px] text-slate-500 mt-0.5 block font-mono">
            Tarifa: R$ {(custoDebitado > 0 ? custoDebitado : (produto.defaultPrice || 0)).toFixed(2).replace('.', ',')}
            {custoDebitado === 0 && (
              <span className="ml-1.5 text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded font-sans font-semibold">
                Isento Administrador
              </span>
            )}
          </span>
        </div>

        {/* Card 3: Autenticação Digital */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3.5">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
            Autenticação Digital
          </span>
          <span className="text-xs font-bold font-mono text-blue-900 mt-1 block truncate" title={hash}>
            {hash}
          </span>
          <span className="text-[11px] text-slate-500 mt-0.5 block font-mono">
            {dataFormatada} {tempoRespostaMs ? `(${tempoRespostaMs}ms)` : ''}
          </span>
        </div>
      </div>

      {/* Conteúdo Específico do Laudo Higienizado */}
      <div className="space-y-4">
        {totalRegistros === 0 && !dados?.aviso ? (
          <div className="border border-slate-200 rounded-lg p-8 text-center bg-slate-50/50">
            <p className="text-sm font-semibold text-slate-800">Nenhum registro oficial localizado</p>
            <p className="text-xs text-slate-500 mt-1 max-w-lg mx-auto">
              A varredura nas bases oficiais federais e serventias públicas não retornou ocorrências para o documento informado. Conforme a política comercial da Renacred, o custo desta consulta é rigorosamente R$ 0,00.
            </p>
          </div>
        ) : (
          renderConteudoProduto(produto.code, dados, identifier)
        )}
      </div>

      {/* Rodapé de Fé Pública */}
      <div className="pt-4 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between text-[11px] text-slate-400 gap-2">
        <p>
          Certidão emitida eletronicamente pela Renacred Tecnologia com fé pública a partir de fontes oficiais e cartorárias.
        </p>
        <p className="font-mono text-slate-500">
          Código de Validação: {hash}
        </p>
      </div>
    </div>
  );
};

/**
 * Renderizador de seções específicas conforme o produto
 */
function renderConteudoProduto(code: string, dados: any, identifier: string) {
  if (!dados) return null;

  switch (code.toUpperCase()) {
    // E1: Histórico Imobiliário & Cartórios (DOI)
    case 'E1': {
      const declaracoes = dados.declaracoes || [];
      return (
        <div className="space-y-4">
          <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5 text-xs">
              <span className="font-bold text-slate-800 font-mono text-sm uppercase">Documento: {formatDocumento(identifier)}</span>
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                {declaracoes.length} {declaracoes.length === 1 ? 'declaração encontrada' : 'declarações encontradas'}
              </span>
              {dados.periodo && (
                <span className="text-slate-500 font-medium">• Período: {dados.periodo}</span>
              )}
            </div>
            {declaracoes.length > 0 && (
              <div className="flex items-center space-x-2 print:hidden">
                <ExportExcelButton documento={identifier} declaracoes={declaracoes} />
                <ExportPdfButton
                  documento={identifier}
                  totalDeclaracoes={declaracoes.length}
                  periodo={dados.periodo}
                  declaracoes={declaracoes}
                />
              </div>
            )}
          </div>

          <div className="space-y-3">
            {declaracoes.map((dec: any, idx: number) => (
              <DeclaracaoCard key={idx} declaracao={dec} index={idx} />
            ))}
          </div>
        </div>
      );
    }

    // E2: Histórico de Proprietários Veiculares
    case 'E2': {
      const historicoComPosse = processarHistoricoProprietarios(dados.historico || []);
      const titularVigente = historicoComPosse.find((h) => h.atual) || historicoComPosse[historicoComPosse.length - 1];
      const proprietarioAtual = titularVigente || dados.proprietario_atual ? {
        ...(titularVigente || {}),
        ...(dados.proprietario_atual || {}),
        tempoPosse: titularVigente?.tempoPosse || dados.proprietario_atual?.tempoPosse || '',
        data: titularVigente?.data || dados.proprietario_atual?.data || '',
      } : null;
      const tempoPosseAtual = proprietarioAtual?.tempoPosse || '';

      return (
        <div className="space-y-5">
          {/* Barra de Ações & Resumo Veicular */}
          <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <span className="font-bold text-slate-800 font-mono text-sm uppercase">Placa: {dados.placa || identifier}</span>
              {dados.renavam && (
                <span className="font-mono text-slate-500">• Renavam: <strong className="text-slate-800">{dados.renavam}</strong></span>
              )}
              <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                {historicoComPosse.length} {historicoComPosse.length === 1 ? 'registro dominial' : 'registros dominiais'}
              </span>
            </div>

            {historicoComPosse.length > 0 && (
              <div className="flex items-center space-x-2 print:hidden">
                <ExportExcelVeicularButton
                  placa={dados.placa || identifier}
                  renavam={dados.renavam}
                  historico={historicoComPosse}
                />
                <ExportPdfVeicularButton
                  placa={dados.placa || identifier}
                  renavam={dados.renavam}
                  total={historicoComPosse.length}
                  proprietarioAtual={proprietarioAtual}
                  historico={historicoComPosse}
                />
              </div>
            )}
          </div>

          {/* Card Executivo de Destaque: Proprietário Atual Vigente */}
          {proprietarioAtual && (
            <div className="bg-gradient-to-br from-emerald-50/50 via-white to-white border border-emerald-200 rounded-2xl p-5 sm:p-6 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-4 border-b border-emerald-100">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-700 text-white shadow-2xs">
                    PROPRIETÁRIO ATUAL VIGENTE
                  </span>
                  <span className="text-xs text-emerald-900/70 font-medium">Titular Ativo do Veículo</span>
                </div>
                <span className="inline-flex items-center text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
                  Titularidade Vigente
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-[11px] text-slate-400 font-medium block">Nome do Titular Atual:</span>
                  <div className="flex items-center mt-1">
                    <User className="w-4 h-4 mr-1.5 text-emerald-700 shrink-0" />
                    <span className="font-extrabold text-slate-900 text-base truncate">
                      {proprietarioAtual.nome || 'NÃO INFORMADO'}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-[11px] text-slate-400 font-medium block">Documento Identificador:</span>
                  <div className="flex items-center gap-2 mt-1 font-mono">
                    <span className="font-bold text-slate-800 text-sm">
                      {formatDocumento(proprietarioAtual.documento || '')}
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-sans font-medium bg-slate-100 text-slate-600">
                      {proprietarioAtual.tipo || 'Pessoa'}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-[11px] text-slate-400 font-medium block">Tempo de Posse Vigente:</span>
                  <div className="flex items-center gap-1.5 mt-1 font-mono">
                    <Clock className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="font-bold text-emerald-800 text-sm">
                      {tempoPosseAtual || 'Posse Ativa'}
                    </span>
                  </div>
                  {proprietarioAtual.data && (
                    <span className="text-[10px] text-slate-500 font-mono block mt-0.5">
                      Desde {proprietarioAtual.data} {proprietarioAtual.hora ? `às ${proprietarioAtual.hora}` : ''}
                    </span>
                  )}
                </div>

                <div className="sm:col-span-2 lg:col-span-3 pt-3 border-t border-emerald-100 flex flex-wrap items-center justify-between text-slate-600 text-xs gap-2">
                  <div className="flex items-center">
                    <MapPin className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                    <span className="font-semibold text-slate-800">
                      {proprietarioAtual.municipio || 'MUNICÍPIO NÃO INFORMADO'}
                    </span>
                    {proprietarioAtual.uf && <span className="ml-1 font-bold text-slate-500">/ {proprietarioAtual.uf}</span>}
                  </div>
                  {proprietarioAtual.evento && (
                    <span className="text-slate-500 font-mono text-[11px]">
                      Último Evento: {proprietarioAtual.evento}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Linha do Tempo / Timeline Cronológica Ascendente */}
          {historicoComPosse.length === 0 ? (
            <div className="border border-slate-200 rounded-xl p-8 text-center text-slate-500 bg-slate-50">
              <p className="text-sm font-semibold text-slate-800">Nenhum histórico de transferências localizado</p>
              <p className="text-xs text-slate-500 mt-1">
                Não constam registros de transferências de propriedade para esta placa na base oficial.
              </p>
            </div>
          ) : (
            <div className="border border-slate-200/90 rounded-2xl p-5 sm:p-6 bg-white space-y-5 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Cadeia Dominial Cronológica ({historicoComPosse.length} registros)
                  </h3>
                </div>
                <span className="text-[11px] text-slate-500 font-medium">
                  Ordenado da 1ª aquisição registrada até o proprietário vigente
                </span>
              </div>

              <div className="pt-2">
                {historicoComPosse.map((item, idx) => (
                  <ProprietarioTimelineCard
                    key={idx}
                    item={item}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      );
    }

    // E3: Frota Veicular
    case 'E3': {
      const veiculos = dados.veiculos || [];
      const aviso = dados.aviso;
      const orientacao = dados.orientacao;

      return (
        <div className="space-y-4">
          {aviso && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-xs text-amber-900 space-y-2">
              <div className="flex items-center space-x-2 font-bold text-sm text-amber-950">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>{aviso}</span>
              </div>
              <p className="text-amber-800 text-xs leading-relaxed">
                {orientacao || 'A empresa pesquisada possui frota de grande porte que excede o limite máximo para retorno em lote desta consulta.'}
              </p>
              <div className="pt-2 border-t border-amber-200/60 flex flex-wrap items-center justify-between gap-2 text-[11px] text-amber-800">
                <span>Orientação: Para auditar os veículos, realize a consulta individual informando a placa ou chassi no Catálogo de Produtos.</span>
                <span className="font-semibold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded border border-emerald-300">
                  Custo Debitado: R$ 0,00
                </span>
              </div>
            </div>
          )}

          {veiculos.length > 0 && (
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 font-semibold text-xs text-slate-800">
                Veículos Vinculados ao Documento ({veiculos.length})
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left text-slate-700">
                  <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-2.5">Placa</th>
                      <th className="px-4 py-2.5">Marca / Modelo</th>
                      <th className="px-4 py-2.5">Chassi</th>
                      <th className="px-4 py-2.5">Cor</th>
                      <th className="px-4 py-2.5">Ano</th>
                      <th className="px-4 py-2.5">UF</th>
                      <th className="px-4 py-2.5">Situação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {veiculos.map((v: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50/60">
                        <td className="px-4 py-2 font-bold text-slate-900">{v.placa}</td>
                        <td className="px-4 py-2 font-sans font-medium text-slate-800">{v.marca_modelo}</td>
                        <td className="px-4 py-2 text-slate-600">{v.chassi}</td>
                        <td className="px-4 py-2 font-sans text-slate-600">{v.cor}</td>
                        <td className="px-4 py-2 text-slate-600">{v.ano_fabricacao}</td>
                        <td className="px-4 py-2 text-slate-600">{v.uf}</td>
                        <td className="px-4 py-2">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            {v.situacao || 'Regular'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      );
    }

    // E4: Endereço do Proprietário
    case 'E4': {
      const prop = dados.proprietario || {};
      const end = dados.endereco || prop.endereco || prop;
      const veic = dados.veiculo || {};
      const logradouroCompleto = [
        end.logradouro,
        end.numero ? `Nº ${end.numero}` : null,
        end.complemento
      ].filter(Boolean).join(', ');

      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50 space-y-2">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Dados do Proprietário</h4>
            <div className="text-xs space-y-1.5">
              <p><span className="text-slate-400 font-medium">Nome:</span> <span className="font-semibold text-slate-900">{prop.nome || '-'}</span></p>
              <p><span className="text-slate-400 font-medium">Documento:</span> <span className="font-mono text-slate-800">{formatDocumento(prop.documento || '')}</span></p>
              {prop.tipo_documento && <p><span className="text-slate-400 font-medium">Tipo Doc:</span> <span className="text-slate-700">{prop.tipo_documento}</span></p>}
              <p><span className="text-slate-400 font-medium">Logradouro:</span> <span className="text-slate-800 font-medium">{logradouroCompleto || '-'}</span></p>
              <p><span className="text-slate-400 font-medium">Bairro:</span> <span className="text-slate-800">{end.bairro || '-'}</span></p>
              <p><span className="text-slate-400 font-medium">Município / UF:</span> <span className="font-semibold text-slate-900">{end.municipio || '-'}{end.uf && !end.municipio?.includes(end.uf) ? ` / ${end.uf}` : ''}</span></p>
              <p><span className="text-slate-400 font-medium">CEP:</span> <span className="font-mono text-slate-800">{end.cep || '-'}</span></p>
              {prop.origem_endereco && <p><span className="text-slate-400 font-medium">Origem do Endereço:</span> <span className="text-slate-600">{prop.origem_endereco}</span></p>}
              {prop.data_atualizacao_endereco && (
                <p>
                  <span className="text-slate-400 font-medium">Atualização:</span>{' '}
                  <span className="text-slate-700 font-mono font-medium">{formatDateBR(prop.data_atualizacao_endereco)}</span>
                </p>
              )}
            </div>
          </div>
          <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50 space-y-2">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Dados do Veículo</h4>
            <div className="text-xs space-y-1.5">
              <p><span className="text-slate-400 font-medium">Placa:</span> <span className="font-mono font-bold text-slate-900">{dados.placa}</span></p>
              <p><span className="text-slate-400 font-medium">Renavam:</span> <span className="font-mono text-slate-800">{dados.renavam || '-'}</span></p>
              <p><span className="text-slate-400 font-medium">Chassi:</span> <span className="font-mono text-slate-800">{veic.chassi || '-'}</span></p>
              <p><span className="text-slate-400 font-medium">Marca / Modelo:</span> <span className="text-slate-800">{veic.marca_modelo || '-'}</span></p>
              <p><span className="text-slate-400 font-medium">Ano Fabricação:</span> <span className="font-mono text-slate-800">{veic.ano_fabricacao || '-'}</span></p>
              {veic.uf_jurisdicao && <p><span className="text-slate-400 font-medium">Jurisdição:</span> <span className="text-slate-800">{veic.uf_jurisdicao}</span></p>}
            </div>
          </div>
        </div>
      );
    }

    // E5: Histórico de Roubo e Furto
    case 'E5': {
      const ocorrencias = dados.ocorrencias || [];
      return (
        <div className="space-y-4">
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-semibold text-slate-800">
                Ocorrências Policiais Registradas ({ocorrencias.length})
              </span>
              <div className="flex items-center space-x-3 font-mono text-slate-600 text-[11px]">
                {dados.placa && <span>Placa: <strong className="text-slate-900">{dados.placa}</strong></span>}
                {dados.chassi && <span>Chassi: <strong className="text-slate-900">{dados.chassi}</strong></span>}
              </div>
            </div>
            <div className="divide-y divide-slate-100 p-4 space-y-3">
              {ocorrencias.map((o: any, idx: number) => {
                const isRecuperado = (o.tipo || '').toLowerCase().includes('recupera') || (o.tipo || '').toLowerCase().includes('devolu');
                return (
                  <div
                    key={idx}
                    className={`border rounded-lg p-3.5 space-y-1.5 ${
                      isRecuperado ? 'bg-emerald-50/40 border-emerald-200/80' : 'bg-rose-50/50 border-rose-200/80'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-bold border ${
                          isRecuperado
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                            : 'bg-rose-100 text-rose-800 border-rose-200'
                        }`}
                      >
                        {o.tipo}
                      </span>
                      <span className="text-xs font-mono text-slate-500">
                        {o.data ? formatDateBR(o.data) : (o.ano ? `Ano ${o.ano}` : '-')}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs pt-1">
                      <p>
                        <span className="text-slate-500 font-medium">Boletim:</span>{' '}
                        <span className="font-mono font-bold text-slate-900">{o.numero_boletim || '-'}</span>
                      </p>
                      <p>
                        <span className="text-slate-500 font-medium">Localidade:</span>{' '}
                        <span className="font-semibold text-slate-900">
                          {o.municipio ? `${o.municipio} / ${o.uf}` : (o.uf ? `UF: ${o.uf}` : '-')}
                        </span>
                      </p>
                      <p>
                        <span className="text-slate-500 font-medium">Órgão de Segurança:</span>{' '}
                        <span className="text-slate-700">{o.orgao_seguranca || '-'}</span>
                      </p>
                    </div>
                    {o.descricao && (
                      <p className="text-[11px] text-slate-600 bg-white/60 p-2 rounded border border-slate-200/60">
                        {o.descricao}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      );
    }

    // E6: CNH com Imagem Oficial (Senatran)
    case 'E6': {
      const isVencida = !!dados.validade_vencida;
      const temRetencao = !!dados.possui_retencao;

      return (
        <div className="border border-slate-200 rounded-xl p-5 sm:p-6 space-y-5 bg-white shadow-xs">
          <div className="flex flex-col md:flex-row items-start gap-6">
            {/* Foto Oficial Biométrica da CNH */}
            {dados.foto_base64 && (
              <div className="shrink-0 flex flex-col items-center">
                <div className="w-32 h-44 bg-white border-2 border-slate-300 rounded-lg overflow-hidden shadow-xs flex items-center justify-center p-1">
                  <img
                    src={dados.foto_base64.startsWith('data:') ? dados.foto_base64 : `data:image/jpeg;base64,${dados.foto_base64}`}
                    alt="Espelho Fotográfico CNH"
                    className="w-full h-full object-cover rounded"
                  />
                </div>
                <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full mt-2">
                  Biometria Oficial Senatran
                </span>
              </div>
            )}

            {/* Grid de Dados do Condutor */}
            <div className="flex-1 space-y-4 w-full">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 text-xs">
                <div>
                  <span className="text-[11px] text-slate-400 font-medium block">Nome do Condutor:</span>
                  <span className="font-bold text-slate-900 text-sm block mt-0.5">{String(dados.nome || '-')}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 font-medium block">CPF:</span>
                  <span className="font-mono text-slate-800 font-semibold block mt-0.5">{formatDocumento(String(dados.cpf || ''))}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 font-medium block">Número do Registro:</span>
                  <span className="font-mono font-bold text-slate-900 block mt-0.5">{String(dados.numero_registro || '-')}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 font-medium block">Formulário Renach:</span>
                  <span className="font-mono text-slate-700 block mt-0.5">{String(dados.renach || '-')}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 font-medium block">Categoria Habilitação:</span>
                  <span className="font-mono font-bold text-blue-900 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded inline-block mt-0.5">
                    {String(dados.categoria || '-')}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 font-medium block">UF de Emissão:</span>
                  <span className="font-mono font-bold text-slate-800 block mt-0.5">{String(dados.uf || '-')}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 font-medium block">Data de Emissão:</span>
                  <span className="font-mono text-slate-700 block mt-0.5">{formatDateBR(String(dados.data_emissao || ''))}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 font-medium block">Data de Validade:</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="font-mono font-bold text-slate-900">{formatDateBR(String(dados.data_validade || ''))}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${isVencida ? 'bg-rose-50 text-rose-800 border-rose-200' : 'bg-emerald-50 text-emerald-800 border-emerald-200'}`}>
                      {isVencida ? 'Vencida' : 'Regular'}
                    </span>
                  </div>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 font-medium block">Filiação Materna:</span>
                  <span className="text-slate-800 font-medium block mt-0.5">{String(dados.nome_mae || '-')}</span>
                </div>
              </div>

              {/* Status e Observações */}
              <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[11px] text-slate-400 font-medium block">Retenção Administrativa:</span>
                  <span className={`font-semibold ${temRetencao ? 'text-rose-700' : 'text-slate-700'}`}>
                    {temRetencao ? 'Consta Retenção Administrativa' : 'Não consta retenção'}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 font-medium block">Cursos Especializados:</span>
                  <span className="text-slate-600 text-[11.5px]">
                    {typeof dados.cursos_especiais === 'string' ? dados.cursos_especiais : (Array.isArray(dados.cursos_especiais) && dados.cursos_especiais.length > 0 ? dados.cursos_especiais.join(', ') : 'Não consta realização de cursos especiais.')}
                  </span>
                </div>
              </div>

              {dados.observacoes && (
                <div className="pt-2 text-xs">
                  <span className="text-[11px] text-slate-400 font-medium block">Observações do Condutor:</span>
                  <p className="text-slate-700 bg-slate-50 p-2 rounded border border-slate-200 mt-1">{String(dados.observacoes)}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    // E7: CNH sem Imagem (Dados Cadastrais Oficiais)
    case 'E7': {
      const rawEnd = dados.endereco || dados.address || {};
      const endLogradouro = rawEnd.logradouro || rawEnd.street || dados.street || dados.logradouro;
      const endNumero = rawEnd.numero || rawEnd.number || dados.number || dados.numero || dados.numero_endereco;
      const endComplemento = rawEnd.complemento || rawEnd.complement || dados.complement || dados.complemento;
      const endBairro = rawEnd.bairro || rawEnd.neighborhood || dados.neighborhood || dados.bairro;
      const endMunicipio = rawEnd.municipio || rawEnd.city || dados.city || dados.municipio;
      const endUf = rawEnd.uf || rawEnd.state || dados.state || dados.uf_endereco;
      const endCep = rawEnd.cep || rawEnd.postalCode || dados.postalCode || dados.cep;

      const hasEndereco = !!(endLogradouro || endBairro || endMunicipio || endCep || endNumero);

      return (
        <div className="space-y-4">
          <div className="border border-slate-200 rounded-xl p-5 sm:p-6 space-y-4 bg-white shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Prontuário de Habilitação & Dados Civis
              </span>
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-800 border border-blue-200">
                Base Nacional de Condutores
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 text-xs">
              <div>
                <span className="text-[11px] text-slate-400 font-medium block">Nome Completo:</span>
                <span className="font-bold text-slate-900 text-sm block mt-0.5">
                  {String(dados.nome || dados.condutor?.nome || '-')}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 font-medium block">CPF:</span>
                <span className="font-mono text-slate-800 font-semibold block mt-0.5">
                  {formatDocumento(String(dados.cpf || dados.documento?.cpf || dados.numero || identifier || ''))}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 font-medium block">Registro CNH:</span>
                <span className="font-mono font-bold text-slate-900 block mt-0.5">
                  {String(dados.numero_registro || dados.condutor?.num_registro || dados.cnh?.number || dados.cnh?.num_cnh || '-')}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 font-medium block">Renach:</span>
                <span className="font-mono text-slate-700 block mt-0.5">
                  {String(dados.renach || dados.num_renach || dados.condutor?.num_renach || '-')}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 font-medium block">Categoria:</span>
                <span className="font-mono font-bold text-blue-900 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded inline-block mt-0.5">
                  {String(dados.categoria || dados.cnh?.categoria || dados.cnh?.category || '-')}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 font-medium block">Data de Validade:</span>
                <span className="font-mono font-bold text-slate-900 block mt-0.5">
                  {formatDateBR(dados.data_validade || dados.cnh?.validade_iso || dados.cnh?.dueDate || dados.cnh?.validade || '')}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 font-medium block">Data de Nascimento:</span>
                <span className="font-mono text-slate-700 block mt-0.5">
                  {formatDateBR(dados.data_nascimento || dados.data_nascimento_iso || dados.condutor?.data_nascimento_iso || dados.condutor?.data_nascimento || dados.birthday || '')}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 font-medium block">Sexo:</span>
                <span className="text-slate-800 block mt-0.5">
                  {String(dados.sexo || dados.cod_sexo_descricao || dados.condutor?.cod_sexo_descricao || dados.gender || '-')}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 font-medium block">Município / UF Nascimento:</span>
                <span className="text-slate-800 font-medium block mt-0.5">
                  {dados.cidade_nascimento || dados.endereco?.cod_municipio_descricao
                    ? `${dados.cidade_nascimento || dados.endereco?.cod_municipio_descricao}${dados.uf ? ` - ${dados.uf}` : ''}`
                    : String(dados.uf || dados.condutor?.uf || '-')}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 font-medium block">Nome da Mãe:</span>
                <span className="text-slate-800 font-medium block mt-0.5">
                  {String(dados.nome_mae || dados.condutor?.nome_mae || dados.mother || '-')}
                </span>
              </div>
              {(dados.nome_pai || dados.condutor?.nome_pai) && (
                <div>
                  <span className="text-[11px] text-slate-400 font-medium block">Nome do Pai:</span>
                  <span className="text-slate-800 font-medium block mt-0.5">
                    {String(dados.nome_pai || dados.condutor?.nome_pai)}
                  </span>
                </div>
              )}
              {(dados.rg_numero || dados.documento?.numero) && (
                <div>
                  <span className="text-[11px] text-slate-400 font-medium block">Registro Geral (RG):</span>
                  <span className="font-mono text-slate-800 font-semibold block mt-0.5">
                    {String(dados.rg_numero || dados.documento?.numero)} {(dados.rg_orgao || dados.documento?.orgao_expedidor) ? `(${dados.rg_orgao || dados.documento?.orgao_expedidor}/${dados.rg_uf || dados.documento?.uf || ''})` : ''}
                  </span>
                </div>
              )}
              {typeof dados.pontos_cnh === 'number' && (
                <div>
                  <span className="text-[11px] text-slate-400 font-medium block">Pontos na CNH:</span>
                  <span className={`font-mono font-bold block mt-0.5 ${dados.pontos_cnh > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                    {dados.pontos_cnh} {dados.pontos_cnh === 1 ? 'ponto' : 'pontos'}
                  </span>
                </div>
              )}
            </div>

            {dados.impedimento && (
              <div className="pt-2 text-xs">
                <span className="text-rose-700 font-semibold">Impedimento: {String(dados.impedimento)}</span>
              </div>
            )}
          </div>

          {/* Card de Endereço Residencial / Cadastral do Condutor */}
          {hasEndereco && (
            <div className="border border-slate-200 rounded-xl p-5 sm:p-6 space-y-4 bg-white shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center space-x-2">
                  <MapPin className="w-4 h-4 text-slate-700" />
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Endereço Cadastral do Condutor
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  Registro Nacional RENACH
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 text-xs">
                <div className="lg:col-span-2">
                  <span className="text-[11px] text-slate-400 font-medium block">Logradouro / Rua:</span>
                  <span className="font-bold text-slate-900 text-sm block mt-0.5">
                    {String(endLogradouro || '-')}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 font-medium block">Número:</span>
                  <span className="font-mono font-bold text-slate-900 block mt-0.5">
                    {String(endNumero || 'S/N')}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 font-medium block">Complemento:</span>
                  <span className="text-slate-800 font-medium block mt-0.5">
                    {String(endComplemento || '-')}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 font-medium block">Bairro:</span>
                  <span className="font-semibold text-slate-900 block mt-0.5">
                    {String(endBairro || '-')}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 font-medium block">Município / UF:</span>
                  <span className="font-semibold text-slate-900 block mt-0.5">
                    {String(endMunicipio || '-')} {endUf ? `/ ${endUf}` : ''}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 font-medium block">CEP:</span>
                  <span className="font-mono font-bold text-slate-900 block mt-0.5">
                    {formatCEP(endCep)}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 font-medium block">País / Jurisdição:</span>
                  <span className="text-slate-800 font-medium block mt-0.5">
                    Brasil (BR)
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }

    // E8: RENAINF Multas
    case 'E8': {
      const multas = dados.multas || [];
      return (
        <div className="border border-slate-200 rounded-xl overflow-hidden space-y-0 bg-white shadow-xs">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center space-x-2">
              <span className="text-slate-500 font-medium">Total de Infrações:</span>
              <span className="font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200 font-mono">
                {dados.total_multas || multas.length}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-4 font-mono text-xs">
              <span>
                Valor Total: <strong className="text-slate-900">R$ {dados.valor_total || '0,00'}</strong>
              </span>
              <span>
                Exigível: <strong className={dados.valor_total_exigivel && dados.valor_total_exigivel !== '0.00' && dados.valor_total_exigivel !== '0,00' ? 'text-rose-700 font-bold' : 'text-slate-700'}>R$ {dados.valor_total_exigivel || '0,00'}</strong>
              </span>
              {dados.valor_total_nao_exigivel && (
                <span className="text-slate-500">
                  Não Exigível: <strong>R$ {dados.valor_total_nao_exigivel}</strong>
                </span>
              )}
            </div>
          </div>

          {multas.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              Nenhuma infração ou multa nacional ativa vinculada a este veículo na base RENAINF.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left text-slate-700">
                <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200 uppercase text-[11px] tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Auto de Infração</th>
                    <th className="px-4 py-3">Data / Hora</th>
                    <th className="px-4 py-3">Órgão Autuador</th>
                    <th className="px-4 py-3">Descrição da Infração</th>
                    <th className="px-4 py-3 text-right">Valor (R$)</th>
                    <th className="px-4 py-3 text-center">Situação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {multas.map((m: any, idx: number) => {
                    const isExigivel = (m.situacao || '').toLowerCase().includes('exigível') && !(m.situacao || '').toLowerCase().includes('não');
                    const formattedValor = typeof m.valor === 'number'
                      ? m.valor.toFixed(2).replace('.', ',')
                      : (Number(m.valor) ? Number(m.valor).toFixed(2).replace('.', ',') : (m.valor || '0,00'));

                    return (
                      <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-slate-900 align-top">
                          <div>{m.auto_infracao || '-'}</div>
                          {m.codigo_infracao && (
                            <div className="text-[10px] text-slate-400 font-sans font-normal mt-0.5">
                              Enquadramento: {m.codigo_infracao}
                            </div>
                          )}
                          {m.artigo_ctb && (
                            <div className="text-[10px] text-blue-800 font-sans font-medium mt-0.5">
                              {m.artigo_ctb}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-700 align-top whitespace-nowrap">
                          <div className="font-semibold">{formatDateBR(m.data_infracao)}</div>
                          {m.hora_infracao && (
                            <div className="text-[10px] text-slate-400 font-normal">{m.hora_infracao}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 font-sans text-slate-700 align-top">
                          <span className="font-semibold text-slate-800 block">
                            {m.orgao_autuador || '-'}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-sans text-slate-800 align-top max-w-xs">
                          <p className="leading-snug">
                            {m.descricao_infracao || '-'}
                          </p>
                          {m.local && (
                            <p className="text-[10px] text-slate-400 mt-1">
                              Local: {m.local}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono font-bold text-slate-900 text-right align-top whitespace-nowrap">
                          R$ {formattedValor}
                        </td>
                        <td className="px-4 py-3 text-center align-top whitespace-nowrap">
                          <div className="inline-flex flex-col items-center gap-1">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                isExigivel
                                  ? 'bg-rose-50 text-rose-800 border-rose-200'
                                  : 'bg-slate-100 text-slate-700 border-slate-200'
                              }`}
                            >
                              {m.situacao || 'Autuada'}
                            </span>
                            {m.gravidade && (
                              <span className="text-[10px] text-slate-500 font-sans font-medium">
                                {m.gravidade} {m.pontos ? `• ${m.pontos}` : ''}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      );
    }

    // E9: RENAJUD
    case 'E9': {
      const processos = dados.processos || [];
      return (
        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between font-semibold text-xs text-slate-800">
            <span>Processos e Ordens Judiciais ({processos.length})</span>
            <span className="font-mono text-slate-500">Placa: {dados.placa || identifier}</span>
          </div>
          <div className="divide-y divide-slate-100 p-4 space-y-3">
            {processos.map((p: any, idx: number) => (
              <div key={idx} className="bg-purple-50/40 border border-purple-200 rounded-xl p-4 space-y-3 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-purple-200/70">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 block">
                      Número do Processo
                    </span>
                    <span className="font-mono font-extrabold text-purple-950 text-base block mt-0.5 select-all">
                      {p.numero_processo || '-'}
                    </span>
                  </div>
                  <span className="px-2.5 py-1 rounded text-xs font-bold bg-purple-100 text-purple-900 border border-purple-300 shadow-2xs">
                    {p.tipo_restricao || 'Bloqueio Judicial'}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-slate-700">
                  <div>
                    <span className="text-slate-400 font-medium block">Tribunal:</span>
                    <span className="font-bold text-slate-900 mt-0.5 block">{p.tribunal || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block">Órgão Judiciário:</span>
                    <span className="font-semibold text-slate-900 mt-0.5 block">{p.orgao_judiciario || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block">Data de Inclusão:</span>
                    <span className="font-mono text-slate-800 mt-0.5 block">{formatDateBR(p.data_inclusao) || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block">Situação do Registro:</span>
                    <span className="font-semibold text-purple-800 mt-0.5 block">{p.situacao || 'Ativa'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // E10: Comunicação de Venda
    case 'E10': {
      const comunicados = dados.comunicados || [];
      const propCRV = dados.proprietario_crv;

      return (
        <div className="border border-slate-200 rounded-xl overflow-hidden space-y-4 bg-white shadow-xs p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                Comunicação Oficial de Venda Veicular
              </span>
              <span className="text-[11px] text-slate-400">
                Registro de transferência de posse civil perante serventias e órgãos de trânsito
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="font-mono text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded">
                Placa: {dados.placa || identifier}
              </span>
              {dados.renavam && (
                <span className="font-mono text-xs text-slate-600 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded">
                  Renavam: {dados.renavam}
                </span>
              )}
            </div>
          </div>

          {/* Dados do Proprietário no CRV (Vendedor) */}
          {propCRV && propCRV.documento && (
            <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  Proprietário Registrado no CRV (Vendedor)
                </span>
                <span className="text-[10px] font-semibold text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded">
                  {sanitizeTipoDoc(propCRV.tipo_documento)}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 font-medium block">Documento do Titular CRV:</span>
                  <span className="font-mono font-bold text-slate-900 text-sm mt-0.5 block">
                    {formatDocumento(propCRV.documento)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">Nome / Razão Social:</span>
                  <span className="font-bold text-slate-900 text-sm mt-0.5 block">
                    {propCRV.nome || dados.proprietario_nome || dados.vendedor_nome || '-'}
                  </span>
                </div>
                {propCRV.numero_crv && (
                  <div>
                    <span className="text-slate-400 font-medium block">Número do CRV:</span>
                    <span className="font-mono text-slate-800 mt-0.5 block">{propCRV.numero_crv}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Lista de Comunicações de Venda (Adquirentes) */}
          {comunicados.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 bg-slate-50/50 rounded-xl border border-slate-200">
              Nenhuma comunicação de venda registrada para este veículo na base oficial.
            </div>
          ) : (
            <div className="space-y-4">
              {comunicados.map((c: any, idx: number) => {
                const logradouroCompleto = [
                  c.logradouro_comprador,
                  c.numero_imovel_comprador ? `Nº ${c.numero_imovel_comprador}` : null,
                  c.complemento_imovel_comprador
                ].filter(Boolean).join(', ');

                return (
                  <div key={idx} className="border border-blue-200/80 bg-blue-50/30 rounded-xl p-4 sm:p-5 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-blue-100">
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-600 text-white uppercase tracking-wider">
                          Comunicado {idx + 1} de {comunicados.length}
                        </span>
                        <span className="text-xs font-bold text-blue-950">
                          {c.nome_comprador || 'Comprador Adquirente'}
                        </span>
                      </div>
                      <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        {c.situacao || 'Ativo'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      {/* Bloco 1: Dados do Comprador */}
                      <div className="space-y-2 bg-white/80 p-3.5 rounded-lg border border-blue-100">
                        <span className="text-[10px] font-bold text-blue-900 uppercase tracking-wider block">
                          Dados do Comprador / Adquirente
                        </span>
                        <p>
                          <span className="text-slate-400 font-medium">Nome / Razão Social:</span>{' '}
                          <strong className="text-slate-900 block mt-0.5">{c.nome_comprador || '-'}</strong>
                        </p>
                        <p>
                          <span className="text-slate-400 font-medium">Documento:</span>{' '}
                          <strong className="font-mono text-slate-800 block mt-0.5">
                            {formatDocumento(c.documento_comprador || '')}
                            {c.tipo_documento_comprador && (
                              <span className="ml-1.5 text-[10px] font-sans font-medium text-slate-500">
                                ({sanitizeTipoDoc(c.tipo_documento_comprador)})
                              </span>
                            )}
                          </strong>
                        </p>
                        <p>
                          <span className="text-slate-400 font-medium">Logradouro:</span>{' '}
                          <span className="text-slate-800 font-medium block mt-0.5">{logradouroCompleto || '-'}</span>
                        </p>
                        <p>
                          <span className="text-slate-400 font-medium">Bairro:</span>{' '}
                          <span className="text-slate-800 block mt-0.5">{c.bairro_imovel_comprador || '-'}</span>
                        </p>
                        <p>
                          <span className="text-slate-400 font-medium">Município / UF:</span>{' '}
                          <span className="font-semibold text-slate-900 block mt-0.5">
                            {c.municipio_comprador || '-'}{c.uf_comprador && !c.municipio_comprador?.includes(c.uf_comprador) ? ` / ${c.uf_comprador}` : ''}
                          </span>
                        </p>
                        <p>
                          <span className="text-slate-400 font-medium">CEP:</span>{' '}
                          <span className="font-mono text-slate-800 font-semibold block mt-0.5">{formatCEP(c.cep_comprador)}</span>
                        </p>
                      </div>

                      {/* Bloco 2: Dados da Transação de Venda */}
                      <div className="space-y-2 bg-white/80 p-3.5 rounded-lg border border-blue-100">
                        <span className="text-[10px] font-bold text-blue-900 uppercase tracking-wider block">
                          Dados da Venda & Cartório
                        </span>
                        <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-lg">
                          <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider block">
                            Data Efetiva da Venda
                          </span>
                          <span className="font-mono font-extrabold text-blue-950 text-base block mt-0.5">
                            {formatDateBR(c.data_venda) || '-'}
                          </span>
                        </div>
                        <p>
                          <span className="text-slate-400 font-medium">Local da Venda:</span>{' '}
                          <span className="font-semibold text-slate-800 block mt-0.5">{c.local_venda || '-'}</span>
                        </p>
                        {c.data_registro && (
                          <p>
                            <span className="text-slate-400 font-medium">Data do Registro:</span>{' '}
                            <span className="font-mono text-slate-700 block mt-0.5">{formatDateBR(c.data_registro)}</span>
                          </p>
                        )}
                        {c.numero_protocolo && (
                          <p>
                            <span className="text-slate-400 font-medium">Protocolo do Registro:</span>{' '}
                            <span className="font-mono text-slate-700 block mt-0.5">{c.numero_protocolo}</span>
                          </p>
                        )}
                        <p>
                          <span className="text-slate-400 font-medium">Status do Comunicado:</span>{' '}
                          <span className="font-semibold text-emerald-700 block mt-0.5">{c.situacao || 'Ativo'}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      );
    }

    // E11: Parentes
    case 'E11': {
      const parentes = dados.parentes || [];
      const cpfPesquisado = dados.cpf_pesquisado || identifier;
      const nomePesquisado = dados.nome_pesquisado;

      return (
        <div className="space-y-4">
          {/* Card de Identificação do Pesquisado */}
          <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold shrink-0 border border-teal-200">
                <User className="w-5 h-5 text-teal-700" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Titular Auditado (Alvo dos Vínculos)
                </span>
                <div className="flex flex-wrap items-center gap-2 mt-0.5">
                  <span className="font-mono font-extrabold text-slate-900 text-sm">
                    {formatCPF(cpfPesquisado)}
                  </span>
                  {nomePesquisado && (
                    <span className="text-xs font-bold text-slate-700">
                      • {nomePesquisado}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-1 rounded text-xs font-bold bg-teal-50 text-teal-800 border border-teal-200">
                {parentes.length} {parentes.length === 1 ? 'vínculo familiar mapeado' : 'vínculos familiares mapeados'}
              </span>
            </div>
          </div>

          {/* Tabela com Colunas Separadas: Nome (Col 1), Grau de Parentesco (Col 2), CPF 11 dígitos (Col 3) */}
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-800 uppercase tracking-wider">
              Árvore de Vínculos Familiares Mapeados ({parentes.length})
            </div>

            {parentes.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                Nenhum vínculo familiar de 1º grau localizado para este documento.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left text-slate-700">
                  <thead className="bg-slate-100/80 text-slate-600 font-semibold border-b border-slate-200 text-[11px] uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3 text-left">Familiar / Parente</th>
                      <th className="px-4 py-3 text-center">Grau de Parentesco</th>
                      <th className="px-4 py-3 text-right">CPF (11 Dígitos Padronizado)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parentes.map((p: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                        {/* Coluna 1: Nome Completo */}
                        <td className="px-4 py-3 font-semibold text-slate-900">
                          {p.nome || 'NOME NÃO INFORMADO'}
                        </td>

                        {/* Coluna 2: Grau de Parentesco Separado */}
                        <td className="px-4 py-3 text-center">
                          <span className="inline-block px-2.5 py-0.5 rounded text-[11px] font-bold bg-teal-50 text-teal-800 border border-teal-200 uppercase tracking-wide">
                            {p.vinculo || 'FAMILIAR'}
                          </span>
                        </td>

                        {/* Coluna 3: CPF com 11 dígitos com zero à esquerda padronizado */}
                        <td className="px-4 py-3 text-right font-mono font-bold text-slate-800">
                          {formatCPF(p.cpf)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      );
    }

    // E12: BIN Online
    case 'E12': {
      const restricoes = Array.isArray(dados.restricoes) ? dados.restricoes : [];
      const hasRestricaoAtiva = dados.tem_restricao || restricoes.some((r: any) => r.valor && !r.valor.toUpperCase().includes('SEM RESTRICAO'));

      return (
        <div className="space-y-4">
          {/* Header Executivo da BIN */}
          <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-xs">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-mono font-bold text-slate-900 text-sm">
                Placa Padrão: {dados.placa_modelo_antigo || dados.placa || identifier}
              </span>
              {dados.placa_modelo_novo && (
                <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-blue-100 text-blue-900 border border-blue-200">
                  Mercosul: {dados.placa_modelo_novo}
                </span>
              )}
              <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                {dados.situacao_veiculo || 'Em Circulação'}
              </span>
            </div>

            {dados.data_registro_base && (
              <span className="text-[11px] text-slate-500 font-mono">
                Data Base BIN: {dados.data_registro_base}
              </span>
            )}
          </div>

          {/* Grid de Seções: Identificação do Veículo & Dados Técnicos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Bloco 1: Identificação Cadastral Oficial */}
            <div className="border border-slate-200 rounded-xl p-5 bg-white space-y-3 shadow-xs">
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Identificação do Veículo
                </span>
                <span className="text-[11px] font-mono text-slate-500">Renavam: {dados.renavam || '-'}</span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 font-medium block">Marca:</span>
                  <span className="font-bold text-slate-900 block mt-0.5">{dados.marca || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">Modelo:</span>
                  <span className="font-bold text-slate-900 block mt-0.5">{dados.modelo || dados.marca_modelo || '-'}</span>
                </div>
                {dados.submodelo && (
                  <div>
                    <span className="text-slate-400 font-medium block">Submodelo / Grupo:</span>
                    <span className="font-semibold text-slate-800 block mt-0.5">{dados.submodelo}</span>
                  </div>
                )}
                {dados.versao && (
                  <div>
                    <span className="text-slate-400 font-medium block">Versão:</span>
                    <span className="font-semibold text-slate-800 block mt-0.5">{dados.versao}</span>
                  </div>
                )}
                <div>
                  <span className="text-slate-400 font-medium block">Ano Fab / Modelo:</span>
                  <span className="font-mono font-bold text-slate-900 block mt-0.5">
                    {dados.ano_fabricacao} / {dados.ano_modelo || dados.ano_fabricacao}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">Cor Predominante:</span>
                  <span className="font-semibold text-slate-800 block mt-0.5 uppercase">{dados.cor || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">Combustível:</span>
                  <span className="font-semibold text-slate-800 block mt-0.5">{dados.combustivel || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">Município / UF Placa:</span>
                  <span className="font-semibold text-slate-900 block mt-0.5">
                    {dados.municipio ? `${dados.municipio} / ${dados.uf}` : String(dados.uf || '-')}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 text-xs">
                <span className="text-slate-400 font-medium block">Chassi:</span>
                <div className="flex items-center justify-between mt-0.5">
                  <span className="font-mono font-bold text-slate-900">{dados.chassi || '-'}</span>
                  <span className="text-[10px] text-slate-500 font-medium bg-slate-50 border border-slate-200 px-2 py-0.5 rounded">
                    Situação: {dados.situacao_chassi || 'Normal'}
                  </span>
                </div>
              </div>
            </div>

            {/* Bloco 2: Conjunto Mecânico & Engenharia */}
            <div className="border border-slate-200 rounded-xl p-5 bg-white space-y-3 shadow-xs">
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Mecânica & Conjunto Técnico
                </span>
                <span className="text-[11px] font-semibold text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  {dados.tipo_veiculo || 'Automóvel'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 font-medium block">Número do Motor:</span>
                  <span className="font-mono font-bold text-slate-900 block mt-0.5">{dados.motor || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">Número da Carroceria:</span>
                  <span className="font-mono font-semibold text-slate-800 block mt-0.5">{dados.carroceria || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">Espécie:</span>
                  <span className="font-medium text-slate-800 block mt-0.5">{dados.especie || 'Passageiro'}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">Segmento:</span>
                  <span className="font-medium text-slate-800 block mt-0.5">
                    {dados.segmento || 'Auto'} {dados.sub_segmento ? `(${dados.sub_segmento})` : ''}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">Nacionalidade:</span>
                  <span className="font-medium text-slate-800 block mt-0.5">{dados.nacionalidade || 'Nacional'}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">Tipo de Montagem:</span>
                  <span className="font-medium text-slate-800 block mt-0.5">{dados.tipo_montagem || '1 - Original'}</span>
                </div>
                {dados.caixa_cambio && (
                  <div>
                    <span className="text-slate-400 font-medium block">Caixa de Câmbio:</span>
                    <span className="font-mono text-slate-800 block mt-0.5">{dados.caixa_cambio}</span>
                  </div>
                )}
                {dados.cilindradas && (
                  <div>
                    <span className="text-slate-400 font-medium block">Cilindradas:</span>
                    <span className="font-mono text-slate-800 block mt-0.5">{dados.cilindradas} cc</span>
                  </div>
                )}
                {dados.eixos && (
                  <div>
                    <span className="text-slate-400 font-medium block">Eixos:</span>
                    <span className="font-mono text-slate-800 block mt-0.5">{dados.eixos}</span>
                  </div>
                )}
                {dados.peso_bruto_total && (
                  <div>
                    <span className="text-slate-400 font-medium block">Peso Bruto Total (PBT):</span>
                    <span className="font-mono text-slate-800 block mt-0.5">{dados.peso_bruto_total} kg</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Grid Intermediário: Proprietário Registrado & Faturamento Fiscal de Origem */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Bloco 3: Proprietário Registrado */}
            <div className="border border-slate-200 rounded-xl p-5 bg-white space-y-3 shadow-xs">
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Proprietário Registrado (BIN / DETRAN)
                </span>
                <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                  {dados.tipo_doc_prop || (dados.proprietario_documento ? (String(dados.proprietario_documento).replace(/\D/g, '').length > 11 ? 'Pessoa Jurídica' : 'Pessoa Física') : 'Cadastral')}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="sm:col-span-2">
                  <span className="text-slate-400 font-medium block">Nome do Proprietário:</span>
                  <span className="font-bold text-slate-900 block mt-0.5 uppercase tracking-tight">
                    {dados.proprietario_nome || dados.nome_proprietario || '-'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">Documento (CPF / CNPJ):</span>
                  <span className="font-mono font-bold text-slate-900 block mt-0.5">
                    {formatDocumento(dados.proprietario_documento || dados.documento_proprietario || '')}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">Data Emissão CRV:</span>
                  <span className="font-mono font-semibold text-slate-800 block mt-0.5">
                    {formatDateBR(dados.data_emissao_crv)}
                  </span>
                </div>
              </div>
            </div>

            {/* Bloco 4: Dados Fiscais e Faturamento */}
            <div className="border border-slate-200 rounded-xl p-5 bg-white space-y-3 shadow-xs">
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Faturamento & Registro Fiscal de Origem
                </span>
                <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                  Registro Fiscal
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 font-medium block">CNPJ Faturado:</span>
                  <span className="font-mono font-bold text-slate-900 block mt-0.5">
                    {formatDocumento(dados.faturado_documento || '')}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">UF Faturado:</span>
                  <span className="font-semibold text-slate-800 block mt-0.5">{dados.uf_faturado || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">Tipo Doc Faturado:</span>
                  <span className="font-medium text-slate-800 block mt-0.5">{sanitizeTipoDoc(dados.tipo_doc_faturado) || 'Jurídica'}</span>
                </div>
                {dados.di && (
                  <div>
                    <span className="text-slate-400 font-medium block">Declaração de Importação (DI):</span>
                    <span className="font-mono text-slate-800 block mt-0.5">{dados.di}</span>
                  </div>
                )}
                {dados.registro_di && (
                  <div>
                    <span className="text-slate-400 font-medium block">Registro DI:</span>
                    <span className="font-mono text-slate-800 block mt-0.5">{dados.registro_di}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bloco 5: Quadro Oficial de Restrições da BIN */}
          <div className="border border-slate-200 rounded-xl p-5 bg-white space-y-3 shadow-xs">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Quadro de Restrições (BIN)
              </span>
              <span
                className={`px-2.5 py-0.5 rounded text-xs font-bold border ${
                  hasRestricaoAtiva
                    ? 'bg-rose-50 text-rose-800 border-rose-200'
                    : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                }`}
              >
                {hasRestricaoAtiva ? 'Consta Restrição' : 'Nada Consta'}
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              {restricoes.map((r: any, idx: number) => {
                const isClean = !r.valor || r.valor.toUpperCase().includes('SEM RESTRICAO');
                return (
                  <div key={idx} className="p-3 rounded-lg border bg-slate-50/70 border-slate-200">
                    <span className="text-[10px] text-slate-400 font-medium block uppercase tracking-wider">{r.label}:</span>
                    <span className={`font-semibold block mt-1 ${isClean ? 'text-slate-700' : 'text-rose-700 font-bold'}`}>
                      {r.valor || 'SEM RESTRIÇÃO'}
                    </span>
                  </div>
                );
              })}
            </div>

            {dados.limite_restricao_trib && (
              <div className="pt-2 text-[11px] text-slate-500">
                <span>Limite Restrição Tributária: {dados.limite_restricao_trib}</span>
              </div>
            )}
          </div>
        </div>
      );
    }

    // E13 & E15: Consulta Cadastral de CPF (Nível I Básico e Nível II Completo)
    case 'E13':
    case 'E15': {
      const ident = dados.identificacao || dados;
      const docs = dados.documentos || dados;
      const fin = dados.financeiro || dados;
      const ocup = dados.ocupacao || dados;
      const cont = dados.contatos || dados;
      const jur = dados.juridico || dados;
      const seg = dados.seguranca || dados;

      const nomeCivil = ident.nome || dados.nome || '-';
      const cpfFormatado = formatCPF(ident.cpf || dados.cpf || identifier);
      const dataNasc = formatDateBR(ident.data_nascimento || dados.data_nascimento);
      const nomeMae = ident.nome_mae || dados.nome_mae || '-';
      const nomePai = ident.nome_pai || dados.nome_pai || 'NÃO DECLARADO';
      const sexoDesc = ident.sexo === 'M' || dados.sexo === 'M' ? 'MASCULINO' : (ident.sexo === 'F' || dados.sexo === 'F' ? 'FEMININO' : (ident.sexo || dados.sexo || '-'));
      const nacionalidade = ident.nacionalidade || dados.nacionalidade || 'BRASILEIRA';
      const ehEstrangeiro = ident.estrangeiro === 'True' || ident.estrangeiro === true || dados.estrangeiro === true;

      // Foto Oficial / Biometria
      const rawFoto = dados.foto_base64 || cont.fotos?.[0] || dados.fotos?.[0] || dados.foto;
      const fotoSrc = rawFoto ? (String(rawFoto).startsWith('data:image') ? String(rawFoto) : `data:image/jpeg;base64,${rawFoto}`) : null;

      // Receita Federal & Situação Cadastral
      const sitCadastral = docs.situacao_cadastral || dados.situacao_cadastral || 'REGULAR';
      const isRegular = sitCadastral === 'REGULAR' || sitCadastral === '2' || sitCadastral === '0';
      const dtSitCadastral = formatDateBR(docs.data_situacao_cadastral || dados.data_situacao_cadastral || dados.dt_sit_cad);
      const dtInscricao = formatDateBR(docs.data_inscricao || dados.data_inscricao || dados.dt_informacao);
      const cidadeOrigem = docs.municipio || dados.municipio_origem;
      const ufOrigem = docs.uf || dados.uf_origem;
      const obitoConsta = docs.obito?.consta || !!(docs.obito?.data || docs.obito?.ano);

      // Documentos Oficiais
      const rgObj = docs.rg || dados.rg;
      const numRg = typeof rgObj === 'object' ? (rgObj?.numero || '-') : (rgObj || '-');
      const orgaoRg = typeof rgObj === 'object' ? (rgObj?.orgao_emissor ? `${rgObj.orgao_emissor}${rgObj.uf ? `/${rgObj.uf}` : ''}` : '-') : '-';
      
      const tituloObj = docs.titulo_eleitor || dados.titulo_eleitor;
      const numTitulo = typeof tituloObj === 'object' ? (tituloObj?.numero || '-') : (tituloObj || '-');
      const zonaSecao = typeof tituloObj === 'object' && (tituloObj?.zona || tituloObj?.secao)
        ? `Zona ${tituloObj.zona || '-'} • Seção ${tituloObj.secao || '-'}`
        : (dados.zona || dados.secao ? `Zona ${dados.zona || '-'} • Seção ${dados.secao || '-'}` : null);

      // CNH Oficial
      const cnh = docs.cnh || dados.cnh;
      const hasCnh = !!(cnh && (cnh.numero || cnh.categoria || cnh.renach));
      const cnhVencida = cnh?.validade_vencida === true;

      // Score CSBA
      const rawScore = fin.score || dados.score;
      const scoreCsba = typeof rawScore === 'object' 
        ? (rawScore?.csba ?? rawScore?.CSBA ?? null) 
        : (typeof rawScore === 'number' ? rawScore : null);
      const scoreFaixa = typeof rawScore === 'object'
        ? (rawScore?.csba_faixa || rawScore?.CSBA_FAIXA)
        : (scoreCsba ? (scoreCsba >= 750 ? 'BAIXÍSSIMO RISCO' : scoreCsba >= 550 ? 'BAIXO RISCO' : scoreCsba >= 300 ? 'MÉDIO RISCO' : 'ALTO RISCO') : null);

      // Ocupação & CBO
      const rawCbo = ocup.cbo || dados.cbo;
      const cboInfo = translateCBO(rawCbo);
      const cboDisplay = cboInfo ? cboInfo.codigo : (rawCbo || '-');
      const cboTitulo = cboInfo?.titulo;
      const profissao = ocup.profissao || dados.profissao || cboTitulo || '-';
      const rendaEstimada = fin.renda || dados.renda || dados.renda_estimada;

      // Perfil Socioeconômico (antigo Mosaic)
      const rawMosaic = ocup.mosaic || dados.mosaic || dados.cd_mosaic || ocup.perfil_socioeconomico || dados.perfil_socioeconomico || ocup.CD_MOSAIC || dados.CD_MOSAIC;
      const mosaicInfo = translateMosaic(rawMosaic);
      const perfilSocioeconomicoDisplay = mosaicInfo ? mosaicInfo.descricaoCompleta : (rawMosaic || null);

      // Contatos
      const telefones: any[] = Array.isArray(cont.telefones) ? cont.telefones : (Array.isArray(dados.telefones) ? dados.telefones : []);
      const emails: any[] = Array.isArray(cont.emails) ? cont.emails : (Array.isArray(dados.emails) ? dados.emails : []);

      // Endereços
      const enderecos: any[] = Array.isArray(dados.enderecos) ? dados.enderecos : (Array.isArray(ident.enderecos) ? ident.enderecos : []);

      // Parentes
      const parentes: any[] = Array.isArray(dados.parentes) ? dados.parentes : (Array.isArray(cont.parentes) ? cont.parentes : []);

      // Jurídico & Segurança
      const totalProcessos = jur.processos?.total ?? dados.juridico?.total_processos ?? 0;
      const vazamentosEncontrados = seg.vazamentos?.encontrado ?? dados.seguranca?.vazamentos_encontrados ?? false;

      return (
        <div className="space-y-6">
          {/* Card 1: Perfil Cadastral Civil & Biometria Fotográfica */}
          <div className="border border-slate-200 rounded-xl p-5 md:p-6 bg-white shadow-xs">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <div className="flex items-center space-x-2">
                <User className="w-4 h-4 text-slate-700" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Dossiê Cadastral & Identificação Civil
                </span>
              </div>
              <span className={`px-2.5 py-0.5 rounded text-[11px] font-bold border ${isRegular ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-amber-50 text-amber-800 border-amber-200'}`}>
                Receita Federal: {isRegular ? 'REGULAR' : sitCadastral}
              </span>
            </div>

            <div className="flex flex-col md:flex-row gap-6">
              {/* Foto 3x4 Oficial com Tratamento Impeccable */}
              <div className="flex flex-col items-center shrink-0">
                <div className="w-32 h-40 md:w-36 md:h-44 rounded-xl overflow-hidden border border-slate-300 shadow-xs bg-slate-100 relative group flex items-center justify-center">
                  {fotoSrc ? (
                    <img
                      src={fotoSrc}
                      alt={nomeCivil}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-center p-4">
                      <User className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                      <span className="text-[10px] text-slate-400 font-medium block">Sem Foto</span>
                    </div>
                  )}
                  {fotoSrc && (
                    <div className="absolute bottom-0 inset-x-0 bg-slate-900/80 backdrop-blur-xs py-1 px-1.5 text-center">
                      <span className="text-[9px] font-bold text-slate-200 uppercase tracking-wider block">
                        Biometria Oficial
                      </span>
                    </div>
                  )}
                </div>
                <span className="text-[10px] text-slate-400 mt-2 font-mono">
                  {fotoSrc ? 'Registro Fotográfico' : 'Imagem Indisponível'}
                </span>
              </div>

              {/* Informações Civis */}
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-3.5 gap-x-4 text-xs">
                <div className="md:col-span-2 lg:col-span-3 pb-2 border-b border-slate-100">
                  <span className="text-[10px] text-slate-400 font-medium uppercase block">Nome Civil Completo</span>
                  <span className="text-base font-bold text-slate-900 block mt-0.5">{nomeCivil}</span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 font-medium uppercase block">CPF do Titular</span>
                  <span className="text-sm font-mono font-bold text-slate-800 block mt-0.5">{cpfFormatado}</span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 font-medium uppercase block">Data de Nascimento</span>
                  <span className="font-mono text-slate-800 font-semibold block mt-0.5">{dataNasc}</span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 font-medium uppercase block">Sexo Biológico</span>
                  <span className="font-semibold text-slate-800 block mt-0.5">{sexoDesc}</span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 font-medium uppercase block">Nome da Mãe</span>
                  <span className="font-semibold text-slate-800 block mt-0.5">{nomeMae}</span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 font-medium uppercase block">Nome do Pai</span>
                  <span className="font-semibold text-slate-800 block mt-0.5">{nomePai}</span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 font-medium uppercase block">Nacionalidade</span>
                  <span className="font-semibold text-slate-800 block mt-0.5">
                    {nacionalidade} {ehEstrangeiro ? '(Estrangeiro)' : '(Brasileiro Nato)'}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 font-medium uppercase block">Município / UF de Origem</span>
                  <span className="font-semibold text-slate-800 block mt-0.5">
                    {cidadeOrigem || '-'} {ufOrigem ? `/ ${ufOrigem}` : ''}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 font-medium uppercase block">Inscrição no CPF</span>
                  <span className="font-mono text-slate-800 block mt-0.5">{dtInscricao}</span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 font-medium uppercase block">Status de Sobrevivência</span>
                  <span className={`inline-flex items-center space-x-1 font-bold mt-0.5 ${obitoConsta ? 'text-rose-600' : 'text-emerald-700'}`}>
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>{obitoConsta ? 'Consta Óbito' : 'Sem Registro de Óbito (Vivo)'}</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Grid: Documentos Oficiais + Score CSBA */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Card Documentos Oficiais */}
            <div className="border border-slate-200 rounded-xl p-5 bg-white shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-slate-700" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Documentos Oficiais & Identificação
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                  Cartorial / Civil
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-50/70 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-400 font-medium block">Registro Geral (RG):</span>
                  <span className="font-mono font-bold text-slate-900 text-sm block mt-0.5">{numRg}</span>
                  <span className="text-[11px] text-slate-500 font-medium block mt-0.5">Órgão/UF: {orgaoRg}</span>
                </div>

                <div className="p-3 bg-slate-50/70 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-400 font-medium block">Título de Eleitor:</span>
                  <span className="font-mono font-bold text-slate-900 text-sm block mt-0.5">{numTitulo}</span>
                  <span className="text-[11px] text-emerald-700 font-medium block mt-0.5">
                    {zonaSecao ? `${zonaSecao} • Regular` : 'Justiça Eleitoral: Regular'}
                  </span>
                </div>

                <div className="p-3 bg-slate-50/70 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-400 font-medium block">Ocupação / CBO:</span>
                  <span className="font-mono font-bold text-slate-900 text-sm block mt-0.5">
                    {cboDisplay}
                  </span>
                  <span className="text-[11px] text-slate-600 font-medium block mt-0.5 truncate" title={cboTitulo || profissao}>
                    {cboTitulo || (profissao !== '-' ? profissao : 'Atividade Cadastrada')}
                  </span>
                </div>

                <div className="p-3 bg-slate-50/70 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-400 font-medium block">Renda Presumida:</span>
                  <span className="font-bold text-slate-900 text-sm block mt-0.5">
                    {rendaEstimada ? `R$ ${Number(rendaEstimada).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'Não declarada'}
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium block mt-0.5">Base Estatística</span>
                </div>

                {perfilSocioeconomicoDisplay && (
                  <div className="p-3 bg-slate-50/70 rounded-lg border border-slate-200 col-span-2">
                    <span className="text-[10px] text-slate-400 font-medium block">Perfil Socioeconômico:</span>
                    <span className="font-bold text-slate-900 text-sm block mt-0.5">
                      {mosaicInfo ? `${mosaicInfo.codigo} • ${mosaicInfo.segmento}` : perfilSocioeconomicoDisplay}
                    </span>
                    {mosaicInfo?.grupoNome && (
                      <span className="text-[11px] text-slate-500 font-medium block mt-0.5">
                        Grupo: {mosaicInfo.grupoNome}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Card Score de Crédito CSBA */}
            <div className="border border-slate-200 rounded-xl p-5 bg-white shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center space-x-2">
                  <Award className="w-4 h-4 text-emerald-700" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Score de Crédito & Risco Financeiro
                  </span>
                </div>
                {scoreFaixa && (
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                    {scoreFaixa}
                  </span>
                )}
              </div>

              {scoreCsba !== null ? (
                <div className="space-y-3">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <span className="text-3xl font-extrabold font-mono text-slate-900">{scoreCsba}</span>
                      <span className="text-xs text-slate-400 ml-1 font-mono">/ 1000 pontos</span>
                    </div>
                    <span className="text-xs font-bold text-emerald-800 bg-emerald-100/70 px-2.5 py-1 rounded-md">
                      {scoreFaixa || 'Excelente Pontuação'}
                    </span>
                  </div>

                  {/* Barra visual de pontuação */}
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.max(0, (scoreCsba / 1000) * 100))}%` }}
                    />
                  </div>

                  <p className="text-[11px] text-slate-500">
                    A pontuação CSBA reflete a probabilidade de cumprimento de compromissos financeiros nos próximos 12 meses segundo os bureaus analíticos de crédito.
                  </p>
                </div>
              ) : (
                <div className="p-4 text-center text-xs text-slate-500 bg-slate-50 rounded-lg">
                  Sem pontuação de score calculada nesta consulta.
                </div>
              )}
            </div>
          </div>

          {/* Card CNH Oficial e Exame Toxicológico */}
          {hasCnh && (
            <div className="border border-slate-200 rounded-xl p-5 bg-white shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center space-x-2">
                  <CreditCard className="w-4 h-4 text-slate-700" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Carteira Nacional de Habilitação (CNH) • Base Senatran
                  </span>
                </div>
                <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold border ${cnhVencida ? 'bg-rose-50 text-rose-800 border-rose-200' : 'bg-emerald-50 text-emerald-800 border-emerald-200'}`}>
                  {cnhVencida ? 'CNH Vencida' : 'CNH Válida e Regular'}
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div className="p-3 bg-slate-50/70 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-400 font-medium block">Nº de Registro:</span>
                  <span className="font-mono font-bold text-slate-900 block mt-0.5">{cnh.numero || '-'}</span>
                </div>

                <div className="p-3 bg-slate-50/70 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-400 font-medium block">Categoria CNH:</span>
                  <span className="font-mono font-extrabold text-blue-700 text-sm block mt-0.5">{cnh.categoria || '-'}</span>
                </div>

                <div className="p-3 bg-slate-50/70 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-400 font-medium block">Data de Emissão:</span>
                  <span className="font-mono font-semibold text-slate-800 block mt-0.5">{formatDateBR(cnh.emissao)}</span>
                </div>

                <div className="p-3 bg-slate-50/70 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-400 font-medium block">Data de Validade:</span>
                  <span className={`font-mono font-bold block mt-0.5 ${cnhVencida ? 'text-rose-700' : 'text-slate-900'}`}>
                    {formatDateBR(cnh.validade)}
                  </span>
                </div>

                <div className="p-3 bg-slate-50/70 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-400 font-medium block">Formulário RENACH:</span>
                  <span className="font-mono text-slate-800 font-semibold block mt-0.5">{cnh.renach || '-'}</span>
                </div>

                <div className="p-3 bg-slate-50/70 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-400 font-medium block">UF de Habilitação:</span>
                  <span className="font-bold text-slate-900 block mt-0.5">{cnh.uf || '-'}</span>
                </div>

                <div className="col-span-2 p-3 bg-slate-50/70 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-400 font-medium block">Exame Toxicológico:</span>
                  <span className="font-semibold text-slate-800 block mt-0.5">
                    {cnh.exame_toxicologico?.mensagem || 'Não há pendências de exame toxicológico registradas'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Card Canais de Contato Mapeados (Telefones & E-mails) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Telefones */}
            <div className="border border-slate-200 rounded-xl p-5 bg-white shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center space-x-2">
                  <Phone className="w-4 h-4 text-slate-700" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Telefones Localizados ({telefones.length})
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">Contato Direto</span>
              </div>

              {telefones.length === 0 ? (
                <p className="text-xs text-slate-400 p-2 text-center">Nenhum telefone localizado.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {telefones.map((tel: any, idx: number) => {
                    const telNumero = typeof tel === 'string' ? tel : (tel?.numero || tel?.telefone || '-');
                    const telData = typeof tel === 'object' ? (tel?.data_atualizacao || tel?.dt_inclusao || tel?.dt_informacao || tel?.data) : undefined;
                    return (
                      <div key={idx} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200/80 flex items-center justify-between gap-2">
                        <div className="flex items-center space-x-2 min-w-0">
                          <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="font-mono font-semibold text-slate-800">{telNumero}</span>
                        </div>
                        {telData && (
                          <span className="text-[10px] text-slate-500 font-mono shrink-0 bg-white px-1.5 py-0.5 rounded border border-slate-200 shadow-2xs" title={`Atualizado em ${formatDateBR(telData)}`}>
                            {formatDateBR(telData)}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* E-mails */}
            <div className="border border-slate-200 rounded-xl p-5 bg-white shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center space-x-2">
                  <Mail className="w-4 h-4 text-slate-700" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    E-mails Mapeados ({emails.length})
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">Contato Eletrônico</span>
              </div>

              {emails.length === 0 ? (
                <p className="text-xs text-slate-400 p-2 text-center">Nenhum e-mail localizado.</p>
              ) : (
                <div className="space-y-2 text-xs">
                  {emails.map((mail: any, idx: number) => {
                    const mailStr = typeof mail === 'string' ? mail : (mail?.email || '-');
                    const mailData = typeof mail === 'object' ? (mail?.data_atualizacao || mail?.dt_inclusao || mail?.dt_informacao || mail?.data) : undefined;
                    return (
                      <div key={idx} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200/80 flex items-center justify-between gap-2">
                        <div className="flex items-center space-x-2 min-w-0">
                          <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="font-mono text-slate-800 font-medium truncate" title={mailStr}>{mailStr}</span>
                        </div>
                        {mailData && (
                          <span className="text-[10px] text-slate-500 font-mono shrink-0 bg-white px-1.5 py-0.5 rounded border border-slate-200 shadow-2xs" title={`Atualizado em ${formatDateBR(mailData)}`}>
                            {formatDateBR(mailData)}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

              )}
            </div>
          </div>

          {/* Card Histórico de Endereços */}
          <div className="border border-slate-200 rounded-xl p-5 bg-white shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <MapPin className="w-4 h-4 text-slate-700" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Histórico de Endereços Vinculados ({enderecos.length})
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">Base Cartorial e Cadastral</span>
            </div>

            {enderecos.length === 0 ? (
              <p className="text-xs text-slate-400 p-4 text-center">Nenhum endereço localizado para este CPF.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600 font-semibold">
                      <th className="py-2.5 px-3">Logradouro / Número</th>
                      <th className="py-2.5 px-3">Bairro</th>
                      <th className="py-2.5 px-3">Município / UF</th>
                      <th className="py-2.5 px-3">CEP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {enderecos.map((end: any, idx: number) => {
                      const logradouroComp = [end.logradouro, end.numero ? `nº ${end.numero}` : '', end.complemento].filter(Boolean).join(', ');
                      return (
                        <tr key={idx} className="hover:bg-slate-50/80 transition">
                          <td className="py-2.5 px-3 font-medium text-slate-900">{logradouroComp || '-'}</td>
                          <td className="py-2.5 px-3 text-slate-700">{end.bairro && end.bairro !== 'NULL' ? end.bairro : '-'}</td>
                          <td className="py-2.5 px-3 font-semibold text-slate-800">{end.cidade || end.municipio || '-'}{end.uf ? ` / ${end.uf}` : ''}</td>
                          <td className="py-2.5 px-3 font-mono text-slate-700">{formatCEP(end.cep)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Card Vínculos Familiares / Parentesco */}
          <div className="border border-slate-200 rounded-xl p-5 bg-white shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4 text-slate-700" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Vínculos Familiares & Árvore de Parentesco ({parentes.length})
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">Consanguinidade e Afinidade</span>
            </div>

            {parentes.length === 0 ? (
              <p className="text-xs text-slate-400 p-4 text-center">Nenhum vínculo familiar identificado na base.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600 font-semibold">
                      <th className="py-2.5 px-3 w-36">Grau de Parentesco</th>
                      <th className="py-2.5 px-3">Nome Completo do Familiar</th>
                      <th className="py-2.5 px-3 w-44">CPF do Vinculado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parentes.map((p: any, idx: number) => {
                      const vinculo = String(p.vinculo || p.grau_parentesco || 'FAMILIAR').toUpperCase();
                      const isMae = vinculo.includes('MAE') || vinculo.includes('MÃE');
                      const isPai = vinculo.includes('PAI');
                      return (
                        <tr key={idx} className="hover:bg-slate-50/80 transition">
                          <td className="py-2.5 px-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                              isMae ? 'bg-purple-50 text-purple-800 border-purple-200' :
                              isPai ? 'bg-blue-50 text-blue-800 border-blue-200' :
                              'bg-slate-100 text-slate-800 border-slate-200'
                            }`}>
                              {vinculo}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-bold text-slate-900">{p.nome || '-'}</td>
                          <td className="py-2.5 px-3 font-mono font-semibold text-slate-800">{formatCPF(p.cpf)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Card Processos Judiciais & Segurança da Informação */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Processos */}
            <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-xs flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`p-2.5 rounded-lg ${totalProcessos > 0 ? 'bg-amber-100 text-amber-900' : 'bg-emerald-50 text-emerald-800'}`}>
                  <Scale className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-900 block">Apontamentos Jurídicos / Processos</span>
                  <span className="text-[11px] text-slate-500 block">
                    {totalProcessos > 0 ? `${totalProcessos} processos em andamento` : 'Nada Consta na Base Jurídica Nacional'}
                  </span>
                </div>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${totalProcessos > 0 ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-900'}`}>
                {totalProcessos > 0 ? `${totalProcessos} Ações` : '0 Processos'}
              </span>
            </div>

            {/* Vazamentos */}
            <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-xs flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`p-2.5 rounded-lg ${vazamentosEncontrados ? 'bg-rose-100 text-rose-900' : 'bg-emerald-50 text-emerald-800'}`}>
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-900 block">Segurança de Credenciais</span>
                  <span className="text-[11px] text-slate-500 block">
                    {vazamentosEncontrados ? 'Alerta de Exposição de Credenciais' : 'Nenhum vazamento identificado • Seguro'}
                  </span>
                </div>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${vazamentosEncontrados ? 'bg-rose-100 text-rose-900' : 'bg-emerald-100 text-emerald-900'}`}>
                {vazamentosEncontrados ? 'Exposto' : 'Protegido'}
              </span>
            </div>
          </div>
        </div>
      );
    }

    // E14: SNG Gravames Financeiros
    case 'E14': {
      const v = dados.veiculo || dados;
      const rawGravames = Array.isArray(dados.gravames) 
        ? dados.gravames 
        : (dados.gravame ? [dados.gravame] : (Array.isArray(v.gravames) ? v.gravames : []));
      
      const placa = v.placa || dados.placa || identifier;
      const renavam = v.renavam || dados.renavam || '-';
      const chassi = v.chassi || dados.chassi || '-';
      const remarcacao = v.remarcacao_descricao || v.remarcacao || dados.remarcacao || 'Normal';
      const anoFab = v.ano_fab || v.ano_fabricacao || dados.ano_fabricacao || '-';
      const anoMod = v.ano_modelo || v.ano_mod || dados.ano_modelo || '-';
      const ufPlaca = v.uf_placa || v.uf || dados.uf || '-';
      const ufLicenc = v.uf_licenciamento || dados.uf_licenciamento || ufPlaca;
      const statusVeic = v.status_veiculo_descricao || dados.status_veiculo || dados.situacao_geral || 'Consulta realizada no Sistema Nacional de Gravames';

      // Avaliação de Gravame Ativo vs Baixado
      const temGravameAtivo = rawGravames.some((g: any) => {
        const desc = (g.status_veiculo_descricao || g.status_descricao || g.status || '').toLowerCase();
        const isBaixado = desc.includes('baixad') || desc.includes('desalienad') || desc.includes('cancelad') || desc.includes('liberad');
        return !isBaixado && (g.ativo !== false || g.situacao === 'ATIVO');
      });

      const todosBaixados = rawGravames.length > 0 && !temGravameAtivo;

      return (
        <div className="space-y-6">
          {/* Card 1: Identificação Veicular e Parecer Geral SNG */}
          <div className="border border-slate-200 rounded-xl p-5 md:p-6 bg-white shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 mb-5 gap-3">
              <div className="flex items-center space-x-2">
                <Car className="w-5 h-5 text-slate-700" />
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-800 block">
                    Certidão do Sistema Nacional de Gravames (SNG)
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium">
                    Base Oficial de Alienações, Penhores e Reservas de Domínio
                  </span>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-md text-xs font-bold border shrink-0 text-center ${
                temGravameAtivo 
                  ? 'bg-amber-50 text-amber-900 border-amber-300' 
                  : todosBaixados
                    ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                    : 'bg-slate-100 text-slate-800 border-slate-200'
              }`}>
                {temGravameAtivo 
                  ? 'Gravame Ativo / Alienação Fiduciária' 
                  : todosBaixados 
                    ? 'Gravame Baixado / Desalienado (Livre)' 
                    : 'Sem Gravame Ativo Registrado'}
              </span>
            </div>

            {/* Grid Veículo */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div className="p-3 bg-slate-50/70 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-400 font-medium block">Placa:</span>
                <span className="font-mono font-bold text-slate-900 text-sm block mt-0.5">{formatDocumento(placa)}</span>
                <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">UF: {ufPlaca}</span>
              </div>

              <div className="p-3 bg-slate-50/70 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-400 font-medium block">Código RENAVAM:</span>
                <span className="font-mono font-bold text-slate-900 text-sm block mt-0.5">{renavam}</span>
              </div>

              <div className="p-3 bg-slate-50/70 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-400 font-medium block">Número do Chassi:</span>
                <span className="font-mono font-bold text-slate-900 text-sm block mt-0.5 truncate" title={chassi}>{chassi}</span>
                <span className="text-[10px] text-slate-500 mt-0.5 block">Remarcação: {remarcacao}</span>
              </div>

              <div className="p-3 bg-slate-50/70 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-400 font-medium block">Ano Fab. / Modelo:</span>
                <span className="font-mono font-bold text-slate-900 text-sm block mt-0.5">{anoFab} / {anoMod}</span>
                <span className="text-[10px] text-slate-500 mt-0.5 block">Licenciamento: {ufLicenc}</span>
              </div>

              <div className="col-span-2 md:col-span-4 p-3 bg-slate-50/70 rounded-lg border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 font-medium block">Parecer do Órgão de Trânsito:</span>
                  <span className="font-semibold text-slate-800 text-xs block mt-0.5">{statusVeic}</span>
                </div>
                <div className="text-right font-mono text-[11px] text-slate-500">
                  Total de Registros SNG: <strong>{rawGravames.length}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Histórico Completo de Gravames Financeiros */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Histórico de Contratos e Restrições Financeiras ({rawGravames.length})
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                SNG • Certificação Digital
              </span>
            </div>

            {rawGravames.length === 0 ? (
              <div className="border border-slate-200 rounded-xl p-8 text-center bg-white shadow-xs">
                <ShieldCheck className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-800">Veículo sem Gravames Cadastrados</p>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  A auditoria no Sistema Nacional de Gravames não localizou nenhum contrato de alienação fiduciária, penhor ou reserva de domínio para os identificadores consultados.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {rawGravames.map((g: any, idx: number) => {
                  const statusDesc = g.status_veiculo_descricao || g.status_descricao || g.status || 'Gravame';
                  const isBaixado = /baixad|desalienad|cancelad|liberad/i.test(statusDesc);
                  const dtContrato = formatDateBR(g.data_contrato);
                  const dtStatus = formatDateBR(g.data_status);
                  const horaStatus = g.hora_status || g.hora_status_iso || '';

                  return (
                    <div key={idx} className="border border-slate-200 rounded-xl p-5 bg-white shadow-xs space-y-3">
                      {/* Topo do Contrato */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
                        <div>
                          <span className="font-bold text-slate-900 text-sm block">
                            {g.nome_agente || g.agente_financeiro || 'AGENTE FINANCEIRO NÃO INFORMADO'}
                          </span>
                          {g.cnpj_agente && (
                            <span className="font-mono text-slate-500 text-[11px] block mt-0.5">
                              CNPJ do Agente: {formatDocumento(g.cnpj_agente)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-2 shrink-0">
                          {g.numero_restricao && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                              Restrição #{g.numero_restricao}
                            </span>
                          )}
                          <span className={`px-2.5 py-0.5 rounded text-[11px] font-bold border ${
                            isBaixado 
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                              : 'bg-amber-50 text-amber-900 border-amber-200'
                          }`}>
                            {isBaixado ? 'Gravame Baixado' : 'Gravame Ativo'}
                          </span>
                        </div>
                      </div>

                      {/* Dados do Contrato e Financiamento */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                        <div>
                          <span className="text-[10px] text-slate-400 font-medium uppercase block">Número do Contrato:</span>
                          <span className="font-mono font-bold text-slate-900 block mt-0.5">
                            {g.numero_contrato || '-'}
                          </span>
                        </div>

                        <div>
                          <span className="text-[10px] text-slate-400 font-medium uppercase block">Data do Contrato:</span>
                          <span className="font-mono text-slate-800 font-semibold block mt-0.5">
                            {dtContrato}
                          </span>
                        </div>

                        <div>
                          <span className="text-[10px] text-slate-400 font-medium uppercase block">Informante da Restrição:</span>
                          <span className="font-medium text-slate-800 block mt-0.5">
                            {g.informante_restricao || g.informante_restricao_descricao || 'Agente financeiro'}
                          </span>
                        </div>

                        <div>
                          <span className="text-[10px] text-slate-400 font-medium uppercase block">Nome do Financiado (Devedor):</span>
                          <span className="font-bold text-slate-900 block mt-0.5">
                            {g.nome_financiado || '-'}
                          </span>
                        </div>

                        <div>
                          <span className="text-[10px] text-slate-400 font-medium uppercase block">Documento Financiado (CPF/CNPJ):</span>
                          <span className="font-mono font-bold text-slate-800 block mt-0.5">
                            {formatDocumento(g.documento_financiado)}
                          </span>
                        </div>

                        <div>
                          <span className="text-[10px] text-slate-400 font-medium uppercase block">Data / Hora da Baixa ou Status:</span>
                          <span className="font-mono text-slate-800 font-medium block mt-0.5">
                            {dtStatus !== '-' ? `${dtStatus} ${horaStatus ? `às ${horaStatus}` : ''}` : '-'}
                          </span>
                        </div>

                        <div className="sm:col-span-2 md:col-span-3 pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between text-[11px] text-slate-500 gap-2">
                          <div>
                            <span className="font-medium">Registro Contratual: </span>
                            <span>{g.registro_contrato || g.indicativo_registro_contrato_descricao || 'Não existe registro de contrato eletrônico'}</span>
                          </div>
                          {g.assinatura_eletronica && (
                            <div className="font-mono text-[10px] text-slate-400 truncate max-w-xs" title={g.assinatura_eletronica}>
                              Autenticação: {g.assinatura_eletronica}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      );
    }

    // E16: Busca por RG
    case 'E16': {
      const list = Array.isArray(dados.registros) 
        ? dados.registros 
        : (Array.isArray(dados.data) ? dados.data : (Array.isArray(dados) ? dados : []));
      const rgPesquisado = dados.rg_pesquisado || identifier;
      const totalLocalizados = typeof dados.total_localizados === 'number' ? dados.total_localizados : list.length;

      return (
        <div className="space-y-4">
          {/* Card Resumo do RG Pesquisado */}
          <div className="border border-slate-200 rounded-xl p-5 bg-white shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
              <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4 text-slate-700" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Dossiê de Identificação por Cédula de Identidade (RG)
                </span>
              </div>
              <span className={`px-2.5 py-0.5 rounded text-[11px] font-bold border ${
                list.length > 0 ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-slate-100 text-slate-700 border-slate-200'
              }`}>
                {list.length > 0 ? `${list.length} ${list.length === 1 ? 'Titular Localizado' : 'Titulares Localizados'}` : 'Nada Consta'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs mt-3">
              <div className="p-3 bg-slate-50/70 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-400 font-medium block">Documento Pesquisado:</span>
                <span className="font-mono font-bold text-slate-900 text-sm block mt-0.5">RG: {rgPesquisado}</span>
              </div>

              <div className="p-3 bg-slate-50/70 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-400 font-medium block">Total de Correspondências:</span>
                <span className="font-mono font-bold text-slate-900 text-sm block mt-0.5">
                  {totalLocalizados} {totalLocalizados === 1 ? 'registro civil' : 'registros civis'}
                </span>
              </div>

              <div className="p-3 bg-slate-50/70 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-400 font-medium block">Autenticidade & Base:</span>
                <span className="font-semibold text-emerald-700 text-sm block mt-0.5">Certificado Oficial</span>
              </div>
            </div>
          </div>

          {/* Lista de Registros Vinculados ao RG */}
          {list.length === 0 ? (
            <div className="border border-slate-200 rounded-xl p-8 text-center bg-white shadow-xs">
              <ShieldCheck className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-800">Nenhum Registro Localizado para este RG</p>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                A varredura nas bases estaduais de identificação civil não retornou titulares cadastrados para o número de RG informado.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {list.map((r: any, idx: number) => {
                const cpfFormatado = formatCPF(r.cpf);
                const dataNasc = formatDateBR(r.data_nascimento);

                return (
                  <div key={idx} className="border border-slate-200 rounded-xl p-5 bg-white shadow-xs space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
                      <div className="flex items-center space-x-2">
                        <User className="w-4 h-4 text-slate-700" />
                        <span className="font-bold text-slate-900 text-sm">{r.nome || 'NOME NÃO INFORMADO'}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-200 font-mono">
                        UF Expedição: {r.uf || 'NÃO CONSTA'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                      <div className="p-3 bg-slate-50/70 rounded-lg border border-slate-200">
                        <span className="text-[10px] text-slate-400 font-medium block">CPF do Titular:</span>
                        <span className="font-mono font-bold text-slate-900 text-sm block mt-0.5">{cpfFormatado}</span>
                      </div>

                      <div className="p-3 bg-slate-50/70 rounded-lg border border-slate-200">
                        <span className="text-[10px] text-slate-400 font-medium block">Cédula de Identidade (RG):</span>
                        <span className="font-mono font-bold text-slate-900 text-sm block mt-0.5">{r.rg || rgPesquisado}</span>
                      </div>

                      <div className="p-3 bg-slate-50/70 rounded-lg border border-slate-200">
                        <span className="text-[10px] text-slate-400 font-medium block">Data de Nascimento:</span>
                        <span className="font-mono font-semibold text-slate-800 block mt-0.5">{dataNasc}</span>
                      </div>

                      <div className="p-3 bg-slate-50/70 rounded-lg border border-slate-200">
                        <span className="text-[10px] text-slate-400 font-medium block">Estado Emissor (UF):</span>
                        <span className="font-bold text-slate-900 block mt-0.5">{r.uf || '-'}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      );
    }

    // Default genérico para laudos de outros produtos
    default: {
      return (
        <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50">
          <pre className="text-xs font-mono text-slate-800 whitespace-pre-wrap overflow-x-auto">
            {JSON.stringify(dados, null, 2)}
          </pre>
        </div>
      );
    }
  }
}
