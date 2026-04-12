/* eslint-disable @next/next/no-img-element */

export default function PortalPacienteInicioPage() {
  return (
    <>
      <div className="max-w-6xl mx-auto px-8 py-10">
        {/* Welcome Header */}
        <div className="mb-12 space-y-2">
          <h2 className="font-serif text-4xl text-on-surface-variant font-light">
            Hola, <span className="text-primary font-bold">Elena</span>.
          </h2>
          <p className="text-stone-500 font-medium">
            Encuentra un momento de paz en tu jornada.
          </p>
        </div>

        {/* Bento Grid Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Destacado: Tu Próxima Sesión */}
          <div className="md:col-span-2 relative overflow-hidden bg-primary-container/30 rounded-3xl p-10 sticker-card group">
            <div className="relative z-10 flex flex-col h-full justify-between">
              <div>
                <span className="inline-block px-4 py-1 rounded-full bg-primary text-on-primary text-[10px] font-bold tracking-widest uppercase mb-6">
                  Próxima Sesión
                </span>
                <h3 className="font-serif text-5xl text-primary font-bold mb-4">
                  Lunes, 18 Oct
                </h3>
                <p className="text-2xl text-primary-dim opacity-80 font-serif">
                  17:30 — 18:30
                </p>
              </div>
              <div className="mt-12 flex items-center gap-8">
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase tracking-tighter text-stone-500 font-bold">
                    Cuenta Atrás
                  </span>
                  <span className="text-3xl font-bold text-primary">
                    02d 04h
                  </span>
                </div>
                <div className="flex-1 border-b border-primary/20 self-center"></div>
                <button className="bg-primary text-on-primary px-8 py-4 rounded-2xl font-bold hover:scale-105 transition-transform flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">
                    video_camera_front
                  </span>
                  Unirse a videollamada
                </button>
              </div>
            </div>

            {/* Decorative Element */}
            <div className="absolute -right-12 -top-12 w-64 h-64 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors"></div>
          </div>

          {/* Bono de Sesiones */}
          <div className="bg-secondary-container/40 rounded-3xl p-8 sticker-card flex flex-col justify-center items-center text-center space-y-6">
            <div className="w-32 h-32 rounded-full border-4 border-white flex items-center justify-center relative mb-4">
              <div className="flex flex-col items-center">
                <div className="mb-2">
                  <span className="font-serif text-6xl font-light text-secondary">
                    07
                  </span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <span className="text-[10px] font-bold text-secondary-dim tracking-[0.2em] uppercase">
                    Disponibles
                  </span>
                  <div className="w-32 h-1 bg-secondary/10 rounded-full mt-4 overflow-hidden">
                    <div className="h-full bg-secondary w-[30%] rounded-full"></div>
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-1">
              <h4 className="font-serif text-xl font-bold text-secondary-dim">
                Bono Bienestar
              </h4>
              <p className="text-sm text-secondary-dim/70">
                Has completado 3 de 10 sesiones.
              </p>
            </div>
            <button className="w-full border-2 border-secondary/30 py-3 rounded-xl text-secondary font-bold text-sm hover:bg-secondary hover:text-white transition-all">
              Renovar Bono
            </button>
          </div>

          {/* Recursos para tu Bienestar Section */}
          <div className="md:col-span-3 mt-8">
            <div className="flex justify-between items-end mb-8">
              <div>
                <h3 className="font-serif text-2xl text-on-surface-variant font-bold">
                  Recursos para tu Bienestar
                </h3>
                <p className="text-sm text-stone-500">
                  Seleccionados por Almudena para tu proceso actual.
                </p>
              </div>
              <a
                className="text-primary text-sm font-bold flex items-center gap-1 hover:underline"
                href="#"
              >
                Ver biblioteca completa
                <span className="material-symbols-outlined text-sm">
                  arrow_forward
                </span>
              </a>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Recurso 1: Lectura */}
              <div className="group bg-surface-container-low rounded-[2rem] p-6 sticker-card hover:-translate-y-1 transition-transform">
                <div className="h-48 rounded-2xl overflow-hidden mb-6 bg-stone-200">
                  <img
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    alt="Stacked vintage books on a wooden table with soft morning light filtering through a nearby window"
                    data-alt="Stacked vintage books on a wooden table with soft morning light filtering through a nearby window"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuDH3oaPHzYD1Ketw02kfgaSFlVVqmTNsBClntWvGpoYO-zOlRRam-F3GYjYg5pyOk0umHtljOTgJ24M5PkbXK1j-7SUv4HcaC_-THSYu4Z8rxbohqf_Q1Onturri0iXM9YbvZ8wEV_QuysIwB2hc33LSaIbScCfAveKGorAKNkSCHJ46hZHVuSOHu3YkaIPMJRK5My0jyN7acd8qopN-vZ0zREz0lLfpxQk85b439cwoExGvVvX0nnDCyE2ea4ibrwg1HZApFCrsuo"
                  />
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-bold text-primary bg-primary-container px-3 py-1 rounded-full uppercase tracking-tighter">
                      Lectura
                    </span>
                    <span className="text-[10px] text-stone-400 font-medium">
                      12 min
                    </span>
                  </div>
                  <h5 className="font-serif text-lg font-bold text-primary-dim leading-snug">
                    El arte de la presencia plena en Madrid
                  </h5>
                  <p className="text-xs text-stone-500 line-clamp-2 leading-relaxed">
                    Cómo encontrar momentos de quietud en medio del ruido
                    constante de la capital.
                  </p>
                </div>
              </div>

              {/* Recurso 2: Ejercicio */}
              <div className="group bg-surface-container-low rounded-[2rem] p-6 sticker-card hover:-translate-y-1 transition-transform">
                <div className="h-48 rounded-2xl overflow-hidden mb-6 bg-stone-200">
                  <img
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    alt="Close-up of hands resting on knees in a meditation pose, serene white background with soft shadows"
                    data-alt="Close-up of hands resting on knees in a meditation pose, serene white background with soft shadows"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuCyDQraFhHQutHiJKmSERZ7DUUnSBTuuIVa6M4I1iun0eMaFE4Jif4BeRREEevAKPNJMMIJF1soi6wfFwFfzGONLaDcjCRxfO6U7i9mf3LJRs6bEk7giCyj0Tuitasc_lK6izzvuCdjW_qwWYGGOQ88FUXW8bqj0MXpxeSQB-lliXFr3RNo1QMdR1IQH3ihLAt3PVGp73rT11j6J4oKncfnBoZFnOxKvNA_Ia0nfnPtxKe8150vQOK_5shFXpgf7giFOc4igI-qqQk"
                  />
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-bold text-tertiary bg-tertiary-container px-3 py-1 rounded-full uppercase tracking-tighter">
                      Ejercicio
                    </span>
                    <span className="text-[10px] text-stone-400 font-medium">
                      5 min
                    </span>
                  </div>
                  <h5 className="font-serif text-lg font-bold text-primary-dim leading-snug">
                    Respiración 4-7-8 para la ansiedad
                  </h5>
                  <p className="text-xs text-stone-500 line-clamp-2 leading-relaxed">
                    Una guía práctica paso a paso para regular tu sistema
                    nervioso en momentos de estrés.
                  </p>
                </div>
              </div>

              {/* Recurso 3: Audio */}
              <div className="group bg-surface-container-low rounded-[2rem] p-6 sticker-card hover:-translate-y-1 transition-transform">
                <div className="h-48 rounded-2xl overflow-hidden mb-6 bg-stone-200">
                  <img
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    alt="Minimalist headphones resting on a soft beige linen texture with a small green leaf beside them"
                    data-alt="Minimalist headphones resting on a soft beige linen texture with a small green leaf beside them"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuBlHWMZLyskMIgVPyAyooTRcaar76sSrN-lRP6qWMvqNq4gHKvrckeBbhWA5GQKA8NZqGsudntuxQhOumu8-idBRWg_p7o3W6XySz30fpj10YilPY3K5T75QuwcMdMEZn-PEXMEo53BGXpFg0inRcTiQ5ldgU68rXW5LjlZySDlWSl6SSCfww4v__GQYkcvv-L3DPewQ-8R5ap-HQpr6MkgeaMlQJ1I181wk1VEySgRhHzX9e3b3CfDRSn5ICPB1ZmT76LXcJX1xp4"
                  />
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-bold text-secondary bg-secondary-container px-3 py-1 rounded-full uppercase tracking-tighter">
                      Audio
                    </span>
                    <span className="text-[10px] text-stone-400 font-medium">
                      15 min
                    </span>
                  </div>
                  <h5 className="font-serif text-lg font-bold text-primary-dim leading-snug">
                    Meditación guiada: El refugio interior
                  </h5>
                  <p className="text-xs text-stone-500 line-clamp-2 leading-relaxed">
                    Almudena te guía a través de una visualización para
                    reconectar con tu seguridad interna.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Action Button (Contextual) */}
      <button className="fixed bottom-8 right-8 bg-primary text-on-primary w-16 h-16 rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-transform z-50 md:hidden">
        <span className="material-symbols-outlined text-3xl">add</span>
      </button>

      {/* Bottom Navigation Bar (Mobile only) */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-white/90 backdrop-blur-md flex justify-around py-4 border-t border-stone-100 z-40">
        <a className="flex flex-col items-center gap-1 text-primary" href="#">
          <span className="material-symbols-outlined">dashboard</span>
          <span className="text-[10px] font-bold">Inicio</span>
        </a>
        <a className="flex flex-col items-center gap-1 text-stone-400" href="#">
          <span className="material-symbols-outlined">calendar_today</span>
          <span className="text-[10px] font-bold">Citas</span>
        </a>
        <a className="flex flex-col items-center gap-1 text-stone-400" href="#">
          <span className="material-symbols-outlined">chat_bubble</span>
          <span className="text-[10px] font-bold">Chat</span>
        </a>
        <a className="flex flex-col items-center gap-1 text-stone-400" href="#">
          <span className="material-symbols-outlined">library_books</span>
          <span className="text-[10px] font-bold">Recursos</span>
        </a>
      </nav>
    </>
  );
}
