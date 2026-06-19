import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Check } from 'lucide-react';
import { WordsPullUp } from '../components/WordsPullUp';

interface FeatureCardProps {
  number: string;
  title: string;
  icon: string;
  items: string[];
  delay: number;
  stat?: string;
}

function FeatureCard({ number, title, icon, items, delay, stat }: FeatureCardProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] }}
      className="bg-[#212121] rounded-2xl p-6 md:p-8 flex flex-col justify-between h-full"
    >
      <div>
        <img src={icon} alt="Icon" className="w-10 h-10 sm:w-12 sm:h-12 rounded object-cover mb-8" />
        <div className="flex items-center justify-between">
          <h3 className="text-lg sm:text-xl font-medium text-[#E1E0CC]">{title}</h3>
          <span className="text-xs sm:text-sm text-gray-500 font-normal">({number})</span>
        </div>
      </div>

      <div className="flex flex-col gap-8 mt-12">
        <ul className="space-y-4">
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-3 text-sm text-gray-400">
              <Check className="w-5 h-5 text-primary shrink-0" />
              <span>{item}</span>
            </li>
          ))}
        </ul>

        {stat && (
          <div className="flex items-center gap-2 mt-auto border-t border-white/5 pt-4">
            <div className="w-1.5 h-1.5 rounded-full bg-primary/40" />
            <span className="text-xs text-gray-400 font-medium tracking-wide">{stat}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export function Features() {
  return (
    <section id="features" className="min-h-screen bg-black relative py-24 px-4 md:px-6">
      <div className="absolute inset-0 bg-noise opacity-[0.15] pointer-events-none" />
      
      <div className="max-w-7xl mx-auto relative z-10">
        <div className="mb-16 md:mb-24 text-center md:text-left">
          <div className="flex flex-col items-center md:items-start">
            <WordsPullUp 
              text="Local models for deep understanding." 
              className="text-[#E1E0CC] text-xl sm:text-2xl md:text-3xl lg:text-4xl font-normal" 
            />
            <WordsPullUp 
              text="Built for learning. Powered by AI." 
              className="text-gray-500 text-xl sm:text-2xl md:text-3xl lg:text-4xl font-normal mt-1 md:mt-2" 
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-2 md:gap-1 lg:h-[480px]">
          
          {/* Card 1: Video */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="rounded-2xl overflow-hidden relative h-[400px] lg:h-full"
          >
            <video autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover">
              <source src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260406_133058_0504132a-0cf3-4450-a370-8ea3b05c95d4.mp4" type="video/mp4" />
            </video>
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
            <div className="absolute bottom-6 left-6 text-[#E1E0CC] text-xl font-medium">
              Your intellectual journey.
            </div>
          </motion.div>

          {/* Card 2 */}
          <FeatureCard 
            number="01"
            title="Socratic Guidance."
            icon="/images/card_1.png"
            items={["No direct answers", "Step-by-step reasoning", "Concept mastery", "Adaptive hint engine"]}
            delay={0.3}
            stat="95% Concept Retention"
          />

          {/* Card 3 */}
          <FeatureCard 
            number="02"
            title="Quality Filtered."
            icon="/images/card_2.png"
            items={["Curated dialogues", "Direct Preference Optimization", "Eliminated hallucinations"]}
            delay={0.45}
            stat="Zero Hallucinations"
          />

          {/* Card 4 */}
          <FeatureCard 
            number="03"
            title="Privacy First."
            icon="/images/card_3.png"
            items={["Local execution", "Open weights", "Zero data mining"]}
            delay={0.6}
            stat="100% Local Privacy"
          />

        </div>
      </div>
    </section>
  );
}
