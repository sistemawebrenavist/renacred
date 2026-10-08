import React, { useEffect } from 'react';
import { X, Shield } from 'lucide-react';
import { E20PreVistoriaLaudo } from '../consultas/LaudoPericialUniversal';
import { ExportPdfE20Button } from './ExportPdfE20Button';

interface E20ModalProps {
  isOpen: boolean;
  onClose: () => void;
  dados: any;
  identifier: string;
  hash?: string;
  consultadoEm?: string;
}

export const E20Modal: React.FC<E20ModalProps> = ({
  isOpen,
  onClose,
  dados,
  identifier,
  hash,
  consultadoEm
}) => {
  // Fecha no ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Bloqueia scroll do body enquanto aberto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen || !dados) return null;

  const veiculo = dados?.veiculo || {};
  const placa = veiculo.placa || identifier;
  const modelo = veiculo.marcaModelo || `${veiculo.marca || ''} ${veiculo.modelo || ''}`.trim() || 'Veículo';

  const formatPlaca = (val?: string) => {
    if (!val) return '-';
    const clean = String(val).replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    if (clean.length === 7) return `${clean.slice(0, 3)}-${clean.slice(3)}`;
    return clean;
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white border border-slate-300 rounded-xl shadow-2xl flex flex-col w-full max-w-6xl max-h-[92vh] overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Cabeçalho de Controle do Modal */}
        <div className="bg-white border-b border-slate-200 px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 rounded text-xs font-mono font-bold bg-slate-900 text-white tracking-wider">
              {formatPlaca(placa)}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 leading-none">
                  {modelo}
                </h3>
                <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 uppercase tracking-wider">
                  Produto E20 • Pré-Vistoria
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Laudo pericial consolidado de procedência e indicadores de risco
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <ExportPdfE20Button
              dados={dados}
              identifier={placa}
              hash={hash}
              consultadoEm={consultadoEm}
            />

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer border border-transparent hover:border-slate-200"
              title="Fechar (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Corpo com Scroll Independente e Alta Densidade de Informação */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/40">
          <E20PreVistoriaLaudo
            dados={dados}
            identifier={identifier}
          />
        </div>

        {/* Rodapé Sóbrio do Modal */}
        <div className="bg-slate-50 border-t border-slate-200 px-5 py-2.5 flex items-center justify-between text-[11px] text-slate-500 shrink-0">
          <span className="font-mono">
            Autenticação Digital: {hash || 'Certidão Oficial Renacred'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-2.5 py-1 rounded hover:bg-slate-200/60 transition cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
