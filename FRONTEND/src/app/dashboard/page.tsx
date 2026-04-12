'use client';

import { useEffect, useState } from 'react';
import api from '@/services/axios';

export default function DashboardPage() {
  const [userData, setUserData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const extraerDatos = async () => {
      try {
        // Disparo al backend protegido
        const response = await api.get('/api/v1/pacientes/');
        setUserData(response.data);
      } catch (err) {
        setError(
          'El backend ha repelido el ataque (Token inválido o ruta incorrecta).'
        );
      }
    };
    extraerDatos();
  }, []);

  return (
    <main className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-2xl mx-auto bg-white p-6 rounded shadow-md border-t-4 border-green-600">
        <h1 className="text-2xl font-bold mb-4">Búnker Asegurado</h1>
        {error ? (
          <p className="text-red-500 font-mono">{error}</p>
        ) : userData ? (
          <div>
            <p className="text-gray-700 mb-4">Datos extraídos con éxito:</p>
            <pre className="bg-gray-900 text-green-400 p-4 rounded font-mono text-sm overflow-auto">
              {JSON.stringify(userData, null, 2)}
            </pre>
          </div>
        ) : (
          <p className="text-gray-500 animate-pulse">
            Estableciendo conexión encriptada...
          </p>
        )}
      </div>
    </main>
  );
}
