import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase URL ou Anon Key não configurados. Verifique o arquivo .env.local');
  console.warn('URL:', supabaseUrl ? '✅ Configurado' : '❌ Não configurado');
  console.warn('Key:', supabaseAnonKey ? '✅ Configurado' : '❌ Não configurado');
} else {
  console.log('✅ Supabase configurado com sucesso!');
  console.log('URL:', supabaseUrl.substring(0, 30) + '...');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

