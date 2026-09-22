import React, { useState, useEffect } from 'react';
import { 
  Wallet, 
  PlusCircle, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Clock, 
  FileText, 
  CheckCircle2, 
  AlertCircle,
  Calendar,
  CreditCard
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';

export default function ExtratoFinanceiro() {
  const { user } = useAuth();
  const company = user?.company;
  const isPrePaid = company?.accountType === 'PRE_PAID';

  const [activeTab, setActiveTab] = useState<'extrato' | 'faturas'>('extrato');
  const [transactions, setTransactions] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal de Recarga
  const [showRechargeModal, setShowRechargeModal] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState<number>(100);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [generatingPayment, setGeneratingPayment] = useState(false);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'extrato') {
        const res = await api.get('/api/payment/transactions?limit=50');
        if (res.data?.success) setTransactions(res.data.data);
      } else {
        const res = await api.get('/api/payment/invoices');
        if (res.data?.success) setInvoices(res.data.data);
      }
    } catch (err) {
      console.error('Erro ao buscar dados financeiros:', err);
    } finally {
      setLoading(false);
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
        toast.success('Link de pagamento Pix gerado! Redirecionando para o checkout...');
        window.location.href = response.data.data.checkoutUrl;
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao gerar pagamento.');
    } finally {
      setGeneratingPayment(false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Topo / Card de Resumo Financeiro */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-8 shadow-xs flex flex-wrap items-center justify-between gap-6">
        <div>
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Situação Financeira</span>
          <div className="flex items-center space-x-4 mt-2">
            {isPrePaid ? (
              <div>
                <span className="text-3xl font-extrabold text-slate-900 font-mono">
                  R$ {Number(company?.creditsBalance || 0).toFixed(2)}
                </span>
                <p className="text-xs text-emerald-700 font-medium mt-1 flex items-center">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                  Saldo disponível para consultas
                </p>
              </div>
            ) : (
              <div>
                <span className="text-3xl font-extrabold text-blue-700 font-mono">
                  Pós-pago
                </span>
                <p className="text-xs text-slate-500 font-medium mt-1 flex items-center">
                  <Calendar className="w-3.5 h-3.5 mr-1 text-blue-600" />
                  Faturamento mensal com vencimento no dia {company?.billingDueDate || 10}
                </p>
              </div>
            )}
          </div>
        </div>

        {isPrePaid && (
          <button
            onClick={() => setShowRechargeModal(true)}
            className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold px-6 py-3 rounded-2xl text-sm flex items-center shadow-xs transition"
          >
            <PlusCircle className="w-4 h-4 mr-2" />
            Adicionar Saldo via Pix
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('extrato')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
            activeTab === 'extrato'
              ? 'bg-blue-50 text-blue-700 border border-blue-200'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          Extrato de Movimentações
        </button>
        {!isPrePaid && (
          <button
            onClick={() => setActiveTab('faturas')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
              activeTab === 'faturas'
                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Faturas Mensais do Ciclo
          </button>
        )}
      </div>

      {/* Conteúdo da Tab */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400">Carregando dados financeiros...</div>
        ) : activeTab === 'extrato' ? (
          transactions.length === 0 ? (
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
                    <th className="py-3 px-4 text-right">Data</th>
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
                            {tx.type}
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
          )
        ) : (
          invoices.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              Nenhuma fatura fechada no momento. Suas consultas estão sendo acumuladas para o próximo vencimento.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-slate-500 uppercase tracking-wider border-b border-slate-200 bg-slate-50/50">
                  <tr>
                    <th className="py-3 px-4">Ciclo de Consumo</th>
                    <th className="py-3 px-4">Vencimento</th>
                    <th className="py-3 px-4">Consultas</th>
                    <th className="py-3 px-4">Total</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 text-slate-900 font-medium">
                        {new Date(inv.cycleStart).toLocaleDateString('pt-BR')} até{' '}
                        {new Date(inv.cycleEnd).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900 font-mono">
                        {new Date(inv.dueDate).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="py-3 px-4 text-slate-600">{inv.totalQueries} consultas</td>
                      <td className="py-3 px-4 font-bold text-slate-900 font-mono">
                        R$ {Number(inv.totalAmount).toFixed(2)}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          {inv.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {inv.checkoutUrl ? (
                          <a
                            href={inv.checkoutUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
                          >
                            Pagar Fatura Pix &rarr;
                          </a>
                        ) : (
                          <span className="text-slate-400">Em processamento</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>

      {/* Modal de Recarga Pix */}
      {showRechargeModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-3xl p-8 max-w-md w-full shadow-xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-lg font-bold text-slate-900 flex items-center">
                <Wallet className="w-5 h-5 mr-2 text-blue-600" />
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
              Selecione um pacote de créditos para recarga imediata. O saldo é liberado automaticamente após a confirmação do Pix pela credenciadora.
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
                      ? 'bg-blue-50 border-blue-600 text-blue-700 shadow-xs'
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
                className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600/20 font-mono"
              />
            </div>

            <button
              onClick={handleGenerateCheckout}
              disabled={generatingPayment}
              className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold py-3.5 rounded-2xl text-sm transition shadow-xs disabled:opacity-50"
            >
              {generatingPayment ? 'Gerando Link de Pagamento...' : 'Prosseguir para o Pix'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
