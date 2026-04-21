import { Suspense } from 'react';

import VerificarOtpClient from './VerificarOtpClient';

export default function VerificarOtpPage(): JSX.Element {
  return (
    <Suspense>
      <VerificarOtpClient />
    </Suspense>
  );
}

