export default function PortalCitasPage() {
  return (
    <>
      <div className="flex-1 overflow-y-auto px-6 md:px-12 py-10">
        <div className="max-w-5xl mx-auto">
          {/* Header Section */}
          <div className="mb-12">
            <h1 className="text-4xl md:text-5xl font-serif text-primary leading-tight font-bold mb-2">
              Selecciona tu espacio de calma
            </h1>
            <p className="text-stone-500 max-w-xl">
              Selecciona el momento que mejor se adapte a tu ritmo. Tienes
              sesiones disponibles en tu bono actual.
            </p>
          </div>

          {/* Bento Grid for Booking Ritual */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Calendar Section (Floating Date Picker) */}
            <div className="lg:col-span-7 bg-surface-container-low rounded-3xl p-8 border border-outline-variant/10">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-xl font-semibold text-primary font-serif">
                  Octubre 2023
                </h3>
                <div className="flex gap-4">
                  <button
                    className="p-2 hover:bg-white rounded-full transition-colors"
                    type="button"
                  >
                    <span
                      className="material-symbols-outlined"
                      data-icon="chevron_left"
                    >
                      chevron_left
                    </span>
                  </button>
                  <button
                    className="p-2 hover:bg-white rounded-full transition-colors"
                    type="button"
                  >
                    <span
                      className="material-symbols-outlined"
                      data-icon="chevron_right"
                    >
                      chevron_right
                    </span>
                  </button>
                </div>
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-y-6 text-center text-sm mb-4">
                <div className="text-stone-400 font-medium">LU</div>
                <div className="text-stone-400 font-medium">MA</div>
                <div className="text-stone-400 font-medium">MI</div>
                <div className="text-stone-400 font-medium">JU</div>
                <div className="text-stone-400 font-medium">VI</div>
                <div className="text-stone-400 font-medium">SA</div>
                <div className="text-stone-400 font-medium">DO</div>

                {/* Mockup Days */}
                <div className="py-3 text-stone-300">25</div>
                <div className="py-3 text-stone-300">26</div>
                <div className="py-3 text-stone-300">27</div>
                <div className="py-3 text-stone-300">28</div>
                <div className="py-3 text-stone-300">29</div>
                <div className="py-3 text-stone-300">30</div>
                <div className="py-3">1</div>
                <div className="py-3">2</div>
                <div className="py-3 cursor-pointer hover:bg-white rounded-full">
                  3
                </div>
                <div className="py-3 cursor-pointer hover:bg-white rounded-full">
                  4
                </div>
                <div className="py-3 cursor-pointer hover:bg-white rounded-full">
                  5
                </div>
                <div className="py-3 cursor-pointer hover:bg-white rounded-full">
                  6
                </div>
                <div className="py-3 text-stone-300">7</div>
                <div className="py-3 text-stone-300">8</div>
                <div className="py-3 cursor-pointer hover:bg-white rounded-full">
                  9
                </div>
                <div className="py-3 cursor-pointer hover:bg-white rounded-full">
                  10
                </div>
                <div className="py-3 cursor-pointer hover:bg-white rounded-full">
                  11
                </div>

                {/* Selected Date */}
                <div className="py-3 bg-primary text-white rounded-full font-bold shadow-md shadow-primary/20">
                  12
                </div>
                <div className="py-3 cursor-pointer hover:bg-white rounded-full">
                  13
                </div>
                <div className="py-3 text-stone-300">14</div>
                <div className="py-3 text-stone-300">15</div>
                <div className="py-3 cursor-pointer hover:bg-white rounded-full">
                  16
                </div>
                <div className="py-3 cursor-pointer hover:bg-white rounded-full">
                  17
                </div>
                <div className="py-3 cursor-pointer hover:bg-white rounded-full">
                  18
                </div>
                <div className="py-3 cursor-pointer hover:bg-white rounded-full">
                  19
                </div>
                <div className="py-3 cursor-pointer hover:bg-white rounded-full">
                  20
                </div>
                <div className="py-3 text-stone-300">21</div>
                <div className="py-3 text-stone-300">22</div>
              </div>
            </div>

            {/* Time Selection Section */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-surface-container-lowest border border-outline-variant/10 p-8 rounded-3xl">
                <h3 className="text-xl font-semibold text-primary font-serif mb-6">
                  Horarios Disponibles
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    className="py-3 px-4 rounded-xl border border-primary/20 text-primary hover:bg-primary-container/30 transition-colors text-sm font-medium"
                    type="button"
                  >
                    09:00 AM
                  </button>
                  <button
                    className="py-3 px-4 rounded-xl border border-primary text-white bg-primary transition-colors text-sm font-bold shadow-sm"
                    type="button"
                  >
                    10:30 AM
                  </button>
                  <button
                    className="py-3 px-4 rounded-xl border border-primary/20 text-primary hover:bg-primary-container/30 transition-colors text-sm font-medium"
                    type="button"
                  >
                    12:00 PM
                  </button>
                  <button
                    className="py-3 px-4 rounded-xl border border-primary/20 text-primary hover:bg-primary-container/30 transition-colors text-sm font-medium"
                    type="button"
                  >
                    16:30 PM
                  </button>
                  <button
                    className="py-3 px-4 rounded-xl border border-primary/20 text-primary hover:bg-primary-container/30 transition-colors text-sm font-medium"
                    type="button"
                  >
                    18:00 PM
                  </button>
                  <button
                    className="py-3 px-4 rounded-xl border border-primary/20 text-primary hover:bg-primary-container/30 transition-colors text-sm font-medium"
                    type="button"
                  >
                    19:30 PM
                  </button>
                </div>
              </div>

              {/* Confirmation Summary */}
              <div className="bg-primary/5 p-8 rounded-3xl border border-primary/10">
                <div className="flex items-start gap-4 mb-8">
                  <div className="bg-white p-3 rounded-2xl shadow-sm">
                    <span
                      className="material-symbols-outlined text-primary"
                      data-icon="event_available"
                    >
                      event_available
                    </span>
                  </div>
                  <div>
                    <p className="text-stone-500 text-sm">Resumen de sesión</p>
                    <h4 className="text-lg font-semibold font-serif text-on-surface">
                      Jueves, 12 de Octubre
                    </h4>
                    <p className="text-primary-dim font-medium">
                      10:30 AM — 11:30 AM
                    </p>
                  </div>
                </div>
                <div className="space-y-4 mb-8">
                  <div className="flex justify-between items-center text-sm border-b border-primary/10 pb-4">
                    <span className="text-stone-500">Tipo de sesión</span>
                    <span className="text-on-surface font-semibold">
                      Terapia Individual
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-stone-500">Método</span>
                    <div className="flex items-center gap-1 text-primary">
                      <span
                        className="material-symbols-outlined text-[18px]"
                        data-icon="confirmation_number"
                      >
                        confirmation_number
                      </span>
                      <span className="font-semibold">Bono activo (1/5)</span>
                    </div>
                  </div>
                </div>
                <button
                  className="w-full py-4 bg-primary text-white rounded-2xl font-bold text-lg hover:bg-primary-dim shadow-xl shadow-primary/10 transition-all duration-300"
                  type="button"
                >
                  Confirmar Cita
                </button>
                <p className="text-center text-xs text-stone-400 mt-4 italic">
                  Se descontará una sesión de tu bono actual al confirmar.
                </p>
              </div>
            </div>
          </div>

          {/* Footer Visual Element */}
          <div className="mt-20 flex flex-col items-center gap-6 opacity-60">
            <div className="h-[1px] w-32 bg-primary/20"></div>
            <p className="font-serif italic text-stone-400 text-sm">
              Moncloa, Madrid — Tu espacio de paz y renovación profesional
            </p>
          </div>
        </div>
      </div>

      {/* BottomNavBar for Mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-[#faf9f5]/90 backdrop-blur-xl flex justify-around items-center py-4 px-6 border-t border-stone-200/40 z-50">
        <button
          className="flex flex-col items-center gap-1 text-stone-400"
          type="button"
        >
          <span className="material-symbols-outlined" data-icon="dashboard">
            dashboard
          </span>
          <span className="text-[10px] uppercase tracking-tighter">Inicio</span>
        </button>
        <button
          className="flex flex-col items-center gap-1 text-primary"
          type="button"
        >
          <span
            className="material-symbols-outlined"
            data-icon="calendar_today"
            style={{ fontVariationSettings: '"FILL" 1' }}
          >
            calendar_today
          </span>
          <span className="text-[10px] uppercase tracking-tighter font-bold">
            Citas
          </span>
        </button>
        <button
          className="flex flex-col items-center gap-1 text-stone-400"
          type="button"
        >
          <span className="material-symbols-outlined">payments</span>
          <span className="text-[10px] uppercase tracking-tighter">Pagos</span>
        </button>
        <button
          className="flex flex-col items-center gap-1 text-stone-400"
          type="button"
        >
          <span className="material-symbols-outlined" data-icon="chat_bubble">
            chat_bubble
          </span>
          <span className="text-[10px] uppercase tracking-tighter">
            Mensajes
          </span>
        </button>
        <button
          className="flex flex-col items-center gap-1 text-stone-400"
          type="button"
        >
          <span className="material-symbols-outlined" data-icon="library_books">
            library_books
          </span>
          <span className="text-[10px] uppercase tracking-tighter">
            Recursos
          </span>
        </button>
      </nav>
    </>
  );
}
