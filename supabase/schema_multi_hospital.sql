-- ============================================================
-- Sistema de Gestión de Camas Hospitalarias — MULTI-HOSPITAL
-- Esquema PostgreSQL para Supabase (v2 — reemplaza el schema
-- de un solo hospital de la conversación anterior)
-- ============================================================
--
-- DECISIONES DE DISEÑO — leer antes de correr en producción:
--
-- 1. IDENTIDAD GLOBAL vs. ROL POR HOSPITAL
--    "profiles" (single-hospital) se reemplaza por dos tablas:
--      - personas: identidad única por DNI, 1:1 con auth.users.
--      - hospital_usuarios: qué rol tiene esa persona en cada
--        hospital (una persona puede tener roles distintos en
--        hospitales distintos).
--
-- 2. LOGIN CON DNI, NO CON EMAIL
--    Supabase Auth pide un email único por usuario. Como el login
--    real es por DNI, "personas.email" es un email SINTÉTICO
--    generado por la app (ej: dni-12345678@sistema.interno) que
--    se usa sólo para hablar con supabase.auth — el usuario nunca
--    lo ve ni lo escribe. El frontend hace DNI -> email antes de
--    llamar signInWithPassword(). Lo dejo señalado en el schema
--    pero es una pieza que se resuelve en el frontend/Edge Function.
--
-- 3. ALTA DE UNA PERSONA NUEVA (DNI que no existe en el sistema)
--    Crear una fila en auth.users requiere el service_role key
--    (Admin API) — NO se puede hacer desde el cliente con RLS.
--    Por eso la función buscar_persona_por_dni() y la de alta de
--    personal existente SÍ son RPC de Postgres, pero la creación
--    de un usuario 100% nuevo queda para una Edge Function aparte
--    (fase de frontend). El schema ya tiene todo listo para
--    recibirla (personas.id = auth.users.id).
--
-- 4. SUPERUSUARIO: rol global, no una fila más en hospital_usuarios
--    Es un flag (personas.es_superusuario) en vez de una tabla de
--    hospital. Elegí que siga siendo una cuenta real de Supabase
--    Auth (con su propio login) en vez de una "clave maestra"
--    compartida fuera del sistema de auth — es más seguro y más
--    fácil de auditar (podés loguear quién hizo qué). Si el pedido
--    era literalmente compartir una única contraseña entre varios
--    superusuarios, eso también funciona con este diseño: creás
--    una sola cuenta superusuario y compartís esa contraseña. Si
--    en cambio necesitás varias cuentas superusuario distintas,
--    también anda. Avisame cuál de las dos querés.
--
-- 5. CAMBIOS DE ESTADO DE CAMA: NUNCA .update() DIRECTO
--    Ocupar/liberar/reservar una cama toca 2+ tablas a la vez
--    (camas + ocupaciones o solicitudes_derivacion) y necesita
--    validar rol y hospital. Por eso el cliente NUNCA hace
--    supabase.from('camas').update(...) directamente — llama a
--    funciones RPC (ocupar_cama, liberar_cama, etc.) que hacen
--    todo en una transacción. La RLS de "camas" bloquea el UPDATE
--    directo para todos salvo superusuario, a propósito.
--
-- 6. VISIBILIDAD DE CAMAS: RED COMPLETA, NO SÓLO TU HOSPITAL
--    Un médico necesita ver camas de OTROS hospitales para poder
--    derivar. Por eso "hospitales", "sectores" y "camas" son
--    legibles por cualquier usuario activo del sistema (en
--    cualquier hospital), mientras que los DATOS DE PACIENTES
--    (tabla "ocupaciones") sí quedan acotados a los hospitales
--    donde cada persona tiene acceso activo.
--
-- 7. "RESERVADA" SIRVE PARA DOS CASOS
--    Reserva dentro del mismo hospital y pedido de derivación
--    a otro hospital son la MISMA operación en el modelo (ambas
--    crean una fila en solicitudes_derivacion). Si
--    hospital_origen_id = hospital_destino_id, es una reserva
--    interna; si son distintos, es una derivación. Un médico del
--    hospital destino igual tiene que aceptar/rechazar en ambos
--    casos — asumí que así lo querés incluso para reservas
--    internas (alguien "recibe" la cama reservada). Si en realidad
--    una reserva interna del mismo médico se debería auto-aceptar,
--    avisame y ajusto aceptar_solicitud_derivacion().
-- ============================================================


-- ============================================================
-- 1. EXTENSIONES
-- ============================================================
create extension if not exists "pgcrypto";


-- ============================================================
-- 2. ENUMS
-- ============================================================
create type public.rol_sistema as enum (
  'enfermeria',
  'medico',
  'administracion'
);
-- Superusuario NO está acá a propósito — ver decisión de diseño #4.

create type public.estado_cama as enum (
  'libre',
  'ocupada',
  'reservada'
);

create type public.estado_solicitud as enum (
  'pendiente',
  'aceptada',
  'rechazada',
  'cancelada'
);

create type public.tipo_notificacion as enum (
  'derivacion_pedido',
  'derivacion_aceptada',
  'derivacion_rechazada',
  'novedad'
);


-- ============================================================
-- 3. TABLAS
-- ============================================================

-- ---------------------------------------------
-- 3.1 hospitales
-- ---------------------------------------------
create table public.hospitales (
  id              uuid primary key default gen_random_uuid(),
  nombre          text not null unique,
  domicilio       text not null,
  telefono        text not null,
  director_nombre text not null, -- "Apellido y Nombre del Director", campo único según el pedido
  activo          boolean not null default true,
  created_at      timestamptz not null default now()
);

comment on table public.hospitales is 'Hospitales de la red. Alta exclusiva del superusuario.';


