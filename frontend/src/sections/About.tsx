import { useRef } from 'react';
import { useScroll } from 'framer-motion';
import { WordsPullUpMultiStyle } from '../components/WordsPullUpMultiStyle';
import { AnimatedLetter } from '../components/AnimatedLetter';

export function About() {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start 0.8', 'end 0.2']
  });

  const bodyText = "Over the last year, we have built a custom generative model from scratch. Trained entirely on hand-crafted pedagogical dialogues, our AI tutor forces you to think step-by-step rather than taking shortcuts. The result is a paradigm shift in how we interact with educational AI.";
  const chars = bodyText.split('');

  return (
    <section id="methodology" className="bg-black py-24 md:py-32 px-4 md:px-6">
      <div 
        ref={containerRef}
        className="max-w-6xl mx-auto bg-[#101010] rounded-2xl md:rounded-[2rem] p-8 md:p-16 lg:p-24 flex flex-col items-center text-center gap-8 md:gap-12"
      >
        <span className="text-primary text-[10px] sm:text-xs uppercase tracking-widest">
          Socratic Learning
        </span>

        <WordsPullUpMultiStyle
          segments={[
            { text: "We are Socratic, ", className: "font-normal text-[#E1E0CC]" },
            { text: "a dedicated learning platform. ", className: "font-serif italic text-[#E1E0CC]" },
            { text: "We believe in active reasoning, critical thinking, and intellectual independence.", className: "font-normal text-[#E1E0CC]" }
          ]}
          containerClassName="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl max-w-4xl leading-[0.95] sm:leading-[0.9]"
        />

        <p className="text-[#DEDBC8] text-xs sm:text-sm md:text-base max-w-2xl leading-relaxed mt-4 font-light">
          {chars.map((char, i) => (
            <AnimatedLetter 
              key={i} 
              progress={scrollYProgress} 
              index={i} 
              totalChars={chars.length}
            >
              {char}
            </AnimatedLetter>
          ))}
        </p>
      </div>
    </section>
  );
}
