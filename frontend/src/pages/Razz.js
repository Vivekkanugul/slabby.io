import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getActiveRazzes, getMyRazzes, getRazz, purchaseRazzSpots, verifyRazzFairness } from '../lib/api';
import { Button } from '../components/ui/button';
import { Dice6, Users, Clock, Trophy, Shield, CheckCircle2, Hash } from 'lucide-react';
import { toast } from 'sonner';

export default function Razz() {
  const { user, isAuthenticated } = useAuth();
  const [razzes, setRazzes] = useState([]);
  const [myRazzes, setMyRazzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('browse'); // browse, my-razzes
  const [selectedRazz, setSelectedRazz] = useState(null);
  const [selectedSpots, setSelectedSpots] = useState([]);
  const [verificationResult, setVerificationResult] = useState(null);

  useEffect(() => {
    fetchRazzes();
  }, []);

  const fetchRazzes = async () => {
    try {
      const [activeRes, myRes] = await Promise.all([
        getActiveRazzes(),
        isAuthenticated ? getMyRazzes(false) : Promise.resolve({ data: [] })
      ]);
      setRazzes(activeRes.data);
      setMyRazzes(myRes.data);
    } catch (error) {
      console.error('Failed to fetch razzes:', error);
      toast.error('Failed to load razzes');
    } finally {
      setLoading(false);
    }
  };

  const handleSpotSelect = (spotNumber) => {
    if (selectedSpots.includes(spotNumber)) {
      setSelectedSpots(selectedSpots.filter(s => s !== spotNumber));
    } else {
      setSelectedSpots([...selectedSpots, spotNumber]);
    }
  };

  const handlePurchase = async () => {
    if (!selectedRazz || selectedSpots.length === 0) return;
    
    try {
      await purchaseRazzSpots(selectedRazz.id, selectedSpots);
      toast.success(`Purchased ${selectedSpots.length} spot(s)!`);
      setSelectedSpots([]);
      setSelectedRazz(null);
      fetchRazzes();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to purchase spots');
    }
  };

  const handleVerify = async (razzId) => {
    try {
      const response = await verifyRazzFairness(razzId);
      setVerificationResult(response.data);
      toast.success(response.data.is_valid ? 'Verification passed!' : 'Verification failed!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to verify');
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      draft: 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20',
      active: 'bg-green-500/10 text-green-500 border-green-500/20',
      filled: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
      drawing: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
      completed: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      cancelled: 'bg-red-500/10 text-red-500 border-red-500/20',
    };
    return styles[status] || styles.draft;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#05050A]">
        <div className="w-8 h-8 border-2 border-[#FF6B00] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050508] py-8" data-testid="razz-page">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="font-heading text-2xl font-medium text-white flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#00E5FF]/10 flex items-center justify-center">
                <Dice6 className="w-5 h-5 text-[#00E5FF]" />
              </div>
              Razz
            </h1>
            <p className="text-zinc-400 mt-1">Provably fair card raffles</p>
          </div>
          
          {isAuthenticated && (
            <div className="flex gap-2">
              <Button
                variant={activeTab === 'browse' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveTab('browse')}
                className={activeTab === 'browse' ? 'bg-[#00E5FF] text-black hover:bg-[#80F2FF]' : 'border-white/10'}
              >
                Browse
              </Button>
              <Button
                variant={activeTab === 'my-razzes' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveTab('my-razzes')}
                className={activeTab === 'my-razzes' ? 'bg-[#00E5FF] text-black hover:bg-[#80F2FF]' : 'border-white/10'}
              >
                My Entries
              </Button>
            </div>
          )}
        </div>

        {/* Provably Fair Info */}
        <div className="bg-[#0A0A0E] border border-[#00E5FF]/20 rounded-xl p-4 mb-8 flex items-start gap-3">
          <Shield className="w-5 h-5 text-[#00E5FF] mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-white mb-1">Provably Fair</h3>
            <p className="text-xs text-zinc-400">
              Every razz uses cryptographic proofs. Server seed hash is published before the draw. 
              Winner = SHA256(server_seed + client_seed) mod total_spots. Verify any completed razz.
            </p>
          </div>
        </div>

        {/* Content */}
        {activeTab === 'browse' ? (
          <>
            {razzes.length === 0 ? (
              <div className="bg-[#0A0A0C] border border-white/10 rounded-xl p-12 text-center">
                <Dice6 className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">No active razzes</h3>
                <p className="text-zinc-400 text-sm">
                  Check back soon for new card raffles!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {razzes.map((razz) => (
                  <div
                    key={razz.id}
                    className="bg-[#0A0A0E] border border-white/10 rounded-xl overflow-hidden hover:border-[#00E5FF]/30 transition-all cursor-pointer"
                    onClick={() => setSelectedRazz(razz)}
                    data-testid={`razz-card-${razz.id}`}
                  >
                    {/* Card Image Placeholder */}
                    <div className="aspect-[4/3] bg-gradient-to-br from-[#121214] to-[#0A0A0C] flex items-center justify-center">
                      <Dice6 className="w-16 h-16 text-zinc-700" />
                    </div>
                    
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-white font-medium line-clamp-1">{razz.title}</h3>
                        <span className={`px-2 py-0.5 text-xs rounded-full border ${getStatusBadge(razz.status)}`}>
                          {razz.status}
                        </span>
                      </div>
                      
                      <p className="text-xs text-zinc-400 mb-4 line-clamp-2">{razz.description}</p>
                      
                      <div className="grid grid-cols-2 gap-2 mb-4">
                        <div className="bg-[#121214] rounded-lg p-2">
                          <p className="text-xs text-zinc-500">Spot Price</p>
                          <p className="text-sm text-white font-medium">${razz.spot_price}</p>
                        </div>
                        <div className="bg-[#121214] rounded-lg p-2">
                          <p className="text-xs text-zinc-500">Spots</p>
                          <p className="text-sm text-white font-medium">{razz.spots_sold}/{razz.total_spots}</p>
                        </div>
                      </div>
                      
                      {/* Progress Bar */}
                      <div className="h-2 bg-[#121216] rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-[#00E5FF] to-[#00B4D8] transition-all"
                          style={{ width: `${(razz.spots_sold / razz.total_spots) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            {myRazzes.length === 0 ? (
              <div className="bg-[#0A0A0C] border border-white/10 rounded-xl p-12 text-center">
                <Users className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">No entries yet</h3>
                <p className="text-zinc-400 text-sm">
                  Your razz entries will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {myRazzes.map((razz) => (
                  <div
                    key={razz.id}
                    className="bg-[#0A0A0C] border border-white/10 rounded-xl p-6"
                    data-testid={`my-razz-${razz.id}`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-white font-medium">{razz.title}</h3>
                        <p className="text-sm text-zinc-400">${razz.spot_price}/spot</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-0.5 text-xs rounded-full border ${getStatusBadge(razz.status)}`}>
                          {razz.status}
                        </span>
                        {razz.status === 'completed' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-white/10"
                            onClick={() => handleVerify(razz.id)}
                          >
                            <Shield className="w-4 h-4 mr-1" />
                            Verify
                          </Button>
                        )}
                      </div>
                    </div>
                    
                    {razz.winner_id === user?.id && (
                      <div className="mt-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-green-500" />
                        <span className="text-green-500 font-medium">You won!</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Razz Detail Modal */}
        {selectedRazz && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-[#0A0A0C] border border-white/10 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-white">{selectedRazz.title}</h2>
                  <button 
                    onClick={() => { setSelectedRazz(null); setSelectedSpots([]); }}
                    className="text-zinc-400 hover:text-white"
                  >
                    ✕
                  </button>
                </div>
                
                <p className="text-sm text-zinc-400 mb-6">{selectedRazz.description}</p>
                
                {/* Cryptographic Proof */}
                <div className="bg-[#121214] rounded-lg p-4 mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Hash className="w-4 h-4 text-[#FF6B00]" />
                    <span className="text-sm font-medium text-white">Server Seed Hash</span>
                  </div>
                  <code className="text-xs text-zinc-400 break-all">
                    {selectedRazz.server_seed_hash}
                  </code>
                </div>
                
                {/* Spot Selection */}
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-white mb-3">Select Spots</h3>
                  <div className="grid grid-cols-5 gap-2">
                    {Array.from({ length: selectedRazz.total_spots }, (_, i) => i + 1).map((num) => {
                      // Find if spot is taken
                      const isTaken = false; // Would check razz.spots in real implementation
                      const isSelected = selectedSpots.includes(num);
                      
                      return (
                        <button
                          key={num}
                          onClick={() => !isTaken && handleSpotSelect(num)}
                          disabled={isTaken}
                          className={`
                            aspect-square rounded-lg flex items-center justify-center text-sm font-medium transition-all
                            ${isTaken 
                              ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed' 
                              : isSelected 
                                ? 'bg-[#00E5FF] text-black' 
                                : 'bg-[#121214] text-zinc-400 hover:bg-[#1a1a1c]'}
                          `}
                        >
                          {num}
                        </button>
                      );
                    })}
                  </div>
                </div>
                
                {/* Summary */}
                <div className="bg-[#121214] rounded-lg p-4 mb-6">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-zinc-400">Spots Selected</span>
                    <span className="text-white">{selectedSpots.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-400">Total</span>
                    <span className="text-white font-medium">${selectedSpots.length * selectedRazz.spot_price}</span>
                  </div>
                </div>
                
                <Button
                  className="w-full bg-[#00E5FF] text-black hover:bg-[#80F2FF]"
                  disabled={selectedSpots.length === 0 || !isAuthenticated}
                  onClick={handlePurchase}
                  data-testid="purchase-spots-btn"
                >
                  {isAuthenticated 
                    ? `Purchase ${selectedSpots.length} Spot${selectedSpots.length !== 1 ? 's' : ''}`
                    : 'Sign in to Purchase'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Verification Result Modal */}
        {verificationResult && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-[#0A0A0C] border border-white/10 rounded-2xl w-full max-w-md p-6">
              <div className="flex items-center gap-3 mb-4">
                {verificationResult.is_valid ? (
                  <CheckCircle2 className="w-8 h-8 text-green-500" />
                ) : (
                  <Shield className="w-8 h-8 text-red-500" />
                )}
                <h2 className="text-xl font-bold text-white">
                  {verificationResult.is_valid ? 'Verification Passed' : 'Verification Failed'}
                </h2>
              </div>
              
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-zinc-500">Server Seed</p>
                  <code className="text-zinc-300 text-xs break-all">{verificationResult.server_seed}</code>
                </div>
                <div>
                  <p className="text-zinc-500">Client Seed</p>
                  <code className="text-zinc-300 text-xs break-all">{verificationResult.client_seed}</code>
                </div>
                <div>
                  <p className="text-zinc-500">Combined Hash</p>
                  <code className="text-zinc-300 text-xs break-all">{verificationResult.combined_hash}</code>
                </div>
                <div className="flex justify-between pt-2 border-t border-white/10">
                  <span className="text-zinc-400">Winning Spot</span>
                  <span className="text-white font-medium">{verificationResult.actual_winner}</span>
                </div>
              </div>
              
              <Button
                className="w-full mt-6"
                variant="outline"
                onClick={() => setVerificationResult(null)}
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
