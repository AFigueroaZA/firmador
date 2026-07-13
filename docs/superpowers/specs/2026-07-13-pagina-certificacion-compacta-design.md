# Página final compacta y coordenadas de firma compatibles

## Contexto

La aplicación agrega una página al final del PDF para que el proveedor inserte su certificación dinámica. Algunos PDF, como los A4 con ancho `595.2756 pt`, producen coordenadas decimales. El servicio SOAP del proveedor espera enteros y rechaza esos documentos con `Unmarshalling Error: Not a number`.

Cuando falla la firma directa con un certificado vigente, el flujo actual oculta el error y comienza una autorización completa con ClaveÚnica. Esto hace parecer que el certificado se perdió y expone al cliente a una autenticación innecesaria.

La página de certificación actual también resulta demasiado alta: reserva hasta `180 pt` para la certificación, además del encabezado y los márgenes.

## Objetivos

- Firmar PDF cuyas dimensiones y coordenadas originales sean enteras o decimales.
- Mantener todas las páginas originales sin cambiar su tamaño ni desplazar su contenido.
- Agregar una página final compacta dedicada exclusivamente a la certificación del proveedor.
- Evitar una nueva autenticación con ClaveÚnica cuando el certificado almacenado es válido y el error pertenece al documento o a la firma SOAP.
- Conservar un error útil en el proceso cuando la firma directa no pueda completarse.

## Diseño

### Preparación del PDF

La preparación conservará el estampado opcional de la imagen del usuario sobre la página original seleccionada. Después agregará una página final nueva con el mismo ancho visual del último folio, normalizado a un valor entero positivo para evitar dimensiones SOAP incompatibles.

La página final usará:

- margen entero máximo de `16 pt`;
- encabezado de `24 pt`;
- área de certificación adaptativa entre `96 pt` y `120 pt`;
- altura total máxima de `176 pt`.

El área se calculará dentro de los límites de la página. Las opciones devueltas para el proveedor (`page`, `x`, `y`, `width`, `height`) serán enteros positivos y describirán completamente el rectángulo disponible.

### Límite de integración SOAP

El constructor del sobre SOAP normalizará defensivamente las cuatro coordenadas finales:

- inferior izquierda: `x`, `y`;
- superior derecha: `x + width`, `y + height`.

Todas se enviarán como enteros finitos. La normalización en este límite protege también futuras llamadas que no pasen por la preparación estándar del PDF. El rectángulo debe conservar ancho y alto positivos después del redondeo.

### Manejo de errores

Si existe una inscripción `ACTIVE` vigente y la firma directa falla, el proceso quedará en `FAILED` con el mensaje sanitizado del proveedor. No se iniciará ClaveÚnica automáticamente.

El fallback a autorización externa seguirá disponible únicamente cuando no exista una inscripción reutilizable válida. La interfaz de resultado mostrará el error almacenado y permitirá comenzar otro proceso.

### Compatibilidad

No se modificará el contrato público de creación de procesos ni el formato de `SignOptions`. No se requieren cambios de base de datos ni nuevas variables de entorno.

## Pruebas

1. El sobre SOAP debe convertir coordenadas decimales, incluida `571.2756`, en valores enteros.
2. Las coordenadas enteras existentes deben conservar el mismo resultado.
3. Un PDF A4 decimal debe producir una página final compacta con opciones enteras y dentro de límites.
4. Un PDF carta debe mantener la misma garantía.
5. Un formato pequeño debe respetar dimensiones positivas y la altura máxima.
6. Una imagen de firma opcional debe seguir estampándose sobre la página original.
7. Un fallo de firma con inscripción activa debe dejar el proceso en `FAILED` y no invocar la creación de una autorización ClaveÚnica.
8. La batería completa de API debe continuar pasando.

## Criterios de aceptación

- El caso reproducido con ancho A4 decimal deja de generar `Unmarshalling Error: Not a number`.
- La página de certificación final mide como máximo `176 pt` de alto.
- Ninguna página original cambia de tamaño ni pierde contenido.
- Un error de firma directa no solicita nuevamente ClaveÚnica.
- Las pruebas unitarias, de integración, lint y build finalizan correctamente.