-- ---------------------------------------------
-- 3.2 personas (identidad global, 1:1 con auth.users)
-- ---------------------------------------------
create table public.personas (
  id               uuid primary key references auth.users(id) on delete cascade,
  dni              text not null unique,
  apellido         text not null,
  nombre           text not null,
  email            text not null unique, -- ver decisión de diseño #2 (puede ser sintético)
  es_superusuario  boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

comment on table public.personas is 'Identidad única por DNI. Uniforme entre hospitales: apellido/nombre viven acá, no se repiten por hospital.';


-- ---------------------------------------------
-- 3.3 hospital_usuarios (rol de una persona en un hospital)
-- ---------------------------------------------
create table public.hospital_usuarios (
  id                 uuid primary key default gen_random_uuid(),
  persona_id         uuid not null references public.personas(id) on delete cascade,
  hospital_id        uuid not null references public.hospitales(id) on delete cascade,
  rol                public.rol_sistema not null,
  profesion_funcion  text not null, -- texto libre: "Enfermera", "Traumatólogo", "Director", etc.
  activo             boolean not null default true,
  created_at         timestamptz not null default now(),
  unique (persona_id, hospital_id)
);

comment on table public.hospital_usuarios is 'Qué rol y función tiene cada persona en cada hospital. Una persona puede tener varias filas (una por hospital).';


-- ---------------------------------------------
-- 3.4 sectores
-- ---------------------------------------------
create table public.sectores (
  id          uuid primary key default gen_random_uuid(),
  hospital_id uuid not null references public.hospitales(id) on delete cascade,
  nombre      text not null,
  created_at  timestamptz not null default now(),
  unique (hospital_id, nombre)
);


-- ---------------------------------------------
-- 3.5 camas
-- ---------------------------------------------
create table public.camas (
  id                     uuid primary key default gen_random_uuid(),
  hospital_id            uuid not null references public.hospitales(id) on delete restrict,
  sector_id              uuid not null references public.sectores(id) on delete restrict,
  numero_cama            text not null,
  estado                 public.estado_cama not null default 'libre',
  derivado_de_hospital_id uuid references public.hospitales(id) on delete set null,
  fecha_ultimo_cambio    timestamptz not null default now(),
  created_at             timestamptz not null default now(),
  unique (hospital_id, numero_cama),
  -- Sólo tiene sentido "derivado de" cuando la cama está ocupada.
  constraint chk_derivado_solo_si_ocupada
    check (estado = 'ocupada' or derivado_de_hospital_id is null)
);

-- hospital_id está denormalizado (ya se puede sacar de sectores.hospital_id)
-- a propósito: evita un join en cada policy de RLS, que se evalúa en
-- CADA fila de CADA query. Un trigger (6.2) garantiza que nunca queden
-- desincronizados.


-- ---------------------------------------------
-- 3.6 pacientes (identidad global, pensada para compartirse con el
--     resto del mega proyecto — Telesalud, ECNT, Embarazadas, APS,
--     Estadística, Farmacia — no sólo con este programa de camas)
-- ---------------------------------------------
create table public.pacientes (
  id                uuid primary key default gen_random_uuid(),
  dni               text unique, -- nullable a propósito: la carga de un paciente en una
                                  -- cama admite DNI opcional (spec de enfermería). Postgres
                                  -- permite múltiples NULL en una columna unique, así que
                                  -- varios "pacientes sin DNI" conviven sin chocar entre sí
                                  -- — sólo se deduplica cuando el DNI SÍ está cargado.
  apellido_nombre   text not null,
  domicilio         text,
  telefono          text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint chk_pacientes_nombre_no_vacio check (length(trim(apellido_nombre)) > 0)
);

comment on table public.pacientes is 'Identidad global de paciente por DNI, análoga a "personas" para el personal. El diagnóstico NO vive acá — es propio de cada ocupación/episodio, no de la persona.';


-- ---------------------------------------------
-- 3.7 solicitudes_derivacion (reserva interna o pedido cross-hospital)
-- ---------------------------------------------
create table public.solicitudes_derivacion (
  id                   uuid primary key default gen_random_uuid(),
  cama_id              uuid not null references public.camas(id) on delete restrict,
  hospital_origen_id   uuid not null references public.hospitales(id),
  hospital_destino_id  uuid not null references public.hospitales(id),
  medico_origen_id     uuid not null references public.personas(id),
  medico_destino_id    uuid references public.personas(id), -- se completa al resolver
  estado               public.estado_solicitud not null default 'pendiente',
  paciente_id          uuid not null references public.pacientes(id),
  diagnostico          text not null,
  fecha_solicitud      timestamptz not null default now(),
  fecha_resolucion     timestamptz,
  created_at           timestamptz not null default now(),
  constraint chk_diagnostico_no_vacio check (length(trim(diagnostico)) > 0),
  constraint chk_resolucion_coherente
    check ((estado = 'pendiente') = (fecha_resolucion is null))
);

comment on table public.solicitudes_derivacion is 'Reserva de una cama por un médico, propia o para derivar a otro hospital. hospital_origen = hospital_destino => reserva interna.';


-- ---------------------------------------------
-- 3.8 ocupaciones (paciente actual + histórico de una cama)
-- ---------------------------------------------
create table public.ocupaciones (
  id                       uuid primary key default gen_random_uuid(),
  cama_id                  uuid not null references public.camas(id) on delete restrict,
  hospital_id              uuid not null references public.hospitales(id) on delete restrict,
  paciente_id              uuid not null references public.pacientes(id),
  diagnostico              text not null,
  fecha_ingreso            timestamptz not null default now(),
  fecha_egreso             timestamptz,
  derivado_de_hospital_id  uuid references public.hospitales(id) on delete set null,
  solicitud_derivacion_id  uuid references public.solicitudes_derivacion(id) on delete set null,
  creado_por               uuid references public.personas(id) on delete set null,
  actualizado_por          uuid references public.personas(id) on delete set null,
  created_at               timestamptz not null default now(),
  constraint chk_ocupacion_diagnostico_no_vacio check (length(trim(diagnostico)) > 0)
);

comment on table public.ocupaciones is 'Un registro por cada vez que una cama estuvo ocupada. fecha_egreso null = ocupación activa. Es también el "Historial de Altas" filtrando fecha_egreso not null.';

-- Sólo una ocupación activa por cama a la vez.
create unique index ocupaciones_cama_activa_uidx
  on public.ocupaciones (cama_id)
  where fecha_egreso is null;


-- ---------------------------------------------
-- 3.8 notificaciones
-- ---------------------------------------------
create table public.notificaciones (
  id           uuid primary key default gen_random_uuid(),
  persona_id   uuid not null references public.personas(id) on delete cascade,
  hospital_id  uuid references public.hospitales(id) on delete cascade,
  tipo         public.tipo_notificacion not null,
  referencia_id uuid, -- id de la solicitud_derivacion o novedad relacionada
  mensaje      text not null,
  leida        boolean not null default false,
  created_at   timestamptz not null default now()
);

comment on table public.notificaciones is 'Notificaciones in-app (vía Realtime). Base para push real (Web Push) en una fase posterior.';


-- ---------------------------------------------
-- 3.9 novedades
-- ---------------------------------------------
create table public.novedades (
  id          uuid primary key default gen_random_uuid(),
  hospital_id uuid not null references public.hospitales(id) on delete cascade,
  autor_id    uuid not null references public.personas(id),
  mensaje     text not null,
  activa      boolean not null default true,
  created_at  timestamptz not null default now()
);


-- ---------------------------------------------
-- 3.10 novedades_vistas (para que el popup salte una sola vez)
-- ---------------------------------------------
create table public.novedades_vistas (
  id          uuid primary key default gen_random_uuid(),
  novedad_id  uuid not null references public.novedades(id) on delete cascade,
  persona_id  uuid not null references public.personas(id) on delete cascade,
  visto_at    timestamptz not null default now(),
  unique (novedad_id, persona_id)
);


-- ---------------------------------------------
-- 3.11 auditoria_camas
-- ---------------------------------------------
create table public.auditoria_camas (
  id              uuid primary key default gen_random_uuid(),
  cama_id         uuid not null references public.camas(id) on delete cascade,
  hospital_id     uuid not null references public.hospitales(id) on delete cascade,
  estado_anterior public.estado_cama,
  estado_nuevo    public.estado_cama not null,
  persona_id      uuid references public.personas(id) on delete set null,
  "timestamp"     timestamptz not null default now()
);


-- ---------------------------------------------
-- 3.12 push_subscriptions (stub — se activa en la fase de push real)
-- ---------------------------------------------
create table public.push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  persona_id  uuid not null references public.personas(id) on delete cascade,
  endpoint    text not null unique,
  p256dh      text not null,
  auth_key    text not null,
  created_at  timestamptz not null default now()
);

