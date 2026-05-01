'use client';

export default function CookieSettingsTrigger() {
  return (
    <button
      onClick={() => {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('open-cookie-preferences'));
        }
      }}
      className="font-mono text-[0.65rem] text-white/60 uppercase tracking-wider hover:text-white/80 transition-colors duration-300 relative text-left"
    >
      Configurar Cookies
    </button>
  );
}
