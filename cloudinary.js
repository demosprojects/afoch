/**
 * AFOCH - Subida de imágenes a Cloudinary (unsigned upload)
 * Requiere crear un "upload preset" en modo Unsigned (Settings > Upload > Upload presets).
 */
const CLOUD_NAME = "dmq1u3vdf";
const UPLOAD_PRESET = "stockware_unsigned";

export async function subirImagen(file, carpeta = "afoch") {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("upload_preset", UPLOAD_PRESET);
    fd.append("folder", carpeta);
    const r = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: "POST", body: fd });
    if (!r.ok) throw new Error("No se pudo subir la imagen a Cloudinary");
    const j = await r.json();
    return { url: j.secure_url, publicId: j.public_id };
}

/** Achica la foto en el navegador (lado mayor 1920 px, JPEG) antes de subirla: ahorra datos y evita pasar el límite de Cloudinary. */
export async function reducir(file, maxLado = 1920, calidad = 0.85) {
    try {
        const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
        const k = Math.min(1, maxLado / Math.max(bmp.width, bmp.height));
        if (k === 1 && file.size < 1.5e6) return file;
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(bmp.width * k);
        canvas.height = Math.round(bmp.height * k);
        canvas.getContext("2d").drawImage(bmp, 0, 0, canvas.width, canvas.height);
        const blob = await new Promise(r => canvas.toBlob(r, "image/jpeg", calidad));
        return blob && blob.size < file.size ? new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" }) : file;
    } catch { return file; }
}

/** Devuelve la URL con formato y calidad automáticos y ancho acotado. */
export function optimizar(url, ancho = 200) {
    return url && url.includes("/upload/") ? url.replace("/upload/", `/upload/f_auto,q_auto,w_${ancho}/`) : url;
}