comment on table public.push_subscriptions is 'No se usa todavía — queda preparada para cuando implementemos Web Push real con VAPID + Edge Function.';


-- ============================================================
-- 4. ÍNDICES
-- ============================================================
create index idx_hospital_usuarios_persona   on public.hospital_usuarios(persona_id);
create index idx_hospital_usuarios_hospital  on public.hospital_usuarios(hospital_id);
create index idx_sectores_hospital           on public.sectores(hospital_id);
create index idx_camas_hospital              on public.camas(hospital_id);
create index idx_camas_sector                on public.camas(sector_id);
create index idx_camas_estado                on public.camas(estado);
create index idx_ocupaciones_cama            on public.ocupaciones(cama_id);
create index idx_ocupaciones_hospital        on public.ocupaciones(hospital_id);
create index idx_ocupaciones_paciente         on public.ocupaciones(paciente_id);
create index idx_solicitudes_destino_estado  on public.solicitudes_derivacion(hospital_destino_id, estado);
create index idx_solicitudes_origen          on public.solicitudes_derivacion(hospital_origen_id);
create index idx_solicitudes_cama            on public.solicitudes_derivacion(cama_id);
create index idx_solicitudes_paciente        on public.solicitudes_derivacion(paciente_id);
create index idx_notificaciones_persona      on public.notificaciones(persona_id, leida);
create index idx_novedades_hospital_activa   on public.novedades(hospital_id, activa);
create index idx_novedades_vistas_persona    on public.novedades_vistas(persona_id);
create index idx_auditoria_cama              on public.auditoria_camas(cama_id);
create index idx_personas_dni                on public.personas(dni);
create index idx_pacientes_dni                on public.pacientes(dni);


-- ============================================================
-- 5. FUNCIONES AUXILIARES (SECURITY DEFINER, para usar en RLS)
-- ============================================================

create or replace function public.es_superusuario()
returns boolean
language sql security definer stable set search_path = public
as $$
  select coalesce((select p.es_superusuario from public.personas p where p.id = auth.uid()), false);
$$;

create or replace function public.rol_en_hospital(p_hospital_id uuid)
returns public.rol_sistema
language sql security definer stable set search_path = public
as $$
  select hu.rol
  from public.hospital_usuarios hu
  where hu.persona_id = auth.uid()
    and hu.hospital_id = p_hospital_id
    and hu.activo;
$$;

create or replace function public.tiene_acceso_hospital(p_hospital_id uuid)
returns boolean
language sql security definer stable set search_path = public
as $$
  select public.es_superusuario() or exists (
    select 1 from public.hospital_usuarios hu
    where hu.persona_id = auth.uid()
      and hu.hospital_id = p_hospital_id
      and hu.activo
  );
