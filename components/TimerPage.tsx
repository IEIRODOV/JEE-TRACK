import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, TrendingUp, Zap, Trash2, Cloud, CloudOff, Loader2, Activity, Clock, Target, Shield, Rocket, ZapIcon, History, Check } from 'lucide-react';
import { playTickSound, playF1Sound, playTankSound, playJetSound } from '@/src/lib/sounds';
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
  collection, 
  onSnapshot, 
  query, 
  where, 
  serverTimestamp,
  deleteDoc,
  writeBatch,
  increment,
  addDoc
} from 'firebase/firestore';

// --- High Performance Sub-components ---

const PerformanceNode = React.memo(({ elapsedSeconds, targetHours, currentQuestions }: { elapsedSeconds: number, targetHours: number, currentQuestions: number }) => (
  <motion.div 
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    className="p-6 rounded-[32px] glass border border-white/5 bg-white/[0.01] will-change-transform"
  >
    <div className="flex items-center gap-2 mb-8">
      <TrendingUp className="w-3 h-3 text-green-400" />
      <span className="text-[9px] font-black text-green-400/30 uppercase tracking-[0.4em] font-mono">Performance Node</span>
    </div>
    <div className="space-y-6">
      <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
        <div className="flex justify-between items-end mb-3">
          <div className="text-[8px] font-black text-white/20 uppercase tracking-widest font-mono">Efficiency</div>
          <div className="text-lg font-mono font-bold text-green-400">
            {Math.min(100, Math.round((elapsedSeconds / Math.max(1, targetHours * 3600)) * 100))}%
          </div>
        </div>
        <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
          <motion.div 
            animate={{ width: `${Math.min(100, (elapsedSeconds / Math.max(1, targetHours * 3600)) * 100)}%` }}
            className="h-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.3)]"
          />
        </div>
      </div>
      <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
        <div className="flex justify-between items-end mb-3">
          <div className="text-[8px] font-black text-white/20 uppercase tracking-widest font-mono">Focus Index</div>
          <div className="text-lg font-mono font-bold text-pink-400">
            {(Math.min(10, (currentQuestions / Math.max(1, elapsedSeconds / 3600)) / 5)).toFixed(1)}
          </div>
        </div>
        <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
          <motion.div 
            animate={{ width: `${Math.min(100, ((currentQuestions / Math.max(1, elapsedSeconds / 3600)) / 5) * 10)}%` }}
            className="h-full bg-pink-500 shadow-[0_0_10px_rgba(236,72,153,0.3)]"
          />
        </div>
      </div>
    </div>
  </motion.div>
));

const StreakBox = React.memo(({ streak, dailyStudySeconds }: { streak: number, dailyStudySeconds: Record<string, number> }) => (
  <motion.div 
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay: 0.2 }}
    className="p-8 rounded-[48px] bg-white/[0.02] border border-white/10 relative overflow-hidden group will-change-transform"
  >
    <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
    <div className="flex items-center gap-3 mb-10">
      <div className="w-8 h-8 rounded-full bg-yellow-500/10 flex items-center justify-center">
        <Zap className="w-4 h-4 text-yellow-500" />
      </div>
      <span className="text-[10px] font-black text-yellow-500 uppercase tracking-[0.4em] font-mono">Persistence Engine</span>
    </div>
    <div className="flex flex-col gap-8 relative z-10">
      <div className="flex items-end gap-4">
        <div className="text-7xl font-mono font-black text-white tracking-tighter drop-shadow-[0_0_20px_rgba(234,179,8,0.3)]">
          {streak}
        </div>
        <div className="flex flex-col mb-2">
          <div className="text-[10px] font-black text-white/40 uppercase tracking-widest font-mono">DAY</div>
          <div className="text-[12px] font-black text-yellow-500 uppercase tracking-[0.2em] font-mono">STREAK</div>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-2">
        {[...Array(7)].map((_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - (6 - i));
          const dateStr = date.toDateString();
          const isDone = (dailyStudySeconds[dateStr] || 0) >= 1800;
          const dayName = date.toLocaleDateString('en-US', { weekday: 'narrow' });
          return (
            <div key={i} className="flex flex-col items-center gap-2">
              <div 
                className={`w-full h-8 rounded-xl transition-all duration-700 flex items-center justify-center
                  ${isDone ? 'bg-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.4)]' : 'bg-white/5 border border-white/5'}`}
              >
                {isDone && <Check className="w-3 h-3 text-black font-black" />}
              </div>
              <span className={`text-[8px] font-black font-mono transition-colors ${isDone ? 'text-yellow-500' : 'text-white/20'}`}>{dayName}</span>
            </div>
          );
        })}
      </div>
      <div className="p-5 rounded-3xl bg-white/[0.03] border border-white/5 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-pulse" />
          <p className="text-[9px] font-mono font-bold text-white/40 uppercase tracking-[0.1em] leading-relaxed">
            Maintain 30m daily study depth.
          </p>
        </div>
      </div>
    </div>
  </motion.div>
));

