import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { cn } from '../utils';

interface Segment {
  text: string;
  className?: string;
}

interface WordsPullUpMultiStyleProps {
  segments: Segment[];
  containerClassName?: string;
}

export function WordsPullUpMultiStyle({ segments, containerClassName }: WordsPullUpMultiStyleProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  const allWords: { word: string; className?: string }[] = [];
  segments.forEach((segment) => {
    const words = segment.text.split(' ');
    words.forEach((w) => {
      allWords.push({ word: w, className: segment.className });
    });
  });

  return (
    <div ref={ref} className={cn("inline-flex flex-wrap justify-center", containerClassName)}>
      {allWords.map((item, i) => {
        const isLastWord = i === allWords.length - 1;
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
            className={cn("inline-block", item.className)}
            style={{ marginRight: isLastWord ? '0' : '0.25em' }}
          >
            {item.word}
          </motion.span>
        );
      })}
    </div>
  );
}
