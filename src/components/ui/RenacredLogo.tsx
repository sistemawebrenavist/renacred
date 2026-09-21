import React from 'react';

interface RenacredLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'full' | 'compact';
}

export const RenacredLogo: React.FC<RenacredLogoProps> = ({
  className = '',
  size = 'md',
  variant = 'full',
}) => {
  const heightClasses = {
    sm: 'h-8',
    md: 'h-10',
    lg: 'h-14',
    xl: 'h-20',
  };

  return (
    <div className={`inline-flex items-center ${className}`}>
      <div className="bg-white rounded-xl px-2.5 py-1.5 shadow-sm border border-slate-200/40 inline-flex items-center justify-center">
        <img
          src="/logo-renacred.png"
          alt="Renacred - Rede Nacional de Proteção ao Crédito"
          className={`${heightClasses[size]} w-auto object-contain`}
        />
      </div>
    </div>
  );
};
