import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useEffect, useRef, useState } from 'react';
import { motion, useScroll, useSpring, useMotionValue, useAnimationFrame } from 'framer-motion';
import { ArrowRight, Shield, Shuffle, Dice6, Zap, Lock, Play } from 'lucide-react';
import { Button } from '../components/ui/button';
import api from '../lib/api';

const CARD_IMAGES = [
  'https://static.prod-images.emergentagent.com/jobs/78a8fc0a-353a-4be0-91c8-507f76e46f1e/images/a5cc9e9a7d15dedbf89b5ac97ef3f5a5d8271d814fbc15a9ba9459ce3a780a0e.png',
  'https://static.prod-images.emergentagent.com/jobs/78a8fc0a-353a-4be0-91c8-507f76e46f1e/images/3ab472c3ad3e48bc2105db75ea78bcc2a75555a9426b30c8d6302c42e353aa3f.png',
  'https://static.prod-images.emergentagent.com/jobs/78a8fc0a-353a-4be0-91c8-507f76e46f1e/images/0c3fddbc8797bcfe269fb488c85008a17520020f11effcbc3504a0c8cb4d9a13.png',
];
const SLAB_PRICES = ['$4,299', '$2,150', '$8,750'];
const SLAB_GRADES = ['PSA 10', 'BGS 9.5', 'CGC 10'];

// Particle field
const ParticleField = ({ mouseX, mouseY }) => {
  const canvasRef = useRef(null);
  const particles = useRef([]);
  const animationRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener('resize', resize);

    for (let i = 0; i < 40; i++) {
      particles.current.push({
        x: Math.random() * canvas.width, y: Math.random() * canvas.height,
        vx: 0, vy: 0, size: Math.random() * 1.5 + 0.5, alpha: Math.random() * 0.3 + 0.1,
      });
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const mx = mouseX.get() * canvas.width, my = mouseY.get() * canvas.height;
      particles.current.forEach((p, i) => {
        const dx = mx - p.x, dy = my - p.y, dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 100) { const f = (100 - dist) / 100; p.vx += (dx / dist) * f * 0.3; p.vy += (dy / dist) * f * 0.3; }
        p.x += p.vx; p.y += p.vy; p.vx *= 0.96; p.vy *= 0.96;
        if (p.x < 0) p.x = canvas.width; if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height; if (p.y > canvas.height) p.y = 0;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(188, 255, 0, ${p.alpha * (dist < 100 ? 0.8 : 0.3)})`; ctx.fill();
        particles.current.forEach((p2, j) => {
          if (j <= i) return;
          const d = Math.sqrt((p.x - p2.x) ** 2 + (p.y - p2.y) ** 2);
          if (d < 50) { ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(188, 255, 0, ${(1 - d / 50) * 0.06})`; ctx.stroke(); }
        });
      });
      animationRef.current = requestAnimationFrame(animate);
    };
    animate();
    return () => { window.removeEventListener('resize', resize); cancelAnimationFrame(animationRef.current); };
  }, [mouseX, mouseY]);
  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" />;
};

// Physics letter component
const PhysicsLetter = ({ letter, index, mousePos, isHero = false }) => {
  const [physics, setPhysics] = useState({ x: 0, y: 0, rotateX: 0, rotateY: 0, rotateZ: 0 });
  const letterRef = useRef(null);
  const velocity = useRef({ x: 0, y: 0, rotX: 0, rotY: 0 });

  useEffect(() => {
    if (!letterRef.current) return;
    const rect = letterRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
    const dx = mousePos.x - cx, dy = mousePos.y - cy, dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 200 && dist > 0) {
      const f = (200 - dist) / 200;
      velocity.current.x += (dx / dist) * f * 2; velocity.current.y += (dy / dist) * f * 1.5;
      velocity.current.rotY += (dx / dist) * f * 3; velocity.current.rotX += (dy / dist) * f * -2;
    }
    velocity.current.x *= 0.92; velocity.current.y *= 0.92;
    velocity.current.rotX *= 0.9; velocity.current.rotY *= 0.9;
    setPhysics({
      x: velocity.current.x * 8, y: velocity.current.y * 6,
      rotateX: velocity.current.rotX * 15, rotateY: velocity.current.rotY * 15,
      rotateZ: Math.sin(Date.now() * 0.001 + index) * 2,
    });
  }, [mousePos, index]);

  const floatY = Math.sin(Date.now() * 0.002 + index * 0.5) * 3;
  return (
    <motion.span ref={letterRef}
      animate={{ x: physics.x, y: physics.y + floatY, rotateX: physics.rotateX, rotateY: physics.rotateY, rotateZ: physics.rotateZ }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className="inline-block"
      style={{ transformStyle: 'preserve-3d',
        textShadow: Math.abs(physics.x) > 1 || Math.abs(physics.y) > 1 
          ? `0 0 30px rgba(188,255,0,0.8), 0 0 60px rgba(188,255,0,0.4)` 
          : isHero ? '0 0 20px rgba(188,255,0,0.3)' : 'none',
      }}
    >{letter === ' ' ? '\u00A0' : letter}</motion.span>
  );
};

