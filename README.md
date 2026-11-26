# Makan · Control de costos

App de escritorio (Python + pywebview + HTML/CSS/JS) para llevar el costo de las importaciones de repuestos. Relaciona el pedido de eBay, la factura de TACSA, el control interno de Makan y la nota de débito del banco; calcula el costo puesto y marca lo que no cuadra.

**Versión actual:** `1.4.0-beta` (ver [CHANGELOG](CHANGELOG.md)).

## Qué hace

- **Guías:** cada importación es un expediente; se pueden tener varios.
- **Cadena, Documentos y Verificaciones:** captura de los cuatro documentos 10 cruces automáticos y avisos de captura.
- **Contabilidad:** costeo e impuestos (tipo de cambio y DAI), libro de compras, partida contable y cuentas por pagar.
- **Tipo de cambio del Banguat:** consulta automática a las 00:00, 06:00, 12:00 y 16:00, con botón para consultar al momento. Al validar un expediente el tipo de cambio queda fijo.
- **Usuarios:** quién usa la app y con qué puesto; el saludo cambia con la hora y el día.
- Tema claro y modo noche.

## Probarla en Windows 10/11

1. Instala Python 3.10 o más nuevo (marca "Add Python to PATH").
2. Doble clic en `ejecutar.bat`.

## Crear el ejecutable

Doble clic en `build.bat`. Queda en `dist\ControlDeCostos.exe`. Necesita Microsoft Edge WebView2, que ya viene en Windows 10/11 actualizados.

## Actualizaciones automáticas

La app busca versiones nuevas al abrirse y cada 6 horas en los Releases de un repositorio público de GitHub. Si hay una, aparece un aviso pequeño abajo a la derecha con **Actualizar ahora** y **Más tarde** (silencia 4 horas; el aviso queda en el menú lateral). Al actualizar, la app descarga el `.exe`, comprueba su suma SHA-256, se cierra, se reemplaza y se vuelve a abrir. Los datos no se tocan. La versión anterior queda como `ControlDeCostos.exe.anterior`.

Para activarlo una sola vez:
1. Crea el repositorio en GitHub y sube el código.
2. En `%APPDATA%\RelacionDocumentos\config.json` escribe `{"repo": "tu-usuario/tu-repositorio"}` (o cambia `REPO_PREDETERMINADO` en `actualizador.py` antes de compilar).

Para publicar una versión: sube de versión en `version.py`, ejecuta `build.bat`, crea un Release con la etiqueta `vX.Y.Z-beta` y adjunta `dist\ControlDeCostos.exe` y `dist\ControlDeCostos.exe.sha256`.

## Datos

Se guardan solos en `%APPDATA%\RelacionDocumentos\datos.json` (el nombre de la carpeta se conserva para no perder datos de versiones anteriores). El tipo de cambio queda en `tipo_cambio.json` de la misma carpeta. Si `datos.json` se daña, se aparta como `datos.dañado.json` y la app abre con los datos de ejemplo.

## Estructura

| Archivo | Qué hace |
| --- | --- |
| `app.py` | Ventana de escritorio, guardado y exportación |
| `actualizador.py` | Búsqueda e instalación de actualizaciones |
| `version.py` | Número de versión (un solo lugar) |
| `banguat.py` | Consulta del tipo de cambio y programador de horas |
| `web/index.html` | Estructura de la pantalla |
| `web/style.css` | Diseño con la identidad de Makan (claro y noche) |
| `web/app.js` | Pantallas e interacción |
| `web/calc.js` | Cálculos, cruces y operaciones contables |
| `web/seed.js` | Datos de ejemplo del expediente 896705 |
| `tests/` | Pruebas: `node tests/calc.test.js` y `python -m unittest discover -s tests` |

## Versiones

Se usa [versionado semántico](https://semver.org/lang/es/). Cada versión lleva una etiqueta de git (`v1.4.0-beta`) y una entrada en el CHANGELOG.

```
git tag -a v1.4.1-beta -m "Descripción"
git push origin main --tags
```
