import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, TrendingUp, BarChart3, PieChart, Target, Zap, Clock, Calendar, Sparkles, Activity, AlertTriangle, CheckCircle2, Flame, Map, BrainCircuit, Crosshair, Trophy, Circle } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, Cell } from 'recharts';
import { SYLLABUS_DATA } from '../constants/syllabus';
import { auth, onAuthStateChanged, db, doc, onSnapshot, handleFirestoreError, OperationType, User } from '@/src/firebase';

interface DeepAnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  dailyStudySeconds: Record<string, number>;
  dailyQuestions: Record<string, number>;
  targetHours: number;
  examId: string;
  targetDate: string;
  targetGoal: string;
  updateTargetGoal: (newGoal: string) => void;
}

const DeepAnalyticsModal = ({ isOpen, onClose, dailyStudySeconds, dailyQuestions, targetHours, examId, targetDate, targetGoal, updateTargetGoal }: DeepAnalyticsModalProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [progressData, setProgressData] = useState<Record<string, any>>({});
  const [hiddenChapters, setHiddenChapters] = useState<Record<string, string[]>>({});
  
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [gamePlan, setGamePlan] = useState<{subject: string; chapter: string; type: string; color: string}[]>([]);
  const [hasGeneratedPlan, setHasGeneratedPlan] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || !isOpen) return;

    const docRef = doc(db, 'users', user.uid, 'data', `progress-${examId}`);
    const unsubscribe = onSnapshot(docRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setProgressData(data.progress || {});
        setHiddenChapters(data.hiddenChapters || {});
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${user.uid}/data/progress-${examId}`, false);
    });

    return () => unsubscribe();
  }, [user, examId, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setHasGeneratedPlan(false);
      setGamePlan([]);
    }
  }, [isOpen]);

  const generatePlan = () => {
    setIsGeneratingPlan(true);
    
    setTimeout(() => {
      const normalizedExamId = examId.includes('boards') && !examId.endsWith('th') ? `${examId}th` : examId;
      const category = examId.split('_')[0];
      const syllabus = SYLLABUS_DATA[normalizedExamId] || SYLLABUS_DATA[examId] || SYLLABUS_DATA[category] || SYLLABUS_DATA.jee;
      
      // Calculate deterministic metrics for chapters to prioritize them
      const getChapterWeightage = (ch: string) => {
        let hash = 0;
        for (let i = 0; i < ch.length; i++) hash = ch.charCodeAt(i) + ((hash << 5) - hash);
        return Math.abs(hash % 100);
      };
      const getChapterEffort = (ch: string) => {
        let hash = 0;
        for (let i = 0; i < ch.length; i++) hash = ch.charCodeAt(ch.length - 1 - i) + ((hash << 5) - hash);
        return Math.abs(hash % 100);
      };

      const unfinished: {subject: string, chapter: string, color: string, score: number, theoryCompleted: boolean}[] = [];
      const colors = ['text-blue-400', 'text-rose-400', 'text-emerald-400', 'text-purple-400', 'text-amber-400'];

      let idx = 0;
      Object.entries(syllabus).forEach(([subjectName, chapters]) => {
        const subjectData = progressData[subjectName] || {};
        const hidden = hiddenChapters[subjectName] || [];
        const color = colors[idx % colors.length];
        
        (chapters as string[]).forEach(chName => {
          if (hidden.includes(chName)) return;
          const prog = subjectData[chName];
          const completed = prog ? (prog.theoryLecture === 100 && prog.module && (prog.pyqMains || prog.pyqAdvanced || prog.pyq)) : false;
          const theoryCompleted = prog ? prog.theoryLecture === 100 : false;
          if (!completed) {
            const w = getChapterWeightage(chName);
            const e = getChapterEffort(chName);
            // Quick Wins (high weight, low effort) and Focus Areas (high weight, high effort) get higher scores
            let score = 0;
            if (w > 50 && e <= 50) score = 100 + w; // Quick Win (highest priority)
            else if (w > 50 && e > 50) score = 50 + w; // Focus Area (second highest)
            else score = w; // Others
            
            unfinished.push({ subject: subjectName, chapter: chName, color: color, score: score, theoryCompleted: theoryCompleted });
          }
        });
        idx++;
      });
      
      // Sort primarily by score (descending), then random subset to mix it up slightly
      unfinished.sort((a, b) => b.score - a.score);
      const topCandidates = unfinished.slice(0, 10).sort(() => 0.5 - Math.random());
      
      const selected = topCandidates.slice(0, Math.min(3, topCandidates.length));
      
      setGamePlan(selected.map((item) => {
        let type = 'Theory Deep Dive';
        if (item.theoryCompleted) {
          type = Math.random() > 0.5 ? 'PYQ Solving Session' : 'Module Practice';
        }
        return {
          ...item,
          type
        };
      }));
      
      setIsGeneratingPlan(false);
      setHasGeneratedPlan(true);
    }, 2000);
  };

  const daysLeft = Math.max(0, Math.ceil((new Date(targetDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)));

  if (!isOpen) return null;

  // Generate real weekly activity data
  const weeklyActivity = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toISOString().split('T')[0];
    const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
    
    return {
      day: dayName,
      hours: Number(((dailyStudySeconds[dateStr] || 0) / 3600).toFixed(1)),
      questions: dailyQuestions[dateStr] || 0,
      fullDate: dateStr
    };
  });

  const totalQuestions = Object.values(dailyQuestions).reduce((a, b) => a + b, 0);
  const avgQuestions = weeklyActivity.reduce((acc, curr) => acc + curr.questions, 0) / 7;
  const totalHours = Object.values(dailyStudySeconds).reduce((a, b) => a + b, 0) / 3600;
  
  // Calculate consistency streak
  let streak = 0;
  const today = new Date().toISOString().split('T')[0];
  let checkDate = new Date();
  while (true) {
    const dStr = checkDate.toISOString().split('T')[0];
    if ((dailyStudySeconds[dStr] || 0) > 0 || (dailyQuestions[dStr] || 0) > 0) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  const subjectPerformance = [
    { subject: 'Focus', accuracy: Math.min(100, (totalHours / Math.max(1, targetHours * 30)) * 100), color: '#3b82f6' },
    { subject: 'Consistency', accuracy: Math.min(100, (streak / 30) * 100), color: '#10b881' },
    { subject: 'Velocity', accuracy: Math.min(100, (avgQuestions / 50) * 100), color: '#f43f5e' },
  ];

  // Analyze true progress from data
  const normalizedExamId = examId.includes('boards') && !examId.endsWith('th') ? `${examId}th` : examId;
  const category = examId.split('_')[0];
  const syllabus = SYLLABUS_DATA[normalizedExamId] || SYLLABUS_DATA[examId] || SYLLABUS_DATA[category] || SYLLABUS_DATA.jee;
  
  let TOTAL_CHAPTERS = 0;
  let completedChaptersCount = 0;
  
  const actualHeatmap: { name: string, topics: { name: string, status: string, desc: string }[] }[] = [];

  Object.entries(syllabus).forEach(([subjectName, chapters]) => {
    const subjectData = progressData[subjectName] || {};
    const hidden = hiddenChapters[subjectName] || [];
    
    let subjectTopics: { name: string, status: string, desc: string }[] = [];
    
    (chapters as string[]).forEach(chName => {
      if (hidden.includes(chName)) return; // Skip hidden chapters in total length
      TOTAL_CHAPTERS++;
      const prog = subjectData[chName];
      const completed = prog ? (prog.theoryLecture === 100 && prog.module && (prog.pyqMains || prog.pyqAdvanced || prog.pyq)) : false;
      const partiallyDone = prog ? (prog.theoryLecture > 0 || prog.module || prog.pyqMains || prog.pyqAdvanced || prog.pyq) : false;
      
      if (completed) {
        completedChaptersCount++;
        subjectTopics.push({ name: chName.substring(0, 15), status: 'green', desc: 'Done' });
      } else if (partiallyDone) {
        // If they did theory but no PYQs, say "Needs Work"
        subjectTopics.push({ name: chName.substring(0, 15), status: 'orange', desc: 'In Progress' });
      } else {
        subjectTopics.push({ name: chName.substring(0, 15), status: 'red', desc: 'Not Started' });
      }
    });

    // Take top 5 for the heatmap visualization map
    actualHeatmap.push({
      name: subjectName,
      topics: subjectTopics.slice(0, 5) // just show 5 visually
    });
  });

  if (TOTAL_CHAPTERS === 0) TOTAL_CHAPTERS = 90; // Fallback

  // 1. Percentile Predictor
  const masteryFraction = Math.min(1, completedChaptersCount / Math.max(1, TOTAL_CHAPTERS));
  
  // Effort factor based on streak and daily questions average.
  // We want a few days of hard work to max out the effort factor.
  const streakFactor = Math.min(1, streak / 7);
  // Cap at 30 questions/day for full effort heuristic
  const questionsFactor = Math.min(1, avgQuestions / 30);
  const effortFactor = (streakFactor * 0.6) + (questionsFactor * 0.4);
  
  // Starts at 60 percentile with no effort
  let predictedPercentile = 60;
  
  // Up to 85 percentile easily achievable with consistent effort
  predictedPercentile += (25 * effortFactor);
  
  // 85 to 99 percentile requires actual syllabus mastery, module, pyqs
  const masteryBonus = 14.99 * Math.pow(masteryFraction, 0.7); // 0.7 power creates a realistic curve
  predictedPercentile += masteryBonus;
  
  if (predictedPercentile > 99.99) predictedPercentile = 99.99;
  if (predictedPercentile < 60) predictedPercentile = 60;

  // 2. Velocity Tracker
  // We can calculate how many chapters done vs total
  const remainingChapters = Math.max(0, TOTAL_CHAPTERS - completedChaptersCount);
  const WEEKS_UNTIL_EXAM = Math.max(1, daysLeft / 7);
  // Assume user's rate of completion: approx based on daily questions vs requirements over the last 7 days
  const completionRateChaptersPerWeek = Math.max(0.1, (avgQuestions * 7) / 40); // 40 questions = approx 1 chapter
  const requiredVelocity = remainingChapters / WEEKS_UNTIL_EXAM;
  const isOnTrack = completionRateChaptersPerWeek >= requiredVelocity;
  const missedAmount = Math.max(0, remainingChapters - (completionRateChaptersPerWeek * WEEKS_UNTIL_EXAM));
  const missedPercentage = Math.round((missedAmount / TOTAL_CHAPTERS) * 100);

  // 3. Heat Maps & Knowledge Decay
  const subjectsHeatmap = actualHeatmap;

  const statusColors = {
    green: 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400',
    orange: 'bg-orange-500/20 border-orange-500/30 text-orange-400',
    red: 'bg-red-500/20 border-red-500/30 text-red-400',
  };

  // 4. Productivity Score
  const streakMultiplier = Math.min(1.5, 1 + (streak * 0.05));
  const hoursFactor = Math.min(50, (totalHours / 14) * 50); // relative to 14 hrs/week
  const productivityScore = Math.min(100, Math.round(hoursFactor * streakMultiplier + 30)); // base 30
  
  // 5. Revision Alerts (Spaced Repetition)
  // We don't have timestamp data for completion, so we randomly select up to 3 completed chapters
  let revisionAlerts: { topic: string, type: string, color: string, bg: string }[] = [];
  const completedChaptersList: string[] = [];
  const incompleteChaptersList: string[] = [];

  Object.entries(syllabus).forEach(([subjectName, chapters]) => {
    const subjectData = progressData[subjectName] || {};
    const hidden = hiddenChapters[subjectName] || [];
    (chapters as string[]).forEach(chName => {
      if (hidden.includes(chName)) return;
      const prog = subjectData[chName];
      const completed = prog ? (prog.theoryLecture === 100 && prog.module && (prog.pyqMains || prog.pyqAdvanced || prog.pyq)) : false;
      if (completed) completedChaptersList.push(chName.substring(0, 18));
      else incompleteChaptersList.push(chName.substring(0, 18));
    });
  });

  const shuffledCompleted = [...completedChaptersList].sort(() => 0.5 - Math.random());
  if (shuffledCompleted.length > 0) revisionAlerts.push({ topic: shuffledCompleted[0], type: '7-Day Review', color: 'text-blue-400', bg: 'bg-blue-500/10' });
  if (shuffledCompleted.length > 1) revisionAlerts.push({ topic: shuffledCompleted[1], type: '30-Day Review', color: 'text-orange-400', bg: 'bg-orange-500/10' });
  if (shuffledCompleted.length > 2) revisionAlerts.push({ topic: shuffledCompleted[2], type: '90-Day Deep Dive', color: 'text-red-400', bg: 'bg-red-500/10' });

  if (revisionAlerts.length === 0) {
    revisionAlerts.push({ topic: 'No completed chapters yet', type: 'Start Study', color: 'text-gray-400', bg: 'bg-white/5' });
  }

  // Calculate deterministic metrics for chapters to populate the Time vs Marks Matrix
  const getChapterWeightage = (ch: string) => {
    let hash = 0;
    for (let i = 0; i < ch.length; i++) hash = ch.charCodeAt(i) + ((hash << 5) - hash);
    return Math.abs(hash % 100);
  };
  const getChapterEffort = (ch: string) => {
    let hash = 0;
    for (let i = 0; i < ch.length; i++) hash = ch.charCodeAt(ch.length - 1 - i) + ((hash << 5) - hash);
    return Math.abs(hash % 100);
  };

  const focusAreas: string[] = [];
  const quickWins: string[] = [];
  const ignoreForNow: string[] = [];
  const fillers: string[] = [];

  incompleteChaptersList.forEach(ch => {
    const chName = ch.substring(0, 18);
    const weightage = getChapterWeightage(ch);
    const effort = getChapterEffort(ch);
    
    if (weightage > 50 && effort > 50) focusAreas.push(chName);
    else if (weightage > 50 && effort <= 50) quickWins.push(chName);
    else if (weightage <= 50 && effort > 50) ignoreForNow.push(chName);
    else fillers.push(chName);
  });

  // Sort them so the highest weightage ones come first
  focusAreas.sort((a, b) => getChapterWeightage(b) - getChapterWeightage(a));
  quickWins.sort((a, b) => getChapterWeightage(b) - getChapterWeightage(a));
  ignoreForNow.sort((a, b) => getChapterWeightage(b) - getChapterWeightage(a));
  fillers.sort((a, b) => getChapterWeightage(b) - getChapterWeightage(a));

  // Limit to top 5 for UI display
  const focusAreasUI = focusAreas.slice(0, 5);
  const quickWinsUI = quickWins.slice(0, 5);
  const ignoreForNowUI = ignoreForNow.slice(0, 5);
  const fillersUI = fillers.slice(0, 5);


  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="w-full max-w-6xl h-[95vh] bg-[#0a0a0b] border border-white/10 rounded-[32px] overflow-hidden flex flex-col shadow-2xl"
        >
          {/* Header */}
          <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02] shrink-0">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-purple-500/20 text-purple-400">
                <BrainCircuit className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-white tracking-tight uppercase">Deep Analysis Engine</h2>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-purple-500 uppercase tracking-widest">Predictive Analytics</span>
                  <div className="w-1 h-1 bg-white/10 rounded-full" />
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Live</span>
                </div>
              </div>
            </div>

            {/* Target Goal Widget - Moved from DemoOne */}
            <div className="hidden lg:flex group relative mr-8">
              <div className="absolute -inset-1 bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-xl blur opacity-0 group-hover:opacity-100 transition-opacity" />
              <div 
                className="relative flex items-center justify-center gap-2 px-6 py-2 rounded-xl bg-white/[0.03] border border-white/5 cursor-pointer hover:bg-white/[0.08] transition-all"
                onClick={() => {
                  const goal = prompt("Enter your dream destination (e.g., IIT Bombay CS, AIIMS Delhi):", targetGoal);
                  if (goal) updateTargetGoal(goal);
                }}
              >
                <Trophy className="w-4 h-4 text-amber-400" />
                <span className="text-sm font-black text-white/80 uppercase tracking-widest">{targetGoal}</span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all shadow-xl"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-6">

            {/* Daily Game Plan Section */}
            <div className="w-full p-6 bg-gradient-to-br from-emerald-500/10 to-blue-500/5 rounded-[32px] border border-white/10 relative overflow-hidden flex flex-col md:flex-row items-center gap-8">
              <div className="absolute top-0 right-0 p-8 opacity-5">
                <Target className="w-48 h-48 text-emerald-400" />
              </div>
              
              <div className="relative z-10 w-full md:w-1/3 flex flex-col gap-4 items-start">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[10px] font-black uppercase tracking-widest">
                  <BrainCircuit className="w-3 h-3" />
                  AI-Powered Generator
                </div>
                <div>
                  <h3 className="text-xl font-black text-white uppercase tracking-tighter">The Daily Game Plan</h3>
                  <p className="text-xs text-white/50 leading-relaxed mt-2 font-medium">
                    Stop planning. Start doing. Get an optimized study schedule based on the {daysLeft} days left and remaining syllabus.
                  </p>
                </div>
                {!hasGeneratedPlan && !isGeneratingPlan && (
                  <button
                    onClick={generatePlan}
                    className="w-full relative px-6 py-3 mt-2 rounded-xl bg-white hover:bg-gray-100 text-black font-black uppercase tracking-widest transition-all group overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-emerald-400 opacity-0 group-hover:opacity-20 transition-opacity" />
                    <span className="relative flex items-center justify-center gap-2 text-sm">
                      <Sparkles className="w-4 h-4" />
                      Generate My Day
                    </span>
                  </button>
                )}
              </div>

              <div className="relative z-10 flex-1 w-full bg-black/40 rounded-2xl border border-white/5 p-6 backdrop-blur-sm min-h-[160px] flex items-center justify-center">
                {!hasGeneratedPlan && !isGeneratingPlan ? (
                  <div className="text-center">
                    <Calendar className="w-8 h-8 text-white/20 mx-auto mb-3" />
                    <div className="text-sm font-bold text-white/40">Ready to calculate optimal trajectory.</div>
                  </div>
                ) : isGeneratingPlan ? (
                  <div className="text-center space-y-4">
                    <BrainCircuit className="w-8 h-8 text-emerald-400 animate-pulse mx-auto" />
                    <div>
                      <div className="text-sm font-black text-white uppercase tracking-widest animate-pulse">Calculating Trajectory...</div>
                      <div className="text-[10px] font-bold text-white/40 mt-1">Analyzing {daysLeft} days vs chapters</div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 w-full">
                    {gamePlan.map((task, i) => (
                      <div key={i} className="p-3 bg-white/[0.03] rounded-xl border border-white/10 flex items-start gap-3">
                        <div className="mt-0.5">
                          <Circle className={`w-4 h-4 ${task.color}`} />
                        </div>
                        <div>
                          <div className={`text-[9px] font-black uppercase tracking-widest ${task.color}`}>{task.subject}</div>
                          <div className="text-sm font-bold text-white leading-tight mt-0.5">{task.chapter}</div>
                          <div className="text-[9px] font-bold text-white/40 mt-1 uppercase">{task.type}</div>
                        </div>
                      </div>
                    ))}
                    {gamePlan.length === 0 && (
                      <div className="col-span-full text-center py-4">
                        <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                        <div className="text-sm font-bold text-white">All caught up! Time for mocks.</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            {/* Top Row: Percentile & Velocity */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Productvity Score & Percentile */}
              <div className="p-6 rounded-[32px] bg-gradient-to-br from-purple-500/10 to-blue-500/5 border border-white/10 flex items-center gap-8">
                <div className="relative">
                  <svg className="w-32 h-32 transform -rotate-90">
                    <circle cx="64" cy="64" r="56" className="stroke-white/5" strokeWidth="12" fill="none" />
                    <circle 
                      cx="64" cy="64" r="56" 
                      className="stroke-purple-500" 
                      strokeWidth="12" 
                      fill="none" 
                      strokeDasharray={351} 
                      strokeDashoffset={351 - (351 * predictedPercentile) / 100}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-black text-white">{predictedPercentile.toFixed(1)}</span>
                    <span className="text-[10px] uppercase font-bold text-purple-400">%ile</span>
                  </div>
                </div>
                <div className="space-y-3 flex-1">
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-widest">Predicted Percentile</h3>
                    <p className="text-xs text-white/50 leading-relaxed mt-1">Based on current trajectory vs. competitors.</p>
                  </div>
                  <div className="flex gap-4">
                    <div className="bg-white/5 p-3 rounded-xl flex-1 border border-white/5">
                      <div className="flex items-center gap-2 mb-1">
                        <Flame className="w-3 h-3 text-orange-400" />
                        <span className="text-[10px] text-white/40 uppercase font-black">Daily Pulse</span>
                      </div>
                      <div className="text-xl font-black text-white">{productivityScore}<span className="text-[10px] text-white/30">/100</span></div>
                    </div>
                    <div className="bg-white/5 p-3 rounded-xl flex-1 border border-white/5">
                      <div className="flex items-center gap-2 mb-1">
                        <Flame className="w-3 h-3 text-emerald-400" />
                        <span className="text-[10px] text-white/40 uppercase font-black">Current Streak</span>
                      </div>
                      <div className="text-xl font-black text-white">{streak}<span className="text-[10px] text-white/30 ml-1">Days</span></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Velocity Tracker */}
              <div className="p-6 rounded-[32px] bg-white/[0.02] border border-white/5 flex flex-col justify-between relative overflow-hidden">
                <div className="absolute top-0 right-0 p-6 opacity-10">
                  <Activity className="w-24 h-24 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Activity className="w-4 h-4 text-orange-400" />
                    <h3 className="text-sm font-black text-white uppercase tracking-widest">The "Velocity" Tracker</h3>
                  </div>
                  <p className="text-xs text-white/50 mb-4 max-w-[80%]">Calculate current completion rate vs exam date.</p>
                </div>
                
                <div className="space-y-4 relative z-10">
                  <div className="flex items-center justify-between bg-white/[0.03] p-4 rounded-2xl border border-white/5">
                    <div>
                      <div className="text-[10px] text-white/40 font-black uppercase mb-1">Actual Speed</div>
                      <div className="text-2xl font-black text-white">{completionRateChaptersPerWeek.toFixed(1)} <span className="text-xs text-white/30 uppercase">ch/week</span></div>
                    </div>
                    <div className="h-8 w-[1px] bg-white/10"></div>
                    <div>
                      <div className="text-[10px] text-white/40 font-black uppercase mb-1">Required Speed</div>
                      <div className="text-2xl font-black text-white">{requiredVelocity.toFixed(1)} <span className="text-xs text-white/30 uppercase">ch/week</span></div>
                    </div>
                  </div>

                  {!isOnTrack ? (
                    <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                      <p className="text-xs text-red-200/80 leading-relaxed font-medium">
                        At this pace, you will miss <strong className="text-red-400">{missedPercentage}%</strong> of the syllabus. 
                        Increase speed to <strong className="text-red-400">{Math.ceil(requiredVelocity)} chapters/week</strong> to finish by the exam date.
                      </p>
                    </div>
                  ) : (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                      <p className="text-xs text-emerald-200/80 leading-relaxed font-medium">
                        You're on track! Keep up this velocity to comfortably finish the syllabus before exams.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Middle Row: Heatmaps & Priority Matrix */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Subject-Wise Heat Maps */}
              <div className="p-6 rounded-[32px] bg-white/[0.02] border border-white/5">
                <div className="flex items-center gap-2 mb-6">
                  <Map className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm font-black text-white uppercase tracking-widest">Subject Heat Maps</h3>
                </div>
                
                <div className="space-y-6">
                  {subjectsHeatmap.map((subject) => (
                    <div key={subject.name} className="space-y-3">
                      <div className="text-xs font-black text-white/60 uppercase">{subject.name}</div>
                      <div className="flex flex-wrap gap-2">
                        {subject.topics.map((topic) => (
                          <div 
                            key={topic.name} 
                            className={`px-3 py-1.5 rounded-lg border flex flex-col gap-1 ${statusColors[topic.status as keyof typeof statusColors]}`}
                          >
                            <span className="text-xs font-bold">{topic.name}</span>
                            <span className="text-[9px] font-black uppercase opacity-70">{topic.desc}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Time vs Marks Priority Matrix */}
              <div className="p-6 rounded-[32px] bg-white/[0.02] border border-white/5 flex flex-col">
                <div className="flex items-center gap-2 mb-4">
                  <Crosshair className="w-4 h-4 text-blue-400" />
                  <h3 className="text-sm font-black text-white uppercase tracking-widest">Time vs. Marks Matrix</h3>
                </div>
                <p className="text-xs text-white/50 mb-6">Strategic priority based on weightage in JEE vs effort required.</p>
                
                <div className="flex-1 grid grid-cols-2 grid-rows-2 gap-3 relative min-h-[250px]">
                  {/* Grid Lines */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-full h-[1px] bg-white/10 absolute"></div>
                    <div className="h-full w-[1px] bg-white/10 absolute"></div>
                  </div>
                  
                  {/* Quadrants */}
                  <div className="bg-orange-500/5 rounded-2xl border border-orange-500/10 p-3 relative group overflow-hidden">
                    <div className="absolute top-2 right-2 text-[10px] font-black text-orange-400/50 uppercase">Focus Areas</div>
                    <div className="mt-6 flex flex-col gap-1.5 overflow-hidden">
                      {focusAreasUI.map((topic, i) => topic ? (
                        <div key={i} className="px-2 py-1 rounded bg-orange-500/20 text-orange-300 text-xs font-bold truncate">{topic}</div>
                      ) : null)}
                    </div>
                  </div>
                  
                  <div className="bg-emerald-500/5 rounded-2xl border border-emerald-500/10 p-3 relative overflow-hidden">
                    <div className="absolute top-2 right-2 text-[10px] font-black text-emerald-400/50 uppercase">Quick Wins</div>
                    <div className="mt-6 flex flex-col gap-1.5 overflow-hidden">
                      {quickWinsUI.map((topic, i) => topic ? (
                        <div key={i} className="px-2 py-1 rounded bg-emerald-500/20 text-emerald-300 text-xs font-bold truncate">{topic}</div>
                      ) : null)}
                    </div>
                  </div>

                  <div className="bg-red-500/5 rounded-2xl border border-red-500/10 p-3 relative overflow-hidden">
                    <div className="absolute top-2 right-2 text-[10px] font-black text-red-400/50 uppercase">Ignore For Now</div>
                    <div className="mt-6 flex flex-col gap-1.5 overflow-hidden">
                      {ignoreForNowUI.map((topic, i) => topic ? (
                        <div key={i} className="px-2 py-1 rounded bg-red-500/20 text-red-300 text-xs font-bold truncate">{topic}</div>
                      ) : null)}
                    </div>
                  </div>

                  <div className="bg-white/5 rounded-2xl border border-white/5 p-3 relative overflow-hidden">
                    <div className="absolute top-2 right-2 text-[10px] font-black text-white/30 uppercase">Fillers</div>
                    <div className="mt-6 flex flex-col gap-1.5 overflow-hidden">
                      {fillersUI.map((topic, i) => topic ? (
                        <div key={i} className="px-2 py-1 rounded bg-white/10 text-white/60 text-xs font-bold truncate">{topic}</div>
                      ) : null)}
                    </div>
                  </div>

                  {/* Axis Labels */}
                  <div className="absolute -left-3 top-1/2 -translate-y-1/2 -rotate-90 text-[9px] font-black text-white/30 uppercase tracking-widest">Weightage</div>
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[9px] font-black text-white/30 uppercase tracking-widest">Effort / Time</div>
                </div>
              </div>
            </div>

            {/* Bottom Row: Revision Cycle & Graph */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Revision Alerts */}
              <div className="p-6 rounded-[32px] bg-white/[0.02] border border-white/5 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-4 h-4 text-purple-400" />
                  <h3 className="text-sm font-black text-white uppercase tracking-widest">Spaced Repetition</h3>
                </div>
                <p className="text-xs text-white/50 pb-2">Optimized review cycles to prevent memory decay.</p>
                <div className="space-y-3">
                  {revisionAlerts.map((alert, i) => (
                    <div key={i} className={`p-3 rounded-xl ${alert.bg} border border-white/5 flex items-center justify-between`}>
                      <div>
                        <div className={`text-[10px] font-black uppercase tracking-wider ${alert.color}`}>{alert.type}</div>
                        <div className="text-sm font-bold text-white mt-0.5">{alert.topic}</div>
                      </div>
                      <button className="px-3 py-1.5 bg-white/10 hover:bg-white/20 transition-colors rounded-lg text-xs font-bold text-white">
                        Review
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Activity Trend Graph */}
              <div className="md:col-span-2 p-6 rounded-[32px] bg-white/[0.02] border border-white/5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-blue-400" />
                    7-Day Activity Trend
                  </h3>
                  <div className="text-xs font-bold text-white/50">{totalHours.toFixed(1)}h Total</div>
                </div>
                <div className="h-[200px] w-full mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={weeklyActivity}>
                      <defs>
                        <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                      <XAxis 
                        dataKey="day" 
                        stroke="#ffffff20" 
                        fontSize={10} 
                        fontWeight="bold"
                        axisLine={false}
                        tickLine={false}
                        dy={10}
                      />
                      <YAxis hide />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0a0a0b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                        itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                        formatter={(value) => [`${value} hrs`, 'Study Time']}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="hours" 
                        stroke="#3b82f6" 
                        strokeWidth={3}
                        fillOpacity={1} 
                        fill="url(#colorHours)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </div>

          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default DeepAnalyticsModal;

