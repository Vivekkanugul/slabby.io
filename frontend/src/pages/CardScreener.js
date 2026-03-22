import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getCards } from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Slider } from '../components/ui/slider';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Checkbox } from '../components/ui/checkbox';
import { 
  Search, ArrowLeft, TrendingUp, TrendingDown, Loader2, 
  Filter, SlidersHorizontal, BarChart3, Zap, Target, Star
} from 'lucide-react';
import { formatCurrency, formatPercent, getPriceChangeColor } from '../lib/utils';

export default function CardScreener() {
  const [cards, setCards] = useState([]);
  const [filteredCards, setFilteredCards] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [priceRange, setPriceRange] = useState([0, 10000000]);
  const [momentumFilter, setMomentumFilter] = useState('all'); // all, bullish, bearish
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [volumeMin, setVolumeMin] = useState(0);
  const [sharpeMin, setSharpeMin] = useState(0);
  const [showUndervalued, setShowUndervalued] = useState(false);
  const [showHighMomentum, setShowHighMomentum] = useState(false);
  const [sortBy, setSortBy] = useState('momentum_score');
  const [sortOrder, setSortOrder] = useState('desc');

  useEffect(() => {
    fetchCards();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [cards, priceRange, momentumFilter, categoryFilter, volumeMin, sharpeMin, showUndervalued, showHighMomentum, sortBy, sortOrder]);

  const fetchCards = async () => {
    try {
      const response = await getCards({});
      // Enrich cards with screener metrics
      const enrichedCards = response.data.map(card => ({
        ...card,
        momentum_score: calculateMomentum(card),
        rsi: calculateRSI(card),
        ma_signal: calculateMASignal(card),
        value_score: calculateValueScore(card),
        composite_score: calculateCompositeScore(card),
      }));
      setCards(enrichedCards);
    } catch (error) {
      console.error('Error fetching cards:', error);
    } finally {
      setLoading(false);
    }
  };

  // Simulated technical calculations
  const calculateMomentum = (card) => {
    const base = card.price_change_pct * 2 + (card.volume_24h / 10);
    return Math.max(-100, Math.min(100, base + Math.random() * 20 - 10));
  };

  const calculateRSI = (card) => {
    // RSI simulation based on price change
    const base = 50 + card.price_change_pct * 2;
    return Math.max(0, Math.min(100, base + Math.random() * 10 - 5));
  };

  const calculateMASignal = (card) => {
    // Moving average signal
    if (card.price_change_pct > 10) return 'strong_buy';
    if (card.price_change_pct > 3) return 'buy';
    if (card.price_change_pct < -10) return 'strong_sell';
    if (card.price_change_pct < -3) return 'sell';
    return 'neutral';
  };

  const calculateValueScore = (card) => {
    // Value score based on various factors
    const volatilityPenalty = card.volatility_30d > 30 ? -20 : 0;
    const volumeBonus = card.volume_24h > 50 ? 15 : 0;
    const sharpeBonus = card.sharpe_ratio > 1.5 ? 20 : 0;
    return Math.max(0, Math.min(100, 50 + card.price_change_pct + volatilityPenalty + volumeBonus + sharpeBonus));
  };

  const calculateCompositeScore = (card) => {
    const momentum = calculateMomentum(card);
    const value = calculateValueScore(card);
    return Math.round((momentum + value) / 2);
  };

  const applyFilters = () => {
    let result = [...cards];

    // Price filter
    result = result.filter(c => c.current_price >= priceRange[0] && c.current_price <= priceRange[1]);

    // Momentum filter
    if (momentumFilter === 'bullish') {
      result = result.filter(c => c.price_change_pct > 0);
    } else if (momentumFilter === 'bearish') {
      result = result.filter(c => c.price_change_pct < 0);
    }

    // Category filter
    if (categoryFilter !== 'all') {
      result = result.filter(c => c.category.toLowerCase() === categoryFilter.toLowerCase());
    }

    // Volume filter
    result = result.filter(c => c.volume_24h >= volumeMin);

    // Sharpe filter
    result = result.filter(c => (c.sharpe_ratio || 0) >= sharpeMin);

    // Undervalued filter
    if (showUndervalued) {
      result = result.filter(c => c.value_score > 60);
    }

    // High momentum filter
    if (showHighMomentum) {
      result = result.filter(c => Math.abs(c.momentum_score) > 30);
    }

    // Sort
    result.sort((a, b) => {
      const aVal = a[sortBy] || 0;
      const bVal = b[sortBy] || 0;
      return sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
    });

    setFilteredCards(result);
  };

  const resetFilters = () => {
    setPriceRange([0, 10000000]);
    setMomentumFilter('all');
    setCategoryFilter('all');
    setVolumeMin(0);
    setSharpeMin(0);
    setShowUndervalued(false);
    setShowHighMomentum(false);
  };

  const getMASignalBadge = (signal) => {
    const styles = {
      strong_buy: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      buy: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      neutral: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
      sell: 'bg-red-500/10 text-red-400 border-red-500/20',
      strong_sell: 'bg-red-500/20 text-red-400 border-red-500/30',
    };
    const labels = {
      strong_buy: 'STRONG BUY',
      buy: 'BUY',
      neutral: 'HOLD',
      sell: 'SELL',
      strong_sell: 'STRONG SELL',
    };
    return (
      <span className={`px-2 py-1 rounded text-xs font-mono border ${styles[signal]}`}>
        {labels[signal]}
      </span>
    );
  };

  const getRSIColor = (rsi) => {
    if (rsi >= 70) return 'text-red-400';
    if (rsi <= 30) return 'text-emerald-400';
    return 'text-zinc-400';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#007AFF]" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" data-testid="card-screener-page">
      {/* Header */}
      <Link
        to="/analytics"
        className="inline-flex items-center gap-2 text-zinc-400 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Analytics
      </Link>

      <div className="flex items-center gap-3 mb-8">
        <div className="p-2 rounded-lg bg-gradient-to-br from-[#007AFF] to-purple-500">
          <SlidersHorizontal className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="font-heading font-bold text-2xl sm:text-3xl text-white">Card Screener</h1>
          <p className="text-zinc-400">Filter and analyze cards like a professional trader</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Filters Panel */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-[#0A0A0C] border border-white/10 rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-white flex items-center gap-2">
                <Filter className="w-4 h-4" />
                Filters
              </h3>
              <Button variant="ghost" size="sm" onClick={resetFilters} className="text-xs text-zinc-400">
                Reset
              </Button>
            </div>

            <div className="space-y-5">
              {/* Category */}
              <div>
                <label className="text-xs text-zinc-500 block mb-2">Category</label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0A0A0C] border-white/10">
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="basketball">Basketball</SelectItem>
                    <SelectItem value="baseball">Baseball</SelectItem>
                    <SelectItem value="football">Football</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Momentum */}
              <div>
                <label className="text-xs text-zinc-500 block mb-2">Momentum</label>
                <Select value={momentumFilter} onValueChange={setMomentumFilter}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0A0A0C] border-white/10">
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="bullish">Bullish Only</SelectItem>
                    <SelectItem value="bearish">Bearish Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Min Volume */}
              <div>
                <label className="text-xs text-zinc-500 block mb-2">Min 24h Volume</label>
                <Input
                  type="number"
                  value={volumeMin}
                  onChange={(e) => setVolumeMin(Number(e.target.value))}
                  className="bg-white/5 border-white/10 text-sm"
                  placeholder="0"
                />
              </div>

              {/* Min Sharpe */}
              <div>
                <label className="text-xs text-zinc-500 block mb-2">Min Sharpe Ratio</label>
                <Input
                  type="number"
                  step="0.1"
                  value={sharpeMin}
                  onChange={(e) => setSharpeMin(Number(e.target.value))}
                  className="bg-white/5 border-white/10 text-sm"
                  placeholder="0"
                />
              </div>

              {/* Quick Filters */}
              <div className="pt-4 border-t border-white/10 space-y-3">
                <label className="text-xs text-zinc-500 block">Quick Filters</label>
                
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="undervalued"
                    checked={showUndervalued}
                    onCheckedChange={setShowUndervalued}
                  />
                  <label htmlFor="undervalued" className="text-sm text-zinc-300 cursor-pointer">
                    Undervalued Cards
                  </label>
                </div>
                
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="highMomentum"
                    checked={showHighMomentum}
                    onCheckedChange={setShowHighMomentum}
                  />
                  <label htmlFor="highMomentum" className="text-sm text-zinc-300 cursor-pointer">
                    High Momentum
                  </label>
                </div>
              </div>

              {/* Sort */}
              <div className="pt-4 border-t border-white/10">
                <label className="text-xs text-zinc-500 block mb-2">Sort By</label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0A0A0C] border-white/10">
                    <SelectItem value="momentum_score">Momentum Score</SelectItem>
                    <SelectItem value="composite_score">Composite Score</SelectItem>
                    <SelectItem value="current_price">Price</SelectItem>
                    <SelectItem value="price_change_pct">24h Change</SelectItem>
                    <SelectItem value="volume_24h">Volume</SelectItem>
                    <SelectItem value="sharpe_ratio">Sharpe Ratio</SelectItem>
                    <SelectItem value="rsi">RSI</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="lg:col-span-3">
          <div className="bg-[#0A0A0C] border border-white/10 rounded-xl overflow-hidden">
            {/* Results Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <span className="text-sm text-zinc-400">
                Showing <span className="text-white font-medium">{filteredCards.length}</span> of {cards.length} cards
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                  className="text-xs"
                >
                  {sortOrder === 'desc' ? '↓ Desc' : '↑ Asc'}
                </Button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider p-4">Card</th>
                    <th className="text-right text-xs font-medium text-zinc-500 uppercase tracking-wider p-4">Price</th>
                    <th className="text-right text-xs font-medium text-zinc-500 uppercase tracking-wider p-4">24h</th>
                    <th className="text-center text-xs font-medium text-zinc-500 uppercase tracking-wider p-4">Signal</th>
                    <th className="text-right text-xs font-medium text-zinc-500 uppercase tracking-wider p-4">RSI</th>
                    <th className="text-right text-xs font-medium text-zinc-500 uppercase tracking-wider p-4">Momentum</th>
                    <th className="text-right text-xs font-medium text-zinc-500 uppercase tracking-wider p-4">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCards.map((card) => (
                    <tr key={card.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                      <td className="p-4">
                        <Link to={`/card/${card.id}`} className="flex items-center gap-3 group">
                          <img
                            src={card.image_url}
                            alt={card.name}
                            className="w-10 h-14 object-cover rounded"
                          />
                          <div>
                            <span className="text-white group-hover:text-[#007AFF] transition-colors text-sm font-medium line-clamp-1">
                              {card.player_name}
                            </span>
                            <span className="text-xs text-zinc-500 block">{card.category} • {card.grade}</span>
                          </div>
                        </Link>
                      </td>
                      <td className="text-right p-4 font-mono text-white text-sm">
                        {formatCurrency(card.current_price, true)}
                      </td>
                      <td className={`text-right p-4 font-mono text-sm ${getPriceChangeColor(card.price_change_pct)}`}>
                        {formatPercent(card.price_change_pct)}
                      </td>
                      <td className="text-center p-4">
                        {getMASignalBadge(card.ma_signal)}
                      </td>
                      <td className={`text-right p-4 font-mono text-sm ${getRSIColor(card.rsi)}`}>
                        {card.rsi?.toFixed(0)}
                      </td>
                      <td className="text-right p-4">
                        <div className="flex items-center justify-end gap-2">
                          {card.momentum_score > 0 ? (
                            <TrendingUp className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <TrendingDown className="w-4 h-4 text-red-400" />
                          )}
                          <span className={`font-mono text-sm ${card.momentum_score > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {card.momentum_score?.toFixed(0)}
                          </span>
                        </div>
                      </td>
                      <td className="text-right p-4">
                        <div className={`inline-flex items-center gap-1 px-2 py-1 rounded ${
                          card.composite_score > 60 ? 'bg-emerald-500/20 text-emerald-400' :
                          card.composite_score < 40 ? 'bg-red-500/20 text-red-400' :
                          'bg-zinc-500/20 text-zinc-400'
                        }`}>
                          <Star className="w-3 h-3" />
                          <span className="font-mono text-sm">{card.composite_score}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredCards.length === 0 && (
              <div className="text-center py-12 text-zinc-500">
                No cards match your filters
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
