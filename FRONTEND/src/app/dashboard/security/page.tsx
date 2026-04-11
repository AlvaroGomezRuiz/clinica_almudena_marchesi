'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';

export default function SecurityPage() {
  const [qrCode, setQrCode] = useState('');
  const [code, setCode] = useState('');
  const [status, setStatus] = useState({ type: '', msg: '' });
  const username = 'almudena'; // Luego lo sacarás de tu contexto de usuario

  // 1. Cargar el QR al entrar en la página
  useEffect(() => {
    const loadQR = async () => {
      try {
        const res = await axios.get(
          `http://localhost:8000/api/v1/auth/mfa/setup?username=${username}`
        );
        setQrCode(res.data.qr_code);
      } catch (err) {
        setStatus({ type: 'error', msg: 'No se pudo conectar con el búnker.' });
      }
    };
    loadQR();
  }, []);

  // 2. Enviar el primer código para confirmar activación
  const handleActivate = async () => {
    try {
      const res = await axios.post(
        'http://localhost:8000/api/v1/auth/mfa/enable',
        {
          username: username,
          code: code,
        }
      );
      setStatus({
        type: 'success',
        msg: '🛡️ ¡MFA ACTIVADO! Tu cuenta ahora es Grado Bancario.',
      });
    } catch (err) {
      setStatus({
        type: 'error',
        msg: 'Código incorrecto. Inténtalo de nuevo.',
      });
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">
        Seguridad Avanzada
      </h1>

      <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
        <h2 className="text-xl font-semibold mb-4">
          Autenticación de Doble Factor (2FA)
        </h2>

        {qrCode ? (
          <div className="flex flex-col items-center">
            <p className="text-gray-600 mb-6 text-center">
              Escanea este código con **Google Authenticator** o **Authy** para
              vincular tu cuenta.
            </p>

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrCode}
              alt="Código QR de Seguridad"
              className="w-64 h-64 border-4 border-gray-50 mb-6"
            />

            <div className="w-full max-w-xs">
              <input
                type="text"
                placeholder="Introduce el código de 6 dígitos"
                className="w-full border-2 border-gray-300 rounded-lg p-3 text-center text-xl mb-4"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
              <button
                onClick={handleActivate}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition"
              >
                Activar Seguridad
              </button>
            </div>
          </div>
        ) : (
          <p className="text-center py-10">
            Cargando protocolos de seguridad...
          </p>
        )}

        {status.msg && (
          <div
            className={`mt-6 p-4 rounded-lg text-center font-medium ${
              status.type === 'success'
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}
          >
            {status.msg}
          </div>
        )}
      </div>
    </div>
  );
}
