import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  CreditCard, 
  Calendar, 
  Wallet, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  ExternalLink,
  MessageCircle, 
  Receipt,
  PlusCircle,
  ArrowDownLeft,
  ArrowUpRight,
  RotateCw,
  Building2,
  HelpCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';

export default function MinhaAssinatura() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // Abas: extrato | faturas | plano
  const activeTab = searchParams.get('tab') || 'extrato';

  const [data, setData] = useState<any | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingTransactions, setLoadingTransactions] = useState(false);

  // Pagamento de fatura
  const [payingInvoiceId, setPayingInvoiceId] = useState<string | null>(null);

  // Modal de Recarga Pix (para pré-pago)
  const [showRechargeModal, setShowRechargeModal] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState<number>(100);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [generatingPayment, setGeneratingPayment] = useState(false);

  const setTab = (tab: 'extrato' | 'faturas' | 'plano') => {
    setSearchParams({ tab });
  };

  const fetchSubscription = async () => {
    try {
      const res = await api.get('/api/payment/subscription');
      if (res.data?.success) {
        setData(res.data.data);
      }
    } catch (err: any) {
      console.error('Erro ao buscar dados da assinatura:', err);
    }
  };

  const fetchTransactions = async () => {
    setLoadingTransactions(true);
    try {
      const res = await api.get('/api/payment/transactions?limit=50');
      if (res.data?.success) {
        setTransactions(res.data.data);
      }
    } catch (err: any) {
      console.error('Erro ao buscar transações:', err);
    } finally {
      setLoadingTransactions(false);
    }
  };

  const loadAll = async () => {
    setLoading(true);
    await Promise.all([fetchSubscription(), fetchTransactions()]);
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
    if (searchParams.get('paid') === 'true') {
      toast.success('Retorno de pagamento identificado. O saldo ou fatura será atualizado após a confirmação bancária.');
    }
  }, [searchParams]);

  const handlePayInvoice = async (invoiceId: string) => {
    setPayingInvoiceId(invoiceId);
    try {
      const res = await api.post(`/api/payment/invoices/${invoiceId}/pay`);
      if (res.data?.success && res.data.data?.checkoutUrl) {
        window.location.href = res.data.data.checkoutUrl;
      } else {
        toast.error('Não foi possível gerar o link de pagamento da fatura.');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erro ao processar pagamento da fatura.');
    } finally {
      setPayingInvoiceId(null);
    }
  };

  const handleGenerateCheckout = async () => {
    const finalAmount = customAmount ? parseFloat(customAmount) : rechargeAmount;
    if (isNaN(finalAmount) || finalAmount < 20) {
      toast.error('O valor mínimo para recarga é de R$ 20,00.');
      return;
    }

    setGeneratingPayment(true);
    try {
      const response = await api.post('/api/payment/recharge', { amount: finalAmount });
      if (response.data?.success && response.data.data?.checkoutUrl) {
        toast.success('Link de pagamento Pix gerado! Redirecionando para o checkout seguro...');
        window.location.href = response.data.data.checkoutUrl;
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao gerar pagamento.');
    } finally {
      setGeneratingPayment(false);
    }
  };

  const company = data?.company || user?.company;
  const cycle = data?.currentCycle;
  const isPostPaid = company?.accountType === 'POST_PAID';
  const effectivePrice = Number(company?.effectivePrice || company?.customQueryPrice || 5.00);
  const creditsBalance = Number(company?.creditsBalance || 0);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Cabeçalho Unificado */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center space-x-2 text-[#1D4ED8] text-xs font-bold uppercase tracking-wider mb-2">
            <CreditCard className="w-4 h-4" />
            <span>Faturamento & Assinatura</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Minha Assinatura & Saldo
          </h2>
          <p className="text-slate-500 text-xs mt-1">
            Acompanhe seu plano vigente, extrato detalhado de consumo, saldo de créditos e faturas mensais.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={loadAll}
            title="Atualizar dados"
            className="p-2.5 text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition shadow-xs"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          {!isPostPaid ? (
            <button
              onClick={() => setShowRechargeModal(true)}
              className="bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-xs font-semibold px-5 py-2.5 rounded-xl inline-flex items-center transition shadow-xs"
            >
              <PlusCircle className="w-4 h-4 mr-1.5" />
              Adicionar Saldo Pix
            </button>
          ) : (
            <div className="px-4 py-2 bg-blue-50 border border-blue-200/80 rounded-xl text-xs text-blue-900 font-semibold flex items-center shadow-xs">
              <Calendar className="w-3.5 h-3.5 mr-1.5 text-[#1D4ED8]" />
              Faturamento no dia {company?.billingDueDate || 10}
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-xs text-slate-400">Carregando detalhes do seu plano e faturamento...</div>
      ) : (
        <>
          {/* Cards de Métricas e Indicadores Principais */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Modalidade */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase mb-2">
                <span>Modalidade</span>
                <CreditCard className="w-4 h-4 text-[#1D4ED8]" />
              </div>
              <p className="text-2xl font-bold text-slate-900">
                {isPostPaid ? 'Pós-pago' : 'Pré-pago'}
              </p>
              <span className="text-xs text-slate-500 mt-2 block font-medium">
                {isPostPaid ? 'Faturamento mensal consolidado' : 'Consumo mediante saldo prévio'}
              </span>
            </div>

            {/* Tarifa Vigente */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase mb-2">
                <span>Tarifa por Consulta</span>
                <Receipt className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-2xl font-bold text-emerald-700 font-mono">
                R$ {effectivePrice.toFixed(2)}
              </p>
              <span className="text-xs text-slate-500 mt-2 block">
                Valor unitário por CPF/CNPJ
              </span>
            </div>

            {/* Saldo ou Limite */}
            {isPostPaid ? (
              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
                <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase mb-2">
                  <span>Limite Operacional</span>
                  <Wallet className="w-4 h-4 text-blue-600" />
                </div>
                <p className="text-2xl font-bold text-slate-900 font-mono">
                  {company?.creditLimit && company.creditLimit > 0 && company.creditLimit < 999999
                    ? `R$ ${company.creditLimit.toFixed(2)}`
                    : 'Ilimitado'}
                </p>
                <div className="mt-2 text-xs text-slate-500">
                  Consumido no ciclo: R$ {Number(cycle?.totalSpent || 0).toFixed(2)} ({cycle?.limitUsagePercent || 0}%)
                </div>
              </div>
            ) : (
              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
                <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase mb-2">
                  <span>Saldo Disponível</span>
                  <Wallet className="w-4 h-4 text-emerald-600" />
                </div>
                <p className="text-2xl font-bold text-slate-900 font-mono">
                  R$ {creditsBalance.toFixed(2)}
                </p>
                <button
                  onClick={() => setShowRechargeModal(true)}
                  className="text-xs text-[#1D4ED8] hover:underline mt-2 block font-semibold text-left"
                >
                  + Recarregar créditos via Pix
                </button>
              </div>
            )}

            {/* Ciclo / Vencimento */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase mb-2">
                <span>Vencimento Mensal</span>
                <Calendar className="w-4 h-4 text-amber-600" />
              </div>
              <p className="text-2xl font-bold text-slate-900">
                Dia {company?.billingDueDate || 10}
              </p>
              <span className="text-xs text-slate-500 mt-2 block">
                {isPostPaid ? 'Fechamento do ciclo vigente' : 'Data de renovação cadastral'}
              </span>
            </div>
          </div>

          {/* Consumo em Tempo Real no Ciclo Vigente (Pós-pago) */}
          {isPostPaid && cycle && (
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Consumo no Ciclo Vigente
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Período de {new Date(cycle.cycleStart).toLocaleDateString('pt-BR')} até {new Date(cycle.cycleEnd).toLocaleDateString('pt-BR')} (Vencimento da fatura: {new Date(cycle.dueDate).toLocaleDateString('pt-BR')})
                  </p>
                </div>
                <div className="text-left sm:text-right">
                  <span className="text-xs text-slate-500 block">Previsão da Fatura</span>
                  <span className="text-xl font-bold text-slate-900 font-mono">
                    R$ {Number(cycle.totalSpent || 0).toFixed(2)}
                  </span>
                  <span className="text-[11px] text-slate-400 block mt-0.5">
                    ({cycle.totalQueries || 0} consultas realizadas)
                  </span>
                </div>
              </div>

              {company?.creditLimit > 0 && company.creditLimit < 999999 && (
                <div className="mt-4">
                  <div className="flex justify-between text-xs text-slate-600 mb-1.5 font-medium">
                    <span>Uso do limite contratado</span>
                    <span>{cycle.limitUsagePercent}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        cycle.limitUsagePercent > 85 ? 'bg-rose-600' : 'bg-[#1D4ED8]'
                      }`}
                      style={{ width: `${Math.min(100, cycle.limitUsagePercent)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Abas Unificadas: Extrato & Saldo | Faturas Mensais | Regras do Plano */}
          <div className="space-y-4">
            <div className="flex space-x-2 border-b border-slate-200 pb-2">
              <button
                onClick={() => setTab('extrato')}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center ${
                  activeTab === 'extrato'
                    ? 'bg-blue-50 text-[#1D4ED8] border border-blue-200'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <Wallet className="w-3.5 h-3.5 mr-1.5" />
                Extrato de Consumo & Saldo
              </button>

              <button
                onClick={() => setTab('faturas')}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center ${
                  activeTab === 'faturas'
                    ? 'bg-blue-50 text-[#1D4ED8] border border-blue-200'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <Receipt className="w-3.5 h-3.5 mr-1.5" />
                Faturas Mensais
              </button>

              <button
                onClick={() => setTab('plano')}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center ${
                  activeTab === 'plano'
                    ? 'bg-blue-50 text-[#1D4ED8] border border-blue-200'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <Building2 className="w-3.5 h-3.5 mr-1.5" />
                Regras & Dados do Plano
              </button>
            </div>

            {/* Conteúdo da Aba 1: Extrato de Consumo */}
            {activeTab === 'extrato' && (
              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Extrato de Movimentações</h3>
                    <p className="text-xs text-slate-500">
                      Histórico detalhado de consultas imobiliárias realizadas e recargas de saldo.
                    </p>
                  </div>
                  {!isPostPaid && (
                    <button
                      onClick={() => setShowRechargeModal(true)}
                      className="text-xs font-semibold text-[#1D4ED8] hover:text-[#1E40AF] flex items-center"
                    >
                      <PlusCircle className="w-3.5 h-3.5 mr-1" />
                      Recarregar via Pix
                    </button>
                  )}
                </div>

                {loadingTransactions ? (
                  <div className="py-12 text-center text-xs text-slate-400">Carregando movimentações...</div>
                ) : transactions.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-400">
                    Nenhuma movimentação financeira registrada até o momento.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="text-slate-500 uppercase tracking-wider border-b border-slate-200 bg-slate-50/50">
                        <tr>
                          <th className="py-3 px-4">Tipo</th>
                          <th className="py-3 px-4">Descrição</th>
                          <th className="py-3 px-4">Valor</th>
                          <th className="py-3 px-4">Saldo Após</th>
                          <th className="py-3 px-4 text-right">Data & Hora</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {transactions.map((tx) => {
                          const isCredit = tx.type === 'RECHARGE' || tx.type === 'MANUAL_ADJUSTMENT';
                          return (
                            <tr key={tx.id} className="hover:bg-slate-50/80 transition">
                              <td className="py-3 px-4">
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                                    isCredit
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      : 'bg-slate-100 text-slate-700 border border-slate-200'
                                  }`}
                                >
                                  {isCredit ? (
                                    <ArrowDownLeft className="w-3 h-3 mr-1 text-emerald-600" />
                                  ) : (
                                    <ArrowUpRight className="w-3 h-3 mr-1 text-slate-500" />
                                  )}
                                  {tx.type === 'QUERY_DEBIT' ? 'CONSULTA' : tx.type === 'RECHARGE' ? 'RECARGA' : tx.type}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-slate-900 font-medium">{tx.description}</td>
                              <td
                                className={`py-3 px-4 font-bold font-mono ${
                                  isCredit ? 'text-emerald-700' : 'text-slate-900'
                                }`}
                              >
                                {isCredit ? '+' : '-'} R$ {Number(tx.amount).toFixed(2)}
                              </td>
                              <td className="py-3 px-4 text-slate-600 font-mono">
                                R$ {Number(tx.balance).toFixed(2)}
                              </td>
                              <td className="py-3 px-4 text-right text-slate-500">
                                {new Date(tx.createdAt).toLocaleString('pt-BR')}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Conteúdo da Aba 2: Faturas Mensais */}
            {activeTab === 'faturas' && (
              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Faturas Mensais</h3>
                  <p className="text-xs text-slate-500">
                    Histórico de cobranças consolidadas por competência mensal e links para quitação.
                  </p>
                </div>

                {!data?.invoices || data.invoices.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-400">
                    Nenhuma fatura fechada até o momento. Para contas pós-pagas, as faturas são geradas automaticamente no encerramento de cada ciclo.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="text-slate-500 uppercase tracking-wider border-b border-slate-200 bg-slate-50/50">
                        <tr>
                          <th className="py-3 px-4">Competência / Ciclo</th>
                          <th className="py-3 px-4">Vencimento</th>
                          <th className="py-3 px-4 text-center">Consultas</th>
                          <th className="py-3 px-4">Valor Total</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4 text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono">
                        {data.invoices.map((inv: any) => (
                          <tr key={inv.id} className="hover:bg-slate-50/80 transition">
                            <td className="py-3 px-4 font-sans text-slate-900 font-semibold">
                              {new Date(inv.cycleStart).toLocaleDateString('pt-BR')} a {new Date(inv.cycleEnd).toLocaleDateString('pt-BR')}
                            </td>
                            <td className="py-3 px-4 text-slate-700">
                              {new Date(inv.dueDate).toLocaleDateString('pt-BR')}
                            </td>
                            <td className="py-3 px-4 text-center text-slate-800 font-bold">
                              {inv.totalQueries}
                            </td>
                            <td className="py-3 px-4 font-bold text-slate-900">
                              R$ {Number(inv.totalAmount).toFixed(2)}
                            </td>
                            <td className="py-3 px-4 font-sans">
                              {inv.status === 'PAID' ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <CheckCircle2 className="w-3 h-3 mr-1" />
                                  PAGA
                                </span>
                              ) : inv.status === 'OVERDUE' ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                  <AlertCircle className="w-3 h-3 mr-1" />
                                  VENCIDA
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                  <Clock className="w-3 h-3 mr-1" />
                                  EM ABERTO
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right font-sans">
                              {inv.status !== 'PAID' && Number(inv.totalAmount) > 0 && (
                                <button
                                  onClick={() => handlePayInvoice(inv.id)}
                                  disabled={payingInvoiceId === inv.id}
                                  className="inline-flex items-center px-3 py-1 bg-[#1D4ED8] hover:bg-[#1E40AF] text-white rounded-lg text-xs font-medium transition shadow-xs disabled:opacity-60"
                                >
                                  <ExternalLink className="w-3 h-3 mr-1" />
                                  {payingInvoiceId === inv.id ? 'Gerando...' : 'Pagar Fatura Pix'}
                                </button>
                              )}
                              {inv.status === 'PAID' && (
                                <span className="text-slate-400 text-xs">Quitada</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Conteúdo da Aba 3: Regras & Dados do Plano */}
            {activeTab === 'plano' && (
              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-6">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Condições Contratuais do Assinante</h3>
                  <p className="text-xs text-slate-500">
                    Resumo cadastral da empresa e parâmetros da conta vinculada.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <p className="text-slate-500 font-medium">Razão Social / Nome:</p>
                    <p className="font-bold text-slate-900 text-sm">{company?.razaoSocial || user?.name}</p>
                    <p className="text-slate-500 font-medium mt-2">Documento Cadastrado:</p>
                    <p className="font-mono text-slate-700">{company?.cnpjCpf || 'Não informado'}</p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <p className="text-slate-500 font-medium">Política de Faturamento:</p>
                    <p className="font-bold text-slate-900 text-sm">
                      {isPostPaid ? 'Faturamento Pós-pago Consolidado' : 'Consumo Pré-pago via Créditos Pix'}
                    </p>
                    <p className="text-slate-500 font-medium mt-2">Serviço de Consulta:</p>
                    <p className="text-slate-700">Histórico Imobiliário Nacional (Cartórios & DOI)</p>
                  </div>
                </div>

                {/* Atendimento e Upgrade de Plano */}
                <div className="bg-gradient-to-r from-blue-50/80 to-slate-50 border border-blue-100 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      Precisa de aumento de limite ou negociação de tarifas por volume?
                    </h4>
                    <p className="text-xs text-slate-600 mt-1">
                      Fale com o nosso atendimento corporativo para negociar planos customizados para a sua empresa.
                    </p>
                  </div>
                  <a
                    href="https://wa.me/5547999999999?text=Ol%C3%A1%2C%20gostaria%20de%20solicitar%20um%20upgrade%20no%20meu%20plano%20Renacred."
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-xs font-semibold px-5 py-2.5 rounded-xl inline-flex items-center transition shadow-xs shrink-0"
                  >
                    <MessageCircle className="w-4 h-4 mr-1.5" />
                    Falar com Atendimento
                  </a>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Modal de Recarga Pix Integrado */}
      {showRechargeModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-3xl p-8 max-w-md w-full shadow-xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-lg font-bold text-slate-900 flex items-center">
                <Wallet className="w-5 h-5 mr-2 text-[#1D4ED8]" />
                Recarga de Saldo Pix
              </h3>
              <button
                onClick={() => setShowRechargeModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Selecione o valor para recarga imediata de créditos. O saldo é disponibilizado automaticamente após a confirmação bancária do Pix.
            </p>

            {/* Pacotes Predefinidos */}
            <div className="grid grid-cols-3 gap-3">
              {[50, 100, 250].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => {
                    setRechargeAmount(val);
                    setCustomAmount('');
                  }}
                  className={`py-3 rounded-2xl border text-sm font-bold transition font-mono ${
                    rechargeAmount === val && !customAmount
                      ? 'bg-blue-50 border-[#1D4ED8] text-[#1D4ED8] shadow-xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  R$ {val}
                </button>
              ))}
            </div>

            {/* Valor Personalizado */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Outro Valor (R$)</label>
              <input
                type="number"
                min="20"
                step="5"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                placeholder="Ex: 150.00"
                className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#1D4ED8] focus:ring-1 focus:ring-[#1D4ED8]/20 font-mono"
              />
              <p className="text-[11px] text-slate-400 mt-1">Valor mínimo: R$ 20,00</p>
            </div>

            <button
              onClick={handleGenerateCheckout}
              disabled={generatingPayment}
              className="w-full bg-[#1D4ED8] hover:bg-[#1E40AF] text-white font-semibold py-3.5 rounded-2xl text-sm transition shadow-xs disabled:opacity-50"
            >
              {generatingPayment ? 'Gerando Link de Pagamento...' : 'Prosseguir para o Pix'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
