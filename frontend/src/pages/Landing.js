import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, useTransform, useSpring, useInView } from 'framer-motion';
import { ArrowRight, Shuffle, Dice6, Zap, Lock, Play, ChevronRight } from 'lucide-react';

const CARD_IMAGES = [
  'https://static.prod-images.emergentagent.com/jobs/78a8fc0a-353a-4be0-91c8-507f76e46f1e/images/a5cc9e9a7d15dedbf89b5ac97ef3f5a5d8271d814fbc15a9ba9459ce3a780a0e.png',
  'https://static.prod-images.emergentagent.com/jobs/78a8fc0a-353a-4be0-91c8-507f76e46f1e/images/3ab472c3ad3e48bc2105db75ea78bcc2a75555a9426b30c8d6302c42e353aa3f.png',
  'https://static.prod-images.emergentagent.com/jobs/78a8fc0a-353a-4be0-91c8-507f76e46f1e/images/0c3fddbc8797bcfe269fb488c85008a17520020f11effcbc3504a0c8cb4d9a13.png',
];
const SLAB_PRICES = ['$4,299', '$2,150', '$8,750'];
const SLAB_GRADES = ['PSA 10', 'BGS 9.5', 'CGC 10'];

// Particle field - enhanced cursor reactive with mobile support
const ParticleField = () => {
  const canvasRef = useRef(null);
  const particles = useRef([]);
  const mouse = useRef({ x: -1000, y: -1000 });
  const animationRef = useRef(null);
  const isMobile = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    // Detect mobile
    isMobile.current = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
    
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      isMobile.current = window.innerWidth < 768;
    };
    resize();
    window.addEventListener('resize', resize);

    // Fewer particles on mobile for performance
    particles.current = [];
    const particleCount = isMobile.current ? 25 : Math.min(70, Math.floor((window.innerWidth * window.innerHeight) / 18000));
    
    for (let i = 0; i < particleCount; i++) {
      particles.current.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        size: Math.random() * 2 + 1,
        alpha: Math.random() * 0.5 + 0.2,
        pulseOffset: Math.random() * Math.PI * 2,
      });
    }

    // Mouse events
    const handleMouse = (e) => {
      mouse.current = { x: e.clientX, y: e.clientY };
    };
    const handleMouseLeave = () => {
      mouse.current = { x: -1000, y: -1000 };
    };
    
    // Touch events for mobile
    const handleTouch = (e) => {
      if (e.touches.length > 0) {
        mouse.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    };
    const handleTouchEnd = () => {
      mouse.current = { x: -1000, y: -1000 };
    };
    
    window.addEventListener('mousemove', handleMouse);
    window.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('touchmove', handleTouch, { passive: true });
    window.addEventListener('touchstart', handleTouch, { passive: true });
    window.addEventListener('touchend', handleTouchEnd);

    let time = 0;
    const animate = () => {
      time += 0.01;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const connectionDistance = isMobile.current ? 80 : 120;
      const mouseDistance = isMobile.current ? 150 : 200;
      
      particles.current.forEach((p, i) => {
        // Mouse/touch attraction
        const dx = mouse.current.x - p.x;
        const dy = mouse.current.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < mouseDistance && dist > 0) {
          const force = (mouseDistance - dist) / mouseDistance;
          p.vx += (dx / dist) * force * 0.3;
          p.vy += (dy / dist) * force * 0.3;
        }
        
        // Gentle floating motion
        p.vx += Math.sin(time + p.pulseOffset) * 0.008;
        p.vy += Math.cos(time + p.pulseOffset) * 0.008;
        
        // Apply velocity with damping
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.97;
        p.vy *= 0.97;
        
        // Wrap around edges
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        
        // Pulse size
        const pulse = Math.sin(time * 2 + p.pulseOffset) * 0.2 + 1;
        const currentSize = p.size * pulse;
        
        // Draw particle - simpler on mobile for performance
        if (isMobile.current) {
          // Simple glow on mobile
          ctx.beginPath();
          ctx.arc(p.x, p.y, currentSize * 2, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(188, 255, 0, ${p.alpha * 0.3})`;
          ctx.fill();
          
          ctx.beginPath();
          ctx.arc(p.x, p.y, currentSize, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(188, 255, 0, ${p.alpha})`;
          ctx.fill();
        } else {
          // Full glow effect on desktop
          const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, currentSize * 3);
          gradient.addColorStop(0, `rgba(188, 255, 0, ${p.alpha})`);
          gradient.addColorStop(0.5, `rgba(188, 255, 0, ${p.alpha * 0.3})`);
          gradient.addColorStop(1, 'rgba(188, 255, 0, 0)');
          
          ctx.beginPath();
          ctx.arc(p.x, p.y, currentSize * 3, 0, Math.PI * 2);
          ctx.fillStyle = gradient;
          ctx.fill();
          
          ctx.beginPath();
          ctx.arc(p.x, p.y, currentSize, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(188, 255, 0, ${p.alpha})`;
          ctx.fill();
        }
        
        // Draw connections - fewer checks on mobile
        const connectionStep = isMobile.current ? 2 : 1;
        for (let j = i + 1; j < particles.current.length; j += connectionStep) {
          const p2 = particles.current[j];
          const d = Math.sqrt((p.x - p2.x) ** 2 + (p.y - p2.y) ** 2);
          if (d < connectionDistance) {
            const lineAlpha = (1 - d / connectionDistance) * 0.15;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(188, 255, 0, ${lineAlpha})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
        
        // Connection to mouse/touch point
        if (dist < mouseDistance && dist > 0) {
          const lineAlpha = (1 - dist / mouseDistance) * 0.2;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(mouse.current.x, mouse.current.y);
          ctx.strokeStyle = `rgba(188, 255, 0, ${lineAlpha})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      });
      
      animationRef.current = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouse);
      window.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('touchmove', handleTouch);
      window.removeEventListener('touchstart', handleTouch);
      window.removeEventListener('touchend', handleTouchEnd);
      cancelAnimationFrame(animationRef.current);
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" />;
};

// Subtle ambient glow that follows cursor
const AmbientGlow = () => {
  const [pos, setPos] = useState({ x: 50, y: 50 });
  
  useEffect(() => {
    const handleMove = (e) => {
      setPos({ x: (e.clientX / window.innerWidth) * 100, y: (e.clientY / window.innerHeight) * 100 });
    };
    window.addEventListener('mousemove', handleMove);
    return () => window.removeEventListener('mousemove', handleMove);
  }, []);

  return (
    <div 
      className="fixed inset-0 pointer-events-none z-0 transition-all duration-1000 ease-out"
      style={{
        background: `radial-gradient(600px circle at ${pos.x}% ${pos.y}%, rgba(188,255,0,0.03), transparent 40%)`
      }}
    />
  );
};

// Smooth counter animation
const AnimatedCounter = ({ value, suffix = '', prefix = '' }) => {
  const [display, setDisplay] = useState('');
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });
  const hasAnimated = useRef(false);
  
  useEffect(() => {
    if (!isInView || hasAnimated.current) return;
    hasAnimated.current = true;
    
    // Extract numeric part
    const numMatch = value.match(/[\d.]+/);
    if (!numMatch) {
      setDisplay(value);
      return;
    }
    
    const num = parseFloat(numMatch[0]);
    const hasDecimal = value.includes('.');
    const duration = 1500;
    const start = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 4);
      const current = num * eased;
      
      if (hasDecimal) {
        setDisplay(current.toFixed(1));
      } else {
        setDisplay(Math.floor(current).toString());
      }
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // Ensure final value is exact
        setDisplay(numMatch[0]);
      }
    };
    animate();
  }, [isInView, value]);

  // Build the final display string
  const finalDisplay = display || value.match(/[\d.]+/)?.[0] || '';
  const pre = value.match(/^[^\d]*/)?.[0] || '';
  const suf = value.match(/[^\d.]*$/)?.[0] || '';

  return (
    <span ref={ref}>
      {pre}{finalDisplay}{suf}
    </span>
  );
};

