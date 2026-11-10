# KS Gestión

Sistema de pagos y registros para un flujo administrativo hoy realizado en Excel. La interfaz incluye Inicio, Registros, carga rápida con detalles progresivos, filtros mensuales, exportación CSV y perfiles con avatares generados por Blobatar.

La persistencia y autenticación usan Supabase. El sistema inicia sin registros ficticios; una cuenta autenticada necesita pertenecer a un workspace para consultar o cargar información.

## Requisitos

- Node.js 24 o superior
- pnpm 10 o superior
- Un proyecto Supabase para habilitar autenticación y persistencia

## Ejecución local

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Abrí [http://localhost:3000](http://localhost:3000). Las rutas privadas redirigen a `/login` cuando no hay una sesión válida.

## Variables

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

Usá la publishable key del proyecto, nunca una secret/service-role key en variables públicas.

## Verificación

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Base de datos

Las migraciones están en `supabase/migrations/` e incluyen:

- esquema de workspaces, categorías, registros e importaciones;
- políticas RLS y roles de administrador/operador;
- superadministradores de plataforma;
- perfil automático desde Google y onboarding inicial de nombre/avatar;
- workspace inicial vacío, sin registros ni categorías de plantilla.

Aplicá siempre migraciones nuevas en orden; no edites una migración ya aplicada.

## Autenticación con Google

El cliente OAuth web debe usar:

- origen local: `http://localhost:3000`;
- callback de Supabase: `https://<project-ref>.supabase.co/auth/v1/callback`.

El Client ID y Client Secret se guardan exclusivamente en el proveedor Google de Supabase, nunca en `.env.local` ni en el repositorio.

## Despliegue

1. Creá un proyecto en Vercel vinculado a este repositorio.
2. Configurá las dos variables públicas de Supabase por ambiente.
3. Aplicá y verificá las migraciones en Supabase.
4. Ejecutá las verificaciones y desplegá con el preset de Next.js.

Los archivos reales deben guardarse localmente en `reference/`, carpeta excluida de Git.
