'use client';
import { useState, useEffect } from 'react';
import axios from '@/lib/axios'; // Usa tu instancia de axios

export default function MFAPage() {
  const [qr, setQr] = useState("");
  const [code, setCode] = useState("");

  // 1. Cargamos el QR al entrar
  useEffect(() => {
    axios.get(`/auth/mfa/setup?username=almudena`) // Ajusta el username dinámico
      .then(res => setQr(res.data.qr_code));
  }, []);

  const activateMFA = async () => {
    try {
      await axios.post('/auth/mfa/enable', { username: 'almudena', code });
      alert("¡Búnker Blindado! MFA activado.");
    } catch (err) {
      alert("Error al activar. Verifica el código.");
    }
  };

  return (
    <div className="flex flex-col items-center p-8">
      <h1 className="text-2xl font-bold">Seguridad de Grado Bancario</h1>
      <p className="mb-4">Escanea este código con Google Authenticator:</p>

      {qr && <img src={qr} alt="QR Code" className="border-4 p-2 mb-4" />}

      <input
        type="text"
        placeholder="Código de 6 dígitos"
        className="border p-2 rounded mb-2 text-center"
        onChange={(e) => setCode(e.target.value)}
      />
      <button
        onClick={activateMFA}
        className="bg-blue-600 text-white px-6 py-2 rounded"
      >
        Activar Doble Factor
      </button>
    </div>
  );
}