const PhysicsText = ({ children, className, isHero = false }) => {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [, forceUpdate] = useState(0);
  useEffect(() => {
    const handleMouse = (e) => setMousePos({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', handleMouse);
    const interval = setInterval(() => forceUpdate(n => n + 1), 50);
    return () => { window.removeEventListener('mousemove', handleMouse); clearInterval(interval); };
  }, []);
  return (
    <span className={`inline-flex flex-wrap justify-center ${className}`} style={{ perspective: '1000px' }}>
      {children.split('').map((letter, i) => (
        <PhysicsLetter key={i} letter={letter} index={i} mousePos={mousePos} isHero={isHero} />
      ))}
    </span>
  );
};

// Typewriter with glitch
const GlitchTypewriter = ({ text, className }) => {
  const [displayText, setDisplayText] = useState('');
  const [cursorVisible, setCursorVisible] = useState(true);
  const [isGlitching, setIsGlitching] = useState(false);
  const glitchChars = '!@#$%^&*_+-=';

  useEffect(() => {
    let i = 0;
    const typeInterval = setInterval(() => {
      if (i < text.length) {
        if (Math.random() < 0.1) {
          setIsGlitching(true);
          setDisplayText(text.slice(0, i) + glitchChars[Math.floor(Math.random() * glitchChars.length)]);
          setTimeout(() => { setIsGlitching(false); setDisplayText(text.slice(0, i + 1)); }, 50);
        } else { setDisplayText(text.slice(0, i + 1)); }
        i++;
      } else { clearInterval(typeInterval); }
    }, 60);
    const cursorInterval = setInterval(() => setCursorVisible(v => !v), 500);
    return () => { clearInterval(typeInterval); clearInterval(cursorInterval); };
  }, [text]);

  return (
    <span className={className}>
      <span className={isGlitching ? 'text-red-500' : ''}>{displayText}</span>
      <span className={`${cursorVisible ? 'opacity-100' : 'opacity-0'} text-[#BCFF00] transition-opacity`}>|</span>
    </span>
  );
};

// Liquid button - BLACK text on lime
const LiquidButton = ({ children, className, href, variant = 'primary' }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [ripples, setRipples] = useState([]);
  const handleClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const newRipple = { x: e.clientX - rect.left, y: e.clientY - rect.top, id: Date.now() };
    setRipples(prev => [...prev, newRipple]);
    setTimeout(() => setRipples(prev => prev.filter(r => r.id !== newRipple.id)), 1000);
  };

  const isPrimary = variant === 'primary';
  const ButtonContent = (
    <motion.div onHoverStart={() => setIsHovered(true)} onHoverEnd={() => setIsHovered(false)} onClick={handleClick}
      className="relative overflow-hidden rounded-full cursor-pointer" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
      <motion.div className={`absolute inset-0 ${isPrimary ? 'bg-[#BCFF00]' : 'bg-zinc-900 border border-zinc-700'}`}
        animate={{ borderRadius: isHovered ? ['25% 75% 75% 25% / 60% 40% 60% 40%', '75% 25% 25% 75% / 40% 60% 40% 60%', '25% 75% 75% 25% / 60% 40% 60% 40%'] : '50%' }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }} />
      {isPrimary && <motion.div className="absolute inset-0 bg-gradient-to-r from-transparent via-black/10 to-transparent"
        animate={{ x: isHovered ? ['0%', '200%'] : '0%' }} transition={{ duration: 1.5, repeat: Infinity }} style={{ width: '50%' }} />}
      {ripples.map(ripple => (
        <motion.div key={ripple.id} className="absolute rounded-full bg-black/20"
          initial={{ width: 0, height: 0, x: ripple.x, y: ripple.y }}
          animate={{ width: 300, height: 300, x: ripple.x - 150, y: ripple.y - 150, opacity: 0 }} transition={{ duration: 0.8 }} />
      ))}
      <div className={`relative z-10 ${isPrimary ? 'text-black' : 'text-white'} ${className}`}>{children}</div>
    </motion.div>
  );
  return href ? <Link to={href}>{ButtonContent}</Link> : ButtonContent;
};

// Magnetic nav item
const MagneticNavItem = ({ children, href }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const ref = useRef(null);
  const handleMouse = (e) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    setOffset({ x: (e.clientX - rect.left - rect.width / 2) * 0.3, y: (e.clientY - rect.top - rect.height / 2) * 0.3 });
  };
  return (
    <Link to={href}>
      <motion.div ref={ref} onMouseMove={handleMouse} onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => { setIsHovered(false); setOffset({ x: 0, y: 0 }); }}
        animate={{ x: offset.x, y: offset.y }} transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        className="relative px-3 py-1 cursor-pointer">
        <span className="text-sm text-zinc-400 hover:text-white transition-colors">{children}</span>
        <motion.div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#BCFF00] origin-left"
          initial={{ scaleX: 0 }} animate={{ scaleX: isHovered ? 1 : 0 }} transition={{ duration: 0.3 }} />
      </motion.div>
    </Link>
  );
};

// Breathing logo
const BreathingLogo = () => {
  const [isHovered, setIsHovered] = useState(false);
  return (
    <Link to="/">
      <motion.div onHoverStart={() => setIsHovered(true)} onHoverEnd={() => setIsHovered(false)}
        animate={{ scale: isHovered ? 1.1 : [1, 1.05, 1], rotate: isHovered ? [0, 5, -5, 0] : 0 }}
        transition={{ scale: { duration: isHovered ? 0.2 : 2, repeat: isHovered ? 0 : Infinity }, rotate: { duration: 0.5 } }}
        className="relative">
        <motion.div className="absolute inset-0 bg-[#BCFF00] rounded-xl blur-lg"
          animate={{ opacity: isHovered ? 0.8 : [0.3, 0.6, 0.3], scale: isHovered ? 1.3 : [1, 1.2, 1] }}
          transition={{ duration: 2, repeat: Infinity }} />
        <div className="relative w-10 h-10 rounded-xl bg-[#BCFF00] flex items-center justify-center">
          <span className="font-bold text-black text-lg">S</span>
        </div>
      </motion.div>
    </Link>
  );
};

