import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Award, CheckCircle2 } from 'lucide-react';
import { playTickSound } from '@/src/lib/sounds';

interface FlairPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  flair: { id: string; label: string; bg: string; border: string; color: string };
  onConfirm: () => void;
}

const FlairPurchaseModal: React.FC<FlairPurchaseModalProps> = ({ isOpen, onClose, flair, onConfirm }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-sm bg-[#0a0a0a] border border-white/10 rounded-[32px] p-6 text-center"
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/5 transition-colors"
            >
              <X className="w-4 h-4 text-white/40" />
            </button>

            <div className={`mx-auto w-16 h-16 rounded-2xl flex items-center justify-center mb-4 border ${flair.bg} ${flair.border} ${flair.color}`}>
              <Award className="w-8 h-8" />
            </div>

            <h2 className="text-xl font-black text-white mb-2">Unlock Flair: {flair.label}</h2>
            <p className="text-white/50 text-xs mb-6">Are you sure you want to purchase this unique flair for ₹20?</p>

            <button
              onClick={() => { playTickSound(); onConfirm(); onClose(); }}
              className="w-full py-3 bg-white text-black rounded-xl font-black uppercase tracking-widest text-xs hover:bg-white/90 transition-all"
            >
              Confirm Purchase
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default FlairPurchaseModal;
