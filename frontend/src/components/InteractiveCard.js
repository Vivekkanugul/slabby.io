import { useState, useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { DollarSign, Eye, Heart, Sparkles } from 'lucide-react';

export function InteractiveCard({ card, onClick, isOwner, onPublish, getConditionLabel, getCategoryLabel }) {
  const [isHovered, setIsHovered] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const cardRef = useRef(null);
  
  // 3D tilt effect
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  
  const mouseXSpring = useSpring(x);
  const mouseYSpring = useSpring(y);
  
  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["17.5deg", "-17.5deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-17.5deg", "17.5deg"]);
  
  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    
    const rect = cardRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;
    
    x.set(xPct);
    y.set(yPct);
  };
  
  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
    setIsHovered(false);
  };
  
  const isDraft = card.status === 'draft';
  
  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      style={{
        rotateX,
        rotateY,
        transformStyle: "preserve-3d",
      }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="relative cursor-pointer"
      data-testid={`card-${card.id}`}
    >
      {/* Glow effect */}
      <motion.div
        animate={{
          opacity: isHovered ? 1 : 0,
          scale: isHovered ? 1 : 0.8,
        }}
        transition={{ duration: 0.3 }}
        className="absolute -inset-2 bg-gradient-to-r from-[#BCFF00]/30 via-emerald-500/20 to-violet-500/30 rounded-3xl blur-xl"
      />
      
      {/* Card container */}
      <div className="relative bg-[#0A0A0E] border border-white/10 rounded-2xl overflow-hidden transition-all duration-300 hover:border-[#BCFF00]/30">
        {/* Image section */}
        <div className="relative aspect-[4/3] bg-gradient-to-br from-zinc-800 to-zinc-900 overflow-hidden">
          {card.images?.[0]?.url ? (
            <motion.img 
              src={card.images[0].url.startsWith('data:') ? card.images[0].url : `/api/uploads/image/${card.images[0].id || card.images[0].url}`}
              alt={card.title}
              className="w-full h-full object-cover"
              animate={{
                scale: isHovered ? 1.1 : 1,
              }}
              transition={{ duration: 0.4 }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <motion.div
                animate={{
                  rotate: isHovered ? [0, 10, -10, 0] : 0,
                }}
                transition={{ duration: 0.5 }}
                className="text-6xl"
              >
                🃏
              </motion.div>
            </div>
          )}
          
          {/* Overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
          
          {/* Status badge */}
          {isDraft && isOwner && (
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="absolute top-3 left-3 px-3 py-1 bg-amber-500/90 backdrop-blur-sm rounded-full text-black text-xs font-semibold flex items-center gap-1"
            >
              <Sparkles className="w-3 h-3" />
              Draft
            </motion.div>
          )}
          
          {/* Category badge */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="absolute top-3 right-3 px-3 py-1 bg-black/60 backdrop-blur-sm rounded-full text-white text-xs font-medium"
          >
            {getCategoryLabel?.(card.category) || card.category}
          </motion.div>
          
          {/* Like button */}
          <motion.button
            whileHover={{ scale: 1.2 }}
            whileTap={{ scale: 0.9 }}
            onClick={(e) => {
              e.stopPropagation();
              setIsLiked(!isLiked);
            }}
            className={`absolute bottom-3 right-3 w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-sm transition-colors ${
              isLiked ? 'bg-rose-500 text-white' : 'bg-black/40 text-white/60 hover:text-white'
            }`}
          >
            <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
          </motion.button>
          
          {/* Hover overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: isHovered ? 1 : 0 }}
            className="absolute inset-0 bg-[#BCFF00]/10 flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: isHovered ? 1 : 0.8, opacity: isHovered ? 1 : 0 }}
              className="px-6 py-3 bg-[#BCFF00] text-black font-semibold rounded-full flex items-center gap-2"
            >
              <Eye className="w-4 h-4" />
              View Card
            </motion.div>
          </motion.div>
        </div>
        
        {/* Content section */}
        <div className="p-4" style={{ transform: "translateZ(50px)" }}>
          <h3 className="text-white font-semibold line-clamp-2 mb-1 group-hover:text-[#BCFF00] transition-colors">
            {card.title}
          </h3>
          
          {card.player_name && (
            <p className="text-sm text-zinc-400 mb-2">{card.player_name}</p>
          )}
          
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs px-2 py-1 bg-white/5 rounded-lg text-zinc-400 font-medium">
              {getConditionLabel?.(card.condition) || card.condition}
            </span>
            {card.year && (
              <span className="text-xs text-zinc-500">{card.year}</span>
            )}
          </div>
          
          {card.asking_price && (
            <motion.div 
              className="flex items-center gap-1"
              animate={{
                scale: isHovered ? [1, 1.05, 1] : 1,
              }}
              transition={{ duration: 0.3 }}
            >
              <DollarSign className="w-5 h-5 text-[#BCFF00]" />
              <span className="text-xl font-bold text-white">
                {card.asking_price.toLocaleString()}
              </span>
            </motion.div>
          )}
          
          {/* Action buttons */}
          {isOwner && isDraft && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={(e) => {
                e.stopPropagation();
                onPublish?.();
              }}
              className="w-full mt-4 py-2.5 bg-[#BCFF00] text-black font-semibold rounded-xl hover:bg-[#d4ff4d] transition-colors"
              data-testid={`publish-${card.id}`}
            >
              Publish to Marketplace
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default InteractiveCard;
