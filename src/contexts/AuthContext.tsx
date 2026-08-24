import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { dniToEmail } from '@/lib/dni';
import type { Persona, Hospital, HospitalUsuario, RolSistema } from '@/types/database.types';

export interface AsignacionConHospital extends HospitalUsuario {
  hospital: Hospital;
}

interface AuthContextValue {
  session: Session | null;
  persona: Persona | null;
  asignaciones: AsignacionConHospital[];
  hospitalActual: Hospital | null;
  rolActual: RolSistema | null;
  loading: boolean;
  loginConDni: (dni: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  seleccionarHospital: (hospitalId: string) => void;
  cambiarHospital: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const STORAGE_KEY_HOSPITAL = 'hospital-camas:hospital-actual-id';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [persona, setPersona] = useState<Persona | null>(null);
  const [asignaciones, setAsignaciones] = useState<AsignacionConHospital[]>([]);
  const [hospitalActualId, setHospitalActualId] = useState<string | null>(() =>
    localStorage.getItem(STORAGE_KEY_HOSPITAL)
  );
  const [loading, setLoading] = useState(true);

  async function cargarPersonaYAsignaciones(userId: string) {
    const { data: personaData, error: personaError } = await supabase
      .from('personas')
      .select('*')
      .eq('id', userId)
      .single();

    if (personaError || !personaData) {
      console.error('Error cargando persona:', personaError?.message);
      setPersona(null);
      setAsignaciones([]);
      return;
    }
    setPersona(personaData);

    if (personaData.es_superusuario) {
      setAsignaciones([]);
      return;
    }

    const { data: asignData } = await supabase
      .from('hospital_usuarios')
      .select('*')
      .eq('persona_id', userId)
      .eq('activo', true);

    if (!asignData || asignData.length === 0) {
      setAsignaciones([]);
      return;
    }

    const hospitalIds = asignData.map((a) => a.hospital_id);
    const { data: hospitalesData } = await supabase
      .from('hospitales')
      .select('*')
      .in('id', hospitalIds);

    const hospitalesPorId = new Map((hospitalesData ?? []).map((h) => [h.id, h]));
    const combinado: AsignacionConHospital[] = asignData
      .filter((a) => hospitalesPorId.has(a.hospital_id))
      .map((a) => ({ ...a, hospital: hospitalesPorId.get(a.hospital_id)! }));

    setAsignaciones(combinado);

    if (combinado.length === 1) {
      setHospitalActualId(combinado[0].hospital_id);
      localStorage.setItem(STORAGE_KEY_HOSPITAL, combinado[0].hospital_id);
    }
  }

  useEffect(() => {
    let isMounted = true;

    supabase.auth.getSession().then(async ({ data: { session: initialSession } }) => {
      if (!isMounted) return;
      setSession(initialSession);
      if (initialSession?.user) {
        await cargarPersonaYAsignaciones(initialSession.user.id);
      }
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      if (newSession?.user) {
        await cargarPersonaYAsignaciones(newSession.user.id);
      } else {
        setPersona(null);
        setAsignaciones([]);
        setHospitalActualId(null);
        localStorage.removeItem(STORAGE_KEY_HOSPITAL);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function loginConDni(dni: string, password: string) {
    const email = dniToEmail(dni);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error ? 'DNI o contraseña incorrectos' : null };
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  function seleccionarHospital(hospitalId: string) {
    setHospitalActualId(hospitalId);
    localStorage.setItem(STORAGE_KEY_HOSPITAL, hospitalId);
  }

  function cambiarHospital() {
    setHospitalActualId(null);
    localStorage.removeItem(STORAGE_KEY_HOSPITAL);
  }

  const hospitalActual = useMemo(
    () => asignaciones.find((a) => a.hospital_id === hospitalActualId)?.hospital ?? null,
    [asignaciones, hospitalActualId]
  );

  const rolActual = useMemo(
    () => asignaciones.find((a) => a.hospital_id === hospitalActualId)?.rol ?? null,
    [asignaciones, hospitalActualId]
  );

  const value = useMemo(
    () => ({
      session,
      persona,
      asignaciones,
      hospitalActual,
      rolActual,
      loading,
      loginConDni,
      signOut,
      seleccionarHospital,
      cambiarHospital,
    }),
    [session, persona, asignaciones, hospitalActual, rolActual, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
