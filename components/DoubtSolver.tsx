import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Send, Image as ImageIcon, Loader2, Brain, Info, X, Trash2, Bot, User, Check, Paperclip } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { playTickSound } from '@/src/lib/sounds';
import { db, auth } from '@/src/firebase';
import { collection, addDoc, serverTimestamp, query, orderBy, limit, onSnapshot, where } from 'firebase/firestore';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  image?: string;
  timestamp: Date;
}

const DoubtSolver = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [activeSubject, setActiveSubject] = useState('Physics');
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const subjects = ['Physics', 'Chemistry', 'Mathematics', 'Biology'];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearImage = () => {
    setSelectedImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

      // Save to history in Firebase if logged in
      const solveDoubt = async () => {
        if (!input.trim() && !selectedImage) return;
        
        playTickSound();
        const userMessage = input.trim();
        const userImg = selectedImage;
        
        const newUserMsg: Message = {
          role: 'user',
          content: userMessage || "Analyize this image",
          image: userImg || undefined,
          timestamp: new Date()
        };
    
        setMessages(prev => [...prev, newUserMsg]);
        setInput('');
        setSelectedImage(null);
        setLoading(true);
    
        try {
          const history = messages.slice(-5).map(m => ({
            role: m.role === 'user' ? 'user' : 'model',
            parts: [{ text: m.content }]
          }));
    
          const response = await fetch('/api/solve-doubt', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userMessage: userMessage || "Analyze this image"
            })
          });
    
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Failed to get response");
          }
    
          const data = await response.json();
    
          const aiResponse: Message = {
            role: 'assistant',
            content: data.text,
            timestamp: new Date()
          };
    
          setMessages(prev => [...prev, aiResponse]);
    
          // Save to history in Firebase if logged in
          if (auth.currentUser) {
            await addDoc(collection(db, 'users', auth.currentUser.uid, 'doubtHistory'), {
              question: userMessage,
              answer: data.text,
              subject: activeSubject,
              timestamp: serverTimestamp()
            });
          }
    
        } catch (error) {
          console.error("AI Error:", error);
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: "Error connecting to Mission Intelligence. Please check your transmission link.",
            timestamp: new Date()
          }]);
        } finally {
          setLoading(false);
        }
      };

  return (
    <div className="h-[750px] bg-[#050506] text-white relative flex flex-col overflow-hidden rounded-3xl border border-white/5">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(139,92,246,0.05)_0%,rgba(0,0,0,1)_100%)] pointer-events-none" />
      
      {/* Header */}
      <div className="relative z-10 pt-8 pb-6 px-6 border-b border-white/5 backdrop-blur-md bg-black/40">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
              <Brain className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h1 className="text-lg font-black uppercase tracking-tight">Mission Intelligence</h1>
              <p className="text-[8px] text-white/40 font-black uppercase tracking-widest">v3.1 Neural Link</p>
            </div>
          </div>
          
          <div className="hidden sm:flex items-center gap-2 p-1 bg-white/5 rounded-xl border border-white/10">
            {subjects.map(s => (
              <button
                key={s}
                onClick={() => { playTickSound(); setActiveSubject(s); }}
                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                  activeSubject === s 
                    ? 'bg-purple-500 text-white shadow-[0_0_15px_rgba(168,85,247,0.4)]' 
                    : 'text-white/40 hover:text-white/60'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto z-10 relative px-6 py-8 custom-scrollbar"
      >
        <div className="max-w-4xl mx-auto space-y-8">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="mb-8 opacity-20"
              >
                <Sparkles className="w-24 h-24 text-purple-500" />
              </motion.div>
              <h2 className="text-3xl font-black mb-4">Awaiting Input</h2>
              <p className="text-white/40 max-w-sm leading-relaxed uppercase text-[10px] font-black tracking-widest">
                Upload a question image or type your doubt below. Our neural link will provide step-by-step solutions instantly.
              </p>
            </div>
          )}

          <AnimatePresence initial={false}>
            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                  msg.role === 'user' 
                    ? 'bg-purple-500/10 border-purple-500/20' 
                    : 'bg-emerald-500/10 border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]'
                }`}>
                  {msg.role === 'user' ? <User className="w-5 h-5 text-purple-400" /> : <Bot className="w-5 h-5 text-emerald-400" />}
                </div>
                
                <div className={`max-w-[80%] space-y-3 ${msg.role === 'user' ? 'text-right' : ''}`}>
                  {msg.image && (
                    <div className="inline-block rounded-2xl overflow-hidden border border-white/10 max-w-sm">
                      <img src={msg.image} alt="Doubt" className="w-full h-auto" />
                    </div>
                  )}
                  <div className={`p-4 rounded-3xl text-sm leading-relaxed ${
                    msg.role === 'user' 
                      ? 'bg-purple-500/10 text-purple-100 rounded-tr-none' 
                      : 'bg-white/5 text-white/80 border border-white/10 rounded-tl-none prose-invert'
                  }`}>
                    {msg.content.split('\n').map((line, idx) => (
                      <p key={idx} className={line.trim() === '' ? 'h-2' : 'mb-2'}>{line}</p>
                    ))}
                  </div>
                  <p className="text-[10px] text-white/20 font-black uppercase tracking-widest">{msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {loading && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex gap-4"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
              </div>
              <div className="p-4 rounded-3xl bg-white/5 border border-white/10 flex items-center gap-3">
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 animate-pulse">Analyzing Doubts...</span>
                <div className="flex gap-1">
                  {[0, 1, 2].map(dot => (
                    <motion.div
                      key={dot}
                      animate={{ scale: [1, 1.5, 1] }}
                      transition={{ duration: 1, repeat: Infinity, delay: dot * 0.2 }}
                      className="w-1 h-1 bg-emerald-500 rounded-full"
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Input Area */}
      <div className="relative z-20 pb-32 pt-4 px-6 bg-gradient-to-t from-black via-black to-transparent">
        <div className="max-w-4xl mx-auto">
          {/* Image Preview Overlay */}
          <AnimatePresence>
            {selectedImage && (
              <motion.div 
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 50, opacity: 0 }}
                className="absolute bottom-full mb-4 left-6 right-6 flex justify-center"
              >
                <div className="relative group p-2 bg-[#0a0a0b] border border-purple-500/30 rounded-2xl shadow-xl">
                  <img src={selectedImage} alt="Preview" className="w-32 h-32 object-cover rounded-xl" />
                  <button 
                    onClick={clearImage}
                    className="absolute -top-2 -right-2 p-1.5 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-end gap-3 bg-[#0a0a0b] border border-white/10 rounded-[32px] p-2 pl-6 focus-within:border-purple-500/50 focus-within:ring-4 focus-within:ring-purple-500/10 transition-all shadow-2xl">
            <textarea 
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  solveDoubt();
                }
              }}
              placeholder={`Ask any ${activeSubject} doubt...`}
              className="flex-1 py-4 bg-transparent outline-none text-sm resize-none custom-scrollbar min-h-[52px] max-h-[150px]"
            />
            
            <input 
              type="file" 
              accept="image/*"
              ref={fileInputRef}
              onChange={handleImageUpload}
              className="hidden"
            />
            
            <div className="flex gap-2 p-1">
              <button 
                onClick={() => { playTickSound(); fileInputRef.current?.click(); }}
                className={`p-3 rounded-2xl transition-all ${selectedImage ? 'bg-purple-500 text-white' : 'text-white/40 hover:bg-white/5'}`}
              >
                <ImageIcon className="w-5 h-5" />
              </button>
              
              <button 
                onClick={solveDoubt}
                disabled={loading || (!input.trim() && !selectedImage)}
                className="p-3 bg-white text-black rounded-2xl hover:bg-zinc-200 transition-all disabled:opacity-20 active:scale-95"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          <div className="mt-4 flex items-center justify-center gap-6">
            <div className="flex items-center gap-2 text-white/20">
              <Check className="w-3 h-3" />
              <span className="text-[8px] font-black uppercase tracking-widest">Step-by-Step Solutions</span>
            </div>
            <div className="flex items-center gap-2 text-white/20">
              <Check className="w-3 h-3" />
              <span className="text-[8px] font-black uppercase tracking-widest">LaTeX Formula Support</span>
            </div>
            <div className="flex items-center gap-2 text-white/20">
              <Check className="w-3 h-3" />
              <span className="text-[8px] font-black uppercase tracking-widest">Image Recognition</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DoubtSolver;
