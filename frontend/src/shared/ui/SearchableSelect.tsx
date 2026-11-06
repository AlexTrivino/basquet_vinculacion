import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';

export interface Option {
  value: string | number;
  label: string;
}

interface SearchableSelectProps {
  options: Option[];
  value: string | number | '';
  onChange: (value: string | number | '') => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Seleccione...',
  disabled = false,
  className = '',
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  // Filtrar opciones basadas en el término de búsqueda
  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Cerrar el dropdown si se hace click fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [wrapperRef]);

  // Si se deshabilita mientras está abierto, forzar cierre
  useEffect(() => {
    if (disabled) {
      setIsOpen(false);
    }
  }, [disabled]);

  const handleSelect = (optionValue: string | number) => {
    onChange(optionValue);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setSearchTerm('');
    if (!isOpen) setIsOpen(true);
  };

  return (
    <div ref={wrapperRef} className={`relative w-full ${className}`}>
      {/* Botón de selección principal */}
      <div
        className={`flex items-center justify-between w-full rounded-md border border-white/15 bg-marino-claro px-3 py-2 text-sm cursor-pointer shadow-sm ${
          disabled ? 'opacity-50 cursor-not-allowed bg-white/5' : 'hover:border-celeste/50 focus:outline-none focus:ring-1 focus:ring-celeste'
        } ${isOpen ? 'ring-1 ring-celeste border-celeste' : ''}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => {
          if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            setIsOpen(!isOpen);
          }
        }}
      >
        <span className={`block truncate ${!selectedOption ? 'text-slate-400' : 'text-crema font-medium'}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <div className="flex items-center gap-1">
          {selectedOption && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="text-slate-400 hover:text-slate-300 focus:outline-none p-1 rounded-full hover:bg-white/10 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {/* Dropdown con búsqueda */}
      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-marino-claro border border-white/10 rounded-md shadow-lg max-h-60 flex flex-col">
          <div className="p-2 border-b border-white/10 bg-marino-claro sticky top-0 rounded-t-md">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                className="w-full pl-9 pr-3 py-1.5 text-sm border border-white/15 rounded-md focus:outline-none focus:ring-1 focus:ring-celeste focus:border-celeste"
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                autoFocus
              />
            </div>
          </div>
          
          <ul className="overflow-auto py-1 text-sm text-slate-300">
            {filteredOptions.length === 0 ? (
              <li className="px-3 py-3 text-center text-slate-400 italic">No se encontraron resultados</li>
            ) : (
              filteredOptions.map((option) => (
                <li
                  key={option.value}
                  className={`px-3 py-2 cursor-pointer transition-colors ${
                    option.value === value
                      ? 'bg-oro/10 text-oro font-medium'
                      : 'hover:bg-white/10'
                  }`}
                  onClick={() => handleSelect(option.value)}
                >
                  {option.label}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
