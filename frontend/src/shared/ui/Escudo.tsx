import { Shield } from 'lucide-react';

// Medallón claro para los escudos (los logos en silueta negra se leen sobre marino)
export function Escudo({ url, className = 'h-12 w-12' }: { url?: string | null; className?: string }) {
  return (
    <span className={`flex shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-white to-slate-200 shadow-md shadow-black/40 ring-2 ring-oro/40 ${className}`}>
      {url ? (
        <img src={url} alt="" loading="lazy" className="h-[76%] w-[76%] object-contain" />
      ) : (
        <Shield className="h-1/2 w-1/2 text-slate-400" aria-hidden="true" />
      )}
    </span>
  );
}
