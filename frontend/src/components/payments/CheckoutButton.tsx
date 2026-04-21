'use client';

import { useFormStatus } from 'react-dom';

type CheckoutButtonProps = {
  label: string;
};

export default function CheckoutButton({ label }: CheckoutButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      className="w-full bg-primary text-on-primary px-10 py-5 rounded-xl font-label text-xs uppercase tracking-[0.2em] font-bold editorial-shadow hover:-translate-y-1 transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
      type="submit"
      disabled={pending}
    >
      {pending ? 'Procesando…' : label}
    </button>
  );
}
