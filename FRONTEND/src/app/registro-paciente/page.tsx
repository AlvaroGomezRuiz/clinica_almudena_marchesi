'use client';

import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { type ChangeEvent, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { startRegistrationAction } from '@/services/auth/registerActions';
import ScrollReveal from '@/components/public/ScrollReveal';

/** Versión del documento de privacidad vigente. Cambiar al actualizar /privacidad. */
const POLICY_VERSION = '2026-04-19-v1';

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      className="w-full md:w-auto btn-primary px-10 py-4 flex items-center justify-center gap-3 text-base"
      type="submit"
      disabled={pending}
    >
      <span className="material-symbols-outlined text-xl">encrypted</span>
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

  const inputClasses =
    'w-full bg-transparent border border-line rounded-apple px-4 py-3.5 transition-all duration-300 font-body text-ink placeholder:text-ink-muted/50 focus:outline-none focus:border-sage focus:ring-1 focus:ring-sage/30';

  const labelClasses =
    'font-mono text-label-sm uppercase tracking-[0.12em] text-sage-mid mb-2.5 block font-medium';

  return (
    <div className="bg-canvas overflow-x-hidden">
      <main className="min-h-screen pt-36 pb-20 px-6 md:px-12">
        <div className="max-w-6xl mx-auto">
          {/* Page Header */}
          <ScrollReveal className="mb-14">
            <div className="max-w-2xl">
              <span className="font-mono text-label-sm uppercase tracking-[0.14em] text-sage-mid mb-4 block">
                Portal Seguro
              </span>
              <h1 className="font-display text-display-1 text-ink italic mb-4 text-balance">
                Registro de Paciente
              </h1>
              <p className="text-body-lg text-ink-soft leading-relaxed text-pretty">
                Tu bienestar comienza en un entorno de confianza. Toda la
                información está protegida bajo los más estrictos estándares de
                confidencialidad clínica.
              </p>
            </div>
          </ScrollReveal>

          {/* Main card */}
          <ScrollReveal delay={0.1}>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 glass-card overflow-hidden">
              {/* Left Column: Emotional Anchor */}
              <div className="lg:col-span-4 bg-canvas-alt p-10 lg:p-12 flex flex-col justify-between relative overflow-hidden">
                <div className="relative z-10">
                  <div className="mb-8 overflow-hidden rounded-apple aspect-[3/4] w-full max-h-[320px]">
                    <Image
                      alt="Almudena Marchesi en su consulta de psicología en Moncloa, Madrid"
                      className="w-full h-full object-cover"
                      height={800}
                      sizes="(min-width: 1024px) 30vw, 100vw"
                      src="/images/registro.avif"
                      width={600}
                    />
                  </div>

                  <blockquote className="border-l-2 border-sage/30 pl-5 mb-8">
                    <p className="font-display text-lg text-ink italic leading-relaxed">
                      &ldquo;Este espacio ha sido diseñado para que te sientas
                      seguro compartiendo tu historia.&rdquo;
                    </p>
                    <div className="mt-6">
                      <h1>¿Ya tienes una cuenta?</h1>
                      <a
                        href="/login"
                        className="text-sage font-medium hover:underline transition-all"
                      >
                        INICIAR SESIÓN
                      </a>
                    </div>
                  </blockquote>
                </div>

                <div className="space-y-5 relative z-10 pt-6 border-t border-line">
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-full bg-sage-wash flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-lg text-sage">verified_user</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="font-mono text-label-sm uppercase tracking-[0.1em] font-medium text-ink">
                        Privacidad Protegida
                      </span>
                      <span className="text-[0.8rem] text-ink-muted">
                        Conforme a la RGPD europea
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-full bg-sage-wash flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-lg text-sage">lock</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="font-mono text-label-sm uppercase tracking-[0.1em] font-medium text-ink">
                        Cifrado de extremo a extremo
                      </span>
                      <span className="text-[0.8rem] text-ink-muted">
                        Tus datos solo son visibles para Almudena
                      </span>
                    </div>
                  </div>
                </div>

                {/* Decorative blur */}
                <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-sage/5 rounded-full blur-3xl" />
              </div>

              {/* Right Column: Patient Form */}
              <div className="lg:col-span-8 p-10 lg:p-12 bg-canvas">
                {error ? (
                  <div className="mb-8 glass-card bg-red-50 border-l-[3px] border-red-400 p-4 text-sm text-red-800">
                    {error}
                  </div>
                ) : null}

                <form action={startRegistrationAction} className="space-y-10">
                  <input type="hidden" name="plan" value={plan} />
                  <input type="hidden" name="policy_version" value={POLICY_VERSION} />
                  <input
                    type="hidden"
                    name="client_timestamp"
                    value={new Date().toISOString()}
                  />

                  {/* Identity Section */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-8">
                    <div>
                      <label className={labelClasses}>
                        Nombre Completo
                      </label>
                      <input
                        className={inputClasses}
                        placeholder="Escribe tu nombre y apellidos"
                        type="text"
                        name="nombre_completo"
                        autoComplete="name"
                        required
                      />
                    </div>
                    <div>
                      <label className={labelClasses}>
                        DNI/NIE
                      </label>
                      <input
                        className={inputClasses}
                        placeholder="00000000X"
                        type="text"
                        name="dni_nie"
                        required
                      />
                    </div>
                    <div>
                      <label className={labelClasses}>
                        Teléfono
                      </label>
                      <input
                        className={inputClasses}
                        placeholder="+34 000 000 000"
                        type="tel"
                        name="telefono"
                        autoComplete="tel"
                      />
                    </div>
                    <div>
                      <label className={labelClasses}>
                        Email
                      </label>
                      <input
                        className={inputClasses}
                        placeholder="hola@ejemplo.com"
                        type="email"
                        name="email"
                        required
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className={labelClasses}>
                        Fecha de Nacimiento
                      </label>
                      <div className="relative">
                        <input
                          className={inputClasses}
                          placeholder="DD / MM / AAAA"
                          type="text"
                          name="fecha_nacimiento"
                          value={fechaNacimiento}
                          onChange={handleFechaNacimientoTextChange}
                          maxLength={10}
                        />
                        <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-sage/50">
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
                    <label className={labelClasses}>
                      ¿Has estado en terapia antes?
                    </label>
                    <div className="flex flex-wrap gap-3 mt-1">
                      {[
                        { value: 'primera_vez', label: 'Es mi primera vez' },
                        { value: 'hace_tiempo', label: 'Hace tiempo' },
                        { value: 'recientemente', label: 'Recientemente' },
                      ].map((opt) => (
                        <label key={opt.value} className="group cursor-pointer">
                          <input
                            className="hidden peer"
                            name="experiencia_terapia"
                            type="radio"
                            value={opt.value}
                          />
                          <div className="px-5 py-3 rounded-pill border border-line bg-canvas-alt text-ink-soft font-body text-sm peer-checked:bg-sage-wash peer-checked:border-sage peer-checked:text-sage transition-all duration-300 group-hover:border-sage/40">
                            {opt.label}
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Message Area */}
                  <div>
                    <label className={labelClasses}>
                      Cuéntame, ¿qué te trae por aquí?
                    </label>
                    <textarea
                      className={`${inputClasses} resize-none bg-canvas-alt`}
                      placeholder="Siéntete libre de expresarte..."
                      rows={4}
                      name="motivo_consulta_inicial"
                    />
                    <p className="mt-2 text-[0.78rem] text-ink-muted italic flex items-center gap-2">
                      <span className="material-symbols-outlined text-xs">info</span>
                      Toda la información es confidencial y solo será leída por
                      la profesional.
                    </p>
                  </div>

                  {/* ─── Consentimiento RGPD + Ley 41/2002 ─── */}
                  <div className="pt-6 border-t border-line">
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        name="consentimiento_rgpd"
                        required
                        className="mt-1 w-5 h-5 rounded border-line text-sage focus:ring-sage/30 shrink-0"
                      />
                      <span className="text-sm text-ink-soft leading-relaxed">
                        He leído y acepto la{' '}
                        <a
                          href="/privacidad"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sage underline underline-offset-2 hover:text-sage-mid transition-colors"
                        >
                          Política de Privacidad
                        </a>{' '}
                        y el tratamiento de mis datos de salud conforme al{' '}
                        <strong>RGPD (UE) 2016/679</strong> y la{' '}
                        <strong>Ley 41/2002</strong> de Autonomía del Paciente.
                        Autorizo a Almudena Marchesi Fernández (Col. M-40804) al
                        tratamiento de mis datos clínicos con la única finalidad
                        de prestar el servicio terapéutico solicitado.
                      </span>
                    </label>
                  </div>

                  {/* Actions */}
                  <div className="pt-6 flex flex-col md:flex-row items-center justify-between gap-6 border-t border-line">
                    <div className="flex items-center gap-2 text-ink-muted">
                      <span className="material-symbols-outlined text-lg">shield</span>
                      <span className="font-mono text-label-sm uppercase tracking-[0.1em] font-medium">
                        AES-256 Compliant
                      </span>
                    </div>

                    <SubmitButton />
                  </div>
                </form>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </main>
    </div>
  );
}
