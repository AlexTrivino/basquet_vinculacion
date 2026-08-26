import { useState, useEffect } from 'react';
import api from '../api/axios.config';

interface BusinessRules {
  MAX_EQUIPOS_POR_DELEGADO: number;
  MAX_JUGADORES_PLANTILLA: number;
  MIN_JUGADORES_PLANTILLA: number;
}

const defaultRules: BusinessRules = {
  MAX_EQUIPOS_POR_DELEGADO: 1, // Fallback
  MAX_JUGADORES_PLANTILLA: 18,
  MIN_JUGADORES_PLANTILLA: 10,
};

export function useBusinessRules() {
  const [rules, setRules] = useState<BusinessRules>(defaultRules);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const fetchRules = async () => {
      try {
        const response = await api.get('/config/reglas-negocio');
        if (mounted && response.data?.data) {
          setRules(response.data.data);
        }
      } catch (error) {
        console.error('Error fetching business rules:', error);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    fetchRules();

    return () => {
      mounted = false;
    };
  }, []);

  return { rules, isLoading };
}
