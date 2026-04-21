import React, { useState, useEffect } from 'react';
import { Bell, MessageSquare, Heart, X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, db, collection, query, where, orderBy, onSnapshot, limit, doc, updateDoc, serverTimestamp, writeBatch } from '@/src/firebase';

const Notifications = () => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const user = auth.currentUser;

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'notifications'),
      where('toUid', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs: any[] = [];
      let unread = 0;
      snapshot.forEach((doc) => {
        const data = doc.data();
        notifs.push({ id: doc.id, ...data });
        if (!data.read) unread++;
      });
      setNotifications(notifs);
      setUnreadCount(unread);
    }, (error) => {
      console.error("Error in notifications listener:", error);
    });

    return () => unsubscribe();
  }, [user]);

  const markAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { read: true });
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;
    try {
      const unreadNotifs = notifications.filter(n => !n.read);
      if (unreadNotifs.length === 0) return;

      const batch = writeBatch(db);
      unreadNotifs.forEach(n => {
        batch.update(doc(db, 'notifications', n.id), { read: true });
      });
      await batch.commit();
      
      // Optimistic update
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };
  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-purple-400 hover:bg-purple-500/10 transition-all"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-purple-600 text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-[0_0_10px_rgba(147,51,234,0.5)]">
            {unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div 
              className="fixed inset-0 z-[99998]" 
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute right-0 mt-4 w-80 bg-[#0a0a0b] border border-white/10 rounded-[24px] shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-[99999] overflow-hidden"
            >
              <div className="p-5 border-b border-white/5 flex items-center justify-between bg-white/[0.03] backdrop-blur-md">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-pulse" />
                  <h3 className="text-[11px] font-black text-white uppercase tracking-[0.2em]">Inbox</h3>
                </div>
                {unreadCount > 0 && (
                  <button 
                    onClick={markAllAsRead}
                    className="px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-[9px] font-black text-purple-400 uppercase tracking-widest hover:bg-purple-500 hover:text-white transition-all"
                  >
                    Clear All
                  </button>
                )}
              </div>

              <div className="max-h-[450px] overflow-y-auto custom-scrollbar">
                {notifications.length === 0 ? (
                  <div className="p-16 text-center">
                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/5">
                      <Bell className="w-8 h-8 text-white/10" />
                    </div>
                    <p className="text-[10px] font-black text-white/20 uppercase tracking-widest leading-relaxed">
                      All caught up!
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-white/[0.03]">
                    {notifications.map((notif) => (
                      <div 
                        key={notif.id}
                        className={`p-5 flex gap-4 transition-all hover:bg-white/[0.04] cursor-pointer group relative ${!notif.read ? 'bg-purple-500/[0.04]' : ''}`}
                        onClick={() => markAsRead(notif.id)}
                      >
                        {!notif.read && (
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.5)]" />
                        )}
                        <div className="relative shrink-0">
                          <img 
                            src={notif.fromPhoto || `https://ui-avatars.com/api/?name=${notif.fromName}&background=random`} 
                            className="w-10 h-10 rounded-2xl border border-white/10 object-cover" 
                            alt="" 
                          />
                          <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-lg flex items-center justify-center border-2 border-[#0a0a0b] shadow-lg ${notif.type === 'reaction' ? 'bg-rose-500' : 'bg-blue-500'}`}>
                            {notif.type === 'reaction' ? <Heart className="w-2.5 h-2.5 text-white" /> : <MessageSquare className="w-2.5 h-2.5 text-white" />}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[12px] font-black text-white group-hover:text-purple-400 transition-colors">{notif.fromName}</span>
                            <span className="text-[8px] font-black text-white/20 uppercase tracking-widest">
                              {(() => {
                                const ts = notif.createdAt;
                                if (!ts) return 'Just now';
                                try {
                                  const d = typeof ts.toDate === 'function' ? ts.toDate() : (ts.seconds ? new Date(ts.seconds * 1000) : new Date(ts));
                                  return isNaN(d.getTime()) ? 'Just now' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                } catch(e) { return 'Just now'; }
                              })()}
                            </span>
                          </div>
                          <p className="text-[11px] text-white/50 leading-relaxed line-clamp-2">
                            {notif.type === 'reaction' ? 'reacted to your post' : 
                             notif.type === 'post_reply' ? 'replied to your post' :
                             notif.type === 'comment_reply' ? 'replied to your comment' :
                             'sent you a notification'}:
                            <span className="text-white/80 font-medium ml-1 italic">"{notif.content}"</span>
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Notifications;
