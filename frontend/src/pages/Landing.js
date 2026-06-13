import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, useScroll, useTransform, useSpring, useMotionValue, useVelocity, useAnimationFrame } from 'framer-motion';
import { ArrowRight, Shield, Shuffle, Dice6, Zap, Lock, Play } from 'lucide-react';
import { Button } from '../components/ui/button';
import api from '../lib/api';

const CARD_IMAGES = [
  'https://static.prod-images.emergentagent.com/jobs/78a8fc0a-353a-4be0-91c8-507f76e46f1e/images/a5cc9e9a7d15dedbf89b5ac97ef3f5a5d8271d814fbc15a9ba9459ce3a780a0e.png',
  'https://static.prod-images.emergentagent.com/jobs/78a8fc0a-353a-4be0-91c8-507f76e46f1e/images/3ab472c3ad3e48bc2105db75ea78bcc2a75555a9426b30c8d6302c42e353aa3f.png',
  'https://static.prod-images.emergentagent.com/jobs/78a8fc0a-353a-4be0-91c8-507f76e46f1e/images/0c3fddbc8797bcfe269fb488c85008a17520020f11effcbc3504a0c8cb4d9a13.png',
];

// Particle system that follows cursor
const ParticleField = ({ mouseX, mouseY }) => {
  const canvasRef = useRef(null);
  const particles = useRef([]);
  const animationRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Initialize particles
    for (let i = 0; i < 80; i++) {
      particles.current.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: 0,
        vy: 0,
        size: Math.random() * 2 + 1,
        alpha: Math.random() * 0.5 + 0.2,
      });
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const mx = mouseX.get() * canvas.width;
      const my = mouseY.get() * canvas.height;

      particles.current.forEach((p, i) => {
        // Attraction to cursor
        const dx = mx - p.x;
        const dy = my - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < 200) {
          const force = (200 - dist) / 200;
          p.vx += (dx / dist) * force * 0.5;
          p.vy += (dy / dist) * force * 0.5;
        }

        // Apply velocity with damping
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.95;
        p.vy *= 0.95;

        // Wrap around edges
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        // Draw particle
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(188, 255, 0, ${p.alpha * (dist < 200 ? 1 : 0.3)})`;
        ctx.fill();

        // Draw connections
        particles.current.forEach((p2, j) => {
          if (j <= i) return;
          const d = Math.sqrt((p.x - p2.x) ** 2 + (p.y - p2.y) ** 2);
          if (d < 100) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(188, 255, 0, ${(1 - d / 100) * 0.15})`;
            ctx.stroke();
          }
        });
      });

      animationRef.current = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationRef.current);
    };
  }, [mouseX, mouseY]);

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" />;
};

// Ripple effect on click
const RippleEffect = () => {
  const [ripples, setRipples] = useState([]);

  useEffect(() => {
    const handleClick = (e) => {
      const newRipple = {
        x: e.clientX,
        y: e.clientY,
        id: Date.now(),
      };
      setRipples(prev => [...prev, newRipple]);
      setTimeout(() => {
        setRipples(prev => prev.filter(r => r.id !== newRipple.id));
      }, 1000);
    };
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {ripples.map(ripple => (
        <motion.div
          key={ripple.id}
          initial={{ scale: 0, opacity: 0.5 }}
          animate={{ scale: 4, opacity: 0 }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className="absolute w-24 h-24 rounded-full border border-[#BCFF00]/50"
          style={{ left: ripple.x - 48, top: ripple.y - 48 }}
        />
      ))}
    </div>
  );
};

// Magnetic card that responds to cursor
const MagneticCard = ({ children, className, intensity = 30 }) => {
  const ref = useRef(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);

  const springConfig = { stiffness: 150, damping: 15 };
  const xSpring = useSpring(x, springConfig);
  const ySpring = useSpring(y, springConfig);
  const rotateXSpring = useSpring(rotateX, springConfig);
  const rotateYSpring = useSpring(rotateY, springConfig);

  const handleMouse = useCallback((e) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const deltaX = e.clientX - centerX;
    const deltaY = e.clientY - centerY;
    
    x.set(deltaX * 0.1);
    y.set(deltaY * 0.1);
    rotateX.set(deltaY * -0.05);
    rotateY.set(deltaX * 0.05);
  }, [x, y, rotateX, rotateY]);

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
    rotateX.set(0);
    rotateY.set(0);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouse}
      onMouseLeave={handleMouseLeave}
      style={{
        x: xSpring,
        y: ySpring,
        rotateX: rotateXSpring,
        rotateY: rotateYSpring,
        transformStyle: 'preserve-3d',
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

// Breathing glow effect
const BreathingGlow = () => (
  <motion.div
    animate={{
      scale: [1, 1.2, 1],
      opacity: [0.3, 0.6, 0.3],
    }}
    transition={{
      duration: 4,
      repeat: Infinity,
      ease: 'easeInOut',
    }}
    className="absolute w-[600px] h-[600px] rounded-full bg-[#BCFF00]/10 blur-[150px] pointer-events-none"
  />
);

// Counter with scroll velocity boost
const VelocityCounter = ({ value, scrollVelocity }) => {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) { setCount(0); return; }
    const end = parseInt(value) || 0;
    const velocity = Math.abs(scrollVelocity?.get?.() || 0);
    const speed = Math.max(1000, 2000 - velocity * 2); // Faster scroll = faster count
    const duration = speed;
    const increment = end / (duration / 16);
    let current = 0;
    
    const timer = setInterval(() => {
      current += increment;
      if (current >= end) { setCount(end); clearInterval(timer); }
      else setCount(Math.floor(current));
    }, 16);
    
    return () => clearInterval(timer);
  }, [isVisible, value, scrollVelocity]);

  return <span ref={ref}>{count.toLocaleString()}</span>;
};

