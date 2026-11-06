import { useState, type ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';

interface AsyncButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  onClickAction: () => Promise<void> | void;
}

export function AsyncButton({ children, onClickAction, disabled, className = '', ...props }: AsyncButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (isLoading || disabled) return;

    setIsLoading(true);
    try {
      await onClickAction();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      {...props}
      disabled={isLoading || disabled}
      onClick={handleClick}
      className={`inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-70 ${className}`}
    >
      {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}
