import React from 'react';

interface RenacredLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'full' | 'compact';
  badge?: boolean;
}

export const RenacredLogo: React.FC<RenacredLogoProps> = ({
  className = '',
  size = 'md',
  badge = true,
}) => {
  const heightClasses = {
    sm: 'h-7',
    md: 'h-9',
    lg: 'h-12',
    xl: 'h-16',
  };

  const image = (
    <img
      src="/logo-semfundo.png"
      alt="Renacred - Rede Nacional de Proteção ao Crédito"
      className={`${heightClasses[size]} w-auto object-contain`}
    />
  );

  if (!badge) {
    return <div className={`inline-flex items-center ${className}`}>{image}</div>;
  }

  return (
    <div className={`inline-flex items-center ${className}`}>
      <div className="bg-white rounded-xl px-3.5 py-2 shadow-sm border border-slate-200/50 inline-flex items-center justify-center transition-all hover:shadow-md">
        {image}
      </div>
    </div>
  );
};
