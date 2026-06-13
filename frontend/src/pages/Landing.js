import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useEffect, useRef, useState } from 'react';
import { motion, useScroll, useTransform, useInView, AnimatePresence } from 'framer-motion';
import { 
  ArrowRight, Sparkles, Shield, Shuffle, Dice6, Wallet, TrendingUp, 
  ChevronRight, Users, Zap, Lock, BarChart3, Globe, CheckCircle2,
  ArrowUpRight, Star, Clock, Trophy
} from 'lucide-react';
import { Button } from '../components/ui/button';
import api from '../lib/api';

export default function Landing() {
  const { isAuthenticated } = useAuth();
  const [stats, setStats] = useState({ total_users: 0, cards_listed: 0, active_trades: 0, active_razzes: 0 });
  const [liveCards, setLiveCards] = useState([]);
  const [hoveredCard, setHoveredCard] = useState(null);
  const heroRef = useRef(null);
  const isHeroInView = useInView(heroRef, { once: true });

  // Fetch live data
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
    const interval = setInterval(fetchData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const features = [
    {
      icon: Shuffle,
      title: 'P2P Trading',
      description: 'Trade directly with collectors. Multi-card deals with cash + escrow protection.',
      color: 'from-emerald-500 to-teal-600',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'hover:border-emerald-500/30',
    },
    {
      icon: Dice6,
      title: 'Provably Fair Razz',
      description: 'Cryptographic verification on every draw. SHA256 transparency you can audit.',
      color: 'from-violet-500 to-purple-600',
      bgColor: 'bg-violet-500/10',
      borderColor: 'hover:border-violet-500/30',
    },
    {
      icon: Lock,
      title: 'Secure Escrow',
      description: 'Funds held safely until both parties confirm. Zero trust required.',
      color: 'from-amber-500 to-orange-600',
      bgColor: 'bg-amber-500/10',
      borderColor: 'hover:border-amber-500/30',
    },
    {
      icon: Zap,
      title: 'Instant Settlement',
      description: 'No waiting. Trades complete in seconds, not days.',
      color: 'from-rose-500 to-pink-600',
      bgColor: 'bg-rose-500/10',
      borderColor: 'hover:border-rose-500/30',
    },
  ];

  const testimonials = [
    { name: 'Mike R.', text: 'Finally a platform that gets card trading right. The escrow system is bulletproof.', rating: 5 },
    { name: 'Sarah K.', text: 'Won my first Razz and verified it myself. 100% legit provably fair.', rating: 5 },
    { name: 'James T.', text: 'Sold 3 cards in my first week. The P2P system is incredibly smooth.', rating: 5 },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-[#BCFF00]/5 rounded-full blur-[150px] animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-purple-500/5 rounded-full blur-[150px] animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-emerald-500/3 rounded-full blur-[200px]" />
      </div>

      {/* Navigation */}
      <motion.nav 
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="fixed top-0 left-0 right-0 z-50"
      >
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex items-center justify-between rounded-2xl bg-black/40 backdrop-blur-xl border border-white/10 px-6 py-3">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="relative">
                <div className="absolute inset-0 bg-[#BCFF00] rounded-xl blur-lg opacity-50 group-hover:opacity-80 transition-opacity" />
                <div className="relative w-10 h-10 rounded-xl bg-[#BCFF00] flex items-center justify-center">
                  <span className="font-bold text-black text-lg">S</span>
                </div>
              </div>
              <span className="font-bold text-xl">Slabby</span>
            </Link>
            
            <div className="hidden md:flex items-center gap-8">
              <Link to="/marketplace" className="text-sm text-zinc-400 hover:text-white transition-all hover:scale-105">Marketplace</Link>
              <Link to="/razz" className="text-sm text-zinc-400 hover:text-white transition-all hover:scale-105">Razz</Link>
              <a href="#features" className="text-sm text-zinc-400 hover:text-white transition-all hover:scale-105">Features</a>
            </div>
            
            <div className="flex items-center gap-3">
              {isAuthenticated ? (
                <Link to="/marketplace">
                  <Button className="bg-[#BCFF00] text-black font-semibold hover:bg-[#d4ff4d] hover:scale-105 transition-all shadow-[0_0_30px_rgba(188,255,0,0.3)]">
                    Open App <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              ) : (
                <>
                  <Link to="/login">
                    <Button variant="ghost" className="text-zinc-400 hover:text-white hover:bg-white/5">Sign In</Button>
                  </Link>
                  <Link to="/register">
                    <Button className="bg-[#BCFF00] text-black font-semibold hover:bg-[#d4ff4d] hover:scale-105 transition-all shadow-[0_0_30px_rgba(188,255,0,0.3)]">
                      Get Started
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <section ref={heroRef} className="relative min-h-screen flex items-center pt-32 pb-20">
        <div className="max-w-7xl mx-auto px-6 w-full">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left Content */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={isHeroInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-6">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#BCFF00] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#BCFF00]"></span>
                </span>
                <span className="text-sm text-zinc-300">{stats.total_users} traders online</span>
              </div>

              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-6 leading-[1.1]">
                The Future of
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#BCFF00] via-emerald-400 to-teal-400">
                  Card Trading
                </span>
              </h1>

              <p className="text-lg text-zinc-400 mb-8 max-w-lg leading-relaxed">
                P2P marketplace with provably fair raffles. Every trade is protected. 
                Every draw is verifiable. Join {stats.total_users}+ collectors.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 mb-12">
                <Link to="/register">
                  <Button size="lg" className="bg-[#BCFF00] text-black font-semibold hover:bg-[#d4ff4d] h-14 px-8 text-base hover:scale-105 transition-all shadow-[0_0_40px_rgba(188,255,0,0.4)] group">
                    Start Trading Free
                    <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
                <Link to="/marketplace">
                  <Button size="lg" variant="outline" className="border-white/20 bg-white/5 hover:bg-white/10 h-14 px-8 text-base backdrop-blur-sm">
                    <Globe className="w-5 h-5 mr-2" />
                    Browse Marketplace
                  </Button>
                </Link>
              </div>

              {/* Trust Badges */}
              <div className="flex items-center gap-6 flex-wrap">
                <div className="flex items-center gap-2 text-sm text-zinc-400">
                  <Shield className="w-4 h-4 text-emerald-500" />
                  <span>Escrow Protected</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-zinc-400">
                  <Lock className="w-4 h-4 text-amber-500" />
                  <span>Bank-Level Security</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-zinc-400">
                  <CheckCircle2 className="w-4 h-4 text-[#BCFF00]" />
                  <span>Verified Sellers</span>
                </div>
              </div>
            </motion.div>

            {/* Right - Live Cards Preview */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={isHeroInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="relative"
            >
              <div className="grid grid-cols-2 gap-4">
                {liveCards.slice(0, 4).map((card, index) => (
                  <motion.div
                    key={card.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 + index * 0.1 }}
                    whileHover={{ scale: 1.05, y: -5 }}
                    onHoverStart={() => setHoveredCard(card.id)}
                    onHoverEnd={() => setHoveredCard(null)}
                    className={`relative rounded-2xl overflow-hidden border transition-all duration-300 cursor-pointer ${
                      hoveredCard === card.id 
                        ? 'border-[#BCFF00]/50 shadow-[0_0_30px_rgba(188,255,0,0.2)]' 
                        : 'border-white/10 bg-white/5'
                    }`}
                  >
                    <div className="aspect-[3/4] bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center">
                      <div className="text-4xl">🃏</div>
                    </div>
                    <div className="p-4 bg-black/60 backdrop-blur-sm">
                      <p className="text-sm font-medium truncate">{card.title || 'Premium Card'}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-[#BCFF00] font-bold">${card.asking_price?.toLocaleString() || '0'}</span>
                        <span className="text-xs text-zinc-500">{card.condition || 'PSA 10'}</span>
                      </div>
                    </div>
                    {hoveredCard === card.id && (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="absolute inset-0 bg-[#BCFF00]/10 flex items-center justify-center"
                      >
                        <span className="px-4 py-2 bg-[#BCFF00] text-black text-sm font-semibold rounded-full">
                          View Card
                        </span>
                      </motion.div>
                    )}
                  </motion.div>
                ))}
              </div>

              {/* Floating Stats */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1 }}
                className="absolute -bottom-6 -left-6 bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.cards_listed}</p>
                    <p className="text-xs text-zinc-500">Cards Listed</p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1.2 }}
                className="absolute -top-4 -right-4 bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                    <Dice6 className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.active_razzes}</p>
                    <p className="text-xs text-zinc-500">Active Razzes</p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Live Stats Bar */}
      <section className="relative py-8 border-y border-white/10 bg-black/40 backdrop-blur-sm overflow-hidden">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { label: 'Active Traders', value: stats.total_users, icon: Users, color: 'text-[#BCFF00]' },
              { label: 'Cards Listed', value: stats.cards_listed, icon: BarChart3, color: 'text-emerald-500' },
              { label: 'Active Trades', value: stats.active_trades, icon: Shuffle, color: 'text-violet-500' },
              { label: 'Live Razzes', value: stats.active_razzes, icon: Dice6, color: 'text-amber-500' },
            ].map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center gap-4"
              >
                <div className={`w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center ${stat.color}`}>
                  <stat.icon className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-3xl font-bold">{stat.value}</p>
                  <p className="text-sm text-zinc-500">{stat.label}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Bento Grid */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <span className="inline-block px-4 py-1 rounded-full bg-[#BCFF00]/10 text-[#BCFF00] text-sm font-medium mb-4">
              Why Slabby?
            </span>
            <h2 className="text-4xl sm:text-5xl font-bold mb-4">
              Built Different
            </h2>
            <p className="text-zinc-400 max-w-2xl mx-auto">
              Every feature designed for serious collectors who demand transparency.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -8, scale: 1.02 }}
                className={`group relative p-6 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm transition-all duration-300 ${feature.borderColor} cursor-pointer overflow-hidden`}
              >
                {/* Gradient overlay on hover */}
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />
                
                <div className={`w-14 h-14 rounded-xl ${feature.bgColor} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <feature.icon className={`w-7 h-7 bg-gradient-to-br ${feature.color} bg-clip-text text-transparent`} style={{ WebkitTextFillColor: 'transparent', backgroundClip: 'text' }} />
                  <feature.icon className={`w-7 h-7 absolute`} style={{ color: feature.color.includes('emerald') ? '#10b981' : feature.color.includes('violet') ? '#8b5cf6' : feature.color.includes('amber') ? '#f59e0b' : '#f43f5e' }} />
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 px-6 bg-gradient-to-b from-transparent via-white/[0.02] to-transparent">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <span className="inline-block px-4 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-sm font-medium mb-4">
              Simple Process
            </span>
            <h2 className="text-4xl sm:text-5xl font-bold mb-4">
              Start in 3 Steps
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: '01', title: 'List Your Cards', desc: 'Upload photos, set prices. Accept trades, cash, or both.', icon: BarChart3, color: 'from-[#BCFF00] to-emerald-500' },
              { step: '02', title: 'Trade or Razz', desc: 'Negotiate P2P or host provably fair raffles.', icon: Shuffle, color: 'from-violet-500 to-purple-600' },
              { step: '03', title: 'Get Paid', desc: 'Instant settlement. Withdraw anytime.', icon: Wallet, color: 'from-amber-500 to-orange-600' },
            ].map((item, index) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.15 }}
                className="relative group"
              >
                <div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl blur-xl" style={{ background: `linear-gradient(to bottom right, ${item.color.split(' ')[0].replace('from-', '')}, transparent)` }} />
                <div className="relative p-8 rounded-2xl border border-white/10 bg-black/40 backdrop-blur-sm group-hover:border-white/20 transition-all">
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg`}>
                    <item.icon className="w-8 h-8 text-white" />
                  </div>
                  <span className={`text-5xl font-bold bg-gradient-to-br ${item.color} bg-clip-text text-transparent`}>{item.step}</span>
                  <h3 className="text-xl font-semibold mt-4 mb-2">{item.title}</h3>
                  <p className="text-zinc-400">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <span className="inline-block px-4 py-1 rounded-full bg-violet-500/10 text-violet-500 text-sm font-medium mb-4">
              Testimonials
            </span>
            <h2 className="text-4xl sm:text-5xl font-bold mb-4">
              Loved by Collectors
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((t, index) => (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -5 }}
                className="p-6 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm"
              >
                <div className="flex gap-1 mb-4">
                  {[...Array(t.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-amber-500 text-amber-500" />
                  ))}
                </div>
                <p className="text-zinc-300 mb-4 leading-relaxed">"{t.text}"</p>
                <p className="text-sm text-zinc-500 font-medium">{t.name}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-32 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-[#BCFF00]/10 via-transparent to-violet-500/10" />
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto text-center relative"
        >
          <h2 className="text-4xl sm:text-6xl font-bold mb-6">
            Ready to Start
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#BCFF00] to-emerald-400">
              Trading?
            </span>
          </h2>
          <p className="text-xl text-zinc-400 mb-10 max-w-2xl mx-auto">
            Join the next generation of card collecting. Zero listing fees. Complete transparency.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register">
              <Button size="lg" className="bg-[#BCFF00] text-black font-semibold hover:bg-[#d4ff4d] h-14 px-10 text-base hover:scale-105 transition-all shadow-[0_0_50px_rgba(188,255,0,0.4)] group">
                Create Free Account
                <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link to="/marketplace">
              <Button size="lg" variant="outline" className="border-white/20 bg-white/5 hover:bg-white/10 h-14 px-10 text-base">
                Explore Cards
              </Button>
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-12 px-6 bg-black/40">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#BCFF00] flex items-center justify-center">
                <span className="font-bold text-black">S</span>
              </div>
              <span className="font-bold text-xl">Slabby</span>
            </div>
            <div className="flex items-center gap-8 text-sm text-zinc-500">
              <Link to="/marketplace" className="hover:text-white transition-colors">Marketplace</Link>
              <Link to="/razz" className="hover:text-white transition-colors">Razz</Link>
              <span>© 2026 Slabby. All rights reserved.</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
