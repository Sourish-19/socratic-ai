import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { Navbar } from '../components/Navbar';
import { Hero } from '../sections/Hero';
import { About } from '../sections/About';
import { Features } from '../sections/Features';
import { Footer } from '../sections/Footer';

export function Landing() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        navigate('/dashboard');
      } else {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-black flex items-center justify-center text-[#E1E0CC]">
        <div className="text-2xl font-medium tracking-tight animate-pulse flex items-center">
          Socratic<span className="text-[0.4em] relative -top-3">*</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-black">
      <Navbar />
      <Hero />
      <About />
      <Features />
      <Footer />
    </div>
  );
}
