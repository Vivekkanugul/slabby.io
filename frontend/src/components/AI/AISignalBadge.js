import { Sparkles, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { getSignalColor, getSignalBgColor } from '../../lib/utils';

export const AISignalBadge = ({ signal, confidence, size = 'md' }) => {
  const upperSignal = signal?.toUpperCase() || 'HOLD';
  
  const getIcon = () => {
    if (upperSignal.includes('BUY')) return TrendingUp;
    if (upperSignal.includes('SELL')) return TrendingDown;
    return Minus;
  };

  const Icon = getIcon();
  
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs gap-1',
    md: 'px-3 py-1.5 text-sm gap-1.5',
    lg: 'px-4 py-2 text-base gap-2',
  };

  return (
    <div 
      className={`inline-flex items-center rounded-full font-medium border ${sizeClasses[size]} ${getSignalBgColor(signal)} ${getSignalColor(signal)}`}
      data-testid="ai-signal-badge"
    >
      <Sparkles className={size === 'sm' ? 'w-3 h-3' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4'} />
      <Icon className={size === 'sm' ? 'w-3 h-3' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4'} />
      <span>{upperSignal}</span>
      {confidence && (
        <span className="opacity-70 font-mono">
          {Math.round(confidence * 100)}%
        </span>
      )}
    </div>
  );
};
