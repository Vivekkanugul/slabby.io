import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { getPredictions, getCards, getCardValuation, getPlayerPerformance } from '../lib/api';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Sparkles, TrendingUp, TrendingDown, Loader2, Activity,
  Target, BarChart3, LineChart, Zap, AlertTriangle, Shield,
  DollarSign, Users, FileText, Layers, Gauge, ArrowUpRight,
  ArrowDownRight, Minus, Clock, Hash, Box
} from 'lucide-react';
import { formatCurrency, formatPercent, getPriceChangeColor } from '../lib/utils';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ComposedChart, Line, Bar, ReferenceLine, BarChart, RadarChart,
  PolarGrid, PolarAngleAxis, Radar, PolarRadiusAxis
} from 'recharts';

export default function AIInsights() {
  const [predictions, setPredictions] = useState([]);
  const [cards, setCards] = useState([]);
  const [selectedCard, setSelectedCard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [valuation, setValuation] = useState(null);
  const [playerPerf, setPlayerPerf] = useState(null);
  const [perfLoading, setPerfLoading] = useState(false);

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if (selectedCard?.card_id) {
      getCardValuation(selectedCard.card_id).then(r => setValuation(r.data)).catch(() => setValuation(null));
      setPerfLoading(true);
      getPlayerPerformance(selectedCard.card_id).then(r => setPlayerPerf(r.data)).catch(() => setPlayerPerf(null)).finally(() => setPerfLoading(false));
    }
  }, [selectedCard?.card_id]);

  const fetchData = async () => {
    try {
      const [predictionsRes, cardsRes] = await Promise.all([getPredictions(), getCards({})]);
      const enriched = predictionsRes.data.map(pred => {
        const card = cardsRes.data.find(c => c.id === pred.card_id);
        return {
          ...pred, card,
          technicals: genTechnicals(card),
          priceTargets: genPriceTargets(card),
          comparables: genComparables(card, cardsRes.data),
          fundamentals: genFundamentals(card),
          riskProfile: genRiskProfile(card),
          marketIntel: genMarketIntel(card),
        };
      });
      setPredictions(enriched);
      setCards(cardsRes.data);
      if (enriched.length > 0) setSelectedCard(enriched[0]);
    } catch (error) {
      console.error('Error fetching predictions:', error);
    } finally {
      setLoading(false);
    }
  };

  const chartData = useMemo(() => {
    if (!selectedCard?.card) return [];
    return genChartData(selectedCard.card);
  }, [selectedCard?.card_id]);

  const volumeData = useMemo(() => {
    if (!selectedCard?.card) return [];
    return genVolumeProfile(selectedCard.card);
  }, [selectedCard?.card_id]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[#00E5FF]" /></div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" data-testid="ai-insights-page">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2 rounded-lg bg-gradient-to-br from-[#00E5FF] to-[#007AFF]">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <h1 className="font-heading font-bold text-2xl sm:text-3xl text-white">AI Research Terminal</h1>
        </div>
        <p className="text-zinc-500 text-sm">Deep analytics per card — technical, fundamental, risk, and market intelligence</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Card Selector */}
        <div className="lg:col-span-1">
          <div className="bg-[#0A0A0C] border border-white/10 rounded-xl p-3 sticky top-20">
            <h3 className="font-medium text-white mb-3 flex items-center gap-2 text-sm">
              <FileText className="w-4 h-4 text-[#00E5FF]" />Coverage
            </h3>
            <div className="space-y-1.5">
              {predictions.map((pred) => (
                <button
                  key={pred.id}
                  onClick={() => setSelectedCard(pred)}
                  data-testid={`research-card-${pred.card_id}`}
                  className={`w-full p-2.5 rounded-lg text-left transition-all ${
                    selectedCard?.id === pred.id
                      ? 'bg-[#007AFF]/20 border border-[#007AFF]/40'
                      : 'bg-white/[0.03] hover:bg-white/[0.06] border border-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs text-white font-medium truncate flex-1">{pred.card?.player_name}</span>
                    <SignalBadge signal={pred.signal} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-zinc-500">{pred.card?.category}</span>
                    <span className={`text-[10px] font-mono ${getPriceChangeColor(pred.card?.price_change_pct)}`}>
                      {formatPercent(pred.card?.price_change_pct)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Panel */}
        <div className="lg:col-span-4 space-y-5">
          {selectedCard && (
            <>
              {/* Card Header */}
              <CardHeader card={selectedCard} valuation={valuation} />

              {/* Quick Stats Row */}
              <QuickStats card={selectedCard} valuation={valuation} />

              {/* Analysis Tabs */}
              <Tabs defaultValue="technicals" className="space-y-4">
                <TabsList className="bg-[#0A0A0C] border border-white/10 p-1 flex-wrap h-auto gap-1">
                  <TabsTrigger value="technicals" className="data-[state=active]:bg-white/10 text-xs" data-testid="tab-technicals">
                    <LineChart className="w-3.5 h-3.5 mr-1.5" />Technical
                  </TabsTrigger>
                  <TabsTrigger value="targets" className="data-[state=active]:bg-white/10 text-xs" data-testid="tab-targets">
                    <Target className="w-3.5 h-3.5 mr-1.5" />Price Targets
                  </TabsTrigger>
                  <TabsTrigger value="comparables" className="data-[state=active]:bg-white/10 text-xs" data-testid="tab-comparables">
                    <Users className="w-3.5 h-3.5 mr-1.5" />Comps
                  </TabsTrigger>
                  <TabsTrigger value="fundamentals" className="data-[state=active]:bg-white/10 text-xs" data-testid="tab-fundamentals">
                    <BarChart3 className="w-3.5 h-3.5 mr-1.5" />Fundamentals
                  </TabsTrigger>
                  <TabsTrigger value="risk" className="data-[state=active]:bg-white/10 text-xs" data-testid="tab-risk">
                    <Shield className="w-3.5 h-3.5 mr-1.5" />Risk
                  </TabsTrigger>
                  <TabsTrigger value="market" className="data-[state=active]:bg-white/10 text-xs" data-testid="tab-market">
                    <Layers className="w-3.5 h-3.5 mr-1.5" />Market Intel
                  </TabsTrigger>
                  <TabsTrigger value="performance" className="data-[state=active]:bg-white/10 text-xs" data-testid="tab-performance">
                    <Activity className="w-3.5 h-3.5 mr-1.5" />Player Stats
                  </TabsTrigger>
                </TabsList>

                {/* TECHNICAL TAB */}
                <TabsContent value="technicals" className="space-y-4">
                  <div className="bg-[#0A0A0C] border border-white/10 rounded-xl p-5">
                    <h3 className="font-medium text-white mb-4 text-sm">90-Day Price with Moving Averages</h3>
                    <ResponsiveContainer width="100%" height={280}>
                      <ComposedChart data={chartData}>
                        <defs>
                          <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#007AFF" stopOpacity={0.25} />
                            <stop offset="100%" stopColor="#007AFF" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#52525B', fontSize: 10 }} interval={14} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#52525B', fontSize: 10 }} tickFormatter={v => `$${v >= 1000 ? (v/1000).toFixed(0)+'K' : v}`} domain={['auto','auto']} />
                        <Tooltip content={<PriceTooltip />} />
                        <Area type="monotone" dataKey="price" stroke="#007AFF" fill="url(#priceGrad)" strokeWidth={2} />
                        <Line type="monotone" dataKey="ma20" stroke="#00E5FF" dot={false} strokeWidth={1.5} strokeDasharray="5 5" />
                        <Line type="monotone" dataKey="ma50" stroke="#F59E0B" dot={false} strokeWidth={1.5} strokeDasharray="3 3" />
                        <Line type="monotone" dataKey="upper_bb" stroke="#6366F1" dot={false} strokeWidth={1} strokeDasharray="2 2" opacity={0.5} />
                        <Line type="monotone" dataKey="lower_bb" stroke="#6366F1" dot={false} strokeWidth={1} strokeDasharray="2 2" opacity={0.5} />
                        <Bar dataKey="volume" fill="#007AFF" opacity={0.15} yAxisId="vol" />
                        <YAxis yAxisId="vol" orientation="right" hide domain={[0, 'auto']} />
                      </ComposedChart>
                    </ResponsiveContainer>
                    <div className="flex items-center justify-center gap-4 mt-3 flex-wrap">
                      {[['#007AFF','Price','solid'],['#00E5FF','MA-20','dashed'],['#F59E0B','MA-50','dashed'],['#6366F1','Bollinger','dotted']].map(([c,l,s])=>(
                        <div key={l} className="flex items-center gap-1.5">
                          <div className="w-4 h-0.5" style={{backgroundColor:c, borderTop: s==='dashed'?`2px dashed ${c}`:s==='dotted'?`1px dotted ${c}`:'none', background: s==='solid'?c:'transparent'}} />
                          <span className="text-[10px] text-zinc-500">{l}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Technical Indicators Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <IndicatorCard label="RSI (14)" value={selectedCard.technicals?.rsi?.toFixed(0)} sub={selectedCard.technicals?.rsi > 70 ? 'Overbought' : selectedCard.technicals?.rsi < 30 ? 'Oversold' : 'Neutral'} color={selectedCard.technicals?.rsi > 70 ? 'text-red-400' : selectedCard.technicals?.rsi < 30 ? 'text-emerald-400' : 'text-white'} progress={selectedCard.technicals?.rsi} />
                    <IndicatorCard label="MACD" value={selectedCard.technicals?.macd === 'bullish' ? 'Bullish' : 'Bearish'} sub={selectedCard.technicals?.macd_histogram > 0 ? 'Histogram positive' : 'Histogram negative'} color={selectedCard.technicals?.macd === 'bullish' ? 'text-emerald-400' : 'text-red-400'} />
                    <IndicatorCard label="Stochastic %K" value={selectedCard.technicals?.stochastic?.toFixed(0)} sub={selectedCard.technicals?.stochastic > 80 ? 'Overbought' : selectedCard.technicals?.stochastic < 20 ? 'Oversold' : 'Neutral'} color="text-white" progress={selectedCard.technicals?.stochastic} />
                    <IndicatorCard label="ADX (Trend)" value={selectedCard.technicals?.adx?.toFixed(0)} sub={selectedCard.technicals?.adx > 25 ? 'Strong trend' : 'Weak trend'} color={selectedCard.technicals?.adx > 25 ? 'text-cyan-400' : 'text-zinc-400'} progress={selectedCard.technicals?.adx} />
                  </div>

                  {/* Support/Resistance + Key Levels */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="bg-[#0A0A0C] border border-white/10 rounded-xl p-4">
                      <h4 className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Key Levels</h4>
                      <div className="space-y-2.5">
                        <LevelRow label="Resistance 2" value={selectedCard.technicals?.resistance_2} current={selectedCard.card?.current_price} />
                        <LevelRow label="Resistance 1" value={selectedCard.technicals?.resistance} current={selectedCard.card?.current_price} />
                        <div className="flex items-center justify-between py-1.5 px-2 bg-[#007AFF]/10 rounded border border-[#007AFF]/20">
                          <span className="text-xs text-[#007AFF] font-medium">Current Price</span>
                          <span className="font-mono text-sm text-white">{formatCurrency(selectedCard.card?.current_price, true)}</span>
                        </div>
                        <LevelRow label="Support 1" value={selectedCard.technicals?.support} current={selectedCard.card?.current_price} />
                        <LevelRow label="Support 2" value={selectedCard.technicals?.support_2} current={selectedCard.card?.current_price} />
                      </div>
                    </div>
                    <div className="bg-[#0A0A0C] border border-white/10 rounded-xl p-4">
                      <h4 className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Momentum Signals</h4>
                      <div className="space-y-2">
                        <SignalRow label="Money Flow Index" value={selectedCard.technicals?.mfi} type={selectedCard.technicals?.mfi > 50 ? 'bullish' : 'bearish'} />
                        <SignalRow label="Volume Trend" value={selectedCard.technicals?.volume_trend} type={selectedCard.technicals?.volume_trend === 'increasing' ? 'bullish' : 'neutral'} />
                        <SignalRow label="Price vs MA-20" value={selectedCard.card?.current_price > selectedCard.technicals?.ma_20 ? 'Above' : 'Below'} type={selectedCard.card?.current_price > selectedCard.technicals?.ma_20 ? 'bullish' : 'bearish'} />
                        <SignalRow label="Price vs MA-50" value={selectedCard.card?.current_price > selectedCard.technicals?.ma_50 ? 'Above' : 'Below'} type={selectedCard.card?.current_price > selectedCard.technicals?.ma_50 ? 'bullish' : 'bearish'} />
                        <SignalRow label="Bollinger Position" value={selectedCard.technicals?.bb_position} type={selectedCard.technicals?.bb_position === 'Upper band' ? 'bearish' : selectedCard.technicals?.bb_position === 'Lower band' ? 'bullish' : 'neutral'} />
                        <SignalRow label="Trend Direction" value={selectedCard.technicals?.trend_direction} type={selectedCard.technicals?.trend_direction === 'Uptrend' ? 'bullish' : selectedCard.technicals?.trend_direction === 'Downtrend' ? 'bearish' : 'neutral'} />
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* PRICE TARGETS TAB */}
                <TabsContent value="targets" className="space-y-4">
                  <div className="bg-[#0A0A0C] border border-white/10 rounded-xl p-5">
                    <h3 className="font-medium text-white mb-4 text-sm">12-Month AI Price Targets</h3>
                    {/* Visual Target Bar */}
                    <TargetBar card={selectedCard} />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <ScenarioCard type="bull" data={selectedCard.priceTargets?.bull_case} />
                    <ScenarioCard type="base" data={selectedCard.priceTargets?.base_case} />
                    <ScenarioCard type="bear" data={selectedCard.priceTargets?.bear_case} />
                  </div>

                  {/* Time Horizon Breakdown */}
                  <div className="bg-[#0A0A0C] border border-white/10 rounded-xl p-5">
                    <h3 className="font-medium text-white mb-4 text-sm">Price Targets by Time Horizon</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead><tr className="border-b border-white/10">
                          {['Horizon','Target','Change','Confidence','Risk/Reward'].map(h=><th key={h} className="text-left text-[10px] text-zinc-500 uppercase p-2.5">{h}</th>)}
                        </tr></thead>
                        <tbody>
                          {selectedCard.priceTargets?.horizons?.map((h,i)=>(
                            <tr key={i} className="border-b border-white/5">
                              <td className="p-2.5 text-white font-medium">{h.label}</td>
                              <td className="p-2.5 font-mono text-white">{formatCurrency(h.target, true)}</td>
                              <td className={`p-2.5 font-mono ${getPriceChangeColor(h.change)}`}>{h.change > 0 ? '+' : ''}{h.change.toFixed(1)}%</td>
                              <td className="p-2.5"><div className="flex items-center gap-2"><Progress value={h.confidence} className="w-16 h-1.5" /><span className="text-xs text-zinc-400">{h.confidence}%</span></div></td>
                              <td className="p-2.5 font-mono text-xs text-zinc-400">{h.riskReward}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </TabsContent>

                {/* COMPARABLES TAB */}
                <TabsContent value="comparables" className="space-y-4">
                  <div className="bg-[#0A0A0C] border border-white/10 rounded-xl p-5">
                    <h3 className="font-medium text-white mb-4 text-sm">Peer Comparison — {selectedCard.card?.category}</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead><tr className="border-b border-white/10">
                          {['Player','Price','24h','Grade','Volume','Volatility','Sharpe','Premium/Discount'].map(h=>(
                            <th key={h} className="text-left text-[10px] text-zinc-500 uppercase p-2.5">{h}</th>
                          ))}
                        </tr></thead>
                        <tbody>
                          <tr className="border-b border-[#007AFF]/20 bg-[#007AFF]/5">
                            <td className="p-2.5 font-medium text-white">{selectedCard.card?.player_name} <span className="text-[10px] text-[#007AFF]">(THIS)</span></td>
                            <td className="p-2.5 font-mono text-white">{formatCurrency(selectedCard.card?.current_price, true)}</td>
                            <td className={`p-2.5 font-mono ${getPriceChangeColor(selectedCard.card?.price_change_pct)}`}>{formatPercent(selectedCard.card?.price_change_pct)}</td>
                            <td className="p-2.5 text-zinc-400">{selectedCard.card?.grade}</td>
                            <td className="p-2.5 text-zinc-400">{selectedCard.card?.volume_24h}</td>
                            <td className="p-2.5 text-zinc-400">{selectedCard.card?.volatility_30d}%</td>
                            <td className="p-2.5 text-zinc-400">{selectedCard.card?.sharpe_ratio}</td>
                            <td className="p-2.5 text-zinc-400">&mdash;</td>
                          </tr>
                          {selectedCard.comparables?.map((comp, i) => (
                            <tr key={i} className="border-b border-white/5 hover:bg-white/[0.02]">
                              <td className="p-2.5"><Link to={`/card/${comp.id}`} className="text-white hover:text-[#007AFF]">{comp.name}</Link></td>
                              <td className="p-2.5 font-mono text-white">{formatCurrency(comp.price, true)}</td>
                              <td className={`p-2.5 font-mono ${getPriceChangeColor(comp.change)}`}>{formatPercent(comp.change)}</td>
                              <td className="p-2.5 text-zinc-400">{comp.grade}</td>
                              <td className="p-2.5 text-zinc-400">{comp.volume}</td>
                              <td className="p-2.5 text-zinc-400">{comp.volatility}%</td>
                              <td className="p-2.5 text-zinc-400">{comp.sharpe}</td>
                              <td className={`p-2.5 font-mono ${comp.premium_discount > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                                {comp.premium_discount > 0 ? '+' : ''}{comp.premium_discount.toFixed(0)}%
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Radar Comparison */}
                  <div className="bg-[#0A0A0C] border border-white/10 rounded-xl p-5">
                    <h3 className="font-medium text-white mb-4 text-sm">Attribute Radar vs Peer Average</h3>
                    <ResponsiveContainer width="100%" height={280}>
                      <RadarChart data={selectedCard.comparables?.length ? genRadarData(selectedCard) : []}>
                        <PolarGrid stroke="#27272A" />
                        <PolarAngleAxis dataKey="metric" tick={{ fill: '#71717A', fontSize: 11 }} />
                        <Radar name="This Card" dataKey="card" stroke="#007AFF" fill="#007AFF" fillOpacity={0.15} strokeWidth={2} />
                        <Radar name="Peer Avg" dataKey="peer" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.08} strokeWidth={1.5} strokeDasharray="4 4" />
                      </RadarChart>
                    </ResponsiveContainer>
                    <div className="flex items-center justify-center gap-6 mt-2">
                      <div className="flex items-center gap-1.5"><div className="w-3 h-0.5 bg-[#007AFF]" /><span className="text-[10px] text-zinc-500">This Card</span></div>
                      <div className="flex items-center gap-1.5"><div className="w-3 h-0.5 bg-amber-500" /><span className="text-[10px] text-zinc-500">Peer Average</span></div>
                    </div>
                  </div>
                </TabsContent>

                {/* FUNDAMENTALS TAB */}
                <TabsContent value="fundamentals" className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <FundCard label="PSA Population" value={selectedCard.fundamentals?.population?.toLocaleString()} sub={`${selectedCard.fundamentals?.pop_higher} graded higher`} icon={<Hash className="w-4 h-4 text-cyan-400" />} />
                    <FundCard label="Scarcity Index" value={`${selectedCard.fundamentals?.scarcity_index}/100`} sub={selectedCard.fundamentals?.scarcity_index > 80 ? 'Extremely rare' : selectedCard.fundamentals?.scarcity_index > 50 ? 'Rare' : 'Common'} icon={<Box className="w-4 h-4 text-purple-400" />} />
                    <FundCard label="30d Avg Sale" value={formatCurrency(selectedCard.fundamentals?.avg_sale_price_30d, true)} sub={`${selectedCard.fundamentals?.sales_volume_30d} sales`} icon={<DollarSign className="w-4 h-4 text-emerald-400" />} />
                    <FundCard label="Liquidity" value={`${selectedCard.fundamentals?.liquidity_score}/100`} sub={selectedCard.fundamentals?.liquidity_score > 70 ? 'Highly liquid' : selectedCard.fundamentals?.liquidity_score > 40 ? 'Moderate' : 'Illiquid'} icon={<Activity className="w-4 h-4 text-blue-400" />} />
                  </div>

                  {/* Grade Population Breakdown */}
                  <div className="bg-[#0A0A0C] border border-white/10 rounded-xl p-5">
                    <h3 className="font-medium text-white mb-4 text-sm">Grade Population Distribution</h3>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={selectedCard.fundamentals?.grade_distribution || []}>
                        <XAxis dataKey="grade" axisLine={false} tickLine={false} tick={{ fill: '#71717A', fontSize: 11 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#52525B', fontSize: 10 }} />
                        <Tooltip content={<GradeTooltip />} />
                        <Bar dataKey="count" radius={[4,4,0,0]}>
                          {(selectedCard.fundamentals?.grade_distribution || []).map((entry, i) => (
                            <rect key={i} fill={entry.grade === selectedCard.card?.grade?.replace('PSA ','')?.replace('BGS ','') ? '#007AFF' : '#27272A'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                    <div className="text-center mt-1"><span className="text-[10px] text-zinc-500">Highlighted = this card's grade</span></div>
                  </div>

                  {/* Supply/Demand + Ownership */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="bg-[#0A0A0C] border border-white/10 rounded-xl p-4">
                      <h4 className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Supply & Demand</h4>
                      <div className="space-y-3">
                        <MetricRow label="Active Sellers" value={selectedCard.fundamentals?.active_sellers} />
                        <MetricRow label="Active Buyers" value={selectedCard.fundamentals?.active_buyers} />
                        <MetricRow label="Buyer/Seller Ratio" value={selectedCard.fundamentals?.buyer_seller_ratio?.toFixed(2)} highlight={selectedCard.fundamentals?.buyer_seller_ratio > 1} />
                        <MetricRow label="Avg Days to Sell" value={`${selectedCard.fundamentals?.avg_days_to_sell}d`} />
                        <MetricRow label="Absorption Rate" value={`${selectedCard.fundamentals?.absorption_rate}%`} />
                      </div>
                    </div>
                    <div className="bg-[#0A0A0C] border border-white/10 rounded-xl p-4">
                      <h4 className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Card Details</h4>
                      <div className="space-y-3">
                        <MetricRow label="Year" value={selectedCard.card?.year} />
                        <MetricRow label="Set" value={selectedCard.card?.set_name} />
                        <MetricRow label="Grade" value={selectedCard.card?.grade} />
                        <MetricRow label="Rarity" value={selectedCard.card?.rarity} />
                        <MetricRow label="Holder Sentiment" value={selectedCard.fundamentals?.holder_sentiment === 'bullish' ? 'Bullish' : 'Neutral'} highlight={selectedCard.fundamentals?.holder_sentiment === 'bullish'} />
                      </div>
                    </div>
                  </div>

                  {/* AI Thesis */}
                  <div className="bg-[#0A0A0C] border border-[#00E5FF]/20 rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles className="w-4 h-4 text-[#00E5FF]" />
                      <h3 className="font-medium text-white text-sm">AI Investment Thesis</h3>
                    </div>
                    <p className="text-zinc-300 text-sm leading-relaxed">{selectedCard.analysis}</p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {selectedCard.factors?.map((f, i) => (
                        <span key={i} className="px-2 py-0.5 bg-white/5 rounded-full text-[10px] text-zinc-400">{f}</span>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                {/* RISK TAB */}
                <TabsContent value="risk" className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <RiskCard label="Volatility (30d)" value={`${selectedCard.riskProfile?.volatility_30d}%`} rating={selectedCard.riskProfile?.volatility_30d > 30 ? 'High' : selectedCard.riskProfile?.volatility_30d > 15 ? 'Medium' : 'Low'} />
                    <RiskCard label="Max Drawdown" value={`-${selectedCard.riskProfile?.max_drawdown}%`} rating={selectedCard.riskProfile?.max_drawdown > 25 ? 'High' : 'Medium'} />
                    <RiskCard label="Beta" value={selectedCard.riskProfile?.beta?.toFixed(2)} rating={selectedCard.riskProfile?.beta > 1.3 ? 'High' : selectedCard.riskProfile?.beta < 0.7 ? 'Low' : 'Medium'} />
                    <RiskCard label="Sharpe Ratio" value={selectedCard.riskProfile?.sharpe?.toFixed(2)} rating={selectedCard.riskProfile?.sharpe > 1.5 ? 'Good' : selectedCard.riskProfile?.sharpe > 0.8 ? 'Fair' : 'Poor'} />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="bg-[#0A0A0C] border border-white/10 rounded-xl p-4">
                      <h4 className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Risk Factors</h4>
                      <div className="space-y-2">
                        {selectedCard.riskProfile?.factors?.map((f, i) => (
                          <div key={i} className="flex items-start gap-2 p-2 bg-white/[0.02] rounded-lg">
                            <AlertTriangle className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${f.severity === 'high' ? 'text-red-400' : f.severity === 'medium' ? 'text-amber-400' : 'text-zinc-500'}`} />
                            <div>
                              <span className="text-xs text-white">{f.title}</span>
                              <span className="text-[10px] text-zinc-500 block">{f.description}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="bg-[#0A0A0C] border border-white/10 rounded-xl p-4">
                      <h4 className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Scenario Stress Test</h4>
                      <div className="space-y-2">
                        {selectedCard.riskProfile?.stress_scenarios?.map((s, i) => (
                          <div key={i} className="flex items-center justify-between p-2 bg-white/[0.02] rounded-lg">
                            <span className="text-xs text-zinc-300">{s.scenario}</span>
                            <span className={`text-xs font-mono ${s.impact < 0 ? 'text-red-400' : 'text-emerald-400'}`}>{s.impact > 0 ? '+' : ''}{s.impact}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Overall Risk Score */}
                  <div className="bg-[#0A0A0C] border border-white/10 rounded-xl p-5">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-medium text-white">Overall Risk Score</h4>
                      <span className={`text-xl font-bold font-mono ${selectedCard.riskProfile?.overall_score > 70 ? 'text-red-400' : selectedCard.riskProfile?.overall_score > 40 ? 'text-amber-400' : 'text-emerald-400'}`}>{selectedCard.riskProfile?.overall_score}/100</span>
                    </div>
                    <Progress value={selectedCard.riskProfile?.overall_score} className="h-2" />
                    <div className="flex justify-between mt-1"><span className="text-[10px] text-emerald-400">Low Risk</span><span className="text-[10px] text-red-400">High Risk</span></div>
                  </div>
                </TabsContent>

                {/* MARKET INTEL TAB */}
                <TabsContent value="market" className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <FundCard label="Market Cap" value={formatCurrency(selectedCard.card?.market_cap, true)} sub="Total market" icon={<DollarSign className="w-4 h-4 text-emerald-400" />} />
                    <FundCard label="24h Volume" value={selectedCard.card?.volume_24h?.toString()} sub="transactions" icon={<Activity className="w-4 h-4 text-blue-400" />} />
                    <FundCard label="Bid-Ask Spread" value={`${selectedCard.marketIntel?.bid_ask_spread}%`} sub={selectedCard.marketIntel?.bid_ask_spread < 5 ? 'Tight' : 'Wide'} icon={<Layers className="w-4 h-4 text-purple-400" />} />
                    <FundCard label="Market Depth" value={selectedCard.marketIntel?.market_depth} sub="score" icon={<Gauge className="w-4 h-4 text-orange-400" />} />
                  </div>

                  {/* Recent Sales */}
                  <div className="bg-[#0A0A0C] border border-white/10 rounded-xl p-5">
                    <h3 className="font-medium text-white mb-4 text-sm">Recent Sales History</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead><tr className="border-b border-white/10">
                          {['Date','Platform','Price','vs Current','Grade'].map(h=><th key={h} className="text-left text-[10px] text-zinc-500 uppercase p-2.5">{h}</th>)}
                        </tr></thead>
                        <tbody>
                          {selectedCard.marketIntel?.recent_sales?.map((s, i) => {
                            const diff = ((s.price - selectedCard.card?.current_price) / selectedCard.card?.current_price * 100);
                            return (
                              <tr key={i} className="border-b border-white/5">
                                <td className="p-2.5 text-zinc-400">{s.date}</td>
                                <td className="p-2.5 text-zinc-300">{s.platform}</td>
                                <td className="p-2.5 font-mono text-white">{formatCurrency(s.price, true)}</td>
                                <td className={`p-2.5 font-mono ${getPriceChangeColor(diff)}`}>{diff > 0 ? '+' : ''}{diff.toFixed(1)}%</td>
                                <td className="p-2.5 text-zinc-400">{s.grade}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Volume Profile */}
                  <div className="bg-[#0A0A0C] border border-white/10 rounded-xl p-5">
                    <h3 className="font-medium text-white mb-4 text-sm">30-Day Volume Profile</h3>
                    <ResponsiveContainer width="100%" height={160}>
                      <BarChart data={volumeData}>
                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#52525B', fontSize: 10 }} interval={4} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#52525B', fontSize: 10 }} />
                        <Tooltip content={<VolumeTooltip />} />
                        <Bar dataKey="volume" fill="#007AFF" radius={[2,2,0,0]} opacity={0.7} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </TabsContent>

                {/* PLAYER STATS TAB */}
                <TabsContent value="performance" className="space-y-4">
                  <PlayerStatsTab perf={playerPerf} loading={perfLoading} />
                </TabsContent>
              </Tabs>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ===== PLAYER STATS TAB =====

function PlayerStatsTab({ perf, loading }) {
  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-[#007AFF]" /></div>;
  if (!perf) return <div className="text-center py-12 text-zinc-500 text-sm">No performance data available</div>;

  if (!perf.has_current_data) {
    return (
      <div className="bg-[#0A0A0C] border border-white/10 rounded-xl p-6 text-center">
        <Shield className="w-10 h-10 text-amber-400 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-white mb-2">{perf.player_name} — {perf.status === 'retired' ? 'Retired' : 'Legacy'}</h3>
        <p className="text-zinc-400 text-sm mb-4">{perf.legacy_note}</p>
        {perf.career_highlights && (
          <div className="flex items-center justify-center gap-6">
            {perf.career_highlights.championships > 0 && <div className="text-center"><span className="text-2xl font-bold text-amber-400">{perf.career_highlights.championships}</span><span className="text-[10px] text-zinc-500 block">Championships</span></div>}
            {perf.career_highlights.hall_of_fame && <div className="text-center"><span className="text-2xl font-bold text-amber-400">HOF</span><span className="text-[10px] text-zinc-500 block">Hall of Fame</span></div>}
          </div>
        )}
        <p className="text-xs text-zinc-500 mt-4">Value driven by scarcity, legacy, and collector demand — not current on-field performance.</p>
      </div>
    );
  }

  const sportConfig = {
    NBA: { primary: ['points','rebounds','assists','minutes'], gameHeaders: ['Date','OPP','MIN','PTS','REB','AST','STL','BLK','FG%','3P%','W/L','Impact'], gameFields: (g) => [g.date, g.opponent, g.minutes, g.points, g.rebounds, g.assists, g.steals, g.blocks, `${g.fg_pct}%`, `${g.three_pt_pct}%`, g.result, g.impact_score] },
    MLB: { primary: ['batting_avg','home_runs','rbi'], gameHeaders: ['Date','OPP','AB','H','HR','RBI','R','SB','AVG','W/L','Impact'], gameFields: (g) => [g.date, g.opponent, g.at_bats, g.hits, g.home_runs, g.rbi, g.runs, g.stolen_bases, g.batting_avg?.toFixed(3), g.result, g.impact_score] },
    NFL: { primary: ['passing_yards','passing_tds','passer_rating'], gameHeaders: ['Date','OPP','PASS YDS','PASS TD','INT','RUSH YDS','CMP%','RTG','W/L','Impact'], gameFields: (g) => [g.date, g.opponent, g.passing_yards, g.passing_tds, g.interceptions, g.rushing_yards, `${g.completion_pct}%`, g.passer_rating, g.result, g.impact_score] },
    NHL: { primary: ['goals','assists','points','shots'], gameHeaders: ['Date','OPP','TOI','G','A','PTS','SOG','+/-','HIT','W/L','Impact'], gameFields: (g) => [g.date, g.opponent, g.ice_time, g.goals, g.assists, g.points, g.shots, g.plus_minus > 0 ? `+${g.plus_minus}` : g.plus_minus, g.hits, g.result, g.impact_score] },
  };

  const config = sportConfig[perf.sport] || sportConfig.NBA;
  const impactColor = perf.performance_impact.includes('bullish') ? 'text-emerald-400' : perf.performance_impact.includes('bearish') ? 'text-red-400' : 'text-zinc-400';
  const impactBg = perf.performance_impact.includes('bullish') ? 'bg-emerald-500/10 border-emerald-500/20' : perf.performance_impact.includes('bearish') ? 'bg-red-500/10 border-red-500/20' : 'bg-white/5 border-white/10';

  return (
    <>
      {/* Performance Impact Banner */}
      <div className={`${impactBg} border rounded-xl p-4 flex items-center justify-between`}>
        <div className="flex items-center gap-3">
          <Activity className={`w-5 h-5 ${impactColor}`} />
          <div>
            <span className={`text-sm font-semibold ${impactColor}`}>{perf.performance_impact_label}</span>
            <span className="text-[10px] text-zinc-500 block">{perf.player_name} &middot; {perf.team} &middot; {perf.sport}</span>
          </div>
        </div>
        <div className="text-right">
          <span className={`text-lg font-bold font-mono ${impactColor}`}>{perf.performance_impact_score > 0 ? '+' : ''}{perf.performance_impact_score}</span>
          <span className="text-[10px] text-zinc-500 block">Impact Score</span>
        </div>
      </div>

      {/* Streak + Trend */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="bg-[#0A0A0C] border border-white/10 rounded-xl p-4">
          <h4 className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Current Streak</h4>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${perf.streak?.type === 'hot' ? 'bg-emerald-500/20' : perf.streak?.type === 'cold' ? 'bg-red-500/20' : 'bg-white/5'}`}>
              {perf.streak?.type === 'hot' ? <Zap className="w-5 h-5 text-emerald-400" /> : perf.streak?.type === 'cold' ? <TrendingDown className="w-5 h-5 text-red-400" /> : <Minus className="w-5 h-5 text-zinc-400" />}
            </div>
            <div>
              <span className={`text-sm font-semibold ${perf.streak?.type === 'hot' ? 'text-emerald-400' : perf.streak?.type === 'cold' ? 'text-red-400' : 'text-white'}`}>{perf.streak?.label}</span>
              <span className="text-[10px] text-zinc-500 block">{perf.streak?.description}</span>
            </div>
          </div>
        </div>

        <div className="bg-[#0A0A0C] border border-white/10 rounded-xl p-4">
          <h4 className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Overall Trend</h4>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${perf.trend_direction === 'rising' ? 'bg-emerald-500/20' : perf.trend_direction === 'declining' ? 'bg-red-500/20' : perf.trend_direction === 'inconsistent' ? 'bg-amber-500/20' : 'bg-white/5'}`}>
              {perf.trend_direction === 'rising' ? <TrendingUp className="w-5 h-5 text-emerald-400" /> : perf.trend_direction === 'declining' ? <TrendingDown className="w-5 h-5 text-red-400" /> : <Activity className="w-5 h-5 text-amber-400" />}
            </div>
            <div>
              <span className={`text-sm font-semibold capitalize ${perf.trend_direction === 'rising' ? 'text-emerald-400' : perf.trend_direction === 'declining' ? 'text-red-400' : perf.trend_direction === 'inconsistent' ? 'text-amber-400' : 'text-white'}`}>{perf.trend_direction}</span>
              <span className="text-[10px] text-zinc-500 block">Based on last 20 games</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stat Trends — First 10 vs Last 10 */}
      <div className="bg-[#0A0A0C] border border-white/10 rounded-xl p-5">
        <h4 className="text-xs text-zinc-500 uppercase tracking-wider mb-4">Stat Trends (First 10 Games vs Last 10 Games)</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {Object.entries(perf.trends || {}).map(([key, t]) => (
            <div key={key} className="p-3 bg-white/[0.03] rounded-lg">
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-2">{key.replace(/_/g, ' ')}</span>
              <div className="flex items-end justify-between">
                <div>
                  <span className="text-xs text-zinc-500">{t.first_10}</span>
                  <span className="text-zinc-600 mx-1">&rarr;</span>
                  <span className="text-sm font-bold text-white">{t.last_10}</span>
                </div>
                <span className={`text-xs font-mono font-semibold flex items-center gap-0.5 ${t.direction === 'up' ? 'text-emerald-400' : t.direction === 'down' ? 'text-red-400' : 'text-zinc-500'}`}>
                  {t.direction === 'up' ? <ArrowUpRight className="w-3 h-3" /> : t.direction === 'down' ? <ArrowDownRight className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                  {t.change_pct > 0 ? '+' : ''}{t.change_pct}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Impact Chart */}
      <div className="bg-[#0A0A0C] border border-white/10 rounded-xl p-5">
        <h4 className="text-xs text-zinc-500 uppercase tracking-wider mb-4">Game Impact Score (Last 20 Games)</h4>
        <ResponsiveContainer width="100%" height={180}>
          <ComposedChart data={perf.game_log || []}>
            <XAxis dataKey="game_number" axisLine={false} tickLine={false} tick={{ fill: '#52525B', fontSize: 10 }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#52525B', fontSize: 10 }} domain={[-50, 60]} />
            <Tooltip content={<ImpactTooltip sport={perf.sport} />} />
            <ReferenceLine y={0} stroke="#27272A" strokeDasharray="3 3" />
            <Bar dataKey="impact_score" radius={[3,3,0,0]}>
              {(perf.game_log || []).map((entry, i) => (
                <rect key={i} fill={entry.impact_score > 15 ? '#10B981' : entry.impact_score > 0 ? '#007AFF' : entry.impact_score > -15 ? '#F59E0B' : '#EF4444'} />
              ))}
            </Bar>
          </ComposedChart>
        </ResponsiveContainer>
        <div className="flex items-center justify-center gap-4 mt-2 flex-wrap">
          {[['#10B981','Big game'],['#007AFF','Good'],['#F59E0B','Average'],['#EF4444','Poor']].map(([c,l])=>(
            <div key={l} className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm" style={{backgroundColor:c}} /><span className="text-[10px] text-zinc-500">{l}</span></div>
          ))}
        </div>
      </div>

      {/* Game Log */}
      <div className="bg-[#0A0A0C] border border-white/10 rounded-xl p-5">
        <h4 className="text-xs text-zinc-500 uppercase tracking-wider mb-4">Game Log (Last 20)</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="border-b border-white/10">
              {config.gameHeaders.map(h => <th key={h} className="text-left text-[10px] text-zinc-500 uppercase p-2">{h}</th>)}
            </tr></thead>
            <tbody>
              {[...(perf.game_log || [])].reverse().map((g, i) => {
                const fields = config.gameFields(g);
                return (
                  <tr key={i} className="border-b border-white/5 hover:bg-white/[0.02]">
                    {fields.map((f, j) => {
                      const isImpact = j === fields.length - 1;
                      const isResult = config.gameHeaders[j] === 'W/L';
                      return (
                        <td key={j} className={`p-2 font-mono ${isImpact ? (f > 15 ? 'text-emerald-400 font-bold' : f < -15 ? 'text-red-400 font-bold' : 'text-zinc-400') : isResult ? (f === 'W' ? 'text-emerald-400' : 'text-red-400') : 'text-zinc-300'}`}>
                          {isImpact ? (f > 0 ? `+${f}` : f) : f}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function ImpactTooltip({ active, payload, sport }) {
  if (!active || !payload?.length) return null;
  const g = payload[0]?.payload;
  if (!g) return null;
  return (
    <div className="bg-[#0E0E12] border border-white/10 rounded-lg p-2.5 shadow-xl max-w-xs">
      <p className="text-[10px] text-zinc-400">Game {g.game_number} &middot; {g.date} vs {g.opponent}</p>
      <p className={`font-mono text-sm font-bold ${g.impact_score > 0 ? 'text-emerald-400' : 'text-red-400'}`}>Impact: {g.impact_score > 0 ? '+' : ''}{g.impact_score}</p>
      {sport === 'NBA' && <p className="text-[10px] text-zinc-300">{g.points}pts {g.rebounds}reb {g.assists}ast</p>}
      {sport === 'MLB' && <p className="text-[10px] text-zinc-300">{g.hits}H {g.home_runs}HR {g.rbi}RBI</p>}
      {sport === 'NFL' && <p className="text-[10px] text-zinc-300">{g.passing_yards}yds {g.passing_tds}TD {g.interceptions}INT</p>}
      {sport === 'NHL' && <p className="text-[10px] text-zinc-300">{g.goals}G {g.assists}A {g.shots}SOG</p>}
      <p className={`text-[10px] ${g.result === 'W' ? 'text-emerald-400' : 'text-red-400'}`}>{g.result}</p>
    </div>
  );
}

// ===== DATA GENERATORS =====

function genTechnicals(card) {
  if (!card) return null;
  const p = card.current_price;
  const rsi = Math.max(15, Math.min(85, 50 + card.price_change_pct * 2.5));
  const stoch = Math.max(10, Math.min(90, 45 + card.price_change_pct * 3));
  const adx = 15 + Math.abs(card.price_change_pct) * 1.5;
  const mfi = Math.max(20, Math.min(80, 50 + card.price_change_pct * 1.8));
  return {
    rsi, stochastic: stoch, adx: Math.min(60, adx),
    macd: card.price_change_pct > 0 ? 'bullish' : 'bearish',
    macd_histogram: card.price_change_pct * 0.5,
    ma_20: p * (1 - card.price_change_pct * 0.002), ma_50: p * (1 - card.price_change_pct * 0.004),
    support: p * 0.88, support_2: p * 0.78, resistance: p * 1.12, resistance_2: p * 1.22,
    volume_trend: card.volume_24h > 50 ? 'increasing' : card.volume_24h > 20 ? 'stable' : 'decreasing',
    mfi,
    bb_position: rsi > 65 ? 'Upper band' : rsi < 35 ? 'Lower band' : 'Middle band',
    trend_direction: card.price_change_pct > 5 ? 'Uptrend' : card.price_change_pct < -5 ? 'Downtrend' : 'Sideways',
  };
}

function genPriceTargets(card) {
  if (!card) return null;
  const p = card.current_price;
  return {
    bull_case: { price: p * 1.45, probability: 22, thesis: `Championship win, sustained peak performance, and growing collector demand drive ${card.player_name}'s cards to all-time highs.` },
    base_case: { price: p * 1.12, probability: 53, thesis: `Steady appreciation following historical patterns with normal market conditions and consistent player performance.` },
    bear_case: { price: p * 0.72, probability: 25, thesis: `Market correction, injury risk, or shifting collector interest leads to temporary value decline.` },
    consensus_target: p * 1.15, upside: 15,
    horizons: [
      { label: '7 Days', target: p * (1 + card.price_change_pct * 0.01), change: card.price_change_pct * 0.7, confidence: 78, riskReward: '1:1.2' },
      { label: '30 Days', target: p * 1.05, change: 5, confidence: 68, riskReward: '1:1.5' },
      { label: '90 Days', target: p * 1.1, change: 10, confidence: 55, riskReward: '1:2.0' },
      { label: '12 Months', target: p * 1.15, change: 15, confidence: 42, riskReward: '1:2.8' },
    ],
  };
}

function genComparables(card, allCards) {
  if (!card) return [];
  return allCards.filter(c => c.id !== card.id && c.category === card.category).slice(0, 4).map(c => ({
    id: c.id, name: c.player_name, price: c.current_price, change: c.price_change_pct,
    grade: c.grade, volume: c.volume_24h, volatility: c.volatility_30d?.toFixed(1),
    sharpe: c.sharpe_ratio?.toFixed(2), premium_discount: ((card.current_price / c.current_price) - 1) * 100,
  }));
}

function genFundamentals(card) {
  if (!card) return null;
  const pop = Math.floor(card.market_cap / card.current_price);
  const scarcity = card.rarity === 'Legendary' ? 92 : card.rarity === 'Ultra Rare' ? 75 : card.rarity === 'Rare' ? 55 : 30;
  const buyers = Math.floor(card.volume_24h * 1.3);
  const sellers = Math.floor(card.volume_24h * 0.8);
  const grades = ['6','7','8','9','9.5','10'];
  const dist = grades.map(g => ({ grade: g, count: g === '10' ? Math.floor(pop * 0.05) : g === '9.5' ? Math.floor(pop * 0.08) : g === '9' ? Math.floor(pop * 0.25) : g === '8' ? Math.floor(pop * 0.3) : g === '7' ? Math.floor(pop * 0.2) : Math.floor(pop * 0.12) }));
  return {
    population: pop, pop_higher: Math.floor(pop * 0.03), scarcity_index: scarcity,
    avg_sale_price_30d: card.current_price * 0.96, sales_volume_30d: card.volume_24h * 8,
    liquidity_score: Math.min(95, Math.floor(card.volume_24h * 0.7)),
    holder_sentiment: card.price_change_pct > 0 ? 'bullish' : 'neutral',
    active_sellers: sellers, active_buyers: buyers,
    buyer_seller_ratio: buyers / Math.max(1, sellers),
    avg_days_to_sell: Math.max(1, Math.floor(30 / Math.max(1, card.volume_24h / 10))),
    absorption_rate: Math.min(95, Math.floor(card.volume_24h * 2)),
    grade_distribution: dist,
  };
}

function genRiskProfile(card) {
  if (!card) return null;
  const vol = card.volatility_30d || 20;
  const factors = [];
  if (vol > 30) factors.push({ title: 'High Volatility', description: `30d volatility of ${vol}% indicates significant price swings`, severity: 'high' });
  if (card.volume_24h < 10) factors.push({ title: 'Low Liquidity', description: 'Low trading volume may make it hard to exit position', severity: 'high' });
  if (card.price_change_pct < -10) factors.push({ title: 'Negative Momentum', description: `Price down ${Math.abs(card.price_change_pct).toFixed(1)}% recently`, severity: 'medium' });
  if (card.beta > 1.5) factors.push({ title: 'High Beta', description: 'Moves more than the overall market', severity: 'medium' });
  factors.push({ title: 'Market Risk', description: 'General collectibles market can experience broad corrections', severity: 'low' });
  factors.push({ title: 'Grading Risk', description: 'Population increases from new submissions can dilute value', severity: 'low' });
  const scenarios = [
    { scenario: 'Market Boom (+20%)', impact: Math.round(20 * (card.beta || 1)) },
    { scenario: 'Market Crash (-20%)', impact: -Math.round(20 * (card.beta || 1)) },
    { scenario: 'Player Injury', impact: card.player_status === 'active' ? -15 : -3 },
    { scenario: 'Championship Win', impact: card.player_status === 'active' ? 25 : 5 },
    { scenario: 'Grade Pop Increase', impact: -8 },
  ];
  return { volatility_30d: vol, max_drawdown: Math.round(vol * 1.5), beta: card.beta || 1, sharpe: card.sharpe_ratio || 1, overall_score: Math.min(95, Math.round(vol * 1.2 + (card.beta || 1) * 10)), factors, stress_scenarios: scenarios };
}

function genMarketIntel(card) {
  if (!card) return null;
  const p = card.current_price;
  const platforms = ['eBay', 'PWCC', 'Heritage', 'Goldin', 'MySlabs'];
  const sales = Array.from({length: 8}, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - i * 4 - Math.floor(Math.random() * 3));
    return { date: d.toLocaleDateString('en-US', {month: 'short', day: 'numeric'}), platform: platforms[Math.floor(Math.random() * platforms.length)], price: Math.round(p * (0.9 + Math.random() * 0.2)), grade: card.grade };
  });
  return { bid_ask_spread: (2 + Math.random() * 8).toFixed(1), market_depth: Math.floor(40 + Math.random() * 60), recent_sales: sales };
}

function genChartData(card) {
  if (!card) return [];
  const data = []; let p = card.current_price * 0.8;
  const prices = [];
  for (let i = 0; i < 90; i++) {
    p *= (1 + (Math.random() - 0.45) * 0.04);
    prices.push(p);
    const ma20 = i >= 19 ? prices.slice(i-19, i+1).reduce((a,b)=>a+b,0)/20 : null;
    const ma50 = i >= 49 ? prices.slice(i-49, i+1).reduce((a,b)=>a+b,0)/50 : null;
    const std20 = i >= 19 ? Math.sqrt(prices.slice(i-19,i+1).reduce((a,b)=>a+(b-ma20)**2,0)/20) : null;
    data.push({
      date: new Date(Date.now() - (89-i)*86400000).toLocaleDateString('en-US',{month:'short',day:'numeric'}),
      price: Math.round(p), ma20: ma20 ? Math.round(ma20) : null, ma50: ma50 ? Math.round(ma50) : null,
      upper_bb: ma20 && std20 ? Math.round(ma20 + std20 * 2) : null, lower_bb: ma20 && std20 ? Math.round(ma20 - std20 * 2) : null,
      volume: Math.floor(Math.random() * 40) + 5,
    });
  }
  return data;
}

function genVolumeProfile(card) {
  return Array.from({length: 30}, (_, i) => ({
    date: new Date(Date.now() - (29-i)*86400000).toLocaleDateString('en-US',{month:'short',day:'numeric'}),
    volume: Math.floor(Math.random() * card.volume_24h * 2) + 1,
  }));
}

function genRadarData(selectedCard) {
  const c = selectedCard.card;
  const comps = selectedCard.comparables || [];
  const avg = (key) => comps.length ? comps.reduce((a,b)=>a+(parseFloat(b[key])||0),0)/comps.length : 0;
  const norm = (v, max) => Math.min(100, (v / max) * 100);
  return [
    { metric: 'Volume', card: norm(c.volume_24h, 250), peer: norm(avg('volume'), 250) },
    { metric: 'Momentum', card: norm(Math.abs(c.price_change_pct), 35), peer: norm(Math.abs(avg('change')), 35) },
    { metric: 'Liquidity', card: norm(c.volume_24h * 0.7, 100), peer: norm(avg('volume') * 0.7, 100) },
    { metric: 'Sharpe', card: norm(c.sharpe_ratio, 3), peer: norm(avg('sharpe'), 3) },
    { metric: 'Stability', card: norm(100 - c.volatility_30d, 100), peer: norm(100 - avg('volatility'), 100) },
  ];
}

// ===== UI COMPONENTS =====

function SignalBadge({ signal }) {
  const cls = signal.includes('BUY') ? 'text-emerald-400 bg-emerald-400/10' : signal.includes('SELL') ? 'text-red-400 bg-red-400/10' : 'text-amber-400 bg-amber-400/10';
  return <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${cls}`}>{signal}</span>;
}

function CardHeader({ card, valuation }) {
  return (
    <div className="bg-[#0A0A0C] border border-white/10 rounded-xl p-5">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div className="flex items-start gap-4">
          <img src={card.card?.image_url} alt={card.card?.name} className="w-16 h-22 object-cover rounded-lg" />
          <div>
            <h2 className="font-heading font-bold text-lg text-white">{card.card?.player_name}</h2>
            <p className="text-zinc-500 text-xs">{card.card?.name}</p>
            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              <span className="text-[10px] text-zinc-500 bg-white/5 px-2 py-0.5 rounded">{card.card?.category}</span>
              <span className="text-[10px] text-zinc-500 bg-white/5 px-2 py-0.5 rounded">{card.card?.grade}</span>
              <span className="text-[10px] text-zinc-500 bg-white/5 px-2 py-0.5 rounded">{card.card?.rarity}</span>
              <span className="text-[10px] text-zinc-500 bg-white/5 px-2 py-0.5 rounded">{card.card?.set_name} ({card.card?.year})</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-5 shrink-0">
          <div className="text-right">
            <span className="text-[10px] text-zinc-500 block">Current Price</span>
            <span className="font-heading font-bold text-xl text-white">{formatCurrency(card.card?.current_price, true)}</span>
            <span className={`text-xs font-mono block ${getPriceChangeColor(card.card?.price_change_pct)}`}>{formatPercent(card.card?.price_change_pct)}</span>
          </div>
          {valuation && (
            <div className="text-right">
              <span className="text-[10px] text-zinc-500 block">AI Fair Value</span>
              <span className="font-heading font-bold text-xl text-cyan-400">{formatCurrency(valuation.fair_market_value, true)}</span>
              <span className={`text-xs font-mono block ${getPriceChangeColor(valuation.value_vs_price_pct)}`}>{valuation.value_vs_price_pct > 0 ? '+' : ''}{valuation.value_vs_price_pct}%</span>
            </div>
          )}
          <div className={`px-3 py-2 rounded-lg border text-center ${card.signal.includes('BUY') ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' : card.signal.includes('SELL') ? 'bg-red-500/15 border-red-500/30 text-red-400' : 'bg-amber-500/15 border-amber-500/30 text-amber-400'}`}>
            <span className="text-[10px] block mb-0.5">AI Rating</span>
            <span className="font-heading font-bold text-sm">{card.signal}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickStats({ card, valuation }) {
  return (
    <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
      <MiniStat label="Confidence" value={`${(card.confidence_score * 100).toFixed(0)}%`} />
      <MiniStat label="Risk" value={`${(card.risk_score * 10).toFixed(0)}/10`} />
      <MiniStat label="Vol 24h" value={card.card?.volume_24h} />
      <MiniStat label="Volatility" value={`${card.card?.volatility_30d}%`} />
      <MiniStat label="Beta" value={card.card?.beta?.toFixed(2)} />
      <MiniStat label="Sharpe" value={card.card?.sharpe_ratio?.toFixed(2)} />
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="bg-[#0A0A0C] border border-white/10 rounded-lg p-2.5 text-center">
      <span className="text-[9px] text-zinc-500 uppercase tracking-wider block">{label}</span>
      <span className="font-mono text-sm text-white font-medium">{value}</span>
    </div>
  );
}

function IndicatorCard({ label, value, sub, color, progress }) {
  return (
    <div className="bg-[#0A0A0C] border border-white/10 rounded-xl p-3.5">
      <span className="text-[10px] text-zinc-500 block mb-1.5">{label}</span>
      <span className={`font-heading font-bold text-xl ${color}`}>{value}</span>
      <span className="text-[10px] text-zinc-500 block mt-0.5">{sub}</span>
      {progress !== undefined && <Progress value={progress} className="h-1 mt-2" />}
    </div>
  );
}

function LevelRow({ label, value, current }) {
  const isAbove = value > current;
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-xs text-zinc-500">{label}</span>
      <span className={`font-mono text-xs ${isAbove ? 'text-red-400' : 'text-emerald-400'}`}>{formatCurrency(value, true)}</span>
    </div>
  );
}

function SignalRow({ label, value, type }) {
  const color = type === 'bullish' ? 'text-emerald-400' : type === 'bearish' ? 'text-red-400' : 'text-zinc-400';
  const icon = type === 'bullish' ? <ArrowUpRight className="w-3 h-3" /> : type === 'bearish' ? <ArrowDownRight className="w-3 h-3" /> : <Minus className="w-3 h-3" />;
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0">
      <span className="text-xs text-zinc-500">{label}</span>
      <span className={`text-xs font-medium flex items-center gap-1 ${color}`}>{icon}{typeof value === 'number' ? value.toFixed(0) : value}</span>
    </div>
  );
}

function TargetBar({ card }) {
  const targets = card.priceTargets;
  if (!targets) return null;
  const min = targets.bear_case.price * 0.9;
  const max = targets.bull_case.price * 1.1;
  const range = max - min;
  const pos = (v) => `${((v - min) / range) * 100}%`;
  return (
    <div className="relative h-20 mb-8 mt-4">
      <div className="absolute top-8 left-0 right-0 h-2 bg-gradient-to-r from-red-500/30 via-blue-500/30 to-emerald-500/30 rounded-full" />
      {[
        { v: targets.bear_case.price, label: 'Bear', color: 'text-red-400 border-red-500/30' },
        { v: targets.base_case.price, label: 'Base', color: 'text-[#007AFF] border-[#007AFF]/30' },
        { v: targets.bull_case.price, label: 'Bull', color: 'text-emerald-400 border-emerald-500/30' },
      ].map(t => (
        <div key={t.label} className="absolute flex flex-col items-center" style={{ left: pos(t.v), transform: 'translateX(-50%)' }}>
          <span className={`text-[10px] font-medium ${t.color.split(' ')[0]}`}>{t.label}</span>
          <span className={`text-xs font-mono font-bold ${t.color.split(' ')[0]}`}>{formatCurrency(t.v, true)}</span>
          <div className={`w-0.5 h-3 rounded ${t.color.split(' ')[0].replace('text-','bg-')}`} />
        </div>
      ))}
      <div className="absolute flex flex-col items-center" style={{ left: pos(card.card?.current_price), transform: 'translateX(-50%)', top: '24px' }}>
        <div className="w-3 h-3 rounded-full bg-white border-2 border-white/50 shadow-lg" />
        <span className="text-[9px] text-white mt-1">NOW</span>
      </div>
    </div>
  );
}

function ScenarioCard({ type, data }) {
  if (!data) return null;
  const cfg = { bull: { icon: <TrendingUp className="w-4 h-4 text-emerald-400" />, label: 'Bull Case', bg: 'bg-emerald-500/10 border-emerald-500/20', color: 'text-emerald-400' }, base: { icon: <Target className="w-4 h-4 text-[#007AFF]" />, label: 'Base Case', bg: 'bg-[#007AFF]/10 border-[#007AFF]/20', color: 'text-[#007AFF]' }, bear: { icon: <TrendingDown className="w-4 h-4 text-red-400" />, label: 'Bear Case', bg: 'bg-red-500/10 border-red-500/20', color: 'text-red-400' } }[type];
  return (
    <div className={`p-4 border rounded-xl ${cfg.bg}`}>
      <div className="flex items-center gap-2 mb-2">{cfg.icon}<span className={`font-medium text-sm ${cfg.color}`}>{cfg.label}</span></div>
      <span className="font-heading font-bold text-xl text-white block mb-1">{formatCurrency(data.price, true)}</span>
      <div className="flex items-center gap-2 mb-2"><Progress value={data.probability} className="flex-1 h-1.5" /><span className="text-[10px] text-zinc-400">{data.probability}% prob</span></div>
      <p className="text-[11px] text-zinc-400 leading-relaxed">{data.thesis}</p>
    </div>
  );
}

function FundCard({ label, value, sub, icon }) {
  return (
    <div className="bg-[#0A0A0C] border border-white/10 rounded-xl p-3.5">
      <div className="flex items-center gap-1.5 mb-1.5">{icon}<span className="text-[10px] text-zinc-500 uppercase tracking-wider">{label}</span></div>
      <span className="font-heading font-bold text-lg text-white block">{value}</span>
      {sub && <span className="text-[10px] text-zinc-500">{sub}</span>}
    </div>
  );
}

function MetricRow({ label, value, highlight }) {
  return (
    <div className="flex items-center justify-between py-1 border-b border-white/5 last:border-0">
      <span className="text-xs text-zinc-500">{label}</span>
      <span className={`text-xs font-mono ${highlight ? 'text-emerald-400' : 'text-white'}`}>{value}</span>
    </div>
  );
}

function RiskCard({ label, value, rating }) {
  const color = rating === 'High' ? 'text-red-400 border-red-500/20' : rating === 'Good' ? 'text-emerald-400 border-emerald-500/20' : rating === 'Poor' ? 'text-red-400 border-red-500/20' : rating === 'Low' ? 'text-emerald-400 border-emerald-500/20' : 'text-amber-400 border-amber-500/20';
  const bgColor = rating === 'High' || rating === 'Poor' ? 'bg-red-500/5' : rating === 'Good' || rating === 'Low' ? 'bg-emerald-500/5' : 'bg-amber-500/5';
  return (
    <div className={`${bgColor} border rounded-xl p-3.5 ${color.split(' ')[1]}`}>
      <span className="text-[10px] text-zinc-500 block mb-1">{label}</span>
      <span className={`font-heading font-bold text-xl ${color.split(' ')[0]}`}>{value}</span>
      <span className={`text-[10px] block mt-0.5 ${color.split(' ')[0]}`}>{rating}</span>
    </div>
  );
}

function PriceTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0E0E12] border border-white/10 rounded-lg p-2.5 shadow-xl">
      <p className="text-[10px] text-zinc-400 mb-1">{label}</p>
      <p className="font-mono text-sm text-white">{formatCurrency(payload[0].value)}</p>
      {payload[1]?.value && <p className="text-[10px] text-cyan-400">MA20: {formatCurrency(payload[1].value)}</p>}
      {payload[2]?.value && <p className="text-[10px] text-amber-400">MA50: {formatCurrency(payload[2].value)}</p>}
    </div>
  );
}

function GradeTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0E0E12] border border-white/10 rounded-lg p-2 shadow-xl">
      <p className="text-[10px] text-zinc-400">Grade {payload[0]?.payload?.grade}</p>
      <p className="font-mono text-sm text-white">{payload[0]?.value} copies</p>
    </div>
  );
}

function VolumeTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0E0E12] border border-white/10 rounded-lg p-2 shadow-xl">
      <p className="text-[10px] text-zinc-400">{label}</p>
      <p className="font-mono text-sm text-white">{payload[0]?.value} sales</p>
    </div>
  );
}
