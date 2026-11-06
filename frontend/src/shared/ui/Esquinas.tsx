// Esquinas en L del cartel (tarjetas de partido y CTA)
export function Esquinas() {
  const base = 'absolute h-4 w-4 border-oro/40';
  return (
    <>
      <span aria-hidden="true" className={`${base} left-3 top-3 border-l border-t`} />
      <span aria-hidden="true" className={`${base} right-3 top-3 border-r border-t`} />
      <span aria-hidden="true" className={`${base} bottom-3 left-3 border-b border-l`} />
      <span aria-hidden="true" className={`${base} bottom-3 right-3 border-b border-r`} />
    </>
  );
}
