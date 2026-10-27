export const MAX_DIMENSION = 1800;
export const MAX_BYTES = 1_500_000;
export const MAX_SOURCE_BYTES = 25_000_000;
const outputExtensions: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
export function imageExtension(type: string) {
  const extension = outputExtensions[type];
  if (!extension)
    throw Error("Format hasil gambar tidak didukung untuk penyimpanan.");
  return extension;
}
function encode(canvas: HTMLCanvasElement, type: string, quality?: number) {
  return new Promise<Blob | null>((resolve, reject) => {
    try {
      canvas.toBlob(resolve, type, quality);
    } catch (error) {
      reject(error);
    }
  });
}
async function decode(file: File) {
  const url = URL.createObjectURL(file);
  const image = new Image();
  const dispose = () => {
    image.src = "";
    URL.revokeObjectURL(url);
  };
  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () =>
        reject(
          Error(
            "Browser belum bisa membaca gambar ini. Format mungkin tidak didukung atau file rusak. Coba pilih ulang gambar dari galeri.",
          ),
        );
      image.src = url;
    });
    if (!image.naturalWidth || !image.naturalHeight)
      throw Error("Gambar tidak memiliki ukuran yang dapat dibaca.");
    return { image, dispose };
  } catch (error) {
    dispose();
    throw error;
  }
}
export interface ImageOptions {
  maxDimension?: number;
  maxBytes?: number;
  onStage?: (message: string) => void;
}
/** Native decoding preserves image orientation; canvas rewrites pixels without EXIF/GPS or AI. */
export async function optimize(file: File, options: ImageOptions = {}) {
  const maxDimension = options.maxDimension ?? MAX_DIMENSION;
  const maxBytes = options.maxBytes ?? MAX_BYTES;
  if (
    !Number.isFinite(maxDimension) ||
    maxDimension < 1 ||
    maxDimension > 4096 ||
    !Number.isFinite(maxBytes) ||
    maxBytes < 1
  )
    throw Error("Pengaturan optimasi gambar tidak valid.");
  if (file.size > MAX_SOURCE_BYTES)
    throw Error(
      "Gambar melebihi batas 25 MB. Pilih versi yang lebih kecil dari galeri.",
    );
  if (!file.size)
    throw Error("File gambar kosong. Pilih ulang gambar dari galeri.");
  if (
    !file.type.startsWith("image/") &&
    !(
      file.type === "" &&
      /\.(jpe?g|png|webp|gif|avif|heic|heif|bmp|tiff?)$/i.test(file.name)
    )
  )
    throw Error("File ini bukan gambar. Pilih gambar dari galeri.");
  options.onStage?.("Membaca gambar…");
  const source = await decode(file);
  const canvas = document.createElement("canvas");
  try {
    const context = canvas.getContext("2d");
    if (!context)
      throw Error(
        "Browser tidak dapat mengolah gambar saat ini. Tutup tab lain lalu coba lagi.",
      );
    let ratio = Math.min(
      1,
      maxDimension /
        Math.max(source.image.naturalWidth, source.image.naturalHeight),
    );
    const draw = () => {
      canvas.width = Math.max(1, Math.round(source.image.naturalWidth * ratio));
      canvas.height = Math.max(
        1,
        Math.round(source.image.naturalHeight * ratio),
      );
      context.drawImage(source.image, 0, 0, canvas.width, canvas.height);
    };
    draw();
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let transparent = false;
    for (let index = 3; index < pixels.length; index += 4) {
      if (pixels[index] < 255) {
        transparent = true;
        break;
      }
    }
    // Unsupported encoders silently return PNG in Safari. Check the actual MIME, never the requested one.
    const probe = document.createElement("canvas");
    probe.width = probe.height = 1;
    const webp = await encode(probe, "image/webp", 0.8);
    const type =
      webp?.type === "image/webp"
        ? "image/webp"
        : transparent
          ? "image/png"
          : "image/jpeg";
    for (let attempt = 0; attempt < 13; attempt++) {
      options.onStage?.(
        attempt ? "Menyesuaikan ukuran gambar…" : "Mengoptimalkan gambar…",
      );
      for (const quality of type === "image/png"
        ? [undefined]
        : [0.88, 0.76, 0.66]) {
        const blob = await encode(canvas, type, quality);
        if (!blob)
          throw Error(
            "Browser gagal memproses gambar. Coba lagi setelah menutup tab lain.",
          );
        imageExtension(blob.type);
        if (blob.type !== type)
          throw Error(
            "Browser tidak mendukung format optimasi gambar yang dipilih. Coba perbarui browser.",
          );
        if (blob.size && blob.size <= maxBytes) return blob;
      }
      if (canvas.width === 1 && canvas.height === 1) break;
      ratio *= 0.75;
      // Draw from the original each time to avoid repeated lossy reconstruction.
      draw();
    }
    throw Error(
      "Gambar belum dapat diperkecil hingga batas unggahan. Coba gambar lain atau pilih versi beresolusi lebih rendah.",
    );
  } finally {
    source.dispose();
    canvas.width = canvas.height = 0;
  }
}
