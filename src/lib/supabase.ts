import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Faltan VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Configuralas en .env.local o en las ' +
      'variables de entorno del proyecto de Cloudflare Pages.'
  );
}

// OJO: sin el genérico <Database> a propósito. La versión de supabase-js
// que necesitamos para passkeys (>=2.105) trae un parser de tipos para
// .select() mucho más estricto, que no es compatible con un Database
// escrito a mano como el nuestro (necesita metadata real de foreign keys
// que no tenemos) — intentarlo producía errores en cascada en toda la
// app. Sin el genérico, .from()/.select() quedan sin autocompletado,
// pero seguimos type-safe donde realmente importa: cada página tipa el
// resultado contra Cama/Sector/Paciente/etc. de todos modos.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    // Passkeys (login por huella/Face ID/clave del dispositivo) — feature
    // en beta de Supabase Auth. Necesita habilitarlo también en el
    // Dashboard (Authentication > Passkeys).
    experimental: { passkey: true },
  },
  realtime: {
    params: { eventsPerSecond: 10 },
  },
});
