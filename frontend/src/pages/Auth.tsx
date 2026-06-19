import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, Eye, EyeOff, ArrowLeft, Loader2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { auth, googleProvider } from '../lib/firebase';
import { signInWithPopup, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';

export function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // Form State
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      setErrorMsg('');
      await signInWithPopup(auth, googleProvider);
      navigate('/dashboard');
    } catch (error: any) {
      setErrorMsg(error.message || "Failed to sign in with Google.");
      setIsLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg("Please fill in all required fields.");
      return;
    }

    try {
      setIsLoading(true);
      setErrorMsg('');

      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        if (!firstName) {
          setErrorMsg("First name is required to create an account.");
          setIsLoading(false);
          return;
        }
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const displayName = `${firstName} ${lastName}`.trim();
        await updateProfile(userCredential.user, { displayName });
      }
      
      navigate('/dashboard');
    } catch (error: any) {
      setErrorMsg(error.message || "Authentication failed.");
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen w-full bg-black selection:bg-white/30 p-2 transition-all duration-500 lg:h-screen lg:overflow-hidden lg:p-4 text-[#E1E0CC]">
      {/* Left Column (Hero) */}
      <div className="relative hidden lg:flex flex-col items-center justify-end w-[52%] pb-32 px-12 rounded-3xl overflow-hidden shadow-2xl h-full">
        <video
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260505_110052_2e127257-5236-40b1-ba48-4690260f1185.mp4" type="video/mp4" />
        </video>

        <Link to="/" className="z-20 text-[#E1E0CC]/50 hover:text-[#E1E0CC] transition-colors absolute top-8 left-8 flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>

        <motion.div
          className="z-10 w-full max-w-xs space-y-8"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: { opacity: 1, transition: { staggerChildren: 0.15, delayChildren: 0.2 } },
          }}
        >
          <motion.div variants={{ hidden: { y: 10, opacity: 0 }, visible: { y: 0, opacity: 1 } }} className="flex items-center gap-2 mb-12">
            <h1 className="text-[2vw] font-medium leading-[0.85] tracking-[-0.07em] text-[#E1E0CC] flex items-center">
              Socratic<span className="text-[0.4em] relative -top-3">*</span>
            </h1>
          </motion.div>

          <AnimatePresence mode="wait">
            <motion.div
              key={isLogin ? 'login-text' : 'signup-text'}
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -10, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <h2 className="text-4xl font-medium tracking-tight whitespace-nowrap">
                {isLogin ? "Welcome Back" : "Join Socratic"}
              </h2>
              <p className="text-[#E1E0CC]/60 text-sm leading-relaxed mt-2 px-1">
                {isLogin 
                  ? "Resume your journey with your custom-trained local tutor." 
                  : "Follow these 3 quick phases to activate your local tutor."}
              </p>
            </motion.div>
          </AnimatePresence>

          <AnimatePresence mode="wait">
            <motion.div
              key={isLogin ? 'login-steps' : 'signup-steps'}
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -10, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-4 pt-4"
            >
              {isLogin ? (
                <>
                  <StepItem number={1} text="Secure authentication" active />
                  <StepItem number={2} text="Load your knowledge graph" />
                  <StepItem number={3} text="Resume learning" />
                </>
              ) : (
                <>
                  <StepItem number={1} text="Register your identity" active />
                  <StepItem number={2} text="Initialize Socratic Tutor" />
                  <StepItem number={3} text="Start learning" />
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Right Column (Sign Up / Sign In Form) */}
      <div className="flex-1 flex flex-col items-center justify-center py-12 lg:py-6 px-4 sm:px-12 lg:px-16 xl:px-24 overflow-y-auto lg:overflow-hidden relative">
        {/* Mobile Back Button */}
        <Link to="/" className="lg:hidden absolute top-6 left-6 text-[#E1E0CC]/50 hover:text-[#E1E0CC] transition-colors flex items-center gap-2 text-sm">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
        
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="w-full max-w-xl space-y-8 lg:space-y-6 sm:space-y-10"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={isLogin ? 'login-header' : 'signup-header'}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.3 }}
            >
              <h2 className="text-3xl font-medium tracking-tight">
                {isLogin ? "Sign In to Socratic" : "Create New Profile"}
              </h2>
              <p className="text-[#E1E0CC]/40 text-sm mt-2">
                {isLogin ? "Enter your credentials to access your local models." : "Input your details to begin the journey."}
              </p>
            </motion.div>
          </AnimatePresence>

          <div className="w-full">
            <SocialButton icon={<Globe className="w-5 h-5" />} label="Continue with Google" onClick={handleGoogleSignIn} disabled={isLoading} />
          </div>

          <div className="relative flex items-center py-2">
            <div className="flex-grow border-t border-white/10"></div>
            <span className="flex-shrink-0 bg-black px-4 text-xs font-medium text-[#E1E0CC]/40 uppercase tracking-widest">Or</span>
            <div className="flex-grow border-t border-white/10"></div>
          </div>

          <form className="space-y-4" onSubmit={handleEmailAuth}>
            <AnimatePresence mode="popLayout">
              {!isLogin && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="grid grid-cols-2 gap-4 overflow-hidden"
                >
                  <InputGroup label="First Name" placeholder="John" type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} required={!isLogin} disabled={isLoading} />
                  <InputGroup label="Last Name" placeholder="Doe" type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} disabled={isLoading} />
                </motion.div>
              )}
            </AnimatePresence>
            
            <InputGroup label="Email" placeholder="john@example.com" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={isLoading} />
            
            <div className="space-y-1">
              <label className="text-sm font-medium text-[#E1E0CC]">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  minLength={8}
                  className="w-full bg-[#101010] border-none rounded-xl h-11 px-4 text-[#E1E0CC] placeholder:text-[#E1E0CC]/20 focus:ring-2 focus:ring-inset focus:ring-[#E1E0CC]/20 outline-none disabled:opacity-50"
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#E1E0CC]/40 hover:text-[#E1E0CC]"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <AnimatePresence mode="wait">
                <motion.p 
                  key={isLogin ? 'login-helper' : 'signup-helper'}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className={`text-[10px] px-1 mt-1 ${isLogin ? 'text-[#E1E0CC] hover:underline cursor-pointer' : 'text-[#E1E0CC]/40'}`}
                >
                  {isLogin ? "Forgot your password?" : "Requires at least 8 symbols."}
                </motion.p>
              </AnimatePresence>
            </div>

            {errorMsg && (
              <p className="text-red-400 text-sm mt-2">{errorMsg}</p>
            )}

            <button 
                type="submit"
                disabled={isLoading}
                className="w-full h-11 bg-[#E1E0CC] text-black font-semibold rounded-xl hover:bg-white transition-colors mt-4 flex items-center justify-center disabled:opacity-70"
              >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isLogin ? "Sign In" : "Create Account")}
            </button>
          </form>

          <div className="text-center text-sm text-[#E1E0CC]/40 pt-4">
            {isLogin ? (
              <>
                Don't have an account?{' '}
                <button type="button" onClick={() => { setIsLogin(false); setErrorMsg(''); }} className="text-[#E1E0CC] hover:underline">Sign up</button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button type="button" onClick={() => { setIsLogin(true); setErrorMsg(''); }} className="text-[#E1E0CC] hover:underline">Log in</button>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </main>
  );
}

