import { useQueryClient } from '@tanstack/react-query';
import type { PuestoDelPodio } from '@/modules/partidos';
import { ajustarFotoPodio, clavePodios, quitarFotoPodio, subirFotoPodio, type Encuadre } from '../api/flyers.api';
import { ControlesDeFoto } from './ControlesDeFoto';
import type { Formato } from './Flyer';
import { aspectoDeLaFoto } from './FlyerPodio';

// El encuadre que se está ajustando y todavía no se guarda: el flyer de ese equipo lo muestra en vivo
export interface Borrador {
  id_categoria: number;
  id_equipo: number;
  encuadre: Encuadre;
}

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
  const idEquipo = puesto.equipo.id_equipo;
  const editando = borrador && borrador.id_categoria === idCategoria && borrador.id_equipo === idEquipo ? borrador : null;

  return (
    <ControlesDeFoto
      foto={puesto.foto}
      etiquetaArchivo={`Foto de ${puesto.equipo.nombre_equipo}`}
      estado={
        puesto.foto
          ? 'El flyer lleva la foto que subiste.'
          : puesto.url_foto_equipo
            ? 'El flyer lleva la foto del equipo. Sube una para este podio y la reemplaza.'
            : 'Sin foto: el flyer lleva el escudo del equipo.'
      }
      descripcionQuitar={`Se borra la foto de ${puesto.equipo.nombre_equipo} en este podio y el flyer vuelve a llevar el escudo. Los demás podios no cambian.`}
      aspecto={aspectoDeLaFoto(formato)}
      encuadre={editando?.encuadre ?? null}
      alEncuadre={(encuadre) => alBorrador(encuadre && { id_categoria: idCategoria, id_equipo: idEquipo, encuadre })}
      subir={(archivo) => subirFotoPodio(idCategoria, idEquipo, archivo)}
      ajustar={(encuadre) => ajustarFotoPodio(idCategoria, idEquipo, encuadre)}
      quitar={() => quitarFotoPodio(idCategoria, idEquipo)}
      refrescar={() => clientes.invalidateQueries({ queryKey: clavePodios(idTorneo) })}
    />
  );
}
