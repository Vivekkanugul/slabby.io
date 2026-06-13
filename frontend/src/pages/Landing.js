import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useEffect, useRef, useState } from 'react';
import { motion, useScroll, useTransform, useInView } from 'framer-motion';
import { 
  ArrowRight, Sparkles, Shield, Shuffle, Dice6, Wallet, TrendingUp, 
  ChevronRight, Users, Zap, Lock, BarChart3, Globe, CheckCircle2,
  Star, Play
} from 'lucide-react';
import { Button } from '../components/ui/button';
import api from '../lib/api';

export default function Landing() {
  const { isAuthenticated } = useAuth();
  const [stats, setStats] = useState({ total_users: 0, cards_listed: 0, active_trades: 0, active_razzes: 0 });
  const [liveCards, setLiveCards] = useState([]);
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: containerRef });
  
  // Parallax transforms
  const y1 = useTransform(scrollYProgress, [0, 1], [0, -100]);
  const y2 = useTransform(scrollYProgress, [0, 1], [0, -200]);
  const opacity = useTransform(scrollYProgress, [0, 0.3], [1, 0]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, cardsRes] = await Promise.all([
          api.get('/stats'),
          api.get('/cards', { params: { limit: 6 } })
        ]);
        setStats(statsRes.data);
        setLiveCards(cardsRes.data || []);
      } catch (e) {
        console.error('Failed to fetch landing data');
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const features = [
    { icon: Shuffle, title: 'P2P Trading', desc: 'Direct trades with escrow', color: '#10b981' },
    { icon: Dice6, title: 'Live Razz', desc: 'Provably fair raffles', color: '#8b5cf6' },
    { icon: Lock, title: 'Secure Escrow', desc: 'Bank-level protection', color: '#f59e0b' },
    { icon: Zap, title: 'Instant Payouts', desc: 'Withdraw anytime', color: '#ef4444' },
  ];

  return (
    <div ref={containerRef} className="bg-[#050505] text-white">
      {/* Seamless gradient background that flows through entire page */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-[#050505] to-[#0a0a0a]" />
        <motion.div style={{ y: y1 }} className="absolute top-0 left-0 w-full h-[120vh] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#BCFF00]/8 via-transparent to-transparent" />
        <motion.div style={{ y: y2 }} className="absolute top-[50vh] right-0 w-[60vw] h-[60vh] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-violet-500/6 via-transparent to-transparent" />
      </div>

      {/* Fixed Navigation */}
      <motion.nav 
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="fixed top-0 left-0 right-0 z-50 px-4 py-3"
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between rounded-2xl bg-black/60 backdrop-blur-2xl border border-white/5 px-5 py-2.5">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#BCFF00] flex items-center justify-center shadow-[0_0_20px_rgba(188,255,0,0.3)]">
              <span className="font-bold text-black text-base">S</span>
            </div>
            <span className="font-semibold text-lg">Slabby</span>
          </Link>
          
          <div className="hidden md:flex items-center gap-6">
            <Link to="/marketplace" className="text-sm text-zinc-400 hover:text-white transition-colors">Marketplace</Link>
            <Link to="/razz" className="text-sm text-zinc-400 hover:text-white transition-colors">Live Razz</Link>
          </div>
          
          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <Link to="/marketplace">
                <Button size="sm" className="bg-[#BCFF00] text-black font-medium hover:bg-[#d4ff4d] shadow-[0_0_20px_rgba(188,255,0,0.25)]">
                  Open App <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </Button>
              </Link>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white">Sign In</Button>
                </Link>
                <Link to="/register">
                  <Button size="sm" className="bg-[#BCFF00] text-black font-medium hover:bg-[#d4ff4d] shadow-[0_0_20px_rgba(188,255,0,0.25)]">
                    Get Started
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </motion.nav>

      {/* HERO + STATS + FEATURES - One Continuous Flow */}
      <section className="relative min-h-screen pt-24 pb-0">
        <div className="max-w-6xl mx-auto px-6">
          {/* Hero Content */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-center max-w-3xl mx-auto mb-8"
          >
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-5 leading-[1.05]">
              The Future of
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#BCFF00] via-emerald-400 to-[#BCFF00]">
                Card Trading
              </span>
            </h1>
            <p className="text-base sm:text-lg text-zinc-400 mb-6 max-w-xl mx-auto">
              P2P marketplace with provably fair raffles. Every trade protected. Every draw verifiable.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/register">
                <Button size="lg" className="bg-[#BCFF00] text-black font-semibold hover:bg-[#d4ff4d] h-12 px-7 shadow-[0_0_40px_rgba(188,255,0,0.35)] hover:shadow-[0_0_50px_rgba(188,255,0,0.5)] transition-all">
                  Start Trading <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <Link to="/razz">
                <Button size="lg" variant="outline" className="border-white/10 bg-white/5 hover:bg-white/10 h-12 px-7 backdrop-blur-sm">
                  <Play className="w-4 h-4 mr-2" /> Watch Live Razz
                </Button>
              </Link>
            </div>
          </motion.div>

          {/* Live Stats - Floating Cards that Connect Hero to Features */}
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6"
          >
            {[
              { label: 'Active Traders', value: stats.total_users, icon: Users, color: '#BCFF00' },
              { label: 'Cards Listed', value: stats.cards_listed, icon: BarChart3, color: '#10b981' },
              { label: 'Active Trades', value: stats.active_trades, icon: Shuffle, color: '#8b5cf6' },
              { label: 'Live Razzes', value: stats.active_razzes, icon: Dice6, color: '#f59e0b' },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 + i * 0.1 }}
                className="relative group"
              >
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative p-4 rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${stat.color}15` }}>
                      <stat.icon className="w-5 h-5" style={{ color: stat.color }} />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stat.value}</p>
                      <p className="text-xs text-zinc-500">{stat.label}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Features - Seamlessly Connected */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6"
          >
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 + i * 0.1 }}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className="p-4 rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-sm cursor-pointer group"
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ backgroundColor: `${f.color}15` }}>
                  <f.icon className="w-5 h-5" style={{ color: f.color }} />
                </div>
                <h3 className="font-semibold text-sm mb-1">{f.title}</h3>
                <p className="text-xs text-zinc-500">{f.desc}</p>
              </motion.div>
            ))}
          </motion.div>

          {/* Live Cards Preview - Horizontal Scroll */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9 }}
            className="relative"
          >
            <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide">
              {(liveCards.length > 0 ? liveCards : Array(6).fill(null)).map((card, i) => (
                <motion.div
                  key={card?.id || i}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 1 + i * 0.1 }}
                  whileHover={{ scale: 1.03, y: -4 }}
                  className="flex-shrink-0 w-40 rounded-xl overflow-hidden border border-white/10 bg-black/40 backdrop-blur-sm cursor-pointer group"
                >
                  <div className="aspect-[3/4] bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center relative overflow-hidden">
                    {card?.image_url ? (
                      <img src={card.image_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Sparkles className="w-8 h-8 text-zinc-700" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="p-3">
                    <p className="text-xs font-medium truncate">{card?.title || 'Premium Card'}</p>
                    <p className="text-[#BCFF00] font-bold text-sm">${card?.asking_price?.toLocaleString() || '0'}</p>
                  </div>
                </motion.div>
              ))}
            </div>
            {/* Fade edges */}
            <div className="absolute left-0 top-0 bottom-4 w-12 bg-gradient-to-r from-[#050505] to-transparent pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-4 w-12 bg-gradient-to-l from-[#050505] to-transparent pointer-events-none" />
          </motion.div>
        </div>
      </section>

      {/* HOW IT WORKS + TESTIMONIALS - Continuous Bento Grid */}
      <section className="relative py-8">
        <div className="max-w-6xl mx-auto px-6">
          {/* Bento Grid - Everything Connected */}
          <div className="grid grid-cols-12 gap-3">
            {/* Step 1 - Large */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="col-span-12 md:col-span-5 p-6 rounded-2xl border border-white/5 bg-gradient-to-br from-[#BCFF00]/5 to-transparent"
            >
              <div className="w-12 h-12 rounded-xl bg-[#BCFF00]/10 flex items-center justify-center mb-4">
                <BarChart3 className="w-6 h-6 text-[#BCFF00]" />
              </div>
              <span className="text-4xl font-bold text-[#BCFF00]/30">01</span>
              <h3 className="text-xl font-semibold mt-2">List Your Cards</h3>
              <p className="text-sm text-zinc-400 mt-2">Upload photos, set prices. Accept trades, cash, or both.</p>
            </motion.div>

            {/* Step 2 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="col-span-6 md:col-span-4 p-5 rounded-2xl border border-white/5 bg-gradient-to-br from-violet-500/5 to-transparent"
            >
              <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center mb-3">
                <Shuffle className="w-5 h-5 text-violet-500" />
              </div>
              <span className="text-3xl font-bold text-violet-500/30">02</span>
              <h3 className="text-base font-semibold mt-1">Trade or Razz</h3>
              <p className="text-xs text-zinc-400 mt-1">P2P deals or provably fair raffles</p>
            </motion.div>

            {/* Step 3 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="col-span-6 md:col-span-3 p-5 rounded-2xl border border-white/5 bg-gradient-to-br from-amber-500/5 to-transparent"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center mb-3">
                <Wallet className="w-5 h-5 text-amber-500" />
              </div>
              <span className="text-3xl font-bold text-amber-500/30">03</span>
              <h3 className="text-base font-semibold mt-1">Get Paid</h3>
              <p className="text-xs text-zinc-400 mt-1">Instant settlement</p>
            </motion.div>

            {/* Testimonials Row */}
            {[
              { name: 'Mike R.', text: 'The escrow system is bulletproof. Finally a platform that gets it right.' },
              { name: 'Sarah K.', text: 'Won my first Razz and verified it myself. 100% legit provably fair.' },
              { name: 'James T.', text: 'Sold 3 cards in my first week. Incredibly smooth.' },
            ].map((t, i) => (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 * i }}
                className="col-span-12 md:col-span-4 p-4 rounded-2xl border border-white/5 bg-white/[0.02]"
              >
                <div className="flex gap-0.5 mb-2">
                  {[...Array(5)].map((_, j) => <Star key={j} className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />)}
                </div>
                <p className="text-sm text-zinc-300 mb-2">"{t.text}"</p>
                <p className="text-xs text-zinc-500">{t.name}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA - Integrated with Flow */}
      <section className="relative py-12">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative rounded-3xl border border-white/5 bg-gradient-to-br from-[#BCFF00]/5 via-transparent to-violet-500/5 p-8 md:p-12 overflow-hidden"
          >
            {/* Subtle glow */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#BCFF00]/10 rounded-full blur-[100px] pointer-events-none" />
            
            <div className="relative text-center max-w-2xl mx-auto">
              <h2 className="text-3xl sm:text-4xl font-bold mb-3">
                Ready to Start <span className="text-[#BCFF00]">Trading?</span>
              </h2>
              <p className="text-zinc-400 mb-6">
                Join the next generation of card collecting. Zero fees. Complete transparency.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link to="/register">
                  <Button size="lg" className="bg-[#BCFF00] text-black font-semibold hover:bg-[#d4ff4d] h-12 px-8 shadow-[0_0_40px_rgba(188,255,0,0.3)]">
                    Create Free Account <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
                <Link to="/marketplace">
                  <Button size="lg" variant="outline" className="border-white/10 bg-white/5 hover:bg-white/10 h-12 px-8">
                    Explore Cards
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Minimal Footer */}
      <footer className="border-t border-white/5 py-6 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#BCFF00] flex items-center justify-center">
              <span className="font-bold text-black text-sm">S</span>
            </div>
            <span className="font-semibold">Slabby</span>
          </div>
          <div className="flex items-center gap-6 text-xs text-zinc-500">
            <Link to="/marketplace" className="hover:text-white transition-colors">Marketplace</Link>
            <Link to="/razz" className="hover:text-white transition-colors">Live Razz</Link>
            <span>© 2026 Slabby</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
