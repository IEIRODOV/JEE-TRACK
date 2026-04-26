import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Notifications from './Notifications';
import DonateModal from './DonateModal';
import { 
  Send, 
  MessageSquare, 
  Heart, 
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
  FlaskConical,
  ShieldCheck,
  Pencil,
  Share2,
  RotateCcw,
  Copy,
  Check
} from 'lucide-react';
import PulseLoader from "@/components/ui/pulse-loader";
import { toast } from 'sonner';
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
  getDocs,
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

import { getRankInfo } from '@/src/lib/ranks';
import { playTickSound } from '@/src/lib/sounds';

interface Comment {
  id: string;
  text: string;
  uid: string;
  displayName: string;
  photoURL: string;
  replyTo?: string; // Name of the person being replied to
  parentId?: string; // ID of the parent comment
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
  activateCommunity?: boolean;
}

const COMMUNITIES = [
  { id: 'all', label: 'All Communities', icon: Users },
  { id: 'jee', label: 'JEE', icon: Target },
  { id: 'neet', label: 'NEET', icon: Heart },
  { id: 'boards', label: 'Boards', icon: BookOpen },
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
    },
    {
      title: "Unacademy JEE",
      description: "Daily live sessions for JEE Main & Advanced by top educators.",
      type: "YouTube",
      icon: PlayCircle,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      link: "https://www.youtube.com/@UnacademyJEE"
    },
    {
      title: "Vedantu JEE",
      description: "Comprehensive JEE prep with focus on problem solving and strategy.",
      type: "YouTube",
      icon: PlayCircle,
      color: "text-orange-400",
      bg: "bg-orange-500/10",
      link: "https://www.youtube.com/@VedantuJEE"
    },
    {
      title: "Mohit Tyagi",
      description: "Legendary math and science lectures for JEE Advanced preparation.",
      type: "YouTube",
      icon: PlayCircle,
      color: "text-purple-400",
      bg: "bg-purple-500/10",
      link: "https://www.youtube.com/@MohitTyagi"
    },
    {
      title: "JEE Nexus",
      description: "Quick revisions and high-yield problem solving for JEE Main.",
      type: "YouTube",
      icon: PlayCircle,
      color: "text-cyan-400",
      bg: "bg-cyan-500/10",
      link: "https://www.youtube.com/@JEENexus"
    },
    {
      title: "ATP STAR JEE",
      description: "Effective strategy and concept-based learning for JEE aspirants.",
      type: "YouTube",
      icon: PlayCircle,
      color: "text-rose-400",
      bg: "bg-rose-500/10",
      link: "https://www.youtube.com/@ATPSTARJEE"
    },
    {
      title: "Etoos Education",
      description: "Video lectures from top Kota faculty for JEE preparation.",
      type: "YouTube",
      icon: PlayCircle,
      color: "text-indigo-400",
      bg: "bg-indigo-500/10",
      link: "https://www.youtube.com/@EtoosEducation"
    },
    {
      title: "Competishun",
      description: "Structured JEE preparation from basics to advanced level.",
      type: "YouTube",
      icon: PlayCircle,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
      link: "https://www.youtube.com/@Competishun"
    },
    {
      title: "Physics Wallah JEE",
      description: "Alakh Pandey's dedicated channel for JEE Physics and Chemistry.",
      type: "YouTube",
      icon: PlayCircle,
      color: "text-blue-600",
      bg: "bg-blue-600/10",
      link: "https://www.youtube.com/@PhysicsWallah"
    },
    {
      title: "Simply Concise",
      description: "Short, effective revision videos for JEE Chemistry and Physics.",
      type: "YouTube",
      icon: PlayCircle,
      color: "text-amber-400",
      bg: "bg-amber-500/10",
      link: "https://www.youtube.com/@SimplyConcise"
    },
    {
      title: "Vora Classes",
      description: "JEE preparation by NV Sir and Sakshi Vora Ma'am.",
      type: "YouTube",
      icon: PlayCircle,
      color: "text-pink-400",
      bg: "bg-pink-500/10",
      link: "https://www.youtube.com/@VoraClasses"
    },
    {
      title: "IITian Explains",
      description: "Advanced problem solving and organic chemistry mechanisms.",
      type: "YouTube",
      icon: PlayCircle,
      color: "text-sky-400",
      bg: "bg-sky-500/10",
      link: "https://www.youtube.com/@IITianExplains"
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
    },
    {
      title: "Vedantu Biotonic",
      description: "Dedicated biology channel for NEET preparation by Vani Ma'am.",
      type: "YouTube",
      icon: PlayCircle,
      color: "text-pink-500",
      bg: "bg-pink-500/10",
      link: "https://www.youtube.com/@VedantuBiotonic"
    },
    {
      title: "BeWise Classes",
      description: "Chemistry specialist for NEET with focus on NCERT and tricks.",
      type: "YouTube",
      icon: PlayCircle,
      color: "text-orange-500",
      bg: "bg-orange-500/10",
      link: "https://www.youtube.com/@BeWiseClasses"
    },
    {
      title: "Garima Goel Biology",
      description: "Simplified biology concepts and NCERT decoding for NEET.",
      type: "YouTube",
      icon: PlayCircle,
      color: "text-purple-500",
      bg: "bg-purple-500/10",
      link: "https://www.youtube.com/@GarimaGoelBiology"
    },
    {
      title: "Aakash BYJU'S NEET",
      description: "Expert faculty lectures and strategy from Aakash Institute.",
      type: "YouTube",
      icon: PlayCircle,
      color: "text-sky-500",
      bg: "bg-sky-500/10",
      link: "https://www.youtube.com/@AakashBYJUSNEET"
    },
    {
      title: "Darwin - NEET Prep",
      description: "MCQ practice and high-yield topic discussions for NEET.",
      type: "YouTube",
      icon: PlayCircle,
      color: "text-indigo-500",
      bg: "bg-indigo-500/10",
      link: "https://www.youtube.com/@DarwinNEET"
    },
    {
      title: "Seep Pahuja Biology",
      description: "Biology lectures with focus on memory tricks and NCERT.",
      type: "YouTube",
      icon: PlayCircle,
      color: "text-rose-500",
      bg: "bg-rose-500/10",
      link: "https://www.youtube.com/@SeepPahuja"
    },
    {
      title: "Biology at Ease",
      description: "Mnemonics and easy ways to remember complex biology topics.",
      type: "YouTube",
      icon: PlayCircle,
      color: "text-teal-500",
      bg: "bg-teal-500/10",
      link: "https://www.youtube.com/@BiologyAtEase"
    },
    {
      title: "NEET Prep by Dr. NK Sharma",
      description: "Strategy and biology guidance for NEET aspirants.",
      type: "YouTube",
      icon: PlayCircle,
      color: "text-cyan-500",
      bg: "bg-cyan-500/10",
      link: "https://www.youtube.com/@NEETprep"
    },
    {
      title: "Rakshita Singh",
      description: "NEET preparation strategy and biology notes.",
      type: "YouTube",
      icon: PlayCircle,
      color: "text-violet-500",
      bg: "bg-violet-500/10",
      link: "https://www.youtube.com/@RakshitaSingh"
    },
    {
      title: "Tamanna Chaudhary",
      description: "Physics for NEET simplified with daily practice problems.",
      type: "YouTube",
      icon: PlayCircle,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
      link: "https://www.youtube.com/@TamannaChaudhary"
    },
    {
      title: "Physics Sir JEE (NEET)",
      description: "Conceptual physics for NEET with focus on numericals.",
      type: "YouTube",
      icon: PlayCircle,
      color: "text-blue-400",
      bg: "bg-blue-500/10",
      link: "https://www.youtube.com/@PhysicsSirJEE"
    }
  ],
  boards: [
    {
      title: "LearnHub - Class 11, 12",
      description: "Simplest explanations for Physics, Chemistry, and Math for Board exams.",
      type: "YouTube",
      icon: PlayCircle,
      color: "text-purple-400",
      bg: "bg-purple-500/10",
      link: "https://www.youtube.com/@LearnoHubClass1112"
    },
    {
      title: "Apni Kaksha",
      description: "High-quality notes and lectures for CBSE Class 12 Boards.",
      type: "YouTube",
      icon: PlayCircle,
      color: "text-blue-400",
      bg: "bg-blue-500/10",
      link: "https://www.youtube.com/@ApniKaksha"
    },
    {
      title: "Magnet Brains",
      description: "Free high-quality education for school students (K-12).",
      type: "YouTube",
      icon: PlayCircle,
      color: "text-red-400",
      bg: "bg-red-500/10",
      link: "https://www.youtube.com/@MagnetBrainsEducation"
    },
    {
      title: "Bharat Panchal - Chemistry",
      description: "Chemistry guru for CBSE Boards with amazing one-shot videos.",
      type: "YouTube",
      icon: PlayCircle,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
      link: "https://www.youtube.com/@BharatPanchalChemistry"
    },
    {
      title: "Arvind Academy",
      description: "Physics and Math specialist for Class 12 Board exams.",
      type: "YouTube",
      icon: PlayCircle,
      color: "text-orange-400",
      bg: "bg-orange-500/10",
      link: "https://www.youtube.com/@ArvindAcademy"
    },
    {
      title: "Shipra Mishra",
      description: "English and Business Studies for CBSE Class 12.",
      type: "YouTube",
      icon: PlayCircle,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      link: "https://www.youtube.com/@ShipraMishra"
    },
    {
      title: "Adda247 School",
      description: "Comprehensive board preparation for all streams.",
      type: "YouTube",
      icon: PlayCircle,
      color: "text-yellow-500",
      bg: "bg-yellow-500/10",
      link: "https://www.youtube.com/@Adda247School"
    },
    {
      title: "Physics Baba",
      description: "Physics simplified for Board exams with focus on derivations.",
      type: "YouTube",
      icon: PlayCircle,
      color: "text-sky-500",
      bg: "bg-sky-500/10",
      link: "https://www.youtube.com/@PhysicsBaba"
    },
    {
      title: "Sourabh Raina",
      description: "Chemistry one-shots and important questions for Boards.",
      type: "YouTube",
      icon: PlayCircle,
      color: "text-teal-500",
      bg: "bg-teal-500/10",
      link: "https://www.youtube.com/@SourabhRaina"
    },
    {
      title: "Zaki Saudagar",
      description: "Physical Education and Physics for Class 12 Boards.",
      type: "YouTube",
      icon: PlayCircle,
      color: "text-indigo-500",
      bg: "bg-indigo-500/10",
      link: "https://www.youtube.com/@ZakiSaudagar"
    },
    {
      title: "Shobhit Nirwan",
      description: "Motivation and notes for Class 10 and 12 Board exams.",
      type: "YouTube",
      icon: PlayCircle,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
      link: "https://www.youtube.com/@ShobhitNirwan"
    },
    {
      title: "Sunil Panda",
      description: "Commerce specialist for Class 12 Boards (Accounts, Eco, BST).",
      type: "YouTube",
      icon: PlayCircle,
      color: "text-green-600",
      bg: "bg-green-600/10",
      link: "https://www.youtube.com/@SunilPandaCommerce"
    },
    {
      title: "Gaurav Suthar",
      description: "Science and Math for Class 10 Boards with handwritten notes.",
      type: "YouTube",
      icon: PlayCircle,
      color: "text-cyan-600",
      bg: "bg-cyan-600/10",
      link: "https://www.youtube.com/@GauravSuthar"
    },
    {
      title: "Bhai Ki Padhai",
      description: "Fun and engaging explanations for Class 9 and 10 subjects.",
      type: "YouTube",
      icon: PlayCircle,
      color: "text-rose-600",
      bg: "bg-rose-600/10",
      link: "https://www.youtube.com/@BhaiKiPadhai"
    },
    {
      title: "Simran Sahni",
      description: "Humanities and English specialist for Class 12 Boards.",
      type: "YouTube",
      icon: PlayCircle,
      color: "text-pink-400",
      bg: "bg-pink-500/10",
      link: "https://www.youtube.com/@SimranSahni"
    }
  ]
};

