// Shrinks photos in the browser before they are uploaded.
// A 10 MB iPhone photo becomes a sharp ~200–450 KB JPEG at up to 2400px on the long edge,
// which is still larger than any screen shows it, so quality on the website is unchanged.

const MAX_EDGE = 2400;
const TARGET_BYTES = 450 * 1024;
const SKIP_BELOW = 400 * 1024;

function canCompress(f: File) {
  return /^image\/(jpeg|jpg|png|webp|heic|heif|avif)$/i.test(f.type) || /\.(jpe?g|png|webp|heic|heif)$/i.test(f.name);
}

async function decode(file: File): Promise<ImageBitmap | HTMLImageElement> {
  try {
    // Respects the EXIF rotation so iPhone portrait photos stay upright.
    return await createImageBitmap(file, { imageOrientation: "from-image" } as ImageBitmapOptions);
  } catch {
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.decoding = "async";
      img.src = url;
      await img.decode();
      return img;
    } finally { setTimeout(() => URL.revokeObjectURL(url), 1000); }
  }
}

function toBlob(canvas: HTMLCanvasElement, q: number): Promise<Blob | null> {
  return new Promise(res => canvas.toBlob(b => res(b), "image/jpeg", q));
}

/** Returns a smaller JPEG copy of the photo, or the original if it is already small or can't be read. */
export async function compressImage(file: File): Promise<File> {
  if (typeof document === "undefined" || !canCompress(file) || file.size <= SKIP_BELOW) return file;
  let src: ImageBitmap | HTMLImageElement;
  try { src = await decode(file); } catch { return file; } // e.g. HEIC in a browser that can't open it
  const w0 = "naturalWidth" in src ? src.naturalWidth : src.width;
  const h0 = "naturalHeight" in src ? src.naturalHeight : src.height;
  if (!w0 || !h0) return file;

  let scale = Math.min(1, MAX_EDGE / Math.max(w0, h0));
  let best: Blob | null = null;
  for (let pass = 0; pass < 4; pass++) {
    const w = Math.round(w0 * scale), h = Math.round(h0 * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.fillStyle = "#fff"; // transparent PNGs get a white background in JPEG
    ctx.fillRect(0, 0, w, h);
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(src, 0, 0, w, h);
    for (const q of [0.82, 0.74, 0.66, 0.58]) {
      const b = await toBlob(canvas, q);
      if (!b) continue;
      if (!best || b.size < best.size) best = b;
      if (b.size <= TARGET_BYTES) { best = b; pass = 99; break; }
    }
    scale *= 0.8;
  }
  if ("close" in src) src.close();
  if (!best || best.size >= file.size) return file;
  const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
  return new File([best], name, { type: "image/jpeg", lastModified: Date.now() });
}

export async function compressImages(files: File[]): Promise<File[]> {
  const out: File[] = [];
  for (const f of files) out.push(await compressImage(f)); // one at a time keeps phones from running out of memory
  return out;
}
