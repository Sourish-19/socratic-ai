import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { WordsPullUp } from '../components/WordsPullUp';
import { Link } from 'react-router-dom';

export function Footer() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  const fadeUpVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" as const } }
  };

  return (
    <footer id="footer" ref={ref} className="bg-black text-[#E1E0CC] py-16 md:py-24 px-4 md:px-8 border-t border-white/5 relative overflow-hidden">
      {/* Top row: Tagline and Links */}
      <motion.div 
        variants={fadeUpVariants}
        initial="hidden"
        animate={isInView ? "visible" : "hidden"}
        className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start gap-16 md:gap-0 mb-24 md:mb-40"
      >
        <div className="text-2xl md:text-3xl font-medium tracking-tight">
          Experience true learning
        </div>
        
        <div className="flex gap-16 md:gap-32 text-sm text-gray-400 font-medium">
          <div className="flex flex-col gap-4">
            <a href="#home" className="hover:text-[#E1E0CC] transition-colors">Home</a>
            <a href="#methodology" className="hover:text-[#E1E0CC] transition-colors">Methodology</a>
            <a href="#features" className="hover:text-[#E1E0CC] transition-colors">Features</a>
            <Link to="/login" className="hover:text-[#E1E0CC] transition-colors">Login</Link>
          </div>
        </div>
      </motion.div>

      {/* Giant Text */}
      <div className="w-full flex justify-center items-center mb-16 md:mb-24 overflow-hidden">
        <WordsPullUp 
          text="Socratic"
          className="text-[22vw] sm:text-[24vw] md:text-[20vw] font-medium leading-[0.85] tracking-[-0.07em] text-[#E1E0CC] select-none"
        />
      </div>

      {/* Bottom row: Logo and Legal */}
      <motion.div 
        variants={fadeUpVariants}
        initial="hidden"
        animate={isInView ? "visible" : "hidden"}
        className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center md:items-end gap-8 md:gap-0 text-xs sm:text-sm text-gray-500 font-medium"
      >
        <div className="font-medium text-[#E1E0CC] text-lg tracking-tight">
          Socratic AI
        </div>
        
        <div className="flex flex-wrap justify-center gap-6 md:gap-8">
          <a href="mailto:sourishsrivignesh@gmail.com" className="hover:text-[#E1E0CC] transition-colors">Email</a>
        </div>
      </motion.div>
    </footer>
  );
}
