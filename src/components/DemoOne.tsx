import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Target, Zap, Clock, Trophy, CheckCircle2, Activity, User as UserIcon, Check, StickyNote, Sparkles, BrainCircuit } from 'lucide-react';
import AnoAI from "@/components/ui/animated-shader-background";
import CountdownTimer from "@/components/ui/countdown-timer";
import SubjectChecklist from "@/components/SubjectChecklist";
import WeeklyTargets from "@/components/WeeklyTargets";
import NotesTool from "@/components/NotesTool";
import DeepAnalyticsModal from "@/components/DeepAnalyticsModal";
import DeepAnalyticsPreviewModal from "@/components/DeepAnalyticsPreviewModal";
import { auth, onAuthStateChanged, db, doc, getDoc, setDoc, updateDoc, onSnapshot, collection, query, orderBy, limit, User, handleFirestoreError, OperationType, serverTimestamp, increment, addDoc } from '@/src/firebase';
import { updateProfile } from 'firebase/auth';
import { playTickSound } from '@/src/lib/sounds';

interface DemoOneProps {
  onProfileClick: () => void;
  settings?: { 
    activateChat: boolean; 
    activateCommunity: boolean; 
    streakGoal: number;
    timerSoundEnabled: boolean;
    timerSoundType: string;
  };
  updateSettings?: (newSettings: any) => void;
}

const EXAM_DATES: Record<string, any> = {
  jee: {
    mains: {
      '2026': '2026-01-20T09:00:00',
      '2027': '2027-01-21T09:00:00',
      '2028': '2028-01-20T09:00:00',
    },
    advanced: {
      '2026': '2026-05-17T09:00:00',
      '2027': '2027-05-23T09:00:00',
      '2028': '2028-05-21T09:00:00',
    }
  },
  neet: {
    '2026': '2026-05-03T09:00:00',
    '2027': '2027-05-02T09:00:00',
    '2028': '2028-05-07T09:00:00',
  },
  boards: {
    '2026': '2026-02-15T09:00:00',
    '2027': '2027-02-15T09:00:00',
    '2028': '2028-02-15T09:00:00',
    '9th': '2027-03-01T09:00:00',
    '10th': '2027-02-15T09:00:00',
    '11th': '2027-03-01T09:00:00',
    '12th': '2027-02-15T09:00:00',
  }
};

