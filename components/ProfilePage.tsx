import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, db, signOut, onAuthStateChanged } from '@/src/firebase';
import { doc, setDoc, getDoc, updateDoc, collection, getDocs, writeBatch } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { User, Target, BookOpen, Activity, Loader2, LogOut, Save, User as UserIcon, ChevronLeft, Sparkles, Trophy, Medal, Info, X, Check, RefreshCw, CreditCard } from 'lucide-react';
import { playTickSound } from '@/src/lib/sounds';
import AnoAI from "@/components/ui/animated-shader-background";
import { getRankInfo } from '@/src/lib/ranks';

interface ProfilePageProps {
  onBack: () => void;
}

const ProfilePage = ({ onBack }: ProfilePageProps) => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [displayName, setDisplayName] = useState('');
  const [selectedExam, setSelectedExam] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedSubExam, setSelectedSubExam] = useState('mains');
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [customExamName, setCustomExamName] = useState('');
  const [customExamDate, setCustomExamDate] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState('');
  const [isPremium, setIsPremium] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [paymentStep, setPaymentStep] = useState<'details' | 'gateway' | 'success'>('details');
  const [processingPayment, setProcessingPayment] = useState(false);

  const PREMIUM_AVATAR = "https://api.dicebear.com/9.x/bottts-neutral/svg?seed=Omnipotent&eyes=glow&mouth=bite&backgroundColor=000000";

  const handleResetPremium = async () => {
    try {
      const currentUser = auth.currentUser;
      if (currentUser) {
        await setDoc(doc(db, 'users', currentUser.uid), {
          isPremium: false
        }, { merge: true });
        
        await setDoc(doc(db, 'leaderboard', currentUser.uid), {
          isPremium: false
        }, { merge: true });
        
        setIsPremium(false);
        if (selectedAvatar === PREMIUM_AVATAR) {
          setSelectedAvatar(AVATARS[0]);
        }
        setSuccess('Premium package reset (Dev only).');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const AVATARS = [
    // Avataaars (Clean/Human)
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Vivian",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Julian",
    // Bottts (Robotic/Cool)
    "https://api.dicebear.com/7.x/bottts/svg?seed=Circuit",
    "https://api.dicebear.com/7.x/bottts/svg?seed=Sparky",
    "https://api.dicebear.com/7.x/bottts/svg?seed=Cyber",
    "https://api.dicebear.com/7.x/bottts/svg?seed=R0b0t",
    // Lorelei (Stylized)
    "https://api.dicebear.com/7.x/lorelei/svg?seed=Misty",
    "https://api.dicebear.com/7.x/lorelei/svg?seed=Nova",
    "https://api.dicebear.com/7.x/lorelei/svg?seed=Atlas",
    "https://api.dicebear.com/7.x/lorelei/svg?seed=Sage",
    // Adventure (RPG Style)
    "https://api.dicebear.com/7.x/adventurer/svg?seed=Shadow",
    "https://api.dicebear.com/7.x/adventurer/svg?seed=Hunter",
    "https://api.dicebear.com/7.x/adventurer/svg?seed=Ranger",
    "https://api.dicebear.com/7.x/adventurer/svg?seed=Knight",
    // Big Smile
    "https://api.dicebear.com/7.x/big-smile/svg?seed=Happy",
    "https://api.dicebear.com/7.x/big-smile/svg?seed=Joy",
    // Fun Emoji
    "https://api.dicebear.com/7.x/fun-emoji/svg?seed=Cool",
    "https://api.dicebear.com/7.x/fun-emoji/svg?seed=Super"
  ];

  useEffect(() => {
    const fetchUserData = async () => {
      const currentUser = auth.currentUser;
      if (currentUser) {
        setUser(currentUser);
        setDisplayName(currentUser.displayName || '');
        setSelectedAvatar(currentUser.photoURL || '');
        setIsAdmin(currentUser.email === 'bablasaur19@gmail.com');
        
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setIsPremium(data.isPremium || false);
          if (data.photoURL && !selectedAvatar) setSelectedAvatar(data.photoURL);
          const isCustom = !['jee', 'neet', 'boards'].includes(data.exam?.toLowerCase());
          setSelectedExam(isCustom ? 'more' : (data.exam || ''));
          setSelectedYear(data.year || '');
          setSelectedSubExam(data.subExam || 'mains');
          if (isCustom) {
            setCustomExamName(data.exam);
            setCustomExamDate(data.customDate || '');
          }
        }

        const lbDoc = await getDoc(doc(db, 'leaderboard', currentUser.uid));
        if (lbDoc.exists()) {
          setTotalQuestions(lbDoc.data().totalQuestions || 0);
        }
      }
      setLoading(false);
    };

    fetchUserData();
  }, []);

  const handleSave = async () => {
    playTickSound();
    setSaving(true);
    setError('');
    setSuccess('');
    
    if (!selectedExam) {
      setError("Please select a primary objective");
      setSaving(false);
      return;
    }

    if (selectedExam !== 'more' && !selectedYear) {
      setError(`Please select a target ${selectedExam === 'boards' ? 'class' : 'year'}`);
      setSaving(false);
      return;
    }

    if (selectedExam === 'more' && (!customExamName || !customExamDate)) {
      setError("Please provide custom exam name and date");
      setSaving(false);
      return;
    }

    try {
      const currentUser = auth.currentUser;
      if (currentUser) {
        const examName = selectedExam === 'more' ? customExamName : selectedExam;
        
        // 1. Update Firebase Auth Profile
        await updateProfile(currentUser, {
          displayName: displayName,
          photoURL: selectedAvatar
        });

        // 2. Update Users Collection
        await setDoc(doc(db, 'users', currentUser.uid), {
          displayName: displayName,
          photoURL: selectedAvatar,
          exam: examName,
          year: selectedYear,
          subExam: selectedExam === 'jee' ? selectedSubExam : null,
          customDate: selectedExam === 'more' ? customExamDate : null,
          updatedAt: new Date()
        }, { merge: true });

        // 3. Update Leaderboard display name and photo
        await setDoc(doc(db, 'leaderboard', currentUser.uid), {
          displayName: displayName,
          photoURL: selectedAvatar,
          isPremium: isPremium
        }, { merge: true });

        // 4. Update Activity Feed (optional but good for consistency)
        // Note: We don't update past activities as they are historical logs, 
        // but new ones will use the new name.

        localStorage.setItem('pulse_user_exam', examName);
        localStorage.setItem('pulse_user_year', selectedYear);
        localStorage.setItem('pulse_user_subexam', selectedSubExam);
        if (selectedExam === 'more') localStorage.setItem('pulse_custom_date', customExamDate);

        setSuccess('Profile updated successfully');
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    playTickSound();
    await signOut(auth);
    window.location.reload();
  };

  const handleResetAllStreaks = async () => {
    if (!window.confirm('Are you sure you want to reset ALL user streaks to zero? This cannot be undone.')) return;
    setResetting(true);
    try {
      const lbRef = collection(db, 'leaderboard');
      const snapshot = await getDocs(lbRef);
      const batch = writeBatch(db);
      
      snapshot.docs.forEach(doc => {
        batch.update(doc.ref, { streak: 0 });
      });
      
      await batch.commit();
      setSuccess('All user streaks have been reset to zero.');
      setTimeout(() => setSuccess(''), 5000);
    } catch (err: any) {
      setError('Failed to reset streaks: ' + err.message);
    } finally {
      setResetting(false);
    }
  };

  const EXAMS = [
    { id: 'jee', label: 'JEE', icon: <Target className="w-4 h-4" /> },
    { id: 'neet', label: 'NEET', icon: <Activity className="w-4 h-4" /> },
    { id: 'boards', label: 'Boards', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'more', label: 'More', icon: <Sparkles className="w-4 h-4" /> },
  ];

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if ((window as any).Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePurchasePremium = async () => {
    setPaymentStep('gateway');
    setProcessingPayment(true);

    const res = await loadRazorpayScript();

    if (!res) {
      setError('Razorpay SDK failed to load. Are you online?');
      setPaymentStep('details');
      setProcessingPayment(false);
      return;
    }

    const key = import.meta.env.VITE_RAZORPAY_KEY || import.meta.env.VITE_RAZORPAY_API_KEY || import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_rOMv0P3R0wFj24';

    const options = {
      key: key,
      amount: "1500", // 15 INR in paise
      currency: "INR",
      name: "Mission Control",
      description: "God Level Premium Unlock",
      image: PREMIUM_AVATAR,
      handler: async function (response: any) {
        try {
          const currentUser = auth.currentUser;
          if (currentUser) {
            await setDoc(doc(db, 'users', currentUser.uid), {
              isPremium: true
            }, { merge: true });
            
            await setDoc(doc(db, 'leaderboard', currentUser.uid), {
              isPremium: true
            }, { merge: true });
            
            setIsPremium(true);
            setSuccess('God Level package unlocked successfully!');
            setPaymentStep('success');
            setSelectedAvatar(PREMIUM_AVATAR);
            setTimeout(() => {
              setShowPremiumModal(false);
              setPaymentStep('details');
              setProcessingPayment(false);
            }, 3000);
          }
        } catch (err: any) {
          setError('Failed to update premium status');
          setPaymentStep('details');
          setProcessingPayment(false);
        }
      },
      prefill: {
        name: auth.currentUser?.displayName || "User",
        email: auth.currentUser?.email || "",
      },
      theme: {
        color: "#f59e0b",
      },
      modal: {
        ondismiss: function() {
          setPaymentStep('details');
          setProcessingPayment(false);
        }
      }
    };

    try {
      const paymentObject = new (window as any).Razorpay(options);
      
      paymentObject.on('payment.failed', function (response: any) {
        setError('Payment Failed: ' + (response.error.description || 'Unknown error'));
        setPaymentStep('details');
        setProcessingPayment(false);
      });

      paymentObject.open();
    } catch (err: any) {
      console.error("Razorpay Error:", err);
      setError("Could not open payment gateway. " + err.message);
      setPaymentStep('details');
      setProcessingPayment(false);
    }
  };

  const YEARS = ['2026', '2027', '2028'];
  const CLASSES = ['9th', '10th', '11th', '12th'];

  const [showRankInfo, setShowRankInfo] = useState(false);
  const rankInfo = getRankInfo(totalQuestions);
  const questionsToNext = rankInfo.nextThreshold - totalQuestions;

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(17,24,39,1)_0%,rgba(0,0,0,1)_100%)] pointer-events-none" />
      
      <div className="relative z-10 max-w-2xl mx-auto px-6 pt-24 pb-32">
        <button 
          onClick={() => { playTickSound(); onBack(); }}
          className="flex items-center gap-2 text-white/40 hover:text-white transition-colors mb-8 group"
        >
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span className="text-[10px] font-black uppercase tracking-widest">Return to Mission</span>
        </button>

        <div className="flex items-center gap-6 mb-12">
          <div className="relative group">
            <div className="w-20 h-20 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
              {selectedAvatar ? (
                <img src={selectedAvatar} alt="Profile" className="w-full h-full object-cover" />
              ) : user?.photoURL ? (
                <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <UserIcon className="w-10 h-10 text-white/20" />
              )}
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center border-2 border-black">
              <Sparkles className="w-3 h-3 text-white" />
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight mb-1">Commander Profile</h1>
            <div className="flex items-center gap-3">
              <p className="text-white/40 text-[10px] font-black uppercase tracking-widest">ID: {user?.uid?.slice(0, 8)}...</p>
              <div className="w-1 h-1 bg-white/10 rounded-full" />
              <div className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest ${rankInfo.color}`}>
                {rankInfo.icon} {rankInfo.title} (Lvl {rankInfo.level})
                <button 
                  onClick={() => { playTickSound(); setShowRankInfo(true); }}
                  className="ml-1 p-1 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <Info className="w-3 h-3 text-white/40" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Avatar Selection */}
        <div className="mb-12 space-y-4">
          <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block">Choose Avatar</label>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
            {/* Default Account Profile Option */}
            <button
               onClick={() => { playTickSound(); setSelectedAvatar(user?.photoURL || ''); }}
               className={`relative w-full aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                 (selectedAvatar === (user?.photoURL || '') && (user?.photoURL)) ? 'border-amber-500 scale-110 z-10' : 'border-white/5 opacity-40 hover:opacity-100'
               }`}
            >
               <div className="w-full h-full bg-white/5 flex flex-col items-center justify-center text-center p-1">
                 {user?.photoURL ? (
                    <img src={user.photoURL} className="w-full h-full object-cover" />
                 ) : (
                    <UserIcon className="w-4 h-4 text-white/40" />
                 )}
               </div>
               {selectedAvatar === (user?.photoURL || '') && user?.photoURL && (
                <div className="absolute inset-0 bg-amber-500/20 flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
               )}
               <div className="absolute bottom-0 left-0 right-0 bg-black/60 py-0.5 text-[6px] font-black uppercase text-white/80">Account</div>
            </button>

            {/* Premium Avatar Option */}
            <button
              onClick={() => { 
                playTickSound(); 
                if (!isPremium) {
                  setShowPremiumModal(true);
                } else {
                  setSelectedAvatar(PREMIUM_AVATAR);
                }
              }}
              className={`relative w-full aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                selectedAvatar === PREMIUM_AVATAR ? 'border-amber-400 scale-110 z-10 shadow-[0_0_20px_rgba(245,158,11,0.6)]' : 'border-amber-400/50 opacity-100 hover:opacity-100 hover:scale-105 shadow-[0_0_10px_rgba(245,158,11,0.3)] animate-pulse hover:animate-none'
              }`}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/40 to-orange-500/40 mix-blend-overlay z-0" />
              <img src={PREMIUM_AVATAR} alt="Premium Avatar" className="w-full h-full object-cover relative z-10 drop-shadow-[0_0_10px_rgba(245,158,11,1)]" />
              {selectedAvatar === PREMIUM_AVATAR ? (
                <div className="absolute inset-0 bg-amber-500/20 flex items-center justify-center z-20">
                  <Check className="w-4 h-4 text-white" />
                </div>
              ) : !isPremium ? (
                <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center z-20 transition-opacity backdrop-blur-[2px]">
                  <Sparkles className="w-5 h-5 text-amber-400 mb-1 drop-shadow-[0_0_5px_rgba(245,158,11,0.8)]" />
                  <span className="text-[7px] font-black uppercase text-amber-400 bg-amber-400/20 px-1.5 py-0.5 rounded border border-amber-400/30">Unlock</span>
                </div>
              ) : null}
            </button>

            {AVATARS.map((url, i) => (
              <button
                key={i}
                onClick={() => { playTickSound(); setSelectedAvatar(url); }}
                className={`relative w-full aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                  selectedAvatar === url ? 'border-purple-500 scale-110 z-10' : 'border-white/5 opacity-40 hover:opacity-100'
                }`}
              >
                <img src={url} alt={`Avatar ${i}`} className="w-full h-full object-cover" />
                {selectedAvatar === url && (
                  <div className="absolute inset-0 bg-purple-500/20 flex items-center justify-center">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Rank Info Modal */}
        <AnimatePresence>
          {showRankInfo && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4"
            >
              <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="w-full max-w-md bg-[#0a0a0b] border border-white/10 rounded-[32px] p-8 shadow-2xl relative overflow-hidden"
              >
                <button 
                  onClick={() => setShowRankInfo(false)}
                  className="absolute top-6 right-6 p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <X className="w-4 h-4 text-white/40" />
                </button>

                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center">
                    <Trophy className="w-6 h-6 text-purple-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-white uppercase tracking-tight">Rank Progression</h2>
                    <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">How to climb the leaderboard</p>
                  </div>
                </div>

                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Level 1-3</span>
                      <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Newbie</span>
                    </div>
                    <p className="text-xs text-white/60 font-medium">0 - 300 Questions</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[10px] font-black text-emerald-400/40 uppercase tracking-widest">Level 4-6</span>
                      <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Sergeant</span>
                    </div>
                    <p className="text-xs text-white/60 font-medium">1000 - 1600 Questions</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/10">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[10px] font-black text-blue-400/40 uppercase tracking-widest">Level 7-9</span>
                      <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Lieutenant</span>
                    </div>
                    <p className="text-xs text-white/60 font-medium">1900 - 2500 Questions</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-purple-500/5 border border-purple-500/10">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[10px] font-black text-purple-400/40 uppercase tracking-widest">Level 10-15</span>
                      <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest">Captain / Major</span>
                    </div>
                    <p className="text-xs text-white/60 font-medium">2800 - 4300 Questions</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-yellow-500/5 border border-yellow-500/10">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[10px] font-black text-yellow-400/40 uppercase tracking-widest">Level 30+</span>
                      <span className="text-[10px] font-black text-yellow-400 uppercase tracking-widest">Commander</span>
                    </div>
                    <p className="text-xs text-white/60 font-medium">8800+ Questions</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-white/10 border border-white/20">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Level 51</span>
                      <span className="text-[10px] font-black text-white uppercase tracking-widest">Immortal</span>
                    </div>
                    <p className="text-xs text-white/60 font-medium">15000+ Questions</p>
                  </div>
                </div>

                <div className="mt-8 p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20">
                  <p className="text-[10px] text-purple-400 font-bold uppercase tracking-widest leading-relaxed">
                    Promotion Logic: After Level 3, you gain 1 level for every 300 questions solved.
                  </p>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-2 gap-4 mb-12">
          <div className="p-6 rounded-3xl bg-white/5 border border-white/10 relative overflow-hidden group">
            <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <Trophy className="w-20 h-20" />
            </div>
            <div className="relative z-10">
              <span className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-2">Total Questions</span>
              <div className="text-2xl font-mono font-bold text-white">{totalQuestions}</div>
            </div>
          </div>
          <div className="p-6 rounded-3xl bg-white/5 border border-white/10 relative overflow-hidden group">
            <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <Medal className="w-20 h-20" />
            </div>
            <div className="relative z-10">
              <span className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-2">Next Promotion</span>
              <div className="text-2xl font-mono font-bold text-emerald-400">-{questionsToNext} <span className="text-[10px] text-white/20">Ques</span></div>
            </div>
          </div>
        </div>

        <div className="space-y-10">
          {/* Username */}
          <div className="space-y-4">
            <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block">Display Name</label>
            <input 
              type="text" 
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Enter your name"
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
            />
          </div>

          {/* Exam Selection */}
          <div className="space-y-4">
            <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block">Primary Objective</label>
            <div className="grid grid-cols-3 gap-3">
              {EXAMS.map((exam) => (
                <button
                  key={exam.id}
                  onClick={() => { playTickSound(); setSelectedExam(exam.id); }}
                  className={`flex flex-col items-center gap-3 p-4 rounded-2xl border transition-all ${
                    selectedExam === exam.id 
                      ? 'bg-purple-500/20 border-purple-500 text-purple-400' 
                      : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'
                  }`}
                >
                  {exam.icon}
                  <span className="text-[10px] font-black uppercase tracking-widest">{exam.label}</span>
                </button>
              ))}
            </div>
          </div>

          {selectedExam === 'jee' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-4"
            >
              <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block">JEE Category</label>
              <div className="grid grid-cols-2 gap-3">
                {['mains', 'advanced'].map((sub) => (
                  <button
                    key={sub}
                    onClick={() => { playTickSound(); setSelectedSubExam(sub); }}
                    className={`py-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${
                      selectedSubExam === sub
                        ? 'bg-purple-500/20 border-purple-500 text-purple-400'
                        : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'
                    }`}
                  >
                    {sub}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {selectedExam === 'more' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-6"
            >
              <div className="space-y-4">
                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block">Exam Name</label>
                <input 
                  type="text"
                  value={customExamName}
                  onChange={(e) => setCustomExamName(e.target.value)}
                  placeholder="e.g. UPSC, GATE, SAT"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-white"
                />
              </div>
              <div className="space-y-4">
                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block">Exam Date</label>
                <input 
                  type="date"
                  value={customExamDate}
                  onChange={(e) => setCustomExamDate(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-white [color-scheme:dark]"
                />
              </div>
            </motion.div>
          )}

          {/* Year Selection */}
          {selectedExam && selectedExam !== 'more' && (
            <div className="space-y-4">
              <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block">
                {selectedExam === 'boards' ? 'Target Class' : 'Target Year'}
              </label>
              <div className="grid grid-cols-4 gap-3">
                {(selectedExam === 'boards' ? CLASSES : YEARS).map((item) => (
                  <button
                    key={item}
                    onClick={() => { playTickSound(); setSelectedYear(item); }}
                    className={`py-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${
                      selectedYear === item 
                        ? 'bg-purple-500/20 border-purple-500 text-purple-400' 
                        : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="pt-6 space-y-4">
            {error && (
              <p className="text-red-400 text-xs font-bold text-center">{error}</p>
            )}
            {success && (
              <p className="text-emerald-400 text-xs font-bold text-center">{success}</p>
            )}
            
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full py-4 bg-white text-black rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-zinc-200 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Mission Parameters
            </button>

            <button
              onClick={handleLogout}
              className="w-full py-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-red-500/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Terminate Session
            </button>

            {isPremium && (
              <button
                onClick={handleResetPremium}
                className="mt-4 w-full py-4 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-amber-500/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Reset Premium (Dev Only)
              </button>
            )}

            {isAdmin && (
              <div className="mt-12 p-6 rounded-3xl bg-rose-500/5 border border-rose-500/20">
                <h3 className="text-xs font-black text-rose-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <RefreshCw className="w-3 h-3" /> Admin Controls
                </h3>
                <button
                  onClick={handleResetAllStreaks}
                  disabled={resetting}
                  className="w-full py-3 bg-rose-500 text-white rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-rose-600 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {resetting ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                  Reset Every User Streak to Zero
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Premium Purchase Modal */}
        <AnimatePresence>
          {showPremiumModal && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4"
            >
              <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="w-full max-w-sm bg-[#0a0a0b] border border-amber-500/20 rounded-[32px] p-8 shadow-2xl relative overflow-hidden"
              >
                <div className="absolute -top-32 -right-32 w-64 h-64 bg-amber-500/10 blur-[80px] rounded-full pointer-events-none" />
                <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-orange-500/10 blur-[80px] rounded-full pointer-events-none" />

                <button 
                  onClick={() => {
                    setShowPremiumModal(false);
                    setPaymentStep('details');
                  }}
                  className="absolute top-6 right-6 p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors z-10"
                >
                  <X className="w-4 h-4 text-white/40" />
                </button>

                {paymentStep === 'details' && (
                  <>
                    <div className="relative z-10 text-center mb-8">
                      <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-[0_0_40px_rgba(245,158,11,0.3)] mb-6 border border-white/20 overflow-hidden">
                        <img src={PREMIUM_AVATAR} className="w-full h-full object-cover" />
                      </div>
                      <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500 uppercase tracking-tight mb-2">God Level</h2>
                      <p className="text-xs text-white/60">Unlock the God Level Avatar and Premium Glow.</p>
                    </div>

                    <div className="space-y-3 mb-8 relative z-10">
                      <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/5">
                        <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                          <UserIcon className="w-4 h-4 text-amber-400" />
                        </div>
                        <span className="text-sm font-bold text-white/80">God Level Premium Avatar</span>
                      </div>
                      <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/5">
                        <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                          <Trophy className="w-4 h-4 text-amber-400" />
                        </div>
                        <span className="text-sm font-bold text-white/80">God Level Glow in Leaderboard</span>
                      </div>
                      <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/5">
                        <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                          <Sparkles className="w-4 h-4 text-amber-400" />
                        </div>
                        <span className="text-sm font-bold text-white/80">Golden Glow on Comments & Replies</span>
                      </div>
                    </div>

                    <button
                      onClick={handlePurchasePremium}
                      disabled={processingPayment}
                      className="relative z-10 w-full py-4 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white rounded-2xl text-sm font-black uppercase tracking-widest transition-all shadow-[0_0_40px_rgba(245,158,11,0.2)] hover:shadow-[0_0_60px_rgba(245,158,11,0.4)] hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
                    >
                      Pay ₹15
                    </button>
                  </>
                )}

                {paymentStep === 'gateway' && (
                  <div className="relative z-10 flex flex-col items-center justify-center py-8">
                    <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-6">
                      <CreditCard className="w-8 h-8 text-amber-400 animate-pulse" />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">Secure Payment Gateway</h3>
                    <p className="text-xs text-white/40 mb-8 text-center max-w-[200px]">
                      Processing your payment of ₹15... Please do not close this window.
                    </p>
                    <div className="flex items-center gap-2 text-amber-400 text-sm font-bold">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Assuring Payment...
                    </div>
                  </div>
                )}

                {paymentStep === 'success' && (
                  <div className="relative z-10 flex flex-col items-center justify-center py-8 animate-in zoom-in duration-300">
                    <div className="w-20 h-20 rounded-full bg-green-500/20 border border-green-500/50 flex items-center justify-center mb-6">
                      <Check className="w-10 h-10 text-green-400" />
                    </div>
                    <h3 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-500 uppercase tracking-tight mb-2">Payment Successful!</h3>
                    <p className="text-sm text-white/60 mb-8 max-w-[200px] text-center">
                      God Level Premium Unlocked!
                    </p>
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
};

export default ProfilePage;
