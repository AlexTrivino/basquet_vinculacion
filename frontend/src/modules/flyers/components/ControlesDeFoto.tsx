import { useRef, useState } from 'react';
import { isAxiosError } from 'axios';
import { useMutation } from '@tanstack/react-query';
import { ImagePlus, Loader2, Move, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { FotoDelPodio } from '@/modules/partidos';
import { ConfirmationModal } from '@/shared/ui/ConfirmationModal';
import type { Encuadre } from '../api/flyers.api';
import { ACEPTA, CENTRADO, encuadreDe, prepararFoto } from '../foto';
import { EditorEncuadre } from './EditorEncuadre';

export function mensaje(e: unknown) {
  if (isAxiosError(e)) return e.response?.data?.message ?? 'No se pudo completar la acción. Revisa la conexión e inténtalo de nuevo.';
  return e instanceof Error ? e.message : 'No se pudo guardar la foto.';
}

export const boton =
  'inline-flex items-center justify-center gap-2 rounded-lg border border-white/25 px-3 py-2 text-sm font-semibold text-white transition-colors duration-150 hover:bg-white/10 active:scale-[0.98] disabled:opacity-50';

// Subir, cambiar o quitar una foto y ajustar su recorte: lo que tienen en común la foto del podio y la del premio.
// Quien lo usa pone las llamadas al servidor (`subir`, `ajustar`, `quitar`, que fallan con el error de axios y salen
// como aviso), lo que se refresca al terminar y el borrador del encuadre (`encuadre`: el que se está ajustando y
// todavía no se guarda, o null con el editor cerrado), que el flyer de arriba muestra en vivo.
export function ControlesDeFoto({ foto, etiquetaArchivo, estado, descripcionQuitar, aspecto, limpia, encuadre, alEncuadre, subir, ajustar, quitar, refrescar }: {
  foto: FotoDelPodio | null;
  etiquetaArchivo: string; // nombre accesible del selector de archivos
  estado: string; // qué foto lleva el flyer ahora
  descripcionQuitar: string; // lo que dice la confirmación de quitarla
  aspecto: number; // ancho / alto del marco de la foto en el flyer
  limpia?: boolean; // la foto no se desvanece en el flyer: nada la pisa
  encuadre: Encuadre | null;
  alEncuadre: (e: Encuadre | null) => void;
  subir: (archivo: File) => Promise<unknown>;
  ajustar: (e: Encuadre) => Promise<unknown>;
  quitar: () => Promise<unknown>;
  refrescar: () => Promise<unknown>;
}) {
  const entrada = useRef<HTMLInputElement>(null);
  const [confirmando, setConfirmando] = useState(false);

  const subirFoto = useMutation({
    mutationFn: async (archivo: File) => {
      const { archivo: listo, aviso } = await prepararFoto(archivo);
      if (aviso) toast.info(aviso);
      return subir(listo);
    },
    // Una foto nueva entra centrada: se abre el editor para que el admin la acomode
    onSuccess: async () => {
      await refrescar();
      alEncuadre(CENTRADO);
      toast.success('Foto guardada. Ajusta el recorte si hace falta.');
    },
    onError: (e) => toast.error(mensaje(e)),
  });
  const ajustarFoto = useMutation({
    mutationFn: ajustar,
    onSuccess: async () => {
      await refrescar();
      alEncuadre(null);
      toast.success('Encuadre guardado.');
    },
    onError: (e) => toast.error(mensaje(e)),
  });
  const quitarFoto = useMutation({
    mutationFn: quitar,
    onSuccess: async () => {
      await refrescar();
      alEncuadre(null);
      toast.success('Foto eliminada.');
    },
    onError: (e) => toast.error(mensaje(e)),
  });
  const ocupado = subirFoto.isPending || quitarFoto.isPending;

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-400">{estado}</p>
      <div className="flex flex-wrap gap-2">
        <input
          ref={entrada}
          type="file"
          accept={ACEPTA}
          hidden
          aria-label={etiquetaArchivo}
          onChange={(e) => {
            const archivo = e.target.files?.[0];
            e.target.value = ''; // elegir la misma foto otra vez tiene que volver a disparar el cambio
            if (archivo) subirFoto.mutate(archivo);
          }}
        />
        <button type="button" onClick={() => entrada.current?.click()} disabled={ocupado} className={boton}>
          {subirFoto.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ImagePlus className="h-4 w-4" aria-hidden="true" />}
          {subirFoto.isPending ? 'Subiendo…' : foto ? 'Cambiar foto' : 'Subir foto'}
        </button>
        {foto && (
          <>
            <button type="button" aria-pressed={!!encuadre} onClick={() => alEncuadre(encuadre ? null : encuadreDe(foto))} disabled={ocupado} className={boton}>
              <Move className="h-4 w-4" aria-hidden="true" />
              Ajustar recorte
            </button>
            <button type="button" onClick={() => setConfirmando(true)} disabled={ocupado} className={boton}>
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Quitar foto
            </button>
          </>
        )}
      </div>
      {encuadre && foto && (
        <EditorEncuadre
          foto={foto}
          encuadre={encuadre}
          aspecto={aspecto}
          limpia={limpia}
          guardando={ajustarFoto.isPending}
          alCambiar={alEncuadre}
          alGuardar={() => ajustarFoto.mutate(encuadre)}
          alCancelar={() => alEncuadre(null)}
        />
      )}
      {confirmando && (
        <ConfirmationModal
          title="¿Quitar la foto?"
          description={descripcionQuitar}
          isDangerous
          onConfirm={() => {
            setConfirmando(false);
            quitarFoto.mutate();
          }}
          onCancel={() => setConfirmando(false)}
        />
      )}
    </div>
  );
}
