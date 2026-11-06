import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Moon, Sparkles } from 'lucide-react';

export default function ThemeToggle({ isDark, onToggle }) {
  const buttonRef = useRef(null);
  const [ripple, setRipple] = useState(null);

  const handleClick = (e) => {
    // 1. Calculate origin coordinates relative to viewport
    let originX = window.innerWidth - 60;
    let originY = 32;

    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      originX = rect.left + rect.width / 2;
      originY = rect.top + rect.height / 2;
    } else if (e?.clientX) {
      originX = e.clientX;
      originY = e.clientY;
    }

    // Maximum distance from button to furthest screen corner
    const maxDist = Math.hypot(
      Math.max(originX, window.innerWidth - originX),
      Math.max(originY, window.innerHeight - originY)
    );

    // 2. Trigger high-end luminous wave
    const nextDark = !isDark;
    const rippleId = Date.now();

    setRipple({
      id: rippleId,
      x: originX,
      y: originY,
      radius: maxDist * 1.15,
      isBecomingDark: nextDark,
    });

    // 3. Flip theme state smoothly under the crest of the wave
    setTimeout(() => {
      onToggle();
    }, 140);

    // 4. Remove ripple when animation completes
    setTimeout(() => {
      setRipple((curr) => (curr?.id === rippleId ? null : curr));
    }, 550);
  };

  return (
    <>
      {/* LUXURY DAY / NIGHT CAPSULE SWITCH */}
      <button
        ref={buttonRef}
        type="button"
        onClick={handleClick}
        title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        className={`relative inline-flex items-center h-8 w-15 sm:w-16 rounded-full p-1 cursor-pointer transition-all duration-300 outline-none select-none shadow-sm active:scale-95 group overflow-hidden ${
          isDark
            ? 'bg-[#14151a] border border-[#2d3039] hover:border-indigo-500/50 shadow-inner'
            : 'bg-gradient-to-r from-amber-100 to-sky-100 border border-amber-300/70 hover:border-amber-400 shadow-inner'
        }`}
      >
        {/* Track Micro-details */}
        {isDark ? (
          // Night Sky: Stars & Constellations
          <div className="absolute inset-0 flex items-center justify-start pl-2 pointer-events-none">
            <span className="w-1 h-1 bg-indigo-300/70 rounded-full animate-pulse mr-1" />
            <span className="w-0.5 h-0.5 bg-indigo-200/50 rounded-full mr-2" />
            <Sparkles className="w-2.5 h-2.5 text-indigo-400/60" />
          </div>
        ) : (
          // Day Sky: Soft clouds & sunshine warmth
          <div className="absolute inset-0 flex items-center justify-end pr-2 pointer-events-none">
            <span className="w-1.5 h-1.5 bg-amber-400/40 rounded-full mr-1" />
            <span className="text-[10px] text-amber-500/70 font-bold">☀</span>
          </div>
        )}

        {/* Sliding Tactile Knob */}
        <motion.div
          layout
          transition={{
            type: 'spring',
            stiffness: 550,
            damping: 30,
          }}
          className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center shadow-md ${
            isDark
              ? 'ml-auto bg-gradient-to-br from-indigo-500 to-indigo-700 text-white shadow-indigo-900/60'
              : 'mr-auto bg-gradient-to-br from-amber-400 to-orange-400 text-white shadow-amber-500/40'
          }`}
        >
          <AnimatePresence mode="wait" initial={false}>
            {isDark ? (
              <motion.div
                key="moon-knob"
                initial={{ rotate: -70, scale: 0.4, opacity: 0 }}
                animate={{ rotate: 0, scale: 1, opacity: 1 }}
                exit={{ rotate: 70, scale: 0.4, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="flex items-center justify-center"
              >
                <Moon className="w-3.5 h-3.5 text-indigo-100 fill-indigo-200/30" />
              </motion.div>
            ) : (
              <motion.div
                key="sun-knob"
                initial={{ rotate: 90, scale: 0.4, opacity: 0 }}
                animate={{ rotate: 0, scale: 1, opacity: 1 }}
                exit={{ rotate: -90, scale: 0.4, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="flex items-center justify-center"
              >
                <Sun className="w-3.5 h-3.5 text-white" />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </button>

      {/* FULL-SCREEN LUMINOUS WAVE RIPPLE (NO JANK, VELVET SMOOTH) */}
      <AnimatePresence>
        {ripple && (
          <motion.div
            key={ripple.id}
            initial={{ opacity: 0.85, scale: 0.05 }}
            animate={{
              opacity: [0.85, 0.9, 0],
              scale: [0.05, 1.25, 2.5],
            }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 0.5,
              ease: [0.16, 1, 0.3, 1], // Velvety decelerating curve
              times: [0, 0.35, 1],
            }}
            style={{
              position: 'fixed',
              top: ripple.y - 100,
              left: ripple.x - 100,
              width: 200,
              height: 200,
              borderRadius: '50%',
              pointerEvents: 'none',
              zIndex: 99999,
              background: ripple.isBecomingDark
                ? 'radial-gradient(circle at center, rgba(10,10,10,0.98) 0%, rgba(15,15,18,0.9) 45%, rgba(99,102,241,0.2) 80%, transparent 100%)'
                : 'radial-gradient(circle at center, rgba(244,246,248,0.98) 0%, rgba(244,246,248,0.9) 45%, rgba(251,191,36,0.25) 80%, transparent 100%)',
              boxShadow: ripple.isBecomingDark
                ? '0 0 100px 50px rgba(99, 102, 241, 0.2)'
                : '0 0 100px 50px rgba(251, 191, 36, 0.25)',
              filter: 'blur(2px)',
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}
