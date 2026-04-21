'use client';

import { QRCodeSVG } from 'qrcode.react';

export default function AdminMfaQr({
  provisioningUri,
}: {
  provisioningUri: string;
}) {
  return (
    <div className="inline-flex items-center justify-center bg-white p-4 rounded-xl border border-stone-200/70">
      <QRCodeSVG value={provisioningUri} size={220} includeMargin />
    </div>
  );
}
