import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ConfirmationModal } from '@/shared/ui/ConfirmationModal';
import {
  ajustarFotoPremio, clavePremios, elegirPremiado, quitarFotoPremio, subirFotoPremio, type Encuadre, type FiguraFlyer, type PremiosDeCategoria,
  type TipoPremio,
} from '../api/flyers.api';
import { etiquetaCandidato, PREMIOS } from '../textosPremio';
import { ControlesDeFoto, mensaje } from './ControlesDeFoto';
import type { Formato } from './Flyer';
import { aspectoDeLaFoto } from './FlyerPodio';
import { Selector } from './Selector';

// El encuadre del premio que se está ajustando y todavía no se guarda: el flyer lo muestra en vivo. Lleva al jugador
// porque la foto es suya: si el admin elige a otro, el borrador no le toca.
export interface BorradorPremio {
  tipo: TipoPremio;
  id_categoria: number;
  id_jugador: number;
  encuadre: Encuadre;
}

// Debajo del flyer de un premio: el jugador (entre los que tienen estadísticas en la final) y su foto. Solo el
// super_admin llega al estudio; el servidor lo vuelve a exigir.
export function AccionesPremio({ idTorneo, tipo, premio, figura, formato, borrador, alBorrador }: {
  idTorneo: number;
  tipo: TipoPremio;
  premio: PremiosDeCategoria;
  figura: FiguraFlyer; // el jugador que lleva el flyer: el elegido o, mientras no se elige, el sugerido
  formato: Formato;
  borrador: BorradorPremio | null;
  alBorrador: (b: BorradorPremio | null) => void;
}) {
  const clientes = useQueryClient();
  const idCategoria = premio.categoria.id_categoria;
  const jugador = figura.jugador;
  const guardado = premio.premios[tipo];
  const foto = guardado?.foto ?? null;
  const editando = borrador && borrador.tipo === tipo && borrador.id_categoria === idCategoria && borrador.id_jugador === jugador.id_jugador ? borrador : null;
  const [cambio, setCambio] = useState<FiguraFlyer | null>(null); // a quien se quiere cambiar, a la espera de confirmar
  const refrescar = () => clientes.invalidateQueries({ queryKey: clavePremios(idTorneo) });

  const elegir = useMutation({
    mutationFn: (idJugador: number) => elegirPremiado(idCategoria, tipo, idJugador),
    onSuccess: async () => {
      await refrescar();
      alBorrador(null);
      toast.success('Jugador guardado.');
    },
    onError: (e) => toast.error(mensaje(e)),
  });

  // Cambiar de jugador borra la foto del anterior: si hay una, se confirma antes de perderla
  function cambiar(valor: string) {
    const nuevo = premio.candidatos[tipo].find((f) => String(f.jugador.id_jugador) === valor);
    if (!nuevo || nuevo.jugador.id_jugador === jugador.id_jugador) return;
    if (foto) setCambio(nuevo);
    else elegir.mutate(nuevo.jugador.id_jugador);
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Selector
          id={`premio-${tipo}-${idCategoria}`}
          texto="Jugador del premio"
          valor={String(jugador.id_jugador)}
          alCambiar={cambiar}
          deshabilitado={elegir.isPending}
        >
          {premio.candidatos[tipo].map((f, i) => (
            <option key={f.jugador.id_jugador} value={f.jugador.id_jugador}>
              {etiquetaCandidato(tipo, f)}{i === 0 ? ' (sugerido)' : ''}
            </option>
          ))}
        </Selector>
        <p className="text-xs text-slate-400">{guardado ? 'Elegido por ti. Cambiar de jugador borra la foto del premio.' : PREMIOS[tipo].sinElegir}</p>
      </div>

      <ControlesDeFoto
        foto={foto}
        etiquetaArchivo={`Foto de ${jugador.nombre}`}
        estado={
          foto
            ? 'El flyer lleva la foto que subiste para el premio.'
            : jugador.url_foto
              ? 'El flyer lleva la foto de su ficha. Sube la del premio y la reemplaza.'
              : 'Sin foto: el flyer lleva la silueta del jugador con su dorsal.'
        }
        descripcionQuitar={`Se borra la foto del premio de ${jugador.nombre} y el flyer vuelve a llevar la de su ficha.`}
        aspecto={aspectoDeLaFoto(formato)}
        encuadre={editando?.encuadre ?? null}
        alEncuadre={(encuadre) => alBorrador(encuadre && { tipo, id_categoria: idCategoria, id_jugador: jugador.id_jugador, encuadre })}
        subir={async (archivo) => {
          if (!guardado) await elegirPremiado(idCategoria, tipo, jugador.id_jugador); // sin haber elegido, se guarda al sugerido
          return subirFotoPremio(idCategoria, tipo, archivo);
        }}
        ajustar={(encuadre) => ajustarFotoPremio(idCategoria, tipo, encuadre)}
        quitar={() => quitarFotoPremio(idCategoria, tipo)}
        refrescar={refrescar}
      />

      {cambio && (
        <ConfirmationModal
          title="¿Cambiar de jugador?"
          description={`La foto del premio es de ${jugador.nombre} y se borra al cambiar de jugador: tendrás que subir la de ${cambio.jugador.nombre}.`}
          isDangerous
          onConfirm={() => {
            elegir.mutate(cambio.jugador.id_jugador);
            setCambio(null);
          }}
          onCancel={() => setCambio(null)}
        />
      )}
    </div>
  );
}
