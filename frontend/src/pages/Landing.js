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
      const mx = mouseX.get() * canvas.width;
      const my = mouseY.get() * canvas.height;

      particles.current.forEach((p, i) => {
        const dx = mx - p.x, dy = my - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 100) {
          const force = (100 - dist) / 100;
          p.vx += (dx / dist) * force * 0.3;
          p.vy += (dy / dist) * force * 0.3;
        }
        p.x += p.vx; p.y += p.vy; p.vx *= 0.96; p.vy *= 0.96;
        if (p.x < 0) p.x = canvas.width; if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height; if (p.y > canvas.height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(188, 255, 0, ${p.alpha * (dist < 100 ? 0.8 : 0.3)})`;
        ctx.fill();

        particles.current.forEach((p2, j) => {
          if (j <= i) return;
          const d = Math.sqrt((p.x - p2.x) ** 2 + (p.y - p2.y) ** 2);
          if (d < 50) {
            ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(188, 255, 0, ${(1 - d / 50) * 0.06})`;
            ctx.stroke();
          }
        });
      });
      animationRef.current = requestAnimationFrame(animate);
    };
    animate();
    return () => { window.removeEventListener('resize', resize); cancelAnimationFrame(animationRef.current); };
  }, [mouseX, mouseY]);

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" />;
};

// 3D Physics Letter - each letter floats and reacts to mouse
const PhysicsLetter = ({ letter, index, mousePos, isHero = false }) => {
  const [physics, setPhysics] = useState({
    x: 0, y: 0, rotateX: 0, rotateY: 0, rotateZ: 0
  });
  const letterRef = useRef(null);
  const velocity = useRef({ x: 0, y: 0, rotX: 0, rotY: 0 });

  useEffect(() => {
    if (!letterRef.current) return;
    
    const rect = letterRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const dx = mousePos.x - centerX;
    const dy = mousePos.y - centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist < 200 && dist > 0) {
      const force = (200 - dist) / 200;
      velocity.current.x += (dx / dist) * force * 2;
      velocity.current.y += (dy / dist) * force * 1.5;
      velocity.current.rotY += (dx / dist) * force * 3;
      velocity.current.rotX += (dy / dist) * force * -2;
    }
    
    // Apply physics with damping
    velocity.current.x *= 0.92;
    velocity.current.y *= 0.92;
    velocity.current.rotX *= 0.9;
    velocity.current.rotY *= 0.9;
    
    setPhysics({
      x: velocity.current.x * 8,
      y: velocity.current.y * 6,
      rotateX: velocity.current.rotX * 15,
      rotateY: velocity.current.rotY * 15,
      rotateZ: Math.sin(Date.now() * 0.001 + index) * 2,
    });
  }, [mousePos, index]);

  // Floating animation
  const floatY = Math.sin(Date.now() * 0.002 + index * 0.5) * 3;

  return (
    <motion.span
      ref={letterRef}
      animate={{
        x: physics.x,
        y: physics.y + floatY,
        rotateX: physics.rotateX,
        rotateY: physics.rotateY,
        rotateZ: physics.rotateZ,
      }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className="inline-block"
      style={{
        transformStyle: 'preserve-3d',
        textShadow: Math.abs(physics.x) > 1 || Math.abs(physics.y) > 1 
          ? `0 0 30px rgba(188,255,0,0.8), 0 0 60px rgba(188,255,0,0.4)` 
          : isHero ? '0 0 20px rgba(188,255,0,0.3)' : 'none',
      }}
    >
      {letter === ' ' ? '\u00A0' : letter}
    </motion.span>
  );
};

// 3D Physics Text - text with floating physics letters
const PhysicsText = ({ children, className, isHero = false }) => {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const handleMouse = (e) => setMousePos({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', handleMouse);
    
    // Force updates for continuous animation
    const interval = setInterval(() => forceUpdate(n => n + 1), 50);
    
    return () => {
      window.removeEventListener('mousemove', handleMouse);
      clearInterval(interval);
    };
  }, []);

  return (
    <span className={`inline-flex flex-wrap justify-center ${className}`} style={{ perspective: '1000px' }}>
      {children.split('').map((letter, i) => (
        <PhysicsLetter key={i} letter={letter} index={i} mousePos={mousePos} isHero={isHero} />
      ))}
    </span>
  );
};

