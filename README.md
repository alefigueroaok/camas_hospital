# pwa-camas-app

PWA de gestión de camas hospitalarias. React + Vite + TypeScript + Tailwind, backend Supabase,
deploy en Cloudflare Pages.

## Estructura

```
src/
  lib/supabase.ts          Cliente Supabase único y tipado
  types/database.types.ts  Tipos que reflejan el schema SQL (regenerar con supabase CLI)
  contexts/AuthContext.tsx Sesión + profile + rol + redirección por rol
  hooks/useCamas.ts        Fetch inicial + suscripción Realtime a la tabla `camas`
  components/auth/         ProtectedRoute (exige sesión), RoleGuard (exige rol)
  components/camas/        UI de la grilla de camas
  components/layout/       Layout con navbar
  pages/                   LoginPage, DashboardPage, AdminUsuariosPage
  router/AppRouter.tsx     Definición de rutas
```

## Sistema de diseño

Tokens en `tailwind.config.ts`. Reglas del sistema:

- **`institucional-*`** (navy → royal blue #1E4DB0): sólo estructura — navbar, headers de
  sector, botones primarios. Nunca se usa para indicar estado de una cama.
- **`disponible` / `ocupada` / `limpieza` / `reservada`**: color exclusivo de significado clínico,
  cada uno con escala `100` (fondo tenue), `500` (color fuerte/borde/ícono), `700` (texto AA sobre
  el `100`). `reservada` (violeta) no estaba en el brief de paleta — se agregó porque el enum
  `estado_cama` la incluye.
- Tipografía en 3 roles: `font-display` (Space Grotesk, headers institucionales), `font-sans`
  (Inter, UI/cuerpo), `font-mono` (JetBrains Mono, números de cama/DNI/timestamps).
- `min-h-touch` (48px): altura mínima de cualquier control táctil de cambio de estado.

Componentes de referencia: `components/camas/CamaCardMobile.tsx` (mobile) y
`components/camas/DashboardMatrix.tsx` (desktop, agrupado por sector).

## Puesta en marcha

```bash
npm install
cp .env.example .env.local   # completar VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY
npm run dev
```

## Requisito en Supabase: habilitar Realtime en `camas`

Por defecto las tablas no emiten eventos de Postgres Changes. Hay que agregarla a la
publicación de Realtime (una sola vez, desde el SQL Editor o Dashboard > Database > Replication):

```sql
alter publication supabase_realtime add table public.camas;
```

Sin este paso, `useCamas` sigue funcionando con el fetch inicial pero nunca recibe updates en vivo.

## Deploy en Cloudflare Pages

- Build command: `npm run build`
- Output directory: `dist`
- Variables de entorno (Production y Preview): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- `wrangler.toml` ya apunta `pages_build_output_dir` a `dist`.

## Pendiente / próximos pasos

- Trigger en `auth.users` para crear el `profile` automáticamente al registrar un usuario.
- CRUD real en `AdminUsuariosPage` (alta de cuentas, asignación de rol/sector).
- Acción para cambiar `estado` de una cama desde `CamasGrid` (update + optimista, el trigger de
  auditoría en la base ya registra el cambio solo).
- Iconos reales en `public/icons/` (192x192 y 512x512) para el manifest PWA.
