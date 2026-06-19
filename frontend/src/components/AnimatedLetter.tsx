import { motion, MotionValue, useTransform } from 'framer-motion';

interface AnimatedLetterProps {
  children: string;
  progress: MotionValue<number>;
  index: number;
  totalChars: number;
}

export function AnimatedLetter({ children, progress, index, totalChars }: AnimatedLetterProps) {
  const charProgress = index / totalChars;
  
  // Character fades in when scroll progress approaches its relative position
  const opacity = useTransform(
    progress,
    [Math.max(0, charProgress - 0.1), charProgress + 0.05],
    [0.2, 1]
  );

  return (
    <motion.span style={{ opacity }}>
      {children}
    </motion.span>
  );
}