// Gravity text for CTA
const GravityText = ({ children, className }) => {
  const [letters, setLetters] = useState([]);
  const containerRef = useRef(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    setLetters(children.split('').map((char, i) => ({ char, id: i, x: 0, y: 0, vx: (Math.random() - 0.5) * 2, vy: (Math.random() - 0.5) * 2, rotation: 0 })));
  }, [children]);

  useEffect(() => {
    const handleMouse = (e) => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      }
    };
    window.addEventListener('mousemove', handleMouse);
    const interval = setInterval(() => {
      setLetters(prev => prev.map((letter, i) => {
        const charWidth = 40, baseX = i * charWidth;
        const dx = mousePos.x - (baseX + letter.x), dy = mousePos.y - letter.y, dist = Math.sqrt(dx * dx + dy * dy);
        let ax = 0, ay = 0;
        if (dist < 150 && dist > 0) { const f = (150 - dist) / 150; ax = -(dx / dist) * f * 0.8; ay = -(dy / dist) * f * 0.8; }
        ax += -letter.x * 0.05; ay += -letter.y * 0.05;
        let nvx = (letter.vx + ax) * 0.95, nvy = (letter.vy + ay) * 0.95;
        return { ...letter, x: letter.x + nvx, y: letter.y + nvy, vx: nvx, vy: nvy, rotation: (letter.rotation + nvx * 2) * 0.95 };
      }));
    }, 30);
    return () => { window.removeEventListener('mousemove', handleMouse); clearInterval(interval); };
  }, [mousePos]);

  return (
    <div ref={containerRef} className={`inline-flex ${className}`}>
      {letters.map((letter) => (
        <motion.span key={letter.id} animate={{ x: letter.x, y: letter.y, rotate: letter.rotation }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }} className="inline-block"
          style={{ textShadow: (Math.abs(letter.x) > 5 || Math.abs(letter.y) > 5) ? '0 0 40px rgba(188,255,0,0.8)' : '0 0 20px rgba(188,255,0,0.3)' }}>
          {letter.char === ' ' ? '\u00A0' : letter.char}
        </motion.span>
      ))}
    </div>
  );
};

// Vortex button
const VortexButton = ({ children, className, href }) => {
  const [particles, setParticles] = useState([]);
  const [isHovered, setIsHovered] = useState(false);
  const [time, setTime] = useState(0);
  const animationRef = useRef(null);

  useEffect(() => {
    setParticles(Array.from({ length: 30 }, (_, i) => ({
      id: i, angle: (i / 30) * Math.PI * 2, radius: 70 + Math.random() * 30, speed: 0.03 + Math.random() * 0.03, size: Math.random() * 3 + 1
    })));
  }, []);

  useEffect(() => {
    const animate = () => { setTime(t => t + 1); animationRef.current = requestAnimationFrame(animate); };
    animate();
    return () => cancelAnimationFrame(animationRef.current);
  }, []);

  const ButtonContent = (
    <motion.div onHoverStart={() => setIsHovered(true)} onHoverEnd={() => setIsHovered(false)}
      className="relative inline-block" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
      <div className="absolute inset-0 pointer-events-none" style={{ transform: 'translate(-30%, -30%)', width: '160%', height: '160%' }}>
        {particles.map((p) => {
          const angle = p.angle + time * p.speed * (isHovered ? 3 : 1);
          const radius = isHovered ? p.radius * 0.4 : p.radius;
          return (
            <motion.div key={p.id} className="absolute rounded-full bg-[#BCFF00]"
              style={{ width: p.size * (isHovered ? 1.5 : 1), height: p.size * (isHovered ? 1.5 : 1),
                left: Math.cos(angle) * radius + 80, top: Math.sin(angle) * radius + 40,
                opacity: isHovered ? 0.9 : 0.4, boxShadow: isHovered ? '0 0 10px #BCFF00' : 'none' }} />
          );
        })}
      </div>
      <motion.div className="absolute inset-0 rounded-full bg-[#BCFF00] blur-2xl" animate={{ opacity: isHovered ? 0.5 : 0.15, scale: isHovered ? 1.3 : 1 }} />
      <div className={`relative z-10 bg-[#BCFF00] text-black font-bold rounded-full ${className}`}>{children}</div>
    </motion.div>
  );
  return href ? <Link to={href}>{ButtonContent}</Link> : ButtonContent;
};

