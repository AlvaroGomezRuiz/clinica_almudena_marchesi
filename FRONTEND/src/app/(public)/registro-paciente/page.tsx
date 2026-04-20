import { Suspense } from 'react';

import RegistroPacienteClient from './RegistroPacienteClient';

export default function RegistroPacientePage(): JSX.Element {
  return (
    <Suspense>
      <RegistroPacienteClient />
    </Suspense>
  );
}