// Typewriter with glitch effect
const GlitchTypewriter = ({ text, className }) => {
  const [displayText, setDisplayText] = useState('');
  const [cursorVisible, setCursorVisible] = useState(true);
  const [isGlitching, setIsGlitching] = useState(false);
  const glitchChars = '!@#$%^&*()_+-=[]{}|;:,.<>?/~`';

  useEffect(() => {
    let i = 0;
    const typeInterval = setInterval(() => {
      if (i < text.length) {
        // Random glitch
        if (Math.random() < 0.1) {
          setIsGlitching(true);
          setDisplayText(text.slice(0, i) + glitchChars[Math.floor(Math.random() * glitchChars.length)]);
          setTimeout(() => {
            setIsGlitching(false);
            setDisplayText(text.slice(0, i + 1));
          }, 50);
        } else {
          setDisplayText(text.slice(0, i + 1));
        }
        i++;
      } else {
        clearInterval(typeInterval);
      }
    }, 60);

    const cursorInterval = setInterval(() => setCursorVisible(v => !v), 500);

    return () => {
      clearInterval(typeInterval);
      clearInterval(cursorInterval);
    };
  }, [text]);

  return (
    <span className={className}>
      <span className={isGlitching ? 'text-red-500' : ''}>{displayText}</span>
      <span className={`${cursorVisible ? 'opacity-100' : 'opacity-0'} text-[#BCFF00] transition-opacity`}>|</span>
    </span>
  );
};

// Liquid morphing button with wave animation
const LiquidButton = ({ children, className, href }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [ripples, setRipples] = useState([]);

  const handleClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const newRipple = { x, y, id: Date.now() };
    setRipples(prev => [...prev, newRipple]);
    setTimeout(() => setRipples(prev => prev.filter(r => r.id !== newRipple.id)), 1000);
  };

  const ButtonContent = (
    <motion.div
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onClick={handleClick}
      className="relative overflow-hidden rounded-full cursor-pointer"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Liquid background */}
      <motion.div
        className="absolute inset-0 bg-[#BCFF00]"
        animate={{
          borderRadius: isHovered 
            ? ['25% 75% 75% 25% / 60% 40% 60% 40%', '75% 25% 25% 75% / 40% 60% 40% 60%', '25% 75% 75% 25% / 60% 40% 60% 40%']
            : '50% 50% 50% 50% / 50% 50% 50% 50%',
        }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      />
      
      {/* Wave animation */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
        animate={{ x: isHovered ? ['0%', '200%'] : '0%' }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
        style={{ width: '50%' }}
      />
      
      {/* Ripples */}
      {ripples.map(ripple => (
        <motion.div
          key={ripple.id}
          className="absolute rounded-full bg-white/30"
          initial={{ width: 0, height: 0, x: ripple.x, y: ripple.y }}
          animate={{ width: 300, height: 300, x: ripple.x - 150, y: ripple.y - 150, opacity: 0 }}
          transition={{ duration: 0.8 }}
        />
      ))}
      
      {/* Content */}
      <div className={`relative z-10 ${className}`}>
        {children}
      </div>
    </motion.div>
  );

  return href ? <Link to={href}>{ButtonContent}</Link> : ButtonContent;
};

// Magnetic nav item with liquid underline
const MagneticNavItem = ({ children, href }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const ref = useRef(null);

  const handleMouse = (e) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = (e.clientX - rect.left - rect.width / 2) * 0.3;
    const y = (e.clientY - rect.top - rect.height / 2) * 0.3;
    setOffset({ x, y });
  };

  return (
    <Link to={href}>
      <motion.div
        ref={ref}
        onMouseMove={handleMouse}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => { setIsHovered(false); setOffset({ x: 0, y: 0 }); }}
        animate={{ x: offset.x, y: offset.y }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        className="relative px-3 py-1 cursor-pointer"
      >
        <span className="text-sm text-zinc-400 hover:text-white transition-colors">{children}</span>
        {/* Liquid underline */}
        <motion.div
          className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#BCFF00] origin-left"
          initial={{ scaleX: 0 }}
          animate={{ 
            scaleX: isHovered ? 1 : 0,
            borderRadius: isHovered ? '0 50% 50% 0' : '0',
          }}
          transition={{ duration: 0.3 }}
        />
      </motion.div>
    </Link>
  );
};

