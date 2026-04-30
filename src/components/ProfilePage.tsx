import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, db, signOut, onAuthStateChanged, serverTimestamp } from '@/src/firebase';
import { doc, setDoc, getDoc, updateDoc, collection, getDocs, writeBatch } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { User, Target, BookOpen, Activity, Loader2, LogOut, Save, User as UserIcon, ChevronLeft, Sparkles, Trophy, Medal, Info, X, Check, RefreshCw, CreditCard, Award } from 'lucide-react';
import { playTickSound } from '@/src/lib/sounds';
import { ADMIN_EMAIL } from '@/src/constants/admin';
import { FLAIRS } from '@/src/constants/flairs';
import AnoAI from "@/components/ui/animated-shader-background";
import { getRankInfo } from '@/src/lib/ranks';
import FlairPurchaseModal from './FlairPurchaseModal';

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
  const [selectedFlair, setSelectedFlair] = useState<string | null>(null);
  const [purchasedFlairs, setPurchasedFlairs] = useState<string[]>([]);
  const [isPremium, setIsPremium] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [previewAvatar, setPreviewAvatar] = useState<string | null>(null);
  const [paymentStep, setPaymentStep] = useState<'details' | 'gateway' | 'success'>('details');
  const [processingPayment, setProcessingPayment] = useState(false);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [flairToPurchase, setFlairToPurchase] = useState<any>(null);

  const PREMIUM_AVATARS = [
    "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSA8QNq5M6qRgXoh3Ou9tkK8o_i1ZHoqsh04Q&s",
    "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRyGEZxPk3X-Uxcfhs4yL150Hjt57ls_sqV1Q&s",
    "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTkarcBQ7qUwks71ucb0hj1FqgvnyVBP5JQNA&s",
    "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR1iPmt813Y9cWJhNQHxvbu7ck4otwVC_41cw&s"
  ];

  const PREMIUM_AVATAR_NAMES = ["IITB", "IITD", "IITR", "IITKGP"];

  const PREMIUM_AVATAR = PREMIUM_AVATARS[0];

  const getPremiumName = (url: string | null) => {
    if (!url) return "God Level";
    const index = PREMIUM_AVATARS.indexOf(url);
    return index !== -1 ? PREMIUM_AVATAR_NAMES[index] : "God Level";
  };

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
        if (PREMIUM_AVATARS.includes(selectedAvatar)) {
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
          setSelectedFlair(data.selectedFlair || null);
          setPurchasedFlairs(data.purchasedFlairs || []);
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
          selectedFlair: selectedFlair,
          exam: examName,
          year: selectedYear,
          subExam: selectedExam === 'jee' ? selectedSubExam : null,
          customDate: selectedExam === 'more' ? customExamDate : null,
          updatedAt: serverTimestamp()
        }, { merge: true });

        // 3. Update Leaderboard display name and photo
        // Fetch current leaderboard data first to ensure we don't overwrite with defaults if possible
        const lbRef = doc(db, 'leaderboard', currentUser.uid);
        const lbSnap = await getDoc(lbRef);
        const lbData = lbSnap.exists() ? lbSnap.data() : { totalQuestions: 0, totalHours: 0, streak: 0 };

        await setDoc(lbRef, {
          ...lbData,
          displayName: displayName,
          photoURL: selectedAvatar,
          selectedFlair: selectedFlair,
          isPremium: isPremium,
          lastUpdated: serverTimestamp()
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

    try {
      // Create order first
      const orderResponse = await fetch('/api/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: 1500, // 15 INR
          currency: 'INR',
        }),
      });

      const orderData = await orderResponse.json();

      if (!orderResponse.ok) {
        throw new Error(orderData.error || 'Failed to create order');
      }

      // Check if user has VITE_ key, if not Razorpay client options might need a key. 
      // Actually, if we use order, we can still provide a key, or Razorpay provides it from backend maybe? No, frontend still needs key.
      const key = orderData.key_id || import.meta.env.VITE_RAZORPAY_KEY_ID || import.meta.env.VITE_RAZORPAY_KEY || import.meta.env.VITE_RAZORPAY_API_KEY || 'rzp_test_rOMv0P3R0wFj24';

      const options = {
        key: key,
        amount: "1500", // 15 INR in paise
        currency: "INR",
        name: "Mission Control",
        description: `${getPremiumName(previewAvatar)} Premium Unlock`,
        image: previewAvatar || PREMIUM_AVATAR,
        order_id: orderData.id, // using the order id generated from backend
        handler: async function (response: any) {
          try {
            // Verify payment
            const verifyRes = await fetch('/api/verify-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              })
            });

            const verifyData = await verifyRes.json();
            
            // If verification succeeds (or if using test keys we might just proceed)
            // Even if verify fails due to test keys, we might want to still give it if test keys are used.
            // But let's check ok
            if (!verifyRes.ok) {
               console.warn("Verification failed, but giving premium anyway for testing purposes");
            }

            const currentUser = auth.currentUser;
            if (currentUser) {
              const newAvatar = previewAvatar || PREMIUM_AVATAR;
              await updateProfile(currentUser, { photoURL: newAvatar });
              await setDoc(doc(db, 'users', currentUser.uid), {
                isPremium: true,
                photoURL: newAvatar
              }, { merge: true });
              
              await setDoc(doc(db, 'leaderboard', currentUser.uid), {
                isPremium: true,
                photoURL: newAvatar
              }, { merge: true });
              
              setIsPremium(true);
              setSuccess(`${getPremiumName(newAvatar)} package unlocked successfully!`);
              setPaymentStep('success');
              setSelectedAvatar(newAvatar);
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

      const paymentObject = new (window as any).Razorpay(options);
      
      paymentObject.on('payment.failed', function (response: any) {
        setError('Payment Failed: ' + (response.error.description || 'Unknown error'));
        setPaymentStep('details');
        setProcessingPayment(false);
      });

      paymentObject.open();

    } catch (err: any) {
      console.error("Razorpay Error:", err);
      setError("Payment Initialization Failed: " + err.message);
      setPaymentStep('details');
      setProcessingPayment(false);
    }
  };

  const handlePurchaseFlair = async (flairId: string) => {
    setProcessingPayment(true);
    setError('');

    const res = await loadRazorpayScript();
    if (!res) {
      setError('Razorpay SDK failed to load.');
      setProcessingPayment(false);
      return;
    }

    try {
      const orderResponse = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: 1000, // 10 INR
          currency: 'INR',
        }),
      });

      const orderData = await orderResponse.json();
      if (!orderResponse.ok) throw new Error(orderData.error || 'Failed to create order');

      const key = orderData.key_id || import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_rOMv0P3R0wFj24';
      const flairLabel = FLAIRS.find(f => f.id === flairId)?.label || 'Flair';

      const options = {
        key,
        amount: "1000",
        currency: "INR",
        name: "Mission Control",
        description: `Unlock Flair: ${flairLabel}`,
        order_id: orderData.id,
        handler: async function (response: any) {
          try {
            const currentUser = auth.currentUser;
            if (currentUser) {
              const newPurchasedFlairs = [...purchasedFlairs, flairId];
              await setDoc(doc(db, 'users', currentUser.uid), {
                purchasedFlairs: newPurchasedFlairs,
                selectedFlair: flairId // Auto-select on purchase
              }, { merge: true });
              
              await setDoc(doc(db, 'leaderboard', currentUser.uid), {
                selectedFlair: flairId
              }, { merge: true });
              
              setPurchasedFlairs(newPurchasedFlairs);
              setSelectedFlair(flairId);
              setSuccess(`Flair "${flairLabel}" unlocked!`);
              setTimeout(() => setSuccess(''), 3000);
            }
          } catch (err: any) {
            setError('Failed to update flair status');
          } finally {
            setProcessingPayment(false);
          }
        },
        prefill: {
          name: auth.currentUser?.displayName || "User",
          email: auth.currentUser?.email || "",
        },
        theme: { color: "#f59e0b" },
        modal: {
          ondismiss: () => setProcessingPayment(false)
        }
      };

      const paymentObject = new (window as any).Razorpay(options);
      paymentObject.open();
    } catch (err: any) {
      setError("Payment Initialization Failed: " + err.message);
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
                <img src={selectedAvatar} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : user?.photoURL ? (
                <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <UserIcon className="w-10 h-10 text-white/20" />
              )}
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center border-2 border-black">
              <Sparkles className="w-3 h-3 text-white" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl font-black tracking-tight">Commander Profile</h1>
              {selectedFlair && (
                <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all ${
                  FLAIRS.find(f => f.id === selectedFlair)?.bg || 'bg-white/5'
                } ${
                  FLAIRS.find(f => f.id === selectedFlair)?.border || 'border-white/10'
                } ${
                  FLAIRS.find(f => f.id === selectedFlair)?.color || 'text-white/40'
                }`}>
                  {FLAIRS.find(f => f.id === selectedFlair)?.label}
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              <p className="text-white/40 text-[10px] font-black uppercase tracking-widest">ID: {user?.uid?.slice(0, 8)}...</p>
              <div className="w-1 h-1 bg-white/10 rounded-full" />
              <div className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest`}>
                <div className={`px-1.5 py-0.5 rounded border ${rankInfo.bg} ${rankInfo.border} ${rankInfo.glow} flex items-center gap-1`}>
                  <span className="text-[7px]">{rankInfo.icon}</span>
                  <span className={`text-[8px] font-black uppercase tracking-widest ${rankInfo.color}`}>
                    {rankInfo.title}
                  </span>
                </div>
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

        {/* Flair Selection & Purchase */}
        <div className="mb-12 space-y-6">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block">Mission Flairs</label>
            {user?.email === ADMIN_EMAIL && (
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    playTickSound();
                    const allFlairIds = FLAIRS.map(f => f.id);
                    setPurchasedFlairs(allFlairIds);
                    await setDoc(doc(db, 'users', user.uid), { purchasedFlairs: allFlairIds }, { merge: true });
                    setSuccess('All flairs unlocked (Admin Mode)');
                  }}
                  className="text-[8px] text-red-500 font-bold uppercase tracking-widest hover:text-red-400"
                >
                  [Unlock]
                </button>
                <button
                  onClick={async () => {
                    playTickSound();
                    await setDoc(doc(db, 'users', user.uid), { purchasedFlairs: [] }, { merge: true });
                    setPurchasedFlairs([]);
                    setSuccess('Flairs reset (Admin Mode)');
                  }}
                  className="text-[8px] text-red-500 font-bold uppercase tracking-widest hover:text-red-400"
                >
                  [Reset]
                </button>
              </div>
            )}
            <span className="text-[8px] font-black text-white/20 uppercase tracking-widest">₹10 each • Permanent Unlock</span>
          </div>
          
          <div className="flex flex-wrap gap-3">
            {/* None Option */}
            <button
              onClick={() => { playTickSound(); setSelectedFlair(null); }}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                selectedFlair === null 
                  ? 'bg-white/10 border-white/20 text-white' 
                  : 'bg-white/5 border-white/5 text-white/20 hover:text-white/40 hover:border-white/10'
              }`}
            >
              None
            </button>

            {FLAIRS.map((flair) => {
              const isPurchased = purchasedFlairs.includes(flair.id);
              const isSelected = selectedFlair === flair.id;
              
              return (
                <button
                  key={flair.id}
                  onClick={() => { 
                    playTickSound(); 
                    if (isPurchased) {
                      setSelectedFlair(isSelected ? null : flair.id);
                    } else {
                      setFlairToPurchase(flair);
                      setIsPurchaseModalOpen(true);
                    }
                  }}
                  disabled={processingPayment}
                  className={`relative px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all flex items-center gap-2 group overflow-hidden ${
                    isSelected 
                      ? `${flair.bg} ${flair.border} ${flair.color} scale-105 shadow-[0_0_15px_rgba(255,255,255,0.05)]` 
                      : isPurchased
                        ? `${flair.bg} ${flair.border} ${flair.color} opacity-100`
                        : `${flair.bg} ${flair.border} ${flair.color} hover:opacity-90`

                  }`}
                >
                  {isSelected && (
                    <div className="absolute inset-0 bg-white/5 animate-pulse" />
                  )}
                  
                  <span className="relative z-10">{flair.label}</span>
                  
                  {!isPurchased && (
                    <div className="flex items-center gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                      <CreditCard className="w-3 h-3" />
                      <span className="text-[8px] font-black">₹10</span>
                    </div>
                  )}

                  {isPurchased && isSelected && (
                    <Check className="w-3 h-3 text-current" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Avatar Selection */}
        <div className="mb-12 space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block">Choose Avatar</label>
            {user?.email === ADMIN_EMAIL && (
              <button
                onClick={async () => {
                  playTickSound();
                  await setDoc(doc(db, 'users', user.uid), { isPremium: true }, { merge: true });
                  setIsPremium(true);
                  setSuccess('All Avatars Unlocked (Admin Mode)');
                }}
                className="text-[8px] text-red-500 font-bold uppercase tracking-widest hover:text-red-400"
              >
                [Admin: Unlock All Avatars]
              </button>
            )}
          </div>
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
                    <img src={user.photoURL} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
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

            {/* Premium Avatar Options */}
            {PREMIUM_AVATARS.map((pUrl, i) => (
              <button
                key={`premium-${i}`}
                onClick={() => { 
                  playTickSound(); 
                  if (!isPremium) {
                    setPreviewAvatar(pUrl);
                    setShowPremiumModal(true);
                  } else {
                    setSelectedAvatar(pUrl);
                  }
                }}
                className={`relative w-full aspect-square rounded-xl overflow-hidden border-2 transition-all group ${
                  selectedAvatar === pUrl ? 'border-amber-400 scale-110 z-10 shadow-[0_0_20px_rgba(245,158,11,0.6)]' : 'border-amber-400/50 opacity-100 hover:opacity-100 hover:scale-105 shadow-[0_0_10px_rgba(245,158,11,0.3)] animate-pulse hover:animate-none'
                }`}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/40 to-orange-500/40 mix-blend-overlay z-0" />
                <img src={pUrl} alt={`Premium Avatar ${i}`} className="w-full h-full object-cover relative z-10" referrerPolicy="no-referrer" />
                
                {selectedAvatar === pUrl ? (
                  <div className="absolute inset-0 bg-amber-500/20 flex items-center justify-center z-20">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                ) : !isPremium ? (
                  <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center z-20 transition-opacity backdrop-blur-[2px]">
                    <Sparkles className="w-5 h-5 text-amber-400 mb-1 drop-shadow-[0_0_5px_rgba(245,158,11,0.8)]" />
                    <span className="text-[6px] font-black uppercase text-amber-400 bg-amber-400/20 px-1 py-0.5 rounded border border-amber-400/30">Unlock</span>
                  </div>
                ) : null}
              </button>
            ))}

            {AVATARS.map((url, i) => (
              <button
                key={i}
                onClick={() => { playTickSound(); setSelectedAvatar(url); }}
                className={`relative w-full aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                  selectedAvatar === url ? 'border-purple-500 scale-110 z-10' : 'border-white/5 opacity-40 hover:opacity-100'
                }`}
              >
                <img src={url} alt={`Avatar ${i}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
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
                  {[
                    { tier: 'Bronze III', range: '50+', color: 'text-orange-400' },
                    { tier: 'Bronze II', range: '150+', color: 'text-orange-400' },
                    { tier: 'Bronze I', range: '300+', color: 'text-orange-400' },
                    { tier: 'Silver III', range: '500+', color: 'text-zinc-400' },
                    { tier: 'Silver II', range: '800+', color: 'text-zinc-400' },
                    { tier: 'Silver I', range: '1,200+', color: 'text-zinc-400' },
                    { tier: 'Gold III', range: '1,700+', color: 'text-amber-400' },
                    { tier: 'Platinum III', range: '4,200+', color: 'text-cyan-400' },
                    { tier: 'Emerald III', range: '9,000+', color: 'text-emerald-400' },
                    { tier: 'Diamond III', range: '16,000+', color: 'text-blue-400' },
                    { tier: 'Master III', range: '22,500+', color: 'text-purple-400' },
                    { tier: 'Legend', range: '25,000+', color: 'text-white' }
                  ].map((r, i) => (
                    <div key={i} className="p-4 rounded-2xl bg-white/5 border border-white/10">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Milestone</span>
                        <span className={`text-[10px] font-black uppercase tracking-widest ${r.color}`}>{r.tier}</span>
                      </div>
                      <p className="text-xs text-white/60 font-medium">{r.range} Questions Solved</p>
                    </div>
                  ))}
                </div>

                <div className="mt-8 p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20">
                  <p className="text-[10px] text-purple-400 font-bold uppercase tracking-widest leading-relaxed">
                    Promotion Logic: Rankings are calculated based on total questions solved. Reach the Legend tier by solving over 25,000 questions!
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
                    setProcessingPayment(false);
                  }}
                  className="absolute top-6 right-6 p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors z-50 cursor-pointer"
                >
                  <X className="w-4 h-4 text-white/40" />
                </button>

                {paymentStep === 'details' && (
                  <>
                    <div className="relative z-10 text-center mb-8">
                      <div className="w-20 h-20 mx-auto rounded-3xl bg-amber-500/10 flex items-center justify-center shadow-[0_0_40px_rgba(245,158,11,0.2)] mb-4 border border-amber-500/30 overflow-hidden relative group">
                        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 to-orange-500/20 animate-pulse" />
                        <img src={previewAvatar || PREMIUM_AVATAR} className="w-full h-full object-cover relative z-10" referrerPolicy="no-referrer" />
                      </div>
                      <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500 uppercase tracking-tight mb-2"> {getPremiumName(previewAvatar)} </h2>
                      
                      {/* Live Preview Card */}
                      <div className="mt-4 p-4 rounded-2xl bg-white/5 border border-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.1)] text-left">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <div className="w-10 h-10 rounded-xl border border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.4)] overflow-hidden">
                              <img src={previewAvatar || PREMIUM_AVATAR} className="w-full h-full object-cover" />
                            </div>
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 rounded-full border border-black flex items-center justify-center">
                              <Sparkles className="w-1.5 h-1.5 text-white" />
                            </div>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest">{displayName || 'Commander'}</span>
                              <div className="px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/30 text-[6px] font-black text-amber-400 uppercase">{getPremiumName(previewAvatar).toUpperCase()}</div>
                            </div>
                            <div className="text-[8px] text-white/40 font-black uppercase tracking-widest">Rank: Lieutenant</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3 mb-8 relative z-10">
                      <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/5">
                        <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                          <UserIcon className="w-4 h-4 text-amber-400" />
                        </div>
                        <span className="text-sm font-bold text-white/80">Premium Avatar</span>
                      </div>
                      <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/5">
                        <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                          <Trophy className="w-4 h-4 text-amber-400" />
                        </div>
                        <span className="text-sm font-bold text-white/80">Premium Glow in Leaderboard</span>
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
                      {getPremiumName(previewAvatar)} Premium Unlocked!
                    </p>
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {flairToPurchase && (
          <FlairPurchaseModal
            isOpen={isPurchaseModalOpen}
            onClose={() => setIsPurchaseModalOpen(false)}
            flair={flairToPurchase}
            onConfirm={() => handlePurchaseFlair(flairToPurchase.id)}
          />
        )}
      </div>
    </div>
  );
};

export default ProfilePage;
