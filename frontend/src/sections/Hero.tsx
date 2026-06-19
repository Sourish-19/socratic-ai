import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { WordsPullUp } from '../components/WordsPullUp';
import { useNavigate } from 'react-router-dom';

export function Hero() {
  const navigate = useNavigate();

  return (
    <section id="home" className="h-screen w-full p-4 md:p-6 bg-black relative">
      <div className="relative w-full h-full rounded-2xl md:rounded-[2rem] overflow-hidden bg-[#101010]">
        
        {/* Background Video */}
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260405_170732_8a9ccda6-5cff-4628-b164-059c500a2b41.mp4" type="video/mp4" />
        </video>

        {/* Noise & Gradients */}
        <div className="absolute inset-0 noise-overlay opacity-[0.7] mix-blend-overlay pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/60 pointer-events-none" />

        {/* Bottom Content */}
        <div className="absolute bottom-0 left-0 right-0 p-4 md:p-10 lg:p-16">
          <div className="grid grid-cols-12 gap-4 items-end">
            
            {/* Giant Title */}
            <div className="col-span-12 lg:col-span-8">
              <WordsPullUp 
                text="Socratic" 
                showAsterisk 
                className="text-[26vw] sm:text-[24vw] md:text-[22vw] lg:text-[20vw] xl:text-[19vw] 2xl:text-[20vw] font-medium leading-[0.85] tracking-[-0.07em] text-[#E1E0CC]"
              />
            </div>

            {/* Description & CTA */}
            <div className="col-span-12 lg:col-span-4 flex flex-col gap-6 lg:gap-8 lg:pb-[2vw] lg:ml-16 xl:ml-24">
              <motion.p
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="text-primary/70 text-xs sm:text-sm md:text-base leading-[1.2] max-w-md"
              >
                A custom-trained AI tutor that doesn't just give answers, but guides you to discover them. Built for deep learning, powered by the Socratic method.
              </motion.p>
              
              <motion.button
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.7, ease: [0.16, 1, 0.3, 1] }}
                onClick={() => navigate('/login')}
                className="group w-fit flex items-center bg-primary rounded-full pl-6 pr-1 py-1 gap-2 hover:gap-3 transition-colors transition-[gap] duration-300 cursor-pointer"
              >
                <span className="text-black font-medium text-sm sm:text-base">Meet your tutor</span>
                <div className="bg-black rounded-full w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
                  <ArrowRight className="text-[#E1E0CC] w-4 h-4 sm:w-5 sm:h-5" />
                </div>
              </motion.button>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}
