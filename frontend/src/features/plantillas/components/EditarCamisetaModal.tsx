import React, { useState, useEffect } from 'react';
import { Shirt, Loader2, X } from 'lucide-react';
import type { Plantilla } from '../../../types/api.types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (numeroCamiseta: number) => Promise<void>;
  plantilla: Plantilla | null;
  isSaving?: boolean;
}

export function EditarCamisetaModal({
  isOpen,
  onClose,
  onSave,
  plantilla,
  isSaving = false,
}: Props) {
  const [numero, setNumero] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (plantilla) {
      setNumero(
        plantilla.numero_camiseta !== null && plantilla.numero_camiseta !== undefined
          ? String(plantilla.numero_camiseta)
          : ''
      );
      setError(null);
    }
  }, [plantilla, isOpen]);

  if (!isOpen || !plantilla) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = numero.trim();
    if (val === '') {
      setError('Debes ingresar un número de camiseta.');
      return;
    }
    const num = parseInt(val, 10);
    if (isNaN(num) || num < 0 || num > 99) {
      setError('El número de camiseta debe estar entre 0 y 99.');
      return;
    }
    setError(null);
    await onSave(num);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only numbers allowed
    const val = e.target.value.replace(/[^0-9]/g, '');
    if (val.length <= 2) {
      setNumero(val);
      if (val !== '') {
        const num = parseInt(val, 10);
        if (num < 0 || num > 99) {
          setError('El número debe estar entre 0 y 99.');
        } else {
          setError(null);
        }
      } else {
        setError(null);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl relative overflow-hidden border border-gray-100">
        <div className="absolute top-0 left-0 w-full h-2 bg-primary-600" />

        <button
          onClick={onClose}
          disabled={isSaving}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100"
          title="Cerrar"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center text-center">
          <div className="w-14 h-14 bg-primary-50 text-primary-600 rounded-full flex items-center justify-center mb-3 border border-primary-100 shadow-sm">
            <Shirt className="w-7 h-7" />
          </div>

          <h2 className="text-lg font-bold text-gray-900 mb-1">
            Modificar Camiseta
          </h2>

          <p className="text-xs text-gray-500 mb-4">
            Jugador: <strong className="text-gray-800">{plantilla.jugador?.nombre || 'Jugador'}</strong>
          </p>

          <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
            <div className="text-left">
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Nuevo Número de Camiseta (0 - 99) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  value={numero}
                  onChange={handleChange}
                  placeholder="Ej. 23"
                  autoFocus
                  disabled={isSaving}
                  className={`w-full rounded-xl border px-3 py-2.5 text-center text-lg font-bold transition-all focus:outline-none ${
                    error
                      ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100 text-red-700'
                      : 'border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 text-gray-900'
                  }`}
                />
              </div>
              {error && <p className="mt-1 text-xs text-red-600 text-center font-medium">{error}</p>}
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-semibold hover:bg-gray-100 transition-colors text-sm cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSaving || !numero.trim() || !!error}
                className="flex-1 px-4 py-2.5 rounded-xl font-bold text-white transition-all shadow-sm bg-primary-600 hover:bg-primary-700 hover:shadow-md text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  'Guardar'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
