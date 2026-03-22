import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  getSentimentHeatmap, 
  findArbitrageOpportunities, 
  getSmartAlerts,
  getAdvancedPortfolioMetrics,
  getMarketOverview
} from '../lib/api';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { 
  Brain, TrendingUp, TrendingDown, AlertTriangle, Loader2, 
  Activity, Flame, Snowflake, Target, Gauge, Bell, ArrowRight,
  BarChart3, PieChart, Zap, Shield
} from 'lucide-react';
import { formatCurrency, formatPercent, getPriceChangeColor } from '../lib/utils';

export default function Analytics() {
  const [sentimentData, setSentimentData] = useState(null);
  const [arbitrageData, setArbitrageData] = useState(null);
  const [alertsData, setAlertsData] = useState(null);
  const [portfolioMetrics, setPortfolioMetrics] = useState(null);
  const [marketOverview, setMarketOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      const [sentiment, arbitrage, alerts, metrics, market] = await Promise.all([
        getSentimentHeatmap(),
        findArbitrageOpportunities(),
        getSmartAlerts(),
        getAdvancedPortfolioMetrics(),
        getMarketOverview()
      ]);
      setSentimentData(sentiment.data);
      setArbitrageData(arbitrage.data);
      setAlertsData(alerts.data);
      setPortfolioMetrics(metrics.data);
      setMarketOverview(market.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#00E5FF]" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" data-testid="analytics-page">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-gradient-to-br from-[#007AFF] to-[#00E5FF]">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <h1 className="font-heading font-bold text-2xl sm:text-3xl text-white">Advanced Analytics</h1>
        </div>
        <p className="text-zinc-400">AI-powered insights no competitor can match</p>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-[#0A0A0C] border border-white/10 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Gauge className="w-4 h-4 text-[#00E5FF]" />
            <span className="text-xs uppercase tracking-wider text-zinc-500">Fear/Greed</span>
          </div>
          <div className="flex items-end gap-2">
            <span className="font-heading font-bold text-2xl text-white">
              {marketOverview?.fear_greed_index || 50}
            </span>
            <span className={`text-sm ${marketOverview?.fear_greed_index > 50 ? 'text-emerald-400' : 'text-red-400'}`}>
              {marketOverview?.fear_greed_index > 60 ? 'Greed' : marketOverview?.fear_greed_index < 40 ? 'Fear' : 'Neutral'}
            </span>
          </div>
        </div>
        
        <div className="bg-[#0A0A0C] border border-white/10 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-amber-400" />
            <span className="text-xs uppercase tracking-wider text-zinc-500">Market Volatility</span>
          </div>
          <span className="font-heading font-bold text-2xl text-white">
            {marketOverview?.market_volatility?.toFixed(1) || 0}%
          </span>
        </div>
        
        <div className="bg-[#0A0A0C] border border-white/10 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-emerald-400" />
            <span className="text-xs uppercase tracking-wider text-zinc-500">Arbitrage Opps</span>
          </div>
          <span className="font-heading font-bold text-2xl text-white">
            {arbitrageData?.opportunities?.length || 0}
          </span>
        </div>
        
        <div className="bg-[#0A0A0C] border border-white/10 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Bell className="w-4 h-4 text-red-400" />
            <span className="text-xs uppercase tracking-wider text-zinc-500">Active Alerts</span>
          </div>
          <span className="font-heading font-bold text-2xl text-white">
            {alertsData?.unread_count || 0}
          </span>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-[#0A0A0C] border border-white/10 p-1">
          <TabsTrigger value="overview" className="data-[state=active]:bg-white/10">
            <BarChart3 className="w-4 h-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="sentiment" className="data-[state=active]:bg-white/10">
            <Flame className="w-4 h-4 mr-2" />
            Sentiment
          </TabsTrigger>
          <TabsTrigger value="arbitrage" className="data-[state=active]:bg-white/10">
            <Target className="w-4 h-4 mr-2" />
            Arbitrage
          </TabsTrigger>
          <TabsTrigger value="alerts" className="data-[state=active]:bg-white/10">
            <Bell className="w-4 h-4 mr-2" />
            Alerts
          </TabsTrigger>
          <TabsTrigger value="risk" className="data-[state=active]:bg-white/10">
            <Shield className="w-4 h-4 mr-2" />
            Risk
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Portfolio Risk Metrics */}
            {portfolioMetrics?.risk_metrics && (
              <div className="bg-[#0A0A0C] border border-white/10 rounded-xl p-6">
                <h3 className="font-medium text-lg text-white mb-4 flex items-center gap-2">
                  <PieChart className="w-5 h-5 text-[#007AFF]" />
                  Portfolio Risk Profile
                </h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-zinc-400">Volatility</span>
                      <span className="font-mono text-white">{portfolioMetrics.risk_metrics.portfolio_volatility}%</span>
                    </div>
                    <Progress value={Math.min(100, portfolioMetrics.risk_metrics.portfolio_volatility * 2)} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-zinc-400">Beta</span>
                      <span className="font-mono text-white">{portfolioMetrics.risk_metrics.portfolio_beta}</span>
                    </div>
                    <Progress value={Math.min(100, portfolioMetrics.risk_metrics.portfolio_beta * 50)} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-zinc-400">Sharpe Ratio</span>
                      <span className={`font-mono ${portfolioMetrics.risk_metrics.portfolio_sharpe > 1 ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {portfolioMetrics.risk_metrics.portfolio_sharpe}
                      </span>
                    </div>
                    <Progress value={Math.min(100, portfolioMetrics.risk_metrics.portfolio_sharpe * 33)} className="h-2" />
                  </div>
                  <div className="pt-4 border-t border-white/10">
                    <div className="flex justify-between">
                      <span className="text-zinc-400">95% Value at Risk</span>
                      <span className="font-mono text-red-400">
                        {formatCurrency(portfolioMetrics.risk_metrics.var_95)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Category Allocation */}
            {portfolioMetrics?.category_allocation && (
              <div className="bg-[#0A0A0C] border border-white/10 rounded-xl p-6">
                <h3 className="font-medium text-lg text-white mb-4">Category Allocation</h3>
                <div className="space-y-3">
                  {Object.entries(portfolioMetrics.category_allocation).map(([category, data]) => (
                    <div key={category}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-zinc-400">{category}</span>
                        <span className="font-mono text-white">{data.percentage}%</span>
                      </div>
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${
                            category === 'Basketball' ? 'bg-orange-500' :
                            category === 'Baseball' ? 'bg-blue-500' :
                            category === 'Football' ? 'bg-emerald-500' : 'bg-purple-500'
                          }`}
                          style={{ width: `${data.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t border-white/10">
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Diversification Score</span>
                    <span className={`font-mono ${portfolioMetrics.diversification_score > 70 ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {portfolioMetrics.diversification_score}/100
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Quick Links */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link to="/analytics/simulator" className="block">
              <div className="bg-gradient-to-br from-[#007AFF]/20 to-transparent border border-[#007AFF]/30 rounded-xl p-6 hover:border-[#007AFF]/50 transition-colors">
                <Zap className="w-8 h-8 text-[#007AFF] mb-3" />
                <h3 className="font-medium text-white mb-1">What-If Simulator</h3>
                <p className="text-sm text-zinc-400">Model trade, injury & award scenarios</p>
              </div>
            </Link>
            <Link to="/analytics/grading" className="block">
              <div className="bg-gradient-to-br from-[#00E5FF]/20 to-transparent border border-[#00E5FF]/30 rounded-xl p-6 hover:border-[#00E5FF]/50 transition-colors">
                <Target className="w-8 h-8 text-[#00E5FF] mb-3" />
                <h3 className="font-medium text-white mb-1">Grade Calculator</h3>
                <p className="text-sm text-zinc-400">Predict grade probabilities & ROI</p>
              </div>
            </Link>
            <Link to="/analytics/screener" className="block">
              <div className="bg-gradient-to-br from-purple-500/20 to-transparent border border-purple-500/30 rounded-xl p-6 hover:border-purple-500/50 transition-colors">
                <BarChart3 className="w-8 h-8 text-purple-400 mb-3" />
                <h3 className="font-medium text-white mb-1">Card Screener</h3>
                <p className="text-sm text-zinc-400">Filter cards like a trading terminal</p>
              </div>
            </Link>
          </div>
        </TabsContent>

        {/* Sentiment Heatmap Tab */}
        <TabsContent value="sentiment" className="space-y-6">
          <div className="bg-[#0A0A0C] border border-white/10 rounded-xl p-6">
            <h3 className="font-medium text-lg text-white mb-6 flex items-center gap-2">
              <Flame className="w-5 h-5 text-orange-400" />
              Social Sentiment Heatmap
            </h3>
            <div className="space-y-3">
              {sentimentData?.cards?.map((card) => (
                <Link 
                  key={card.card_id} 
                  to={`/card/${card.card_id}`}
                  className="flex items-center gap-4 p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <div className={`w-3 h-3 rounded-full ${
                    card.buzz_level === 'hot' ? 'bg-red-500 animate-pulse' :
                    card.buzz_level === 'warm' ? 'bg-amber-500' : 'bg-blue-500'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <span className="text-white font-medium truncate block">{card.card_name}</span>
                    <span className="text-sm text-zinc-500">{card.player_name}</span>
                  </div>
                  <div className="text-right">
                    <div className={`font-mono text-sm ${card.sentiment_score > 0.3 ? 'text-emerald-400' : card.sentiment_score < -0.1 ? 'text-red-400' : 'text-zinc-400'}`}>
                      {card.sentiment_score > 0 ? '+' : ''}{(card.sentiment_score * 100).toFixed(0)}
                    </div>
                    <div className="text-xs text-zinc-500">{card.mentions_24h.toLocaleString()} mentions</div>
                  </div>
                  <div className="flex items-center gap-1">
                    {card.buzz_level === 'hot' && <Flame className="w-4 h-4 text-red-500" />}
                    {card.buzz_level === 'cold' && <Snowflake className="w-4 h-4 text-blue-500" />}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* Arbitrage Tab */}
        <TabsContent value="arbitrage" className="space-y-6">
          <div className="bg-[#0A0A0C] border border-white/10 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-medium text-lg text-white flex items-center gap-2">
                <Target className="w-5 h-5 text-emerald-400" />
                Cross-Sport Arbitrage Opportunities
              </h3>
              <span className="text-sm text-zinc-500">
                Market Efficiency: {arbitrageData?.market_efficiency_score}%
              </span>
            </div>
            <div className="space-y-4">
              {arbitrageData?.opportunities?.map((opp) => (
                <div 
                  key={opp.card_id}
                  className={`p-4 rounded-lg border ${
                    opp.opportunity_type === 'undervalued' 
                      ? 'bg-emerald-500/10 border-emerald-500/30' 
                      : 'bg-red-500/10 border-red-500/30'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <Link to={`/card/${opp.card_id}`} className="text-white font-medium hover:text-[#007AFF]">
                        {opp.card_name}
                      </Link>
                      <div className="flex items-center gap-4 mt-2">
                        <div>
                          <span className="text-xs text-zinc-500 block">Current</span>
                          <span className="font-mono text-white">{formatCurrency(opp.current_price, true)}</span>
                        </div>
                        <ArrowRight className="w-4 h-4 text-zinc-500" />
                        <div>
                          <span className="text-xs text-zinc-500 block">Fair Value</span>
                          <span className="font-mono text-white">{formatCurrency(opp.fair_value, true)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`font-heading font-bold text-2xl ${
                        opp.discount_pct > 0 ? 'text-emerald-400' : 'text-red-400'
                      }`}>
                        {opp.discount_pct > 0 ? '+' : ''}{opp.discount_pct.toFixed(1)}%
                      </span>
                      <div className="text-xs text-zinc-500 mt-1">
                        {opp.opportunity_type === 'undervalued' ? 'Undervalued' : 'Overvalued'}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-white/10">
                    <span className="text-xs text-zinc-500">Comparable cards: </span>
                    <span className="text-xs text-zinc-400">
                      {opp.comparable_cards?.map(c => c.card_name).join(', ')}
                    </span>
                  </div>
                </div>
              ))}
              {(!arbitrageData?.opportunities || arbitrageData.opportunities.length === 0) && (
                <div className="text-center py-8 text-zinc-500">
                  No significant arbitrage opportunities found
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="space-y-6">
          <div className="bg-[#0A0A0C] border border-white/10 rounded-xl p-6">
            <h3 className="font-medium text-lg text-white mb-6 flex items-center gap-2">
              <Bell className="w-5 h-5 text-amber-400" />
              Smart Alerts with Context
            </h3>
            <div className="space-y-4">
              {alertsData?.alerts?.map((alert) => (
                <div 
                  key={alert.id}
                  className={`p-4 rounded-lg border ${
                    alert.severity === 'high' ? 'bg-red-500/10 border-red-500/30' :
                    alert.severity === 'medium' ? 'bg-amber-500/10 border-amber-500/30' :
                    alert.severity === 'info' ? 'bg-blue-500/10 border-blue-500/30' :
                    'bg-white/5 border-white/10'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {alert.severity === 'high' && <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />}
                    {alert.severity === 'medium' && <Activity className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />}
                    {alert.severity === 'low' && <TrendingDown className="w-5 h-5 text-zinc-400 flex-shrink-0 mt-0.5" />}
                    {alert.severity === 'info' && <TrendingUp className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />}
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-white">{alert.message}</span>
                        <span className="text-xs text-zinc-500">
                          {new Date(alert.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-sm text-zinc-400 mt-2">{alert.context}</p>
                      {alert.recommended_action && (
                        <div className="mt-3 p-2 bg-white/5 rounded">
                          <span className="text-xs text-zinc-500">Recommended: </span>
                          <span className="text-xs text-white">{alert.recommended_action}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* Risk Tab */}
        <TabsContent value="risk" className="space-y-6">
          <div className="bg-[#0A0A0C] border border-white/10 rounded-xl p-6">
            <h3 className="font-medium text-lg text-white mb-6 flex items-center gap-2">
              <Shield className="w-5 h-5 text-amber-400" />
              Portfolio Risk Metrics
            </h3>
            {portfolioMetrics?.risk_metrics ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-white/5 rounded-lg">
                  <span className="text-xs text-zinc-500 block mb-2">Value at Risk (95%)</span>
                  <span className="font-mono text-lg text-red-400">
                    {formatCurrency(portfolioMetrics.risk_metrics.var_95)}
                  </span>
                </div>
                <div className="p-4 bg-white/5 rounded-lg">
                  <span className="text-xs text-zinc-500 block mb-2">Max Drawdown</span>
                  <span className="font-mono text-lg text-amber-400">
                    {portfolioMetrics.risk_metrics.max_drawdown_potential}%
                  </span>
                </div>
                <div className="p-4 bg-white/5 rounded-lg">
                  <span className="text-xs text-zinc-500 block mb-2">Portfolio Beta</span>
                  <span className="font-mono text-lg text-white">
                    {portfolioMetrics.risk_metrics.portfolio_beta}
                  </span>
                </div>
                <div className="p-4 bg-white/5 rounded-lg">
                  <span className="text-xs text-zinc-500 block mb-2">Sharpe Ratio</span>
                  <span className={`font-mono text-lg ${portfolioMetrics.risk_metrics.portfolio_sharpe > 1 ? 'text-emerald-400' : 'text-zinc-400'}`}>
                    {portfolioMetrics.risk_metrics.portfolio_sharpe}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-zinc-500 text-center py-8">Add cards to your portfolio to see risk metrics</p>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
