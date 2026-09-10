
import React, { useEffect } from 'react';
import { motion } from 'framer-motion';

const CinematicDiveSplash = () => {
  useEffect(() => {
    // 🎧 REAL MOVIE WATER SPLASH SOUND EFFECT (Web Audio API)
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(220, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 1.2);
      
      gain.gain.setValueAtTime(0.8, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 1.2);
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 1.2);
    } catch (e) {
      console.log('Audio splash initialization:', e);
    }
  }, []);

  return (
    <div className="fixed inset-0 z-50 pointer-events-none overflow-hidden select-none">
      
      {/* 🌊 1. SVG LENS WATER DROPLETS DISPLACEMENT FILTER */}
      <svg className="hidden">
        <defs>
          <filter id="lens-water-splash">
            <feTurbulence type="fractalNoise" baseFrequency="0.04 0.08" numOctaves="4" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="65" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
      </svg>

      {/* 🎬 2. CINEMATIC CAMERA ZOOM & RADIAL DIVE WARP */}
      <motion.div
        initial={{ scale: 1, opacity: 0, filter: 'blur(0px)' }}
        animate={{ 
          scale: [1, 2.5, 4], 
          opacity: [0, 0.95, 1],
          filter: ['blur(0px)', 'blur(8px)', 'blur(20px)']
        }}
        transition={{ duration: 1.3, ease: [0.7, 0, 0.84, 0] }}
        className="absolute inset-0 bg-gradient-to-b from-cyan-400 via-sky-600 to-slate-950"
        style={{ filter: 'url(#lens-water-splash)' }}
      />

      {/* ✨ 3. VOLUMETRIC OCEAN SUN RAYS EXPLOSION */}
      <motion.div
        initial={{ opacity: 0, scale: 0.2, rotate: 0 }}
        animate={{ opacity: [0, 1, 0], scale: [0.5, 3, 5], rotate: 90 }}
        transition={{ duration: 1.2, ease: "easeOut" }}
        className="absolute inset-0 flex items-center justify-center"
      >
        <div className="w-[800px] h-[800px] rounded-full bg-radial from-cyan-200/80 via-sky-400/40 to-transparent blur-2xl" />
      </motion.div>

      {/* 💧 4. CAMERA LENS WATER DROPLETS IMPACT */}
      {[...Array(35)].map((_, i) => (
        <motion.div
          key={i}
          initial={{
            x: '50vw',
            y: '50vh',
            scale: 0,
            opacity: 1
          }}
          animate={{
            x: `${50 + (Math.random() - 0.5) * 110}vw`,
            y: `${50 + (Math.random() - 0.5) * 110}vh`,
            scale: Math.random() * 2.5 + 1,
            opacity: [1, 0.8, 0]
          }}
          transition={{
            duration: Math.random() * 0.8 + 0.5,
            ease: "easeOut"
          }}
          className="absolute w-6 h-6 rounded-full bg-cyan-100/40 backdrop-blur-md border border-white/80 shadow-[0_0_20px_#38bdf8]"
        />
      ))}

      {/* 💬 5. MOVIE TITLE TRANSITION OVERLAY */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: [0, 1, 1, 0], scale: [0.8, 1.1, 1.2, 1.4] }}
        transition={{ duration: 1.3, times: [0, 0.3, 0.7, 1] }}
        className="absolute inset-0 flex flex-col items-center justify-center text-center z-20"
      >
        <h1 className="text-4xl md:text-6xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-100 via-white to-sky-200 drop-shadow-[0_0_35px_rgba(6,182,212,0.9)] uppercase">
          DIVING INTO OCEAN NEXUS
        </h1>
        <p className="text-cyan-200 text-sm tracking-widest font-bold mt-2 animate-pulse uppercase">
          Initializing Realtime Underwater Sensor Grid
        </p>
      </motion.div>
    </div>
  );
};

export default CinematicDiveSplash;