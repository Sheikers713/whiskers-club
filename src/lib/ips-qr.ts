import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { prepareZXingModule, writeBarcode } from "zxing-wasm/writer";

let ready: Promise<void> | null = null;

/** Loads the ZXing encoder from node_modules (not from a CDN). */
function loadZxing(): Promise<void> {
  ready ??= (async () => {
    // A plain path, not require.resolve: the bundler would try to bundle the .wasm.
    // next.config.ts copies this file into the standalone build.
    const wasm = await readFile(path.join(process.cwd(), "node_modules/zxing-wasm/dist/writer/zxing_writer.wasm"));
    await prepareZXingModule({
      overrides: { wasmBinary: wasm.buffer.slice(wasm.byteOffset, wasm.byteOffset + wasm.byteLength) as ArrayBuffer },
      fireImmediately: true,
    });
  })();
  return ready;
}

/** The QR code as an SVG document; level M, as bank apps read it from a screen. */
export async function qrSvg(text: string): Promise<string> {
  await loadZxing();
  const { svg, error } = await writeBarcode(text, { format: "QRCode", ecLevel: "M", withQuietZones: true });
  if (error) throw new Error(error);
  return svg;
}
