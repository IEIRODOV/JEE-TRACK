import React, { memo } from 'react';

const AnoAI = memo(() => {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-black">
      {/* Animated Gradient Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-600/20 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/20 rounded-full blur-[120px] animate-pulse [animation-delay:2s]" />
      <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] bg-emerald-600/10 rounded-full blur-[100px] animate-pulse [animation-delay:4s]" />
      
      {/* Subtle Grid Overlay */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
        style={{ 
          backgroundImage: `linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)`,
          backgroundSize: '40px 40px'
        }} 
      />
      
      {/* Vignette */}
      <div className="absolute inset-0 bg-radial-gradient from-transparent to-black/60" />
    </div>
  );
});

AnoAI.displayName = 'AnoAI';

export default AnoAI;
