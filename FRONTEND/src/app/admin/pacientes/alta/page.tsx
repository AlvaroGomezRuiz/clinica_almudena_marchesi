import Link from 'next/link';

import { Button, PageHeader } from '@/components/portal-shell/ui';
import AltaManualForm from '@/components/admin/pacientes/AltaManualForm';

export const metadata = { title: 'Alta manual de paciente | Panel Almudena' };

export const dynamic = 'force-dynamic';

/**
 * Alta manual de paciente (admin).
 *
 * F5 CIFRADO ACTIVO: el formulario delega en Server Action
 * `altaManualPacienteAction` que llama a la RPC `paciente_alta_cifrada`.
 * La RPC:
 *   1. Verifica is_admin() (code 42501 en caso contrario).
 *   2. Cifra nombre, DNI, teléfono, email, dirección, etc. con AES-256.
 *   3. Genera blind indexes HMAC-SHA256 para búsqueda sin revelar plaintext.
 *   4. Inserta en `pacientes` (las columnas plaintext NO se escriben).
 */
export default function AltaManualPage(): JSX.Element {
  return (
    <>
      <PageHeader
        eyebrow="Pacientes"
        title="Alta manual"
        description="Registro directo de pacientes sin autoservicio (llegadas por teléfono, referidos, reserva presencial)."
        actions={
          <Link href="/admin/pacientes">
            <Button variant="ghost" icon="arrow_back">
              Volver al listado
            </Button>
          </Link>
        }
      />

      <div className="max-w-3xl">
        <AltaManualForm />
      </div>
    </>
  );
}
