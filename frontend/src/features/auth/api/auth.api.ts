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
