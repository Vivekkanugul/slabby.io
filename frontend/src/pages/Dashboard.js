import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getPortfolioSummary, getTrendingCards, getMarketOverview, getPredictions } from '../lib/api';
import { StatCard } from '../components/Dashboard/StatCard';
import { CardItem } from '../components/Cards/CardItem';
import { PriceChart } from '../components/Charts/PriceChart';
import { AISignalBadge } from '../components/AI/AISignalBadge';
import { Wallet, TrendingUp, BarChart3, Sparkles, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { formatCurrency, formatPercent } from '../lib/utils';

export default function Dashboard() {
  const { user } = useAuth();
  const [portfolioSummary, setPortfolioSummary] = useState(null);
  const [trendingCards, setTrendingCards] = useState([]);
  const [marketOverview, setMarketOverview] = useState(null);
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [summaryRes, trendingRes, marketRes, predictionsRes] = await Promise.all([
        getPortfolioSummary(),
        getTrendingCards(),
        getMarketOverview(),
        getPredictions(),
      ]);
      setPortfolioSummary(summaryRes.data);
      setTrendingCards(trendingRes.data);
      setMarketOverview(marketRes.data);
      setPredictions(predictionsRes.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Generate mock portfolio chart data
  const portfolioChartData = Array.from({ length: 30 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - 29 + i);
    const baseValue = portfolioSummary?.total_value || 10000;
    return {
      date: date.toISOString().split('T')[0],
      price: baseValue * (0.85 + (i / 30) * 0.15 + Math.random() * 0.05),
    };
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#007AFF]" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" data-testid="dashboard-page">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-heading font-bold text-2xl sm:text-3xl text-white mb-2">
          Welcome back, {user?.name?.split(' ')[0]}
        </h1>
        <p className="text-zinc-400">Here's what's happening with your collection</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Portfolio Value"
          value={portfolioSummary?.total_value || 0}
          change={portfolioSummary?.profit_loss_pct || 0}
          icon={Wallet}
          subtitle="all time"
        />
        <StatCard
          title="Total P&L"
          value={portfolioSummary?.profit_loss || 0}
          change={portfolioSummary?.profit_loss_pct || 0}
          icon={TrendingUp}
          subtitle="all time"
        />
        <StatCard
          title="Market Volume"
          value={marketOverview?.total_volume_24h || 0}
          format="number"
          icon={BarChart3}
          subtitle="24h trades"
        />
        <StatCard
          title="Cards Owned"
          value={portfolioSummary?.holdings_count || 0}
          format="number"
          icon={Sparkles}
          subtitle={`${portfolioSummary?.unique_cards || 0} unique`}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Portfolio Chart */}
        <div className="lg:col-span-2 bg-[#0A0A0C] border border-white/10 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-medium text-lg text-white">Portfolio Performance</h2>
              <p className="text-sm text-zinc-500">Last 30 days</p>
            </div>
            <Link to="/portfolio">
              <Button variant="ghost" size="sm" className="text-[#007AFF] hover:bg-[#007AFF]/10">
                View Details
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
          <PriceChart data={portfolioChartData} height={280} />
        </div>

        {/* AI Insights Panel */}
        <div className="bg-[#0A0A0C] border border-white/10 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-[#00E5FF]/10">
                <Sparkles className="w-4 h-4 text-[#00E5FF]" />
              </div>
              <h2 className="font-medium text-lg text-white">AI Signals</h2>
            </div>
            <Link to="/ai-insights">
              <Button variant="ghost" size="sm" className="text-[#00E5FF] hover:bg-[#00E5FF]/10">
                View All
              </Button>
            </Link>
          </div>

          <div className="space-y-4">
            {predictions.slice(0, 4).map((pred) => (
              <Link
                key={pred.id}
                to={`/card/${pred.card_id}`}
                className="block p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                data-testid={`ai-signal-${pred.card_id}`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="text-sm text-white line-clamp-1">{pred.card_name}</span>
                  <AISignalBadge signal={pred.signal} size="sm" />
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-500">7d prediction</span>
                  <span className="font-mono text-zinc-300">
                    {formatCurrency(pred.predicted_price_7d, true)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Trending Cards */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-heading font-bold text-xl text-white">Trending Cards</h2>
            <p className="text-sm text-zinc-500">Most active cards in the market</p>
          </div>
          <Link to="/marketplace">
            <Button variant="ghost" className="text-[#007AFF] hover:bg-[#007AFF]/10">
              View Marketplace
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          {trendingCards.map((card) => (
            <CardItem key={card.id} card={card} showPrediction />
          ))}
        </div>
      </div>

      {/* Market Stats */}
      <div className="bg-[#0A0A0C] border border-white/10 rounded-xl p-6">
        <h2 className="font-medium text-lg text-white mb-6">Market Overview</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <span className="text-xs uppercase tracking-wider text-zinc-500 block mb-1">Total Market Cap</span>
            <span className="font-heading font-bold text-xl text-white">
              {formatCurrency(marketOverview?.total_market_cap || 0, true)}
            </span>
          </div>
          <div>
            <span className="text-xs uppercase tracking-wider text-zinc-500 block mb-1">24h Volume</span>
            <span className="font-heading font-bold text-xl text-white">
              {marketOverview?.total_volume_24h || 0} trades
            </span>
          </div>
          <div>
            <span className="text-xs uppercase tracking-wider text-zinc-500 block mb-1">Gainers</span>
            <span className="font-heading font-bold text-xl text-emerald-400">
              {marketOverview?.gainers || 0}
            </span>
          </div>
          <div>
            <span className="text-xs uppercase tracking-wider text-zinc-500 block mb-1">Losers</span>
            <span className="font-heading font-bold text-xl text-red-400">
              {marketOverview?.losers || 0}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
