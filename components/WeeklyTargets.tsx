import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Save, Plus, Trash2, CheckCircle2, Circle, Target as TargetIcon, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, onAuthStateChanged, db, doc, onSnapshot, setDoc, User, handleFirestoreError, OperationType } from '@/src/firebase';

interface Target {
  id: string;
  text: string;
  completed: boolean;
}

interface WeeklyData {
  [dayIndex: number]: Target[];
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const WeeklyTargets = () => {
  const [user, setUser] = useState<User | null>(null);
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    const start = new Date(d.setDate(diff));
    start.setHours(0, 0, 0, 0);
    return start;
  });
  
  const [weeklyData, setWeeklyData] = useState<WeeklyData>({});
  const [loading, setLoading] = useState(true);
  const [activeDay, setActiveDay] = useState(new Date().getDay() === 0 ? 6 : new Date().getDay() - 1);
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const weekId = currentWeekStart.toISOString().split('T')[0];

  useEffect(() => {
    setLoading(true);
    if (!user) {
      const saved = localStorage.getItem(`weekly-targets-${weekId}`);
      if (saved) {
        setWeeklyData(JSON.parse(saved));
      } else {
        setWeeklyData({});
      }
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(doc(db, 'users', user.uid, 'weeklyTargets', weekId), (doc) => {
      if (doc.exists()) {
        setWeeklyData(doc.data().days || {});
      } else {
        setWeeklyData({});
      }
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${user.uid}/weeklyTargets/${weekId}`, false);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, weekId]);

  const saveWeeklyData = async (newData: WeeklyData) => {
    setWeeklyData(newData);
    if (user) {
      try {
        await setDoc(doc(db, 'users', user.uid, 'weeklyTargets', weekId), { days: newData });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/weeklyTargets/${weekId}`);
      }
    } else {
      localStorage.setItem(`weekly-targets-${weekId}`, JSON.stringify(newData));
    }
  };

  const addTarget = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const newTarget: Target = {
      id: Date.now().toString(),
      text: inputValue.trim(),
      completed: false,
    };

    const newData = { ...weeklyData };
    if (!newData[activeDay]) newData[activeDay] = [];
    newData[activeDay] = [...newData[activeDay], newTarget];
    
    saveWeeklyData(newData);
    setInputValue('');
  };

  const toggleTarget = (dayIdx: number, targetId: string) => {
    const newData = { ...weeklyData };
    newData[dayIdx] = newData[dayIdx].map(t => 
      t.id === targetId ? { ...t, completed: !t.completed } : t
    );
    saveWeeklyData(newData);
  };

  const deleteTarget = (dayIdx: number, targetId: string) => {
    const newData = { ...weeklyData };
    newData[dayIdx] = newData[dayIdx].filter(t => t.id !== targetId);
    saveWeeklyData(newData);
  };

  const changeWeek = (offset: number) => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() + (offset * 7));
    setCurrentWeekStart(newDate);
  };

  const getWeekRangeString = () => {
    const end = new Date(currentWeekStart);
    end.setDate(end.getDate() + 6);
    return `${currentWeekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  };

  const currentDayTargets = weeklyData[activeDay] || [];
  const completedCount = currentDayTargets.filter(t => t.completed).length;

  return (
    <div className="w-full max-w-4xl mx-auto px-4 mb-12">
      <div className="rounded-3xl border border-white/10 backdrop-blur-xl bg-white/5 p-6 shadow-2xl relative overflow-hidden">
        {/* Background Glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/5 blur-[80px] -mr-32 -mt-32" />
        
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-purple-500/20 text-purple-400">
                <CalendarIcon className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-black text-white tracking-tight font-heading uppercase">Weekly Mission Targets</h2>
                <p className="text-white/20 text-[10px] tracking-[0.2em] uppercase font-bold">Strategic Planning</p>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-black/40 p-1.5 rounded-2xl border border-white/5">
              <button 
                onClick={() => changeWeek(-1)}
                className="p-2 hover:bg-white/10 rounded-xl transition-all text-white/60 hover:text-white"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="px-4 py-1 text-center min-w-[180px]">
                <span className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-0.5">Current Week</span>
                <span className="text-xs font-bold text-white font-mono">{getWeekRangeString()}</span>
              </div>
              <button 
                onClick={() => changeWeek(1)}
                className="p-2 hover:bg-white/10 rounded-xl transition-all text-white/60 hover:text-white"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 mb-8">
            {DAYS.map((day, idx) => {
              const dayDate = new Date(currentWeekStart);
              dayDate.setDate(dayDate.getDate() + idx);
              const isToday = dayDate.toDateString() === new Date().toDateString();
              const hasTargets = (weeklyData[idx]?.length || 0) > 0;
              const allDone = hasTargets && weeklyData[idx].every(t => t.completed);

              return (
                <button
                  key={day}
                  onClick={() => setActiveDay(idx)}
                  className={`flex flex-col items-center p-3 rounded-2xl border transition-all duration-300 relative
                    ${activeDay === idx 
                      ? 'bg-purple-500 border-purple-400 text-white shadow-[0_0_20px_rgba(168,85,247,0.3)] scale-105 z-10' 
                      : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10 hover:border-white/10'}`}
                >
                  <span className="text-[8px] font-black uppercase tracking-tighter mb-1">{day.substring(0, 3)}</span>
                  <span className="text-lg font-black font-heading">{dayDate.getDate()}</span>
                  
                  {isToday && activeDay !== idx && (
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
                  )}
                  
                  {hasTargets && (
                    <div className={`mt-2 w-1.5 h-1.5 rounded-full ${allDone ? 'bg-emerald-400' : 'bg-white/20'}`} />
                  )}
                </button>
              );
            })}
          </div>

          <div className="grid md:grid-cols-[1fr_300px] gap-8">
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-black text-white/60 uppercase tracking-widest flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-purple-500 rounded-full" />
                  {DAYS[activeDay]} Targets
                </h3>
                <div className="text-[10px] font-bold text-white/20 uppercase tracking-widest">
                  {completedCount} / {currentDayTargets.length} Completed
                </div>
              </div>

              <form onSubmit={addTarget} className="relative group">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={`Add target for ${DAYS[activeDay]}...`}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-6 pr-16 text-sm text-white placeholder:text-white/10 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all group-hover:bg-white/10"
                />
                <button
                  type="submit"
                  className="absolute right-2 top-2 bottom-2 px-4 bg-purple-500 hover:bg-purple-600 text-white rounded-xl transition-all flex items-center justify-center shadow-lg active:scale-95"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </form>

              <div className="space-y-2 min-h-[300px]">
                <AnimatePresence mode="popLayout">
                  {currentDayTargets.length === 0 ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-white/5 rounded-3xl"
                    >
                      <TargetIcon className="w-12 h-12 text-white/5 mb-4" />
                      <p className="text-white/20 text-xs font-medium italic tracking-wide">No targets set for this day.</p>
                    </motion.div>
                  ) : (
                    currentDayTargets.map((target) => (
                      <motion.div
                        key={target.id}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className={`group flex items-center gap-4 p-4 rounded-2xl border transition-all duration-300
                          ${target.completed 
                            ? 'bg-white/2 border-transparent text-white/20' 
                            : 'bg-white/5 border-white/5 text-white/80 hover:border-purple-500/30 hover:bg-white/10 hover:shadow-xl'}`}
                      >
                        <button
                          onClick={() => toggleTarget(activeDay, target.id)}
                          className={`shrink-0 transition-all duration-300 transform hover:scale-110 ${target.completed ? 'text-emerald-500' : 'text-white/10 hover:text-white/30'}`}
                        >
                          {target.completed ? (
                            <CheckCircle2 className="w-6 h-6" />
                          ) : (
                            <Circle className="w-6 h-6" />
                          )}
                        </button>
                        
                        <span className={`flex-1 text-sm font-medium transition-all ${target.completed ? 'line-through' : ''}`}>
                          {target.text}
                        </span>

                        <button
                          onClick={() => deleteTarget(activeDay, target.id)}
                          className="opacity-0 group-hover:opacity-100 p-2 text-white/10 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </motion.div>
                    ))
                  )}
                </AnimatePresence>
              </div>
            </div>

            <div className="space-y-6">
              <div className="p-6 rounded-3xl bg-black/40 border border-white/5">
                <h4 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-4">Weekly Progress</h4>
                <div className="space-y-4">
                  {DAYS.map((day, idx) => {
                    const targets = weeklyData[idx] || [];
                    const completed = targets.filter(t => t.completed).length;
                    const progress = targets.length > 0 ? (completed / targets.length) * 100 : 0;
                    
                    return (
                      <div key={day} className="space-y-1.5">
                        <div className="flex justify-between text-[9px] font-bold uppercase tracking-widest">
                          <span className={activeDay === idx ? 'text-purple-400' : 'text-white/30'}>{day}</span>
                          <span className="text-white/20">{completed}/{targets.length}</span>
                        </div>
                        <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            className={`h-full rounded-full ${activeDay === idx ? 'bg-purple-500' : 'bg-white/10'}`}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="p-6 rounded-3xl bg-gradient-to-br from-purple-500/20 to-transparent border border-purple-500/20">
                <Zap className="w-8 h-8 text-purple-400 mb-4" />
                <h4 className="text-sm font-black text-white uppercase tracking-tight mb-2">Strategy Tip</h4>
                <p className="text-white/40 text-[10px] leading-relaxed">
                  Plan your week ahead on Sunday. Break down complex topics into small, achievable daily targets to maintain consistent momentum.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeeklyTargets;
