import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getCards, calculateGradeProbability } from '../lib/api';
import { Button } from '../components/ui/button';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Progress } from '../components/ui/progress';
import { 
  Target, ArrowLeft, TrendingUp, Loader2, 
  DollarSign, Percent, CheckCircle, XCircle, Calculator
} from 'lucide-react';
import { formatCurrency } from '../lib/utils';

export default function GradeCalculator() {
  const [cards, setCards] = useState([]);
  const [selectedCard, setSelectedCard] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [cardsLoading, setCardsLoading] = useState(true);

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

  const handleCardSelect = (cardId) => {
    const card = cards.find(c => c.id === cardId);
    setSelectedCard(card);
    setResult(null);
  };

  const calculateProbability = async () => {
    if (!selectedCard) return;
    
    setLoading(true);
    try {
      const response = await calculateGradeProbability(selectedCard.id, 'raw');
      setResult(response.data);
    } catch (error) {
      console.error('Error calculating grade probability:', error);
    } finally {
      setLoading(false);
    }
  };

  const getGradeColor = (grade) => {
    if (grade.includes('10')) return 'text-emerald-400 bg-emerald-500/20';
    if (grade.includes('9')) return 'text-blue-400 bg-blue-500/20';
    if (grade.includes('8')) return 'text-amber-400 bg-amber-500/20';
    return 'text-zinc-400 bg-zinc-500/20';
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8" data-testid="grade-calculator-page">
      {/* Header */}
      <Link
        to="/analytics"
        className="inline-flex items-center gap-2 text-zinc-400 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Analytics
      </Link>

      <div className="flex items-center gap-3 mb-8">
        <div className="p-2 rounded-lg bg-gradient-to-br from-[#00E5FF] to-[#007AFF]">
          <Target className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="font-heading font-bold text-2xl sm:text-3xl text-white">Grade Probability Calculator</h1>
          <p className="text-zinc-400">Predict grading outcomes and calculate ROI</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Input Section */}
        <div className="space-y-6">
          <div className="bg-[#0A0A0C] border border-white/10 rounded-xl p-6">
            <h3 className="font-medium text-white mb-4">Select Card to Analyze</h3>
            <Select onValueChange={handleCardSelect} disabled={cardsLoading}>
              <SelectTrigger className="bg-white/5 border-white/10" data-testid="grade-card-select">
                <SelectValue placeholder="Choose a card..." />
              </SelectTrigger>
              <SelectContent className="bg-[#0A0A0C] border-white/10 max-h-80">
                {cards.map((card) => (
                  <SelectItem key={card.id} value={card.id}>
                    <div className="flex items-center gap-2">
                      <span>{card.name}</span>
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
                    className="w-20 h-28 object-cover rounded"
                  />
                  <div>
                    <span className="font-medium text-white block">{selectedCard.name}</span>
                    <span className="text-sm text-zinc-400">{selectedCard.player_name}</span>
                    <div className="mt-2 flex items-center gap-4">
                      <div>
                        <span className="text-xs text-zinc-500 block">Current Grade</span>
                        <span className="font-mono text-white">{selectedCard.grade}</span>
                      </div>
                      <div>
                        <span className="text-xs text-zinc-500 block">Market Price</span>
                        <span className="font-mono text-white">{formatCurrency(selectedCard.current_price, true)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <Button
              onClick={calculateProbability}
              disabled={!selectedCard || loading}
              className="w-full mt-4 bg-[#00E5FF] text-black hover:bg-[#00E5FF]/80"
              data-testid="calculate-grade-btn"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
              ) : (
                <Calculator className="w-5 h-5 mr-2" />
              )}
              Calculate Grade Probability
            </Button>
          </div>

          {/* Info Card */}
          <div className="bg-[#0A0A0C] border border-white/10 rounded-xl p-6">
            <h3 className="font-medium text-white mb-4">How It Works</h3>
            <div className="space-y-3 text-sm text-zinc-400">
              <p>Our AI analyzes multiple factors to predict grading outcomes:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Card age and condition indicators</li>
                <li>Historical grading data for similar cards</li>
                <li>Market value differentials by grade</li>
                <li>Expected ROI calculations including grading fees</li>
              </ul>
              <p className="pt-2 border-t border-white/10 mt-4">
                <strong className="text-white">Note:</strong> Probabilities are estimates based on historical data and should not be considered financial advice.
              </p>
            </div>
          </div>
        </div>

        {/* Results Section */}
        <div className="space-y-6">
          {result ? (
            <>
              {/* Recommendation */}
              <div className={`bg-[#0A0A0C] border rounded-xl p-6 ${
                result.recommendation === 'Grade' 
                  ? 'border-emerald-500/30' 
                  : 'border-amber-500/30'
              }`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium text-white">AI Recommendation</h3>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 ${
                    result.recommendation === 'Grade'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-amber-500/20 text-amber-400'
                  }`}>
                    {result.recommendation === 'Grade' ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <XCircle className="w-4 h-4" />
                    )}
                    {result.recommendation}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-white/5 rounded-lg">
                    <span className="text-xs text-zinc-500 block mb-1">Raw Value Estimate</span>
                    <span className="font-heading font-bold text-lg text-white">
                      {formatCurrency(result.current_estimated_value)}
                    </span>
                  </div>
                  <div className="p-4 bg-white/5 rounded-lg">
                    <span className="text-xs text-zinc-500 block mb-1">Grading Cost</span>
                    <span className="font-heading font-bold text-lg text-white">
                      ${result.grading_cost}
                    </span>
                  </div>
                </div>

                <div className="mt-4 p-4 bg-gradient-to-r from-[#00E5FF]/10 to-[#007AFF]/10 rounded-lg border border-[#00E5FF]/20">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400">Expected Value After Grading</span>
                    <span className="font-heading font-bold text-2xl text-[#00E5FF]">
                      {formatCurrency(result.expected_value_after_grading)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Grade Probabilities */}
              <div className="bg-[#0A0A0C] border border-white/10 rounded-xl p-6">
                <h3 className="font-medium text-white mb-4">Grade Probability Breakdown</h3>
                <div className="space-y-4">
                  {result.grade_probabilities?.map((gp) => (
                    <div key={gp.grade} className="p-4 bg-white/5 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded text-xs font-mono font-medium ${getGradeColor(gp.grade)}`}>
                            {gp.grade}
                          </span>
                          <span className="font-mono text-white">{gp.probability}%</span>
                        </div>
                        <span className="font-mono text-zinc-400">
                          {formatCurrency(gp.expected_value, true)}
                        </span>
                      </div>
                      <Progress value={gp.probability} className="h-2 mb-2" />
                      <div className="flex justify-between text-xs">
                        <span className="text-zinc-500">ROI if achieved</span>
                        <span className={gp.roi_if_achieved > 0 ? 'text-emerald-400' : 'text-red-400'}>
                          {gp.roi_if_achieved > 0 ? '+' : ''}{gp.roi_if_achieved.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Confidence */}
              <div className="bg-[#0A0A0C] border border-white/10 rounded-xl p-6">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Model Confidence</span>
                  <span className="font-mono text-white">{(result.confidence * 100).toFixed(0)}%</span>
                </div>
                <Progress value={result.confidence * 100} className="h-2 mt-2" />
              </div>
            </>
          ) : (
            <div className="bg-[#0A0A0C] border border-white/10 rounded-xl p-12 text-center">
              <Target className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">Select a Card</h3>
              <p className="text-zinc-400">Choose a card to calculate grade probabilities and expected ROI</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
