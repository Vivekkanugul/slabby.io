import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSearchParams } from 'react-router-dom';
import { getWallet, withdrawFromWallet, getWalletTransactions } from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Wallet as WalletIcon, ArrowDownLeft, ArrowUpRight, Clock, DollarSign, Lock, TrendingUp, CreditCard, CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import api from '../lib/api';

export default function Wallet() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDeposit, setShowDeposit] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [amount, setAmount] = useState('');
  const [processing, setProcessing] = useState(false);
  const [packages, setPackages] = useState([]);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [checkingPayment, setCheckingPayment] = useState(false);

  const fetchWalletData = useCallback(async () => {
    try {
      const [walletRes, txRes] = await Promise.all([
        getWallet(),
        getWalletTransactions(50)
      ]);
      setWallet(walletRes.data);
      setTransactions(txRes.data);
    } catch (error) {
      console.error('Failed to fetch wallet:', error);
      toast.error('Failed to load wallet');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPackages = async () => {
    try {
      const response = await api.get('/payments/packages');
      setPackages(response.data.packages);
    } catch (error) {
      console.error('Failed to fetch packages:', error);
    }
  };

  useEffect(() => { 
    fetchWalletData();
    fetchPackages();
  }, [fetchWalletData]);

  // Check for payment return
  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    const status = searchParams.get('status');
    
    if (sessionId && status === 'success') {
      setCheckingPayment(true);
      pollPaymentStatus(sessionId);
    } else if (status === 'cancelled') {
      toast.error('Payment cancelled');
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  const pollPaymentStatus = async (sessionId, attempts = 0) => {
    const maxAttempts = 5;
    
    if (attempts >= maxAttempts) {
      setCheckingPayment(false);
      toast.error('Payment status check timed out. Please check your email for confirmation.');
      setSearchParams({});
      return;
    }

    try {
      const response = await api.get(`/payments/deposit/status/${sessionId}`);
      
      if (response.data.payment_status === 'paid') {
        toast.success(`$${response.data.amount} deposited successfully!`);
        setCheckingPayment(false);
        setSearchParams({});
        fetchWalletData();
        return;
      }

      // Continue polling
      setTimeout(() => pollPaymentStatus(sessionId, attempts + 1), 2000);
    } catch (error) {
      console.error('Error checking payment:', error);
      setCheckingPayment(false);
      setSearchParams({});
    }
  };

  const handleStripeDeposit = async () => {
    if (!selectedPackage) {
      toast.error('Please select an amount');
      return;
    }

    setProcessing(true);
    try {
      const response = await api.post('/payments/deposit/checkout', {
        package_id: selectedPackage,
        origin_url: window.location.origin
      });

      // Redirect to Stripe
      window.location.href = response.data.checkout_url;
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create checkout');
      setProcessing(false);
    }
  };

  const handleWithdraw = async () => {
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      toast.error('Enter a valid amount');
      return;
    }

    setProcessing(true);
    try {
      await withdrawFromWallet(numAmount);
      toast.success(`$${numAmount} withdrawn successfully!`);
      setShowWithdraw(false);
      setAmount('');
      fetchWalletData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Withdrawal failed');
    } finally {
      setProcessing(false);
    }
  };

  const getTxIcon = (type) => {
    if (type.includes('deposit')) return <ArrowDownLeft className="w-4 h-4 text-green-500" />;
    if (type.includes('withdrawal')) return <ArrowUpRight className="w-4 h-4 text-red-500" />;
    if (type.includes('escrow')) return <Lock className="w-4 h-4 text-purple-500" />;
    return <DollarSign className="w-4 h-4 text-zinc-500" />;
  };

  const getTxColor = (type, txAmount) => {
    if (txAmount > 0) return 'text-green-500';
    if (txAmount < 0) return 'text-red-500';
    return 'text-zinc-400';
  };

  if (loading || checkingPayment) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#05050A]">
        <div className="w-8 h-8 border-2 border-[#FF6B00] border-t-transparent rounded-full animate-spin mb-4" />
        {checkingPayment && (
          <p className="text-zinc-400">Verifying payment...</p>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050508] py-8" data-testid="wallet-page">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-heading text-2xl font-medium text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#BCFF00]/10 flex items-center justify-center">
              <WalletIcon className="w-5 h-5 text-[#BCFF00]" />
            </div>
            My Wallet
          </h1>
          <p className="text-zinc-400 mt-1">Manage your funds</p>
        </div>

        {/* Balance Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-gradient-to-br from-[#BCFF00] to-[#9FD900] rounded-xl p-6" data-testid="available-balance">
            <div className="flex items-center justify-between mb-4">
              <span className="text-black/80 text-sm">Available Balance</span>
              <DollarSign className="w-5 h-5 text-black/60" />
            </div>
            <p className="text-3xl font-bold text-black">${wallet?.available_balance?.toFixed(2) || '0.00'}</p>
          </div>
          
          <div className="bg-[#0A0A0C] border border-white/10 rounded-xl p-6" data-testid="escrow-balance">
            <div className="flex items-center justify-between mb-4">
              <span className="text-zinc-400 text-sm">In Escrow</span>
              <Lock className="w-5 h-5 text-zinc-600" />
            </div>
            <p className="text-3xl font-bold text-white">${wallet?.escrow_balance?.toFixed(2) || '0.00'}</p>
          </div>
          
          <div className="bg-[#0A0A0C] border border-white/10 rounded-xl p-6" data-testid="pending-balance">
            <div className="flex items-center justify-between mb-4">
              <span className="text-zinc-400 text-sm">Pending</span>
              <Clock className="w-5 h-5 text-zinc-600" />
            </div>
            <p className="text-3xl font-bold text-white">${wallet?.pending_balance?.toFixed(2) || '0.00'}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 mb-8">
          <Button
            className="flex-1 bg-green-600 hover:bg-green-700 h-12"
            onClick={() => setShowDeposit(true)}
            data-testid="deposit-btn"
          >
            <ArrowDownLeft className="w-5 h-5 mr-2" />
            Deposit
          </Button>
          <Button
            className="flex-1 h-12"
            variant="outline"
            onClick={() => setShowWithdraw(true)}
            disabled={!wallet?.available_balance}
            data-testid="withdraw-btn"
          >
            <ArrowUpRight className="w-5 h-5 mr-2" />
            Withdraw
          </Button>
        </div>

        {/* Transaction History */}
        <div className="bg-[#0A0A0C] border border-white/10 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-white/10">
            <h2 className="text-lg font-medium text-white">Transaction History</h2>
          </div>
          
          {transactions.length === 0 ? (
            <div className="p-12 text-center">
              <TrendingUp className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
              <p className="text-zinc-400">No transactions yet</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {transactions.map((tx) => (
                <div key={tx.id} className="px-6 py-4 flex items-center justify-between" data-testid={`tx-${tx.id}`}>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-[#121214] flex items-center justify-center">
                      {getTxIcon(tx.type)}
                    </div>
                    <div>
                      <p className="text-sm text-white capitalize">
                        {tx.type.replace(/_/g, ' ')}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {new Date(tx.created_at).toLocaleDateString()} at{' '}
                        {new Date(tx.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className={`text-sm font-medium ${getTxColor(tx.type, tx.amount)}`}>
                      {tx.amount > 0 ? '+' : ''}${Math.abs(tx.amount).toFixed(2)}
                    </p>
                    <p className="text-xs text-zinc-500">
                      Balance: ${tx.balance_after.toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Deposit Modal with Stripe */}
        {showDeposit && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-[#0A0A0C] border border-white/10 rounded-2xl w-full max-w-md p-6">
              <h2 className="text-xl font-bold text-white mb-2">Deposit Funds</h2>
              <p className="text-sm text-zinc-400 mb-6">Select an amount to add to your wallet</p>
              
              {/* Package Selection */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                {packages.map((pkg) => (
                  <button
                    key={pkg.id}
                    onClick={() => setSelectedPackage(pkg.id)}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      selectedPackage === pkg.id
                        ? 'border-[#FF6B00] bg-[#FF6B00]/10'
                        : 'border-white/10 hover:border-white/20'
                    }`}
                  >
                    <p className="text-xl font-bold text-white">{pkg.label}</p>
                  </button>
                ))}
              </div>
              
              {/* Stripe Info */}
              <div className="bg-[#121214] rounded-lg p-4 mb-6 flex items-center gap-3">
                <CreditCard className="w-5 h-5 text-zinc-400" />
                <div>
                  <p className="text-sm text-white">Secure Payment via Stripe</p>
                  <p className="text-xs text-zinc-500">Credit/Debit cards accepted</p>
                </div>
              </div>
              
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => { setShowDeposit(false); setSelectedPackage(null); }}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  onClick={handleStripeDeposit}
                  disabled={processing || !selectedPackage}
                  data-testid="confirm-deposit-btn"
                >
                  {processing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Continue to Payment
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Withdraw Modal */}
        {showWithdraw && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-[#0A0A0C] border border-white/10 rounded-2xl w-full max-w-md p-6">
              <h2 className="text-xl font-bold text-white mb-4">Withdraw Funds</h2>
              
              <div className="bg-[#121214] rounded-lg p-4 mb-6">
                <p className="text-sm text-zinc-400">Available to withdraw</p>
                <p className="text-2xl font-bold text-white">${wallet?.available_balance?.toFixed(2)}</p>
              </div>
              
              <div className="mb-6">
                <label className="block text-sm text-zinc-400 mb-2">Amount (USD)</label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  max={wallet?.available_balance}
                  className="bg-[#121214] border-white/10 h-12 text-lg"
                  data-testid="withdraw-amount-input"
                />
              </div>
              
              <Button
                variant="outline"
                size="sm"
                className="mb-6 w-full border-white/10"
                onClick={() => setAmount(wallet?.available_balance?.toString() || '0')}
              >
                Withdraw All
              </Button>
              
              <p className="text-xs text-zinc-500 mb-6">
                Minimum withdrawal: $10.00. Funds will be sent to your connected bank account.
              </p>
              
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => { setShowWithdraw(false); setAmount(''); }}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-[#BCFF00] text-black hover:bg-[#D4FF4D]"
                  onClick={handleWithdraw}
                  disabled={processing || !amount || parseFloat(amount) > wallet?.available_balance}
                  data-testid="confirm-withdraw-btn"
                >
                  {processing ? 'Processing...' : 'Withdraw'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
