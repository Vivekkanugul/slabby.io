import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, useScroll, useTransform, useSpring, useMotionValue, useAnimationFrame } from 'framer-motion';
import { ArrowRight, Shield, Shuffle, Dice6, Zap, Lock, Play } from 'lucide-react';
import { Button } from '../components/ui/button';
import api from '../lib/api';

const CARD_IMAGES = [
  'https://static.prod-images.emergentagent.com/jobs/78a8fc0a-353a-4be0-91c8-507f76e46f1e/images/a5cc9e9a7d15dedbf89b5ac97ef3f5a5d8271d814fbc15a9ba9459ce3a780a0e.png',
  'https://static.prod-images.emergentagent.com/jobs/78a8fc0a-353a-4be0-91c8-507f76e46f1e/images/3ab472c3ad3e48bc2105db75ea78bcc2a75555a9426b30c8d6302c42e353aa3f.png',
  'https://static.prod-images.emergentagent.com/jobs/78a8fc0a-353a-4be0-91c8-507f76e46f1e/images/0c3fddbc8797bcfe269fb488c85008a17520020f11effcbc3504a0c8cb4d9a13.png',
];

// Particle system with CTA attraction
const ParticleField = ({ mouseX, mouseY, ctaRef }) => {
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

    for (let i = 0; i < 60; i++) {
      particles.current.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: 0, vy: 0,
        size: Math.random() * 2 + 0.5,
        alpha: Math.random() * 0.5 + 0.1,
      });
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const mx = mouseX.get() * canvas.width;
      const my = mouseY.get() * canvas.height;

      // Get CTA position for attraction
      let ctaX = canvas.width / 2, ctaY = canvas.height;
      if (ctaRef?.current) {
        const rect = ctaRef.current.getBoundingClientRect();
        ctaX = rect.left + rect.width / 2;
        ctaY = rect.top + rect.height / 2;
      }

      particles.current.forEach((p, i) => {
        // Mouse attraction
        const dxM = mx - p.x, dyM = my - p.y;
        const distM = Math.sqrt(dxM * dxM + dyM * dyM);
        if (distM < 150) {
          const force = (150 - distM) / 150;
          p.vx += (dxM / distM) * force * 0.3;
          p.vy += (dyM / distM) * force * 0.3;
        }

        // CTA attraction (subtle)
        const dxC = ctaX - p.x, dyC = ctaY - p.y;
        const distC = Math.sqrt(dxC * dxC + dyC * dyC);
        if (distC < 300 && distC > 50) {
          p.vx += (dxC / distC) * 0.02;
          p.vy += (dyC / distC) * 0.02;
        }

        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.96;
        p.vy *= 0.96;

        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        const brightness = distM < 150 ? 1 : 0.4;
        ctx.fillStyle = `rgba(188, 255, 0, ${p.alpha * brightness})`;
        ctx.fill();

        particles.current.forEach((p2, j) => {
          if (j <= i) return;
          const d = Math.sqrt((p.x - p2.x) ** 2 + (p.y - p2.y) ** 2);
          if (d < 80) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(188, 255, 0, ${(1 - d / 80) * 0.1})`;
            ctx.stroke();
          }
        });
      });
      animationRef.current = requestAnimationFrame(animate);
    };
    animate();
    return () => { window.removeEventListener('resize', resize); cancelAnimationFrame(animationRef.current); };
  }, [mouseX, mouseY, ctaRef]);

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" />;
};

// Scrambling text effect - characters scramble then resolve
const ScrambleText = ({ children, className }) => {
  const [text, setText] = useState(children);
  const [isScrambling, setIsScrambling] = useState(false);
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%&*';
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isScrambling) {
          setIsScrambling(true);
          let iteration = 0;
          const interval = setInterval(() => {
            setText(
              children.split('').map((char, i) => {
                if (char === ' ') return ' ';
                if (i < iteration) return children[i];
                return chars[Math.floor(Math.random() * chars.length)];
              }).join('')
            );
            if (iteration >= children.length) {
              clearInterval(interval);
              setText(children);
            }
            iteration += 1 / 2;
          }, 30);
        }
      },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [children, isScrambling]);

  return <span ref={ref} className={className}>{text}</span>;
};

// Holographic/glitch text
const GlitchText = ({ children, className }) => {
  return (
    <span className={`relative inline-block ${className}`}>
      <span className="relative z-10">{children}</span>
      <span 
        className="absolute top-0 left-0 -z-10 text-[#ff00ff] opacity-70"
        style={{ transform: 'translate(-2px, -1px)', filter: 'blur(1px)' }}
      >
        {children}
      </span>
      <span 
        className="absolute top-0 left-0 -z-10 text-[#00ffff] opacity-70"
        style={{ transform: 'translate(2px, 1px)', filter: 'blur(1px)' }}
      >
        {children}
      </span>
    </span>
  );
};

// 3D Orbiting Cards - cards floating in space
const OrbitingCards = () => {
  const containerRef = useRef(null);
  const [rotation, setRotation] = useState(0);

  useAnimationFrame((t) => {
    setRotation(t * 0.02);
  });

  const cards = CARD_IMAGES.map((img, i) => {
    const angle = (i / CARD_IMAGES.length) * Math.PI * 2 + rotation * 0.01;
    const radius = 180;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const scale = (z + radius) / (radius * 2) * 0.4 + 0.6;
    const opacity = (z + radius) / (radius * 2) * 0.6 + 0.4;
    
    return { img, x, z, scale, opacity, angle, price: ['$2,499', '$3,899', '$1,299'][i] };
  });

  // Sort by z for proper layering
  const sortedCards = [...cards].sort((a, b) => a.z - b.z);

  return (
    <div ref={containerRef} className="relative h-[400px] w-full flex items-center justify-center" style={{ perspective: '1000px' }}>
      <div className="relative w-[400px] h-[300px]" style={{ transformStyle: 'preserve-3d' }}>
        {sortedCards.map((card, i) => (
          <motion.div
            key={card.img}
            className="absolute left-1/2 top-1/2 w-32 md:w-40 cursor-pointer"
            style={{
              x: card.x,
              z: card.z,
              scale: card.scale,
              opacity: card.opacity,
              translateX: '-50%',
              translateY: '-50%',
              rotateY: `${-card.angle * 30}deg`,
            }}
            whileHover={{ scale: card.scale * 1.2, zIndex: 100 }}
          >
            <div className="rounded-2xl overflow-hidden shadow-2xl shadow-black/50 border border-white/20">
              <img src={card.img} alt="Card" className="w-full aspect-[3/4] object-cover" />
            </div>
            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-black/90 backdrop-blur rounded-full border border-[#BCFF00]/30">
              <span className="text-[#BCFF00] font-bold text-xs">{card.price}</span>
            </div>
          </motion.div>
        ))}
      </div>
      
      {/* Glow effect */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-64 h-64 bg-[#BCFF00]/10 rounded-full blur-[100px]" />
      </div>
    </div>
  );
};

// Magnetic button with particle attraction
const MagneticCTA = ({ children, className, ctaRef }) => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springConfig = { stiffness: 150, damping: 15 };
  const xSpring = useSpring(x, springConfig);
  const ySpring = useSpring(y, springConfig);

  const handleMouse = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    x.set((e.clientX - centerX) * 0.2);
    y.set((e.clientY - centerY) * 0.2);
  };

  return (
    <motion.div
      ref={ctaRef}
      onMouseMove={handleMouse}
      onMouseLeave={() => { x.set(0); y.set(0); }}
      style={{ x: xSpring, y: ySpring }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

// Liquid morph button
const LiquidButton = ({ children, className, ...props }) => {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <motion.div
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className="relative"
    >
      {/* Liquid blob background */}
      <motion.div
        className="absolute inset-0 bg-[#BCFF00] rounded-full"
        animate={{
          borderRadius: isHovered 
            ? ['50% 50% 50% 50%', '60% 40% 60% 40%', '40% 60% 40% 60%', '50% 50% 50% 50%']
            : '50% 50% 50% 50%',
          scale: isHovered ? 1.05 : 1,
        }}
        transition={{ 
          borderRadius: { duration: 0.8, repeat: Infinity },
          scale: { duration: 0.3 }
        }}
      />
      <Button {...props} className={`relative z-10 bg-transparent hover:bg-transparent ${className}`}>
        {children}
      </Button>
    </motion.div>
  );
};

export default function Landing() {
  const { isAuthenticated } = useAuth();
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);
  const ctaRef = useRef(null);
  const { scrollYProgress } = useScroll();
  const smoothScroll = useSpring(scrollYProgress, { stiffness: 100, damping: 30 });

  useEffect(() => {
    const handleMouse = (e) => {
      mouseX.set(e.clientX / window.innerWidth);
      mouseY.set(e.clientY / window.innerHeight);
    };
    window.addEventListener('mousemove', handleMouse);
    return () => window.removeEventListener('mousemove', handleMouse);
  }, [mouseX, mouseY]);

  // Mouse parallax
  const parallaxX = useTransform(mouseX, [0, 1], [-15, 15]);
  const parallaxY = useTransform(mouseY, [0, 1], [-15, 15]);

  return (
    <div className="bg-[#000] text-white min-h-screen flex flex-col">
      <ParticleField mouseX={mouseX} mouseY={mouseY} ctaRef={ctaRef} />

      {/* Mouse spotlight */}
      <motion.div
        className="fixed pointer-events-none z-10"
        style={{
          left: useTransform(mouseX, v => `${v * 100}%`),
          top: useTransform(mouseY, v => `${v * 100}%`),
          transform: 'translate(-50%, -50%)',
        }}
      >
        <div className="w-[400px] h-[400px] rounded-full bg-[#BCFF00]/5 blur-[80px]" />
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
            <motion.div 
              whileHover={{ scale: 1.1, rotate: 5 }}
              className="w-10 h-10 rounded-xl bg-[#BCFF00] flex items-center justify-center shadow-[0_0_30px_rgba(188,255,0,0.5)]"
            >
              <span className="font-bold text-black text-lg">S</span>
            </motion.div>
            <span className="font-semibold text-lg hidden sm:block">Slabby</span>
          </Link>
          
          <div className="flex items-center gap-6">
            <Link to="/marketplace" className="text-sm text-zinc-400 hover:text-white transition-colors hidden md:block">Marketplace</Link>
            <Link to="/razz" className="text-sm text-zinc-400 hover:text-white transition-colors hidden md:block">Live Razz</Link>
            <Link to={isAuthenticated ? "/marketplace" : "/register"}>
              <Button className="bg-[#BCFF00] text-black font-medium hover:bg-[#d4ff4d] shadow-[0_0_30px_rgba(188,255,0,0.3)]">
                {isAuthenticated ? 'Open App' : 'Get Started'}
              </Button>
            </Link>
          </div>
        </div>
      </motion.nav>

      {/* Main content - flex-grow to push footer down */}
      <main className="flex-grow">
        {/* HERO */}
        <section className="relative min-h-screen flex items-center justify-center px-6">
          <motion.div style={{ x: parallaxX, y: parallaxY }} className="relative z-20 text-center max-w-4xl">
            <motion.h1 
              initial={{ opacity: 0, y: 50, filter: 'blur(10px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
              className="text-5xl sm:text-7xl lg:text-8xl font-bold tracking-tight leading-[0.95] mb-6"
            >
              The Future of
              <motion.span 
                className="block"
                style={{
                  background: 'linear-gradient(90deg, #BCFF00, #00ff88, #BCFF00)',
                  backgroundSize: '200% auto',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
                animate={{ backgroundPosition: ['0% center', '200% center'] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
              >
                Card Trading
              </motion.span>
            </motion.h1>

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
              <MagneticCTA>
                <Link to="/register">
                  <Button size="lg" className="bg-[#BCFF00] text-black font-semibold hover:bg-[#d4ff4d] h-14 px-8 text-base shadow-[0_0_60px_rgba(188,255,0,0.4)] hover:shadow-[0_0_80px_rgba(188,255,0,0.6)] transition-shadow">
                    Start Trading <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
              </MagneticCTA>
              <MagneticCTA>
                <Link to="/razz">
                  <Button size="lg" variant="outline" className="border-white/20 bg-white/5 hover:bg-white/10 h-14 px-8 backdrop-blur-sm">
                    <Play className="w-5 h-5 mr-2" /> Live Razz
                  </Button>
                </Link>
              </MagneticCTA>
            </motion.div>
          </motion.div>

          {/* Breathing glow */}
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#BCFF00]/10 rounded-full blur-[150px] pointer-events-none"
          />
        </section>

        {/* 3D ORBITING CARDS */}
        <section className="relative py-20 px-6">
          <div className="max-w-5xl mx-auto">
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: false, margin: '-100px' }}
            >
              <OrbitingCards />
            </motion.div>
          </div>
        </section>

        {/* FEATURES with scramble text */}
        <section className="relative py-20 px-6">
          <div className="max-w-5xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: false }}
              className="text-center mb-16"
            >
              <h2 className="text-4xl sm:text-6xl font-bold">
                <ScrambleText className="text-white">Why </ScrambleText>
                <GlitchText className="text-[#BCFF00]">Slabby</GlitchText>
              </h2>
            </motion.div>

            <div className="grid md:grid-cols-2 gap-6">
              {[
                { icon: Shuffle, title: 'P2P Trading', desc: 'Direct trades with full escrow protection.', color: '#10b981' },
                { icon: Dice6, title: 'Provably Fair', desc: 'SHA256 verified. Audit any draw.', color: '#8b5cf6' },
                { icon: Lock, title: 'Secure Escrow', desc: 'Bank-level security on every deal.', color: '#f59e0b' },
                { icon: Zap, title: 'Instant Payouts', desc: 'Settle in seconds. Withdraw anytime.', color: '#ef4444' },
              ].map((f, i) => (
                <MagneticCTA key={f.title}>
                  <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: false, margin: '-50px' }}
                    transition={{ delay: i * 0.1 }}
                    whileHover={{ scale: 1.02 }}
                    className="p-8 rounded-3xl border border-white/5 bg-white/[0.02] backdrop-blur-sm cursor-pointer group"
                  >
                    <div 
                      className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform"
                      style={{ backgroundColor: `${f.color}20` }}
                    >
                      <f.icon className="w-7 h-7" style={{ color: f.color }} />
                    </div>
                    <h3 className="text-2xl font-semibold mb-2">
                      <ScrambleText>{f.title}</ScrambleText>
                    </h3>
                    <p className="text-zinc-400">{f.desc}</p>
                  </motion.div>
                </MagneticCTA>
              ))}
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="relative py-20 px-6">
          <div className="max-w-4xl mx-auto space-y-24">
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
                  className="text-[100px] md:text-[150px] font-bold leading-none"
                  style={{ color: item.color, opacity: 0.15 }}
                  whileInView={{ opacity: 0.2 }}
                  initial={{ opacity: 0 }}
                >
                  {item.step}
                </motion.span>
                <div>
                  <h3 className="text-4xl md:text-5xl font-bold mb-2">
                    <ScrambleText>{item.title}</ScrambleText>
                  </h3>
                  <p className="text-xl text-zinc-400">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* CTA - with particle attraction */}
        <section className="relative py-32 px-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: false }}
            className="max-w-3xl mx-auto text-center relative"
          >
            {/* Intense glow behind CTA */}
            <motion.div
              animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0.4, 0.2] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="absolute inset-0 -z-10 flex items-center justify-center"
            >
              <div className="w-[400px] h-[400px] bg-[#BCFF00]/20 rounded-full blur-[100px]" />
            </motion.div>
            
            <h2 className="text-5xl sm:text-7xl font-bold mb-6">
              <GlitchText className="text-white">Ready to</GlitchText>
              <br />
              <motion.span
                className="text-[#BCFF00] inline-block"
                animate={{ 
                  textShadow: [
                    '0 0 20px rgba(188,255,0,0.5)',
                    '0 0 40px rgba(188,255,0,0.8)',
                    '0 0 20px rgba(188,255,0,0.5)'
                  ]
                }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                trade?
              </motion.span>
            </h2>
            <p className="text-xl text-zinc-400 mb-10">
              Join the future. Zero fees.
            </p>
            <MagneticCTA ctaRef={ctaRef}>
              <Link to="/register">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button size="lg" className="bg-[#BCFF00] text-black font-bold hover:bg-[#d4ff4d] h-16 px-12 text-lg shadow-[0_0_100px_rgba(188,255,0,0.5)] hover:shadow-[0_0_150px_rgba(188,255,0,0.7)] transition-all">
                    <ScrambleText>Create Account</ScrambleText>
                    <ArrowRight className="w-5 h-5 ml-3" />
                  </Button>
                </motion.div>
              </Link>
            </MagneticCTA>
          </motion.div>
        </section>
      </main>

      {/* Footer - fixed at bottom */}
      <footer className="relative z-40 border-t border-white/5 py-6 px-6 bg-black/80 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#BCFF00] flex items-center justify-center">
              <span className="font-bold text-black text-xs">S</span>
            </div>
            <span className="font-medium text-sm">Slabby</span>
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
