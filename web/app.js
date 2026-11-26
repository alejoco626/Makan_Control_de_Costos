// Makan · Control de costos. Interfaz: vistas, saludo, reloj, tipo de cambio, contabilidad, guías y usuarios.
(function () {
  "use strict";
  const C = window.Calc;
  const { fq, fu, ftc, parseMonto, normalizar, fpct, fdate, fdateVacio, parseFecha, nf, num } = C;
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) =>
    String(s === undefined || s === null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const HORAS_TC = [0, 6, 12, 16];

  const S = {
    datos: null, vista: "inicio", tab: "costeo", tc: null, enApp: false,
    editUsuario: null, editGuia: null, confirmaValidar: false, act: null, actVer: false, actCerrada: false, actVerError: false, errores: {}, confirmar: null, sello: null,
  };

  /* ---------- Iconos ---------- */
  const P = {
    cart: '<circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M2 3h3l2.4 11.2a1 1 0 0 0 1 .8h8.8a1 1 0 0 0 1-.8L20 7H6"/>',
    truck: '<path d="M1 6h13v10H1zM14 10h4l3 3v3h-7z"/><circle cx="6" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',
    paper: '<path d="M6 2h9l5 5v15H6z"/><path d="M15 2v5h5M9 13h7M9 17h7"/>',
    bank: '<path d="M3 10l9-6 9 6M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18"/>',
    home: '<path d="M3 11l9-8 9 8v10h-6v-6H9v6H3z"/>',
    docs: '<path d="M7 3h8l4 4v14H7z"/><path d="M4 7v14h11M10 12h6M10 16h6"/>',
    check: '<path d="M5 12l5 5 9-10"/>',
    calc: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 12h2M12 12h2M16 12h0M8 16h2M12 16h2M16 16h0"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5c2.2.7 3.5 2.6 3.5 5.5"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon: '<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5z"/>',
    refresh: '<path d="M20 11a8 8 0 0 0-14.5-4M4 4v4h4M4 13a8 8 0 0 0 14.5 4M20 20v-4h-4"/>',
    link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3A4 4 0 0 0 11 18.7l1-1"/>',
    ok: '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l3 3 5-6"/>',
    warn: '<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18h0"/>',
    wait: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    save: '<path d="M5 3h11l3 3v15H5z"/><path d="M8 3v6h7V3M8 21v-7h8v7"/>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>',
  };
  const ic = (n, c = "ico") => `<svg class="${c}" viewBox="0 0 24 24" aria-hidden="true">${P[n] || ""}</svg>`;
  const ESTADO = {
    ok: { n: "ok", t: "Correcto" },
    alerta: { n: "warn", t: "Revisar" },
    pendiente: { n: "wait", t: "Pendiente" },
  };
  const chip = (e) => `<span class="chip st-${e}">${ic(ESTADO[e].n)}${ESTADO[e].t}</span>`;

  /* ---------- Datos ---------- */
  function fusion(saved, seed) {
    if (!saved || typeof saved !== "object") return clone(seed);
    const out = clone(saved);
    for (const k of ["tema", "usuario_actual"]) if (out[k] === undefined) out[k] = seed[k];
    if (!Array.isArray(out.usuarios) || !out.usuarios.length) out.usuarios = clone(seed.usuarios);
    if (!Array.isArray(out.aranceles)) out.aranceles = clone(seed.aranceles);
    if (!Array.isArray(out.expedientes) || !out.expedientes.length) out.expedientes = clone(seed.expedientes);
    out.expedientes = out.expedientes.map((e) => C.sanear(e, seed.expedientes[0]));
    out.usuarios = out.usuarios.filter((u) => u && typeof u === "object").map((u) => Object.assign({ id: "", nombre: "", apellido: "", puesto: "", departamento: "", correo: "", telefono: "", rol: "Consulta", saludo: "Bienvenido" }, u));
    if (!out.usuarios.length) out.usuarios = clone(seed.usuarios);
    out.aranceles = out.aranceles.filter((x) => x && typeof x === "object" && String(x.codigo || "").trim()).map((x) => ({ codigo: String(x.codigo), descripcion: String(x.descripcion || ""), dai: Number.isFinite(parseFloat(x.dai)) ? parseFloat(x.dai) : 0 }));
    if (out.tema !== "claro" && out.tema !== "noche") out.tema = "claro";
    if (!out.usuarios.some((u) => u.id === out.usuario_actual)) out.usuario_actual = out.usuarios[0].id;
    out.version = seed.version;
    return out;
  }
  const exp = () => S.datos.expedientes.find((e) => e.id === S.datos.expediente_actual) || S.datos.expedientes[0];
  const usuario = () => S.datos.usuarios.find((u) => u.id === S.datos.usuario_actual) || S.datos.usuarios[0];
  const nombreCompleto = (u) => (u.nombre + " " + u.apellido).trim();
  const tcAuto = () => (S.tc && S.tc.actual ? num(S.tc.actual.referencia) : null);
  const calcular = () => C.calcular(exp(), { tcAuto: tcAuto(), tcFecha: S.tc && S.tc.actual ? S.tc.actual.fecha : null, aranceles: S.datos.aranceles, hoy: C.hoyISO() });

  const otrosExp = () => S.datos.expedientes.filter((x) => x.id !== exp().id);
  const avisosActuales = () => C.avisos(exp(), calcular(), { hoy: C.hoyISO(), tcAuto: tcAuto(), otros: otrosExp() });
  // Si se cambia un dato de un expediente validado, la validación ya no vale: se reabre
  function tocar() {
    const e = exp();
    if (e.revision && e.revision.estado === "Validado") {
      e.revision = { estado: "Pendiente", por: "", fecha: "" };
      e.tc_fijo = 0;
      aviso("Se reabrió la revisión porque cambiaste un dato. Vuelve a validar al terminar.");
    }
    S.confirmaValidar = false;
  }
  let ultimoError = 0;
  function reportar(err) {
    console.error(err);
    if (Date.now() - ultimoError < 4000) return;
    ultimoError = Date.now();
    aviso("Ocurrió un error inesperado. Tus datos no se perdieron; si se repite, restaura la pantalla desde el menú.");
  }
  window.addEventListener("error", (ev) => reportar(ev.error || ev.message));
  window.addEventListener("unhandledrejection", (ev) => reportar(ev.reason));

  let tGuardar = null;
  function marcarGuardado(estado, texto) {
    const el = $("#save-state");
    el.className = "save-state " + estado;
    $("span", el).textContent = texto;
    if (estado === "error") { el.dataset.act = "reintentar-guardado"; el.title = "Toca para reintentar"; el.setAttribute("role", "button"); el.tabIndex = 0; }
    else { delete el.dataset.act; el.removeAttribute("title"); el.removeAttribute("role"); el.removeAttribute("tabindex"); }
  }
  function guardar() {
    marcarGuardado("guardando", "Guardando");
    clearTimeout(tGuardar);
    tGuardar = setTimeout(async () => {
      try {
        if (S.enApp) { const ok = await window.pywebview.api.guardar(S.datos); if (ok === false) throw new Error("guardado rechazado"); }
        else localStorage.setItem("makan_datos", JSON.stringify(S.datos));
        marcarGuardado("guardado", "Guardado");
      } catch (e) {
        marcarGuardado("error", "No se pudo guardar. Toca para reintentar");
      }
    }, 150);
  }
  // Al cerrar la ventana se guarda lo pendiente sin esperar
  window.addEventListener("beforeunload", () => {
    if (S.datos && S.enApp) { try { window.pywebview.api.guardar(S.datos); } catch (e) {} }
  });

  function setPath(obj, ruta, valor) {
    const p = ruta.split(".");
    let o = obj;
    for (let i = 0; i < p.length - 1; i++) o = o[p[i]];
    o[p[p.length - 1]] = valor;
  }
  const getPath = (obj, ruta) => ruta.split(".").reduce((o, k) => (o === undefined || o === null ? o : o[k]), obj);

  /* ---------- Aviso ---------- */
  let tToast;
  function aviso(txt) {
    const t = $("#toast");
    t.textContent = txt;
    t.classList.add("show");
    clearTimeout(tToast);
    tToast = setTimeout(() => t.classList.remove("show"), 3600);
  }

  /* ---------- Saludo, fecha y hora ---------- */
  const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
    function saludo(u, d = new Date()) {
    const h = d.getHours();
    const franja = h < 12 ? "Buenos días" : h < 19 ? "Buenas tardes" : "Buenas noches";
    const dia = DIAS[d.getDay()];
    const opciones = [u.saludo || "Bienvenido", franja, "Buen " + dia, "Feliz " + dia, "Hola"];
    const dEnAnio = Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 86400000);
    return opciones[(dEnAnio + Math.floor(h / 5)) % opciones.length];
  }
  function pintaReloj() {
    const d = new Date();
    const f = $("#clock-f");
    if (!f) return;
    const f2 = C.fdate(C.hoyISO(d));
    if (f.textContent !== f2) f.textContent = f2;
    const hh = String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
    if ($("#clock-h").textContent !== hh) $("#clock-h").textContent = hh;
    const u = usuario();
    const txt = saludo(u, d) + ", " + nombreCompleto(u);
    if ($("#hello-t").textContent !== txt) $("#hello-t").textContent = txt;
  }

  /* ---------- Tipo de cambio ---------- */
  function fechaHora(iso) {
    if (!iso) return "nunca";
    const d = new Date(iso);
    if (isNaN(d)) return "nunca";
    return C.fdate(C.hoyISO(d)) + " " + String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
  }
  function proximaConsulta(d = new Date()) {
    for (const h of HORAS_TC) {
      const x = new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, 0, 0);
      if (x > d) return x;
    }
    return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 0, 0, 0);
  }
  function mensajeTC() {
    if (!S.enApp) return { tono: "pendiente", txt: "La consulta automática al Banguat solo funciona en la aplicación de escritorio. Aquí se usa el tipo de cambio manual." };
    const u = S.tc && S.tc.ultima;
    if (!u) return { tono: "pendiente", txt: "Todavía no se ha consultado al Banguat. Toca «Consultar ahora»." };
    const prox = "Próxima consulta programada: " + fechaHora(proximaConsulta().toISOString()) + ".";
    if (u.ok) return { tono: "ok", txt: `Última consulta: ${fechaHora(u.consultado_en)} (${u.origen === "manual" ? "manual" : "programada"}). ${prox}` };
    return { tono: "alerta", txt: `El último intento (${fechaHora(u.intento_en)}) falló: ${u.error || "sin detalle"}. Última consulta buena: ${fechaHora(u.consultado_en)}. Se reintenta cada 10 minutos.` };
  }
  function pintaChipTC() {
    const el = $("#tc-chip");
    if (!el) return;
    const a = tcAuto();
    const u = S.tc && S.tc.ultima;
    const falla = u && !u.ok;
    el.className = "tc-chip" + (falla ? " st-pendiente" : !a ? " st-pendiente" : "");
    el.innerHTML = `<div><span class="tc-v">${a ? ftc(a) : "Sin dato"}</span><small>${a ? "Banguat · " + esc(fdate(S.tc.actual.fecha)) : "Tipo de cambio"}${falla ? " · sin conexión" : ""}</small></div>
      <button class="btn btn-secondary btn-sm" data-act="tc-consultar" title="Consultar al Banguat ahora" aria-label="Consultar tipo de cambio ahora">${ic("refresh")}</button>`;
  }
  window.onTipoCambio = function (estado) {
    S.tc = estado;
    pintaChipTC();
    const b = $('[data-act="tc-consultar"]');
    if (b) b.classList.remove("cargando");
    const f = document.activeElement;
    if (S.vista === "contabilidad" && !(f && /INPUT|SELECT|TEXTAREA/.test(f.tagName))) render(true);
    pintaNav();
  };
  async function consultarTC() {
    if (!S.enApp) return aviso("La consulta al Banguat funciona solo en la aplicación de escritorio.");
    document.querySelectorAll('[data-act="tc-consultar"]').forEach((b) => (b.classList.add("cargando"), (b.disabled = true)));
    try {
      const est = await window.pywebview.api.tc_consultar();
      window.onTipoCambio(est);
      aviso(est.ultima && est.ultima.ok ? "Tipo de cambio actualizado: " + ftc(est.actual.referencia) : "No se pudo consultar al Banguat. Se mantiene el último valor.");
    } catch (e) {
      aviso("No se pudo consultar al Banguat.");
    }
    document.querySelectorAll('[data-act="tc-consultar"]').forEach((b) => (b.classList.remove("cargando"), (b.disabled = false)));
  }

  /* ---------- Actualizaciones ---------- */
  function pintaActualizacion() {
    const est = S.act, card = $("#actualiza"), enlace = $("#act-enlace");
    if (!est || !S.enApp) { card.hidden = true; return; }
    const d = est.disponible;
    let html = "";
    if (est.fase === "descargando") {
      const pct = Math.round((est.progreso || 0) * 100);
      html = `<h3>Descargando ${esc(d ? d.version : "")}</h3><p>Puedes seguir trabajando.</p><div class="act-barra${pct ? "" : " indef"}"><i style="width:${pct || 40}%"></i></div>`;
    } else if (est.fase === "listo") {
      html = `<h3>Instalando</h3><p>La app se reinicia en unos segundos. Tus datos están guardados.</p><div class="act-barra indef"><i></i></div>`;
    } else if (est.error && S.actVerError && d) {
      html = `<h3>No se pudo actualizar</h3><p>${esc(est.error)}</p><div class="acciones"><button class="btn btn-primary btn-sm" data-act="act-instalar">Reintentar</button><button class="btn btn-tertiary btn-sm" data-act="act-cerrar">Cerrar</button></div>`;
    } else if (d && (!est.pospuesta || S.actVer) && !S.actCerrada) {
      const nota = String(d.notas || "").split("\n").map((x) => x.replace(/^[#*\-\s]+/, "").trim()).find(Boolean) || "";
      html = `<h3>Actualización disponible</h3><p>Versión ${esc(d.version)}${nota ? " · " + esc(nota.slice(0, 110)) : ""}</p>
        <div class="acciones"><button class="btn btn-primary btn-sm" data-act="act-instalar">${est.puede_instalar ? "Actualizar ahora" : "Ver en GitHub"}</button><button class="btn btn-tertiary btn-sm" data-act="act-despues">Más tarde</button></div>`;
    }
    if (html) { if (card.innerHTML !== html) card.innerHTML = html; card.hidden = false; } else card.hidden = true;
    const hayAviso = d && est.pospuesta && !S.actVer;
    enlace.innerHTML = (hayAviso ? `<button class="nueva" data-act="act-ver">Actualización ${esc(d.version)} disponible</button>` : "") +
      `<button data-act="act-buscar">Buscar actualizaciones</button>`;
  }
  window.onActualizacion = function (est) { S.act = est; if (est.error && est.disponible) S.actVerError = true; pintaActualizacion(); };
  async function buscarActualizacion() {
    if (!S.enApp) return aviso("Las actualizaciones solo funcionan en la aplicación de escritorio.");
    try {
      const est = await window.pywebview.api.act_buscar();
      S.act = est; S.actCerrada = false; S.actVer = false; pintaActualizacion();
      if (est.error) aviso(est.error);
      else if (est.disponible) aviso("Hay una versión nueva: " + est.disponible.version);
      else aviso("Estás al día. Versión " + est.version_actual + ".");
    } catch (e) { aviso("No se pudo buscar actualizaciones."); }
  }
  async function instalarActualizacion() {
    if (!S.act || !S.act.disponible) return;
    if (!S.act.puede_instalar) { try { await window.pywebview.api.act_abrir_pagina(); } catch (e) {} return; }
    S.actVerError = false;
    try {
      await window.pywebview.api.guardar(S.datos); // lo último escrito queda guardado antes de reiniciar
      const est = await window.pywebview.api.act_instalar();
      S.act = est; if (est.error) S.actVerError = true; pintaActualizacion();
    } catch (e) { aviso("No se pudo actualizar. La app sigue como estaba."); }
  }
  async function posponerActualizacion() {
    try { S.act = await window.pywebview.api.act_posponer(); } catch (e) {}
    S.actVer = false; pintaActualizacion();
    aviso("Te lo recordamos en 4 horas. También queda en el menú lateral.");
  }

  /* ---------- Tema ---------- */
  function aplicaTema() {
    document.documentElement.setAttribute("data-theme", S.datos.tema === "noche" ? "noche" : "claro");
    const t = $("#theme");
    if (t) {
      t.setAttribute("aria-checked", S.datos.tema === "noche" ? "true" : "false");
      $("svg", t).innerHTML = S.datos.tema === "noche" ? P.moon : P.sun;
      $("span", t).textContent = S.datos.tema === "noche" ? "Modo noche" : "Modo claro";
    }
  }

  /* ---------- Estructura fija: barra lateral y superior ---------- */
  const NAV = [
    ["Expediente", [["guias", "Guías", "truck"], ["inicio", "Cadena", "home"], ["documentos", "Documentos", "docs"], ["verificaciones", "Verificaciones", "check"]]],
    ["Finanzas", [["contabilidad", "Contabilidad", "calc"]]],
    ["Sistema", [["usuarios", "Usuarios", "users"]]],
  ];
  const TITULOS = {
    guias: ["Expediente", "Guías de importación", "Cada guía es un expediente con sus documentos. Elige con cuál trabajar."],
    inicio: ["Expediente", "Cadena de documentos", "Cómo se conecta cada documento con el siguiente."],
    documentos: ["Expediente", "Documentos", "En orden: pedido, factura, control interno y pago."],
    verificaciones: ["Expediente", "Verificaciones", "Cruces automáticos entre los documentos."],
    contabilidad: ["Finanzas", "Contabilidad", "Costeo, impuestos, libro de compras y partida contable."],
    usuarios: ["Sistema", "Usuarios", "Quién usa la aplicación y con qué puesto."],
  };
  function pintaNav() {
    let pend = 0;
    try { const v = calcular(); pend = v.resumen.alerta + v.resumen.pendiente + avisosActuales().length; } catch (err) { pend = 0; }
    $("#nav").innerHTML = NAV.map(
      ([g, items]) =>
        `<div class="nav-group">${g}</div>` +
        items
          .map(
            ([id, t, i]) =>
              `<button class="nav-item${S.vista === id ? " active" : ""}" data-nav="${id}" ${S.vista === id ? 'aria-current="page"' : ""}>${ic(i)}<span>${t}</span>${id === "verificaciones" && pend ? `<span class="badge">${pend}</span>` : ""}</button>`
          )
          .join("")
    ).join("");
  }
  function pintaTopbar() {
    const u = usuario();
    $("#topbar").innerHTML = `
      <div class="hello"><div class="hello-t" id="hello-t"></div><div class="hello-s" id="hello-s">${esc(u.puesto)}${u.departamento ? " · " + esc(u.departamento) : ""}</div></div>
      <div class="clock"><span class="clock-f" id="clock-f"></span><span class="clock-h" id="clock-h"></span></div>
      <div class="tc-chip" id="tc-chip"></div>
      <button class="theme" id="theme" role="switch" aria-checked="false" data-act="tema">${ic("sun")}<span>Modo claro</span><i class="track"></i></button>`;
    pintaChipTC();
    aplicaTema();
    pintaReloj();
  }
  function pintaCabecera() {
    const [k0, t, s] = TITULOS[S.vista];
    const k = S.vista === "guias" || S.vista === "usuarios" ? k0 : k0 + " · Guía " + esc(exp().guia);
    let acc = "";
    if (S.vista === "inicio") acc = `<button class="btn btn-primary" data-nav="verificaciones">${ic("check")}Ver verificaciones</button>`;
    else if (S.vista === "documentos") acc = `<button class="btn btn-secondary" data-act="csv">${ic("save")}Exportar CSV</button>`;
    else if (S.vista === "verificaciones") acc = `<button class="btn btn-primary" data-nav="contabilidad">${ic("calc")}Ir a contabilidad</button>`;
    else if (S.vista === "contabilidad") acc = `<button class="btn btn-secondary" data-act="csv">${ic("save")}Exportar CSV</button>`;
    else if (S.vista === "guias") acc = `<button class="btn btn-primary" data-act="nueva-guia">${ic("plus")}Nueva guía</button>`;
    else if (S.vista === "usuarios") acc = `<button class="btn btn-primary" data-act="nuevo-usuario">${ic("plus")}Nuevo usuario</button>`;
    $("#pagehead").innerHTML = `<div><div class="kicker">${k}</div><h1>${t}</h1><p class="sub">${s}</p></div><div class="pagehead-actions">${acc}</div>`;
  }

  /* ---------- Vistas ---------- */
  const nodoVal = {
    ebay: (v) => fu(v.ebayTotal),
    tacsa: (v) => fq(num(exp().documentos.tacsa.total_cobro)),
    makan: () => fq(num(exp().documentos.makan.monto)),
    banco: () => fq(num(exp().documentos.banco.monto)),
  };
  function vInicio() {
    const e = exp(), v = calcular(), d = e.documentos;
    const est = (id) => (v.verificaciones.find((x) => x.id === id) || {}).estado || "pendiente";
    const peor = (...ids) => (ids.map(est).includes("alerta") ? "alerta" : ids.map(est).includes("pendiente") ? "pendiente" : "ok");
    const nodos = [
      { k: "Pedido eBay", i: "cart", n: "01", val: nodoVal.ebay(v), st: peor("ebay_total"), dl: [["Pedido", d.ebay.pedido], ["Parte", d.ebay.parte]] },
      { k: "Factura TACSA", i: "truck", n: "02", val: nodoVal.tacsa(v), st: peor("cargos", "iva", "cobro"), dl: [["Factura", d.tacsa.numero], ["Guía", d.tacsa.guia]] },
      { k: "Control Makan", i: "paper", n: "03", val: nodoVal.makan(), st: peor("makan", "fecha_makan"), dl: [["Control", d.makan.numero], ["Fecha", fdate(d.makan.fecha)]] },
      { k: "Nota de débito", i: "bank", n: "04", val: nodoVal.banco(), st: peor("banco", "venc"), dl: [["Nota", d.banco.numero], ["Fecha", fdate(d.banco.fecha)]] },
    ];
    const aristas = [
      { st: est("guia"), t: "Guía " + d.tacsa.guia, s: "enlaza pedido y factura" },
      { st: peor("makan", "fecha_makan"), t: "Factura " + d.makan.factura, s: "enlaza factura y control" },
      { st: e.vinculo_banco_confirmado ? peor("banco", "venc") : "pendiente", t: e.vinculo_banco_confirmado ? "Pago confirmado" : "Sin confirmar", s: "vínculo con el banco" },
    ];
    let cadena = "";
    nodos.forEach((n, i) => {
      cadena += `<button class="node st-${n.st}" style="--i:${i * 2}" data-ir-doc="${i + 1}" title="Abrir este documento">
        <div class="node-top"><span class="node-ico">${ic(n.i, "")}</span><span class="kicker">${n.k}</span></div>
        <div class="node-val">${n.val}</div>
        <dl>${n.dl.map(([a, b]) => `<div><dt>${a}</dt><dd>${esc(b)}</dd></div>`).join("")}</dl>
        <div class="node-foot">${chip(n.st)}<span class="step">${n.n}</span></div></button>`;
      if (aristas[i]) {
        const a = aristas[i];
        cadena += `<div class="edge st-${a.st}" style="--i:${i * 2 + 1}"><span class="edge-label">${esc(a.t)}<small>${a.s}</small></span><span class="edge-line"></span></div>`;
      }
    });
    const atender = v.verificaciones.filter((x) => x.estado !== "ok").concat(avisosActuales().map((x) => ({ titulo: x.nivel === "error" ? "Error de captura" : "Aviso", detalle: x.texto, estado: x.nivel === "error" ? "alerta" : "pendiente" })));
    return `<div class="wrap">
      <div class="chain">${cadena}</div>
      <div class="grid2">
        <section class="panel"><h2>Vínculo del pago</h2>
          <p class="note" style="margin-top:0">La nota de débito no dice qué facturas paga. Cuando confirmes que corresponde a esta factura, se comprueba el monto y la fecha de pago.</p>
          <label class="switch"><input type="checkbox" class="js-vinculo" ${e.vinculo_banco_confirmado ? "checked" : ""}><span class="track"></span><span>${e.vinculo_banco_confirmado ? "Pago confirmado para esta factura" : "Confirmar que este pago corresponde a la factura"}</span></label>
          <div class="mini" style="margin-top:16px"><div><span>Vence</span><b>${fdate(v.vencimiento)}</b></div><div><span>Pagado</span><b>${e.vinculo_banco_confirmado ? fdate(d.banco.fecha) : "—"}</b></div><div><span>Saldo del débito</span><b>${e.vinculo_banco_confirmado ? fq(v.saldoBanco) : "—"}</b></div></div>
        </section>
        <section class="panel"><h2>Para atender</h2>
          ${atender.length ? `<ul class="todo" style="margin:0">${atender.map((x, i) => `<li class="st-${x.estado}" style="--i:${i}">${ic(ESTADO[x.estado].n)}<div><h3>${esc(x.titulo)}</h3><p>${esc(x.detalle)}</p></div></li>`).join("")}</ul>` : `<div class="vacio">${ic("ok")}<p>Todo coincide entre los documentos.</p></div>`}
        </section>
      </div></div>`;
  }

  // Formato de cada dato escrito a mano (ver Calc.normalizar)
  const TIPOS = {
    "documentos.ebay.pedido": "pedido", "documentos.ebay.item_id": "digitos", "documentos.ebay.parte": "texto", "documentos.ebay.vendedor": "texto",
    "documentos.ebay.guia_nota": "digitos", "documentos.ebay.descripcion": "texto",
    "documentos.tacsa.serie": "mayus", "documentos.tacsa.numero": "digitos", "documentos.tacsa.guia": "digitos", "documentos.tacsa.cliente": "digitos",
    "documentos.tacsa.bultos": "entero", "documentos.tacsa.peso": "dec", "documentos.tacsa.credito_dias": "entero",
    "documentos.tacsa.cuenta_ajena.documento_oea": "texto",
    "documentos.makan.numero": "digitos", "documentos.makan.factura": "digitos", "documentos.makan.proveedor": "texto",
    "documentos.banco.numero": "digitos", "documentos.banco.hora": "hora", "documentos.banco.cuenta": "cuenta", "documentos.banco.referencia": "mayus",
    "documentos.banco.descripcion": "texto", "documentos.banco.titular": "texto",
    "partida": "partida", "dai_pct": "pct",
  };
  const NUMERICOS = ["entero", "dec", "pct"];
  const tipoDe = (ruta, dado) => TIPOS[ruta] || (/\.cargos\.\d+\.concepto$/.test(ruta) ? "texto" : dado || "text");
  const campo = (label, ruta, tipo0 = "text", cls = "") => {
    const tipo = tipoDe(ruta, tipo0);
    const raw = getPath(exp(), ruta);
    const val = tipo === "date" ? (C.esFecha(raw) ? fdate(raw) : "") : tipo === "mon" ? nf(raw) .replace(/,/g, "") : tipo === "tc" ? Number(raw || 0).toFixed(5) : NUMERICOS.includes(tipo) ? String(Math.round(num(raw) * 100) / 100) : raw;
    const extra = ["num", "mon", "tc", "entero", "dec", "pct"].includes(tipo) ? 'inputmode="decimal"' : tipo === "date" ? 'inputmode="numeric" placeholder="dd/mm/aaaa" maxlength="10"' : "";
    return `<label class="f ${cls}"><span>${label}</span><input type="text" ${extra} data-path="${ruta}" data-tipo="${tipo}" value="${esc(val)}"><small class="hint" data-hint="${ruta}"></small></label>`;
  };
  function vDocumentos() {
    const v = calcular(), e = exp(), t = e.documentos.tacsa;
    const head = (n, t1, s) => `<div class="doc-h"><span class="doc-n">${n}</span><div class="t"><h2>${t1}</h2><p>${s}</p></div></div><div class="doc-avisos" data-doc-avisos="${n}"></div>`;
    return `<div class="wrap">
      <nav class="stepnav" aria-label="Ir a un documento">
        ${["Pedido eBay", "Factura TACSA", "Control Makan", "Nota de débito"].map((x, i) => `<button data-ir-doc="${i + 1}"><span class="n">${i + 1}</span>${x}</button>`).join("")}
      </nav>
      <div class="docs">
        <section class="panel doc" id="doc-1" style="--i:0">${head(1, "Pedido de eBay", "Compra en el exterior, pagada con PayPal o tarjeta. La guía va anotada a mano.")}
          <div class="fields">
            ${campo("Número de pedido", "documentos.ebay.pedido")}${campo("Artículo", "documentos.ebay.item_id")}${campo("Parte", "documentos.ebay.parte")}${campo("Fecha del pedido", "documentos.ebay.fecha", "date")}
            ${campo("Vendedor", "documentos.ebay.vendedor", "text", "ancho")}${campo("Guía anotada", "documentos.ebay.guia_nota")}
            ${campo("Descripción", "documentos.ebay.descripcion", "text", "ancho")}
          </div>
          <h3 class="sub-h">Importes (US$)</h3>
          <div class="fields">${campo("Subtotal", "documentos.ebay.subtotal", "mon")}${campo("Envío", "documentos.ebay.envio", "mon")}${campo("Impuesto", "documentos.ebay.impuesto", "mon")}${campo("Descuento (negativo)", "documentos.ebay.descuento", "mon")}${campo("Total del documento", "documentos.ebay.total_documento", "mon")}</div>
          <div class="calc-row"><span>Total recalculado por la app</span><b data-bind="ebayTotal">${fu(v.ebayTotal)}</b></div>
        </section>
        <section class="panel doc" id="doc-2" style="--i:1">${head(2, "Factura de TACSA", "Fletes, manejo y los impuestos que paga por cuenta de Makan.")}
          <div class="fields">${campo("Serie", "documentos.tacsa.serie")}${campo("Número", "documentos.tacsa.numero")}${campo("Fecha de la factura", "documentos.tacsa.fecha", "date")}
            ${campo("Guía", "documentos.tacsa.guia")}${campo("Fecha de la guía", "documentos.tacsa.fecha_guia", "date")}${campo("Cliente", "documentos.tacsa.cliente")}
            ${campo("Bultos", "documentos.tacsa.bultos", "num")}${campo("Peso (kg)", "documentos.tacsa.peso", "num")}${campo("Días de crédito", "documentos.tacsa.credito_dias", "num")}</div>
          <h3 class="sub-h">Cargos de TACSA (Q)</h3>
          ${t.cargos.map((c, i) => `<div class="cargo"><label class="f"><span>Concepto</span><input type="text" data-path="documentos.tacsa.cargos.${i}.concepto" value="${esc(c.concepto)}"><small class="hint" data-hint="documentos.tacsa.cargos.${i}.concepto"></small></label><label class="f"><span>Monto</span><input type="text" inputmode="decimal" data-path="documentos.tacsa.cargos.${i}.monto" data-tipo="mon" value="${esc(nf(c.monto).replace(/,/g, ""))}"><small class="hint" data-hint="documentos.tacsa.cargos.${i}.monto"></small></label></div>`).join("")}
          <div class="fields" style="margin-top:8px">${campo("Total de la factura", "documentos.tacsa.total_factura", "mon")}</div>
          <div class="calc-row"><span>Cargos sumados por la app</span><b data-bind="cargos">${fq(v.cargos)}</b></div>
          <h3 class="sub-h">Cuenta ajena: impuestos pagados por TACSA (Q)</h3>
          <div class="fields">${campo("Valor CIF", "documentos.tacsa.cuenta_ajena.cif", "mon")}${campo("DAI cobrado", "documentos.tacsa.cuenta_ajena.dai", "mon")}${campo("IVA sobre CIF y DAI", "documentos.tacsa.cuenta_ajena.iva_dai", "mon")}
            ${campo("Documento OEA", "documentos.tacsa.cuenta_ajena.documento_oea")}${campo("Fecha del documento", "documentos.tacsa.cuenta_ajena.fecha_documento", "date")}${campo("Total cobrado", "documentos.tacsa.total_cobro", "mon")}</div>
        </section>
        <section class="panel doc" id="doc-3" style="--i:2">${head(3, "Control interno de Makan", "Papel rosado con el que se registra la factura en Makan.")}
          <div class="doc-tools"><button class="btn btn-tertiary btn-sm" data-act="copiar-factura">${ic("copy")}Copiar factura, fecha y monto desde TACSA</button></div>
          <div class="fields">${campo("Número de control", "documentos.makan.numero")}${campo("Fecha", "documentos.makan.fecha", "date")}${campo("Factura registrada", "documentos.makan.factura")}${campo("Proveedor", "documentos.makan.proveedor")}${campo("Monto", "documentos.makan.monto", "mon")}</div>
        </section>
        <section class="panel doc" id="doc-4" style="--i:3">${head(4, "Nota de débito del banco", "Banco Industrial. No dice qué factura paga, por eso el vínculo se confirma a mano.")}
          <div class="fields">${campo("Número", "documentos.banco.numero")}${campo("Fecha", "documentos.banco.fecha", "date")}${campo("Hora", "documentos.banco.hora")}
            ${campo("Monto", "documentos.banco.monto", "mon")}${campo("Cuenta", "documentos.banco.cuenta")}${campo("Referencia", "documentos.banco.referencia")}${campo("Descripción", "documentos.banco.descripcion")}${campo("Titular", "documentos.banco.titular", "text", "ancho")}</div>
          <div class="enlace">${ic("link")}<label class="switch" style="margin:0"><input type="checkbox" class="js-vinculo" ${e.vinculo_banco_confirmado ? "checked" : ""}><span class="track"></span><span>Este pago corresponde a la factura de TACSA</span></label></div>
        </section>
      </div></div>`;
  }

  function avisosPanel() {
    const av = avisosActuales();
    if (!av.length) return `<section class="panel" style="margin-bottom:18px"><h2>Avisos de captura</h2><div class="vacio" style="padding:10px">${ic("ok")}<p>No hay avisos: fechas, importes y formatos se ven normales.</p></div></section>`;
    return `<section class="panel" style="margin-bottom:18px"><h2>Avisos de captura (${av.length})</h2><ul class="todo" style="margin:0">${av.map((x, i) => `<li class="st-${x.nivel === "error" ? "alerta" : "pendiente"}" style="--i:${i}">${ic(NIVEL_ICO[x.nivel])}<div><h3>${x.nivel === "error" ? "Error" : "Aviso"}</h3><p>${esc(x.texto)}</p></div>${x.doc || x.campo ? `<button class="btn btn-tertiary btn-sm" data-ir-campo="${esc(x.campo || "")}" data-doc="${x.doc}">Ir al dato</button>` : ""}</li>`).join("")}</ul></section>`;
  }
  function vVerificaciones() {
    const v = calcular(), r = v.resumen;
    const orden = { alerta: 0, pendiente: 1, ok: 2 };
    const lista = v.verificaciones.slice().sort((a, b) => orden[a.estado] - orden[b.estado]);
    const lamp = (e, n, t) => `<div class="lamp st-${e}${n ? "" : " off"}"><i></i><b>${n}</b><span>${t}</span></div>`;
    return `<div class="wrap"><div class="lamps">${lamp("alerta", r.alerta, "por revisar")}${lamp("pendiente", r.pendiente, "pendientes")}${lamp("ok", r.ok, "correctas")}</div>
      <ul class="checks">${lista.map((x, i) => `<li class="check st-${x.estado}" style="--i:${i}">${ic(ESTADO[x.estado].n)}<div><h3>${esc(x.titulo)}</h3><p>${esc(x.detalle)}</p></div>${chip(x.estado)}</li>`).join("")}</ul>
      ${avisosPanel()}
      <section class="panel notes"><h2>Observaciones</h2><ul>${exp().notas.map((n) => `<li>${esc(n)}</li>`).join("")}</ul></section></div>`;
  }

  /* --- Contabilidad --- */
  function gauge(pct) {
    const p = Math.max(0, Math.min(60, pct)) / 60;
    return `<svg class="gsvg" viewBox="0 0 160 100" aria-hidden="true"><path class="g-bg" d="M15 80 A65 65 0 0 1 145 80" pathLength="100"/><path class="g-fg" d="M15 80 A65 65 0 0 1 145 80" pathLength="100" style="stroke-dashoffset:${(100 - p * 100).toFixed(1)}"/>
      <g class="needle" style="transform:rotate(${(-90 + p * 180).toFixed(1)}deg)"><path d="M80 80 L80 28"/></g><circle cx="80" cy="80" r="4"/>
      <text class="g-tick" x="15" y="96" text-anchor="middle">0%</text><text class="g-tick" x="145" y="96" text-anchor="middle">60%</text></svg>`;
  }
  function panelRevision(v) {
    const e = exp(), rev = e.revision || { estado: "Pendiente" };
    const avs = avisosActuales(), errs = avs.filter((x) => x.nivel === "error").length;
    const val = rev.estado === "Validado";
    const st = val ? "ok" : v.resumen.alerta || errs ? "alerta" : "pendiente";
    const txt = val
      ? `Validado por ${esc(rev.por)} el ${fdate(rev.fecha)}. El tipo de cambio quedó fijo en ${ftc(e.tc_fijo)}; al reabrir vuelve a seguir al Banguat.`
      : errs
      ? `Hay ${errs === 1 ? "1 error de captura" : errs + " errores de captura"}. Corrígelos antes de validar.`
      : v.resumen.alerta
      ? `${v.resumen.alerta === 1 ? "Hay 1 verificación por revisar" : "Hay " + v.resumen.alerta + " verificaciones por revisar"}. Corrígelas antes de validar.`
      : S.confirmaValidar
      ? `Quedan ${v.resumen.pendiente} pendiente(s) y ${avs.length} aviso(s). Toca «Validar de todos modos» para cerrar con ellos.`
      : v.resumen.pendiente
      ? `Sin alertas. ${v.resumen.pendiente === 1 ? "Queda 1 punto pendiente" : "Quedan " + v.resumen.pendiente + " puntos pendientes"}, por ejemplo confirmar el pago.`
      : "Todo coincide. Puedes validar el expediente.";
    return `<section class="panel revision st-${st}">${ic(val ? "shield" : ESTADO[st].n)}<div><h2>Revisión contable: ${esc(rev.estado)}</h2><p>${txt}</p></div>
      ${val ? `<button class="btn btn-secondary" data-act="reabrir">Reabrir revisión</button>` : `<button class="btn btn-primary" data-act="validar" ${v.resumen.alerta || errs ? "disabled" : ""}>${ic("shield")}${S.confirmaValidar ? "Validar de todos modos" : "Validar expediente"}</button>`}</section>`;
  }
  function panelTC(v) {
    const e = exp(), m = mensajeTC();
    return `<section class="panel"><h2>Tipo de cambio US$ → Q</h2>
      <div class="tc-big"><b>${v.tc ? ftc(v.tc) : "—"}</b><span>${esc(v.tcOrigen)}</span></div>
      <div class="radios" role="radiogroup">
        <label><input type="radio" name="tcm" value="auto" ${e.tc_modo !== "manual" ? "checked" : ""}><span><b>Automático (Banguat)</b><small>Se consulta a las 00:00, 06:00, 12:00 y 16:00.</small></span></label>
        <label><input type="radio" name="tcm" value="manual" ${e.tc_modo === "manual" ? "checked" : ""}><span><b>Manual</b><small>Usa el valor que escribas, por ejemplo el de la fecha de compra.</small></span></label>
      </div>
      ${e.tc_modo === "manual" ? `<label class="param"><span>Tipo de cambio manual</span><input type="text" inputmode="decimal" data-path="tipo_cambio" data-tipo="tc" value="${esc(Number(e.tipo_cambio || 0).toFixed(5))}"><small class="hint" data-hint="tipo_cambio"></small></label>` : ""}
      <div class="msg st-${m.tono}">${ic(ESTADO[m.tono].n)}<span>${esc(m.txt)}</span></div>
      <div class="acciones"><button class="btn btn-secondary btn-sm" data-act="tc-consultar">${ic("refresh")}Consultar ahora</button></div>
      <p class="note">El Banguat publica una referencia por día hábil y rige desde el siguiente día hábil, así que varias consultas al día casi siempre devuelven el mismo valor.</p></section>`;
  }
  function panelDAI(v) {
    const e = exp(), tabla = S.datos.aranceles;
    const f = C.buscarArancel(e.partida, tabla);
    return `<section class="panel"><h2>DAI (derechos arancelarios)</h2>
      <div class="tc-big"><b>${fpct(v.daiPct)}</b><span>${fq(v.dai)} sobre CIF ${fq(v.cif)}</span></div>
      <p class="note" style="margin-top:0">${esc(v.daiOrigen)}</p>
      <div class="radios" role="radiogroup">
        <label><input type="radio" name="daim" value="factura" ${e.dai_modo === "factura" ? "checked" : ""}><span><b>Deducir de la factura</b><small>Lo despeja del IVA que cobró TACSA.</small></span></label>
        <label><input type="radio" name="daim" value="partida" ${e.dai_modo === "partida" ? "checked" : ""}><span><b>Buscar por partida arancelaria</b><small>Usa la tabla de aranceles de abajo.</small></span></label>
        <label><input type="radio" name="daim" value="manual" ${e.dai_modo === "manual" ? "checked" : ""}><span><b>Manual</b><small>Escribe el porcentaje.</small></span></label>
      </div>
      ${e.dai_modo === "partida" ? `<label class="param"><span>Partida o inciso (ej. 8512.30.00.00)</span><input type="text" data-path="partida" value="${esc(e.partida)}"><small class="hint" data-hint="partida"></small></label><div class="msg st-${f ? "ok" : "pendiente"}">${ic(f ? "ok" : "wait")}<span>${f ? esc(f.codigo + " · " + f.descripcion + " · DAI " + f.dai + "%") : "No está en la tabla. Agrégala abajo o usa el modo manual."}</span></div>` : ""}
      ${e.dai_modo === "manual" ? `<label class="param"><span>DAI (%)</span><input type="text" inputmode="decimal" data-path="dai_pct" data-tipo="pct" value="${esc(e.dai_pct)}"><small class="hint" data-hint="dai_pct"></small></label>` : ""}
      <p class="note">El DAI es un impuesto: se calcula sobre el valor CIF según la partida del producto (0 a 20%) y el IVA se cobra después sobre CIF + DAI. La partida correcta la define el agente aduanero, por eso la app no la adivina.</p></section>`;
  }
  function tabCosteo(v) {
    const e = exp(), tabla = S.datos.aranceles;
    return `<div class="kpis">
        <div class="kpi main"><span>Costo puesto sin IVA</span><b>${fq(v.costoPuesto)}</b><small>Mercadería + gastos + DAI</small></div>
        <div class="kpi"><span>Mercadería</span><b>${fq(v.mercaderiaQ)}</b><small>${fu(v.ebayTotal)} × ${v.tc ? ftc(v.tc) : "—"}</small></div>
        <div class="kpi gauge"><span>Gastos sobre la mercadería</span>${gauge(v.coefGastos)}<b style="font-size:26px;margin:0;text-align:center">${fpct(v.coefGastos)}</b><small>${fq(v.cargos)} de TACSA</small></div>
      </div>
      <div class="grid2">${panelTC(v)}${panelDAI(v)}</div>
      <section class="panel" style="margin-top:18px"><h2>Detalle del costeo</h2><table class="ledger"><tbody>
        <tr><td>Mercadería puesta en Q<small>Pedido de eBay al tipo de cambio aplicado</small></td><td>${fq(v.mercaderiaQ)}</td></tr>
        <tr><td>Gastos de TACSA<small>Fletes, seguridad y manejo, almacenaje</small></td><td>${fq(v.cargos)}</td></tr>
        <tr><td>DAI<small>${fpct(v.daiPct)} del CIF</small></td><td>${fq(v.dai)}</td></tr>
        <tr class="total"><td>Costo puesto sin IVA</td><td>${fq(v.costoPuesto)}</td></tr>
        <tr class="gap"><td colspan="2"></td></tr>
        <tr class="ref"><td>IVA de importación (crédito fiscal)</td><td>${fq(v.iva)}</td></tr>
        <tr class="ref"><td>Valor CIF declarado<small>Diferencia con la mercadería: ${fq(v.difCif)}</small></td><td>${fq(v.cif)}</td></tr>
      </tbody></table></section>
      <section class="panel" style="margin-top:18px"><h2>Tabla de aranceles</h2>
        <div class="tabla-wrap" style="box-shadow:none"><table class="tabla"><thead><tr><th>Partida</th><th>Descripción</th><th class="num">DAI %</th><th></th></tr></thead><tbody>
          ${tabla.map((a, i) => `<tr><td>${esc(a.codigo)}</td><td class="wrap-t">${esc(a.descripcion)}</td><td class="num">${a.dai}</td><td class="acc"><button class="btn btn-danger btn-sm" data-act="del-arancel" data-i="${i}">Quitar</button></td></tr>`).join("")}
        </tbody></table></div>
        <div class="inline"><label>Partida<input type="text" id="ar-cod" placeholder="8531.10.00.00"></label><label>Descripción<input type="text" id="ar-des"></label><label>DAI %<input type="text" id="ar-dai" inputmode="decimal" value="0"></label><button class="btn btn-secondary" data-act="add-arancel">${ic("plus")}Agregar</button></div>
        <p class="note">Esta tabla es tuya: confírmala con el arancel vigente de la SAT y tu agente aduanero.</p></section>`;
  }
  function tabLibro(v) {
    const f = C.libroCompras(exp(), v);
    return `<div class="tabla-wrap"><table class="tabla"><thead><tr><th>#</th><th>Fecha</th><th>Tipo</th><th>Condición</th><th>Vence</th><th>Origen del pago</th><th>Documento</th><th>No.</th><th>Proveedor</th><th>Mon.</th><th class="num">Monto</th><th class="num">T/C</th><th class="num">Valor Q</th><th class="num">DAI</th><th class="num">IVA</th><th class="num">Total Q</th><th>Revisión</th><th>Pago</th></tr></thead><tbody>
      ${f.map((r) => `<tr><td>${r.n}</td><td>${fdateVacio(r.fecha)}</td><td>${r.tipo}</td><td>${esc(r.condicion)}</td><td>${fdateVacio(r.vence)}</td><td>${esc(r.origen)}</td><td>${r.docTipo}</td><td>${esc(r.doc)}</td><td>${esc(r.proveedor)}</td><td>${r.moneda}</td><td class="num">${nf(r.montoOrig)}</td><td class="num">${r.tc ? r.tc.toFixed(5) : ""}</td><td class="num">${nf(r.valorQ)}</td><td class="num">${r.dai === null ? "" : nf(r.dai)}</td><td class="num">${r.iva === null ? "" : nf(r.iva)}</td><td class="num">${nf(r.total)}</td><td>${esc(r.revision)}</td><td>${esc(r.pago)}</td></tr>`).join("")}
      </tbody></table></div><p class="note">La fila 1 es la compra a eBay y la fila 2 es la factura de TACSA con sus impuestos por cuenta ajena.</p>`;
  }
  function tabPartida(v) {
    const e = exp(), a = C.asiento(e, v), cu = e.contabilidad.cuentas;
    return `<section class="panel"><h2>Partida contable sugerida</h2>
      <div class="tabla-wrap" style="box-shadow:none"><table class="tabla"><thead><tr><th>Código</th><th>Cuenta</th><th>Detalle</th><th class="num">Debe</th><th class="num">Haber</th></tr></thead><tbody>
        ${a.lineas.map((l) => `<tr><td class="ctas"><input type="text" placeholder="Código" data-path="contabilidad.cuentas.${l.clave}" value="${esc(cu[l.clave])}"></td><td>${esc(l.cuenta)}</td><td class="wrap-t">${esc(l.nota)}</td><td class="num">${l.debe ? nf(l.debe) : ""}</td><td class="num">${l.haber ? nf(l.haber) : ""}</td></tr>`).join("")}
      </tbody><tfoot><tr><td colspan="3">Totales</td><td class="num">${nf(a.totalDebe)}</td><td class="num">${nf(a.totalHaber)}</td></tr></tfoot></table></div>
      <div class="msg st-${a.cuadra ? "ok" : "alerta"}">${ic(a.cuadra ? "ok" : "warn")}<span>${a.cuadra ? "La partida cuadra: debe y haber son iguales." : "La partida no cuadra, diferencia de " + fq(a.diferencia) + ". Revisa el tipo de cambio y el DAI."}</span></div>
      <div class="acciones"><button class="btn btn-secondary" data-act="copiar-partida">${ic("copy")}Copiar partida</button></div>
      <p class="note">Es una propuesta. Los códigos de cuenta los pones tú según tu catálogo contable.</p></section>`;
  }
  function tabCxP(v) {
    const c = C.cuentasPorPagar(exp(), v, C.hoyISO());
    return `<div class="kpis" style="grid-template-columns:repeat(2,minmax(0,1fr))"><div class="kpi main"><span>Saldo por pagar</span><b>${fq(c.pendiente)}</b><small>A la fecha de hoy</small></div><div class="kpi"><span>Facturas abiertas</span><b>${c.pendiente ? c.filas.length : 0}</b><small>${c.pendiente ? "TACSA" : "Sin deuda"}</small></div></div>
      <div class="tabla-wrap"><table class="tabla"><thead><tr><th>Proveedor</th><th>Documento</th><th>Fecha</th><th>Vence</th><th class="num">Monto</th><th>Estado</th></tr></thead><tbody>
      ${c.filas.map((r) => `<tr><td>${r.proveedor}</td><td>${esc(r.doc)}</td><td>${fdateVacio(r.fecha)}</td><td>${fdateVacio(r.vence)}</td><td class="num">${nf(r.monto)}</td><td><span class="chip st-${r.tono}">${esc(r.estado)}</span></td></tr>`).join("")}</tbody></table></div>
      ${exp().vinculo_banco_confirmado ? "" : '<p class="note">Si confirmas que la nota de débito pagó esta factura, pasa a «Pagada».</p>'}`;
  }
  function vContabilidad() {
    const v = calcular();
    const tabs = [["costeo", "Costeo e impuestos"], ["libro", "Libro de compras"], ["partida", "Partida contable"], ["cxp", "Cuentas por pagar"]];
    const cuerpo = { costeo: tabCosteo, libro: tabLibro, partida: tabPartida, cxp: tabCxP }[S.tab](v);
    return `<div class="wrap">${panelRevision(v)}
      <div class="tabs" role="tablist">${tabs.map(([id, t]) => `<button role="tab" data-tab="${id}" aria-selected="${S.tab === id}">${t}</button>`).join("")}</div>
      <div class="tab-in">${cuerpo}</div></div>`;
  }

  /* --- Guías --- */
  function blanco(guia) {
    const e = clone(window.SEED.expedientes[0]);
    e.id = "guia-" + guia + "-" + Date.now().toString(36);
    e.guia = guia; e.titulo = ""; e.ruta = "";
    e.tc_modo = "auto"; e.dai_modo = "factura"; e.partida = ""; e.dai_pct = 0; e.vinculo_banco_confirmado = false;
    e.revision = { estado: "Pendiente", por: "", fecha: "" };
    e.notas = [];
    const d = e.documentos;
    const vaciar = (o) => { for (const k in o) { if (Array.isArray(o[k])) o[k] = o[k].map((x) => (typeof x === "object" ? vaciar(x) : x)); else if (typeof o[k] === "object" && o[k]) vaciar(o[k]); else o[k] = typeof o[k] === "number" ? 0 : ""; } return o; };
    vaciar(d);
    d.ebay.guia_nota = guia; d.tacsa.guia = guia; d.tacsa.credito_dias = 8;
    return e;
  }
  function vGuias() {
    const ed = S.editGuia, er = S.errores, act = exp().id;
    const f = (k, l, req, cls = "") => `<label class="${cls}"><span class="${req ? "req" : ""}">${l}</span><input type="text" data-g="${k}" class="${er[k] ? "invalido" : ""}" value="${esc(ed ? ed[k] : "")}"><span class="err">${esc(er[k] || "")}</span></label>`;
    return `<div class="wrap"><div class="usuarios">
      <section class="panel"><h2>Guías registradas</h2><div class="tabla-wrap" style="box-shadow:none"><table class="tabla"><thead><tr><th>Guía</th><th>Descripción</th><th>Revisión</th><th></th></tr></thead><tbody>
      ${S.datos.expedientes.map((x) => { const conf = S.confirmar === x.id; return `<tr><td><b>${esc(x.guia)}</b>${x.id === act ? ' <span class="chip st-ok">En uso</span>' : ""}</td><td class="wrap-t">${esc(x.titulo || "Sin descripción")}<br><small style="color:var(--ink2)">${esc(x.ruta)}</small></td><td>${esc((x.revision || {}).estado || "Pendiente")}</td>
        <td class="acc">${x.id === act ? "" : `<button class="btn btn-secondary btn-sm" data-act="usar-guia" data-id="${x.id}">Usar</button>`}<button class="btn btn-tertiary btn-sm" data-act="editar-guia" data-id="${x.id}">Editar</button>${S.datos.expedientes.length > 1 && x.id !== act ? `<button class="btn btn-danger btn-sm${conf ? " confirmar" : ""}" data-act="eliminar-guia" data-id="${x.id}">${conf ? (x.revision && x.revision.estado === "Validado" ? "¿Seguro? Está validada" : "¿Seguro?") : "Eliminar"}</button>` : ""}</td></tr>`; }).join("")}
      </tbody></table></div></section>
      <section class="panel"><h2>${ed && ed.id ? "Editar guía" : "Nueva guía"}</h2>
        ${ed ? `<form class="form" id="form-g" novalidate>${f("guia", "Número de guía", true)}${f("titulo", "Descripción", false, "full")}${f("ruta", "Ruta", false, "full")}
          <div class="acciones" style="grid-column:1/-1"><button class="btn btn-primary" type="submit">${ic("save")}Guardar guía</button><button class="btn btn-tertiary" type="button" data-act="cancelar-guia">Cancelar</button></div></form>` : `<p class="note" style="margin-top:0">La guía en uso es la que se ve en Cadena, Documentos, Verificaciones y Contabilidad. Toca «Nueva guía» para abrir otro expediente en blanco.</p>`}
      </section></div></div>`;
  }

  /* --- Usuarios --- */
  const ROLES = ["Contabilidad", "Administración", "Compras", "Gerencia", "Consulta"];
  const SALUDOS = ["Bienvenido", "Bienvenida", "Hola"];
  function vUsuarios() {
    const ed = S.editUsuario, er = S.errores;
    const f = (k, l, req, tipo = "text") => `<label class="${k === "puesto" ? "full" : ""}"><span class="${req ? "req" : ""}">${l}</span><input type="${tipo}" data-u="${k}" class="${er[k] ? "invalido" : ""}" value="${esc(ed ? ed[k] : "")}" ${req ? "required" : ""}><span class="err">${esc(er[k] || "")}</span></label>`;
    return `<div class="wrap"><div class="usuarios">
      <section class="panel"><h2>Usuarios registrados</h2><div class="tabla-wrap" style="box-shadow:none"><table class="tabla"><thead><tr><th>Nombre</th><th>Puesto</th><th>Rol</th><th></th></tr></thead><tbody>
        ${S.datos.usuarios.map((u) => {
          const actual = u.id === S.datos.usuario_actual;
          const conf = S.confirmar === u.id;
          return `<tr><td><span class="avatar">${esc((u.nombre[0] || "") + (u.apellido[0] || ""))}</span>${esc(nombreCompleto(u))}${actual ? ' <span class="chip st-ok">En uso</span>' : ""}</td><td>${esc(u.puesto)}<br><small style="color:var(--ink2)">${esc(u.departamento)}</small></td><td>${esc(u.rol)}</td>
          <td class="acc">${actual ? "" : `<button class="btn btn-secondary btn-sm" data-act="usar" data-id="${u.id}">Usar</button>`}
            <button class="btn btn-tertiary btn-sm" data-act="editar" data-id="${u.id}">Editar</button>
            ${S.datos.usuarios.length > 1 && !actual ? `<button class="btn btn-danger btn-sm${conf ? " confirmar" : ""}" data-act="eliminar" data-id="${u.id}">${conf ? "¿Seguro?" : "Eliminar"}</button>` : ""}</td></tr>`;
        }).join("")}</tbody></table></div></section>
      <section class="panel"><h2>${ed && ed.id ? "Editar usuario" : "Datos básicos"}</h2>
        ${ed ? `<form class="form" id="form-u" novalidate>
          ${f("nombre", "Nombre", true)}${f("apellido", "Apellido", true)}${f("puesto", "Puesto", true)}${f("departamento", "Departamento", false)}
          ${f("correo", "Correo", false, "email")}${f("telefono", "Teléfono", false, "tel")}
          <label><span>Rol</span><select data-u="rol">${ROLES.map((r) => `<option ${ed.rol === r ? "selected" : ""}>${r}</option>`).join("")}</select></label>
          <label><span>Saludo</span><select data-u="saludo">${SALUDOS.map((r) => `<option ${ed.saludo === r ? "selected" : ""}>${r}</option>`).join("")}</select></label>
          <div class="acciones full" style="grid-column:1/-1"><button class="btn btn-primary" type="submit">${ic("save")}Guardar usuario</button><button class="btn btn-tertiary" type="button" data-act="cancelar-usuario">Cancelar</button></div>
        </form>` : `<p class="note" style="margin-top:0">Toca «Nuevo usuario» o «Editar» para ver el formulario. El usuario «En uso» es el que sale en el saludo de arriba.</p>`}
      </section></div></div>`;
  }

  /* ---------- Render ---------- */
  const VISTAS = { guias: vGuias, inicio: vInicio, documentos: vDocumentos, verificaciones: vVerificaciones, contabilidad: vContabilidad, usuarios: vUsuarios };
  function render(conservar) {
    const el = $("#view");
    const top = el.scrollTop;
    try {
      el.innerHTML = VISTAS[S.vista]();
    } catch (err) {
      console.error(err);
      el.innerHTML = `<div class="wrap"><section class="panel"><h2>No se pudo mostrar esta pantalla</h2><p class="note" style="margin-top:0">Los datos de la guía en uso tienen un formato inesperado. No se borró nada. Prueba con otra guía o restaura los datos de ejemplo desde el menú.</p><div class="acciones"><button class="btn btn-primary" data-nav="guias">Ir a Guías</button></div></section></div>`;
    }
    el.classList.remove("view-in");
    if (!conservar) { void el.offsetWidth; el.classList.add("view-in"); }
    el.scrollTop = conservar ? top : 0;
    try { pintaCabecera(); } catch (err) { console.error(err); }
    pintaNav();
    pintaHints();
    if (!conservar) el.focus({ preventScroll: true });
  }
  function ir(vista) {
    S.vista = vista;
    S.confirmar = null;
    S.confirmaValidar = false;
    if (vista !== "usuarios") { S.editUsuario = null; }
    if (vista !== "guias") S.editGuia = null;
    S.errores = {};
    render(false);
  }
  function irDoc(n) {
    if (S.vista !== "documentos") { S.vista = "documentos"; render(false); }
    const d = $("#doc-" + n);
    if (!d) return;
    d.scrollIntoView({ behavior: "smooth", block: "start" });
    d.classList.remove("flash");
    void d.offsetWidth;
    d.classList.add("flash");
  }
  const NIVEL_ICO = { error: "warn", aviso: "wait" };
  function pintaHints() {
    const av = avisosActuales();
    const por = {};
    av.forEach((x) => { if (x.campo && !por[x.campo]) por[x.campo] = x; });
    document.querySelectorAll("[data-hint]").forEach((h) => {
      const x = por[h.dataset.hint];
      h.textContent = x ? x.texto : "";
      const lab = h.closest("label");
      if (lab) { lab.classList.toggle("tiene-error", !!x && x.nivel === "error"); lab.classList.toggle("tiene-aviso", !!x && x.nivel === "aviso"); }
    });
    document.querySelectorAll("[data-doc-avisos]").forEach((c) => {
      const n = Number(c.dataset.docAvisos);
      const lista = av.filter((x) => x.doc === n && !x.campo);
      c.innerHTML = lista.map((x) => `<div class="msg st-${x.nivel === "error" ? "alerta" : "pendiente"}">${ic(NIVEL_ICO[x.nivel])}<span>${esc(x.texto)}</span></div>`).join("");
    });
  }
  function irCampo(ruta, doc) {
    const enConta = !ruta || /^(tipo_cambio|partida|dai_pct)$/.test(ruta);
    if (enConta && !doc) { S.vista = "contabilidad"; S.tab = "costeo"; render(false); }
    else irDoc(doc || 2);
    setTimeout(() => {
      const el = ruta ? document.querySelector(`[data-path="${ruta}"]`) : null;
      if (el) { el.scrollIntoView({ block: "center", behavior: "smooth" }); el.focus({ preventScroll: true }); }
    }, 350);
  }
  function refrescarDerivados() {
    pintaHints();
    const v = calcular();
    document.querySelectorAll("[data-bind]").forEach((el) => {
      const k = el.dataset.bind;
      el.textContent = k === "ebayTotal" ? fu(v.ebayTotal) : k === "cargos" ? fq(v.cargos) : el.textContent;
    });
    pintaNav();
  }

  /* ---------- Acciones ---------- */
  function copiar(txt) {
    const bien = () => aviso("Partida copiada. Pégala en Excel o en tu sistema contable.");
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(bien, () => fallback());
    else fallback();
    function fallback() {
      const t = document.createElement("textarea");
      t.value = txt; document.body.appendChild(t); t.select();
      try { document.execCommand("copy"); bien(); } catch (e) { aviso("No se pudo copiar."); }
      t.remove();
    }
  }
  async function exportarCSV() {
    const csv = C.aCSV(exp(), calcular());
    const nombre = "expediente-" + exp().guia + ".csv";
    if (S.enApp) {
      try {
        const ruta = await window.pywebview.api.exportar_csv(csv, nombre);
        aviso(ruta ? "Guardado en " + ruta : "Exportación cancelada.");
      } catch (e) { aviso("No se pudo exportar."); }
    } else {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
      a.download = nombre; a.click();
    }
  }
  function nuevoUsuario() {
    S.editUsuario = { id: "", nombre: "", apellido: "", puesto: "", departamento: "", correo: "", telefono: "", rol: "Contabilidad", saludo: "Bienvenido" };
    S.errores = {};
    render(true);
    const i = $('[data-u="nombre"]');
    if (i) i.focus();
  }
  function guardarGuia() {
    const g = S.editGuia, er = {};
    g.guia = normalizar("digitos", g.guia).valor; g.titulo = normalizar("texto", g.titulo).valor; g.ruta = normalizar("texto", g.ruta).valor;
    if (!g.guia) er.guia = "Obligatorio";
    else if (!/^\d+$/.test(g.guia)) er.guia = "La guía de TACSA lleva solo números";
    else if (S.datos.expedientes.some((x) => x.guia === g.guia && x.id !== g.id)) er.guia = "Ya existe esa guía";
    S.errores = er;
    if (Object.keys(er).length) { render(true); return aviso("Revisa los campos marcados."); }
    if (g.id) { const x = S.datos.expedientes.find((y) => y.id === g.id); x.guia = g.guia; x.titulo = g.titulo; x.ruta = g.ruta; }
    else { const n = blanco(g.guia); n.titulo = g.titulo; n.ruta = g.ruta; S.datos.expedientes.push(n); S.datos.expediente_actual = n.id; }
    S.editGuia = null; guardar(); render(true); aviso("Guía guardada.");
  }
  const TIPOS_U = { nombre: "titulo", apellido: "titulo", puesto: "titulo", departamento: "titulo", correo: "correo", telefono: "telefono" };
  const TIPOS_G = { guia: "digitos", titulo: "texto", ruta: "texto" };
  function guardarUsuario() {
    const u = S.editUsuario, er = {};
    ["nombre", "apellido", "puesto"].forEach((k) => { if (!String(u[k] || "").trim()) er[k] = "Obligatorio"; });
    Object.keys(TIPOS_U).forEach((k) => {
      const r = normalizar(TIPOS_U[k], u[k]);
      if (r.ok) u[k] = r.valor; else er[k] = r.error;
    });
    ["nombre", "apellido", "puesto"].forEach((k) => { if (!String(u[k] || "").trim()) er[k] = "Obligatorio"; });
    if (!er.nombre && !er.apellido && S.datos.usuarios.some((x) => x.id !== u.id && (x.nombre + " " + x.apellido).trim().toLowerCase() === (String(u.nombre).trim() + " " + String(u.apellido).trim()).toLowerCase())) er.apellido = "Ya existe un usuario con ese nombre";
    if (u.correo && !er.correo && S.datos.usuarios.some((x) => x.id !== u.id && x.correo && x.correo.toLowerCase() === u.correo.toLowerCase())) er.correo = "Ese correo ya está en uso";
    S.errores = er;
    if (Object.keys(er).length) { render(true); return aviso("Revisa los campos marcados."); }
    if (u.id) S.datos.usuarios = S.datos.usuarios.map((x) => (x.id === u.id ? u : x));
    else { u.id = "u" + Date.now().toString(36); S.datos.usuarios.push(u); }
    S.editUsuario = null;
    guardar(); pintaTopbar(); render(true);
    aviso("Usuario guardado.");
  }

  function onClick(ev) {
    const t = ev.target.closest("[data-nav],[data-act],[data-tab],[data-ir-doc],[data-ir-campo]");
    if (!t) return;
    if (t.dataset.irCampo !== undefined) return irCampo(t.dataset.irCampo, Number(t.dataset.doc));
    if (t.dataset.nav) return ir(t.dataset.nav);
    if (t.dataset.irDoc) return irDoc(t.dataset.irDoc);
    if (t.dataset.tab) { S.tab = t.dataset.tab; S.confirmaValidar = false; return render(true); }
    const id = t.dataset.id;
    switch (t.dataset.act) {
      case "tema": S.datos.tema = S.datos.tema === "noche" ? "claro" : "noche"; aplicaTema(); return guardar();
      case "reintentar-guardado": return guardar();
      case "act-instalar": return instalarActualizacion();
      case "act-despues": return posponerActualizacion();
      case "act-cerrar": S.actVerError = false; S.actCerrada = true; return pintaActualizacion();
      case "act-ver": S.actVer = true; S.actCerrada = false; return pintaActualizacion();
      case "act-buscar": return buscarActualizacion();
      case "tc-consultar": return consultarTC();
      case "copiar-factura": { tocar(); const d = exp().documentos; d.makan.factura = d.tacsa.numero; d.makan.fecha = d.tacsa.fecha; d.makan.monto = d.tacsa.total_cobro; d.makan.proveedor = d.makan.proveedor || "Tacsa"; guardar(); render(true); return aviso("Datos copiados de la factura de TACSA."); }
      case "csv": return exportarCSV();
      case "validar": {
        const v = calcular(), av = avisosActuales(), errs = av.filter((x) => x.nivel === "error").length;
        if (v.resumen.alerta || errs) return aviso("Corrige las alertas y errores antes de validar.");
        if (v.resumen.pendiente + av.length > 0 && !S.confirmaValidar) { S.confirmaValidar = true; return render(true); }
        S.confirmaValidar = false;
        exp().tc_fijo = v.tc; exp().revision = { estado: "Validado", por: nombreCompleto(usuario()), fecha: C.hoyISO() }; guardar(); render(true); return aviso("Expediente validado."); }
      case "reabrir": exp().tc_fijo = 0; exp().revision = { estado: "Pendiente", por: "", fecha: "" }; guardar(); return render(true);
      case "copiar-partida": { const a = C.asiento(exp(), calcular()); return copiar(["Cuenta\tDetalle\tDebe\tHaber"].concat(a.lineas.map((l) => [l.cuenta, l.nota, l.debe || "", l.haber || ""].join("\t"))).concat([["Totales", "", a.totalDebe, a.totalHaber].join("\t")]).join("\n")); }
      case "add-arancel": {
        const rc = normalizar("partida", $("#ar-cod").value), rd = normalizar("pct", $("#ar-dai").value);
        if (!rc.ok || !rc.valor) return aviso(rc.ok ? "Escribe la partida arancelaria." : rc.error);
        if (!rd.ok) return aviso(rd.error);
        if (S.datos.aranceles.some((x) => x.codigo === rc.valor)) return aviso("Esa partida ya está en la tabla.");
        const des = normalizar("texto", $("#ar-des").value).valor;
        tocar();
        S.datos.aranceles.push({ codigo: rc.valor, descripcion: des || "Sin descripción", dai: rd.valor }); guardar(); return render(true);
      }
      case "del-arancel": tocar(); S.datos.aranceles.splice(Number(t.dataset.i), 1); guardar(); return render(true);
      case "restaurar": {
        if (!t.classList.contains("confirmar")) { t.classList.add("confirmar"); t.textContent = "Toca otra vez para confirmar"; return setTimeout(() => { t.classList.remove("confirmar"); t.textContent = "Restaurar datos de ejemplo"; }, 3500); }
        return restaurar();
      }
      case "nueva-guia": S.editGuia = { id: "", guia: "", titulo: "", ruta: "" }; S.errores = {}; render(true); { const i = $('[data-g="guia"]'); if (i) i.focus(); } return;
      case "editar-guia": S.editGuia = clone(S.datos.expedientes.find((x) => x.id === id)); S.errores = {}; return render(true);
      case "cancelar-guia": S.editGuia = null; S.errores = {}; return render(true);
      case "usar-guia": S.datos.expediente_actual = id; guardar(); aviso("Guía en uso: " + exp().guia); return render(true);
      case "eliminar-guia":
        if (S.confirmar !== id) { S.confirmar = id; render(true); return setTimeout(() => { if (S.confirmar === id) { S.confirmar = null; if (S.vista === "guias") render(true); } }, 3500); }
        S.datos.expedientes = S.datos.expedientes.filter((x) => x.id !== id); S.confirmar = null; guardar(); return render(true);
      case "nuevo-usuario": if (S.vista !== "usuarios") { S.vista = "usuarios"; } return nuevoUsuario();
      case "editar": S.editUsuario = clone(S.datos.usuarios.find((u) => u.id === id)); S.errores = {}; return render(true);
      case "cancelar-usuario": S.editUsuario = null; S.errores = {}; return render(true);
      case "usar": S.datos.usuario_actual = id; guardar(); pintaTopbar(); return render(true);
      case "eliminar":
        if (S.confirmar !== id) { S.confirmar = id; render(true); return setTimeout(() => { if (S.confirmar === id) { S.confirmar = null; if (S.vista === "usuarios") render(true); } }, 3500); }
        S.datos.usuarios = S.datos.usuarios.filter((u) => u.id !== id); S.confirmar = null; guardar(); return render(true);
    }
  }
  async function restaurar() {
    try { if (S.enApp) await window.pywebview.api.restaurar_demo(); else localStorage.removeItem("makan_datos"); } catch (e) {}
    S.datos = clone(window.SEED);
    S.datos.expediente_actual = S.datos.expedientes[0].id;
    guardar(); pintaTopbar(); render(false);
    aviso("Datos de ejemplo restaurados.");
  }
  function onChange(ev) {
    const t = ev.target;
    if (t.matches(".js-vinculo")) { tocar(); exp().vinculo_banco_confirmado = t.checked; guardar(); return render(true); }
    if (t.name === "tcm") { tocar(); exp().tc_modo = t.value; guardar(); return render(true); }
    if (t.name === "daim") { tocar(); exp().dai_modo = t.value; guardar(); return render(true); }
    if (t.dataset.g) { const r = normalizar(TIPOS_G[t.dataset.g] || "texto", t.value); S.editGuia[t.dataset.g] = r.ok ? r.valor : t.value; if (r.ok) t.value = r.mostrar; else aviso(r.error); return; }
    if (t.dataset.u) { const r = normalizar(TIPOS_U[t.dataset.u] || "texto", t.value); S.editUsuario[t.dataset.u] = r.ok ? r.valor : t.value; if (r.ok) t.value = r.mostrar; else aviso(r.error); return; }
    if (t.dataset.path) {
      let val = t.value;
      const tipo = tipoDe(t.dataset.path, t.dataset.tipo);
      t.dataset.tipo = tipo;
      if (["num", "mon", "tc"].includes(tipo)) {
        const n = parseMonto(val);
        const previo = getPath(exp(), t.dataset.path);
        const mostrar = (x) => (t.dataset.tipo === "mon" ? nf(x).replace(/,/g, "") : t.dataset.tipo === "tc" ? Number(x || 0).toFixed(5) : x);
        if (Number.isNaN(n)) { aviso("Escribe un número válido."); t.value = mostrar(previo); return; }
        if (n < 0 && !/descuento$/.test(t.dataset.path)) { aviso("Este valor no puede ser negativo."); t.value = mostrar(previo); return; }
        val = t.dataset.tipo === "mon" ? Math.round((n + Number.EPSILON) * 100) / 100 : n;
        t.value = mostrar(val);
      } else if (tipo === "date") {
        if (val.trim() === "") val = "";
        else {
          const iso = parseFecha(val);
          if (!iso) { aviso("Escribe la fecha como dd/mm/aaaa."); t.value = C.esFecha(getPath(exp(), t.dataset.path)) ? fdate(getPath(exp(), t.dataset.path)) : ""; return; }
          val = iso; t.value = fdate(iso);
        }
      } else {
        const r = normalizar(tipo === "text" ? "texto" : tipo, val);
        if (!r.ok) {
          aviso(r.error);
          const previo = getPath(exp(), t.dataset.path);
          t.value = NUMERICOS.includes(tipo) ? String(previo) : previo;
          return;
        }
        val = r.valor; t.value = r.mostrar;
      }
      const ruta = t.dataset.path;
      if (!ruta.startsWith("contabilidad.")) tocar();
      setPath(exp(), ruta, val);
      guardar();
      if (S.vista === "documentos") refrescarDerivados();
      else render(true);
    }
  }
  function onInput(ev) {
    const t = ev.target;
    if (t.dataset.u && S.editUsuario) S.editUsuario[t.dataset.u] = t.value;
    if (t.dataset.g && S.editGuia) S.editGuia[t.dataset.g] = t.value;
  }

  /* ---------- Movilidad: rueda, flechas y teclas ---------- */
  function movilidad() {
    const vista = $("#view");
    window.addEventListener("keydown", (ev) => {
      const t = ev.target;
      if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
      if (t && (/SELECT|TEXTAREA/.test(t.tagName) || (t.tagName === "INPUT" && !/^(checkbox|radio)$/.test(t.type)))) return;
      const paso = 64, pag = vista.clientHeight * 0.88;
      let dy = null;
      switch (ev.key) {
        case "ArrowDown": dy = paso; break;
        case "ArrowUp": dy = -paso; break;
        case "PageDown": dy = pag; break;
        case "PageUp": dy = -pag; break;
        case " ": if (t && /BUTTON|A/.test(t.tagName)) return; dy = ev.shiftKey ? -pag : pag; break;
        case "Home": vista.scrollTo({ top: 0, behavior: "smooth" }); ev.preventDefault(); return;
        case "End": vista.scrollTo({ top: vista.scrollHeight, behavior: "smooth" }); ev.preventDefault(); return;
      }
      if (dy !== null) { ev.preventDefault(); vista.scrollBy({ top: dy, behavior: "smooth" }); }
    });
    // La rueda sobre la barra superior o el encabezado también mueve el contenido
    ["#topbar", "#pagehead"].forEach((s) => $(s).addEventListener("wheel", (ev) => { vista.scrollBy({ top: ev.deltaY }); }, { passive: true }));
  }

  /* ---------- Arranque ---------- */
  function esperaPywebview() {
    return new Promise((res) => {
      if (window.pywebview && window.pywebview.api) return res(true);
      const t = setTimeout(() => res(false), 1500);
      window.addEventListener("pywebviewready", () => { clearTimeout(t); res(true); }, { once: true });
    });
  }
  async function iniciar() {
    S.enApp = await esperaPywebview();
    let guardados = null;
    try {
      if (S.enApp) { guardados = await window.pywebview.api.cargar(); S.tc = await window.pywebview.api.tc_estado(); try { S.act = await window.pywebview.api.act_estado(); } catch (e) {} }
      else { const s = localStorage.getItem("makan_datos"); guardados = s ? JSON.parse(s) : null; }
    } catch (e) { guardados = null; }
    S.datos = fusion(guardados, window.SEED);
    if (!S.datos.expedientes.some((x) => x.id === S.datos.expediente_actual)) S.datos.expediente_actual = S.datos.expedientes[0].id;
    pintaTopbar();
    movilidad();
    document.addEventListener("click", onClick);
    document.addEventListener("change", onChange);
    document.addEventListener("input", onInput);
    document.addEventListener("submit", (ev) => { if (ev.target.id === "form-u") { ev.preventDefault(); guardarUsuario(); } else if (ev.target.id === "form-g") { ev.preventDefault(); guardarGuia(); } });
    render(false);
    marcarGuardado("guardado", S.enApp ? "Guardado" : "Modo navegador");
    document.body.classList.remove("cargando");
    if (S.act && S.act.version_actual) $("#version").textContent = "v" + S.act.version_actual;
    pintaActualizacion();
    setInterval(pintaReloj, 1000);
    setInterval(() => { if (S.enApp) window.pywebview.api.tc_estado().then((e) => { if (JSON.stringify(e.ultima) !== JSON.stringify(S.tc && S.tc.ultima)) window.onTipoCambio(e); }).catch(() => {}); }, 60000);
  }
  iniciar();
})();
