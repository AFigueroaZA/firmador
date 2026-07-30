# Residuales de dependencias de la fase 3

Fecha de revisión: 2026-07-30

## `brace-expansion` (`GHSA-mh99-v99m-4gvg`)

El audit conserva una alerta alta para `brace-expansion` 1.1.16 y 2.1.2. El
[advisory](https://github.com/advisories/GHSA-mh99-v99m-4gvg) sólo ofrece una
corrección en 5.0.8.

No se fuerza 5.0.8 sobre esas líneas porque cambia la interfaz CommonJS: las
versiones antiguas exportan directamente la función de expansión, mientras que
5.x exporta un objeto con `expand`. Consumidores actuales como `minimatch` 3
esperan la interfaz antigua. Un override global cerraría el contador del audit,
pero rompería lint, pruebas o herramientas de build.

Las rutas de producción reportadas son indirectas:

- TypeORM → `glob` 10 → `minimatch` 9 → `brace-expansion` 2.
- Adaptador Netlify → tooling de empaquetado → `glob` 10 → `minimatch` 9 →
  `brace-expansion` 2.

En Firmaliza estas rutas procesan patrones definidos por el repositorio durante
descubrimiento o empaquetado; no reciben patrones glob controlados por una
solicitud remota. La exposición práctica queda limitada, pero la dependencia
sigue técnicamente afectada.

Acción de seguimiento: retirar este residual cuando TypeORM y el tooling de
Netlify adopten una versión de `glob`/`minimatch` compatible con
`brace-expansion` 5.0.8 o cuando exista un backport oficial para 1.x y 2.x.
