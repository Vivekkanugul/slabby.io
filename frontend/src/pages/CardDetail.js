import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getCard, getCardPriceHistory, getCardPrediction, analyzeCardWithAI, addToPortfolio } from '../lib/api';
import { PriceChart } from '../components/Charts/PriceChart';
import { AISignalBadge } from '../components/AI/AISignalBadge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';
import { toast } from 'sonner';
import { 
  ArrowLeft, TrendingUp, TrendingDown, Sparkles, ShoppingCart, 
  Plus, Loader2, AlertTriangle, CheckCircle, BarChart3, Activity 
} from 'lucide-react';
import { formatCurrency, formatPercent, getPriceChangeColor } from '../lib/utils';

export default function CardDetail() {
  const { cardId } = useParams();
  const { isAuthenticated } = useAuth();
  const [card, setCard] = useState(null);
  const [priceHistory, setPriceHistory] = useState([]);
  const [prediction, setPrediction] = useState(null);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [purchasePrice, setPurchasePrice] = useState('');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetchCardData();
  }, [cardId]);

  const fetchCardData = async () => {
    try {
      const [cardRes, historyRes, predRes] = await Promise.all([
        getCard(cardId),
        getCardPriceHistory(cardId),
        getCardPrediction(cardId),
      ]);
      setCard(cardRes.data);
      setPriceHistory(historyRes.data.history);
      setPrediction(predRes.data);
      setPurchasePrice(cardRes.data.current_price.toString());
    } catch (error) {
      console.error('Error fetching card:', error);
      toast.error('Failed to load card details');
    } finally {
      setLoading(false);
    }
  };

  const handleAIAnalysis = async () => {
    if (!isAuthenticated) {
      toast.error('Please sign in to use AI analysis');
      return;
    }
    setAnalyzing(true);
    try {
      const response = await analyzeCardWithAI(cardId);
      setAiAnalysis(response.data);
      toast.success('AI analysis complete');
    } catch (error) {
      toast.error('Failed to generate AI analysis');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleAddToPortfolio = async () => {
    if (!isAuthenticated) {
      toast.error('Please sign in to add cards');
      return;
    }
    setAdding(true);
    try {
      await addToPortfolio({
        card_id: cardId,
        quantity: parseInt(quantity),
        purchase_price: parseFloat(purchasePrice),
      });
      toast.success(`Added ${quantity} card(s) to portfolio`);
      setAddDialogOpen(false);
    } catch (error) {
      toast.error('Failed to add to portfolio');
    } finally {
      setAdding(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#007AFF]" />
      </div>
    );
  }

  if (!card) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-zinc-400">Card not found</p>
      </div>
    );
  }

  const isPositive = card.price_change_pct >= 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" data-testid="card-detail-page">
      {/* Back Button */}
      <Link
        to="/marketplace"
        className="inline-flex items-center gap-2 text-zinc-400 hover:text-white mb-6 transition-colors"
        data-testid="back-to-marketplace"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Marketplace
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Card Image */}
        <div className="lg:col-span-1">
          <div className="sticky top-24">
            <div className="bg-[#0A0A0C] border border-white/10 rounded-2xl overflow-hidden">
              <div className="relative aspect-[3/4]">
                <img
                  src={card.image_url}
                  alt={card.name}
                  className="w-full h-full object-cover"
                />
                {/* Rarity Badge */}
                <div className="absolute top-4 left-4">
                  <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${
                    card.rarity === 'Legendary' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                    card.rarity === 'Ultra Rare' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
                    card.rarity === 'Rare' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                    'bg-zinc-500/20 text-zinc-400 border border-zinc-500/30'
                  }`}>
                    {card.rarity}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="p-4 space-y-3">
                <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="w-full bg-[#007AFF] hover:bg-[#005bb5]" data-testid="add-to-portfolio-btn">
                      <Plus className="w-4 h-4 mr-2" />
                      Add to Portfolio
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-[#0A0A0C] border-white/10">
                    <DialogHeader>
                      <DialogTitle>Add to Portfolio</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <Label>Quantity</Label>
                        <Input
                          type="number"
                          min="1"
                          value={quantity}
                          onChange={(e) => setQuantity(e.target.value)}
                          className="bg-white/5 border-white/10"
                          data-testid="portfolio-quantity-input"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Purchase Price (per card)</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={purchasePrice}
                          onChange={(e) => setPurchasePrice(e.target.value)}
                          className="bg-white/5 border-white/10"
                          data-testid="portfolio-price-input"
                        />
                      </div>
                      <div className="p-3 bg-white/5 rounded-lg">
                        <div className="flex justify-between text-sm">
                          <span className="text-zinc-400">Total Investment</span>
                          <span className="font-mono text-white">
                            {formatCurrency(quantity * parseFloat(purchasePrice || 0))}
                          </span>
                        </div>
                      </div>
                      <Button
                        onClick={handleAddToPortfolio}
                        disabled={adding}
                        className="w-full bg-white text-black hover:bg-gray-200"
                        data-testid="confirm-add-btn"
                      >
                        {adding ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                        Confirm
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>

                <Button
                  variant="outline"
                  className="w-full border-[#00E5FF] text-[#00E5FF] hover:bg-[#00E5FF]/10"
                  onClick={handleAIAnalysis}
                  disabled={analyzing}
                  data-testid="ai-analysis-btn"
                >
                  {analyzing ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Sparkles className="w-4 h-4 mr-2" />
                  )}
                  AI Analysis
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Card Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs uppercase tracking-wider text-zinc-500">{card.category}</span>
              <span className="text-zinc-600">•</span>
              <span className="text-xs text-zinc-500">{card.set_name}</span>
            </div>
            <h1 className="font-heading font-bold text-2xl sm:text-3xl text-white mb-2">{card.name}</h1>
            <p className="text-lg text-zinc-400">{card.player_name} • {card.team}</p>
          </div>

          {/* Price Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-[#0A0A0C] border border-white/10 rounded-xl p-4">
              <span className="text-xs uppercase tracking-wider text-zinc-500 block mb-1">Current Price</span>
              <span className="font-heading font-bold text-xl text-white">
                {formatCurrency(card.current_price, true)}
              </span>
            </div>
            <div className="bg-[#0A0A0C] border border-white/10 rounded-xl p-4">
              <span className="text-xs uppercase tracking-wider text-zinc-500 block mb-1">24h Change</span>
              <span className={`font-heading font-bold text-xl ${getPriceChangeColor(card.price_change_pct)}`}>
                {formatPercent(card.price_change_pct)}
              </span>
            </div>
            <div className="bg-[#0A0A0C] border border-white/10 rounded-xl p-4">
              <span className="text-xs uppercase tracking-wider text-zinc-500 block mb-1">24h Volume</span>
              <span className="font-heading font-bold text-xl text-white">{card.volume_24h}</span>
            </div>
            <div className="bg-[#0A0A0C] border border-white/10 rounded-xl p-4">
              <span className="text-xs uppercase tracking-wider text-zinc-500 block mb-1">Grade</span>
              <span className="font-mono font-bold text-xl text-white">{card.grade}</span>
            </div>
          </div>

          {/* Price Chart */}
          <div className="bg-[#0A0A0C] border border-white/10 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-medium text-lg text-white">Price History</h2>
              <span className="text-sm text-zinc-500">Last 30 days</span>
            </div>
            <PriceChart data={priceHistory} height={300} />
          </div>

          {/* AI Prediction */}
          {prediction && (
            <div className="bg-[#0A0A0C] border border-white/10 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-[#00E5FF]/10">
                  <Sparkles className="w-5 h-5 text-[#00E5FF]" />
                </div>
                <div>
                  <h2 className="font-medium text-lg text-white">AI Prediction</h2>
                  <p className="text-sm text-zinc-500">Powered by GPT-5.2</p>
                </div>
                <div className="ml-auto">
                  <AISignalBadge signal={prediction.signal} confidence={prediction.confidence_score} />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                <div className="p-4 bg-white/5 rounded-lg">
                  <span className="text-xs text-zinc-500 block mb-1">7-Day Prediction</span>
                  <span className="font-mono font-medium text-white">
                    {formatCurrency(prediction.predicted_price_7d, true)}
                  </span>
                </div>
                <div className="p-4 bg-white/5 rounded-lg">
                  <span className="text-xs text-zinc-500 block mb-1">30-Day Prediction</span>
                  <span className="font-mono font-medium text-white">
                    {formatCurrency(prediction.predicted_price_30d, true)}
                  </span>
                </div>
                <div className="p-4 bg-white/5 rounded-lg">
                  <span className="text-xs text-zinc-500 block mb-1">Confidence</span>
                  <span className="font-mono font-medium text-emerald-400">
                    {Math.round(prediction.confidence_score * 100)}%
                  </span>
                </div>
                <div className="p-4 bg-white/5 rounded-lg">
                  <span className="text-xs text-zinc-500 block mb-1">Risk Score</span>
                  <span className={`font-mono font-medium ${
                    prediction.risk_score > 0.6 ? 'text-red-400' : 
                    prediction.risk_score > 0.3 ? 'text-amber-400' : 'text-emerald-400'
                  }`}>
                    {Math.round(prediction.risk_score * 100)}%
                  </span>
                </div>
              </div>

              <p className="text-zinc-400 text-sm">{prediction.analysis}</p>

              {prediction.factors && prediction.factors.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {prediction.factors.map((factor, i) => (
                    <span key={i} className="px-2 py-1 bg-white/5 rounded-full text-xs text-zinc-400">
                      {factor}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* AI Analysis Result */}
          {aiAnalysis && (
            <div className="bg-[#0A0A0C] border border-[#00E5FF]/30 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-[#00E5FF]" />
                <h3 className="font-medium text-white">GPT-5.2 Analysis</h3>
              </div>
              <p className="text-zinc-300 whitespace-pre-wrap">{aiAnalysis.analysis}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
