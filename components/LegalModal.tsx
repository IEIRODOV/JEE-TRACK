import React from 'react';
import { motion } from 'motion/react';
import { X, ShieldCheck, FileText, Scale, RefreshCcw } from 'lucide-react';

interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'terms' | 'privacy' | 'refund' | 'cancellation';
}

const LegalModal: React.FC<LegalModalProps> = ({ isOpen, onClose, type }) => {
  const content = {
    terms: {
      title: "Terms & Conditions",
      icon: Scale,
      color: "text-purple-400",
      body: `
        Welcome to Pulse Mission Control. By accessing this platform, you agree to comply with and be bound by the following terms:
        1. Use of Service: The platform is for educational purposes only. Any misuse or automated scraping is prohibited.
        2. Account Security: You are responsible for maintaining the confidentiality of your account credentials.
        3. Community Conduct: Spamming, harassment, or sharing inappropriate content in the community feed will lead to immediate account suspension.
        4. Intellectual Property: All resources, 3D elements, and software code are the property of Pulse or its content creators.
        5. Limitation of Liability: Pulse is provided "as is" and is not liable for any study outcomes or data loss.
      `
    },
    privacy: {
      title: "Privacy Policy",
      icon: ShieldCheck,
      color: "text-blue-400",
      body: `
        Your privacy is our priority. Here is how we handle your data:
        1. Data Collection: We collect your name, email, and study progress to personalize your experience.
        2. Payment Data: We do not store your credit card or bank details. All transactions are handled securely by Razorpay.
        3. Usage Analytics: We use anonymous data to improve our server performance and study tools.
        4. No Third-Party Selling: Your personal information is never sold or shared with advertisers.
        5. Data Erasure: You can request the deletion of your account and associated data at any time via your profile settings.
      `
    },
    refund: {
      title: "Refund Policy",
      icon: FileText,
      color: "text-red-400",
      body: `
        Pulse is primarily a free platform for students. Donations made are voluntary:
        1. Voluntary Contributions: Since the core features of Pulse are free and donations are voluntary, we generally do not offer refunds.
        2. Technical Errors: If a donation was processed multiple times due to a server error, please contact us within 24 hours with your transaction ID from Razorpay for a manual reversal.
        3. Impact Focused: As your contributions directly go towards server hosting costs, they are utilized immediately.
      `
    },
    cancellation: {
      title: "Cancellation Policy",
      icon: RefreshCcw,
      color: "text-amber-400",
      body: `
        Regarding our services and account management:
        1. Account Deletion: You can cancel your Pulse account at any time. This will remove your progress and community history.
        2. Payment Cancellations: Since we do not use a subscription model (no recurring charges), there is no ongoing subscription to cancel.
        3. Support: For any assistance regarding your account or data, reach out to our team via the community help section.
      `
    }
  };

  const current = content[type];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/90 backdrop-blur-md"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative w-full max-w-2xl bg-[#0a0a0a] border border-white/10 rounded-[32px] overflow-hidden shadow-2xl flex flex-col max-h-[80vh]"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        
        <div className="p-8 flex items-center justify-between border-b border-white/5">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-2xl bg-white/5 border border-white/10 ${current.color}`}>
              <current.icon className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white uppercase tracking-tighter">
                {current.title}
              </h2>
              <span className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">Effective April 2026</span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors text-white/20 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-8 overflow-y-auto text-white/50 space-y-6 scrollbar-hide">
          {current.body.trim().split('\n').map((line, i) => (
            <p key={i} className="text-sm leading-relaxed font-medium">
              {line.trim()}
            </p>
          ))}
          
          <div className="pt-12 pb-4">
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5">
              <p className="text-[10px] uppercase tracking-widest font-black text-white/30 text-center">
                Pulse Mission Control - Committed to Student Success & Privacy
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default LegalModal;
