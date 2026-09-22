import React from 'react';

export const DeclaracaoSkeleton: React.FC = () => {
  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs animate-pulse">
      {/* Topo do Card Skeleton */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-slate-200" />
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <div className="h-4 w-48 bg-slate-200 rounded-md" />
              <div className="h-4 w-16 bg-slate-100 rounded-md" />
            </div>
            <div className="h-3 w-28 bg-slate-100 rounded-md" />
          </div>
        </div>

        <div className="h-7 w-36 bg-slate-100 rounded-lg" />
      </div>

      {/* Dados do Imóvel & Cartório Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 py-4 my-1">
        <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-100 space-y-2">
          <div className="h-3 w-16 bg-slate-200 rounded-sm" />
          <div className="h-4 w-28 bg-slate-200 rounded-md" />
        </div>

        <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-100 space-y-2">
          <div className="h-3 w-24 bg-slate-200 rounded-sm" />
          <div className="h-4 w-32 bg-slate-200 rounded-md" />
        </div>

        <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-100 md:col-span-2 space-y-2">
          <div className="h-3 w-28 bg-slate-200 rounded-sm" />
          <div className="h-4 w-3/4 bg-slate-200 rounded-md" />
          <div className="h-3 w-1/2 bg-slate-100 rounded-sm" />
        </div>
      </div>

      {/* Partes: Alienantes e Adquirentes Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-slate-100">
        <div className="space-y-2.5">
          <div className="h-3.5 w-36 bg-slate-200 rounded-md" />
          <div className="bg-slate-50/70 p-3 rounded-lg border border-slate-100 space-y-1.5">
            <div className="h-3.5 w-40 bg-slate-200 rounded-md" />
            <div className="h-3 w-28 bg-slate-100 rounded-sm" />
          </div>
        </div>

        <div className="space-y-2.5">
          <div className="h-3.5 w-36 bg-slate-200 rounded-md" />
          <div className="bg-slate-50/70 p-3 rounded-lg border border-slate-100 space-y-1.5">
            <div className="h-3.5 w-40 bg-slate-200 rounded-md" />
            <div className="h-3 w-28 bg-slate-100 rounded-sm" />
          </div>
        </div>
      </div>
    </div>
  );
};
