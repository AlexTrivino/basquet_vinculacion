import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SeccionPodio } from './SeccionPodio';
import { getPodios, type PodioDeCategoria, type PuestoDelPodio } from '@/modules/partidos';

vi.mock('@/modules/partidos/api/partidos.api');

const equipo = (id: number, nombre: string) => ({ id_equipo: id, nombre_equipo: nombre, url_logo: null });
const JAVIER = equipo(1, 'COLEGIO JAVIER');
const SPELLMAN = equipo(2, 'SPELLMAN');
const ANDINO = equipo(3, 'ANDINO 2.0');
const PIERREGROSSE = equipo(4, 'JULIO PIERREGROSSE');

const puesto = (lugar: 1 | 2 | 3, e: typeof JAVIER, extra: Partial<PuestoDelPodio> = {}): PuestoDelPodio => ({
  lugar, equipo: e, PJ: 6, PG: 4, PP: 2, PF: 300, PC: 250, sellos: [], partido: null, foto: null, url_foto_equipo: null, ...extra,
});
const final = (propio: number, rival: number, contra: typeof JAVIER) => ({ ronda: 'Final', fecha: '2026-11-02', propio, rival, wo: false, equipo_rival: contra });

const MAS40: PodioDeCategoria = {
  categoria: { id_categoria: 9, nombre_categoria: 'INFANTIL +40', genero_categoria: 'masculino' },
  puestos: [
    puesto(1, JAVIER, { PG: 6, PP: 0, PF: 328, PC: 202, sellos: ['invicto'], partido: final(58, 55, SPELLMAN) }),
    puesto(2, SPELLMAN, { PF: 342, PC: 261, sellos: ['mas_puntos'], partido: final(55, 58, JAVIER) }),
    puesto(3, ANDINO, { PG: 2, PP: 4, PF: 258, PC: 331, partido: { ronda: 'Tercer puesto', fecha: '2026-11-02', propio: 52, rival: 44, wo: false, equipo_rival: PIERREGROSSE } }),
  ],
};
const JUVENIL: PodioDeCategoria = {
  categoria: { id_categoria: 3, nombre_categoria: 'Juvenil', genero_categoria: 'femenino' },
  puestos: [puesto(1, ANDINO, { partido: { ...final(20, 0, PIERREGROSSE), wo: true } }), puesto(2, PIERREGROSSE, { partido: { ...final(0, 20, ANDINO), wo: true } })],
};
const TORNEO = { id_torneo: 5, nombre: 'CAMPEONATO NACIONAL INTERCOLEGIAL EXALUMNOS', estado: 'finalizado', fecha_inicio: '2026-10-31', fecha_fin: '2026-11-02' };

function renderSeccion() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <SeccionPodio />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

const responder = (podios: PodioDeCategoria[]) =>
  vi.mocked(getPodios).mockResolvedValue({ success: true, message: '', data: { torneo: podios.length ? TORNEO : null, podios } } as never);
const ficha = () => within(document.querySelector('[aria-live="polite"]') as HTMLElement);

describe('SeccionPodio (portada)', () => {
  beforeEach(() => responder([MAS40]));

  it('arma el podio 2 · 1 · 3 con el campeón bajo el foco', async () => {
    renderSeccion();
    const campeon = await screen.findByRole('button', { name: 'Campeón: COLEGIO JAVIER' });
    expect(screen.getByRole('heading', { name: /Podio del torneo/i })).toBeInTheDocument();
    expect(screen.getByText('CAMPEONATO NACIONAL INTERCOLEGIAL EXALUMNOS')).toBeInTheDocument();
    // las fechas van en un span que no se corta: el texto completo es el del párrafo
    expect(screen.getByText((_, el) => el?.tagName === 'P' && el.textContent === 'INFANTIL +40 (masculino) · 31 oct – 2 nov 2026')).toBeInTheDocument();
    expect(campeon).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Vicecampeón: SPELLMAN' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Tercer lugar: ANDINO 2.0' })).toHaveAttribute('aria-pressed', 'false');
    expect(ficha().getByText('Campeón')).toBeInTheDocument();
    expect(ficha().getByText('COLEGIO JAVIER')).toBeInTheDocument();
    expect(ficha().getByText('Invicto')).toBeInTheDocument();
    expect(ficha().getByText('Final · 2 nov')).toBeInTheDocument();
    expect(ficha().getByText('58 – 55 ante SPELLMAN')).toBeInTheDocument();
    expect(ficha().getByText('328')).toBeInTheDocument();
    expect(ficha().getByRole('link', { name: /Ver el torneo/ })).toHaveAttribute('href', '/torneos/5');
  });

  it('el foco pasa al escalón que se toca, se enfoca o tiene el cursor encima', async () => {
    renderSeccion();
    const vice = await screen.findByRole('button', { name: 'Vicecampeón: SPELLMAN' });
    fireEvent.click(vice);
    expect(vice).toHaveAttribute('aria-pressed', 'true');
    expect(ficha().getByText('Mejor ataque')).toBeInTheDocument();
    expect(ficha().getByText('55 – 58 ante COLEGIO JAVIER')).toBeInTheDocument();

    const tercero = screen.getByRole('button', { name: 'Tercer lugar: ANDINO 2.0' });
    fireEvent.focus(tercero);
    expect(ficha().getByText('Tercer puesto · 2 nov')).toBeInTheDocument();
    expect(ficha().getByText('52 – 44 ante JULIO PIERREGROSSE')).toBeInTheDocument();

    fireEvent.pointerEnter(screen.getByRole('button', { name: 'Campeón: COLEGIO JAVIER' }), { pointerType: 'mouse' });
    expect(ficha().getByText('58 – 55 ante SPELLMAN')).toBeInTheDocument();
  });

  it('con varias categorías se elige el podio y vuelve al campeón; sin tercero, el escalón queda por definir', async () => {
    responder([MAS40, JUVENIL]);
    renderSeccion();
    await screen.findByRole('button', { name: 'Campeón: COLEGIO JAVIER' });
    fireEvent.click(screen.getByRole('button', { name: 'Vicecampeón: SPELLMAN' }));
    fireEvent.click(screen.getByRole('button', { name: 'Juvenil (femenino)' }));
    expect(screen.getByRole('button', { name: 'Juvenil (femenino)' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Campeón: ANDINO 2.0' })).toHaveAttribute('aria-pressed', 'true');
    expect(ficha().getByText('Ganó por W.O. ante JULIO PIERREGROSSE')).toBeInTheDocument();
    expect(screen.getByText('Por definir')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Tercer lugar/ })).not.toBeInTheDocument();
  });

  it('sin llaves cuenta la campaña en la tabla', async () => {
    responder([{ ...MAS40, puestos: [puesto(1, JAVIER, { PJ: 4, PG: 4, PP: 0 })] }]);
    renderSeccion();
    await screen.findByRole('button', { name: 'Campeón: COLEGIO JAVIER' });
    expect(ficha().getByText('1.º de la tabla')).toBeInTheDocument();
    expect(ficha().getByText('4 ganados de 4')).toBeInTheDocument();
  });

  it('avisa cuando todavía no hay podio y cuando la API falla', async () => {
    responder([]);
    const { unmount } = renderSeccion();
    expect(await screen.findByText('El podio aparece cuando se juega la final de una categoría.')).toBeInTheDocument();
    unmount();

    vi.mocked(getPodios).mockRejectedValueOnce(new Error('caída'));
    renderSeccion();
    expect(await screen.findByText(/No pudimos cargar el podio/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText('El podio aparece cuando se juega la final de una categoría.')).toBeInTheDocument();
  });
});