// Breathing pulsing logo
const BreathingLogo = () => {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <Link to="/">
      <motion.div
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
        animate={{
          scale: isHovered ? 1.1 : [1, 1.05, 1],
          rotate: isHovered ? [0, 5, -5, 0] : 0,
        }}
        transition={{
          scale: { duration: isHovered ? 0.2 : 2, repeat: isHovered ? 0 : Infinity },
          rotate: { duration: 0.5 },
        }}
        className="relative"
      >
        <motion.div
          className="absolute inset-0 bg-[#BCFF00] rounded-xl blur-lg"
          animate={{ 
            opacity: isHovered ? 0.8 : [0.3, 0.6, 0.3],
            scale: isHovered ? 1.3 : [1, 1.2, 1],
          }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        <div className="relative w-10 h-10 rounded-xl bg-[#BCFF00] flex items-center justify-center shadow-[0_0_30px_rgba(188,255,0,0.5)]">
          <span className="font-bold text-black text-lg">S</span>
        </div>
      </motion.div>
    </Link>
  );
};

// Gravity letters for CTA - letters that float with physics
const GravityText = ({ children, className }) => {
  const [letters, setLetters] = useState([]);
  const containerRef = useRef(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    setLetters(children.split('').map((char, i) => ({
      char,
      id: i,
      x: 0,
      y: 0,
      vx: (Math.random() - 0.5) * 2,
      vy: (Math.random() - 0.5) * 2,
      rotation: 0,
    })));
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
        // Calculate base position
        const charWidth = 45; // Approximate
        const baseX = i * charWidth;
        const baseY = 0;
        
        // Mouse repulsion
        const dx = mousePos.x - (baseX + letter.x);
        const dy = mousePos.y - (baseY + letter.y);
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        let ax = 0, ay = 0;
        if (dist < 150 && dist > 0) {
          const force = (150 - dist) / 150;
          ax = -(dx / dist) * force * 0.8;
          ay = -(dy / dist) * force * 0.8;
        }
        
        // Spring back to origin
        ax += -letter.x * 0.05;
        ay += -letter.y * 0.05;
        
        // Apply physics
        let newVx = (letter.vx + ax) * 0.95;
        let newVy = (letter.vy + ay) * 0.95;
        let newX = letter.x + newVx;
        let newY = letter.y + newVy;
        let newRotation = letter.rotation + newVx * 2;
        
        return { ...letter, x: newX, y: newY, vx: newVx, vy: newVy, rotation: newRotation * 0.95 };
      }));
    }, 30);

    return () => {
      window.removeEventListener('mousemove', handleMouse);
      clearInterval(interval);
    };
  }, [mousePos]);

  return (
    <div ref={containerRef} className={`inline-flex ${className}`}>
      {letters.map((letter) => (
        <motion.span
          key={letter.id}
          animate={{
            x: letter.x,
            y: letter.y,
            rotate: letter.rotation,
          }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className="inline-block"
          style={{
            textShadow: (Math.abs(letter.x) > 5 || Math.abs(letter.y) > 5)
              ? '0 0 40px rgba(188,255,0,0.8), 0 0 80px rgba(188,255,0,0.4)'
              : '0 0 20px rgba(188,255,0,0.3)',
          }}
        >
          {letter.char === ' ' ? '\u00A0' : letter.char}
        </motion.span>
      ))}
    </div>
  );
};

