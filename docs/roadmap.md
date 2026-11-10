# Plan de desarrollo

## Entrega 1 — base navegable (actual)

- Sistema visual, navegación, Inicio y Registros.
- Carga funcional con validación y detalles progresivos.
- Datos ficticios locales claramente identificados.
- Modelo SQL preliminar, RLS base y clientes Supabase preparados.

## Entrega 2 — discovery con datos reales

- Incorporar las dos planillas en `reference/`.
- Documentar hojas, columnas, fórmulas, inconsistencias y ejemplos anonimizados.
- Ajustar esquema, reglas de totales y casos de importación.

## Entrega 3 — persistencia segura

- Autenticación SSR, proxy de sesión y rutas protegidas.
- CRUD real con Server Actions, autorización por workspace y auditoría.
- Gestión de categorías y roles.

## Entrega 4 — importación

- Lectura XLSX/CSV en servidor, detección y mapeo.
- Vista previa, advertencias, correcciones, duplicados y confirmación.
- Importación transaccional por lotes y trazabilidad completa.

## Entrega 5 — calidad y despliegue

- Pruebas unitarias, integración y Playwright de flujos críticos.
- Revisión de accesibilidad, seguridad y responsive.
- Entornos Supabase, preview de Vercel y documentación operativa.
