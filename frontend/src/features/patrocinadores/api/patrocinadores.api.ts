import api from "../../../api/axios.config";

export interface Patrocinador {
  id?: number; // Para compatibilidad con DataGridTable
  id_patrocinador: number;
  nombre_patrocinador: string;
  url_logo_patrocinador: string | null;
  url_imagen_promocional: string | null;
  created_at: string;
  updated_at: string;
}

export const getPatrocinadores = async (): Promise<Patrocinador[]> => {
  const { data } = await api.get<{ data: Patrocinador[] }>("/patrocinadores");
  return data.data;
};

export const createPatrocinador = async (formData: FormData): Promise<Patrocinador> => {
  const { data } = await api.post<{ data: Patrocinador }>("/patrocinadores", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return data.data;
};

export const updatePatrocinador = async (
  id_patrocinador: number,
  formData: FormData
): Promise<Patrocinador> => {
  const { data } = await api.put<{ data: Patrocinador }>(
    `/patrocinadores/${id_patrocinador}`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );
  return data.data;
};

export const deletePatrocinador = async (id_patrocinador: number): Promise<void> => {
  await api.delete(`/patrocinadores/${id_patrocinador}`);
};
