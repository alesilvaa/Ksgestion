# Arquitectura inicial

## Decisión

Monolito modular en Next.js App Router: componentes de servidor por defecto, islas cliente para interacción, Server Actions/Route Handlers para mutaciones y Supabase como autenticación, PostgreSQL y almacenamiento. No se agrega un backend separado.

## Módulos

- `src/app`: rutas y composición de páginas.
- `src/components/ui`: primitives del sistema de diseño.
- `src/components/layout`: navegación y shell de aplicación.
- `src/features/records`: carga, consulta, validación y estado temporal de registros.
- `src/features/dashboard`: lectura accionable del período seleccionado.
- `src/lib/supabase`: clientes separados para navegador y servidor.
- `supabase/migrations`: esquema, índices y RLS versionados.

## Flujo objetivo

La UI envía una intención validada con Zod a una Server Action. La acción obtiene el usuario autenticado, valida su membresía y ejecuta la operación con el cliente Supabase del usuario; PostgreSQL vuelve a aplicar la autorización mediante RLS. Los totales se calculan desde registros persistidos, no desde fórmulas importadas.

## Estado de esta entrega

`DemoAppProvider` mantiene registros ficticios en `localStorage` para demostrar el flujo sin fingir una conexión. Será reemplazado por consultas de servidor y mutaciones autenticadas en la fase de integración.
