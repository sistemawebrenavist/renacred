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
      <div className="bg-[#0b1325] border border-slate-800/80 rounded-3xl p-8 shadow-xl flex flex-wrap items-center justify-between gap-6">
        <div>
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Situação Financeira</span>
          <div className="flex items-center space-x-4 mt-2">
            {isPrePaid ? (
              <div>
                <span className="text-3xl font-extrabold text-white font-mono">
                  R$ {(company?.creditsBalance || 0).toFixed(2)}
                </span>
                <p className="text-xs text-emerald-400 font-medium mt-1 flex items-center">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                  Conta Pré-paga (Saldo Disponível)
                </p>
              </div>
            ) : (
              <div>
                <span className="text-3xl font-extrabold text-sky-400 font-mono">
                  Pós-pago
                </span>
                <p className="text-xs text-slate-300 font-medium mt-1 flex items-center">
                  <Calendar className="w-3.5 h-3.5 mr-1 text-sky-400" />
                  Fechamento mensal com vencimento no dia {company?.billingDueDate || 10}
                </p>
              </div>
            )}
          </div>
        </div>

        {isPrePaid && (
          <button
            onClick={() => setShowRechargeModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-2xl text-sm flex items-center shadow-md shadow-blue-600/20 transition"
          >
            <PlusCircle className="w-4 h-4 mr-2" />
            Recarregar Saldo via Pix
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('extrato')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
            activeTab === 'extrato'
              ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Extrato de Movimentações
        </button>
        {!isPrePaid && (
          <button
            onClick={() => setActiveTab('faturas')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
              activeTab === 'faturas'
                ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Faturas Mensais do Ciclo
          </button>
        )}
      </div>

      {/* Conteúdo da Tab */}
      <div className="bg-[#0b1325] border border-slate-800/80 rounded-2xl p-6 shadow-xl">
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-500">Carregando dados financeiros...</div>
        ) : activeTab === 'extrato' ? (
          transactions.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">
              Nenhuma movimentação financeira registrada até o momento.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-slate-400 uppercase tracking-wider border-b border-slate-800/80">
                  <tr>
                    <th className="py-3 px-4">Tipo</th>
                    <th className="py-3 px-4">Descrição</th>
                    <th className="py-3 px-4">Valor</th>
                    <th className="py-3 px-4">Saldo Após</th>
                    <th className="py-3 px-4 text-right">Data</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {transactions.map((tx) => {
                    const isCredit = tx.type === 'RECHARGE' || tx.type === 'MANUAL_ADJUSTMENT';
                    return (
                      <tr key={tx.id} className="hover:bg-slate-800/30 transition">
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                              isCredit
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            }`}
                          >
                            {isCredit ? (
                              <ArrowDownLeft className="w-3 h-3 mr-1" />
                            ) : (
                              <ArrowUpRight className="w-3 h-3 mr-1" />
                            )}
                            {tx.type}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-200">{tx.description}</td>
                        <td
                          className={`py-3 px-4 font-bold font-mono ${
                            isCredit ? 'text-emerald-400' : 'text-slate-300'
                          }`}
                        >
                          {isCredit ? '+' : '-'} R$ {Number(tx.amount).toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-slate-400 font-mono">
                          R$ {Number(tx.balance).toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-400">
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
            <div className="py-12 text-center text-xs text-slate-500">
              Nenhuma fatura fechada no momento. Suas consultas estão sendo acumuladas para o próximo vencimento.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-slate-400 uppercase tracking-wider border-b border-slate-800/80">
                  <tr>
                    <th className="py-3 px-4">Ciclo de Consumo</th>
                    <th className="py-3 px-4">Vencimento</th>
                    <th className="py-3 px-4">Consultas</th>
                    <th className="py-3 px-4">Total</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-800/30 transition">
                      <td className="py-3 px-4 text-slate-200">
                        {new Date(inv.cycleStart).toLocaleDateString('pt-BR')} até{' '}
                        {new Date(inv.cycleEnd).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="py-3 px-4 font-bold text-white">
                        {new Date(inv.dueDate).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="py-3 px-4 text-slate-300">{inv.totalQueries} consultas</td>
                      <td className="py-3 px-4 font-bold text-emerald-400 font-mono">
                        R$ {Number(inv.totalAmount).toFixed(2)}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20">
                          {inv.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {inv.checkoutUrl ? (
                          <a
                            href={inv.checkoutUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs font-semibold text-emerald-400 hover:underline"
                          >
                            Pagar Fatura Pix &rarr;
                          </a>
                        ) : (
                          <span className="text-slate-500">Em processamento</span>
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
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#0b1325] border border-slate-800 rounded-3xl p-8 max-w-md w-full shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="text-lg font-bold text-white flex items-center">
                <Wallet className="w-5 h-5 mr-2 text-blue-500" />
                Recarga de Saldo Pix
              </h3>
              <button
                onClick={() => setShowRechargeModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300">
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
                      ? 'bg-blue-500/10 border-blue-500 text-blue-400'
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  R$ {val}
                </button>
              ))}
            </div>

            {/* Valor Personalizado */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Outro Valor (R$)</label>
              <input
                type="number"
                min="20"
                step="5"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                placeholder="Ex: 150.00"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>

            <button
              onClick={handleGenerateCheckout}
              disabled={generatingPayment}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3.5 rounded-2xl text-sm transition shadow-md shadow-blue-600/20 disabled:opacity-50"
            >
              {generatingPayment ? 'Gerando Link InfinityPay...' : 'Prosseguir para o Pix'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
