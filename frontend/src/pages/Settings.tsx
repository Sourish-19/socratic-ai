import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Save, Trash2, Download, MessageSquareX } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { auth, db } from '../lib/firebase';
import { updateProfile, updatePassword, deleteUser, onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { collection, query, getDocs, writeBatch } from 'firebase/firestore';

export function Settings() {
  const navigate = useNavigate();

  const [user, setUser] = useState<FirebaseUser | null>(null);
  
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  

  const [systemPrompt, setSystemPrompt] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setEmail(currentUser.email || '');
        const names = (currentUser.displayName || '').split(' ');
        setFirstName(names[0] || '');
        setLastName(names.slice(1).join(' ') || '');
      } else {
        navigate('/');
      }
    });
    

    setSystemPrompt(localStorage.getItem('socratic_system_prompt') || "");

    return () => unsubscribe();
  }, [navigate]);

  const handleSave = async () => {
    try {
      if (user) {
        // Update Name
        const newDisplayName = `${firstName} ${lastName}`.trim();
        if (newDisplayName && newDisplayName !== user.displayName) {
          await updateProfile(user, { displayName: newDisplayName });
        }
        // Update Password
        if (password) {
          await updatePassword(user, password);
        }
      }
      

      if (systemPrompt) {
        localStorage.setItem('socratic_system_prompt', systemPrompt);
      } else {
        localStorage.removeItem('socratic_system_prompt');
      }

      navigate('/dashboard');
    } catch (e: any) {
      alert("Error saving settings: " + e.message);
    }
  };

  const handleExport = async () => {
    if (!user) return;
    try {
      const q = query(collection(db, 'users', user.uid, 'sessions'));
      const snapshot = await getDocs(q);
      const data: any[] = [];
      snapshot.forEach(doc => data.push({ id: doc.id, ...doc.data() }));
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `socratic_chat_history_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      alert("Error exporting chats: " + e.message);
    }
  };

  const handleClearChats = async () => {
    if (!user) return;
    if (confirm("Are you sure you want to clear all chat history? This cannot be undone.")) {
      try {
        const q = query(collection(db, 'users', user.uid, 'sessions'));
        const snapshot = await getDocs(q);
        const batch = writeBatch(db);
        snapshot.forEach(doc => {
          batch.delete(doc.ref);
        });
        await batch.commit();
        alert("Chat history cleared. Return to dashboard to see changes.");
      } catch (e: any) {
        alert("Error clearing chats: " + e.message);
      }
    }
  };

  const handleDeleteAccount = async () => {
    if (confirm("Are you sure you want to permanently delete your account? All data will be lost.")) {
      try {
        if (user) {
          await deleteUser(user);
          navigate('/');
        }
      } catch (e: any) {
        alert("Error deleting account. You may need to sign out and sign back in first to verify your identity. Error: " + e.message);
      }
    }
  };

  return (
    <main className="flex min-h-screen w-full bg-black selection:bg-white/30 p-4 transition-all duration-500 flex-col items-center justify-center text-[#E1E0CC] relative overflow-hidden">
      
      {/* Subtle background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] opacity-20 pointer-events-none">
        <motion.div
          animate={{
            rotate: [0, 90, 180, 270, 360],
            scale: [1, 1.1, 1, 1.05, 1],
          }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          className="w-full h-full rounded-full bg-gradient-to-br from-[#E1E0CC]/20 to-transparent blur-3xl"
        />
      </div>

      <div className="w-full max-w-xl relative z-10 flex flex-col h-[90vh]">
        <div className="mb-6 flex-shrink-0">
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-[#E1E0CC]/60 hover:text-[#E1E0CC] transition-colors font-medium text-sm">
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </Link>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
          className="w-full flex-1 bg-[#101010]/80 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl flex flex-col overflow-hidden"
        >
          <div className="mb-8 text-center sm:text-left flex-shrink-0">
            <h2 className="text-3xl font-medium tracking-tight">
              Settings
            </h2>
            <p className="text-[#E1E0CC]/40 text-sm mt-2">
              Manage your identity, local model configurations, and privacy data.
            </p>
          </div>

          <form className="flex-1 overflow-y-auto scrollbar-none pr-2 space-y-10 pb-10" onSubmit={(e) => e.preventDefault()}>
            
            {/* Account Section */}
            <section className="space-y-4">
              <h3 className="text-sm uppercase tracking-widest text-[#E1E0CC]/40 font-semibold mb-4 border-b border-white/5 pb-2">Account Profile</h3>
              <div className="grid grid-cols-2 gap-4">
                <InputGroup label="First Name" placeholder="John" type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                <InputGroup label="Last Name" placeholder="Doe" type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} />
              </div>
              <InputGroup label="Email Address" placeholder="john@example.com" type="email" value={email} disabled />
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[#E1E0CC]">Change Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Leave blank to keep current password"
                  className="w-full bg-black/50 border border-white/5 rounded-xl h-11 px-4 text-[#E1E0CC] placeholder:text-[#E1E0CC]/20 focus:ring-2 focus:ring-inset focus:ring-[#E1E0CC]/20 outline-none transition-all text-sm"
                />
              </div>
            </section>

            {/* AI Model Configuration Section */}
            <section className="space-y-4">
              <h3 className="text-sm uppercase tracking-widest text-[#E1E0CC]/40 font-semibold mb-4 border-b border-white/5 pb-2">Model Configuration</h3>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[#E1E0CC]">Custom System Prompt</label>
                <textarea
                  rows={4}
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  placeholder="Leave blank to use the default 7-stage Socratic engine..."
                  className="w-full bg-black/50 border border-white/5 rounded-xl p-4 text-[#E1E0CC] placeholder:text-[#E1E0CC]/30 focus:ring-2 focus:ring-inset focus:ring-[#E1E0CC]/20 outline-none transition-all resize-none text-sm leading-relaxed"
                />
              </div>
            </section>

            {/* Data & Privacy Section */}
            <section className="space-y-4">
              <h3 className="text-sm uppercase tracking-widest text-[#E1E0CC]/40 font-semibold mb-4 border-b border-white/5 pb-2">Data & Privacy</h3>
              <div className="space-y-3">
                <button onClick={handleExport} className="w-full flex items-center justify-between px-4 h-12 bg-white/5 border border-white/5 rounded-xl text-sm font-medium hover:bg-white/10 transition-colors text-[#E1E0CC]">
                  <span className="flex items-center gap-2"><Download className="w-4 h-4 text-[#E1E0CC]/60" /> Export Chat History</span>
                  <span className="text-xs text-[#E1E0CC]/40">Download as JSON</span>
                </button>
                <button onClick={handleClearChats} className="w-full flex items-center justify-between px-4 h-12 bg-white/5 border border-white/5 rounded-xl text-sm font-medium hover:bg-white/10 transition-colors text-red-400">
                  <span className="flex items-center gap-2"><MessageSquareX className="w-4 h-4 opacity-70" /> Clear All Chats</span>
                  <span className="text-xs opacity-50">Irreversible</span>
                </button>
              </div>
            </section>

            {/* Danger Zone */}
            <section className="space-y-4 pt-6 mt-6 border-t border-red-500/10">
              <h3 className="text-sm uppercase tracking-widest text-red-500/40 font-semibold mb-4 pb-2">Danger Zone</h3>
              <button 
                type="button"
                onClick={handleDeleteAccount}
                className="w-full flex items-center justify-center gap-2 h-11 bg-transparent border border-red-500/20 text-red-400 font-semibold rounded-xl hover:bg-red-500/10 transition-colors"
              >
                <Trash2 className="w-4 h-4" /> Delete Account Permanently
              </button>
            </section>

          </form>

          {/* Sticky Footer for Save */}
          <div className="pt-6 mt-auto border-t border-white/5 flex-shrink-0">
            <button 
              type="button"
              onClick={handleSave}
              className="w-full flex items-center justify-center gap-2 h-12 bg-[#E1E0CC] text-black font-semibold rounded-xl hover:bg-white transition-colors shadow-lg"
            >
              <Save className="w-4 h-4" /> Save All Changes
            </button>
          </div>
        </motion.div>
      </div>
    </main>
  );
}

function InputGroup({ label, placeholder, type, value, onChange, disabled }: { label: string; placeholder: string; type: string; value: string; onChange?: (e: any) => void; disabled?: boolean }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-[#E1E0CC]">{label}</label>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className="w-full bg-black/50 border border-white/5 rounded-xl h-11 px-4 text-[#E1E0CC] placeholder:text-[#E1E0CC]/20 focus:ring-2 focus:ring-inset focus:ring-[#E1E0CC]/20 outline-none transition-all text-sm disabled:opacity-50"
      />
    </div>
  );
}
