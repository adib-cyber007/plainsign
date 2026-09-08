import { mkdir, writeFile } from "node:fs/promises";
import { PNG } from "pngjs";
const output = new URL("../public/icon/", import.meta.url);
await mkdir(output, { recursive: true });
for (const size of [16, 48, 128]) {
  const png = new PNG({ width: size, height: size });
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const nx = (x + 0.5) / size;
      const ny = (y + 0.5) / size;
      const shield = ny > 0.1 && ny < 0.9 && Math.abs(nx - 0.5) < 0.3 - Math.max(0, ny - 0.5) * 0.35;
      const color = shield ? [37, 99, 235, 255] : [15, 23, 42, 255];
      png.data.set(color, (y * size + x) * 4);
    }
  }
  await writeFile(new URL(`${size}.png`, output), PNG.sync.write(png));
}
console.info("Generated PlainSign shield icons.");
