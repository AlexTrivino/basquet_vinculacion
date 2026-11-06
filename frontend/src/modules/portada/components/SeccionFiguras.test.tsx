import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SeccionFiguras } from './SeccionFiguras';
import { getFigurasEnCurso, type FiguraDelTorneo } from '@/modules/estadisticas';

vi.mock('@/modules/estadisticas/api/estadisticas.api');

const linea = { puntos: 0, rebotes: 0, asistencias: 0, tapones: 0, triples: 0, tiros_libres: 0 };
const figura = (id: number, nombre: string, categoria: string, extra: Partial<FiguraDelTorneo> = {}): FiguraDelTorneo => ({
  torneo: { id_torneo: 1, nombre: 'Copa Verano Manta 2026' },
  categoria,
  jugador: { id_jugador: id, nombre, url_foto: null, numero_camiseta: id },
  equipo: { id_equipo: 1, nombre_equipo: 'Delfines BC', url_logo: null },
  partidos: 2,
  linea,
  promedio_puntos: 0,
  valoracion: 10,
  ...extra,
});
const FIGURAS = [
  figura(7, 'ANA MERO', 'Senior Libre (femenino)', { partidos: 1, linea: { ...linea, puntos: 18, rebotes: 6, asistencias: 3 }, valoracion: 27 }),
  figura(8, 'LUIS PONCE', 'Juvenil (masculino)', { linea: { ...linea, puntos: 1, asistencias: 4 } }),
  figura(9, 'JOSÉ VERA', 'Master +40 (masculino)'),
];

function renderSeccion() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <SeccionFiguras />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

const centro = () => screen.getByRole('link', { name: /^Ver a / });
const cargada = () => screen.findByRole('link', { name: /^Ver a / });
const barra = () => screen.getByTestId('progreso-figuras');
// jsdom no define AnimationEvent, así que React escucha la variante con prefijo webkit (como en la prueba del hero)
const terminarBarra = () => fireEvent(barra(), new Event('webkitAnimationEnd', { bubbles: true }));

describe('SeccionFiguras (portada)', () => {
  beforeEach(() => {
    vi.mocked(getFigurasEnCurso).mockResolvedValue({ success: true, message: '', data: FIGURAS } as never);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('muestra al centro la primera figura con su categoría, sus totales en una frase y su valoración', async () => {
    renderSeccion();
    await cargada();
    expect(screen.getByRole('heading', { name: /Figuras del torneo/i })).toBeInTheDocument();
    expect(centro()).toHaveAttribute('href', '/jugadores/7');
    expect(centro()).toHaveAccessibleName('Ver a ANA MERO, figura de Senior Libre (femenino)');
    expect(centro()).toHaveTextContent('Senior Libre (femenino)');
    expect(centro()).toHaveTextContent('18 puntos, 6 rebotes y 3 asistencias en 1 partido');
    expect(centro()).toHaveTextContent('VALORACIÓN 27');
    // Las vecinas se ven, pero solo la del centro es un enlace y la leen los lectores de pantalla
    expect(screen.getAllByRole('link')).toHaveLength(1);
    expect(screen.getAllByRole('group', { hidden: true }).filter((g) => g.getAttribute('aria-hidden'))).toHaveLength(2);
  });

  it('dice los totales sin los que están en 0 y en singular cuando toca', async () => {
    renderSeccion();
    await cargada();
    fireEvent.click(screen.getByRole('button', { name: 'Ver figura de Juvenil (masculino)' }));
    expect(centro()).toHaveTextContent('1 punto y 4 asistencias en 2 partidos');
  });

  it('pasa a la figura siguiente al terminar la barra de 5 s y da la vuelta al final', async () => {
    renderSeccion();
    await cargada();
    expect(barra()).toHaveStyle({ animationPlayState: 'running' });
    terminarBarra();
    expect(centro()).toHaveAttribute('href', '/jugadores/8');
    terminarBarra();
    terminarBarra();
    expect(centro()).toHaveAttribute('href', '/jugadores/7');
  });

  it('las flechas, los puntos y el arrastre llevan a su figura', async () => {
    renderSeccion();
    await cargada();
    fireEvent.click(screen.getAllByRole('button', { name: 'Figura anterior' })[0]);
    expect(centro()).toHaveAttribute('href', '/jugadores/9');
    fireEvent.click(screen.getAllByRole('button', { name: 'Figura siguiente' })[0]);
    expect(centro()).toHaveAttribute('href', '/jugadores/7');
    const punto = screen.getByRole('button', { name: 'Ver figura de Master +40 (masculino)' });
    fireEvent.click(punto);
    expect(punto).toHaveAttribute('aria-current', 'true');
    const pista = centro().closest('[aria-roledescription="diapositiva"]')!.parentElement!;
    fireEvent.pointerDown(pista, { clientX: 300 });
    fireEvent.pointerUp(pista, { clientX: 200 });
    expect(centro()).toHaveAttribute('href', '/jugadores/7');
  });

  it('se pausa con el botón y mientras el foco está adentro', async () => {
    renderSeccion();
    await cargada();
    fireEvent.click(screen.getByRole('button', { name: 'Pausar carrusel' }));
    expect(barra()).toHaveStyle({ animationPlayState: 'paused' });
    const reanudar = screen.getByRole('button', { name: 'Reanudar carrusel' });
    fireEvent.click(reanudar);
    fireEvent.focus(reanudar);
    expect(barra()).toHaveStyle({ animationPlayState: 'paused' }); // el foco adentro la detiene
    fireEvent.blur(reanudar);
    expect(barra()).toHaveStyle({ animationPlayState: 'running' });
  });

  it('con movimiento reducido arranca en pausa', async () => {
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: q.includes('reduce'), addEventListener() {}, removeEventListener() {} }));
    renderSeccion();
    await cargada();
    expect(screen.getByRole('button', { name: 'Reanudar carrusel' })).toBeInTheDocument();
    expect(barra()).toHaveStyle({ animationPlayState: 'paused' });
  });

  it('sin figuras la sección no aparece', async () => {
    vi.mocked(getFigurasEnCurso).mockResolvedValue({ success: true, message: '', data: [] } as never);
    const { container } = renderSeccion();
    await vi.waitFor(() => expect(vi.mocked(getFigurasEnCurso)).toHaveBeenCalled());
    await vi.waitFor(() => expect(container.querySelector('#figuras')).toBeNull());
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  });

  it('si la API falla avisa y deja reintentar', async () => {
    vi.mocked(getFigurasEnCurso).mockRejectedValueOnce(new Error('sin red'));
    renderSeccion();
    fireEvent.click(await screen.findByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByRole('link', { name: /^Ver a ANA MERO/ })).toBeInTheDocument();
  });
});