// Reusable Components
function StepItem({ number, text, active = false }: { number: number; text: string; active?: boolean }) {
  return (
    <div
      className={`flex items-center gap-4 p-3 rounded-2xl transition-colors ${
        active ? 'bg-[#E1E0CC] text-black' : 'bg-[#101010] text-[#E1E0CC] border-none'
      }`}
    >
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
          active ? 'bg-black text-[#E1E0CC]' : 'bg-white/5 text-[#E1E0CC]/40'
        }`}
      >
        {number}
      </div>
      <span className={`text-sm font-medium ${active ? 'text-black' : 'text-[#E1E0CC]/70'}`}>
        {text}
      </span>
    </div>
  );
}

function SocialButton({ icon, label, onClick, disabled }: { icon: React.ReactNode; label: string; onClick?: () => void; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} type="button" className="w-full flex items-center justify-center gap-3 bg-black border border-white/10 rounded-xl h-12 hover:bg-white/5 transition-colors text-[#E1E0CC] font-medium text-sm disabled:opacity-50">
      {icon}
      {label}
    </button>
  );
}

function InputGroup({ label, placeholder, type, value, onChange, required, disabled }: { label: string; placeholder: string; type: string; value?: string; onChange?: (e: any) => void; required?: boolean; disabled?: boolean }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-[#E1E0CC]">{label}</label>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required={required}
        disabled={disabled}
        className="w-full bg-[#101010] border-none rounded-xl h-11 px-4 text-[#E1E0CC] placeholder:text-[#E1E0CC]/20 focus:ring-2 focus:ring-inset focus:ring-[#E1E0CC]/20 outline-none disabled:opacity-50"
      />
    </div>
  );
}
