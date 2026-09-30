import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RotateCcw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[Renacred ErrorBoundary] Erro capturado na interface:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/dashboard';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-8 max-w-lg w-full shadow-lg space-y-6 text-center">
            <div className="w-14 h-14 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-center mx-auto text-rose-600">
              <AlertCircle className="w-7 h-7" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                {this.props.fallbackTitle || 'Ocorreu um erro ao carregar esta tela'}
              </h2>
              <p className="text-xs text-slate-600 leading-relaxed">
                Um problema inesperado impediu a renderização correta desta página. Nossos serviços permanecem operacionais.
              </p>
            </div>

            {this.state.error?.message && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-left overflow-x-auto">
                <span className="text-[10px] text-slate-400 font-semibold uppercase block mb-1">
                  Detalhes Técnicos:
                </span>
                <p className="text-[11px] font-mono text-rose-700 font-medium whitespace-pre-wrap break-all">
                  {this.state.error.message}
                </p>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition flex items-center cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                Recarregar Página
              </button>
              <button
                type="button"
                onClick={this.handleGoHome}
                className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold shadow-xs transition flex items-center cursor-pointer"
              >
                <Home className="w-3.5 h-3.5 mr-1.5" />
                Ir para o Início
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
