import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getPortfolio, getPortfolioSummary, getTransactions, removeFromPortfolio } from '../lib/api';
import { PriceChart } from '../components/Charts/PriceChart';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../components/ui/alert-dialog';
import { toast } from 'sonner';
import { 
  Wallet, TrendingUp, TrendingDown, Trash2, ExternalLink, 
  Loader2, Package, History, Plus 
} from 'lucide-react';
import { formatCurrency, formatPercent, getPriceChangeColor } from '../lib/utils';

export default function Portfolio() {
  const { user } = useAuth();
  const [holdings, setHoldings] = useState([]);
  const [summary, setSummary] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [holdingsRes, summaryRes, transRes] = await Promise.all([
        getPortfolio(),
        getPortfolioSummary(),
        getTransactions(),
      ]);
      setHoldings(holdingsRes.data);
      setSummary(summaryRes.data);
      setTransactions(transRes.data);
    } catch (error) {
      console.error('Error fetching portfolio:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (holdingId) => {
    setDeleting(holdingId);
    try {
      await removeFromPortfolio(holdingId);
      toast.success('Removed from portfolio');
      fetchData();
    } catch (error) {
      toast.error('Failed to remove');
    } finally {
      setDeleting(null);
    }
  };

  // Generate portfolio chart data
  const portfolioChartData = Array.from({ length: 30 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - 29 + i);
    const baseValue = summary?.total_value || 10000;
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" data-testid="portfolio-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="font-heading font-bold text-2xl sm:text-3xl text-white mb-2">Portfolio</h1>
          <p className="text-zinc-400">Track your collection performance</p>
        </div>
        <Link to="/marketplace">
          <Button className="bg-[#007AFF] hover:bg-[#005bb5]" data-testid="add-cards-btn">
            <Plus className="w-4 h-4 mr-2" />
            Add Cards
          </Button>
        </Link>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-[#0A0A0C] border border-white/10 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Wallet className="w-4 h-4 text-[#007AFF]" />
            <span className="text-xs uppercase tracking-wider text-zinc-500">Total Value</span>
          </div>
          <span className="font-heading font-bold text-2xl text-white block">
            {formatCurrency(summary?.total_value || 0, true)}
          </span>
        </div>
        
        <div className="bg-[#0A0A0C] border border-white/10 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span className="text-xs uppercase tracking-wider text-zinc-500">Total Invested</span>
          </div>
          <span className="font-heading font-bold text-2xl text-white block">
            {formatCurrency(summary?.total_invested || 0, true)}
          </span>
        </div>
        
        <div className="bg-[#0A0A0C] border border-white/10 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            {(summary?.profit_loss || 0) >= 0 ? (
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-400" />
            )}
            <span className="text-xs uppercase tracking-wider text-zinc-500">Total P&L</span>
          </div>
          <span className={`font-heading font-bold text-2xl block ${getPriceChangeColor(summary?.profit_loss || 0)}`}>
            {formatCurrency(summary?.profit_loss || 0, true)}
          </span>
          <span className={`text-sm font-mono ${getPriceChangeColor(summary?.profit_loss_pct || 0)}`}>
            {formatPercent(summary?.profit_loss_pct || 0)}
          </span>
        </div>
        
        <div className="bg-[#0A0A0C] border border-white/10 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Package className="w-4 h-4 text-[#007AFF]" />
            <span className="text-xs uppercase tracking-wider text-zinc-500">Cards Owned</span>
          </div>
          <span className="font-heading font-bold text-2xl text-white block">
            {summary?.holdings_count || 0}
          </span>
          <span className="text-sm text-zinc-500">{summary?.unique_cards || 0} unique</span>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-[#0A0A0C] border border-white/10 rounded-xl p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-medium text-lg text-white">Portfolio Performance</h2>
          <span className="text-sm text-zinc-500">Last 30 days</span>
        </div>
        <PriceChart data={portfolioChartData} height={280} />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="holdings" className="space-y-6">
        <TabsList className="bg-[#0A0A0C] border border-white/10">
          <TabsTrigger value="holdings" className="data-[state=active]:bg-white/10">
            <Package className="w-4 h-4 mr-2" />
            Holdings
          </TabsTrigger>
          <TabsTrigger value="history" className="data-[state=active]:bg-white/10">
            <History className="w-4 h-4 mr-2" />
            Transaction History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="holdings">
          {holdings.length === 0 ? (
            <div className="text-center py-16 bg-[#0A0A0C] border border-white/10 rounded-xl">
              <Package className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No cards yet</h3>
              <p className="text-zinc-400 mb-6">Start building your collection</p>
              <Link to="/marketplace">
                <Button className="bg-[#007AFF] hover:bg-[#005bb5]">
                  Browse Marketplace
                </Button>
              </Link>
            </div>
          ) : (
            <div className="bg-[#0A0A0C] border border-white/10 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider p-4">Card</th>
                      <th className="text-right text-xs font-medium text-zinc-500 uppercase tracking-wider p-4">Qty</th>
                      <th className="text-right text-xs font-medium text-zinc-500 uppercase tracking-wider p-4">Avg Cost</th>
                      <th className="text-right text-xs font-medium text-zinc-500 uppercase tracking-wider p-4">Current Price</th>
                      <th className="text-right text-xs font-medium text-zinc-500 uppercase tracking-wider p-4">Value</th>
                      <th className="text-right text-xs font-medium text-zinc-500 uppercase tracking-wider p-4">P&L</th>
                      <th className="text-right text-xs font-medium text-zinc-500 uppercase tracking-wider p-4"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {holdings.map((holding) => (
                      <tr key={holding.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                        <td className="p-4">
                          <Link to={`/card/${holding.card_id}`} className="flex items-center gap-3 group">
                            <img
                              src={holding.card?.image_url}
                              alt={holding.card?.name}
                              className="w-12 h-16 object-cover rounded-lg"
                            />
                            <div>
                              <span className="text-white group-hover:text-[#007AFF] transition-colors line-clamp-1">
                                {holding.card?.name}
                              </span>
                              <span className="text-xs text-zinc-500 block">{holding.card?.player_name}</span>
                            </div>
                          </Link>
                        </td>
                        <td className="text-right p-4 font-mono text-white">{holding.quantity}</td>
                        <td className="text-right p-4 font-mono text-zinc-400">
                          {formatCurrency(holding.avg_purchase_price)}
                        </td>
                        <td className="text-right p-4 font-mono text-white">
                          {formatCurrency(holding.card?.current_price)}
                        </td>
                        <td className="text-right p-4 font-mono text-white">
                          {formatCurrency(holding.current_value)}
                        </td>
                        <td className="text-right p-4">
                          <span className={`font-mono ${getPriceChangeColor(holding.profit_loss)}`}>
                            {formatCurrency(holding.profit_loss)}
                          </span>
                          <span className={`text-xs block ${getPriceChangeColor(holding.profit_loss_pct)}`}>
                            {formatPercent(holding.profit_loss_pct)}
                          </span>
                        </td>
                        <td className="text-right p-4">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-zinc-400 hover:text-red-400"
                                data-testid={`remove-holding-${holding.id}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="bg-[#0A0A0C] border-white/10">
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remove from Portfolio?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will remove {holding.card?.name} from your portfolio.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel className="bg-white/10 hover:bg-white/20 border-0">
                                  Cancel
                                </AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleRemove(holding.id)}
                                  className="bg-red-500 hover:bg-red-600"
                                >
                                  {deleting === holding.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    'Remove'
                                  )}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="history">
          {transactions.length === 0 ? (
            <div className="text-center py-16 bg-[#0A0A0C] border border-white/10 rounded-xl">
              <History className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No transactions yet</h3>
              <p className="text-zinc-400">Your transaction history will appear here</p>
            </div>
          ) : (
            <div className="bg-[#0A0A0C] border border-white/10 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider p-4">Date</th>
                      <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider p-4">Card</th>
                      <th className="text-center text-xs font-medium text-zinc-500 uppercase tracking-wider p-4">Type</th>
                      <th className="text-right text-xs font-medium text-zinc-500 uppercase tracking-wider p-4">Qty</th>
                      <th className="text-right text-xs font-medium text-zinc-500 uppercase tracking-wider p-4">Price</th>
                      <th className="text-right text-xs font-medium text-zinc-500 uppercase tracking-wider p-4">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((tx) => (
                      <tr key={tx.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                        <td className="p-4 text-zinc-400 text-sm">
                          {new Date(tx.timestamp).toLocaleDateString()}
                        </td>
                        <td className="p-4 text-white">{tx.card_name}</td>
                        <td className="p-4 text-center">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            tx.transaction_type === 'buy'
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : 'bg-red-500/10 text-red-400'
                          }`}>
                            {tx.transaction_type.toUpperCase()}
                          </span>
                        </td>
                        <td className="text-right p-4 font-mono text-white">{tx.quantity}</td>
                        <td className="text-right p-4 font-mono text-zinc-400">
                          {formatCurrency(tx.price_per_card)}
                        </td>
                        <td className="text-right p-4 font-mono text-white">
                          {formatCurrency(tx.total_amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
