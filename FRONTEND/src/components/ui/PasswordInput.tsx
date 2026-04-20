'use client';
import React, { useState, useMemo } from 'react';
import { Check, Eye, EyeOff, X } from 'lucide-react';

const PASSWORD_REQUIREMENTS = [
  { regex: /.{8,}/, text: 'Al menos 8 caracteres' },
  { regex: /[0-9]/, text: 'Al menos 1 número' },
  { regex: /[a-z]/, text: 'Al menos 1 letra minúscula' },
  { regex: /[A-Z]/, text: 'Al menos 1 letra mayúscula' },
  { regex: /[!-\/:-@[-`{-~]/, text: 'Al menos 1 carácter especial' },
] as const;

type StrengthScore = 0 | 1 | 2 | 3 | 4 | 5;

const STRENGTH_CONFIG = {
  colors: {
    0: 'bg-line',
    1: 'bg-red-400',
    2: 'bg-orange-400',
    3: 'bg-amber-400',
    4: 'bg-sage-mid',
    5: 'bg-sage',
  } satisfies Record<StrengthScore, string>,
  texts: {
    0: 'Introduce una contraseña',
    1: 'Contraseña débil',
    2: 'Contraseña media',
    3: 'Contraseña buena',
    4: 'Contraseña fuerte',
  } satisfies Record<Exclude<StrengthScore, 5>, string>,
} as const;

type Requirement = {
  met: boolean;
  text: string;
};

type PasswordStrength = {
  score: StrengthScore;
  requirements: Requirement[];
};

export default function PasswordInput() {
  const [password, setPassword] = useState('');
  const [isVisible, setIsVisible] = useState(false);

  const calculateStrength = useMemo((): PasswordStrength => {
    const requirements = PASSWORD_REQUIREMENTS.map((req) => ({
      met: req.regex.test(password),
      text: req.text,
    }));

    return {
      score: requirements.filter((req) => req.met).length as StrengthScore,
      requirements,
    };
  }, [password]);

  return (
    <div className='w-full'>
      <div className='relative'>
        <input
          id='password'
          name="password"
          type={isVisible ? 'text' : 'password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder='••••••••'
          required
          aria-invalid={calculateStrength.score < 4}
          aria-describedby='password-strength'
          className='w-full bg-transparent border border-line rounded-apple px-4 py-3.5 transition-all duration-300 font-display text-lg text-ink placeholder:text-ink-muted/50 focus:outline-none focus:border-sage focus:ring-1 focus:ring-sage/30'
        />
        <button
          type='button'
          onClick={() => setIsVisible((prev) => !prev)}
          aria-label={isVisible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          className='absolute inset-y-0 right-4 flex items-center justify-center text-ink-muted hover:text-ink transition-colors'
        >
          {isVisible ? <EyeOff size={20} /> : <Eye size={20} />}
        </button>
      </div>

      <div
        className='mt-3 mb-2 h-1.5 rounded-full bg-line overflow-hidden'
        role='progressbar'
        aria-valuenow={calculateStrength.score}
        aria-valuemin={0}
        aria-valuemax={5}
      >
        <div
          className={`h-full ${
            STRENGTH_CONFIG.colors[calculateStrength.score]
          } transition-all duration-500`}
          style={{ width: `${(calculateStrength.score / 5) * 100}%` }}
        />
      </div>

      <p
        id='password-strength'
        className='mb-3 font-display text-xs uppercase tracking-[0.1em] flex justify-between items-center'
      >
        <span className="text-ink-muted font-medium">Seguridad:</span>
        <span className={calculateStrength.score >= 4 ? "text-sage font-semibold" : "text-ink-soft"}>
          {
            STRENGTH_CONFIG.texts[
              Math.min(
                calculateStrength.score,
                4
              ) as keyof typeof STRENGTH_CONFIG.texts
            ]
          }
        </span>
      </p>

      <ul className='grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-4' aria-label='Requisitos de la contraseña'>
        {calculateStrength.requirements.map((req) => (
          <li key={req.text} className='flex items-center space-x-2.5'>
            {req.met ? (
              <Check size={16} className='text-sage shrink-0' />
            ) : (
              <X size={16} className='text-ink-muted/40 shrink-0' />
            )}
            <span
              className={`text-[0.85rem] font-body ${
                req.met ? 'text-ink' : 'text-ink-muted'
              }`}
            >
              {req.text}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
