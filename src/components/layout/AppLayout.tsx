import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export const AppLayout: React.FC = () => {
  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 print:bg-white print:block">
      <div className="print:hidden">
        <Sidebar />
      </div>
      <div className="flex-1 flex flex-col min-w-0 print:block print:w-full">
        <div className="print:hidden">
          <Header />
        </div>
        <main className="flex-1 p-8 overflow-y-auto print:p-0 print:m-0 print:overflow-visible print:w-full print:max-w-none">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
