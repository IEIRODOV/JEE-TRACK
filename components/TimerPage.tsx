import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, TrendingUp, Zap, Trash2, Cloud, CloudOff, Loader2, Activity, Clock, Target, Shield, Rocket, ZapIcon, History, Check, AlertTriangle } from 'lucide-react';
import { 
  playTickSound, 
  playF1Sound, 
  playTankSound, 
  playJetSound, 
  playAuthSound, 
  playCheckSound,
  playMechanicalSound 
} from '@/src/lib/sounds';
import { motion, AnimatePresence } from 'motion/react';
import AnoAI from "@/components/ui/animated-shader-background";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar, Cell, ReferenceLine, PieChart, Pie } from 'recharts';

import { auth, db, onAuthStateChanged, handleFirestoreError, OperationType } from '@/src/firebase';
import PulseLoader from "@/components/ui/pulse-loader";
import { SYLLABUS_DATA } from '@/src/constants/syllabus';
import { 
  doc, 
  setDoc, 
  getDoc, 
  getDocs,
  collection, 
  onSnapshot, 
  query, 
  where, 
  serverTimestamp,
  deleteDoc,
  writeBatch,
  increment,
  addDoc,
  updateDoc
} from 'firebase/firestore';

// --- Futuristic Navigation Components ---

