import { Navbar } from '../components/Navbar';
import { Hero } from '../sections/Hero';
import { About } from '../sections/About';
import { Features } from '../sections/Features';
import { Footer } from '../sections/Footer';

export function Landing() {
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
