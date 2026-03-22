import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  getPortfolio, getPortfolioSummary, getTransactions, removeFromPortfolio,
  getWatchlist, removeFromWatchlist, updateWatchlistItem, getWatchlistAlerts, getCards, addToWatchlist
} from '../lib/api';
import { PriceChart } from '../components/Charts/PriceChart';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '../components/ui/alert-dialog';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '../components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../components/ui/select';
import { toast } from 'sonner';
import {
  Wallet, TrendingUp, TrendingDown, Trash2, ExternalLink,
  Loader2, Package, History, Plus, Eye, Bell, Settings,
  AlertTriangle, BellRing, Target
} from 'lucide-react';
import { formatCurrency, formatPercent, getPriceChangeColor } from '../lib/utils';

export default function Portfolio() {
  const { user } = useAuth();
  const [holdings, setHoldings] = useState([]);
  const [summary, setSummary] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);
  // Watchlist state
  const [watchlist, setWatchlist] = useState([]);
  const [watchlistAlerts, setWatchlistAlerts] = useState([]);
  const [allCards, setAllCards] = useState([]);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState('');
  const [targetHigh, setTargetHigh] = useState('');
  const [targetLow, setTargetLow] = useState('');
  const [notes, setNotes] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [holdingsRes, summaryRes, transRes, watchlistRes, alertsRes, cardsRes] = await Promise.all([
        getPortfolio(),
        getPortfolioSummary(),
        getTransactions(),
        getWatchlist().catch(() => ({ data: [] })),
        getWatchlistAlerts().catch(() => ({ data: { alerts: [] } })),
        getCards({})
      ]);
      setHoldings(holdingsRes.data);
      setSummary(summaryRes.data);
      setTransactions(transRes.data);
      setWatchlist(watchlistRes.data);
      setWatchlistAlerts(alertsRes.data.alerts || []);
      setAllCards(cardsRes.data);
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

  const handleAddToWatchlist = async () => {
    if (!selectedCardId) { toast.error('Please select a card'); return; }
    setAdding(true);
    try {
      await addToWatchlist({
        card_id: selectedCardId,
        target_price_high: targetHigh ? parseFloat(targetHigh) : null,
        target_price_low: targetLow ? parseFloat(targetLow) : null,
        notes: notes || null
      });
      toast.success('Added to watchlist');
      setAddDialogOpen(false);
      setSelectedCardId(''); setTargetHigh(''); setTargetLow(''); setNotes('');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add');
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveFromWatchlist = async (itemId) => {
    try {
      await removeFromWatchlist(itemId);
      toast.success('Removed from watchlist');
      fetchData();
    } catch (error) {
      toast.error('Failed to remove');
    }
  };

  const handleUpdateWatchlistAlerts = async (itemId, updates) => {
    try {
      await updateWatchlistItem(itemId, updates);
      toast.success('Alerts updated');
      fetchData();
    } catch (error) {
      toast.error('Failed to update');
    }
  };

  const availableCards = allCards.filter(card => !watchlist.find(w => w.card_id === card.id));

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
          <p className="text-zinc-400">Track your collection and watchlist</p>
        </div>
        <Link to="/marketplace">
          <Button className="bg-[#007AFF] hover:bg-[#005bb5]" data-testid="add-cards-btn">
            <Plus className="w-4 h-4 mr-2" />Add Cards
          </Button>
        </Link>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={<Wallet className="w-4 h-4 text-[#007AFF]" />} label="Total Value" value={formatCurrency(summary?.total_value || 0, true)} />
        <StatCard icon={<TrendingUp className="w-4 h-4 text-emerald-400" />} label="Total Invested" value={formatCurrency(summary?.total_invested || 0, true)} />
        <StatCard
          icon={(summary?.profit_loss || 0) >= 0 ? <TrendingUp className="w-4 h-4 text-emerald-400" /> : <TrendingDown className="w-4 h-4 text-red-400" />}
          label="Total P&L"
          value={formatCurrency(summary?.profit_loss || 0, true)}
          valueClass={getPriceChangeColor(summary?.profit_loss || 0)}
          sub={formatPercent(summary?.profit_loss_pct || 0)}
          subClass={getPriceChangeColor(summary?.profit_loss_pct || 0)}
        />
        <StatCard icon={<Package className="w-4 h-4 text-[#007AFF]" />} label="Cards Owned" value={summary?.holdings_count || 0} sub={`${summary?.unique_cards || 0} unique`} />
      </div>

      {/* Chart */}
      <div className="bg-[#0A0A0C] border border-white/10 rounded-xl p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-medium text-lg text-white">Portfolio Performance</h2>
          <span className="text-sm text-zinc-500">Last 30 days</span>
        </div>
        <PriceChart data={portfolioChartData} height={280} />
      </div>

      {/* Tabs: Holdings / Watchlist / History */}
      <Tabs defaultValue="holdings" className="space-y-6">
        <TabsList className="bg-[#0A0A0C] border border-white/10">
          <TabsTrigger value="holdings" className="data-[state=active]:bg-white/10" data-testid="tab-holdings">
            <Package className="w-4 h-4 mr-2" />Holdings
          </TabsTrigger>
          <TabsTrigger value="watchlist" className="data-[state=active]:bg-white/10" data-testid="tab-watchlist">
            <Eye className="w-4 h-4 mr-2" />Watchlist ({watchlist.length})
          </TabsTrigger>
          <TabsTrigger value="history" className="data-[state=active]:bg-white/10" data-testid="tab-history">
            <History className="w-4 h-4 mr-2" />Transactions
          </TabsTrigger>
        </TabsList>

        {/* ===== HOLDINGS TAB ===== */}
        <TabsContent value="holdings">
          {holdings.length === 0 ? (
            <EmptyState icon={<Package className="w-12 h-12 text-zinc-600" />} title="No cards yet" desc="Start building your collection" actionLabel="Browse Marketplace" actionTo="/marketplace" />
          ) : (
            <div className="bg-[#0A0A0C] border border-white/10 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      {['Card', 'Qty', 'Avg Cost', 'Current Price', 'Value', 'P&L', ''].map(h => (
                        <th key={h} className={`${h === 'Card' ? 'text-left' : 'text-right'} text-xs font-medium text-zinc-500 uppercase tracking-wider p-4`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {holdings.map((holding) => (
                      <tr key={holding.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                        <td className="p-4">
                          <Link to={`/card/${holding.card_id}`} className="flex items-center gap-3 group">
                            <img src={holding.card?.image_url} alt={holding.card?.name} className="w-12 h-16 object-cover rounded-lg" />
                            <div>
                              <span className="text-white group-hover:text-[#007AFF] transition-colors line-clamp-1">{holding.card?.name}</span>
                              <span className="text-xs text-zinc-500 block">{holding.card?.player_name}</span>
                            </div>
                          </Link>
                        </td>
                        <td className="text-right p-4 font-mono text-white">{holding.quantity}</td>
                        <td className="text-right p-4 font-mono text-zinc-400">{formatCurrency(holding.avg_purchase_price)}</td>
                        <td className="text-right p-4 font-mono text-white">{formatCurrency(holding.card?.current_price)}</td>
                        <td className="text-right p-4 font-mono text-white">{formatCurrency(holding.current_value)}</td>
                        <td className="text-right p-4">
                          <span className={`font-mono ${getPriceChangeColor(holding.profit_loss)}`}>{formatCurrency(holding.profit_loss)}</span>
                          <span className={`text-xs block ${getPriceChangeColor(holding.profit_loss_pct)}`}>{formatPercent(holding.profit_loss_pct)}</span>
                        </td>
                        <td className="text-right p-4">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-red-400" data-testid={`remove-holding-${holding.id}`}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="bg-[#0A0A0C] border-white/10">
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remove from Portfolio?</AlertDialogTitle>
                                <AlertDialogDescription>This will remove {holding.card?.name} from your portfolio.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel className="bg-white/10 hover:bg-white/20 border-0">Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleRemove(holding.id)} className="bg-red-500 hover:bg-red-600">
                                  {deleting === holding.id ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Remove'}
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

        {/* ===== WATCHLIST TAB ===== */}
        <TabsContent value="watchlist">
          {/* Triggered Alerts */}
          {watchlistAlerts.length > 0 && (
            <div className="mb-4 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
              <div className="flex items-center gap-3 mb-3">
                <BellRing className="w-5 h-5 text-amber-400 animate-pulse" />
                <span className="font-medium text-amber-400">{watchlistAlerts.length} Alert(s) Triggered!</span>
              </div>
              <div className="space-y-2">
                {watchlistAlerts.map((alert) => (
                  <Link key={alert.id} to={`/card/${alert.card_id}`} className="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                    <div>
                      <span className="text-white font-medium">{alert.card_name}</span>
                      <span className="text-sm text-zinc-400 block">{alert.message}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono text-white">{formatCurrency(alert.current_price, true)}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Add button + watchlist */}
          <div className="flex justify-end mb-4">
            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-[#007AFF] hover:bg-[#005bb5]" data-testid="add-watchlist-btn">
                  <Plus className="w-4 h-4 mr-2" />Add to Watchlist
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-[#0A0A0C] border-white/10 max-w-md">
                <DialogHeader><DialogTitle>Add to Watchlist</DialogTitle></DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Select Card</Label>
                    <Select value={selectedCardId} onValueChange={setSelectedCardId}>
                      <SelectTrigger className="bg-white/5 border-white/10"><SelectValue placeholder="Choose a card..." /></SelectTrigger>
                      <SelectContent className="bg-[#0A0A0C] border-white/10 max-h-60">
                        {availableCards.map((card) => (
                          <SelectItem key={card.id} value={card.id}>{card.player_name} - {formatCurrency(card.current_price, true)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2"><TrendingUp className="w-3 h-3 text-emerald-400" />Alert Above</Label>
                      <Input type="number" placeholder="Target high" value={targetHigh} onChange={(e) => setTargetHigh(e.target.value)} className="bg-white/5 border-white/10" />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2"><TrendingDown className="w-3 h-3 text-red-400" />Alert Below</Label>
                      <Input type="number" placeholder="Target low" value={targetLow} onChange={(e) => setTargetLow(e.target.value)} className="bg-white/5 border-white/10" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Notes (optional)</Label>
                    <Input placeholder="Why are you watching this card?" value={notes} onChange={(e) => setNotes(e.target.value)} className="bg-white/5 border-white/10" />
                  </div>
                  <Button onClick={handleAddToWatchlist} disabled={adding || !selectedCardId} className="w-full bg-white text-black hover:bg-gray-200">
                    {adding ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}Add to Watchlist
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {watchlist.length === 0 ? (
            <EmptyState icon={<Eye className="w-12 h-12 text-zinc-600" />} title="Watchlist is empty" desc="Track cards you're interested in" actionLabel="Add a Card" onClick={() => setAddDialogOpen(true)} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {watchlist.map((item) => (
                <WatchlistCard key={item.id} item={item} onRemove={handleRemoveFromWatchlist} onUpdateAlerts={handleUpdateWatchlistAlerts} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* ===== TRANSACTIONS TAB ===== */}
        <TabsContent value="history">
          {transactions.length === 0 ? (
            <EmptyState icon={<History className="w-12 h-12 text-zinc-600" />} title="No transactions yet" desc="Your transaction history will appear here" />
          ) : (
            <div className="bg-[#0A0A0C] border border-white/10 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      {['Date', 'Card', 'Type', 'Qty', 'Price', 'Total'].map(h => (
                        <th key={h} className={`${h === 'Date' || h === 'Card' ? 'text-left' : h === 'Type' ? 'text-center' : 'text-right'} text-xs font-medium text-zinc-500 uppercase tracking-wider p-4`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((tx) => (
                      <tr key={tx.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                        <td className="p-4 text-zinc-400 text-sm">{new Date(tx.timestamp).toLocaleDateString()}</td>
                        <td className="p-4 text-white">{tx.card_name}</td>
                        <td className="p-4 text-center">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${tx.transaction_type === 'buy' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                            {tx.transaction_type.toUpperCase()}
                          </span>
                        </td>
                        <td className="text-right p-4 font-mono text-white">{tx.quantity}</td>
                        <td className="text-right p-4 font-mono text-zinc-400">{formatCurrency(tx.price_per_card)}</td>
                        <td className="text-right p-4 font-mono text-white">{formatCurrency(tx.total_amount)}</td>
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

// ===== HELPER COMPONENTS =====

function StatCard({ icon, label, value, valueClass, sub, subClass }) {
  return (
    <div className="bg-[#0A0A0C] border border-white/10 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <span className="text-xs uppercase tracking-wider text-zinc-500">{label}</span>
      </div>
      <span className={`font-heading font-bold text-2xl block ${valueClass || 'text-white'}`}>{value}</span>
      {sub && <span className={`text-sm ${subClass || 'text-zinc-500'}`}>{sub}</span>}
    </div>
  );
}

function EmptyState({ icon, title, desc, actionLabel, actionTo, onClick }) {
  return (
    <div className="text-center py-16 bg-[#0A0A0C] border border-white/10 rounded-xl">
      <div className="mx-auto mb-4">{icon}</div>
      <h3 className="text-lg font-medium text-white mb-2">{title}</h3>
      <p className="text-zinc-400 mb-6">{desc}</p>
      {actionLabel && actionTo && (
        <Link to={actionTo}><Button className="bg-[#007AFF] hover:bg-[#005bb5]">{actionLabel}</Button></Link>
      )}
      {actionLabel && onClick && (
        <Button onClick={onClick} className="bg-[#007AFF] hover:bg-[#005bb5]"><Plus className="w-4 h-4 mr-2" />{actionLabel}</Button>
      )}
    </div>
  );
}

function WatchlistCard({ item, onRemove, onUpdateAlerts }) {
  const [editOpen, setEditOpen] = useState(false);
  const [tHigh, setTHigh] = useState(item.target_price_high || '');
  const [tLow, setTLow] = useState(item.target_price_low || '');
  const [alertOn, setAlertOn] = useState(item.alert_enabled);

  const handleSave = () => {
    onUpdateAlerts(item.id, {
      target_price_high: tHigh ? parseFloat(tHigh) : null,
      target_price_low: tLow ? parseFloat(tLow) : null,
      alert_enabled: alertOn
    });
    setEditOpen(false);
  };

  const card = item.card;
  const isPositive = item.price_change_since_add >= 0;

  return (
    <div className={`bg-[#0A0A0C] border rounded-xl overflow-hidden ${item.alert_triggered ? 'border-amber-500/50' : 'border-white/10'}`} data-testid={`watchlist-card-${item.id}`}>
      {item.alert_triggered && (
        <div className="px-4 py-2 bg-amber-500/20 border-b border-amber-500/30 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          <span className="text-sm text-amber-400">{item.alert_triggered === 'high' ? 'Price above target!' : 'Price below target!'}</span>
        </div>
      )}
      <div className="p-4">
        <Link to={`/card/${card.id}`} className="flex items-start gap-3 mb-4 group">
          <img src={card.image_url} alt={card.name} className="w-16 h-20 object-cover rounded-lg" />
          <div className="flex-1 min-w-0">
            <span className="text-white font-medium group-hover:text-[#007AFF] transition-colors line-clamp-2">{card.name}</span>
            <span className="text-sm text-zinc-500 block">{card.player_name}</span>
            <div className="flex items-center gap-2 mt-1">
              <span className="font-mono text-lg text-white">{formatCurrency(card.current_price, true)}</span>
              <span className={`text-sm font-mono ${getPriceChangeColor(card.price_change_pct)}`}>{formatPercent(card.price_change_pct)}</span>
            </div>
          </div>
        </Link>

        <div className="p-3 bg-white/5 rounded-lg mb-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-500">Since Added</span>
            <span className={`font-mono text-sm ${getPriceChangeColor(item.price_change_since_add)}`}>{isPositive ? '+' : ''}{item.price_change_since_add}%</span>
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-xs text-zinc-500">Added at</span>
            <span className="font-mono text-sm text-zinc-400">{formatCurrency(item.price_at_add, true)}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className={`p-2 rounded-lg ${item.target_price_high ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-white/5'}`}>
            <span className="text-xs text-zinc-500 block">Alert Above</span>
            <span className="font-mono text-sm text-white">{item.target_price_high ? formatCurrency(item.target_price_high, true) : '\u2014'}</span>
          </div>
          <div className={`p-2 rounded-lg ${item.target_price_low ? 'bg-red-500/10 border border-red-500/20' : 'bg-white/5'}`}>
            <span className="text-xs text-zinc-500 block">Alert Below</span>
            <span className="font-mono text-sm text-white">{item.target_price_low ? formatCurrency(item.target_price_low, true) : '\u2014'}</span>
          </div>
        </div>

        {item.notes && <p className="text-xs text-zinc-400 mb-4 italic">"{item.notes}"</p>}

        <div className="flex items-center gap-2">
          <Dialog open={editOpen} onOpenChange={setEditOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="flex-1 hover:bg-white/10"><Settings className="w-4 h-4 mr-2" />Edit Alerts</Button>
            </DialogTrigger>
            <DialogContent className="bg-[#0A0A0C] border-white/10">
              <DialogHeader><DialogTitle>Edit Price Alerts</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="flex items-center justify-between">
                  <Label>Alerts Enabled</Label>
                  <Switch checked={alertOn} onCheckedChange={setAlertOn} />
                </div>
                <div className="space-y-2">
                  <Label>Alert when price goes above</Label>
                  <Input type="number" value={tHigh} onChange={(e) => setTHigh(e.target.value)} className="bg-white/5 border-white/10" placeholder="Enter target price" />
                </div>
                <div className="space-y-2">
                  <Label>Alert when price drops below</Label>
                  <Input type="number" value={tLow} onChange={(e) => setTLow(e.target.value)} className="bg-white/5 border-white/10" placeholder="Enter target price" />
                </div>
                <Button onClick={handleSave} className="w-full bg-white text-black hover:bg-gray-200">Save Changes</Button>
              </div>
            </DialogContent>
          </Dialog>
          <Button variant="ghost" size="sm" onClick={() => onRemove(item.id)} className="text-zinc-400 hover:text-red-400 hover:bg-red-500/10" data-testid={`remove-watchlist-${item.id}`}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
