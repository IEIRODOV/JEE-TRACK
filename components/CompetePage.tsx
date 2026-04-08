import React, { useState, useEffect } from 'react';
import { Trophy, Users, Target, Zap, ChevronRight, Globe, ShieldCheck, TrendingUp, Medal, Plus, Share2, Award, Clock } from 'lucide-react';
import PulseLoader from "@/components/ui/pulse-loader";
import { motion, AnimatePresence } from 'motion/react';
import AnoAI from "@/components/ui/animated-shader-background";
import { auth, onAuthStateChanged, User, db, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, limit, Timestamp, setDoc, doc, getDoc, getDocs, where, arrayUnion, increment, handleFirestoreError, OperationType } from '@/src/firebase';

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

interface CompetePageProps {
  onAuthRequest?: () => void;
}

const CompetePage = ({ onAuthRequest }: CompetePageProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [globalStats, setGlobalStats] = useState({ totalStudents: 0, totalQuestions: 0, totalHours: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);
  const [friendCode, setFriendCode] = useState<string>('');
  const [inputCode, setInputCode] = useState<string>('');
  const [friends, setFriends] = useState<any[]>([]);
  const [isLinking, setIsLinking] = useState(false);

  useEffect(() => {
    if (user) {
      // Generate short code from UID if not exists
      const shortCode = user.uid.substring(0, 6).toUpperCase();
      setFriendCode(shortCode);
      
      // Save code to user profile for lookup
      setDoc(doc(db, 'users', user.uid), { friendCode: shortCode }, { merge: true });
    }
  }, [user]);

  // Friends Data Listener
  useEffect(() => {
    if (!user) return;

    const unsubscribe = onSnapshot(doc(db, 'users', user.uid), async (userDoc) => {
      if (userDoc.exists()) {
        const friendIds = userDoc.data().friends || [];
        if (friendIds.length > 0) {
          // Listen to each friend's daily stats
          const friendsData: any[] = [];
          for (const fId of friendIds) {
            const fDoc = await getDoc(doc(db, 'users', fId));
            if (fDoc.exists()) {
              const today = new Date().toDateString();
              const statsDoc = await getDoc(doc(db, 'users', fId, 'dailyStats', today));
              friendsData.push({
                uid: fId,
                displayName: fDoc.data().displayName || 'Friend',
                photoURL: fDoc.data().photoURL,
                stats: statsDoc.exists() ? statsDoc.data() : { studySeconds: 0, questionsSolved: 0 }
              });
            }
          }
          setFriends(friendsData);
        }
      }
    });

    return () => unsubscribe();
  }, [user]);

  const handleLinkFriend = async () => {
    if (!user || !inputCode.trim()) return;
    setIsLinking(true);

    try {
      // Find user by friend code
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('friendCode', '==', inputCode.trim().toUpperCase()));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        alert("Invalid friend code!");
        setIsLinking(false);
        return;
      }

      const friendDoc = querySnapshot.docs[0];
      const friendId = friendDoc.id;

      if (friendId === user.uid) {
        alert("You cannot add yourself!");
        setIsLinking(false);
        return;
      }

      // Mutual friendship
      await setDoc(doc(db, 'users', user.uid), {
        friends: arrayUnion(friendId)
      }, { merge: true });

      await setDoc(doc(db, 'users', friendId), {
        friends: arrayUnion(user.uid)
      }, { merge: true });

      alert("Friend linked successfully!");
      setInputCode('');
    } catch (error) {
      console.error("Error linking friend:", error);
      alert("Failed to link friend.");
    } finally {
      setIsLinking(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // Leaderboard Listener
  useEffect(() => {
    const q = query(
      collection(db, 'leaderboard'),
      orderBy('totalQuestions', 'desc'),
      limit(10)
    );

    console.log('Attaching leaderboard listener...');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      console.log('Leaderboard snapshot received, size:', snapshot.size);
      const players: any[] = [];
      snapshot.forEach((doc) => {
        players.push({ uid: doc.id, ...doc.data() });
      });
      setLeaderboard(players);
      setIsLoading(false);
    }, (error) => {
      console.error('Leaderboard listener error:', error);
      handleFirestoreError(error, OperationType.LIST, 'leaderboard', false);
      setDbError("Failed to sync leaderboard.");
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Global Stats Listener
  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'stats', 'global'), (doc) => {
      if (doc.exists()) {
        setGlobalStats(doc.data() as any);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'stats/global', false);
    });
    return () => unsubscribe();
  }, []);

  // Activity Feed Listener
  useEffect(() => {
    const q = query(
      collection(db, 'activity'),
      orderBy('createdAt', 'desc'),
      limit(10)
    );

    console.log('Attaching activity listener...');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      console.log('Activity snapshot received, size:', snapshot.size);
      const feed: any[] = [];
      snapshot.forEach((doc) => {
        feed.push({ id: doc.id, ...doc.data() });
      });
      setActivities(feed);
    }, (error) => {
      console.error('Activity listener error:', error);
      handleFirestoreError(error, OperationType.LIST, 'activity', false);
    });

    return () => unsubscribe();
  }, []);

  const userStats = leaderboard.find(p => p.uid === user?.uid) || { totalQuestions: 0, totalHours: 0, streak: 0 };
  const nextRankThreshold = 2000;
  const progressToNext = Math.min((userStats.totalQuestions / nextRankThreshold) * 100, 100);

  const formatTimeAgo = (timestamp: Timestamp | null) => {
    if (!timestamp) return 'Just now';
    const seconds = Math.floor((Date.now() - timestamp.toDate().getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return timestamp.toDate().toLocaleDateString();
  };

  return (
    <div className="w-full min-h-screen bg-black overflow-x-hidden relative">
      <AnoAI />
      
      <div className="relative z-10 flex flex-col items-center pt-16 pb-32 px-4">
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="w-full max-w-4xl"
        >
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

            <div className="flex items-center gap-3">
              {!user ? (
                <button 
                  onClick={onAuthRequest}
                  className="flex items-center gap-3 bg-white text-black px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/90 transition-all shadow-[0_0_30px_rgba(255,255,255,0.2)]"
                >
                  <Globe className="w-4 h-4" />
                  Join the Arena
                </button>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="flex flex-col items-start gap-1 bg-white/5 border border-white/10 p-2.5 rounded-2xl backdrop-blur-xl transition-all text-left min-w-[180px] group">
                    <div className="flex items-center gap-3 w-full">
                      <img src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName || user.email}&background=random`} className="w-8 h-8 rounded-full border border-white/20 transition-colors" alt="Profile" referrerPolicy="no-referrer" />
                      <div className="flex-1 min-w-0">
                        <span className="block text-[10px] font-black text-white uppercase tracking-wider truncate">{user.displayName || user.email?.split('@')[0]}</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[8px] font-bold text-emerald-400 uppercase tracking-widest">Rank #{leaderboard.findIndex(p => p.uid === user.uid) + 1 || '--'}</span>
                          <div className="w-1 h-1 bg-white/20 rounded-full" />
                          <span className="text-[8px] font-bold text-white/40 uppercase tracking-widest">{userStats.totalQuestions} Pts</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="w-full mt-2">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[6px] font-black text-white/20 uppercase tracking-widest">Next Rank</span>
                        <span className="text-[6px] font-black text-emerald-400">{Math.round(progressToNext)}%</span>
                      </div>
                      <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${progressToNext}%` }}
                          className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                        />
                      </div>
                    </div>
                  </div>

                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      const rank = leaderboard.findIndex(p => p.uid === user.uid) + 1;
                      const text = `I'm ranked #${rank || '--'} on EXAM PULSE with ${userStats.totalQuestions} points! Join me: ${window.location.origin}`;
                      navigator.clipboard.writeText(text);
                      alert("Rank shared to clipboard!");
                    }}
                    className="p-3.5 rounded-2xl bg-white/5 border border-white/10 text-white/40 hover:text-blue-400 hover:bg-blue-500/10 transition-all"
                    title="Share Rank"
                  >
                    <Share2 className="w-4 h-4" />
                  </motion.button>

                  <button 
                    onClick={() => auth.signOut()}
                    className="p-3.5 rounded-2xl bg-white/5 border border-white/10 text-white/40 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                    title="Sign Out"
                  >
                    <Zap className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </motion.div>

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

          <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
            {[
              { icon: Users, label: 'Total Students', value: `${globalStats.totalStudents.toLocaleString()}`, color: 'text-blue-400', bg: 'bg-blue-500/10', detail: 'Active this month' },
              { icon: Target, label: 'Questions Solved', value: globalStats.totalQuestions >= 1000000 ? `${(globalStats.totalQuestions / 1000000).toFixed(1)}M+` : globalStats.totalQuestions >= 1000 ? `${(globalStats.totalQuestions / 1000).toFixed(1)}K+` : globalStats.totalQuestions.toString(), color: 'text-rose-400', bg: 'bg-rose-500/10', detail: 'Across all subjects' },
              { 
                icon: TrendingUp, 
                label: 'Avg. Study Time', 
                value: `${globalStats.totalStudents > 0 
                  ? Math.min(9.2, globalStats.totalHours / globalStats.totalStudents).toFixed(1) 
                  : '0'}h/day`, 
                color: 'text-emerald-400', 
                bg: 'bg-emerald-500/10', 
                detail: 'Peak focus hours' 
              }
            ].map((stat, i) => (
              <motion.div 
                key={i} 
                whileHover={{ y: -5, backgroundColor: 'rgba(255,255,255,0.08)' }}
                className="p-6 rounded-3xl glass group cursor-help transition-all relative overflow-hidden"
              >
                <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <stat.icon className="w-24 h-24" />
                </div>
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`p-2 rounded-xl ${stat.bg} ${stat.color}`}>
                      <stat.icon className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">{stat.label}</span>
                  </div>
                  <div className="text-3xl font-mono font-bold text-white group-hover:text-glow transition-all mb-1">{stat.value}</div>
                  <div className="text-[8px] font-bold text-white/20 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">{stat.detail}</div>
                </div>
              </motion.div>
            ))}
          </motion.div>

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
              {isLoading ? (
                <div className="p-12 flex flex-col items-center justify-center gap-4">
                  <PulseLoader size={32} />
                </div>
              ) : leaderboard.length === 0 ? (
                <div className="p-12 text-center">
                  <p className="text-white/20 text-[10px] font-black uppercase tracking-widest">No data in the arena yet.</p>
                </div>
              ) : (
                leaderboard.map((player, idx) => {
                  const isCurrentUser = player.uid === user?.uid;
                  return (
                    <motion.div 
                      key={idx} 
                      whileHover={{ backgroundColor: 'rgba(255,255,255,0.03)' }}
                      className={`flex items-center justify-between p-2 transition-all group relative ${isCurrentUser ? 'bg-blue-500/5 border-l-2 border-blue-500' : ''}`}
                    >
                      {isCurrentUser && (
                        <div className="absolute top-1 right-3">
                          <span className="text-[6px] font-black text-blue-400 uppercase tracking-widest">You</span>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-3">
                        <div className="w-6 flex justify-center">
                          {idx < 3 ? (
                            <div className={`w-4 h-4 rounded-lg flex items-center justify-center text-[8px] font-black rotate-3 group-hover:rotate-0 transition-transform
                              ${idx === 0 ? 'bg-yellow-500 text-black shadow-[0_0_10px_rgba(234,179,8,0.4)]' : 
                                idx === 1 ? 'bg-slate-300 text-black shadow-[0_0_10px_rgba(203,213,225,0.4)]' : 
                                'bg-amber-700 text-white shadow-[0_0_10px_rgba(180,83,9,0.4)]'}`}>
                              {idx + 1}
                            </div>
                          ) : (
                            <span className="text-[8px] font-black text-white/20">{idx + 1}</span>
                          )}
                        </div>
                        <div className="relative">
                          <img 
                            src={player.photoURL || `https://ui-avatars.com/api/?name=${player.displayName}&background=random`} 
                            className={`w-7 h-7 rounded-lg border transition-all ${isCurrentUser ? 'border-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.3)]' : 'border-white/10 group-hover:border-blue-500/50'}`} 
                            alt={player.displayName} 
                            referrerPolicy="no-referrer" 
                          />
                        </div>
                        <div className="min-w-[80px]">
                          <span className={`block text-[10px] font-bold transition-colors ${isCurrentUser ? 'text-blue-400' : 'text-white group-hover:text-blue-400'}`}>
                            {player.displayName}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[6px] font-bold text-white/40 uppercase tracking-widest">Streak: {player.streak}d</span>
                            <div className="w-0.5 h-0.5 bg-white/20 rounded-full" />
                            <span className="text-[6px] font-bold text-white/40 uppercase tracking-widest">Lvl {Math.floor(player.totalQuestions / 100) + 1}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className={`text-xs font-black leading-none ${isCurrentUser ? 'text-blue-400' : 'text-rose-400'}`}>{player.totalQuestions}</div>
                          <div className="text-[6px] font-bold text-white/20 uppercase tracking-widest mt-0.5">Solved</div>
                        </div>
                        <div className="text-right w-10">
                          <div className={`text-xs font-black leading-none ${isCurrentUser ? 'text-blue-400' : 'text-emerald-400'}`}>{player.totalHours.toFixed(1)}h</div>
                          <div className="text-[6px] font-bold text-white/20 uppercase tracking-widest mt-0.5">Study</div>
                        </div>
                        <div className="flex items-center gap-1">
                          <motion.button 
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            className="p-1 rounded-lg bg-white/5 border border-white/10 text-white/20 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all opacity-0 group-hover:opacity-100"
                            title="Challenge User"
                          >
                            <Zap className="w-2.5 h-2.5" />
                          </motion.button>
                          <ChevronRight className="w-2.5 h-2.5 text-white/10 group-hover:text-white/40 group-hover:translate-x-0.5 transition-all" />
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          </motion.div>

          <motion.div 
            variants={itemVariants}
            className="mt-12 p-8 rounded-[40px] glass border border-white/10 relative overflow-hidden"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                <h3 className="text-sm font-black text-white uppercase tracking-widest font-heading">Study Groups</h3>
              </div>
              <span className="text-[8px] font-black text-white/20 uppercase tracking-widest">Collaborative Focus</span>
            </div>
            
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 rounded-3xl bg-white/5 border border-white/10">
                  <h4 className="text-[10px] font-black text-white/60 uppercase tracking-widest mb-4">Your Friend Code</h4>
                  <div className="flex gap-3">
                    <div className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-xl font-mono font-bold text-blue-400 flex items-center justify-center tracking-widest">
                      {friendCode || '------'}
                    </div>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(friendCode);
                        alert("Code copied!");
                      }}
                      className="px-4 py-2 bg-white/10 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/20 transition-all border border-white/10"
                    >
                      Copy
                    </button>
                  </div>
                </div>

                <div className="p-6 rounded-3xl bg-white/5 border border-white/10">
                  <h4 className="text-[10px] font-black text-white/60 uppercase tracking-widest mb-4">Link Friend</h4>
                  <div className="flex gap-3">
                    <input 
                      type="text" 
                      placeholder="ENTER CODE"
                      value={inputCode}
                      onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                      className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-[10px] font-mono text-white outline-none focus:border-blue-500/50 transition-all"
                    />
                    <button 
                      onClick={handleLinkFriend}
                      disabled={isLinking}
                      className="px-4 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-500 transition-all disabled:opacity-50"
                    >
                      {isLinking ? '...' : 'Link'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-6 rounded-3xl bg-white/5 border border-white/10 flex flex-col items-center text-center">
                  <Users className="w-6 h-6 text-blue-400 mb-3" />
                  <span className="text-[10px] font-black text-white uppercase tracking-widest mb-1">Active Friends</span>
                  <span className="text-2xl font-mono font-bold text-white">{friends.length}</span>
                </div>
                <div className="p-6 rounded-3xl bg-white/5 border border-white/10 flex flex-col items-center text-center">
                  <Clock className="w-6 h-6 text-emerald-400 mb-3" />
                  <span className="text-[10px] font-black text-white uppercase tracking-widest mb-1">Group Study Hours</span>
                  <span className="text-2xl font-mono font-bold text-white">
                    {(friends.reduce((acc, f) => acc + (f.stats.studySeconds || 0), 0) / 3600).toFixed(1)}h
                  </span>
                </div>
              </div>

              {friends.length > 0 && (
                <div className="space-y-3 mt-8">
                  <h4 className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-4">Live Friend Activity</h4>
                  {friends.map((friend) => (
                    <div key={friend.uid} className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <img src={friend.photoURL} className="w-8 h-8 rounded-full border border-white/10" alt="" />
                        <div>
                          <div className="text-xs font-bold text-white">{friend.displayName}</div>
                          <div className="text-[8px] font-black text-white/20 uppercase tracking-widest">Online</div>
                        </div>
                      </div>
                      <div className="flex gap-6">
                        <div className="text-right">
                          <div className="text-[8px] font-black text-white/40 uppercase tracking-widest">Study</div>
                          <div className="text-xs font-mono font-bold text-emerald-400">{(friend.stats.studySeconds / 3600).toFixed(1)}h</div>
                        </div>
                        <div className="text-right">
                          <div className="text-[8px] font-black text-white/40 uppercase tracking-widest">Solved</div>
                          <div className="text-xs font-mono font-bold text-blue-400">{friend.stats.questionsSolved}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {friends.length === 0 && (
                <p className="text-center text-[9px] font-bold text-white/20 uppercase tracking-widest">
                  Link with friends using their unique codes to see live study data.
                </p>
              )}
            </div>
          </motion.div>

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
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default CompetePage;
