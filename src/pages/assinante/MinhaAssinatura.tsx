import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { 
  CreditCard, 
  Calendar, 
  Wallet, 
  Activity, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  ExternalLink,
  MessageCircle, 
  Building2,
  Receipt,
  RotateCw
} from 'lucide-react';
import { toast } from 'sonner';
import api from '../../services/api';

export default function MinhaAssinatura() {
  const [searchParams] = useSearchParams();
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [payingInvoiceId, setPayingInvoiceId] = useState<string | null>(null);

  const fetchSubscription = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/pagamentos/subscription');
      if (res.data?.success) {
        setData(res.data.data);
      }
    } catch (err: any) {
      console.error('Erro ao buscar dados da assinatura:', err);
      toast.error('Erro ao carregar dados da assinatura.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscription();
    if (searchParams.get('paid') === 'true') {
      toast.success('Retorno de pagamento identificado. O status será atualizado após a confirmação bancária.');
    }
  }, [searchParams]);

  const handlePayInvoice = async (invoiceId: string) => {
    setPayingInvoiceId(invoiceId);
    try {
      const res = await api.post(`/api/pagamentos/invoices/${invoiceId}/pay`);
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

  const company = data?.company;
  const cycle = data?.currentCycle;
  const isPostPaid = company?.accountType === 'POST_PAID';

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Cabeçalho */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-8 shadow-xs">
        <div className="flex items-center space-x-2 text-[#1D4ED8] text-xs font-bold uppercase tracking-wider mb-2">
          <CreditCard className="w-4 h-4" />
          <span>Contrato & Faturamento</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Minha Assinatura
        </h2>
        <p className="text-slate-500 text-xs mt-1">
          Acompanhe seu plano vigente, tarifas de consulta, limites operacionais e faturas mensais.
        </p>
      </div>

      {loading ? (
        <div className="py-20 text-center text-xs text-slate-400">Carregando detalhes do seu plano...</div>
      ) : (
        <>
          {/* Cards de Métricas e Indicadores do Plano */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Modalidade */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase mb-2">
                <span>Modalidade Ativa</span>
                <CreditCard className="w-4 h-4 text-[#1D4ED8]" />
              </div>
              <p className="text-2xl font-bold text-slate-900">
                {isPostPaid ? 'Pós-pago' : 'Pré-pago'}
              </p>
              <span className="text-xs text-slate-500 mt-2 block font-medium">
                {isPostPaid ? 'Faturamento mensal' : 'Consumo com saldo prévio'}
              </span>
            </div>

            {/* Tarifa Vigente */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase mb-2">
                <span>Tarifa por Consulta</span>
                <Receipt className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-2xl font-bold text-emerald-700 font-mono">
                R$ {Number(company?.effectivePrice || 5).toFixed(2)}
              </p>
              <span className="text-xs text-slate-500 mt-2 block">
                Valor unitário por CPF/CNPJ
              </span>
            </div>

            {/* Limite ou Saldo */}
            {isPostPaid ? (
              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
                <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase mb-2">
                  <span>Limite de Crédito</span>
                  <Wallet className="w-4 h-4 text-blue-600" />
                </div>
                <p className="text-2xl font-bold text-slate-900 font-mono">
                  {company?.creditLimit > 0 ? `R$ ${company.creditLimit.toFixed(2)}` : 'Ilimitado'}
                </p>
                <div className="mt-2 text-xs text-slate-500">
                  Consumido: R$ {Number(cycle?.totalSpent || 0).toFixed(2)} ({cycle?.limitUsagePercent || 0}%)
                </div>
              </div>
            ) : (
              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
                <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase mb-2">
                  <span>Saldo Disponível</span>
                  <Wallet className="w-4 h-4 text-emerald-600" />
                </div>
                <p className="text-2xl font-bold text-slate-900 font-mono">
                  R$ {Number(company?.creditsBalance || 0).toFixed(2)}
                </p>
                <Link to="/extrato" className="text-xs text-[#1D4ED8] hover:underline mt-2 block font-medium">
                  + Recarregar créditos via Pix
                </Link>
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
          {isPostPaid && (
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Consumo no Ciclo Vigente
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Período ativo de {new Date(cycle.cycleStart).toLocaleDateString('pt-BR')} até {new Date(cycle.cycleEnd).toLocaleDateString('pt-BR')} (Vencimento em {new Date(cycle.dueDate).toLocaleDateString('pt-BR')})
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-500 block">Previsão da Fatura</span>
                  <span className="text-xl font-bold text-slate-900 font-mono">
                    R$ {Number(cycle.totalSpent).toFixed(2)}
                  </span>
                </div>
              </div>

              {company.creditLimit > 0 && (
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

          {/* Histórico de Faturas */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
            <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center">
              <Receipt className="w-4 h-4 mr-2 text-[#1D4ED8]" />
              Faturas Mensais
            </h3>

            {!data?.invoices || data.invoices.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                Nenhuma fatura gerada até o momento. As faturas fechadas e do ciclo em aberto aparecerão listadas aqui.
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
                              {payingInvoiceId === inv.id ? 'Gerando...' : 'Pagar Fatura'}
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

          {/* Atendimento e Upgrade de Plano */}
          <div className="bg-gradient-to-r from-blue-50/80 to-slate-50 border border-blue-100 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h4 className="text-sm font-bold text-slate-900">
                Precisa de mais limite ou deseja alterar sua modalidade?
              </h4>
              <p className="text-xs text-slate-600 mt-1">
                Fale com o nosso atendimento corporativo para negociar tarifas diferenciadas por volume ou aumento de limite.
              </p>
            </div>
            <a
              href="https://wa.me/5547999999999?text=Ol%C3%A1%2C%20gostaria%20de%20solicitar%20um%20upgrade%20no%20meu%20plano%20Renacred."
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-xs font-semibold px-5 py-2.5 rounded-xl inline-flex items-center transition shadow-xs shrink-0"
            >
              <MessageCircle className="w-4 h-4 mr-1.5" />
              Falar com Suporte
            </a>
          </div>
        </>
      )}
    </div>
  );
}