const DemoOne = ({ onProfileClick, settings, updateSettings }: DemoOneProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [globalRank, setGlobalRank] = useState<number | string>('--');
  const [timerState, setTimerState] = useState({ isRunning: false, startTime: null as number | null, accumulatedSeconds: 0 });
  const [showSettings, setShowSettings] = useState(false);
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [isDeepAnalyticsUnlocked, setIsDeepAnalyticsUnlocked] = useState(false);
  const [isDeepAnalyticsOpen, setIsDeepAnalyticsOpen] = useState(false);
  const [isDeepAnalyticsPreviewOpen, setIsDeepAnalyticsPreviewOpen] = useState(false);
  const [showExamCounter, setShowExamCounter] = useState(true);
  const [dailyStudySeconds, setDailyStudySeconds] = useState<Record<string, number>>({});
  const [dailyQuestions, setDailyQuestions] = useState<Record<string, number>>({});
  const [weeklyData, setWeeklyData] = useState<any>({});
  const [isStatsLoaded, setIsStatsLoaded] = useState(false);
  const [stats, setStats] = useState<Array<{ label: string; value: string; icon: React.ReactNode; color: string; completed?: boolean }>>([
    { label: "Daily Goal", value: "--", icon: <Target className="w-3 h-3" />, color: "text-emerald-400", completed: false },
    { label: "Study Time", value: "--", icon: <Clock className="w-3 h-3" />, color: "text-blue-400", completed: false },
    { label: "Questions Solved", value: "--", icon: <Target className="w-3 h-3" />, color: "text-purple-400", completed: false },
    { label: "Current Streak", value: "--", icon: <Zap className="w-3 h-3" />, color: "text-orange-400", completed: false },
  ]);

  const [selectedExam, setSelectedExam] = useState(() => {
    // Try to get initial state from localStorage to prevent flicker
    const exam = (typeof window !== 'undefined' ? localStorage.getItem('pulse_user_exam') || 'jee' : 'jee').toLowerCase();
    const year = typeof window !== 'undefined' ? localStorage.getItem('pulse_user_year') || '2027' : '2027';
    const subExam = typeof window !== 'undefined' ? localStorage.getItem('pulse_user_subexam') || 'mains' : 'mains';
    const customDate = typeof window !== 'undefined' ? localStorage.getItem('pulse_custom_date') : null;

    if (customDate && !['jee', 'neet', 'boards'].includes(exam)) {
      return {
        id: 'custom',
        label: exam.toUpperCase(),
        date: customDate,
        subExam: ''
      };
    }

    let targetDate = '';
    if (exam === 'jee') {
      targetDate = EXAM_DATES.jee[subExam]?.[year] || `${year}-01-20T09:00:00`;
    } else {
      targetDate = EXAM_DATES[exam]?.[year] || `${year}-05-01T09:00:00`;
    }

    return {
      id: `${exam}_${year}`,
      label: `${exam.toUpperCase()} ${year}${exam === 'jee' ? ` (${subExam.toUpperCase()})` : ''}`,
      date: targetDate,
      subExam: subExam
    };
  });
  const [targetHours, setTargetHours] = useState(settings?.streakGoal || 7);
  const [targetGoal, setTargetGoal] = useState(() => {
    return typeof window !== 'undefined' ? localStorage.getItem('pulse_target_goal') || 'TARGET: TOP 100 RANK' : 'TARGET: TOP 100 RANK';
  });

  const updateTargetGoal = async (newGoal: string) => {
    setTargetGoal(newGoal);
    localStorage.setItem('pulse_target_goal', newGoal);
    if (user) {
      await setDoc(doc(db, 'users', user.uid, 'settings', 'dashboard'), { targetGoal: newGoal }, { merge: true });
    }
  };

  useEffect(() => {
    if (settings?.streakGoal) {
      setTargetHours(settings.streakGoal);
    }
  }, [settings?.streakGoal]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const [currentWeekStart] = useState(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const start = new Date(d.setDate(diff));
    start.setHours(0, 0, 0, 0);
    return start;
  });
  const weekId = currentWeekStart.toISOString().split('T')[0];

  useEffect(() => {
    if (!user) {
      const saved = localStorage.getItem(`weekly-targets-${weekId}`);
      if (saved) setWeeklyData(JSON.parse(saved));
      return;
    }

    const unsubscribe = onSnapshot(doc(db, 'users', user.uid, 'weeklyTargets', weekId), (doc) => {
      if (doc.exists()) {
        setWeeklyData(doc.data().days || {});
      } else {
        setWeeklyData({});
      }
    });

    return () => unsubscribe();
  }, [user, weekId]);

  // Sync Settings from Firestore
  useEffect(() => {
    const fetchExamData = async () => {
      let exam = (localStorage.getItem('pulse_user_exam') || 'jee').toLowerCase();
      let year = localStorage.getItem('pulse_user_year') || '2027';
      let subExam = localStorage.getItem('pulse_user_subexam') || 'mains';
      const customDate = localStorage.getItem('pulse_custom_date');

      if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          const data = userDoc.data();
          
          // One-time streak reset logic
          if (!data.streakReset_2026_04_12_v2) {
            try {
              const lbRef = doc(db, 'leaderboard', user.uid);
              const lbSnap = await getDoc(lbRef);
              if (lbSnap.exists()) {
                await updateDoc(lbRef, { streak: 0, lastUpdated: serverTimestamp() });
              } else {
                await setDoc(lbRef, {
                  displayName: user.displayName || user.email?.split('@')[0] || 'Student',
                  photoURL: user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName || user.email}&background=random`,
                  totalQuestions: 0,
                  totalHours: 0,
                  streak: 0,
                  lastUpdated: serverTimestamp()
                });
              }
              await updateDoc(userDocRef, { streakReset_2026_04_12_v2: true });
            } catch (err) {
              console.error("Streak reset error:", err);
            }
          }

          exam = (data.exam || exam).toLowerCase();
          year = data.year || year;
          subExam = data.subExam || subExam;
          setIsDeepAnalyticsUnlocked(data.isDeepAnalyticsUnlocked || false);
          
          // Sync to localStorage to prevent flicker on next load
          localStorage.setItem('pulse_user_exam', exam);
          localStorage.setItem('pulse_user_year', year);
          localStorage.setItem('pulse_user_subexam', subExam);
          if (data.customDate) {
            localStorage.setItem('pulse_custom_date', data.customDate);
            if (selectedExam.id !== 'custom' || selectedExam.date !== data.customDate) {
              setSelectedExam({
                id: 'custom',
                label: data.exam.toUpperCase(),
                date: data.customDate,
                subExam: ''
              });
            }
            return;
          }
        }
      } else {
        if (customDate && !['jee', 'neet', 'boards'].includes(exam)) {
          if (selectedExam.id !== 'custom' || selectedExam.date !== customDate) {
            setSelectedExam({
              id: 'custom',
              label: exam.toUpperCase(),
              date: customDate,
              subExam: ''
            });
          }
          return;
        }
      }

      let targetDate = '';
      if (exam === 'jee') {
        targetDate = EXAM_DATES.jee[subExam]?.[year] || `${year}-01-20T09:00:00`;
      } else {
        targetDate = EXAM_DATES[exam]?.[year] || `${year}-05-01T09:00:00`;
      }

      const newId = `${exam}_${year}`;
      if (selectedExam.id !== newId || selectedExam.date !== targetDate || selectedExam.subExam !== subExam) {
        setSelectedExam({
          id: newId,
          label: `${exam.toUpperCase()} ${year}${exam === 'jee' ? ` (${subExam.toUpperCase()})` : ''}`,
          date: targetDate,
          subExam: subExam
        });
      }
    };

    fetchExamData();

    if (!user) {
      const savedTarget = localStorage.getItem('jee-target-hours');
      if (savedTarget) setTargetHours(Number(savedTarget));
      return;
    }

    const unsubscribe = onSnapshot(doc(db, 'users', user.uid, 'settings', 'dashboard'), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        if (data.targetHours) setTargetHours(data.targetHours);
        if (data.showExamCounter !== undefined) setShowExamCounter(data.showExamCounter);
        if (data.targetGoal) {
          setTargetGoal(data.targetGoal);
          localStorage.setItem('pulse_target_goal', data.targetGoal);
        }
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${user.uid}/settings/dashboard`, false);
    });

    return () => unsubscribe();
  }, [user]);

  // Global Rank Listener
  useEffect(() => {
    const q = query(collection(db, 'leaderboard'), orderBy('totalQuestions', 'desc'), limit(100));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (user) {
        const index = snapshot.docs.findIndex(d => d.id === user.uid);
        setGlobalRank(index !== -1 ? `#${index + 1}` : '100+');
      } else {
        setGlobalRank('--');
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'leaderboard', false);
    });
    return () => unsubscribe();
  }, [user]);

  // Timer State Listener
  useEffect(() => {
    if (!user) return;
    const unsubscribe = onSnapshot(doc(db, 'users', user.uid, 'data', 'timer'), (doc) => {
      if (doc.exists()) {
        setTimerState(doc.data() as any);
      }
    });
    return () => unsubscribe();
  }, [user]);

  // Daily Stats Listener
  useEffect(() => {
    if (!user) return;
    const unsubscribe = onSnapshot(collection(db, 'users', user.uid, 'dailyStats'), (snapshot) => {
      const secondsMap: Record<string, number> = {};
      const questionsMap: Record<string, number> = {};
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.studySeconds) secondsMap[doc.id] = data.studySeconds;
        if (data.questionsSolved) questionsMap[doc.id] = data.questionsSolved;
      });
      setDailyStudySeconds(secondsMap);
      setDailyQuestions(questionsMap);
      setIsStatsLoaded(true);
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    const savedCounter = localStorage.getItem('pulse_show_exam_counter');
    if (savedCounter !== null) {
      setShowExamCounter(savedCounter === 'true');
    }
  }, []);

  const updateTargetHours = async (newTarget: number) => {
    setTargetHours(newTarget);
    if (user) {
      await setDoc(doc(db, 'users', user.uid, 'settings', 'dashboard'), { targetHours: newTarget }, { merge: true });
    } else {
      localStorage.setItem('jee-target-hours', newTarget.toString());
    }
  };

  const calculateStreak = (secondsMap: Record<string, number>, target: number) => {
    if (!secondsMap || Object.keys(secondsMap).length === 0) return 0;
    
    let currentStreak = 0;
    let checkDate = new Date();
    checkDate.setHours(0, 0, 0, 0);
    const targetSeconds = 30 * 60; // 30 minutes minimum for a streak day

    const todayStr = checkDate.toDateString();
    const todaySeconds = secondsMap[todayStr] || 0;

    if (todaySeconds < targetSeconds) {
      const yesterday = new Date(checkDate);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toDateString();
      if ((secondsMap[yesterdayStr] || 0) < targetSeconds) return 0;
      checkDate = yesterday;
    }

    let safety = 0;
    while (safety < 1000) {
      const dateStr = checkDate.toDateString();
      const seconds = secondsMap[dateStr] || 0;
      if (seconds >= targetSeconds) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
      safety++;
    }
    return currentStreak;
  };

  useEffect(() => {
    const today = new Date().toDateString();
    const updateStats = () => {
      let baseStudyTimeSeconds = dailyStudySeconds[today] || 0;
      let baseQuestionsSolved = dailyQuestions[today] || 0;

      // Extract live session info for real-time visualization
      const activeSessionStr = localStorage.getItem('pulse_active_session');
      let sessionSeconds = 0;
      let sessionQuestions = 0;
      
      if (activeSessionStr) {
        const session = JSON.parse(activeSessionStr);
        sessionSeconds = session.studySeconds || 0;
        sessionQuestions = session.questionsSolved || 0;
      } else if (timerState.isRunning && timerState.startTime) {
        // Fallback to Firestore timer data if local mirror isn't there
        sessionSeconds = Math.max(0, Math.floor((Date.now() - timerState.startTime) / 1000));
      }

      const formatTimeHM = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        if (h === 0) return `${m}m`;
        return `${h}h ${m}m`;
      };

      const displayStudySeconds = baseStudyTimeSeconds + sessionSeconds;
      const displayQuestions = baseQuestionsSolved + sessionQuestions;

      const studyTimeDisplay = formatTimeHM(displayStudySeconds);

      const todayIdx = (new Date().getDay() === 0 ? 6 : new Date().getDay() - 1);
      const todaysTargets = weeklyData[todayIdx] || [];
      let dailyGoalValue = "0%";
      if (todaysTargets.length > 0) {
        const completedCount = todaysTargets.filter((t: any) => t.completed).length;
        dailyGoalValue = `${Math.round((completedCount / todaysTargets.length) * 100)}%`;
      }

      const currentSecondsMap = { ...dailyStudySeconds, [today]: displayStudySeconds };
      const currentStreak = calculateStreak(currentSecondsMap, targetHours);
      const streak = `${currentStreak} Days`;
      const isGoalMet = displayStudySeconds >= targetHours * 3600;

      setStats([
        { label: "Daily Goal", value: dailyGoalValue, icon: <Target className="w-3 h-3" />, color: "text-emerald-400", completed: dailyGoalValue === "100%" },
        { label: "Study Time", value: studyTimeDisplay, icon: <Clock className="w-3 h-3" />, color: "text-blue-400", completed: isGoalMet },
        { label: "Questions Solved", value: displayQuestions.toString(), icon: <Target className="w-3 h-3" />, color: "text-purple-400", completed: displayQuestions >= 50 },
        { label: "Current Streak", value: streak, icon: <Zap className="w-3 h-3" />, color: "text-orange-400", completed: currentStreak > 0 },
      ]);
    };

    updateStats();
    const interval = setInterval(updateStats, 2000); // Throttled to 2s
    return () => clearInterval(interval);
  }, [targetHours, globalRank, timerState, dailyStudySeconds, weeklyData]);

  const toggleTimer = async () => {
    if (!isStatsLoaded) {
      console.warn("DemoOne: Stats not yet loaded from Firestore.");
      return;
    }
    playTickSound();
    if (!user) return;
    const today = new Date().toDateString();
    const todaySeconds = dailyStudySeconds[today] || 0;

    const syncGlobalProgress = async (questions: number, hours: number) => {
      try {
        const leaderboardRef = doc(db, 'leaderboard', user.uid);
        const leaderboardSnap = await getDoc(leaderboardRef);
        const isNewUser = !leaderboardSnap.exists();

        const currentSecondsMap = { ...dailyStudySeconds, [today]: (dailyStudySeconds[today] || 0) + (hours * 3600) };
        const currentStreak = calculateStreak(currentSecondsMap, targetHours);
        
        // Update Leaderboard
        await setDoc(leaderboardRef, {
          displayName: user.displayName || user.email?.split('@')[0] || 'Anonymous',
          photoURL: user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName || user.email}&background=random`,
          totalQuestions: increment(questions),
          totalHours: increment(hours),
          streak: currentStreak, // Accurate streak based on study hours
          lastUpdated: serverTimestamp()
        }, { merge: true });

        // Update Global Stats
        const globalStatsRef = doc(db, 'stats', 'global');
        await setDoc(globalStatsRef, {
          totalStudents: increment(isNewUser ? 1 : 0),
          totalQuestions: increment(questions),
          totalHours: increment(hours),
          lastUpdated: serverTimestamp()
        }, { merge: true });

        // Add Activity
        if (questions > 0) {
          await addDoc(collection(db, 'activity'), {
            uid: user.uid,
            displayName: user.displayName || user.email?.split('@')[0] || 'Anonymous',
            action: `solved ${questions} questions`,
            type: 'questions',
            value: questions,
            createdAt: serverTimestamp()
          });
        }
        if (hours > 0) {
          await addDoc(collection(db, 'activity'), {
            uid: user.uid,
            displayName: user.displayName || user.email?.split('@')[0] || 'Anonymous',
            action: `completed ${hours.toFixed(1)}h study`,
            type: 'hours',
            value: hours,
            createdAt: serverTimestamp()
          });
        }
      } catch (error) {
        console.error("Global sync error:", error);
      }
    };

    if (!timerState.isRunning) {
      const now = Date.now();
      const timerRef = doc(db, 'users', user.uid, 'data', 'timer');
      await setDoc(timerRef, {
        isRunning: true,
        startTime: now,
        accumulatedSeconds: todaySeconds, // Start with what's already done today
        lastUpdated: serverTimestamp()
      }, { merge: true });
    } else {
      const now = Date.now();
      const sessionSeconds = Math.max(0, Math.floor((now - (timerState.startTime || now)) / 1000));
      const totalElapsed = timerState.accumulatedSeconds + sessionSeconds;
      
      const timerRef = doc(db, 'users', user.uid, 'data', 'timer');
      await setDoc(timerRef, {
        isRunning: false,
        startTime: null,
        accumulatedSeconds: totalElapsed, // Save total to avoid reset to 0
        lastUpdated: serverTimestamp()
      }, { merge: true });

      const sessionHours = sessionSeconds / 3600;
      
      const sessionQuestions = 0; // In DemoOne, we don't have a direct question incrementer, 
      // but if we were to support it, we'd extract it from active session mirror.
      const activeSessionStr = localStorage.getItem('pulse_active_session');
      let sessionQ = 0;
      if (activeSessionStr) {
        const session = JSON.parse(activeSessionStr);
        sessionQ = session.questionsSolved || 0;
      }
      
      await syncGlobalProgress(sessionQ, sessionHours);

      const statsRef = doc(db, 'users', user.uid, 'dailyStats', today);
      await setDoc(statsRef, {
        studySeconds: increment(sessionSeconds), // Use increment for safety
        questionsSolved: increment(sessionQ),
        date: today,
        lastUpdated: serverTimestamp(),
        [`subjectSeconds.${localStorage.getItem('pulse_selected_subject') || 'Other'}`]: increment(sessionSeconds)
      }, { merge: true });
    }
  };

  const toggleSubExam = async () => {
    playTickSound();
    const newSub = selectedExam.subExam === 'mains' ? 'advanced' : 'mains';
    const exam = selectedExam.id.split('_')[0];
    const year = selectedExam.id.split('_')[1];
    
    const targetDate = EXAM_DATES.jee[newSub]?.[year] || `${year}-01-20T09:00:00`;

    setSelectedExam(prev => ({
      ...prev,
      label: `${exam.toUpperCase()} ${year} (${newSub.toUpperCase()})`,
      date: targetDate,
      subExam: newSub
    }));

    if (user) {
      await setDoc(doc(db, 'users', user.uid), { subExam: newSub }, { merge: true });
    } else {
      localStorage.setItem('pulse_user_subexam', newSub);
    }
  };

  const toggleExamCounter = async () => {
    playTickSound();
    const newValue = !showExamCounter;
    setShowExamCounter(newValue);
    localStorage.setItem('pulse_show_exam_counter', newValue.toString());
    if (user) {
      await setDoc(doc(db, 'users', user.uid, 'settings', 'dashboard'), { showExamCounter: newValue }, { merge: true });
    }
  };

  const hasDeepAnalysisAccess = isDeepAnalyticsUnlocked || user?.email === 'bablasaur19@gmail.com' || user?.email === 'pokelife128@gmail.com';

  const handleUnlockDeepAnalytics = async () => {
    if (hasDeepAnalysisAccess) {
      playTickSound();
      setIsDeepAnalyticsOpen(true);
      return;
    }

    playTickSound();
    if (!user) {
      alert("Please login to unlock Deep Analytics");
      return;
    }

    setIsDeepAnalyticsPreviewOpen(true);
  };

  const handlePurchaseDeepAnalytics = async () => {
    const loadRazorpay = () => {
      return new Promise((resolve) => {
        const script = document.createElement("script");
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
      });
    };

    const res = await loadRazorpay();
    if (!res) {
      alert("Razorpay SDK failed to load. Are you online?");
      return;
    }

    try {
      const orderResponse = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: 10000, // 100 INR in paise
          currency: 'INR',
        }),
      });

      const orderData = await orderResponse.json();
      if (!orderResponse.ok) throw new Error(orderData.error);

      const key = orderData.key_id || 'rzp_test_rOMv0P3R0wFj24';

      const options = {
        key,
        amount: "10000",
        currency: "INR",
        name: "Mission Control",
        description: "Unlock Deep Analytics Package",
        order_id: orderData.id,
        handler: async function (response: any) {
          try {
            await setDoc(doc(db, 'users', user.uid), {
              isDeepAnalyticsUnlocked: true
            }, { merge: true });
            setIsDeepAnalyticsUnlocked(true);
            setIsDeepAnalyticsPreviewOpen(false);
            setIsDeepAnalyticsOpen(true);
            alert("Congratulations! Deep Analytics unlocked successfully.");
          } catch (err) {
            console.error("Selection update error:", err);
          }
        },
        prefill: {
          name: user.displayName || "User",
          email: user.email || "",
        },
        theme: { color: "#9333ea" }
      };

      const paymentObject = new (window as any).Razorpay(options);
      paymentObject.open();
    } catch (err: any) {
      console.error(err);
      alert("Payment failed to initialize: " + err.message);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className="w-full min-h-screen bg-black overflow-x-hidden relative">
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(17,24,39,1)_0%,rgba(0,0,0,1)_100%)] pointer-events-none" />
      
      {/* Top Bar with Profile and Notes */}
        <div className="absolute top-0 left-0 right-0 z-[100] flex justify-between items-start p-6">
          <div className="flex items-center gap-4">
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => { playTickSound(); setIsNotesOpen(true); }}
              className="group relative"
            >
              <div className="px-6 py-2.5 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl hover:bg-white/[0.08] hover:border-white/20 transition-all flex items-center gap-3 shadow-2xl">
                <div className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400">
                  <StickyNote className="w-4 h-4" />
                </div>
                <span className="text-xs font-black text-white uppercase tracking-[0.2em]">Notes</span>
              </div>
              <div className="absolute -inset-1 bg-blue-500/10 rounded-2xl blur opacity-0 group-hover:opacity-100 transition-opacity" />
            </motion.button>

            {selectedExam.id.startsWith('jee') && (
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleUnlockDeepAnalytics}
                className="group relative"
              >
              {/* Premium Glow Effect */}
              <div className={`absolute -inset-[1px] rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-sm ${
                hasDeepAnalysisAccess ? 'bg-gradient-to-r from-purple-500 to-blue-500' : 'bg-gradient-to-r from-purple-600/50 to-blue-600/50'
              }`} />
              
              <div className={`relative px-6 py-3 rounded-2xl border backdrop-blur-2xl transition-all duration-500 flex items-center gap-4 shadow-[0_0_30px_rgba(0,0,0,0.5)] overflow-hidden ${
                hasDeepAnalysisAccess
                  ? 'bg-purple-500/5 border-purple-500/40 text-purple-400' 
                  : 'bg-white/[0.02] border-white/10 hover:border-purple-500/30'
              }`}>
                {/* Shimmer Overlay */}
                <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.05)_50%,transparent_75%)] bg-[length:250%_250%] animate-[shimmer_3s_infinite] opacity-0 group-hover:opacity-100 transition-opacity" />
                
                {/* Icon Container with Pulse */}
                <div className="relative">
                  <div className={`p-2 rounded-xl transition-all duration-500 ${
                    hasDeepAnalysisAccess
                      ? 'bg-purple-500/20 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.4)]' 
                      : 'bg-white/5 text-white/40 group-hover:bg-purple-500/10 group-hover:text-purple-400'
                  }`}>
                    <Activity className={`w-5 h-5 ${hasDeepAnalysisAccess ? 'animate-[pulse_2s_infinite]' : ''}`} />
                  </div>
                  {hasDeepAnalysisAccess && (
                    <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full border-2 border-[#0a0a0b] flex items-center justify-center">
                      <Check className="w-1.5 h-1.5 text-black stroke-[4]" />
                    </div>
                  )}
                </div>

                <div className="flex flex-col items-start relative z-10">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-black uppercase tracking-[0.25em] text-white">
                      {hasDeepAnalysisAccess ? 'Deep Analysis' : 'Unlock Deep Analysis'}
                    </span>
                    {!hasDeepAnalysisAccess && <Sparkles className="w-3 h-3 text-purple-500 animate-pulse" />}
                  </div>
                  
                  <div className="flex items-center gap-2 mt-0.5">
                    {hasDeepAnalysisAccess ? (
                      <span className="text-[8px] font-mono font-black text-purple-400/80 uppercase tracking-[0.1em] flex items-center gap-1">
                        <div className="w-1 h-1 bg-purple-500 rounded-full" />
                        {user?.email === 'bablasaur19@gmail.com' || user?.email === 'pokelife128@gmail.com' ? 'Admin Override Active' : 'System Operating'}
                      </span>
                    ) : (
                      <>
                        <span className="text-[9px] font-mono font-black text-purple-500 tracking-wider">₹100</span>
                        <div className="w-1 h-1 bg-white/10 rounded-full" />
                        <span className="text-[7px] font-black text-white/30 uppercase tracking-[0.15em]">Permanent Access</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Cyberpunk corner accents */}
                <div className="absolute top-0 right-0 w-8 h-8 pointer-events-none">
                  <div className="absolute top-2 right-2 w-[1px] h-2 bg-white/10" />
                  <div className="absolute top-2 right-2 w-2 h-[1px] bg-white/10" />
                </div>
              </div>
            </motion.button>
            )}
          </div>

          <div className="relative">
          <button 
            onClick={() => { playTickSound(); setShowSettings(!showSettings); }}
            className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all overflow-hidden"
          >
            {user?.photoURL ? (
              <img src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName || user.email}&background=random`} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <UserIcon className="w-5 h-5 text-white/40" />
            )}
          </button>

          <AnimatePresence>
            {showSettings && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setShowSettings(false)}
                />
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 mt-4 w-64 bg-[#0a0a0b] border border-white/10 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-50 overflow-hidden"
                >
                  <div className="p-4 border-b border-white/5 bg-white/[0.02]">
                    <h3 className="text-[10px] font-black text-white/40 uppercase tracking-widest">Commander Menu</h3>
                  </div>
                  <div className="p-2">
                    <button 
                      onClick={() => { setShowSettings(false); onProfileClick(); }}
                      className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-white/5 transition-all text-left group"
                    >
                      <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 group-hover:scale-110 transition-transform">
                        <UserIcon className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-bold text-white">Profile Settings</span>
                    </button>

                    <div className="h-px bg-white/5 my-2 mx-2" />

                    <div className="p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold text-white/60">Exam Counter</span>
                        <button 
                          onClick={toggleExamCounter}
                          className={`w-10 h-5 rounded-full transition-all relative ${showExamCounter ? 'bg-emerald-500' : 'bg-white/10'}`}
                        >
                          <motion.div 
                            animate={{ x: showExamCounter ? 20 : 2 }}
                            className="absolute top-1 left-0 w-3 h-3 bg-white rounded-full shadow-lg"
                          />
                        </button>
                      </div>
                      <p className="text-[8px] text-white/20 uppercase tracking-widest">Toggle dashboard countdown</p>
                    </div>

                    <div className="h-px bg-white/5 my-2 mx-2" />

                    {/* App Settings in Dropdown */}
                    <div className="p-3 space-y-4">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-white/60">Activate Chat</span>
                          <button 
                            onClick={() => { playTickSound(); updateSettings?.({ activateChat: !settings?.activateChat }); }}
                            className={`w-10 h-5 rounded-full transition-all relative ${settings?.activateChat ? 'bg-emerald-500' : 'bg-white/10'}`}
                          >
                            <motion.div 
                              animate={{ x: settings?.activateChat ? 20 : 2 }}
                              className="absolute top-1 left-0 w-3 h-3 bg-white rounded-full shadow-lg"
                            />
                          </button>
                        </div>
                        <p className="text-[8px] text-white/20 uppercase tracking-widest">Enable friend messaging</p>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-white/60">Activate Community</span>
                          <button 
                            onClick={() => { playTickSound(); updateSettings?.({ activateCommunity: !settings?.activateCommunity }); }}
                            className={`w-10 h-5 rounded-full transition-all relative ${settings?.activateCommunity ? 'bg-emerald-500' : 'bg-white/10'}`}
                          >
                            <motion.div 
                              animate={{ x: settings?.activateCommunity ? 20 : 2 }}
                              className="absolute top-1 left-0 w-3 h-3 bg-white rounded-full shadow-lg"
                            />
                          </button>
                        </div>
                        <p className="text-[8px] text-white/20 uppercase tracking-widest">Enable global feed</p>
                      </div>

                      <div className="h-px bg-white/5 my-2" />

                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-white/60">Timer Sound</span>
                          <button 
                            onClick={() => { playTickSound(); updateSettings?.({ timerSoundEnabled: !settings?.timerSoundEnabled }); }}
                            className={`w-10 h-5 rounded-full transition-all relative ${settings?.timerSoundEnabled ? 'bg-emerald-500' : 'bg-white/10'}`}
                          >
                            <motion.div 
                              animate={{ x: settings?.timerSoundEnabled ? 20 : 2 }}
                              className="absolute top-1 left-0 w-3 h-3 bg-white rounded-full shadow-lg"
                            />
                          </button>
                        </div>
                        
                        {settings?.timerSoundEnabled && (
                          <div className="grid grid-cols-3 gap-1">
                            {['f1', 'tank', 'jet'].map((type) => (
                              <button
                                key={type}
                                onClick={() => { playTickSound(); updateSettings?.({ timerSoundType: type }); }}
                                className={`py-1.5 rounded-lg text-[7px] font-black uppercase tracking-widest transition-all border ${
                                  settings?.timerSoundType === type
                                    ? 'bg-purple-500/20 border-purple-500 text-purple-400'
                                    : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'
                                }`}
                              >
                                {type}
                              </button>
                            ))}
                          </div>
                        )}
                        <p className="text-[8px] text-white/20 uppercase tracking-widest">Engine sound on timer start</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 flex flex-col items-center pt-40 pb-32 px-4"
      >
        {/* Hero Section */}
        <motion.div variants={itemVariants} className="flex flex-col items-center justify-center mb-16 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-lg mb-6">
            <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50">Mission Control</span>
          </div>
          
          <h1 className="text-white text-6xl md:text-8xl font-black tracking-tighter mb-2 font-heading text-glow">
            {selectedExam.label.split(' ')[0]} <span className="text-purple-500">PULSE</span>
          </h1>
          
          <div className="flex flex-col items-center gap-6 mb-8">
            <div className="flex items-center gap-4">
              <div className="h-px w-8 bg-white/20" />
              <div className="text-white/40 text-xs md:text-sm font-bold tracking-[0.4em] uppercase font-heading">
                {selectedExam.label}
              </div>
              <div className="h-px w-8 bg-white/20" />
            </div>

            {selectedExam.id.startsWith('jee') && (
              <button 
                onClick={toggleSubExam}
                className="px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[10px] font-black uppercase tracking-widest hover:bg-purple-500/20 transition-all flex items-center gap-2"
              >
                <Zap className="w-3 h-3" />
                Switch to {selectedExam.subExam === 'mains' ? 'Advanced' : 'Mains'}
              </button>
            )}
          </div>

          <div className="scale-110 md:scale-125 mb-16">
            <AnimatePresence mode="wait">
              {showExamCounter ? (
                <motion.div
                  key="counter"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                >
                  <CountdownTimer targetDate={selectedExam.date} />
                </motion.div>
              ) : (
                <motion.div
                  key="placeholder"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="py-12"
                >
                  <div className="text-white/10 text-[10px] font-black uppercase tracking-[0.5em]">Counter Disabled</div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Quick Stats Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-5xl mb-8">
            {stats.map((stat: any, i) => (
              <motion.div
                key={stat.label}
                whileHover={{ y: -5, scale: 1.02 }}
                className={`p-4 rounded-2xl glass hover:bg-white/10 transition-all duration-300 text-left group relative overflow-hidden
                  ${stat.completed ? 'border-emerald-500/30' : 'border-white/10'}`}
              >
                {stat.label === "Study Time" && timerState.isRunning && (
                  <>
                    <div className="absolute inset-0 p-[1px] overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-blue-500/10 to-purple-500/10 opacity-50" />
                    </div>
                    <div className="absolute inset-[1px] bg-black/80 rounded-2xl z-0" />
                  </>
                )}
                {stat.completed && (
                  <div className="absolute top-0 right-0 p-1 bg-emerald-500/20 rounded-bl-xl">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  </div>
                )}
                <div className="flex items-center gap-2 mb-2">
                  <div className={`p-1.5 rounded-lg bg-white/5 ${stat.color} group-hover:scale-110 transition-transform`}>
                    {stat.icon}
                  </div>
                  <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">{stat.label}</span>
                </div>
                <div className="flex items-end justify-between relative z-10">
                  <div className="text-xl font-mono font-bold text-white tracking-tight">{stat.value}</div>
                  {stat.label === "Study Time" && (
                    <div className="relative">
                      {timerState.isRunning && (
                        <div className="absolute -top-6 left-1/2 -translate-x-1/2">
                          <Activity className="w-4 h-4 text-red-500 animate-pulse" />
                        </div>
                      )}
                      <div className="px-2 py-1 rounded-md text-[7px] font-black uppercase tracking-widest bg-white/5 text-white/40 border border-white/10">
                        {timerState.isRunning ? 'Running' : 'Use Timer Tab'}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Target Hours Controller - Removed as requested */}
        </motion.div>

        <motion.div variants={itemVariants} className="w-full flex flex-col items-center gap-8">
          <WeeklyTargets />
          <SubjectChecklist 
            category={selectedExam.id.split('_')[0]} 
            examId={selectedExam.id} 
          />
        </motion.div>
        </motion.div>

      <NotesTool 
        isOpen={isNotesOpen} 
        onClose={() => setIsNotesOpen(false)} 
        examType={selectedExam.id}
      />

      <DeepAnalyticsPreviewModal
        isOpen={isDeepAnalyticsPreviewOpen}
        onClose={() => setIsDeepAnalyticsPreviewOpen(false)}
        onPurchase={handlePurchaseDeepAnalytics}
      />

      <DeepAnalyticsModal 
        isOpen={isDeepAnalyticsOpen}
        onClose={() => setIsDeepAnalyticsOpen(false)}
        dailyStudySeconds={dailyStudySeconds}
        dailyQuestions={dailyQuestions}
        targetHours={targetHours}
        examId={selectedExam.id}
        targetDate={selectedExam.date}
        targetGoal={targetGoal}
        updateTargetGoal={updateTargetGoal}
      />
    </div>
  );
};

export { DemoOne };
