interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div className={`motion-safe:animate-pulse rounded bg-white/10 ${className}`} />
  );
}
