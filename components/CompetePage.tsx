import React, { useState, useEffect } from 'react';
import { Trophy, Users, Target, Zap, ChevronRight, Globe, ShieldCheck, TrendingUp, Medal } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import AnoAI from "@/components/ui/animated-shader-background";
import { auth, db, googleProvider, signInWithPopup, onAuthStateChanged, doc, setDoc, getDoc, onSnapshot, collection, query, orderBy, limit, User } from '@/src/firebase';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 15
    }
  }
};

const CompetePage = () => {
  const [user, setUser] = useState<User | null>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([
    { displayName: 'Aman Sharma', totalQuestions: 1250, totalHours: 420, photoURL: 'https://picsum.photos/seed/user1/64/64', rank: 1, streak: 15 },
    { displayName: 'Priya Kapoor', totalQuestions: 1180, totalHours: 385, photoURL: 'https://picsum.photos/seed/user2/64/64', rank: 2, streak: 12 },
    { displayName: 'Rahul Verma', totalQuestions: 1050, totalHours: 350, photoURL: 'https://picsum.photos/seed/user3/64/64', rank: 3, streak: 8 },
    { displayName: 'Sneha Mishra', totalQuestions: 980, totalHours: 320, photoURL: 'https://picsum.photos/seed/user4/64/64', rank: 4, streak: 20 },
    { displayName: 'Vikram Singh', totalQuestions: 920, totalHours: 310, photoURL: 'https://picsum.photos/seed/user5/64/64', rank: 5, streak: 5 },
  ]);

  const [dbError, setDbError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const userRef = doc(db, 'users', currentUser.uid);
          const userSnap = await getDoc(userRef);
          
          if (!userSnap.exists()) {
            await setDoc(userRef, {
              uid: currentUser.uid,
              displayName: currentUser.displayName,
              photoURL: currentUser.photoURL,
              totalQuestions: 0,
              totalStudySeconds: 0,
              lastUpdated: new Date().toISOString()
            });
          }
        } catch (err) {
          console.error("User sync error:", err);
          setDbError("Firebase project not fully configured. Please check your Firebase Console.");
        }
      }
    });

    const q = query(collection(db, 'users'), orderBy('totalQuestions', 'desc'), limit(10));
    const unsubscribeLeaderboard = onSnapshot(q, (snapshot) => {
      const players = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      if (players.length > 0) {
        setLeaderboard(players);
        setDbError(null);
      }
    }, (error) => {
      console.error("Leaderboard error:", error);
      if (error.message.includes("Missing or insufficient permissions") || error.message.includes("client is offline")) {
        setDbError("Database connection failed. Please ensure Firestore is enabled in your Firebase Console.");
      }
    });

    return () => {
      unsubscribe();
      unsubscribeLeaderboard();
    };
  }, []);

  const handleGoogleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Sign in error:", error);
    }
  };

  return (
    <div className="w-full min-h-screen bg-black overflow-x-hidden relative">
      <AnoAI />
      
      {/* Background Text */}
      <div className="fixed top-20 left-4 pointer-events-none select-none z-0 opacity-10">
        <h2 className="text-[180px] font-serif font-black leading-none text-white tracking-tighter">
          RANK
        </h2>
      </div>

      <div className="relative z-10 flex flex-col items-center pt-16 pb-32 px-4">
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="w-full max-w-4xl"
        >
          {/* Header */}
          <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-px bg-blue-500" />
                <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em]">Global Arena</span>
              </div>
              <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter font-heading uppercase leading-none">
                Compete <span className="text-white/20">Now</span>
              </h1>
            </div>

            {!user ? (
              <button 
                onClick={handleGoogleSignIn}
                className="flex items-center gap-3 bg-white text-black px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/90 transition-all shadow-[0_0_30px_rgba(255,255,255,0.2)]"
              >
                <Globe className="w-4 h-4" />
                Join the Arena
              </button>
            ) : (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3 bg-white/5 border border-white/10 p-2 rounded-2xl backdrop-blur-xl">
                  <img src={user.photoURL || 'https://picsum.photos/seed/me/64/64'} className="w-8 h-8 rounded-full border border-white/20" alt="Profile" referrerPolicy="no-referrer" />
                  <div className="pr-2">
                    <span className="block text-[11px] font-black text-white uppercase tracking-wider">{user.displayName}</span>
                    <span className="block text-[9px] font-bold text-emerald-400 uppercase tracking-widest">Rank #1240</span>
                  </div>
                </div>
                <button 
                  onClick={() => auth.signOut()}
                  className="p-3 rounded-2xl bg-white/5 border border-white/10 text-white/40 hover:text-white/80 transition-colors"
                >
                  <Zap className="w-4 h-4" />
                </button>
              </div>
            )}
          </motion.div>

          {/* Error Message */}
          <AnimatePresence>
            {dbError && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-8 p-4 rounded-3xl border border-rose-500/20 bg-rose-500/5 backdrop-blur-xl flex items-center gap-3"
              >
                <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <p className="text-rose-400 text-[10px] font-bold uppercase tracking-widest">{dbError}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Stats Bar */}
          <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
            {[
              { icon: Users, label: 'Total Students', value: '12,450+', color: 'text-blue-400', bg: 'bg-blue-500/10' },
              { icon: Target, label: 'Questions Solved', value: '1.2M+', color: 'text-rose-400', bg: 'bg-rose-500/10' },
              { icon: TrendingUp, label: 'Avg. Study Time', value: '8.4h/day', color: 'text-emerald-400', bg: 'bg-emerald-500/10' }
            ].map((stat, i) => (
              <div key={i} className="p-6 rounded-3xl glass group hover:bg-white/10 transition-all">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`p-2 rounded-xl ${stat.bg} ${stat.color}`}>
                    <stat.icon className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">{stat.label}</span>
                </div>
                <div className="text-3xl font-mono font-bold text-white group-hover:text-glow transition-all">{stat.value}</div>
              </div>
            ))}
          </motion.div>

          {/* Leaderboard Container */}
          <motion.div variants={itemVariants} className="rounded-[40px] glass overflow-hidden shadow-2xl">
            <div className="p-8 border-b border-white/10 bg-white/5 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-white tracking-tight uppercase font-heading">Top Performers</h2>
                <p className="text-[9px] font-bold text-white/30 uppercase tracking-[0.3em]">Updated Real-time</p>
              </div>
              <div className="p-3 rounded-2xl bg-blue-500/20 text-blue-400 border border-blue-500/20">
                <Medal className="w-5 h-5" />
              </div>
            </div>
            
            <div className="divide-y divide-white/5">
              {leaderboard.map((player, idx) => (
                <motion.div 
                  key={idx} 
                  whileHover={{ backgroundColor: 'rgba(255,255,255,0.03)' }}
                  className="flex items-center justify-between p-6 transition-all group"
                >
                  <div className="flex items-center gap-6">
                    <div className="w-10 flex justify-center">
                      {idx < 3 ? (
                        <div className={`w-8 h-8 rounded-2xl flex items-center justify-center text-xs font-black rotate-3 group-hover:rotate-0 transition-transform
                          ${idx === 0 ? 'bg-yellow-500 text-black shadow-[0_0_20px_rgba(234,179,8,0.4)]' : 
                            idx === 1 ? 'bg-slate-300 text-black shadow-[0_0_20px_rgba(203,213,225,0.4)]' : 
                            'bg-amber-700 text-white shadow-[0_0_20px_rgba(180,83,9,0.4)]'}`}>
                          {idx + 1}
                        </div>
                      ) : (
                        <span className="text-sm font-black text-white/20">{idx + 1}</span>
                      )}
                    </div>
                    <div className="relative">
                      <img src={player.photoURL} className="w-12 h-12 rounded-2xl border border-white/10 group-hover:border-blue-500/50 transition-all" alt={player.displayName} referrerPolicy="no-referrer" />
                      {player.streak > 10 && (
                        <div className="absolute -top-2 -right-2 w-5 h-5 bg-rose-500 rounded-full flex items-center justify-center shadow-lg border-2 border-black">
                          <Zap className="w-2.5 h-2.5 text-white fill-white" />
                        </div>
                      )}
                    </div>
                    <div>
                      <span className="block text-base font-bold text-white group-hover:text-blue-400 transition-colors">{player.displayName}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Streak: {player.streak} Days</span>
                        <div className="w-1 h-1 bg-white/20 rounded-full" />
                        <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Level 42</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-8">
                    <div className="text-right">
                      <div className="text-lg font-black text-rose-400 leading-none">{player.totalQuestions}</div>
                      <div className="text-[9px] font-bold text-white/20 uppercase tracking-widest mt-1">Solved</div>
                    </div>
                    <div className="text-right w-20">
                      <div className="text-lg font-black text-emerald-400 leading-none">{player.totalHours}h</div>
                      <div className="text-[9px] font-bold text-white/20 uppercase tracking-widest mt-1">Study</div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-white/10 group-hover:text-white/40 group-hover:translate-x-1 transition-all" />
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Join Banner */}
          {!user && (
            <motion.div 
              variants={itemVariants}
              whileHover={{ scale: 1.01 }}
              className="mt-12 p-8 rounded-[40px] border border-blue-500/20 bg-blue-500/5 backdrop-blur-xl relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 p-12 opacity-5 group-hover:scale-110 group-hover:rotate-12 transition-all duration-700">
                <Trophy className="w-48 h-48 text-blue-400" />
              </div>
              <div className="relative z-10">
                <h3 className="text-2xl font-black text-white uppercase tracking-tight font-heading mb-3">Ready to climb the ranks?</h3>
                <p className="text-white/60 text-sm mb-8 max-w-md leading-relaxed">Join thousands of aspirants. Track your progress, earn badges, and see where you stand globally.</p>
                <button 
                  onClick={handleGoogleSignIn}
                  className="bg-white text-black px-10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:scale-105"
                >
                  Create Your Profile
                </button>
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default CompetePage;
