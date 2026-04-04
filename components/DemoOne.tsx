import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Target, Zap, Clock, Trophy, Plus, X, CheckCircle2 } from 'lucide-react';
import AnoAI from "@/components/ui/animated-shader-background";
import CountdownTimer from "@/components/ui/countdown-timer";
import SubjectChecklist from "@/components/SubjectChecklist";
import DailyTargets from "@/components/DailyTargets";

const DemoOne = () => {
  const [stats, setStats] = React.useState([
    { label: "Daily Goal", value: "--", icon: <Target className="w-3 h-3" />, color: "text-emerald-400" },
    { label: "Current Streak", value: "--", icon: <Zap className="w-3 h-3" />, color: "text-amber-400" },
    { label: "Study Time", value: "--", icon: <Clock className="w-3 h-3" />, color: "text-blue-400" },
    { label: "Global Rank", value: "--", icon: <Trophy className="w-3 h-3" />, color: "text-purple-400" },
  ]);

  const defaultExams = [
    { id: 'adv2026', label: 'JEE ADVANCE 2026', date: '2026-05-17T09:00:00' },
    { id: 'mains1_2027', label: 'JEE MAINS 1 2027', date: '2027-01-21T09:00:00' },
    { id: 'mains2_2027', label: 'JEE MAINS 2 2027', date: '2027-04-02T09:00:00' },
    { id: 'neet2026', label: 'NEET 2026', date: '2026-05-03T09:00:00' },
    { id: 'neet2027', label: 'NEET 2027', date: '2027-05-03T09:00:00' },
  ];

  const [customExams, setCustomExams] = React.useState<{id: string, label: string, date: string}[]>(() => {
    const saved = localStorage.getItem('jee-custom-exams');
    return saved ? JSON.parse(saved) : [];
  });

  const exams = [...defaultExams, ...customExams];

  const [selectedExam, setSelectedExam] = React.useState(() => {
    const saved = localStorage.getItem('jee-selected-exam');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Check if the saved exam still exists in current exams list
      if (exams.some(e => e.id === parsed.id)) return parsed;
    }
    return defaultExams[0];
  });

  const [showAddCustom, setShowAddCustom] = React.useState(false);
  const [customLabel, setCustomLabel] = React.useState('');
  const [customDate, setCustomDate] = React.useState('');

  const handleExamChange = (examId: string) => {
    const exam = exams.find(e => e.id === examId);
    if (exam) {
      setSelectedExam(exam);
      localStorage.setItem('jee-selected-exam', JSON.stringify(exam));
    }
  };

  const addCustomExam = () => {
    if (!customLabel || !customDate) return;
    const newExam = {
      id: `custom-${Date.now()}`,
      label: customLabel.toUpperCase(),
      date: `${customDate}T09:00:00`
    };
    const newCustomExams = [...customExams, newExam];
    setCustomExams(newCustomExams);
    localStorage.setItem('jee-custom-exams', JSON.stringify(newCustomExams));
    setSelectedExam(newExam);
    localStorage.setItem('jee-selected-exam', JSON.stringify(newExam));
    setCustomLabel('');
    setCustomDate('');
    setShowAddCustom(false);
  };

  const deleteCustomExam = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newCustomExams = customExams.filter(exam => exam.id !== id);
    setCustomExams(newCustomExams);
    localStorage.setItem('jee-custom-exams', JSON.stringify(newCustomExams));
    if (selectedExam.id === id) {
      setSelectedExam(defaultExams[0]);
      localStorage.setItem('jee-selected-exam', JSON.stringify(defaultExams[0]));
    }
  };

  const [targetHours, setTargetHours] = React.useState(() => {
    const saved = localStorage.getItem('jee-target-hours');
    return saved ? Number(saved) : 6;
  });

  const calculateStreak = (secondsMap: Record<string, number>, target: number) => {
    let currentStreak = 0;
    let checkDate = new Date();
    checkDate.setHours(0, 0, 0, 0);
    
    const targetSeconds = target * 3600;

    // Check if today's goal is met or at least yesterday's was
    const todayStr = checkDate.toDateString();
    const todaySeconds = secondsMap[todayStr] || 0;

    if (todaySeconds < targetSeconds) {
      // If today's goal not met, check if yesterday's was. If not, streak is 0.
      checkDate.setDate(checkDate.getDate() - 1);
      const yesterdayStr = checkDate.toDateString();
      const yesterdaySeconds = secondsMap[yesterdayStr] || 0;
      if (yesterdaySeconds < targetSeconds) return 0;
    }

    // Now count backwards
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

  React.useEffect(() => {
    const today = new Date().toDateString();
    
    const updateStats = () => {
      // Study Time
      const savedSeconds = localStorage.getItem('jee-daily-study-seconds');
      let studyTimeSeconds = 0;
      let secondsMap: Record<string, number> = {};
      if (savedSeconds) {
        secondsMap = JSON.parse(savedSeconds);
        studyTimeSeconds = secondsMap[today] || 0;
      }

      // Check if timer is running and add session time
      const isRunning = localStorage.getItem('jee-timer-running') === 'true';
      const startTime = localStorage.getItem('jee-timer-start-time');
      const accumulated = localStorage.getItem('jee-timer-accumulated');
      
      if (isRunning && startTime) {
        const sessionSeconds = Math.floor((Date.now() - Number(startTime)) / 1000);
        studyTimeSeconds = Number(accumulated) + sessionSeconds;
      }

      const studyTime = `${(studyTimeSeconds / 3600).toFixed(1)}h`;

      // Daily Goal (from Daily Targets)
      const savedTargets = localStorage.getItem('jee-daily-targets');
      let dailyGoal = "0%";
      if (savedTargets) {
        const targets = JSON.parse(savedTargets);
        if (targets.length > 0) {
          const completed = targets.filter((t: any) => t.completed).length;
          dailyGoal = `${Math.round((completed / targets.length) * 100)}%`;
        }
      }

      // Streak calculation based on hours
      const currentStreak = calculateStreak(secondsMap, targetHours);
      const streak = `${currentStreak} Days`;
      const isGoalMet = studyTimeSeconds >= targetHours * 3600;

      setStats([
        { label: "Daily Goal", value: dailyGoal, icon: <Target className="w-3 h-3" />, color: "text-emerald-400", completed: dailyGoal === "100%" },
        { label: "Current Streak", value: streak, icon: <Zap className="w-3 h-3" />, color: "text-amber-400", completed: isGoalMet },
        { label: "Study Time", value: studyTime, icon: <Clock className="w-3 h-3" />, color: "text-blue-400", completed: isGoalMet },
        { label: "Global Rank", value: "#--", icon: <Trophy className="w-3 h-3" />, color: "text-purple-400", completed: false },
      ]);
    };

    updateStats();
    const interval = setInterval(updateStats, 1000);
    return () => clearInterval(interval);
  }, [targetHours]);

  const updateTargetHours = (newTarget: number) => {
    setTargetHours(newTarget);
    localStorage.setItem('jee-target-hours', newTarget.toString());
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

            <div className="flex flex-wrap justify-center items-center gap-2 p-1 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xl max-w-2xl">
              {exams.map((exam) => (
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

          <div className="scale-110 md:scale-125 mb-12">
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
                <div className="text-xl font-mono font-bold text-white tracking-tight">{stat.value}</div>
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
          <SubjectChecklist />
        </motion.div>
      </motion.div>
    </div>
  );
};

export { DemoOne };
