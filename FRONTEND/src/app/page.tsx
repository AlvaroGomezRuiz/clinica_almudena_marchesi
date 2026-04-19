import type { Metadata } from 'next';

import HeroSection from './sections/HeroSection';
import PhilosophySection from './sections/PhilosophySection';
import BunkerSection from './sections/BunkerSection';
import MoncloaSection from './sections/MoncloaSection';
import CTASection from './sections/CTASection';

export const metadata: Metadata = {
  title: 'Almudena Marchesi | Psicología Clínica Madrid (Moncloa)',
  description:
    'Acompañamiento profesional en el corazón de Moncloa. Una invitación a la pausa, al entendimiento y a la reconstrucción propia.',
};

export default function HomePage() {
  return (
    <div className="bg-canvas overflow-x-hidden">
      <HeroSection />
      <PhilosophySection />
      <BunkerSection />
      <MoncloaSection />
      <CTASection />
    </div>
  );
}
