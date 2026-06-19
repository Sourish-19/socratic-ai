import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const navItems = [
  { name: 'Home', id: 'home' },
  { name: 'Methodology', id: 'methodology' },
  { name: 'Features', id: 'features' },
  { name: 'Contact', id: 'footer' },
  { name: 'Login', id: 'login' }
];

export function Navbar() {
  const [activeSection, setActiveSection] = useState('home');

  useEffect(() => {
    const handleScroll = () => {
      const sections = navItems.filter(i => i.id !== 'login').map(item => document.getElementById(item.id));
      const scrollPosition = window.scrollY + window.innerHeight / 3;

      for (let i = sections.length - 1; i >= 0; i--) {
        const section = sections[i];
        if (section && section.offsetTop <= scrollPosition) {
          setActiveSection(navItems[i].id);
          break;
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollTo = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const element = document.getElementById(id);
    if (element) {
      window.scrollTo({
        top: element.offsetTop,
        behavior: 'smooth'
      });
    }
  };

  return (
    <motion.div 
      initial={{ y: -100, x: "-50%" }}
      animate={{ y: 0, x: "-50%" }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className="fixed top-0 left-1/2 bg-black/80 backdrop-blur-md rounded-b-2xl md:rounded-b-3xl px-4 py-3 md:px-8 flex items-center gap-4 sm:gap-6 md:gap-12 lg:gap-14 z-50 border border-t-0 border-white/10"
    >
      {navItems.map((item) => {
        if (item.id === 'login') {
          return (
            <Link
              key={item.name}
              to="/login"
              className="relative text-[10px] sm:text-xs md:text-sm font-medium transition-colors py-1"
              style={{ color: 'rgba(225, 224, 204, 0.6)' }}
              onMouseOver={(e) => { e.currentTarget.style.color = 'rgba(225, 224, 204, 0.9)'; }}
              onMouseOut={(e) => { e.currentTarget.style.color = 'rgba(225, 224, 204, 0.6)'; }}
            >
              {item.name}
            </Link>
          );
        }

        const isActive = activeSection === item.id;
        return (
          <a
            key={item.name}
            href={`#${item.id}`}
            onClick={(e) => scrollTo(e, item.id)}
            className="relative text-[10px] sm:text-xs md:text-sm font-medium transition-colors py-1"
            style={{ color: isActive ? '#E1E0CC' : 'rgba(225, 224, 204, 0.6)' }}
            onMouseOver={(e) => {
              if (!isActive) e.currentTarget.style.color = 'rgba(225, 224, 204, 0.9)';
            }}
            onMouseOut={(e) => {
              if (!isActive) e.currentTarget.style.color = 'rgba(225, 224, 204, 0.6)';
            }}
          >
            {item.name}
          </a>
        );
      })}
    </motion.div>
  );
}
