import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { getActiveRazzes, getMyRazzes, purchaseRazzSpots, verifyRazzFairness } from '../lib/api';
import { Button } from '../components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { Dice6, Users, Clock, Trophy, Shield, CheckCircle2, Hash, Sparkles, Play, Volume2, VolumeX, Eye, Lock, Zap, Crown } from 'lucide-react';
import { toast } from 'sonner';

// Card flip animation component
const FlipCard = ({ number, isRevealed, isWinner, delay = 0 }) => {
  return (
    <motion.div
      initial={{ rotateY: 180, scale: 0.8 }}
      animate={{ 
        rotateY: isRevealed ? 0 : 180, 
        scale: isRevealed ? 1 : 0.8,
      }}
      transition={{ duration: 0.6, delay, type: 'spring', stiffness: 100 }}
      className="relative w-16 h-20 perspective-1000"
      style={{ transformStyle: 'preserve-3d' }}
    >
      {/* Back of card */}
      <div 
        className="absolute inset-0 rounded-xl bg-gradient-to-br from-violet-600 to-purple-800 border-2 border-violet-400/30 flex items-center justify-center backface-hidden"
        style={{ transform: 'rotateY(180deg)', backfaceVisibility: 'hidden' }}
      >
        <Dice6 className="w-6 h-6 text-violet-300/60" />
      </div>
      {/* Front of card */}
      <div 
        className={`absolute inset-0 rounded-xl flex items-center justify-center font-bold text-2xl backface-hidden transition-all duration-300 ${
          isWinner 
            ? 'bg-gradient-to-br from-[#BCFF00] to-emerald-500 text-black border-2 border-[#BCFF00] shadow-[0_0_30px_rgba(188,255,0,0.5)]' 
            : 'bg-gradient-to-br from-zinc-800 to-zinc-900 text-white border-2 border-zinc-700'
        }`}
        style={{ backfaceVisibility: 'hidden' }}
      >
        {number}
        {isWinner && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: 'spring' }}
            className="absolute -top-2 -right-2"
          >
            <Crown className="w-5 h-5 text-yellow-400 fill-yellow-400" />
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

// Countdown timer component
const CountdownTimer = ({ endTime, onComplete }) => {
  const [timeLeft, setTimeLeft] = useState({ minutes: 0, seconds: 0 });

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const end = new Date(endTime).getTime();
      const diff = end - now;
      
      if (diff <= 0) {
        clearInterval(timer);
        onComplete?.();
        return;
      }
      
      setTimeLeft({
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [endTime, onComplete]);

  return (
    <div className="flex items-center gap-1 font-mono">
      <motion.span 
        key={timeLeft.minutes}
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-black/40 px-2 py-1 rounded text-lg font-bold"
      >
        {String(timeLeft.minutes).padStart(2, '0')}
      </motion.span>
      <span className="text-[#BCFF00] animate-pulse">:</span>
      <motion.span 
        key={timeLeft.seconds}
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-black/40 px-2 py-1 rounded text-lg font-bold"
      >
        {String(timeLeft.seconds).padStart(2, '0')}
      </motion.span>
    </div>
  );
};

// Particle explosion effect
const ParticleExplosion = ({ active }) => {
  if (!active) return null;
  
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ 
            x: '50%', 
            y: '50%', 
            scale: 0,
            opacity: 1 
          }}
          animate={{ 
            x: `${50 + (Math.random() - 0.5) * 100}%`,
            y: `${50 + (Math.random() - 0.5) * 100}%`,
            scale: Math.random() * 2 + 1,
            opacity: 0,
          }}
          transition={{ duration: 1.5, delay: i * 0.05 }}
          className="absolute w-2 h-2 rounded-full"
          style={{ backgroundColor: i % 2 === 0 ? '#BCFF00' : '#8b5cf6' }}
        />
      ))}
    </div>
  );
};

