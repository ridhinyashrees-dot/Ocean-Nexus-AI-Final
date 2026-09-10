import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Compass, Sparkles, Database, Globe, Waves, Volume2, VolumeX, Play } from 'lucide-react';
import WaterSplash3D from './WaterSplash3D';
import CinematicDiveSplash from './CinematicDiveSplash';
// 1. IMPORT YOUR LOCAL ASSET VIDEO HERE
import oceanVideo from '../assets/ocean-bg.mp4';
import MovieSplash from './MovieSplash';
const LandingPage = ({ onDive }) => {
  const [step, setStep] = useState(1);
  const [typedText, setTypedText] = useState('');
  const [isSplashing, setIsSplashing] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const videoRef = useRef(null);

  const fullSpeechText = "Welcome to Ocean Nexus AI. Explore, analyze, and visualize ARGO oceanographic data using natural language AI queries.";

  useEffect(() => {
    let charIndex = 0;
    
    // Phase 1: First 1.5 seconds shows pure video
    const entranceTimer = setTimeout(() => {
      setStep(2); // Reveal UI glass card & start typewriter

      // Voiceover Speech synthesis
      if ('speechSynthesis' in window && !isMuted) {
        window.speechSynthesis.cancel();
        const speech = new SpeechSynthesisUtterance(fullSpeechText);
        speech.rate = 0.9;
        speech.pitch = 1.0;
        window.speechSynthesis.speak(speech);
      }

      // Live Typewriter Sync
      const typingInterval = setInterval(() => {
        if (charIndex < fullSpeechText.length) {
          setTypedText(fullSpeechText.substring(0, charIndex + 1));
          charIndex++;
        } else {
          clearInterval(typingInterval);
          setStep(3); // Phase 3: Text complete -> Reveal "CLICK HERE TO DIVE" button
        }
      }, 40);

    }, 1500);

    return () => clearTimeout(entranceTimer);
  }, [isMuted]);

  const handleDiveClick = () => {
    setIsSplashing(true);
    setTimeout(() => {
      onDive(); // Triggers transition to main dashboard
    }, 1300);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden font-sans select-none bg-slate-950 text-white flex flex-col justify-between items-center">
      
      {/* 🎬 2. RENDER THE VIDEO BACKGROUND */}
      <video
        ref={videoRef}
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover pointer-events-none z-0 scale-105"
      >
        <source src={oceanVideo} type="video/mp4" />
      </video>
      <AnimatePresence>
  {isSplashing && <MovieSplash />}
</AnimatePresence>
      {/* 🌊 3D WATER SPLASH & DROPLETS TRANSITION */}
     <AnimatePresence>
  {isSplashing && <CinematicDiveSplash />}
</AnimatePresence>

{/* 🌊 REAL 3D THREE.JS WATER SPLASH & DIVE TRANSITION */}
<AnimatePresence>
  {isSplashing && (
    <>
      <WaterSplash3D />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 1.2 }}
        className="fixed inset-0 z-40 bg-gradient-to-b from-cyan-600/40 via-blue-900/60 to-slate-950 backdrop-blur-sm pointer-events-none"
      />
    </>
  )}
</AnimatePresence>
      {/* Underwater Dark Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-blue-950/30 via-slate-950/20 to-slate-950/80 pointer-events-none z-10" />

      {/* Dynamic Floating 3D Bubbles */}
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ y: '105vh', opacity: 0.1, scale: Math.random() * 0.7 + 0.3 }}
          animate={{ y: '-10vh', opacity: [0.3, 0.9, 0] }}
          transition={{ duration: Math.random() * 7 + 4, repeat: Infinity, delay: i * 0.2 }}
          style={{ left: `${Math.random() * 98}%` }}
          className="absolute w-3.5 h-3.5 rounded-full bg-cyan-100/70 border border-white/80 blur-[0.2px] pointer-events-none shadow-[0_0_12px_#06b6d4] z-10"
        />
      ))}

      {/* Header */}
      <header className="relative z-30 w-full px-8 py-6 flex justify-between items-center">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          className="flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-400/50 flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.5)]">
            <Waves className="w-6 h-6 text-cyan-300 animate-pulse" />
          </div>
          <span className="text-xs font-black tracking-widest text-cyan-200 uppercase">
  OCEAN NEXUS AI QUERY ENGINE