// 3D Orbiting Slabs with CORRECT prices
const OrbitingSlabs = () => {
  const [rotation, setRotation] = useState(0);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  
  useAnimationFrame((t) => setRotation(t * 0.012));
  
  useEffect(() => {
    const handleMouse = (e) => setMousePos({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', handleMouse);
    return () => window.removeEventListener('mousemove', handleMouse);
  }, []);

  return (
    <div className="relative h-[350px] w-full flex items-center justify-center" style={{ perspective: '1000px' }}>
      <div className="relative w-[350px] h-[280px]" style={{ transformStyle: 'preserve-3d' }}>
        {CARD_IMAGES.map((img, i) => {
          const baseAngle = (i / CARD_IMAGES.length) * Math.PI * 2;
          const angle = baseAngle + rotation * 0.01;
          const radius = 140;
          const x = Math.cos(angle) * radius;
          const z = Math.sin(angle) * radius;
          const scale = (z + radius) / (radius * 2) * 0.35 + 0.65;
          const opacity = (z + radius) / (radius * 2) * 0.5 + 0.5;
          const zIndex = Math.round((z + radius) * 10);
          
          return (
            <motion.div key={i} className="absolute left-1/2 top-1/2 w-24 md:w-32 cursor-pointer"
              style={{ x, zIndex, scale, opacity, translateX: '-50%', translateY: '-50%', rotateY: `${-angle * 20}deg` }}
              whileHover={{ scale: scale * 1.3, zIndex: 100 }}>
              <div className="rounded-2xl overflow-hidden shadow-2xl shadow-black/60 border border-white/20 bg-gradient-to-b from-white/10 to-transparent p-1">
                <div className="rounded-xl overflow-hidden">
                  <img src={img} alt="Slab" className="w-full aspect-[3/4] object-cover" />
                </div>
              </div>
              <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-center whitespace-nowrap">
                <div className="px-3 py-1 bg-black/90 backdrop-blur rounded-full border border-[#BCFF00]/40 mb-1">
                  <span className="text-[#BCFF00] font-bold text-sm">{SLAB_PRICES[i]}</span>
                </div>
                <span className="text-[10px] text-zinc-400 font-medium">{SLAB_GRADES[i]}</span>
              </div>
            </motion.div>
          );
        })}
      </div>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-40 h-40 bg-[#BCFF00]/5 rounded-full blur-[60px]" />
      </div>
    </div>
  );
};

// Holographic Feature Card - 3D depth layers, particle trails, hologram shimmer
const HolographicFeatureCard = ({ icon: Icon, title, desc, color, index }) => {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const [trails, setTrails] = useState([]);
  const cardRef = useRef(null);
  const [offset, setOffset] = useState({ x: 0, y: 0, rotateX: 0, rotateY: 0 });
  const [glitchText, setGlitchText] = useState(title);
  const [scanLine, setScanLine] = useState(0);

  // Hologram scan line effect
  useEffect(() => {
    if (!isHovered) return;
    const interval = setInterval(() => setScanLine(prev => (prev + 2) % 100), 30);
    return () => clearInterval(interval);
  }, [isHovered]);

  // Text scramble effect
  useEffect(() => {
    if (!isHovered) { setGlitchText(title); return; }
    const chars = '01!@#$%&*<>[]{}';
    let iterations = 0;
    const interval = setInterval(() => {
      setGlitchText(title.split('').map((char, i) => 
        i < iterations ? char : chars[Math.floor(Math.random() * chars.length)]
      ).join(''));
      iterations += 0.5;
      if (iterations >= title.length) clearInterval(interval);
    }, 30);
    return () => clearInterval(interval);
  }, [isHovered, title]);

  // Mouse tracking with particle trails
  useEffect(() => {
    if (!cardRef.current || !isHovered) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (mousePos.x - rect.left - rect.width / 2) / rect.width;
    const y = (mousePos.y - rect.top - rect.height / 2) / rect.height;
    setOffset({ x: x * 30, y: y * 30, rotateX: y * -20, rotateY: x * 20 });
    
    // Add particle trail
    if (Math.random() > 0.5) {
      setTrails(prev => [...prev.slice(-15), {
        id: Date.now(),
        x: mousePos.x - rect.left,
        y: mousePos.y - rect.top,
      }]);
    }
  }, [mousePos, isHovered]);

  useEffect(() => {
    const handleMouse = (e) => setMousePos({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', handleMouse);
    return () => window.removeEventListener('mousemove', handleMouse);
  }, []);

  return (
    <motion.div ref={cardRef}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => { setIsHovered(false); setOffset({ x: 0, y: 0, rotateX: 0, rotateY: 0 }); setTrails([]); }}
      initial={{ opacity: 0, y: 60, rotateX: -15 }}
      whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
      viewport={{ once: false, amount: 0.3 }}
      transition={{ delay: index * 0.15, duration: 0.8, type: 'spring' }}
      animate={{ 
        x: offset.x, 
        y: offset.y,
        rotateX: offset.rotateX,
        rotateY: offset.rotateY,
      }}
      style={{ transformStyle: 'preserve-3d', perspective: '1200px' }}
      className="relative p-8 rounded-2xl cursor-pointer overflow-hidden group"
    >
      {/* Background layers for depth */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent rounded-2xl" />
      <motion.div 
        className="absolute inset-0 rounded-2xl border"
        animate={{ 
          borderColor: isHovered ? color : 'rgba(255,255,255,0.05)',
          boxShadow: isHovered ? `0 0 40px ${color}40, inset 0 0 60px ${color}10` : 'none'
        }}
        transition={{ duration: 0.4 }}
      />
      
      {/* Holographic scan line */}
      {isHovered && (
        <motion.div 
          className="absolute left-0 right-0 h-[2px] pointer-events-none z-20"
          style={{ 
            top: `${scanLine}%`,
            background: `linear-gradient(90deg, transparent, ${color}80, transparent)`,
            boxShadow: `0 0 10px ${color}`
          }}
        />
      )}
      
      {/* Particle trails */}
      {trails.map((trail, i) => (
        <motion.div
          key={trail.id}
          className="absolute w-2 h-2 rounded-full pointer-events-none"
          style={{ left: trail.x, top: trail.y, backgroundColor: color }}
          initial={{ scale: 1, opacity: 0.8 }}
          animate={{ scale: 0, opacity: 0 }}
          transition={{ duration: 0.5 }}
        />
      ))}
      
      {/* Floating 3D icon with orbit ring */}
      <div className="relative mb-5" style={{ transformStyle: 'preserve-3d' }}>
        <motion.div 
          className="w-16 h-16 rounded-2xl flex items-center justify-center relative"
          style={{ 
            backgroundColor: `${color}15`,
            transform: 'translateZ(30px)',
          }}
          animate={{ 
            y: isHovered ? [0, -12, 0] : 0,
            rotateY: isHovered ? 360 : 0,
          }}
          transition={{ 
            y: { duration: 2, repeat: isHovered ? Infinity : 0 },
            rotateY: { duration: 3, repeat: isHovered ? Infinity : 0, ease: 'linear' }
          }}
        >
          <Icon className="w-8 h-8 relative z-10" style={{ color }} />
          {/* Orbit ring */}
          {isHovered && (
            <motion.div 
              className="absolute inset-[-8px] rounded-full border-2 border-dashed"
              style={{ borderColor: `${color}40` }}
              animate={{ rotate: 360 }}
              transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
            />
          )}
        </motion.div>
        {/* Icon reflection */}
        <motion.div 
          className="absolute top-full left-0 right-0 h-8 opacity-20 blur-sm"
          style={{ 
            background: `linear-gradient(to bottom, ${color}40, transparent)`,
            transform: 'scaleY(-0.3) translateY(-100%)'
          }}
        />
      </div>
      
      {/* Scrambling title */}
      <h3 className="text-xl font-bold mb-2 relative z-10 font-mono tracking-wide" style={{ transform: 'translateZ(20px)' }}>
        <span className="text-white">{glitchText}</span>
        {isHovered && <span className="text-[#BCFF00] animate-pulse">_</span>}
      </h3>
      
      {/* Description with reveal */}
      <motion.p 
        className="text-zinc-400 text-sm relative z-10 leading-relaxed"
        style={{ transform: 'translateZ(10px)' }}
        animate={{ opacity: isHovered ? 1 : 0.7 }}
      >
        {desc}
      </motion.p>
      
      {/* Corner accents */}
      <div className="absolute top-3 left-3 w-4 h-4 border-l-2 border-t-2 rounded-tl" style={{ borderColor: isHovered ? color : 'transparent' }} />
      <div className="absolute top-3 right-3 w-4 h-4 border-r-2 border-t-2 rounded-tr" style={{ borderColor: isHovered ? color : 'transparent' }} />
      <div className="absolute bottom-3 left-3 w-4 h-4 border-l-2 border-b-2 rounded-bl" style={{ borderColor: isHovered ? color : 'transparent' }} />
      <div className="absolute bottom-3 right-3 w-4 h-4 border-r-2 border-b-2 rounded-br" style={{ borderColor: isHovered ? color : 'transparent' }} />
      
      {/* Data stream background */}
      {isHovered && (
        <div className="absolute inset-0 overflow-hidden opacity-10 pointer-events-none">
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute text-[8px] font-mono whitespace-nowrap"
              style={{ color, left: `${i * 25}%`, top: 0 }}
              animate={{ y: ['-100%', '100%'] }}
              transition={{ duration: 3 + i, repeat: Infinity, ease: 'linear', delay: i * 0.5 }}
            >
              {Array(20).fill('01').join(' ')}
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
};

// Quantum Step - layered 3D depth, morphing numbers, energy beams
const QuantumStep = ({ step, title, desc, color, index }) => {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isInView, setIsInView] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [energyBeams, setEnergyBeams] = useState([]);
  const [morphPhase, setMorphPhase] = useState(0);

  // Energy beam generation
  useEffect(() => {
    if (!isHovered) { setEnergyBeams([]); return; }
    const interval = setInterval(() => {
      setEnergyBeams(prev => [...prev.slice(-8), {
        id: Date.now(),
        angle: Math.random() * 360,
        length: 40 + Math.random() * 60,
      }]);
    }, 150);
    return () => clearInterval(interval);
  }, [isHovered]);

  // Morph animation for number
  useEffect(() => {
    const interval = setInterval(() => setMorphPhase(p => (p + 1) % 360), 50);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleMouse = (e) => setMousePos({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', handleMouse);
    return () => window.removeEventListener('mousemove', handleMouse);
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
    const dx = mousePos.x - cx, dy = mousePos.y - cy, dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 400 && dist > 0) {
      const f = (400 - dist) / 400;
      setOffset({ x: (dx / dist) * f * 50, y: (dy / dist) * f * 35 });
    } else {
      setOffset(prev => ({ x: prev.x * 0.9, y: prev.y * 0.9 }));
    }
  }, [mousePos]);

  const isReversed = index % 2 === 1;
  const floatY = Math.sin(Date.now() * 0.001 + index * 2) * 8;
  const skewX = Math.sin(morphPhase * 0.02) * 3;
  const scaleY = 1 + Math.sin(morphPhase * 0.03) * 0.05;

  return (
    <motion.div ref={containerRef}
      initial={{ opacity: 0, x: isReversed ? 120 : -120, scale: 0.8 }}
      whileInView={{ opacity: 1, x: 0, scale: 1 }}
      onViewportEnter={() => setIsInView(true)}
      onViewportLeave={() => setIsInView(false)}
      viewport={{ once: false, amount: 0.5 }}
      transition={{ duration: 0.9, type: 'spring', bounce: 0.3 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className={`relative flex items-center gap-8 md:gap-12 py-8 ${isReversed ? 'flex-row-reverse text-right' : ''}`}
    >
      {/* Giant morphing number with layers */}
      <div className="relative" style={{ perspective: '800px' }}>
        {/* Background shadow layer */}
        <motion.span 
          className="absolute text-[100px] md:text-[160px] font-black leading-none select-none blur-sm"
          style={{ color: 'rgba(0,0,0,0.5)', transform: 'translate(4px, 4px)' }}
          animate={{ x: offset.x * 0.3, y: offset.y * 0.3 + floatY }}
        >
          {step}
        </motion.span>
        
        {/* Middle glow layer */}
        <motion.span 
          className="absolute text-[100px] md:text-[160px] font-black leading-none select-none blur-md"
          style={{ color }}
          animate={{ 
            x: offset.x * 0.5, 
            y: offset.y * 0.5 + floatY,
            opacity: isHovered ? 0.6 : 0.2,
          }}
        >
          {step}
        </motion.span>
        
        {/* Main number with morph */}
        <motion.span 
          className="relative text-[100px] md:text-[160px] font-black leading-none select-none"
          style={{ 
            color,
            textShadow: isHovered ? `0 0 60px ${color}, 0 0 120px ${color}40` : `0 0 30px ${color}60`,
          }}
          animate={{ 
            x: offset.x,
            y: offset.y + floatY,
            skewX,
            scaleY,
            rotateY: offset.x * 0.2,
            rotateX: offset.y * -0.2,
          }}
          transition={{ type: 'spring', stiffness: 150, damping: 20 }}
        >
          {step}
        </motion.span>
        
        {/* Energy beams radiating from number */}
        {energyBeams.map(beam => (
          <motion.div
            key={beam.id}
            className="absolute top-1/2 left-1/2 h-[2px] origin-left pointer-events-none"
            style={{
              width: beam.length,
              background: `linear-gradient(90deg, ${color}, transparent)`,
              rotate: `${beam.angle}deg`,
              boxShadow: `0 0 8px ${color}`,
            }}
            initial={{ opacity: 1, scaleX: 0 }}
            animate={{ opacity: 0, scaleX: 1 }}
            transition={{ duration: 0.6 }}
          />
        ))}
        
        {/* Orbiting particles around number */}
        {isInView && [...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 rounded-full"
            style={{ 
              backgroundColor: color,
              boxShadow: `0 0 10px ${color}`,
              top: '50%', left: '50%',
            }}
            animate={{
              x: [0, Math.cos((i / 3) * Math.PI * 2) * 80, 0],
              y: [0, Math.sin((i / 3) * Math.PI * 2) * 80, 0],
              scale: [0.5, 1, 0.5],
              opacity: [0.3, 0.8, 0.3],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              delay: i * 1,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>
      
      {/* Text content with layered reveal */}
      <div className="relative z-10">
        {/* Connecting line to number */}
        <motion.div 
          className={`absolute top-1/2 ${isReversed ? 'right-full mr-4' : 'left-full ml-4'} h-[1px] w-16`}
          style={{ background: `linear-gradient(${isReversed ? '270deg' : '90deg'}, ${color}60, transparent)` }}
          animate={{ scaleX: isInView ? 1 : 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        />
        
        <motion.h3 
          className="text-3xl md:text-5xl font-bold mb-2"
          animate={{ x: offset.x * 0.2, y: offset.y * 0.2 }}
        >
          <span className="bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">{title}</span>
        </motion.h3>
        
        <motion.p 
          className="text-zinc-400 text-lg max-w-xs"
          animate={{ x: offset.x * 0.1, y: offset.y * 0.1, opacity: isInView ? 1 : 0.5 }}
          transition={{ type: 'spring', stiffness: 150, damping: 25 }}
        >
          {desc}
        </motion.p>
        
        {/* Action hint on hover */}
        <motion.div
          className={`mt-3 flex items-center gap-2 text-sm ${isReversed ? 'justify-end' : ''}`}
          style={{ color }}
          animate={{ opacity: isHovered ? 1 : 0, x: isHovered ? 0 : (isReversed ? 10 : -10) }}
        >
          {!isReversed && <span className="w-4 h-[1px]" style={{ backgroundColor: color }} />}
          <span className="font-medium">{index === 0 ? 'Upload slabs' : index === 1 ? 'Make offers' : 'Cash out'}</span>
          {isReversed && <span className="w-4 h-[1px]" style={{ backgroundColor: color }} />}
        </motion.div>
      </div>
    </motion.div>
  );
};

// Particle text for "Slabby"
const ParticleTextCanvas = ({ children, className }) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);
  const particlesRef = useRef([]);
  const animationRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setIsVisible(entry.isIntersecting), { threshold: 0.5 });
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = 350; canvas.height = 90;
    ctx.fillStyle = '#BCFF00';
    ctx.font = 'bold 60px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(children, canvas.width / 2, canvas.height / 2);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    particlesRef.current = [];
    for (let y = 0; y < canvas.height; y += 3) {
      for (let x = 0; x < canvas.width; x += 3) {
        if (imageData.data[(y * canvas.width + x) * 4 + 3] > 128) {
          particlesRef.current.push({
            targetX: x, targetY: y,
            x: Math.random() * canvas.width, y: Math.random() * canvas.height,
            size: Math.random() * 2 + 1, speed: Math.random() * 0.03 + 0.01,
          });
        }
      }
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particlesRef.current.forEach(p => {
        if (isVisible) { p.x += (p.targetX - p.x) * p.speed; p.y += (p.targetY - p.y) * p.speed; }
        else { p.x += (Math.random() - 0.5) * 3; p.y += (Math.random() - 0.5) * 3; }
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fillStyle = '#BCFF00'; ctx.fill();
      });
      animationRef.current = requestAnimationFrame(animate);
    };
    animate();
    return () => cancelAnimationFrame(animationRef.current);
  }, [children, isVisible]);

  return (
    <div ref={containerRef} className={className}>
      <canvas ref={canvasRef} className="w-full max-w-[350px] h-[90px]" />
    </div>
  );
};

// Floating Metric - gravitational number with trailing particles
const FloatingMetric = ({ value, label, delay }) => {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const [displayValue, setDisplayValue] = useState(value);
  const [particles, setParticles] = useState([]);
  const containerRef = useRef(null);
  const [offset, setOffset] = useState({ x: 0, y: 0, rotate: 0 });

  // Counter animation on view
  useEffect(() => {
    const numericPart = value.replace(/[^0-9.]/g, '');
    const prefix = value.match(/^[^0-9]*/)?.[0] || '';
    const suffix = value.match(/[^0-9]*$/)?.[0] || '';
    const targetNum = parseFloat(numericPart) || 0;
    
    let current = 0;
    const duration = 2000;
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      current = targetNum * eased;
      
      if (numericPart.includes('.')) {
        setDisplayValue(`${prefix}${current.toFixed(1)}${suffix}`);
      } else {
        setDisplayValue(`${prefix}${Math.floor(current)}${suffix}`);
      }
      
      if (progress < 1) requestAnimationFrame(animate);
      else setDisplayValue(value);
    };
    
    const timeout = setTimeout(animate, delay * 1000 + 500);
    return () => clearTimeout(timeout);
  }, [value, delay]);

  // Mouse interaction
  useEffect(() => {
    const handleMouse = (e) => setMousePos({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', handleMouse);
    return () => window.removeEventListener('mousemove', handleMouse);
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
    const dx = mousePos.x - cx, dy = mousePos.y - cy, dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist < 200 && dist > 0) {
      const f = (200 - dist) / 200;
      setOffset({ 
        x: (dx / dist) * f * 20, 
        y: (dy / dist) * f * 15,
        rotate: (dx / dist) * f * 8
      });
      
      // Spawn particles on hover movement
      if (isHovered && Math.random() > 0.7) {
        setParticles(prev => [...prev.slice(-12), {
          id: Date.now() + Math.random(),
          x: mousePos.x - rect.left,
          y: mousePos.y - rect.top,
          vx: (Math.random() - 0.5) * 4,
          vy: -Math.random() * 3 - 1,
        }]);
      }
    } else {
      setOffset(prev => ({ x: prev.x * 0.9, y: prev.y * 0.9, rotate: prev.rotate * 0.9 }));
    }
  }, [mousePos, isHovered]);

  // Animate particles
  useEffect(() => {
    if (particles.length === 0) return;
    const interval = setInterval(() => {
      setParticles(prev => prev
        .map(p => ({ ...p, x: p.x + p.vx, y: p.y + p.vy, vy: p.vy + 0.1 }))
        .filter(p => p.y < 100)
      );
    }, 30);
    return () => clearInterval(interval);
  }, [particles.length]);

  const floatY = Math.sin(Date.now() * 0.002 + delay * 5) * 6;

  return (
    <motion.div 
      ref={containerRef}
      initial={{ opacity: 0, y: 40, scale: 0.9 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: false }}
      transition={{ delay, duration: 0.6, type: 'spring' }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className="relative text-center cursor-default"
    >
      {/* Glow background */}
      <motion.div 
        className="absolute inset-0 -m-4 rounded-2xl bg-[#BCFF00]/5 blur-xl"
        animate={{ opacity: isHovered ? 0.3 : 0.1, scale: isHovered ? 1.2 : 1 }}
      />
      
      {/* Particles */}
      {particles.map(p => (
        <motion.div
          key={p.id}
          className="absolute w-1 h-1 rounded-full bg-[#BCFF00]"
          style={{ left: p.x, top: p.y, boxShadow: '0 0 6px #BCFF00' }}
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
        />
      ))}
      
      {/* Value */}
      <motion.div 
        className="text-4xl md:text-5xl font-bold text-[#BCFF00] relative"
        animate={{ 
          x: offset.x, 
          y: offset.y + floatY,
          rotate: offset.rotate,
        }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        style={{ textShadow: isHovered ? '0 0 40px rgba(188,255,0,0.6)' : '0 0 20px rgba(188,255,0,0.3)' }}
      >
        {displayValue}
      </motion.div>
      
      {/* Label */}
      <motion.div 
        className="text-zinc-500 text-sm mt-1 font-medium"
        animate={{ x: offset.x * 0.3, y: offset.y * 0.3 }}
      >
        {label}
      </motion.div>
      
      {/* Underline on hover */}
      <motion.div 
        className="absolute -bottom-2 left-1/2 h-[2px] bg-[#BCFF00]/50 -translate-x-1/2"
        animate={{ width: isHovered ? '80%' : '0%' }}
        transition={{ duration: 0.3 }}
      />
    </motion.div>
  );
};

export default function Landing() {
  const { isAuthenticated } = useAuth();
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);

  useEffect(() => {
    const handleMouse = (e) => { mouseX.set(e.clientX / window.innerWidth); mouseY.set(e.clientY / window.innerHeight); };
    window.addEventListener('mousemove', handleMouse);
    return () => window.removeEventListener('mousemove', handleMouse);
  }, [mouseX, mouseY]);

  return (
    <div className="bg-[#000] text-white min-h-screen flex flex-col">
      <ParticleField mouseX={mouseX} mouseY={mouseY} />

      {/* Navigation */}
      <motion.nav initial={{ y: -100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.8 }}
        className="fixed top-0 left-0 right-0 z-50 px-6 py-5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BreathingLogo />
            <span className="font-semibold text-lg hidden sm:block">Slabby</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2">
              <MagneticNavItem href="/marketplace">Marketplace</MagneticNavItem>
              <MagneticNavItem href="/razz">Live Razz</MagneticNavItem>
            </div>
            <LiquidButton href={isAuthenticated ? "/marketplace" : "/register"} className="px-5 py-2.5 font-semibold">
              {isAuthenticated ? 'Open App' : 'Get Started'}
            </LiquidButton>
          </div>
        </div>
      </motion.nav>

      <main className="flex-grow">
        {/* HERO */}
        <section className="relative min-h-screen flex items-center justify-center px-6">
          <div className="relative z-20 text-center max-w-4xl">
            <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1 }}>
              <h1 className="text-5xl sm:text-7xl lg:text-8xl font-bold tracking-tight leading-[0.95] mb-2">
                <PhysicsText className="text-white" isHero>The Future of</PhysicsText>
              </h1>
              <h1 className="text-5xl sm:text-7xl lg:text-8xl font-bold tracking-tight leading-[0.95] mb-6">
                <PhysicsText className="text-[#BCFF00]" isHero>Slab Trading</PhysicsText>
              </h1>
            </motion.div>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5, duration: 0.8 }}
              className="text-lg sm:text-xl text-zinc-400 mb-10 max-w-xl mx-auto h-[60px]">
              <GlitchTypewriter text="Premium graded slabs. Provably fair raffles. Every slab authenticated." />
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8, duration: 0.8 }}
              className="flex flex-col sm:flex-row gap-4 justify-center">
              <LiquidButton href="/register" className="h-14 px-8 text-base font-bold flex items-center gap-2">
                Start Trading <ArrowRight className="w-5 h-5" />
              </LiquidButton>
              <LiquidButton href="/razz" variant="secondary" className="h-14 px-8 text-base font-bold flex items-center gap-2">
                <Play className="w-5 h-5" /> Live Razz
              </LiquidButton>
            </motion.div>
          </div>
          <motion.div animate={{ scale: [1, 1.15, 1], opacity: [0.1, 0.2, 0.1] }} transition={{ duration: 4, repeat: Infinity }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-[#BCFF00]/10 rounded-full blur-[120px] pointer-events-none" />
        </section>

        {/* Orbiting Slabs */}
        <section className="relative py-12 px-6"><OrbitingSlabs /></section>

        {/* Floating Metrics - Gravitational Data Points */}
        <section className="relative py-16 px-6 overflow-hidden">
          <div className="max-w-5xl mx-auto">
            <motion.div 
              className="relative flex flex-wrap justify-center gap-8 md:gap-16"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: false }}
            >
              <FloatingMetric value="$2.4M" label="Weekly Volume" delay={0} />
              <FloatingMetric value="12K+" label="Active Slabs" delay={0.1} />
              <FloatingMetric value="99.9%" label="Uptime" delay={0.2} />
              <FloatingMetric value="<3s" label="Avg Settlement" delay={0.3} />
            </motion.div>
          </div>
        </section>

        {/* Why Slabby - Holographic Feature Cards */}
        <section className="relative py-24 px-6 overflow-hidden">
          {/* Animated grid background */}
          <div className="absolute inset-0 opacity-[0.03]">
            <div className="absolute inset-0" style={{
              backgroundImage: `
                linear-gradient(rgba(188,255,0,0.3) 1px, transparent 1px),
                linear-gradient(90deg, rgba(188,255,0,0.3) 1px, transparent 1px)
              `,
              backgroundSize: '60px 60px',
            }} />
          </div>
          
          <div className="max-w-5xl mx-auto relative">
            <motion.div 
              className="text-center mb-16"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: false }}
            >
              <motion.div 
                className="inline-flex items-center gap-3 mb-4 text-xs font-mono tracking-widest text-zinc-500"
                initial={{ y: -20, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: false }}
              >
                <span className="w-8 h-[1px] bg-[#BCFF00]/40" />
                <span>PLATFORM FEATURES</span>
                <span className="w-8 h-[1px] bg-[#BCFF00]/40" />
              </motion.div>
              <div className="flex items-center justify-center gap-4 flex-wrap">
                <motion.span 
                  className="text-4xl sm:text-5xl font-bold text-white"
                  initial={{ x: -50, opacity: 0 }}
                  whileInView={{ x: 0, opacity: 1 }}
                  viewport={{ once: false }}
                >
                  Why
                </motion.span>
                <ParticleTextCanvas>Slabby</ParticleTextCanvas>
              </div>
            </motion.div>
            
            <div className="grid md:grid-cols-2 gap-6" style={{ perspective: '1200px' }}>
              <HolographicFeatureCard icon={Shuffle} title="P2P Trading" desc="Trade graded slabs directly with collectors. Full escrow protection on every transaction." color="#10b981" index={0} />
              <HolographicFeatureCard icon={Dice6} title="Provably Fair" desc="SHA256 verified raffles. Audit any draw with cryptographic proof." color="#8b5cf6" index={1} />
              <HolographicFeatureCard icon={Lock} title="Authenticated" desc="Only PSA, BGS, CGC graded slabs. Every card verified." color="#f59e0b" index={2} />
              <HolographicFeatureCard icon={Zap} title="Instant Payouts" desc="Settle in seconds. Withdraw to your bank anytime." color="#ef4444" index={3} />
            </div>
          </div>
        </section>

        {/* How it works - Quantum Steps */}
        <section className="relative py-24 px-6 overflow-hidden">
          {/* Vertical beam */}
          <motion.div 
            className="absolute left-1/2 top-0 bottom-0 w-[1px] -translate-x-1/2 hidden md:block"
            style={{ background: 'linear-gradient(to bottom, transparent, #BCFF00, #BCFF00, transparent)' }}
            initial={{ scaleY: 0 }}
            whileInView={{ scaleY: 1 }}
            viewport={{ once: false }}
            transition={{ duration: 1.5 }}
          />
          
          <div className="max-w-5xl mx-auto">
            <motion.div 
              className="text-center mb-16"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: false }}
            >
              <motion.div 
                className="inline-flex items-center gap-3 mb-4 text-xs font-mono tracking-widest text-zinc-500"
                initial={{ y: -20, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: false }}
              >
                <span className="w-8 h-[1px] bg-[#BCFF00]/40" />
                <span>HOW IT WORKS</span>
                <span className="w-8 h-[1px] bg-[#BCFF00]/40" />
              </motion.div>
              <h2 className="text-4xl sm:text-5xl font-bold">
                <span className="text-white">Three </span>
                <span className="text-[#BCFF00]">Simple</span>
                <span className="text-white"> Steps</span>
              </h2>
            </motion.div>
            
            <div className="space-y-8 md:space-y-4">
              <QuantumStep step="01" title="List" desc="Upload your graded slabs with photos. Set your price or create a razz." color="#BCFF00" index={0} />
              <QuantumStep step="02" title="Trade" desc="Accept offers, counter, or let the razz decide. Full escrow protection." color="#8b5cf6" index={1} />
              <QuantumStep step="03" title="Profit" desc="Get paid instantly to your wallet. Withdraw anytime." color="#10b981" index={2} />
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="relative py-28 px-6">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: false }}
            className="max-w-3xl mx-auto text-center relative">
            <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.2, 0.1] }} transition={{ duration: 3, repeat: Infinity }}
              className="absolute inset-0 -z-10 flex items-center justify-center">
              <div className="w-[250px] h-[250px] bg-[#BCFF00]/15 rounded-full blur-[80px]" />
            </motion.div>
            <h2 className="text-5xl sm:text-6xl font-bold mb-2">
              <GravityText className="text-white justify-center">Ready to</GravityText>
            </h2>
            <h2 className="text-5xl sm:text-6xl font-bold mb-6">
              <GravityText className="text-[#BCFF00] justify-center">collect?</GravityText>
            </h2>
            <p className="text-lg text-zinc-400 mb-10">Join the premium slab marketplace.</p>
            <VortexButton href="/register" className="h-16 px-12 text-lg flex items-center gap-3">
              Enter the Vault <ArrowRight className="w-5 h-5" />
            </VortexButton>
          </motion.div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-40 border-t border-white/5 py-5 px-6 bg-black/90 mt-auto">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#BCFF00] flex items-center justify-center">
              <span className="font-bold text-black text-xs">S</span>
            </div>
            <span className="font-medium text-sm">Slabby</span>
          </div>
          <div className="flex items-center gap-5 text-xs text-zinc-500">
            <Link to="/marketplace" className="hover:text-white transition-colors">Marketplace</Link>
            <Link to="/razz" className="hover:text-white transition-colors">Razz</Link>
            <span>© 2026</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
