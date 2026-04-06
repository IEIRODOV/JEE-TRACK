import React, { useState, useEffect } from 'react';
import { Plus, Trash2, CheckCircle2, Circle, Target } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, onAuthStateChanged, db, doc, onSnapshot, setDoc, User, handleFirestoreError, OperationType } from '@/src/firebase';

interface TargetItem {
  id: string;
  text: string;
  completed: boolean;
}

const DailyTargets = () => {
  const [user, setUser] = useState<User | null>(null);
  const [targets, setTargets] = useState<TargetItem[]>([]);
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      const saved = localStorage.getItem('jee-daily-targets');
      if (saved) {
        try {
          setTargets(JSON.parse(saved));
        } catch (e) {
          console.error("Failed to parse daily targets", e);
        }
      }
      return;
    }

    const unsubscribe = onSnapshot(doc(db, 'users', user.uid, 'data', 'dailyTargets'), (doc) => {
      if (doc.exists()) {
        setTargets(doc.data().items || []);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${user.uid}/data/dailyTargets`, false);
    });

    return () => unsubscribe();
  }, [user]);

  const saveTargets = async (newTargets: TargetItem[]) => {
    setTargets(newTargets);
    if (user) {
      try {
        await setDoc(doc(db, 'users', user.uid, 'data', 'dailyTargets'), { items: newTargets });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/data/dailyTargets`);
      }
    } else {
      localStorage.setItem('jee-daily-targets', JSON.stringify(newTargets));
    }
  };

  const addTarget = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const newTarget: TargetItem = {
      id: Date.now().toString(),
      text: inputValue.trim(),
      completed: false,
    };

    saveTargets([...targets, newTarget]);
    setInputValue('');
  };

  const toggleTarget = (id: string) => {
    const newTargets = targets.map(t => 
      t.id === id ? { ...t, completed: !t.completed } : t
    );
    saveTargets(newTargets);
  };

  const deleteTarget = (id: string) => {
    const newTargets = targets.filter(t => t.id !== id);
    saveTargets(newTargets);
  };

  const completedCount = targets.filter(t => t.completed).length;

  return (
    <div className="w-full max-w-sm mx-auto px-4 mt-4 mb-8">
      <div className="rounded-xl border border-white/10 backdrop-blur-xl bg-white/5 p-3.5 shadow-2xl">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-lg bg-emerald-500/20 text-emerald-400">
              <Target className="w-3.5 h-3.5" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white tracking-tight font-heading uppercase">Daily Targets</h2>
              <p className="text-white/20 text-[7px] tracking-wider uppercase font-bold">Stay Focused</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-lg font-black text-white font-heading">{completedCount}</span>
            <span className="text-white/30 text-[9px] ml-1 font-bold">/ {targets.length}</span>
          </div>
        </div>

        <form onSubmit={addTarget} className="relative mb-3">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Next target..."
            className="w-full bg-white/5 border border-white/10 rounded-lg py-1.5 pl-3 pr-10 text-[11px] text-white placeholder:text-white/10 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 transition-all"
          />
          <button
            type="submit"
            className="absolute right-1 top-1 bottom-1 px-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-md transition-colors flex items-center justify-center"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </form>

        <div className="space-y-1 max-h-[200px] overflow-y-auto custom-scrollbar pr-1">
          <AnimatePresence initial={false}>
            {targets.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-4 border border-dashed border-white/5 rounded-lg"
              >
                <p className="text-white/10 text-[10px] italic">Set your goals.</p>
              </motion.div>
            ) : (
              targets.map((target) => (
                <motion.div
                  key={target.id}
                  initial={{ opacity: 0, x: -5 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className={`group flex items-center gap-2 p-1.5 rounded-lg border transition-all duration-200
                    ${target.completed 
                      ? 'bg-white/2 border-transparent text-white/20' 
                      : 'bg-white/5 border-white/5 text-white/80 hover:border-emerald-500/20 hover:bg-white/10'}`}
                >
                  <button
                    onClick={() => toggleTarget(target.id)}
                    className={`shrink-0 transition-colors ${target.completed ? 'text-emerald-500' : 'text-white/10 hover:text-white/30'}`}
                  >
                    {target.completed ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : (
                      <Circle className="w-3.5 h-3.5" />
                    )}
                  </button>
                  
                  <span className={`flex-1 text-[10px] font-medium transition-all ${target.completed ? 'line-through' : ''}`}>
                    {target.text}
                  </span>

                  <button
                    onClick={() => deleteTarget(target.id)}
                    className="opacity-0 group-hover:opacity-100 p-0.5 text-white/10 hover:text-rose-500 hover:bg-rose-500/10 rounded-md transition-all"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>

        {targets.length > 0 && (
          <div className="mt-3 pt-3 border-t border-white/5">
            <div className="flex justify-between items-center mb-1 px-1">
              <span className="text-[8px] uppercase tracking-widest text-white/20 font-bold">Progress</span>
              <span className="text-[8px] font-black text-emerald-400">{Math.round((completedCount / targets.length) * 100)}%</span>
            </div>
            <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(completedCount / targets.length) * 100}%` }}
                className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.3)]"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DailyTargets;
