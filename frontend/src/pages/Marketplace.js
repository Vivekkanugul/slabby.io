import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { getCards, getMarketplaceListings, getMarketValuations, createListing, buyFromMarketplace, searchCardsight } from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { toast } from 'sonner';
import {
  Search, Filter, TrendingUp, TrendingDown, DollarSign, ShoppingCart, Tag,
  ArrowUpRight, ArrowDownRight, Minus, Loader2, ChevronDown, ChevronUp,
  Target, BarChart3, Zap, ShieldCheck, AlertTriangle, X, Globe
} from 'lucide-react';

export default function Marketplace() {
  const { isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState('buy');
  const [cards, setCards] = useState([]);
  const [valuations, setValuations] = useState([]);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [sortBy, setSortBy] = useState('profit_potential');
  const [expandedCard, setExpandedCard] = useState(null);
  const [sellModal, setSellModal] = useState(null);
  const [buyConfirm, setBuyConfirm] = useState(null);
  const [sellPrice, setSellPrice] = useState('');
  const [sellQuantity, setSellQuantity] = useState('1');
  const [submitting, setSubmitting] = useState(false);
  
  // CardSight search state
  const [cardsightSearch, setCardsightSearch] = useState('');
  const [cardsightResults, setCardsightResults] = useState([]);
  const [cardsightLoading, setCardsightLoading] = useState(false);
  const [showCardsight, setShowCardsight] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = { category: category !== 'all' ? category : undefined };
      const [cardsRes, valuationsRes, listingsRes] = await Promise.all([
        getCards(params),
        getMarketValuations(params),
        getMarketplaceListings(params).catch(() => ({ data: [] })),
      ]);
      setCards(cardsRes.data);
      setValuations(valuationsRes.data);
      setListings(listingsRes.data || []);
    } catch (error) {
      console.error('Error fetching marketplace data:', error);
    } finally {
      setLoading(false);
    }
  }, [category]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // CardSight search with debounce
  useEffect(() => {
    if (cardsightSearch.trim().length < 2) {
      setCardsightResults([]);
      return;
    }
    
    const timer = setTimeout(async () => {
      setCardsightLoading(true);
      try {
        const response = await searchCardsight(cardsightSearch.trim(), 20);
        setCardsightResults(response.data?.cards || []);
      } catch (err) {
        console.error('CardSight search failed:', err);
        setCardsightResults([]);
      } finally {
        setCardsightLoading(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [cardsightSearch]);

  const getValuation = (cardId) => valuations.find(v => v.card_id === cardId);

  const filteredCards = cards.filter(card => {
    if (!search) return true;
    const q = search.toLowerCase();
    return card.name.toLowerCase().includes(q) || card.player_name.toLowerCase().includes(q);
  });

  const sortedCards = [...filteredCards].sort((a, b) => {
    const vA = getValuation(a.id);
    const vB = getValuation(b.id);
    if (sortBy === 'profit_potential') {
      return (vB?.potential_profit_pct_at_buy_high || 0) - (vA?.potential_profit_pct_at_buy_high || 0);
    }
    if (sortBy === 'price_low') return a.current_price - b.current_price;
    if (sortBy === 'price_high') return b.current_price - a.current_price;
    if (sortBy === 'volume') return b.volume_24h - a.volume_24h;
    if (sortBy === 'momentum') return Math.abs(b.price_change_pct) - Math.abs(a.price_change_pct);
    return 0;
  });

  const handleSell = async () => {
    if (!sellModal || !sellPrice || submitting) return;
    setSubmitting(true);
    try {
      await createListing({
        card_id: sellModal.id,
        price: parseFloat(sellPrice),
        quantity: parseInt(sellQuantity) || 1,
      });
      toast.success('Listing created successfully!');
      setSellModal(null);
      setSellPrice('');
      setSellQuantity('1');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create listing');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBuy = async () => {
    if (!buyConfirm || submitting) return;
    setSubmitting(true);
    try {
      await buyFromMarketplace({
        listing_id: buyConfirm.id,
        quantity: 1,
      });
      toast.success('Purchase successful! Card added to portfolio.');
      setBuyConfirm(null);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to purchase');
    } finally {
      setSubmitting(false);
    }
  };

  const categories = ['all', 'Basketball', 'Baseball', 'Football', 'Hockey'];

  const MomentumBadge = ({ pct }) => {
    if (pct > 3) return <span className="flex items-center gap-1 text-xs font-semibold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full"><TrendingUp className="w-3 h-3" />Bullish</span>;
    if (pct < -3) return <span className="flex items-center gap-1 text-xs font-semibold text-red-400 bg-red-400/10 px-2 py-0.5 rounded-full"><TrendingDown className="w-3 h-3" />Bearish</span>;
    return <span className="flex items-center gap-1 text-xs font-semibold text-zinc-400 bg-zinc-400/10 px-2 py-0.5 rounded-full"><Minus className="w-3 h-3" />Neutral</span>;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" data-testid="marketplace-page">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-heading font-bold text-2xl sm:text-3xl text-white mb-1">Trading Hub</h1>
        <p className="text-zinc-400 text-sm">AI-powered market valuations. Buy low, sell high.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('buy')}
          data-testid="tab-buy"
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'buy'
              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
              : 'bg-white/5 text-zinc-400 border border-white/10 hover:bg-white/10'
          }`}
        >
          <ShoppingCart className="w-4 h-4" />Buy Cards
        </button>
        <button
          onClick={() => setActiveTab('sell')}
          data-testid="tab-sell"
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'sell'
              ? 'bg-orange-500/15 text-orange-400 border border-orange-500/30'
              : 'bg-white/5 text-zinc-400 border border-white/10 hover:bg-white/10'
          }`}
        >
          <Tag className="w-4 h-4" />Sell Cards
        </button>
        <button
          onClick={() => setActiveTab('active')}
          data-testid="tab-active-listings"
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'active'
              ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
              : 'bg-white/5 text-zinc-400 border border-white/10 hover:bg-white/10'
          }`}
        >
          <BarChart3 className="w-4 h-4" />Active Listings ({listings.length})
        </button>
      </div>

      {/* Filters */}
      <div className="bg-[#0A0A0C] border border-white/10 rounded-xl p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <Input
              type="text"
              placeholder="Search cards or players..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-white/5 border-white/10 focus:border-white/30"
              data-testid="marketplace-search-input"
            />
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-full sm:w-40 bg-white/5 border-white/10" data-testid="category-filter">
              <Filter className="w-4 h-4 mr-2" /><SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent className="bg-[#0A0A0C] border-white/10">
              {categories.map(c => <SelectItem key={c} value={c}>{c === 'all' ? 'All Sports' : c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full sm:w-48 bg-white/5 border-white/10" data-testid="sort-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#0A0A0C] border-white/10">
              <SelectItem value="profit_potential">Profit Potential</SelectItem>
              <SelectItem value="price_low">Price: Low to High</SelectItem>
              <SelectItem value="price_high">Price: High to Low</SelectItem>
              <SelectItem value="volume">Volume</SelectItem>
              <SelectItem value="momentum">Momentum</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-[#007AFF]" />
        </div>
      ) : activeTab === 'buy' ? (
        <BuyView
          cards={sortedCards}
          getValuation={getValuation}
          expandedCard={expandedCard}
          setExpandedCard={setExpandedCard}
          listings={listings}
          setBuyConfirm={setBuyConfirm}
          isAuthenticated={isAuthenticated}
          MomentumBadge={MomentumBadge}
          cardsightSearch={cardsightSearch}
          setCardsightSearch={setCardsightSearch}
          cardsightResults={cardsightResults}
          cardsightLoading={cardsightLoading}
          showCardsight={showCardsight}
          setShowCardsight={setShowCardsight}
        />
      ) : activeTab === 'sell' ? (
        <SellView
          cards={sortedCards}
          getValuation={getValuation}
          setSellModal={setSellModal}
          isAuthenticated={isAuthenticated}
          MomentumBadge={MomentumBadge}
        />
      ) : (
        <ActiveListingsView listings={listings} getValuation={getValuation} cards={cards} />
      )}

      {/* Sell Modal */}
      {sellModal && (
        <SellModal
          card={sellModal}
          valuation={getValuation(sellModal.id)}
          sellPrice={sellPrice}
          setSellPrice={setSellPrice}
          sellQuantity={sellQuantity}
          setSellQuantity={setSellQuantity}
          onClose={() => { setSellModal(null); setSellPrice(''); setSellQuantity('1'); }}
          onSubmit={handleSell}
          submitting={submitting}
        />
      )}

      {/* Buy Confirm Modal */}
      {buyConfirm && (
        <BuyConfirmModal
          listing={buyConfirm}
          valuation={getValuation(buyConfirm.card_id)}
          onClose={() => setBuyConfirm(null)}
          onConfirm={handleBuy}
          submitting={submitting}
        />
      )}
    </div>
  );
}

// ============ BUY VIEW ============
function BuyView({ cards, getValuation, expandedCard, setExpandedCard, listings, setBuyConfirm, isAuthenticated, MomentumBadge, cardsightSearch, setCardsightSearch, cardsightResults, cardsightLoading, showCardsight, setShowCardsight }) {
  return (
    <div className="space-y-3" data-testid="buy-view">
      {/* Guide banner */}
      <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 mb-4 flex items-start gap-3">
        <Target className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm text-emerald-300 font-medium">Smart Buyer's Guide</p>
          <p className="text-xs text-zinc-400 mt-1">
            Each card shows its <span className="text-white">AI Fair Market Value</span>. 
            Target buying at <span className="text-emerald-400">80-90% of FMV</span> to build in profit margin for resale.
          </p>
        </div>
      </div>

      {/* CardSight Search Section */}
      <div className="bg-gradient-to-r from-cyan-950/40 to-[#0A0A0C] border border-cyan-500/30 rounded-xl p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-medium text-white">Search CardSight Database</span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-400">7M+ Cards</span>
          </div>
          <button 
            onClick={() => setShowCardsight(!showCardsight)}
            className="text-xs text-cyan-400 hover:text-cyan-300"
          >
            {showCardsight ? 'Hide' : 'Expand'}
          </button>
        </div>
        
        <div className="relative">
          <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-500" />
          <input
            type="text"
            value={cardsightSearch}
            onChange={(e) => { setCardsightSearch(e.target.value); setShowCardsight(true); }}
            placeholder="Search any player, team, or card set..."
            className="w-full pl-10 pr-10 py-2.5 bg-white/5 border border-cyan-500/30 rounded-lg text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-cyan-400"
            data-testid="cardsight-marketplace-search"
          />
          {cardsightLoading && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-cyan-400" />
          )}
          {cardsightSearch && !cardsightLoading && (
            <button 
              onClick={() => { setCardsightSearch(''); setCardsightResults([]); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* CardSight Results */}
        {showCardsight && cardsightSearch.length >= 2 && (
          <div className="mt-3 space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
            {cardsightLoading ? (
              <div className="text-center py-6">
                <Loader2 className="w-6 h-6 animate-spin text-cyan-400 mx-auto" />
                <p className="text-xs text-zinc-500 mt-2">Searching CardSight database...</p>
              </div>
            ) : cardsightResults.length > 0 ? (
              <>
                <p className="text-[10px] text-cyan-400 uppercase tracking-wider mb-2">{cardsightResults.length} cards found</p>
                {cardsightResults.map(card => (
                  <div 
                    key={card.id} 
                    className="bg-cyan-950/30 border border-cyan-500/20 rounded-lg p-3 hover:bg-cyan-950/50 transition-colors"
                    data-testid={`cardsight-card-${card.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <img 
                        src={card.image_url} 
                        alt={card.name} 
                        className="w-10 h-14 object-cover rounded shrink-0" 
                        onError={(e) => { e.target.src = 'https://images.pexels.com/photos/7809125/pexels-photo-7809125.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940'; }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[9px] uppercase tracking-wider text-cyan-400">{card.category}</span>
                          <span className="text-[9px] text-zinc-500">{card.year}</span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-zinc-400">{card.grade}</span>
                        </div>
                        <p className="text-xs font-medium text-white truncate">{card.player_name}</p>
                        <p className="text-[10px] text-zinc-500 truncate">{card.set_name}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-xs font-bold text-cyan-400 font-mono">${card.current_price?.toLocaleString()}</div>
                        <div className={`text-[10px] font-mono ${card.price_change_pct > 0 ? 'text-emerald-400' : card.price_change_pct < 0 ? 'text-red-400' : 'text-zinc-400'}`}>
                          {card.price_change_pct > 0 ? '+' : ''}{card.price_change_pct?.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-cyan-500/10">
                      <div className="flex items-center gap-3 text-[10px] text-zinc-500">
                        <span>Vol: {card.volume_24h}</span>
                        <span>Beta: {card.beta?.toFixed(2)}</span>
                        <span className={`px-1.5 py-0.5 rounded ${card.rarity === 'Legendary' ? 'bg-amber-500/20 text-amber-400' : card.rarity === 'Ultra Rare' ? 'bg-purple-500/20 text-purple-400' : card.rarity === 'Rare' ? 'bg-blue-500/20 text-blue-400' : 'bg-zinc-500/20 text-zinc-400'}`}>
                          {card.rarity}
                        </span>
                      </div>
                      <a 
                        href={`/ai-insights`}
                        className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                      >
                        View Analytics <ArrowUpRight className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                ))}
              </>
            ) : (
              <p className="text-xs text-zinc-500 text-center py-4">No cards found. Try a different search term.</p>
            )}
          </div>
        )}
        
        {!showCardsight && !cardsightSearch && (
          <p className="text-[10px] text-zinc-500 mt-2">Search millions of real sports cards from the CardSight database</p>
        )}
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3 my-4">
        <div className="flex-1 h-px bg-white/10"></div>
        <span className="text-xs text-zinc-500 uppercase tracking-wider">Portfolio Cards</span>
        <div className="flex-1 h-px bg-white/10"></div>
      </div>

      {cards.map(card => {
        const val = getValuation(card.id);
        const isExpanded = expandedCard === card.id;
        const cardListings = listings.filter(l => l.card_id === card.id);

        return (
          <div key={card.id} className="bg-[#0A0A0C] border border-white/10 rounded-xl overflow-hidden hover:border-white/15 transition-colors" data-testid={`buy-card-${card.id}`}>
            {/* Card Row */}
            <div className="flex items-center gap-4 p-4 cursor-pointer" onClick={() => setExpandedCard(isExpanded ? null : card.id)}>
              <img src={card.image_url} alt={card.name} className="w-14 h-20 object-cover rounded-lg shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-medium">{card.category}</span>
                  <MomentumBadge pct={card.price_change_pct} />
                </div>
                <h3 className="text-sm font-semibold text-white truncate">{card.name}</h3>
                <p className="text-xs text-zinc-500">{card.player_name} &middot; {card.grade}</p>
              </div>

              {/* Price & Value */}
              <div className="text-right shrink-0">
                <div className="text-xs text-zinc-500 mb-0.5">Market Price</div>
                <div className="text-base font-bold text-white font-mono">${card.current_price.toLocaleString()}</div>
              </div>

              {val && (
                <div className="text-right shrink-0 hidden sm:block">
                  <div className="text-xs text-zinc-500 mb-0.5">AI Fair Value</div>
                  <div className="text-base font-bold text-cyan-400 font-mono">${val.fair_market_value.toLocaleString()}</div>
                </div>
              )}

              {val && (
                <div className="text-right shrink-0 hidden md:block">
                  <div className="text-xs text-zinc-500 mb-0.5">Buy Target</div>
                  <div className="text-sm font-semibold text-emerald-400 font-mono">
                    ${val.buy_range.low.toLocaleString()} - ${val.buy_range.high.toLocaleString()}
                  </div>
                </div>
              )}

              {val && (
                <div className="shrink-0 hidden lg:flex flex-col items-end">
                  <div className="text-xs text-zinc-500 mb-0.5">Profit Potential</div>
                  <span className={`text-sm font-bold ${val.potential_profit_pct_at_buy_high > 5 ? 'text-emerald-400' : val.potential_profit_pct_at_buy_high > 0 ? 'text-yellow-400' : 'text-red-400'}`}>
                    +{val.potential_profit_pct_at_buy_high.toFixed(1)}%
                  </span>
                </div>
              )}

              <div className="shrink-0">
                {isExpanded ? <ChevronUp className="w-4 h-4 text-zinc-500" /> : <ChevronDown className="w-4 h-4 text-zinc-500" />}
              </div>
            </div>

            {/* Expanded Detail */}
            {isExpanded && val && (
              <div className="border-t border-white/5 p-4 bg-white/[0.02]">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <ValuationStat label="Fair Market Value" value={`$${val.fair_market_value.toLocaleString()}`} icon={<Target className="w-4 h-4 text-cyan-400" />} />
                  <ValuationStat label="Buy Range (80-90%)" value={`$${val.buy_range.low.toLocaleString()} - $${val.buy_range.high.toLocaleString()}`} icon={<ShoppingCart className="w-4 h-4 text-emerald-400" />} />
                  <ValuationStat label="Sell Range (95-105%)" value={`$${val.sell_range.low.toLocaleString()} - $${val.sell_range.high.toLocaleString()}`} icon={<Tag className="w-4 h-4 text-orange-400" />} />
                  <ValuationStat label="Confidence" value={`${(val.confidence * 100).toFixed(0)}%`} icon={<ShieldCheck className="w-4 h-4 text-blue-400" />} />
                </div>

                {/* Profit Breakdown */}
                <div className="bg-white/[0.03] rounded-lg p-3 mb-4">
                  <div className="text-xs text-zinc-500 font-medium mb-2 uppercase tracking-wider">Profit Breakdown</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-2 rounded bg-emerald-500/5 border border-emerald-500/10">
                      <div className="text-[10px] text-zinc-500">Buy at 80% FMV</div>
                      <div className="text-sm font-bold text-emerald-400">+${val.potential_profit_at_buy_low.toLocaleString()}</div>
                      <div className="text-[10px] text-emerald-400/70">+{val.potential_profit_pct_at_buy_low.toFixed(1)}% margin</div>
                    </div>
                    <div className="p-2 rounded bg-emerald-500/5 border border-emerald-500/10">
                      <div className="text-[10px] text-zinc-500">Buy at 90% FMV</div>
                      <div className="text-sm font-bold text-emerald-400">+${val.potential_profit_at_buy_high.toLocaleString()}</div>
                      <div className="text-[10px] text-emerald-400/70">+{val.potential_profit_pct_at_buy_high.toFixed(1)}% margin</div>
                    </div>
                  </div>
                </div>

                {/* Active Listings for this card */}
                {cardListings.length > 0 ? (
                  <div>
                    <div className="text-xs text-zinc-500 font-medium mb-2 uppercase tracking-wider">Available Listings</div>
                    <div className="space-y-2">
                      {cardListings.map(listing => {
                        const discount = ((val.fair_market_value - listing.price) / val.fair_market_value * 100);
                        return (
                          <div key={listing.id} className="flex items-center justify-between p-3 rounded-lg bg-white/[0.03] border border-white/5">
                            <div>
                              <span className="text-sm font-mono font-semibold text-white">${listing.price.toLocaleString()}</span>
                              <span className={`ml-2 text-xs font-medium ${discount > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {discount > 0 ? `${discount.toFixed(1)}% below FMV` : `${Math.abs(discount).toFixed(1)}% above FMV`}
                              </span>
                              <span className="ml-2 text-xs text-zinc-500">by {listing.seller_name}</span>
                            </div>
                            {isAuthenticated && (
                              <Button size="sm" onClick={() => setBuyConfirm(listing)} className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs" data-testid={`buy-listing-${listing.id}`}>
                                <ShoppingCart className="w-3 h-3 mr-1" /> Buy
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-3 text-zinc-500 text-xs">No active listings for this card. Check back later or set a watchlist alert.</div>
                )}

                {/* Link to card detail */}
                <div className="mt-3 flex justify-end">
                  <a href={`/card/${card.id}`} className="text-xs text-[#007AFF] hover:text-[#007AFF]/80 flex items-center gap-1">
                    Full card analysis <ArrowUpRight className="w-3 h-3" />
                  </a>
                </div>
              </div>
            )}
          </div>
        );
      })}
      {cards.length === 0 && <div className="text-center py-16 text-zinc-500">No cards found</div>}
    </div>
  );
}

// ============ SELL VIEW ============
function SellView({ cards, getValuation, setSellModal, isAuthenticated, MomentumBadge }) {
  return (
    <div className="space-y-3" data-testid="sell-view">
      {/* Guide banner */}
      <div className="bg-orange-500/5 border border-orange-500/20 rounded-xl p-4 mb-4 flex items-start gap-3">
        <DollarSign className="w-5 h-5 text-orange-400 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm text-orange-300 font-medium">Seller's Guide</p>
          <p className="text-xs text-zinc-400 mt-1">
            List your cards at the <span className="text-white">AI-suggested sell range (95-105% FMV)</span> for optimal pricing. 
            Price too high and buyers pass. Price at 95% and it moves fast.
          </p>
        </div>
      </div>

      {cards.map(card => {
        const val = getValuation(card.id);
        return (
          <div key={card.id} className="bg-[#0A0A0C] border border-white/10 rounded-xl p-4 hover:border-white/15 transition-colors flex items-center gap-4" data-testid={`sell-card-${card.id}`}>
            <img src={card.image_url} alt={card.name} className="w-14 h-20 object-cover rounded-lg shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-medium">{card.category}</span>
                <MomentumBadge pct={card.price_change_pct} />
              </div>
              <h3 className="text-sm font-semibold text-white truncate">{card.name}</h3>
              <p className="text-xs text-zinc-500">{card.player_name} &middot; {card.grade}</p>
            </div>

            <div className="text-right shrink-0">
              <div className="text-xs text-zinc-500">Current Price</div>
              <div className="text-base font-bold text-white font-mono">${card.current_price.toLocaleString()}</div>
            </div>

            {val && (
              <div className="text-right shrink-0 hidden sm:block">
                <div className="text-xs text-zinc-500">Suggested Sell</div>
                <div className="text-sm font-semibold text-orange-400 font-mono">
                  ${val.sell_range.low.toLocaleString()} - ${val.sell_range.high.toLocaleString()}
                </div>
              </div>
            )}

            {val && (
              <div className="text-right shrink-0 hidden md:block">
                <div className="text-xs text-zinc-500">Volume 24h</div>
                <div className="text-sm font-medium text-zinc-300">{val.volume_24h}</div>
              </div>
            )}

            {isAuthenticated ? (
              <Button
                onClick={() => setSellModal(card)}
                className="bg-orange-600 hover:bg-orange-500 text-white text-xs shrink-0"
                data-testid={`sell-btn-${card.id}`}
              >
                <Tag className="w-3 h-3 mr-1" /> List for Sale
              </Button>
            ) : (
              <a href="/login">
                <Button variant="outline" className="text-xs border-white/20 text-zinc-400 shrink-0">Sign in to sell</Button>
              </a>
            )}
          </div>
        );
      })}
      {cards.length === 0 && <div className="text-center py-16 text-zinc-500">No cards found</div>}
    </div>
  );
}

// ============ ACTIVE LISTINGS VIEW ============
function ActiveListingsView({ listings, getValuation, cards }) {
  if (listings.length === 0) {
    return (
      <div className="text-center py-20" data-testid="no-listings">
        <BarChart3 className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
        <p className="text-zinc-400 text-sm">No active listings right now</p>
        <p className="text-zinc-500 text-xs mt-1">Be the first to list a card for sale</p>
      </div>
    );
  }

  return (
    <div className="space-y-3" data-testid="active-listings-view">
      {listings.map(listing => {
        const card = listing.card || cards.find(c => c.id === listing.card_id);
        const val = getValuation(listing.card_id);
        const discount = val ? ((val.fair_market_value - listing.price) / val.fair_market_value * 100) : 0;

        return (
          <div key={listing.id} className="bg-[#0A0A0C] border border-white/10 rounded-xl p-4 flex items-center gap-4" data-testid={`listing-${listing.id}`}>
            {card && <img src={card.image_url} alt={card?.name} className="w-14 h-20 object-cover rounded-lg shrink-0" />}
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-white truncate">{card?.name || 'Unknown Card'}</h3>
              <p className="text-xs text-zinc-500">Listed by {listing.seller_name} &middot; Qty: {listing.quantity}</p>
            </div>
            <div className="text-right shrink-0">
              <div className="text-xs text-zinc-500">Asking Price</div>
              <div className="text-base font-bold text-white font-mono">${listing.price.toLocaleString()}</div>
            </div>
            {val && (
              <div className="shrink-0">
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${discount > 5 ? 'text-emerald-400 bg-emerald-400/10' : discount > 0 ? 'text-yellow-400 bg-yellow-400/10' : 'text-red-400 bg-red-400/10'}`}>
                  {discount > 0 ? <ArrowDownRight className="w-3 h-3 inline mr-0.5" /> : <ArrowUpRight className="w-3 h-3 inline mr-0.5" />}
                  {Math.abs(discount).toFixed(1)}% {discount > 0 ? 'below' : 'above'} FMV
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ============ SELL MODAL ============
function SellModal({ card, valuation, sellPrice, setSellPrice, sellQuantity, setSellQuantity, onClose, onSubmit, submitting }) {
  const priceNum = parseFloat(sellPrice) || 0;
  const fmv = valuation?.fair_market_value || card.current_price;
  const pricePctOfFmv = fmv ? ((priceNum / fmv) * 100).toFixed(1) : 0;
  const isGoodPrice = priceNum >= fmv * 0.9 && priceNum <= fmv * 1.1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" data-testid="sell-modal">
      <div className="bg-[#0E0E12] border border-white/10 rounded-2xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-white">List Card for Sale</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex items-center gap-3 mb-5 p-3 bg-white/[0.03] rounded-lg">
          <img src={card.image_url} alt={card.name} className="w-12 h-16 object-cover rounded" />
          <div>
            <h3 className="text-sm font-semibold text-white">{card.name}</h3>
            <p className="text-xs text-zinc-500">{card.grade} &middot; {card.rarity}</p>
          </div>
        </div>

        {valuation && (
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="p-3 bg-white/[0.03] rounded-lg">
              <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Fair Market Value</div>
              <div className="text-lg font-bold text-cyan-400 font-mono">${fmv.toLocaleString()}</div>
            </div>
            <div className="p-3 bg-white/[0.03] rounded-lg">
              <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Suggested Range</div>
              <div className="text-sm font-semibold text-orange-400 font-mono mt-1">
                ${valuation.sell_range.low.toLocaleString()} - ${valuation.sell_range.high.toLocaleString()}
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3 mb-5">
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Your Asking Price ($)</label>
            <Input
              type="number"
              value={sellPrice}
              onChange={(e) => setSellPrice(e.target.value)}
              placeholder={valuation ? valuation.sell_range.low.toString() : card.current_price.toString()}
              className="bg-white/5 border-white/10 text-white font-mono"
              data-testid="sell-price-input"
            />
            {priceNum > 0 && (
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-xs ${isGoodPrice ? 'text-emerald-400' : priceNum > fmv * 1.1 ? 'text-red-400' : 'text-yellow-400'}`}>
                  {pricePctOfFmv}% of FMV
                </span>
                {isGoodPrice && <ShieldCheck className="w-3 h-3 text-emerald-400" />}
                {priceNum > fmv * 1.1 && <AlertTriangle className="w-3 h-3 text-red-400" />}
              </div>
            )}
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Quantity</label>
            <Input
              type="number"
              value={sellQuantity}
              onChange={(e) => setSellQuantity(e.target.value)}
              min="1"
              className="bg-white/5 border-white/10 text-white font-mono"
              data-testid="sell-quantity-input"
            />
          </div>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1 border-white/10 text-zinc-400">Cancel</Button>
          <Button
            onClick={onSubmit}
            disabled={!priceNum || submitting}
            className="flex-1 bg-orange-600 hover:bg-orange-500 text-white"
            data-testid="confirm-sell-btn"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Tag className="w-4 h-4 mr-1" /> List for ${priceNum ? priceNum.toLocaleString() : '...'}</>}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============ BUY CONFIRM MODAL ============
function BuyConfirmModal({ listing, valuation, onClose, onConfirm, submitting }) {
  const fmv = valuation?.fair_market_value || listing.price;
  const discount = ((fmv - listing.price) / fmv * 100);
  const potentialProfit = fmv - listing.price;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" data-testid="buy-confirm-modal">
      <div className="bg-[#0E0E12] border border-white/10 rounded-2xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-white">Confirm Purchase</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        <div className="space-y-3 mb-5">
          <div className="flex justify-between items-center p-3 bg-white/[0.03] rounded-lg">
            <span className="text-sm text-zinc-400">Asking Price</span>
            <span className="text-lg font-bold text-white font-mono">${listing.price.toLocaleString()}</span>
          </div>
          {valuation && (
            <>
              <div className="flex justify-between items-center p-3 bg-white/[0.03] rounded-lg">
                <span className="text-sm text-zinc-400">AI Fair Market Value</span>
                <span className="text-lg font-bold text-cyan-400 font-mono">${fmv.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-lg">
                <span className="text-sm text-zinc-400">Potential Profit</span>
                <div className="text-right">
                  <span className={`text-lg font-bold font-mono ${potentialProfit > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {potentialProfit > 0 ? '+' : ''}${potentialProfit.toLocaleString()}
                  </span>
                  <span className={`text-xs ml-1 ${discount > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    ({discount > 0 ? '+' : ''}{discount.toFixed(1)}%)
                  </span>
                </div>
              </div>
            </>
          )}
          <div className="flex justify-between items-center p-3 bg-white/[0.03] rounded-lg">
            <span className="text-sm text-zinc-400">Seller</span>
            <span className="text-sm text-zinc-300">{listing.seller_name}</span>
          </div>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1 border-white/10 text-zinc-400">Cancel</Button>
          <Button
            onClick={onConfirm}
            disabled={submitting}
            className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white"
            data-testid="confirm-buy-btn"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><ShoppingCart className="w-4 h-4 mr-1" /> Confirm Purchase</>}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============ SMALL COMPONENTS ============
function ValuationStat({ label, value, icon }) {
  return (
    <div className="p-3 bg-white/[0.03] rounded-lg">
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <span className="text-[10px] text-zinc-500 uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-sm font-semibold text-white font-mono">{value}</div>
    </div>
  );
}
