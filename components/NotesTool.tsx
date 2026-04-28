import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Plus, Trash2, Edit3, Save, Search, StickyNote, FileText, ChevronRight, Target, BookOpen, LayoutGrid, Calendar, AlertTriangle } from 'lucide-react';
import { 
  db, auth, collection, doc, setDoc, deleteDoc, onSnapshot, query, orderBy, 
  serverTimestamp, handleFirestoreError, OperationType 
} from '@/src/firebase';
import { playTickSound } from '@/src/lib/sounds';
import { toast } from 'sonner';
import { SYLLABUS_DATA } from '@/src/constants/syllabus';

interface Note {
  id: string;
  title: string;
  content: string;
  subject?: string;
  chapter?: string;
  type: 'note' | 'goal';
  createdAt: any;
  updatedAt: any;
}

interface NotesToolProps {
  isOpen: boolean;
  onClose: () => void;
  examType?: 'jee' | 'neet' | 'boards' | string;
}

const NotesTool: React.FC<NotesToolProps> = ({ isOpen, onClose, examType = 'jee' }) => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editSubject, setEditSubject] = useState('');
  const [editChapter, setEditChapter] = useState('');
  const [loading, setLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  
  const user = auth.currentUser;

  const getSubjects = () => {
    const key = examType.toLowerCase();
    const subjects = SYLLABUS_DATA[key] || SYLLABUS_DATA['jee'];
    return {
      'General': ['Planning', 'Backlog', 'Motivation', 'Formula Sheet', 'Mistake Log', 'Schedule'],
      ...subjects
    };
  };

  const allSubjects = getSubjects();

  useEffect(() => {
    if (!user || !isOpen) return;
    const notesRef = collection(db, 'users', user.uid, 'notes');
    const q = query(notesRef, orderBy('updatedAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Note[];
      setNotes(notesData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/notes`);
    });
    return () => unsubscribe();
  }, [user, isOpen]);

  const handleAddNote = async () => {
    if (!user) return;
    playTickSound();
    const newNoteRef = doc(collection(db, 'users', user.uid, 'notes'));
    const newNote = {
      title: 'New Note',
      content: '',
      type: 'note',
      subject: 'General',
      chapter: '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    try {
      await setDoc(newNoteRef, newNote);
      startEditing({ id: newNoteRef.id, ...newNote } as any);
    } catch (error) {
      toast.error('Failed to create');
    }
  };

  const handleSaveNote = async () => {
    if (!user || !selectedNote) return;
    playTickSound();
    const noteRef = doc(db, 'users', user.uid, 'notes', selectedNote.id);
    try {
      await setDoc(noteRef, {
        title: editTitle || 'Untitled',
        content: editContent,
        subject: editSubject,
        chapter: editChapter,
        type: 'note',
        updatedAt: serverTimestamp()
      }, { merge: true });
      setIsEditing(false);
      toast.success('Saved');
    } catch (error) {
      toast.error('Failed to save');
    }
  };

  const handleDeleteNote = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!user) return;
    playTickSound();
    
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'notes', id));
      if (selectedNote?.id === id) {
        setSelectedNote(null);
        setIsEditing(false);
      }
      setShowDeleteConfirm(null);
      toast.success('Deleted');
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  const startEditing = (note: Note) => {
    playTickSound();
    setSelectedNote(note);
    setEditTitle(note.title);
    setEditContent(note.content);
    setEditSubject(note.subject || 'General');
    setEditChapter(note.chapter || '');
    setIsEditing(true);
  };

  const filteredNotes = notes.filter(note => 
    note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    note.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    note.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    note.chapter?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 md:p-10">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/90 backdrop-blur-xl"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 40 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 40 }}
        className="relative w-full max-w-7xl h-full bg-[#0a0a0b] border border-white/10 rounded-[48px] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.5)] flex flex-col lg:flex-row"
      >
        {/* Sidebar */}
        <div className="w-full lg:w-96 border-r border-white/5 flex flex-col bg-white/[0.02]">
          <div className="p-8 border-b border-white/5">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/20">
                  <StickyNote className="w-5 h-5" />
                </div>
                <h2 className="text-sm font-black text-white uppercase tracking-[0.2em]">Notes Tool</h2>
              </div>
              <button 
                onClick={handleAddNote}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-500 text-white hover:bg-blue-600 transition-all text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20"
              >
                <Plus className="w-4 h-4" />
                New Note
              </button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
              <input 
                type="text"
                placeholder="Search archives..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-black/40 border border-white/5 rounded-2xl py-3.5 pl-11 pr-4 text-xs text-white placeholder:text-white/10 focus:outline-none focus:border-blue-500/50 transition-all font-medium"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-3 scrollbar-hide">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3 opacity-20">
                <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Accessing records...</span>
              </div>
            ) : filteredNotes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center opacity-30">
                <FileText className="w-12 h-12 mb-4" />
                <span className="text-[10px] font-bold uppercase tracking-widest">No entries found</span>
              </div>
            ) : (
              filteredNotes.map((note) => (
                <div
                  key={note.id}
                  onClick={() => startEditing(note)}
                  className={`w-full p-5 rounded-3xl text-left transition-all border group relative cursor-pointer
                    ${selectedNote?.id === note.id 
                      ? 'bg-blue-500/10 border-blue-500/30 ring-1 ring-blue-500/10' 
                      : 'bg-white/[0.01] border-white/5 hover:bg-white/[0.03] hover:border-white/10'}`}
                >
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="flex items-center gap-2.5 flex-1 min-w-0" onClick={() => startEditing(note)}>
                      <div className="p-1.5 rounded-lg bg-blue-500/20">
                        <FileText className="w-3.5 h-3.5 text-blue-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className={`text-[12px] font-black uppercase tracking-tight truncate
                          ${selectedNote?.id === note.id ? 'text-blue-400' : 'text-white/80'}`}>
                          {note.subject || 'No Subject'}
                        </h3>
                        {note.chapter && (
                          <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest truncate mt-0.5">
                            {note.chapter}
                          </p>
                        )}
                      </div>
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(note.id); }}
                      className="p-2 text-white/20 hover:text-red-400 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  
                  <div className="mt-3">
                    <p className="text-[10px] text-white/20 line-clamp-2 leading-relaxed font-medium">
                      {note.content || 'Empty archive...'}
                    </p>
                  </div>
                  
                  <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-2.5 h-2.5 text-white/10" />
                      <span className="text-[9px] font-bold text-white/10 uppercase tracking-widest">
                        {note.updatedAt?.seconds ? new Date(note.updatedAt.seconds * 1000).toLocaleDateString() : 'Active'}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col bg-black relative">
          <div className="absolute top-0 right-0 p-8 z-30 flex items-center gap-4">
             <button onClick={onClose} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all text-white/40 hover:text-white border border-white/10">
              <X className="w-6 h-6" />
            </button>
          </div>

          {isEditing ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="p-10 pb-6 border-b border-white/5 bg-white/[0.01]">
                <div className="flex flex-col md:flex-row md:items-center gap-8 mb-10">
                  <div className="flex-1">
                    <input 
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      placeholder="Enter Title..."
                      className="w-full bg-transparent text-4xl font-black text-white placeholder:text-white/5 focus:outline-none uppercase tracking-tighter"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button 
                      onClick={() => setShowDeleteConfirm(selectedNote?.id!)}
                      className="px-6 py-3 rounded-2xl border border-red-500/20 text-red-500 hover:bg-red-500/10 transition-all text-[10px] font-black uppercase tracking-widest flex items-center gap-2 group"
                    >
                      <Trash2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
                      Delete
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black text-white/20 uppercase tracking-widest flex items-center gap-2 ml-1">
                      <BookOpen className="w-3.5 h-3.5" /> Subject
                    </label>
                    <select 
                      value={editSubject}
                      onChange={(e) => { setEditSubject(e.target.value); setEditChapter(''); }}
                      className="bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-xs text-white/80 focus:outline-none focus:border-blue-500/50 appearance-none transition-all hover:bg-white/10"
                    >
                      {Object.keys(allSubjects).map(s => (
                        <option key={s} value={s} className="bg-[#0c0c0d]">{s}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black text-white/20 uppercase tracking-widest flex items-center gap-2 ml-1">
                      <LayoutGrid className="w-3.5 h-3.5" /> Chapter
                    </label>
                    <select 
                      value={editChapter}
                      onChange={(e) => setEditChapter(e.target.value)}
                      className="bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-xs text-white/80 focus:outline-none focus:border-blue-500/50 appearance-none transition-all hover:bg-white/10"
                    >
                      <option value="">Select Chapter</option>
                      {allSubjects[editSubject]?.map(c => (
                        <option key={c} value={c} className="bg-[#0c0c0d]">{c}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-10 md:p-14 space-y-12 scrollbar-hide">
                <textarea 
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  placeholder="Draft your thoughts..."
                  className="w-full bg-transparent text-white/60 text-xl leading-relaxed resize-none focus:outline-none placeholder:text-white/5 font-medium min-h-[300px]"
                />
              </div>

              <div className="p-8 border-t border-white/5 flex items-center justify-between bg-black">
                <div className="flex items-center gap-2">
                   <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                   <span className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em]">Synched to Cloud</span>
                </div>
                <div className="flex gap-4">
                  <button onClick={() => setIsEditing(false)} className="px-8 py-4 rounded-2xl bg-white/5 border border-white/10 text-white/60 font-black uppercase tracking-widest text-[11px] hover:bg-white/10 transition-all">Cancel</button>
                  <button onClick={handleSaveNote} className="flex items-center gap-3 px-10 py-4 rounded-2xl bg-white text-black font-black uppercase tracking-widest text-[11px] hover:scale-105 active:scale-95 transition-all shadow-[0_20px_40px_rgba(255,255,255,0.15)] ring-4 ring-white/10"><Save className="w-4 h-4" />Commit to Archive</button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-12 relative overflow-hidden">
              <div className="absolute inset-0 opacity-10 pointer-events-none">
                 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border border-white/5 rounded-full" />
              </div>
              <div className="relative group cursor-pointer text-center" onClick={handleAddNote}>
                <div className="p-12 rounded-[64px] bg-blue-500/5 border border-blue-500/10 mb-6 transition-all group-hover:scale-110 group-hover:bg-blue-500/10 group-hover:border-blue-500/50 group-hover:shadow-[0_0_50px_rgba(59,130,246,0.15)] ring-1 ring-white/5">
                  <FileText className="w-16 h-16 text-blue-400 opacity-40 transition-all group-hover:opacity-100" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 group-hover:text-blue-400">Add Note</span>
              </div>
              <div className="mt-16 text-center">
                <h3 className="text-3xl font-black uppercase tracking-tighter text-white/50">Build your knowledge base</h3>
                <p className="text-[10px] uppercase tracking-[0.4em] font-bold mt-4 text-white/10 max-w-sm leading-loose">Capture handwritten snapshots and study plans effortlessly</p>
              </div>
            </div>
          )}
        </div>
      </motion.div>
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[2200] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="w-full max-w-sm bg-[#121214] border border-white/10 rounded-[32px] p-8 text-center shadow-2xl"
            >
              <div className="w-16 h-16 rounded-3xl bg-red-500/10 text-red-500 flex items-center justify-center mx-auto mb-6 ring-1 ring-red-500/20">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-white uppercase tracking-tighter mb-2">Delete Note?</h3>
              <p className="text-[11px] font-medium text-white/30 uppercase tracking-[0.2em] leading-relaxed mb-8">
                This action is irreversible and will remove this archive permanently.
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowDeleteConfirm(null)}
                  className="flex-1 py-4 rounded-2xl bg-white/5 border border-white/10 text-white/60 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => handleDeleteNote(showDeleteConfirm)}
                  className="flex-1 py-4 rounded-2xl bg-red-500 text-white text-[10px] font-black uppercase tracking-widest hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotesTool;