export default function Landing() {
  const { isAuthenticated } = useAuth();
  const [stats, setStats] = useState({ total_users: 847, cards_listed: 12453, active_trades: 3891, active_razzes: 156 });
  
  // Mouse tracking
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);
  
  // Scroll tracking with velocity
  const { scrollY, scrollYProgress } = useScroll();
  const scrollVelocity = useVelocity(scrollYProgress);
  const smoothScroll = useSpring(scrollYProgress, { stiffness: 100, damping: 30 });

  // Spotlight position
  const spotlightX = useSpring(mouseX, { stiffness: 50, damping: 20 });
  const spotlightY = useSpring(mouseY, { stiffness: 50, damping: 20 });

  useEffect(() => {
    const handleMouse = (e) => {
      mouseX.set(e.clientX / window.innerWidth);
      mouseY.set(e.clientY / window.innerHeight);
    };
    window.addEventListener('mousemove', handleMouse);
    return () => window.removeEventListener('mousemove', handleMouse);
  }, [mouseX, mouseY]);

  useEffect(() => {
    api.get('/stats').then(r => setStats(r.data)).catch(() => {});
  }, []);

  // Parallax based on mouse position
  const mouseParallaxX = useTransform(mouseX, [0, 1], [-20, 20]);
  const mouseParallaxY = useTransform(mouseY, [0, 1], [-20, 20]);

  return (
    <div className="bg-[#000] text-white min-h-screen overflow-x-hidden">
      {/* Particle field */}
      <ParticleField mouseX={mouseX} mouseY={mouseY} />
      
      {/* Ripple effects */}
      <RippleEffect />

      {/* Mouse-following spotlight */}
      <motion.div
        className="fixed pointer-events-none z-10"
        style={{
          left: useTransform(spotlightX, v => `${v * 100}%`),
          top: useTransform(spotlightY, v => `${v * 100}%`),
          transform: 'translate(-50%, -50%)',
        }}
      >
        <div className="w-[500px] h-[500px] rounded-full bg-[#BCFF00]/5 blur-[100px]" />
      </motion.div>

      {/* Navigation */}
      <motion.nav 
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="fixed top-0 left-0 right-0 z-50 px-6 py-5"
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <MagneticCard>
              <div className="w-10 h-10 rounded-xl bg-[#BCFF00] flex items-center justify-center shadow-[0_0_30px_rgba(188,255,0,0.5)]">
                <span className="font-bold text-black text-lg">S</span>
              </div>
            </MagneticCard>
            <span className="font-semibold text-lg hidden sm:block">Slabby</span>
          </Link>
          
          <div className="flex items-center gap-6">
            <Link to="/marketplace" className="text-sm text-zinc-400 hover:text-white transition-colors hidden md:block">Marketplace</Link>
            <Link to="/razz" className="text-sm text-zinc-400 hover:text-white transition-colors hidden md:block">Live Razz</Link>
            <MagneticCard>
              <Link to={isAuthenticated ? "/marketplace" : "/register"}>
                <Button className="bg-[#BCFF00] text-black font-medium hover:bg-[#d4ff4d] shadow-[0_0_30px_rgba(188,255,0,0.3)]">
                  {isAuthenticated ? 'Open App' : 'Get Started'}
                </Button>
              </Link>
            </MagneticCard>
          </div>
        </div>
      </motion.nav>

      {/* HERO */}
      <section className="relative min-h-screen flex items-center justify-center px-6">
        <div className="relative z-20 text-center max-w-4xl">
          <motion.div
            style={{ x: mouseParallaxX, y: mouseParallaxY }}
          >
            <motion.h1 
              initial={{ opacity: 0, y: 50, filter: 'blur(10px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
              className="text-5xl sm:text-7xl lg:text-8xl font-bold tracking-tight leading-[0.95] mb-6"
            >
              The Future of
              <motion.span 
                className="block text-transparent bg-clip-text"
                style={{
                  backgroundImage: 'linear-gradient(90deg, #BCFF00, #10b981, #BCFF00)',
                  backgroundSize: '200% auto',
                }}
                animate={{ backgroundPosition: ['0% center', '200% center'] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
              >
                Card Trading
              </motion.span>
            </motion.h1>
          </motion.div>

          <motion.p 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="text-lg sm:text-xl text-zinc-400 mb-10 max-w-xl mx-auto"
          >
            P2P marketplace with provably fair raffles.
            <span className="text-white"> Every trade protected.</span>
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <MagneticCard intensity={20}>
              <Link to="/register">
                <Button size="lg" className="bg-[#BCFF00] text-black font-semibold hover:bg-[#d4ff4d] h-14 px-8 text-base shadow-[0_0_60px_rgba(188,255,0,0.4)] hover:shadow-[0_0_80px_rgba(188,255,0,0.6)] transition-shadow">
                  Start Trading <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            </MagneticCard>
            <MagneticCard intensity={20}>
              <Link to="/razz">
                <Button size="lg" variant="outline" className="border-white/20 bg-white/5 hover:bg-white/10 h-14 px-8 backdrop-blur-sm">
                  <Play className="w-5 h-5 mr-2" /> Live Razz
                </Button>
              </Link>
            </MagneticCard>
          </motion.div>
        </div>

        {/* Breathing glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <BreathingGlow />
        </div>
      </section>

      {/* INTERACTIVE CARD SHOWCASE */}
      <section className="relative py-32 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: false, margin: '-100px' }}
            className="flex justify-center items-end gap-4 md:gap-8"
          >
            {CARD_IMAGES.map((img, i) => {
              const offset = i === 1 ? 0 : i === 0 ? -15 : 15;
              const scale = i === 1 ? 1 : 0.9;
              const zIndex = i === 1 ? 20 : 10;
              
              return (
                <MagneticCard key={i} intensity={40}>
                  <motion.div
                    initial={{ opacity: 0, y: 100, rotate: offset }}
                    whileInView={{ opacity: 1, y: 0, rotate: offset }}
                    viewport={{ once: false, margin: '-50px' }}
                    transition={{ duration: 0.8, delay: i * 0.15 }}
                    whileHover={{ 
                      scale: 1.1, 
                      rotate: 0, 
                      y: -20,
                      zIndex: 30,
                      transition: { duration: 0.3 }
                    }}
                    style={{ scale, zIndex }}
                    className="relative cursor-pointer"
                  >
                    <div className="w-40 md:w-52 rounded-2xl overflow-hidden shadow-2xl shadow-black/50 border border-white/10">
                      <img src={img} alt="Card" className="w-full aspect-[3/4] object-cover" />
                    </div>
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.8 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.5 + i * 0.1 }}
                      className="absolute -bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/90 backdrop-blur-xl rounded-full border border-[#BCFF00]/30"
                    >
                      <span className="text-[#BCFF00] font-bold text-sm">${[2499, 3899, 1299][i]}</span>
                    </motion.div>
                  </motion.div>
                </MagneticCard>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* STATS - Velocity reactive */}
      <section className="relative py-32 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { label: 'Traders', value: stats.total_users || 847, color: '#BCFF00' },
              { label: 'Cards', value: stats.cards_listed || 12453, color: '#10b981' },
              { label: 'Trades', value: stats.active_trades || 3891, color: '#8b5cf6' },
              { label: 'In Prizes', value: stats.active_razzes || 156, prefix: '$', suffix: 'K', color: '#f59e0b' },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: false, margin: '-50px' }}
                transition={{ delay: i * 0.1, duration: 0.6 }}
                className="text-center"
              >
                <p className="text-5xl md:text-6xl font-bold mb-2" style={{ color: stat.color }}>
                  {stat.prefix}<VelocityCounter value={stat.value} scrollVelocity={scrollVelocity} />{stat.suffix}
                </p>
                <p className="text-sm text-zinc-500">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES - Depth parallax */}
      <section className="relative py-32 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.h2 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: false }}
            className="text-4xl sm:text-5xl font-bold text-center mb-16"
          >
            Why Slabby
          </motion.h2>

          <div className="grid md:grid-cols-2 gap-6">
            {[
              { icon: Shuffle, title: 'P2P Trading', desc: 'Direct trades with full escrow protection.', color: '#10b981', gradient: 'from-emerald-500/10' },
              { icon: Dice6, title: 'Provably Fair', desc: 'SHA256 verified. Audit any draw yourself.', color: '#8b5cf6', gradient: 'from-violet-500/10' },
              { icon: Lock, title: 'Secure Escrow', desc: 'Bank-level security on every transaction.', color: '#f59e0b', gradient: 'from-amber-500/10' },
              { icon: Zap, title: 'Instant Payouts', desc: 'Settle in seconds. Withdraw anytime.', color: '#ef4444', gradient: 'from-rose-500/10' },
            ].map((f, i) => (
              <MagneticCard key={f.title} intensity={25}>
                <motion.div
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: false, margin: '-50px' }}
                  transition={{ delay: i * 0.1 }}
                  className={`p-8 rounded-3xl border border-white/5 bg-gradient-to-br ${f.gradient} to-transparent cursor-pointer group`}
                >
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform" style={{ backgroundColor: `${f.color}20` }}>
                    <f.icon className="w-7 h-7" style={{ color: f.color }} />
                  </div>
                  <h3 className="text-2xl font-semibold mb-2">{f.title}</h3>
                  <p className="text-zinc-400">{f.desc}</p>
                </motion.div>
              </MagneticCard>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS - Staggered reveal */}
      <section className="relative py-32 px-6">
        <div className="max-w-4xl mx-auto space-y-32">
          {[
            { step: '01', title: 'List', desc: 'Upload cards. Set your price.', color: '#BCFF00' },
            { step: '02', title: 'Trade', desc: 'Accept offers or host a razz.', color: '#8b5cf6' },
            { step: '03', title: 'Profit', desc: 'Get paid instantly.', color: '#10b981' },
          ].map((item, i) => (
            <motion.div
              key={item.step}
              initial={{ opacity: 0, x: i % 2 === 0 ? -100 : 100 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: false, margin: '-100px' }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className={`flex items-center gap-8 ${i % 2 === 1 ? 'flex-row-reverse text-right' : ''}`}
            >
              <motion.span 
                className="text-[120px] md:text-[180px] font-bold leading-none opacity-20"
                style={{ color: item.color }}
                whileInView={{ opacity: 0.2 }}
                initial={{ opacity: 0 }}
              >
                {item.step}
              </motion.span>
              <div>
                <h3 className="text-4xl md:text-5xl font-bold mb-2">{item.title}</h3>
                <p className="text-xl text-zinc-400">{item.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-32 px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: false }}
          className="max-w-3xl mx-auto text-center relative"
        >
          <div className="absolute inset-0 -z-10">
            <BreathingGlow />
          </div>
          
          <h2 className="text-5xl sm:text-6xl font-bold mb-6">
            Ready to <span className="text-[#BCFF00]">trade?</span>
          </h2>
          <p className="text-xl text-zinc-400 mb-10">
            Join thousands of collectors. Zero fees.
          </p>
          <MagneticCard intensity={30}>
            <Link to="/register">
              <Button size="lg" className="bg-[#BCFF00] text-black font-semibold hover:bg-[#d4ff4d] h-16 px-12 text-lg shadow-[0_0_80px_rgba(188,255,0,0.5)]">
                Create Free Account <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </MagneticCard>
        </motion.div>
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
