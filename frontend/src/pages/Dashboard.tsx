import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PromptInputBox } from '../components/ui/ai-prompt-box';
import { Settings, LogOut, MessageSquare, Plus, AlignLeft, MoreHorizontal, Edit2, Trash2, Pin, PanelLeft, FileText } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged, signOut, type User as FirebaseUser } from 'firebase/auth';
import { collection, query, onSnapshot, setDoc, updateDoc, deleteDoc, doc, orderBy, arrayUnion } from 'firebase/firestore';
import { MessageLoading } from '../components/ui/message-loading';

type Message = { id?: string; role: 'user' | 'assistant'; content: string; attachedFile?: { name: string, isImage: boolean, data?: string } };
type Session = { id: string; title: string; messages: Message[]; isPinned?: boolean };

export function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<FirebaseUser | null>(null);

  const initialId = useRef(Date.now().toString()).current;

  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>(initialId);

  useEffect(() => {
    if (!user) {
      setSessions([]);
      return;
    }
    const q = query(collection(db, 'users', user.uid, 'sessions'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loaded: Session[] = [];
      snapshot.forEach(d => loaded.push({ id: d.id, ...d.data() } as Session));
      
      setSessions(loaded);
      setActiveSessionId(prev => {
        if (prev === 'new') return prev; // If user clicked "New Session", keep it
        if (!loaded.find(s => s.id === prev)) return loaded[0]?.id || 'new';
        return prev;
      });
    }, (error) => {
      console.error("Firestore onSnapshot error:", error);
      alert("Firestore Error: " + error.message + "\nHave you enabled Firestore in your Firebase console?");
    });
    return () => unsubscribe();
  }, [user]);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  
  // Rename state
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  // Sidebar state
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  // Typing Indicator state
  const [isTyping, setIsTyping] = useState(false);

  const activeSession = sessions.find(s => s.id === activeSessionId);
  const messages = activeSession?.messages || [];

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  // Auth state & close dropdown on click outside
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        navigate('/'); // Redirect to landing if logged out
      }
    });

    const closeDropdown = () => setActiveDropdown(null);
    document.addEventListener('click', closeDropdown);
    
    return () => {
      unsubscribe();
      document.removeEventListener('click', closeDropdown);
    };
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const handleSend = async (message: string, files?: File[]) => {
    if (!user) return;
    let currentSessionId = activeSessionId;
    let currentSession = sessions.find(s => s.id === currentSessionId);
    
    // Process attached file
    let fileData = null;
    let fileType = null;
    let attachedFile: any = undefined;
    if (files && files.length > 0) {
      const file = files[0];
      const isImage = file.type.startsWith("image/");
      const extMatch = file.name.match(/\.([^.]+)$/);
      if (extMatch) fileType = extMatch[1].toLowerCase();
      else if (file.type) fileType = file.type.split('/')[1];
      
      fileData = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
      attachedFile = { name: file.name, isImage };
      if (isImage && fileData) {
        attachedFile.data = fileData;
      }
    }

    const newMessage: Message = { id: Date.now().toString() + Math.random().toString(), role: 'user', content: message };
    if (attachedFile) {
      newMessage.attachedFile = attachedFile;
    }

    try {
      if (!currentSessionId || !currentSession) {
         currentSessionId = Date.now().toString();
         const newSession = {
           title: message.slice(0, 30) + (message.length > 30 ? '...' : '') || 'New Session',
           messages: [newMessage],
           createdAt: Date.now()
         };
         setDoc(doc(db, 'users', user.uid, 'sessions', currentSessionId), newSession).catch((err: any) => {
           console.error("Firestore Write Error:", err);
           alert("Failed to save message to Firestore. Check your Firebase security rules!\n" + err.message);
         });
         setActiveSessionId(currentSessionId);
      } else {
         const newTitle = currentSession.title === 'New Session' ? message.slice(0, 30) + (message.length > 30 ? '...' : '') || 'New Session' : currentSession.title;
         updateDoc(doc(db, 'users', user.uid, 'sessions', currentSessionId), {
           title: newTitle,
           messages: arrayUnion(newMessage)
         }).catch((err: any) => {
           console.error("Firestore Write Error:", err);
           alert("Failed to save message to Firestore. Check your Firebase security rules!\n" + err.message);
         });
      }
    } catch (err: any) {
      console.error("Setup Error:", err);
    }

    setIsTyping(true);

    const system_prompt = localStorage.getItem('socratic_system_prompt') || undefined;

    try {
      const API_URL = "https://sourishsrivignesh-socratic.hf.space";
      const requestPayload = JSON.stringify({
        session_id: currentSessionId,
        student_id: user.uid,
        message: message,
        file_data: fileData,
        file_type: fileType,
        system_prompt: system_prompt
      });

      const response = await fetch(`${API_URL}/api/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: [requestPayload] }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (result.error) throw new Error(result.error);
      
      const parsedData = JSON.parse(result.data[0]);
      if (parsedData.error) throw new Error(parsedData.error);
      
      setIsTyping(false);

      const assistantMessage: Message = { id: Date.now().toString() + Math.random().toString(), role: 'assistant', content: parsedData.response || "Sorry, I encountered an error. Please try again." };
      updateDoc(doc(db, 'users', user.uid, 'sessions', currentSessionId), {
        messages: arrayUnion(assistantMessage)
      }).catch((err: any) => {
        console.error("Firestore Write Error:", err);
      });
    } catch (err: any) {
      console.error("AI Fetch Error:", err);
      setIsTyping(false);
      
      try {
        const errorMsg = "My connection to the AI backend failed. Error: " + err.message;
        const assistantMessage: Message = { id: Date.now().toString() + Math.random().toString(), role: 'assistant', content: errorMsg };
        updateDoc(doc(db, 'users', user.uid, 'sessions', currentSessionId), {
          messages: arrayUnion(assistantMessage)
        }).catch((err: any) => {
          console.error("Firestore Fallback Write Error:", err);
        });
      } catch (firebaseErr: any) {
        console.error("Firebase Fallback Error:", firebaseErr);
        alert("Failed to write error message to Firebase! " + firebaseErr.message);
      }
    }
  };

  const handleNewSession = async () => {
    if (!user) return;
    setActiveSessionId('new');
  };

  const handleDelete = async (id: string) => {
    if (!user) return;
    await deleteDoc(doc(db, 'users', user.uid, 'sessions', id));
  };

  const handlePin = async (id: string) => {
    if (!user) return;
    const session = sessions.find(s => s.id === id);
    if (session) {
      await updateDoc(doc(db, 'users', user.uid, 'sessions', id), { isPinned: !session.isPinned });
    }
  };

  const startRename = (id: string, currentTitle: string) => {
    setEditingSessionId(id);
    setEditTitle(currentTitle);
  };

  const saveRename = async (id: string) => {
    if (!user) return;
    if (editTitle.trim()) {
      await updateDoc(doc(db, 'users', user.uid, 'sessions', id), { title: editTitle.trim() });
    }
    setEditingSessionId(null);
  };

  const sortedSessions = [...sessions].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return 0;
  });

  return (
    <div className="flex h-screen w-full bg-black text-[#E1E0CC] overflow-hidden selection:bg-white/30 relative">
      {/* Cinematic Noise Texture */}
      <div className="absolute inset-0 noise-overlay opacity-[0.5] mix-blend-overlay pointer-events-none z-0" />

      {/* Floating Toggle Button (visible when sidebar is closed) */}
      <AnimatePresence>
        {!isSidebarOpen && (
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            onClick={() => setIsSidebarOpen(true)}
            className="absolute top-5 left-5 z-20 p-2.5 text-[#E1E0CC]/60 hover:text-[#E1E0CC] hover:bg-white/10 rounded-lg transition-colors bg-[#101010]/80 backdrop-blur-xl border border-white/5 shadow-lg hidden md:block"
            title="Open Sidebar"
          >
            <PanelLeft className="w-5 h-5" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside 
        initial={{ width: 256 }}
        animate={{ width: isSidebarOpen ? 256 : 0, opacity: isSidebarOpen ? 1 : 0 }}
        transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
        className={`hidden md:flex flex-col bg-[#101010]/50 backdrop-blur-xl z-10 overflow-hidden relative flex-shrink-0 ${isSidebarOpen ? 'border-r border-white/5' : 'border-r-0'}`}
      >
        <div className="w-64 flex flex-col h-full flex-shrink-0">
          <div className="p-6 flex items-center justify-between">
            <Link to="/" className="text-2xl font-medium leading-[0.85] tracking-[-0.07em] flex items-center hover:opacity-80 transition-opacity">
              Socratic<span className="text-[0.4em] relative -top-3">*</span>
            </Link>
            <button 
              onClick={() => setIsSidebarOpen(false)} 
              className="p-1.5 text-[#E1E0CC]/60 hover:text-[#E1E0CC] hover:bg-white/10 rounded-md transition-colors"
              title="Close Sidebar"
            >
              <PanelLeft className="w-5 h-5" />
            </button>
          </div>
          
          <div className="px-4 pb-4">
            <button 
              onClick={handleNewSession}
              className="w-full flex items-center justify-center gap-2 bg-[#E1E0CC] text-black font-semibold px-4 py-3 rounded-xl hover:bg-white transition-colors text-sm shadow-md"
            >
              <Plus className="w-4 h-4" /> New Session
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 space-y-2 pb-4 scrollbar-none">
            <div className="text-[10px] uppercase tracking-widest text-[#E1E0CC]/40 font-semibold px-2 pt-4 pb-2">Recent</div>
            {sortedSessions.length === 0 ? (
              <div className="px-3 py-2 text-sm text-[#E1E0CC]/30 italic">
                No recent sessions
              </div>
            ) : (
              sortedSessions.map(session => (
                <div key={session.id} className="relative group">
                  <button 
                    onClick={() => setActiveSessionId(session.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-colors text-left pr-10 ${
                      activeSessionId === session.id 
                        ? 'text-[#E1E0CC] bg-white/10 border border-white/5 shadow-sm' 
                        : 'text-[#E1E0CC]/60 hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    {session.isPinned ? (
                      <Pin className="w-4 h-4 opacity-50 flex-shrink-0 text-white" />
                    ) : (
                      <MessageSquare className="w-4 h-4 opacity-50 flex-shrink-0" />
                    )}

                    {editingSessionId === session.id ? (
                      <input 
                        autoFocus
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveRename(session.id);
                          if (e.key === 'Escape') setEditingSessionId(null);
                        }}
                        onBlur={() => saveRename(session.id)}
                        className="bg-transparent text-[#E1E0CC] text-sm w-full outline-none border-b border-[#E1E0CC]/30 pb-0.5"
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <span className="truncate flex-1">{session.title}</span>
                    )}
                  </button>

                  {/* Three Dots Menu Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveDropdown(activeDropdown === session.id ? null : session.id);
                    }}
                    className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md hover:bg-white/10 text-[#E1E0CC]/60 hover:text-[#E1E0CC] transition-opacity ${activeDropdown === session.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </button>

                  {/* Dropdown Menu */}
                  {activeDropdown === session.id && (
                    <div 
                      className="absolute right-2 top-10 z-[100] w-36 bg-[#1A1A1A] border border-white/10 rounded-xl shadow-xl overflow-hidden py-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button 
                        onClick={() => { handlePin(session.id); setActiveDropdown(null); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-white/5 text-[#E1E0CC]/80 hover:text-[#E1E0CC]"
                      >
                        <Pin className="w-3.5 h-3.5" /> {session.isPinned ? 'Unpin' : 'Pin to Top'}
                      </button>
                      <button 
                        onClick={() => { startRename(session.id, session.title); setActiveDropdown(null); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-white/5 text-[#E1E0CC]/80 hover:text-[#E1E0CC]"
                      >
                        <Edit2 className="w-3.5 h-3.5" /> Rename
                      </button>
                      <div className="h-[1px] bg-white/5 my-1" />
                      <button 
                        onClick={() => { handleDelete(session.id); setActiveDropdown(null); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-red-500/10 text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          <div className="p-3 border-t border-white/5 relative mt-auto">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setActiveDropdown(activeDropdown === 'profile' ? null : 'profile');
              }}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/5 transition-colors text-left"
            >
              {user?.photoURL ? (
                <img src={user.photoURL} alt="Profile" className="w-8 h-8 rounded-full flex-shrink-0" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-[#E1E0CC]/20 text-[#E1E0CC] flex items-center justify-center text-xs font-semibold flex-shrink-0 uppercase">
                  {user?.displayName?.[0] || user?.email?.[0] || 'U'}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-[#E1E0CC] truncate">
                  {user?.displayName || user?.email || 'Loading...'}
                </div>
              </div>
            </button>

            {/* Profile Dropdown Menu */}
            {activeDropdown === 'profile' && (
              <div 
                className="absolute bottom-full mb-2 left-3 right-3 bg-[#1A1A1A] border border-white/10 rounded-2xl shadow-2xl overflow-hidden py-1 z-[100] text-[#E1E0CC]"
                onClick={(e) => e.stopPropagation()}
              >
                <Link to="/settings" className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-white/5 transition-colors">
                  <Settings className="w-4 h-4 text-[#E1E0CC]/70" /> Settings
                </Link>

                <div className="h-[1px] bg-white/10 my-1 mx-3" />

                <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-white/5 transition-colors text-left">
                  <LogOut className="w-4 h-4 text-[#E1E0CC]/70" /> Log out
                </button>
              </div>
            )}
          </div>
        </div>
      </motion.aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col relative z-0 min-h-0">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between p-4 border-b border-white/5 bg-[#101010]/30 backdrop-blur-md z-10">
          <div className="text-xl font-medium tracking-tight">Socratic*</div>
          <button className="p-2 text-[#E1E0CC]/60">
            <AlignLeft className="w-5 h-5" />
          </button>
        </header>

        {/* Chat History */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 pb-4 relative z-10 custom-scrollbar">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-4">
              <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-6">
                <MessageSquare className="w-5 h-5 text-[#E1E0CC]/60" />
              </div>
              <h2 className="text-xl font-medium text-[#E1E0CC] mb-2">Where should we begin?</h2>
              <p className="text-[#E1E0CC]/40 text-sm max-w-sm">Start a conversation with your local Socratic tutor to explore a topic deeply.</p>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-8">
              {messages.map((msg, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div 
                    className={`max-w-[85%] rounded-2xl px-5 py-4 text-[15px] leading-relaxed shadow-sm flex flex-col ${
                      msg.role === 'user' 
                        ? 'bg-[#101010] border border-white/10 text-[#E1E0CC] items-end text-right' 
                        : 'bg-transparent text-[#E1E0CC]/90 items-start text-left'
                    }`}
                  >
                    {msg.role === 'assistant' && (
                      <div className="flex items-center gap-2 mb-3 opacity-60">
                        <div className="w-6 h-6 rounded flex items-center justify-center bg-white/10 border border-white/5 flex-shrink-0">
                          <span className="text-[10px] font-bold">S*</span>
                        </div>
                        <span className="text-xs tracking-widest uppercase font-medium">Tutor</span>
                      </div>
                    )}
                    {msg.attachedFile && (
                      <div className="mb-3">
                        {msg.attachedFile.isImage && msg.attachedFile.data ? (
                          <img src={msg.attachedFile.data} alt={msg.attachedFile.name} className="max-w-xs max-h-64 rounded-xl object-contain border border-white/10" />
                        ) : (
                          <div className="flex items-center gap-3 bg-transparent px-3 py-2.5 rounded-xl border border-white/10 w-max max-w-[280px]">
                            <div className="w-10 h-10 rounded-lg bg-[#E1E0CC]/10 flex items-center justify-center flex-shrink-0">
                              <FileText className="w-5 h-5 text-[#E1E0CC]" />
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="text-sm font-medium text-[#E1E0CC] truncate">
                                {msg.attachedFile.name}
                              </span>
                              <span className="text-[11px] font-medium text-[#E1E0CC]/50 uppercase tracking-wider mt-0.5">
                                Document
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    {msg.content}
                  </div>
                </motion.div>
              ))}

              {isTyping && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-start"
                >
                  <div className="max-w-[85%] rounded-2xl px-5 py-4 text-[15px] leading-relaxed shadow-sm bg-transparent text-[#E1E0CC]/90">
                    <div className="flex items-center gap-2 mb-3 opacity-60">
                      <div className="w-6 h-6 rounded flex items-center justify-center bg-white/10 border border-white/5 flex-shrink-0">
                        <span className="text-[10px] font-bold">S*</span>
                      </div>
                      <span className="text-xs tracking-widest uppercase font-medium">Tutor</span>
                    </div>
                    <MessageLoading />
                  </div>
                </motion.div>
              )}
              
              {/* Spacer to push messages above the input box when auto-scrolled */}
              <div className="h-32 md:h-40 flex-shrink-0" />
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="absolute bottom-0 left-0 right-4 bg-gradient-to-t from-black via-black to-transparent pt-20 pb-8 px-4 md:px-8 pointer-events-none z-20">
          <div className="max-w-3xl mx-auto pointer-events-auto relative">
            <PromptInputBox 
              onSend={handleSend}
            />
            <div className="text-center text-[10px] text-[#E1E0CC]/30 pt-4 font-medium tracking-wide">
              Your Socratic Tutor will guide you to answers rather than providing them directly.
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
