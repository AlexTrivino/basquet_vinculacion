import type { Encuadre } from './api/flyers.api';

// El encuadre de una foto recién subida: el centro, sin zoom
export const CENTRADO: Encuadre = { foco_x: 50, foco_y: 50, zoom: 1 };

// Del dato de la foto, solo lo que dice cómo se encuadra: es lo único que el editor mueve y el servidor acepta
export const encuadreDe = ({ foco_x, foco_y, zoom }: Encuadre): Encuadre => ({ foco_x, foco_y, zoom });

// La foto del podio antes de subirla. El navegador revisa lo mismo que el servidor (tipo, medidas) para avisar al
// instante en vez de subir 15 MB para nada, y la reduce a 2560 px de lado mayor: sobra para un flyer de 1080 px y
// cabe en los 4 MB que acepta el servidor. El servidor vuelve a revisarlo todo: esto es comodidad, no seguridad.

const TIPOS = ['image/jpeg', 'image/png', 'image/webp'];
export const ACEPTA = TIPOS.join(',');
export const MAX_ORIGINAL = 15 * 1024 * 1024; // lo que se acepta de una cámara o un teléfono
export const MAX_SUBIDA = 4 * 1024 * 1024; // lo que acepta el servidor (almacenamiento.MAX_FOTO_PODIO)
export const MIN_ANCHO = 1080;
export const MIN_ALTO = 608; // 16:9 a 1080 px: menos se ve borroso en el flyer
export const LADO_MAXIMO = 2560;

const mb = (bytes: number) => (bytes / 1024 / 1024).toFixed(1).replace('.', ',');

export function revisarArchivo({ type, size }: Pick<File, 'type' | 'size'>) {
  if (!TIPOS.includes(type)) throw new Error('Esa foto es de un tipo que no se puede usar. Elige una JPG, PNG o WebP.');
  if (size > MAX_ORIGINAL) throw new Error(`La foto pesa ${mb(size)} MB y el máximo es ${mb(MAX_ORIGINAL)} MB.`);
}

export function revisarMedidas(ancho: number, alto: number) {
  if (ancho < MIN_ANCHO || alto < MIN_ALTO) {
    throw new Error(`La foto mide ${ancho} × ${alto} px y el mínimo es ${MIN_ANCHO} × ${MIN_ALTO} px: en el flyer se vería borrosa.`);
  }
}

// Medidas de la foto reducida (el lado mayor, a LADO_MAXIMO como mucho); una foto más chica no se agranda
export function medidasReducidas(ancho: number, alto: number) {
  const escala = Math.min(1, LADO_MAXIMO / Math.max(ancho, alto));
  return { ancho: Math.round(ancho * escala), alto: Math.round(alto * escala) };
}

const NO_SE_LEE = 'No se pudo leer la foto: el archivo está dañado o no es una imagen.';
const VERTICAL = 'La foto es vertical: en el flyer ocupa una franja horizontal. Con «Ajustar recorte» eliges qué parte se ve.';

const aBlob = (lienzo: HTMLCanvasElement, calidad: number) =>
  new Promise<Blob | null>((resolver) => lienzo.toBlob(resolver, 'image/jpeg', calidad));

// Revisa la foto y la deja lista para subir; el aviso (si hay) es algo que conviene decirle al admin sin frenarlo.
// Una foto que ya cabe se sube tal cual; si no, se redibuja reducida en JPEG (sobre el marino del flyer, por si traía
// transparencias) y la rotación del teléfono ya viene aplicada por el navegador.
export async function prepararFoto(archivo: File): Promise<{ archivo: File; aviso: string | null }> {
  revisarArchivo(archivo);
  let imagen: ImageBitmap;
  try {
    imagen = await createImageBitmap(archivo);
  } catch {
    throw new Error(NO_SE_LEE);
  }
  try {
    revisarMedidas(imagen.width, imagen.height);
    const aviso = imagen.height > imagen.width ? VERTICAL : null;
    const { ancho, alto } = medidasReducidas(imagen.width, imagen.height);
    if (archivo.size <= MAX_SUBIDA && ancho === imagen.width && alto === imagen.height) return { archivo, aviso };

    const lienzo = document.createElement('canvas');
    lienzo.width = ancho;
    lienzo.height = alto;
    const ctx = lienzo.getContext('2d');
    if (!ctx) throw new Error(NO_SE_LEE);
    ctx.fillStyle = '#081226';
    ctx.fillRect(0, 0, ancho, alto);
    ctx.drawImage(imagen, 0, 0, ancho, alto);
    let blob = await aBlob(lienzo, 0.88);
    if (blob && blob.size > MAX_SUBIDA) blob = await aBlob(lienzo, 0.7);
    if (!blob || blob.size > MAX_SUBIDA) throw new Error('La foto pesa demasiado aun reducida. Prueba con otra.');
    return { archivo: new File([blob], archivo.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' }), aviso };
  } finally {
    imagen.close?.();
  }
}
