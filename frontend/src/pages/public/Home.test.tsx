import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Home from './Home';
import { getTorneos } from '../../features/torneos/api/torneos.api';
import { getPartidos } from '../../features/partidos/api/partidos.api';
import { getEquipos } from '../../features/equipos/api/equipos.api';
import { getPatrocinadores } from '../../features/patrocinadores/api/patrocinadores.api';
import { getEstadisticasPublicas } from '../../features/estadisticas/api/estadisticas.api';

vi.mock('../../features/torneos/api/torneos.api');
vi.mock('../../features/partidos/api/partidos.api');
vi.mock('../../features/equipos/api/equipos.api');
vi.mock('../../features/patrocinadores/api/patrocinadores.api');
vi.mock('../../features/estadisticas/api/estadisticas.api');
vi.mock('@google/model-viewer', () => ({}));
vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ userRole: null }) }));

const torneos = [
  { id_torneo: 1, nombre: 'Copa Verano Manta 2026', fecha_inicio: '2026-06-01', fecha_fin: '2026-08-30', estado: 'en_curso', categorias: [{ id_categoria: 10, nombre_categoria: 'Senior Libre' }] },
  { id_torneo: 2, nombre: 'Liga Provincial 2024', fecha_inicio: '2024-04-15', fecha_fin: '2024-09-01', estado: 'finalizado', categorias: [] },
];

const partidoFinalizado = {
  id_partido: 101, estado: 'finalizado', marcador_local: 70, marcador_visitante: 82, fase: 'Final', fecha: '2024-08-30',
  torneo: { id_torneo: 2 }, categoria: { nombre_categoria: 'Senior Libre' },
  equipo_local: { id_equipo: 1, nombre_equipo: 'Delfines BC' },
  equipo_visitante: { id_equipo: 2, nombre_equipo: 'Portoviejo Stars' },
};

const partidoProgramado = {
  id_partido: 102, estado: 'programado', marcador_local: 0, marcador_visitante: 0, fase: 'Jornada 1', fecha: '2099-01-10', hora: '19:00:00',
  torneo: { id_torneo: 1 }, equipo_local: { id_equipo: 3, nombre_equipo: 'Manta Bulls' }, equipo_visitante: { id_equipo: 4, nombre_equipo: 'Tiburones de Manta' },
};

function renderHome() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Home />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

describe('Home (página de inicio)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Element.prototype.scrollIntoView = vi.fn(); // jsdom no lo implementa
    vi.mocked(getEstadisticasPublicas).mockResolvedValue({ success: true, message: '', data: { puntos_totales: 15230 } } as never);
    vi.mocked(getTorneos).mockResolvedValue({ success: true, message: '', data: torneos, pagination: { page: 1, per_page: 50, total: 2, pages: 1 } } as never);
    vi.mocked(getEquipos).mockResolvedValue({ success: true, message: '', data: [], pagination: { page: 1, per_page: 1, total: 7, pages: 7 } } as never);
    vi.mocked(getPatrocinadores).mockResolvedValue([{ id_patrocinador: 1, nombre_patrocinador: 'Nike Ecuador', url_logo_patrocinador: '/n.png' }] as never);
    vi.mocked(getPartidos).mockImplementation(async (params) => {
      if (params?.estados === 'programado') return { success: true, message: '', data: [partidoProgramado] } as never;
      // per_page 1 es el conteo de "Conócenos"; la sección de partidos pide páginas de 50
      if (params?.per_page === 1)
        return { success: true, message: '', data: [partidoFinalizado], pagination: { page: 1, per_page: 1, total: 12, pages: 12 } } as never;
      return { success: true, message: '', data: [partidoFinalizado], pagination: { page: 1, per_page: 50, total: 1, pages: 1 } } as never;
    });
  });

  it('arma las secciones en el orden pedido', async () => {
    const { container } = renderHome();

    expect(screen.getByRole('heading', { level: 1, name: /Torneos Baloncesto Manta/i })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Nuestros auspiciantes' })).toBeInTheDocument();

    const orden = [...container.querySelectorAll('main > section[id], main > footer[id]')].map((el) => el.id);
    expect(orden).toEqual(['inicio', 'auspiciantes', 'conocenos', 'partidos', 'unete', 'contacto']);
    expect(screen.getByRole('link', { name: '+593 98 962 9870' })).toHaveAttribute('href', 'tel:+593989629870');
  });

  it('el carrusel del hero pasa al siguiente torneo al completar los 10 s', async () => {
    renderHome();

    expect(await screen.findByRole('heading', { level: 2, name: 'Copa Verano Manta 2026' })).toBeInTheDocument();
    // jsdom no define AnimationEvent, así que React escucha la variante con prefijo webkit
    fireEvent(screen.getByTestId('progreso-carrusel'), new Event('webkitAnimationEnd', { bubbles: true }));
    expect(await screen.findByRole('heading', { level: 2, name: 'Liga Provincial 2024' })).toBeInTheDocument();
  });

  it('muestra juntos los próximos partidos y los resultados, con el ganador marcado', async () => {
    renderHome();

    const seccion = document.getElementById('partidos') as HTMLElement;
    expect(await within(seccion).findByText('Manta Bulls')).toBeInTheDocument();
    expect(await within(seccion).findByText('70')).toBeInTheDocument();
    expect(within(seccion).getByText('82')).toBeInTheDocument();
    // La cinta GANADOR va sobre el visitante, que ganó 82-70
    const cinta = within(seccion)
      .getAllByText('GANADOR')
      .find((el) => el.tagName === 'SPAN' && el.getAttribute('aria-hidden') !== 'true');
    expect(cinta?.parentElement).toHaveTextContent('Portoviejo Stars');
  });

  it('muestra 4 partidos y despliega el resto con "Ver más partidos" y "Ver menos"', async () => {
    const programados = Array.from({ length: 6 }, (_, i) => ({ ...partidoProgramado, id_partido: 200 + i }));
    vi.mocked(getPartidos).mockImplementation(async (params) => {
      if (params?.estados === 'programado') return { success: true, message: '', data: programados } as never;
      return { success: true, message: '', data: [partidoFinalizado], pagination: { page: 1, per_page: 50, total: 1, pages: 1 } } as never;
    });
    renderHome();

    const seccion = document.getElementById('partidos') as HTMLElement;
    await within(seccion).findByRole('button', { name: 'Ver más partidos' });
    expect(seccion.querySelectorAll('[data-indice]')).toHaveLength(4);

    fireEvent.click(within(seccion).getByRole('button', { name: 'Ver más partidos' }));
    expect(seccion.querySelectorAll('[data-indice]')).toHaveLength(7);
    expect(within(seccion).queryByRole('button', { name: 'Ver más partidos' })).not.toBeInTheDocument();

    fireEvent.click(within(seccion).getByRole('button', { name: 'Ver menos' }));
    expect(seccion.querySelectorAll('[data-indice]')).toHaveLength(4);
  });

  it('el CTA lleva al login cuando no hay sesión y muestra las cifras reales', async () => {
    renderHome();

    expect(screen.getByRole('link', { name: 'Inscribir a mi equipo' })).toHaveAttribute('href', '/auth/login');
    expect(await screen.findByText('7')).toBeInTheDocument();
    expect(await screen.findByText('12')).toBeInTheDocument();
    expect(await screen.findByText('15.230 puntos anotados hasta ahora')).toBeInTheDocument();
  });
});
