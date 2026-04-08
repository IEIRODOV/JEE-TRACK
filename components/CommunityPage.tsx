import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Send, 
  MessageSquare, 
  Heart, 
  Share2, 
  MoreVertical, 
  Search, 
  TrendingUp, 
  Users, 
  Award,
  Filter,
  Plus,
  Clock,
  LogIn,
  Sparkles,
  Hash,
  Flame,
  Target,
  BookOpen,
  PlayCircle,
  Zap,
  Coffee,
  ExternalLink,
  Trash2,
  Flag,
  FlaskConical
} from 'lucide-react';
import PulseLoader from "@/components/ui/pulse-loader";
import { 
  auth, 
  onAuthStateChanged, 
  User, 
  db, 
  collection, 
  addDoc, 
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  query, 
  orderBy, 
  onSnapshot, 
  serverTimestamp, 
  limit, 
  Timestamp, 
  handleFirestoreError, 
  OperationType,
  arrayUnion,
  arrayRemove
} from '@/src/firebase';

interface Comment {
  id: string;
  text: string;
  uid: string;
  displayName: string;
  photoURL: string;
  createdAt: Timestamp | null;
}

interface Post {
  id: string;
  text: string;
  uid: string;
  displayName: string;
  photoURL: string;
  category: string;
  community: 'jee' | 'neet' | 'boards';
  likes: string[];
  reactions?: { [emoji: string]: string[] };
  reports?: string[];
  comments?: Comment[];
  createdAt: Timestamp | null;
}

interface CommunityPageProps {
  onAuthRequest?: () => void;
}

const COMMUNITIES = [
  { id: 'jee', label: 'JEE Community', icon: Target },
  { id: 'neet', label: 'NEET Community', icon: Heart },
  { id: 'boards', label: 'Boards Community', icon: BookOpen },
];

const CATEGORIES = [
  { id: 'all', label: 'All Feed', icon: Sparkles },
  { id: 'questions', label: 'Questions', icon: MessageSquare },
  { id: 'motivation', label: 'Motivation', icon: Flame },
  { id: 'study-tips', label: 'Study Tips', icon: BookOpen },
];

const RESOURCES = {
  jee: [
    {
      title: "Eduniti Physics",
      description: "Top-tier Physics concepts and problem-solving for JEE Main & Advanced.",
      type: "YouTube",
      icon: PlayCircle,
      color: "text-red-400",
      bg: "bg-red-500/10",
      link: "https://www.youtube.com/@mohitgoenka99"
    },
    {
      title: "MathonGo",
      description: "Comprehensive Mathematics preparation and test series analysis for JEE.",
      type: "YouTube",
      icon: PlayCircle,
      color: "text-blue-400",
      bg: "bg-blue-500/10",
      link: "https://www.youtube.com/@mathongo"
    },
    {
      title: "DexterChem",
      description: "Expert Chemistry tutorials, reaction mechanisms, and shortcut tricks for JEE.",
      type: "YouTube",
      icon: PlayCircle,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
      link: "https://www.youtube.com/@DexterChem"
    },
    {
      title: "Physics Galaxy",
      description: "In-depth physics lectures and concept videos by Ashish Arora.",
      type: "YouTube",
      icon: PlayCircle,
      color: "text-yellow-400",
      bg: "bg-yellow-500/10",
      link: "https://www.youtube.com/@physicsgalaxyworld"
    }
  ],
  neet: [
    {
      title: "Biology by Dr. Anand Mani",
      description: "Comprehensive Biology lectures and NCERT line-by-line analysis for NEET.",
      type: "YouTube",
      icon: PlayCircle,
      color: "text-green-400",
      bg: "bg-green-500/10",
      link: "https://www.youtube.com/@DrAnandMani"
    },
    {
      title: "Physics Wallah NEET",
      description: "High-quality Physics and Chemistry lectures specifically for NEET aspirants.",
      type: "YouTube",
      icon: PlayCircle,
      color: "text-blue-400",
      bg: "bg-blue-500/10",
      link: "https://www.youtube.com/@PhysicsWallah"
    },
    {
      title: "Unacademy NEET",
      description: "Daily live classes and mock test discussions for all NEET subjects.",
      type: "YouTube",
      icon: PlayCircle,
      color: "text-purple-400",
      bg: "bg-purple-500/10",
      link: "https://www.youtube.com/@UnacademyNEET"
    },
    {
      title: "Competition Wallah",
      description: "Focused preparation for NEET with top faculty from Physics Wallah.",
      type: "YouTube",
      icon: PlayCircle,
      color: "text-rose-400",
      bg: "bg-rose-500/10",
      link: "https://www.youtube.com/@CompetitionWallah"
    }
  ],
  boards: [
    {
      title: "CBSE Class 12 Boards",
      description: "Official sample papers, previous year questions, and marking schemes.",
      type: "Official",
      icon: BookOpen,
      color: "text-blue-400",
      bg: "bg-blue-500/10",
      link: "https://cbseacademic.nic.in/SQP_CLASSXII_2023-24.html"
    },
    {
      title: "LearnCBSE",
      description: "NCERT Solutions, sample papers, and notes for all subjects.",
      type: "Website",
      icon: BookOpen,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
      link: "https://www.learncbse.in/"
    },
    {
      title: "Magnet Brains",
      description: "Free high-quality education for school students (K-12).",
      type: "YouTube",
      icon: PlayCircle,
      color: "text-red-400",
      bg: "bg-red-500/10",
      link: "https://www.youtube.com/@MagnetBrainsEducation"
    }
  ]
};