const SpringLeverNav = ({ activeTab, setActiveTab, setShowDeleteConfirm }: { activeTab: any, setActiveTab: (t: any) => void, setShowDeleteConfirm: (v: boolean) => void }) => {
  const tabs = [
    { id: 'timer', label: 'TIMER', icon: Clock, color: 'text-violet-400' },
    { id: 'test', label: 'TESTS', icon: Target, color: 'text-pink-400' },
    { id: 'revision', label: 'REVISION', icon: Zap, color: 'text-amber-400' },
    { id: 'calendar', label: 'HISTORY', icon: CalendarIcon, color: 'text-emerald-400' }
  ];

  const currentIndex = tabs.findIndex(t => t.id === activeTab);

  const handlePullEnd = (event: any, info: any) => {
    if (info.offset.y > 80) {
      playMechanicalSound();
      const nextIndex = (currentIndex + 1) % tabs.length;
      setActiveTab(tabs[nextIndex].id);
    }
  };

  return (
    <div className="flex flex-col items-center gap-8 mb-16 pt-8">
      <div className="flex items-center gap-2 p-1.5 rounded-[18px] bg-[#080808] border border-white/15 shadow-2xl backdrop-blur-3xl">
        {tabs.map((tab, idx) => (
          <button
            key={tab.id}
            onClick={() => { playTickSound(); setActiveTab(tab.id); }}
            className={`relative px-8 py-4 rounded-[12px] transition-all duration-300 flex items-center gap-3 overflow-hidden
              ${activeTab === tab.id ? 'bg-white/[0.03]' : 'hover:bg-white/[0.02] opacity-30 hover:opacity-100'}`}
          >
            {activeTab === tab.id && (
              <motion.div 
                layoutId="nav-active"
                className="absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-transparent via-white/40 to-transparent"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            <tab.icon className={`w-4 h-4 relative z-10 ${activeTab === tab.id ? tab.color : 'text-white'}`} />
            <span className={`text-xs font-bold uppercase tracking-[0.1em] relative z-10
              ${activeTab === tab.id ? 'text-white' : 'text-white/40'}`}>
              {tab.label}
            </span>
          </button>
        ))}

        <div className="h-8 w-px bg-white/5 mx-3" />
        
        <div className="relative group px-4">
          <motion.div
            drag="y"
            dragConstraints={{ top: 0, bottom: 60 }}
            dragElastic={0.05}
            dragSnapToOrigin={true}
            onDragEnd={handlePullEnd}
            className="cursor-ns-resize"
          >
            <div className="w-10 h-12 bg-gradient-to-b from-zinc-800 to-black rounded-lg border border-white/10 flex flex-col items-center justify-center gap-1 shadow-xl">
               {[...Array(3)].map((_, i) => (
                 <div key={i} className="w-5 h-[1px] bg-white/20" />
               ))}
               <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-6 h-[1px] bg-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

// --- Revision Module ---
const RevisionPage = ({ subjectStudySeconds, subjectQuestionCounts, getSubjectColor, revisionSlots, setRevisionSlots, availableSubjects, setSubjectRevisionCounts }: any) => {
  const [isAdding, setIsAdding] = useState(false);
  const [selectedSub, setSelectedSub] = useState('');
  const [selectedChap, setSelectedChap] = useState('');
  const configRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isAdding && configRef.current) {
      configRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [isAdding]);

  const revisionStages = [
    { label: 'Day 1: Recall', icon: History, color: 'text-blue-400', glow: 'shadow-[0_0_15px_rgba(59,130,246,0.3)]', desc: 'Focus on core concepts and formula derivation.' },
    { label: 'Day 4: Deep Dive', icon: Rocket, color: 'text-violet-400', glow: 'shadow-[0_0_15px_rgba(139,92,246,0.3)]', desc: 'Solve high-difficulty previous year questions.' },
    { label: 'Day 12: Mastery', icon: Target, color: 'text-emerald-400', glow: 'shadow-[0_0_15px_rgba(16,185,129,0.3)]', desc: 'Full chapter test under timed conditions.' }
  ];

  const addSlot = () => {
    if (!selectedSub || !selectedChap) {
      alert("Please select both subject and chapter.");
      return;
    }
    
    // Check if duplicate chapter exists in revision
    const isDuplicate = revisionSlots.some((s: any) => s.subject === selectedSub && s.chapter === selectedChap && !s.completed);
    if (isDuplicate) {
      alert("Protocol already active for this chapter.");
      return;
    }

    if (revisionSlots.filter((s: any) => !s.completed).length >= 8) {
      alert("Maximum 8 active revision slots allowed. Complete or remove a slot to add more.");
      return;
    }
    const newSlot = {
      id: Date.now(),
      subject: selectedSub,
      chapter: selectedChap,
      startDate: new Date().toISOString(),
      currentStage: 0, // 0 = Not started, 1 = Day 1 done, 2 = Day 4 done, 3 = Day 12 done
      completed: false
    };
    setRevisionSlots([...revisionSlots, newSlot]);
    setIsAdding(false);
    setSelectedSub('');
    setSelectedChap('');
  };

  const removeSlot = (id: number) => {
    setRevisionSlots(revisionSlots.filter((s: any) => s.id !== id));
  };

  const markStageComplete = async (slot: any) => {
    const daysSinceStart = Math.floor((Date.now() - new Date(slot.startDate).getTime()) / (1000 * 60 * 60 * 24));
    const isStageLocked = (slot.currentStage === 1 && daysSinceStart < 4) || (slot.currentStage === 2 && daysSinceStart < 12);
    
    if (isStageLocked) {
      alert(`This revision stage is locked. Please return on Day ${[1, 4, 12][slot.currentStage]}.`);
      return;
    }

    const nextStage = slot.currentStage + 1;
    
    // Gating Logic
    if (nextStage === 2 && daysSinceStart < 4) {
      alert(`Protocol Locked: Day 4 revision available in ${4 - daysSinceStart} days.`);
      return;
    }
    if (nextStage === 3 && daysSinceStart < 12) {
      alert(`Protocol Locked: Day 12 revision available in ${12 - daysSinceStart} days.`);
      return;
    }

    playCheckSound(); // Play sound on completion
    const isFinished = nextStage === 3;
    
    setRevisionSlots(revisionSlots.map((s: any) => 
      s.id === slot.id ? { ...s, currentStage: nextStage, completed: isFinished } : s
    ));

    // Increment global subject revision count
    setSubjectRevisionCounts((prev: any) => ({
      ...prev,
      [slot.subject]: (prev[slot.subject] || 0) + 1
    }));

    // Protocol Stage Sync to Progress Section
    const user = auth.currentUser;
    if (user) {
      const exam = (localStorage.getItem('pulse_user_exam') || 'jee').toLowerCase();
      const year = localStorage.getItem('pulse_user_year') || '2027';
      const examId = `${exam}_${year}`;
      
      try {
        const docRef = doc(db, 'users', user.uid, 'data', `progress-${examId}`);
        await updateDoc(docRef, {
          [`progress.${slot.subject}.${slot.chapter}.revisionCount`]: nextStage
        }).catch(async (err) => {
          if (err.code === 'not-found' || err.message.includes('not found')) {
            // Document doesn't exist, we don't necessarily want to create the whole syllabus structure here 
            // since it's managed by ProgressPage, but we can try to merge if it's there.
          }
        });
      } catch (err) {
        console.error("Mastery Sync Error:", err);
      }
    }
  };

  const exam = (localStorage.getItem('pulse_user_exam') || 'jee').toLowerCase();
  const year = localStorage.getItem('pulse_user_year') || '2027';
  const examBase = exam === 'jee' ? 'jee' : exam;
  const examId = `${examBase}_${year}`;
  const normalizedExamId = examId.includes('boards') && !examId.endsWith('th') ? `${examId}th` : examId;
  const syllabus = SYLLABUS_DATA[normalizedExamId] || SYLLABUS_DATA[examId] || SYLLABUS_DATA[examBase] || SYLLABUS_DATA.jee;
  
  const chapters = selectedSub ? (syllabus[selectedSub] || []) : [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-12"
    >
      {/* 1-4-12 Technique Overview */}
      <div className="p-10 rounded-[56px] bg-gradient-to-br from-zinc-900 via-black to-zinc-900 border border-white/20 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 p-8 opacity-[0.03]">
          <Shield className="w-64 h-64" />
        </div>
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shadow-[0_0_30px_rgba(245,158,11,0.1)]">
                <Zap className="w-7 h-7 text-amber-500 animate-pulse" />
              </div>
              <div>
                <h2 className="text-3xl font-black text-white uppercase tracking-tighter leading-none">1-4-12 Method</h2>
                <p className="text-xs font-bold text-amber-500/60 uppercase tracking-widest mt-1">Smart Revision Schedule</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex border border-white/10 rounded-2xl p-1 bg-black/40 backdrop-blur-xl">
                <div className="px-4 py-2 text-[11px] font-bold text-white/40 uppercase tracking-wide border-r border-white/10">Science-backed learning</div>
                <div className="px-4 py-2 text-[11px] font-bold text-amber-500 uppercase tracking-wide animate-pulse">Running</div>
              </div>
              <button 
                onClick={() => setIsAdding(true)}
                className="px-6 py-3 rounded-2xl bg-white text-black text-[10px] font-black uppercase tracking-widest hover:bg-white/90 transition-all active:scale-95"
              >
                Add Revision Slot
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {revisionStages.map((stage, i) => (
              <motion.div 
                key={i} 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.1 }}
                className="flex flex-col gap-6 p-8 rounded-[40px] bg-white/[0.02] border border-white/10 hover:bg-white/[0.04] transition-all group relative"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent rounded-[40px] opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className={`w-12 h-12 rounded-2xl bg-black/40 flex items-center justify-center ${stage.color} ${stage.glow} border border-white/20 transition-transform group-hover:scale-110`}>
                  <stage.icon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className={`text-base font-black uppercase tracking-widest mb-2 ${stage.color}`}>{stage.label}</h3>
                  <p className="text-[10px] text-white/30 leading-relaxed uppercase tracking-[0.15em] font-black">
                    {stage.desc}
                  </p>
                </div>
                <div className="mt-2 h-[2px] w-full bg-white/5 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ x: '-100%' }}
                    animate={{ x: '0%' }}
                    transition={{ delay: 0.2 + i * 0.1, duration: 1.5, ease: "easeOut" }}
                    className={`h-full w-full bg-gradient-to-r from-transparent via-${stage.color.split('-')[1]}-500/50 to-transparent`}
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isAdding && (
          <motion.div
            ref={configRef}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="p-10 rounded-[56px] border-2 border-dashed border-white/10 bg-white/[0.01] flex flex-col items-center gap-8"
          >
            <div className="text-center">
              <h3 className="text-xl font-black text-white uppercase tracking-widest mb-2">Configure Revision Slot</h3>
              <p className="text-[10px] text-white/40 uppercase tracking-widest">Select subject and chapter to initialize 1-4-12 protocol</p>
            </div>
            
            <div className="flex flex-wrap justify-center gap-4 w-full max-w-2xl">
              <div className="flex-1 min-w-[200px]">
                <label className="text-[8px] font-black text-white/20 uppercase tracking-widest ml-4 mb-2 block">Subject</label>
                <select 
                  value={selectedSub}
                  onChange={(e) => setSelectedSub(e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-2xl px-6 py-4 text-xs font-bold text-white focus:outline-none focus:border-amber-500/50"
                >
                  <option value="">Select Subject</option>
                  {availableSubjects.map((s: string) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="flex-1 min-w-[200px]">
                <label className="text-[8px] font-black text-white/20 uppercase tracking-widest ml-4 mb-2 block">Chapter</label>
                <select 
                  value={selectedChap}
                  onChange={(e) => setSelectedChap(e.target.value)}
                  disabled={!selectedSub}
                  className="w-full bg-black border border-white/10 rounded-2xl px-6 py-4 text-xs font-bold text-white focus:outline-none focus:border-amber-500/50 disabled:opacity-30"
                >
                  <option value="">Select Chapter</option>
                  {chapters.map((c: string) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div className="flex gap-4">
              <button 
                onClick={() => setIsAdding(false)}
                className="px-8 py-4 rounded-2xl bg-white/5 border border-white/10 text-white text-[10px] font-black uppercase tracking-widest hover:bg-white/10"
              >
                Cancel
              </button>
              <button 
                onClick={addSlot}
                className="px-10 py-4 rounded-2xl bg-amber-500 text-black text-[10px] font-black uppercase tracking-widest hover:bg-amber-400 shadow-[0_10px_30_px_rgba(245,158,11,0.3)]"
              >
                Initialize Protocol
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div 
        layout
        className="grid grid-cols-1 md:grid-cols-3 gap-8"
      >
        <AnimatePresence>
          {revisionSlots.map((slot: any, slotIdx: number) => {
            const daysSinceStart = Math.floor((Date.now() - new Date(slot.startDate).getTime()) / (1000 * 60 * 60 * 24));
            
            return (
              <motion.div
                key={slot.id}
                initial={{ opacity: 0, y: 30, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
                whileHover={{ y: -8, scale: 1.02 }}
                className="p-8 rounded-[48px] bg-zinc-900/40 border border-white/10 backdrop-blur-3xl relative overflow-hidden group shadow-xl h-full flex flex-col"
              >
              <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-20 transition-all duration-500 transform group-hover:rotate-12">
                <Zap className="w-20 h-20" style={{ color: getSubjectColor(slot.subject) }} />
              </div>
              
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-8 rounded-full" style={{ backgroundColor: getSubjectColor(slot.subject) }} />
                  <div>
                    <div className="text-xs font-bold text-white/30 uppercase tracking-wide">Tracking Revision</div>
                    <div className="text-sm font-black uppercase tracking-wide text-white/90 truncate max-w-[150px]">
                      {slot.subject}
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => removeSlot(slot.id)}
                  className="p-2 rounded-xl border border-white/5 bg-white/5 text-white/20 hover:text-rose-500 hover:bg-rose-500/10 transition-all opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="mb-8">
                <div className="text-[11px] text-white/30 uppercase font-bold tracking-wide mb-2">Subject Chapter</div>
                <div className="text-xl font-black text-white leading-tight uppercase">{slot.chapter}</div>
              </div>

              <div className="space-y-6 relative z-10">
                {/* Spaced Repetition Nodes */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center text-xs font-bold text-white/40 uppercase tracking-wide border-b border-white/10 pb-2 mb-2">
                     <span>Revision Milestones</span>
                     <span>Status</span>
                  </div>
                  <div className="space-y-4">
                    {[1, 4, 12].map((day, idx) => {
                      const isCompleted = slot.currentStage > idx;
                      const isCurrent = slot.currentStage === idx;
                      // Time-gating visual feedback
                      const isLocked = (idx === 1 && daysSinceStart < 4) || (idx === 2 && daysSinceStart < 12);
                      
                      const instructions = [
                        "Notes Revise",
                        "Active Recall",
                        "Notes + Active Recall + Short Notes"
                      ];

                      const getDueDate = (start: string, offset: number) => {
                        const d = new Date(start);
                        d.setDate(d.getDate() + offset);
                        return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
                      };
                      
                      return (
                        <div key={day} className="flex items-center gap-4">
                          <div className="flex-1 space-y-2">
                             <div className="flex justify-between items-center">
                               <div className="flex flex-col">
                                 <div className={`text-xs font-bold ${isLocked ? 'text-white/10' : (isCompleted ? 'text-emerald-500/60' : 'text-white/60 uppercase')}`}>
                                   Day {day} — {instructions[idx]}
                                 </div>
                                 <div className={`text-[9px] font-bold ${isLocked ? 'text-pink-500/40' : 'text-amber-500/60'} uppercase tracking-widest`}>
                                   {isLocked ? `Unlocks: ${getDueDate(slot.startDate, day)}` : `Available on: ${getDueDate(slot.startDate, day)}`}
                                 </div>
                               </div>
                               {isCompleted ? (
                                 <Check className="w-4 h-4 text-emerald-500" />
                               ) : isLocked ? (
                                   <Shield className="w-4 h-4 text-white/5" />
                               ) : (
                                 <div className={`w-2.5 h-2.5 rounded-full ${isCurrent ? 'bg-amber-500 animate-pulse' : 'bg-white/10'}`} />
                               )}
                             </div>
                             <div className="h-1.5 rounded-full bg-black/40 border border-white/5 overflow-hidden">
                               <motion.div 
                                 initial={{ width: 0 }}
                                 animate={{ width: isCompleted ? '100%' : isCurrent ? '50%' : '0%' }}
                                 className={`h-full ${isCompleted ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]' : isCurrent ? 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.3)]' : 'bg-white/5'}`}
                               />
                             </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-6 mt-6 border-t border-white/10 flex gap-2">
                  <button 
                    disabled={slot.completed || ((slot.currentStage === 1 && daysSinceStart < 4) || (slot.currentStage === 2 && daysSinceStart < 12))}
                    onClick={() => markStageComplete(slot)}
                    className={`flex-1 py-4 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all active:scale-95
                      ${slot.completed 
                        ? 'bg-emerald-500/20 text-emerald-400 cursor-default border border-emerald-500/20' 
                        : (slot.currentStage === 1 && daysSinceStart < 4) || (slot.currentStage === 2 && daysSinceStart < 12)
                          ? 'bg-white/5 text-white/10 cursor-not-allowed border border-white/5'
                          : 'bg-amber-500 text-black hover:bg-amber-400'}`}
                  >
                    {slot.completed ? 'Mastered' : 
                     (slot.currentStage === 1 && daysSinceStart < 4) || (slot.currentStage === 2 && daysSinceStart < 12) 
                      ? `Unlocked Day ${[1, 4, 12][slot.currentStage]}`
                      : `Complete Day ${[1, 4, 12][slot.currentStage]}`}
                  </button>
                </div>
              </div>
              
              {/* Status Footer */}
              <div className="flex justify-between items-center mt-6 pt-4 border-t border-white/10 opacity-60">
                 <div className="text-[7px] font-black text-white/20 uppercase tracking-widest font-mono">Day {daysSinceStart + 1} of 12</div>
                 <div className="flex items-center gap-1.5 p-1 px-2 rounded-full bg-white/5 border border-white/10">
                    <div className={`w-1 h-1 rounded-full ${slot.completed ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
                    <span className="text-[6px] font-black text-white/40 uppercase tracking-widest leading-none">{slot.completed ? 'Win' : 'Cycling'}</span>
                 </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>

        {revisionSlots.length === 0 && !isAdding && (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-center border-2 border-dashed border-white/5 rounded-[48px]">
            <ZapIcon className="w-12 h-12 text-white/5 mb-4" />
            <div className="text-[10px] font-black text-white/20 uppercase tracking-[0.4em]">No Revision Slots Initialized</div>
            <p className="mt-2 text-[9px] text-white/10 uppercase tracking-widest">Start a new protocol to track mastery</p>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

// --- Daily Targets Section ---
const PerformanceNode = React.memo(({ elapsedSeconds, targetHours, currentQuestions }: any) => (
  <motion.div 
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    className="p-6 rounded-[24px] bg-[#0c0c0c] border border-white/15 relative overflow-hidden group shadow-xl"
  >
    <div className="flex items-center justify-between mb-8">
      <div className="flex items-center gap-2">
        <Activity className="w-3.5 h-3.5 text-emerald-500" />
        <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Productivity Index</span>
      </div>
    </div>
    
    <div className="space-y-6">
      <div className="p-4 rounded-xl bg-white/[0.01] border border-white/5 relative group/item overflow-hidden">
        <div className="flex justify-between items-end mb-4 relative z-10">
          <div className="flex flex-col">
            <div className="text-[8px] font-black text-white/20 uppercase tracking-[0.3em] mb-1">Efficiency</div>
            <div className="text-[9px] font-bold text-white/40 uppercase">Current Rate</div>
          </div>
          <div className="text-2xl font-mono font-bold text-emerald-400 tabular-nums">
            {(Math.min(10, (currentQuestions / Math.max(1, elapsedSeconds / 3600)) / 2)).toFixed(1)}
          </div>
        </div>
        <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden relative z-10">
          <motion.div 
            animate={{ width: `${Math.min(100, ((currentQuestions / Math.max(1, elapsedSeconds / 3600)) / 2) * 10)}%` }}
            className="h-full bg-emerald-500"
          />
        </div>
      </div>
    </div>
  </motion.div>
));

const SubjectMasteryTracker = ({ subjects, studySeconds, questionCounts, revisionSlots, getSubjectColor }: any) => {
  // Balanced Targets for 20% each
  const TARGET_HOURS = 10;
  const TARGET_QUESTIONS = 120;

  return (
    <div className="mt-16 space-y-12">
      <div className="flex items-center gap-6">
        <h2 className="text-xs font-bold text-white/40 uppercase tracking-[0.3em] whitespace-nowrap pl-4 border-l-2 border-emerald-500/50">Subject Progress</h2>
        <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {subjects.map((sub: string) => {
          // Calculate historical totals for this subject
          let totalStudyTime = 0;
          let totalQuestions = 0;

          Object.values(studySeconds).forEach((dayStats: any) => {
            totalStudyTime += (dayStats[sub] || 0);
          });
          Object.values(questionCounts).forEach((dayStats: any) => {
            totalQuestions += (dayStats[sub] || 0);
          });

          // Calculate Revision completion from slots
          const subSlots = revisionSlots.filter((s: any) => s.subject === sub);
          const d1Count = subSlots.filter((s: any) => s.currentStage > 0).length;
          const d4Count = subSlots.filter((s: any) => s.currentStage > 1).length;
          const d12Count = subSlots.filter((s: any) => s.completed).length;
          
          // Total chapters in subject
          const exam = (localStorage.getItem('pulse_user_exam') || 'jee').toLowerCase();
          const year = localStorage.getItem('pulse_user_year') || '2027';
          const examId = `${exam}_${year}`;
          const chapterNames = SYLLABUS_DATA[examId]?.[sub] || SYLLABUS_DATA[examId.split('_')[0]]?.[sub] || SYLLABUS_DATA.jee[sub] || [];
          const totalChaptersCount = Math.max(1, chapterNames.length);

          const timeProgress = Math.min(100, (totalStudyTime / (TARGET_HOURS * 3600)) * 100);
          const quesProgress = Math.min(100, (totalQuestions / TARGET_QUESTIONS) * 100);
          const d1Progress = Math.min(100, (d1Count / totalChaptersCount) * 100);
          const d4Progress = Math.min(100, (d4Count / totalChaptersCount) * 100);
          const d12Progress = Math.min(100, (d12Count / totalChaptersCount) * 100);

          const compositeScore = Math.round(
            (timeProgress * 0.2) + 
            (quesProgress * 0.2) + 
            (d1Progress * 0.2) + 
            (d4Progress * 0.2) + 
            (d12Progress * 0.2)
          );

          return (
            <motion.div
              key={sub}
              whileHover={{ y: -5 }}
              className="p-8 rounded-[32px] bg-[#0c0c0c] border border-white/15 relative overflow-hidden group shadow-2xl"
            >
              <div 
                className="absolute top-0 right-0 w-32 h-32 blur-[80px] opacity-10 group-hover:opacity-20 transition-opacity"
                style={{ backgroundColor: getSubjectColor(sub) }}
              />
              
              <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-6 rounded-full" style={{ backgroundColor: getSubjectColor(sub) }} />
                  <div className="flex flex-col">
                    <span className="text-[14px] font-black text-white uppercase tracking-wider">{sub}</span>
                    <span className="text-xs font-bold text-white/20 uppercase tracking-wide mt-1">Status: {compositeScore >= 80 ? 'Mastery' : 'Improving'}</span>
                  </div>
                </div>
                <div className="text-3xl font-mono font-black text-white tabular-nums tracking-tighter">{compositeScore}%</div>
              </div>

              <div className="space-y-6 relative z-10">
                {/* Weightage Breakdown (20% each) */}
                <div className="space-y-6">
                   <div className="grid grid-cols-2 gap-6">
                      {/* Time */}
                      <div className="space-y-2">
                         <div className="flex justify-between text-xs font-bold text-white/30 uppercase tracking-wide">
                          <span>Study Time</span>
                          <span className="text-white/60">{formatTimeHM(totalStudyTime)}</span>
                        </div>
                        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <motion.div animate={{ width: `${timeProgress}%` }} className="h-full bg-blue-500/80 shadow-[0_0_10px_rgba(59,130,246,0.3)]" />
                        </div>
                      </div>
                      {/* Questions */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs font-bold text-white/30 uppercase tracking-wide">
                          <span>Questions</span>
                          <span className="text-white/60">{totalQuestions} Q</span>
                        </div>
                        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <motion.div animate={{ width: `${quesProgress}%` }} className="h-full bg-rose-500/80 shadow-[0_0_10px_rgba(244,63,94,0.3)]" />
                        </div>
                      </div>
                   </div>

                   <div className="h-px bg-white/5" />

                   <div className="grid grid-cols-3 gap-4">
                      {/* D1 */}
                      <div className="space-y-2">
                        <div className="text-[10px] font-bold text-white/20 uppercase text-center tracking-wide">RECALLED</div>
                        <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                          <motion.div animate={{ width: `${d1Progress}%` }} className="h-full bg-violet-500/60" />
                        </div>
                        <div className="text-[9px] text-center text-white/40 font-bold">{d1Count}/{totalChaptersCount}</div>
                      </div>
                      {/* D4 */}
                      <div className="space-y-2">
                        <div className="text-[10px] font-bold text-white/20 uppercase text-center tracking-wide">REVISED</div>
                        <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                          <motion.div animate={{ width: `${d4Progress}%` }} className="h-full bg-amber-500/60" />
                        </div>
                        <div className="text-[9px] text-center text-white/40 font-bold">{d4Count}/{totalChaptersCount}</div>
                      </div>
                      {/* D12 */}
                      <div className="space-y-2">
                        <div className="text-[10px] font-bold text-white/20 uppercase text-center tracking-wide">MASTERED</div>
                        <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                          <motion.div animate={{ width: `${d12Progress}%` }} className="h-full bg-emerald-500/60" />
                        </div>
                        <div className="text-[9px] text-center text-white/40 font-bold">{d12Count}/{totalChaptersCount}</div>
                      </div>
                   </div>
                </div>

                <div className="pt-6 border-t border-white/5 flex items-center justify-between">
                   <div className="flex items-center gap-2">
                      <div className="w-1 h-1 rounded-full bg-white/20" />
                      <span className="text-[10px] font-bold text-white/20 uppercase tracking-wide">Study Volume: {(totalStudyTime / 3600).toFixed(0)}H</span>
                   </div>
                   <div className="px-2.5 py-1 rounded-full bg-white/5 border border-white/5 text-[10px] font-bold text-white/40 uppercase tracking-wide">
                     Authenticated Data
                   </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

const StreakBox = React.memo(({ streak, dailyStudySeconds }: { streak: number, dailyStudySeconds: Record<string, number> }) => (
  <motion.div 
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay: 0.2 }}
    className="p-8 rounded-[24px] bg-[#0c0c0c] border border-white/15 relative overflow-hidden group shadow-xl"
  >
    <div className="flex items-center justify-between mb-10">
      <div className="flex items-center gap-2">
        <Zap className="w-3.5 h-3.5 text-amber-500" />
        <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Consistency</span>
      </div>
    </div>
    
    <div className="flex flex-col gap-8 relative z-10">
      <div className="flex items-end gap-3">
        <div className="text-[80px] font-mono font-black text-white tracking-[-0.1em] leading-[0.8] tabular-nums">
          {streak}
        </div>
        <div className="flex flex-col mb-1">
          <div className="text-[10px] font-black text-white/40 uppercase tracking-widest">DAY</div>
          <div className="text-[12px] font-black text-amber-500 uppercase tracking-widest">STREAK</div>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1.5 p-1 rounded-2xl bg-black/40 border border-white/10">
        {[...Array(7)].map((_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - (6 - i));
          const dateStr = date.toDateString();
          const isDone = (dailyStudySeconds[dateStr] || 0) >= 1800;
          const dayName = date.toLocaleDateString('en-US', { weekday: 'narrow' });
          return (
            <div key={i} className="flex flex-col items-center gap-2 flex-1">
              <div 
                className={`w-full aspect-square rounded-lg transition-all duration-700 flex items-center justify-center border
                  ${isDone ? 'bg-amber-500/80 border-amber-400/50' : 'bg-white/2 border-white/15'}`}
              >
                {isDone && <Check className="w-3 h-3 text-black font-black" />}
              </div>
              <span className={`text-[7px] font-black transition-colors ${isDone ? 'text-amber-500' : 'text-white/20'}`}>{dayName}</span>
            </div>
          );
        })}
      </div>
    </div>
  </motion.div>
));

const QuestionLab = React.memo(({ currentQuestions, currentQuestionsRef, updateQuestions, playTickSound, removeOneHour, isTimerRunning }: any) => {
  const [showConfirmDeleteTime, setShowConfirmDeleteTime] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const holdIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const startHold = () => {
    if (holdIntervalRef.current) return;
    playAuthSound(); // Specific authorization sound added to sounds.ts
    holdIntervalRef.current = setInterval(() => {
      setHoldProgress(prev => {
        if (prev >= 100) {
          clearInterval(holdIntervalRef.current!);
          holdIntervalRef.current = null;
          removeOneHour();
          setShowConfirmDeleteTime(false);
          setHoldProgress(0);
          return 100;
        }
        return prev + 1;
      });
    }, 20);
  };

  const cancelHold = () => {
    if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = null;
    }
    setHoldProgress(0);
  };

  return (
    <div className="space-y-6 order-3">
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        whileHover={{ scale: 1.005 }}
        className="p-10 rounded-[28px] bg-[#0d0d0d] border border-white/15 flex flex-col items-center justify-center text-center group relative overflow-hidden min-h-[420px] shadow-2xl"
      >
        <div className="absolute inset-0 z-0 px-1.5 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-b from-pink-500/5 via-transparent to-transparent opacity-20" />
        </div>

        <div className="relative z-10 w-full flex flex-col items-center">
          <div className="flex items-center gap-2 mb-10 bg-white/5 p-1 px-3 rounded-full border border-white/10">
            <Target className="w-3 h-3 text-pink-400" />
            <span className="text-[8px] font-black text-white/40 uppercase tracking-[0.4em]">Questions Tracked</span>
          </div>

          <div className="flex flex-col items-center gap-1 mb-12">
            <div className="text-[110px] md:text-[140px] font-mono font-black text-white tracking-[-0.05em] leading-[0.8] tabular-nums drop-shadow-[0_0_30px_rgba(236,72,153,0.15)] bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent">
              {currentQuestions}
            </div>
            <div className="text-[10px] font-black text-pink-500/60 uppercase tracking-[0.6em] mt-6 border-t border-pink-500/10 pt-4 w-full text-center">Solved Today</div>
          </div>

          <div className="grid grid-cols-2 gap-4 w-full px-4">
            <button
               onClick={() => { updateQuestions(Math.max(0, (currentQuestionsRef?.current || currentQuestions) - 1)); }}
               className={`p-6 rounded-2xl bg-white/[0.02] border border-white/10 text-white/20 transition-all flex flex-col items-center justify-center gap-1
                 hover:bg-white/5 hover:text-white/60 active:scale-95`}
            >
              <div className="w-4 h-[1.5px] bg-current opacity-40" />
              <span className="text-[7px] font-black uppercase tracking-widest mt-1">SUBTRACT</span>
            </button>
            <button
               onClick={() => { playTickSound(); updateQuestions((currentQuestionsRef?.current || currentQuestions) + 1); }}
               className={`p-6 rounded-2xl bg-pink-500 text-black transition-all flex flex-col items-center justify-center gap-1 shadow-[0_15px_30px_rgba(236,72,153,0.2)]
                 hover:bg-pink-400 active:scale-95`}
            >
              <div className="relative">
                <div className="w-4 h-[1.5px] bg-black" />
                <div className="w-[1.5px] h-4 bg-black absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
              <span className="text-[7px] font-black uppercase tracking-widest mt-1">ADD</span>
            </button>
          </div>

          <div className="mt-8 flex items-center gap-2 opacity-20">
             <div className="w-1 h-1 rounded-full bg-white animate-pulse" />
             <span className="text-[6px] font-black text-white uppercase tracking-[0.4em]">Real-time Updates</span>
          </div>
        </div>
      </motion.div>

      {/* Delete 1 Hour Option */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ 
          opacity: 1, 
          y: 0,
          backgroundColor: showConfirmDeleteTime ? "rgba(220, 38, 38, 0.08)" : "rgba(255, 255, 255, 0.02)",
          borderColor: showConfirmDeleteTime ? "rgba(220, 38, 38, 0.3)" : "rgba(255, 255, 255, 0.05)",
          x: showConfirmDeleteTime ? [0, -1, 1, -1, 1, 0] : 0
        }}
        transition={{ 
          x: showConfirmDeleteTime ? { repeat: Infinity, duration: 0.5 } : { duration: 0.3 },
          backgroundColor: { duration: 0.5 },
          borderColor: { duration: 0.5 }
        }}
        className={`p-6 rounded-[32px] border flex flex-col gap-4 overflow-hidden relative group transition-colors duration-500`}
      >
        {showConfirmDeleteTime && (
          <div className="absolute inset-0 pointer-events-none opacity-20 overflow-hidden">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(220,38,38,0.1)_1px,transparent_1px)] bg-[length:100%_4px] animate-scanline" />
          </div>
        )}
        
        <AnimatePresence mode="wait">
          {!showConfirmDeleteTime ? (
            <motion.div 
              key="delete-btn"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-red-500/10 flex items-center justify-center">
                  <Clock className="w-4 h-4 text-red-500/60" />
                </div>
                <div>
                  <div className="text-[10px] font-black text-white/40 uppercase tracking-wider font-mono">Time Adjustment</div>
                  <div className="text-[9px] font-bold text-white/20 font-mono">Recalibrate session history</div>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowConfirmDeleteTime(true);
                  playTickSound();
                }}
                className="px-4 py-2 rounded-xl bg-red-600 text-white text-[10px] font-black uppercase tracking-[0.2em] transition-all border border-red-400 hover:bg-red-500 hover:scale-105 shadow-[0_5px_15px_rgba(220,38,38,0.3)] active:scale-95"
              >
                -1 Hour
              </button>
            </motion.div>
          ) : (
            <motion.div 
              key="confirm-delete"
              initial={{ opacity: 0, x: -20 }}
              animate={{ 
                opacity: 1, 
                x: 0,
                transition: { type: "spring", stiffness: 300, damping: 20 }
              }}
              exit={{ opacity: 0, x: 20 }}
              className="flex flex-col gap-4 relative z-10"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500 animate-pulse" />
                  <div className="text-[10px] font-black text-red-500 uppercase tracking-[0.2em] font-mono">Hazard: Sequence Mod</div>
                </div>
                <button
                  onClick={() => {
                    setShowConfirmDeleteTime(false);
                    playTickSound();
                    cancelHold();
                  }}
                  className="p-1 rounded-lg hover:bg-white/10 text-white/30 transition-colors"
                >
                  <ChevronRight className="w-4 h-4 rotate-180" />
                </button>
              </div>
              
              <div className="text-[11px] font-bold text-white/70 leading-relaxed font-mono bg-black/40 p-3 rounded-2xl border border-white/5">
                AUTHORIZING DELETION OF <span className="text-red-400 font-black">60m 00s</span>.
                <div className="mt-1 text-[9px] text-white/30 lowercase italic">hold button to establish link...</div>
              </div>

              <div className="flex flex-col gap-2 w-full mt-2">
                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${holdProgress}%` }}
                    className="h-full bg-red-600 shadow-[0_0_15px_rgba(220,38,38,0.5)]"
                  />
                </div>
                
                <button
                  onMouseDown={startHold}
                  onMouseUp={cancelHold}
                  onMouseLeave={cancelHold}
                  onTouchStart={startHold}
                  onTouchEnd={cancelHold}
                  className="w-full py-4 rounded-2xl bg-red-600/10 text-red-500 text-[10px] font-black uppercase tracking-[0.2em] transition-all relative overflow-hidden group border border-red-600/30 active:scale-95"
                >
                  <span className="relative z-10 transition-transform block">
                    {holdProgress > 0 ? `Authorizing Sequence... ${Math.round(holdProgress)}%` : "Hold Key to Authorize"}
                  </span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
});

const DistributionCharts = React.memo(({ subjectStudySeconds, subjectQuestionCounts, dailyStudySeconds, dailyQuestionCounts, getSubjectColor }: any) => {
  const today = new Date().toDateString();
  
  // Get raw data for today
  const todayStudyRaw = subjectStudySeconds[today] || {};
  const todayQuestionRaw = subjectQuestionCounts[today] || {};

  // Totals for display
  const totalStudySeconds = dailyStudySeconds[today] || 0;
  const totalQuestions = dailyQuestionCounts[today] || 0;

  // Transform into chart data - filter out subjects with 0 values to keep charts clean
  let studyData = Object.entries(todayStudyRaw)
    .map(([name, value]: any) => ({ name, value }))
    .filter(item => item.value > 0);

  let questionData = Object.entries(todayQuestionRaw)
    .map(([name, value]: any) => ({ name, value }))
    .filter(item => item.value > 0);

  // Consistency Shield: Show unattributed time as 'Other' to avoid misleading 'merged' data
  const studySum = studyData.reduce((acc, curr) => acc + curr.value, 0);
  if (studySum < totalStudySeconds) {
    const diff = totalStudySeconds - studySum;
    if (diff > 5) { // Show if more than 5 seconds to avoid noise
      studyData.push({ name: 'Other / Unsorted', value: diff });
    }
  } else if (studySum > totalStudySeconds + 60) {
    // If subjects somehow sum to MORE than total, scale them down to match total
    const ratio = totalStudySeconds / studySum;
    studyData = studyData.map(d => ({ ...d, value: Math.round(d.value * ratio) }));
  }

  const questionSum = questionData.reduce((acc, curr) => acc + curr.value, 0);
  if (questionSum < totalQuestions) {
    const diff = totalQuestions - questionSum;
    if (diff > 0) {
      questionData.push({ name: 'Other', value: diff });
    }
  } else if (questionSum > totalQuestions) {
    const ratio = totalQuestions / questionSum;
    questionData = questionData.map(d => ({ ...d, value: Math.round(d.value * ratio) }));
  }

  const chartCardClass = "p-8 rounded-[40px] glass border border-white/20 relative overflow-hidden shadow-2xl transition-all duration-500 hover:border-white/30";
  const sectionTitleClass = "text-[10px] font-black text-white/40 uppercase tracking-widest";
  const itemRowClass = "flex items-center justify-between p-3 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] transition-all group";

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
      {/* Time Distribution */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={chartCardClass}
      >
        <div className="flex items-center gap-2 mb-10">
          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
          <span className={sectionTitleClass}>Subject Time Distribution</span>
        </div>
        
        <div className="flex flex-col items-center">
          <div className="h-72 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={studyData.length > 0 ? studyData : [{ name: 'Empty', value: 1 }]}
                  cx="50%" cy="50%" innerRadius={70} outerRadius={95} paddingAngle={4} dataKey="value"
                  animationDuration={1000}
                >
                  {studyData.length === 0 ? (
                    <Cell fill="rgba(255,255,255,0.03)" stroke="none" />
                  ) : (
                    studyData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getSubjectColor(entry.name, index)} stroke="none" />
                    ))
                  )}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#000', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', backdropFilter: 'blur(20px)', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}
                  itemStyle={{ color: '#fff', fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em' }}
                  formatter={(value: number) => [formatTimeHM(value), 'Time']}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none translate-y-2">
              <span className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em] mb-1">Total Time</span>
              <span className="text-3xl font-mono font-black text-white tabular-nums">
                {formatTimeHM(totalStudySeconds)}
              </span>
            </div>
          </div>

          <div className="w-full mt-10 space-y-2.5 max-h-[240px] overflow-y-auto pr-2 custom-scrollbar">
            {studyData.length === 0 ? (
              <div className="text-center py-8 text-[10px] font-bold text-white/20 uppercase tracking-widest border border-dashed border-white/5 rounded-2xl">
                No session data yet
              </div>
            ) : (
              studyData.map((entry: any, index: number) => (
                <div key={entry.name} className={itemRowClass}>
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-2.5 h-2.5 rounded-full shadow-[0_0_12px_currentColor]" 
                      style={{ backgroundColor: getSubjectColor(entry.name, index), color: getSubjectColor(entry.name, index) }} 
                    />
                    <span className="text-[11px] font-black text-white/60 uppercase tracking-widest group-hover:text-white transition-colors">
                      {entry.name}
                    </span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[11px] font-mono font-black text-white">{formatTimeHM(entry.value)}</span>
                    <span className="text-[8px] font-bold text-white/20 uppercase">
                      {totalStudySeconds > 0 ? Math.round((entry.value / totalStudySeconds) * 100) : 0}%
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </motion.div>

      {/* Question Distribution */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className={chartCardClass}
      >
        <div className="flex items-center gap-2 mb-10">
          <div className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse" />
          <span className={sectionTitleClass}>Subject Question Distribution</span>
        </div>
        
        <div className="flex flex-col items-center">
          <div className="h-72 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={questionData.length > 0 ? questionData : [{ name: 'Empty', value: 1 }]}
                  cx="50%" cy="50%" innerRadius={70} outerRadius={95} paddingAngle={4} dataKey="value"
                  animationDuration={1000}
                >
                  {questionData.length === 0 ? (
                    <Cell fill="rgba(255,255,255,0.03)" stroke="none" />
                  ) : (
                    questionData.map((entry, index) => (
                      <Cell key={`cell-q-${index}`} fill={getSubjectColor(entry.name, index)} stroke="none" />
                    ))
                  )}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#000', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', backdropFilter: 'blur(20px)', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}
                  itemStyle={{ color: '#fff', fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em' }}
                  formatter={(value: number) => [value, 'Solved']}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none translate-y-2">
              <span className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em] mb-1">Total Solved</span>
              <span className="text-4xl font-mono font-black text-white tabular-nums">
                {totalQuestions}
              </span>
            </div>
          </div>

          <div className="w-full mt-10 space-y-2.5 max-h-[240px] overflow-y-auto pr-2 custom-scrollbar">
            {questionData.length === 0 ? (
              <div className="text-center py-8 text-[10px] font-bold text-white/20 uppercase tracking-widest border border-dashed border-white/5 rounded-2xl">
                No questions yet
              </div>
            ) : (
              questionData.map((entry: any, index: number) => (
                <div key={entry.name} className={itemRowClass}>
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-2.5 h-2.5 rounded-full shadow-[0_0_12px_currentColor]" 
                      style={{ backgroundColor: getSubjectColor(entry.name, index), color: getSubjectColor(entry.name, index) }} 
                    />
                    <span className="text-[11px] font-black text-white/60 uppercase tracking-widest group-hover:text-white transition-colors">
                      {entry.name}
                    </span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[11px] font-mono font-black text-white">{entry.value} Qs</span>
                    <span className="text-[8px] font-bold text-white/20 uppercase">
                      {totalQuestions > 0 ? Math.round((entry.value / totalQuestions) * 100) : 0}%
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
});


const BarGraphs = React.memo(({ barChartData, targetHours, questionTarget, revisionSlots }: any) => {
  const today = new Date();
  today.setHours(0,0,0,0);

  const upcomingRevisions = revisionSlots.filter((slot: any) => {
    if (slot.completed) return false;
    const stages = [1, 4, 12];
    const startDate = new Date(slot.startDate);
    const dueDate = new Date(startDate);
    dueDate.setHours(0,0,0,0);
    dueDate.setDate(startDate.getDate() + stages[slot.currentStage]);
    const diff = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff >= 0 && diff <= 7; 
  }).sort((a: any, b: any) => {
    const stages = [1, 4, 12];
    const d1 = new Date(a.startDate); d1.setDate(d1.getDate() + stages[a.currentStage]);
    const d2 = new Date(b.startDate); d2.setDate(d2.getDate() + stages[b.currentStage]);
    return d1.getTime() - d2.getTime();
  });

  return (
    <div className="flex flex-col gap-6 mb-12">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 rounded-[32px] glass border border-white/20 will-change-transform"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
              <span className="text-xs font-bold text-white/30 uppercase tracking-wide">Study Hours (Last 7 Days)</span>
            </div>
          </div>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} tickLine={false} 
                  tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: 900 }} 
                />
                <YAxis hide />
                <Tooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  contentStyle={{ backgroundColor: '#000', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                  itemStyle={{ color: '#10b981', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase' }}
                  formatter={(value: number) => [`${value.toFixed(1)}h`, 'Hours']}
                />
                <Bar dataKey="hours" radius={[4, 4, 0, 0]}>
                  {barChartData.map((entry: any, index: number) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.hours >= targetHours ? '#10b981' : 'rgba(16,185,129,0.3)'} 
                    />
                  ))}
                </Bar>
                <ReferenceLine y={targetHours} stroke="#10b981" strokeDasharray="3 3" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 rounded-[32px] glass border border-white/20 will-change-transform"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-rose-500 rounded-full" />
              <span className="text-xs font-bold text-white/40 uppercase tracking-wide">Questions Solved (Last 7 Days)</span>
            </div>
          </div>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} tickLine={false} 
                  tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: 900 }} 
                />
                <YAxis hide />
                <Tooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  contentStyle={{ backgroundColor: '#000', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                  itemStyle={{ color: '#f43f5e', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase' }}
                />
                <Bar dataKey="questions" radius={[4, 4, 0, 0]}>
                  {barChartData.map((entry: any, index: number) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.questions >= questionTarget ? '#f43f5e' : 'rgba(244,63,94,0.3)'} 
                    />
                  ))}
                </Bar>
                <ReferenceLine y={questionTarget} stroke="#f43f5e" strokeDasharray="3 3" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* weekly revision highlight */}
      {upcomingRevisions.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-8 rounded-[48px] bg-amber-500/5 border border-amber-500/20 backdrop-blur-xl relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-8">
             <Zap className="w-12 h-12 text-amber-500/10" />
          </div>
          <div className="flex items-center gap-3 mb-6 relative z-10">
            <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
            <h3 className="text-xs font-bold text-amber-500 uppercase tracking-widest">Weekly Revision Overview</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-4 relative z-10">
            {Array.from({ length: 7 }, (_, i) => {
              const d = new Date();
              d.setDate(d.getDate() + i);
              const dateStr = d.toDateString();
              const dayRevisions = upcomingRevisions.filter((rev: any) => {
                const stages = [1, 4, 12];
                const start = new Date(rev.startDate);
                const due = new Date(start);
                due.setHours(0,0,0,0);
                due.setDate(start.getDate() + stages[rev.currentStage]);
                return due.toDateString() === dateStr;
              });

              return (
                <div key={i} className={`p-4 rounded-2xl transition-all border ${dayRevisions.length > 0 ? 'bg-amber-500/10 border-amber-500/30' : 'bg-white/2 border-white/5 opacity-40'}`}>
                  <div className="text-[10px] font-bold text-white/30 uppercase mb-2">{d.toLocaleDateString('default', { weekday: 'short' })}</div>
                  <div className="text-sm font-black text-white mb-3">{d.getDate()}</div>
                  <div className="space-y-1.5">
                    {dayRevisions.map((rev: any, idx: number) => (
                      <div key={idx} className="text-[8px] font-bold text-amber-400 uppercase leading-tight truncate bg-amber-500/10 px-1 py-0.5 rounded border border-amber-500/10">
                        {rev.chapter}
                      </div>
                    ))}
                    {dayRevisions.length === 0 && <div className="h-4 w-full bg-white/5 rounded-full" />}
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
});

const SUBJECT_COLORS: Record<string, string> = {
  'Maths': '#a855f7',
  'Math': '#a855f7',
  'Physics': '#3b82f6',
  'Chemistry': '#10b981',
  'Biology': '#f43f5e',
  'Bio': '#f43f5e',
  'Science': '#06b6d4',
  'Social Science': '#f59e0b',
  'English': '#ec4899',
  'Hindi': '#f97316',
  'No Data': 'rgba(255,255,255,0.05)'
};

const MOTIVATIONAL_QUOTES = [
  "The only way to do great work is to love what you do. – Steve Jobs",
  "Success is not final, failure is not fatal: it is the courage to continue that counts. – Winston Churchill",
  "Believe you can and you're halfway there. – Theodore Roosevelt",
  "Your time is limited, so don't waste it living someone else's life. – Steve Jobs",
  "The future belongs to those who believe in the beauty of their dreams. – Eleanor Roosevelt",
  "It does not matter how slowly you go as long as you do not stop. – Confucius",
  "Everything you've ever wanted is on the other side of fear. – George Addair",
  "Success is walking from failure to failure with no loss of enthusiasm. – Winston Churchill",
  "Hardships often prepare ordinary people for an extraordinary destiny. – C.S. Lewis",
  "Dream big and dare to fail. – Norman Vaughan",
  "The only limit to our realization of tomorrow will be our doubts of today. – Franklin D. Roosevelt",
  "What you get by achieving your goals is not as important as what you become by achieving your goals. – Zig Ziglar",
  "Act as if what you do makes a difference. It does. – William James",
  "Success usually comes to those who are too busy to be looking for it. – Henry David Thoreau",
  "Don't be afraid to give up the good to go for the great. – John D. Rockefeller",
  "I find that the harder I work, the more luck I seem to have. – Thomas Jefferson",
  "The road to success and the road to failure are almost exactly the same. – Colin R. Davis",
  "Success is not the key to happiness. Happiness is the key to success. – Albert Schweitzer",
  "The only place where success comes before work is in the dictionary. – Vidal Sassoon",
  "Don't watch the clock; do what it does. Keep going. – Sam Levenson",
  "The way to get started is to quit talking and begin doing. – Walt Disney",
  "If you are not willing to risk the usual, you will have to settle for the ordinary. – Jim Rohn",
  "The ones who are crazy enough to think they can change the world are the ones who do. – Steve Jobs",
  "Do one thing every day that scares you. – Eleanor Roosevelt",
  "All our dreams can come true if we have the courage to pursue them. – Walt Disney",
  "Opportunities don't happen. You create them. – Chris Grosser",
  "Don't let the fear of losing be greater than the excitement of winning. – Robert Kiyosaki",
  "If you really look closely, most overnight successes took a long time. – Steve Jobs",
  "The real test is not whether you avoid this failure, because you won't. It's whether you let it harden or shame you into inaction, or whether you learn from it; whether you choose to persevere. – Barack Obama",
  "There are no secrets to success. It is the result of preparation, hard work, and learning from failure. – Colin Powell",
  "Success is not how high you have climbed, but how you make a positive difference to the world. – Roy T. Bennett",
  "The only person you are destined to become is the person you decide to be. – Ralph Waldo Emerson",
  "Go confidently in the direction of your dreams! Live the life you've imagined. – Henry David Thoreau",
  "In the middle of every difficulty lies opportunity. – Albert Einstein",
  "The best way to predict the future is to create it. – Peter Drucker",
  "Your life only gets better when you get better. – Brian Tracy",
  "Happiness is not something ready-made. It comes from your own actions. – Dalai Lama",
  "It's not whether you get knocked down, it's whether you get up. – Vince Lombardi",
  "If you want to achieve greatness stop asking for permission. – Anonymous",
  "Things work out best for those who make the best of how things work out. – John Wooden",
  "To live a creative life, we must lose our fear of being wrong. – Anonymous",
  "If you are not willing to risk the usual you will have to settle for the ordinary. – Jim Rohn",
  "Trust because you are willing to accept the risk, not because it's safe or certain. – Anonymous",
  "Take up one idea. Make that one idea your life--think of it, dream of it, live on that idea. Let the brain, muscles, nerves, every part of your body, be full of that idea, and just leave every other idea alone. This is the way to success. – Swami Vivekananda",
  "All our dreams can come true if we have the courage to pursue them. – Walt Disney",
  "Good things come to people who wait, but better things come to those who go out and get them. – Anonymous",
  "If you do what you always did, you will get what you always got. – Anonymous",
  "Success is the sum of small efforts, repeated day-in and day-out. – Robert Collier",
  "As we look ahead into the next century, leaders will be those who empower others. – Bill Gates",
  "Our greatest fear should not be of failure but of succeeding at things in life that don't really matter. – Francis Chan",
  "You have to learn the rules of the game. And then you have to play better than anyone else. – Albert Einstein",
  "The starting point of all achievement is desire. – Napoleon Hill",
  "Success is liking yourself, liking what you do, and liking how you do it. – Maya Angelou",
  "Coming together is a beginning; keeping together is progress; working together is success. – Henry Ford",
  "If you want to fly, you have to give up the things that weigh you down. – Toni Morrison",
  "The only thing standing between you and your goal is the story you keep telling yourself as to why you can't achieve it. – Jordan Belfort",
  "Character cannot be developed in ease and quiet. Only through experience of trial and suffering can the soul be strengthened, ambition inspired, and success achieved. – Helen Keller",
  "Don't be distracted by criticism. Remember--the only taste of success some people get is to take a bite out of you. – Zig Ziglar",
  "To be successful you must accept all challenges that come your way. You can't just accept the ones you like. – Mike Gafka",
  "Success is not just about what you accomplish in your life; it's about what you inspire others to do. – Anonymous",
  "The secret of success is to do the common thing uncommonly well. – John D. Rockefeller Jr.",
  "I never dreamed about success, I worked for it. – Estee Lauder",
  "I find that when you have a real interest in life and a curious life, that sleep is not the most important thing. – Martha Stewart",
  "The only way to achieve the impossible is to believe it is possible. – Charles Kingsleigh",
  "The question isn't who is going to let me; it's who is going to stop me. – Ayn Rand",
  "Success is not final; failure is not fatal: It is the courage to continue that counts. – Winston S. Churchill",
  "Hard work beats talent when talent doesn't work hard. – Tim Notke",
  "If you want to live a happy life, tie it to a goal, not to people or things. – Albert Einstein",
  "The distance between insanity and genius is measured only by success. – Bruce Feirstein",
  "When you stop chasing the wrong things, you give the right things a chance to catch you. – Lolly Daskal",
  "Don't be afraid to give up the good to go for the great. – John D. Rockefeller",
  "No masterpiece was ever created by a lazy artist. – Anonymous",
  "If you can't explain it simply, you don't understand it well enough. – Albert Einstein",
  "Blessed are those who can give without remembering and take without forgetting. – Elizabeth Bibesco",
  "Do what you can, where you are, with what you have. – Teddy Roosevelt",
  "The only person you should try to be better than is the person you were yesterday. – Anonymous",
  "A person who never made a mistake never tried anything new. – Albert Einstein",
  "The best revenge is massive success. – Frank Sinatra",
  "I have not failed. I've just found 10,000 ways that won't work. – Thomas A. Edison",
  "A successful man is one who can lay a firm foundation with the bricks others have thrown at him. – David Brinkley",
  "No one can make you feel inferior without your consent. – Eleanor Roosevelt",
  "If you're going through hell, keep going. – Winston Churchill",
  "The function of leadership is to produce more leaders, not more followers. – Ralph Nader",
  "Success is not the key to happiness. Happiness is the key to success. If you love what you are doing, you will be successful. – Albert Schweitzer",
  "The only way to do great work is to love what you do. – Steve Jobs",
  "If you can dream it, you can do it. – Walt Disney",
  "Your time is limited, so don't waste it living someone else's life. – Steve Jobs",
  "The only limit to our realization of tomorrow will be our doubts of today. – Franklin D. Roosevelt",
  "The future belongs to those who believe in the beauty of their dreams. – Eleanor Roosevelt",
  "Believe you can and you're halfway there. – Theodore Roosevelt",
  "The only person you are destined to become is the person you decide to be. – Ralph Waldo Emerson",
  "Go confidently in the direction of your dreams! Live the life you've imagined. – Henry David Thoreau",
  "In the middle of every difficulty lies opportunity. – Albert Einstein",
  "The best way to predict the future is to create it. – Peter Drucker",
  "Your life only gets better when you get better. – Brian Tracy",
  "Happiness is not something ready-made. It comes from your own actions. – Dalai Lama",
  "It's not whether you get knocked down, it's whether you get up. – Vince Lombardi",
  "If you want to achieve greatness stop asking for permission. – Anonymous",
  "Things work out best for those who make the best of how things work out. – John Wooden",
  "To live a creative life, we must lose our fear of being wrong. – Anonymous"
];

const getSubjectColor = (subject: string, index: number) => {
  if (SUBJECT_COLORS[subject]) return SUBJECT_COLORS[subject];
  
  // Stable color selection based on subject name hash
  const defaultColors = [
    '#a855f7', '#3b82f6', '#10b981', '#f43f5e', '#f59e0b', 
    '#06b6d4', '#ec4899', '#f97316', '#8b5cf6', '#0ea5e9'
  ];
  
  let hash = 0;
  for (let i = 0; i < subject.length; i++) {
    hash = subject.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colorIndex = Math.abs(hash) % defaultColors.length;
  return defaultColors[colorIndex];
};

const formatTimeFull = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h === 0) return `${m}m ${seconds % 60}s`;
  return `${h}h ${m}m`;
};

const formatTimeHM = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
};

const formatTimeShort = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
};

interface TimerPageProps {
  settings?: {
    timerSoundEnabled: boolean;
    timerSoundType: string;
  };
}

const TimerPage = ({ settings }: TimerPageProps) => {
  const [user, setUser] = useState<any>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [mockTestDates, setMockTestDates] = useState<string[]>([]);
  const [mockTestDetails, setMockTestDetails] = useState<Record<string, { completed: boolean, marks: string }>>({});
  const [completedStudyDays, setCompletedStudyDays] = useState<string[]>([]);
  const [completedQuestionDays, setCompletedQuestionDays] = useState<string[]>([]);
  const [dailyQuestionCounts, setDailyQuestionCounts] = useState<Record<string, number>>({});
  const [markedEvents, setMarkedEvents] = useState<Record<string, string>>(() => {
    return JSON.parse(localStorage.getItem('pulse_calendar_events') || '{}');
  });
  const [dailyStudySeconds, setDailyStudySeconds] = useState<Record<string, number>>({});
  const [subjectStudySeconds, setSubjectStudySeconds] = useState<Record<string, Record<string, number>>>({});
  const [subjectQuestionCounts, setSubjectQuestionCounts] = useState<Record<string, Record<string, number>>>({});
  
  // Ref-based session tracking for TOTAL accuracy during active timer
  const [sessionTabSeconds, setSessionTabSeconds] = useState(0);
  const [sessionTabQuestions, setSessionTabQuestions] = useState(0);
  
  const [globalStats, setGlobalStats] = useState({ totalStudents: 0, totalQuestions: 0 });
  
  const [targetHours, setTargetHours] = useState<number>(4);
  const [questionTarget, setQuestionTarget] = useState<number>(50);
  
  const [currentQuestions, setCurrentQuestions] = useState<number>(0);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [selectedSubject, setSelectedSubject] = useState<string>(localStorage.getItem('pulse_selected_subject') || '');
  const [selectedChapter, setSelectedChapter] = useState<string>(localStorage.getItem('pulse_selected_chapter') || '');
  const [availableSubjects, setAvailableSubjects] = useState<string[]>([]);
  const [availableChapters, setAvailableChapters] = useState<{id: string, name: string}[]>([]);
  
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [sessionVersion, setSessionVersion] = useState(0); // Trigger for derived memos on ref updates
  const isSyncingRef = useRef(false);
  
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [accumulatedSeconds, setAccumulatedSeconds] = useState<number>(0);
  const [isTimerLoading, setIsTimerLoading] = useState(true);
  const [isStatsLoaded, setIsStatsLoaded] = useState(false);
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  const [activeTab, setActiveTab] = useState<'timer' | 'test' | 'revision' | 'calendar'>('timer');
  const [calendarType, setCalendarType] = useState<'study' | 'questions' | 'revision'>('study');
  const [revisionSlots, setRevisionSlots] = useState<any[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('pulse_revision_slots') || '[]');
    } catch (e) {
      return [];
    }
  });
  const [subjectRevisionCounts, setSubjectRevisionCounts] = useState<Record<string, number>>(() => {
    try {
      return JSON.parse(localStorage.getItem('pulse_subject_revision_counts') || '{}');
    } catch (e) {
      return {};
    }
  });

  useEffect(() => {
    localStorage.setItem('pulse_subject_revision_counts', JSON.stringify(subjectRevisionCounts));
  }, [subjectRevisionCounts]);

  const [currentQuote, setCurrentQuote] = useState(MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)]);
  const [lastActivityTimestamp, setLastActivityTimestamp] = useState(Date.now());

  useEffect(() => {
    localStorage.setItem('pulse_revision_slots', JSON.stringify(revisionSlots));
    
    // Sync Revision Slots to Firestore for persistence across devices
    if (user && isStatsLoaded) {
      const syncRevision = async () => {
        try {
          const ref = doc(db, 'users', user.uid, 'data', 'revision');
          await setDoc(ref, { 
            slots: revisionSlots,
            subjectCounts: subjectRevisionCounts,
            lastUpdated: serverTimestamp() 
          }, { merge: true });
        } catch (err) {
          console.error("Revision Firestore Sync Err:", err);
        }
      };
      // Debounce sync slightly
      const timer = setTimeout(syncRevision, 2000);
      return () => clearTimeout(timer);
    }
  }, [revisionSlots, user, isStatsLoaded]);

  // Load Revision Data from Firestore
  useEffect(() => {
    if (user) {
      const ref = doc(db, 'users', user.uid, 'data', 'revision');
      getDoc(ref).then(snap => {
        if (snap.exists()) {
          const data = snap.data();
          if (data.slots) setRevisionSlots(data.slots);
          if (data.subjectCounts) setSubjectRevisionCounts(data.subjectCounts);
        }
      });
    }
  }, [user]);

  // Ref to avoid stale closures in timer and async operations
  const dailyStudySecondsRef = useRef(dailyStudySeconds);
  const completedStudyDaysRef = useRef(completedStudyDays);
  const targetHoursRef = useRef(targetHours);
  const questionTargetRef = useRef(questionTarget);
  const subjectStudySecondsRef = useRef(subjectStudySeconds);
  const subjectQuestionCountsRef = useRef(subjectQuestionCounts);
  const selectedSubjectRef = useRef(selectedSubject);
  const selectedChapterRef = useRef(selectedChapter);
  const currentQuestionsRef = useRef(currentQuestions);
  const elapsedSecondsRef = useRef(elapsedSeconds);
  const lastTickElapsedRef = useRef(0);
  const lastSavedProgressSecondsRef = useRef(0);
  const lastSyncedQuestionsRef = useRef(currentQuestions);
  const questionSyncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // New: Track session stats per chapter to fix attribution bugs
  const sessionChapterStatsRef = useRef<Record<string, Record<string, { seconds: number, questions: number }>>>({});
  const lastChapterSwitchSecondsRef = useRef(0);
  const lastChapterSwitchQuestionsRef = useRef(0);

  // Derived state for display to eliminate doubling (Pure Firestore + Current Live Delta)
  const todayKey = new Date().toDateString();
  
  const activeStudySecondsForToday = isTimerRunning ? elapsedSeconds : (dailyStudySeconds[todayKey] || 0);
  const activeQuestionsForToday = isTimerRunning ? currentQuestions : (dailyQuestionCounts[todayKey] || 0);
  
  const activeSubjectSeconds = useMemo(() => {
    const data = { ...(subjectStudySeconds[todayKey] || {}) };
    
    // 1. Add all completed segments from chapter switches in this tab's active session
    Object.entries(sessionChapterStatsRef.current).forEach(([sub, chapters]) => {
      let subTotal = 0;
      Object.values(chapters).forEach(stats => subTotal += stats.seconds);
      if (subTotal > 0) {
        data[sub] = (data[sub] || 0) + subTotal;
      }
    });

    // 2. Add current pending segment for the selected subject
    const currentSub = selectedSubject;
    if (isTimerRunning && currentSub) {
      const activeSegmentSeconds = Math.max(0, elapsedSeconds - lastChapterSwitchSecondsRef.current);
      data[currentSub] = (data[currentSub] || 0) + activeSegmentSeconds;
    }
    return data;
  }, [subjectStudySeconds, todayKey, isTimerRunning, selectedSubject, elapsedSeconds, sessionVersion]);

  const activeSubjectQuestions = useMemo(() => {
    const data = { ...(subjectQuestionCounts[todayKey] || {}) };
    
    // 1. Add all completed segments from chapter switches in this tab's active session
    Object.entries(sessionChapterStatsRef.current).forEach(([sub, chapters]) => {
      let subTotal = 0;
      Object.values(chapters).forEach(stats => subTotal += stats.questions);
      if (subTotal > 0) {
        data[sub] = (data[sub] || 0) + subTotal;
      }
    });

    // 2. Add current pending segment for the selected subject
    const currentSub = selectedSubject;
    if (isTimerRunning && currentSub) {
      const activeSegmentQuestions = Math.max(0, currentQuestions - lastChapterSwitchQuestionsRef.current);
      data[currentSub] = (data[currentSub] || 0) + activeSegmentQuestions;
    }
    return data;
  }, [subjectQuestionCounts, todayKey, isTimerRunning, selectedSubject, currentQuestions, sessionVersion]);

  // Sync refs safely: ONLY update selectedSubjectRef/selectedChapterRef when NOT running 
  // or via handleChapterSwitch to avoid race conditions during session segmentation.
  useEffect(() => {
    dailyStudySecondsRef.current = dailyStudySeconds;
    completedStudyDaysRef.current = completedStudyDays;
    targetHoursRef.current = targetHours;
    questionTargetRef.current = questionTarget;
    subjectStudySecondsRef.current = subjectStudySeconds;
    subjectQuestionCountsRef.current = subjectQuestionCounts;
    currentQuestionsRef.current = currentQuestions;
    elapsedSecondsRef.current = elapsedSeconds;
    
    // Only update these refs if timer NOT running or they match current state
    // To record segments correctly, we need these refs to point to the PREVIOUS subject until transition is complete
    if (!isTimerRunning) {
      selectedSubjectRef.current = selectedSubject;
      selectedChapterRef.current = selectedChapter;
    }

    if (isStatsLoaded) {
      if (lastSavedProgressSecondsRef.current === 0) lastSavedProgressSecondsRef.current = elapsedSeconds;
      if (lastTickElapsedRef.current === 0) lastTickElapsedRef.current = elapsedSeconds;
      if (lastChapterSwitchSecondsRef.current === 0) lastChapterSwitchSecondsRef.current = elapsedSeconds;
      if (lastChapterSwitchQuestionsRef.current === 0) lastChapterSwitchQuestionsRef.current = currentQuestions;
      if (lastSyncedQuestionsRef.current === 0) lastSyncedQuestionsRef.current = currentQuestions;
    }
  }, [dailyStudySeconds, completedStudyDays, targetHours, subjectStudySeconds, subjectQuestionCounts, selectedSubject, selectedChapter, currentQuestions, elapsedSeconds, isStatsLoaded, isTimerRunning]);

  // Mirror session to localStorage for real-time Dashboard/Progress sync
  useEffect(() => {
    if (isTimerRunning && startTime) {
      // Calculate duration spent specifically on the current chapter in this live session
      const currentChapterLiveSeconds = elapsedSeconds - lastChapterSwitchSecondsRef.current;
      
      const liveSession = {
        studySeconds: elapsedSeconds - accumulatedSeconds, // Total session time
        chapterSeconds: Math.max(0, currentChapterLiveSeconds), // Current chapter time
        questionsSolved: currentQuestions - lastSyncedQuestionsRef.current,
        isRunning: true,
        startTime,
        accumulatedSeconds,
        lastUpdate: Date.now()
      };
      localStorage.setItem('pulse_active_session', JSON.stringify(liveSession));
    } else {
      localStorage.removeItem('pulse_active_session');
    }
  }, [isTimerRunning, startTime, elapsedSeconds, currentQuestions, accumulatedSeconds]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
    });
    
    const handleGlobalActivity = () => setLastActivityTimestamp(Date.now());
    window.addEventListener('mousemove', handleGlobalActivity);
    window.addEventListener('keypress', handleGlobalActivity);
    window.addEventListener('touchstart', handleGlobalActivity);
    
    return () => {
      unsubscribe();
      window.removeEventListener('mousemove', handleGlobalActivity);
      window.removeEventListener('keypress', handleGlobalActivity);
      window.removeEventListener('touchstart', handleGlobalActivity);
    };
  }, []);

  const handleChapterSwitch = useCallback((newSubRaw: string, newChapter: string) => {
    const newSubject = newSubRaw ? newSubRaw.charAt(0).toUpperCase() + newSubRaw.slice(1).toLowerCase() : "";
    if (isTimerRunning) {
      const currentSub = selectedSubjectRef.current;
      const currentChap = selectedChapterRef.current;
      
      const timeDelta = elapsedSecondsRef.current - lastChapterSwitchSecondsRef.current;
      const questionDelta = currentQuestionsRef.current - lastChapterSwitchQuestionsRef.current;

      if (currentSub && currentChap && (timeDelta > 0 || questionDelta > 0)) {
        if (!sessionChapterStatsRef.current[currentSub]) sessionChapterStatsRef.current[currentSub] = {};
        if (!sessionChapterStatsRef.current[currentSub][currentChap]) {
          sessionChapterStatsRef.current[currentSub][currentChap] = { seconds: 0, questions: 0 };
        }
        sessionChapterStatsRef.current[currentSub][currentChap].seconds += Math.max(0, timeDelta);
        sessionChapterStatsRef.current[currentSub][currentChap].questions += Math.max(0, questionDelta);
        console.log(`[Timer] Segment recorded for ${currentSub}: ${timeDelta}s, ${questionDelta}q`);
      }

      // Update trackers for the NEW subject
      lastChapterSwitchSecondsRef.current = elapsedSecondsRef.current;
      lastChapterSwitchQuestionsRef.current = currentQuestionsRef.current;
      selectedSubjectRef.current = newSubject;
      selectedChapterRef.current = newChapter;
      setSessionVersion(v => v + 1);
    }
    
    if (newSubject !== selectedSubject) {
      setSelectedSubject(newSubject);
      localStorage.setItem('pulse_selected_subject', newSubject);
    }
    setSelectedChapter(newChapter);
    localStorage.setItem('pulse_selected_chapter', newChapter);
  }, [isTimerRunning, selectedSubject]);

  useEffect(() => {
    if (selectedSubject) {
      const exam = (localStorage.getItem('pulse_user_exam') || 'jee').toLowerCase();
      const year = localStorage.getItem('pulse_user_year') || '2027';
      const examId = `${exam}_${year}`;
      const subjectData = SYLLABUS_DATA[examId]?.[selectedSubject] || SYLLABUS_DATA[examId.split('_')[0]]?.[selectedSubject] || SYLLABUS_DATA.jee[selectedSubject];
      
      if (subjectData) {
        const chapters = subjectData.map((name: string) => ({ id: name, name }));
        setAvailableChapters(chapters);
        
        // Auto-select first chapter if none selected or if selected chapter not in new subject
        const currentChapters = chapters;
        if ((!selectedChapter || !currentChapters.find(c => c.id === selectedChapter)) && !isTimerRunning) {
          handleChapterSwitch(selectedSubject, currentChapters[0]?.id || '');
        }
      } else {
        setAvailableChapters([]);
        handleChapterSwitch(selectedSubject, '');
      }
    } else {
      setAvailableChapters([]);
      handleChapterSwitch('', '');
    }
  }, [selectedSubject]);

  useEffect(() => {
    if (selectedChapter) {
      localStorage.setItem('pulse_selected_chapter', selectedChapter);
    }
  }, [selectedChapter]);
  useEffect(() => {
    if (!user) {
      const localData = JSON.parse(localStorage.getItem('pulse_calendar_data') || '{}');
      const newQuestionCounts: Record<string, number> = {};
      const newStudySeconds: Record<string, number> = {};
      const newMockTestDates: string[] = [];
      const newMockTestDetails: Record<string, { completed: boolean, marks: string }> = {};
      const newCompletedStudy: string[] = [];
      const newCompletedQuestions: string[] = [];

      Object.entries(localData).forEach(([dateStr, data]: [string, any]) => {
        if (data.questionsSolved !== undefined) newQuestionCounts[dateStr] = data.questionsSolved;
        if (data.studySeconds !== undefined) newStudySeconds[dateStr] = data.studySeconds;
        
        if (data.isMockTest) {
          newMockTestDates.push(dateStr);
          newMockTestDetails[dateStr] = {
            completed: data.mockTestCompleted || false,
            marks: data.mockTestMarks || ''
          };
        }

        if (data.studySeconds >= targetHours * 3600) {
          newCompletedStudy.push(dateStr);
        }
        if (data.questionsSolved >= questionTarget) {
          newCompletedQuestions.push(dateStr);
        }
      });

      setDailyQuestionCounts(newQuestionCounts);
      setDailyStudySeconds(newStudySeconds);
      setMockTestDates(newMockTestDates);
      setMockTestDetails(newMockTestDetails);
      setCompletedStudyDays(newCompletedStudy);
      setCompletedQuestionDays(newCompletedQuestions);

      const today = new Date().toDateString();
      setCurrentQuestions(newQuestionCounts[today] || 0);
      setElapsedSeconds(newStudySeconds[today] || 0);
      
      setIsSyncing(false);
      return;
    }

    setIsSyncing(true);
    const statsCollectionRef = collection(db, 'users', user.uid, 'dailyStats');
    const today = new Date().toDateString();
    
    // Step 1: Initial Load via getDocs (much cheaper than long-lived listeners for history)
    getDocs(statsCollectionRef).then((snapshot) => {
      const newQuestionCounts: Record<string, number> = {};
      const newStudySeconds: Record<string, number> = {};
      const newSubjectSeconds: Record<string, Record<string, number>> = {};
      const newSubjectQuestions: Record<string, Record<string, number>> = {};
      const newMockTestDates: string[] = [];
      const newMockTestDetails: Record<string, { completed: boolean, marks: string }> = {};
      const newCompletedStudy: string[] = [];
      const newCompletedQuestions: string[] = [];

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        const dateStr = doc.id;

        if (data.questionsSolved !== undefined) newQuestionCounts[dateStr] = data.questionsSolved;
        if (data.studySeconds !== undefined) newStudySeconds[dateStr] = data.studySeconds;
        if (data.subjectSeconds !== undefined) newSubjectSeconds[dateStr] = data.subjectSeconds;
        if (data.subjectQuestions !== undefined) newSubjectQuestions[dateStr] = data.subjectQuestions;
        
        if (data.isMockTest) {
          newMockTestDates.push(dateStr);
          newMockTestDetails[dateStr] = {
            completed: data.mockTestCompleted || false,
            marks: data.mockTestMarks || ''
          };
        }

        if (data.studySeconds >= targetHoursRef.current * 3600) {
          newCompletedStudy.push(dateStr);
        }
        if (data.questionsSolved >= questionTarget) {
          newCompletedQuestions.push(dateStr);
        }
      });

      setDailyQuestionCounts(newQuestionCounts);
      setDailyStudySeconds(newStudySeconds);
      setSubjectStudySeconds(newSubjectSeconds);
      setSubjectQuestionCounts(newSubjectQuestions);
      setMockTestDates(newMockTestDates);
      setMockTestDetails(newMockTestDetails);
      setCompletedStudyDays(newCompletedStudy);
      setCompletedQuestionDays(newCompletedQuestions);
      
      setCurrentQuestions(newQuestionCounts[today] || 0);
      setElapsedSeconds(prev => prev === 0 ? (newStudySeconds[today] || 0) : prev);
      
      setIsStatsLoaded(true);
      setIsSyncing(false);
      setLastSyncTime(new Date());
      
      // Initialize refs to avoid double counting on first session start
      lastSyncedQuestionsRef.current = newQuestionCounts[today] || 0;
      lastSavedProgressSecondsRef.current = newStudySeconds[today] || 0;
      currentQuestionsRef.current = newQuestionCounts[today] || 0;
      elapsedSecondsRef.current = newStudySeconds[today] || 0;
    }).catch(err => {
      console.error("Initial Stats Load Error:", err);
      setIsSyncing(false);
    });

    // Step 2: Targeted Listener only for Today's document (saves massive reads on history)
    const statsRef = doc(db, 'users', user.uid, 'dailyStats', today);
    const unsubscribe = onSnapshot(statsRef, (docSnap) => {
      if (!docSnap.exists()) return;
      
      const data = docSnap.data();
      const dateStr = today;

      setDailyQuestionCounts(prev => {
        const firestoreCount = data.questionsSolved || 0;
        if (isTimerRunning && dateStr === today && (prev[dateStr] || 0) > firestoreCount) return prev;
        return { ...prev, [dateStr]: firestoreCount };
      });

      setDailyStudySeconds(prev => {
        const firestoreSeconds = data.studySeconds || 0;
        if (isTimerRunning && dateStr === today && (prev[dateStr] || 0) > firestoreSeconds) return prev;
        return { ...prev, [dateStr]: firestoreSeconds };
      });
      
      setSubjectStudySeconds(prev => ({ ...prev, [today]: data.subjectSeconds || {} }));
      setSubjectQuestionCounts(prev => ({ ...prev, [today]: data.subjectQuestions || {} }));
      
      setCurrentQuestions(prev => {
        if (isTimerRunning) return prev;
        return data.questionsSolved || 0;
      });
      
      setElapsedSeconds(prev => {
        const firestoreTime = Math.min(data.studySeconds || 0, 86400);
        if (isTimerRunning) return prev;
        return firestoreTime;
      });

      setLastSyncTime(new Date());
    }, (error) => {
      console.error("Today's Stats Sync Error:", error);
    });

    return () => unsubscribe();
  }, [user, questionTarget]);

  // Timer State Sync from Firestore or localStorage
  useEffect(() => {
    if (!user) {
      const localTimer = localStorage.getItem('pulse_timer_state');
      if (localTimer) {
        const data = JSON.parse(localTimer);
        setIsTimerRunning(data.isRunning || false);
        setStartTime(data.startTime || null);
        setAccumulatedSeconds(data.accumulatedSeconds || 0);

        // Resume trackers
        if (data.isRunning && data.startTime) {
          if (lastChapterSwitchSecondsRef.current === 0) {
            lastChapterSwitchSecondsRef.current = data.accumulatedSeconds || 0;
            lastChapterSwitchQuestionsRef.current = currentQuestionsRef.current;
          }
        }
      }
      setIsTimerLoading(false);
      return;
    }

    const timerRef = doc(db, 'users', user.uid, 'data', 'timer');
    const unsubscribe = onSnapshot(timerRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setIsTimerRunning(data.isRunning || false);
        setStartTime(data.startTime || null);
        setAccumulatedSeconds(data.accumulatedSeconds || 0);

        // Resume trackers from Firestore state
        if (data.isRunning && data.startTime) {
          if (lastChapterSwitchSecondsRef.current === 0) {
            lastChapterSwitchSecondsRef.current = data.accumulatedSeconds || 0;
            lastChapterSwitchQuestionsRef.current = currentQuestionsRef.current;
          }
        }
      }
      setIsTimerLoading(false);
    }, (error) => {
      console.error("Timer Sync Error:", error);
      setIsTimerLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Global Stats - Periodic Fetch (Every 5 minutes) to conserve read quota
  useEffect(() => {
    const fetchGlobalStats = async () => {
      try {
        const docRef = doc(db, 'stats', 'global');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setGlobalStats(docSnap.data() as any);
        }
      } catch (error) {
        console.error("Global Stats Fetch Error:", error);
      }
    };

    fetchGlobalStats();
    // Ultra Scale: Disable periodic global stats update. User gets fresh data on entry only.
    return () => {};
  }, []);

  // Motivational Quote Rotation - Once a day
  useEffect(() => {
    const today = new Date().toDateString();
    let hash = 0;
    for (let i = 0; i < today.length; i++) {
      hash = today.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % MOTIVATIONAL_QUOTES.length;
    setCurrentQuote(MOTIVATIONAL_QUOTES[index]);
  }, []);

  // Midnight Reset Watcher
  useEffect(() => {
    const checkMidnight = () => {
      const now = new Date();
      if (now.getHours() === 0 && now.getMinutes() === 0) {
        const today = now.toDateString();
        console.log("Midnight detected. Resetting daily stats.");
        setElapsedSeconds(0);
        setCurrentQuestions(0);
        setDailyStudySeconds(prev => ({ ...prev, [today]: 0 }));
        setDailyQuestionCounts(prev => ({ ...prev, [today]: 0 }));
        
        // If timer was running, reset it too
        if (isTimerRunning) {
          setStartTime(now.getTime());
          setAccumulatedSeconds(0);
        }
      }
    };

    const interval = setInterval(checkMidnight, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  // Load available subjects from syllabus
  useEffect(() => {
    const exam = (localStorage.getItem('pulse_user_exam') || 'jee').toLowerCase();
    const year = localStorage.getItem('pulse_user_year') || '2027';
    const examBase = exam === 'jee' ? 'jee' : exam;
    const examId = `${examBase}_${year}`;
    
    const normalizedExamId = examId.includes('boards') && !examId.endsWith('th') ? `${examId}th` : examId;
    const syllabus = SYLLABUS_DATA[normalizedExamId] || SYLLABUS_DATA[examId] || SYLLABUS_DATA[examBase] || SYLLABUS_DATA.jee;
    
    const subjects = Object.keys(syllabus);
    setAvailableSubjects(subjects);
    
    // Only set default if current selected subject is not in the new list or is empty
    if (subjects.length > 0 && !isTimerRunning) {
      const currentStored = localStorage.getItem('pulse_selected_subject');
      if (!currentStored || !subjects.includes(currentStored)) {
        if (!selectedSubject || !subjects.includes(selectedSubject)) {
          setSelectedSubject(subjects[0]);
          localStorage.setItem('pulse_selected_subject', subjects[0]);
        }
      } else if (!selectedSubject) {
        setSelectedSubject(currentStored);
      }
    }
  }, [user, isTimerRunning]); // Added isTimerRunning to dependencies to prevent auto-switches

  // Timer logic
  useEffect(() => {
    let interval: NodeJS.Timeout;
    let periodicSave: NodeJS.Timeout;

    if (isTimerRunning && startTime) {
      lastTickElapsedRef.current = elapsedSeconds;
      let tickCount = 0;
      interval = setInterval(() => {
        const now = Date.now();
        const today = new Date().toDateString();
        tickCount++;
        
        // Midnight carryover fix
        const sessionStartTime = new Date(startTime);
        if (sessionStartTime.toDateString() !== today) {
          console.log("Day changed mid-session. Resetting timer for new day.");
          // Save the time for the previous day (up to midnight)
          const midnight = new Date();
          midnight.setHours(0, 0, 0, 0);
          const secondsUntilMidnight = Math.floor((midnight.getTime() - startTime) / 1000);
          const totalForPrevDay = accumulatedSeconds + secondsUntilMidnight;
          const deltaForPrevDay = totalForPrevDay - lastSavedProgressSecondsRef.current;
          
          saveToFirestore(sessionStartTime.toDateString(), {
            studySeconds: totalForPrevDay,
            date: sessionStartTime.toDateString()
          });

          // Save final progress for the previous day
          const currentSub = selectedSubjectRef.current;
          const currentChap = selectedChapterRef.current;
          if (user && currentChap && currentSub && deltaForPrevDay > 0) {
            const exam = (localStorage.getItem('pulse_user_exam') || 'jee').toLowerCase();
            const year = localStorage.getItem('pulse_user_year') || '2027';
            const examBase = exam === 'jee' ? 'jee' : exam;
            const examId = `${examBase}_${year}`;
            const progressRef = doc(db, 'users', user.uid, 'data', `progress-${examId}`);
            setDoc(progressRef, {
              progress: {
                [currentSub]: {
                  [currentChap]: {
                    studyTime: increment(deltaForPrevDay)
                  }
                }
              }
            }, { merge: true }).catch(err => console.error("Midnight progress save failed:", err));
          }

          setStartTime(midnight.getTime());
          setAccumulatedSeconds(0);
          setElapsedSeconds(0);
          lastTickElapsedRef.current = 0;
          lastSavedProgressSecondsRef.current = 0;
          
          // CRITICAL: Save the reset state to Firestore/localStorage so refreshes don't restore old session
          saveTimerState(true, midnight.getTime(), 0);
          return;
        }

        const sessionSeconds = Math.floor((now - startTime) / 1000);
        const totalElapsed = accumulatedSeconds + sessionSeconds;
        
        setElapsedSeconds(totalElapsed);
        setSessionTabSeconds(sessionSeconds);
        
        // Only update these every 5 seconds to reduce re-renders of heavy components
        if (tickCount % 5 === 0) {
          // REMOVED: local updates to dailyStudySeconds and subjectStudySeconds here 
          // because it causes doubling when combined with Firestore increment snapshot.
          // The UI will now calculate (Persisted + SessionDelta) for active display.
          
          const currentSub = selectedSubjectRef.current;
          const currentChap = selectedChapterRef.current;
          
          // Still update chapter switch trackers for internal session accounting
          // but we don't push them to the shared dailyStudySeconds state anymore.
          
          if (totalElapsed >= targetHoursRef.current * 3600 && !completedStudyDaysRef.current.includes(today)) {
            setCompletedStudyDays(prev => [...prev, today]);
          }
        }
      }, 1000);

    }
    return () => {
      clearInterval(interval);
    };
  }, [isTimerRunning, startTime, accumulatedSeconds, selectedSubject, isStatsLoaded]);

  const saveToFirestore = async (dateStr: string, data: any) => {
    // Safety check: Prevent saving unrealistic study time (more than 24 hours)
    if (data.studySeconds && data.studySeconds > 86400) {
      console.error("Unrealistic study time detected:", data.studySeconds);
      data.studySeconds = 86400; // Cap at 24 hours
    }

    // Optimistic / Local sync for all users (Fixed: ensure UI updates immediately)
    if (data.questionsSolved !== undefined) {
      setDailyQuestionCounts(prev => ({ ...prev, [dateStr]: data.questionsSolved }));
      if (data.questionsSolved >= (questionTargetRef.current || questionTarget)) {
        setCompletedQuestionDays(prev => Array.from(new Set([...prev, dateStr])));
      }
    }
    if (data.studySeconds !== undefined) {
      setDailyStudySeconds(prev => ({ ...prev, [dateStr]: data.studySeconds }));
      if (data.studySeconds >= (targetHoursRef.current || targetHours) * 3600) {
        setCompletedStudyDays(prev => Array.from(new Set([...prev, dateStr])));
      }
    }
    if (data.isMockTest !== undefined) {
      if (data.isMockTest) {
        setMockTestDates(prev => Array.from(new Set([...prev, dateStr])));
      } else {
        setMockTestDates(prev => prev.filter(d => d !== dateStr));
      }
    }
    if (data.mockTestCompleted !== undefined || data.mockTestMarks !== undefined) {
      setMockTestDetails(prev => ({
        ...prev,
        [dateStr]: {
          completed: data.mockTestCompleted ?? prev[dateStr]?.completed ?? false,
          marks: data.mockTestMarks ?? prev[dateStr]?.marks ?? ''
        }
      }));
    }

    if (!user) {
      // Save to localStorage for guest
      const localData = JSON.parse(localStorage.getItem('pulse_calendar_data') || '{}');
      localData[dateStr] = { ...(localData[dateStr] || {}), ...data };
      localStorage.setItem('pulse_calendar_data', JSON.stringify(localData));
      return;
    }
    try {
      const docRef = doc(db, 'users', user.uid, 'dailyStats', dateStr);
      await setDoc(docRef, {
        ...data,
        lastUpdated: serverTimestamp()
      }, { merge: true });
    } catch (error) {
      console.error("Error saving to Firestore:", error);
    }
  };

  const saveTimerState = async (running: boolean, start: number | null, accumulated: number) => {
    if (!user) {
      localStorage.setItem('pulse_timer_state', JSON.stringify({
        isRunning: running,
        startTime: start,
        accumulatedSeconds: accumulated
      }));
      return;
    }
    try {
      const timerRef = doc(db, 'users', user.uid, 'data', 'timer');
      await setDoc(timerRef, {
        isRunning: running,
        startTime: start,
        accumulatedSeconds: accumulated,
        lastUpdated: serverTimestamp()
      }, { merge: true });
    } catch (error) {
      console.error("Error saving timer state:", error);
    }
  };

  const [streak, setStreak] = useState(0);

  // Memoized streak calculation for real-time updates
  useEffect(() => {
    const s = calculateStreak({ ...dailyStudySeconds, [todayKey]: activeStudySecondsForToday }, targetHours);
    setStreak(s);
    
    // Auto-sync streak to leaderboard on load if stats were just loaded
    if (isStatsLoaded && user) {
      const leaderboardRef = doc(db, 'leaderboard', user.uid);
      getDoc(leaderboardRef).then(snap => {
        if (snap.exists()) {
          const data = snap.data();
          if (data.streak !== s) {
            updateDoc(leaderboardRef, { streak: s, lastUpdated: serverTimestamp() });
          }
        }
      });
    }
  }, [dailyStudySeconds, activeStudySecondsForToday, targetHours, isStatsLoaded, user, todayKey]);

  const calculateStreak = (secondsMap: Record<string, number>, target: number) => {
    if (!secondsMap || Object.keys(secondsMap).length === 0) return 0;
    
    let currentStreak = 0;
    let checkDate = new Date();
    checkDate.setHours(0, 0, 0, 0);
    const targetSeconds = 30 * 60; // 30 minutes minimum for a streak day as requested by user

    const todayStr = checkDate.toDateString();
    const todaySeconds = secondsMap[todayStr] || 0;

    // If today's goal isn't met, we check if yesterday's was. 
    // If neither today (so far) nor yesterday met 30m target, streak is 0.
    if (todaySeconds < targetSeconds) {
      const yesterday = new Date(checkDate);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toDateString();
      if ((secondsMap[yesterdayStr] || 0) < targetSeconds) return 0;
      // Start counting backwards from yesterday
      checkDate = yesterday;
    }

    // Safety: prevent infinite loops if dates go weird
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

  const syncGlobalProgress = async (questions: number, hours: number) => {
    if (!user) return;
    try {
      const leaderboardRef = doc(db, 'leaderboard', user.uid);
      const leaderboardSnap = await getDoc(leaderboardRef);
      const currentData = leaderboardSnap.exists() ? leaderboardSnap.data() : { totalQuestions: 0, totalHours: 0 };
      const isNewUser = !leaderboardSnap.exists();

      // Calculate new totals locally for scoring
      const newTotalQuestions = (currentData.totalQuestions || 0) + questions;
      const newTotalHours = (currentData.totalHours || 0) + hours;

      // Better Scoring Formula: A balanced average between Questions and Hours
      // We weight 1 Hour similarly to 10 Questions for the "average" feel, then divide by 2.
      // Final formula: (Questions + (Hours * 10)) / 2
      
      let finalScore = Math.round((newTotalQuestions + (newTotalHours * 10)) / 2);

      // Anti-Cheat Mechanism: Eliminate HYPER-FAKE scores
      // 1. Zero/Near-zero study time but many questions (e.g. 0hr study with many Qs)
      if (newTotalHours < 0.1 && newTotalQuestions > 25) {
        finalScore = 0; // Eliminate from rankings
      }
      
      // 2. Impossible Rate (e.g. >80 questions per hour consistently)
      const globalRate = newTotalQuestions / Math.max(newTotalHours, 0.05);
      if (globalRate > 80 && newTotalQuestions > 35) {
        finalScore = 0; // Eliminate from rankings
      }

      // 3. Current session validation
      const currentRate = questions / Math.max(hours, 0.01);
      if (currentRate > 120 && questions > 15) {
        finalScore = Math.round(currentData.rankScore || 0); 
      }

      const newStreak = calculateStreak(dailyStudySeconds, targetHours);

      // Update Leaderboard
      await setDoc(leaderboardRef, {
        displayName: user.displayName || user.email?.split('@')[0] || 'Anonymous',
        photoURL: user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName || user.email}&background=random`,
        totalQuestions: newTotalQuestions,
        totalHours: newTotalHours,
        rankScore: Math.floor(finalScore),
        streak: newStreak,
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

  // Add specialized bootstrap function for leaderboard
  const bootstrapLeaderboard = async () => {
    if (!user || !isStatsLoaded) return;
    try {
      const today = new Date().toDateString();
      const currentQuestions = dailyQuestionCounts[today] || 0;
      const currentSeconds = dailyStudySeconds[today] || 0;
      
      // Only bootstrap if they have some data or first time
      await syncGlobalProgress(0, 0); 
      console.log("Leaderboard bootstrapped for user:", user.uid);
    } catch (error) {
      console.error("Leaderboard bootstrap error:", error);
    }
  };

  useEffect(() => {
    if (isAuthReady && user && isStatsLoaded) {
      bootstrapLeaderboard();
    }
  }, [isAuthReady, !!user, isStatsLoaded]);

  const toggleTimer = async () => {
    if (!isStatsLoaded || isTimerLoading || isSyncingRef.current) return;
    isSyncingRef.current = true;
    
    try {
      if (settings?.timerSoundEnabled) {
      if (settings.timerSoundType === 'tank') {
        playTankSound();
      } else if (settings.timerSoundType === 'jet') {
        playJetSound();
      } else {
        playF1Sound();
      }
    } else {
      playTickSound();
    }
    
    const today = new Date().toDateString();
    if (!isTimerRunning) {
      const now = Date.now();
      const newAccumulated = elapsedSeconds;
      setStartTime(now);
      setAccumulatedSeconds(newAccumulated);
      setIsTimerRunning(true);
      setSessionTabSeconds(0);
      setSessionTabQuestions(0);
      
      // CRITICAL: Force update refs before starting to ensure correct attribution
      selectedSubjectRef.current = selectedSubject;
      selectedChapterRef.current = selectedChapter;
      
      // Initialize chapter transition trackers on start to prevent attribution artifacts
      lastChapterSwitchSecondsRef.current = newAccumulated;
      lastChapterSwitchQuestionsRef.current = currentQuestions;
      lastTickElapsedRef.current = newAccumulated;
      sessionChapterStatsRef.current = {};
      
      await saveTimerState(true, now, newAccumulated);
    } else {
      setIsTimerRunning(false);
      const now = Date.now();
      const sessionSeconds = Math.max(0, Math.floor((now - startTime) / 1000));
      const finalElapsed = accumulatedSeconds + sessionSeconds;
      const sessionQuestions = sessionTabQuestions;
      
      // Definitions moved UP to prevent ReferenceError
      const sessionTotalStudySeconds = sessionSeconds;
      const sessionTotalQuestions = sessionQuestions;
      const today = new Date().toDateString();

      setElapsedSeconds(finalElapsed);
      setAccumulatedSeconds(finalElapsed);
      setStartTime(null);
      setSessionTabSeconds(0);
      setSessionTabQuestions(0);
      
      const sessionHours = sessionSeconds / 3600;

      const exam = (localStorage.getItem('pulse_user_exam') || 'jee').toLowerCase();
      const year = localStorage.getItem('pulse_user_year') || '2027';
      const examBase = exam === 'jee' ? 'jee' : exam;
      const examId = `${examBase}_${year}`;
      const progressRef = doc(db, 'users', user.uid, 'data', `progress-${examId}`);

      const currentSub = selectedSubjectRef.current;
      const currentChap = selectedChapterRef.current;
      const finalTimeDeltaForChapter = finalElapsed - lastChapterSwitchSecondsRef.current;
      const finalQuestionDeltaForChapter = currentQuestions - lastChapterSwitchQuestionsRef.current;

      // 1. Accumulate session segments locally per chapter to avoid multiple increment objects for the same field
      const localChapterDelta: Record<string, Record<string, { seconds: number, questions: number }>> = {};
      
      const rollup = (sub: string, chap: string, s: number, q: number) => {
        if (!localChapterDelta[sub]) localChapterDelta[sub] = {};
        if (!localChapterDelta[sub][chap]) localChapterDelta[sub][chap] = { seconds: 0, questions: 0 };
        localChapterDelta[sub][chap].seconds += s;
        localChapterDelta[sub][chap].questions += q;
      };

      // Add historical segments from switches
      Object.entries(sessionChapterStatsRef.current).forEach(([sub, chapters]) => {
        Object.entries(chapters).forEach(([chap, stats]) => {
          if (stats.seconds > 0 || stats.questions > 0) {
            rollup(sub, chap, stats.seconds, stats.questions);
          }
        });
      });

      // Add final segment since last switch/tick
      if (currentSub && currentChap && (finalTimeDeltaForChapter > 0 || finalQuestionDeltaForChapter > 0)) {
        rollup(currentSub, currentChap, Math.max(0, finalTimeDeltaForChapter), Math.max(0, finalQuestionDeltaForChapter));
      }
      
      // 2. Convert local delta to Firestore increment updates
      const chapterUpdates: Record<string, any> = {};
      Object.entries(localChapterDelta).forEach(([sub, chapters]) => {
        Object.entries(chapters).forEach(([chap, stats]) => {
          if (!chapterUpdates[sub]) chapterUpdates[sub] = {};
          chapterUpdates[sub][chap] = {
            studyTime: increment(stats.seconds),
            questions: increment(stats.questions)
          };
        });
      });

      // 3. Construct updates for dailyStats subject-wise tracking
      const sessionSubTotals: Record<string, { seconds: number, questions: number }> = {};
      Object.entries(localChapterDelta).forEach(([sub, chapters]) => {
        if (!sessionSubTotals[sub]) sessionSubTotals[sub] = { seconds: 0, questions: 0 };
        Object.values(chapters).forEach(stats => {
          sessionSubTotals[sub].seconds += stats.seconds;
          sessionSubTotals[sub].questions += stats.questions;
        });
      });

      // Optimistic Local State Update to prevent "vanished subjects" during sync delays
      setDailyStudySeconds(prev => ({
        ...prev,
        [today]: (prev[today] || 0) + sessionTotalStudySeconds
      }));
      setDailyQuestionCounts(prev => ({
        ...prev,
        [today]: (prev[today] || 0) + sessionTotalQuestions
      }));
      setSubjectStudySeconds(prev => {
        const newDayData = { ...(prev[today] || {}) };
        Object.entries(sessionSubTotals).forEach(([sub, stats]) => {
          newDayData[sub] = (newDayData[sub] || 0) + stats.seconds;
        });
        return { ...prev, [today]: newDayData };
      });
      setSubjectQuestionCounts(prev => {
        const newDayData = { ...(prev[today] || {}) };
        Object.entries(sessionSubTotals).forEach(([sub, stats]) => {
          newDayData[sub] = (newDayData[sub] || 0) + stats.questions;
        });
        return { ...prev, [today]: newDayData };
      });

      // Reset session accumulators
      sessionChapterStatsRef.current = {};
      lastChapterSwitchSecondsRef.current = finalElapsed;
      lastChapterSwitchQuestionsRef.current = currentQuestions;

      if (!user) {
        setDailyStudySeconds(prev => ({ ...prev, [today]: finalElapsed }));
        const localData = JSON.parse(localStorage.getItem('pulse_calendar_data') || '{}');
        if (!localData[today]) localData[today] = {};
        localData[today].studySeconds = finalElapsed;
        localStorage.setItem('pulse_calendar_data', JSON.stringify(localData));
        return;
      }

      const batch = writeBatch(db);
      const statsRef = doc(db, 'users', user.uid, 'dailyStats', today);

      // Update Daily Stats using increment to ensure accuracy amidst multi-device sync
      const dailyStatsData: any = {
        studySeconds: increment(sessionTotalStudySeconds),
        questionsSolved: increment(sessionTotalQuestions),
        lastUpdated: serverTimestamp(),
        date: today
      };

      // Add segmented subject updates to dailyStats using dot notation
      Object.entries(sessionSubTotals).forEach(([sub, stats]) => {
        if (stats.seconds > 0) dailyStatsData[`subjectSeconds.${sub}`] = increment(stats.seconds);
        if (stats.questions > 0) dailyStatsData[`subjectQuestions.${sub}`] = increment(stats.questions);
      });

      batch.set(statsRef, dailyStatsData, { merge: true });

      // Update Subject Progress (Chapter level)
      if (Object.keys(chapterUpdates).length > 0) {
        batch.set(progressRef, { progress: chapterUpdates }, { merge: true });
      }

      // Update Leaderboard
      const leaderboardRef = doc(db, 'leaderboard', user.uid);
      batch.set(leaderboardRef, {
        totalQuestions: increment(sessionTotalQuestions),
        totalHours: increment(sessionHours),
        lastUpdated: serverTimestamp()
      }, { merge: true });

      try {
        await batch.commit();
        await saveTimerState(false, null, finalElapsed); // Moved here to ensure firestore commit first
        lastSyncedQuestionsRef.current = currentQuestionsRef.current;
        lastSavedProgressSecondsRef.current = finalElapsed;
        lastTickElapsedRef.current = finalElapsed;
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/dailyStats/${today}`);
      }
    }
    } catch (error) {
      console.error("Timer toggle error:", error);
    } finally {
      isSyncingRef.current = false;
    }
  };

  const updateQuestions = useCallback(async (val: number) => {
    const today = new Date().toDateString();
    
    // Calculate REAL delta from the current processed total to prevent intra-render issues
    const delta = val - currentQuestionsRef.current;
    if (delta === 0) return;

    // Update ref immediately
    currentQuestionsRef.current = val;
    
    // Update local state for responsiveness
    setCurrentQuestions(val);
    if (isTimerRunning) {
      setSessionTabQuestions(prev => prev + delta);
    }

    const currentSub = selectedSubjectRef.current;

    if (!user) {
      const localData = JSON.parse(localStorage.getItem('pulse_calendar_data') || '{}');
      if (!localData[today]) localData[today] = {};
      localData[today].questionsSolved = (localData[today].questionsSolved || 0) + delta;
      const todaySubQ = { ...(localData[today].subjectQuestions || {}) };
      if (currentSub) todaySubQ[currentSub] = (todaySubQ[currentSub] || 0) + delta;
      localData[today].subjectQuestions = todaySubQ;
      localStorage.setItem('pulse_calendar_data', JSON.stringify(localData));
      return;
    }

    // Debounce Firestore Sync for Questions when timer is NOT running
    if (!isTimerRunning) {
      if (questionSyncTimeoutRef.current) clearTimeout(questionSyncTimeoutRef.current);
      questionSyncTimeoutRef.current = setTimeout(async () => {
        try {
          const syncDelta = val - lastSyncedQuestionsRef.current;
          if (syncDelta <= 0) return;

          const statsRef = doc(db, 'users', user.uid, 'dailyStats', today);
          const updates: any = {
            questionsSolved: increment(syncDelta),
            lastUpdated: serverTimestamp(),
            date: today
          };
          if (currentSub) updates[`subjectQuestions.${currentSub}`] = increment(syncDelta);

          await setDoc(statsRef, updates, { merge: true });
          
          const leaderboardRef = doc(db, 'leaderboard', user.uid);
          await setDoc(leaderboardRef, {
            totalQuestions: increment(syncDelta),
            lastUpdated: serverTimestamp()
          }, { merge: true });

          lastSyncedQuestionsRef.current = val;
        } catch (error) {
          console.error("Idle question sync error:", error);
        }
      }, 3000);
    }
  }, [user, isTimerRunning]);

  const removeOneHour = useCallback(async () => {
    const today = new Date().toDateString();
    const newSeconds = Math.max(0, elapsedSecondsRef.current - 3600);
    
    setElapsedSeconds(newSeconds);
    setAccumulatedSeconds(prev => Math.max(0, prev - 3600));
    setDailyStudySeconds(prev => ({ ...prev, [today]: newSeconds }));
    
    let updatedSubjectSeconds = { ...(subjectStudySecondsRef.current[today] || {}) };
    const currentSub = selectedSubjectRef.current;
    if (currentSub) {
      updatedSubjectSeconds[currentSub] = Math.max(0, (updatedSubjectSeconds[currentSub] || 0) - 3600);
      setSubjectStudySeconds(prev => ({
        ...prev,
        [today]: updatedSubjectSeconds
      }));
    }

    if (!user) {
      const localData = JSON.parse(localStorage.getItem('pulse_calendar_data') || '{}');
      if (!localData[today]) localData[today] = {};
      localData[today].studySeconds = newSeconds;
      localData[today].subjectSeconds = updatedSubjectSeconds;
      localStorage.setItem('pulse_calendar_data', JSON.stringify(localData));
      return;
    }

    try {
      const docRef = doc(db, 'users', user.uid, 'dailyStats', today);
      await setDoc(docRef, {
        studySeconds: newSeconds,
        subjectSeconds: updatedSubjectSeconds,
        lastUpdated: serverTimestamp()
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/dailyStats/${today}`);
    }
  }, [user]);

  // 12-hour Auto-Off Safety Protocol
  const SESSION_LIMIT = 12 * 3600;
  const INACTIVITY_LIMIT_MS = 7 * 3600 * 1000;

  // DATA REPAIR UTILITY - Runs once to fix corrupted "doubled/tripled" values
  useEffect(() => {
    const repairData = async () => {
      if (!user || !isStatsLoaded) return;
      const repairFlag = `pulse_repair_v4_${user.uid}`;
      if (localStorage.getItem(repairFlag)) return;

      console.log("Starting data integrity check...");
      const batch = writeBatch(db);
      let needsRepair = false;

      // 1. Sanitize unrealistic daily totals
      const daysToRepair = Object.entries(dailyStudySeconds).filter(([_, s]) => (s as number) > 18 * 3600); 
      for (const [dateStr, seconds] of daysToRepair) {
        console.warn(`Repairing unrealistic study time for ${dateStr}`);
        const statsRef = doc(db, 'users', user.uid, 'dailyStats', dateStr);
        batch.update(statsRef, { 
          studySeconds: 12 * 3600,
          subjectSeconds: {} // Clear subjects to ensure ratio is valid
        }); 
        needsRepair = true;
      }

      // 2. Sanitize unrealistic question counts
      const suspiciousQuestionDays = Object.entries(dailyQuestionCounts).filter(([_, q]) => (q as number) > 1200);
      for (const [dateStr, count] of suspiciousQuestionDays) {
          const statsRef = doc(db, 'users', user.uid, 'dailyStats', dateStr);
          batch.update(statsRef, { 
            questionsSolved: 300,
            subjectQuestions: {} // Clear subjects to ensure ratio is valid
          }); 
          needsRepair = true;
      }

      // 3. Sanitize Progress collection (Chapter stats)
      try {
        const exam = (localStorage.getItem('pulse_user_exam') || 'jee').toLowerCase();
        const year = localStorage.getItem('pulse_user_year') || '2027';
        const examId = `${exam}_${year}`;
        const progressRef = doc(db, 'users', user.uid, 'data', `progress-${examId}`);
        const progressSnap = await getDoc(progressRef);
        
        if (progressSnap.exists()) {
            const progressData = progressSnap.data().progress || {};
            let pRepair = false;
            const cleanedProgress = JSON.parse(JSON.stringify(progressData));
            
            Object.entries(progressData).forEach(([subject, chapters]: [string, any]) => {
                Object.entries(chapters).forEach(([chapterId, chData]: [string, any]) => {
                    if ((chData.studyTime || 0) > 100 * 3600) { 
                        cleanedProgress[subject][chapterId].studyTime = 20 * 3600;
                        pRepair = true;
                    }
                    if ((chData.questions || 0) > 2000) {
                        cleanedProgress[subject][chapterId].questions = 300;
                        pRepair = true;
                    }
                });
            });
            
            if (pRepair) {
                batch.update(progressRef, { progress: cleanedProgress });
                needsRepair = true;
            }
        }
      } catch (e) { console.error("Repair progress error:", e); }

      if (needsRepair) {
        await batch.commit();
        console.log("Data repair complete.");
      }
      localStorage.setItem(repairFlag, 'true');
    };

    repairData();
  }, [user, isStatsLoaded, dailyStudySeconds, dailyQuestionCounts]);

  const toggleMockTest = async (dateStr: string) => {
    const isCurrentlyMock = mockTestDates.includes(dateStr);
    
    if (isCurrentlyMock) {
      await deleteMockTest(dateStr);
    } else {
      await saveToFirestore(dateStr, {
        isMockTest: true,
        date: dateStr
      });
    }
  };

  const updateMockTestDetail = async (dateStr: string, completed: boolean, marks: string) => {
    await saveToFirestore(dateStr, {
      mockTestCompleted: completed,
      mockTestMarks: marks,
      isMockTest: true,
      date: dateStr
    });
  };

  const deleteMockTest = async (dateStr: string) => {
    await saveToFirestore(dateStr, {
      isMockTest: false,
      mockTestCompleted: false,
      mockTestMarks: '',
      date: dateStr
    });
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
    const date = new Date(year, month, d);
    const dateStr = date.toDateString();
    let val = dailyStudySeconds[dateStr] || 0;
    if (dateStr === todayKey) val = activeStudySecondsForToday;
    return val;
  }).reduce((a, b) => a + b, 0);

  const monthQuestionCount = Array.from({ length: totalDays }, (_, i) => {
    const d = i + 1;
    const date = new Date(year, month, d);
    const dateStr = date.toDateString();
    let val = dailyQuestionCounts[dateStr] || 0;
    if (dateStr === todayKey) val = activeQuestionsForToday;
    return val;
  }).reduce((a, b) => a + b, 0);

  const monthStudyHours = (monthStudySeconds / 3600).toFixed(1);

  const barChartData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toDateString();
    let seconds = dailyStudySeconds[dateStr] || 0;
    let questions = dailyQuestionCounts[dateStr] || 0;
    
    if (dateStr === todayKey) {
      seconds = activeStudySecondsForToday;
      questions = activeQuestionsForToday;
    }

    return {
      name: d.toLocaleDateString('default', { weekday: 'short' }),
      hours: Number((seconds / 3600).toFixed(1)),
      questions: questions,
      fullDate: dateStr
    };
  });

  useEffect(() => {
    localStorage.setItem('pulse_calendar_events', JSON.stringify(markedEvents));
  }, [markedEvents]);

  const renderDay = (d: number, m: number, y: number, key: string, mode: 'test' | 'general' = 'general') => {
    const date = new Date(y, m, d);
    const dateStr = date.toDateString();
    const isToday = new Date().toDateString() === dateStr;
    const isQuestionMet = completedQuestionDays.includes(dateStr);
    const isStudyMet = completedStudyDays.includes(dateStr);
    const isMockTest = mockTestDates.includes(dateStr);
    const dayRevisions = revisionSlots.filter((slot: any) => {
      if (slot.completed) return false;
      const stages = [1, 4, 12];
      const start = new Date(slot.startDate);
      const due = new Date(start);
      due.setDate(start.getDate() + stages[slot.currentStage]);
      return due.toDateString() === dateStr;
    });
    const isRevisionDay = dayRevisions.length > 0;
    const eventLabel = markedEvents[dateStr];
    const studySecondsRaw = dailyStudySeconds[dateStr] || 0;
    const studySeconds = isToday ? activeStudySecondsForToday : studySecondsRaw;
    const studyHours = (studySeconds / 3600).toFixed(1);
    
    const questionCountRaw = dailyQuestionCounts[dateStr] || 0;
    const questionCount = isToday ? activeQuestionsForToday : questionCountRaw;
    const hasActivity = studySeconds > 0 || questionCount > 0;

    const handleDayClick = () => {
      if (mode === 'test') {
        toggleMockTest(dateStr);
      } else {
        const event = prompt('Enter event label (or leave empty to clear):', eventLabel || '');
        if (event !== null) {
          setMarkedEvents(prev => {
            const next = { ...prev };
            if (event.trim()) next[dateStr] = event.trim();
            else delete next[dateStr];
            return next;
          });
        }
      }
    };

    const showOnlyTests = mode === 'test';

    return (
      <div 
        key={key} 
        onClick={handleDayClick}
        className={`h-16 md:h-20 border border-white/20 p-1.5 transition-all duration-300 hover:scale-[1.05] hover:z-20 hover:border-white/40 group relative cursor-pointer overflow-hidden
          ${isToday ? 'bg-white/15 border-blue-500 ring-2 ring-blue-500/20' : 'bg-white/2 shadow-[inset_0_0_20px_rgba(255,255,255,0.01)]'}
          ${!showOnlyTests && calendarType === 'questions' && isQuestionMet ? 'bg-pink-500/20' : ''}
          ${!showOnlyTests && calendarType === 'study' && isStudyMet ? 'bg-emerald-500/20' : ''}
          ${!showOnlyTests && calendarType === 'revision' && isRevisionDay ? 'bg-amber-500/20' : ''}
          ${showOnlyTests && isMockTest ? 'border-blue-400 bg-blue-400/20 shadow-[0_0_20px_rgba(59,130,246,0.1)]' : ''}
          ${!showOnlyTests && hasActivity ? 'shadow-[inset_0_0_15px_rgba(255,255,255,0.03)]' : ''}`}
      >
        <div className="flex justify-between items-start relative z-10 font-mono">
          <span className={`text-xs font-black ${isToday ? 'text-blue-400' : 'text-white/50'}`}>
            {d.toString().padStart(2, '0')}
          </span>
          <div className="flex flex-col gap-1 items-end">
            {isToday && (
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full shadow-[0_0_12px_rgba(59,130,246,1)] animate-pulse" />
            )}
            {!showOnlyTests && isQuestionMet && calendarType === 'questions' && (
              <div className="w-2 h-[3px] bg-rose-500 rounded-full shadow-[0_0_10px_rgba(244,63,94,0.8)]" />
            )}
            {!showOnlyTests && isStudyMet && calendarType === 'study' && (
              <div className="w-2 h-[3px] bg-emerald-400 rounded-full shadow-[0_0_10px_rgba(52,211,153,0.8)]" />
            )}
            {/* Show MOCK tag even in non-test mode but smaller if both exist */}
            {isMockTest && (
              <div className="flex flex-col items-end">
                <div className="w-2 h-[3px] bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,1)]" />
                <span className={`text-[7px] font-black text-blue-400 uppercase tracking-tighter mt-0.5 bg-blue-500/10 px-1 rounded border border-blue-500/20`}>MOCK</span>
              </div>
            )}
            {!showOnlyTests && isRevisionDay && calendarType === 'revision' && (
              <div className="flex flex-col items-end">
                <div className="w-2 h-[3px] bg-amber-500 rounded-full shadow-[0_0_10px_rgba(245,158,11,1)]" />
                <span className="text-[7px] font-black text-amber-500 uppercase tracking-tighter mt-0.5 bg-amber-500/20 px-1.5 py-0.5 rounded border border-amber-500/20">REVISION</span>
              </div>
            )}
          </div>
        </div>
        
        {/* Day Content Area - Scrollable/Stackable labels */}
        <div className="mt-1 relative z-10 flex flex-col gap-1 pr-1">
          {!showOnlyTests && calendarType === 'revision' && isRevisionDay && (
            <div className="flex flex-col gap-0.5 max-w-full overflow-hidden">
               {dayRevisions.slice(0, 2).map((rev: any, idx: number) => (
                 <div key={idx} className="text-[6px] font-black text-white/80 uppercase truncate leading-tight bg-white/10 rounded px-1 py-0.5 border border-white/5">
                    {rev.chapter}
                 </div>
               ))}
               {dayRevisions.length > 2 && <div className="text-[6px] font-black text-amber-400 uppercase tracking-tighter">+{dayRevisions.length - 2} More</div>}
            </div>
          )}
          
          {!showOnlyTests && eventLabel && (
             <div className="px-1.5 py-1 bg-amber-500/20 rounded border border-amber-500/20 w-fit max-w-full">
                <span className="text-[6px] font-bold text-amber-200 uppercase leading-[1.2] whitespace-normal break-words block">
                  {eventLabel}
                </span>
             </div>
          )}
        </div>
        
        {!showOnlyTests && (
          <div className="absolute bottom-1.5 right-1.5 flex flex-col items-end gap-0.5 z-10 font-mono">
            {studySeconds > 0 && calendarType === 'study' && (
              <span className="text-[10px] font-black text-emerald-400 leading-none drop-shadow-[0_0_10px_rgba(52,211,153,0.5)]">
                {studyHours}H
              </span>
            )}
            {questionCount > 0 && calendarType === 'questions' && (
              <span className="text-[10px] font-black text-rose-500 leading-none drop-shadow-[0_0_10px_rgba(244,63,94,0.5)]">
                {questionCount}Q
              </span>
            )}
          </div>
        )}
        
        <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/0 to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        
        {!showOnlyTests && (
          <div className="absolute bottom-0 left-0 right-0 h-[2px] flex opacity-60">
            {studySeconds > 0 && (
              <div className="h-full bg-emerald-400" style={{ width: Math.min(100, studySeconds / (targetHours * 3600) * 100) + '%' }} />
            )}
            {questionCount > 0 && (
              <div className="h-full bg-rose-500" style={{ width: Math.min(100, questionCount / questionTarget * 100) + '%' }} />
            )}
          </div>
        )}
      </div>
    );
  };

  const generateDays = (mode: 'test' | 'general') => {
    const daysArr = [];

    if (viewMode === 'month') {
      // Fill empty slots for previous month
      for (let i = 0; i < startDay; i++) {
        daysArr.push(<div key={`empty-${i}`} className="h-16 md:h-20 border border-white/15 bg-white/2 opacity-20" />);
      }

      // Fill days of current month
      for (let d = 1; d <= totalDays; d++) {
        daysArr.push(renderDay(d, month, year, `day-${d}`, mode));
      }
    } else {
      // Week view logic
      const startOfWeek = new Date(currentDate);
      startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
      
      for (let i = 0; i < 7; i++) {
        const d = new Date(startOfWeek);
        d.setDate(startOfWeek.getDate() + i);
        daysArr.push(renderDay(d.getDate(), d.getMonth(), d.getFullYear(), `week-day-${i}`, mode));
      }
    }
    return daysArr;
  };

  const testTabDays = generateDays('test');
  const calendarTabDays = generateDays('general');

  const deleteOneHour = async () => {
    if (!user) return;
    const today = new Date().toDateString();
    const currentSeconds = dailyStudySeconds[today] || 0;
    const newSeconds = Math.max(0, currentSeconds - 3600);
    
    setDailyStudySeconds(prev => ({ ...prev, [today]: newSeconds }));
    setElapsedSeconds(newSeconds);
    setShowDeleteConfirm(false);
    playTickSound();

    try {
      await setDoc(doc(db, 'users', user.uid, 'dailyStats', today), {
        studySeconds: newSeconds
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/dailyStats/${today}`);
    }
  };

  return (
    <div className="w-full min-h-screen bg-black overflow-x-hidden relative">
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-900 border border-white/20 p-8 rounded-[32px] max-w-sm w-full text-center"
            >
              <div className="w-16 h-16 bg-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Trash2 className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-xl font-black text-white uppercase tracking-tight mb-2">Delete 1 Hour?</h3>
              <p className="text-sm text-white/40 mb-8">This will subtract 1 hour from your today's study time. This action cannot be undone.</p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-3 rounded-xl bg-white/5 text-white font-black uppercase tracking-widest text-[10px] hover:bg-white/10 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={deleteOneHour}
                  className="flex-1 py-3 rounded-xl bg-red-600 text-white font-black uppercase tracking-widest text-[10px] hover:bg-red-500 transition-all"
                >
                  Confirm
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(17,24,39,1)_0%,rgba(0,0,0,1)_100%)] pointer-events-none" />
      
      <div className="relative z-10 flex flex-col items-center pt-16 pb-24 px-4">
        <div className="w-full max-w-[1400px]">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6 max-w-4xl mx-auto w-full">
            <div className="flex items-center gap-6">
              <div className="relative">
                <div className="w-16 h-16 rounded-3xl bg-white/5 border border-white/20 flex items-center justify-center group overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/20 via-pink-500/20 to-violet-500/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <Activity className="w-8 h-8 text-white group-hover:scale-110 transition-transform relative z-10" />
                </div>
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-pink-500 rounded-full border-2 border-black" />
              </div>
              <div>
                <h1 className="text-3xl font-black text-white tracking-tighter uppercase font-sans bg-gradient-to-r from-yellow-400 via-pink-400 to-violet-400 bg-clip-text text-transparent">Mission</h1>
                <div className="flex items-center gap-2">
                  <div className="w-1 h-1 bg-green-400 rounded-full animate-pulse" />
                  <p className="text-[9px] font-mono font-bold text-white/30 uppercase tracking-[0.3em]">Operational • v2.6.0</p>
                </div>
              </div>
            </div>
            
            <SpringLeverNav 
              activeTab={activeTab} 
              setActiveTab={setActiveTab} 
              setShowDeleteConfirm={setShowDeleteConfirm}
            />
          </div>

          {/* Motivational Quote Banner */}
          <div className="max-w-4xl mx-auto w-full">
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full mb-8 relative group"
            >
            <div className="absolute inset-0 bg-zinc-800/20 rounded-2xl blur-xl opacity-50" />
            <div className="relative py-6 px-10 rounded-xl bg-zinc-900/90 backdrop-blur-xl border border-white/20 overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl">
              <div className="flex items-center gap-6 flex-1 min-w-0">
                <div className="hidden md:flex p-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
                  <Zap className="w-5 h-5 text-purple-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={currentQuote}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      transition={{ duration: 0.5 }}
                    >
                      <p className="text-base md:text-lg font-serif italic text-white/90 leading-relaxed tracking-wide">
                        "{currentQuote.split(' – ')[0]}"
                      </p>
                      <p className="mt-1 text-[9px] font-black text-purple-400 uppercase tracking-[0.4em]">
                        — {currentQuote.split(' – ')[1]}
                      </p>
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
              
              <div className="flex items-center gap-3 shrink-0">
                <div className="h-px w-8 bg-white/10" />
                <div className="flex gap-1">
                  {[1, 2, 3].map(i => (
                    <div 
                      key={i}
                      className="w-1 h-1 bg-purple-500/40 rounded-full" 
                    />
                  ))}
                </div>
                <div className="h-px w-8 bg-white/10" />
              </div>
            </div>
          </motion.div>
        </div>

        <AnimatePresence mode="wait">
            {activeTab === 'timer' && (
              <motion.div
                key="timer-tab"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
                className="w-full"
              >
                {/* Monthly Stats Summary */}
                <div className="max-w-4xl mx-auto w-full">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-8 rounded-[40px] glass bg-white/[0.02] border border-white/15 flex items-center justify-between group hover:bg-white/[0.04] transition-all"
                  >
                    <div>
                       <div className="text-xs font-bold text-amber-500/60 uppercase tracking-wider mb-2">Monthly Time</div>
                       <div className="text-4xl font-mono font-bold text-amber-400 tracking-tight">{monthStudyHours}H</div>
                       <div className="mt-2 text-xs text-white/20 uppercase font-bold tracking-wide">Logged Focus</div>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/5 border border-amber-500/20 flex items-center justify-center text-amber-400">
                      <Clock className="w-6 h-6" />
                    </div>
                  </motion.div>
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="p-6 rounded-[32px] glass border border-white/10 flex items-center justify-between group hover:bg-white/5 transition-all"
                  >
                    <div>
                       <div className="text-xs font-bold text-white/40 uppercase tracking-wide mb-1">Questions</div>
                       <div className="text-3xl font-mono font-bold text-blue-400">{monthQuestionCount}</div>
                       <div className="mt-1 text-xs text-white/30 uppercase font-bold tracking-wide">This Month</div>
                    </div>
                    <div className="p-4 rounded-2xl bg-blue-500/10 text-blue-400">
                      <Target className="w-6 h-6" />
                    </div>
                  </motion.div>
                </div>
              </div>

              {/* Trackers Section - Side-by-Side Focused Layout */}
              <div className="space-y-12 mb-20 w-full max-w-7xl mx-auto px-4">
                  <div className="flex flex-col xl:flex-row items-stretch gap-8">
                      {/* Hero Timer - 2/3 width on xl */}
                      <div className="flex-[2] min-w-0">
                        <motion.div 
                          whileHover={{ scale: 1.002 }}
                          className="h-full p-10 rounded-[48px] bg-[#050505] border border-white/15 flex flex-col items-center justify-center text-center group relative overflow-hidden shadow-2xl transition-all duration-500"
                        >
                          <div className="absolute inset-0 z-0">
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.02)_0%,transparent_70%)]" />
                          </div>

                          {isTimerRunning && (
                            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                              <motion.div
                                animate={{ opacity: [0.3, 0.5, 0.3] }}
                                transition={{ duration: 2, repeat: Infinity }}
                                className="absolute inset-0 bg-white/[0.01]"
                              />
                              <svg className="absolute inset-0 w-full h-full overflow-visible pointer-events-none">
                                <motion.rect
                                  x="0"
                                  y="0"
                                  width="100%"
                                  height="100%"
                                  fill="none"
                                  stroke="white"
                                  strokeWidth="3"
                                  rx="48"
                                  initial={{ pathLength: 0.15, pathOffset: 0, opacity: 0 }}
                                  animate={{ 
                                    pathOffset: 1, 
                                    opacity: [0.3, 0.7, 0.3] 
                                  }}
                                  transition={{
                                    pathOffset: { duration: 3, repeat: Infinity, ease: "linear" },
                                    opacity: { duration: 1.5, repeat: Infinity, ease: "easeInOut" }
                                  }}
                                  style={{ 
                                    filter: "drop-shadow(0 0 12px rgba(255,255,255,0.8)) blur(0.5px)"
                                  }}
                                />
                                {/* Secondary faster faint light for depth */}
                                <motion.rect
                                  x="0"
                                  y="0"
                                  width="100%"
                                  height="100%"
                                  fill="none"
                                  stroke="white"
                                  strokeWidth="1"
                                  rx="48"
                                  initial={{ pathLength: 0.05, pathOffset: 0.5, opacity: 0 }}
                                  animate={{ 
                                    pathOffset: -1, 
                                    opacity: 0.2
                                  }}
                                  transition={{
                                    pathOffset: { duration: 5, repeat: Infinity, ease: "linear" }
                                  }}
                                />
                              </svg>
                            </div>
                          )}
                          
                          <div className="relative z-10 flex flex-col items-center w-full">
                            <div className="flex flex-col w-full mb-10">
                              <div className="flex items-center justify-between gap-6 mb-10 bg-white/[0.02] p-6 rounded-2xl border border-white/10">
                                <div className="flex items-center gap-4">
                                  <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                                    <Rocket className={`w-5 h-5 ${isTimerRunning ? 'text-white' : 'text-white/20'}`} />
                                  </div>
                                  <div className="flex flex-col text-left">
                                    <span className="text-xs font-bold text-white/30 uppercase tracking-widest mb-1">
                                      {isTimerRunning ? 'Focusing' : 'Ready'}
                                    </span>
                                    <span className="text-[14px] font-black text-white uppercase tracking-wider truncate max-w-[150px]">
                                      {selectedSubject || 'Choose Subject'}
                                    </span>
                                  </div>
                                </div>

                                <div className="h-10 w-px bg-white/5" />

                                <div className="flex-1 min-w-0">
                                  {selectedSubject && availableChapters.length > 0 && (
                                    <div className="w-full">
                                      <div className="text-[11px] font-bold text-white/30 uppercase tracking-widest mb-1.5 ml-1 text-left">Current Chapter</div>
                                      <div className="relative group/sel">
                                        <select
                                          value={selectedChapter}
                                          onChange={(e) => {
                                            setSelectedChapter(e.target.value);
                                            localStorage.setItem('pulse_selected_chapter', e.target.value);
                                          }}
                                          disabled={isTimerRunning}
                                          className="w-full bg-white/2 border border-white/5 rounded-lg px-4 py-2.5 text-xs font-bold text-white/60 uppercase tracking-wide focus:outline-none focus:border-white/20 transition-all appearance-none cursor-pointer disabled:opacity-20 hover:bg-white/5"
                                        >
                                          {availableChapters.map(chapter => (
                                            <option key={chapter.id} value={chapter.id} className="bg-zinc-950 text-white">
                                              {chapter.name}
                                            </option>
                                          ))}
                                        </select>
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-20">
                                          <ChevronRight className="w-3 h-3 rotate-90" />
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                                {availableSubjects.map((sub, idx) => {
                                  const isActive = selectedSubject === sub;
                                  const subColor = SUBJECT_COLORS[sub] || '#ffffff';
                                  
                                  return (
                                    <button
                                      key={sub}
                                      onClick={() => {
                                        if (isTimerRunning) {
                                          handleChapterSwitch(sub, "");
                                        } else {
                                          setSelectedSubject(sub);
                                          localStorage.setItem('pulse_selected_subject', sub);
                                        }
                                      }}
                                      style={isActive ? { 
                                        backgroundColor: `${subColor}20`,
                                        borderColor: `${subColor}40`,
                                        color: subColor 
                                      } : {}}
                                      className={`px-3 py-3 rounded-lg text-[8px] font-black uppercase tracking-[0.2em] transition-all border
                                        ${isActive ? '' : `bg-white/[0.01] border-white/5 text-white/40 hover:bg-white/5 hover:border-white/10`}
                                        cursor-pointer active:scale-95`}
                                    >
                                      {sub}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                            
                            <div className="relative mb-14 w-full">
                              {isTimerLoading ? (
                                <div className="flex justify-center py-16">
                                  <PulseLoader size={48} />
                                </div>
                              ) : (
                                <div className="relative flex flex-col items-center">
                                  {isTimerRunning && (
                                    <motion.div
                                      animate={{ opacity: [0.02, 0.05, 0.02] }}
                                      transition={{ duration: 4, repeat: Infinity }}
                                      className="absolute inset-0 bg-white/5 rounded-full blur-[100px]"
                                    />
                                  )}
                                  
                                  <div className="flex items-center justify-center gap-4 md:gap-8 w-full">
                                    {[
                                      { val: Math.floor(elapsedSeconds / 3600), label: 'HOURS' },
                                      { val: Math.floor((elapsedSeconds % 3600) / 60), label: 'MINUTES' },
                                      { val: elapsedSeconds % 60, label: 'SECONDS' }
                                    ].map((unit, i) => (
                                      <React.Fragment key={unit.label}>
                                        <div className="flex flex-col items-center">
                                          <div className="text-[50px] md:text-[70px] lg:text-[90px] font-mono font-black text-white tabular-nums tracking-[-0.1em] leading-none">
                                            {unit.val.toString().padStart(2, '0')}
                                          </div>
                                          <div className="mt-4 text-xs font-bold text-white/40 uppercase tracking-widest">
                                            {unit.label}
                                          </div>
                                        </div>
                                        {i < 2 && (
                                          <div className="text-3xl md:text-5xl lg:text-6xl font-mono font-black text-white/5 -mt-10">:</div>
                                        )}
                                      </React.Fragment>
                                    ))}
                                  </div>

                                  <div className="mt-12 flex items-center gap-3 bg-white/5 px-4 py-2 rounded-full border border-white/5">
                                    <div className={`w-1 h-1 rounded-full ${isTimerRunning ? 'bg-emerald-500 animate-pulse' : 'bg-white/20'}`} />
                                    <div className="text-[8px] font-black text-white/30 uppercase tracking-[0.5em]">
                                      {isTimerRunning ? 'PROGRESS TRACKING' : 'READY TO START'}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>

                            <div className="flex items-center gap-4 w-full max-w-sm">
                              <button 
                                onClick={toggleTimer}
                                disabled={isTimerLoading}
                                className={`flex-1 py-6 rounded-2xl font-black uppercase tracking-[0.4em] text-[10px] transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-4 group relative overflow-hidden border
                                  ${isTimerRunning 
                                    ? 'bg-black text-rose-500 border-rose-500/30' 
                                    : 'bg-white text-black border-transparent shadow-[0_20px_60px_rgba(255,255,255,0.15)]'}`}
                              >
                                {isTimerRunning ? <CloudOff className="w-4 h-4" /> : <Rocket className="w-4 h-4" />}
                                {isTimerLoading || !isStatsLoaded ? 'SYNCING...' : (isTimerRunning ? 'STOP SESSION' : 'START FOCUS')}
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      </div>

                      {/* Side Tracker - 1/3 width on xl */}
                      <div className="flex-1 w-full xl:max-w-md">
                        <QuestionLab 
                          currentQuestions={currentQuestions} 
                          currentQuestionsRef={currentQuestionsRef}
                          updateQuestions={updateQuestions} 
                          playTickSound={playTickSound} 
                          removeOneHour={removeOneHour}
                          isTimerRunning={isTimerRunning}
                        />
                      </div>
                  </div>

                  {/* Secondary Metrics - Centered below hero row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-5xl mx-auto">
                    <PerformanceNode 
                      elapsedSeconds={activeStudySecondsForToday} 
                      targetHours={targetHours} 
                      currentQuestions={activeQuestionsForToday} 
                    />
                    <StreakBox 
                      streak={streak} 
                      dailyStudySeconds={dailyStudySeconds} 
                    />
                  </div>
              </div>

          <div className="max-w-5xl mx-auto w-full">
            {/* Distribution Charts */}
            <DistributionCharts 
              subjectStudySeconds={{ ...subjectStudySeconds, [todayKey]: activeSubjectSeconds }}
              subjectQuestionCounts={{ ...subjectQuestionCounts, [todayKey]: activeSubjectQuestions }}
              dailyStudySeconds={{ ...dailyStudySeconds, [todayKey]: activeStudySecondsForToday }}
              dailyQuestionCounts={{ ...dailyQuestionCounts, [todayKey]: activeQuestionsForToday }}
              getSubjectColor={getSubjectColor}
            />

            {/* Bar Graphs Section */}
            <BarGraphs 
              barChartData={barChartData}
              targetHours={targetHours}
              questionTarget={questionTarget}
              revisionSlots={revisionSlots}
            />
          </div>

          {/* Go to Test Section Button Removed as per User Request */}

              </motion.div>
            )}

            {activeTab === 'test' && (
              <motion.div
                key="test-tab"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="w-full max-w-4xl mx-auto"
              >
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-6">
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

          {/* Calendar Grid */}
          <div className="glass rounded-3xl overflow-hidden shadow-2xl mb-8 border border-white/20">
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
                {testTabDays}
              </div>
            </div>
          </div>

          {/* Stats & Analytics */}
          <div className="grid grid-cols-1 gap-6 mb-12">
            <div className="p-6 rounded-3xl glass border border-white/20">
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

            <div className="mb-8 p-8 rounded-[32px] bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-transparent border border-purple-500/20 backdrop-blur-xl flex flex-col md:flex-row items-center gap-6 relative overflow-hidden group">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(168,85,247,0.1),transparent_70%)] opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
              <div className="p-5 rounded-[24px] bg-purple-500/20 text-purple-400 shadow-[0_0_30px_rgba(168,85,247,0.2)] relative z-10">
                <CalendarIcon className="w-8 h-8" />
              </div>
              <div className="relative z-10 text-center md:text-left">
                <h3 className="text-xl font-black text-white uppercase tracking-tight mb-2">Test Scheduling</h3>
                <p className="text-sm text-white/60 font-medium leading-relaxed max-w-lg">
                  Plan your success visually. Simply <span className="text-purple-400 font-black">click any date</span> in the calendar above to instantly toggle a mock test session.
                </p>
              </div>
              <div className="md:ml-auto flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-[10px] font-black text-white/40 uppercase tracking-widest relative z-10">
                <Zap className="w-3 h-3 text-purple-400" />
                Quick Action Enabled
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
        </motion.div>
            )}

            {activeTab === 'revision' && (
              <div className="w-full max-w-5xl mx-auto">
                <RevisionPage 
                  subjectStudySeconds={{ ...subjectStudySeconds, [todayKey]: activeSubjectSeconds }}
                  subjectQuestionCounts={{ ...subjectQuestionCounts, [todayKey]: activeSubjectQuestions }}
                  getSubjectColor={getSubjectColor}
                  revisionSlots={revisionSlots}
                  setRevisionSlots={setRevisionSlots}
                  availableSubjects={availableSubjects}
                  setSubjectRevisionCounts={setSubjectRevisionCounts}
                />
              </div>
            )}

            {activeTab === 'calendar' && (
              <motion.div
                key="calendar-tab"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8 w-full max-w-5xl mx-auto"
              >
                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-4">
                    <button onClick={prevPeriod} className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 text-white transition-colors">
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div className="text-xl font-black text-white uppercase tracking-widest px-4">
                      {monthName} {year}
                    </div>
                    <button onClick={nextPeriod} className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 text-white transition-colors">
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2 bg-white/5 p-1 rounded-xl">
                    <button onClick={() => setViewMode('month')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${viewMode === 'month' ? 'bg-white text-black' : 'text-white/40'}`}>Month</button>
                    <button onClick={() => setViewMode('week')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${viewMode === 'week' ? 'bg-white text-black' : 'text-white/40'}`}>Week</button>
                  </div>
                </div>

                {/* New: Calendar Type Switcher */}
                <div className="flex flex-wrap items-center gap-3 bg-white/2 p-2 rounded-3xl border border-white/5 backdrop-blur-md">
                   <button 
                     onClick={() => setCalendarType('study')}
                     className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all
                       ${calendarType === 'study' ? 'bg-emerald-500 text-white shadow-[0_10px_20px_rgba(16,185,129,0.2)]' : 'text-white/40 hover:bg-white/5'}`}
                   >
                     <Clock className="w-3 h-3" />
                     Time Studied
                   </button>
                   <button 
                     onClick={() => setCalendarType('questions')}
                     className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all
                       ${calendarType === 'questions' ? 'bg-rose-500 text-white shadow-[0_0_20px_rgba(244,63,94,0.2)]' : 'text-white/40 hover:bg-white/5'}`}
                   >
                     <Target className="w-3 h-3" />
                     Ques Solved
                   </button>
                   <button 
                     onClick={() => setCalendarType('revision')}
                     className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all
                       ${calendarType === 'revision' ? 'bg-amber-500 text-white shadow-[0_0_20px_rgba(245,158,11,0.2)]' : 'text-white/40 hover:bg-white/5'}`}
                   >
                     <Zap className="w-3 h-3" />
                     Revision Pending
                   </button>
                </div>

                <div className="glass rounded-[48px] overflow-hidden shadow-2xl p-8 bg-black/40 border border-white/15">
                  <div className="grid grid-cols-7 mb-6">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                      <div key={day} className="text-center text-xs font-bold text-white/30 uppercase tracking-wide py-2">
                        {day}
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-3">
                    {calendarTabDays}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="p-8 rounded-[40px] bg-emerald-500/5 border border-emerald-500/10">
                     <div className="text-xs font-bold text-emerald-500 uppercase tracking-wide mb-4">Completed Days</div>
                     <div className="text-4xl font-mono font-black text-white mb-2">12 Days</div>
                     <p className="text-xs text-white/30 uppercase font-bold tracking-wide">Met target study + questions</p>
                   </div>
                   <div className="p-8 rounded-[40px] bg-violet-500/5 border border-white/5">
                     <div className="text-xs font-bold text-violet-400 uppercase tracking-wide mb-4">Future Projection</div>
                     <p className="text-xs text-white/40 leading-relaxed uppercase tracking-wide">
                        Your current pace suggests exam preparation completion by <span className="text-violet-400 font-bold">Oct 2026</span> based on 4.2h/day average.
                     </p>
                   </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
  </div>
</div>
</div>
  );
};

export default TimerPage;