// Particle text for "Slabby" - particles form letters (mobile optimized)
const ParticleText = ({ children, className }) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const particlesRef = useRef([]);
  const animationRef = useRef(null);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0.5 }
    );
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    const width = isMobile ? 200 : 300;
    const height = isMobile ? 55 : 80;
    const fontSize = isMobile ? 35 : 50;
    const sampleStep = isMobile ? 5 : 4;
    
    canvas.width = width;
    canvas.height = height;

    // Draw text to get pixel data
    ctx.fillStyle = '#BCFF00';
    ctx.font = `bold ${fontSize}px system-ui, -apple-system, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(children, width / 2, height / 2);

    const imageData = ctx.getImageData(0, 0, width, height);
    particlesRef.current = [];

    // Sample pixels to create particles (fewer on mobile)
    for (let y = 0; y < height; y += sampleStep) {
      for (let x = 0; x < width; x += sampleStep) {
        if (imageData.data[(y * width + x) * 4 + 3] > 128) {
          particlesRef.current.push({
            targetX: x,
            targetY: y,
            x: Math.random() * width,
            y: Math.random() * height,
            size: Math.random() * (isMobile ? 1.5 : 2) + 1,
            speed: Math.random() * 0.03 + 0.02,
          });
        }
      }
    }

    ctx.clearRect(0, 0, width, height);

    const animate = () => {
      ctx.clearRect(0, 0, width, height);
      
      particlesRef.current.forEach((p) => {
        if (isVisible) {
          p.x += (p.targetX - p.x) * p.speed;
          p.y += (p.targetY - p.y) * p.speed;
        } else {
          p.x += (Math.random() - 0.5) * 2;
          p.y += (Math.random() - 0.5) * 2;
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
  }, [children, isVisible, isMobile]);

  return (
    <div ref={containerRef} className={className}>
      <canvas ref={canvasRef} className="w-[200px] md:w-[300px] h-[55px] md:h-[80px]" />
    </div>
  );
};

// Gravity text - letters repel from cursor with mobile support
const GravityText = ({ children, className }) => {
  const containerRef = useRef(null);
  const [letters, setLetters] = useState([]);
  const [mousePos, setMousePos] = useState({ x: -1000, y: -1000 });
  const [isMobile, setIsMobile] = useState(false);
  const animationRef = useRef(null);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    setLetters(
      children.split('').map((char, i) => ({
        char,
        id: i,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
      }))
    );
  }, [children]);

  useEffect(() => {
    const handleMouse = (e) => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      }
    };
    const handleTouch = (e) => {
      if (containerRef.current && e.touches.length > 0) {
        const rect = containerRef.current.getBoundingClientRect();
        setMousePos({ x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top });
      }
    };
    const handleTouchEnd = () => {
      setMousePos({ x: -1000, y: -1000 });
    };
    
    window.addEventListener('mousemove', handleMouse);
    window.addEventListener('touchmove', handleTouch, { passive: true });
    window.addEventListener('touchstart', handleTouch, { passive: true });
    window.addEventListener('touchend', handleTouchEnd);
    return () => {
      window.removeEventListener('mousemove', handleMouse);
      window.removeEventListener('touchmove', handleTouch);
      window.removeEventListener('touchstart', handleTouch);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, []);

  useEffect(() => {
    const charWidth = isMobile ? 22 : 40;
    const repelDistance = isMobile ? 100 : 150;
    const repelForce = isMobile ? 1.5 : 2.5;
    
    const animate = () => {
      setLetters((prev) =>
        prev.map((letter, i) => {
          const baseX = i * charWidth;
          const centerY = isMobile ? 25 : 40;
          const dx = mousePos.x - (baseX + letter.x + charWidth/2);
          const dy = mousePos.y - (centerY + letter.y);
          const dist = Math.sqrt(dx * dx + dy * dy);

          let ax = 0, ay = 0;
          if (dist < repelDistance && dist > 0) {
            const force = (repelDistance - dist) / repelDistance;
            ax = -(dx / dist) * force * repelForce;
            ay = -(dy / dist) * force * repelForce;
          }

          ax += -letter.x * 0.06;
          ay += -letter.y * 0.06;

          const nvx = (letter.vx + ax) * 0.88;
          const nvy = (letter.vy + ay) * 0.88;

          return {
            ...letter,
            x: letter.x + nvx,
            y: letter.y + nvy,
            vx: nvx,
            vy: nvy,
          };
        })
      );
      animationRef.current = requestAnimationFrame(animate);
    };
    animationRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationRef.current);
  }, [mousePos, isMobile]);

  return (
    <div ref={containerRef} className={`inline-flex justify-center flex-wrap ${className}`} style={{ minHeight: isMobile ? '50px' : '80px' }}>
      {letters.map((letter) => (
        <span
          key={letter.id}
          className="inline-block text-2xl sm:text-4xl md:text-5xl font-bold"
          style={{
            transform: `translate(${letter.x}px, ${letter.y}px)`,
            transition: 'transform 0.05s linear',
            textShadow:
              Math.abs(letter.x) > 5 || Math.abs(letter.y) > 5
                ? '0 0 40px rgba(188,255,0,0.9), 0 0 80px rgba(188,255,0,0.5)'
                : '0 0 20px rgba(188,255,0,0.4)',
          }}
        >
          {letter.char === ' ' ? '\u00A0' : letter.char}
        </span>
      ))}
    </div>
  );
};

// Premium button with subtle animation
const PremiumButton = ({ children, href, variant = 'primary', className = '' }) => {
  const isPrimary = variant === 'primary';
  
  return (
    <Link to={href}>
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={`
          relative overflow-hidden rounded-full cursor-pointer
          ${isPrimary 
            ? 'bg-[#BCFF00] text-black' 
            : 'bg-white/5 text-white border border-white/10 hover:border-white/20'
          }
          ${className}
        `}
      >
        {isPrimary && (
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
            initial={{ x: '-100%' }}
            whileHover={{ x: '100%' }}
            transition={{ duration: 0.6 }}
          />
        )}
        <span className="relative z-10 flex items-center justify-center gap-2 font-semibold">
          {children}
        </span>
      </motion.div>
    </Link>
  );
};

// 3D Card that tilts on hover
const TiltCard = ({ children, className = '' }) => {
  const ref = useRef(null);
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);

  const handleMove = (e) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setRotateX(y * -10);
    setRotateY(x * 10);
  };

  const handleLeave = () => {
    setRotateX(0);
    setRotateY(0);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      animate={{ rotateX, rotateY }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      style={{ transformStyle: 'preserve-3d' }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

// 3D Orbiting Slabs - continuous visible orbit animation with mobile support
const SlabShowcase = () => {
  const [angle, setAngle] = useState(0);
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const animationRef = useRef(null);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const animate = () => {
      setAngle(prev => prev + (isMobile ? 0.006 : 0.008));
      animationRef.current = requestAnimationFrame(animate);
    };
    animationRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationRef.current);
  }, [isMobile]);

  const radius = isMobile ? 100 : 180;
  const floatY = Math.sin(angle * 2) * (isMobile ? 8 : 12);

  return (
    <div className="relative h-[380px] md:h-[480px] w-full flex items-center justify-center overflow-hidden" style={{ perspective: '1200px' }}>
      {/* Central glow */}
      <div className="absolute w-48 md:w-72 h-48 md:h-72 bg-[#BCFF00]/10 rounded-full blur-[80px] md:blur-[120px]" />
      
      {/* Orbit path indicator - hide on mobile */}
      <div 
        className="absolute w-[220px] md:w-[380px] h-[60px] md:h-[100px] border border-[#BCFF00]/10 rounded-full hidden md:block"
        style={{ transform: 'rotateX(75deg)' }}
      />
      
      <div 
        className="relative w-full max-w-[320px] md:max-w-[500px] h-[320px] md:h-[400px]" 
        style={{ transformStyle: 'preserve-3d' }}
      >
        {CARD_IMAGES.map((img, i) => {
          const cardAngle = angle + (i * (Math.PI * 2 / 3));
          const x = Math.cos(cardAngle) * radius;
          const z = Math.sin(cardAngle) * radius;
          
          const depthScale = (z + radius) / (radius * 2);
          const scale = isMobile ? (0.5 + depthScale * 0.4) : (0.6 + depthScale * 0.5);
          const opacity = 0.4 + depthScale * 0.6;
          const blur = z < 0 ? (isMobile ? 0.5 : 1) : 0;
          const zIndex = Math.round(z + radius);
          
          const isHovered = hoveredIndex === i;
          const cardFloatY = floatY + Math.sin(angle * 1.5 + i) * (isMobile ? 5 : 8);
          
          return (
            <motion.div
              key={i}
              className="absolute left-1/2 top-1/2 cursor-pointer"
              style={{
                zIndex: isHovered ? 200 : zIndex,
                filter: isHovered ? 'none' : `blur(${blur}px)`,
              }}
              animate={{
                x: x,
                y: cardFloatY - (isMobile ? 30 : 50),
                scale: isHovered ? (isMobile ? 1.15 : 1.3) : scale,
                opacity: isHovered ? 1 : opacity,
                rotateY: isHovered ? 0 : -cardAngle * 8,
              }}
              transition={{ 
                type: 'tween', 
                duration: 0.1,
                ease: 'linear'
              }}
              onHoverStart={() => setHoveredIndex(i)}
              onHoverEnd={() => setHoveredIndex(null)}
              onTouchStart={() => setHoveredIndex(i)}
              onTouchEnd={() => setTimeout(() => setHoveredIndex(null), 1500)}
            >
              <div 
                className="relative -translate-x-1/2 -translate-y-1/2"
                style={{ transformStyle: 'preserve-3d' }}
              >
                <div className={`
                  rounded-xl md:rounded-2xl overflow-hidden transition-all duration-300
                  ${isHovered 
                    ? 'shadow-2xl shadow-[#BCFF00]/50' 
                    : z > 0 
                      ? 'shadow-xl shadow-[#BCFF00]/30' 
                      : 'shadow-lg shadow-black/40'
                  }
                `}>
                  <div className={`
                    w-24 md:w-44 bg-gradient-to-b from-white/10 to-white/5 p-1 md:p-1.5 rounded-xl md:rounded-2xl 
                    border transition-all duration-300
                    ${isHovered ? 'border-[#BCFF00]' : 'border-white/10'}
                  `}>
                    <img 
                      src={img} 
                      alt={`Slab ${i + 1}`} 
                      className="w-full aspect-[3/4] object-cover rounded-lg md:rounded-xl"
                    />
                  </div>
                </div>
                
                {/* Price tag */}
                <motion.div 
                  className="absolute -bottom-12 md:-bottom-16 left-1/2 -translate-x-1/2 text-center whitespace-nowrap"
                  animate={{ 
                    opacity: isHovered || depthScale > 0.5 ? 1 : 0,
                    scale: isHovered ? 1.1 : 1
                  }}
                >
                  <div className={`
                    px-3 md:px-4 py-1.5 md:py-2 backdrop-blur-sm rounded-full border transition-all duration-300
                    ${isHovered ? 'bg-[#BCFF00] border-[#BCFF00]' : 'bg-black/80 border-[#BCFF00]/40'}
                  `}>
                    <span className={`font-bold text-xs md:text-sm ${isHovered ? 'text-black' : 'text-[#BCFF00]'}`}>
                      {SLAB_PRICES[i]}
                    </span>
                  </div>
                  <span className="text-[10px] md:text-xs text-zinc-500 mt-1 block">{SLAB_GRADES[i]}</span>
                </motion.div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

// Feature card with clean hover state
const FeatureCard = ({ icon: Icon, title, description, color, index }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.1 }}
    >
      <TiltCard className="h-full">
        <div className="group h-full p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all duration-300 hover:bg-white/[0.04]">
          {/* Icon */}
          <div 
            className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110"
            style={{ backgroundColor: `${color}15` }}
          >
            <Icon className="w-6 h-6" style={{ color }} />
          </div>
          
          {/* Title */}
          <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
          
          {/* Description */}
          <p className="text-zinc-400 text-sm leading-relaxed">{description}</p>
        </div>
      </TiltCard>
    </motion.div>
  );
};

// Step component - clean and minimal
const Step = ({ number, title, description, index }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay: index * 0.15 }}
      className="flex flex-col md:flex-row items-center gap-6 md:gap-8 text-center md:text-left"
    >
      {/* Number */}
      <div className="relative shrink-0">
        <span className="text-6xl md:text-8xl font-black text-[#BCFF00]/10">{number}</span>
        <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-3xl md:text-5xl font-bold text-[#BCFF00]">
          {number}
        </span>
      </div>
      
      {/* Content */}
      <div>
        <h3 className="text-xl md:text-3xl font-bold text-white mb-2">{title}</h3>
        <p className="text-zinc-400 text-sm md:text-base max-w-sm">{description}</p>
      </div>
    </motion.div>
  );
};

// Stat item
const StatItem = ({ value, label, index }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-30px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="text-center"
    >
      <div className="text-3xl md:text-4xl font-bold text-[#BCFF00] mb-1">
        <AnimatedCounter value={value} />
      </div>
      <div className="text-sm text-zinc-500">{label}</div>
    </motion.div>
  );
};

export default function Landing() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="bg-black text-white min-h-screen">
      <ParticleField />
      <AmbientGlow />
      
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-[#BCFF00] flex items-center justify-center">
              <span className="font-bold text-black text-lg">S</span>
            </div>
            <span className="font-semibold text-lg hidden sm:block">Slabby</span>
          </Link>
          
          <div className="flex items-center gap-6">
            <Link to="/marketplace" className="text-sm text-zinc-400 hover:text-white transition-colors hidden md:block">
              Marketplace
            </Link>
            <Link to="/razz" className="text-sm text-zinc-400 hover:text-white transition-colors hidden md:block">
              Live Razz
            </Link>
            <PremiumButton href={isAuthenticated ? "/marketplace" : "/register"} className="px-5 py-2.5 text-sm">
              {isAuthenticated ? 'Open App' : 'Get Started'}
            </PremiumButton>
          </div>
        </div>
      </nav>

      <main>
        {/* Hero Section */}
        <section className="min-h-screen flex flex-col items-center justify-center px-6 pt-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-4xl"
          >
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 mb-8"
            >
              <span className="w-2 h-2 rounded-full bg-[#BCFF00] animate-pulse" />
              <span className="text-sm text-zinc-400">The future of card collecting</span>
            </motion.div>

            {/* Main headline */}
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
              <span className="text-white">Trade. Razz. Collect.</span>
              <br />
              <span className="text-[#BCFF00]">All in one vault.</span>
            </h1>

            {/* Subheadline */}
            <p className="text-lg sm:text-xl text-zinc-400 mb-10 max-w-xl mx-auto">
              The only marketplace you need for graded slabs. Buy, sell, trade, or try your luck in provably fair raffles.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <PremiumButton href="/register" className="px-8 py-4 text-base">
                Start Trading <ArrowRight className="w-5 h-5" />
              </PremiumButton>
              <PremiumButton href="/razz" variant="secondary" className="px-8 py-4 text-base">
                <Play className="w-5 h-5" /> Watch Live Razz
              </PremiumButton>
            </div>
          </motion.div>

          {/* Scroll indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="absolute bottom-8"
          >
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="w-6 h-10 rounded-full border-2 border-white/20 flex items-start justify-center p-2"
            >
              <motion.div className="w-1 h-2 bg-white/40 rounded-full" />
            </motion.div>
          </motion.div>
        </section>

        {/* Card Showcase */}
        <section className="py-20 px-6">
          <SlabShowcase />
        </section>

        {/* Stats Section */}
        <section className="py-16 px-6 border-y border-white/5">
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              <StatItem value="$2.4M" label="Weekly Volume" index={0} />
              <StatItem value="12K+" label="Active Slabs" index={1} />
              <StatItem value="99.9%" label="Uptime" index={2} />
              <StatItem value="<3s" label="Settlement" index={3} />
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-24 px-6">
          <div className="max-w-5xl mx-auto">
            {/* Section header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <div className="flex items-center justify-center gap-4 flex-wrap mb-4">
                <span className="text-3xl sm:text-4xl font-bold text-white">Why</span>
                <ParticleText className="inline-block">Slabby</ParticleText>
              </div>
              <p className="text-zinc-400 max-w-lg mx-auto">
                Built for collectors, by collectors. Every feature designed with your slabs in mind.
              </p>
            </motion.div>

            {/* Feature grid */}
            <div className="grid md:grid-cols-2 gap-5">
              <FeatureCard
                icon={Shuffle}
                title="P2P Trading"
                description="Trade graded slabs directly with collectors worldwide. Full escrow protection on every transaction."
                color="#10b981"
                index={0}
              />
              <FeatureCard
                icon={Dice6}
                title="Provably Fair"
                description="SHA256 verified raffles. Every draw can be audited with cryptographic proof."
                color="#8b5cf6"
                index={1}
              />
              <FeatureCard
                icon={Lock}
                title="Authenticated"
                description="Only PSA, BGS, and CGC graded slabs. Every card verified before listing."
                color="#f59e0b"
                index={2}
              />
              <FeatureCard
                icon={Zap}
                title="Instant Payouts"
                description="Settle in seconds, not days. Withdraw to your bank anytime you want."
                color="#ef4444"
                index={3}
              />
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="py-24 px-6 bg-white/[0.01]">
          <div className="max-w-4xl mx-auto">
            {/* Section header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-20"
            >
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                Three simple <span className="text-[#BCFF00]">steps</span>
              </h2>
              <p className="text-zinc-400">Start trading in minutes</p>
            </motion.div>

            {/* Steps */}
            <div className="space-y-16">
              <Step
                number="01"
                title="List your slabs"
                description="Upload photos of your graded cards. Set your price or create a razz."
                index={0}
              />
              <Step
                number="02"
                title="Trade or razz"
                description="Accept offers, counter, or let the razz decide. Full escrow protection."
                index={1}
              />
              <Step
                number="03"
                title="Get paid"
                description="Instant settlement to your wallet. Withdraw anytime, anywhere."
                index={2}
              />
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-32 px-6 relative">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-2xl mx-auto text-center relative z-10"
          >
            {/* Glow */}
            <div className="absolute inset-0 -z-10 flex items-center justify-center pointer-events-none">
              <div className="w-[300px] h-[300px] bg-[#BCFF00]/5 rounded-full blur-[100px]" />
            </div>
            
            <h2 className="text-4xl sm:text-5xl font-bold mb-6">
              <GravityText className="text-[#BCFF00]">Ready to collect?</GravityText>
            </h2>
            <p className="text-lg text-zinc-400 mb-10">
              Join thousands of collectors on the premium slab marketplace.
            </p>
            <Link to="/register">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                className="inline-flex items-center gap-2 px-8 py-4 bg-[#BCFF00] text-black font-semibold rounded-full text-lg hover:shadow-lg hover:shadow-[#BCFF00]/20 transition-shadow"
              >
                Enter the Vault <ChevronRight className="w-5 h-5" />
              </motion.button>
            </Link>
          </motion.div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#BCFF00] flex items-center justify-center">
              <span className="font-bold text-black text-xs">S</span>
            </div>
            <span className="font-medium text-sm">Slabby</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-zinc-500">
            <Link to="/marketplace" className="hover:text-white transition-colors">Marketplace</Link>
            <Link to="/razz" className="hover:text-white transition-colors">Razz</Link>
            <span>© 2025 Slabby</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
