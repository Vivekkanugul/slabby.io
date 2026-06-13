import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getMyTrades, acceptTrade, rejectTrade, cancelTrade } from '../lib/api';
import { Button } from '../components/ui/button';
import { Shuffle, Clock, CheckCircle2, XCircle, AlertTriangle, ArrowRight, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

export default function Trades() {
  const { user } = useAuth();
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, sent, received

  useEffect(() => {
    fetchTrades();
  }, []);

  const fetchTrades = async () => {
    try {
      const response = await getMyTrades();
      setTrades(response.data);
    } catch (error) {
      console.error('Failed to fetch trades:', error);
      toast.error('Failed to load trades');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (tradeId) => {
    try {
      await acceptTrade(tradeId);
      toast.success('Trade accepted!');
      fetchTrades();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to accept trade');
    }
  };

  const handleReject = async (tradeId) => {
    try {
      await rejectTrade(tradeId);
      toast.success('Trade rejected');
      fetchTrades();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to reject trade');
    }
  };

  const handleCancel = async (tradeId) => {
    try {
      await cancelTrade(tradeId);
      toast.success('Trade cancelled');
      fetchTrades();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to cancel trade');
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
      countered: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      accepted: 'bg-green-500/10 text-green-500 border-green-500/20',
      rejected: 'bg-red-500/10 text-red-500 border-red-500/20',
      cancelled: 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20',
      completed: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
      in_escrow: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
    };
    return styles[status] || styles.pending;
  };

  const filteredTrades = trades.filter(trade => {
    if (filter === 'sent') return trade.initiator_id === user?.id;
    if (filter === 'received') return trade.receiver_id === user?.id;
    return true;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#05050A]">
        <div className="w-8 h-8 border-2 border-[#FF6B00] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050508] py-8" data-testid="trades-page">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="font-heading text-2xl font-medium text-white flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#BCFF00]/10 flex items-center justify-center">
                <Shuffle className="w-5 h-5 text-[#BCFF00]" />
              </div>
              My Trades
            </h1>
            <p className="text-zinc-400 mt-1">Manage your P2P card trades</p>
          </div>
          
          <div className="flex gap-2">
            {['all', 'sent', 'received'].map((f) => (
              <Button
                key={f}
                variant={filter === f ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter(f)}
                className={filter === f ? 'bg-[#BCFF00] text-black hover:bg-[#D4FF4D]' : 'border-white/10'}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </Button>
            ))}
          </div>
        </div>

        {/* Trades List */}
        {filteredTrades.length === 0 ? (
          <div className="bg-[#0A0A0C] border border-white/10 rounded-xl p-12 text-center">
            <Shuffle className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No trades yet</h3>
            <p className="text-zinc-400 text-sm">
              When you initiate or receive trade offers, they'll appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTrades.map((trade) => {
              const isSent = trade.initiator_id === user?.id;
              const canRespond = !isSent && ['pending', 'countered'].includes(trade.status);
              const canCancel = ['pending', 'countered', 'accepted'].includes(trade.status);
              
              return (
                <div
                  key={trade.id}
                  className="bg-[#0A0A0C] border border-white/10 rounded-xl p-6 hover:border-white/20 transition-all"
                  data-testid={`trade-${trade.id}`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                    {/* Trade Direction */}
                    <div className="flex items-center gap-4 flex-1">
                      <div className={`p-2 rounded-lg ${isSent ? 'bg-blue-500/10' : 'bg-green-500/10'}`}>
                        {isSent ? (
                          <ArrowRight className="w-5 h-5 text-blue-500" />
                        ) : (
                          <ArrowLeft className="w-5 h-5 text-green-500" />
                        )}
                      </div>
                      
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 text-xs rounded-full border ${getStatusBadge(trade.status)}`}>
                            {trade.status.replace('_', ' ').toUpperCase()}
                          </span>
                          <span className="text-xs text-zinc-500">
                            {trade.trade_type.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <p className="text-sm text-zinc-400">
                          {isSent ? 'Sent to' : 'Received from'}{' '}
                          <span className="text-white">{isSent ? trade.receiver_id.slice(0, 8) : trade.initiator_id.slice(0, 8)}...</span>
                        </p>
                      </div>
                    </div>

                    {/* Trade Summary */}
                    <div className="flex-1 grid grid-cols-2 gap-4">
                      <div className="bg-[#121214] rounded-lg p-3">
                        <p className="text-xs text-zinc-500 mb-1">Your Side</p>
                        <p className="text-sm text-white">
                          {isSent ? trade.initiator_side.card_ids.length : trade.receiver_side.card_ids.length} cards
                          {(isSent ? trade.initiator_side.cash_amount : trade.receiver_side.cash_amount) > 0 && (
                            <span className="text-[#BCFF00]">
                              {' '}+ ${isSent ? trade.initiator_side.cash_amount : trade.receiver_side.cash_amount}
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="bg-[#121214] rounded-lg p-3">
                        <p className="text-xs text-zinc-500 mb-1">Their Side</p>
                        <p className="text-sm text-white">
                          {isSent ? trade.receiver_side.card_ids.length : trade.initiator_side.card_ids.length} cards
                          {(isSent ? trade.receiver_side.cash_amount : trade.initiator_side.cash_amount) > 0 && (
                            <span className="text-[#BCFF00]">
                              {' '}+ ${isSent ? trade.receiver_side.cash_amount : trade.initiator_side.cash_amount}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      {canRespond && (
                        <>
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => handleAccept(trade.id)}
                            data-testid={`accept-trade-${trade.id}`}
                          >
                            <CheckCircle2 className="w-4 h-4 mr-1" />
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-red-500/50 text-red-500 hover:bg-red-500/10"
                            onClick={() => handleReject(trade.id)}
                            data-testid={`reject-trade-${trade.id}`}
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Reject
                          </Button>
                        </>
                      )}
                      {canCancel && isSent && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-white/10"
                          onClick={() => handleCancel(trade.id)}
                          data-testid={`cancel-trade-${trade.id}`}
                        >
                          Cancel
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Timestamp */}
                  <div className="mt-4 pt-4 border-t border-white/5 flex items-center gap-2 text-xs text-zinc-500">
                    <Clock className="w-3 h-3" />
                    Created {new Date(trade.created_at).toLocaleDateString()}
                    {trade.expires_at && (
                      <span className="ml-4">
                        <AlertTriangle className="w-3 h-3 inline mr-1 text-yellow-500" />
                        Expires {new Date(trade.expires_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
