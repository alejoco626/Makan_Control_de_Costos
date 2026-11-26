# Historial de versiones

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/). Versionado semántico.

## [1.4.0-beta] - 2026-11-26

### Agregado
- **Actualizaciones automáticas** desde los Releases de GitHub: aviso pequeño que no interrumpe, con «Actualizar ahora» y «Más tarde» (4 horas). Descarga con barra de avance, comprueba la suma SHA-256, reemplaza el `.exe` al cerrarse y se reabre. Botón «Buscar actualizaciones» en el menú lateral.
- `build.bat` genera también la suma de verificación que acompaña a cada versión.
- Formatos de texto y número normalizados al escribir: moneda (`Q1,234.56`, `-Q5.00`), importes con dos decimales, pegado de `1,234.56` o `1.234,56`, nombres con mayúsculas, correo en minúsculas, teléfono `5555-1234`, hora `hh:mm`, partida `8512.30.00.00`, números enteros y porcentajes con validación.
- Plurales correctos («1 día», «8 días»).

### Cambiado
- La versión vive en `version.py`.

## [1.3.0-beta] - 2026-11-26

Errores, condiciones y avisos.

### Agregado
- **Avisos de captura** junto a cada dato y en Verificaciones, con botón «Ir al dato». Dos niveles: *error* (dato imposible o contradictorio) y *aviso* (dato sospechoso). Revisan:
  - fechas inválidas, futuras o en orden ilógico (pedido, guía, factura, aduanas, pago);
  - importes negativos, descuento con signo contrario, cargos en cero o sin concepto, bultos y peso en cero, días de crédito fuera de lo habitual;
  - CIF que difiere más de 15% de la mercadería, gastos de TACSA superiores a 40%, IVA en cero;
  - tipo de cambio manual lejos del Banguat o fuera de rango; DAI manual fuera de 0–20%; partida vacía, ausente de la tabla o distinta de lo que implica la factura;
  - formatos de pedido, guía, factura y cuenta; facturas, controles, notas de débito y pedidos repetidos en otra guía;
  - factura vencida o por vencer sin pago confirmado.
- **Validación con condiciones:** no se puede validar con alertas o errores; con pendientes o avisos pide una segunda confirmación.
- **Reapertura automática:** si cambias un dato de un expediente validado, la revisión se reabre y el tipo de cambio vuelve a seguir al Banguat.
- **Datos dañados:** al abrir se corrigen tipos y claves que faltan (números guardados como texto, listas rotas, usuarios o aranceles inválidos). Si una pantalla falla, se muestra un aviso en lugar de quedar en blanco.
- Aviso de error inesperado y reintento del guardado con un clic cuando falla.
- Usuarios: se rechazan nombres y correos repetidos.

## [1.2.0-beta] - 2026-11-26

Revisión general del proyecto.

### Corregido
- Un expediente en blanco ya no sale «todo correcto»: sin datos, las verificaciones quedan pendientes.
- El tipo de cambio automático movía el costo de expedientes cerrados cada día. Ahora, al validar, el tipo de cambio queda fijo; al reabrir vuelve a seguir al Banguat.
- Una guía distinta entre el pedido, la factura y el expediente ahora se detecta.
- La fecha del Banguat se mostraba como AAAA-MM-DD; ahora dd/mm/aaaa.
- Un error inesperado en la consulta al Banguat ya no detiene el programador.
- Si `datos.json` se daña, se aparta en lugar de sobrescribirse; no se guardan datos vacíos.
- Lo último escrito se guarda al cerrar la ventana.
- Los campos numéricos rechazan letras y negativos (salvo el descuento).

### Agregado
- Verificación del tipo de cambio (sin consulta, valor viejo o faltante).
- Fecha del pedido de eBay (necesaria para el libro de compras).
- Botón para copiar factura, fecha y monto de TACSA al control de Makan.
- Fechas en dd/mm/aaaa en todos los campos y hora en hh:mm.

### Cambiado
- El proyecto pasa a llamarse «Control de costos» (el ejecutable es `ControlDeCostos.exe`).
- Diseño más sobrio: sin degradados, brillos ni bordes de acento; paneles planos, esquinas rectas y animaciones más cortas, solo donde ayudan (cambio de pantalla, medidor, pestañas).
- Textos de ejemplo y observaciones reescritos, sin referencias a las fotos de origen.

## [1.1.1-beta] - 2026-11-26

### Cambiado
- La guía sale de la barra lateral y pasa a ser una sección propia del menú, «Guías», donde se listan, crean, editan y eligen los expedientes. La guía en uso se muestra sobre el título de cada pantalla.
- Ya se pueden tener varias guías (cada una con sus documentos). La app recuerda cuál estaba en uso.

## [1.1.0-beta] - 2026-11-26

### Agregado
- Tipo de cambio automático del Banco de Guatemala (servicio web del Banguat), consultado a las 00:00, 06:00, 12:00 y 16:00, con reintento cada 10 minutos si falla. Muestra la última consulta, la próxima programada y un botón «Consultar ahora».
- Área de Contabilidad: revisión contable con «Validar expediente», costeo e impuestos, libro de compras, partida contable (copiable) y cuentas por pagar.
- DAI configurable: deducido de la factura, por partida arancelaria (tabla editable) o manual.
- Área de Usuarios con datos básicos, validación y cambio de usuario en uso.
- Saludo variable con nombre y puesto, fecha y hora en vivo.
- Tema claro (por defecto) y modo noche, con paleta derivada del rojo de Makan.
- Jerarquía de botones: uno principal por pantalla, secundarios y discretos.

### Corregido
- La pantalla ya baja con rueda, flechas, RePág/AvPág, Inicio/Fin y barra espaciadora.
- El panel lateral ya no se corta ni se desacomoda cuando el contenido es largo.
- Documentos ordenados por flujo (1 a 4) con navegación fija.
- Los datos guardados de la 1.0.0 se conservan y se completan al abrir.

## [1.0.0-beta] - 2026-11-26

Primera versión de prueba.

### Agregado
- App de escritorio con pywebview, lista para convertirse en `.exe` con `build.bat`.
- Cadena de documentos: pedido eBay → factura TACSA → control Makan → nota de débito del banco.
- Edición de los datos de cada documento, con guardado automático en `%APPDATA%`.
- Costeo de la importación: mercadería, gastos de TACSA, DAI, IVA, costo puesto y coeficiente de gastos.
- 9 verificaciones cruzadas entre documentos, con confirmación manual del vínculo del pago bancario.
- Exportación a CSV.
- Identidad visual de Makan: negro y rojo, bandera a cuadros, tablero de instrumentos, esqueletos de carga y animaciones rápidas.
- Datos de ejemplo iniciales.

### Pendiente
- Varios expedientes.
- Lectura automática de fotos con OCR.
- Probar la ventana de pywebview y el diálogo de exportación en Windows.
