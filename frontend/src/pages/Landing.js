import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, useScroll, useTransform, useSpring, useInView, useMotionValue, useAnimationFrame } from 'framer-motion';
import { ArrowRight, Sparkles, Shield, Shuffle, Dice6, Wallet, Zap, Lock, Globe, Star, Play, ChevronDown } from 'lucide-react';
import { Button } from '../components/ui/button';
import api from '../lib/api';

// Magnetic button that follows cursor
const MagneticButton = ({ children, className, ...props }) => {
  const ref = useRef(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleMouse = (e) => {
    const { clientX, clientY } = e;
    const { left, top, width, height } = ref.current.getBoundingClientRect();
    const x = (clientX - left - width / 2) * 0.3;
    const y = (clientY - top - height / 2) * 0.3;
    setPosition({ x, y });
  };

  const reset = () => setPosition({ x: 0, y: 0 });

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouse}
      onMouseLeave={reset}
      animate={{ x: position.x, y: position.y }}
      transition={{ type: 'spring', stiffness: 150, damping: 15 }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
};

// 3D Tilt Card - follows mouse like Apple product cards
const TiltCard = ({ children, className }) => {
  const ref = useRef(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [15, -15]), { stiffness: 300, damping: 30 });
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-15, 15]), { stiffness: 300, damping: 30 });

  const handleMouse = (e) => {
    const rect = ref.current.getBoundingClientRect();
    const xPos = (e.clientX - rect.left) / rect.width - 0.5;
    const yPos = (e.clientY - rect.top) / rect.height - 0.5;
    x.set(xPos);
    y.set(yPos);
  };

  const reset = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouse}
      onMouseLeave={reset}
      style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

// Animated counter that counts up
const AnimatedCounter = ({ value, duration = 2 }) => {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  useEffect(() => {
    if (!isInView) return;
    
    let start = 0;
    const end = parseInt(value);
    const incrementTime = (duration * 1000) / end;
    
    const timer = setInterval(() => {
      start += 1;
      setCount(start);
      if (start >= end) clearInterval(timer);
    }, Math.max(incrementTime, 20));

    return () => clearInterval(timer);
  }, [isInView, value, duration]);

  return <span ref={ref}>{count}</span>;
};

// Text reveal animation - word by word
const RevealText = ({ children, className, delay = 0 }) => {
  const words = children.split(' ');
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  return (
    <span ref={ref} className={className}>
      {words.map((word, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 20, filter: 'blur(10px)' }}
          animate={isInView ? { opacity: 1, y: 0, filter: 'blur(0px)' } : {}}
          transition={{ duration: 0.5, delay: delay + i * 0.08 }}
          className="inline-block mr-[0.25em]"
        >
          {word}
        </motion.span>
      ))}
    </span>
  );
};

