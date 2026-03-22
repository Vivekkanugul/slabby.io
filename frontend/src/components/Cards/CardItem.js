import { Link } from 'react-router-dom';
import { TrendingUp, TrendingDown, Sparkles } from 'lucide-react';
import { formatCurrency, formatPercent, getPriceChangeColor } from '../../lib/utils';

export const CardItem = ({ card, showPrediction = false }) => {
  const isPositive = card.price_change_pct >= 0;

  return (
    <Link
      to={`/card/${card.id}`}
      data-testid={`card-item-${card.id}`}
      className="group block"
    >
      <div className="bg-[#111116] border border-white/5 rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-2 hover:border-white/20 hover:shadow-xl hover:shadow-[#007AFF]/5">
        {/* Card Image */}
        <div className="relative aspect-[3/4] overflow-hidden bg-[#0A0A0C]">
          <img
            src={card.image_url}
            alt={card.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          
          {/* Holographic overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          
          {/* Rarity badge */}
          <div className="absolute top-3 left-3">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              card.rarity === 'Legendary' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
              card.rarity === 'Ultra Rare' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
              card.rarity === 'Rare' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
              'bg-zinc-500/20 text-zinc-400 border border-zinc-500/30'
            }`}>
              {card.rarity}
            </span>
          </div>

          {/* Price change badge */}
          <div className="absolute top-3 right-3">
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-mono font-medium ${
              isPositive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
            }`}>
              {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {formatPercent(card.price_change_pct)}
            </span>
          </div>

          {/* AI prediction indicator */}
          {showPrediction && (
            <div className="absolute bottom-3 right-3">
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 pulse-ai">
                <Sparkles className="w-3 h-3" />
                AI
              </span>
            </div>
          )}
        </div>

        {/* Card Info */}
        <div className="p-4">
          <div className="mb-2">
            <span className="text-xs uppercase tracking-wider text-zinc-500">{card.category}</span>
          </div>
          
          <h3 className="font-medium text-white mb-1 line-clamp-2 leading-tight group-hover:text-[#007AFF] transition-colors">
            {card.name}
          </h3>
          
          <p className="text-sm text-zinc-400 mb-3">{card.player_name}</p>
          
          <div className="flex items-end justify-between">
            <div>
              <span className="text-xs text-zinc-500 block mb-1">Current Price</span>
              <span className="font-heading font-bold text-lg text-white">
                {formatCurrency(card.current_price, true)}
              </span>
            </div>
            
            <div className="text-right">
              <span className="text-xs text-zinc-500 block mb-1">Grade</span>
              <span className="font-mono text-sm text-zinc-300">{card.grade}</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
};