const QuestionLab = React.memo(({ currentQuestions, updateQuestions, playTickSound }: any) => (
  <div className="space-y-6 order-3">
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      whileHover={{ scale: 1.01 }}
      className="p-12 rounded-[50px] bg-zinc-950/80 border-2 border-pink-500/20 flex flex-col items-center justify-center text-center group relative overflow-hidden min-h-[400px] will-change-transform"
    >
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-pink-500/10 via-transparent to-transparent opacity-40" />
        <motion.div 
          animate={{ 
            opacity: [0.1, 0.3, 0.1],
            scale: [1, 1.2, 1]
          }}
          transition={{ duration: 4, repeat: Infinity }}
          className="absolute -top-20 -right-20 w-64 h-64 bg-pink-500/20 rounded-full blur-[100px]"
        />
      </div>

      <div className="relative z-10 flex flex-col items-center w-full">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 rounded-xl bg-pink-500/10 border border-pink-500/20">
            <Target className="w-5 h-5 text-pink-500" />
          </div>
          <span className="text-[12px] font-black text-pink-400 uppercase tracking-[0.5em] font-mono">Question Lab</span>
        </div>
        
        <div className="text-9xl font-mono font-black text-white tracking-tighter mb-12 tabular-nums drop-shadow-[0_0_40px_rgba(236,72,153,0.5)]">
          {currentQuestions}
        </div>

        <div className="flex items-center gap-6 w-full">
          <button 
            onClick={() => {
              playTickSound();
              updateQuestions(Math.max(0, currentQuestions - 1));
            }}
            className="flex-1 py-6 rounded-3xl bg-white/5 border border-white/10 text-white font-black text-xl hover:bg-red-500/20 hover:border-red-500/40 transition-all active:scale-90 shadow-xl"
          >
            -
          </button>
          <button 
            onClick={() => {
              playTickSound();
              updateQuestions(currentQuestions + 1);
            }}
            className="flex-1 py-6 rounded-3xl bg-pink-600 border border-pink-400 text-white font-black text-xl hover:bg-pink-500 hover:scale-105 transition-all active:scale-95 shadow-[0_15px_30px_rgba(236,72,153,0.4)]"
          >
            +
          </button>
        </div>

        <div className="mt-8 flex items-center gap-2">
          <div className="w-2 h-2 bg-pink-500 rounded-full animate-ping" />
          <span className="text-[10px] font-mono font-black text-white/30 uppercase tracking-widest">Live Tracking Active</span>
        </div>
      </div>
    </motion.div>
  </div>
));

