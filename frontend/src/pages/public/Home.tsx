import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { SponsorsCarousel } from '../../components/SponsorsCarousel';
import { Footer } from '../../components/Footer';
import { HeroTorneos } from '../../features/landing/HeroTorneos';
import { SeccionConocenos } from '../../features/landing/SeccionConocenos';
import { Esquinas, SeccionPartidos } from '../../features/landing/SeccionPartidos';

export default function Home() {
  const navigate = useNavigate();
  const { userRole } = useAuth();

  useEffect(() => {
    const hash = window.location.hash;
    // Si Supabase nos tira aquí con parámetros de recuperación de clave, saltamos a la vista correcta
    if (hash.includes('type=recovery') || hash.includes('error_code=otp_expired')) {
      navigate('/auth/reset-password' + hash, { replace: true });
    }
  }, [navigate]);

  // Los botones del CTA se abren desde el centro al entrar en pantalla (una sola vez) y luego brillan
  const cta = useRef<HTMLElement>(null);
  const [ctaVisible, setCtaVisible] = useState(false);
  useEffect(() => {
    const el = cta.current;
    if (!el || typeof IntersectionObserver === 'undefined') return setCtaVisible(true);
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        setCtaVisible(true);
        obs.disconnect();
      }
    }, { threshold: 0.4 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const enlaceInscripcion = userRole === 'delegado' ? '/delegado/inscripcion' : '/auth/login';

  return (
    <main className="tema-cartel relative isolate overflow-x-clip bg-marino text-slate-100">
      <div aria-hidden="true" className="fondo-logo" />

      <HeroTorneos />

      {/* ─── Auspiciantes: texto 30% · carrusel infinito 70% ─── */}
      <section id="auspiciantes" className="relative z-10 scroll-mt-16 px-4 py-20 sm:px-6 lg:px-8">
        {/* minmax(0, …): el carrusel es más ancho que la pantalla y no debe estirar la columna */}
        <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 lg:grid-cols-[minmax(0,3fr)_minmax(0,7fr)]">
          <div>
            <h2 className="text-balance font-display text-3xl font-bold leading-tight text-crema">Nuestros auspiciantes</h2>
            <p className="mt-4 leading-relaxed text-slate-300">
              Empresas y marcas que respaldan el baloncesto de Manta y hacen posible cada temporada.
            </p>
          </div>
          <SponsorsCarousel className="rounded-2xl bg-white py-6 shadow-2xl shadow-black/30" />
        </div>
      </section>

      <SeccionConocenos />

      <SeccionPartidos />

      {/* ─── CTA ─── */}
      <section ref={cta} id="unete" data-visible={ctaVisible || undefined} className="relative z-10 scroll-mt-16 px-4 py-24 sm:px-6 lg:px-8">
        {/* Mismo cartel que las tarjetas de partido: campo marino, filete y esquinas en oro */}
        <div className="relative mx-auto max-w-6xl rounded-xl border border-oro/30 bg-marino-claro p-10 shadow-xl shadow-black/30 sm:p-14">
          <Esquinas />
          <div className="relative grid items-center gap-10 lg:grid-cols-[1.5fr_1fr]">
            <div>
              <h2 className="text-balance font-display text-3xl font-bold leading-tight text-crema sm:text-4xl">
                ¿Tu equipo quiere jugar el próximo torneo?
              </h2>
              <p className="mt-4 max-w-xl leading-relaxed text-slate-300">
                Inicia sesión como delegado para inscribir a tu equipo, cargar la nómina y seguir el estado de tu
                inscripción. Y si quieres saber quién impulsa cada temporada, conoce a nuestros auspiciantes.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <Link
                to={enlaceInscripcion}
                className="cta-boton [--brillo:rgb(41_169_225/0.7)] rounded-lg bg-celeste px-6 py-3.5 text-center text-sm font-semibold text-marino transition-colors hover:bg-white"
              >
                Inscribir a mi equipo
              </Link>
              <a
                href="#auspiciantes"
                className="cta-boton [--brillo:rgb(241_231_208/0.35)] [--retraso:150ms] rounded-lg border border-white/25 px-6 py-3.5 text-center text-sm font-semibold text-white transition-colors hover:bg-white/10"
              >
                Ver auspiciantes
              </a>
              {!userRole && (
                <p className="text-center text-sm text-slate-400">
                  ¿Aún no tienes cuenta?{' '}
                  <Link to="/auth/registro" className="font-semibold text-celeste hover:text-white">
                    Regístrate
                  </Link>
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
