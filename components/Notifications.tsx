import React, { useState, useEffect } from 'react';
import { Bell, MessageSquare, Heart, X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, db, collection, query, where, orderBy, onSnapshot, limit, doc, updateDoc, serverTimestamp } from '@/src/firebase';

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
    try {
      const unreadNotifs = notifications.filter(n => !n.read);
      for (const n of unreadNotifs) {
        await updateDoc(doc(db, 'notifications', n.id), { read: true });
      }
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
              className="fixed inset-0 z-[100]" 
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute right-0 mt-4 w-80 bg-[#0a0a0b] border border-white/10 rounded-[24px] shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-[101] overflow-hidden"
            >
              <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                <h3 className="text-[10px] font-black text-white/40 uppercase tracking-widest">Notifications</h3>
                {unreadCount > 0 && (
                  <button 
                    onClick={markAllAsRead}
                    className="text-[8px] font-black text-purple-400 uppercase tracking-widest hover:text-purple-300 transition-colors"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                {notifications.length === 0 ? (
                  <div className="p-12 text-center">
                    <Bell className="w-8 h-8 text-white/5 mx-auto mb-3" />
                    <p className="text-[10px] font-black text-white/20 uppercase tracking-widest leading-relaxed">
                      No notifications yet
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-white/5">
                    {notifications.map((notif) => (
                      <div 
                        key={notif.id}
                        className={`p-4 flex gap-3 transition-colors hover:bg-white/[0.02] ${!notif.read ? 'bg-purple-500/[0.03]' : ''}`}
                        onClick={() => markAsRead(notif.id)}
                      >
                        <div className="relative shrink-0">
                          <img 
                            src={notif.fromPhoto || `https://ui-avatars.com/api/?name=${notif.fromName}&background=random`} 
                            className="w-8 h-8 rounded-full border border-white/10" 
                            alt="" 
                          />
                          <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center border-2 border-[#0a0a0b] ${notif.type === 'reaction' ? 'bg-rose-500' : 'bg-blue-500'}`}>
                            {notif.type === 'reaction' ? <Heart className="w-2 h-2 text-white" /> : <MessageSquare className="w-2 h-2 text-white" />}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] text-white/80 leading-relaxed">
                            <span className="font-black text-white">{notif.fromName}</span>
                            {notif.type === 'reaction' ? ' reacted ' : ' replied to your post: '}
                            <span className="text-white/40 italic">"{notif.content}"</span>
                          </p>
                          <p className="text-[8px] font-black text-white/20 uppercase tracking-widest mt-1">
                            {notif.createdAt?.toDate ? new Date(notif.createdAt.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                          </p>
                        </div>
                        {!notif.read && (
                          <div className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-2 shrink-0 shadow-[0_0_5px_rgba(147,51,234,0.5)]" />
                        )}
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
