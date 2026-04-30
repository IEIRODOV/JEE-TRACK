import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, BrainCircuit, Activity, Map, Calendar, Crosshair, Lock, ShieldCheck, Zap } from 'lucide-react';

interface DeepAnalyticsPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPurchase: () => void;
}

const DeepAnalyticsPreviewModal = ({ isOpen, onClose, onPurchase }: DeepAnalyticsPreviewModalProps) => {
  const features = [
    {
      icon: <BrainCircuit className="w-5 h-5 text-purple-400" />,
      title: 'Percentile Predictor',
      description: 'Get a live prediction of your competitive percentile based on your current trajectory, study volume, and consistency streaks.',
      color: 'border-purple-500/20 bg-purple-500/5'
    },
    {
      icon: <Activity className="w-5 h-5 text-orange-400" />,
      title: 'The "Velocity" Tracker',
      description: 'Find out if you are studying fast enough to complete the syllabus before the exam date. Warns you proactively if you lag behind.',
      color: 'border-orange-500/20 bg-orange-500/5'
    },
    {
      icon: <Map className="w-5 h-5 text-emerald-400" />,
      title: 'Subject Heat Maps',
      description: 'Visual grid of your strongest and weakest chapters. Pinpoints "Knowledge Decay" for topics you haven\'t revised recently.',
      color: 'border-emerald-500/20 bg-emerald-500/5'
    },
    {
      icon: <Crosshair className="w-5 h-5 text-blue-400" />,
      title: 'Time vs. Marks Matrix',
      description: 'Four-quadrant matrix plotting chapters by JEE weightage vs effort required. Identify Quick Wins and Ignore Low-Yield topics.',
      color: 'border-blue-500/20 bg-blue-500/5'
    },
    {
      icon: <Calendar className="w-5 h-5 text-rose-400" />,
      title: 'Spaced Repetition Alerts',
      description: 'Automated revision alerts at 7-day, 30-day, and 90-day intervals so you never forget what you studied months ago.',
      color: 'border-rose-500/20 bg-rose-500/5'
    },
    {
      icon: <Zap className="w-5 h-5 text-amber-400" />,
      title: 'AI Daily Game Plan',
      description: 'A dynamic "Generate My Day" engine that calculates exactly what you need to study today to stay perfectly on track.',
      color: 'border-amber-500/20 bg-amber-500/5'
    }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            onClick={(e) => e.stopPropagation()}
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="w-full max-w-lg max-h-[85dvh] bg-[#0a0a0b] border border-white/10 rounded-3xl overflow-hidden flex flex-col shadow-2xl relative"
          >
            {/* Header */}
            <div className="p-4 border-b border-white/5 flex items-center justify-between gap-3 bg-gradient-to-r from-purple-900/20 to-blue-900/20 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 text-white shadow-lg shadow-purple-500/20 hidden sm:block">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-black text-white tracking-tight uppercase">Deep Analysis Engine</h2>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[8px] font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400 uppercase tracking-widest">Premium Feature Preview</span>
                  </div>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all z-10 shrink-0 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar min-h-0">
              <div className="text-center max-w-md mx-auto mb-4">
                <h3 className="text-lg sm:text-xl font-black text-white mb-2">Stop guessing. Start strategizing.</h3>
                <p className="text-[10px] sm:text-[11px] text-white/60 leading-relaxed font-medium px-2">
                  The Deep Analysis Engine uses your data to build a predictive model of your success.
                </p>
              </div>

              <div className="flex flex-col gap-2 max-w-md mx-auto">
                {features.map((feature, i) => (
                  <div key={i} className={`p-2.5 rounded-xl border ${feature.color} flex items-start gap-2.5 hover:-translate-y-0.5 transition-transform duration-300`}>
                    <div className="p-1.5 bg-white/5 rounded-lg shrink-0">
                      {React.cloneElement(feature.icon, { className: feature.icon.props.className.replace('w-5 h-5', 'w-3.5 h-3.5') })}
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-white">{feature.title}</h4>
                      <p className="text-[9px] text-white/50 mt-0.5 font-medium leading-relaxed">{feature.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer CTA */}
            <div className="p-3 sm:p-4 border-t border-white/10 bg-[#0a0a0b] shrink-0 flex items-center justify-between gap-3 relative z-20">
              <div className="flex items-center gap-2 w-auto">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <p className="text-[9px] text-white/50 font-medium leading-tight">
                  Secure unlock. <br className="hidden sm:block" /> Lifetime access.
                </p>
              </div>
              <button
                onClick={onPurchase}
                className="flex-1 sm:flex-none px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg font-black uppercase tracking-widest text-[10px] sm:text-[11px] transition-all text-white bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 shadow-lg shadow-purple-500/25 hover:-translate-y-0.5 flex items-center justify-center gap-2 relative z-30 cursor-pointer"
              >
                <Lock className="w-3 h-3" />
                Buy Now
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default DeepAnalyticsPreviewModal;
