import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getPredictions, getCards } from '../lib/api';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { 
  Sparkles, TrendingUp, TrendingDown, Loader2, ArrowRight, Activity,
  Target, BarChart3, LineChart, PieChart, Zap, AlertTriangle, Clock,
  DollarSign, Percent, Award, Users, Calendar, FileText
} from 'lucide-react';
import { formatCurrency, formatPercent, getPriceChangeColor } from '../lib/utils';
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  ComposedChart, Line, Bar, ReferenceLine
} from 'recharts';

export default function AIInsights() {
  const [predictions, setPredictions] = useState([]);
  const [cards, setCards] = useState([]);
  const [selectedCard, setSelectedCard] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [predictionsRes, cardsRes] = await Promise.all([
        getPredictions(),
        getCards({})
      ]);
      
      // Enrich predictions with technical data
      const enrichedPredictions = predictionsRes.data.map(pred => {
        const card = cardsRes.data.find(c => c.id === pred.card_id);
        return {
          ...pred,
          card,
          technicals: generateTechnicals(card),
          priceTargets: generatePriceTargets(card),
          comparables: generateComparables(card, cardsRes.data),
          fundamentals: generateFundamentals(card),
        };
      });
      
      setPredictions(enrichedPredictions);
      setCards(cardsRes.data);
      if (enrichedPredictions.length > 0) {
        setSelectedCard(enrichedPredictions[0]);
      }
    } catch (error) {
      console.error('Error fetching predictions:', error);
    } finally {
      setLoading(false);
    }
  };

  // Generate technical analysis data
  const generateTechnicals = (card) => {
    if (!card) return null;
    const price = card.current_price;
    return {
      rsi: Math.max(20, Math.min(80, 50 + card.price_change_pct * 2)),
      macd: card.price_change_pct > 0 ? 'bullish' : 'bearish',
      ma_20: price * (1 - Math.random() * 0.05),
      ma_50: price * (1 - Math.random() * 0.1),
      ma_200: price * (1 - Math.random() * 0.15),
      support: price * 0.85,
      resistance: price * 1.15,
      volume_trend: card.volume_24h > 50 ? 'increasing' : 'stable',
      trend_strength: Math.random() * 100,
      volatility_rank: Math.round(Math.random() * 100),
    };
  };

  // Generate price targets like Wall Street analysts
  const generatePriceTargets = (card) => {
    if (!card) return null;
    const price = card.current_price;
    return {
      bull_case: {
        price: price * 1.4,
        probability: 25,
        thesis: "Championship win + sustained performance drives premium valuation"
      },
      base_case: {
        price: price * 1.1,
        probability: 50,
        thesis: "Steady appreciation following historical patterns"
      },
      bear_case: {
        price: price * 0.75,
        probability: 25,
        thesis: "Market correction or player performance decline"
      },
      consensus_target: price * 1.15,
      upside: 15,
    };
  };

  // Generate comparable analysis
  const generateComparables = (card, allCards) => {
    if (!card) return [];
    return allCards
      .filter(c => c.id !== card.id && c.category === card.category)
      .slice(0, 3)
      .map(c => ({
        id: c.id,
        name: c.player_name,
        price: c.current_price,
        change: c.price_change_pct,
        grade: c.grade,
        premium_discount: ((card.current_price / c.current_price) - 1) * 100
      }));
  };

  // Generate fundamental data
  const generateFundamentals = (card) => {
    if (!card) return null;
    return {
      population: Math.floor(Math.random() * 5000) + 100,
      pop_higher: Math.floor(Math.random() * 50),
      last_sale_date: "2024-01-15",
      avg_sale_price_30d: card.current_price * 0.95,
      sales_volume_30d: Math.floor(Math.random() * 200) + 10,
      holder_sentiment: Math.random() > 0.5 ? 'bullish' : 'neutral',
      liquidity_score: Math.floor(Math.random() * 100),
    };
  };

  // Generate chart data for price history with indicators
  const generateChartData = (card) => {
    if (!card) return [];
    const data = [];
    const basePrice = card.current_price;
    let price = basePrice * 0.8;
    let ma20Sum = 0;
    let ma50Sum = 0;
    
    for (let i = 0; i < 90; i++) {
      const change = (Math.random() - 0.45) * 0.04;
      price = price * (1 + change);
      ma20Sum += price;
      ma50Sum += price;
      
      const ma20 = i >= 19 ? ma20Sum / 20 : null;
      const ma50 = i >= 49 ? ma50Sum / 50 : null;
      
      if (i >= 20) ma20Sum -= data[i - 20]?.price || 0;
      if (i >= 50) ma50Sum -= data[i - 50]?.price || 0;
      
      data.push({
        date: new Date(Date.now() - (89 - i) * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        price: Math.round(price),
        ma20: ma20 ? Math.round(ma20) : null,
        ma50: ma50 ? Math.round(ma50) : null,
        volume: Math.floor(Math.random() * 50) + 5,
      });
    }
    return data;
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#0A0A0C] border border-white/10 rounded-lg p-3 shadow-xl">
          <p className="text-xs text-zinc-400 mb-1">{label}</p>
          <p className="font-mono font-medium text-white">
            {formatCurrency(payload[0].value)}
          </p>
          {payload[1] && (
            <p className="text-xs text-blue-400">MA20: {formatCurrency(payload[1].value)}</p>
          )}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#00E5FF]" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" data-testid="ai-insights-page">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-gradient-to-br from-[#00E5FF] to-[#007AFF]">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <h1 className="font-heading font-bold text-2xl sm:text-3xl text-white">AI Research Terminal</h1>
        </div>
        <p className="text-zinc-400">Professional-grade analysis like Wall Street research</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Card List */}
        <div className="lg:col-span-1">
          <div className="bg-[#0A0A0C] border border-white/10 rounded-xl p-4">
            <h3 className="font-medium text-white mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#00E5FF]" />
              Research Coverage
            </h3>
            <div className="space-y-2">
              {predictions.map((pred) => (
                <button
                  key={pred.id}
                  onClick={() => setSelectedCard(pred)}
                  className={`w-full p-3 rounded-lg text-left transition-colors ${
                    selectedCard?.id === pred.id
                      ? 'bg-[#007AFF]/20 border border-[#007AFF]/50'
                      : 'bg-white/5 hover:bg-white/10 border border-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-white font-medium truncate flex-1">
                      {pred.card?.player_name}
                    </span>
                    <span className={`text-xs font-mono ${
                      pred.signal.includes('BUY') ? 'text-emerald-400' :
                      pred.signal.includes('SELL') ? 'text-red-400' : 'text-amber-400'
                    }`}>
                      {pred.signal}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-500">{pred.card?.category}</span>
                    <span className={`text-xs font-mono ${getPriceChangeColor(pred.card?.price_change_pct)}`}>
                      {formatPercent(pred.card?.price_change_pct)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Analysis Panel */}
        <div className="lg:col-span-3 space-y-6">
          {selectedCard && (
            <>
              {/* Header Card */}
              <div className="bg-[#0A0A0C] border border-white/10 rounded-xl p-6">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <img
                      src={selectedCard.card?.image_url}
                      alt={selectedCard.card?.name}
                      className="w-20 h-28 object-cover rounded-lg"
                    />
                    <div>
                      <h2 className="font-heading font-bold text-xl text-white">
                        {selectedCard.card?.player_name}
                      </h2>
                      <p className="text-zinc-400 text-sm">{selectedCard.card?.name}</p>
                      <div className="flex items-center gap-4 mt-2">
                        <span className="text-xs text-zinc-500">{selectedCard.card?.category}</span>
                        <span className="text-xs text-zinc-500">{selectedCard.card?.grade}</span>
                        <span className="text-xs text-zinc-500">{selectedCard.card?.set_name}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <span className="text-xs text-zinc-500 block">Current Price</span>
                      <span className="font-heading font-bold text-2xl text-white">
                        {formatCurrency(selectedCard.card?.current_price, true)}
                      </span>
                      <span className={`text-sm font-mono block ${getPriceChangeColor(selectedCard.card?.price_change_pct)}`}>
                        {formatPercent(selectedCard.card?.price_change_pct)}
                      </span>
                    </div>
                    <div className={`px-4 py-2 rounded-lg border ${
                      selectedCard.signal.includes('BUY') ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400' :
                      selectedCard.signal.includes('SELL') ? 'bg-red-500/20 border-red-500/30 text-red-400' :
                      'bg-amber-500/20 border-amber-500/30 text-amber-400'
                    }`}>
                      <span className="text-xs block mb-1">AI Rating</span>
                      <span className="font-heading font-bold text-lg">{selectedCard.signal}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <Tabs defaultValue="technicals" className="space-y-4">
                <TabsList className="bg-[#0A0A0C] border border-white/10 p-1">
                  <TabsTrigger value="technicals" className="data-[state=active]:bg-white/10">
                    <LineChart className="w-4 h-4 mr-2" />
                    Technical
                  </TabsTrigger>
                  <TabsTrigger value="targets" className="data-[state=active]:bg-white/10">
                    <Target className="w-4 h-4 mr-2" />
                    Price Targets
                  </TabsTrigger>
                  <TabsTrigger value="comparables" className="data-[state=active]:bg-white/10">
                    <Users className="w-4 h-4 mr-2" />
                    Comparables
                  </TabsTrigger>
                  <TabsTrigger value="fundamentals" className="data-[state=active]:bg-white/10">
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Fundamentals
                  </TabsTrigger>
                </TabsList>

                {/* Technical Analysis Tab */}
                <TabsContent value="technicals" className="space-y-4">
                  {/* Price Chart with Indicators */}
                  <div className="bg-[#0A0A0C] border border-white/10 rounded-xl p-6">
                    <h3 className="font-medium text-white mb-4">Price Chart with Moving Averages</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <ComposedChart data={generateChartData(selectedCard.card)}>
                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#52525B', fontSize: 11 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#52525B', fontSize: 11 }} tickFormatter={(v) => `$${(v/1000).toFixed(0)}K`} />
                        <Tooltip content={<CustomTooltip />} />
                        <Area type="monotone" dataKey="price" stroke="#007AFF" fill="url(#priceGradient)" strokeWidth={2} />
                        <Line type="monotone" dataKey="ma20" stroke="#00E5FF" dot={false} strokeWidth={1.5} strokeDasharray="5 5" />
                        <Line type="monotone" dataKey="ma50" stroke="#F59E0B" dot={false} strokeWidth={1.5} strokeDasharray="3 3" />
                        <defs>
                          <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#007AFF" stopOpacity={0.3} />
                            <stop offset="100%" stopColor="#007AFF" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                      </ComposedChart>
                    </ResponsiveContainer>
                    <div className="flex items-center justify-center gap-6 mt-4">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-0.5 bg-[#007AFF]" />
                        <span className="text-xs text-zinc-400">Price</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-0.5 bg-[#00E5FF] opacity-70" style={{borderStyle: 'dashed'}} />
                        <span className="text-xs text-zinc-400">20-Day MA</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-0.5 bg-amber-500 opacity-70" />
                        <span className="text-xs text-zinc-400">50-Day MA</span>
                      </div>
                    </div>
                  </div>

                  {/* Technical Indicators */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-[#0A0A0C] border border-white/10 rounded-xl p-4">
                      <span className="text-xs text-zinc-500 block mb-2">RSI (14)</span>
                      <div className="flex items-end gap-2">
                        <span className={`font-heading font-bold text-2xl ${
                          selectedCard.technicals?.rsi > 70 ? 'text-red-400' :
                          selectedCard.technicals?.rsi < 30 ? 'text-emerald-400' : 'text-white'
                        }`}>
                          {selectedCard.technicals?.rsi?.toFixed(0)}
                        </span>
                        <span className="text-xs text-zinc-500 mb-1">
                          {selectedCard.technicals?.rsi > 70 ? 'Overbought' :
                           selectedCard.technicals?.rsi < 30 ? 'Oversold' : 'Neutral'}
                        </span>
                      </div>
                      <Progress value={selectedCard.technicals?.rsi} className="h-1.5 mt-2" />
                    </div>

                    <div className="bg-[#0A0A0C] border border-white/10 rounded-xl p-4">
                      <span className="text-xs text-zinc-500 block mb-2">MACD Signal</span>
                      <span className={`font-heading font-bold text-lg ${
                        selectedCard.technicals?.macd === 'bullish' ? 'text-emerald-400' : 'text-red-400'
                      }`}>
                        {selectedCard.technicals?.macd === 'bullish' ? '↑ Bullish' : '↓ Bearish'}
                      </span>
                    </div>

                    <div className="bg-[#0A0A0C] border border-white/10 rounded-xl p-4">
                      <span className="text-xs text-zinc-500 block mb-2">Support Level</span>
                      <span className="font-mono text-white">
                        {formatCurrency(selectedCard.technicals?.support, true)}
                      </span>
                    </div>

                    <div className="bg-[#0A0A0C] border border-white/10 rounded-xl p-4">
                      <span className="text-xs text-zinc-500 block mb-2">Resistance Level</span>
                      <span className="font-mono text-white">
                        {formatCurrency(selectedCard.technicals?.resistance, true)}
                      </span>
                    </div>
                  </div>
                </TabsContent>

                {/* Price Targets Tab */}
                <TabsContent value="targets" className="space-y-4">
                  <div className="bg-[#0A0A0C] border border-white/10 rounded-xl p-6">
                    <h3 className="font-medium text-white mb-6">AI Price Targets (12-Month)</h3>
                    
                    {/* Consensus */}
                    <div className="text-center mb-8 p-6 bg-gradient-to-r from-[#007AFF]/10 to-[#00E5FF]/10 rounded-xl border border-[#007AFF]/20">
                      <span className="text-sm text-zinc-400 block mb-2">Consensus Price Target</span>
                      <span className="font-heading font-bold text-4xl text-white">
                        {formatCurrency(selectedCard.priceTargets?.consensus_target, true)}
                      </span>
                      <span className="text-emerald-400 font-mono block mt-2">
                        +{selectedCard.priceTargets?.upside}% upside
                      </span>
                    </div>

                    {/* Scenarios */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Bull Case */}
                      <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                        <div className="flex items-center gap-2 mb-3">
                          <TrendingUp className="w-5 h-5 text-emerald-400" />
                          <span className="font-medium text-emerald-400">Bull Case</span>
                        </div>
                        <span className="font-heading font-bold text-2xl text-white block mb-2">
                          {formatCurrency(selectedCard.priceTargets?.bull_case?.price, true)}
                        </span>
                        <div className="flex items-center gap-2 mb-3">
                          <Progress value={selectedCard.priceTargets?.bull_case?.probability} className="flex-1 h-1.5" />
                          <span className="text-xs text-zinc-400">{selectedCard.priceTargets?.bull_case?.probability}%</span>
                        </div>
                        <p className="text-xs text-zinc-400">{selectedCard.priceTargets?.bull_case?.thesis}</p>
                      </div>

                      {/* Base Case */}
                      <div className="p-4 bg-[#007AFF]/10 border border-[#007AFF]/20 rounded-xl">
                        <div className="flex items-center gap-2 mb-3">
                          <Target className="w-5 h-5 text-[#007AFF]" />
                          <span className="font-medium text-[#007AFF]">Base Case</span>
                        </div>
                        <span className="font-heading font-bold text-2xl text-white block mb-2">
                          {formatCurrency(selectedCard.priceTargets?.base_case?.price, true)}
                        </span>
                        <div className="flex items-center gap-2 mb-3">
                          <Progress value={selectedCard.priceTargets?.base_case?.probability} className="flex-1 h-1.5" />
                          <span className="text-xs text-zinc-400">{selectedCard.priceTargets?.base_case?.probability}%</span>
                        </div>
                        <p className="text-xs text-zinc-400">{selectedCard.priceTargets?.base_case?.thesis}</p>
                      </div>

                      {/* Bear Case */}
                      <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                        <div className="flex items-center gap-2 mb-3">
                          <TrendingDown className="w-5 h-5 text-red-400" />
                          <span className="font-medium text-red-400">Bear Case</span>
                        </div>
                        <span className="font-heading font-bold text-2xl text-white block mb-2">
                          {formatCurrency(selectedCard.priceTargets?.bear_case?.price, true)}
                        </span>
                        <div className="flex items-center gap-2 mb-3">
                          <Progress value={selectedCard.priceTargets?.bear_case?.probability} className="flex-1 h-1.5" />
                          <span className="text-xs text-zinc-400">{selectedCard.priceTargets?.bear_case?.probability}%</span>
                        </div>
                        <p className="text-xs text-zinc-400">{selectedCard.priceTargets?.bear_case?.thesis}</p>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* Comparables Tab */}
                <TabsContent value="comparables" className="space-y-4">
                  <div className="bg-[#0A0A0C] border border-white/10 rounded-xl p-6">
                    <h3 className="font-medium text-white mb-6">Comparable Cards Analysis</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-white/10">
                            <th className="text-left text-xs font-medium text-zinc-500 uppercase p-3">Player</th>
                            <th className="text-right text-xs font-medium text-zinc-500 uppercase p-3">Price</th>
                            <th className="text-right text-xs font-medium text-zinc-500 uppercase p-3">24h</th>
                            <th className="text-right text-xs font-medium text-zinc-500 uppercase p-3">Grade</th>
                            <th className="text-right text-xs font-medium text-zinc-500 uppercase p-3">Premium/Discount</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b border-[#007AFF]/30 bg-[#007AFF]/10">
                            <td className="p-3 font-medium text-white">{selectedCard.card?.player_name} (This Card)</td>
                            <td className="p-3 text-right font-mono text-white">{formatCurrency(selectedCard.card?.current_price, true)}</td>
                            <td className={`p-3 text-right font-mono ${getPriceChangeColor(selectedCard.card?.price_change_pct)}`}>
                              {formatPercent(selectedCard.card?.price_change_pct)}
                            </td>
                            <td className="p-3 text-right text-zinc-400">{selectedCard.card?.grade}</td>
                            <td className="p-3 text-right text-zinc-400">—</td>
                          </tr>
                          {selectedCard.comparables?.map((comp, i) => (
                            <tr key={i} className="border-b border-white/5 hover:bg-white/[0.02]">
                              <td className="p-3">
                                <Link to={`/card/${comp.id}`} className="text-white hover:text-[#007AFF]">
                                  {comp.name}
                                </Link>
                              </td>
                              <td className="p-3 text-right font-mono text-white">{formatCurrency(comp.price, true)}</td>
                              <td className={`p-3 text-right font-mono ${getPriceChangeColor(comp.change)}`}>
                                {formatPercent(comp.change)}
                              </td>
                              <td className="p-3 text-right text-zinc-400">{comp.grade}</td>
                              <td className={`p-3 text-right font-mono ${comp.premium_discount > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                                {comp.premium_discount > 0 ? '+' : ''}{comp.premium_discount.toFixed(0)}%
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </TabsContent>

                {/* Fundamentals Tab */}
                <TabsContent value="fundamentals" className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="bg-[#0A0A0C] border border-white/10 rounded-xl p-4">
                      <span className="text-xs text-zinc-500 block mb-2">PSA Population</span>
                      <span className="font-heading font-bold text-xl text-white">
                        {selectedCard.fundamentals?.population?.toLocaleString()}
                      </span>
                      <span className="text-xs text-zinc-500 block mt-1">
                        {selectedCard.fundamentals?.pop_higher} higher graded
                      </span>
                    </div>

                    <div className="bg-[#0A0A0C] border border-white/10 rounded-xl p-4">
                      <span className="text-xs text-zinc-500 block mb-2">30-Day Avg Sale</span>
                      <span className="font-mono text-white text-lg">
                        {formatCurrency(selectedCard.fundamentals?.avg_sale_price_30d, true)}
                      </span>
                    </div>

                    <div className="bg-[#0A0A0C] border border-white/10 rounded-xl p-4">
                      <span className="text-xs text-zinc-500 block mb-2">30-Day Volume</span>
                      <span className="font-heading font-bold text-xl text-white">
                        {selectedCard.fundamentals?.sales_volume_30d}
                      </span>
                      <span className="text-xs text-zinc-500 block mt-1">sales</span>
                    </div>

                    <div className="bg-[#0A0A0C] border border-white/10 rounded-xl p-4">
                      <span className="text-xs text-zinc-500 block mb-2">Liquidity Score</span>
                      <div className="flex items-center gap-2">
                        <Progress value={selectedCard.fundamentals?.liquidity_score} className="flex-1 h-2" />
                        <span className="font-mono text-white">{selectedCard.fundamentals?.liquidity_score}</span>
                      </div>
                    </div>

                    <div className="bg-[#0A0A0C] border border-white/10 rounded-xl p-4">
                      <span className="text-xs text-zinc-500 block mb-2">Holder Sentiment</span>
                      <span className={`font-medium ${
                        selectedCard.fundamentals?.holder_sentiment === 'bullish' ? 'text-emerald-400' : 'text-amber-400'
                      }`}>
                        {selectedCard.fundamentals?.holder_sentiment === 'bullish' ? '↑ Bullish' : '→ Neutral'}
                      </span>
                    </div>

                    <div className="bg-[#0A0A0C] border border-white/10 rounded-xl p-4">
                      <span className="text-xs text-zinc-500 block mb-2">Last Sale Date</span>
                      <span className="text-white">{selectedCard.fundamentals?.last_sale_date}</span>
                    </div>
                  </div>

                  {/* AI Analysis */}
                  <div className="bg-[#0A0A0C] border border-[#00E5FF]/30 rounded-xl p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Sparkles className="w-5 h-5 text-[#00E5FF]" />
                      <h3 className="font-medium text-white">AI Investment Thesis</h3>
                    </div>
                    <p className="text-zinc-300">{selectedCard.analysis}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {selectedCard.factors?.map((factor, i) => (
                        <span key={i} className="px-2 py-1 bg-white/5 rounded-full text-xs text-zinc-400">
                          {factor}
                        </span>
                      ))}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
