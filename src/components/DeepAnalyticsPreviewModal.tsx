import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, BrainCircuit, Activity, Map, Calendar, Crosshair, Lock, ShieldCheck, Zap } from 'lucide-react';

interface DeepAnalyticsPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPurchase: () => void;
}

const DeepAnalyticsPreviewModal = ({ isOpen, onClose, onPurchase }: DeepAnalyticsPreviewModalProps) => {
  if (!isOpen) return null;

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
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          className="w-full max-w-3xl max-h-[90vh] bg-[#0a0a0b] border border-white/10 rounded-3xl overflow-hidden flex flex-col shadow-2xl relative"
        >
          {/* Header */}
          <div className="p-5 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-purple-900/20 to-blue-900/20 shrink-0">
            <div className="flex items-center gap-4">
              <div className="p-2.5 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-500 text-white shadow-lg shadow-purple-500/20">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-black text-white tracking-tight uppercase">Deep Analysis Engine</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[9px] font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400 uppercase tracking-widest">Premium Feature Preview</span>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all self-end sm:self-auto"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-5 md:p-6 custom-scrollbar">
            <div className="text-center max-w-2xl mx-auto mb-8">
              <h3 className="text-2xl font-black text-white mb-3">Stop guessing. Start strategizing.</h3>
              <p className="text-xs text-white/60 leading-relaxed font-medium px-4">
                The Deep Analysis Engine uses your study data, completion rates, and exam timelines to build a predictive model of your success. Here is what you get when you unlock it:
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-3xl mx-auto">
              {features.map((feature, i) => (
                <div key={i} className={`p-4 rounded-2xl border ${feature.color} flex items-start gap-3 hover:-translate-y-1 transition-transform duration-300`}>
                  <div className="mt-1 p-2 bg-white/5 rounded-xl shrink-0">
                    {feature.icon}
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-white">{feature.title}</h4>
                    <p className="text-[11px] text-white/50 mt-1.5 font-medium leading-relaxed">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer CTA */}
          <div className="p-5 border-t border-white/10 bg-black/50 shrink-0 flex flex-col sm:flex-row items-center justify-between gap-5">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
              <p className="text-[11px] text-white/50 font-medium">
                Secure one-time unlock. <br className="hidden sm:block" /> Lifetime access to predictive insights.
              </p>
            </div>
            <button
              onClick={onPurchase}
              className="w-full sm:w-auto px-6 py-3 rounded-xl font-black uppercase tracking-widest text-xs transition-all text-white bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 hover:-translate-y-0.5 flex items-center justify-center gap-2"
            >
              <Lock className="w-3.5 h-3.5" />
              Unlock Now
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default DeepAnalyticsPreviewModal;