// Vortex button with intense particle swirl
const VortexButton = ({ children, className, href }) => {
  const [particles, setParticles] = useState([]);
  const [isHovered, setIsHovered] = useState(false);
  const animationRef = useRef(null);

  useEffect(() => {
    const newParticles = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      angle: (i / 30) * Math.PI * 2,
      radius: 70 + Math.random() * 30,
      speed: 0.03 + Math.random() * 0.03,
      size: Math.random() * 3 + 1,
      offset: Math.random() * Math.PI * 2,
    }));
    setParticles(newParticles);
  }, []);

  // Animate particles
  const [time, setTime] = useState(0);
  useEffect(() => {
    const animate = () => {
      setTime(t => t + 1);
      animationRef.current = requestAnimationFrame(animate);
    };
    animate();
    return () => cancelAnimationFrame(animationRef.current);
  }, []);

  const ButtonContent = (
    <motion.div
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className="relative inline-block"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Vortex particles */}
      <div className="absolute inset-0 pointer-events-none" style={{ transform: 'translate(-30%, -30%)', width: '160%', height: '160%' }}>
        {particles.map((p) => {
          const currentAngle = p.angle + time * p.speed * (isHovered ? 3 : 1);
          const currentRadius = isHovered ? p.radius * 0.4 : p.radius;
          const x = Math.cos(currentAngle) * currentRadius + 80;
          const y = Math.sin(currentAngle) * currentRadius + 40;
          
          return (
            <motion.div
              key={p.id}
              className="absolute rounded-full bg-[#BCFF00]"
              style={{
                width: p.size * (isHovered ? 1.5 : 1),
                height: p.size * (isHovered ? 1.5 : 1),
                left: `${x}px`,
                top: `${y}px`,
                opacity: isHovered ? 0.9 : 0.4,
                boxShadow: isHovered ? '0 0 10px #BCFF00' : 'none',
              }}
            />
          );
        })}
      </div>
      
      {/* Glow */}
      <motion.div
        className="absolute inset-0 rounded-full bg-[#BCFF00] blur-2xl"
        animate={{ opacity: isHovered ? 0.5 : 0.15, scale: isHovered ? 1.3 : 1 }}
      />
      
      {/* Button */}
      <div className={`relative z-10 bg-[#BCFF00] text-black font-bold rounded-full ${className}`}>
        {children}
      </div>
    </motion.div>
  );

  return href ? <Link to={href}>{ButtonContent}</Link> : ButtonContent;
};

// 3D Orbiting Slabs
const OrbitingSlabs = () => {
  const [rotation, setRotation] = useState(0);
  useAnimationFrame((t) => setRotation(t * 0.015));

  const slabs = CARD_IMAGES.map((img, i) => {
    const angle = (i / CARD_IMAGES.length) * Math.PI * 2 + rotation * 0.01;
    const radius = 150;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const scale = (z + radius) / (radius * 2) * 0.4 + 0.6;
    const opacity = (z + radius) / (radius * 2) * 0.6 + 0.4;
    return { img, x, z, scale, opacity, angle, price: SLAB_PRICES[i], grade: SLAB_GRADES[i] };
  });

  return (
    <div className="relative h-[350px] w-full flex items-center justify-center" style={{ perspective: '1000px' }}>
      <div className="relative w-[350px] h-[280px]" style={{ transformStyle: 'preserve-3d' }}>
        {[...slabs].sort((a, b) => a.z - b.z).map((slab) => (
          <motion.div
            key={slab.img}
            className="absolute left-1/2 top-1/2 w-24 md:w-32 cursor-pointer"
            style={{ x: slab.x, z: slab.z, scale: slab.scale, opacity: slab.opacity, translateX: '-50%', translateY: '-50%', rotateY: `${-slab.angle * 25}deg` }}
            whileHover={{ scale: slab.scale * 1.3, zIndex: 100 }}
          >
            <div className="rounded-2xl overflow-hidden shadow-2xl shadow-black/60 border border-white/20 bg-gradient-to-b from-white/10 to-transparent p-1">
              <div className="rounded-xl overflow-hidden">
                <img src={slab.img} alt="Slab" className="w-full aspect-[3/4] object-cover" />
              </div>
            </div>
            <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-center">
              <div className="px-2.5 py-0.5 bg-black/90 backdrop-blur rounded-full border border-[#BCFF00]/40 mb-0.5">
                <span className="text-[#BCFF00] font-bold text-xs">{slab.price}</span>
              </div>
              <span className="text-[9px] text-zinc-400 font-medium">{slab.grade}</span>
            </div>
          </motion.div>
        ))}
      </div>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-40 h-40 bg-[#BCFF00]/5 rounded-full blur-[60px]" />
      </div>
    </div>
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
    canvas.width = 400; canvas.height = 100;
    
    ctx.fillStyle = '#BCFF00';
    ctx.font = 'bold 70px system-ui';
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
        if (isVisible) {
          p.x += (p.targetX - p.x) * p.speed;
          p.y += (p.targetY - p.y) * p.speed;
        } else {
          p.x += (Math.random() - 0.5) * 3;
          p.y += (Math.random() - 0.5) * 3;
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = '#BCFF00';
        ctx.fill();
      });
      animationRef.current = requestAnimationFrame(animate);
    };
    animate();
    return () => cancelAnimationFrame(animationRef.current);
  }, [children, isVisible]);

  return (
    <div ref={containerRef} className={className}>
      <canvas ref={canvasRef} className="w-full max-w-[400px] h-[100px]" />
    </div>
  );
};