// Live player avatar
const PlayerAvatar = ({ name, spot, isWinner }) => (
  <motion.div
    initial={{ scale: 0, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
    className={`flex items-center gap-2 px-3 py-2 rounded-xl ${
      isWinner 
        ? 'bg-[#BCFF00]/20 border border-[#BCFF00]/30' 
        : 'bg-white/5 border border-white/10'
    }`}
  >
    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
      isWinner ? 'bg-[#BCFF00] text-black' : 'bg-gradient-to-br from-violet-500 to-purple-600 text-white'
    }`}>
      {name?.charAt(0)?.toUpperCase() || '?'}
    </div>
    <div>
      <p className="text-xs font-medium text-white">{name || 'Anonymous'}</p>
      <p className="text-[10px] text-zinc-400">Spot #{spot}</p>
    </div>
    {isWinner && <Crown className="w-4 h-4 text-[#BCFF00] ml-1" />}
  </motion.div>
);

export default function Razz() {
  const { user, isAuthenticated } = useAuth();
  const [razzes, setRazzes] = useState([]);
  const [myRazzes, setMyRazzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRazz, setSelectedRazz] = useState(null);
  const [selectedSpots, setSelectedSpots] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [revealedSpots, setRevealedSpots] = useState([]);
  const [winnerSpot, setWinnerSpot] = useState(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [viewMode, setViewMode] = useState('grid'); // grid, live

  useEffect(() => {
    fetchRazzes();
    // Poll for updates
    const interval = setInterval(fetchRazzes, 5000);
    return () => clearInterval(interval);
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
      fetchRazzes();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to purchase spots');
    }
  };

  const simulateDrawing = useCallback((razz) => {
    if (!razz) return;
    
    setIsDrawing(true);
    setRevealedSpots([]);
    setWinnerSpot(null);
    setShowCelebration(false);
    
    const totalSpots = razz.total_spots || 10;
    const randomWinner = Math.floor(Math.random() * totalSpots) + 1;
    
    // Reveal spots one by one with suspense
    let revealed = [];
    const revealInterval = setInterval(() => {
      if (revealed.length < totalSpots) {
        // Random order reveal for more excitement
        const remaining = [...Array(totalSpots)].map((_, i) => i + 1).filter(n => !revealed.includes(n));
        const nextSpot = remaining[Math.floor(Math.random() * remaining.length)];
        revealed = [...revealed, nextSpot];
        setRevealedSpots([...revealed]);
        
        // Check if we just revealed the winner
        if (nextSpot === randomWinner && revealed.length === totalSpots) {
          setTimeout(() => {
            setWinnerSpot(randomWinner);
            setShowCelebration(true);
            setIsDrawing(false);
          }, 600);
        }
      } else {
        clearInterval(revealInterval);
        setTimeout(() => {
          setWinnerSpot(randomWinner);
          setShowCelebration(true);
          setIsDrawing(false);
        }, 600);
      }
    }, 400);
  }, []);

  const handleVerify = async (razzId) => {
    try {
      const response = await verifyRazzFairness(razzId);
      if (response.data.is_valid) {
        toast.success('Provably Fair Verified!', {
          description: 'The draw was cryptographically verified as fair.'
        });
      } else {
        toast.error('Verification failed');
      }
    } catch (error) {
      toast.error('Failed to verify');
    }
  };

  const getFilledSpotsCount = (razz) => {
    return razz.participants?.length || 0;
  };

  const getProgressPercentage = (razz) => {
    const filled = getFilledSpotsCount(razz);
    const total = razz.total_spots || 10;
    return (filled / total) * 100;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050505]">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-12 h-12 border-3 border-[#BCFF00] border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white" data-testid="razz-page">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-violet-500/5 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-[#BCFF00]/5 rounded-full blur-[150px]" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <motion.div 
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-[0_0_30px_rgba(139,92,246,0.3)]"
            >
              <Dice6 className="w-6 h-6 text-white" />
            </motion.div>
            <div>
              <h1 className="text-2xl font-bold">Live Razz</h1>
              <p className="text-sm text-zinc-400">Provably fair card raffles</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="text-zinc-400"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </Button>
            <div className="flex bg-black/40 rounded-lg p-1">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className={viewMode === 'grid' ? 'bg-[#BCFF00] text-black' : 'text-zinc-400'}
              >
                Browse
              </Button>
              <Button
                variant={viewMode === 'live' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('live')}
                className={viewMode === 'live' ? 'bg-[#BCFF00] text-black' : 'text-zinc-400'}
              >
                <span className="relative flex h-2 w-2 mr-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                </span>
                Live
              </Button>
            </div>
          </div>
        </div>

        {/* Live Drawing View */}
        {viewMode === 'live' && selectedRazz && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-8"
          >
            <div className="relative rounded-3xl border border-white/10 bg-black/40 backdrop-blur-xl overflow-hidden">
              <ParticleExplosion active={showCelebration} />
              
              {/* Card being raffled */}
              <div className="p-8 border-b border-white/5">
                <div className="flex items-start gap-6">
                  <div className="w-32 h-44 rounded-xl bg-gradient-to-br from-zinc-800 to-zinc-900 border border-white/10 flex items-center justify-center overflow-hidden">
                    {selectedRazz.card?.image_url ? (
                      <img src={selectedRazz.card.image_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Sparkles className="w-10 h-10 text-zinc-700" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-400 text-xs font-medium">
                        {isDrawing ? 'DRAWING...' : showCelebration ? 'WINNER!' : 'LIVE'}
                      </span>
                      {isDrawing && (
                        <motion.span
                          animate={{ opacity: [1, 0.5, 1] }}
                          transition={{ duration: 0.5, repeat: Infinity }}
                          className="text-xs text-zinc-400"
                        >
                          Revealing spots...
                        </motion.span>
                      )}
                    </div>
                    <h2 className="text-xl font-bold mb-1">{selectedRazz.card?.title || 'Premium Card'}</h2>
                    <p className="text-[#BCFF00] text-lg font-bold">${selectedRazz.price_per_spot}/spot</p>
                    
                    {/* Progress bar */}
                    <div className="mt-4">
                      <div className="flex justify-between text-xs text-zinc-400 mb-1">
                        <span>{getFilledSpotsCount(selectedRazz)}/{selectedRazz.total_spots} spots filled</span>
                        <span>{Math.round(getProgressPercentage(selectedRazz))}%</span>
                      </div>
                      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${getProgressPercentage(selectedRazz)}%` }}
                          className="h-full bg-gradient-to-r from-violet-500 to-[#BCFF00] rounded-full"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Spot Grid - The Main Event */}
              <div className="p-8">
                <div className="flex flex-wrap justify-center gap-3 mb-6">
                  {[...Array(selectedRazz.total_spots || 10)].map((_, i) => {
                    const spotNum = i + 1;
                    const isRevealed = revealedSpots.includes(spotNum);
                    const isWinner = winnerSpot === spotNum;
                    
                    return (
                      <FlipCard
                        key={spotNum}
                        number={spotNum}
                        isRevealed={isRevealed || !isDrawing}
                        isWinner={isWinner}
                        delay={revealedSpots.indexOf(spotNum) * 0.1}
                      />
                    );
                  })}
                </div>

                {/* Action Buttons */}
                <div className="flex justify-center gap-3">
                  {!isDrawing && !showCelebration && (
                    <Button
                      onClick={() => simulateDrawing(selectedRazz)}
                      className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 h-12 px-8 font-semibold shadow-[0_0_30px_rgba(139,92,246,0.3)]"
                    >
                      <Play className="w-4 h-4 mr-2" /> Start Drawing
                    </Button>
                  )}
                  {showCelebration && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="text-center"
                    >
                      <p className="text-2xl font-bold text-[#BCFF00] mb-2">
                        Spot #{winnerSpot} Wins!
                      </p>
                      <Button
                        onClick={() => handleVerify(selectedRazz.id)}
                        variant="outline"
                        className="border-[#BCFF00]/30 text-[#BCFF00] hover:bg-[#BCFF00]/10"
                      >
                        <Shield className="w-4 h-4 mr-2" /> Verify Fairness
                      </Button>
                    </motion.div>
                  )}
                </div>
              </div>

              {/* Live Participants */}
              <div className="px-8 pb-8">
                <p className="text-xs text-zinc-400 mb-3">Live Participants</p>
                <div className="flex flex-wrap gap-2">
                  {(selectedRazz.participants || []).slice(0, 10).map((p, i) => (
                    <PlayerAvatar
                      key={i}
                      name={p.user_name || `Player ${i + 1}`}
                      spot={p.spot_number}
                      isWinner={winnerSpot === p.spot_number}
                    />
                  ))}
                  {(!selectedRazz.participants || selectedRazz.participants.length === 0) && (
                    <p className="text-xs text-zinc-500">No participants yet</p>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Razz Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {razzes.map((razz, index) => (
            <motion.div
              key={razz.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              onClick={() => {
                setSelectedRazz(razz);
                if (viewMode !== 'live') setViewMode('live');
              }}
              className="group cursor-pointer rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-sm overflow-hidden hover:border-violet-500/30 transition-all"
            >
              {/* Card Preview */}
              <div className="relative aspect-[4/3] bg-gradient-to-br from-zinc-800 to-zinc-900">
                {razz.card?.image_url ? (
                  <img src={razz.card.image_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Sparkles className="w-12 h-12 text-zinc-700" />
                  </div>
                )}
                
                {/* Status Badge */}
                <div className="absolute top-3 left-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium backdrop-blur-sm ${
                    razz.status === 'active' 
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                      : razz.status === 'drawing'
                      ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30'
                      : 'bg-zinc-500/20 text-zinc-400 border border-zinc-500/30'
                  }`}>
                    {razz.status === 'active' && (
                      <span className="relative flex h-1.5 w-1.5 mr-1.5 inline-block">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-400"></span>
                      </span>
                    )}
                    {razz.status?.toUpperCase()}
                  </span>
                </div>

                {/* Spots indicator */}
                <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-sm rounded-lg px-2 py-1 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-zinc-400" />
                  <span className="text-xs font-medium">{getFilledSpotsCount(razz)}/{razz.total_spots}</span>
                </div>

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-4">
                  <Button size="sm" className="bg-[#BCFF00] text-black font-medium">
                    <Eye className="w-3.5 h-3.5 mr-1.5" /> View Razz
                  </Button>
                </div>
              </div>

              {/* Info */}
              <div className="p-4">
                <h3 className="font-semibold text-sm mb-1 truncate">{razz.card?.title || 'Premium Card Razz'}</h3>
                <div className="flex items-center justify-between">
                  <span className="text-[#BCFF00] font-bold">${razz.price_per_spot}/spot</span>
                  <span className="text-xs text-zinc-500">
                    {razz.total_spots - getFilledSpotsCount(razz)} left
                  </span>
                </div>
                
                {/* Mini progress */}
                <div className="mt-3 h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-violet-500 to-[#BCFF00] rounded-full transition-all duration-500"
                    style={{ width: `${getProgressPercentage(razz)}%` }}
                  />
                </div>
              </div>
            </motion.div>
          ))}

          {razzes.length === 0 && (
            <div className="col-span-full text-center py-16">
              <Dice6 className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
              <p className="text-zinc-400">No active razzes right now</p>
              <p className="text-xs text-zinc-600 mt-1">Check back soon for new raffles</p>
            </div>
          )}
        </div>

        {/* Provably Fair Info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 p-6 rounded-2xl border border-white/5 bg-white/[0.02]"
        >
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-[#BCFF00]/10 flex items-center justify-center flex-shrink-0">
              <Shield className="w-5 h-5 text-[#BCFF00]" />
            </div>
            <div>
              <h3 className="font-semibold mb-1">Provably Fair System</h3>
              <p className="text-sm text-zinc-400">
                Every razz uses SHA256 cryptographic hashing. The server generates a secret seed before spots are purchased, 
                which is hashed and shown publicly. After the draw, the seed is revealed so anyone can verify the winner 
                was determined fairly. Math doesn't lie.
              </p>
              <div className="flex items-center gap-4 mt-3">
                <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                  <Hash className="w-3.5 h-3.5" />
                  <span>SHA256 Verified</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Tamper-Proof</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                  <Eye className="w-3.5 h-3.5" />
                  <span>Publicly Auditable</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
