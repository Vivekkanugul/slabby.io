import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getCards, runWhatIfScenario, getCardSentiment } from '../lib/api';
import { Button } from '../components/ui/button';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { Progress } from '../components/ui/progress';
import { 
  Zap, ArrowLeft, TrendingUp, TrendingDown, Loader2, 
  Activity, Target, Clock, History, Sparkles
} from 'lucide-react';
import { formatCurrency, formatPercent } from '../lib/utils';

export default function WhatIfSimulator() {
  const [cards, setCards] = useState([]);
  const [selectedCard, setSelectedCard] = useState(null);
  const [scenarioType, setScenarioType] = useState('');
  const [scenarioDetails, setScenarioDetails] = useState('');
  const [result, setResult] = useState(null);
  const [sentiment, setSentiment] = useState(null);
  const [loading, setLoading] = useState(false);
  const [cardsLoading, setCardsLoading] = useState(true);

  const scenarios = [
    { value: 'trade', label: 'Player Trade to Contender', icon: '🔄' },
    { value: 'injury', label: 'Serious Injury', icon: '🏥' },
    { value: 'award', label: 'MVP/Award Win', icon: '🏆' },
    { value: 'championship', label: 'Championship Win', icon: '💍' },
    { value: 'retirement', label: 'Player Retirement', icon: '👋' },
    { value: 'hall_of_fame', label: 'Hall of Fame Induction', icon: '🎖️' },
    { value: 'regrade_up', label: 'Regrade: PSA 9 → PSA 10', icon: '📈' },
    { value: 'regrade_down', label: 'Regrade: PSA 10 → PSA 9', icon: '📉' },
    { value: 'scandal', label: 'Off-Field Scandal', icon: '⚠️' },
  ];

  useEffect(() => {
    fetchCards();
  }, []);

  const fetchCards = async () => {
    try {
      const response = await getCards({});
      setCards(response.data);
    } catch (error) {
      console.error('Error fetching cards:', error);
    } finally {
      setCardsLoading(false);
    }
  };

  const handleCardSelect = async (cardId) => {
    const card = cards.find(c => c.id === cardId);
    setSelectedCard(card);
    setResult(null);
    
    // Fetch sentiment for selected card
    try {
      const sentimentRes = await getCardSentiment(cardId);
      setSentiment(sentimentRes.data);
    } catch (error) {
      console.error('Error fetching sentiment:', error);
    }
  };

  const runSimulation = async () => {
    if (!selectedCard || !scenarioType) return;
    
    setLoading(true);
    try {
      const response = await runWhatIfScenario({
        card_id: selectedCard.id,
        scenario_type: scenarioType,
        scenario_details: scenarioDetails || null
      });
      setResult(response.data);
    } catch (error) {
      console.error('Error running simulation:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectedScenario = scenarios.find(s => s.value === scenarioType);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8" data-testid="whatif-simulator-page">
      {/* Header */}
      <Link
        to="/analytics"
        className="inline-flex items-center gap-2 text-zinc-400 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Analytics
      </Link>

      <div className="flex items-center gap-3 mb-8">
        <div className="p-2 rounded-lg bg-gradient-to-br from-[#007AFF] to-[#00E5FF]">
          <Zap className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="font-heading font-bold text-2xl sm:text-3xl text-white">What-If Simulator</h1>
          <p className="text-zinc-400">Model how scenarios affect card values</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Input Section */}
        <div className="space-y-6">
          {/* Card Selection */}
          <div className="bg-[#0A0A0C] border border-white/10 rounded-xl p-6">
            <h3 className="font-medium text-white mb-4">1. Select Card</h3>
            <Select onValueChange={handleCardSelect} disabled={cardsLoading}>
              <SelectTrigger className="bg-white/5 border-white/10" data-testid="card-select">
                <SelectValue placeholder="Choose a card to analyze..." />
              </SelectTrigger>
              <SelectContent className="bg-[#0A0A0C] border-white/10 max-h-80">
                {cards.map((card) => (
                  <SelectItem key={card.id} value={card.id}>
                    <div className="flex items-center gap-2">
                      <span>{card.name}</span>
                      <span className="text-zinc-500">({formatCurrency(card.current_price, true)})</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedCard && (
              <div className="mt-4 p-4 bg-white/5 rounded-lg">
                <div className="flex items-center gap-4">
                  <img 
                    src={selectedCard.image_url} 
                    alt={selectedCard.name}
                    className="w-16 h-20 object-cover rounded"
                  />
                  <div>
                    <span className="font-medium text-white block">{selectedCard.player_name}</span>
                    <span className="text-sm text-zinc-400">{selectedCard.grade}</span>
                    <div className="mt-1">
                      <span className="font-mono text-lg text-white">{formatCurrency(selectedCard.current_price)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Scenario Selection */}
          <div className="bg-[#0A0A0C] border border-white/10 rounded-xl p-6">
            <h3 className="font-medium text-white mb-4">2. Select Scenario</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {scenarios.map((scenario) => (
                <button
                  key={scenario.value}
                  onClick={() => setScenarioType(scenario.value)}
                  className={`p-3 rounded-lg border text-left transition-colors ${
                    scenarioType === scenario.value
                      ? 'bg-[#007AFF]/20 border-[#007AFF]/50 text-white'
                      : 'bg-white/5 border-white/10 text-zinc-400 hover:bg-white/10 hover:text-white'
                  }`}
                  data-testid={`scenario-${scenario.value}`}
                >
                  <span className="mr-2">{scenario.icon}</span>
                  <span className="text-sm">{scenario.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Additional Details */}
          <div className="bg-[#0A0A0C] border border-white/10 rounded-xl p-6">
            <h3 className="font-medium text-white mb-4">3. Additional Context (Optional)</h3>
            <Textarea
              placeholder="E.g., 'Trade to Lakers', 'Super Bowl MVP', 'Torn ACL'..."
              value={scenarioDetails}
              onChange={(e) => setScenarioDetails(e.target.value)}
              className="bg-white/5 border-white/10 focus:border-white/30 min-h-[80px]"
              data-testid="scenario-details"
            />
          </div>

          {/* Run Button */}
          <Button
            onClick={runSimulation}
            disabled={!selectedCard || !scenarioType || loading}
            className="w-full bg-gradient-to-r from-[#007AFF] to-[#00E5FF] hover:opacity-90 h-12"
            data-testid="run-simulation-btn"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
            ) : (
              <Sparkles className="w-5 h-5 mr-2" />
            )}
            Run AI Simulation
          </Button>
        </div>

        {/* Results Section */}
        <div className="space-y-6">
          {result ? (
            <>
              {/* Main Result */}
              <div className={`bg-[#0A0A0C] border rounded-xl p-6 ${
                result.impact_percentage > 0 ? 'border-emerald-500/30' : 'border-red-500/30'
              }`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium text-white">Simulation Result</h3>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    result.impact_percentage > 0 
                      ? 'bg-emerald-500/20 text-emerald-400' 
                      : 'bg-red-500/20 text-red-400'
                  }`}>
                    {selectedScenario?.icon} {selectedScenario?.label}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="p-4 bg-white/5 rounded-lg">
                    <span className="text-xs text-zinc-500 block mb-1">Current Price</span>
                    <span className="font-heading font-bold text-xl text-white">
                      {formatCurrency(result.current_price, true)}
                    </span>
                  </div>
                  <div className="p-4 bg-white/5 rounded-lg">
                    <span className="text-xs text-zinc-500 block mb-1">Predicted Price</span>
                    <span className={`font-heading font-bold text-xl ${
                      result.impact_percentage > 0 ? 'text-emerald-400' : 'text-red-400'
                    }`}>
                      {formatCurrency(result.predicted_price, true)}
                    </span>
                  </div>
                </div>

                <div className="text-center py-6 border-y border-white/10">
                  <span className="text-zinc-400 block mb-2">Expected Impact</span>
                  <span className={`font-heading font-bold text-5xl ${
                    result.impact_percentage > 0 ? 'text-emerald-400' : 'text-red-400'
                  }`}>
                    {result.impact_percentage > 0 ? '+' : ''}{result.impact_percentage.toFixed(1)}%
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-6">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="w-4 h-4 text-zinc-500" />
                      <span className="text-xs text-zinc-500">Expected Timeframe</span>
                    </div>
                    <span className="text-white">{result.expected_timeframe}</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="w-4 h-4 text-zinc-500" />
                      <span className="text-xs text-zinc-500">Confidence</span>
                    </div>
                    <span className="text-white">{(result.confidence * 100).toFixed(0)}%</span>
                  </div>
                </div>
              </div>

              {/* AI Analysis */}
              <div className="bg-[#0A0A0C] border border-[#00E5FF]/30 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-5 h-5 text-[#00E5FF]" />
                  <h3 className="font-medium text-white">AI Analysis</h3>
                </div>
                <p className="text-zinc-300 whitespace-pre-wrap">{result.ai_analysis}</p>
              </div>

              {/* Historical Precedents */}
              {result.similar_events && (
                <div className="bg-[#0A0A0C] border border-white/10 rounded-xl p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <History className="w-5 h-5 text-amber-400" />
                    <h3 className="font-medium text-white">Historical Precedents</h3>
                  </div>
                  <div className="space-y-2">
                    {result.similar_events.map((event, i) => (
                      <div key={i} className="flex justify-between p-3 bg-white/5 rounded-lg">
                        <span className="text-zinc-400">{event.event}</span>
                        <span className={`font-mono ${
                          event.impact.startsWith('-') ? 'text-red-400' : 'text-emerald-400'
                        }`}>
                          {event.impact}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="bg-[#0A0A0C] border border-white/10 rounded-xl p-12 text-center">
              <Zap className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">Ready to Simulate</h3>
              <p className="text-zinc-400">Select a card and scenario to see AI predictions</p>
            </div>
          )}

          {/* Current Sentiment */}
          {sentiment && (
            <div className="bg-[#0A0A0C] border border-white/10 rounded-xl p-6">
              <h3 className="font-medium text-white mb-4">Current Social Sentiment</h3>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-zinc-400">Twitter</span>
                    <span className={sentiment.twitter_sentiment > 0 ? 'text-emerald-400' : 'text-red-400'}>
                      {sentiment.twitter_sentiment > 0 ? '+' : ''}{(sentiment.twitter_sentiment * 100).toFixed(0)}
                    </span>
                  </div>
                  <Progress value={50 + sentiment.twitter_sentiment * 50} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-zinc-400">Reddit</span>
                    <span className={sentiment.reddit_sentiment > 0 ? 'text-emerald-400' : 'text-red-400'}>
                      {sentiment.reddit_sentiment > 0 ? '+' : ''}{(sentiment.reddit_sentiment * 100).toFixed(0)}
                    </span>
                  </div>
                  <Progress value={50 + sentiment.reddit_sentiment * 50} className="h-2" />
                </div>
                <div className="pt-3 border-t border-white/10">
                  <div className="flex justify-between">
                    <span className="text-zinc-400">24h Mentions</span>
                    <span className="text-white">{sentiment.mentions_24h?.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