const RESOURCE_CHANNELS = [
  { id: 'all', label: 'All Resources', icon: Sparkles },
  { id: 'physics', label: 'Physics', icon: Zap },
  { id: 'chemistry', label: 'Chemistry', icon: FlaskConical },
  { id: 'maths', label: 'Mathematics', icon: Target },
  { id: 'biology', label: 'Biology', icon: Heart },
  { id: 'notes', label: 'Notes & PDFs', icon: BookOpen },
  { id: 'pyqs', label: 'PYQs', icon: Clock },
];

interface Resource {
  id: string;
  title: string;
  description: string;
  type: string;
  link: string;
  category: string;
  community: string;
  votes: string[];
  createdAt: Timestamp | null;
}

const CommunityPage = ({ onAuthRequest }: CommunityPageProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [userExam, setUserExam] = useState<string | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [dbResources, setDbResources] = useState<Resource[]>([]);
  const [inputText, setInputText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('questions');
  const [filterCategory, setFilterCategory] = useState('all');
  const [selectedCommunity, setSelectedCommunity] = useState<'jee' | 'neet' | 'boards'>('jee');
  const [activeView, setActiveView] = useState<'feed' | 'resources'>('feed');
  const [sortMode, setSortMode] = useState<'new' | 'top'>('new');
  const [resourceCategory, setResourceCategory] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [isCreatingPost, setIsCreatingPost] = useState(false);
  const [activeReactionPicker, setActiveReactionPicker] = useState<string | null>(null);
  const [replyText, setReplyText] = useState<{ [postId: string]: string }>({});
  const [showWarning, setShowWarning] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const REACTION_EMOJIS = ['👍', '❤️', '🔥', '😂', '👏'];

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        try {
          const userDoc = await getDoc(doc(db, 'users', u.uid));
          if (userDoc.exists()) {
            const exam = (userDoc.data().exam || 'jee').toLowerCase();
            setUserExam(exam);
            // Set initial community based on user's exam if valid
            if (['jee', 'neet', 'boards'].includes(exam)) {
              setSelectedCommunity(exam as 'jee' | 'neet' | 'boards');
            }
          }
        } catch (error) {
          console.error("Error fetching user exam:", error);
          const localExam = localStorage.getItem('pulse_user_exam');
          if (localExam) setUserExam(localExam.toLowerCase());
        }
      } else {
        const localExam = localStorage.getItem('pulse_user_exam');
        if (localExam) setUserExam(localExam.toLowerCase());
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(
      collection(db, 'posts'),
      orderBy('createdAt', 'desc'),
      limit(100)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs: Post[] = [];
      snapshot.forEach((doc) => {
        msgs.push({ id: doc.id, ...doc.data() } as Post);
      });
      setPosts(msgs);
      setIsLoading(false);
      setError(null);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'posts', false);
      setError("Failed to sync feed.");
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(
      collection(db, 'resources'),
      orderBy('createdAt', 'desc'),
      limit(200)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const res: Resource[] = [];
      snapshot.forEach((doc) => {
        res.push({ id: doc.id, ...doc.data() } as Resource);
      });
      setDbResources(res);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'resources', false);
    });

    return () => unsubscribe();
  }, []);

  const handleResourceVote = async (resourceId: string) => {
    if (!user) {
      onAuthRequest?.();
      return;
    }

    const resourceRef = doc(db, 'resources', resourceId);
    const resource = dbResources.find(r => r.id === resourceId);
    if (!resource) return;

    const hasVoted = resource.votes?.includes(user.uid);
    
    try {
      await updateDoc(resourceRef, {
        votes: hasVoted ? arrayRemove(user.uid) : arrayUnion(user.uid)
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'resources', false);
    }
  };

  const handleSendPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !inputText.trim()) return;

    const text = inputText.trim();
    const category = selectedCategory;
    setInputText('');

    try {
      await addDoc(collection(db, 'posts'), {
        text,
        uid: user.uid,
        displayName: user.displayName || user.email?.split('@')[0] || 'Anonymous',
        photoURL: user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName || user.email}&background=random`,
        category,
        community: selectedCommunity,
        likes: [],
        reactions: {},
        reports: [],
        createdAt: serverTimestamp(),
      });
      setIsCreatingPost(false);
      setError(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'posts', false);
      setError("Failed to share post.");
    }
  };

  const handleReaction = async (postId: string, emoji: string) => {
    if (!user) {
      onAuthRequest?.();
      return;
    }

    try {
      const postRef = doc(db, 'posts', postId);
      const post = posts.find(p => p.id === postId);
      if (!post) return;

      const currentReactions = post.reactions || {};
      const updates: { [key: string]: any } = {};
      
      // Find if user already has a reaction
      let existingEmoji: string | null = null;
      Object.entries(currentReactions).forEach(([e, uids]) => {
        if ((uids as string[]).includes(user.uid)) {
          existingEmoji = e;
        }
      });

      if (existingEmoji === emoji) {
        // Remove reaction if clicking the same one
        updates[`reactions.${emoji}`] = arrayRemove(user.uid);
      } else {
        // Remove old reaction if it exists
        if (existingEmoji) {
          updates[`reactions.${existingEmoji}`] = arrayRemove(user.uid);
        }
        // Add new reaction
        updates[`reactions.${emoji}`] = arrayUnion(user.uid);
      }

      await updateDoc(postRef, updates);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'posts', false);
    }
  };

  const handleSendReply = async (postId: string) => {
    if (!user || !replyText[postId]?.trim()) return;

    const text = replyText[postId].trim();
    setReplyText(prev => ({ ...prev, [postId]: '' }));

    try {
      const postRef = doc(db, 'posts', postId);
      const newComment: Comment = {
        id: Math.random().toString(36).substring(7),
        text,
        uid: user.uid,
        displayName: user.displayName || user.email?.split('@')[0] || 'Anonymous',
        photoURL: user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName || user.email}&background=random`,
        createdAt: Timestamp.now(),
      };

      await updateDoc(postRef, {
        comments: arrayUnion(newComment)
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'posts', false);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!user) return;
    if (!window.confirm("Are you sure you want to delete this post?")) return;

    try {
      await deleteDoc(doc(db, 'posts', postId));
      setError(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'posts', false);
      setError("Failed to delete post.");
    }
  };

  const handleReportPost = async (postId: string) => {
    if (!user) {
      onAuthRequest?.();
      return;
    }

    try {
      const postRef = doc(db, 'posts', postId);
      const post = posts.find(p => p.id === postId);
      if (!post) return;

      const currentReports = post.reports || [];
      if (currentReports.includes(user.uid)) {
        alert("You have already reported this post.");
        return;
      }

      const newReports = [...currentReports, user.uid];
      
      if (newReports.length >= 7) {
        await deleteDoc(postRef);
        alert("Post has been removed due to multiple reports.");
      } else {
        await updateDoc(postRef, {
          reports: arrayUnion(user.uid)
        });
        alert("Post reported. Thank you for keeping the community safe.");
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'posts', false);
    }
  };

  const formatTime = (timestamp: Timestamp | null) => {
    if (!timestamp) return 'Just now';
    const date = timestamp.toDate();
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const filteredPosts = posts.filter(p => {
    const matchesCommunity = p.community === selectedCommunity;
    const matchesCategory = filterCategory === 'all' || p.category === filterCategory;
    return matchesCommunity && matchesCategory;
  }).sort((a, b) => {
    if (sortMode === 'top') {
      const scoreA = (a.reactions?.['👍']?.length || 0) - (a.reactions?.['🔥']?.length || 0);
      const scoreB = (b.reactions?.['👍']?.length || 0) - (b.reactions?.['🔥']?.length || 0);
      return scoreB - scoreA;
    }
    return 0; // Already sorted by createdAt desc from query
  });

  return (
    <div className="w-full min-h-screen pt-24 pb-12 px-4 md:px-8">
      <AnimatePresence>
        {showWarning && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/98 backdrop-blur-2xl p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="max-w-2xl w-full bg-black border border-white/10 rounded-none overflow-hidden shadow-[0_0_100px_rgba(255,0,0,0.1)] flex flex-col md:flex-row"
            >
              <div className="bg-black p-12 flex flex-col items-center justify-center text-center border-b md:border-b-0 md:border-r border-white/5 min-w-[280px]">
                <div className="relative mb-8">
                  <motion.div 
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    className="w-24 h-24 bg-red-600/20 rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(220,38,38,0.4)]"
                  >
                    <Flame className="w-12 h-12 text-red-600 fill-red-600" />
                  </motion.div>
                  <motion.div 
                    animate={{ scale: [1, 2], opacity: [0.5, 0] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    className="absolute inset-0 bg-red-600/20 rounded-full"
                  />
                </div>
                <h2 className="text-white text-5xl font-black uppercase tracking-tighter leading-none">
                  PULSE <br /> <span className="text-red-600">ALERT</span>
                </h2>
              </div>
              
              <div className="p-12 bg-black flex flex-col justify-center">
                <div className="mb-8">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="h-px w-8 bg-red-600" />
                    <span className="text-red-600 text-[10px] font-black uppercase tracking-[0.3em]">Distraction Protocol</span>
                  </div>
                  <h3 className="text-white text-2xl font-black uppercase tracking-tight mb-4 leading-tight">
                    MISSION CRITICAL: <br />STAY FOCUSED
                  </h3>
                  <p className="text-white/40 text-sm font-medium leading-relaxed uppercase tracking-wider">
                    Open communities are high-risk zones for focus depletion. Proceed only if your daily targets are secured.
                  </p>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-4 w-full">
                  <button 
                    onClick={() => setShowWarning(false)}
                    className="flex-1 py-4 bg-white text-black rounded-none font-black uppercase tracking-[0.2em] text-[10px] hover:bg-red-600 hover:text-white transition-all active:scale-95"
                  >
                    Enter Feed
                  </button>
                  <button 
                    onClick={() => window.location.href = '/'}
                    className="flex-1 py-4 bg-transparent text-white/40 border border-white/10 rounded-none font-black uppercase tracking-[0.2em] text-[10px] hover:bg-white/5 hover:text-white transition-all active:scale-95"
                  >
                    Back to Focus
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto space-y-8">
        {/* Top Navigation - Community Switcher & View Switcher */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 glass rounded-3xl p-4 border border-white/10">
          <div className="flex bg-black/40 p-1.5 rounded-2xl border border-white/5">
            {COMMUNITIES.filter(comm => !userExam || userExam === comm.id).map((comm) => (
              <button
                key={comm.id}
                onClick={() => setSelectedCommunity(comm.id as 'jee' | 'neet' | 'boards')}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl transition-all text-xs font-black uppercase tracking-widest
                  ${selectedCommunity === comm.id 
                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg' 
                    : 'text-white/40 hover:text-white/60'}`}
              >
                <comm.icon className="w-4 h-4" />
                {comm.label}
              </button>
            ))}
          </div>

          <div className="flex bg-black/40 p-1.5 rounded-2xl border border-white/5">
            <button
              onClick={() => setActiveView('feed')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl transition-all text-xs font-black uppercase tracking-widest
                ${activeView === 'feed' 
                  ? 'bg-white/10 text-white border border-white/10' 
                  : 'text-white/40 hover:text-white/60'}`}
            >
              <Users className="w-4 h-4" />
              Community Feed
            </button>
            <button
              onClick={() => setActiveView('resources')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl transition-all text-xs font-black uppercase tracking-widest
                ${activeView === 'resources' 
                  ? 'bg-white/10 text-white border border-white/10' 
                  : 'text-white/40 hover:text-white/60'}`}
            >
              <Target className="w-4 h-4" />
              Resource Hub
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
          {/* Left Sidebar - Categories (Only for Feed) */}
          {activeView === 'feed' && (
            <div className="hidden lg:block lg:col-span-3 space-y-6">
              <div className="glass rounded-3xl p-6 border border-white/10 sticky top-24">
                <h3 className="text-white font-black text-xs uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                  <Filter className="w-4 h-4 text-purple-400" />
                  Feed Filters
                </h3>
                <div className="space-y-2">
                  <div className="flex gap-2 mb-4 p-1 bg-black/40 rounded-xl border border-white/5">
                    <button 
                      onClick={() => setSortMode('new')}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all
                        ${sortMode === 'new' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'}`}
                    >
                      <Clock className="w-3 h-3" />
                      New
                    </button>
                    <button 
                      onClick={() => setSortMode('top')}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all
                        ${sortMode === 'top' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'}`}
                    >
                      <TrendingUp className="w-3 h-3" />
                      Top
                    </button>
                  </div>
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setFilterCategory(cat.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all text-sm font-bold
                        ${filterCategory === cat.id 
                          ? 'bg-gradient-to-r from-purple-600/40 to-blue-600/40 text-white border border-purple-500/30' 
                          : 'text-white/40 hover:bg-white/5 hover:text-white/60'}`}
                    >
                      <cat.icon className={`w-4 h-4 ${filterCategory === cat.id ? 'text-purple-400' : ''}`} />
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Main Content */}
          <div className={`${activeView === 'feed' ? 'lg:col-span-9' : 'lg:col-span-12'} space-y-6`}>
            {activeView === 'resources' ? (
              <div className="space-y-8 relative">
                <div className="relative z-10 space-y-8">
                  {/* Resource Channels Horizontal Scroll */}
                  <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar">
                    {RESOURCE_CHANNELS.map((channel) => (
                      <button
                        key={channel.id}
                        onClick={() => setResourceCategory(channel.id)}
                        className={`flex items-center gap-2 px-6 py-3 rounded-2xl border transition-all whitespace-nowrap text-[10px] font-black uppercase tracking-widest
                          ${resourceCategory === channel.id 
                            ? 'bg-purple-600/20 border-purple-500/50 text-white' 
                            : 'bg-black/40 border-white/5 text-white/40 hover:border-white/20 hover:text-white/60'}`}
                      >
                        <channel.icon className="w-4 h-4" />
                        {channel.label}
                      </button>
                    ))}
                  </div>

                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass rounded-3xl p-8 border border-white/10 relative overflow-hidden group"
                  >
                    <div className="absolute -top-24 -right-24 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000" />
                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 mb-4">
                          <Sparkles className="w-3 h-3 text-purple-400" />
                          <span className="text-[8px] font-black uppercase tracking-widest text-white/70">Community Curated</span>
                        </div>
                        <h2 className="text-3xl font-black text-white mb-2 tracking-tight uppercase font-heading">
                          {selectedCommunity.toUpperCase()} <span className="text-purple-500">Resource Hub</span>
                        </h2>
                        <p className="text-white/40 text-[10px] max-w-md uppercase tracking-widest font-bold leading-relaxed">
                          The highest voted resources ranked by the community.
                        </p>
                      </div>
                      <button 
                        onClick={() => {
                          const title = prompt("Resource Title:");
                          const desc = prompt("Description:");
                          const link = prompt("Link (URL):");
                          const type = prompt("Type (e.g. YouTube, PDF, Website):");
                          const cat = prompt("Category (physics, chemistry, maths, biology, notes, pyqs):");
                          
                          if (title && link && cat) {
                            addDoc(collection(db, 'resources'), {
                              title,
                              description: desc || '',
                              link,
                              type: type || 'Link',
                              category: cat.toLowerCase(),
                              community: selectedCommunity,
                              votes: [],
                              createdAt: serverTimestamp()
                            });
                          }
                        }}
                        className="px-6 py-3 bg-white text-black rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-purple-500 hover:text-white transition-all flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Submit Resource
                      </button>
                    </div>
                  </motion.div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Static Resources (Fallback) */}
                    {resourceCategory === 'all' && RESOURCES[selectedCommunity].map((resource, index) => (
                      <motion.a
                        key={resource.title}
                        href={resource.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        referrerPolicy="no-referrer"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="glass rounded-[32px] p-6 border border-white/10 hover:border-purple-500/30 transition-all group relative overflow-hidden"
                      >
                        <div className={`absolute top-0 right-0 w-32 h-32 ${resource.bg} rounded-full blur-3xl -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700`} />
                        <div className="relative z-10">
                          <div className={`w-12 h-12 rounded-2xl ${resource.bg} flex items-center justify-center mb-6 border border-white/5`}>
                            <resource.icon className={`w-6 h-6 ${resource.color}`} />
                          </div>
                          <h3 className="text-lg font-black text-white mb-2 tracking-tight uppercase">{resource.title}</h3>
                          <p className="text-white/40 text-[10px] leading-relaxed mb-6 font-bold uppercase tracking-widest line-clamp-2">
                            {resource.description}
                          </p>
                          <div className="flex items-center justify-between">
                            <span className="text-[8px] font-black text-white/20 uppercase tracking-[0.2em]">{resource.type}</span>
                            <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                              <ExternalLink className="w-3 h-3 text-white/40" />
                            </div>
                          </div>
                        </div>
                      </motion.a>
                    ))}

                    {/* Dynamic Resources from DB */}
                    {dbResources
                      .filter(r => r.community === selectedCommunity && (resourceCategory === 'all' || r.category === resourceCategory))
                      .sort((a, b) => (b.votes?.length || 0) - (a.votes?.length || 0))
                      .map((resource, index) => (
                      <motion.div
                        key={resource.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="glass rounded-[32px] p-6 border border-white/10 hover:border-purple-500/30 transition-all group relative overflow-hidden flex flex-col"
                      >
                        <div className="absolute top-0 right-0 p-4 flex flex-col items-center gap-1 z-20">
                          <button 
                            onClick={(e) => {
                              e.preventDefault();
                              handleResourceVote(resource.id);
                            }}
                            className={`p-2 rounded-xl transition-all ${resource.votes?.includes(user?.uid || '') ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/20' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}
                          >
                            <TrendingUp className="w-4 h-4" />
                          </button>
                          <span className="text-[10px] font-black text-white/60">{(resource.votes?.length || 0)}</span>
                        </div>

                        <div className="relative z-10 flex-1">
                          <div className={`w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center mb-6 border border-white/5`}>
                            <BookOpen className={`w-6 h-6 text-purple-400`} />
                          </div>
                          <h3 className="text-lg font-black text-white mb-2 tracking-tight uppercase pr-10">{resource.title}</h3>
                          <p className="text-white/40 text-[10px] leading-relaxed mb-6 font-bold uppercase tracking-widest line-clamp-2">
                            {resource.description}
                          </p>
                        </div>
                        
                        <a 
                          href={resource.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          referrerPolicy="no-referrer"
                          className="flex items-center justify-between mt-auto pt-4 border-t border-white/5 text-[10px] font-black uppercase tracking-widest text-white/20 group-hover:text-white/60 transition-colors"
                        >
                          <span>Visit Resource</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </motion.div>
                    ))}
                  </div>

                  {dbResources.filter(r => r.community === selectedCommunity && (resourceCategory === 'all' || r.category === resourceCategory)).length === 0 && resourceCategory !== 'all' && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-center py-20"
                    >
                      <p className="text-white/20 text-xs font-black uppercase tracking-[0.3em]">No resources found in this channel yet.</p>
                      <p className="text-white/10 text-[10px] mt-2 uppercase tracking-widest">Be the first to submit one!</p>
                    </motion.div>
                  )}
                </div>
              </div>
            ) : (
            <>
              {/* Mobile Category Selector */}
              <div className="lg:hidden flex gap-2 overflow-x-auto scrollbar-hide pb-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setFilterCategory(cat.id)}
                    className={`flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all text-[10px] font-black uppercase tracking-widest border
                      ${filterCategory === cat.id 
                        ? 'bg-gradient-to-r from-purple-600/40 to-blue-600/40 text-white border-purple-500/30' 
                        : 'bg-white/5 text-white/40 border-white/5 hover:bg-white/10'}`}
                  >
                    <cat.icon className={`w-3 h-3 ${filterCategory === cat.id ? 'text-purple-400' : ''}`} />
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Create Post Toggle */}
              <div className="flex justify-end mb-4">
                {!isCreatingPost && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setIsCreatingPost(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-purple-500/20"
                  >
                    <Plus className="w-4 h-4" />
                    New Post
                  </motion.button>
                )}
              </div>

              {/* Create Post */}
              <AnimatePresence>
                {isCreatingPost && (
                  <motion.div 
                    initial={{ opacity: 0, y: -20, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                    exit={{ opacity: 0, y: -20, height: 0 }}
                    className="glass rounded-2xl p-4 border border-white/20 shadow-2xl mb-6 overflow-hidden"
                  >
                    {!user ? (
                      <div className="flex flex-col items-center justify-center py-4 text-center">
                        <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mb-3">
                          <LogIn className="w-6 h-6 text-white/20" />
                        </div>
                        <h3 className="text-white text-xs font-black uppercase tracking-tight mb-1">Join the Conversation</h3>
                        <p className="text-white/40 text-[9px] mb-4 max-w-[200px] uppercase tracking-widest font-bold">Sign in to share tips and connect.</p>
                        <div className="flex gap-2">
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={onAuthRequest}
                            className="bg-white text-black px-6 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-white/90 transition-all"
                          >
                            Sign In
                          </motion.button>
                          <button 
                            onClick={() => setIsCreatingPost(false)}
                            className="px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest text-white/40 hover:text-white/60 transition-all"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Create New Post</span>
                          <button 
                            onClick={() => setIsCreatingPost(false)}
                            className="p-1 hover:bg-white/5 rounded-lg transition-all"
                          >
                            <Plus className="w-4 h-4 text-white/20 rotate-45" />
                          </button>
                        </div>
                        <div className="flex gap-3">
                          <img 
                            src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName || user.email}&background=random`} 
                            className="w-10 h-10 rounded-xl border border-white/20 shadow-xl"
                            alt="Me"
                          />
                          <div className="flex-1">
                            <textarea
                              value={inputText}
                              onChange={(e) => setInputText(e.target.value)}
                              placeholder={`What's on your mind, ${selectedCommunity.toUpperCase()} scholar?`}
                              className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white text-xs focus:outline-none focus:border-purple-500/30 transition-all resize-none min-h-[80px] placeholder:text-white/20"
                            />
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t border-white/10">
                          <div className="flex gap-1.5 overflow-x-auto scrollbar-hide py-1">
                            {CATEGORIES.slice(1).map((cat) => (
                              <button
                                key={cat.id}
                                type="button"
                                onClick={() => setSelectedCategory(cat.id)}
                                className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all border
                                  ${selectedCategory === cat.id 
                                    ? 'bg-purple-500/20 border-purple-500/40 text-purple-400' 
                                    : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'}`}
                              >
                                {cat.label}
                              </button>
                            ))}
                          </div>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={handleSendPost}
                            disabled={!inputText.trim()}
                            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all
                              ${!inputText.trim() 
                                ? 'bg-white/5 text-white/20 cursor-not-allowed' 
                                : 'bg-gradient-to-r from-purple-500 to-blue-600 text-white shadow-lg shadow-purple-500/20'}`}
                          >
                            <Send className="w-3.5 h-3.5" />
                            Post
                          </motion.button>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Feed Content */}
              <div className="space-y-4">
                {isLoading ? (
                  <div className="py-20 flex flex-col items-center justify-center gap-4">
                    <PulseLoader size={40} />
                  </div>
                ) : filteredPosts.length === 0 ? (
                  <div className="py-20 text-center glass rounded-3xl border border-white/10">
                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                      <Search className="w-8 h-8 text-white/20" />
                    </div>
                    <h3 className="text-white font-black uppercase tracking-tight">No posts found</h3>
                    <p className="text-white/40 text-xs mt-2">Be the first to post in this category!</p>
                  </div>
                ) : (
                  <AnimatePresence mode="popLayout">
                      {filteredPosts.map((post, index) => (
                      <motion.div
                        key={post.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ delay: index * 0.05 }}
                        className="bg-[#1a1a1b] rounded-xl border border-[#343536] hover:border-[#818384] transition-all group shadow-lg relative overflow-hidden flex"
                      >
                        {/* Vote Sidebar (Reddit Style) */}
                        <div className="w-10 bg-[#151516] flex flex-col items-center py-3 gap-1 border-r border-[#343536]">
                          <button 
                            onClick={() => handleReaction(post.id, '👍')}
                            className={`p-1 rounded hover:bg-white/5 transition-all ${post.reactions?.['👍']?.includes(user?.uid || '') ? 'text-orange-500' : 'text-[#818384]'}`}
                          >
                            <TrendingUp className="w-5 h-5" />
                          </button>
                          <span className={`text-[10px] font-black ${post.reactions?.['👍']?.includes(user?.uid || '') ? 'text-orange-500' : 'text-[#d7dadc]'}`}>
                            {(post.reactions?.['👍']?.length || 0) + (post.reactions?.['❤️']?.length || 0) - (post.reactions?.['🔥']?.length || 0)}
                          </span>
                          <button 
                            onClick={() => handleReaction(post.id, '🔥')}
                            className={`p-1 rounded hover:bg-white/5 transition-all ${post.reactions?.['🔥']?.includes(user?.uid || '') ? 'text-blue-500' : 'text-[#818384]'}`}
                          >
                            <TrendingUp className="w-5 h-5 rotate-180" />
                          </button>
                        </div>

                        <div className="flex-1 p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <img 
                              src={post.photoURL} 
                              className="w-6 h-6 rounded-full border border-[#343536]"
                              alt={post.displayName}
                            />
                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px] font-bold text-[#d7dadc]">r/{post.community}</span>
                              <span className="text-[10px] text-[#818384]">•</span>
                              <span className="text-[10px] text-[#818384]">Posted by u/{post.displayName}</span>
                              <span className="text-[10px] text-[#818384]">•</span>
                              <span className="text-[10px] text-[#818384]">{formatTime(post.createdAt)}</span>
                            </div>
                            <div className="ml-auto flex items-center gap-2">
                              <span className="px-1.5 py-0.5 rounded bg-[#272729] border border-[#343536] text-[8px] font-black text-purple-400 uppercase tracking-widest">
                                {post.category}
                              </span>
                              {user?.uid === post.uid && (
                                <button 
                                  onClick={() => handleDeletePost(post.id)}
                                  className="text-rose-500/40 hover:text-rose-500 transition-colors p-1"
                                  title="Delete Post"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                              {user?.uid !== post.uid && (
                                <button 
                                  onClick={() => handleReportPost(post.id)}
                                  className={`transition-colors p-1 ${post.reports?.includes(user?.uid || '') ? 'text-amber-500' : 'text-white/20 hover:text-amber-500'}`}
                                  title="Report Post"
                                >
                                  <Flag className="w-4 h-4" />
                                </button>
                              )}
                              <button className="text-[#818384] hover:text-[#d7dadc] transition-colors">
                                <MoreVertical className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          
                          <div className="mb-3">
                            <p className="text-[#d7dadc] text-sm leading-relaxed font-medium whitespace-pre-wrap break-words">
                              {post.text}
                            </p>
                          </div>

                          {/* Reactions Display */}
                          {post.reactions && Object.keys(post.reactions).some(emoji => (post.reactions![emoji] as string[]).length > 0) && (
                            <div className="flex flex-wrap gap-1.5 mb-3">
                              {Object.entries(post.reactions).map(([emoji, uids]) => (uids as string[]).length > 0 && (
                                <button
                                  key={emoji}
                                  onClick={() => handleReaction(post.id, emoji)}
                                  className={`flex items-center gap-1.5 px-2 py-1 rounded bg-[#272729] border transition-all
                                    ${(uids as string[]).includes(user?.uid || '') 
                                      ? 'border-purple-500/50 text-white' 
                                      : 'border-[#343536] text-[#818384] hover:border-[#818384]'}`}
                                >
                                  <span className="text-xs">{emoji}</span>
                                  <span className="text-[10px] font-bold">{(uids as string[]).length}</span>
                                </button>
                              ))}
                            </div>
                          )}

                          <div className="flex items-center gap-1 pt-1">
                            <div className="relative">
                              <button 
                                onClick={() => setActiveReactionPicker(activeReactionPicker === post.id ? null : post.id)}
                                className={`flex items-center gap-1.5 px-2 py-1.5 rounded hover:bg-[#272729] transition-all text-[#818384] hover:text-[#d7dadc]`}
                              >
                                <Plus className="w-4 h-4" />
                                <span className="text-[11px] font-bold">React</span>
                              </button>
                              <AnimatePresence>
                                {activeReactionPicker === post.id && (
                                  <motion.div 
                                    initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.9, y: 10 }}
                                    className="absolute bottom-full left-0 mb-2 flex bg-[#1a1a1b] border border-[#343536] rounded-full p-1 shadow-2xl z-50"
                                  >
                                    {REACTION_EMOJIS.map(emoji => (
                                      <button
                                        key={emoji}
                                        onClick={() => {
                                          handleReaction(post.id, emoji);
                                          setActiveReactionPicker(null);
                                        }}
                                        className="p-2 hover:bg-white/5 rounded-full transition-all text-base"
                                      >
                                        {emoji}
                                      </button>
                                    ))}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>

                            <button 
                              onClick={() => setReplyingTo(replyingTo === post.id ? null : post.id)}
                              className="flex items-center gap-1.5 px-2 py-1.5 rounded hover:bg-[#272729] transition-all text-[#818384] hover:text-[#d7dadc]"
                            >
                              <MessageSquare className="w-4 h-4" />
                              <span className="text-[11px] font-bold">
                                {post.comments?.length || 0} Comments
                              </span>
                            </button>
                          </div>

                          {/* Comments Section */}
                          <AnimatePresence>
                            {replyingTo === post.id && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="mt-4 space-y-4 overflow-hidden border-t border-[#343536] pt-4"
                              >
                                {post.comments && post.comments.length > 0 && (
                                  <div className="space-y-4 pl-2">
                                    {post.comments.map(comment => (
                                      <div key={comment.id} className="flex gap-3 group/comment">
                                        <div className="flex flex-col items-center">
                                          <img src={comment.photoURL} className="w-6 h-6 rounded-full border border-[#343536]" alt={comment.displayName} />
                                          <div className="w-0.5 flex-1 bg-[#343536] my-1 group-last/comment:hidden" />
                                        </div>
                                        <div className="flex-1">
                                          <div className="flex items-center gap-2 mb-1">
                                            <span className="text-[11px] font-bold text-[#d7dadc]">{comment.displayName}</span>
                                            <span className="text-[10px] text-[#818384]">{formatTime(comment.createdAt)}</span>
                                          </div>
                                          <p className="text-[#d7dadc] text-xs leading-relaxed">{comment.text}</p>
                                          <div className="flex items-center gap-3 mt-2">
                                            <button className="text-[10px] font-bold text-[#818384] hover:text-[#d7dadc]">Reply</button>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                <div className="flex flex-col gap-2 bg-[#151516] p-3 rounded-lg border border-[#343536]">
                                  <textarea
                                    value={replyText[post.id] || ''}
                                    onChange={(e) => setReplyText(prev => ({ ...prev, [post.id]: e.target.value }))}
                                    placeholder="What are your thoughts?"
                                    className="w-full bg-transparent text-xs text-[#d7dadc] focus:outline-none resize-none min-h-[60px] placeholder:text-[#818384]"
                                  />
                                  <div className="flex justify-end gap-2">
                                    <button 
                                      onClick={() => setReplyingTo(null)}
                                      className="px-3 py-1.5 rounded-full text-[10px] font-bold text-[#818384] hover:bg-white/5 transition-all"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      onClick={() => handleSendReply(post.id)}
                                      disabled={!replyText[post.id]?.trim()}
                                      className="px-4 py-1.5 bg-[#d7dadc] text-black rounded-full text-[10px] font-bold hover:bg-white transition-all disabled:opacity-50"
                                    >
                                      Comment
                                    </button>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  </div>
);
};

export default CommunityPage;
