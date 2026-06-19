import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { cn } from '../utils';

interface WordsPullUpProps {
  text: string;
  className?: string;
  showAsterisk?: boolean;
}

export function WordsPullUp({ text, className, showAsterisk = false }: WordsPullUpProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const words = text.split(' ');

  return (
    <div ref={ref} className={cn("inline-flex flex-wrap", className)}>
      {words.map((word, i) => {
        const isLastWord = i === words.length - 1;
        return (
          <motion.span
            key={i}
            initial={{ y: 20, opacity: 0 }}
            animate={isInView ? { y: 0, opacity: 1 } : { y: 20, opacity: 0 }}
            transition={{
              duration: 0.8,
              delay: i * 0.08,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="inline-block relative"
            style={{ marginRight: isLastWord ? '0' : '0.25em' }}
          >
            {word}
            {isLastWord && showAsterisk && (
              <span className="absolute top-[0.65em] -right-[0.3em] text-[0.31em]">
                *
              </span>
            )}
          </motion.span>
        );
      })}
    </div>
  );
}
