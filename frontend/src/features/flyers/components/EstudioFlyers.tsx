import { useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronDown, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { getPartidosByTorneo, getTorneosAdmin } from '../../torneos/api/torneos.api';
import { getDatosFlyers, type DatosFlyers, type FiguraFlyer } from '../api/flyers.api';
import {
  DESEMPATE, diaSemana, ESTADISTICAS, fechaCartel, filaDePartido, textoFigura, textoFiguras, textoLideres, textoPartidos, topJugadores,
  VALORACION,
} from '../textos';
import { FichaFigura, FichaLider, FORMATOS, HeroeFigura, ListaFiguras, type Formato } from './Flyer';
import { archivo, Laminas, paginasDeLaFecha, trocear, type Pagina } from './Laminas';
import type { Partido } from '../../../types/api.types';

type Tipo = 'partidos' | 'lideres' | 'figura-fecha' | 'categoria' | 'equipo';
const TIPOS: { valor: Tipo; texto: string }[] = [
  { valor: 'partidos', texto: 'Partidos de la fecha' },
  { valor: 'lideres', texto: 'Líderes' },
  { valor: 'figura-fecha', texto: 'Figura de la fecha' },
  { valor: 'categoria', texto: 'Figuras por categoría' },
  { valor: 'equipo', texto: 'Figura por equipo' },
];
type Alcance = 'fecha' | 'torneo';
const ALCANCES: { valor: Alcance; texto: string }[] = [
  { valor: 'fecha', texto: 'De la fecha' },
  { valor: 'torneo', texto: 'Del torneo' },
];

interface Armado {
  paginas: Pagina[];
  texto: string;
}
const NADA: Armado = { paginas: [], texto: '' };
const largo = (f: string) => format(parseISO(f), "EEEE d 'de' MMMM", { locale: es });

// Partidos de una fecha, del calendario del torneo: horas si están por jugarse, marcadores si ya se jugaron
// (con la figura de cada partido cuando el panel la tiene)
function armarPartidos(fecha: string, partidos: Partido[], datos: DatosFlyers | undefined, formato: Formato): Armado {
  const figuras = new Map((datos?.fecha === fecha ? datos.resultados : []).map((r) => [r.id_partido, r.figura]));
  const filas = partidos
    .filter((p) => p.fecha === fecha && p.estado !== 'anulado')
    .map((p) => ({ ...filaDePartido(p), figura: figuras.get(p.id_partido ?? 0) ?? null }))
    .sort((a, b) => (a.hora ?? '99').localeCompare(b.hora ?? '99'));
  const paginas = paginasDeLaFecha(fecha, filas, formato);
  return { paginas, texto: paginas.length ? textoPartidos(fecha, filas) : '' };
}

// Líderes: una lámina suelta por estadística (mayor encestador, triplista, rebotero…) con el 1.º como héroe
function armarLideres(datos: DatosFlyers, alcance: Alcance, categoria: string, formato: Formato): Armado {
  const fecha = alcance === 'fecha' ? datos.fecha : datos.fechas[0];
  if (!fecha) return NADA;
  const idCategoria = categoria === 'todas' ? undefined : Number(categoria);
  const jugadores = alcance === 'fecha' ? datos.jugadores_fecha : datos.jugadores_torneo;
  const lideres = ESTADISTICAS.map((e) => ({ estadistica: e, top: topJugadores(jugadores, e.clave, idCategoria) })).filter((l) => l.top.length);
  const dato = alcance === 'fecha' ? ([diaSemana(fecha), fechaCartel(fecha)] as const) : (['Acumulado', fechaCartel(fecha)] as const);
  const paginas: Pagina[] = lideres.map(({ estadistica: e, top: [lider, ...siguen] }) => ({
    titulo: e.titulo,
    dato,
    cifra: ['Valoración', lider.valoracion],
    formula: siguen.some((f) => f.linea[e.clave] === lider.linea[e.clave]) ? DESEMPATE : VALORACION,
    suelta: true,
    heroe: <HeroeFigura figura={lider} formato={formato} />,
    cuerpo: (
      <FichaLider
        lider={lider}
        valor={lider.linea[e.clave]}
        unidad={lider.linea[e.clave] === 1 ? e.unidad[0] : e.unidad[1]}
        siguen={siguen.map((f) => ({ figura: f, valor: f.linea[e.clave] }))}
      />
    ),
    archivo: archivo(e.clave, alcance === 'fecha' ? fecha : 'torneo', idCategoria),
  }));
  const nombreCategoria = datos.figuras_categoria.find((f) => f.id_categoria === idCategoria)?.categoria;
  const encabezado = [
    alcance === 'fecha' ? `Líderes del ${largo(fecha)}` : `Líderes del torneo al ${format(parseISO(fecha), "d 'de' MMMM", { locale: es })}`,
    nombreCategoria,
  ].filter(Boolean).join(' · ');
  return { paginas, texto: paginas.length ? textoLideres(encabezado, lideres.map((l) => ({ estadistica: l.estadistica, figura: l.top[0] }))) : '' };
}

// Figura de la fecha, de una categoría o de un equipo, y la lista de figuras por categoría
function armarFiguras(datos: DatosFlyers, tipo: Tipo, formato: Formato, categoria: string, equipo: string): Armado {
  const fecha = datos.fecha;
  if (!fecha) return NADA;
  const acumulado = ['Acumulado', fechaCartel(fecha)] as const;
  const unaFigura = (f: FiguraFlyer, titulo: Pagina['titulo'], dato: Pagina['dato'], encabezado: string, nombre?: string | null): Armado => ({
    paginas: [{
      titulo, dato, cifra: ['Valoración', f.valoracion], formula: VALORACION,
      heroe: <HeroeFigura figura={f} formato={formato} />,
      cuerpo: <FichaFigura figura={f} />,
      archivo: archivo('figura', nombre ?? undefined, fecha),
    }],
    texto: textoFigura(encabezado, f),
  });

  if (tipo === 'figura-fecha') {
    const f = datos.figura_fecha;
    return f ? unaFigura(f, ['Figura', 'de la', 'Fecha'], [diaSemana(fecha), fechaCartel(fecha)], 'Figura de la fecha') : NADA;
  }
  if (tipo === 'categoria') {
    if (categoria === 'todas') {
      const trozos = trocear(datos.figuras_categoria, FORMATOS[formato].figuras);
      return {
        paginas: trozos.map((trozo, i) => ({
          titulo: ['Figuras', 'del', 'Torneo'],
          dato: acumulado,
          cifra: ['Categorías', datos.figuras_categoria.length],
          gancho: 'La mejor valoración de cada categoría',
          formula: VALORACION,
          cuerpo: <ListaFiguras figuras={trozo} />,
          archivo: archivo('figuras-categorias', fecha, trozos.length > 1 ? i + 1 : undefined),
        })),
        texto: textoFiguras(fecha, datos.figuras_categoria),
      };
    }
    const f = datos.figuras_categoria.find((x) => String(x.id_categoria) === categoria);
    return f ? unaFigura(f, ['Figura', 'de la', 'Categoría'], acumulado, `Figura de ${f.categoria}`, f.categoria) : NADA;
  }
  const f = datos.figuras_equipo.find((x) => `${x.equipo?.id_equipo}-${x.id_categoria}` === equipo);
  return f ? unaFigura(f, ['Figura', 'del', 'Equipo'], acumulado, `Figura de ${f.equipo?.nombre_equipo} en ${f.categoria}`, f.equipo?.nombre_equipo) : NADA;
}

const etiqueta = 'mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-400';
const selector =
  'block w-full cursor-pointer appearance-none rounded-lg border border-white/15 bg-marino py-2.5 pl-3 pr-9 text-sm font-semibold text-crema transition-colors hover:border-oro/50 disabled:cursor-not-allowed disabled:opacity-50';

function Selector({ id, texto, valor, alCambiar, children, deshabilitado }: {
  id: string; texto: string; valor: string; alCambiar: (v: string) => void; children: ReactNode; deshabilitado?: boolean;
}) {
  return (
    <div>
      <label htmlFor={id} className={etiqueta}>{texto}</label>
      <div className="relative">
        <select id={id} value={valor} onChange={(e) => alCambiar(e.target.value)} disabled={deshabilitado} className={selector}>
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-oro" aria-hidden="true" />
      </div>
    </div>
  );
}

function Segmentos<T extends string>({ texto, opciones, valor, alCambiar }: {
  texto: string; opciones: { valor: T; texto: string }[]; valor: T; alCambiar: (v: T) => void;
}) {
  return (
    <fieldset>
      <legend className={etiqueta}>{texto}</legend>
      <div className="grid grid-cols-2 gap-1 rounded-lg border border-white/10 bg-marino p-1">
        {opciones.map((o) => (
          <button
            key={o.valor}
            type="button"
            aria-pressed={o.valor === valor}
            onClick={() => alCambiar(o.valor)}
            className={`rounded-md px-3 py-2 text-left text-sm font-semibold transition-colors duration-200 ${
              o.valor === valor ? 'bg-white/10 text-crema ring-1 ring-oro/40' : 'text-slate-300 hover:bg-white/5 hover:text-white'
            }`}
          >
            {o.texto}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

const fechaOpcion = (f: string) => format(parseISO(f), "EEE d 'de' MMM yyyy", { locale: es });

export function EstudioFlyers() {
  const { data: torneosRes } = useQuery({ queryKey: ['torneos_admin'], queryFn: () => getTorneosAdmin(1, 100) });
  const torneos = torneosRes?.data ?? [];
  const [elegido, setElegido] = useState(0);
  const actual = torneos.find((t) => t.estado === 'en_curso') ?? torneos.find((t) => t.estado === 'programado');
  const idTorneo = elegido || (actual?.id_torneo ?? actual?.id ?? 0);

  const [tipo, setTipo] = useState<Tipo>('partidos');
  const [formato, setFormato] = useState<Formato>('feed');
  const [fecha, setFecha] = useState('');
  const [alcance, setAlcance] = useState<Alcance>('fecha');
  const [categoria, setCategoria] = useState('todas');
  const [equipo, setEquipo] = useState('');

  const flyers = useQuery({
    queryKey: ['flyers', idTorneo, fecha],
    queryFn: () => getDatosFlyers(idTorneo, fecha),
    enabled: idTorneo > 0,
  });
  // El calendario del torneo (misma clave que la vista pública): de ahí salen los partidos por jugar
  const calendario = useQuery({
    queryKey: ['torneos', String(idTorneo), 'partidos', undefined],
    queryFn: () => getPartidosByTorneo(idTorneo, 1, 1000),
    enabled: idTorneo > 0 && tipo === 'partidos',
  });
  const datos = flyers.data?.data;
  const partidos = (calendario.data?.data ?? []).filter((p) => p.estado !== 'anulado' && p.fecha);

  // Partidos de la fecha: por defecto hoy, si no la próxima fecha con partidos, si no la última
  const fechasPartidos = [...new Set(partidos.map((p) => p.fecha as string))].sort().reverse();
  const hoy = format(new Date(), 'yyyy-MM-dd');
  const fechaPartidos = fecha || (fechasPartidos.includes(hoy) ? hoy : [...fechasPartidos].reverse().find((f) => f > hoy) ?? fechasPartidos[0] ?? '');

  const equipoActual = equipo || (datos?.figuras_equipo[0] ? `${datos.figuras_equipo[0].equipo?.id_equipo}-${datos.figuras_equipo[0].id_categoria}` : '');
  const { paginas, texto } =
    tipo === 'partidos' ? (fechaPartidos ? armarPartidos(fechaPartidos, partidos, datos, formato) : NADA)
    : !datos ? NADA
    : tipo === 'lideres' ? armarLideres(datos, alcance, categoria, formato)
    : armarFiguras(datos, tipo, formato, categoria, equipoActual);

  const cargando = tipo === 'partidos' ? calendario.isLoading : flyers.isLoading;
  const error = tipo === 'partidos' ? calendario.isError : flyers.isError;
  const reintentar = () => (tipo === 'partidos' ? calendario.refetch() : flyers.refetch());
  const vacio =
    tipo === 'partidos' ? (fechasPartidos.length ? 'No hay partidos en esta fecha.' : 'Este torneo todavía no tiene partidos programados.')
    : !datos?.fecha ? 'Este torneo todavía no tiene partidos jugados.'
    : tipo === 'figura-fecha' ? 'Los partidos de esta fecha no tienen estadísticas cargadas, así que no hay figura.'
    : tipo === 'lideres' && alcance === 'fecha' ? 'Los partidos de esta fecha no tienen estadísticas cargadas.'
    : 'Todavía no hay estadísticas cargadas en este torneo.';
  const usaFecha = tipo === 'partidos' || tipo === 'figura-fecha' || (tipo === 'lideres' && alcance === 'fecha');
  const usaCategoria = tipo === 'categoria' || tipo === 'lideres';

  async function copiarTexto() {
    try {
      await navigator.clipboard.writeText(texto);
      toast.success('Texto copiado. Pégalo como descripción de la publicación.');
    } catch {
      toast.error('No se pudo copiar el texto.');
    }
  }

  return (
    <section aria-labelledby="titulo-flyers" className="rounded-xl border border-oro/25 bg-marino-claro/80 shadow-[0_20px_25px_-5px_rgb(0_0_0/0.3)]">
      <div className="border-b border-white/10 px-5 py-4 sm:px-6">
        <h2 id="titulo-flyers" className="font-display text-2xl font-bold text-crema">Flyers para redes y estados</h2>
        <p className="mt-1 text-sm text-slate-400">Partidos, líderes y figuras listos para publicar, con los datos cargados en el sistema.</p>
      </div>

      <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[minmax(0,19rem)_minmax(0,1fr)]">
        <div className="space-y-5">
          <Selector id="flyer-torneo" texto="Torneo" valor={String(idTorneo)} alCambiar={(v) => { setElegido(Number(v)); setFecha(''); }}>
            {torneos.map((t) => (
              <option key={t.id_torneo ?? t.id} value={t.id_torneo ?? t.id}>
                {t.nombre ?? t.nombre_torneo} ({t.estado.replace('_', ' ')})
              </option>
            ))}
          </Selector>
          <Segmentos texto="Flyer" opciones={TIPOS} valor={tipo} alCambiar={setTipo} />
          {tipo === 'lideres' && <Segmentos texto="Líderes" opciones={ALCANCES} valor={alcance} alCambiar={setAlcance} />}
          {usaFecha && (
            tipo === 'partidos' ? (
              <Selector id="flyer-fecha" texto="Fecha" valor={fechaPartidos} alCambiar={setFecha} deshabilitado={!fechasPartidos.length}>
                {fechasPartidos.map((f) => (
                  <option key={f} value={f}>{f === hoy ? `Hoy, ${fechaOpcion(f)}` : fechaOpcion(f)}</option>
                ))}
              </Selector>
            ) : (
              <Selector id="flyer-fecha" texto="Fecha" valor={fecha || datos?.fecha || ''} alCambiar={setFecha} deshabilitado={!datos?.fechas.length}>
                {(datos?.fechas ?? []).map((f) => (
                  <option key={f} value={f}>{fechaOpcion(f)}</option>
                ))}
              </Selector>
            )
          )}
          {usaCategoria && (
            <Selector id="flyer-categoria" texto="Categoría" valor={categoria} alCambiar={setCategoria}>
              <option value="todas">{tipo === 'lideres' ? 'Todas las categorías' : 'Todas (una figura por categoría)'}</option>
              {(datos?.figuras_categoria ?? []).map((f) => (
                <option key={f.id_categoria} value={f.id_categoria}>{f.categoria}</option>
              ))}
            </Selector>
          )}
          {tipo === 'equipo' && (
            <Selector id="flyer-equipo" texto="Equipo" valor={equipoActual} alCambiar={setEquipo} deshabilitado={!datos?.figuras_equipo.length}>
              {(datos?.figuras_equipo ?? []).map((f) => {
                const clave = `${f.equipo?.id_equipo}-${f.id_categoria}`;
                return <option key={clave} value={clave}>{f.equipo?.nombre_equipo} · {f.categoria}</option>;
              })}
            </Selector>
          )}
          <Segmentos
            texto="Formato"
            opciones={(Object.keys(FORMATOS) as Formato[]).map((f) => ({ valor: f, texto: FORMATOS[f].etiqueta }))}
            valor={formato}
            alCambiar={setFormato}
          />
          <p className="text-xs leading-relaxed text-slate-400">
            {tipo === 'partidos'
              ? 'Si los partidos de la fecha ya se jugaron, el flyer sale con los marcadores; si no, con las horas.'
              : tipo === 'lideres'
                ? 'Una lámina por estadística: puntos, triples, rebotes, asistencias, tapones y tiros libres. Cada una se publica sola.'
                : 'Figura es la mejor valoración: puntos + rebotes + asistencias + tapones. Por categoría y por equipo se suma todo el torneo; en la fecha, cada partido.'}
          </p>
          {texto && (
            <button
              type="button"
              onClick={copiarTexto}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-white/25 px-4 py-2.5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-white/10 active:scale-[0.98]"
            >
              <Copy className="h-4 w-4" aria-hidden="true" />
              Copiar texto para Instagram
            </button>
          )}
        </div>

        {cargando || !idTorneo ? (
          <div className="aspect-[4/5] w-full max-w-[560px] rounded-xl bg-white/5 motion-safe:animate-pulse" aria-busy="true" />
        ) : error ? (
          <div className="self-start rounded-xl border border-white/10 bg-white/5 p-6 text-sm text-slate-300">
            No pudimos cargar los datos del torneo.
            <button type="button" onClick={() => reintentar()} className="ml-3 rounded-lg border border-white/25 px-3 py-1.5 font-semibold text-white hover:bg-white/10">
              Reintentar
            </button>
          </div>
        ) : paginas.length === 0 ? (
          <div className="self-start rounded-xl border border-white/10 bg-white/5 p-6">
            <p className="font-semibold text-crema">Nada para publicar todavía</p>
            <p className="mt-1 text-sm text-slate-400">{vacio}</p>
          </div>
        ) : (
          <Laminas paginas={paginas} formato={formato} torneo={datos?.torneo.nombre ?? partidos[0]?.torneo?.nombre ?? ''} />
        )}
      </div>
    </section>
  );
}
