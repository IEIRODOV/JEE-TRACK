import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Target, Zap, Clock, Trophy, CheckCircle2, Activity, User as UserIcon } from 'lucide-react';
import AnoAI from "@/components/ui/animated-shader-background";
import CountdownTimer from "@/components/ui/countdown-timer";
import SubjectChecklist from "@/components/SubjectChecklist";
import WeeklyTargets from "@/components/WeeklyTargets";
import { auth, onAuthStateChanged, db, doc, getDoc, setDoc, onSnapshot, collection, query, orderBy, limit, User, handleFirestoreError, OperationType, serverTimestamp, increment, addDoc } from '@/src/firebase';
import { playTickSound } from '@/src/lib/sounds';

interface DemoOneProps {
  onProfileClick: () => void;
}

const DemoOne = ({ onProfileClick }: DemoOneProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [globalRank, setGlobalRank] = useState<number | string>('--');
  const [timerState, setTimerState] = useState({ isRunning: false, startTime: null as number | null, accumulatedSeconds: 0 });
  const [dailyStudySeconds, setDailyStudySeconds] = useState<Record<string, number>>({});
  const [stats, setStats] = useState([
    { label: "Daily Goal", value: "--", icon: <Target className="w-3 h-3" />, color: "text-emerald-400" },
    { label: "Current Streak", value: "--", icon: <Zap className="w-3 h-3" />, color: "text-amber-400" },
    { label: "Study Time", value: "--", icon: <Clock className="w-3 h-3" />, color: "text-blue-400" },
    { label: "Global Rank", value: "--", icon: <Trophy className="w-3 h-3" />, color: "text-purple-400" },
  ]);

  const [selectedExam, setSelectedExam] = useState({ id: 'jee_2027', label: 'JEE 2027', date: '2027-01-21T09:00:00', subExam: 'mains' });
  const [targetHours, setTargetHours] = useState(6);

  // Exam Dates Mapping
  const EXAM_DATES: Record<string, any> = {
    jee: {
      mains: {
        '2025': '2025-01-24T09:00:00',
        '2026': '2026-01-20T09:00:00',
        '2027': '2027-01-21T09:00:00',
      },
      advanced: {
        '2025': '2025-05-25T09:00:00',
        '2026': '2026-05-17T09:00:00',
        '2027': '2027-05-23T09:00:00',
      }
    },
    neet: {
      '2025': '2025-05-04T09:00:00',
      '2026': '2026-05-03T09:00:00',
      '2027': '2027-05-02T09:00:00',
    },
    boards: {
      '2025': '2025-02-15T09:00:00',
      '2026': '2026-02-15T09:00:00',
      '2027': '2027-02-15T09:00:00',
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // Sync Settings from Firestore
  useEffect(() => {
    const fetchExamData = async () => {
      let exam = 'jee';
      let year = '2027';
      let subExam = 'mains';

      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          exam = (data.exam || 'jee').toLowerCase();
          year = data.year || '2027';
          subExam = data.subExam || 'mains';
        }
      } else {
        exam = (localStorage.getItem('pulse_user_exam') || 'jee').toLowerCase();
        year = localStorage.getItem('pulse_user_year') || '2027';
        subExam = localStorage.getItem('pulse_user_subexam') || 'mains';
      }

      let targetDate = '';
      if (exam === 'jee') {
        targetDate = EXAM_DATES.jee[subExam]?.[year] || `${year}-01-20T09:00:00`;
      } else {
        targetDate = EXAM_DATES[exam]?.[year] || `${year}-05-01T09:00:00`;
      }

      setSelectedExam({
        id: `${exam}_${year}`,
        label: `${exam.toUpperCase()} ${year}${exam === 'jee' ? ` (${subExam.toUpperCase()})` : ''}`,
        date: targetDate,
        subExam: subExam
      });
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

  // Daily Study Seconds Listener
  useEffect(() => {
    if (!user) return;
    const unsubscribe = onSnapshot(collection(db, 'users', user.uid, 'dailyStats'), (snapshot) => {
      const secondsMap: Record<string, number> = {};
      snapshot.docs.forEach(doc => {
        if (doc.data().studySeconds) {
          secondsMap[doc.id] = doc.data().studySeconds;
        }
      });
      setDailyStudySeconds(secondsMap);
    });
    return () => unsubscribe();
  }, [user]);

  const updateTargetHours = async (newTarget: number) => {
    setTargetHours(newTarget);
    if (user) {
      await setDoc(doc(db, 'users', user.uid, 'settings', 'dashboard'), { targetHours: newTarget }, { merge: true });
    } else {
      localStorage.setItem('jee-target-hours', newTarget.toString());
    }
  };

  const calculateStreak = (secondsMap: Record<string, number>, target: number) => {
    let currentStreak = 0;
    let checkDate = new Date();
    checkDate.setHours(0, 0, 0, 0);
    const targetSeconds = target * 3600;

    const todayStr = checkDate.toDateString();
    const todaySeconds = secondsMap[todayStr] || 0;

    if (todaySeconds < targetSeconds) {
      checkDate.setDate(checkDate.getDate() - 1);
      const yesterdayStr = checkDate.toDateString();
      const yesterdaySeconds = secondsMap[yesterdayStr] || 0;
      if (yesterdaySeconds < targetSeconds) return 0;
    }

    while (true) {
      const dateStr = checkDate.toDateString();
      const seconds = secondsMap[dateStr] || 0;
      if (seconds >= targetSeconds) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
    return currentStreak;
  };

  useEffect(() => {
    const today = new Date().toDateString();
    const updateStats = () => {
      let studyTimeSeconds = dailyStudySeconds[today] || 0;

      if (timerState.isRunning && timerState.startTime) {
        const sessionSeconds = Math.floor((Date.now() - timerState.startTime) / 1000);
        studyTimeSeconds = timerState.accumulatedSeconds + sessionSeconds;
      }

      const studyTime = `${(studyTimeSeconds / 3600).toFixed(1)}h`;

      const savedTargets = localStorage.getItem('jee-daily-targets');
      // Note: This dailyGoal calculation might need adjustment for WeeklyTargets if needed, 
      // but for now we keep it as is or use a placeholder if the old data is gone.
      let dailyGoal = "0%";
      if (savedTargets) {
        const targets = JSON.parse(savedTargets);
        if (targets.length > 0) {
          const completed = targets.filter((t: any) => t.completed).length;
          dailyGoal = `${Math.round((completed / targets.length) * 100)}%`;
        }
      }

      const currentSecondsMap = { ...dailyStudySeconds, [today]: studyTimeSeconds };
      const currentStreak = calculateStreak(currentSecondsMap, targetHours);
      const streak = `${currentStreak} Days`;
      const isGoalMet = studyTimeSeconds >= targetHours * 3600;

      setStats([
        { label: "Daily Goal", value: dailyGoal, icon: <Target className="w-3 h-3" />, color: "text-emerald-400", completed: dailyGoal === "100%" },
        { label: "Current Streak", value: streak, icon: <Zap className="w-3 h-3" />, color: "text-amber-400", completed: isGoalMet },
        { label: "Study Time", value: studyTime, icon: <Clock className="w-3 h-3" />, color: "text-blue-400", completed: isGoalMet },
        { label: "Global Rank", value: globalRank.toString(), icon: <Trophy className="w-3 h-3" />, color: "text-purple-400", completed: false },
      ]);
    };

    updateStats();
    const interval = setInterval(updateStats, 2000); // Throttled to 2s
    return () => clearInterval(interval);
  }, [targetHours, globalRank, timerState, dailyStudySeconds]);

  const toggleTimer = async () => {
    playTickSound();
    if (!user) return;
    const today = new Date().toDateString();
    const todaySeconds = dailyStudySeconds[today] || 0;

    const syncGlobalProgress = async (questions: number, hours: number) => {
      try {
        const leaderboardRef = doc(db, 'leaderboard', user.uid);
        const leaderboardSnap = await getDoc(leaderboardRef);
        const isNewUser = !leaderboardSnap.exists();

        // Update Leaderboard
        await setDoc(leaderboardRef, {
          displayName: user.displayName || user.email?.split('@')[0] || 'Anonymous',
          photoURL: user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName || user.email}&background=random`,
          totalQuestions: increment(questions),
          totalHours: increment(hours),
          streak: increment(1),
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
        accumulatedSeconds: todaySeconds,
        lastUpdated: serverTimestamp()
      }, { merge: true });
    } else {
      const sessionSeconds = Math.floor((Date.now() - (timerState.startTime || Date.now())) / 1000);
      const totalElapsed = timerState.accumulatedSeconds + sessionSeconds;
      
      const timerRef = doc(db, 'users', user.uid, 'data', 'timer');
      await setDoc(timerRef, {
        isRunning: false,
        startTime: null,
        accumulatedSeconds: 0,
        lastUpdated: serverTimestamp()
      }, { merge: true });

      const sessionHours = sessionSeconds / 3600;
      await syncGlobalProgress(0, sessionHours);

      const statsRef = doc(db, 'users', user.uid, 'dailyStats', today);
      await setDoc(statsRef, {
        studySeconds: totalElapsed,
        date: today,
        lastUpdated: serverTimestamp()
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
      <AnoAI />
      
      {/* Top Bar with Profile */}
      <div className="absolute top-0 left-0 right-0 z-50 flex justify-end p-6">
        <div className="relative">
          <button 
            onClick={() => { playTickSound(); onProfileClick(); }}
            className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all overflow-hidden"
          >
            {user?.photoURL ? (
              <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <UserIcon className="w-5 h-5 text-white/40" />
            )}
          </button>
        </div>
      </div>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 flex flex-col items-center pt-20 pb-32 px-4"
      >
        {/* Hero Section */}
        <motion.div variants={itemVariants} className="flex flex-col items-center justify-center mb-16 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-xl mb-6">
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
            <CountdownTimer targetDate={selectedExam.date} />
          </div>

          {/* Quick Stats Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-3xl mb-8">
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
                      <motion.div
                        animate={{ 
                          rotate: [0, 360]
                        }}
                        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200%] h-[200%] bg-[conic-gradient(from_0deg,#ff0000,#ff7300,#fffb00,#48ff00,#00ffd5,#002bff,#7a00ff,#ff00c8,#ff0000)] opacity-20"
                      />
                    </div>
                    {/* Fast Moving White Light Border */}
                    <div className="absolute inset-0 p-[1px] overflow-hidden">
                      <motion.div
                        animate={{ 
                          rotate: [0, 360]
                        }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] bg-[conic-gradient(from_0deg,transparent_0deg,transparent_160deg,#ffffff_180deg,transparent_200deg,transparent_360deg)] opacity-60"
                      />
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
                        <>
                          <motion.div 
                            animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
                            transition={{ repeat: Infinity, duration: 1.5 }}
                            className="absolute inset-0 bg-red-500/30 rounded-full blur-md"
                          />
                          <motion.div 
                            animate={{ scale: [1, 2], opacity: [0.3, 0] }}
                            transition={{ repeat: Infinity, duration: 1.5, delay: 0.5 }}
                            className="absolute inset-0 bg-red-500/20 rounded-full blur-lg"
                          />
                          <motion.div
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ repeat: Infinity, duration: 0.6 }}
                            className="absolute -top-6 left-1/2 -translate-x-1/2"
                          >
                            <Activity className="w-4 h-4 text-red-500" />
                          </motion.div>
                        </>
                      )}
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleTimer();
                        }}
                        className={`relative z-10 px-2 py-1 rounded-md text-[7px] font-black uppercase tracking-widest transition-all
                          ${timerState.isRunning ? 'bg-red-600 text-white shadow-[0_0_15px_rgba(220,38,38,0.5)]' : 'bg-white/10 text-white/60 hover:bg-white/20'}`}
                      >
                        {timerState.isRunning ? 'Active' : 'Start'}
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Target Hours Controller */}
          <motion.div 
            variants={itemVariants}
            className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl mb-12"
          >
            <div className="flex flex-col items-start">
              <span className="text-[8px] font-black text-white/40 uppercase tracking-widest mb-1">Streak Goal</span>
              <span className="text-xs font-bold text-white">{targetHours} Hours / Day</span>
            </div>
            <div className="h-8 w-px bg-white/10" />
            <div className="flex items-center gap-2">
              <button 
                onClick={() => updateTargetHours(Math.max(1, targetHours - 1))}
                className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-white/10 transition-all"
              >
                -
              </button>
              <button 
                onClick={() => updateTargetHours(Math.min(24, targetHours + 1))}
                className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-white/10 transition-all"
              >
                +
              </button>
            </div>
          </motion.div>
        </motion.div>

          <motion.div variants={itemVariants} className="w-full flex flex-col items-center gap-8">
            <WeeklyTargets />
            <SubjectChecklist 
              category={selectedExam.id.split('_')[0]} 
              examId={selectedExam.id} 
            />
          </motion.div>
      </motion.div>
    </div>
  );
};

export { DemoOne };
