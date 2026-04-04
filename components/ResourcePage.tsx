import React from 'react';
import { motion } from 'motion/react';
import { BookOpen, ExternalLink, Download, PlayCircle, Sparkles, Zap, Heart, Coffee } from 'lucide-react';
import { InteractiveRobotSpline } from "@/components/ui/interactive-3d-robot";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 15
    }
  }
};

const ResourcePage = () => {
  const resources = [
    {
      title: "Eduniti Physics",
      description: "Top-tier Physics concepts and problem-solving for JEE Main & Advanced.",
      type: "YouTube",
      icon: <PlayCircle className="w-4 h-4" />,
      color: "text-red-400",
      bg: "bg-red-500/10",
      link: "https://www.youtube.com/@mohitgoenka99"
    },
    {
      title: "MathonGo",
      description: "Comprehensive Mathematics preparation and test series analysis for JEE.",
      type: "YouTube",
      icon: <PlayCircle className="w-4 h-4" />,
      color: "text-blue-400",
      bg: "bg-blue-500/10",
      link: "https://www.youtube.com/@mathongo"
    },
    {
      title: "DexterChem",
      description: "Expert Chemistry tutorials, reaction mechanisms, and shortcut tricks for JEE.",
      type: "YouTube",
      icon: <PlayCircle className="w-4 h-4" />,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
      link: "https://www.youtube.com/@DexterChem"
    },
    {
      title: "Neha Aggarwal",
      description: "Simplified Mathematics concepts and exam strategy for JEE aspirants.",
      type: "YouTube",
      icon: <PlayCircle className="w-4 h-4" />,
      color: "text-rose-400",
      bg: "bg-rose-500/10",
      link: "https://www.youtube.com/@nehamamsarmy"
    },
    {
      title: "Factorial Academy",
      description: "In-depth Physics and Mathematics lectures for competitive exam preparation.",
      type: "YouTube",
      icon: <PlayCircle className="w-4 h-4" />,
      color: "text-purple-400",
      bg: "bg-purple-500/10",
      link: "https://www.youtube.com/@factorialacademy"
    },
    {
      title: "JEE Nexus",
      description: "Comprehensive JEE preparation with focus on problem-solving and strategy.",
      type: "YouTube",
      icon: <PlayCircle className="w-4 h-4" />,
      color: "text-orange-400",
      bg: "bg-orange-500/10",
      link: "https://www.youtube.com/@JEEnexus"
    }
  ];

  return (
    <div className="w-full min-h-screen bg-black overflow-x-hidden relative">
      <InteractiveRobotSpline 
        scene="https://prod.spline.design/PyzDhpQ9E5f1E3MT/scene.splinecode"
        className="fixed inset-0 z-0 pointer-events-none"
      />
      
      {/* Background Text */}
      <div className="fixed top-20 left-4 pointer-events-none select-none z-0 opacity-10">
        <h2 className="text-[180px] font-serif font-black leading-none text-white tracking-tighter">
          HUB
        </h2>
      </div>

      <div className="relative z-10 flex flex-col items-center pt-24 pb-32 px-4">
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="w-full max-w-7xl"
        >
          {/* Header */}
          <motion.div variants={itemVariants} className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-xl mb-6">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/70">Resource Hub</span>
            </div>
            <h1 className="text-6xl md:text-8xl font-black text-white tracking-tighter mb-6 font-heading leading-none">
              STUDY <span className="text-purple-500">RESOURCES</span>
            </h1>
            <p className="text-white/40 text-[10px] max-w-xl mx-auto uppercase tracking-[0.2em] font-bold leading-relaxed">
              Curated YouTube channels to accelerate your JEE preparation journey.
            </p>
          </motion.div>

          {/* Resources Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-8 mb-32">
            {resources.map((resource, index) => (
              <motion.a
                key={resource.title}
                href={resource.link}
                target="_blank"
                rel="noopener noreferrer"
                variants={itemVariants}
                whileHover={{ 
                  y: -5,
                  scale: 1.01,
                  transition: { type: "spring", stiffness: 400, damping: 15 }
                }}
                className="p-5 rounded-2xl glass group cursor-pointer border border-white/5 hover:border-purple-500/40 transition-all block relative overflow-hidden"
              >
                {/* Animated Background Glow */}
                <div className={`absolute -inset-12 opacity-0 group-hover:opacity-10 transition-opacity duration-700 blur-xl pointer-events-none ${resource.bg}`} />
                
                <div className="relative z-10 flex items-start gap-4">
                  <div className={`shrink-0 w-10 h-10 rounded-xl ${resource.bg} flex items-center justify-center group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 ${resource.color} shadow-lg`}>
                    {React.cloneElement(resource.icon as React.ReactElement, { className: "w-4 h-4" })}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <h3 className="text-white text-base font-black tracking-tight group-hover:text-purple-400 transition-colors uppercase font-heading truncate">
                        {resource.title}
                      </h3>
                    </div>
                    
                    <p className="text-white/30 text-[10px] leading-snug mb-4 font-medium line-clamp-2">
                      {resource.description}
                    </p>
                    
                    <div className="flex items-center justify-between pt-3 border-t border-white/5">
                      <div className="flex items-center gap-1.5">
                        <div className={`w-1 h-1 rounded-full ${resource.color.replace('text-', 'bg-')} animate-pulse`} />
                        <span className="text-[7px] font-black uppercase tracking-widest text-white/20">{resource.type}</span>
                      </div>
                      <motion.div 
                        whileHover={{ x: 2 }}
                        className="flex items-center gap-1 text-[7px] font-black uppercase tracking-widest text-purple-400"
                      >
                        Launch <Zap className="w-2 h-2 fill-purple-400" />
                      </motion.div>
                    </div>
                  </div>
                </div>
              </motion.a>
            ))}
          </div>

          {/* Buy Me a Coffee Section */}
          <motion.div 
            variants={itemVariants}
            className="mb-32 p-8 md:p-12 rounded-[40px] glass border border-white/10 relative overflow-hidden group text-center"
          >
            <div className="absolute -top-12 -left-12 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-1000" />
            <div className="relative z-10 max-w-2xl mx-auto">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 mb-6 border border-amber-500/20">
                <Coffee className="w-6 h-6" />
              </div>
              <h2 className="text-3xl font-black text-white mb-4 tracking-tight uppercase font-heading">Buy me a coffee</h2>
              <p className="text-white/50 text-sm md:text-base mb-8 leading-relaxed font-medium">
                If you find these resources helpful, consider supporting my work with a coffee. Every bit helps me keep this hub updated for everyone.
              </p>
              <button className="px-10 py-4 bg-amber-500 text-black font-black uppercase tracking-widest text-[10px] rounded-2xl transition-all shadow-[0_0_30px_rgba(245,158,11,0.2)] hover:scale-105 active:scale-95 flex items-center gap-2 mx-auto">
                Support with a Coffee
              </button>
            </div>
          </motion.div>

          {/* Request Section */}
          <motion.div 
            variants={itemVariants}
            whileHover={{ scale: 1.01 }}
            className="p-12 rounded-[50px] border border-white/10 bg-gradient-to-br from-purple-500/10 to-transparent backdrop-blur-xl text-center relative overflow-hidden group"
          >
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000" />
            <div className="relative z-10">
              <h2 className="text-3xl font-black text-white mb-4 tracking-tight uppercase font-heading">Need more materials?</h2>
              <p className="text-white/50 text-sm mb-10 max-w-md mx-auto leading-relaxed">
                Our AI Whobee is constantly indexing new resources. Check back daily for updated question banks and mock papers.
              </p>
              <button className="px-10 py-4 bg-white text-black font-black uppercase tracking-widest text-[10px] rounded-2xl transition-all shadow-2xl hover:scale-105 active:scale-95">
                Request Resource
              </button>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default ResourcePage;
