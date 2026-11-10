# Modelo de datos preliminar

## Estado del análisis

No se encontró la carpeta `reference/` ni las dos planillas mencionadas al 9 de noviembre de 2026. Por eso el esquema es deliberadamente preliminar y no afirma reglas financieras, mapeos de columnas ni lógica de totales combinados.

## Entidades

- `profiles`: extensión mínima de `auth.users`.
- `workspaces`: límite de aislamiento de datos del cliente.
- `workspace_members`: rol `admin` u `operator` por espacio.
- `categories`: clasificación opcional, independiente del grupo histórico.
- `records`: movimiento principal o desglose asociado mediante `parent_record_id`.
- `import_batches`: archivo y huella para prevenir reimportaciones accidentales.
- `import_rows`: fila original, normalización, advertencias y resultado.

## Reglas conservadoras

- PYG se almacena en `bigint`; otras monedas y tipos de cambio usan `numeric` exacto.
- La fecha de negocio es `date`; la auditoría usa `timestamptz`.
- `record_group` solo distingue transferencias mensuales y pagos varios; no expresa ingreso/egreso.
- Un desglose requiere padre y debe excluirse de totales principales.
- Categoría es opcional y no se asigna automáticamente a históricos.
- Los metadatos de importación preservan archivo, hoja, fila y datos originales.

## Incertidumbres a validar con Excel

- Estructura real de encabezados, hojas y filas auxiliares.
- Semántica de subtotales, transferencias y pagos.
- Tratamiento exacto de USD y tipo de cambio.
- Relación entre movimientos principales y desgloses de viaje.
- Duplicados legítimos y calidad de fechas.
- Qué reglas permiten mostrar un total combinado.
