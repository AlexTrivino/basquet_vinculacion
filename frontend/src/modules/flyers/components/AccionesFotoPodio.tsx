import { useRef, useState } from 'react';
import { isAxiosError } from 'axios';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ImagePlus, Loader2, Move, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { PuestoDelPodio } from '@/modules/partidos';
import { ConfirmationModal } from '@/shared/ui/ConfirmationModal';
import { ajustarFotoPodio, clavePodios, quitarFotoPodio, subirFotoPodio, type Encuadre } from '../api/flyers.api';
import { ACEPTA, CENTRADO, encuadreDe, prepararFoto } from '../foto';
import { EditorEncuadre } from './EditorEncuadre';
import type { Formato } from './Flyer';
import { aspectoDeLaFoto } from './FlyerPodio';

// El encuadre que se está ajustando y todavía no se guarda: el flyer de ese equipo lo muestra en vivo
export interface Borrador {
  id_categoria: number;
  id_equipo: number;
  encuadre: Encuadre;
}

function mensaje(e: unknown) {
  if (isAxiosError(e)) return e.response?.data?.message ?? 'No se pudo completar la acción. Revisa la conexión e inténtalo de nuevo.';
  return e instanceof Error ? e.message : 'No se pudo guardar la foto.';
}

const boton =
  'inline-flex items-center justify-center gap-2 rounded-lg border border-white/25 px-3 py-2 text-sm font-semibold text-white transition-colors duration-150 hover:bg-white/10 active:scale-[0.98] disabled:opacity-50';

// Debajo del flyer de cada puesto: subir, cambiar o quitar la foto y ajustar su recorte. Solo el super_admin llega al
// estudio; el servidor lo vuelve a exigir.
export function AccionesFotoPodio({ idTorneo, idCategoria, puesto, formato, borrador, alBorrador }: {
  idTorneo: number;
  idCategoria: number;
  puesto: PuestoDelPodio;
  formato: Formato;
  borrador: Borrador | null;
  alBorrador: (b: Borrador | null) => void;
}) {
  const clientes = useQueryClient();
  const entrada = useRef<HTMLInputElement>(null);
  const [confirmando, setConfirmando] = useState(false);
  const idEquipo = puesto.equipo.id_equipo;
  const foto = puesto.foto;
  const editando = borrador && borrador.id_categoria === idCategoria && borrador.id_equipo === idEquipo ? borrador : null;
  const refrescar = () => clientes.invalidateQueries({ queryKey: clavePodios(idTorneo) });
  const nuevo = (encuadre: Encuadre): Borrador => ({ id_categoria: idCategoria, id_equipo: idEquipo, encuadre });

  const subir = useMutation({
    mutationFn: async (archivo: File) => {
      const { archivo: listo, aviso } = await prepararFoto(archivo);
      if (aviso) toast.info(aviso);
      return subirFotoPodio(idCategoria, idEquipo, listo);
    },
    // Una foto nueva entra centrada: se abre el editor para que el admin la acomode
    onSuccess: async () => {
      await refrescar();
      alBorrador(nuevo(CENTRADO));
      toast.success('Foto guardada. Ajusta el recorte si hace falta.');
    },
    onError: (e) => toast.error(mensaje(e)),
  });
  const ajustar = useMutation({
    mutationFn: (encuadre: Encuadre) => ajustarFotoPodio(idCategoria, idEquipo, encuadre),
    onSuccess: async () => {
      await refrescar();
      alBorrador(null);
      toast.success('Encuadre guardado.');
    },
    onError: (e) => toast.error(mensaje(e)),
  });
  const quitar = useMutation({
    mutationFn: () => quitarFotoPodio(idCategoria, idEquipo),
    onSuccess: async () => {
      await refrescar();
      alBorrador(null);
      toast.success('Foto eliminada.');
    },
    onError: (e) => toast.error(mensaje(e)),
  });
  const ocupado = subir.isPending || quitar.isPending;

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-400">
        {foto
          ? 'El flyer lleva la foto que subiste.'
          : puesto.url_foto_equipo
            ? 'El flyer lleva la foto del equipo. Sube una para este podio y la reemplaza.'
            : 'Sin foto: el flyer lleva el escudo del equipo.'}
      </p>
      <div className="flex flex-wrap gap-2">
        <input
          ref={entrada}
          type="file"
          accept={ACEPTA}
          hidden
          aria-label={`Foto de ${puesto.equipo.nombre_equipo}`}
          onChange={(e) => {
            const archivo = e.target.files?.[0];
            e.target.value = ''; // elegir la misma foto otra vez tiene que volver a disparar el cambio
            if (archivo) subir.mutate(archivo);
          }}
        />
        <button type="button" onClick={() => entrada.current?.click()} disabled={ocupado} className={boton}>
          {subir.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ImagePlus className="h-4 w-4" aria-hidden="true" />}
          {subir.isPending ? 'Subiendo…' : foto ? 'Cambiar foto' : 'Subir foto'}
        </button>
        {foto && (
          <>
            <button type="button" aria-pressed={!!editando} onClick={() => alBorrador(editando ? null : nuevo(encuadreDe(foto)))} disabled={ocupado} className={boton}>
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
      {editando && foto && (
        <EditorEncuadre
          foto={foto}
          encuadre={editando.encuadre}
          aspecto={aspectoDeLaFoto(formato)}
          guardando={ajustar.isPending}
          alCambiar={(encuadre) => alBorrador(nuevo(encuadre))}
          alGuardar={() => ajustar.mutate(editando.encuadre)}
          alCancelar={() => alBorrador(null)}
        />
      )}
      {confirmando && (
        <ConfirmationModal
          title="¿Quitar la foto?"
          description={`Se borra la foto de ${puesto.equipo.nombre_equipo} en este podio y el flyer vuelve a llevar el escudo. Los demás podios no cambian.`}
          isDangerous
          onConfirm={() => {
            setConfirmando(false);
            quitar.mutate();
          }}
          onCancel={() => setConfirmando(false)}
        />
      )}
    </div>
  );
}
