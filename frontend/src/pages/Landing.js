import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useEffect, useRef, useState } from 'react';
import { motion, useScroll, useTransform, useSpring, useMotionValue, useInView } from 'framer-motion';
import { ArrowRight, Sparkles, Shield, Shuffle, Dice6, Wallet, Zap, Lock, Star, Play } from 'lucide-react';
import { Button } from '../components/ui/button';
import api from '../lib/api';

// Premium card images
const CARD_IMAGES = [
  'https://static.prod-images.emergentagent.com/jobs/78a8fc0a-353a-4be0-91c8-507f76e46f1e/images/a5cc9e9a7d15dedbf89b5ac97ef3f5a5d8271d814fbc15a9ba9459ce3a780a0e.png',
  'https://static.prod-images.emergentagent.com/jobs/78a8fc0a-353a-4be0-91c8-507f76e46f1e/images/3ab472c3ad3e48bc2105db75ea78bcc2a75555a9426b30c8d6302c42e353aa3f.png',
  'https://static.prod-images.emergentagent.com/jobs/78a8fc0a-353a-4be0-91c8-507f76e46f1e/images/0c3fddbc8797bcfe269fb488c85008a17520020f11effcbc3504a0c8cb4d9a13.png',
];

// 3D Tilt Card with mouse tracking
const TiltCard = ({ children, className, intensity = 15 }) => {
  const ref = useRef(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [intensity, -intensity]), { stiffness: 300, damping: 30 });
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-intensity, intensity]), { stiffness: 300, damping: 30 });

  const handleMouse = (e) => {
    const rect = ref.current.getBoundingClientRect();
    x.set((e.clientX - rect.left) / rect.width - 0.5);
    y.set((e.clientY - rect.top) / rect.height - 0.5);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouse}
      onMouseLeave={() => { x.set(0); y.set(0); }}
      style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

// Animated counter
const Counter = ({ value, suffix = '' }) => {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { margin: '-100px' });

  useEffect(() => {
    if (!isInView) { setCount(0); return; }
    let start = 0;
    const end = parseInt(value) || 0;
    if (end === 0) return;
    const duration = 1500;
    const increment = end / (duration / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= end) { setCount(end); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [isInView, value]);

  return <span ref={ref}>{count}{suffix}</span>;
};

// Scroll-triggered section with repeating animations
const ScrollSection = ({ children, className }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { margin: '-20%', amount: 0.3 });
  
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 60 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 60 }}
      transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

