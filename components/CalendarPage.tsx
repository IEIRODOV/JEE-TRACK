import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, TrendingUp, Zap, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import AnoAI from "@/components/ui/animated-shader-background";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

import { auth, db, doc, setDoc, onAuthStateChanged } from '@/src/firebase';

const CalendarPage = () => {
  const [user, setUser] = useState<any>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [mockTestDates, setMockTestDates] = useState<string[]>(() => {
    const saved = localStorage.getItem('jee-mock-tests');
    return saved ? JSON.parse(saved) : [];
  });

  const [mockTestDetails, setMockTestDetails] = useState<Record<string, { completed: boolean, marks: string }>>(() => {
    const saved = localStorage.getItem('jee-mock-test-details');
    return saved ? JSON.parse(saved) : {};
  });

  const [completedStudyDays, setCompletedStudyDays] = useState<string[]>(() => {
    const saved = localStorage.getItem('jee-completed-study-days');
    return saved ? JSON.parse(saved) : [];
  });

  const [completedQuestionDays, setCompletedQuestionDays] = useState<string[]>(() => {
    const saved = localStorage.getItem('jee-completed-question-days');
    return saved ? JSON.parse(saved) : [];
  });

  const [dailyQuestionCounts, setDailyQuestionCounts] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('jee-daily-question-counts');
    return saved ? JSON.parse(saved) : {};
  });

  const [dailyStudySeconds, setDailyStudySeconds] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('jee-daily-study-seconds');
    return saved ? JSON.parse(saved) : {};
  });

  const [targetHours, setTargetHours] = useState<number>(() => {
    const saved = localStorage.getItem('jee-target-hours');
    return saved ? Number(saved) : 6;
  });

  const [questionTarget, setQuestionTarget] = useState<number>(() => {
    const saved = localStorage.getItem('jee-question-target');
    return saved ? Number(saved) : 50;
  });

  const [currentQuestions, setCurrentQuestions] = useState<number>(() => {
    const today = new Date().toDateString();
    const saved = localStorage.getItem('jee-daily-question-counts');
    if (saved) {
      const counts = JSON.parse(saved);
      return counts[today] || 0;
    }
    return 0;
  });

  const [elapsedSeconds, setElapsedSeconds] = useState<number>(() => {
    const today = new Date().toDateString();
    const saved = localStorage.getItem('jee-daily-study-seconds');
    if (saved) {
      const seconds = JSON.parse(saved);
      return seconds[today] || 0;
    }
    return 0;
  });

  const [isTimerRunning, setIsTimerRunning] = useState(() => {
    return localStorage.getItem('jee-timer-running') === 'true';
  });
  const [startTime, setStartTime] = useState<number | null>(() => {
    const saved = localStorage.getItem('jee-timer-start-time');
    return saved ? Number(saved) : null;
  });
  const [accumulatedSeconds, setAccumulatedSeconds] = useState<number>(() => {
    const saved = localStorage.getItem('jee-timer-accumulated');
    return saved ? Number(saved) : 0;
  });
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // Sync totals to Firestore
  useEffect(() => {
    if (user) {
      const syncStats = async () => {
        const totalQuestions = Object.values(dailyQuestionCounts).reduce((a: number, b: number) => a + b, 0);
        const totalStudySeconds = Object.values(dailyStudySeconds).reduce((a: number, b: number) => a + b, 0);
        
        const userRef = doc(db, 'users', user.uid);
        await setDoc(userRef, {
          totalQuestions,
          totalStudySeconds,
          lastUpdated: new Date().toISOString()
        }, { merge: true });
      };
      syncStats();
    }
  }, [user, dailyQuestionCounts, dailyStudySeconds]);

  React.useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning && startTime) {
      interval = setInterval(() => {
        const now = Date.now();
        const sessionSeconds = Math.floor((now - startTime) / 1000);
        const totalElapsed = accumulatedSeconds + sessionSeconds;
        
        setElapsedSeconds(totalElapsed);
        
        const today = new Date().toDateString();
        const newSeconds = { ...dailyStudySeconds, [today]: totalElapsed };
        setDailyStudySeconds(newSeconds);
        localStorage.setItem('jee-daily-study-seconds', JSON.stringify(newSeconds));

        if (totalElapsed >= targetHours * 3600 && !completedStudyDays.includes(today)) {
          const newCompleted = [...completedStudyDays, today];
          setCompletedStudyDays(newCompleted);
          localStorage.setItem('jee-completed-study-days', JSON.stringify(newCompleted));
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, startTime, accumulatedSeconds, targetHours, completedStudyDays, dailyStudySeconds]);

  const toggleTimer = () => {
    const today = new Date().toDateString();
    if (!isTimerRunning) {
      // Starting timer
      const now = Date.now();
      setStartTime(now);
      setAccumulatedSeconds(elapsedSeconds);
      setIsTimerRunning(true);
      
      localStorage.setItem('jee-timer-start-time', now.toString());
      localStorage.setItem('jee-timer-accumulated', elapsedSeconds.toString());
      localStorage.setItem('jee-timer-running', 'true');
    } else {
      // Stopping timer
      setIsTimerRunning(false);
      setStartTime(null);
      setAccumulatedSeconds(0);
      
      localStorage.removeItem('jee-timer-start-time');
      localStorage.removeItem('jee-timer-accumulated');
      localStorage.setItem('jee-timer-running', 'false');
    }
  };

  const updateQuestions = (val: number) => {
    const today = new Date().toDateString();
    setCurrentQuestions(val);
    
    const newCounts = { ...dailyQuestionCounts, [today]: val };
    setDailyQuestionCounts(newCounts);
    localStorage.setItem('jee-daily-question-counts', JSON.stringify(newCounts));

    if (val >= questionTarget && !completedQuestionDays.includes(today)) {
      const newCompleted = [...completedQuestionDays, today];
      setCompletedQuestionDays(newCompleted);
      localStorage.setItem('jee-completed-question-days', JSON.stringify(newCompleted));
    } else if (val < questionTarget && completedQuestionDays.includes(today)) {
      const newCompleted = completedQuestionDays.filter(d => d !== today);
      setCompletedQuestionDays(newCompleted);
      localStorage.setItem('jee-completed-question-days', JSON.stringify(newCompleted));
    }
  };

  const saveMockTests = (dates: string[]) => {
    setMockTestDates(dates);
    localStorage.setItem('jee-mock-tests', JSON.stringify(dates));
  };

  const toggleMockTest = (dateStr: string) => {
    const newDates = mockTestDates.includes(dateStr)
      ? mockTestDates.filter(d => d !== dateStr)
      : [...mockTestDates, dateStr];
    saveMockTests(newDates);
    
    if (!newDates.includes(dateStr)) {
      const newDetails = { ...mockTestDetails };
      delete newDetails[dateStr];
      setMockTestDetails(newDetails);
      localStorage.setItem('jee-mock-test-details', JSON.stringify(newDetails));
    }
  };

  const updateMockTestDetail = (dateStr: string, completed: boolean, marks: string) => {
    const newDetails = { ...mockTestDetails, [dateStr]: { completed, marks } };
    setMockTestDetails(newDetails);
    localStorage.setItem('jee-mock-test-details', JSON.stringify(newDetails));
  };

  const deleteMockTest = (dateStr: string) => {
    const newDates = mockTestDates.filter(d => d !== dateStr);
    saveMockTests(newDates);
    const newDetails = { ...mockTestDetails };
    delete newDetails[dateStr];
    setMockTestDetails(newDetails);
    localStorage.setItem('jee-mock-test-details', JSON.stringify(newDetails));
  };

  const chartData = (Object.entries(mockTestDetails) as [string, { completed: boolean, marks: string }][])
    .filter(([_, details]) => details.completed && !isNaN(Number(details.marks)) && details.marks.trim() !== '')
    .map(([dateStr, details]) => ({
      date: new Date(dateStr).toLocaleDateString('default', { day: 'numeric', month: 'short' }),
      timestamp: new Date(dateStr).getTime(),
      marks: Number(details.marks)
    }))
    .sort((a, b) => a.timestamp - b.timestamp);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const prevPeriod = () => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    } else {
      const newDate = new Date(currentDate);
      newDate.setDate(newDate.getDate() - 7);
      setCurrentDate(newDate);
    }
  };

  const nextPeriod = () => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    } else {
      const newDate = new Date(currentDate);
      newDate.setDate(newDate.getDate() + 7);
      setCurrentDate(newDate);
    }
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthName = currentDate.toLocaleString('default', { month: 'long' });

  const totalDays = daysInMonth(year, month);
  const startDay = firstDayOfMonth(year, month);

  const monthStudySeconds = Array.from({ length: totalDays }, (_, i) => {
    const d = i + 1;
    const dateStr = new Date(year, month, d).toDateString();
    return dailyStudySeconds[dateStr] || 0;
  }).reduce((a, b) => a + b, 0);

  const monthQuestionCount = Array.from({ length: totalDays }, (_, i) => {
    const d = i + 1;
    const dateStr = new Date(year, month, d).toDateString();
    return dailyQuestionCounts[dateStr] || 0;
  }).reduce((a, b) => a + b, 0);

  const monthStudyHours = (monthStudySeconds / 3600).toFixed(1);

  const renderDay = (d: number, m: number, y: number, key: string) => {
    const date = new Date(y, m, d);
    const dateStr = date.toDateString();
    const isToday = new Date().toDateString() === dateStr;
    const isQuestionMet = completedQuestionDays.includes(dateStr);
    const isStudyMet = completedStudyDays.includes(dateStr);
    const isMockTest = mockTestDates.includes(dateStr);
    const studySeconds = dailyStudySeconds[dateStr] || 0;
    const studyHours = (studySeconds / 3600).toFixed(1);
    const questionCount = dailyQuestionCounts[dateStr] || 0;
    const hasActivity = studySeconds > 0 || questionCount > 0;

    return (
      <div 
        key={key} 
        onClick={() => toggleMockTest(dateStr)}
        className={`h-14 md:h-16 border border-white/10 p-1 transition-all duration-300 hover:scale-[1.05] hover:z-20 hover:border-white/40 group relative cursor-pointer
          ${isToday ? 'bg-white/10 border-purple-500/50 ring-1 ring-purple-500/20' : 'bg-white/2'}
          ${isQuestionMet && !isStudyMet ? 'bg-pink-500/10' : ''}
          ${isStudyMet && !isQuestionMet ? 'bg-emerald-500/10' : ''}
          ${isQuestionMet && isStudyMet ? 'bg-gradient-to-br from-pink-500/15 to-emerald-500/15' : ''}
          ${isMockTest ? 'border-blue-500/50 bg-blue-500/5' : ''}
          ${hasActivity ? 'shadow-[inset_0_0_10px_rgba(255,255,255,0.02)]' : ''}`}
      >
        <div className="flex justify-between items-start relative z-10">
          <span className={`text-xs font-bold ${isToday ? 'text-purple-400' : 'text-white/80'}`}>
            {d}
          </span>
          <div className="flex flex-col gap-0.5 items-end">
            {isToday && (
              <div className="w-1 h-1 bg-purple-500 rounded-full shadow-[0_0_8px_rgba(168,85,247,1)]" />
            )}
            {isQuestionMet && (
              <div className="w-1 h-1 bg-pink-500 rounded-full shadow-[0_0_8px_rgba(236,72,153,1)]" />
            )}
            {isStudyMet && (
              <div className="w-1 h-1 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,1)]" />
            )}
            {isMockTest && (
              <div className="flex flex-col items-end">
                <div className="w-1 h-1 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,1)]" />
                <span className="text-[7px] font-black text-blue-400 uppercase tracking-tighter mt-0.5">Test</span>
              </div>
            )}
          </div>
        </div>
        
        <div className="absolute bottom-1 right-1 flex flex-col items-end gap-0 z-10">
          {studySeconds > 0 && (
            <span className="text-[9px] font-black text-emerald-400/90 leading-none group-hover:text-emerald-400 transition-colors">
              {studyHours}h
            </span>
          )}
          {questionCount > 0 && (
            <span className="text-[9px] font-black text-rose-400/90 leading-none group-hover:text-rose-400 transition-colors">
              {questionCount}Q
            </span>
          )}
        </div>
        
        <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/0 to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          <span className="text-[8px] font-black text-white/20 uppercase tracking-tighter">Click to tag</span>
        </div>
        
        {hasActivity && (
          <div className="absolute bottom-0 left-0 right-0 h-[2px] flex">
            {studySeconds > 0 && (
              <div 
                className="h-full bg-emerald-500/50" 
                style={{ width: `${(studySeconds > 0 && questionCount > 0) ? '50%' : '100%'}` }} 
              />
            )}
            {questionCount > 0 && (
              <div 
                className="h-full bg-rose-500/50" 
                style={{ width: `${(studySeconds > 0 && questionCount > 0) ? '50%' : '100%'}` }} 
              />
            )}
          </div>
        )}
      </div>
    );
  };

  const days = [];

  if (viewMode === 'month') {
    // Fill empty slots for previous month
    for (let i = 0; i < startDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-16 md:h-20 border border-white/5 bg-white/2 opacity-20" />);
    }

    // Fill days of current month
    for (let d = 1; d <= totalDays; d++) {
      days.push(renderDay(d, month, year, `day-${d}`));
    }
  } else {
    // Week view logic
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
    
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      days.push(renderDay(d.getDate(), d.getMonth(), d.getFullYear(), `week-day-${i}`));
    }
  }

  return (
    <div className="w-full min-h-screen bg-black overflow-x-hidden relative">
      <AnoAI />
      
      <div className="relative z-10 flex flex-col items-center pt-16 pb-24 px-4">
        <div className="w-full max-w-4xl">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/20">
                <CalendarIcon className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-black text-white tracking-tighter font-heading uppercase">{monthName} {year}</h1>
                <p className="text-white/40 tracking-[0.3em] uppercase text-[9px] font-bold">Study Schedule</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 bg-white/5 p-1 rounded-xl border border-white/10 backdrop-blur-xl">
              <button 
                onClick={() => setViewMode('month')}
                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all
                  ${viewMode === 'month' ? 'bg-white text-black' : 'text-white/40 hover:text-white/60'}`}
              >
                Month
              </button>
              <button 
                onClick={() => setViewMode('week')}
                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all
                  ${viewMode === 'week' ? 'bg-white text-black' : 'text-white/40 hover:text-white/60'}`}
              >
                Week
              </button>
            </div>
          </div>

          {/* Trackers Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            {/* Stopwatch Card */}
            <motion.div 
              whileHover={{ y: -5 }}
              className="p-8 rounded-[40px] glass border border-white/10 flex flex-col items-center justify-center text-center group relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] mb-4">Focus Session</div>
              <div className="text-6xl font-mono font-black text-white tracking-tighter mb-8 tabular-nums">
                {formatTime(elapsedSeconds)}
              </div>
              <button 
                onClick={toggleTimer}
                className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all active:scale-95
                  ${isTimerRunning ? 'bg-rose-500 text-white shadow-[0_0_30px_rgba(244,63,94,0.3)]' : 'bg-white text-black hover:bg-white/90 shadow-[0_0_30px_rgba(255,255,255,0.1)]'}`}
              >
                {isTimerRunning ? 'Stop Session' : 'Start Session'}
              </button>
            </motion.div>

            {/* Question Tracker Card */}
            <motion.div 
              whileHover={{ y: -5 }}
              className="p-8 rounded-[40px] glass border border-white/10 flex flex-col items-center justify-center text-center group relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] mb-4">Questions Solved</div>
              <div className="text-6xl font-mono font-black text-white tracking-tighter mb-8 tabular-nums">
                {currentQuestions}
              </div>
              <div className="flex items-center gap-4 w-full">
                <button 
                  onClick={() => updateQuestions(Math.max(0, currentQuestions - 1))}
                  className="flex-1 py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-black hover:bg-white/10 transition-all active:scale-95"
                >
                  -
                </button>
                <button 
                  onClick={() => updateQuestions(currentQuestions + 1)}
                  className="flex-1 py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-black hover:bg-white/10 transition-all active:scale-95"
                >
                  +
                </button>
              </div>
            </motion.div>
          </div>

          {/* Calendar Grid */}
          <div className="glass rounded-3xl overflow-hidden shadow-2xl mb-8">
            <div className="p-4 border-b border-white/10 bg-white/5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button onClick={prevPeriod} className="p-1.5 rounded-lg hover:bg-white/10 text-white/60 transition-colors">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="text-xs font-black text-white uppercase tracking-widest">
                  {monthName} {year}
                </div>
                <button onClick={nextPeriod} className="p-1.5 rounded-lg hover:bg-white/10 text-white/60 transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <div className="p-4">
              <div className="grid grid-cols-7 mb-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="text-center text-[9px] font-black text-white/20 uppercase tracking-widest py-1">
                    {day}
                  </div>
                ))}
              </div>
              
              <div className="grid grid-cols-7 gap-1.5">
                {days}
              </div>
            </div>
          </div>

          {/* Stats & Analytics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className="md:col-span-1 space-y-4">
              <div className="p-5 rounded-2xl glass group hover:bg-white/10 transition-all">
                <div className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Study Hours</div>
                <div className="text-3xl font-mono font-bold text-emerald-400">{monthStudyHours}h</div>
                <div className="mt-2 text-[9px] text-white/20 uppercase font-bold tracking-wider">This Month</div>
              </div>
              <div className="p-5 rounded-2xl glass group hover:bg-white/10 transition-all">
                <div className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Questions</div>
                <div className="text-3xl font-mono font-bold text-blue-400">{monthQuestionCount}</div>
                <div className="mt-2 text-[9px] text-white/20 uppercase font-bold tracking-wider">This Month</div>
              </div>
            </div>

            <div className="md:col-span-2 p-6 rounded-3xl glass">
              <div className="flex items-center gap-2 mb-6">
                <TrendingUp className="w-4 h-4 text-purple-400" />
                <h3 className="text-xs font-black text-white uppercase tracking-widest">Performance Analytics</h3>
              </div>
              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorMarks" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                    <XAxis 
                      dataKey="date" 
                      stroke="#ffffff20" 
                      fontSize={10} 
                      tickLine={false} 
                      axisLine={false}
                    />
                    <YAxis 
                      stroke="#ffffff20" 
                      fontSize={10} 
                      tickLine={false} 
                      axisLine={false}
                      domain={[0, 300]}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#000', border: '1px solid #ffffff10', borderRadius: '12px' }}
                      itemStyle={{ color: '#a855f7', fontWeight: 'bold', fontSize: '12px' }}
                    />
                    <Area type="monotone" dataKey="marks" stroke="#a855f7" strokeWidth={3} fillOpacity={1} fill="url(#colorMarks)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Mock Test Section */}
          <div className="mt-12">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-px flex-1 bg-white/10" />
              <h2 className="text-xs font-black text-white/40 uppercase tracking-[0.4em]">Mock Test Schedule</h2>
              <div className="h-px flex-1 bg-white/10" />
            </div>

            <div className="mb-8 p-6 rounded-3xl bg-purple-500/5 border border-purple-500/20 backdrop-blur-xl flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-purple-500/20 text-purple-400">
                <CalendarIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-widest mb-1">Interactive Scheduling</h3>
                <p className="text-xs text-white/40 font-medium">Simply click on any date in the calendar above to mark it as a mock test day.</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {mockTestDates.length === 0 ? (
                <div className="col-span-full py-12 text-center border border-dashed border-white/10 rounded-3xl">
                  <p className="text-white/40 text-xs font-bold uppercase tracking-widest">No mock tests scheduled</p>
                </div>
              ) : (
                mockTestDates
                  .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
                  .map((dateStr, idx) => {
                    const d = new Date(dateStr);
                    const details = mockTestDetails[dateStr] || { completed: false, marks: '' };
                    return (
                      <motion.div 
                        key={idx}
                        whileHover={{ scale: 1.01 }}
                        className="p-5 rounded-3xl glass flex items-center justify-between group"
                      >
                        <div className="flex items-center gap-4">
                          <button 
                            onClick={() => updateMockTestDetail(dateStr, !details.completed, details.marks)}
                            className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all
                              ${details.completed ? 'bg-purple-500 border-purple-500 text-white' : 'border-white/10 hover:border-white/30'}`}
                          >
                            {details.completed && <Zap className="w-3 h-3 fill-white" />}
                          </button>
                          <div>
                            <div className="text-sm font-bold text-white group-hover:text-purple-400 transition-colors">
                              {d.toLocaleDateString('default', { day: 'numeric', month: 'short' })}
                            </div>
                            <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Mock Test</div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <input 
                            type="number"
                            placeholder="Marks"
                            value={details.marks || ''}
                            onChange={(e) => updateMockTestDetail(dateStr, details.completed, e.target.value)}
                            className="w-20 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono font-bold text-white focus:outline-none focus:border-purple-500 transition-colors"
                          />
                          <button 
                            onClick={() => deleteMockTest(dateStr)}
                            className="p-2 rounded-lg hover:bg-rose-500/10 text-white/10 hover:text-rose-500 transition-all opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </motion.div>
                    );
                  })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarPage;
