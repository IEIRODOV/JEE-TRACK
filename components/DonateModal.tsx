import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, X, Coffee, ShieldCheck, HeartPulse, Sparkles, Loader2, CheckCircle2 } from 'lucide-react';
import { playTickSound } from '@/src/lib/sounds';

interface DonateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

const DonateModal: React.FC<DonateModalProps> = ({ isOpen, onClose }) => {
  const [amount, setAmount] = useState('500');
  const [isLoading, setIsLoading] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  useEffect(() => {
    // Load Razorpay script
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const handleDonate = async () => {
    playTickSound();
    setIsLoading(true);

    try {
      // Create Order
      const response = await fetch('/api/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: parseInt(amount) * 100, // paise
          currency: 'INR',
        }),
      });

      const order = await response.json();

      if (order.error) {
        throw new Error(order.error);
      }

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: order.currency,
        name: "Pulse Mission Control",
        description: "Supporting free education and server hosting for students",
        image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Pulse",
        order_id: order.id,
        handler: async (response: any) => {
          // Verify Payment
          try {
            const verifyRes = await fetch('/api/verify-payment', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });

            const verifyData = await verifyRes.json();
            if (verifyData.success) {
              setPaymentSuccess(true);
            } else {
              alert("Payment verification failed. Please contact support.");
            }
          } catch (e) {
            console.error("Verification failed", e);
          }
        },
        prefill: {
          name: "",
          email: "",
          contact: ""
        },
        theme: {
          color: "#9333ea"
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (response: any) {
        console.error(response.error);
        alert("Payment failed: " + response.error.description);
      });
      rzp.open();
    } catch (error) {
      console.error("Order creation failed", error);
      alert("Failed to initialize payment. Please check your connection.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-md bg-[#0a0a0a] border border-white/10 rounded-[32px] overflow-hidden shadow-2xl maxHeight-[90vh] overflow-y-auto scrollbar-hide"
          >
            {/* Background Accents */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 via-white/50 to-red-600" />
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-red-600/10 rounded-full blur-[80px]" />
            <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-purple-600/5 rounded-full blur-[80px]" />

            <div className="p-6 relative z-10">
              <button 
                onClick={onClose}
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/5 transition-colors group"
              >
                <X className="w-4 h-4 text-white/20 group-hover:text-white transition-colors" />
              </button>

              {!paymentSuccess ? (
                <div className="text-center">
                  <div className="w-20 h-20 mx-auto mb-6 relative group">
                    <div className="absolute inset-0 bg-red-600/20 rounded-[24px] animate-pulse blur-xl" />
                    <div className="absolute inset-0 bg-red-600/10 rounded-[24px] animate-ping" />
                    <div className="relative w-full h-full bg-red-600 rounded-[24px] flex items-center justify-center border border-white/20 shadow-[0_0_30px_rgba(220,38,38,0.3)] rotate-3 group-hover:rotate-6 transition-transform">
                      <Heart className="w-10 h-10 text-white fill-white/20 animate-pulse" />
                    </div>
                  </div>

                  <h2 className="text-2xl font-black text-white mb-2 tracking-tighter uppercase font-heading">
                    Support <span className="text-red-600">Pulse</span>
                  </h2>
                  
                  <div className="bg-white/[0.03] backdrop-blur-xl rounded-[24px] p-5 border border-white/10 mb-6 text-left relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-1 h-full bg-red-600 shadow-[0_0_20px_rgba(220,38,38,0.5)]" />
                    <p className="text-white font-bold text-xs leading-relaxed mb-3 italic">
                      "Dear Student, your support is a lifeline for the dreams we host here every day."
                    </p>
                    <p className="text-white/30 text-[9px] font-medium leading-relaxed uppercase tracking-widest">
                      Your contribution helps us keep high-speed servers and ad-free resources available for everyone. Thank you.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-2">
                      {['99', '249', '499'].map((val) => (
                        <button
                          key={val}
                          onClick={() => { playTickSound(); setAmount(val); }}
                          className={`py-3 rounded-xl border-2 transition-all font-black text-xs uppercase tracking-widest
                            ${amount === val 
                              ? 'bg-red-600 border-red-600 text-white shadow-[0_0_20px_rgba(220,38,38,0.4)] scale-105 active:scale-95' 
                              : 'bg-white/5 border-white/5 text-white/20 hover:border-white/10 hover:text-white active:scale-95'}`}
                        >
                          ₹{val}
                        </button>
                      ))}
                    </div>

                    <div className="relative group">
                       <span className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20 font-black text-base">₹</span>
                       <input 
                         type="number" 
                         value={amount}
                         onChange={(e) => setAmount(e.target.value)}
                         placeholder="Custom Amount"
                         className="w-full bg-white/[0.03] border-2 border-white/5 rounded-xl px-10 py-3 text-white font-black focus:outline-none focus:border-red-600 focus:bg-white/[0.05] transition-all text-center text-lg placeholder:text-white/5"
                       />
                    </div>

                    <button
                      onClick={handleDonate}
                      disabled={isLoading || !amount || parseInt(amount) < 1}
                      className="w-full py-4 bg-white text-black rounded-xl font-black uppercase tracking-[0.2em] text-[10px] hover:bg-red-600 hover:text-white transition-all shadow-xl active:scale-[0.98] flex items-center justify-center gap-2 overflow-hidden relative group"
                    >
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Heart className="w-4 h-4 fill-current" />
                          Complete Contribution
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shimmer" />
                        </>
                      )}
                    </button>
                  </div>

                  <div className="mt-6 flex items-center justify-center gap-4 text-[8px] font-black uppercase tracking-[0.3em] text-white/10">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-3 h-3" />
                      Encrypted
                    </div>
                    <div className="w-1 h-1 bg-white/5 rounded-full" />
                    <div className="flex items-center gap-2 text-red-600/40">
                      <Sparkles className="w-3 h-3" />
                      Impact
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 bg-white rounded-[24px] p-6 shadow-inner relative overflow-hidden">
                  <div className="absolute inset-0 opacity-10 pointer-events-none select-none overflow-hidden flex flex-wrap gap-3 items-center justify-center p-3">
                    {['🍬', '🍭', '❤️', '💖', '💝', '✨'].map((item, i) => (
                      <motion.span 
                        key={i} 
                        initial={{ y: 20, rotate: 0 }}
                        animate={{ y: [0, -10, 0], rotate: [0, i % 2 === 0 ? 15 : -15, 0] }}
                        transition={{ duration: 2, repeat: Infinity, delay: i * 0.2 }}
                        className="text-xl"
                      >
                        {item}
                      </motion.span>
                    ))}
                  </div>

                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1, rotate: [0, 10, -10, 0] }}
                    className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-white shadow-xl relative z-10"
                  >
                    <Heart className="w-8 h-8 text-white fill-current" />
                  </motion.div>
                  
                  <h2 className="text-2xl font-black text-red-600 mb-3 tracking-tight uppercase font-heading relative z-10">Sweet Success!</h2>
                  <p className="text-red-900/60 text-[10px] leading-relaxed mb-6 max-w-xs mx-auto font-bold uppercase tracking-widest relative z-10">
                    Your sugar-sweet support keeps us alive! Thank you for your love!
                  </p>
                  
                  <div className="flex justify-center gap-2 mb-6 relative z-10">
                    <span className="px-2 py-1 rounded-full bg-red-100 text-red-600 text-[7px] font-black uppercase tracking-widest">You are Sweet!</span>
                    <span className="px-2 py-1 rounded-full bg-red-100 text-red-600 text-[7px] font-black uppercase tracking-widest">Pulse Guardian</span>
                  </div>

                  <button
                    onClick={onClose}
                    className="px-8 py-3 bg-red-600 text-white rounded-xl font-black uppercase tracking-widest text-[8px] hover:scale-105 hover:bg-red-700 transition-all shadow-xl active:scale-95 relative z-10"
                  >
                    Return with Love
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default DonateModal;
