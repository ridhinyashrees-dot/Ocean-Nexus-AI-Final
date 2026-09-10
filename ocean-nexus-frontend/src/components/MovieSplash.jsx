import React, { useEffect, useRef } from 'react';

const MovieSplash = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Organic Foam Particles
    let foam = [];
    for (let i = 0; i < 250; i++) {
      foam.push({
        x: Math.random() * canvas.width,
        y: canvas.height + Math.random() * 200,
        r: Math.random() * 14 + 3,
        vy: -(Math.random() * 12 + 6),
        vx: (Math.random() - 0.5) * 6,
        alpha: Math.random() * 0.9 + 0.1
      });
    }

    let animId;
    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      foam.forEach((p) => {
        p.y += p.vy;
        p.x += p.vx;
        p.alpha -= 0.006;

        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(0, p.r), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(224, 242, 254, ${Math.max(0, p.alpha)})`;
        ctx.shadowBlur = 12;
        ctx.shadowColor = '#06b6d4';
        ctx.fill();
      });

      animId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <div className="fixed inset-0 z-50 pointer-events-none overflow-hidden bg-slate-950/80 backdrop-blur-md flex items-center justify-center">
      
      {/* 🌊 SVG Organic Wave Surge */}
      <div className="absolute inset-0 z-10 opacity-90 mix-blend-screen animate-pulse">
        <svg className="w-full h-full" viewBox="0 0 1440 320" preserveAspectRatio="none">
          <path
            fill="#06b6d4"
            fillOpacity="0.6"
            d="M0,192L48,202.7C96,213,192,235,288,224C384,213,480,171,576,165.3C672,160,768,192,864,208C960,224,1056,224,1152,208C1248,192,1344,160,1392,144L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
          ></path>
        </svg>
      </div>

      {/* Foam Particles Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 z-20" />

      {/* Splash Text */}
      <h2 className="relative z-30 text-3xl md:text-5xl font-black tracking-widest uppercase text-cyan-100 drop-shadow-[0_0_35px_#06b6d4]">
        DIVING INTO OCEAN NEXUS...
      </h2>
    </div>
  );
};

export default MovieSplash;