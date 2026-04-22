import type { Area } from 'react-easy-crop';

/**
 * Genera un Blob JPEG recortado y escalado (avatar cuadrado).
 * Usado tras el modal de recorte para no subir fotos enormes al bucket.
 */
export async function getCroppedImageBlob(
  imageSrc: string,
  pixelCrop: Area,
  options?: { readonly maxSide?: number; readonly quality?: number }
): Promise<Blob> {
  const image = await loadImage(imageSrc);
  const maxSide = options?.maxSide ?? 512;
  const quality = options?.quality ?? 0.9;

  let tw = pixelCrop.width;
  let th = pixelCrop.height;
  const scale = Math.min(1, maxSide / Math.max(tw, th));
  tw = Math.max(1, Math.round(tw * scale));
  th = Math.max(1, Math.round(th * scale));

  const canvas = document.createElement('canvas');
  canvas.width = tw;
  canvas.height = th;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('canvas_context_unavailable');
  }

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    tw,
    th
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('canvas_to_blob_failed'));
      },
      'image/jpeg',
      quality
    );
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener('load', () => resolve(img));
    img.addEventListener('error', () => reject(new Error('image_load_failed')));
    img.src = src;
  });
}