// Scramble text
const ScrambleText = ({ children, className }) => {
  const [text, setText] = useState(children);
  const [done, setDone] = useState(false);
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !done) {
        setDone(true);
        let i = 0;
        const interval = setInterval(() => {
          setText(children.split('').map((c, j) => c === ' ' ? ' ' : j < i ? children[j] : chars[Math.floor(Math.random() * chars.length)]).join(''));
          if (i++ >= children.length) { clearInterval(interval); setText(children); }
        }, 30);
      }
    }, { threshold: 0.5 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [children, done]);

  return <span ref={ref} className={className}>{text}</span>;
};

export default function Landing() {
  const { isAuthenticated } = useAuth();
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);

  useEffect(() => {
    const handleMouse = (e) => {
      mouseX.set(e.clientX / window.innerWidth);
      mouseY.set(e.clientY / window.innerHeight);
    };
    window.addEventListener('mousemove', handleMouse);
    return () => window.removeEventListener('mousemove', handleMouse);
  }, [mouseX, mouseY]);

  return (
    <div className="bg-[#000] text-white min-h-screen flex flex-col">
      <ParticleField mouseX={mouseX} mouseY={mouseY} />

      {/* Navigation with magnetic items and breathing logo */}
      <motion.nav 
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="fixed top-0 left-0 right-0 z-50 px-6 py-5"
      >
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
            <LiquidButton href={isAuthenticated ? "/marketplace" : "/register"} className="px-5 py-2.5 text-black font-semibold">
              {isAuthenticated ? 'Open App' : 'Get Started'}
            </LiquidButton>
          </div>
        </div>
      </motion.nav>

      <main className="flex-grow">
        {/* HERO - 3D Physics text */}
        <section className="relative min-h-screen flex items-center justify-center px-6">
          <div className="relative z-20 text-center max-w-4xl">
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1 }}
            >
              <h1 className="text-5xl sm:text-7xl lg:text-8xl font-bold tracking-tight leading-[0.95] mb-2">
                <PhysicsText className="text-white" isHero>The Future of</PhysicsText>
              </h1>
              <h1 className="text-5xl sm:text-7xl lg:text-8xl font-bold tracking-tight leading-[0.95] mb-6">
                <PhysicsText className="text-[#BCFF00]" isHero>Slab Trading</PhysicsText>
              </h1>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.8 }}
              className="text-lg sm:text-xl text-zinc-400 mb-10 max-w-xl mx-auto h-[60px]"
            >
              <GlitchTypewriter text="Premium graded slabs. Provably fair raffles. Every slab authenticated." />
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.8 }}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <LiquidButton href="/register" className="h-14 px-8 text-base font-bold flex items-center gap-2">
                Start Trading <ArrowRight className="w-5 h-5" />
              </LiquidButton>
              <LiquidButton href="/razz" className="h-14 px-8 text-base font-bold flex items-center gap-2 !bg-white/10 !text-white border border-white/20">
                <Play className="w-5 h-5" /> Live Razz
              </LiquidButton>
            </motion.div>
          </div>

          <motion.div
            animate={{ scale: [1, 1.15, 1], opacity: [0.1, 0.2, 0.1] }}
            transition={{ duration: 4, repeat: Infinity }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-[#BCFF00]/10 rounded-full blur-[120px] pointer-events-none"
          />
        </section>

        {/* 3D Orbiting Slabs */}
        <section className="relative py-12 px-6">
          <OrbitingSlabs />
        </section>

        {/* Why Slabby */}
        <section className="relative py-16 px-6">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <div className="flex items-center justify-center gap-4 flex-wrap">
                <span className="text-4xl sm:text-5xl font-bold text-white">Why</span>
                <ParticleTextCanvas>Slabby</ParticleTextCanvas>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-5">
              {[
                { icon: Shuffle, title: 'P2P Trading', desc: 'Trade graded slabs directly. Full escrow protection.', color: '#10b981' },
                { icon: Dice6, title: 'Provably Fair', desc: 'SHA256 verified raffles. Audit any draw.', color: '#8b5cf6' },
                { icon: Lock, title: 'Authenticated', desc: 'Only PSA, BGS, CGC graded slabs.', color: '#f59e0b' },
                { icon: Zap, title: 'Instant Payouts', desc: 'Settle in seconds. Withdraw anytime.', color: '#ef4444' },
              ].map((f, i) => (
                <motion.div
                  key={f.title}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: false }}
                  transition={{ delay: i * 0.1 }}
                  whileHover={{ scale: 1.02, y: -5 }}
                  className="p-7 rounded-3xl border border-white/5 bg-white/[0.02] cursor-pointer group"
                >
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform" style={{ backgroundColor: `${f.color}20` }}>
                    <f.icon className="w-6 h-6" style={{ color: f.color }} />
                  </div>
                  <h3 className="text-xl font-semibold mb-2"><ScrambleText>{f.title}</ScrambleText></h3>
                  <p className="text-zinc-400 text-sm">{f.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="relative py-16 px-6">
          <div className="max-w-4xl mx-auto space-y-20">
            {[
              { step: '01', title: 'List', desc: 'Upload your graded slabs.', color: '#BCFF00' },
              { step: '02', title: 'Trade', desc: 'Accept offers or razz.', color: '#8b5cf6' },
              { step: '03', title: 'Profit', desc: 'Get paid instantly.', color: '#10b981' },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, x: i % 2 === 0 ? -80 : 80 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: false }}
                transition={{ duration: 0.7 }}
                className={`flex items-center gap-6 ${i % 2 === 1 ? 'flex-row-reverse text-right' : ''}`}
              >
                <span className="text-[70px] md:text-[100px] font-bold leading-none opacity-20" style={{ color: item.color }}>{item.step}</span>
                <div>
                  <h3 className="text-3xl md:text-4xl font-bold mb-1"><ScrambleText>{item.title}</ScrambleText></h3>
                  <p className="text-zinc-400">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* CTA - Gravity text + Vortex button */}
        <section className="relative py-28 px-6">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: false }}
            className="max-w-3xl mx-auto text-center relative"
          >
            <motion.div
              animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.2, 0.1] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="absolute inset-0 -z-10 flex items-center justify-center"
            >
              <div className="w-[250px] h-[250px] bg-[#BCFF00]/15 rounded-full blur-[80px]" />
            </motion.div>
            
            <h2 className="text-5xl sm:text-6xl font-bold mb-2">
              <GravityText className="text-white justify-center">Ready to</GravityText>
            </h2>
            <h2 className="text-5xl sm:text-6xl font-bold mb-6">
              <GravityText className="text-[#BCFF00] justify-center">collect?</GravityText>
            </h2>
            <p className="text-lg text-zinc-400 mb-10">
              Join the premium slab marketplace.
            </p>
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