// Sticky card showcase (Apple style)
const StickyCardShowcase = () => {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  const card1Y = useTransform(scrollYProgress, [0, 0.33], [0, -50]);
  const card1Rotate = useTransform(scrollYProgress, [0, 0.33], [-8, 0]);
  const card1Scale = useTransform(scrollYProgress, [0, 0.33], [0.9, 1]);

  const card2Y = useTransform(scrollYProgress, [0.2, 0.5], [100, 0]);
  const card2Rotate = useTransform(scrollYProgress, [0.2, 0.5], [8, 0]);
  const card2Scale = useTransform(scrollYProgress, [0.2, 0.5], [0.85, 1]);
  const card2Opacity = useTransform(scrollYProgress, [0.15, 0.35], [0, 1]);

  const card3Y = useTransform(scrollYProgress, [0.4, 0.7], [150, 0]);
  const card3Rotate = useTransform(scrollYProgress, [0.4, 0.7], [-5, 0]);
  const card3Scale = useTransform(scrollYProgress, [0.4, 0.7], [0.8, 1]);
  const card3Opacity = useTransform(scrollYProgress, [0.35, 0.55], [0, 1]);

  return (
    <div ref={containerRef} className="relative h-[300vh]">
      <div className="sticky top-0 h-screen flex items-center justify-center overflow-hidden">
        <div className="relative w-full max-w-lg h-[500px]">
          {/* Card 1 */}
          <motion.div
            style={{ y: card1Y, rotate: card1Rotate, scale: card1Scale }}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-48 md:w-56"
          >
            <TiltCard className="relative">
              <div className="rounded-2xl overflow-hidden shadow-2xl shadow-black/50 border border-white/10">
                <img src={CARD_IMAGES[0]} alt="Premium Card" className="w-full aspect-[3/4] object-cover" />
              </div>
              <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/80 backdrop-blur-xl rounded-full border border-white/10">
                <span className="text-[#BCFF00] font-bold text-sm">$2,499</span>
              </div>
            </TiltCard>
          </motion.div>

          {/* Card 2 */}
          <motion.div
            style={{ y: card2Y, rotate: card2Rotate, scale: card2Scale, opacity: card2Opacity }}
            className="absolute left-[15%] top-1/2 -translate-y-1/2 w-40 md:w-48"
          >
            <TiltCard className="relative">
              <div className="rounded-2xl overflow-hidden shadow-2xl shadow-black/50 border border-white/10">
                <img src={CARD_IMAGES[1]} alt="Vintage Card" className="w-full aspect-[3/4] object-cover" />
              </div>
              <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-black/80 backdrop-blur-xl rounded-full border border-white/10">
                <span className="text-[#BCFF00] font-bold text-xs">$1,899</span>
              </div>
            </TiltCard>
          </motion.div>

          {/* Card 3 */}
          <motion.div
            style={{ y: card3Y, rotate: card3Rotate, scale: card3Scale, opacity: card3Opacity }}
            className="absolute right-[15%] top-1/2 -translate-y-1/2 w-40 md:w-48"
          >
            <TiltCard className="relative">
              <div className="rounded-2xl overflow-hidden shadow-2xl shadow-black/50 border border-white/10">
                <img src={CARD_IMAGES[2]} alt="Rare Card" className="w-full aspect-[3/4] object-cover" />
              </div>
              <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-black/80 backdrop-blur-xl rounded-full border border-white/10">
                <span className="text-[#BCFF00] font-bold text-xs">$3,299</span>
              </div>
            </TiltCard>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default function Landing() {
  const { isAuthenticated } = useAuth();
  const [stats, setStats] = useState({ total_users: 0, cards_listed: 0, active_trades: 0, active_razzes: 0 });
  const containerRef = useRef(null);
  
  const { scrollYProgress } = useScroll();
  const smoothScroll = useSpring(scrollYProgress, { stiffness: 100, damping: 30 });
  
  // Hero parallax
  const heroY = useTransform(smoothScroll, [0, 0.15], [0, -100]);
  const heroOpacity = useTransform(smoothScroll, [0, 0.15], [1, 0]);
  const heroScale = useTransform(smoothScroll, [0, 0.15], [1, 0.95]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes] = await Promise.all([api.get('/stats')]);
        setStats(statsRes.data);
      } catch (e) { console.error('Failed to fetch'); }
    };
    fetchData();
  }, []);

  return (
    <div ref={containerRef} className="bg-[#000000] text-white">
      {/* Ambient light */}
      <div className="fixed inset-0 pointer-events-none">
        <motion.div
          style={{ y: useTransform(smoothScroll, [0, 1], ['0%', '50%']) }}
          className="absolute top-[-20%] left-[20%] w-[600px] h-[600px] bg-[#BCFF00]/8 rounded-full blur-[150px]"
        />
        <motion.div
          style={{ y: useTransform(smoothScroll, [0, 1], ['0%', '30%']) }}
          className="absolute top-[30%] right-[10%] w-[400px] h-[400px] bg-violet-500/8 rounded-full blur-[120px]"
        />
      </div>

      {/* Navigation */}
      <motion.nav 
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="fixed top-0 left-0 right-0 z-50 px-6 py-5"
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="w-10 h-10 rounded-xl bg-[#BCFF00] flex items-center justify-center"
            >
              <span className="font-bold text-black text-lg">S</span>
            </motion.div>
            <span className="font-semibold text-lg hidden sm:block">Slabby</span>
          </Link>
          
          <div className="flex items-center gap-6">
            <Link to="/marketplace" className="text-sm text-zinc-400 hover:text-white transition-colors hidden md:block">Marketplace</Link>
            <Link to="/razz" className="text-sm text-zinc-400 hover:text-white transition-colors hidden md:block">Live Razz</Link>
            {isAuthenticated ? (
              <Link to="/marketplace">
                <Button className="bg-[#BCFF00] text-black font-medium hover:bg-[#d4ff4d]">
                  Open App
                </Button>
              </Link>
            ) : (
              <Link to="/register">
                <Button className="bg-[#BCFF00] text-black font-medium hover:bg-[#d4ff4d]">
                  Get Started
                </Button>
              </Link>
            )}
          </div>
        </div>
      </motion.nav>

      {/* HERO */}
      <section className="relative min-h-screen flex items-center justify-center px-6 overflow-hidden">
        <motion.div 
          style={{ y: heroY, opacity: heroOpacity, scale: heroScale }}
          className="relative z-10 text-center max-w-4xl pt-20"
        >
          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="text-5xl sm:text-7xl lg:text-8xl font-bold tracking-tight leading-[0.95] mb-6"
          >
            The Future of
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#BCFF00] to-emerald-400">
              Card Trading
            </span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="text-lg sm:text-xl text-zinc-400 mb-10 max-w-xl mx-auto"
          >
            P2P marketplace with provably fair raffles.
            <span className="text-white"> Every trade protected.</span>
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.7 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link to="/register">
              <Button size="lg" className="bg-[#BCFF00] text-black font-semibold hover:bg-[#d4ff4d] h-14 px-8 text-base shadow-[0_0_60px_rgba(188,255,0,0.3)]">
                Start Trading <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <Link to="/razz">
              <Button size="lg" variant="outline" className="border-white/20 bg-white/5 hover:bg-white/10 h-14 px-8">
                <Play className="w-5 h-5 mr-2" /> Live Razz
              </Button>
            </Link>
          </motion.div>
        </motion.div>

        {/* Scroll indicator - minimal, animated line */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={{ scaleY: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="w-[1px] h-12 bg-gradient-to-b from-transparent via-[#BCFF00] to-transparent"
          />
        </motion.div>
      </section>

      {/* STICKY CARD SHOWCASE */}
      <StickyCardShowcase />

      {/* STATS */}
      <section className="relative py-32 px-6">
        <div className="max-w-5xl mx-auto">
          <ScrollSection>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {[
                { label: 'Active Traders', value: stats.total_users || 847, color: '#BCFF00' },
                { label: 'Cards Listed', value: stats.cards_listed || 12453, color: '#10b981' },
                { label: 'Trades Completed', value: stats.active_trades || 3891, color: '#8b5cf6' },
                { label: 'In Razz Prizes', value: stats.active_razzes || 156, prefix: '$', suffix: 'K', color: '#f59e0b' },
              ].map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ margin: '-50px' }}
                  transition={{ delay: i * 0.1 }}
                  className="text-center"
                >
                  <p className="text-4xl md:text-5xl font-bold mb-2" style={{ color: stat.color }}>
                    {stat.prefix}<Counter value={stat.value} />{stat.suffix}
                  </p>
                  <p className="text-sm text-zinc-500">{stat.label}</p>
                </motion.div>
              ))}
            </div>
          </ScrollSection>
        </div>
      </section>

      {/* FEATURES */}
      <section className="relative py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <ScrollSection className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold mb-4">Why Slabby</h2>
            <p className="text-zinc-400 max-w-xl mx-auto">Built for collectors who demand transparency</p>
          </ScrollSection>

          <div className="grid md:grid-cols-2 gap-6">
            {[
              { icon: Shuffle, title: 'P2P Trading', desc: 'Trade directly. Multi-card deals with escrow protection on every transaction.', color: '#10b981', gradient: 'from-emerald-500/20' },
              { icon: Dice6, title: 'Provably Fair Razz', desc: 'SHA256 cryptographic hashing. Verify any draw yourself. Math doesn\'t lie.', color: '#8b5cf6', gradient: 'from-violet-500/20' },
              { icon: Lock, title: 'Secure Escrow', desc: 'Bank-level security. Funds held until both parties confirm.', color: '#f59e0b', gradient: 'from-amber-500/20' },
              { icon: Zap, title: 'Instant Payouts', desc: 'No waiting. Trades settle in seconds. Withdraw anytime.', color: '#ef4444', gradient: 'from-rose-500/20' },
            ].map((f, i) => (
              <ScrollSection key={f.title}>
                <motion.div
                  whileHover={{ scale: 1.02, y: -5 }}
                  transition={{ duration: 0.3 }}
                  className={`p-8 rounded-3xl border border-white/5 bg-gradient-to-br ${f.gradient} to-transparent backdrop-blur-sm cursor-pointer`}
                >
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5" style={{ backgroundColor: `${f.color}20` }}>
                    <f.icon className="w-7 h-7" style={{ color: f.color }} />
                  </div>
                  <h3 className="text-2xl font-semibold mb-3">{f.title}</h3>
                  <p className="text-zinc-400 leading-relaxed">{f.desc}</p>
                </motion.div>
              </ScrollSection>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="relative py-32 px-6">
        <div className="max-w-4xl mx-auto">
          {[
            { step: '01', title: 'List', desc: 'Upload your cards. Set your price or open for offers.', color: '#BCFF00' },
            { step: '02', title: 'Trade', desc: 'Accept trades, negotiate, or host a provably fair razz.', color: '#8b5cf6' },
            { step: '03', title: 'Profit', desc: 'Get paid instantly. Withdraw to your bank anytime.', color: '#10b981' },
          ].map((item, i) => (
            <ScrollSection key={item.step} className="mb-32 last:mb-0">
              <div className="flex items-start gap-8">
                <motion.span 
                  initial={{ opacity: 0.1 }}
                  whileInView={{ opacity: 0.15 }}
                  viewport={{ margin: '-100px' }}
                  className="text-[150px] md:text-[200px] font-bold leading-none"
                  style={{ color: item.color }}
                >
                  {item.step}
                </motion.span>
                <div className="pt-8 md:pt-16">
                  <h3 className="text-4xl md:text-5xl font-bold mb-4">{item.title}</h3>
                  <p className="text-xl text-zinc-400 max-w-md">{item.desc}</p>
                </div>
              </div>
            </ScrollSection>
          ))}
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="relative py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <ScrollSection>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                { name: 'Mike R.', text: 'The escrow system is bulletproof. Finally a platform that gets it.', avatar: '👨‍💼' },
                { name: 'Sarah K.', text: 'Won my first Razz and verified it myself. 100% legit.', avatar: '👩‍💻' },
                { name: 'James T.', text: 'Sold 3 cards in my first week. Incredibly smooth.', avatar: '🧑‍🎨' },
              ].map((t, i) => (
                <motion.div
                  key={t.name}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ margin: '-50px' }}
                  transition={{ delay: i * 0.15 }}
                  whileHover={{ y: -5 }}
                  className="p-6 rounded-2xl border border-white/5 bg-white/[0.02]"
                >
                  <div className="flex gap-1 mb-4">
                    {[...Array(5)].map((_, j) => <Star key={j} className="w-4 h-4 fill-[#BCFF00] text-[#BCFF00]" />)}
                  </div>
                  <p className="text-zinc-300 mb-4">"{t.text}"</p>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{t.avatar}</span>
                    <span className="text-sm text-zinc-500">{t.name}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </ScrollSection>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-32 px-6">
        <ScrollSection>
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-5xl sm:text-6xl font-bold mb-6">
              Ready to <span className="text-[#BCFF00]">trade?</span>
            </h2>
            <p className="text-xl text-zinc-400 mb-10">
              Join thousands of collectors. Zero fees. Complete transparency.
            </p>
            <Link to="/register">
              <Button size="lg" className="bg-[#BCFF00] text-black font-semibold hover:bg-[#d4ff4d] h-16 px-12 text-lg shadow-[0_0_80px_rgba(188,255,0,0.4)]">
                Create Free Account <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </div>
        </ScrollSection>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 px-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#BCFF00] flex items-center justify-center">
              <span className="font-bold text-black text-sm">S</span>
            </div>
            <span className="font-semibold">Slabby</span>
          </div>
          <div className="flex items-center gap-6 text-xs text-zinc-500">
            <Link to="/marketplace" className="hover:text-white transition-colors">Marketplace</Link>
            <Link to="/razz" className="hover:text-white transition-colors">Razz</Link>
            <span>© 2026</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
