
import { createClient } from "@/lib/supabase/client";
import { getActiveRestaurantId } from "@/lib/services/restaurant";

const BUCKET = "products";
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

// Genera un identificador compatible con conexiones HTTP locales.
function generateUniqueFileName(): string {
  if (
    typeof globalThis.crypto !== "undefined" &&
    typeof globalThis.crypto.randomUUID === "function"
  ) {
    return globalThis.crypto.randomUUID();
  }

  if (
    typeof globalThis.crypto !== "undefined" &&
    typeof globalThis.crypto.getRandomValues === "function"
  ) {
    const bytes = new Uint8Array(16);
    globalThis.crypto.getRandomValues(bytes);

    return Array.from(bytes)
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

export async function uploadProductImage(file: File): Promise<string> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error("Formato no permitido. Usa JPG, PNG o WebP.");
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error("La imagen no puede superar los 5 MB.");
  }

  const restaurantId = await getActiveRestaurantId();
  const supabase = createClient();

  const extensions: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };

  const fileName = generateUniqueFileName();
  const extension = extensions[file.type];

  const filePath = `${restaurantId}/products/${fileName}.${extension}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, file, {
      contentType: file.type,
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    throw new Error(`No se pudo subir la imagen: ${error.message}`);
  }

  const { data } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(filePath);

  return data.publicUrl;
}
