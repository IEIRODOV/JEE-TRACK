import React, { useState, useEffect } from 'react';
import { Trophy, Users, Target, Zap, ChevronRight, Globe, ShieldCheck, TrendingUp, Medal, Plus, Award, Clock, Trash2, X, UserPlus, HelpCircle, Send, MessageSquare, Copy } from 'lucide-react';
import PulseLoader from "@/components/ui/pulse-loader";
import { motion, AnimatePresence } from 'motion/react';
import AnoAI from "@/components/ui/animated-shader-background";
import { auth, onAuthStateChanged, User, db, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, limit, Timestamp, setDoc, doc, getDoc, getDocs, where, arrayUnion, arrayRemove, increment, handleFirestoreError, OperationType, getCountFromServer } from '@/src/firebase';
import { playTickSound } from '@/src/lib/sounds';

interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  text: string;
  type: 'text' | 'doubt';
  createdAt: Timestamp | null;
}

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

import { getRankInfo } from '@/src/lib/ranks';

const CompetePage = ({ onAuthRequest }: CompetePageProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [globalStats, setGlobalStats] = useState({ totalStudents: 0, totalQuestions: 0, totalHours: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<any>(null);
  
  // Friends State
  const [friends, setFriends] = useState<any[]>([]);
  const [friendCode, setFriendCode] = useState<string>('');
  const [inputCode, setInputCode] = useState<string>('');
  const [isLinking, setIsLinking] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [messageType, setMessageType] = useState<'text' | 'doubt'>('text');
  const [removingFriendId, setRemovingFriendId] = useState<string | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const chatEndRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      const shortCode = user.uid.substring(0, 6).toUpperCase();
      setFriendCode(shortCode);
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
          const friendsData: any[] = [];
          for (const fId of friendIds) {
            const fDoc = await getDoc(doc(db, 'users', fId));
            if (fDoc.exists()) {
              const today = new Date().toDateString();
              const statsDoc = await getDoc(doc(db, 'users', fId, 'dailyStats', today));
              const lbDoc = await getDoc(doc(db, 'leaderboard', fId));
              
              friendsData.push({
                uid: fId,
                displayName: fDoc.data().displayName || 'Friend',
                photoURL: fDoc.data().photoURL,
                totalQuestions: lbDoc.exists() ? lbDoc.data().totalQuestions : 0,
                stats: statsDoc.exists() ? statsDoc.data() : { studySeconds: 0, questionsSolved: 0 }
              });
            }
          }
          setFriends(friendsData);
        } else {
          setFriends([]);
        }
      }
    });

    return () => unsubscribe();
  }, [user]);

  // Messages Listener
  useEffect(() => {
    if (!user || !selectedFriend) {
      setMessages([]);
      return;
    }

    const chatId = [user.uid, selectedFriend.uid].sort().join('_');

    const q = query(
      collection(db, 'messages'),
      where('chatId', '==', chatId),
      where('participants', 'array-contains', user.uid),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs: Message[] = [];
      snapshot.forEach((doc) => {
        msgs.push({ id: doc.id, ...doc.data() } as Message);
      });
      // Sort client-side to avoid composite index requirement
      msgs.sort((a, b) => {
        const timeA = a.createdAt?.toMillis() || 0;
        const timeB = b.createdAt?.toMillis() || 0;
        return timeA - timeB;
      });
      setMessages(msgs);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'messages', false);
    });

    return () => unsubscribe();
  }, [user, selectedFriend]);

  const handleLinkFriend = async () => {
    if (!user || !inputCode.trim()) return;
    setIsLinking(true);
    playTickSound();

    try {
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

      await setDoc(doc(db, 'users', user.uid), {
        friends: arrayUnion(friendId)
      }, { merge: true });

      await setDoc(doc(db, 'users', friendId), {
        friends: arrayUnion(user.uid)
      }, { merge: true });

      setInputCode('');
    } catch (error) {
      console.error("Error linking friend:", error);
    } finally {
      setIsLinking(false);
    }
  };

  const handleRemoveFriend = async () => {
    if (!user || !removingFriendId) return;
    setIsRemoving(true);
    playTickSound();

    try {
      const friendId = removingFriendId;
      await setDoc(doc(db, 'users', user.uid), {
        friends: arrayRemove(friendId)
      }, { merge: true });

      await setDoc(doc(db, 'users', friendId), {
        friends: arrayRemove(user.uid)
      }, { merge: true });

      setRemovingFriendId(null);
      if (selectedFriend?.uid === friendId) setSelectedFriend(null);
    } catch (error) {
      console.error("Error removing friend:", error);
    } finally {
      setIsRemoving(false);
    }
  };

  const handleSendMessage = async () => {
    if (!user || !selectedFriend || !newMessage.trim()) return;
    playTickSound();

    const text = newMessage.trim();
    const type = messageType;
    const chatId = [user.uid, selectedFriend.uid].sort().join('_');
    const participants = [user.uid, selectedFriend.uid];
    setNewMessage('');
    setMessageType('text');

    try {
      await addDoc(collection(db, 'messages'), {
        chatId,
        participants,
        senderId: user.uid,
        receiverId: selectedFriend.uid,
        text,
        type,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  useEffect(() => {
    console.log("Current selectedProfile state:", selectedProfile);
  }, [selectedProfile]);

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
    const unsubscribe = onSnapshot(doc(db, 'stats', 'global'), async (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as any;
        try {
          const userCountSnapshot = await getCountFromServer(collection(db, 'users'));
          const totalStudents = userCountSnapshot.data().count;
          setGlobalStats({ ...data, totalStudents });
        } catch (error) {
          console.error("Error fetching user count:", error);
          setGlobalStats(data);
        }
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
  const rankInfo = getRankInfo(userStats.totalQuestions);
  const progressToNext = Math.min((userStats.totalQuestions / rankInfo.nextThreshold) * 100, 100);

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
                          <span className={`text-[8px] font-black uppercase tracking-widest flex items-center gap-1 ${rankInfo.color}`}>
                            {rankInfo.icon} {rankInfo.title}
                          </span>
                          <div className="w-1 h-1 bg-white/20 rounded-full" />
                          <span className="text-[8px] font-bold text-white/40 uppercase tracking-widest">{userStats.totalQuestions} Pts</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="w-full mt-2">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[6px] font-black text-white/20 uppercase tracking-widest">Next: {getRankInfo(rankInfo.nextThreshold).title}</span>
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
                value: `9.2h/day`, 
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
                      onClick={() => {
                        console.log("Selected profile:", player);
                        setSelectedProfile(player);
                      }}
                      className={`flex items-center justify-between p-2 transition-all group relative cursor-pointer ${isCurrentUser ? 'bg-blue-500/5 border-l-2 border-blue-500' : ''}`}
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
                            <span className={`text-[6px] font-black uppercase tracking-widest flex items-center gap-1 ${getRankInfo(player.totalQuestions).color}`}>
                              {getRankInfo(player.totalQuestions).icon} {getRankInfo(player.totalQuestions).title}
                            </span>
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

          {/* Friends Section at the Bottom */}
          {user && (
            <motion.div id="social-hub" variants={itemVariants} className="mt-20">
              <div className="flex items-center gap-2 mb-8">
                <div className="w-8 h-px bg-purple-500" />
                <span className="text-[10px] font-black text-purple-400 uppercase tracking-[0.3em]">Social Hub</span>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Friend Management */}
                <div className="lg:col-span-4 space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    {/* Your Code Box */}
                    <motion.div 
                      whileHover={{ y: -5 }}
                      className="p-6 rounded-[32px] glass border-t-4 border-t-purple-500 border-x border-white/10 border-b border-white/10 flex flex-col items-center justify-center text-center shadow-[0_10px_30px_rgba(168,85,247,0.1)]"
                    >
                      <span className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-3">Your Code</span>
                      <div className="text-xl font-mono font-bold text-purple-400 tracking-widest mb-4 drop-shadow-[0_0_10px_rgba(168,85,247,0.3)]">{friendCode || '------'}</div>
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(friendCode);
                          playTickSound();
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-500/10 text-purple-400 rounded-xl hover:bg-purple-500 hover:text-white transition-all border border-purple-500/20 group"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span className="text-[8px] font-black uppercase tracking-widest">Copy</span>
                      </button>
                    </motion.div>

                    {/* Paste Code Box */}
                    <motion.div 
                      whileHover={{ y: -5 }}
                      className="p-6 rounded-[32px] glass border-t-4 border-t-blue-500 border-x border-white/10 border-b border-white/10 flex flex-col items-center justify-center text-center shadow-[0_10px_30px_rgba(59,130,246,0.1)]"
                    >
                      <span className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-3">Link Friend</span>
                      <input 
                        type="text" 
                        placeholder="CODE"
                        value={inputCode}
                        onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white text-center outline-none focus:border-blue-500/50 transition-all mb-3"
                      />
                      <button 
                        onClick={handleLinkFriend}
                        disabled={isLinking}
                        className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-[8px] font-black uppercase tracking-widest hover:bg-blue-500 transition-all disabled:opacity-50 shadow-[0_5px_15px_rgba(59,130,246,0.3)]"
                      >
                        {isLinking ? '...' : 'Link'}
                      </button>
                    </motion.div>

                    {/* Questions Solved Box */}
                    <motion.div 
                      whileHover={{ y: -5 }}
                      className="p-6 rounded-[32px] glass border-t-4 border-t-rose-500 border-x border-white/10 border-b border-white/10 flex flex-col items-center justify-center text-center shadow-[0_10px_30px_rgba(244,63,94,0.1)]"
                    >
                      <div className="p-2.5 rounded-2xl bg-rose-500/10 text-rose-400 mb-3">
                        <Target className="w-5 h-5" />
                      </div>
                      <span className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-1">Solved</span>
                      <div className="text-2xl font-mono font-bold text-white tracking-tight">{userStats.totalQuestions}</div>
                    </motion.div>

                    {/* Hours Studied Box */}
                    <motion.div 
                      whileHover={{ y: -5 }}
                      className="p-6 rounded-[32px] glass border-t-4 border-t-emerald-500 border-x border-white/10 border-b border-white/10 flex flex-col items-center justify-center text-center shadow-[0_10px_30px_rgba(16,185,129,0.1)]"
                    >
                      <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-400 mb-3">
                        <Clock className="w-5 h-5" />
                      </div>
                      <span className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-1">Study</span>
                      <div className="text-2xl font-mono font-bold text-white tracking-tight">{userStats.totalHours.toFixed(1)}h</div>
                    </motion.div>
                  </div>

                  <div className="p-6 rounded-[32px] glass border border-white/10">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
                          <Users className="w-4 h-4" />
                        </div>
                        <h3 className="text-xs font-black text-white uppercase tracking-widest">Your Crew</h3>
                      </div>
                      <span className="text-[10px] font-black text-white/20">{friends.length}</span>
                    </div>

                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                      {friends.length === 0 ? (
                        <p className="text-center py-8 text-[9px] font-bold text-white/20 uppercase tracking-widest">No friends linked.</p>
                      ) : (
                        friends.map((friend) => (
                          <button
                            key={friend.uid}
                            onClick={() => { playTickSound(); setSelectedFriend(friend); }}
                            className={`w-full p-3 rounded-2xl border transition-all flex items-center justify-between group
                              ${selectedFriend?.uid === friend.uid ? 'bg-purple-500/10 border-purple-500/30' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}
                          >
                            <div className="flex items-center gap-3">
                              <img src={friend.photoURL} className="w-8 h-8 rounded-xl border border-white/10" alt="" />
                              <div className="text-left">
                                <div className="text-[10px] font-bold text-white">{friend.displayName}</div>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-[8px] font-black text-emerald-400 uppercase tracking-widest bg-emerald-500/10 px-1.5 py-0.5 rounded-md">{(friend.stats.studySeconds / 3600).toFixed(1)}h</span>
                                  <span className="text-[8px] font-black text-blue-400 uppercase tracking-widest bg-blue-500/10 px-1.5 py-0.5 rounded-md">{friend.stats.questionsSolved} Qs</span>
                                </div>
                              </div>
                            </div>
                            <ChevronRight className={`w-3 h-3 transition-all ${selectedFriend?.uid === friend.uid ? 'text-purple-400 translate-x-0.5' : 'text-white/10 group-hover:text-white/40'}`} />
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Chat / Doubts Section */}
                <div className="lg:col-span-8">
                  <AnimatePresence mode="wait">
                    {selectedFriend ? (
                      <motion.div 
                        key={selectedFriend.uid}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="h-[500px] rounded-[40px] glass border border-white/10 flex flex-col overflow-hidden"
                      >
                        <div className="p-5 border-b border-white/10 bg-white/5 flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <img src={selectedFriend.photoURL} className="w-10 h-10 rounded-2xl border border-white/10" alt="" />
                            <div>
                              <h3 className="text-sm font-black text-white uppercase tracking-tight">{selectedFriend.displayName}</h3>
                              <div className="flex items-center gap-2">
                                <span className="text-[8px] font-black text-emerald-400 uppercase tracking-widest">{(selectedFriend.stats.studySeconds / 3600).toFixed(1)}h Study</span>
                                <div className="w-1 h-1 bg-white/20 rounded-full" />
                                <span className="text-[8px] font-black text-blue-400 uppercase tracking-widest">{selectedFriend.stats.questionsSolved} Questions</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => setRemovingFriendId(selectedFriend.uid)}
                              className="p-2 rounded-xl bg-white/5 border border-white/10 text-white/20 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => setSelectedFriend(null)}
                              className="p-2 rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-white transition-all"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-black/40 scroll-smooth">
                          {/* Friend Stats Big Boxes */}
                          <div className="grid grid-cols-2 gap-4 mb-10">
                            <motion.div 
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="p-8 rounded-[40px] glass border-t-4 border-t-emerald-500 border-x border-white/10 border-b border-white/10 flex flex-col items-center justify-center text-center shadow-[0_20px_50px_rgba(16,185,129,0.15)] relative overflow-hidden group"
                            >
                              <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                <Clock className="w-24 h-24" />
                              </div>
                              <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400 mb-4">
                                <Clock className="w-6 h-6" />
                              </div>
                              <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-2">Study Time</span>
                              <div className="text-4xl font-mono font-black text-white tracking-tighter drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">
                                {(selectedFriend.stats.studySeconds / 3600).toFixed(1)}<span className="text-lg ml-1 text-emerald-500/50">h</span>
                              </div>
                            </motion.div>

                            <motion.div 
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="p-8 rounded-[40px] glass border-t-4 border-t-blue-500 border-x border-white/10 border-b border-white/10 flex flex-col items-center justify-center text-center shadow-[0_20px_50px_rgba(59,130,246,0.15)] relative overflow-hidden group"
                            >
                              <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                <Target className="w-24 h-24" />
                              </div>
                              <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-400 mb-4">
                                <Target className="w-6 h-6" />
                              </div>
                              <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-2">Questions</span>
                              <div className="text-4xl font-mono font-black text-white tracking-tighter drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">
                                {selectedFriend.stats.questionsSolved}
                              </div>
                            </motion.div>
                          </div>

                          {messages.map((msg) => {
                            const isMe = msg.senderId === user.uid;
                            return (
                              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] rounded-2xl p-3 relative
                                  ${isMe ? 'bg-purple-600 text-white rounded-tr-none' : 'bg-white/10 text-white rounded-tl-none border border-white/10'}
                                  ${msg.type === 'doubt' ? 'ring-2 ring-amber-500/50 border-amber-500/30' : ''}`}
                                >
                                  {msg.type === 'doubt' && (
                                    <div className="flex items-center gap-1.5 mb-1.5">
                                      <HelpCircle className="w-3 h-3 text-amber-400" />
                                      <span className="text-[8px] font-black uppercase tracking-widest text-amber-400">Doubt</span>
                                    </div>
                                  )}
                                  <p className="text-xs leading-relaxed">{msg.text}</p>
                                </div>
                              </div>
                            );
                          })}
                          <div ref={chatEndRef} />
                        </div>

                        <div className="p-6 bg-white/5 border-t border-white/10">
                          <div className="flex items-center gap-3 mb-4">
                            <button 
                              onClick={() => setMessageType('text')}
                              className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest transition-all
                                ${messageType === 'text' ? 'bg-purple-500 text-white' : 'bg-white/5 text-white/40'}`}
                            >
                              Message
                            </button>
                            <button 
                              onClick={() => setMessageType('doubt')}
                              className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5
                                ${messageType === 'doubt' ? 'bg-amber-500 text-black' : 'bg-white/5 text-white/40'}`}
                            >
                              <HelpCircle className="w-3 h-3" />
                              Ask Doubt
                            </button>
                          </div>
                          <div className="flex gap-3">
                            <input 
                              type="text" 
                              value={newMessage}
                              onChange={(e) => setNewMessage(e.target.value)}
                              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                              placeholder="Type something..."
                              className="flex-1 bg-black/40 border border-white/10 rounded-2xl px-6 py-3 text-xs text-white outline-none focus:border-purple-500/50 transition-all"
                            />
                            <button 
                              onClick={handleSendMessage}
                              disabled={!newMessage.trim()}
                              className="w-12 h-12 rounded-2xl bg-purple-600 text-white flex items-center justify-center hover:bg-purple-500 transition-all disabled:opacity-50"
                            >
                              <Send className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ) : (
                      <div className="h-[500px] rounded-[40px] glass border border-white/10 flex flex-col items-center justify-center text-center p-12">
                        <div className="w-20 h-20 rounded-[32px] bg-white/5 border border-white/10 flex items-center justify-center mb-6">
                          <MessageSquare className="w-8 h-8 text-white/10" />
                        </div>
                        <h2 className="text-xl font-black text-white mb-2 uppercase tracking-tighter">Social Hub</h2>
                        <p className="text-white/40 text-[10px] max-w-xs leading-relaxed uppercase tracking-widest font-bold">
                          Select a friend to start chatting or ask a doubt.
                        </p>
                      </div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>

      <AnimatePresence mode="wait">
        {removingFriendId && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="w-full max-w-md bg-[#0a0a0b] border border-white/10 rounded-[32px] p-8 text-center shadow-2xl"
            >
              <div className="w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 className="w-8 h-8 text-rose-500" />
              </div>
              <h2 className="text-2xl font-black text-white mb-2 uppercase tracking-tighter">Remove Friend?</h2>
              <p className="text-white/40 text-[10px] mb-8 leading-relaxed uppercase tracking-widest font-bold">
                This will disconnect your study streams.
              </p>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={handleRemoveFriend}
                  disabled={isRemoving}
                  className="w-full py-4 bg-rose-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-rose-500 transition-all disabled:opacity-50"
                >
                  {isRemoving ? 'Removing...' : 'Confirm Removal'}
                </button>
                <button 
                  onClick={() => setRemovingFriendId(null)}
                  className="w-full py-4 bg-white/5 text-white/40 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-white/10 transition-all"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {selectedProfile && (
          <motion.div 
            key="profile-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/95 backdrop-blur-2xl p-4"
            onClick={() => setSelectedProfile(null)}
          >
            <motion.div 
              key="profile-modal-content"
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="w-full max-w-md bg-[#0a0a0b] border border-white/10 rounded-[40px] p-8 shadow-[0_0_100px_rgba(0,0,0,0.8)] relative overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-blue-500/10 to-transparent" />
              
              <button 
                onClick={() => setSelectedProfile(null)}
                className="absolute top-6 right-6 p-2 rounded-full bg-white/5 border border-white/10 text-white/40 hover:text-white transition-all"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="relative z-10 flex flex-col items-center text-center">
                <div className="relative mb-6">
                  <img 
                    src={selectedProfile.photoURL || `https://ui-avatars.com/api/?name=${selectedProfile.displayName}&background=random`} 
                    className="w-24 h-24 rounded-[32px] border-2 border-blue-500 shadow-[0_0_30px_rgba(59,130,246,0.3)] object-cover" 
                    alt="" 
                  />
                  <div className={`absolute -bottom-2 -right-2 p-2 rounded-xl border-2 border-[#0a0a0b] ${getRankInfo(selectedProfile.totalQuestions).bg} ${getRankInfo(selectedProfile.totalQuestions).color}`}>
                    {getRankInfo(selectedProfile.totalQuestions).icon}
                  </div>
                </div>

                <h2 className="text-2xl font-black text-white mb-1 uppercase tracking-tight">{selectedProfile.displayName}</h2>
                <div className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] mb-8 ${getRankInfo(selectedProfile.totalQuestions).color}`}>
                  {getRankInfo(selectedProfile.totalQuestions).title} • LEVEL {getRankInfo(selectedProfile.totalQuestions).level}
                </div>

                <div className="grid grid-cols-2 gap-4 w-full mb-8">
                  <div className="p-4 rounded-3xl bg-white/5 border border-white/5">
                    <span className="text-[8px] font-black text-white/20 uppercase tracking-widest block mb-1">Total Questions</span>
                    <span className="text-xl font-mono font-bold text-white">{selectedProfile.totalQuestions}</span>
                  </div>
                  <div className="p-4 rounded-3xl bg-white/5 border border-white/5">
                    <span className="text-[8px] font-black text-white/20 uppercase tracking-widest block mb-1">Daily Streak</span>
                    <span className="text-xl font-mono font-bold text-orange-400">{selectedProfile.streak}d</span>
                  </div>
                </div>

                <div className="w-full space-y-3">
                  <div className="flex justify-between items-center px-1">
                    <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">Next Rank Progress</span>
                    <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">
                      {getRankInfo(selectedProfile.totalQuestions).nextThreshold - selectedProfile.totalQuestions} Qs Left
                    </span>
                  </div>
                  <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min((selectedProfile.totalQuestions / getRankInfo(selectedProfile.totalQuestions).nextThreshold) * 100, 100)}%` }}
                      className="h-full bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]"
                    />
                  </div>
                  <p className="text-[8px] font-bold text-white/20 uppercase tracking-widest">
                    Next: {getRankInfo(getRankInfo(selectedProfile.totalQuestions).nextThreshold).title}
                  </p>
                </div>

                {/* Personal Chat Option */}
                <div className="w-full mt-8">
                  <button 
                    onClick={() => {
                      const isFriend = friends.find(f => f.uid === selectedProfile.uid);
                      if (isFriend) {
                        setSelectedFriend(isFriend);
                        setSelectedProfile(null);
                        // Scroll to social hub
                        document.getElementById('social-hub')?.scrollIntoView({ behavior: 'smooth' });
                      } else {
                        alert("You need to link with this student first using their friend code!");
                      }
                    }}
                    className="w-full py-4 bg-white text-black rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 hover:bg-white/90 transition-all shadow-[0_0_30px_rgba(255,255,255,0.2)]"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Personal Chat
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CompetePage;
