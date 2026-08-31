// Tipos que reflejan schema_multi_hospital.sql (v2, con "pacientes" global).
// En un proyecto real, regenerar con:
//   npx supabase gen types typescript --project-id <id> > src/types/database.types.ts

export type RolSistema = 'enfermeria' | 'medico' | 'administracion';
export type EstadoCama = 'libre' | 'ocupada' | 'reservada';
export type EstadoSolicitud = 'pendiente' | 'aceptada' | 'rechazada' | 'cancelada';
export type TipoNotificacion =
  | 'derivacion_pedido'
  | 'derivacion_aceptada'
  | 'derivacion_rechazada'
  | 'novedad';

// IMPORTANTE: son "type", no "interface" — una interface no satisface el
// tipado interno de postgrest-js (Row/Insert/Update deben ser asignables
// a Record<string, unknown>), y el error resultante es muy confuso.

export type Hospital = {
  id: string;
  nombre: string;
  domicilio: string;
  telefono: string;
  director_nombre: string;
  activo: boolean;
  created_at: string;
};

export type Persona = {
  id: string;
  dni: string;
  apellido: string;
  nombre: string;
  email: string;
  es_superusuario: boolean;
  created_at: string;
  updated_at: string;
};

export type HospitalUsuario = {
  id: string;
  persona_id: string;
  hospital_id: string;
  rol: RolSistema;
  profesion_funcion: string;
  activo: boolean;
  created_at: string;
};

export type Sector = {
  id: string;
  hospital_id: string;
  nombre: string;
  created_at: string;
};

export type Cama = {
  id: string;
  hospital_id: string;
  sector_id: string;
  numero_cama: string;
  estado: EstadoCama;
  derivado_de_hospital_id: string | null;
  fecha_ultimo_cambio: string;
  created_at: string;
};

export type Paciente = {
  id: string;
  dni: string | null;
  apellido_nombre: string;
  domicilio: string | null;
  telefono: string | null;
  created_at: string;
  updated_at: string;
};

export type SolicitudDerivacion = {
  id: string;
  cama_id: string;
  hospital_origen_id: string;
  hospital_destino_id: string;
  medico_origen_id: string;
  medico_destino_id: string | null;
  estado: EstadoSolicitud;
  paciente_id: string;
  diagnostico: string;
  fecha_solicitud: string;
  fecha_resolucion: string | null;
  created_at: string;
};

export type Ocupacion = {
  id: string;
  cama_id: string;
  hospital_id: string;
  paciente_id: string;
  diagnostico: string;
  fecha_ingreso: string;
  fecha_egreso: string | null;
  derivado_de_hospital_id: string | null;
  solicitud_derivacion_id: string | null;
  creado_por: string | null;
  actualizado_por: string | null;
  created_at: string;
};

export type Notificacion = {
  id: string;
  persona_id: string;
  hospital_id: string | null;
  tipo: TipoNotificacion;
  referencia_id: string | null;
  mensaje: string;
  leida: boolean;
  created_at: string;
};

export type Novedad = {
  id: string;
  hospital_id: string;
  autor_id: string;
  mensaje: string;
  activa: boolean;
  created_at: string;
};

export type NovedadVista = {
  id: string;
  novedad_id: string;
  persona_id: string;
  visto_at: string;
};

export type AuditoriaCama = {
  id: string;
  cama_id: string;
  hospital_id: string;
  estado_anterior: EstadoCama | null;
  estado_nuevo: EstadoCama;
  persona_id: string | null;
  timestamp: string;
};

export type PushSubscription = {
  id: string;
  persona_id: string;
  endpoint: string;
  p256dh: string;
  auth_key: string;
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      hospitales: { Row: Hospital; Insert: Partial<Hospital>; Update: Partial<Hospital>; Relationships: [] };
      personas: { Row: Persona; Insert: Partial<Persona>; Update: Partial<Persona>; Relationships: [] };
      hospital_usuarios: {
        Row: HospitalUsuario;
        Insert: Partial<HospitalUsuario>;
        Update: Partial<HospitalUsuario>;
        Relationships: [];
      };
      sectores: { Row: Sector; Insert: Partial<Sector>; Update: Partial<Sector>; Relationships: [] };
      camas: { Row: Cama; Insert: Partial<Cama>; Update: Partial<Cama>; Relationships: [] };
      pacientes: { Row: Paciente; Insert: Partial<Paciente>; Update: Partial<Paciente>; Relationships: [] };
      solicitudes_derivacion: {
        Row: SolicitudDerivacion;
        Insert: Partial<SolicitudDerivacion>;
        Update: Partial<SolicitudDerivacion>;
        Relationships: [];
      };
      ocupaciones: { Row: Ocupacion; Insert: Partial<Ocupacion>; Update: Partial<Ocupacion>; Relationships: [] };
      notificaciones: {
        Row: Notificacion;
        Insert: Partial<Notificacion>;
        Update: Partial<Notificacion>;
        Relationships: [];
      };
      novedades: { Row: Novedad; Insert: Partial<Novedad>; Update: Partial<Novedad>; Relationships: [] };
      novedades_vistas: {
        Row: NovedadVista;
        Insert: Partial<NovedadVista>;
        Update: Partial<NovedadVista>;
        Relationships: [];
      };
      auditoria_camas: {
        Row: AuditoriaCama;
        Insert: Partial<AuditoriaCama>;
        Update: Partial<AuditoriaCama>;
        Relationships: [];
      };
      push_subscriptions: {
        Row: PushSubscription;
        Insert: Partial<PushSubscription>;
        Update: Partial<PushSubscription>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      buscar_persona_por_dni: {
        Args: { p_dni: string };
        Returns: { id: string; apellido: string; nombre: string }[];
      };
      alta_persona_en_hospital: {
        Args: {
          p_persona_id: string;
          p_hospital_id: string;
          p_rol: RolSistema;
          p_profesion_funcion: string;
        };
        Returns: undefined;
      };
      crear_hospital: {
        Args: {
          p_nombre: string;
          p_domicilio: string;
          p_director_nombre: string;
          p_telefono: string;
        };
        Returns: string;
      };
      ocupar_cama: {
        Args: {
          p_cama_id: string;
          p_apellido_nombre: string;
          p_diagnostico: string;
          p_dni?: string;
          p_domicilio?: string;
          p_telefono?: string;
        };
        Returns: string;
      };
      agregar_camas_a_sector: {
        Args: { p_sector_id: string; p_cantidad: number };
        Returns: Cama[];
      };
      liberar_cama: {
        Args: { p_cama_id: string };
        Returns: undefined;
      };
      editar_ocupacion: {
        Args: {
          p_cama_id: string;
          p_apellido_nombre: string;
          p_diagnostico: string;
          p_dni?: string;
          p_domicilio?: string;
          p_telefono?: string;
        };
        Returns: undefined;
      };
    };
    Enums: {
      rol_sistema: RolSistema;
      estado_cama: EstadoCama;
      estado_solicitud: EstadoSolicitud;
      tipo_notificacion: TipoNotificacion;
    };
    CompositeTypes: Record<string, never>;
  };
};
