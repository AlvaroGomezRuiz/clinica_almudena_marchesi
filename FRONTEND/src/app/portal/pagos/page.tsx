/* eslint-disable @next/next/no-img-element */

import { CLINIC_SESSION_PRICE_LABEL } from '@/lib/clinic';

export default function PortalPagosPage() {
  return (
    <>
      <div className="pb-32 px-6 md:px-12 max-w-screen-2xl mx-auto">
        {/* Header Section */}
        <header className="mb-12">
          <h2 className="font-headline text-4xl md:text-5xl text-primary font-bold tracking-tight mb-3">
            Mis{' '}
            <span className="text-on-surface-variant font-medium italic">
              Bonos y Pagos
            </span>
          </h2>
          <p className="text-secondary text-lg max-w-2xl font-light leading-relaxed">
            Gestiona tus sesiones y adquiere nuevos bonos para tu bienestar.
          </p>
        </header>

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Left Side: Status and Options */}
          <div className="lg:col-span-8 space-y-12">
            {/* Current Status Card */}
            <section className="bg-[#f0f3f1] p-10 rounded-3xl bento-card relative overflow-hidden">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10">
                <div>
                  <span className="bg-primary/10 text-primary text-[10px] px-3 py-1 rounded-full font-bold uppercase tracking-widest mb-3 inline-block">
                    Estado Actual
                  </span>
                  <h3 className="font-headline text-3xl text-primary font-bold">
                    Bono Terapia Individual
                  </h3>
                </div>
                <div className="mt-4 md:mt-0 text-right">
                  <span className="text-5xl font-headline text-primary font-bold">
                    07
                  </span>
                  <span className="text-secondary-dim text-sm uppercase tracking-widest font-bold block opacity-60">
                    / 10 sesiones
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-white h-3 rounded-full mb-6 overflow-hidden">
                <div
                  className="bg-primary h-full rounded-full"
                  style={{ width: '70%' }}
                ></div>
              </div>

              <div className="flex gap-2 items-center text-sm text-secondary-dim font-medium">
                <span className="material-symbols-outlined text-lg opacity-60">
                  schedule
                </span>
                <span>Válido hasta el 12 de Diciembre, 2024</span>
              </div>
            </section>

            {/* Purchase Options */}
            <section className="space-y-8">
              <h4 className="font-headline text-2xl text-primary font-bold">
                Adquirir nuevo bono
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Pack 1 */}
                <div className="bg-surface-container-low p-8 rounded-3xl bento-card hover:shadow-lg transition-all flex flex-col h-full border-2 border-transparent">
                  <div className="flex justify-between items-start mb-6">
                    <span className="bg-white/80 text-secondary-dim px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-tighter">
                      Individual
                    </span>
                    <span className="text-2xl font-headline text-primary font-bold">
                      {CLINIC_SESSION_PRICE_LABEL}
                    </span>
                  </div>
                  <h5 className="text-lg font-bold text-on-surface mb-3">
                    1 Sesión
                  </h5>
                  <p className="text-sm text-secondary leading-relaxed mb-8 flex-grow">
                    Para necesidades puntuales o primera toma de contacto.
                  </p>
                  <button
                    className="w-full py-3.5 border border-primary/20 text-primary text-sm font-bold hover:bg-primary hover:text-white transition-all rounded-xl flex justify-center items-center gap-2"
                    type="button"
                  >
                    Seleccionar
                    <span className="material-symbols-outlined text-sm">
                      arrow_forward
                    </span>
                  </button>
                </div>

                {/* Pack 5 */}
                <div className="bg-surface-container-low p-8 rounded-3xl bento-card hover:shadow-lg transition-all flex flex-col h-full border-2 border-transparent">
                  <div className="flex justify-between items-start mb-6">
                    <span className="bg-secondary-container text-on-secondary-container px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-tighter">
                      Básico
                    </span>
                    <span className="text-2xl font-headline text-primary font-bold">
                      280€
                    </span>
                  </div>
                  <h5 className="text-lg font-bold text-on-surface mb-3">
                    Bono 5 Sesiones
                  </h5>
                  <p className="text-sm text-secondary leading-relaxed mb-8 flex-grow">
                    Ideal para seguimiento quincenal. Ahorro del 10%.
                  </p>
                  <button
                    className="w-full py-3.5 border border-primary/20 text-primary text-sm font-bold hover:bg-primary hover:text-white transition-all rounded-xl flex justify-center items-center gap-2"
                    type="button"
                  >
                    Seleccionar
                    <span className="material-symbols-outlined text-sm">
                      arrow_forward
                    </span>
                  </button>
                </div>

                {/* Pack 10 */}
                <div className="bg-primary p-8 rounded-3xl bento-card relative overflow-hidden group shadow-xl flex flex-col h-full border-2 border-primary">
                  <div className="flex justify-between items-start mb-6 relative z-10">
                    <span className="bg-white/20 text-on-primary px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-tighter backdrop-blur-sm">
                      Más Popular
                    </span>
                    <span className="text-2xl font-headline text-on-primary font-bold">
                      500€
                    </span>
                  </div>
                  <h5 className="text-lg font-bold text-on-primary mb-3 relative z-10">
                    Bono 10 Sesiones
                  </h5>
                  <p className="text-sm text-on-primary/80 leading-relaxed mb-8 flex-grow relative z-10">
                    Procesos de transformación profunda. Ahorro del 20%.
                  </p>
                  <button
                    className="w-full py-3.5 bg-white text-primary text-sm font-bold hover:scale-[1.02] transition-transform rounded-xl flex justify-center items-center gap-2 relative z-10"
                    type="button"
                  >
                    Seleccionar
                    <span className="material-symbols-outlined text-sm">
                      stars
                    </span>
                  </button>
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-10 -mt-10 blur-2xl"></div>
                </div>
              </div>
            </section>
          </div>

          {/* Right Side: Secure Payment */}
          <section className="lg:col-span-4">
            <div className="bg-surface-container-low p-10 rounded-3xl bento-card sticky top-12 shadow-sm">
              <h4 className="font-headline text-2xl text-primary mb-10 flex items-center gap-3">
                <span className="material-symbols-outlined text-primary/60">
                  lock
                </span>
                Pago Seguro
              </h4>

              <form className="space-y-8">
                <div className="space-y-6">
                  <div className="flex flex-col space-y-2">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-secondary-dim opacity-60">
                      Titular de la tarjeta
                    </label>
                    <input
                      className="bg-transparent border-0 border-b border-primary-fixed-dim focus:ring-0 focus:border-primary px-0 py-3 font-body transition-all text-sm uppercase placeholder:text-stone-300"
                      placeholder="ALMUDENA MARCHESI"
                      type="text"
                    />
                  </div>

                  <div className="flex flex-col space-y-2">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-secondary-dim opacity-60">
                      Información de tarjeta
                    </label>
                    <div className="relative">
                      <input
                        className="w-full bg-transparent border-0 border-b border-primary-fixed-dim focus:ring-0 focus:border-primary px-0 py-3 font-body transition-all text-sm placeholder:text-stone-300"
                        placeholder="4242 4242 4242 4242"
                        type="text"
                      />
                      <div className="absolute right-0 top-3 opacity-40">
                        <span className="material-symbols-outlined text-xl">
                          credit_card
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-8">
                    <div className="flex flex-col space-y-2">
                      <label className="text-[10px] uppercase tracking-widest font-bold text-secondary-dim opacity-60">
                        Caducidad
                      </label>
                      <input
                        className="bg-transparent border-0 border-b border-primary-fixed-dim focus:ring-0 focus:border-primary px-0 py-3 font-body transition-all text-sm placeholder:text-stone-300"
                        placeholder="MM / YY"
                        type="text"
                      />
                    </div>
                    <div className="flex flex-col space-y-2">
                      <label className="text-[10px] uppercase tracking-widest font-bold text-secondary-dim opacity-60">
                        CVC
                      </label>
                      <input
                        className="bg-transparent border-0 border-b border-primary-fixed-dim focus:ring-0 focus:border-primary px-0 py-3 font-body transition-all text-sm placeholder:text-stone-300"
                        placeholder="123"
                        type="text"
                      />
                    </div>
                  </div>
                </div>

                {/* Payment Methods */}
                <div className="pt-8 flex flex-col items-center gap-6">
                  <span className="text-[10px] uppercase tracking-[0.2em] text-primary/40 font-bold mb-2">
                    Métodos de Pago
                  </span>
                  <div className="grid grid-cols-2 gap-3 w-full">
                    <div className="bg-white p-3 rounded-xl border border-primary/5 flex items-center justify-center shadow-sm hover:border-primary/20 transition-colors cursor-pointer">
                      <img
                        alt="Apple & Google Pay"
                        className="h-5 object-contain"
                        src="https://lh3.googleusercontent.com/aida/ADBb0ujOv4PoGFK1HpJ5wLkw3XB6jojJ1HdzuxQFSUrwfnhJW7FOIJzvrNyEVpTT32uvH1ECYLVeuNzF0esA-31ded9NjIvT92961JN7a117FVncL8bl38lRQQm9FVFxkWsyfKZyOqElK2ULOnUBkOq6zCOVLMiq-3c5iTshzhqVu3g0zLhqfjSi-hOZUKyFUPPnTZQTs4Ckc1guu5IcER3rwUILHvQPQOyl0uwDvgfftGb_RpOppQuVVzPAnHgJubHW_-zbvrooCeXObA"
                      />
                    </div>
                    <div className="bg-[#FFB3C7] p-3 rounded-xl flex items-center justify-center shadow-sm hover:opacity-90 transition-opacity cursor-pointer">
                      <img
                        alt="Klarna"
                        className="h-4 object-contain"
                        src="https://lh3.googleusercontent.com/aida/ADBb0ujQZnDjb-zhAU2KrZXDKChVB-3HMZu41PO4juU7O5qUniofhsDsQzm9fevl5rhl3zWyQpj3VvEjy6sGgbvQo5VFh1rir9Vgc4jpaD1yNocPeMuovirCeY_ekopGCPpzlxkiMyKzMz7XHE3C837plzZcrKvgZ-NeWaXWjEH9ODcuSDbjacnAMn8trvpz9PuTletEkk2NPc0FfBG183s-Bz5VMdc8_kr-qXs-HBbppdpPiFNjZ_BUbwnKi8VxxgMQfP1VG4sf13pr"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 w-full pt-2">
                    <div className="flex flex-col items-center gap-1.5 p-2 rounded-lg hover:bg-primary/5 transition-colors cursor-pointer group">
                      <span className="material-symbols-outlined text-primary/40 group-hover:text-primary transition-colors text-lg">
                        credit_card
                      </span>
                      <span className="text-[9px] font-bold text-primary/60 uppercase tracking-tighter">
                        Tarjeta
                      </span>
                    </div>
                    <div className="flex flex-col items-center gap-1.5 p-2 rounded-lg hover:bg-primary/5 transition-colors cursor-pointer group">
                      <span className="material-symbols-outlined text-primary/40 group-hover:text-primary transition-colors text-lg">
                        account_balance
                      </span>
                      <span className="text-[9px] font-bold text-primary/60 uppercase tracking-tighter text-center leading-none">
                        Transferencia
                        <br />
                        Bancaria
                      </span>
                    </div>
                    <div className="flex flex-col items-center gap-1.5 p-2 rounded-lg hover:bg-primary/5 transition-colors cursor-pointer group">
                      <span className="material-symbols-outlined text-primary/40 group-hover:text-primary transition-colors text-lg">
                        payments
                      </span>
                      <span className="text-[9px] font-bold text-primary/60 uppercase tracking-tighter">
                        Efectivo
                      </span>
                    </div>
                  </div>
                </div>

                {/* Summary */}
                <div className="pt-8 border-t border-outline-variant/20 space-y-3">
                  <div className="flex justify-between text-xs text-secondary-dim">
                    <span>Subtotal</span>
                    <span>500,00€</span>
                  </div>
                  <div className="flex justify-between text-xl font-bold text-primary pt-2">
                    <span>Total a pagar</span>
                    <span>500,00€</span>
                  </div>
                </div>

                <button
                  className="w-full py-[18px] bg-primary text-white font-bold rounded-2xl shadow-xl shadow-primary/10 hover:translate-y-[-2px] transition-transform flex items-center justify-center gap-3"
                  type="button"
                >
                  <span>Confirmar Pago</span>
                  <span className="material-symbols-outlined text-sm">
                    payments
                  </span>
                </button>

                <div className="flex flex-col items-center gap-2 pt-4">
                  <div className="flex items-center gap-1.5 text-primary/40">
                    <span className="material-symbols-outlined text-sm">
                      verified_user
                    </span>
                    <span className="text-[9px] font-bold uppercase tracking-widest">
                      Encriptación SSL 256-bit
                    </span>
                  </div>
                  <p className="text-[10px] text-center text-secondary/60 font-light leading-relaxed max-w-[200px]">
                    Tus datos financieros están protegidos bajo los más altos
                    estándares de seguridad bancaria.
                  </p>
                </div>
              </form>
            </div>
          </section>
        </div>

        {/* Transaction History */}
        <section className="mt-24">
          <h4 className="font-headline text-3xl text-primary font-bold mb-10">
            Historial de Transacciones
          </h4>
          <div className="bg-white/40 backdrop-blur-sm rounded-[2rem] overflow-hidden bento-card">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-outline-variant/20">
                  <th className="px-10 py-6 text-[10px] uppercase tracking-widest font-bold text-secondary-dim opacity-50">
                    Concepto
                  </th>
                  <th className="px-10 py-6 text-[10px] uppercase tracking-widest font-bold text-secondary-dim opacity-50">
                    Fecha
                  </th>
                  <th className="px-10 py-6 text-[10px] uppercase tracking-widest font-bold text-secondary-dim opacity-50">
                    Estado
                  </th>
                  <th className="px-10 py-6 text-[10px] uppercase tracking-widest font-bold text-secondary-dim opacity-50">
                    Monto
                  </th>
                  <th className="px-10 py-6 text-[10px] uppercase tracking-widest font-bold text-secondary-dim opacity-50">
                    Factura
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                <tr className="group hover:bg-white/60 transition-colors">
                  <td className="px-10 py-8 font-semibold text-on-surface">
                    Bono 10 Sesiones
                  </td>
                  <td className="px-10 py-8 text-secondary text-sm">
                    12 Sep 2023
                  </td>
                  <td className="px-10 py-8">
                    <span className="inline-flex items-center gap-1.5 py-1 px-3 rounded-full text-[10px] font-bold bg-primary-container text-on-primary-container">
                      Completado
                    </span>
                  </td>
                  <td className="px-10 py-8 font-bold text-on-surface">
                    500,00€
                  </td>
                  <td className="px-10 py-8">
                    <button
                      className="flex items-center gap-2 text-primary font-bold text-xs hover:underline"
                      type="button"
                    >
                      <span className="material-symbols-outlined text-sm">
                        download
                      </span>
                      PDF
                    </button>
                  </td>
                </tr>
                <tr className="group hover:bg-white/60 transition-colors">
                  <td className="px-10 py-8 font-semibold text-on-surface">
                    Sesión Individual Extra
                  </td>
                  <td className="px-10 py-8 text-secondary text-sm">
                    05 Ago 2023
                  </td>
                  <td className="px-10 py-8">
                    <span className="inline-flex items-center gap-1.5 py-1 px-3 rounded-full text-[10px] font-bold bg-primary-container text-on-primary-container">
                      Completado
                    </span>
                  </td>
                  <td className="px-10 py-8 font-bold text-on-surface">
                    65,00€
                  </td>
                  <td className="px-10 py-8">
                    <button
                      className="flex items-center gap-2 text-primary font-bold text-xs hover:underline"
                      type="button"
                    >
                      <span className="material-symbols-outlined text-sm">
                        download
                      </span>
                      PDF
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* Bottom Navigation (Mobile) */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-white/90 backdrop-blur-md flex justify-around py-4 border-t border-stone-100 z-50">
        <a className="flex flex-col items-center gap-1 text-stone-400" href="#">
          <span className="material-symbols-outlined">grid_view</span>
          <span className="text-[10px] font-bold">Inicio</span>
        </a>
        <a className="flex flex-col items-center gap-1 text-stone-400" href="#">
          <span className="material-symbols-outlined">calendar_today</span>
          <span className="text-[10px] font-bold">Citas</span>
        </a>
        <a className="flex flex-col items-center gap-1 text-primary" href="#">
          <span className="material-symbols-outlined">payments</span>
          <span className="text-[10px] font-bold">Pagos</span>
        </a>
        <a className="flex flex-col items-center gap-1 text-stone-400" href="#">
          <span className="material-symbols-outlined">library_books</span>
          <span className="text-[10px] font-bold">Recursos</span>
        </a>
      </nav>
    </>
  );
}
