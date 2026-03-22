import { TrendingUp, TrendingDown } from 'lucide-react';
import { formatCurrency, formatPercent, getPriceChangeColor } from '../../lib/utils';

export const StatCard = ({ 
  title, 
  value, 
  change, 
  icon: Icon, 
  format = 'currency',
  subtitle 
}) => {
  const formattedValue = format === 'currency' ? formatCurrency(value, true) : 
                         format === 'percent' ? formatPercent(value) : 
                         value;

  const isPositive = change >= 0;

  return (
    <div className="bg-[#0A0A0C] border border-white/10 rounded-xl p-6 transition-all duration-300 hover:border-white/20" data-testid="stat-card">
      <div className="flex items-start justify-between mb-4">
        <span className="text-xs uppercase tracking-[0.2em] text-white/50">{title}</span>
        {Icon && (
          <div className="p-2 rounded-lg bg-white/5">
            <Icon className="w-4 h-4 text-[#007AFF]" />
          </div>
        )}
      </div>
      
      <div className="mb-2">
        <span className="font-heading font-bold text-2xl sm:text-3xl text-white">
          {formattedValue}
        </span>
      </div>
      
      {change !== undefined && (
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1 text-sm font-mono ${getPriceChangeColor(change)}`}>
            {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            {formatPercent(change)}
          </span>
          {subtitle && <span className="text-xs text-zinc-500">{subtitle}</span>}
        </div>
      )}
    </div>
  );
};
