import React from 'react';
import { ProductDefinition } from '../../config/productsCatalog';
import { Clock, User, MapPin, Building, Calendar, FileText, CheckCircle2, ShieldCheck, AlertCircle } from 'lucide-react';
import { ProprietarioTimelineCard } from '../veicular/ProprietarioTimelineCard';
import { processarHistoricoProprietarios } from '../../utils/veicularUtils';
import { ExportPdfVeicularButton } from '../veicular/ExportPdfVeicularButton';
import { ExportExcelVeicularButton } from '../veicular/ExportExcelVeicularButton';
import { DeclaracaoCard } from '../imobiliario/DeclaracaoCard';
import { ExportPdfButton } from '../imobiliario/ExportPdfButton';
import { ExportExcelButton } from '../imobiliario/ExportExcelButton';

// Formatação universal de CPF/CNPJ/Placa
const formatDocumento = (doc: string) => {
  if (!doc) return '-';
  const clean = doc.replace(/\D/g, '');
  if (clean.length === 11) {
    return clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }
  if (clean.length === 14) {
    return clean.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }
  return doc.toUpperCase();
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
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-6">
      {/* Topo do Laudo Pericial */}
      <div className="border-b border-slate-100 pb-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono border ${produto.badgeColor.bg} ${produto.badgeColor.text} ${produto.badgeColor.border}`}>
              {produto.code}
            </span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Certidão Pericial Oficial • Renacred Bureau
            </span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 mt-1">
            {produto.name}
          </h2>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={handleImprimir}
            className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition"
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
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${totalRegistros > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'}`}>
              {totalRegistros > 0 ? 'Dados Localizados' : 'Sem Ocorrências'}
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
        {totalRegistros === 0 ? (
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
              <div className="flex items-center space-x-2">
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
              <div className="flex items-center space-x-2">
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
      return (
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
                        {v.situacao}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
              <p><span className="text-slate-400 font-medium">Documento:</span> <span className="font-mono text-slate-800">{prop.documento || '-'}</span></p>
              {prop.tipo_documento && <p><span className="text-slate-400 font-medium">Tipo Doc:</span> <span className="text-slate-700">{prop.tipo_documento}</span></p>}
              <p><span className="text-slate-400 font-medium">Logradouro:</span> <span className="text-slate-800 font-medium">{logradouroCompleto || '-'}</span></p>
              <p><span className="text-slate-400 font-medium">Bairro:</span> <span className="text-slate-800">{end.bairro || '-'}</span></p>
              <p><span className="text-slate-400 font-medium">Município / UF:</span> <span className="font-semibold text-slate-900">{end.municipio || '-'}{end.uf && !end.municipio?.includes(end.uf) ? ` / ${end.uf}` : ''}</span></p>
              <p><span className="text-slate-400 font-medium">CEP:</span> <span className="font-mono text-slate-800">{end.cep || '-'}</span></p>
              {prop.origem_endereco && <p><span className="text-slate-400 font-medium">Origem do Endereço:</span> <span className="text-slate-600">{prop.origem_endereco}</span></p>}
              {prop.data_atualizacao_endereco && <p><span className="text-slate-400 font-medium">Atualização:</span> <span className="text-slate-600">{prop.data_atualizacao_endereco}</span></p>}
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
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 font-semibold text-xs text-slate-800">
            Ocorrências Policiais Registradas ({ocorrencias.length})
          </div>
          <div className="divide-y divide-slate-100 p-4 space-y-3">
            {ocorrencias.map((o: any, idx: number) => (
              <div key={idx} className="bg-rose-50/50 border border-rose-200/80 rounded-lg p-3.5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                    {o.tipo}
                  </span>
                  <span className="text-xs font-mono text-slate-500">{o.data}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs pt-1">
                  <p><span className="text-slate-500 font-medium">Boletim:</span> <span className="font-mono font-bold text-slate-900">{o.numero_boletim || '-'}</span></p>
                  <p><span className="text-slate-500 font-medium">Município/UF:</span> <span className="font-semibold text-slate-900">{o.municipio}{o.uf ? `/${o.uf}` : ''}</span></p>
                  <p><span className="text-slate-500 font-medium">Órgão de Segurança:</span> <span className="text-slate-700">{o.orgao_seguranca || '-'}</span></p>
                </div>
                {o.descricao && (
                  <p className="text-[11px] text-slate-600 bg-white/60 p-2 rounded border border-rose-100">
                    {o.descricao}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      );
    }

    // E6 & E7: CNH
    case 'E6':
    case 'E7': {
      return (
        <div className="border border-slate-200 rounded-lg p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 text-xs">
              <p><span className="text-slate-400 font-medium">Nome do Condutor:</span> <span className="font-bold text-slate-900 text-sm block">{dados.nome}</span></p>
              <p><span className="text-slate-400 font-medium">CPF:</span> <span className="font-mono text-slate-800">{dados.cpf}</span></p>
              <p><span className="text-slate-400 font-medium">Número de Registro:</span> <span className="font-mono text-slate-800 font-semibold">{dados.numero_registro || '-'}</span></p>
              <p><span className="text-slate-400 font-medium">Renach:</span> <span className="font-mono text-slate-800">{dados.renach || '-'}</span></p>
              <p><span className="text-slate-400 font-medium">Categoria:</span> <span className="font-bold text-blue-900 px-2 py-0.5 bg-blue-50 border border-blue-200 rounded inline-block">{dados.categoria || '-'}</span></p>
            </div>
            <div className="space-y-2 text-xs">
              <p><span className="text-slate-400 font-medium">Data de Validade:</span> <span className="font-mono font-bold text-slate-900">{dados.data_validade || '-'}</span></p>
              <p><span className="text-slate-400 font-medium">Nome da Mãe:</span> <span className="text-slate-800">{dados.nome_mae || '-'}</span></p>
              <p><span className="text-slate-400 font-medium">UF:</span> <span className="font-mono text-slate-800">{dados.uf || '-'}</span></p>
              {dados.impedimento && (
                <p><span className="text-slate-400 font-medium">Impedimentos:</span> <span className="text-rose-700 font-semibold">{dados.impedimento}</span></p>
              )}
            </div>
          </div>
          {dados.foto_base64 && (
            <div className="pt-3 border-t border-slate-100 flex items-center space-x-4">
              <div className="border border-slate-300 rounded p-1 bg-white">
                <img src={`data:image/jpeg;base64,${dados.foto_base64}`} alt="Foto CNH" className="w-24 h-32 object-cover rounded" />
              </div>
              <div className="text-xs text-slate-500">
                <p className="font-semibold text-slate-800">Espelho Fotográfico Oficial</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Captura biométrica do banco nacional de condutores.</p>
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
        <div className="border border-slate-200 rounded-lg overflow-hidden space-y-4">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div>
              <span className="text-slate-500">Total de Infrações:</span> <span className="font-bold text-slate-900">{dados.total_multas}</span>
            </div>
            <div className="space-x-4 font-mono">
              <span>Valor Total: <strong className="text-slate-900">R$ {dados.valor_total || '0,00'}</strong></span>
              <span>Exigível: <strong className="text-rose-700">R$ {dados.valor_total_exigivel || '0,00'}</strong></span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-slate-700">
              <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-2.5">Auto de Infração</th>
                  <th className="px-4 py-2.5">Data / Hora</th>
                  <th className="px-4 py-2.5">Órgão Autuador</th>
                  <th className="px-4 py-2.5">Descrição</th>
                  <th className="px-4 py-2.5">Valor (R$)</th>
                  <th className="px-4 py-2.5">Situação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {multas.map((m: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-50/60">
                    <td className="px-4 py-2 font-bold text-slate-900">{m.auto_infracao}</td>
                    <td className="px-4 py-2 text-slate-600">{m.data_infracao} {m.hora_infracao || ''}</td>
                    <td className="px-4 py-2 font-sans text-slate-700">{m.orgao_autuador}</td>
                    <td className="px-4 py-2 font-sans text-slate-700">{m.descricao_infracao}</td>
                    <td className="px-4 py-2 font-bold text-slate-900">{m.valor}</td>
                    <td className="px-4 py-2 font-sans">{m.situacao}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    // E9: RENAJUD
    case 'E9': {
      const processos = dados.processos || [];
      return (
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 font-semibold text-xs text-slate-800">
            Processos e Ordens Judiciais ({processos.length})
          </div>
          <div className="divide-y divide-slate-100 p-4 space-y-3">
            {processos.map((p: any, idx: number) => (
              <div key={idx} className="bg-purple-50/40 border border-purple-200/80 rounded-lg p-3.5 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-purple-900 text-sm">{p.numero_processo}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                    {p.tipo_restricao}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1 text-slate-700">
                  <p><span className="text-slate-400 font-medium">Tribunal:</span> <span className="font-bold">{p.tribunal}</span></p>
                  <p><span className="text-slate-400 font-medium">Órgão Judiciário:</span> {p.orgao_judiciario}</p>
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
      return (
        <div className="border border-slate-200 rounded-lg overflow-hidden space-y-4">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
            <span className="font-bold text-slate-800 uppercase tracking-wider">
              Comunicações de Venda Registradas ({comunicados.length})
            </span>
            <span className="font-mono text-slate-600">Placa: {dados.placa || identifier}</span>
          </div>
          {comunicados.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              Nenhuma comunicação de venda registrada para este veículo.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 p-4 space-y-3">
              {comunicados.map((c: any, idx: number) => (
                <div key={idx} className="bg-slate-50/70 border border-slate-200 rounded-lg p-3.5 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-sm">{c.nome_comprador || 'Comprador não informado'}</span>
                    <span className="font-mono text-slate-500">Data Venda: {c.data_venda || '-'}</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-slate-600">
                    <p><span className="text-slate-400 font-medium">Documento:</span> <span className="font-mono font-semibold text-slate-800">{formatDocumento(c.documento_comprador || '')}</span></p>
                    <p><span className="text-slate-400 font-medium">Protocolo:</span> <span className="font-mono text-slate-800">{c.numero_protocolo || '-'}</span></p>
                    <p><span className="text-slate-400 font-medium">Data Inclusão:</span> <span className="font-mono text-slate-700">{c.data_inclusao || '-'}</span></p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    // E11: Parentes
    case 'E11': {
      const parentes = dados.parentes || [];
      return (
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 font-semibold text-xs text-slate-800">
            Vínculos Familiares Mapeados ({parentes.length})
          </div>
          <div className="divide-y divide-slate-100">
            {parentes.map((p: any, idx: number) => (
              <div key={idx} className="p-3.5 flex items-center justify-between hover:bg-slate-50 text-xs">
                <div className="flex items-center space-x-3">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200 uppercase">
                    {p.vinculo}
                  </span>
                  <span className="font-semibold text-slate-900">{p.nome}</span>
                </div>
                <span className="font-mono text-slate-600 font-medium">{p.cpf}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // E12: BIN Online
    case 'E12': {
      return (
        <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50 space-y-3">
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Ficha Técnica do Veículo (BIN)</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div><span className="text-slate-400 block font-medium">Placa:</span> <span className="font-mono font-bold text-slate-900">{dados.placa}</span></div>
            <div><span className="text-slate-400 block font-medium">Renavam:</span> <span className="font-mono text-slate-800">{dados.renavam}</span></div>
            <div><span className="text-slate-400 block font-medium">Chassi:</span> <span className="font-mono text-slate-800">{dados.chassi}</span></div>
            <div><span className="text-slate-400 block font-medium">Marca / Modelo:</span> <span className="font-semibold text-slate-900">{dados.marca_modelo}</span></div>
            <div><span className="text-slate-400 block font-medium">Ano Fab / Mod:</span> <span className="font-mono text-slate-800">{dados.ano_fabricacao}/{dados.ano_modelo || dados.ano_fabricacao}</span></div>
            <div><span className="text-slate-400 block font-medium">Cor:</span> <span className="text-slate-800">{dados.cor}</span></div>
            <div><span className="text-slate-400 block font-medium">Combustível:</span> <span className="text-slate-800">{dados.combustivel || '-'}</span></div>
            <div><span className="text-slate-400 block font-medium">Município / UF:</span> <span className="font-semibold text-slate-900">{dados.municipio} - {dados.uf}</span></div>
          </div>
        </div>
      );
    }

    // E13 & E15: CPF Básico / Completo
    case 'E13':
    case 'E15': {
      return (
        <div className="border border-slate-200 rounded-lg p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div><span className="text-slate-400 block font-medium">Nome Civil:</span> <span className="font-bold text-slate-900 text-sm">{dados.nome}</span></div>
            <div><span className="text-slate-400 block font-medium">CPF:</span> <span className="font-mono text-slate-800 font-semibold">{dados.cpf}</span></div>
            <div><span className="text-slate-400 block font-medium">Data de Nascimento:</span> <span className="font-mono text-slate-800">{dados.data_nascimento || '-'}</span></div>
            <div><span className="text-slate-400 block font-medium">Nome da Mãe:</span> <span className="text-slate-800">{dados.nome_mae || '-'}</span></div>
            <div><span className="text-slate-400 block font-medium">Sexo:</span> <span className="text-slate-800">{dados.sexo || '-'}</span></div>
            <div><span className="text-slate-400 block font-medium">RG:</span> <span className="font-mono text-slate-800">{dados.rg || '-'}</span></div>
          </div>
          {dados.score && (
            <div className="pt-3 border-t border-slate-100 flex items-center space-x-3 text-xs">
              <span className="text-slate-500 font-medium">Pontuação de Crédito / Score:</span>
              <span className="px-2.5 py-0.5 rounded font-mono font-bold bg-blue-100 text-blue-900">
                {dados.score}
              </span>
            </div>
          )}
        </div>
      );
    }

    // E14: SNG Gravames Financeiros
    case 'E14': {
      const grav = dados.gravame || {};
      const hasGravame = grav.ativo !== false && !!grav.agente_financeiro;
      return (
        <div className="border border-slate-200 rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Situação do Gravame Financeiro</span>
            <span className={`px-2.5 py-0.5 rounded text-xs font-bold ${hasGravame ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-emerald-100 text-emerald-900 border border-emerald-300'}`}>
              {hasGravame ? 'Gravame Ativo / Alienação Fiduciária' : 'Sem Gravame Ativo'}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="space-y-2">
              <p><span className="text-slate-400 font-medium">Agente Financeiro:</span> <span className="font-bold text-slate-900 block">{grav.agente_financeiro || 'Não consta'}</span></p>
              <p><span className="text-slate-400 font-medium">Número do Contrato:</span> <span className="font-mono text-slate-800 font-semibold">{grav.numero_contrato || '-'}</span></p>
              <p><span className="text-slate-400 font-medium">Data de Inclusão:</span> <span className="font-mono text-slate-800">{grav.data_inclusao || '-'}</span></p>
            </div>
            <div className="space-y-2">
              <p><span className="text-slate-400 font-medium">Placa:</span> <span className="font-mono font-bold text-slate-900">{dados.placa || identifier}</span></p>
              <p><span className="text-slate-400 font-medium">Renavam:</span> <span className="font-mono text-slate-800">{dados.renavam || '-'}</span></p>
              <p><span className="text-slate-400 font-medium">Chassi:</span> <span className="font-mono text-slate-800">{dados.chassi || '-'}</span></p>
              <p><span className="text-slate-400 font-medium">Remarcação:</span> <span className="text-slate-700">{dados.remarcacao || 'Normal'}</span></p>
            </div>
          </div>
        </div>
      );
    }

    // E16: Busca por RG
    case 'E16': {
      const registros = dados.registros || [];
      return (
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-800">
              Registros Vinculados ao RG ({registros.length})
            </span>
            <span className="font-mono text-slate-500">RG: {dados.rg_pesquisado || identifier}</span>
          </div>
          {registros.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              Nenhum registro localizado para este RG.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {registros.map((r: any, idx: number) => (
                <div key={idx} className="p-3.5 flex flex-wrap items-center justify-between hover:bg-slate-50 text-xs gap-2">
                  <div>
                    <span className="font-bold text-slate-900 block">{r.nome}</span>
                    <span className="text-slate-400 font-mono text-[11px]">Nascimento: {r.data_nascimento || '-'}</span>
                  </div>
                  <div className="flex items-center space-x-3 font-mono">
                    <span className="text-slate-600">CPF: <strong className="text-slate-900">{formatDocumento(r.cpf || '')}</strong></span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">UF: {r.uf || '-'}</span>
                  </div>
                </div>
              ))}
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
