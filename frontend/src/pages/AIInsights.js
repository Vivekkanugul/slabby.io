import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getPredictions } from '../lib/api';
import { AISignalBadge } from '../components/AI/AISignalBadge';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import { Sparkles, TrendingUp, TrendingDown, AlertTriangle, Loader2, ArrowRight, Activity } from 'lucide-react';
import { formatCurrency, formatPercent, getPriceChangeColor } from '../lib/utils';

export default function AIInsights() {
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPredictions();
  }, []);

  const fetchPredictions = async () => {
    try {
      const response = await getPredictions();
      setPredictions(response.data);
    } catch (error) {
      console.error('Error fetching predictions:', error);
    } finally {
      setLoading(false);
    }
  };

  const buySignals = predictions.filter((p) => p.signal.toUpperCase().includes('BUY'));
  const sellSignals = predictions.filter((p) => p.signal.toUpperCase().includes('SELL'));
  const holdSignals = predictions.filter((p) => p.signal.toUpperCase() === 'HOLD');

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
          <div className="p-2 rounded-lg bg-[#00E5FF]/10">
            <Sparkles className="w-6 h-6 text-[#00E5FF]" />
          </div>
          <h1 className="font-heading font-bold text-2xl sm:text-3xl text-white">AI Insights</h1>
        </div>
        <p className="text-zinc-400">AI-powered predictions combining eBay trends, player stats & social sentiment</p>
      </div>

      {/* Signal Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-[#0A0A0C] border border-emerald-500/20 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs uppercase tracking-wider text-zinc-500">Buy Signals</span>
            <TrendingUp className="w-5 h-5 text-emerald-400" />
          </div>
          <span className="font-heading font-bold text-3xl text-emerald-400">{buySignals.length}</span>
        </div>
        
        <div className="bg-[#0A0A0C] border border-amber-500/20 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs uppercase tracking-wider text-zinc-500">Hold Signals</span>
            <Activity className="w-5 h-5 text-amber-400" />
          </div>
          <span className="font-heading font-bold text-3xl text-amber-400">{holdSignals.length}</span>
        </div>
        
        <div className="bg-[#0A0A0C] border border-red-500/20 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs uppercase tracking-wider text-zinc-500">Sell Signals</span>
            <TrendingDown className="w-5 h-5 text-red-400" />
          </div>
          <span className="font-heading font-bold text-3xl text-red-400">{sellSignals.length}</span>
        </div>
      </div>

      {/* Predictions Grid */}
      <div className="space-y-4">
        {predictions.map((pred) => (
          <PredictionCard key={pred.id} prediction={pred} />
        ))}
      </div>

      {predictions.length === 0 && (
        <div className="text-center py-16 bg-[#0A0A0C] border border-white/10 rounded-xl">
          <Sparkles className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No predictions available</h3>
          <p className="text-zinc-400">Check back soon for AI-powered insights</p>
        </div>
      )}
    </div>
  );
}

const PredictionCard = ({ prediction }) => {
  const confidencePercent = Math.round(prediction.confidence_score * 100);
  const riskPercent = Math.round(prediction.risk_score * 100);
  const sentimentPercent = Math.round((prediction.sentiment_score + 1) * 50); // Convert -1 to 1 range to 0-100

  return (
    <div 
      className="bg-[#0A0A0C] border border-white/10 rounded-xl p-6 hover:border-white/20 transition-colors"
      data-testid={`prediction-card-${prediction.card_id}`}
    >
      <div className="flex flex-col lg:flex-row lg:items-center gap-6">
        {/* Card Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <Link 
                to={`/card/${prediction.card_id}`}
                className="text-lg font-medium text-white hover:text-[#007AFF] transition-colors line-clamp-1"
              >
                {prediction.card_name}
              </Link>
              <p className="text-sm text-zinc-500">
                Generated {new Date(prediction.generated_at).toLocaleDateString()}
              </p>
            </div>
            <AISignalBadge signal={prediction.signal} confidence={prediction.confidence_score} size="lg" />
          </div>

          <p className="text-zinc-400 text-sm mb-4 line-clamp-2">{prediction.analysis}</p>

          {/* Factors */}
          <div className="flex flex-wrap gap-2">
            {prediction.factors.slice(0, 4).map((factor, i) => (
              <span key={i} className="px-2 py-1 bg-white/5 rounded-full text-xs text-zinc-400">
                {factor}
              </span>
            ))}
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-4 lg:w-64">
          <div className="bg-white/5 rounded-lg p-3">
            <span className="text-xs text-zinc-500 block mb-1">7-Day Prediction</span>
            <span className="font-mono font-medium text-white text-sm">
              {formatCurrency(prediction.predicted_price_7d, true)}
            </span>
          </div>
          <div className="bg-white/5 rounded-lg p-3">
            <span className="text-xs text-zinc-500 block mb-1">30-Day Prediction</span>
            <span className="font-mono font-medium text-white text-sm">
              {formatCurrency(prediction.predicted_price_30d, true)}
            </span>
          </div>
          <div className="bg-white/5 rounded-lg p-3">
            <span className="text-xs text-zinc-500 block mb-2">Confidence</span>
            <div className="flex items-center gap-2">
              <Progress value={confidencePercent} className="flex-1 h-1.5 bg-white/10" />
              <span className="font-mono text-xs text-emerald-400">{confidencePercent}%</span>
            </div>
          </div>
          <div className="bg-white/5 rounded-lg p-3">
            <span className="text-xs text-zinc-500 block mb-2">Risk Level</span>
            <div className="flex items-center gap-2">
              <Progress 
                value={riskPercent} 
                className="flex-1 h-1.5 bg-white/10"
              />
              <span className={`font-mono text-xs ${
                riskPercent > 60 ? 'text-red-400' : riskPercent > 30 ? 'text-amber-400' : 'text-emerald-400'
              }`}>
                {riskPercent}%
              </span>
            </div>
          </div>
        </div>

        {/* Action */}
        <div className="lg:ml-4">
          <Link to={`/card/${prediction.card_id}`}>
            <Button variant="outline" className="border-white/20 hover:bg-white/10 w-full lg:w-auto">
              View Card
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};