const CommunityPage = ({ onAuthRequest, activateCommunity = true }: CommunityPageProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [userExam, setUserExam] = useState<string | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [inputText, setInputText] = useState('');
  const [selectedCommunity, setSelectedCommunity] = useState<'all' | 'jee' | 'neet' | 'boards'>('all');
  const [activeView, setActiveView] = useState<'feed' | 'resources'>('feed');
  const [sortMode, setSortMode] = useState<'new' | 'top'>('new');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedCommentsPostId, setExpandedCommentsPostId] = useState<string | null>(null);
  const [isCreatingPost, setIsCreatingPost] = useState(false);
  const [activeReactionPicker, setActiveReactionPicker] = useState<string | null>(null);
  const [replyText, setReplyText] = useState<{ [postId: string]: string }>({});
  const [replyToComment, setReplyToComment] = useState<{ postId: string, commentId: string, name: string } | null>(null);
  const [showWarning, setShowWarning] = useState(false);
  const [reportingPostId, setReportingPostId] = useState<string | null>(null);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<{ postId: string, commentId: string } | null>(null);
  const [editCommentText, setEditCommentText] = useState('');
  const [showCommentInput, setShowCommentInput] = useState<string | null>(null);
  const [userRanks, setUserRanks] = useState<Record<string, any>>({});
  const [lastRefreshTime, setLastRefreshTime] = useState<number>(Date.now());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showDonate, setShowDonate] = useState(false);
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
            // We set default to 'all' so we don't need to change initial selectedCommunity here 
            // unless we want to default to user exam
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
    // Load from cache first for instant UI
    const cachedPosts = localStorage.getItem('pulse_community_cache');
    if (cachedPosts) {
      try {
        setPosts(JSON.parse(cachedPosts));
        setIsLoading(false);
      } catch (e) {
        console.error("Cache parse error", e);
      }
    }

    const fetchPosts = async () => {
      const q = query(
        collection(db, 'posts'),
        orderBy('createdAt', 'desc'),
        limit(100)
      );

      try {
        const snapshot = await getDocs(q);
        const msgs: Post[] = [];
        snapshot.forEach((doc) => {
          msgs.push({ id: doc.id, ...doc.data() } as Post);
        });
        setPosts(msgs);
        localStorage.setItem('pulse_community_cache', JSON.stringify(msgs));
        setIsLoading(false);
        setLastRefreshTime(Date.now());
        setError(null);
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'posts', false);
        setError("Failed to fetch feed.");
        setIsLoading(false);
      }
    };

    fetchPosts();
    // Ultra Scale: Disabled periodic catch-up. Users use Manual Refresh button.
    return () => {};
  }, []);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    const q = query(
      collection(db, 'posts'),
      orderBy('createdAt', 'desc'),
      limit(100)
    );

    try {
      const snapshot = await getDocs(q);
      const msgs: Post[] = [];
      snapshot.forEach((doc) => {
        msgs.push({ id: doc.id, ...doc.data() } as Post);
      });
      setPosts(msgs);
      setLastRefreshTime(Date.now());
    } catch (error) {
      console.error("Refresh error:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Optimized Rank Fetching - with Cache and Deduplication
  useEffect(() => {
    const fetchRanks = async () => {
      const uids = Array.from(new Set([
        ...posts.map(p => p.uid),
        ...posts.flatMap(p => p.comments?.map(c => c.uid) || [])
      ])).filter(uid => uid && !userRanks[uid]);

      if (uids.length === 0) return;

      const newRanks = { ...userRanks };
      let changed = false;

      // Process in small batches to avoid blocking
      const batchSize = 10;
      for (let i = 0; i < uids.length; i += batchSize) {
        const batch = uids.slice(i, i + batchSize);
        await Promise.all(batch.map(async (uid) => {
          try {
            const lbDoc = await getDoc(doc(db, 'leaderboard', uid));
            newRanks[uid] = lbDoc.exists() 
              ? getRankInfo(lbDoc.data().totalQuestions || 0)
              : getRankInfo(0);
            changed = true;
          } catch (e) {
            console.error("Error fetching rank for", uid, e);
          }
        }));
      }

      if (changed) {
        setUserRanks(newRanks);
      }
    };

    if (posts.length > 0) {
      const timeout = setTimeout(fetchRanks, 1000); // Debounce rank fetching
      return () => clearTimeout(timeout);
    }
  }, [posts]);

  const handleSendPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !inputText.trim()) return;

    const text = inputText.trim();
    setInputText('');

    const tempPost: Post = {
      id: 'temp-' + Date.now(),
      text,
      uid: user.uid,
      displayName: user.displayName || user.email?.split('@')[0] || 'Anonymous',
      photoURL: user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName || user.email}&background=random`,
      category: 'general',
      community: selectedCommunity === 'all' ? (userExam as 'jee' | 'neet' | 'boards' || 'jee') : selectedCommunity,
      likes: [],
      reactions: {},
      reports: [],
      comments: [],
      createdAt: Timestamp.now(), // Use local timestamp for immediate display
    };

    // Optimistic Update
    setPosts(prev => [tempPost, ...prev]);

    try {
      const docRef = await addDoc(collection(db, 'posts'), {
        text,
        uid: user.uid,
        displayName: user.displayName || user.email?.split('@')[0] || 'Anonymous',
        photoURL: user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName || user.email}&background=random`,
        category: 'general',
        community: selectedCommunity === 'all' ? (userExam as 'jee' | 'neet' | 'boards' || 'jee') : selectedCommunity,
        likes: [],
        reactions: {},
        reports: [],
        comments: [],
        createdAt: serverTimestamp(),
      });
      
      // Update temp ID with real one
      setPosts(prev => prev.map(p => p.id === tempPost.id ? { ...p, id: docRef.id } : p));
      
      setIsCreatingPost(false);
      setError(null);
    } catch (error) {
      // Rollback on error
      setPosts(prev => prev.filter(p => p.id !== tempPost.id));
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

      const currentReactions = { ...(post.reactions || {}) };
      const updates: { [key: string]: any } = {};
      
      // Find if user already has a reaction
      let existingEmoji: string | null = null;
      Object.entries(currentReactions).forEach(([e, uids]) => {
        if ((uids as string[]).includes(user.uid)) {
          existingEmoji = e;
        }
      });

      // Optimistic Local State Update
      const newPosts = [...posts];
      const postIndex = newPosts.findIndex(p => p.id === postId);
      if (postIndex !== -1) {
        const optimisticPost = { ...newPosts[postIndex] };
        const newReactions = { ...(optimisticPost.reactions || {}) };

        if (existingEmoji === emoji) {
          // Remove reaction
          newReactions[emoji] = (newReactions[emoji] || []).filter(u => u !== user.uid);
          updates[`reactions.${emoji}`] = arrayRemove(user.uid);
        } else {
          // Remove old if exists
          if (existingEmoji) {
            newReactions[existingEmoji] = (newReactions[existingEmoji] || []).filter(u => u !== user.uid);
            updates[`reactions.${existingEmoji}`] = arrayRemove(user.uid);
          }
          // Add new
          newReactions[emoji] = Array.from(new Set([...(newReactions[emoji] || []), user.uid]));
          updates[`reactions.${emoji}`] = arrayUnion(user.uid);
        }
        optimisticPost.reactions = newReactions;
        newPosts[postIndex] = optimisticPost;
        setPosts(newPosts);
      }

      if (existingEmoji !== emoji) {
        // Notify post author
        if (post.uid !== user.uid) {
          addDoc(collection(db, 'notifications'), {
            toUid: post.uid,
            fromUid: user.uid,
            fromName: user.displayName || 'Someone',
            fromPhoto: user.photoURL || '',
            type: 'reaction',
            postId: postId,
            content: emoji,
            read: false,
            createdAt: serverTimestamp()
          });
        }
      }

      await updateDoc(postRef, updates);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'posts', false);
    }
  };

  const handleEditPost = async (postId: string) => {
    if (!user || !editText.trim()) return;
    
    // Optimistic Update
    const originalPosts = [...posts];
    const postIndex = posts.findIndex(p => p.id === postId);
    if (postIndex !== -1) {
      const newPosts = [...posts];
      newPosts[postIndex] = { 
        ...newPosts[postIndex], 
        text: editText.trim(),
        lastEdited: Timestamp.now() 
      };
      setPosts(newPosts);
    }

    try {
      await updateDoc(doc(db, 'posts', postId), {
        text: editText.trim(),
        lastEdited: serverTimestamp()
      });
      setEditingPostId(null);
      setEditText('');
    } catch (error) {
      // Rollback
      setPosts(originalPosts);
      handleFirestoreError(error, OperationType.UPDATE, 'posts', false);
    }
  };

  const handleDeleteComment = async (postId: string, commentId: string) => {
    if (!user) return;
    if (!window.confirm("Delete this comment?")) return;

    // Optimistic Update
    const originalPosts = [...posts];
    const postIndex = posts.findIndex(p => p.id === postId);
    if (postIndex !== -1 && posts[postIndex].comments) {
      const newPosts = [...posts];
      newPosts[postIndex] = {
        ...newPosts[postIndex],
        comments: newPosts[postIndex].comments!.filter(c => c.id !== commentId)
      };
      setPosts(newPosts);
    }

    try {
      const post = posts.find(p => p.id === postId);
      if (!post || !post.comments) return;

      const newComments = post.comments.filter(c => c.id !== commentId);
      await updateDoc(doc(db, 'posts', postId), {
        comments: newComments
      });
    } catch (error) {
      // Rollback
      setPosts(originalPosts);
      handleFirestoreError(error, OperationType.UPDATE, 'posts', false);
    }
  };

  const handleEditComment = async (postId: string, commentId: string) => {
    if (!user || !editCommentText.trim()) return;

    // Optimistic Update
    const originalPosts = [...posts];
    const postIndex = posts.findIndex(p => p.id === postId);
    if (postIndex !== -1 && posts[postIndex].comments) {
      const newPosts = [...posts];
      newPosts[postIndex] = {
        ...newPosts[postIndex],
        comments: newPosts[postIndex].comments!.map(c =>
          c.id === commentId ? { ...c, text: editCommentText.trim(), lastEdited: Timestamp.now() } : c
        )
      };
      setPosts(newPosts);
    }

    try {
      const post = posts.find(p => p.id === postId);
      if (!post || !post.comments) return;

      const newComments = post.comments.map(c => 
        c.id === commentId ? { ...c, text: editCommentText.trim(), lastEdited: Timestamp.now() } : c
      );

      await updateDoc(doc(db, 'posts', postId), {
        comments: newComments
      });
      setEditingCommentId(null);
      setEditCommentText('');
    } catch (error) {
      // Rollback
      setPosts(originalPosts);
      handleFirestoreError(error, OperationType.UPDATE, 'posts', false);
    }
  };

  const handleSendReply = async (postId: string) => {
    if (!user) {
      onAuthRequest?.();
      return;
    }
    if (!replyText[postId]?.trim()) return;

    const text = replyText[postId].trim();
    const replyTo = replyToComment?.postId === postId ? replyToComment.name : null;
    const parentId = replyToComment?.postId === postId ? replyToComment.commentId : null;
    
    // Optimistic UI Update
    const currentReplyText = replyText[postId];
    setReplyText(prev => ({ ...prev, [postId]: '' }));
    setReplyToComment(null);
    setShowCommentInput(null);

    const tempCommentId = Math.random().toString(36).substring(7) + Date.now().toString(36);
    const newComment: Comment = {
      id: tempCommentId,
      text,
      uid: user.uid,
      displayName: user.displayName || user.email?.split('@')[0] || 'Anonymous',
      photoURL: user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName || user.email}&background=random`,
      createdAt: Timestamp.now(),
      ...(replyTo && { replyTo }),
      ...(parentId && { parentId }),
    };

    const newPosts = [...posts];
    const postIndex = newPosts.findIndex(p => p.id === postId);
    if (postIndex !== -1) {
      newPosts[postIndex] = {
        ...newPosts[postIndex],
        comments: [...(newPosts[postIndex].comments || []), newComment]
      };
      setPosts(newPosts);
    }

    try {
      const postRef = doc(db, 'posts', postId);
      await updateDoc(postRef, {
        comments: arrayUnion(newComment)
      });

      // Notify post author
      const post = posts.find(p => p.id === postId);
      if (post && post.uid !== user.uid) {
        await addDoc(collection(db, 'notifications'), {
          toUid: post.uid,
          fromUid: user.uid,
          fromName: user.displayName || 'Someone',
          fromPhoto: user.photoURL || '',
          type: parentId ? 'comment_reply' : 'post_reply',
          postId: postId,
          content: text.substring(0, 50) + (text.length > 50 ? '...' : ''),
          read: false,
          createdAt: serverTimestamp()
        });
      }

      // Also notify the comment author if it's a reply to a specific comment
      if (parentId) {
        const parentComment = post?.comments?.find(c => c.id === parentId);
        if (parentComment && parentComment.uid !== user.uid && parentComment.uid !== post?.uid) {
          await addDoc(collection(db, 'notifications'), {
            toUid: parentComment.uid,
            fromUid: user.uid,
            fromName: user.displayName || 'Someone',
            fromPhoto: user.photoURL || '',
            type: 'comment_reply',
            postId: postId,
            content: text.substring(0, 50) + (text.length > 50 ? '...' : ''),
            read: false,
            createdAt: serverTimestamp()
          });
        }
      }
    } catch (error) {
      console.error("Error sending reply:", error);
      // Restore text on error
      setReplyText(prev => ({ ...prev, [postId]: currentReplyText }));
      handleFirestoreError(error, OperationType.UPDATE, 'posts', false);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!user) return;
    if (!window.confirm("Are you sure you want to delete this post?")) return;

    // Optimistic Delete
    const originalPosts = [...posts];
    setPosts(prev => prev.filter(p => p.id !== postId));

    try {
      await deleteDoc(doc(db, 'posts', postId));
      setError(null);
    } catch (error) {
      // Rollback
      setPosts(originalPosts);
      handleFirestoreError(error, OperationType.DELETE, 'posts', false);
      setError("Failed to delete post.");
    }
  };
  const handleReportPost = async (postId: string) => {
    if (!user) {
      onAuthRequest?.();
      return;
    }
    setReportingPostId(postId);
  };

  const confirmReport = async () => {
    if (!reportingPostId || !user) return;
    const postId = reportingPostId;
    setReportingPostId(null);

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

  const handleShare = (postId: string) => {
    const url = `${window.location.origin}/community?post=${postId}`;
    navigator.clipboard.writeText(url).then(() => {
      toast.success("Link copied to clipboard!");
    }).catch(err => console.error("Failed to copy:", err));
  };

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      toast.success("Text copied!");
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const formatTime = React.useCallback((timestamp: any) => {
    if (!timestamp) return 'Just now';
    
    let date: Date;
    try {
      if (timestamp instanceof Date) {
        date = timestamp;
      } else if (timestamp && typeof timestamp.toDate === 'function') {
        date = timestamp.toDate();
      } else if (timestamp && typeof timestamp.seconds === 'number') {
        date = new Date(timestamp.seconds * 1000);
      } else if (typeof timestamp === 'string' || typeof timestamp === 'number') {
        date = new Date(timestamp);
      } else {
        return 'Just now';
      }
    } catch (e) {
      return 'Just now';
    }

    if (isNaN(date.getTime())) return 'Just now';
    
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }, []);

  const filteredPosts = React.useMemo(() => {
    return posts.filter(p => {
      return selectedCommunity === 'all' || p.community === selectedCommunity;
    }).sort((a, b) => {
      if (sortMode === 'top') {
        const scoreA = (a.reactions?.['👍']?.length || 0) + (a.reactions?.['❤️']?.length || 0);
        const scoreB = (b.reactions?.['👍']?.length || 0) + (b.reactions?.['❤️']?.length || 0);
        return scoreB - scoreA;
      }
      return 0; // Already sorted by createdAt desc from query
    });
  }, [posts, selectedCommunity, sortMode]);

  if (!activateCommunity) {
    return (
      <div className="min-h-screen bg-black pt-24 pb-32 px-4 flex items-center justify-center">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 rounded-[32px] bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mb-6 mx-auto">
            <MessageSquare className="w-8 h-8 text-rose-400" />
          </div>
          <h2 className="text-2xl font-black text-white mb-2 uppercase tracking-tighter">Community Deactivated</h2>
          <p className="text-white/40 text-[10px] leading-relaxed uppercase tracking-widest font-bold">
            The community feed is currently disabled in your app settings.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen pt-24 pb-12 px-4 md:px-8">
      <AnimatePresence>
      </AnimatePresence>

      <div className="max-w-7xl mx-auto space-y-8">
        {/* Top Navigation - Community Switcher & View Switcher */}
        <div className="sticky top-0 z-[1000] flex flex-col md:flex-row items-center justify-between gap-6 glass rounded-3xl p-4 border border-white/10 backdrop-blur-3xl mb-12">
          <div />

          <div className="flex items-center gap-4">
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
            
            <div className="hidden md:block h-8 w-px bg-white/5" />
            
            <button 
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className={`p-2 rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-purple-400 hover:bg-purple-500/10 transition-all ${isRefreshing ? 'animate-spin opacity-50' : ''}`}
              title="Refresh Feed"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
            <Notifications />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
          {/* Left Sidebar - Filters (Only for Feed) */}
          {activeView === 'feed' && (
            <div className="hidden lg:block lg:col-span-3 space-y-6">
              <div className="glass rounded-3xl p-6 border border-white/10 sticky top-24">
                <h3 className="text-white font-black text-xs uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-purple-400" />
                  Feed Ranking
                </h3>
                <div className="space-y-4">
                  <div className="flex flex-col gap-2 p-1 bg-black/40 rounded-xl border border-white/5">
                    <button 
                      onClick={() => setSortMode('new')}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all
                        ${sortMode === 'new' ? 'bg-white/10 text-white border border-white/10' : 'text-white/40 hover:text-white/60'}`}
                    >
                      <Clock className="w-4 h-4" />
                      Latest Mission
                    </button>
                    <button 
                      onClick={() => setSortMode('top')}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all
                        ${sortMode === 'top' ? 'bg-white/10 text-white border border-white/10' : 'text-white/40 hover:text-white/60'}`}
                    >
                      <Zap className="w-4 h-4 text-amber-400" />
                      High Impact
                    </button>
                  </div>
                </div>

                <div className="mt-8 p-6 rounded-[24px] bg-black/40 backdrop-blur-xl border border-white/10 text-center relative overflow-hidden group shadow-2xl">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-red-500/20 transition-colors duration-1000" />
                  <div className="absolute -bottom-16 -left-16 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl group-hover:bg-purple-500/20 transition-colors duration-1000" />
                  
                  <div className="relative z-10">
                    <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/10 group-hover:scale-110 transition-transform duration-500">
                      <Heart className="w-6 h-6 text-red-500 fill-red-500/20 animate-pulse" />
                    </div>
                    <h4 className="text-white font-black text-xs uppercase tracking-widest mb-2">Keep Pulse Free</h4>
                    <p className="text-white/40 text-[9px] font-bold uppercase tracking-widest mb-6 leading-relaxed max-w-[160px] mx-auto">Help us sustain high-speed servers for thousands of students.</p>
                    <button 
                      onClick={() => { playTickSound(); setShowDonate(true); }}
                      className="w-full py-4 bg-white text-black rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all shadow-xl active:scale-95"
                    >
                      Donate Us
                    </button>
                  </div>
                </div>

                <div className="mt-8 flex items-center justify-center gap-4 text-[7px] font-black uppercase tracking-[0.2em] text-white/10 px-2 flex-wrap">
                  <button onClick={() => { playTickSound(); window.dispatchEvent(new CustomEvent('show-legal', { detail: 'terms' })); }} className="hover:text-white/40 transition-colors pointer-events-auto cursor-pointer">Terms</button>
                  <div className="w-1 h-1 bg-white/5 rounded-full" />
                  <button onClick={() => { playTickSound(); window.dispatchEvent(new CustomEvent('show-legal', { detail: 'privacy' })); }} className="hover:text-white/40 transition-colors pointer-events-auto cursor-pointer">Privacy</button>
                  <div className="w-1 h-1 bg-white/5 rounded-full" />
                  <button onClick={() => { playTickSound(); window.dispatchEvent(new CustomEvent('show-legal', { detail: 'refund' })); }} className="hover:text-white/40 transition-colors pointer-events-auto cursor-pointer">Refund</button>
                  <div className="w-1 h-1 bg-white/5 rounded-full" />
                  <button onClick={() => { playTickSound(); window.dispatchEvent(new CustomEvent('show-legal', { detail: 'cancellation' })); }} className="hover:text-white/40 transition-colors pointer-events-auto cursor-pointer">Cancellation</button>
                </div>
              </div>
            </div>
          )}

          {/* Main Content */}
          <div className={`${activeView === 'feed' ? 'lg:col-span-9' : 'lg:col-span-12'} space-y-6`}>
            {/* Mobile/Tablet Donation Box */}
            {activeView === 'feed' && (
              <div className="lg:hidden p-6 rounded-[32px] bg-gradient-to-br from-red-500/10 via-purple-500/5 to-transparent border border-white/10 text-center relative overflow-hidden group shadow-xl">
                <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-3xl -mr-16 -mt-16" />
                <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4 text-left">
                    <div className="w-10 h-10 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 shrink-0">
                      <Heart className="w-5 h-5 text-red-500 fill-red-500/20 animate-pulse" />
                    </div>
                    <div>
                      <h4 className="text-white font-black text-[10px] uppercase tracking-widest mb-1">Help Us Keep Pulse Free</h4>
                      <p className="text-white/40 text-[8px] font-bold uppercase tracking-widest">Sustain high-speed servers</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => { playTickSound(); setShowDonate(true); }}
                    className="w-full sm:w-auto px-6 py-3 bg-white text-black rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all shadow-xl"
                  >
                    Donate
                  </button>
                </div>
              </div>
            )}

            {activeView === 'resources' ? (
              <div className="space-y-8 relative">
                <div className="relative z-10 space-y-8">
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass rounded-3xl p-8 border border-white/10 relative overflow-hidden group"
                  >
                    <div className="absolute -top-24 -right-24 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000" />
                    <div className="relative z-10">
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 mb-4">
                        <Sparkles className="w-3 h-3 text-purple-400" />
                        <span className="text-[8px] font-black uppercase tracking-widest text-white/70">Curated Hub</span>
                      </div>
                      <h2 className="text-3xl font-black text-white mb-2 tracking-tight uppercase font-heading">
                        {selectedCommunity.toUpperCase()} <span className="text-purple-500">Resources</span>
                      </h2>
                      <p className="text-white/40 text-[10px] max-w-md uppercase tracking-widest font-bold leading-relaxed">
                        Top-tier learning materials to accelerate your {selectedCommunity.toUpperCase()} preparation.
                      </p>
                    </div>
                  </motion.div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    { (selectedCommunity === 'all' 
                      ? [...RESOURCES.jee, ...RESOURCES.neet, ...RESOURCES.boards]
                      : RESOURCES[selectedCommunity] || []).map((resource, index) => (
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
                          <h3 className="text-lg font-black text-white mb-2 tracking-tight uppercase select-text">{resource.title}</h3>
                          <p className="text-white/40 text-[10px] leading-relaxed mb-6 font-bold uppercase tracking-widest line-clamp-2 select-text">
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
                  </div>

                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="p-8 rounded-[32px] border border-white/[0.01] bg-white/[0.005] backdrop-blur-sm text-center relative overflow-hidden group"
                  >
                    <div className="absolute -top-24 -right-24 w-64 h-64 bg-purple-500/[0.02] rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000" />
                    <div className="relative z-10">
                      <h2 className="text-xl font-black text-white mb-2 tracking-tight uppercase font-heading">Need more materials?</h2>
                      <p className="text-white/30 text-[10px] mb-6 max-w-xs mx-auto leading-relaxed uppercase tracking-widest font-bold">
                        Our AI Whobee is constantly indexing new resources. Check back daily for updated question banks and mock papers.
                      </p>
                      <button className="px-8 py-3 bg-white text-black font-black uppercase tracking-widest text-[10px] rounded-xl transition-all shadow-xl hover:scale-105 active:scale-95">
                        Request Resource
                      </button>
                    </div>
                  </motion.div>
                </div>
              </div>
            ) : (
            <React.Fragment>
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
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-pulse" />
                            <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">New Transmission</span>
                          </div>
                          <button 
                            onClick={() => setIsCreatingPost(false)}
                            className="p-2 hover:bg-white/5 rounded-xl transition-all text-white/20 hover:text-white"
                          >
                            <Plus className="w-5 h-5 rotate-45" />
                          </button>
                        </div>
                        <div className="flex gap-4">
                          <img 
                            src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName || user.email}&background=random`} 
                            className="w-12 h-12 rounded-2xl border border-white/10 shadow-2xl"
                            alt="Me"
                          />
                          <div className="flex-1">
                            <textarea
                              autoFocus
                              value={inputText}
                              onChange={(e) => setInputText(e.target.value)}
                              placeholder={`What's on your mind, ${selectedCommunity.toUpperCase()} scholar?`}
                              className="w-full bg-white/[0.02] border border-white/10 rounded-2xl p-4 text-sm text-white focus:outline-none focus:border-purple-500/50 transition-all resize-none min-h-[250px] placeholder:text-white/10"
                            />
                          </div>
                        </div>
                        <div className="flex flex-col sm:flex-row items-center justify-end gap-4 pt-4 border-t border-white/5">
                          <div className="flex items-center gap-3 w-full sm:w-auto">
                            <button 
                              onClick={() => setIsCreatingPost(false)}
                              className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white hover:bg-white/5 transition-all"
                            >
                              Discard
                            </button>
                            <motion.button
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={handleSendPost}
                              disabled={!inputText.trim()}
                              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all
                                ${!inputText.trim() 
                                  ? 'bg-white/5 text-white/20 cursor-not-allowed' 
                                  : 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-xl shadow-purple-500/20'}`}
                            >
                              <Send className="w-4 h-4" />
                              Broadcast
                            </motion.button>
                          </div>
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
                        className="bg-[#1a1a1b] rounded-2xl border border-[#343536] hover:border-[#474849] transition-all group shadow-xl relative overflow-hidden flex flex-col"
                      >
                        <div className="p-4">
                          <div className="flex items-center gap-3 mb-4">
                            <img 
                              src={post.photoURL || `https://ui-avatars.com/api/?name=${post.displayName}&background=random`} 
                              className="w-10 h-10 rounded-full border border-[#343536] shadow-lg"
                              alt={post.displayName}
                            />
                            <div className="flex flex-col">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-black text-white">u/{post.displayName}</span>
                                {userRanks[post.uid] && (
                                  <span className={`text-[8px] font-black uppercase tracking-tighter px-1.5 py-0.5 rounded bg-white/5 border border-white/10 flex items-center gap-1 ${userRanks[post.uid].color}`}>
                                    {userRanks[post.uid].icon} {userRanks[post.uid].title}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-bold text-purple-400">r/{post.community}</span>
                                <span className="text-[10px] text-[#818384]">•</span>
                                <span className="text-[10px] text-[#818384]">{formatTime(post.createdAt)}</span>
                              </div>
                            </div>
                            <div className="ml-auto flex items-center gap-2">
                              {user?.uid === post.uid && (
                                <div className="flex items-center gap-1">
                                  <button 
                                    onClick={() => {
                                      setEditingPostId(post.id);
                                      setEditText(post.text);
                                    }}
                                    className="text-blue-400/60 hover:text-blue-400 transition-colors p-2 hover:bg-white/5 rounded-xl"
                                    title="Edit Post"
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </button>
                                  <button 
                                    onClick={() => handleDeletePost(post.id)}
                                    className="text-rose-500/60 hover:text-rose-500 transition-colors p-2 hover:bg-white/5 rounded-xl"
                                    title="Delete Post"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              )}
                              {user?.uid !== post.uid && (
                                <button 
                                  onClick={() => handleReportPost(post.id)}
                                  className={`transition-colors p-2 hover:bg-white/5 rounded-xl ${post.reports?.includes(user?.uid || '') ? 'text-amber-500' : 'text-white/20 hover:text-amber-500'}`}
                                  title="Report Post"
                                >
                                  <Flag className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                          
                          <div className="mb-4">
                            {editingPostId === post.id ? (
                              <div className="space-y-3">
                                <textarea
                                  autoFocus
                                  onFocus={(e) => {
                                    const val = e.target.value;
                                    e.target.value = '';
                                    e.target.value = val;
                                  }}
                                  value={editText}
                                  onChange={(e) => setEditText(e.target.value)}
                                  className="w-full bg-black/40 border border-[#343536] rounded-xl p-4 text-sm text-white focus:outline-none focus:border-purple-500/50 resize-none min-h-[120px]"
                                />
                                <div className="flex justify-end gap-2">
                                  <button 
                                    onClick={() => setEditingPostId(null)}
                                    className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-[#818384] hover:bg-white/5"
                                  >
                                    Cancel
                                  </button>
                                  <button 
                                    onClick={() => handleEditPost(post.id)}
                                    className="px-6 py-2 bg-purple-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-purple-500 shadow-lg shadow-purple-500/20"
                                  >
                                    Save Changes
                                  </button>
                                </div>
                              </div>
                            ) : (
                                <p className="text-[#d7dadc] text-sm leading-relaxed font-medium whitespace-pre-wrap break-words select-text">
                                  {post.text}
                                </p>
                            )}
                          </div>

                          {/* Reactions Display */}
                          {post.reactions && Object.entries(post.reactions).some(([emoji, uids]) => (uids as string[]).length > 0) && (
                            <div className="flex flex-wrap gap-1.5 mb-4">
                              {Object.entries(post.reactions).map(([emoji, uids]) => (uids as string[]).length > 0 && (
                                <button
                                  key={emoji}
                                  onClick={() => handleReaction(post.id, emoji)}
                                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#272729] border transition-all
                                    ${(uids as string[]).includes(user?.uid || '') 
                                      ? 'border-purple-500/50 text-white bg-purple-500/10' 
                                      : 'border-[#343536] text-[#818384] hover:border-[#818384]'}`}
                                >
                                  <span className="text-xs">{emoji}</span>
                                  <span className="text-[10px] font-bold">{(uids as string[]).length}</span>
                                </button>
                              ))}
                            </div>
                          )}

                          <div className="flex items-center gap-4 pt-4 border-t border-[#343536]">
                            <button 
                              onClick={() => setExpandedCommentsPostId(expandedCommentsPostId === post.id ? null : post.id)}
                              className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl transition-all font-black uppercase tracking-widest text-[9px] sm:text-[10px]
                                ${expandedCommentsPostId === post.id 
                                  ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' 
                                  : 'text-[#818384] hover:bg-white/5 hover:text-[#d7dadc]'}`}
                            >
                              <MessageSquare className="w-3.5 h-3.5 sm:w-4 h-4" />
                              {post.comments?.length || 0} <span className="hidden sm:inline">Comments</span>
                            </button>

                            <button 
                              onClick={() => handleShare(post.id)}
                              className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl transition-all font-black uppercase tracking-widest text-[9px] sm:text-[10px] text-[#818384] hover:bg-white/5 hover:text-[#d7dadc]"
                            >
                              <Share2 className="w-3.5 h-3.5 sm:w-4 h-4" />
                              Share
                            </button>

                            <div className="relative ml-auto">
                              <button 
                                onClick={() => setActiveReactionPicker(activeReactionPicker === post.id ? null : post.id)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all font-black uppercase tracking-widest text-[10px] text-[#818384] hover:bg-white/5 hover:text-[#d7dadc]`}
                              >
                                <Plus className="w-4 h-4" />
                                React
                              </button>
                              <AnimatePresence>
                                {activeReactionPicker === post.id && (
                                  <motion.div 
                                    initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.9, y: 10 }}
                                    className="absolute bottom-full right-0 mb-2 flex bg-[#1a1a1b] border border-[#343536] rounded-full p-1.5 shadow-2xl z-50"
                                  >
                                    {REACTION_EMOJIS.map(emoji => (
                                      <button
                                        key={emoji}
                                        onClick={() => {
                                          handleReaction(post.id, emoji);
                                          setActiveReactionPicker(null);
                                        }}
                                        className="p-2 hover:bg-white/5 rounded-full transition-all text-lg"
                                      >
                                        {emoji}
                                      </button>
                                    ))}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          </div>

                          {/* Comments Section */}
                          <AnimatePresence>
                            {expandedCommentsPostId === post.id && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="mt-4 space-y-4 overflow-hidden border-t border-[#343536] pt-4"
                              >
                                {/* Comment Input Trigger */}
                                <div className="flex items-center justify-between px-2">
                                  <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">Discussion</span>
                                  {!showCommentInput && (
                                    <button 
                                      onClick={() => {
                                        if (!user) {
                                          onAuthRequest?.();
                                          return;
                                        }
                                        setShowCommentInput(post.id);
                                      }}
                                      className="flex items-center gap-2 px-4 py-2 bg-purple-600/20 border border-purple-500/30 rounded-xl text-[10px] font-black text-purple-400 uppercase tracking-widest hover:bg-purple-600/30 transition-all active:scale-95"
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                      Add Comment
                                    </button>
                                  )}
                                </div>

                                <AnimatePresence>
                                  {showCommentInput === post.id && (
                                    <motion.div 
                                      initial={{ opacity: 0, y: -10 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      exit={{ opacity: 0, y: -10 }}
                                      className="flex flex-col gap-3 bg-[#151516] p-4 rounded-2xl border border-[#343536] shadow-2xl mx-2"
                                    >
                                      {replyToComment?.postId === post.id && (
                                        <div className="flex items-center justify-between px-3 py-2 bg-purple-500/10 rounded-xl border border-purple-500/20">
                                          <div className="flex items-center gap-2">
                                            <div className="w-1 h-4 bg-purple-500 rounded-full" />
                                            <span className="text-[10px] font-bold text-purple-400 uppercase tracking-widest">Replying to @{replyToComment.name}</span>
                                          </div>
                                          <button onClick={() => setReplyToComment(null)} className="text-purple-400/60 hover:text-purple-400 p-1">
                                            <Plus className="w-4 h-4 rotate-45" />
                                          </button>
                                        </div>
                                      )}
                                      <div className="flex gap-3">
                                        {user && (
                                          <img 
                                            src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName || 'User'}&background=random`} 
                                            className="w-8 h-8 rounded-full border border-white/10 hidden sm:block" 
                                            alt="" 
                                          />
                                        )}
                                        <textarea
                                          autoFocus
                                          value={replyText[post.id] || ''}
                                          onChange={(e) => setReplyText(prev => ({ ...prev, [post.id]: e.target.value }))}
                                          placeholder={replyToComment?.postId === post.id ? "Write your reply..." : "What are your thoughts?"}
                                          className="flex-1 bg-transparent text-sm text-[#d7dadc] focus:outline-none resize-none min-h-[80px] placeholder:text-[#818384] py-1"
                                        />
                                      </div>
                                      <div className="flex justify-end gap-3 pt-3 border-t border-white/5">
                                        <button 
                                          onClick={() => { setShowCommentInput(null); setReplyToComment(null); }}
                                          className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-[#818384] hover:bg-white/5 transition-all"
                                        >
                                          Cancel
                                        </button>
                                        <button
                                          onClick={() => handleSendReply(post.id)}
                                          disabled={!replyText[post.id]?.trim()}
                                          className="px-6 py-2 bg-purple-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-purple-500 transition-all disabled:opacity-50 shadow-lg shadow-purple-500/20 active:scale-95"
                                        >
                                          Post
                                        </button>
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>

                                {post.comments && post.comments.length > 0 ? (
                                  <div className="space-y-6 px-2">
                                    {(() => {
                                      const topLevelComments = post.comments
                                        .filter(c => !c.parentId)
                                        .sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
                                      
                                      const replies = post.comments.filter(c => c.parentId);

                                      return topLevelComments.map(comment => (
                                        <div key={comment.id} className="space-y-4 relative">
                                          {/* Main Comment */}
                                          <div className="flex gap-3 group/comment relative z-10">
                                            <div className="flex flex-col items-center">
                                              <div className="relative">
                                                <img src={comment.photoURL || `https://ui-avatars.com/api/?name=${comment.displayName}&background=random`} className="w-8 h-8 rounded-full border-2 border-purple-500/20 shadow-lg" alt={comment.displayName} />
                                                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-[#0a0a0b] rounded-full" />
                                              </div>
                                              {replies.some(r => r.parentId === comment.id) && (
                                                <div className="w-0.5 flex-1 bg-gradient-to-b from-purple-500/30 via-purple-500/10 to-transparent my-2 rounded-full" />
                                              )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                              <div className="bg-white/5 rounded-2xl p-3 border border-white/10 hover:border-purple-500/30 transition-all">
                                                <div className="flex items-center flex-wrap gap-2 mb-1.5">
                                                  <span className="text-xs font-black text-white">{comment.displayName}</span>
                                                  {userRanks[comment.uid] && (
                                                    <span className={`text-[8px] font-black uppercase tracking-tighter px-1.5 py-0.5 rounded-full bg-white/5 border border-white/10 flex items-center gap-1 ${userRanks[comment.uid].color}`}>
                                                      {userRanks[comment.uid].icon} {userRanks[comment.uid].title}
                                                    </span>
                                                  )}
                                                  <span className="text-[10px] text-white/30 ml-auto">{formatTime(comment.createdAt)}</span>
                                                </div>
                                                
                                                {editingCommentId?.commentId === comment.id ? (
                                                  <div className="space-y-2">
                                                    <textarea
                                                      autoFocus
                                                      value={editCommentText}
                                                      onChange={(e) => setEditCommentText(e.target.value)}
                                                      className="w-full bg-white/5 border border-white/10 rounded-xl p-2 text-sm text-white focus:outline-none focus:border-purple-500/50 resize-none min-h-[60px]"
                                                    />
                                                    <div className="flex justify-end gap-2">
                                                      <button 
                                                        onClick={() => setEditingCommentId(null)}
                                                        className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest text-white/40 hover:bg-white/5"
                                                      >
                                                        Cancel
                                                      </button>
                                                      <button 
                                                        onClick={() => handleEditComment(post.id, comment.id)}
                                                        className="px-4 py-1.5 bg-purple-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-purple-500"
                                                      >
                                                        Save
                                                      </button>
                                                    </div>
                                                  </div>
                                                ) : (
                                                    <p className="text-white/80 text-sm leading-relaxed break-words select-text">
                                                      {comment.text}
                                                    </p>
                                                )}
                                              </div>

                                              <div className="flex items-center gap-4 mt-1 ml-1">
                                                <button 
                                                  onClick={() => {
                                                    if (!user) {
                                                      onAuthRequest?.();
                                                      return;
                                                    }
                                                    setShowCommentInput(post.id);
                                                    setReplyToComment({ postId: post.id, commentId: comment.id, name: comment.displayName });
                                                  }}
                                                  className="text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-purple-400 transition-colors flex items-center gap-1.5 py-1"
                                                >
                                                  <MessageSquare className="w-3 h-3" />
                                                  Reply
                                                </button>
                                                
                                                {user?.uid === comment.uid && (
                                                  <div className="flex items-center gap-3">
                                                    <button 
                                                      onClick={() => {
                                                        setEditingCommentId({ postId: post.id, commentId: comment.id });
                                                        setEditCommentText(comment.text);
                                                      }}
                                                      className="text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-blue-400 transition-colors"
                                                    >
                                                      Edit
                                                    </button>
                                                    <button 
                                                      onClick={() => handleDeleteComment(post.id, comment.id)}
                                                      className="text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-rose-500 transition-colors"
                                                    >
                                                      Delete
                                                    </button>
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                          </div>

                                          {/* Replies */}
                                          <div className="space-y-3">
                                            {replies
                                              .filter(r => r.parentId === comment.id)
                                              .sort((a, b) => (a.createdAt?.toMillis() || 0) - (b.createdAt?.toMillis() || 0))
                                              .map(reply => (
                                                <div key={reply.id} className="ml-8 sm:ml-11 flex gap-3 group/reply relative">
                                                  <div className="absolute -left-4 top-0 bottom-0 w-0.5 bg-purple-500/10 rounded-full" />
                                                  <img src={reply.photoURL || `https://ui-avatars.com/api/?name=${reply.displayName}&background=random`} className="w-6 h-6 rounded-full border border-white/10 shadow-md" alt={reply.displayName} />
                                                  <div className="flex-1 min-w-0">
                                                    <div className="bg-white/5 rounded-xl p-2.5 border border-white/5 hover:border-purple-500/20 transition-all">
                                                      <div className="flex items-center flex-wrap gap-2 mb-1">
                                                        <span className="text-[11px] font-black text-white">{reply.displayName}</span>
                                                        <span className="text-[10px] text-white/30 ml-auto">{formatTime(reply.createdAt)}</span>
                                                      </div>
                                                      
                                                      {editingCommentId?.commentId === reply.id ? (
                                                        <div className="space-y-2">
                                                          <textarea
                                                            autoFocus
                                                            value={editCommentText}
                                                            onChange={(e) => setEditCommentText(e.target.value)}
                                                            className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-purple-500/50 resize-none min-h-[40px]"
                                                          />
                                                          <div className="flex justify-end gap-2">
                                                            <button 
                                                              onClick={() => setEditingCommentId(null)}
                                                              className="px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest text-white/40 hover:bg-white/5"
                                                            >
                                                              Cancel
                                                            </button>
                                                            <button 
                                                              onClick={() => handleEditComment(post.id, reply.id)}
                                                              className="px-3 py-1 bg-purple-600 text-white rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-purple-500"
                                                            >
                                                              Save
                                                            </button>
                                                          </div>
                                                        </div>
                                                      ) : (
                                                          <p className="text-white/80 text-xs leading-relaxed break-words select-text">
                                                            {reply.replyTo && (
                                                              <span className="text-purple-400 font-black mr-1.5">@{reply.replyTo}</span>
                                                            )}
                                                            {reply.text}
                                                          </p>
                                                      )}
                                                    </div>
                                                    
                                                    <div className="flex items-center gap-3 mt-1 ml-1">
                                                      <button 
                                                        onClick={() => {
                                                          if (!user) {
                                                            onAuthRequest?.();
                                                            return;
                                                          }
                                                          setShowCommentInput(post.id);
                                                          setReplyToComment({ postId: post.id, commentId: comment.id, name: reply.displayName });
                                                        }}
                                                        className="text-[9px] font-black uppercase tracking-widest text-white/40 hover:text-purple-400 transition-colors py-1"
                                                      >
                                                        Reply
                                                      </button>
                                                      
                                                      {user?.uid === reply.uid && (
                                                        <>
                                                          <button 
                                                            onClick={() => {
                                                              setEditingCommentId({ postId: post.id, commentId: reply.id });
                                                              setEditCommentText(reply.text);
                                                            }}
                                                            className="text-[9px] font-black uppercase tracking-widest text-white/40 hover:text-blue-400 transition-colors"
                                                          >
                                                            Edit
                                                          </button>
                                                          <button 
                                                            onClick={() => handleDeleteComment(post.id, reply.id)}
                                                            className="text-[9px] font-black uppercase tracking-widest text-white/40 hover:text-rose-500 transition-colors"
                                                          >
                                                            Delete
                                                          </button>
                                                        </>
                                                      )}
                                                    </div>
                                                  </div>
                                                </div>
                                              ))}
                                          </div>
                                        </div>
                                      ));
                                    })()}
                                  </div>
                                ) : (
                                  <div className="py-10 text-center">
                                    <p className="text-[10px] font-black text-white/10 uppercase tracking-[0.3em]">No comments yet</p>
                                  </div>
                                )}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                )}
              </div>
            </React.Fragment>
          )}
        </div>
      </div>
    </div>

    <AnimatePresence>
        {reportingPostId && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="w-full max-w-md bg-[#1a1a1b] border border-[#343536] rounded-[24px] p-8 text-center shadow-[0_0_50px_rgba(0,0,0,0.5)]"
            >
              <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <ShieldCheck className="w-8 h-8 text-amber-500" />
              </div>
              <h2 className="text-2xl font-black text-white mb-2 uppercase tracking-tighter">Report Post?</h2>
              <p className="text-white/40 text-xs mb-8 leading-relaxed uppercase tracking-widest font-bold">
                Are you sure you want to report this post? This action helps keep our community safe and focused.
              </p>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={confirmReport}
                  className="w-full py-4 bg-amber-500 text-black rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-amber-400 transition-all shadow-[0_0_20px_rgba(245,158,11,0.2)]"
                >
                  Confirm Report
                </button>
                <button 
                  onClick={() => setReportingPostId(null)}
                  className="w-full py-4 bg-white/5 text-white/40 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-white/10 transition-all"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <DonateModal 
        isOpen={showDonate} 
        onClose={() => setShowDonate(false)} 
      />
    </div>
  );
};
export default CommunityPage;