</span>
        </motion.div>

        <motion.button 
          onClick={() => setIsMuted(!isMuted)}
          className="p-3 rounded-full bg-slate-950/60 backdrop-blur-md border border-cyan-400/30 text-cyan-300 hover:text-white transition-all shadow-lg cursor-pointer z-40"
        >
          {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5 animate-pulse" />}
        </motion.button>
      </header>

      {/* Main Glass Story Container */}
      <main className="relative z-30 text-center px-8 py-10 max-w-3xl w-[90%] bg-cyan-950/35 backdrop-blur-2xl rounded-3xl border border-cyan-400/40 shadow-[0_0_70px_rgba(6,182,212,0.35)] flex flex-col items-center gap-6 my-auto">
        <AnimatePresence>
          {step >= 2 && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1 }}
              className="flex flex-col items-center gap-3"
            >
              <div className="flex items-center gap-2 px-5 py-1.5 rounded-full bg-cyan-900/60 border border-cyan-300/50 shadow-[0_0_20px_rgba(6,182,212,0.4)]">
                <Sparkles className="w-4 h-4 text-cyan-300 animate-spin" />
                <span className="text-xs font-black tracking-widest text-cyan-200 uppercase">
                  OCEAN NEXUS REALTIME ENGINE
                </span>
              </div>

              <h1 className="text-4xl md:text-6xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-200 to-sky-300 drop-shadow-[0_4px_15px_rgba(0,0,0,0.8)]">
                OCEAN NEXUS AI
              </h1>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Dynamic Typewriter */}
        <div className="min-h-[70px] flex items-center justify-center px-4">
          <p className="text-cyan-50 text-base md:text-xl font-medium leading-relaxed tracking-wide drop-shadow-sm max-w-xl">
            {typedText}
            {step === 2 && <span className="animate-ping text-cyan-300"> |</span>}
          </p>
        </div>

        {/* Dive Button */}
        <AnimatePresence>
          {step >= 2 && (
            <motion.button
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              whileHover={{ scale: 1.08, boxShadow: "0px 0px 50px rgba(6, 182, 212, 1)" }}
              whileTap={{ scale: 0.95 }}
              onClick={handleDiveClick}
              className="mt-2 px-10 py-5 bg-gradient-to-r from-cyan-400 via-sky-500 to-blue-600 rounded-2xl font-black text-xl text-white tracking-widest flex items-center gap-3 border border-cyan-200/50 shadow-[0_0_35px_rgba(6,182,212,0.6)] cursor-pointer group"
            >
              <Compass className="w-7 h-7 group-hover:rotate-180 transition-transform duration-700 text-cyan-100" />
              CLICK HERE TO DIVE
              <Play className="w-4 h-4 fill-white animate-pulse ml-1" />
            </motion.button>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="relative z-30 w-full px-8 pb-6 flex justify-between items-center text-xs text-cyan-200 font-semibold">
        <span className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-950/50 backdrop-blur-md border border-cyan-400/20">
          <Database className="w-4 h-4 text-cyan-400" /> 9.3M+ PostGIS Argo Floats
        </span>
        <span className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-950/50 backdrop-blur-md border border-cyan-400/20">
          <Globe className="w-4 h-4 text-cyan-400" /> Live Ocean Analytics Engine
        </span>
      </footer>

      {/* Wave Splash Overlay Transition */}
      <AnimatePresence>
        {isSplashing && (
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: '0%', opacity: 1 }}
            exit={{ y: '-100%', opacity: 0 }}
            transition={{ duration: 1.2, ease: [0.77, 0, 0.175, 1] }}
            className="fixed inset-0 z-50 bg-gradient-to-b from-cyan-400 via-sky-600 to-blue-950 flex items-center justify-center flex-col gap-4 text-white shadow-2xl"
          >
            <motion.div animate={{ scale: [1, 1.4, 0.9], rotate: [0, 180, 360] }} transition={{ duration: 1.2 }}>
              <Waves className="w-24 h-24 text-cyan-100" />
            </motion.div>
            <h2 className="text-3xl font-black tracking-widest uppercase animate-pulse">
              DIVING INTO OCEAN NEXUS...
            </h2>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LandingPage;