import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getWatchlist, removeFromWatchlist, updateWatchlistItem, getWatchlistAlerts, getCards } from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { toast } from 'sonner';
import { 
  Eye, Bell, Trash2, Plus, Loader2, TrendingUp, TrendingDown, 
  AlertTriangle, Settings, ArrowRight, Target, BellRing
} from 'lucide-react';
import { formatCurrency, formatPercent, getPriceChangeColor } from '../lib/utils';
import { addToWatchlist } from '../lib/api';

export default function Watchlist() {
  const [watchlist, setWatchlist] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [allCards, setAllCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  
  // Add form state
  const [selectedCardId, setSelectedCardId] = useState('');
  const [targetHigh, setTargetHigh] = useState('');
  const [targetLow, setTargetLow] = useState('');
  const [notes, setNotes] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [watchlistRes, alertsRes, cardsRes] = await Promise.all([
        getWatchlist(),
        getWatchlistAlerts(),
        getCards({})
      ]);
      setWatchlist(watchlistRes.data);
      setAlerts(alertsRes.data.alerts || []);
      setAllCards(cardsRes.data);
    } catch (error) {
      console.error('Error fetching watchlist:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToWatchlist = async () => {
    if (!selectedCardId) {
      toast.error('Please select a card');
      return;
    }
    
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
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add');
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (itemId) => {
    try {
      await removeFromWatchlist(itemId);
      toast.success('Removed from watchlist');
      fetchData();
    } catch (error) {
      toast.error('Failed to remove');
    }
  };

  const handleUpdateAlerts = async (itemId, updates) => {
    try {
      await updateWatchlistItem(itemId, updates);
      toast.success('Alerts updated');
      fetchData();
    } catch (error) {
      toast.error('Failed to update');
    }
  };

  const resetForm = () => {
    setSelectedCardId('');
    setTargetHigh('');
    setTargetLow('');
    setNotes('');
  };

  // Get cards not already in watchlist
  const availableCards = allCards.filter(
    card => !watchlist.find(w => w.card_id === card.id)
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#007AFF]" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" data-testid="watchlist-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500">
            <Eye className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-heading font-bold text-2xl sm:text-3xl text-white">Watchlist</h1>
            <p className="text-zinc-400">Track cards and set price alerts</p>
          </div>
        </div>
        
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#007AFF] hover:bg-[#005bb5]" data-testid="add-watchlist-btn">
              <Plus className="w-4 h-4 mr-2" />
              Add to Watchlist
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#0A0A0C] border-white/10 max-w-md">
            <DialogHeader>
              <DialogTitle>Add to Watchlist</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Select Card</Label>
                <Select value={selectedCardId} onValueChange={setSelectedCardId}>
                  <SelectTrigger className="bg-white/5 border-white/10">
                    <SelectValue placeholder="Choose a card..." />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0A0A0C] border-white/10 max-h-60">
                    {availableCards.map((card) => (
                      <SelectItem key={card.id} value={card.id}>
                        {card.player_name} - {formatCurrency(card.current_price, true)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <TrendingUp className="w-3 h-3 text-emerald-400" />
                    Alert Above
                  </Label>
                  <Input
                    type="number"
                    placeholder="Target high"
                    value={targetHigh}
                    onChange={(e) => setTargetHigh(e.target.value)}
                    className="bg-white/5 border-white/10"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <TrendingDown className="w-3 h-3 text-red-400" />
                    Alert Below
                  </Label>
                  <Input
                    type="number"
                    placeholder="Target low"
                    value={targetLow}
                    onChange={(e) => setTargetLow(e.target.value)}
                    className="bg-white/5 border-white/10"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Notes (optional)</Label>
                <Input
                  placeholder="Why are you watching this card?"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="bg-white/5 border-white/10"
                />
              </div>
              
              <Button
                onClick={handleAddToWatchlist}
                disabled={adding || !selectedCardId}
                className="w-full bg-white text-black hover:bg-gray-200"
              >
                {adding ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Add to Watchlist
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Triggered Alerts Banner */}
      {alerts.length > 0 && (
        <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
          <div className="flex items-center gap-3 mb-3">
            <BellRing className="w-5 h-5 text-amber-400 animate-pulse" />
            <span className="font-medium text-amber-400">{alerts.length} Alert(s) Triggered!</span>
          </div>
          <div className="space-y-2">
            {alerts.map((alert) => (
              <Link
                key={alert.id}
                to={`/card/${alert.card_id}`}
                className="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
              >
                <div>
                  <span className="text-white font-medium">{alert.card_name}</span>
                  <span className="text-sm text-zinc-400 block">{alert.message}</span>
                </div>
                <div className="text-right">
                  <span className="font-mono text-white">{formatCurrency(alert.current_price, true)}</span>
                  <span className="text-xs text-zinc-500 block">Target: {formatCurrency(alert.target_price, true)}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Watchlist Grid */}
      {watchlist.length === 0 ? (
        <div className="text-center py-16 bg-[#0A0A0C] border border-white/10 rounded-xl">
          <Eye className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">Your watchlist is empty</h3>
          <p className="text-zinc-400 mb-6">Start tracking cards you're interested in</p>
          <Button onClick={() => setAddDialogOpen(true)} className="bg-[#007AFF] hover:bg-[#005bb5]">
            <Plus className="w-4 h-4 mr-2" />
            Add Your First Card
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {watchlist.map((item) => (
            <WatchlistCard
              key={item.id}
              item={item}
              onRemove={handleRemove}
              onUpdateAlerts={handleUpdateAlerts}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Watchlist Card Component
const WatchlistCard = ({ item, onRemove, onUpdateAlerts }) => {
  const [editOpen, setEditOpen] = useState(false);
  const [targetHigh, setTargetHigh] = useState(item.target_price_high || '');
  const [targetLow, setTargetLow] = useState(item.target_price_low || '');
  const [alertEnabled, setAlertEnabled] = useState(item.alert_enabled);

  const handleSave = () => {
    onUpdateAlerts(item.id, {
      target_price_high: targetHigh ? parseFloat(targetHigh) : null,
      target_price_low: targetLow ? parseFloat(targetLow) : null,
      alert_enabled: alertEnabled
    });
    setEditOpen(false);
  };

  const card = item.card;
  const isPositive = item.price_change_since_add >= 0;

  return (
    <div className={`bg-[#0A0A0C] border rounded-xl overflow-hidden ${
      item.alert_triggered ? 'border-amber-500/50' : 'border-white/10'
    }`}>
      {/* Alert Banner */}
      {item.alert_triggered && (
        <div className="px-4 py-2 bg-amber-500/20 border-b border-amber-500/30 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          <span className="text-sm text-amber-400">
            {item.alert_triggered === 'high' ? 'Price above target!' : 'Price below target!'}
          </span>
        </div>
      )}

      <div className="p-4">
        {/* Card Info */}
        <Link to={`/card/${card.id}`} className="flex items-start gap-3 mb-4 group">
          <img
            src={card.image_url}
            alt={card.name}
            className="w-16 h-20 object-cover rounded-lg"
          />
          <div className="flex-1 min-w-0">
            <span className="text-white font-medium group-hover:text-[#007AFF] transition-colors line-clamp-2">
              {card.name}
            </span>
            <span className="text-sm text-zinc-500 block">{card.player_name}</span>
            <div className="flex items-center gap-2 mt-1">
              <span className="font-mono text-lg text-white">{formatCurrency(card.current_price, true)}</span>
              <span className={`text-sm font-mono ${getPriceChangeColor(card.price_change_pct)}`}>
                {formatPercent(card.price_change_pct)}
              </span>
            </div>
          </div>
        </Link>

        {/* Since Added */}
        <div className="p-3 bg-white/5 rounded-lg mb-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-500">Since Added</span>
            <span className={`font-mono text-sm ${getPriceChangeColor(item.price_change_since_add)}`}>
              {isPositive ? '+' : ''}{item.price_change_since_add}%
            </span>
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-xs text-zinc-500">Added at</span>
            <span className="font-mono text-sm text-zinc-400">{formatCurrency(item.price_at_add, true)}</span>
          </div>
        </div>

        {/* Price Targets */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className={`p-2 rounded-lg ${item.target_price_high ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-white/5'}`}>
            <span className="text-xs text-zinc-500 block">Alert Above</span>
            <span className="font-mono text-sm text-white">
              {item.target_price_high ? formatCurrency(item.target_price_high, true) : '—'}
            </span>
          </div>
          <div className={`p-2 rounded-lg ${item.target_price_low ? 'bg-red-500/10 border border-red-500/20' : 'bg-white/5'}`}>
            <span className="text-xs text-zinc-500 block">Alert Below</span>
            <span className="font-mono text-sm text-white">
              {item.target_price_low ? formatCurrency(item.target_price_low, true) : '—'}
            </span>
          </div>
        </div>

        {/* Notes */}
        {item.notes && (
          <p className="text-xs text-zinc-400 mb-4 italic">"{item.notes}"</p>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Dialog open={editOpen} onOpenChange={setEditOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="flex-1 hover:bg-white/10">
                <Settings className="w-4 h-4 mr-2" />
                Edit Alerts
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#0A0A0C] border-white/10">
              <DialogHeader>
                <DialogTitle>Edit Price Alerts</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="flex items-center justify-between">
                  <Label>Alerts Enabled</Label>
                  <Switch checked={alertEnabled} onCheckedChange={setAlertEnabled} />
                </div>
                <div className="space-y-2">
                  <Label>Alert when price goes above</Label>
                  <Input
                    type="number"
                    value={targetHigh}
                    onChange={(e) => setTargetHigh(e.target.value)}
                    className="bg-white/5 border-white/10"
                    placeholder="Enter target price"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Alert when price drops below</Label>
                  <Input
                    type="number"
                    value={targetLow}
                    onChange={(e) => setTargetLow(e.target.value)}
                    className="bg-white/5 border-white/10"
                    placeholder="Enter target price"
                  />
                </div>
                <Button onClick={handleSave} className="w-full bg-white text-black hover:bg-gray-200">
                  Save Changes
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onRemove(item.id)}
            className="text-zinc-400 hover:text-red-400 hover:bg-red-500/10"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
