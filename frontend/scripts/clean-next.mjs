import fs from "node:fs";
import path from "node:path";

const target = path.join(process.cwd(), ".next");

try {
  if (fs.existsSync(target)) {
    fs.rmSync(target, { recursive: true, force: true });
  }
} catch (err) {
  // No bloqueamos el arranque por un fallo de limpieza en Windows; el dev server seguirá.
  // eslint-disable-next-line no-console
  console.warn("No se pudo limpiar .next:", err);
}

