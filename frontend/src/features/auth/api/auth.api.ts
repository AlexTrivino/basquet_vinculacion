import axios from 'axios';

// Instancia separada para Supabase Auth (no usa el interceptor base para no inyectar tokens previos)
export const supabaseAuthClient = axios.create({
  baseURL: `${import.meta.env.VITE_SUPABASE_URL}/auth/v1`,
  headers: {
    'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
    'Content-Type': 'application/json',
  },
});

export async function loginWithSupabase(email: string, password: string) {
  const response = await supabaseAuthClient.post('/token?grant_type=password', {
    email,
    password,
  });
  return response.data;
}

export async function registerWithSupabase(email: string, password: string, nombre: string) {
  const response = await supabaseAuthClient.post('/signup', {
    email,
    password,
    data: { nombre }, // Supabase inserta esto en raw_user_meta_data
  });
  return response.data;
}

export async function resetPasswordWithSupabase(email: string) {
  const response = await supabaseAuthClient.post('/recover', {
    email,
  });
  return response.data;
}
