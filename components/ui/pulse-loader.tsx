import React from 'react';
import { motion } from 'motion/react';
import { Activity } from 'lucide-react';

interface PulseLoaderProps {
  fullScreen?: boolean;
  size?: number;
}

const PulseLoader = ({ fullScreen = false, size = 40 }: PulseLoaderProps) => {
  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center z-[9999] overflow-hidden">
        {/* RGB Border Animation */}
        <div className="absolute inset-0 p-[2px] overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-blue-500/10 to-purple-500/10 opacity-30" />
        </div>

        {/* Fast Moving White Light Border */}
        <div className="absolute inset-0 p-[2px] overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-white/10 to-white/5 opacity-40" />
        </div>
        
        <div className="absolute inset-[2px] bg-black z-0" />

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="relative z-10 flex flex-col items-center"
        >
          <div className="relative mb-8">
            <motion.div
              animate={{ 
                scale: [1, 1.4, 1],
                opacity: [0.3, 0.8, 0.3]
              }}
              transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut" }}
              className="w-32 h-32 bg-red-500/20 rounded-full blur-2xl absolute -inset-4"
            />
            <motion.div
              animate={{ 
                scale: [1, 1.1, 1]
              }}
              transition={{ duration: 0.6, repeat: Infinity, ease: "easeInOut" }}
              className="relative"
            >
              <Activity className="w-20 h-20 text-red-500 shadow-[0_0_50px_rgba(239,68,68,0.5)]" />
            </motion.div>
          </div>
          
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex flex-col items-center"
          >
            <h1 className="text-4xl font-black text-white tracking-[0.2em] uppercase font-heading mb-2">
              JEE <span className="text-red-500">PULSE</span>
            </h1>
            <div className="h-1 w-24 bg-gradient-to-r from-transparent via-red-500 to-transparent" />
          </motion.div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="relative flex items-center justify-center">
      <motion.div
        animate={{ 
          scale: [1, 1.5, 1],
          opacity: [0.2, 0.6, 0.2]
        }}
        transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute inset-0 bg-red-500/20 rounded-full blur-lg"
        style={{ width: size * 1.5, height: size * 1.5 }}
      />
      <motion.div
        animate={{ 
          scale: [1, 1.2, 1]
        }}
        transition={{ duration: 0.6, repeat: Infinity, ease: "easeInOut" }}
        className="relative"
      >
        <Activity 
          className="text-red-500" 
          style={{ width: size, height: size }}
        />
      </motion.div>
    </div>
  );
};

export default PulseLoader;
