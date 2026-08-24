# pwa-camas-app

PWA de gestión de camas hospitalarias, multi-hospital. React + Vite + TypeScript + Tailwind,
backend Supabase, deploy en Cloudflare Pages.

## Puesta en marcha

```bash
npm install
cp .env.example .env.local   # completar VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY
npm run dev
```

## Base de datos

El schema completo está en `supabase/schema_multi_hospital.sql`. Correrlo en el SQL Editor de
Supabase. Después hay que crear manualmente el primer superusuario (ver la conversación / README
de la fase de base de datos) — no hay forma de auto-crearlo desde la app.

## Login

El login es por DNI, no por email. `src/lib/dni.ts` convierte el DNI a un email sintético
(`dni-<DNI>@dni.sistema-camas.local`) que se usa puramente para hablar con Supabase Auth — el
usuario nunca lo ve. Al crear una cuenta en Supabase (Authentication → Users), el email TIENE que
seguir ese mismo patrón con el DNI real de la persona, o el login no la va a encontrar.

## Deploy en Cloudflare Pages

- Build command: `npm run build`
- Output directory: `dist`
- Variables de entorno (Production y Preview): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

## Estado de esta fase

Hecho: login por DNI, selector de hospital (si trabajás en más de uno), alta de personal por DNI
con autocompletado, panel de superusuario placeholder.

Pendiente: tablero de camas en tiempo real, flujo de derivación, notificaciones push, offline,
login por huella (WebAuthn), creación de hospitales desde el panel de superusuario.
