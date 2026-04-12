'use client';

import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { type ChangeEvent, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { startRegistrationAction } from '@/services/auth/registerActions';

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      className="w-full md:w-auto bg-primary text-on-primary px-10 py-5 rounded-xl font-label text-xs uppercase tracking-[0.2em] font-bold editorial-shadow hover:-translate-y-1 transition-all active:scale-95 flex items-center justify-center gap-3"
      type="submit"
      disabled={pending}
    >
      <span className="material-symbols-outlined text-xl" data-icon="encrypted">
        encrypted
      </span>
      {pending ? 'Procesando...' : 'Guardar con Cifrado AES-256'}
    </button>
  );
}

export default function RegistroPacientePage() {
  const searchParams = useSearchParams();
  const plan = searchParams.get('plan') ?? '';
  const error = searchParams.get('error');

  const [fechaNacimiento, setFechaNacimiento] = useState('');
  const dateInputRef = useRef<HTMLInputElement | null>(null);

  const formatFechaNacimiento = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 8);
    const dd = digits.slice(0, 2);
    const mm = digits.slice(2, 4);
    const yyyy = digits.slice(4, 8);

    if (digits.length <= 2) return dd;
    if (digits.length <= 4) return `${dd}/${mm}`;
    return `${dd}/${mm}/${yyyy}`;
  };

  const handleFechaNacimientoTextChange = (
    e: ChangeEvent<HTMLInputElement>
  ) => {
    setFechaNacimiento(formatFechaNacimiento(e.target.value).slice(0, 10));
  };

  const handleFechaNacimientoDateChange = (
    e: ChangeEvent<HTMLInputElement>
  ) => {
    const iso = e.target.value; // YYYY-MM-DD
    if (!iso) {
      setFechaNacimiento('');
      return;
    }

    const [yyyy, mm, dd] = iso.split('-');
    if (!yyyy || !mm || !dd) return;
    setFechaNacimiento(`${dd}/${mm}/${yyyy}`.slice(0, 10));
  };

  return (
    <div className="bg-background text-on-surface font-body selection:bg-primary-container selection:text-on-primary-container">
      <main className="min-h-screen pt-40 pb-20 px-6 flex items-center justify-center">
        {/* Main Card with 12px (xl) radius */}
        <div className="max-w-6xl w-full grid grid-cols-1 md:grid-cols-12 bg-surface-container-lowest editorial-shadow rounded-xl overflow-hidden">
          {/* Left Column: Emotional Anchor */}
          <div className="md:col-span-5 bg-surface-container-low p-12 flex flex-col justify-between relative overflow-hidden">
            <div className="relative z-10">
              <div className="mb-8 overflow-hidden rounded-xl h-80 w-full">
                <Image
                  alt="Professional portrait of Almudena Marchesi in a serene Madrid studio setting, soft natural light, minimalist background, wearing a neutral blazer"
                  className="w-full h-full object-cover"
                  data-alt="Professional portrait of Almudena Marchesi in a serene Madrid studio setting, soft natural light, minimalist background, wearing a neutral blazer"
                  height={800}
                  sizes="(min-width: 768px) 40vw, 100vw"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuBEhhmYFWoOy8Fd0GBsFwm9_63u27nkDMwDUWfJm7tNuEbZFFs6titbrfGnyLpX3cDlm2Cy1HCsJTzc-__ErjSgH5ArRnQObKciorMRZIzm0lae37gm2wMON4g7Kzc_32nAeztrs8r8JAEJ_1nfLH6hDW9o2PHU6F0_ymZlbBKCAvJw6A8feLhYOCzqteJRU0qXJt8BY9gjiQVMdftpg71WfOvzbajsjOOx4cjpMzunayyU0wu85QFViA19SgJ-TOncxFZGJhM_L4k"
                  width={1200}
                />
              </div>
              <h1 className="font-headline text-4xl text-primary font-bold tracking-tight mb-4 leading-tight">
                Registro de Paciente
              </h1>
              <p className="text-on-surface-variant font-body leading-relaxed mb-8">
                Tu bienestar comienza en un entorno de confianza. Este espacio
                ha sido diseñado para que te sientas seguro compartiendo tu
                historia. Toda la información tratada aquí está bajo los más
                estrictos estándares de confidencialidad clínica.
              </p>
            </div>

            <div className="space-y-6 relative z-10 pt-8 border-t border-outline-variant/20">
              <div className="flex items-center gap-4 text-primary">
                <span
                  className="material-symbols-outlined text-2xl"
                  data-icon="verified_user"
                >
                  verified_user
                </span>
                <div className="flex flex-col">
                  <span className="font-label text-[10px] uppercase tracking-[0.2em] font-bold">
                    Privacidad Protegida
                  </span>
                  <span className="text-xs text-on-surface-variant">
                    Conforme a la RGPD europea
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-4 text-primary">
                <span
                  className="material-symbols-outlined text-2xl"
                  data-icon="lock"
                >
                  lock
                </span>
                <div className="flex flex-col">
                  <span className="font-label text-[10px] uppercase tracking-[0.2em] font-bold">
                    Cifrado de extremo a extremo
                  </span>
                  <span className="text-xs text-on-surface-variant">
                    Tus datos solo son visibles para Almudena
                  </span>
                </div>
              </div>
            </div>

            {/* Abstract Decorative Element */}
            <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-primary/5 rounded-full blur-3xl"></div>
          </div>

          {/* Right Column: Patient Form */}
          <div className="md:col-span-7 p-12 bg-white">
            {error ? (
              <div className="mb-8 bg-error-container text-on-error-container border border-error/20 rounded-xl p-4 text-sm">
                {error}
              </div>
            ) : null}
            <form action={startRegistrationAction} className="space-y-12">
              <input type="hidden" name="plan" value={plan} />
              {/* Identity Section - Matches IMAGE_174 layout */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-10">
                <div className="relative">
                  <label className="font-label text-[10px] uppercase tracking-widest text-secondary mb-2 block font-semibold">
                    Nombre Completo
                  </label>
                  <input
                    className="w-full bg-white border border-outline-variant/30 rounded-lg px-4 py-3 transition-all font-body text-on-surface placeholder:text-outline/40"
                    placeholder="Escribe tu nombre y apellidos"
                    type="text"
                    name="nombre_completo"
                    autoComplete="name"
                    required
                  />
                </div>
                <div className="relative">
                  <label className="font-label text-[10px] uppercase tracking-widest text-secondary mb-2 block font-semibold">
                    DNI/NIE
                  </label>
                  <input
                    className="w-full bg-white border border-outline-variant/30 rounded-lg px-4 py-3 transition-all font-body text-on-surface placeholder:text-outline/40"
                    placeholder="00000000X"
                    type="text"
                    name="dni_nie"
                    required
                  />
                </div>
                <div className="relative">
                  <label className="font-label text-[10px] uppercase tracking-widest text-secondary mb-2 block font-semibold">
                    Teléfono
                  </label>
                  <input
                    className="w-full bg-white border border-outline-variant/30 rounded-lg px-4 py-3 transition-all font-body text-on-surface placeholder:text-outline/40"
                    placeholder="+34 000 000 000"
                    type="tel"
                    name="telefono"
                    autoComplete="tel"
                  />
                </div>
                <div className="relative">
                  <label className="font-label text-[10px] uppercase tracking-widest text-secondary mb-2 block font-semibold">
                    Email
                  </label>
                  <input
                    className="w-full bg-white border border-outline-variant/30 rounded-lg px-4 py-3 transition-all font-body text-on-surface placeholder:text-outline/40"
                    placeholder="hola@ejemplo.com"
                    type="email"
                    name="email"
                    required
                  />
                </div>
                <div className="relative md:col-span-2">
                  <label className="font-label text-[10px] uppercase tracking-widest text-secondary mb-2 block font-semibold">
                    Fecha de Nacimiento
                  </label>
                  <div className="relative">
                    <input
                      className="w-full bg-white border border-outline-variant/30 rounded-lg px-4 py-3 transition-all font-body text-on-surface placeholder:text-outline/40"
                      placeholder="DD / MM / AAAA"
                      type="text"
                      name="fecha_nacimiento"
                      value={fechaNacimiento}
                      onChange={handleFechaNacimientoTextChange}
                      maxLength={10}
                    />
                    <span
                      className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-primary/50"
                      data-icon="calendar_today"
                    >
                      calendar_today
                    </span>
                    <input
                      ref={dateInputRef}
                      className="absolute right-4 top-1/2 -translate-y-1/2 h-6 w-6 opacity-0 z-10"
                      type="date"
                      aria-label="Seleccionar fecha de nacimiento"
                      onChange={handleFechaNacimientoDateChange}
                    />
                  </div>
                </div>
              </div>

              {/* Experience Chips */}
              <div>
                <label className="font-label text-[10px] uppercase tracking-widest text-secondary mb-6 block font-semibold">
                  ¿Has estado en terapia antes?
                </label>
                <div className="flex flex-wrap gap-4">
                  <label className="group cursor-pointer">
                    <input
                      className="hidden peer"
                      name="experiencia_terapia"
                      type="radio"
                      value="primera_vez"
                    />
                    <div className="px-6 py-4 rounded-full border border-outline-variant/30 bg-surface-container-low text-secondary font-body text-sm peer-checked:bg-primary-container peer-checked:border-primary peer-checked:text-on-primary-container transition-all group-hover:bg-surface-variant">
                      Es mi primera vez
                    </div>
                  </label>
                  <label className="group cursor-pointer">
                    <input
                      className="hidden peer"
                      name="experiencia_terapia"
                      type="radio"
                      value="hace_tiempo"
                    />
                    <div className="px-6 py-4 rounded-full border border-outline-variant/30 bg-surface-container-low text-secondary font-body text-sm peer-checked:bg-primary-container peer-checked:border-primary peer-checked:text-on-primary-container transition-all group-hover:bg-surface-variant">
                      Hace tiempo
                    </div>
                  </label>
                  <label className="group cursor-pointer">
                    <input
                      className="hidden peer"
                      name="experiencia_terapia"
                      type="radio"
                      value="recientemente"
                    />
                    <div className="px-6 py-4 rounded-full border border-outline-variant/30 bg-surface-container-low text-secondary font-body text-sm peer-checked:bg-primary-container peer-checked:border-primary peer-checked:text-on-primary-container transition-all group-hover:bg-surface-variant">
                      Recientemente
                    </div>
                  </label>
                </div>
              </div>

              {/* Message Area */}
              <div className="relative">
                <label className="font-label text-[10px] uppercase tracking-widest text-secondary mb-4 block font-semibold">
                  Cuéntame, ¿qué te trae por aquí?
                </label>
                <textarea
                  className="w-full bg-surface-container-low border-none rounded-xl p-6 font-body text-on-surface placeholder:text-outline/50 resize-none"
                  placeholder="Siéntete libre de expresarte..."
                  rows={4}
                  name="motivo_consulta_inicial"
                ></textarea>
                <p className="mt-2 text-[11px] text-on-surface-variant/70 italic flex items-center gap-2">
                  <span
                    className="material-symbols-outlined text-xs"
                    data-icon="info"
                  >
                    info
                  </span>
                  Toda la información es confidencial y solo será leída por la
                  profesional.
                </p>
              </div>

              {/* Actions */}
              <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-6 border-t border-surface-container">
                <div className="flex items-center gap-2 text-outline">
                  <span
                    className="material-symbols-outlined text-lg"
                    data-icon="shield"
                  >
                    shield
                  </span>
                  <span className="text-[10px] uppercase tracking-widest font-bold">
                    AES-256 Compliant
                  </span>
                </div>

                <SubmitButton />
              </div>
            </form>
          </div>
        </div>
      </main>

      {/* Footer (Semantic Shell Rule) */}
      <footer className="w-full py-12 px-8 border-t border-[#4b645f]/5 bg-[#faf9f5]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-center md:text-left">
          <div className="font-label text-xs uppercase tracking-widest leading-relaxed text-[#6a5d4e]/60">
            © 2024 Almudena Marchesi Fernández. Moncloa, Madrid.
          </div>
          <div className="flex gap-8">
            <a
              className="font-label text-xs uppercase tracking-widest text-[#6a5d4e]/60 hover:text-primary transition-colors"
              href="#"
            >
              Privacidad
            </a>
            <a
              className="font-label text-xs uppercase tracking-widest text-[#6a5d4e]/60 hover:text-primary transition-colors"
              href="#"
            >
              Aviso Legal
            </a>
            <a
              className="font-label text-xs uppercase tracking-widest text-[#6a5d4e]/60 hover:text-primary transition-colors"
              href="#"
            >
              Cookies
            </a>
            <a
              className="font-label text-xs uppercase tracking-widest text-[#6a5d4e]/60 hover:text-primary transition-colors"
              href="#"
            >
              Soporte
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