const DistributionCharts = React.memo(({ subjectStudySeconds, subjectQuestionCounts, dailyStudySeconds, dailyQuestionCounts, getSubjectColor }: any) => {
  const today = new Date().toDateString();
  const todayStudyData = Object.entries(subjectStudySeconds[today] || {}).map(([name, count]: any) => ({ name, value: count }));
  const todayQuestionData = Object.entries(subjectQuestionCounts[today] || {}).map(([name, count]: any) => ({ name, value: count }));

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-8 rounded-[40px] glass border border-white/10 relative overflow-hidden will-change-transform"
      >
        <div className="flex items-center gap-2 mb-8">
          <div className="w-1.5 h-1.5 bg-violet-500 rounded-full" />
          <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Subject Time Distribution</span>
        </div>
        <div className="flex flex-col items-center">
          <div className="h-64 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={todayStudyData.length > 0 ? todayStudyData : [{ name: 'No Data', value: 1 }]}
                  cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value"
                >
                  {todayStudyData.length === 0 ? <Cell fill="rgba(255,255,255,0.05)" stroke="none" /> : 
                    todayStudyData.map((entry, index) => <Cell key={`cell-${index}`} fill={getSubjectColor(entry.name, index)} stroke="none" />)}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#000', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                  itemStyle={{ color: '#fff', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase' }}
                  formatter={(value: number) => [`${(value / 3600).toFixed(1)}h`, 'Study Time']}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">Total</span>
              <span className="text-2xl font-mono font-black text-white">
                {((dailyStudySeconds[today] || 0) / 3600).toFixed(1)}h
              </span>
            </div>
          </div>
          <div className="w-full mt-6 space-y-2">
            {Object.entries(subjectStudySeconds[today] || {}).map(([name, count]: any, index) => (
              <div key={name} className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getSubjectColor(name, index) }} />
                  <span className="text-[10px] font-bold text-white/80 uppercase tracking-wider">{name}</span>
                </div>
                <span className="text-[10px] font-mono font-bold text-white">{(count / 3600).toFixed(1)}h</span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-8 rounded-[40px] glass border border-white/10 relative overflow-hidden will-change-transform"
      >
        <div className="flex items-center gap-2 mb-8">
          <div className="w-1.5 h-1.5 bg-rose-500 rounded-full" />
          <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Subject Question Distribution</span>
        </div>
        <div className="flex flex-col items-center">
          <div className="h-64 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={todayQuestionData.length > 0 ? todayQuestionData : [{ name: 'No Data', value: 1 }]}
                  cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value"
                >
                  {todayQuestionData.length === 0 ? <Cell fill="rgba(255,255,255,0.05)" stroke="none" /> : 
                    todayQuestionData.map((entry, index) => <Cell key={`cell-q-${index}`} fill={getSubjectColor(entry.name, index)} stroke="none" />)}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#000', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                  itemStyle={{ color: '#fff', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase' }}
                  formatter={(value: number) => [value, 'Questions']}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">Total</span>
              <span className="text-2xl font-mono font-black text-white">
                {dailyQuestionCounts[today] || 0}
              </span>
            </div>
          </div>
          <div className="w-full mt-6 space-y-2">
            {Object.entries(subjectQuestionCounts[today] || {}).map(([name, count]: any, index) => (
              <div key={name} className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getSubjectColor(name, index) }} />
                  <span className="text-[10px] font-bold text-white/80 uppercase tracking-wider">{name}</span>
                </div>
                <span className="text-[10px] font-mono font-bold text-white">{count} Qs</span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
});

const BarGraphs = React.memo(({ barChartData, targetHours, questionTarget }: any) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 rounded-[32px] glass border border-white/10 will-change-transform"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
          <span className="text-[10px] font-black text-white/20 uppercase tracking-widest font-mono">Study Hours (Last 7 Days)</span>
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
      className="p-6 rounded-[32px] glass border border-white/10 will-change-transform"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-rose-500 rounded-full" />
          <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Questions Solved (Last 7 Days)</span>
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
));

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

const formatTime = (seconds: number) => {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
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
  const [dailyStudySeconds, setDailyStudySeconds] = useState<Record<string, number>>({});
  const [subjectStudySeconds, setSubjectStudySeconds] = useState<Record<string, Record<string, number>>>({});
  const [subjectQuestionCounts, setSubjectQuestionCounts] = useState<Record<string, Record<string, number>>>({});
  const [globalStats, setGlobalStats] = useState({ totalStudents: 0, totalQuestions: 0 });
  
  const [targetHours, setTargetHours] = useState<number>(6);
  const [questionTarget, setQuestionTarget] = useState<number>(50);
  
  const [currentQuestions, setCurrentQuestions] = useState<number>(0);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [selectedSubject, setSelectedSubject] = useState<string>(localStorage.getItem('pulse_selected_subject') || '');
  const [selectedChapter, setSelectedChapter] = useState<string>(localStorage.getItem('pulse_selected_chapter') || '');
  const [availableSubjects, setAvailableSubjects] = useState<string[]>([]);
  const [availableChapters, setAvailableChapters] = useState<{id: string, name: string}[]>([]);
  
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [accumulatedSeconds, setAccumulatedSeconds] = useState<number>(0);
  const [isTimerLoading, setIsTimerLoading] = useState(true);
  const [isStatsLoaded, setIsStatsLoaded] = useState(false);
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  const [activeTab, setActiveTab] = useState<'timer' | 'test'>('timer');
  const [currentQuote, setCurrentQuote] = useState(MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)]);

  // Refs to avoid stale closures in timer and async operations
  const dailyStudySecondsRef = useRef(dailyStudySeconds);
  const completedStudyDaysRef = useRef(completedStudyDays);
  const targetHoursRef = useRef(targetHours);
  const subjectStudySecondsRef = useRef(subjectStudySeconds);
  const subjectQuestionCountsRef = useRef(subjectQuestionCounts);
  const selectedSubjectRef = useRef(selectedSubject);
  const selectedChapterRef = useRef(selectedChapter);
  const currentQuestionsRef = useRef(currentQuestions);
  const elapsedSecondsRef = useRef(elapsedSeconds);
  const lastTickElapsedRef = useRef(0);
  const lastSavedProgressSecondsRef = useRef(0);

  useEffect(() => {
    dailyStudySecondsRef.current = dailyStudySeconds;
    completedStudyDaysRef.current = completedStudyDays;
    targetHoursRef.current = targetHours;
    subjectStudySecondsRef.current = subjectStudySeconds;
    subjectQuestionCountsRef.current = subjectQuestionCounts;
    selectedSubjectRef.current = selectedSubject;
    selectedChapterRef.current = selectedChapter;
    currentQuestionsRef.current = currentQuestions;
    elapsedSecondsRef.current = elapsedSeconds;
    // Initialize lastSavedProgressSecondsRef when elapsedSeconds is first loaded
    if (lastSavedProgressSecondsRef.current === 0 && elapsedSeconds > 0) {
      lastSavedProgressSecondsRef.current = elapsedSeconds;
    }
  }, [dailyStudySeconds, completedStudyDays, targetHours, subjectStudySeconds, subjectQuestionCounts, selectedSubject, currentQuestions, elapsedSeconds]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

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
        if (!selectedChapter || !chapters.find(c => c.id === selectedChapter)) {
          setSelectedChapter(chapters[0]?.id || '');
        }
      } else {
        setAvailableChapters([]);
        setSelectedChapter('');
      }
    } else {
      setAvailableChapters([]);
      setSelectedChapter('');
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
    const statsRef = collection(db, 'users', user.uid, 'dailyStats');
    
    const unsubscribe = onSnapshot(statsRef, (snapshot) => {
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
        const dateStr = doc.id; // Using doc ID as date string

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

      // Update current day's values
      const today = new Date().toDateString();
      const firestoreTodaySeconds = newStudySeconds[today] || 0;
      setCurrentQuestions(newQuestionCounts[today] || 0);
      
      // Critical Fix: Sync elapsedSeconds from Firestore if it's higher than local (prevents reset to 0)
      // or if we haven't loaded stats yet.
      setElapsedSeconds(prev => {
        // Hard cap at 24 hours (86400 seconds)
        const cappedFirestoreSeconds = Math.min(firestoreTodaySeconds, 86400);
        
        if (!isTimerRunning) return cappedFirestoreSeconds;
        // If timer is running, only update if local is 0 (initial load) 
        // or if Firestore is significantly ahead (sync from other device)
        if (prev === 0 || cappedFirestoreSeconds > prev + 60) {
          return cappedFirestoreSeconds;
        }
        return prev;
      });

      setIsStatsLoaded(true);
      setIsSyncing(false);
      setLastSyncTime(new Date());
    }, (error) => {
      console.error("Firestore Sync Error:", error);
      setIsSyncing(false);
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
      }
      setIsTimerLoading(false);
    }, (error) => {
      console.error("Timer Sync Error:", error);
      setIsTimerLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Global Stats Listener
  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'stats', 'global'), (doc) => {
      if (doc.exists()) {
        setGlobalStats(doc.data() as any);
      }
    }, (error) => {
      console.error("Global Stats Sync Error:", error);
    });
    return () => unsubscribe();
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
    if (subjects.length > 0) {
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
  }, [user]); // Re-run when user changes or on mount

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
        
        // Only update these every 5 seconds to reduce re-renders of heavy components
        if (tickCount % 5 === 0) {
          const newSeconds = { ...dailyStudySecondsRef.current, [today]: totalElapsed };
          setDailyStudySeconds(newSeconds);

          const currentSub = selectedSubjectRef.current;
          const delta = totalElapsed - lastTickElapsedRef.current;
          
          if (delta > 0 && currentSub) {
            setSubjectStudySeconds(prev => {
              const todaySubjects = prev[today] || {};
              const prevSubjectSeconds = todaySubjects[currentSub] || 0;
              return {
                ...prev,
                [today]: {
                  ...todaySubjects,
                  [currentSub]: prevSubjectSeconds + delta
                }
              };
            });
          }
          lastTickElapsedRef.current = totalElapsed;

          if (totalElapsed >= targetHoursRef.current * 3600 && !completedStudyDaysRef.current.includes(today)) {
            setCompletedStudyDays(prev => [...prev, today]);
          }
        }
      }, 1000);

      // Periodic save to Firestore every 30 seconds to prevent data loss
      periodicSave = setInterval(async () => {
        const now = Date.now();
        const sessionSeconds = Math.floor((now - startTime) / 1000);
        const totalElapsed = accumulatedSeconds + sessionSeconds;
        
        const todayStr = new Date().toDateString();
        const currentSubjectSeconds = subjectStudySecondsRef.current[todayStr] || {};

        await saveToFirestore(todayStr, {
          studySeconds: totalElapsed,
          subjectSeconds: currentSubjectSeconds,
          date: todayStr
        });

        // Also update chapter-specific progress
        const currentSub = selectedSubjectRef.current;
        const currentChap = selectedChapterRef.current;
        const delta = totalElapsed - lastSavedProgressSecondsRef.current;
        
        if (user && currentChap && currentSub && delta > 0) {
          const exam = (localStorage.getItem('pulse_user_exam') || 'jee').toLowerCase();
          const year = localStorage.getItem('pulse_user_year') || '2027';
          const examBase = exam === 'jee' ? 'jee' : exam;
          const examId = `${examBase}_${year}`;
          const progressRef = doc(db, 'users', user.uid, 'data', `progress-${examId}`);
          
          try {
            await setDoc(progressRef, {
              progress: {
                [currentSub]: {
                  [currentChap]: {
                    studyTime: increment(delta)
                  }
                }
              }
            }, { merge: true });
            lastSavedProgressSecondsRef.current = totalElapsed;
          } catch (error) {
            console.error("Error saving periodic chapter progress:", error);
          }
        }
      }, 30000);
    }
    return () => {
      clearInterval(interval);
      clearInterval(periodicSave);
      
      // Final save on unmount if timer was running
      if (isTimerRunning && startTime) {
        const now = Date.now();
        const sessionSeconds = Math.floor((now - startTime) / 1000);
        const totalElapsed = accumulatedSeconds + sessionSeconds;
        const todayStr = new Date().toDateString();
        const currentSub = selectedSubjectRef.current;
        const currentChap = selectedChapterRef.current;
        const delta = totalElapsed - lastSavedProgressSecondsRef.current;

        if (user) {
          const batch = writeBatch(db);
          const statsRef = doc(db, 'users', user.uid, 'dailyStats', todayStr);
          batch.set(statsRef, {
            studySeconds: totalElapsed,
            lastUpdated: serverTimestamp()
          }, { merge: true });

          if (currentChap && currentSub && delta > 0) {
            const exam = (localStorage.getItem('pulse_user_exam') || 'jee').toLowerCase();
            const year = localStorage.getItem('pulse_user_year') || '2027';
            const examBase = exam === 'jee' ? 'jee' : exam;
            const examId = `${examBase}_${year}`;
            const progressRef = doc(db, 'users', user.uid, 'data', `progress-${examId}`);
            batch.set(progressRef, {
              progress: {
                [currentSub]: {
                  [currentChap]: {
                    studyTime: increment(delta)
                  }
                }
              }
            }, { merge: true });
          }
          batch.commit().catch(err => console.error("Final unmount save failed:", err));
        }
      }
    };
  }, [isTimerRunning, startTime, accumulatedSeconds, selectedSubject]);

  const saveToFirestore = async (dateStr: string, data: any) => {
    // Safety check: Prevent saving unrealistic study time (more than 24 hours)
    if (data.studySeconds && data.studySeconds > 86400) {
      console.error("Unrealistic study time detected:", data.studySeconds);
      data.studySeconds = 86400; // Cap at 24 hours
    }

    if (!user) {
      // Update local state immediately for guest users
      if (data.questionsSolved !== undefined) {
        setDailyQuestionCounts(prev => ({ ...prev, [dateStr]: data.questionsSolved }));
        if (data.questionsSolved >= questionTarget) {
          setCompletedQuestionDays(prev => Array.from(new Set([...prev, dateStr])));
        }
      }
      if (data.studySeconds !== undefined) {
        setDailyStudySeconds(prev => ({ ...prev, [dateStr]: data.studySeconds }));
        if (data.studySeconds >= targetHours * 3600) {
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

      // Save to localStorage
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
    setStreak(calculateStreak(dailyStudySeconds, targetHours));
  }, [dailyStudySeconds, targetHours]);

  const calculateStreak = (secondsMap: Record<string, number>, target: number) => {
    let currentStreak = 0;
    let checkDate = new Date();
    checkDate.setHours(0, 0, 0, 0);
    const targetSeconds = target * 3600;

    const todayStr = checkDate.toDateString();
    const todaySeconds = secondsMap[todayStr] || 0;

    // If today's goal isn't met, check if yesterday's was. If not, streak is 0.
    if (todaySeconds < targetSeconds) {
      const yesterday = new Date(checkDate);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toDateString();
      if ((secondsMap[yesterdayStr] || 0) < targetSeconds) return 0;
      // If yesterday was met, start counting from yesterday
      checkDate = yesterday;
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
      // 1. Zero/Near-zero study time but many questions (e.g. 0hr study, 700 ques)
      if (newTotalHours < 0.2 && newTotalQuestions > 20) {
        finalScore = 0; // Eliminate from leaderboard completely
      }
      
      // 2. Impossible Rate (e.g. >120 questions per hour consistently)
      const globalRate = newTotalQuestions / Math.max(newTotalHours, 0.05);
      if (globalRate > 120 && newTotalQuestions > 30) {
        finalScore = Math.round(finalScore * 0.01); // Effectively remove from top ranks
      }

      // 3. Current session validation (e.g. adding 100 questions in 0 minutes)
      const currentRate = questions / Math.max(hours, 0.01);
      if (currentRate > 150 && questions > 20) {
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
    if (!isStatsLoaded || isTimerLoading) {
      console.warn("Cannot toggle timer: Stats not yet loaded from Firestore.");
      return;
    }

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
      await saveTimerState(true, now, newAccumulated);
    } else {
      setIsTimerRunning(false);
      setStartTime(null);
      setAccumulatedSeconds(0);
      await saveTimerState(false, null, 0);
      
      const secondsToAdd = elapsedSeconds - accumulatedSeconds;
      const sessionHours = secondsToAdd / 3600;
      if (sessionHours > 0) {
        await syncGlobalProgress(0, sessionHours);
      }

      // Final save on stop
      const currentSubjectSeconds = subjectStudySecondsRef.current[today] || {};
      
      if (!user) {
        await saveToFirestore(today, {
          studySeconds: elapsedSeconds,
          subjectSeconds: currentSubjectSeconds,
          date: today
        });
        return;
      }

      const batch = writeBatch(db);
      const statsRef = doc(db, 'users', user.uid, 'dailyStats', today);
      batch.set(statsRef, {
        studySeconds: elapsedSeconds,
        subjectSeconds: currentSubjectSeconds,
        lastUpdated: serverTimestamp()
      }, { merge: true });

      // Update chapter-specific study time in progress data
      const currentSub = selectedSubjectRef.current;
      const currentChap = selectedChapterRef.current;
      const deltaForProgress = elapsedSeconds - lastSavedProgressSecondsRef.current;

      if (currentChap && currentSub && deltaForProgress > 0) {
        const exam = (localStorage.getItem('pulse_user_exam') || 'jee').toLowerCase();
        const year = localStorage.getItem('pulse_user_year') || '2027';
        const examBase = exam === 'jee' ? 'jee' : exam;
        const examId = `${examBase}_${year}`;
        const progressRef = doc(db, 'users', user.uid, 'data', `progress-${examId}`);
        batch.set(progressRef, {
          progress: {
            [currentSub]: {
              [currentChap]: {
                studyTime: increment(deltaForProgress)
              }
            }
          }
        }, { merge: true });
        lastSavedProgressSecondsRef.current = elapsedSeconds;
      }

      try {
        await batch.commit();
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/dailyStats/${today}`);
      }
    }
  };

  const updateQuestions = useCallback(async (val: number) => {
    const diff = val - currentQuestionsRef.current;
    const today = new Date().toDateString();
    setCurrentQuestions(val);
    
    const newCounts = { ...dailyQuestionCounts, [today]: val };
    setDailyQuestionCounts(newCounts);

    // Update subject-wise question counts
    let updatedSubjectQuestions = { ...(subjectQuestionCountsRef.current[today] || {}) };
    const currentSub = selectedSubjectRef.current;
    if (currentSub) {
      const prevSubCount = updatedSubjectQuestions[currentSub] || 0;
      updatedSubjectQuestions[currentSub] = Math.max(0, prevSubCount + diff);
      setSubjectQuestionCounts(prev => ({
        ...prev,
        [today]: updatedSubjectQuestions
      }));
    }

    if (!user) {
      const localData = JSON.parse(localStorage.getItem('pulse_calendar_data') || '{}');
      if (!localData[today]) localData[today] = {};
      localData[today].questionsSolved = val;
      localData[today].subjectQuestions = updatedSubjectQuestions;
      localStorage.setItem('pulse_calendar_data', JSON.stringify(localData));
      return;
    }

    const batch = writeBatch(db);
    const statsRef = doc(db, 'users', user.uid, 'dailyStats', today);
    batch.set(statsRef, {
      questionsSolved: val,
      subjectQuestions: updatedSubjectQuestions,
      lastUpdated: serverTimestamp()
    }, { merge: true });

    // Update chapter-specific questions in progress data
    if (selectedChapterRef.current && currentSub) {
      const exam = (localStorage.getItem('pulse_user_exam') || 'jee').toLowerCase();
      const year = localStorage.getItem('pulse_user_year') || '2027';
      const examBase = exam === 'jee' ? 'jee' : exam;
      const examId = `${examBase}_${year}`;
      const progressRef = doc(db, 'users', user.uid, 'data', `progress-${examId}`);
      batch.set(progressRef, {
        progress: {
          [currentSub]: {
            [selectedChapterRef.current]: {
              questions: increment(diff)
            }
          }
        }
      }, { merge: true });
    }

    try {
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/dailyStats/${today}`);
    }

    if (diff > 0) {
      await syncGlobalProgress(diff, 0);
    }
  }, [user, dailyQuestionCounts, syncGlobalProgress]);

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
    const dateStr = new Date(year, month, d).toDateString();
    return dailyStudySeconds[dateStr] || 0;
  }).reduce((a, b) => a + b, 0);

  const monthQuestionCount = Array.from({ length: totalDays }, (_, i) => {
    const d = i + 1;
    const dateStr = new Date(year, month, d).toDateString();
    return dailyQuestionCounts[dateStr] || 0;
  }).reduce((a, b) => a + b, 0);

  const monthStudyHours = (monthStudySeconds / 3600).toFixed(1);

  const barChartData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toDateString();
    return {
      name: d.toLocaleDateString('default', { weekday: 'short' }),
      hours: Number(((dailyStudySeconds[dateStr] || 0) / 3600).toFixed(1)),
      questions: dailyQuestionCounts[dateStr] || 0,
      fullDate: dateStr
    };
  });

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
          ${isToday ? 'bg-white/10 border-blue-500/50 ring-1 ring-blue-500/20' : 'bg-white/2'}
          ${isQuestionMet && !isStudyMet ? 'bg-pink-500/10' : ''}
          ${isStudyMet && !isQuestionMet ? 'bg-blue-400/10' : ''}
          ${isQuestionMet && isStudyMet ? 'bg-gradient-to-br from-pink-500/15 to-blue-400/15' : ''}
          ${isMockTest ? 'border-blue-400/50 bg-blue-400/10' : ''}
          ${hasActivity ? 'shadow-[inset_0_0_10px_rgba(255,255,255,0.02)]' : ''}`}
      >
        <div className="flex justify-between items-start relative z-10 font-mono">
          <span className={`text-[10px] font-bold ${isToday ? 'text-blue-400' : 'text-white/30'}`}>
            {d.toString().padStart(2, '0')}
          </span>
          <div className="flex flex-col gap-0.5 items-end">
            {isToday && (
              <div className="w-1 h-1 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,1)]" />
            )}
            {isQuestionMet && (
              <div className="w-1.5 h-[2px] bg-pink-500 rounded-full shadow-[0_0_8px_rgba(236,72,153,0.5)]" />
            )}
            {isStudyMet && (
              <div className="w-1.5 h-[2px] bg-blue-400 rounded-full shadow-[0_0_8px_rgba(56,189,248,0.5)]" />
            )}
            {isMockTest && (
              <div className="flex flex-col items-end">
                <div className="w-1.5 h-[2px] bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,1)]" />
                <span className="text-[7px] font-black text-blue-400 uppercase tracking-tighter mt-0.5">Test</span>
              </div>
            )}
          </div>
        </div>
        
        <div className="absolute bottom-1 right-1 flex flex-col items-end gap-0 z-10 font-mono">
          {studySeconds > 0 && (
            <span className="text-[8px] font-black text-blue-400/90 leading-none group-hover:text-blue-400 transition-colors">
              {studyHours}H
            </span>
          )}
          {questionCount > 0 && (
            <span className="text-[8px] font-black text-rose-400/90 leading-none group-hover:text-rose-400 transition-colors">
              {questionCount}Q
            </span>
          )}
        </div>
        
        <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/0 to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          <span className="text-[8px] font-black text-white/20 uppercase tracking-tighter">Click to tag</span>
        </div>
        
        {hasActivity && (
          <div className="absolute bottom-0 left-0 right-0 h-[1px] flex">
            {studySeconds > 0 && (
              <div 
                className="h-full bg-blue-400/50" 
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
              className="bg-zinc-900 border border-white/10 p-8 rounded-[32px] max-w-sm w-full text-center"
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
        <div className="w-full max-w-4xl">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
            <div className="flex items-center gap-6">
              <div className="relative">
                <div className="w-16 h-16 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center group overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/20 via-pink-500/20 to-violet-500/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <Activity className="w-8 h-8 text-white group-hover:scale-110 transition-transform relative z-10" />
                </div>
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-pink-500 rounded-full border-2 border-black" />
              </div>
              <div>
                <h1 className="text-3xl font-black text-white tracking-tighter uppercase font-sans bg-gradient-to-r from-yellow-400 via-pink-400 to-violet-400 bg-clip-text text-transparent">Mission</h1>
                <div className="flex items-center gap-2">
                  <div className="w-1 h-1 bg-green-400 rounded-full animate-pulse" />
                  <p className="text-[9px] font-mono font-bold text-white/30 uppercase tracking-[0.3em]">Operational • v2.5.0</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3 bg-white/5 p-1.5 rounded-[22px] border border-white/10 backdrop-blur-xl w-full md:w-auto">
              <button 
                onClick={() => setActiveTab('timer')}
                className={`flex-1 md:flex-none px-10 py-3.5 rounded-[18px] text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 relative overflow-hidden group
                  ${activeTab === 'timer' ? 'bg-violet-600 text-white shadow-[0_10px_30px_rgba(139,92,246,0.4)]' : 'text-white/30 hover:text-white/60 hover:bg-white/5'}`}
              >
                <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <Clock className={`w-4 h-4 ${activeTab === 'timer' ? 'text-white' : 'text-violet-400'}`} />
                Timer
              </button>
              <button 
                onClick={() => setActiveTab('test')}
                className={`flex-1 md:flex-none px-10 py-3.5 rounded-[18px] text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 relative overflow-hidden group
                  ${activeTab === 'test' ? 'bg-pink-600 text-white shadow-[0_10px_30px_rgba(236,72,153,0.4)]' : 'text-white/30 hover:text-white/60 hover:bg-white/5'}`}
              >
                <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <CalendarIcon className={`w-4 h-4 ${activeTab === 'test' ? 'text-white' : 'text-pink-400'}`} />
                Tests
              </button>
            </div>
          </div>

          {/* Motivational Quote Banner */}
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full mb-8 relative group"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 via-blue-600/10 to-purple-600/10 rounded-2xl blur-xl opacity-50" />
            <div className="relative py-6 px-10 rounded-xl bg-black/60 backdrop-blur-xl border border-white/10 overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl">
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

          <AnimatePresence mode="wait">
            {activeTab === 'timer' ? (
              <motion.div
                key="timer-tab"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
              >
                {/* Monthly Stats Summary */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-8 rounded-[40px] glass bg-white/[0.02] border border-white/5 flex items-center justify-between group hover:bg-white/[0.04] transition-all"
                  >
                    <div>
                      <div className="text-[9px] font-black text-amber-500/40 uppercase tracking-widest mb-2 font-mono">Monthly Volume</div>
                      <div className="text-4xl font-mono font-bold text-amber-400 tracking-tight">{monthStudyHours}H</div>
                      <div className="mt-2 text-[8px] text-white/10 uppercase font-black tracking-widest">Time Logs Verified</div>
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
                      <div className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Questions</div>
                      <div className="text-3xl font-mono font-bold text-blue-400">{monthQuestionCount}</div>
                      <div className="mt-1 text-[9px] text-white/20 uppercase font-bold tracking-wider">This Month</div>
                    </div>
                    <div className="p-4 rounded-2xl bg-blue-500/10 text-blue-400">
                      <Target className="w-6 h-6" />
                    </div>
                  </motion.div>
                </div>

                {/* Trackers Section */}
                <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr_1fr] gap-8 mb-12 items-start">
                  {/* Left Column: Stats & Metrics */}
                  <div className="space-y-6 order-2 lg:order-1">
                    <PerformanceNode 
                      elapsedSeconds={elapsedSeconds} 
                      targetHours={targetHours} 
                      currentQuestions={currentQuestions} 
                    />

                    <StreakBox 
                      streak={streak} 
                      dailyStudySeconds={dailyStudySeconds} 
                    />
                  </div>

                  {/* Center Column: Futuristic Stopwatch */}
                  <div className="order-1 lg:order-2">
                    <motion.div 
                      whileHover={{ scale: 1.02 }}
                      className="p-10 rounded-[60px] bg-neutral-950 border border-white/10 flex flex-col items-center justify-center text-center group relative overflow-hidden w-full max-w-[450px] mx-auto will-change-transform"
                    >
                      {/* Animated Background Rings */}
                      <div className="absolute inset-0 z-0">
                        <motion.div 
                          animate={{ rotate: 360 }}
                          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] border border-white/5 rounded-full border-dashed"
                        />
                        <motion.div 
                          animate={{ rotate: -360 }}
                          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] h-[90%] border border-white/5 rounded-full border-dashed"
                        />
                      </div>

                      {/* RGB Border Animation */}
                      <div className="absolute inset-0 p-[2px] overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-blue-500/10 to-purple-500/10 opacity-50" />
                      </div>

                      {/* Fast Moving White Light Border */}
                      {isTimerRunning && (
                        <div className="absolute inset-0 p-[2px] overflow-hidden">
                          <motion.div
                            animate={{ rotate: [0, 360] }}
                            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] bg-[conic-gradient(from_0deg,transparent_0deg,transparent_160deg,#ffffff_180deg,transparent_200deg,transparent_360deg)] opacity-60"
                          />
                        </div>
                      )}
                      
                      <div className="absolute inset-[2px] bg-black rounded-[58px] z-0" />

                      <div className="relative z-10 flex flex-col items-center w-full">
                        <div className="flex flex-col w-full mb-10">
                          <div className="flex items-center justify-center gap-2 mb-4">
                            <Rocket className="w-4 h-4 text-purple-400" />
                            <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.4em]">Mission Status</span>
                          </div>
                          
                          {/* Subject Selection */}
                          <div className="flex flex-wrap justify-center gap-2 mb-6">
                            {availableSubjects.map((sub, idx) => {
                              const colors = [
                                'border-yellow-500/20 text-yellow-400 group-hover:border-yellow-500/50 group-hover:bg-yellow-500/5',
                                'border-red-500/20 text-red-400 group-hover:border-red-500/50 group-hover:bg-red-500/5',
                                'border-green-500/20 text-green-400 group-hover:border-green-500/50 group-hover:bg-green-500/5',
                                'border-pink-500/20 text-pink-400 group-hover:border-pink-500/50 group-hover:bg-pink-500/5',
                                'border-violet-500/20 text-violet-400 group-hover:border-violet-500/50 group-hover:bg-violet-500/5'
                              ];
                              const activeColors = [
                                'bg-yellow-500 border-yellow-400 text-black shadow-[0_10px_30px_rgba(234,179,8,0.3)]',
                                'bg-red-500 border-red-400 text-white shadow-[0_10px_30px_rgba(239,68,68,0.3)]',
                                'bg-green-500 border-green-400 text-black shadow-[0_10px_30px_rgba(34,197,94,0.3)]',
                                'bg-pink-500 border-pink-400 text-white shadow-[0_10px_30px_rgba(236,72,153,0.3)]',
                                'bg-violet-500 border-violet-400 text-white shadow-[0_10px_30px_rgba(139,92,246,0.3)]'
                              ];
                              const colorIndex = idx % colors.length;
                              
                              return (
                                <button
                                  key={sub}
                                  onClick={() => {
                                    if (!isTimerRunning) {
                                      setSelectedSubject(sub);
                                      localStorage.setItem('pulse_selected_subject', sub);
                                    }
                                  }}
                                  disabled={isTimerRunning}
                                  className={`group px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all border
                                    ${selectedSubject === sub 
                                      ? activeColors[colorIndex]
                                      : `bg-white/2 ${colors[colorIndex]} hover:scale-105`}
                                    ${isTimerRunning ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer active:scale-95'}`}
                                >
                                  {sub}
                                </button>
                              );
                            })}
                          </div>

                          {/* Chapter Dropdown */}
                          {selectedSubject && availableChapters.length > 0 && (
                            <motion.div 
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="w-full px-4"
                            >
                              <div className="text-[8px] font-black text-white/20 uppercase tracking-widest mb-2 text-left ml-2">Active Chapter</div>
                              <select
                                value={selectedChapter}
                                onChange={(e) => setSelectedChapter(e.target.value)}
                                disabled={isTimerRunning}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-[10px] font-black text-white/80 uppercase tracking-widest focus:outline-none focus:border-purple-500/50 transition-all appearance-none cursor-pointer disabled:opacity-50"
                              >
                                {availableChapters.map(chapter => (
                                  <option key={chapter.id} value={chapter.id} className="bg-zinc-900 text-white">
                                    {chapter.name}
                                  </option>
                                ))}
                              </select>
                            </motion.div>
                          )}
                        </div>
                        
                        <div className="relative mb-10">
                          {isTimerLoading ? (
                            <PulseLoader size={64} />
                          ) : (
                            <div className="relative">
                              {isTimerRunning && (
                            <>
                              <motion.div
                                animate={{ 
                                  scale: [1, 1.8, 1],
                                  opacity: [0.1, 0.5, 0.1]
                                }}
                                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                                className="absolute inset-0 bg-violet-500/30 rounded-full blur-[80px]"
                              />
                              <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                                className="absolute -inset-10 border border-dashed border-violet-500/20 rounded-full"
                              />
                            </>
                          )}
                          <div className="flex flex-col items-center">
                            <div className="text-8xl font-mono font-black text-white tracking-tighter tabular-nums relative">
                              <span className="bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(255,255,255,0.2)]">
                                {formatTime(elapsedSeconds)}
                              </span>
                            </div>
                            <div className="mt-4 flex items-center gap-3">
                              <div className="h-px w-8 bg-gradient-to-r from-transparent to-white/10" />
                              <div className="text-[9px] font-mono font-bold text-white/20 uppercase tracking-[0.6em]">System Active</div>
                              <div className="h-px w-8 bg-gradient-to-l from-transparent to-white/10" />
                            </div>
                          </div>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-4 w-full">
                          <button 
                            onClick={toggleTimer}
                            disabled={isTimerLoading}
                            className={`flex-1 py-6 rounded-[28px] font-black uppercase tracking-[0.25em] text-[10px] transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-4 group relative overflow-hidden
                              ${isTimerRunning 
                                ? 'bg-red-600/90 text-white shadow-[0_20px_40px_rgba(220,38,38,0.3)]' 
                                : 'bg-violet-600 text-white shadow-[0_20px_40px_rgba(139,92,246,0.3)] hover:scale-[1.02]'}`}
                          >
                            <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            {isTimerRunning ? <Activity className="w-4 h-4 animate-pulse text-white" /> : <ZapIcon className="w-4 h-4 text-yellow-400 fill-yellow-400" />}
                            {isTimerLoading || !isStatsLoaded ? 'Process Sync...' : (isTimerRunning ? 'Terminate Sequence' : 'Initialize Protocol')}
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  </div>

                  {/* Right Column: Question Tracker */}
                  <QuestionLab 
                    currentQuestions={currentQuestions} 
                    updateQuestions={updateQuestions} 
                    playTickSound={playTickSound} 
                  />
                </div>

          {/* Distribution Charts */}
          <DistributionCharts 
            subjectStudySeconds={subjectStudySeconds}
            subjectQuestionCounts={subjectQuestionCounts}
            dailyStudySeconds={dailyStudySeconds}
            dailyQuestionCounts={dailyQuestionCounts}
            getSubjectColor={getSubjectColor}
          />

          {/* Bar Graphs Section */}
          <BarGraphs 
            barChartData={barChartData}
            targetHours={targetHours}
            questionTarget={questionTarget}
          />

          {/* Go to Test Section Button */}
          <div className="flex justify-center mb-12">
            <button 
              onClick={() => setActiveTab('test')}
              className="p-4 rounded-2xl bg-purple-600/10 border border-purple-500/20 text-purple-400 hover:bg-purple-600/20 transition-all flex flex-col items-center gap-2 group w-32 h-32 justify-center"
            >
              <CalendarIcon className="w-6 h-6 group-hover:scale-110 transition-transform" />
              <span className="text-[8px] font-black uppercase tracking-[0.2em] text-center leading-tight">Test<br/>Section</span>
            </button>
          </div>
        </motion.div>
      ) : (
        <motion.div
          key="test-tab"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
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
          <div className="grid grid-cols-1 gap-6 mb-12">
            <div className="p-6 rounded-3xl glass">
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
    </AnimatePresence>
  </div>
</div>
</div>
  );
};

export default TimerPage;
