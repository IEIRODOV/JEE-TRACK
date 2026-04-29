import React from 'react';

const PulseLoader = ({ fullScreen, size = 48 }: { fullScreen?: boolean; size?: number }) => {
  const content = (
    <div className="flex flex-col items-center justify-center gap-4">
      <div 
        className="animate-pulse bg-red-600 rounded-full border-2 border-[#450a0a]"
        style={{ width: size, height: size }}
      />
      <div className="text-red-500 font-extrabold font-mono text-xl tracking-[0.3em] uppercase opacity-80" style={{ textShadow: '2px 2px 0px #450a0a' }}>
        JEE PULSE
      </div>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-[9999] bg-black bg-[radial-gradient(ellipse_at_center,_transparent_0%,_#1a1a1a_100%)] flex items-center justify-center">
        {content}
      </div>
    );
  }

  return content;
};

export default PulseLoader;