$$;

-- Cualquier asignación activa en CUALQUIER hospital — gatilla la
-- visibilidad "red completa" de hospitales/sectores/camas (decisión #6).
create or replace function public.es_usuario_activo()
returns boolean
language sql security definer stable set search_path = public
as $$
  select public.es_superusuario() or exists (
    select 1 from public.hospital_usuarios hu
    where hu.persona_id = auth.uid() and hu.activo
  );
$$;

create or replace function public.es_medico_o_admin(p_hospital_id uuid)
returns boolean
language sql security definer stable set search_path = public
as $$
  select public.es_superusuario() or public.rol_en_hospital(p_hospital_id) in ('medico', 'administracion');
$$;

create or replace function public.es_administracion(p_hospital_id uuid)
returns boolean
language sql security definer stable set search_path = public
as $$
  select public.es_superusuario() or public.rol_en_hospital(p_hospital_id) = 'administracion';
$$;

-- Administración de CUALQUIER hospital (para gestionar personal que
-- todavía no trabaja en tu hospital, ej. buscar por DNI).
create or replace function public.es_administracion_en_algun_hospital()
returns boolean
language sql security definer stable set search_path = public
as $$
  select public.es_superusuario() or exists (
    select 1 from public.hospital_usuarios hu
    where hu.persona_id = auth.uid() and hu.activo and hu.rol = 'administracion'
  );
$$;


-- ============================================================
-- 6. TRIGGERS
-- ============================================================

-- ---------------------------------------------
-- 6.1 updated_at en personas
-- ---------------------------------------------
create or replace function public.fn_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_personas_updated_at
before update on public.personas
for each row execute function public.fn_set_updated_at();

create trigger trg_pacientes_updated_at
before update on public.pacientes
for each row execute function public.fn_set_updated_at();


-- ---------------------------------------------
-- 6.2 Validar que sector_id pertenece al mismo hospital_id de la cama
-- ---------------------------------------------
create or replace function public.fn_validar_cama_sector()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_hospital_sector uuid;
begin
  select s.hospital_id into v_hospital_sector
  from public.sectores s where s.id = new.sector_id;

  if v_hospital_sector is null then
    raise exception 'El sector % no existe', new.sector_id;
  end if;

  if v_hospital_sector <> new.hospital_id then
    raise exception 'La cama declara hospital_id % pero su sector pertenece al hospital %',
      new.hospital_id, v_hospital_sector;
  end if;

  return new;
end;
$$;

create trigger trg_validar_cama_sector
before insert or update of sector_id, hospital_id on public.camas
for each row execute function public.fn_validar_cama_sector();


-- ---------------------------------------------
-- 6.3 Auditoría automática de cambios de estado de cama
-- ---------------------------------------------
create or replace function public.fn_auditoria_camas()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.estado is distinct from old.estado then
    insert into public.auditoria_camas (cama_id, hospital_id, estado_anterior, estado_nuevo, persona_id)
    values (new.id, new.hospital_id, old.estado, new.estado, auth.uid());

    new.fecha_ultimo_cambio := now();
  end if;
  return new;
end;
$$;

create trigger trg_auditoria_camas
before update on public.camas
for each row execute function public.fn_auditoria_camas();


-- ============================================================
-- 7. ROW LEVEL SECURITY
-- ============================================================
alter table public.hospitales            enable row level security;
alter table public.personas              enable row level security;
alter table public.hospital_usuarios     enable row level security;
alter table public.sectores              enable row level security;
alter table public.camas                 enable row level security;
alter table public.pacientes             enable row level security;
alter table public.solicitudes_derivacion enable row level security;
alter table public.ocupaciones           enable row level security;
alter table public.notificaciones        enable row level security;
alter table public.novedades             enable row level security;
alter table public.novedades_vistas      enable row level security;
alter table public.auditoria_camas       enable row level security;
alter table public.push_subscriptions    enable row level security;

-- ---------------------------------------------
-- 7.1 hospitales — red completa visible, alta sólo superusuario
-- ---------------------------------------------
create policy "hospitales_select_red" on public.hospitales
for select to authenticated using (public.es_usuario_activo());

create policy "hospitales_insert_superusuario" on public.hospitales
for insert to authenticated with check (public.es_superusuario());

create policy "hospitales_update_superusuario" on public.hospitales
for update to authenticated
using (public.es_superusuario()) with check (public.es_superusuario());

create policy "hospitales_delete_superusuario" on public.hospitales
for delete to authenticated using (public.es_superusuario());


-- ---------------------------------------------
-- 7.2 personas
--     Ver decisión #3: el alta de una persona 100% nueva pasa por
--     una Edge Function con service_role, no por esta policy de
--     INSERT (que sólo cubre altas que corran con rol authenticated).
-- ---------------------------------------------
create policy "personas_select_propia_o_gestion" on public.personas
for select to authenticated
using (
  id = auth.uid()
  or public.es_superusuario()
  or public.es_administracion_en_algun_hospital() -- necesario para listar/gestionar personal
);

create policy "personas_insert_admin" on public.personas
for insert to authenticated
with check (public.es_administracion_en_algun_hospital() or public.es_superusuario());

create policy "personas_update_propia_limitada_o_superusuario" on public.personas
for update to authenticated
using (public.es_superusuario())
with check (public.es_superusuario());
-- Apellido/nombre quedan "de sólo lectura" para todos salvo superusuario,
-- justamente para que se mantengan uniformes entre hospitales.

create policy "personas_delete_superusuario" on public.personas
for delete to authenticated using (public.es_superusuario());


-- ---------------------------------------------
-- 7.3 hospital_usuarios
-- ---------------------------------------------
create policy "hospital_usuarios_select" on public.hospital_usuarios
for select to authenticated
using (
  persona_id = auth.uid()
  or public.es_administracion(hospital_id)
  or public.es_superusuario()
);

create policy "hospital_usuarios_insert_admin" on public.hospital_usuarios
for insert to authenticated
with check (public.es_administracion(hospital_id) or public.es_superusuario());

create policy "hospital_usuarios_update_admin" on public.hospital_usuarios
for update to authenticated
using (public.es_administracion(hospital_id) or public.es_superusuario())
with check (public.es_administracion(hospital_id) or public.es_superusuario());

create policy "hospital_usuarios_delete_superusuario" on public.hospital_usuarios
for delete to authenticated using (public.es_superusuario());
-- Preferí que administración DESACTIVE (activo=false, vía UPDATE) en vez
-- de borrar — conserva el historial de quién trabajó dónde.


-- ---------------------------------------------
-- 7.4 sectores — visibles en toda la red, se administran por hospital
-- ---------------------------------------------
create policy "sectores_select_red" on public.sectores
for select to authenticated using (public.es_usuario_activo());

create policy "sectores_insert_admin" on public.sectores
for insert to authenticated with check (public.es_administracion(hospital_id));

create policy "sectores_update_admin" on public.sectores
for update to authenticated
using (public.es_administracion(hospital_id)) with check (public.es_administracion(hospital_id));

create policy "sectores_delete_admin" on public.sectores
for delete to authenticated using (public.es_administracion(hospital_id));


-- ---------------------------------------------
-- 7.5 camas
--     SELECT: red completa (decisión #6).
--     INSERT/DELETE (alta/baja de camas físicas): administración.
--     UPDATE directo: SÓLO superusuario — todo cambio de estado
--     "normal" pasa por las funciones RPC de la sección 8.
-- ---------------------------------------------
create policy "camas_select_red" on public.camas
for select to authenticated using (public.es_usuario_activo());

create policy "camas_insert_admin" on public.camas
for insert to authenticated with check (public.es_administracion(hospital_id));

create policy "camas_update_superusuario" on public.camas
for update to authenticated
using (public.es_superusuario()) with check (public.es_superusuario());

create policy "camas_delete_admin" on public.camas
for delete to authenticated using (public.es_administracion(hospital_id));


-- ---------------------------------------------
-- 7.5b pacientes
--     Identidad compartida — visible en toda la red de hospitales
--     (es justamente el punto: cualquier programa/hospital autorizado
--     encuentra al mismo paciente sin volver a cargarlo). Sin datos
--     clínicos acá (el diagnóstico vive en ocupaciones), así que el
--     riesgo de exponer de más es bajo. Insert/update sólo vía RPC
--     (upsert_paciente) para no duplicar por errores de tipeo del DNI.
-- ---------------------------------------------
create policy "pacientes_select_red" on public.pacientes
for select to authenticated using (public.es_usuario_activo());


-- ---------------------------------------------
-- 7.6 solicitudes_derivacion
--     Sólo lectura directa. Todo insert/update pasa por RPC.
-- ---------------------------------------------
create policy "solicitudes_select_involucrados" on public.solicitudes_derivacion
for select to authenticated
using (
  medico_origen_id = auth.uid()
  or public.tiene_acceso_hospital(hospital_origen_id)
  or public.tiene_acceso_hospital(hospital_destino_id)
  or public.es_superusuario()
);


-- ---------------------------------------------
-- 7.7 ocupaciones
--     Datos de pacientes: acotado a hospitales con acceso activo.
--     Sólo lectura directa — insert/update pasan por RPC. Sin delete
--     (el historial de altas se conserva siempre).
-- ---------------------------------------------
create policy "ocupaciones_select_hospital" on public.ocupaciones
for select to authenticated
using (public.tiene_acceso_hospital(hospital_id) or public.es_superusuario());


-- ---------------------------------------------
-- 7.8 notificaciones
--     Insert la hace el sistema (RPC). El usuario sólo lee las
--     propias y las puede marcar como leídas o borrar.
-- ---------------------------------------------
create policy "notificaciones_select_propias" on public.notificaciones
for select to authenticated using (persona_id = auth.uid());

create policy "notificaciones_update_propias" on public.notificaciones
for update to authenticated
using (persona_id = auth.uid()) with check (persona_id = auth.uid());

create policy "notificaciones_delete_propias" on public.notificaciones
for delete to authenticated using (persona_id = auth.uid());


-- ---------------------------------------------
-- 7.9 novedades
-- ---------------------------------------------
create policy "novedades_select_hospital" on public.novedades
for select to authenticated using (public.tiene_acceso_hospital(hospital_id));

create policy "novedades_insert_admin" on public.novedades
for insert to authenticated with check (public.es_administracion(hospital_id));

create policy "novedades_update_admin" on public.novedades
for update to authenticated
using (public.es_administracion(hospital_id)) with check (public.es_administracion(hospital_id));

create policy "novedades_delete_admin" on public.novedades
for delete to authenticated using (public.es_administracion(hospital_id));


-- ---------------------------------------------
-- 7.10 novedades_vistas — cada usuario marca las propias
-- ---------------------------------------------
create policy "novedades_vistas_select_propias" on public.novedades_vistas
for select to authenticated using (persona_id = auth.uid());

create policy "novedades_vistas_insert_propias" on public.novedades_vistas
for insert to authenticated with check (persona_id = auth.uid());


-- ---------------------------------------------
-- 7.11 auditoria_camas — sólo lectura, la escribe el trigger
-- ---------------------------------------------
create policy "auditoria_select_hospital" on public.auditoria_camas
for select to authenticated using (public.tiene_acceso_hospital(hospital_id));


-- ---------------------------------------------
-- 7.12 push_subscriptions — autoservicio
-- ---------------------------------------------
create policy "push_subs_select_propia" on public.push_subscriptions
for select to authenticated using (persona_id = auth.uid());

create policy "push_subs_insert_propia" on public.push_subscriptions
for insert to authenticated with check (persona_id = auth.uid());

create policy "push_subs_delete_propia" on public.push_subscriptions
for delete to authenticated using (persona_id = auth.uid());


-- ============================================================
-- 8. FUNCIONES RPC (la lógica de negocio real)
-- ============================================================
-- Todas SECURITY DEFINER: validan permisos "a mano" adentro (porque
-- tocan varias tablas a la vez) y después hacen los inserts/updates
-- bypaseando la RLS restrictiva de camas/ocupaciones/solicitudes.
-- El cliente las llama con supabase.rpc('nombre_funcion', {...}).

-- ---------------------------------------------
-- 8.1 Buscar o crear un paciente por DNI (identidad compartida)
--     Si viene DNI y ya existe, reusa ese paciente y refresca sus
--     datos de contacto (domicilio/teléfono cambian con frecuencia;
--     el nombre lo dejamos pisar también por si fue una errata).
--     Si no viene DNI, siempre crea uno nuevo — no hay forma de
--     deduplicar a alguien sin identificador.
-- ---------------------------------------------
create or replace function public.upsert_paciente(
  p_apellido_nombre text,
  p_dni text default null,
  p_domicilio text default null,
  p_telefono text default null
)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_paciente_id uuid;
begin
  if length(trim(coalesce(p_apellido_nombre, ''))) = 0 then
    raise exception 'Apellido y nombre del paciente es obligatorio';
  end if;

  if p_dni is not null and length(trim(p_dni)) > 0 then
    select id into v_paciente_id from public.pacientes where dni = p_dni;

    if v_paciente_id is not null then
      update public.pacientes
      set apellido_nombre = p_apellido_nombre,
          domicilio = coalesce(p_domicilio, domicilio),
          telefono = coalesce(p_telefono, telefono)
      where id = v_paciente_id;
      return v_paciente_id;
    end if;
  end if;

  insert into public.pacientes (dni, apellido_nombre, domicilio, telefono)
  values (nullif(trim(coalesce(p_dni, '')), ''), p_apellido_nombre, p_domicilio, p_telefono)
  returning id into v_paciente_id;

  return v_paciente_id;
end;
$$;


-- ---------------------------------------------
-- 8.2 Ocupar una cama directamente (enfermería/médico/administración)
-- ---------------------------------------------
create or replace function public.ocupar_cama(
  p_cama_id uuid,
  p_apellido_nombre text,
  p_diagnostico text,
  p_dni text default null,
  p_domicilio text default null,
  p_telefono text default null
)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_cama public.camas;
  v_paciente_id uuid;
  v_ocupacion_id uuid;
begin
  select * into v_cama from public.camas where id = p_cama_id for update;
  if v_cama is null then
    raise exception 'La cama no existe';
  end if;

  if not (public.rol_en_hospital(v_cama.hospital_id) in ('enfermeria','medico','administracion')
          or public.es_superusuario()) then
    raise exception 'No tenés permiso para ocupar camas en este hospital';
  end if;

  if v_cama.estado <> 'libre' then
    raise exception 'La cama no está libre (estado actual: %)', v_cama.estado;
  end if;

  if length(trim(coalesce(p_diagnostico, ''))) = 0 then
    raise exception 'El diagnóstico es obligatorio';
  end if;

  v_paciente_id := public.upsert_paciente(p_apellido_nombre, p_dni, p_domicilio, p_telefono);

  insert into public.ocupaciones (cama_id, hospital_id, paciente_id, diagnostico, creado_por)
  values (p_cama_id, v_cama.hospital_id, v_paciente_id, p_diagnostico, auth.uid())
  returning id into v_ocupacion_id;

  update public.camas set estado = 'ocupada' where id = p_cama_id;

  return v_ocupacion_id;
end;
$$;


-- ---------------------------------------------
-- 8.3 Liberar una cama (pasa a Libre, cierra la ocupación activa)
-- ---------------------------------------------
create or replace function public.liberar_cama(p_cama_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_cama public.camas;
begin
  select * into v_cama from public.camas where id = p_cama_id for update;
  if v_cama is null then
    raise exception 'La cama no existe';
  end if;

  if not (public.rol_en_hospital(v_cama.hospital_id) in ('enfermeria','medico','administracion')
          or public.es_superusuario()) then
    raise exception 'No tenés permiso para liberar camas en este hospital';
  end if;

  if v_cama.estado <> 'ocupada' then
    raise exception 'La cama no está ocupada (estado actual: %)', v_cama.estado;
  end if;

  update public.ocupaciones
  set fecha_egreso = now(), actualizado_por = auth.uid()
  where cama_id = p_cama_id and fecha_egreso is null;

  update public.camas set estado = 'libre', derivado_de_hospital_id = null where id = p_cama_id;
end;
$$;


-- ---------------------------------------------
-- 8.4 Editar los datos del paciente de la ocupación activa ("el lápiz")
-- ---------------------------------------------
create or replace function public.editar_ocupacion(
  p_cama_id uuid,
  p_apellido_nombre text,
  p_diagnostico text,
  p_dni text default null,
  p_domicilio text default null,
  p_telefono text default null
)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_hospital_id uuid;
  v_paciente_id uuid;
begin
  select hospital_id into v_hospital_id from public.camas where id = p_cama_id;
  if v_hospital_id is null then
    raise exception 'La cama no existe';
  end if;

  if not (public.rol_en_hospital(v_hospital_id) in ('enfermeria','medico','administracion')
          or public.es_superusuario()) then
    raise exception 'No tenés permiso para editar pacientes en este hospital';
  end if;

  if length(trim(coalesce(p_diagnostico, ''))) = 0 then
    raise exception 'El diagnóstico es obligatorio';
  end if;

  -- OJO: si acá se corrige el DNI y ese DNI corregido ya pertenece a
  -- OTRO paciente existente, upsert_paciente reengancha esta ocupación
  -- a esa otra identidad (mismo comportamiento que ocupar_cama). Es lo
  -- correcto si era un typo, pero vale la pena mostrarlo como advertencia
  -- en el frontend antes de confirmar el cambio de DNI.
  v_paciente_id := public.upsert_paciente(p_apellido_nombre, p_dni, p_domicilio, p_telefono);

  update public.ocupaciones
  set paciente_id = v_paciente_id,
      diagnostico = p_diagnostico,
      actualizado_por = auth.uid()
  where cama_id = p_cama_id and fecha_egreso is null;

  if not found then
    raise exception 'Esta cama no tiene una ocupación activa para editar';
  end if;
end;
$$;


-- ---------------------------------------------
-- 8.4 Solicitar reserva/derivación de una cama (sólo médico/administración)
-- ---------------------------------------------
create or replace function public.solicitar_reserva_derivacion(
  p_cama_id uuid,
  p_hospital_origen_id uuid,
  p_apellido_nombre text,
  p_diagnostico text,
  p_dni text default null,
  p_domicilio text default null,
  p_telefono text default null
)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_cama public.camas;
  v_solicitud_id uuid;
  v_destinatario record;
  v_paciente_id uuid;
begin
  if not public.es_medico_o_admin(p_hospital_origen_id) then
    raise exception 'No tenés permiso de médico/administración en el hospital de origen';
  end if;

  select * into v_cama from public.camas where id = p_cama_id for update;
  if v_cama is null then
    raise exception 'La cama no existe';
  end if;

  if v_cama.estado <> 'libre' then
    raise exception 'La cama no está libre (estado actual: %)', v_cama.estado;
  end if;

  if length(trim(coalesce(p_diagnostico, ''))) = 0 then
    raise exception 'El diagnóstico es obligatorio';
  end if;

  v_paciente_id := public.upsert_paciente(p_apellido_nombre, p_dni, p_domicilio, p_telefono);

  insert into public.solicitudes_derivacion (
    cama_id, hospital_origen_id, hospital_destino_id, medico_origen_id, paciente_id, diagnostico
  ) values (
    p_cama_id, p_hospital_origen_id, v_cama.hospital_id, auth.uid(), v_paciente_id, p_diagnostico
  ) returning id into v_solicitud_id;

  update public.camas set estado = 'reservada' where id = p_cama_id;

  -- Notificación in-app a todo médico/administración activo del hospital destino.
  for v_destinatario in
    select hu.persona_id from public.hospital_usuarios hu
    where hu.hospital_id = v_cama.hospital_id
      and hu.activo
      and hu.rol in ('medico', 'administracion')
  loop
    insert into public.notificaciones (persona_id, hospital_id, tipo, referencia_id, mensaje)
    values (
      v_destinatario.persona_id, v_cama.hospital_id, 'derivacion_pedido', v_solicitud_id,
      'Pedido de reserva de cama ' || v_cama.numero_cama || ' — paciente ' || p_apellido_nombre
    );
  end loop;

  return v_solicitud_id;
end;
$$;


-- ---------------------------------------------
-- 8.5 Aceptar una solicitud de reserva/derivación
-- ---------------------------------------------
create or replace function public.aceptar_solicitud_derivacion(p_solicitud_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_solicitud public.solicitudes_derivacion;
  v_paciente_nombre text;
begin
  select * into v_solicitud from public.solicitudes_derivacion where id = p_solicitud_id for update;
  if v_solicitud is null then
    raise exception 'La solicitud no existe';
  end if;

  if not public.es_medico_o_admin(v_solicitud.hospital_destino_id) then
    raise exception 'No tenés permiso de médico/administración en el hospital destino';
  end if;

  if v_solicitud.estado <> 'pendiente' then
    raise exception 'La solicitud ya fue resuelta (estado: %)', v_solicitud.estado;
  end if;

  update public.solicitudes_derivacion
  set estado = 'aceptada', medico_destino_id = auth.uid(), fecha_resolucion = now()
  where id = p_solicitud_id;

  insert into public.ocupaciones (
    cama_id, hospital_id, paciente_id, diagnostico,
    derivado_de_hospital_id, solicitud_derivacion_id, creado_por
  ) values (
    v_solicitud.cama_id, v_solicitud.hospital_destino_id, v_solicitud.paciente_id, v_solicitud.diagnostico,
    v_solicitud.hospital_origen_id, p_solicitud_id, auth.uid()
  );

  update public.camas
  set estado = 'ocupada', derivado_de_hospital_id = v_solicitud.hospital_origen_id
  where id = v_solicitud.cama_id;

  select apellido_nombre into v_paciente_nombre from public.pacientes where id = v_solicitud.paciente_id;

  insert into public.notificaciones (persona_id, hospital_id, tipo, referencia_id, mensaje)
  values (
    v_solicitud.medico_origen_id, v_solicitud.hospital_origen_id, 'derivacion_aceptada', p_solicitud_id,
    'Tu pedido de reserva fue aceptado — paciente ' || v_paciente_nombre
  );
end;
$$;


-- ---------------------------------------------
-- 8.6 Rechazar una solicitud de reserva/derivación
-- ---------------------------------------------
create or replace function public.rechazar_solicitud_derivacion(p_solicitud_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_solicitud public.solicitudes_derivacion;
  v_paciente_nombre text;
begin
  select * into v_solicitud from public.solicitudes_derivacion where id = p_solicitud_id for update;
  if v_solicitud is null then
    raise exception 'La solicitud no existe';
  end if;

  if not public.es_medico_o_admin(v_solicitud.hospital_destino_id) then
    raise exception 'No tenés permiso de médico/administración en el hospital destino';
  end if;

  if v_solicitud.estado <> 'pendiente' then
    raise exception 'La solicitud ya fue resuelta (estado: %)', v_solicitud.estado;
  end if;

  update public.solicitudes_derivacion
  set estado = 'rechazada', medico_destino_id = auth.uid(), fecha_resolucion = now()
  where id = p_solicitud_id;

  update public.camas set estado = 'libre' where id = v_solicitud.cama_id;

  select apellido_nombre into v_paciente_nombre from public.pacientes where id = v_solicitud.paciente_id;

  insert into public.notificaciones (persona_id, hospital_id, tipo, referencia_id, mensaje)
  values (
    v_solicitud.medico_origen_id, v_solicitud.hospital_origen_id, 'derivacion_rechazada', p_solicitud_id,
    'Tu pedido de reserva fue rechazado — paciente ' || v_paciente_nombre
  );
end;
$$;


-- ---------------------------------------------
-- 8.7 Buscar persona por DNI (autocompletar apellido/nombre en el alta)
-- ---------------------------------------------
create or replace function public.buscar_persona_por_dni(p_dni text)
returns table (id uuid, apellido text, nombre text)
language plpgsql security definer set search_path = public
as $$
begin
  if not (public.es_administracion_en_algun_hospital() or public.es_superusuario()) then
    raise exception 'No tenés permiso para buscar personas';
  end if;

  return query
    select p.id, p.apellido, p.nombre from public.personas p where p.dni = p_dni;
end;
$$;


-- ---------------------------------------------
-- 8.7b Buscar paciente por DNI (para mostrar "ya existe" antes de
--      ocupar una cama o pedir una derivación — cualquier usuario
--      activo del sistema puede usarla, no hace falta ser admin)
-- ---------------------------------------------
create or replace function public.buscar_paciente_por_dni(p_dni text)
returns table (id uuid, apellido_nombre text, domicilio text, telefono text)
language plpgsql security definer set search_path = public
as $$
begin
  if not public.es_usuario_activo() then
    raise exception 'No tenés permiso para buscar pacientes';
  end if;

  return query
    select p.id, p.apellido_nombre, p.domicilio, p.telefono from public.pacientes p where p.dni = p_dni;
end;
$$;


-- ---------------------------------------------
-- 8.8 Alta de una persona YA EXISTENTE en un nuevo hospital
--     (si el DNI no existe todavía, ver decisión de diseño #3 —
--      eso lo resuelve una Edge Function con service_role)
-- ---------------------------------------------
create or replace function public.alta_persona_en_hospital(
  p_persona_id uuid,
  p_hospital_id uuid,
  p_rol public.rol_sistema,
  p_profesion_funcion text
)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not (public.es_administracion(p_hospital_id) or public.es_superusuario()) then
    raise exception 'No tenés permiso de administración en este hospital';
  end if;

  insert into public.hospital_usuarios (persona_id, hospital_id, rol, profesion_funcion, activo)
  values (p_persona_id, p_hospital_id, p_rol, p_profesion_funcion, true)
  on conflict (persona_id, hospital_id)
  do update set rol = excluded.rol, profesion_funcion = excluded.profesion_funcion, activo = true;
end;
$$;


-- ---------------------------------------------
-- 8.9 Crear hospital (sólo superusuario)
-- ---------------------------------------------
create or replace function public.crear_hospital(
  p_nombre text,
  p_domicilio text,
  p_director_nombre text,
  p_telefono text
)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_id uuid;
begin
  if not public.es_superusuario() then
    raise exception 'Sólo el superusuario puede crear hospitales';
  end if;

  if length(trim(coalesce(p_nombre,''))) = 0 or length(trim(coalesce(p_domicilio,''))) = 0
     or length(trim(coalesce(p_director_nombre,''))) = 0 or length(trim(coalesce(p_telefono,''))) = 0 then
    raise exception 'Nombre, domicilio, director y teléfono son todos obligatorios';
  end if;

  insert into public.hospitales (nombre, domicilio, director_nombre, telefono)
  values (p_nombre, p_domicilio, p_director_nombre, p_telefono)
  returning id into v_id;

  return v_id;
end;
$$;


-- ---------------------------------------------
-- 8.10 Marcar una novedad como vista (para que el popup no repita)
-- ---------------------------------------------
create or replace function public.marcar_novedad_vista(p_novedad_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.novedades_vistas (novedad_id, persona_id)
  values (p_novedad_id, auth.uid())
  on conflict (novedad_id, persona_id) do nothing;
end;
$$;


-- ============================================================
-- 9. QUÉ QUEDA PENDIENTE (fuera del alcance de este script SQL)
-- ============================================================
-- - Edge Function para dar de alta un DNI 100% nuevo (crea el
--   auth.user vía Admin API + la fila en personas).
-- - Edge Function que dispare Web Push real a partir de cada fila
--   nueva en "notificaciones" (usando push_subscriptions).
-- - Lógica de sincronización offline en el cliente (esto es 100%
--   frontend, la base ya soporta que las escrituras lleguen
--   "tarde" una vez que vuelve la conexión, porque son RPC
--   idempotentes por su propia validación de estado).
-- - Login por huella digital (WebAuthn) — no toca este schema.
-- ============================================================
