import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Target, Zap, Clock, Trophy, Plus, X, CheckCircle2, Loader2, Heart, BookOpen } from 'lucide-react';
import AnoAI from "@/components/ui/animated-shader-background";
import CountdownTimer from "@/components/ui/countdown-timer";
import SubjectChecklist from "@/components/SubjectChecklist";
import DailyTargets from "@/components/DailyTargets";
import { auth, onAuthStateChanged, db, doc, getDoc, setDoc, onSnapshot, collection, query, orderBy, limit, User, handleFirestoreError, OperationType, serverTimestamp, increment, addDoc } from '@/src/firebase';

const DemoOne = () => {
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

  const EXAM_CATEGORIES = [
    { id: 'jee', label: 'JEE', icon: <Target className="w-3 h-3" /> },
    { id: 'neet', label: 'NEET', icon: <Heart className="w-3 h-3" /> },
    { id: 'boards', label: 'Boards', icon: <BookOpen className="w-3 h-3" /> },
  ];

  const DEFAULT_EXAMS_BY_CATEGORY: Record<string, { id: string, label: string, date: string }[]> = {
    jee: [
      { id: 'mains1_2027', label: 'JEE MAINS 1 2027', date: '2027-01-21T09:00:00' },
      { id: 'mains2_2027', label: 'JEE MAINS 2 2027', date: '2027-04-02T09:00:00' },
      { id: 'adv2026', label: 'JEE ADVANCE 2026', date: '2026-05-17T09:00:00' },
    ],
    neet: [
      { id: 'neet2026', label: 'NEET 2026', date: '2026-05-03T09:00:00' },
      { id: 'neet2027', label: 'NEET 2027', date: '2027-05-03T09:00:00' },
    ],
    boards: [
      { id: 'boards_9', label: 'CLASS 9 BOARDS', date: '2027-03-01T09:00:00' },
      { id: 'boards_10', label: 'CLASS 10 BOARDS', date: '2027-02-15T09:00:00' },
      { id: 'boards_11', label: 'CLASS 11 BOARDS', date: '2027-03-01T09:00:00' },
      { id: 'boards_12', label: 'CLASS 12 BOARDS', date: '2027-02-15T09:00:00' },
    ]
  };

  const [selectedCategory, setSelectedCategory] = useState('jee');
  const [customExams, setCustomExams] = useState<{id: string, label: string, date: string}[]>([]);
  const [selectedExam, setSelectedExam] = useState(DEFAULT_EXAMS_BY_CATEGORY.jee[0]);
  const [targetHours, setTargetHours] = useState(6);
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [customLabel, setCustomLabel] = useState('');
  const [customDate, setCustomDate] = useState('');

  const currentCategoryExams = [...(DEFAULT_EXAMS_BY_CATEGORY[selectedCategory] || []), ...customExams.filter(e => e.id.includes(selectedCategory))];

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // Sync Settings from Firestore
  useEffect(() => {
    if (!user) {
      // Fallback to localStorage for guest
      const savedExams = localStorage.getItem('jee-custom-exams');
      if (savedExams) setCustomExams(JSON.parse(savedExams));
      const savedCategory = localStorage.getItem('jee-selected-category');
      if (savedCategory) setSelectedCategory(savedCategory);
      const savedSelected = localStorage.getItem('jee-selected-exam');
      if (savedSelected) setSelectedExam(JSON.parse(savedSelected));
      const savedTarget = localStorage.getItem('jee-target-hours');
      if (savedTarget) setTargetHours(Number(savedTarget));
      return;
    }

    const unsubscribe = onSnapshot(doc(db, 'users', user.uid, 'settings', 'dashboard'), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        if (data.customExams) setCustomExams(data.customExams);
        if (data.selectedCategory) setSelectedCategory(data.selectedCategory);
        if (data.selectedExam) setSelectedExam(data.selectedExam);
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

  const handleCategoryChange = async (categoryId: string) => {
    setSelectedCategory(categoryId);
    const firstExam = DEFAULT_EXAMS_BY_CATEGORY[categoryId][0];
    setSelectedExam(firstExam);
    
    if (user) {
      try {
        await setDoc(doc(db, 'users', user.uid, 'settings', 'dashboard'), { 
          selectedCategory: categoryId,
          selectedExam: firstExam 
        }, { merge: true });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/settings/dashboard`);
      }
    } else {
      localStorage.setItem('jee-selected-category', categoryId);
      localStorage.setItem('jee-selected-exam', JSON.stringify(firstExam));
    }
  };

  const handleExamChange = async (examId: string) => {
    const exam = currentCategoryExams.find(e => e.id === examId);
    if (exam) {
      setSelectedExam(exam);
      if (user) {
        try {
          await setDoc(doc(db, 'users', user.uid, 'settings', 'dashboard'), { selectedExam: exam }, { merge: true });
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/settings/dashboard`);
        }
      } else {
        localStorage.setItem('jee-selected-exam', JSON.stringify(exam));
      }
    }
  };

  const addCustomExam = async () => {
    if (!customLabel || !customDate) return;
    const newExam = {
      id: `custom-${selectedCategory}-${Date.now()}`,
      label: customLabel.toUpperCase(),
      date: `${customDate}T09:00:00`
    };
    const newCustomExams = [...customExams, newExam];
    setCustomExams(newCustomExams);
    setSelectedExam(newExam);
    
    if (user) {
      await setDoc(doc(db, 'users', user.uid, 'settings', 'dashboard'), { 
        customExams: newCustomExams,
        selectedExam: newExam
      }, { merge: true });
    } else {
      localStorage.setItem('jee-custom-exams', JSON.stringify(newCustomExams));
      localStorage.setItem('jee-selected-exam', JSON.stringify(newExam));
    }
    
    setCustomLabel('');
    setCustomDate('');
    setShowAddCustom(false);
  };

  const deleteCustomExam = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newCustomExams = customExams.filter(exam => exam.id !== id);
    setCustomExams(newCustomExams);
    
    let newSelected = selectedExam;
    if (selectedExam.id === id) {
      newSelected = DEFAULT_EXAMS_BY_CATEGORY[selectedCategory][0];
      setSelectedExam(newSelected);
    }

    if (user) {
      await setDoc(doc(db, 'users', user.uid, 'settings', 'dashboard'), { 
        customExams: newCustomExams,
        selectedExam: newSelected
      }, { merge: true });
    } else {
      localStorage.setItem('jee-custom-exams', JSON.stringify(newCustomExams));
      localStorage.setItem('jee-selected-exam', JSON.stringify(newSelected));
    }
  };

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
            {selectedExam.label.split(' ')[0]} <span className="text-purple-500">TRACK</span>
          </h1>
          
          <div className="flex flex-col items-center gap-6 mb-8">
            <div className="flex items-center gap-4">
              <div className="h-px w-8 bg-white/20" />
              <div className="text-white/40 text-xs md:text-sm font-bold tracking-[0.4em] uppercase font-heading">
                {selectedExam.label}
              </div>
              <div className="h-px w-8 bg-white/20" />
            </div>

            {/* Category Selector */}
            <div className="flex items-center gap-2 p-1 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xl">
              {EXAM_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => handleCategoryChange(cat.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all
                    ${selectedCategory === cat.id ? 'bg-white/10 text-white shadow-lg' : 'text-white/40 hover:text-white/60'}`}
                >
                  {cat.icon}
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Exam Selector */}
            <div className="flex flex-wrap justify-center items-center gap-2 p-1 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xl max-w-2xl">
              {currentCategoryExams.map((exam) => (
                <div key={exam.id} className="relative group/btn">
                  <button
                    onClick={() => handleExamChange(exam.id)}
                    className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all
                      ${selectedExam.id === exam.id ? 'bg-purple-500 text-white shadow-lg' : 'text-white/40 hover:text-white/60'}`}
                  >
                    {exam.label.length > 15 ? exam.label.substring(0, 12) + '...' : exam.label}
                  </button>
                  {exam.id.startsWith('custom-') && (
                    <button 
                      onClick={(e) => deleteCustomExam(exam.id, e)}
                      className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover/btn:opacity-100 transition-opacity"
                    >
                      <X className="w-2 h-2 text-white" />
                    </button>
                  )}
                </div>
              ))}
              <button 
                onClick={() => setShowAddCustom(!showAddCustom)}
                className="p-1.5 rounded-lg bg-white/5 text-white/40 hover:text-white/60 hover:bg-white/10 transition-all"
                title="Add Custom Timer"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>

            <AnimatePresence>
              {showAddCustom && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex flex-col md:flex-row items-center gap-2 p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl overflow-hidden"
                >
                  <input 
                    type="text" 
                    placeholder="Exam Name (e.g. BITSAT)"
                    value={customLabel}
                    onChange={(e) => setCustomLabel(e.target.value)}
                    className="bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-[10px] text-white focus:outline-none focus:border-purple-500 w-full md:w-40"
                  />
                  <input 
                    type="date" 
                    value={customDate}
                    onChange={(e) => setCustomDate(e.target.value)}
                    className="bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-[10px] text-white focus:outline-none focus:border-purple-500 w-full md:w-40 [color-scheme:dark]"
                  />
                  <button 
                    onClick={addCustomExam}
                    className="px-4 py-1.5 bg-purple-500 hover:bg-purple-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-all w-full md:w-auto"
                  >
                    Add
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
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
                <div className="flex items-end justify-between">
                  <div className="text-xl font-mono font-bold text-white tracking-tight">{stat.value}</div>
                  {stat.label === "Study Time" && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleTimer();
                      }}
                      className={`px-2 py-1 rounded-md text-[7px] font-black uppercase tracking-widest transition-all
                        ${timerState.isRunning ? 'bg-rose-500 text-white animate-pulse' : 'bg-white/10 text-white/60 hover:bg-white/20'}`}
                    >
                      {timerState.isRunning ? 'Stop' : 'Start'}
                    </button>
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
            <DailyTargets />
            <SubjectChecklist 
              category={selectedCategory} 
              examId={selectedExam.id} 
            />
          </motion.div>
      </motion.div>
    </div>
  );
};

export { DemoOne };
