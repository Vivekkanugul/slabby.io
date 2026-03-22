import { useState } from 'react';
import { Link } from 'react-router-dom';
import { runStressTest } from '../lib/api';
import { Button } from '../components/ui/button';
import { Slider } from '../components/ui/slider';
import { Progress } from '../components/ui/progress';
import { 
  Shield, ArrowLeft, TrendingDown, Loader2, 
  AlertTriangle, Activity, Flame, BarChart3
} from 'lucide-react';
import { formatCurrency, formatPercent } from '../lib/utils';

export default function StressTest() {
  const [scenario, setScenario] = useState('market_crash');
  const [severity, setSeverity] = useState([0.2]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const scenarios = [
    { 
      value: 'market_crash', 
      label: 'Market Crash', 
      icon: TrendingDown,
      description: 'Simulate a broad market downturn affecting all cards',
      color: 'red'
    },
    { 
      value: 'economic_recession', 
      label: 'Economic Recession', 
      icon: AlertTriangle,
      description: 'Economic slowdown reducing collector spending',
      color: 'amber'
    },
    { 
      value: 'category_decline', 
      label: 'Category Decline', 
      icon: Activity,
      description: 'Specific sports category loses popularity',
      color: 'orange'
    },
    { 
      value: 'grading_scandal', 
      label: 'Grading Scandal', 
      icon: Shield,
      description: 'Trust issues with grading companies',
      color: 'purple'
    },
    { 
      value: 'market_boom', 
      label: 'Market Boom', 
      icon: Flame,
      description: 'Bull market with increased collector demand',
      color: 'emerald'
    },
  ];

  const runTest = async () => {
    setLoading(true);
    try {
      const response = await runStressTest({
        scenario,
        severity: severity[0]
      });
      setResult(response.data);
    } catch (error) {
      console.error('Error running stress test:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectedScenario = scenarios.find(s => s.value === scenario);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8" data-testid="stress-test-page">
      {/* Header */}
      <Link
        to="/analytics"
        className="inline-flex items-center gap-2 text-zinc-400 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Analytics
      </Link>

      <div className="flex items-center gap-3 mb-8">
        <div className="p-2 rounded-lg bg-gradient-to-br from-amber-500 to-red-500">
          <Shield className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="font-heading font-bold text-2xl sm:text-3xl text-white">Portfolio Stress Test</h1>
          <p className="text-zinc-400">Simulate how your portfolio performs under different conditions</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Input Section */}
        <div className="space-y-6">
          {/* Scenario Selection */}
          <div className="bg-[#0A0A0C] border border-white/10 rounded-xl p-6">
            <h3 className="font-medium text-white mb-4">Select Scenario</h3>
            <div className="space-y-2">
              {scenarios.map((s) => (
                <button
                  key={s.value}
                  onClick={() => setScenario(s.value)}
                  className={`w-full p-4 rounded-lg border text-left transition-colors ${
                    scenario === s.value
                      ? `bg-${s.color}-500/20 border-${s.color}-500/50`
                      : 'bg-white/5 border-white/10 hover:bg-white/10'
                  }`}
                  data-testid={`scenario-${s.value}`}
                >
                  <div className="flex items-center gap-3">
                    <s.icon className={`w-5 h-5 ${
                      scenario === s.value ? `text-${s.color}-400` : 'text-zinc-400'
                    }`} />
                    <div>
                      <span className={`font-medium block ${
                        scenario === s.value ? 'text-white' : 'text-zinc-300'
                      }`}>
                        {s.label}
                      </span>
                      <span className="text-xs text-zinc-500">{s.description}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Severity Slider */}
          <div className="bg-[#0A0A0C] border border-white/10 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-white">Severity Level</h3>
              <span className="font-mono text-lg text-amber-400">{(severity[0] * 100).toFixed(0)}%</span>
            </div>
            <Slider
              value={severity}
              onValueChange={setSeverity}
              min={0.05}
              max={0.50}
              step={0.05}
              className="w-full"
              data-testid="severity-slider"
            />
            <div className="flex justify-between text-xs text-zinc-500 mt-2">
              <span>Mild (5%)</span>
              <span>Moderate (25%)</span>
              <span>Severe (50%)</span>
            </div>
          </div>

          {/* Run Button */}
          <Button
            onClick={runTest}
            disabled={loading}
            className="w-full bg-gradient-to-r from-amber-500 to-red-500 hover:opacity-90 h-12"
            data-testid="run-stress-test-btn"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
            ) : (
              <Shield className="w-5 h-5 mr-2" />
            )}
            Run Stress Test
          </Button>
        </div>

        {/* Results Section */}
        <div className="space-y-6">
          {result ? (
            <>
              {/* Summary */}
              <div className={`bg-[#0A0A0C] border rounded-xl p-6 ${
                result.total_impact_pct > 0 ? 'border-emerald-500/30' : 'border-red-500/30'
              }`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium text-white">Stress Test Results</h3>
                  <span className="text-xs text-zinc-500">
                    {selectedScenario?.label} @ {(severity[0] * 100).toFixed(0)}% severity
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="p-4 bg-white/5 rounded-lg">
                    <span className="text-xs text-zinc-500 block mb-1">Current Value</span>
                    <span className="font-heading font-bold text-xl text-white">
                      {formatCurrency(result.total_current_value, true)}
                    </span>
                  </div>
                  <div className="p-4 bg-white/5 rounded-lg">
                    <span className="text-xs text-zinc-500 block mb-1">Stressed Value</span>
                    <span className={`font-heading font-bold text-xl ${
                      result.total_impact_pct > 0 ? 'text-emerald-400' : 'text-red-400'
                    }`}>
                      {formatCurrency(result.total_stressed_value, true)}
                    </span>
                  </div>
                </div>

                <div className="text-center py-6 border-y border-white/10">
                  <span className="text-zinc-400 block mb-2">Portfolio Impact</span>
                  <span className={`font-heading font-bold text-5xl ${
                    result.total_impact_pct > 0 ? 'text-emerald-400' : 'text-red-400'
                  }`}>
                    {formatPercent(result.total_impact_pct)}
                  </span>
                  <span className={`block mt-2 font-mono ${
                    result.total_impact > 0 ? 'text-emerald-400' : 'text-red-400'
                  }`}>
                    {formatCurrency(result.total_impact)}
                  </span>
                </div>

                {/* Risk Assessment */}
                {result.risk_assessment && (
                  <div className="mt-6 space-y-3">
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Max Drawdown</span>
                      <span className="font-mono text-red-400">{result.risk_assessment.max_drawdown}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Concentration Risk</span>
                      <span className="font-mono text-amber-400">{result.risk_assessment.concentration_risk}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Diversification Score</span>
                      <span className={`font-mono ${result.risk_assessment.diversification_score > 60 ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {result.risk_assessment.diversification_score}/100
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Holdings Impact */}
              <div className="bg-[#0A0A0C] border border-white/10 rounded-xl p-6">
                <h3 className="font-medium text-white mb-4 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-zinc-400" />
                  Impact by Holding
                </h3>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {result.holdings_impact?.map((holding) => (
                    <div key={holding.card_id} className="p-3 bg-white/5 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-white text-sm truncate flex-1">{holding.card_name}</span>
                        <span className={`font-mono text-sm ml-2 ${
                          holding.impact_pct > 0 ? 'text-emerald-400' : 'text-red-400'
                        }`}>
                          {formatPercent(holding.impact_pct)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-zinc-500">
                        <span>Beta: {holding.beta}</span>
                        <span>
                          {formatCurrency(holding.current_value, true)} → {formatCurrency(holding.stressed_value, true)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommendations */}
              {result.recommendations && (
                <div className="bg-[#0A0A0C] border border-[#00E5FF]/30 rounded-xl p-6">
                  <h3 className="font-medium text-white mb-4">AI Recommendations</h3>
                  <ul className="space-y-2">
                    {result.recommendations.map((rec, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
                        <span className="text-[#00E5FF]">•</span>
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : (
            <div className="bg-[#0A0A0C] border border-white/10 rounded-xl p-12 text-center">
              <Shield className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">Configure Stress Test</h3>
              <p className="text-zinc-400">Select a scenario and severity to simulate portfolio impact</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
