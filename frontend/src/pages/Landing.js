import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useEffect, useRef, useState } from 'react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import Lenis from '@studio-freight/lenis';
import { ArrowRight, Sparkles, Shield, Shuffle, Dice6, Wallet, TrendingUp, ChevronRight, Play } from 'lucide-react';
import { Button } from '../components/ui/button';

export default function Landing() {
  const { isAuthenticated } = useAuth();
  const containerRef = useRef(null);
  const heroRef = useRef(null);
  const [hoveredFeature, setHoveredFeature] = useState(null);
  
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });
  
  const heroOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.2], [1, 0.95]);

  // Smooth scrolling with Lenis
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      smoothWheel: true,
    });

    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    return () => lenis.destroy();
  }, []);

  const features = [
    {
      id: 'trade',
      icon: Shuffle,
      title: 'P2P Trading',
      description: 'Direct collector-to-collector trades with multi-asset escrow protection.',
      span: 'md:col-span-2',
    },
    {
      id: 'razz',
      icon: Dice6,
      title: 'Provably Fair Razz',
      description: 'Cryptographic verification. SHA256 transparency.',
      span: 'md:col-span-1',
    },
    {
      id: 'wallet',
      icon: Wallet,
      title: 'Secure Wallet',
      description: 'Instant deposits. Protected withdrawals.',
      span: 'md:col-span-1',
    },
    {
      id: 'audit',
      icon: Shield,
      title: 'Event-Sourced',
      description: 'Every action recorded immutably. Complete audit trail.',
      span: 'md:col-span-2',
    },
  ];

  const stats = [
    { value: '0%', label: 'Platform Fees', suffix: '' },
    { value: '100', label: 'Provably Fair', suffix: '%' },
    { value: '24/7', label: 'Always Open', suffix: '' },
    { value: '<1s', label: 'Settlement', suffix: '' },
  ];

  return (
    <div ref={containerRef} className="min-h-screen bg-[#050508] text-white overflow-hidden" data-testid="landing-page">
      {/* Crystal Glass Navigation */}
      <motion.nav 
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="fixed top-0 left-0 right-0 z-50 bg-black/60 backdrop-blur-2xl border-b border-white/10"
      >
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group" data-testid="logo-link">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#00E5FF] to-[#00B4D8] flex items-center justify-center shadow-[0_0_20px_rgba(0,229,255,0.3)] transition-shadow duration-300 group-hover:shadow-[0_0_30px_rgba(0,229,255,0.5)]">
              <span className="font-heading font-semibold text-black text-sm">S</span>
            </div>
            <span className="font-heading font-medium text-xl tracking-tight">Slabby</span>
          </Link>
          
          <div className="hidden md:flex items-center gap-8">
            <Link to="/marketplace" className="text-sm text-zinc-400 hover:text-white transition-colors">Marketplace</Link>
            <Link to="/razz" className="text-sm text-zinc-400 hover:text-white transition-colors">Razz</Link>
          </div>
          
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <Link to="/marketplace">
                <Button className="bg-[#00E5FF] text-black font-medium hover:bg-[#80F2FF] shadow-[0_0_20px_rgba(0,229,255,0.3)] transition-all" data-testid="go-to-app-btn">
                  Open App
                </Button>
              </Link>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost" className="text-sm text-zinc-400 hover:text-white" data-testid="login-btn">
                    Sign In
                  </Button>
                </Link>
                <Link to="/register">
                  <Button className="bg-[#00E5FF] text-black font-medium hover:bg-[#80F2FF] shadow-[0_0_20px_rgba(0,229,255,0.3)] transition-all" data-testid="get-started-btn">
                    Get Started
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <motion.section 
        ref={heroRef}
        style={{ opacity: heroOpacity, scale: heroScale }}
        className="relative min-h-screen flex items-center justify-center pt-20"
      >
        {/* Ambient Background */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#00E5FF]/20 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#00B4D8]/15 rounded-full blur-[120px] animate-pulse delay-1000" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 py-20">
          <div className="text-center max-w-4xl mx-auto">
            {/* Badge */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md mb-8"
            >
              <Sparkles className="w-4 h-4 text-[#00E5FF]" />
              <span className="text-sm text-zinc-300">Event-Sourced Architecture</span>
            </motion.div>

            {/* Main Headline */}
            <motion.h1 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="font-heading text-5xl sm:text-6xl lg:text-7xl tracking-tighter font-medium mb-6"
            >
              Trade. Razz.{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00E5FF] to-[#00B4D8]">
                Collect.
              </span>
            </motion.h1>

            {/* Subheadline */}
            <motion.p 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="text-lg sm:text-xl text-zinc-400 mb-12 max-w-2xl mx-auto leading-relaxed"
            >
              The premier P2P trading and provably fair razz platform for collectible cards. 
              Every transaction is transparent. Every draw is verifiable.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              {isAuthenticated ? (
                <Link to="/marketplace">
                  <Button size="lg" className="bg-[#00E5FF] text-black font-medium hover:bg-[#80F2FF] shadow-[0_0_30px_rgba(0,229,255,0.4)] hover:shadow-[0_0_40px_rgba(0,229,255,0.6)] transition-all px-8 h-14 text-base" data-testid="hero-cta-btn">
                    Enter Marketplace
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
              ) : (
                <>
                  <Link to="/register">
                    <Button size="lg" className="bg-[#00E5FF] text-black font-medium hover:bg-[#80F2FF] shadow-[0_0_30px_rgba(0,229,255,0.4)] hover:shadow-[0_0_40px_rgba(0,229,255,0.6)] transition-all px-8 h-14 text-base" data-testid="hero-cta-btn">
                      Start Trading Free
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                  </Link>
                  <Button size="lg" variant="outline" className="border-white/20 bg-white/5 hover:bg-white/10 backdrop-blur-md px-8 h-14 text-base" data-testid="hero-secondary-btn">
                    <Play className="w-5 h-5 mr-2" />
                    Watch Demo
                  </Button>
                </>
              )}
            </motion.div>
          </div>

          {/* Floating Card Preview */}
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="mt-20 relative"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-[#050508] via-transparent to-transparent z-10 pointer-events-none" />
            <div className="relative mx-auto max-w-4xl aspect-[16/9] rounded-2xl overflow-hidden border border-white/10 bg-[#0A0A0E] shadow-2xl">
              <img 
                src="https://images.pexels.com/photos/8811594/pexels-photo-8811594.jpeg?auto=compress&cs=tinysrgb&w=1200"
                alt="Premium collectible cards"
                className="w-full h-full object-cover opacity-60"
              />
              <div className="absolute inset-0 bg-gradient-to-br from-[#00E5FF]/10 to-transparent" />
            </div>
          </motion.div>
        </div>

        {/* Scroll Indicator */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <motion.div 
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            className="w-6 h-10 rounded-full border-2 border-white/20 flex items-start justify-center p-2"
          >
            <motion.div className="w-1.5 h-1.5 rounded-full bg-[#00E5FF]" />
          </motion.div>
        </motion.div>
      </motion.section>

      {/* Stats Section */}
      <section className="relative py-24 border-y border-white/10 bg-[#0A0A0E]/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <motion.div 
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="text-center"
              >
                <div className="font-heading text-4xl sm:text-5xl lg:text-6xl font-medium tracking-tight text-white mb-2">
                  {stat.value}
                  <span className="text-[#00E5FF]">{stat.suffix}</span>
                </div>
                <div className="text-sm text-zinc-500 uppercase tracking-[0.2em]">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Bento Grid */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl tracking-tight font-medium mb-4">
              Built for Serious Collectors
            </h2>
            <p className="text-zinc-400 max-w-2xl mx-auto">
              Enterprise-grade infrastructure meets collector-first design.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                onMouseEnter={() => setHoveredFeature(feature.id)}
                onMouseLeave={() => setHoveredFeature(null)}
                className={`${feature.span} relative group cursor-pointer`}
              >
                <div className={`
                  h-full p-8 rounded-2xl border transition-all duration-500 ease-out
                  ${hoveredFeature === feature.id 
                    ? 'bg-[#0A0A0E] border-[#00E5FF]/30 shadow-[0_8px_32px_rgba(0,229,255,0.1)] -translate-y-1' 
                    : 'bg-[#0A0A0E]/50 border-white/5'}
                `}>
                  <div className={`
                    w-12 h-12 rounded-xl flex items-center justify-center mb-6 transition-all duration-300
                    ${hoveredFeature === feature.id ? 'bg-[#00E5FF]/20' : 'bg-white/5'}
                  `}>
                    <feature.icon className={`w-6 h-6 transition-colors duration-300 ${hoveredFeature === feature.id ? 'text-[#00E5FF]' : 'text-zinc-400'}`} />
                  </div>
                  <h3 className="font-heading text-xl font-medium mb-2">{feature.title}</h3>
                  <p className="text-sm text-zinc-400 leading-relaxed">{feature.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 px-6 bg-[#0A0A0E]/30">
        <div className="max-w-7xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="font-heading text-3xl sm:text-4xl tracking-tight font-medium mb-4">
              How Slabby Works
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: '01', title: 'List Your Cards', desc: 'Upload photos, set your price. Accept trades, cash, or both.' },
              { step: '02', title: 'Trade or Razz', desc: 'Negotiate P2P trades or host provably fair raffles.' },
              { step: '03', title: 'Ship & Settle', desc: 'Escrow protects both parties. Funds release on confirmation.' },
            ].map((item, index) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.15 }}
                className="text-center group"
              >
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/5 border border-white/10 mb-6 group-hover:border-[#00E5FF]/30 group-hover:bg-[#00E5FF]/5 transition-all duration-300">
                  <span className="font-heading text-2xl font-medium text-[#00E5FF]">{item.step}</span>
                </div>
                <h3 className="font-heading text-xl font-medium mb-3">{item.title}</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-32 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="font-heading text-4xl sm:text-5xl tracking-tight font-medium mb-6">
              Ready to Start Trading?
            </h2>
            <p className="text-zinc-400 mb-10 max-w-2xl mx-auto">
              Join the next generation of card collecting. Zero listing fees. Full transparency.
            </p>
            {!isAuthenticated && (
              <Link to="/register">
                <Button size="lg" className="bg-[#00E5FF] text-black font-medium hover:bg-[#80F2FF] shadow-[0_0_30px_rgba(0,229,255,0.4)] hover:shadow-[0_0_40px_rgba(0,229,255,0.6)] transition-all px-10 h-14 text-base" data-testid="final-cta-btn">
                  Create Free Account
                  <ChevronRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            )}
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#00E5FF] to-[#00B4D8] flex items-center justify-center">
              <span className="font-heading font-semibold text-black text-xs">S</span>
            </div>
            <span className="font-heading font-medium text-white">Slabby</span>
          </div>
          <p className="text-sm text-zinc-500">
            © 2026 Slabby. Project Marvel. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
