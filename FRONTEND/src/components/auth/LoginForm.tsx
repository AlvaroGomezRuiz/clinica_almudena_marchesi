'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import axios from 'axios';

export default function LoginForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [mfaCode, setMfaCode] = useState(''); // Nuevo: Código del móvil
  const [step, setStep] = useState(1); // 1: Login, 2: MFA
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (step === 1) {
        // --- PASO 1: VALIDACIÓN DE CONTRASEÑA ---
        const response = await axios.post(
          'http://localhost:8000/api/v1/auth/login',
          {
            username,
            password,
          }
        );

        // Si el backend dice que falta el segundo factor
        if (response.data.status === 'mfa_required') {
          setStep(2);
          setLoading(false);
          return;
        }

        // Si no tiene MFA, entra directo (Punto 5)
        completeLogin(response.data.access_token);
      } else {
        // --- PASO 2: VALIDACIÓN DE CÓDIGO MFA ---
        const response = await axios.post(
          'http://localhost:8000/api/v1/auth/verify-mfa',
          {
            username,
            code: mfaCode,
          }
        );

        completeLogin(response.data.access_token);
      }
    } catch (err: any) {
      setError('Acceso denegado. Credenciales no autorizadas.');
      if (step === 2) setStep(1); // Si falla el MFA, volvemos al inicio por seguridad
    } finally {
      setLoading(false);
    }
  };

  // Función auxiliar para guardar cookie y redirigir
  const completeLogin = (token: string) => {
    Cookies.set('auth_token', token, {
      expires: 1 / 3,
      secure: true,
      sameSite: 'strict',
      path: '/',
    });
    router.push('/dashboard');
  };

  return (
    <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md border border-gray-200">
      <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">
        {step === 1 ? 'Búnker Almudena' : 'Verificación Doble'}
      </h2>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4 text-red-700 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {step === 1 ? (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Usuario
              </label>
              <input
                type="text"
                required
                className="mt-1 block w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Contraseña
              </label>
              <input
                type="password"
                required
                className="mt-1 block w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </>
        ) : (
          <div>
            <label className="block text-sm text-blue-700 font-bold text-center mb-2">
              Introduce el código de tu móvil
            </label>
            <input
              type="text"
              required
              maxLength={6}
              placeholder="000000"
              className="mt-1 block w-full border-2 border-blue-300 rounded-md p-3 text-center text-2xl tracking-[0.5em] focus:ring-blue-500 focus:border-blue-500"
              value={mfaCode}
              onChange={(e) => setMfaCode(e.target.value)}
              autoFocus
            />
            <p className="text-xs text-gray-500 mt-2 text-center">
              Abre Google Authenticator para ver el código activo.
            </p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className={`w-full text-white p-2 rounded-md transition-colors disabled:bg-gray-400 ${
            step === 1
              ? 'bg-blue-600 hover:bg-blue-700'
              : 'bg-green-600 hover:bg-green-700'
          }`}
        >
          {loading
            ? 'Validando...'
            : step === 1
              ? 'Entrar al Sistema'
              : 'Verificar Código'}
        </button>

        {step === 2 && (
          <button
            type="button"
            onClick={() => setStep(1)}
            className="w-full text-gray-500 text-xs mt-2 hover:underline"
          >
            Volver al login
          </button>
        )}
      </form>
    </div>
  );
}