// Floating card that drifts
const FloatingCard = ({ children, className, delay = 0 }) => {
  return (
    <motion.div
      animate={{ 
        y: [0, -10, 0],
        rotate: [0, 1, 0, -1, 0],
      }}
      transition={{ 
        duration: 6,
        repeat: Infinity,
        delay,
        ease: 'easeInOut'
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

// Glowing orb that follows scroll
const GlowOrb = ({ scrollYProgress, color, size, startPos, endPos }) => {
  const x = useTransform(scrollYProgress, [0, 1], [startPos.x, endPos.x]);
  const y = useTransform(scrollYProgress, [0, 1], [startPos.y, endPos.y]);
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [1, 1.5, 0.8]);

  return (
    <motion.div
      style={{ x, y, scale }}
      className={`absolute rounded-full blur-[100px] pointer-events-none`}
      initial={{ width: size, height: size, backgroundColor: color }}
    />
  );
};

export default function Landing() {
  const { isAuthenticated } = useAuth();
  const [stats, setStats] = useState({ total_users: 0, cards_listed: 0, active_trades: 0, active_razzes: 0 });
  const [liveCards, setLiveCards] = useState([]);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);
  const heroRef = useRef(null);
  const isHeroInView = useInView(heroRef, { once: true });
  
  const { scrollYProgress } = useScroll();
  const smoothProgress = useSpring(scrollYProgress, { stiffness: 100, damping: 30 });

  // Parallax values
  const heroY = useTransform(smoothProgress, [0, 0.3], [0, -150]);
  const heroOpacity = useTransform(smoothProgress, [0, 0.2], [1, 0]);
  const cardsY = useTransform(smoothProgress, [0.1, 0.4], [100, 0]);
  const cardsOpacity = useTransform(smoothProgress, [0.1, 0.25], [0, 1]);

  // Track mouse for ambient effects
  useEffect(() => {
    const handleMouse = (e) => {
      setMousePosition({ 
        x: (e.clientX / window.innerWidth) - 0.5,
        y: (e.clientY / window.innerHeight) - 0.5 
      });
    };
    window.addEventListener('mousemove', handleMouse);
    return () => window.removeEventListener('mousemove', handleMouse);
  }, []);

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
  }, []);

  return (
    <div ref={containerRef} className="bg-[#030303] text-white overflow-x-hidden">
      {/* Dynamic gradient background that responds to scroll */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <motion.div 
          className="absolute w-[800px] h-[800px] rounded-full opacity-30"
          style={{
            background: 'radial-gradient(circle, rgba(188,255,0,0.15) 0%, transparent 70%)',
            x: useTransform(smoothProgress, [0, 1], ['10%', '60%']),
            y: useTransform(smoothProgress, [0, 1], ['-20%', '40%']),
          }}
        />
        <motion.div 
          className="absolute w-[600px] h-[600px] rounded-full opacity-20"
          style={{
            background: 'radial-gradient(circle, rgba(139,92,246,0.2) 0%, transparent 70%)',
            x: useTransform(smoothProgress, [0, 1], ['70%', '20%']),
            y: useTransform(smoothProgress, [0, 1], ['30%', '80%']),
          }}
        />
        {/* Subtle grid */}
        <div 
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '100px 100px'
          }}
        />
      </div>

      {/* Navigation */}
      <motion.nav 
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="fixed top-0 left-0 right-0 z-50 px-4 py-4"
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <motion.div 
              whileHover={{ scale: 1.1, rotate: 5 }}
              className="w-10 h-10 rounded-xl bg-[#BCFF00] flex items-center justify-center shadow-[0_0_30px_rgba(188,255,0,0.4)]"
            >
              <span className="font-bold text-black text-lg">S</span>
            </motion.div>
            <span className="font-semibold text-lg">Slabby</span>
          </Link>
          
          <div className="hidden md:flex items-center gap-8">
            <Link to="/marketplace" className="text-sm text-zinc-400 hover:text-white transition-colors relative group">
              Marketplace
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#BCFF00] group-hover:w-full transition-all duration-300" />
            </Link>
            <Link to="/razz" className="text-sm text-zinc-400 hover:text-white transition-colors relative group">
              Live Razz
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#BCFF00] group-hover:w-full transition-all duration-300" />
            </Link>
          </div>
          
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <MagneticButton>
                <Link to="/marketplace">
                  <Button className="bg-[#BCFF00] text-black font-semibold hover:bg-[#d4ff4d] shadow-[0_0_30px_rgba(188,255,0,0.3)]">
                    Open App <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </MagneticButton>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost" className="text-zinc-400 hover:text-white">Sign In</Button>
                </Link>
                <MagneticButton>
                  <Link to="/register">
                    <Button className="bg-[#BCFF00] text-black font-semibold hover:bg-[#d4ff4d] shadow-[0_0_30px_rgba(188,255,0,0.3)]">
                      Get Started
                    </Button>
                  </Link>
                </MagneticButton>
              </>
            )}
          </div>
        </div>
      </motion.nav>

      {/* HERO - Immersive fullscreen */}
      <section ref={heroRef} className="relative min-h-screen flex items-center justify-center px-6">
        <motion.div style={{ y: heroY, opacity: heroOpacity }} className="relative z-10 text-center max-w-4xl">
          {/* Animated badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={isHeroInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-8"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#BCFF00] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#BCFF00]"></span>
            </span>
            <span className="text-sm text-zinc-300">Now with Provably Fair Razz</span>
          </motion.div>

          {/* Main headline with word-by-word reveal */}
          <h1 className="text-5xl sm:text-7xl lg:text-8xl font-bold tracking-tight mb-6 leading-[0.95]">
            <RevealText className="block text-white">The Future of</RevealText>
            <RevealText delay={0.3} className="block text-transparent bg-clip-text bg-gradient-to-r from-[#BCFF00] via-emerald-400 to-[#BCFF00] animate-gradient">
              Card Trading
            </RevealText>
          </h1>

          {/* Subtitle */}
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={isHeroInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.8, duration: 0.6 }}
            className="text-lg sm:text-xl text-zinc-400 mb-10 max-w-2xl mx-auto"
          >
            P2P marketplace with provably fair raffles. 
            <span className="text-white"> Every trade protected.</span>
            <span className="text-[#BCFF00]"> Every draw verifiable.</span>
          </motion.p>

          {/* CTA Buttons */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={isHeroInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 1, duration: 0.6 }}
            className="flex flex-col sm:flex-row gap-4 justify-center mb-16"
          >
            <MagneticButton>
              <Link to="/register">
                <Button size="lg" className="bg-[#BCFF00] text-black font-semibold hover:bg-[#d4ff4d] h-14 px-8 text-base shadow-[0_0_60px_rgba(188,255,0,0.4)] hover:shadow-[0_0_80px_rgba(188,255,0,0.6)] transition-all">
                  Start Trading Free <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            </MagneticButton>
            <Link to="/razz">
              <Button size="lg" variant="outline" className="border-white/20 bg-white/5 hover:bg-white/10 h-14 px-8 text-base backdrop-blur-sm group">
                <Play className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" /> Watch Live Razz
              </Button>
            </Link>
          </motion.div>

          {/* Scroll indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2"
          >
            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="flex flex-col items-center gap-2 text-zinc-500"
            >
              <span className="text-xs">Scroll to explore</span>
              <ChevronDown className="w-5 h-5" />
            </motion.div>
          </motion.div>
        </motion.div>

        {/* 3D Floating Cards around hero */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <FloatingCard delay={0} className="absolute top-[20%] left-[10%] hidden lg:block">
            <TiltCard className="w-32 h-44 rounded-2xl bg-gradient-to-br from-zinc-800 to-zinc-900 border border-white/10 shadow-2xl flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-[#BCFF00]/40" />
            </TiltCard>
          </FloatingCard>
          <FloatingCard delay={1} className="absolute top-[30%] right-[8%] hidden lg:block">
            <TiltCard className="w-28 h-40 rounded-2xl bg-gradient-to-br from-violet-900/50 to-purple-900/50 border border-violet-500/20 shadow-2xl flex items-center justify-center">
              <Dice6 className="w-8 h-8 text-violet-400/40" />
            </TiltCard>
          </FloatingCard>
          <FloatingCard delay={2} className="absolute bottom-[25%] left-[15%] hidden lg:block">
            <TiltCard className="w-24 h-32 rounded-xl bg-gradient-to-br from-emerald-900/50 to-teal-900/50 border border-emerald-500/20 shadow-2xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-emerald-400/40" />
            </TiltCard>
          </FloatingCard>
        </div>
      </section>

      {/* LIVE STATS - Animated counters */}
      <section className="relative py-16 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { label: 'Active Traders', value: stats.total_users || 15, icon: '👥', color: '#BCFF00' },
              { label: 'Cards Listed', value: stats.cards_listed || 247, icon: '🃏', color: '#10b981' },
              { label: 'Active Trades', value: stats.active_trades || 38, icon: '🔄', color: '#8b5cf6' },
              { label: 'Live Razzes', value: stats.active_razzes || 12, icon: '🎲', color: '#f59e0b' },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ scale: 1.05, y: -5 }}
                className="relative group cursor-pointer"
              >
                <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" 
                     style={{ background: `radial-gradient(circle at center, ${stat.color}15 0%, transparent 70%)` }} />
                <div className="relative p-6 rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-sm text-center">
                  <span className="text-3xl mb-2 block">{stat.icon}</span>
                  <p className="text-4xl md:text-5xl font-bold mb-1" style={{ color: stat.color }}>
                    <AnimatedCounter value={stat.value} />
                  </p>
                  <p className="text-sm text-zinc-500">{stat.label}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES - Interactive cards */}
      <section className="relative py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-3">
              <RevealText>Why collectors choose Slabby</RevealText>
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-4">
            {[
              { 
                icon: Shuffle, 
                title: 'P2P Trading', 
                desc: 'Trade directly with collectors. Multi-card deals with cash combinations. Full escrow protection on every transaction.',
                color: '#10b981',
                gradient: 'from-emerald-500/20 to-transparent'
              },
              { 
                icon: Dice6, 
                title: 'Provably Fair Razz', 
                desc: 'Every raffle uses SHA256 cryptographic hashing. Verify any draw yourself. Math doesn\'t lie.',
                color: '#8b5cf6',
                gradient: 'from-violet-500/20 to-transparent'
              },
              { 
                icon: Lock, 
                title: 'Secure Escrow', 
                desc: 'Bank-level security. Funds held safely until both parties confirm. Zero trust required.',
                color: '#f59e0b',
                gradient: 'from-amber-500/20 to-transparent'
              },
              { 
                icon: Zap, 
                title: 'Instant Settlement', 
                desc: 'No waiting for payments. Trades complete in seconds. Withdraw to your bank anytime.',
                color: '#ef4444',
                gradient: 'from-rose-500/20 to-transparent'
              },
            ].map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ scale: 1.02 }}
                className="group relative"
              >
                <TiltCard className={`p-6 rounded-2xl border border-white/5 bg-gradient-to-br ${feature.gradient} backdrop-blur-sm cursor-pointer h-full`}>
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110"
                    style={{ backgroundColor: `${feature.color}20` }}
                  >
                    <feature.icon className="w-6 h-6" style={{ color: feature.color }} />
                  </div>
                  <h3 className="text-xl font-semibold mb-2 group-hover:text-white transition-colors">{feature.title}</h3>
                  <p className="text-sm text-zinc-400 leading-relaxed">{feature.desc}</p>
                </TiltCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS - Visual journey */}
      <section className="relative py-20 px-6 overflow-hidden">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row gap-8 items-stretch">
            {[
              { step: '01', title: 'List', desc: 'Upload your cards with photos. Set your price or open for offers.', color: '#BCFF00' },
              { step: '02', title: 'Trade', desc: 'Accept trades, negotiate deals, or host a provably fair razz.', color: '#8b5cf6' },
              { step: '03', title: 'Profit', desc: 'Get paid instantly. Withdraw to your bank whenever you want.', color: '#10b981' },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.2 }}
                className="flex-1 relative"
              >
                {/* Connector line */}
                {i < 2 && (
                  <div className="hidden md:block absolute top-1/2 -right-4 w-8 h-0.5 bg-gradient-to-r from-white/20 to-transparent" />
                )}
                <div className="h-full p-6 rounded-2xl border border-white/5 bg-white/[0.02] relative overflow-hidden group hover:border-white/10 transition-colors">
                  <div className="absolute top-0 right-0 text-[120px] font-bold leading-none opacity-[0.03] group-hover:opacity-[0.06] transition-opacity"
                       style={{ color: item.color }}>
                    {item.step}
                  </div>
                  <span className="text-sm font-mono mb-4 block" style={{ color: item.color }}>{item.step}</span>
                  <h3 className="text-2xl font-bold mb-2">{item.title}</h3>
                  <p className="text-sm text-zinc-400">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS - Auto-rotating */}
      <section className="relative py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { name: 'Mike R.', text: 'The escrow system is bulletproof. Finally a platform that gets trading right.', avatar: '🧑' },
              { name: 'Sarah K.', text: 'Won my first Razz and verified it myself. 100% legit provably fair.', avatar: '👩' },
              { name: 'James T.', text: 'Sold 3 cards in my first week. The P2P system is incredibly smooth.', avatar: '👨' },
            ].map((t, i) => (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ y: -5 }}
                className="p-5 rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-sm"
              >
                <div className="flex gap-1 mb-3">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} className="w-4 h-4 fill-[#BCFF00] text-[#BCFF00]" />
                  ))}
                </div>
                <p className="text-sm text-zinc-300 mb-4 leading-relaxed">"{t.text}"</p>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{t.avatar}</span>
                  <span className="text-sm text-zinc-500">{t.name}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="relative py-24 px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto text-center relative"
        >
          {/* Glow */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#BCFF00]/10 via-transparent to-violet-500/10 rounded-3xl blur-3xl" />
          
          <div className="relative p-12 rounded-3xl border border-white/5 bg-black/40 backdrop-blur-xl">
            <h2 className="text-4xl sm:text-5xl font-bold mb-4">
              <RevealText>Ready to join?</RevealText>
            </h2>
            <p className="text-lg text-zinc-400 mb-8 max-w-xl mx-auto">
              Start trading with the next generation of collectors. Zero fees. Complete transparency.
            </p>
            <MagneticButton className="inline-block">
              <Link to="/register">
                <Button size="lg" className="bg-[#BCFF00] text-black font-semibold hover:bg-[#d4ff4d] h-14 px-10 text-base shadow-[0_0_60px_rgba(188,255,0,0.4)]">
                  Create Free Account <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            </MagneticButton>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
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

      {/* Custom CSS for gradient animation */}
      <style>{`
        @keyframes gradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .animate-gradient {
          background-size: 200% auto;
          animation: gradient 4s ease infinite;
        }
      `}</style>
    </div>
  );
}
