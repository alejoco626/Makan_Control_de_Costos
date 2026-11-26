// Cálculos, cruces entre documentos y operaciones contables. Sin DOM: se puede probar con Node.
(function (root) {
  "use strict";

  const r2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
  const num = (v) => {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : 0;
  };
  // Formato de moneda: Q1,234.56 · US$1,234.56 · -Q5.00. Valores vacíos o inválidos salen como 0.
  const nf = (n, d = 2) => {
    const x = Number.isFinite(Number(n)) ? Number(n) : 0;
    const r = d === 2 ? r2(x) : x;
    return r.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
  };
  const signo = (n, txt) => (r2(Number.isFinite(Number(n)) ? Number(n) : 0) < 0 ? "-" : "") + txt;
  const fq = (n) => signo(n, "Q" + nf(Math.abs(Number(n) || 0)));
  const fu = (n) => signo(n, "US$" + nf(Math.abs(Number(n) || 0)));
  const ftc = (n) => "Q" + (Number.isFinite(Number(n)) ? Number(n) : 0).toFixed(5);
  // Lee lo que se escribe o se pega en un campo de importe: "1,234.56", "1.234,56", "24,5", "Q 1,234.50", "US$24".
  function parseMonto(txt) {
    let t = String(txt === undefined || txt === null ? "" : txt).trim().replace(/US\$|Q|\$|%|\s/gi, "");
    if (t === "") return 0;
    const neg = /^[-−]/.test(t);
    t = t.replace(/^[-−]/, "");
    if (!/^[\d.,]+$/.test(t) || !/\d/.test(t)) return NaN;
    const coma = t.lastIndexOf(","), punto = t.lastIndexOf(".");
    if (coma > -1 && punto > -1) t = coma > punto ? t.replace(/\./g, "").replace(",", ".") : t.replace(/,/g, "");
    else if (coma > -1) t = /^\d{1,3}(,\d{3})+$/.test(t) ? t.replace(/,/g, "") : t.replace(",", ".");
    else if ((t.match(/\./g) || []).length > 1) { if (!/^\d{1,3}(\.\d{3})+$/.test(t)) return NaN; t = t.replace(/\./g, ""); }
    const n = parseFloat(t);
    return Number.isFinite(n) ? (neg ? -n : n) : NaN;
  }
  const fpct = (n) => nf(n) + "%";

  const ISO = /^\d{4}-\d{2}-\d{2}$/;
  const esFecha = (s) => ISO.test(s || "");
  const fdate = (iso) =>
    esFecha(iso) ? iso.slice(8, 10) + "/" + iso.slice(5, 7) + "/" + iso.slice(0, 4) : "sin fecha";
  // Convierte lo que escribe la persona (dd/mm/aaaa, también con - o .) a AAAA-MM-DD. null si no es una fecha real.
  function parseFecha(txt) {
    const m = String(txt || "").trim().match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2}|\d{4})$/);
    if (!m) return null;
    let [, d, mes, a] = m;
    d = +d; mes = +mes; a = a.length === 2 ? 2000 + +a : +a;
    const f = new Date(Date.UTC(a, mes - 1, d));
    if (f.getUTCFullYear() !== a || f.getUTCMonth() !== mes - 1 || f.getUTCDate() !== d) return null;
    return String(a).padStart(4, "0") + "-" + String(mes).padStart(2, "0") + "-" + String(d).padStart(2, "0");
  }
  const fdateVacio = (iso) => (esFecha(iso) ? fdate(iso) : "—");
  const utc = (iso) => {
    const [y, m, d] = iso.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  };
  const sumarDias = (iso, dias) =>
    esFecha(iso) ? new Date(utc(iso) + dias * 86400000).toISOString().slice(0, 10) : null;
  const diasEntre = (a, b) =>
    esFecha(a) && esFecha(b) ? Math.round((utc(b) - utc(a)) / 86400000) : null;
  const cuadra = (a, b) => Math.abs(r2(a) - r2(b)) < 0.005;
  const hoyISO = (d = new Date()) =>
    d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");

  // Tasas de DAI que aparecen en el Arancel Centroamericano para la mayoría de mercancías.
  const TASAS_DAI = [0, 5, 10, 15, 20];
  const soloDigitos = (s) => String(s || "").replace(/\D/g, "");

  // Busca el DAI de una partida/inciso en la tabla local: exacto, luego por prefijo.
  function buscarArancel(codigo, tabla) {
    const d = soloDigitos(codigo);
    if (d.length < 4 || !Array.isArray(tabla)) return null;
    const lista = tabla.map((a) => ({ a, d: soloDigitos(a.codigo) }));
    let f = lista.find((x) => x.d === d);
    if (!f) f = lista.find((x) => x.d.startsWith(d));
    if (!f) f = lista.filter((x) => x.d && d.startsWith(x.d)).sort((p, q) => q.d.length - p.d.length)[0];
    return f ? f.a : null;
  }

  function calcular(exp, ctx) {
    ctx = ctx || {};
    const d = exp.documentos;
    const e = d.ebay, t = d.tacsa, m = d.makan, b = d.banco;
    const ca = t.cuenta_ajena;

    // Tipo de cambio: automático (Banguat) o manual
    const tcManual = num(exp.tipo_cambio);
    const tcAuto = num(ctx.tcAuto) > 0 ? num(ctx.tcAuto) : null;
    const usaAuto = exp.tc_modo !== "manual" && tcAuto !== null;
    const validado = !!(exp.revision && exp.revision.estado === "Validado");
    const tcFijo = validado && num(exp.tc_fijo) > 0 ? num(exp.tc_fijo) : null;
    const tc = tcFijo !== null ? tcFijo : usaAuto ? tcAuto : tcManual;
    const tcOrigen = tcFijo !== null ? "Fijado al validar" : usaAuto ? "Banguat" : exp.tc_modo === "manual" ? "Manual" : "Manual (sin consulta al Banguat)";
    const tcVencido = usaAuto && tcFijo === null && esFecha(ctx.tcFecha) && esFecha(ctx.hoy) && diasEntre(ctx.tcFecha, ctx.hoy) > 5;

    const ebayTotal = r2(num(e.subtotal) + num(e.envio) + num(e.impuesto) + num(e.descuento));
    const cargos = r2(t.cargos.reduce((s, c) => s + num(c.monto), 0));
    const cif = num(ca.cif);
    const iva = num(ca.iva_dai);
    const daiCobrado = num(ca.dai);

    // DAI deducido de la factura: con el DAI cobrado, o despejado del IVA (IVA = 12% × (CIF + DAI))
    let daiDeducidoPct = 0;
    let tasaUsual = true;
    if (cif > 0) {
      const base = daiCobrado > 0 ? (daiCobrado / cif) * 100 : Math.max(0, ((iva / 0.12) - cif) / cif * 100);
      const cercana = TASAS_DAI.find((x) => Math.abs(x - base) <= 0.15);
      tasaUsual = cercana !== undefined;
      daiDeducidoPct = tasaUsual ? cercana : r2(base);
    }

    const modoDai = exp.dai_modo === "partida" || exp.dai_modo === "manual" ? exp.dai_modo : "factura";
    let daiPct = daiDeducidoPct;
    let daiOrigen = "Deducido de la factura";
    let arancel = null;
    if (modoDai === "partida") {
      arancel = buscarArancel(exp.partida, ctx.aranceles);
      if (arancel) {
        daiPct = num(arancel.dai);
        daiOrigen = "Partida " + arancel.codigo;
      } else {
        daiPct = num(exp.dai_pct);
        daiOrigen = "Manual (partida no encontrada en la tabla)";
      }
    } else if (modoDai === "manual") {
      daiPct = num(exp.dai_pct);
      daiOrigen = "Manual";
    }

    const dai = r2((cif * daiPct) / 100);
    const ivaCalc = r2((cif + dai) * 0.12);
    const cobroCalc = r2(cargos + daiCobrado + iva);
    const mercaderiaQ = r2(ebayTotal * tc);
    const costoPuesto = r2(mercaderiaQ + cargos + dai);
    const coefGastos = mercaderiaQ > 0 ? r2((cargos / mercaderiaQ) * 100) : 0;
    const difCif = r2(cif - mercaderiaQ);
    const libroY = r2(cif + dai + ivaCalc);
    const vencimiento = sumarDias(t.fecha, num(t.credito_dias));
    const diasPago = diasEntre(vencimiento, b.fecha);
    const saldoBanco = r2(num(b.monto) - num(t.total_cobro));
    const confirmado = !!exp.vinculo_banco_confirmado;

    const V = [];
    const add = (id, titulo, estado, detalle) => V.push({ id, titulo, estado, detalle });
    const falta = (id, titulo, detalle) => add(id, titulo, "pendiente", detalle);
    const texto = (x) => String(x === undefined || x === null ? "" : x).trim();

    // Tipo de cambio utilizable
    if (tc <= 0) falta("tc", "Tipo de cambio", "No hay tipo de cambio. Consulta al Banguat o escribe uno manual.");
    else if (exp.tc_modo !== "manual" && !usaAuto && tcFijo === null)
      falta("tc", "Tipo de cambio", `Aún no hay consulta al Banguat. Se usa el valor manual ${ftc(tc)}.`);
    else if (tcVencido) add("tc", "Tipo de cambio", "alerta", `El último valor del Banguat es del ${fdate(ctx.tcFecha)}. Consulta de nuevo.`);
    else add("tc", "Tipo de cambio", "ok", `${ftc(tc)} · ${tcOrigen}.`);

    if (num(e.subtotal) === 0 && num(e.total_documento) === 0) {
      falta("ebay_total", "Total del pedido de eBay", "Faltan los importes del pedido.");
    } else {
      add(
        "ebay_total",
        "Total del pedido de eBay",
        cuadra(ebayTotal, num(e.total_documento)) ? "ok" : "alerta",
        `${fu(num(e.subtotal))} + ${fu(num(e.envio))} + ${fu(num(e.impuesto))} − ${fu(Math.abs(num(e.descuento)))} = ${fu(ebayTotal)}. El documento dice ${fu(num(e.total_documento))}.`
      );
    }

    const guiaA = texto(e.guia_nota);
    const guiaB = texto(t.guia);
    const guiaX = texto(exp.guia);
    if (guiaA === "" || guiaB === "") {
      falta("guia", "La guía enlaza el pedido con la factura", `Falta la guía en ${guiaA === "" ? "el pedido de eBay" : "la factura de TACSA"}.`);
    } else {
      add(
        "guia",
        "La guía enlaza el pedido con la factura",
        guiaA === guiaB && guiaB === guiaX ? "ok" : "alerta",
        `Pedido: ${guiaA}. Factura de TACSA: ${guiaB}. Guía del expediente: ${guiaX || "vacía"}.`
      );
    }

    if (cargos === 0 && num(t.total_factura) === 0) {
      falta("cargos", "Los cargos de TACSA suman el total de la factura", "Faltan los cargos de la factura.");
    } else {
      add(
        "cargos",
        "Los cargos de TACSA suman el total de la factura",
        cuadra(cargos, num(t.total_factura)) ? "ok" : "alerta",
        `${t.cargos.map((c) => fq(num(c.monto))).join(" + ")} = ${fq(cargos)}. La factura dice ${fq(num(t.total_factura))}.`
      );
    }

    if (cif === 0) {
      falta("iva", modoDai === "factura" ? "DAI deducido de la factura de TACSA" : "IVA de importación = 12% de (CIF + DAI)", "Falta el valor CIF de la factura.");
    } else if (modoDai === "factura") {
      const detalleBase =
        daiCobrado > 0
          ? `DAI cobrado ${fq(daiCobrado)} sobre un CIF de ${fq(cif)}`
          : `IVA ${fq(iva)} ÷ 12% = ${fq(r2(iva / 0.12))} frente al CIF de ${fq(cif)}`;
      add(
        "iva",
        "DAI deducido de la factura de TACSA",
        tasaUsual ? "ok" : "alerta",
        `${detalleBase}. DAI resultante: ${fpct(daiPct)}${tasaUsual ? "" : ", que no es una tasa usual (0, 5, 10, 15 o 20%)"}.`
      );
    } else {
      add(
        "iva",
        "IVA de importación = 12% de (CIF + DAI)",
        cuadra(ivaCalc, iva) ? "ok" : "alerta",
        `12% × (${fq(cif)} + ${fq(dai)}) = ${fq(ivaCalc)}. TACSA cobró ${fq(iva)} por cuenta ajena.`
      );
    }

    if (cobroCalc === 0 && num(t.total_cobro) === 0) {
      falta("cobro", "Total cobrado = cargos + cuenta ajena", "Falta el total cobrado.");
    } else {
      add(
        "cobro",
        "Total cobrado = cargos + cuenta ajena",
        cuadra(cobroCalc, num(t.total_cobro)) ? "ok" : "alerta",
        `${fq(cargos)} + ${fq(daiCobrado + iva)} = ${fq(cobroCalc)}. La factura dice ${fq(num(t.total_cobro))}.`
      );
    }

    if (texto(m.factura) === "" && num(m.monto) === 0) {
      falta("makan", "El control de Makan coincide con la factura", "Falta registrar la factura y el monto en el control.");
    } else {
      const mismaFactura = texto(m.factura) === texto(t.numero);
      const mismoMonto = cuadra(num(m.monto), num(t.total_cobro));
      add(
        "makan",
        "El control de Makan coincide con la factura",
        mismaFactura && mismoMonto ? "ok" : "alerta",
        `Control ${m.numero}: factura ${m.factura} por ${fq(num(m.monto))}. TACSA: factura ${t.numero} por ${fq(num(t.total_cobro))}.`
      );
    }

    if (!esFecha(m.fecha) || !esFecha(t.fecha)) {
      falta("fecha_makan", "La fecha del control es la de la factura", "Falta la fecha del control o de la factura.");
    } else {
      add(
        "fecha_makan",
        "La fecha del control es la de la factura",
        m.fecha === t.fecha ? "ok" : "alerta",
        `Control: ${fdate(m.fecha)}. Factura: ${fdate(t.fecha)}.`
      );
    }

    if (!confirmado) {
      add(
        "banco",
        "El pago bancario cubre la factura",
        "pendiente",
        `El débito de ${fq(num(b.monto))} del ${fdate(b.fecha)} no dice qué facturas paga. Confirma el vínculo para comprobarlo.`
      );
      add(
        "venc",
        `Pago dentro de los ${dias(num(t.credito_dias))} de crédito`,
        "pendiente",
        `La factura vence el ${fdate(vencimiento)}. Se evalúa al confirmar el vínculo del pago.`
      );
    } else {
      const cubre = num(b.monto) + 0.005 >= num(t.total_cobro);
      add(
        "banco",
        "El pago bancario cubre la factura",
        cubre ? "ok" : "alerta",
        cubre
          ? `El débito de ${fq(num(b.monto))} cubre los ${fq(num(t.total_cobro))} de la factura. Quedan ${fq(saldoBanco)} para otras facturas.`
          : `El débito de ${fq(num(b.monto))} no alcanza para los ${fq(num(t.total_cobro))} de la factura.`
      );
      let estadoVenc = "pendiente";
      let detalleVenc = `La factura vence el ${fdate(vencimiento)} y el pago no tiene fecha válida.`;
      if (diasPago !== null) {
        if (diasPago <= 0) {
          estadoVenc = "ok";
          detalleVenc = `Pagado ${dias(diasPago)} antes del vencimiento (${fdate(vencimiento)}).`;
        } else {
          estadoVenc = "alerta";
          detalleVenc = `Pagado ${dias(diasPago)} después del vencimiento (${fdate(vencimiento)}).`;
        }
      }
      add("venc", `Pago dentro de los ${dias(num(t.credito_dias))} de crédito`, estadoVenc, detalleVenc);
    }

    const resumen = { total: V.length, ok: 0, alerta: 0, pendiente: 0 };
    V.forEach((x) => (resumen[x.estado] += 1));

    return {
      ebayTotal, cargos, cif, iva, dai, ivaCalc, cobroCalc, mercaderiaQ, costoPuesto,
      coefGastos, difCif, libroY, vencimiento, diasPago, saldoBanco,
      tc, tcAuto, tcOrigen, usaAuto, daiPct, daiOrigen, daiDeducidoPct, tasaUsual, arancel,
      verificaciones: V, resumen,
    };
  }

  // ---- Formatos de texto y número que se escriben a mano ----
  const limpiar = (t) => String(t === undefined || t === null ? "" : t).replace(/\s+/g, " ").trim();
  const PARTICULAS = new Set(["de", "del", "la", "las", "los", "y", "e", "da", "di", "van", "von"]);
  function titulo(t) {
    return limpiar(t).split(" ").map((w, i) => {
      const l = w.toLowerCase();
      if (i > 0 && PARTICULAS.has(l)) return l;
      return w === l || w === w.toUpperCase() ? l.charAt(0).toUpperCase() + l.slice(1) : w;
    }).join(" ");
  }
  const sinNum = (n) => String(Math.round((n + Number.EPSILON) * 100) / 100);
  // normalizar(tipo, valor) devuelve { ok: true, valor, mostrar } o { ok: false, error }.
  // valor es lo que se guarda y mostrar lo que se ve en el campo.
  function normalizar(tipo, crudo) {
    const t = limpiar(crudo);
    const bien = (v, m) => ({ ok: true, valor: v, mostrar: m === undefined ? String(v) : m });
    const mal = (error) => ({ ok: false, error });
    switch (tipo) {
      case "texto": return bien(t);
      case "titulo": return bien(titulo(t));
      case "mayus": return bien(t.replace(/\s/g, "").toUpperCase());
      case "digitos": return bien(t.replace(/\s/g, ""));
      case "pedido": { const d = t.replace(/[\s-]/g, ""); return bien(/^\d{12}$/.test(d) ? `${d.slice(0, 2)}-${d.slice(2, 7)}-${d.slice(7)}` : t); }
      case "cuenta": return bien(t.replace(/\s/g, ""));
      case "partida": {
        if (t === "") return bien("");
        const d = t.replace(/[\s.\-]/g, "");
        if (!/^\d{4,10}$/.test(d)) return mal("La partida lleva de 4 a 10 dígitos, por ejemplo 8512.30.00.00.");
        const g = [d.slice(0, 4), d.slice(4, 6), d.slice(6, 8), d.slice(8, 10)].filter(Boolean);
        return bien(g.join("."));
      }
      case "hora": {
        if (t === "") return bien("");
        const m = t.match(/^(\d{1,2}):?(\d{2})(?::?(\d{2}))?$/);
        if (!m || +m[1] > 23 || +m[2] > 59 || (m[3] !== undefined && +m[3] > 59)) return mal("Escribe la hora como hh:mm o hh:mm:ss.");
        return bien(`${m[1].padStart(2, "0")}:${m[2]}${m[3] !== undefined ? ":" + m[3] : ""}`);
      }
      case "correo": {
        const c = t.toLowerCase();
        if (c !== "" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c)) return mal("Escribe un correo válido, por ejemplo nombre@empresa.com.");
        return bien(c);
      }
      case "telefono": {
        if (t === "") return bien("");
        const d = t.replace(/\D/g, "");
        if (/^\d{8}$/.test(d)) return bien(`${d.slice(0, 4)}-${d.slice(4)}`);
        if (/^502\d{8}$/.test(d)) return bien(`+502 ${d.slice(3, 7)}-${d.slice(7)}`);
        return mal("El teléfono lleva 8 dígitos (o +502 y 8 dígitos).");
      }
      case "entero": {
        const n = parseMonto(t);
        if (Number.isNaN(n) || !Number.isInteger(n)) return mal("Escribe un número entero.");
        if (n < 0) return mal("Este valor no puede ser negativo.");
        return bien(n);
      }
      case "dec": {
        const n = parseMonto(t);
        if (Number.isNaN(n)) return mal("Escribe un número válido.");
        if (n < 0) return mal("Este valor no puede ser negativo.");
        return bien(Math.round((n + Number.EPSILON) * 100) / 100, sinNum(n));
      }
      case "pct": {
        const n = parseMonto(t);
        if (Number.isNaN(n)) return mal("Escribe un porcentaje válido, por ejemplo 5.");
        if (n < 0 || n > 100) return mal("El porcentaje va de 0 a 100.");
        return bien(Math.round((n + Number.EPSILON) * 100) / 100, sinNum(n));
      }
      default: return bien(t);
    }
  }
  const dias = (n) => (Math.abs(n) === 1 ? "1 día" : Math.abs(n) + " días");
  const diasTxt = dias; // alias para funciones que tienen una variable local llamada dias

  // Completa y corrige un expediente guardado con la forma de la plantilla: claves que faltan, tipos
  // equivocados (un número guardado como texto, por ejemplo) y listas dañadas. Así el resto del código
  // no se rompe con datos viejos o editados a mano.
  const clon = (o) => JSON.parse(JSON.stringify(o));
  function llena(t, p) {
    Object.keys(p).forEach((k) => {
      const pv = p[k];
      if (t[k] === undefined || t[k] === null) { t[k] = clon(pv); return; }
      if (Array.isArray(pv)) { if (!Array.isArray(t[k])) t[k] = clon(pv); }
      else if (pv && typeof pv === "object") {
        if (typeof t[k] !== "object" || Array.isArray(t[k])) t[k] = {};
        llena(t[k], pv);
      } else if (typeof pv === "number") {
        if (typeof t[k] !== "number" || !Number.isFinite(t[k])) { const n = parseFloat(t[k]); t[k] = Number.isFinite(n) ? n : 0; }
      } else if (typeof pv === "string") { if (typeof t[k] !== "string") t[k] = String(t[k]); }
      else if (typeof pv === "boolean") t[k] = !!t[k];
    });
    return t;
  }
  function sanear(exp, plantilla) {
    const e = llena(exp && typeof exp === "object" ? exp : {}, plantilla);
    e.documentos.tacsa.cargos = e.documentos.tacsa.cargos
      .filter((c) => c && typeof c === "object")
      .map((c) => ({ concepto: String(c.concepto === undefined || c.concepto === null ? "" : c.concepto), monto: Number.isFinite(parseFloat(c.monto)) ? parseFloat(c.monto) : 0 }));
    if (!Array.isArray(e.notas)) e.notas = [];
    return e;
  }

  // Avisos de captura: datos imposibles (error) o sospechosos (aviso). No reemplazan las verificaciones:
  // estas revisan cada documento por separado y contra otros expedientes.
  // Cada aviso: { id, nivel: "error" | "aviso", doc: 1..4 | 0, campo: ruta del dato | null, texto }
  function avisos(exp, v, ctx) {
    ctx = ctx || {};
    const hoy = esFecha(ctx.hoy) ? ctx.hoy : hoyISO();
    const d = exp.documentos, e = d.ebay, t = d.tacsa, ca = t.cuenta_ajena, m = d.makan, b = d.banco;
    const out = [];
    const ya = new Set();
    const add = (id, nivel, doc, campo, texto) => { if (!ya.has(id)) { ya.add(id); out.push({ id, nivel, doc, campo, texto }); } };
    const lleno = (x) => String(x === undefined || x === null ? "" : x).trim() !== "";

    // --- Fechas: reales, no futuras y en orden lógico ---
    const fechas = [
      [1, "documentos.ebay.fecha", e.fecha, "del pedido de eBay"],
      [2, "documentos.tacsa.fecha", t.fecha, "de la factura de TACSA"],
      [2, "documentos.tacsa.fecha_guia", t.fecha_guia, "de la guía"],
      [2, "documentos.tacsa.cuenta_ajena.fecha_documento", ca.fecha_documento, "del documento de aduanas"],
      [3, "documentos.makan.fecha", m.fecha, "del control de Makan"],
      [4, "documentos.banco.fecha", b.fecha, "de la nota de débito"],
    ];
    fechas.forEach(([doc, campo, f, quien]) => {
      if (!lleno(f)) return;
      if (!esFecha(f)) add("fecha_mala:" + campo, "error", doc, campo, `La fecha ${quien} no es válida.`);
      else if (f > hoy) add("fecha_futura:" + campo, "error", doc, campo, `La fecha ${quien} es posterior a hoy (${fdate(hoy)}).`);
    });
    const antes = (a, b2) => esFecha(a) && esFecha(b2) && a > b2;
    if (antes(e.fecha, t.fecha_guia)) add("orden_ebay_guia", "aviso", 1, "documentos.ebay.fecha", "El pedido de eBay es posterior a la fecha de la guía.");
    if (antes(t.fecha_guia, t.fecha)) add("orden_guia_factura", "aviso", 2, "documentos.tacsa.fecha_guia", "La guía es posterior a la factura de TACSA.");
    if (antes(ca.fecha_documento, t.fecha)) add("orden_aduana_factura", "aviso", 2, "documentos.tacsa.cuenta_ajena.fecha_documento", "El documento de aduanas es posterior a la factura.");
    if (esFecha(b.fecha) && esFecha(t.fecha) && b.fecha < t.fecha)
      add("pago_antes_factura", exp.vinculo_banco_confirmado ? "error" : "aviso", 4, "documentos.banco.fecha", "El pago es anterior a la factura de TACSA, por lo que no puede ser de esta factura.");

    // --- Importes ---
    [["subtotal", "El subtotal"], ["envio", "El envío"], ["impuesto", "El impuesto"]].forEach(([k, n]) => {
      if (num(e[k]) < 0) add("neg:" + k, "error", 1, "documentos.ebay." + k, `${n} del pedido no puede ser negativo.`);
    });
    if (num(e.descuento) > 0) add("descuento_signo", "aviso", 1, "documentos.ebay.descuento", "El descuento va en negativo (por ejemplo −1.20).");
    if (num(e.subtotal) === 0 && num(e.total_documento) > 0) add("subtotal_cero", "aviso", 1, "documentos.ebay.subtotal", "Hay total del pedido pero el subtotal está en cero.");
    t.cargos.forEach((c, i) => {
      const base = "documentos.tacsa.cargos." + i;
      if (lleno(c.concepto) && num(c.monto) === 0) add("cargo_cero:" + i, "aviso", 2, base + ".monto", `El cargo «${c.concepto}» está en cero.`);
      if (!lleno(c.concepto) && num(c.monto) > 0) add("cargo_sin_nombre:" + i, "aviso", 2, base + ".concepto", "Hay un monto sin concepto.");
    });
    if (num(t.bultos) <= 0 && lleno(t.guia)) add("bultos_cero", "aviso", 2, "documentos.tacsa.bultos", "La factura no tiene bultos.");
    if (num(t.peso) <= 0 && lleno(t.guia)) add("peso_cero", "aviso", 2, "documentos.tacsa.peso", "La factura no tiene peso; el flete se cobra por peso.");
    const cred = num(t.credito_dias);
    if (cred <= 0) add("credito_cero", "aviso", 2, "documentos.tacsa.credito_dias", "Sin días de crédito no se puede calcular el vencimiento.");
    else if (cred > 60) add("credito_largo", "aviso", 2, "documentos.tacsa.credito_dias", `${dias(cred)} de crédito es más de lo habitual. Revisa la factura.`);
    else if (!Number.isInteger(cred)) add("credito_decimal", "aviso", 2, "documentos.tacsa.credito_dias", "Los días de crédito deben ser un número entero.");
    if (v.cif > 0 && num(ca.iva_dai) === 0) add("iva_cero", "aviso", 2, "documentos.tacsa.cuenta_ajena.iva_dai", "Hay valor CIF pero TACSA no cobró IVA de importación.");
    if (v.cif > 0 && v.mercaderiaQ > 0) {
      const dif = (v.cif - v.mercaderiaQ) / v.mercaderiaQ * 100;
      if (Math.abs(dif) > 15) add("cif_distinto", "aviso", 2, "documentos.tacsa.cuenta_ajena.cif", `El CIF declarado difiere ${nf(Math.abs(dif), 1)}% de la mercadería al tipo de cambio aplicado. Revisa el CIF o el tipo de cambio.`);
    }
    if (v.coefGastos > 40) add("gastos_altos", "aviso", 2, null, `Los gastos de TACSA son ${nf(v.coefGastos, 1)}% de la mercadería, más de lo habitual.`);
    if (exp.vinculo_banco_confirmado && num(b.monto) <= 0) add("banco_cero", "error", 4, "documentos.banco.monto", "El pago está confirmado pero la nota de débito no tiene monto.");
    if (exp.vinculo_banco_confirmado && !esFecha(b.fecha)) add("banco_sin_fecha", "error", 4, "documentos.banco.fecha", "El pago está confirmado pero la nota de débito no tiene fecha.");

    // --- Tipo de cambio ---
    if (exp.tc_modo === "manual") {
      if (num(exp.tipo_cambio) <= 0) add("tc_manual_cero", "error", 0, "tipo_cambio", "Escribe el tipo de cambio manual.");
      else if (num(ctx.tcAuto) > 0 && Math.abs(num(exp.tipo_cambio) - num(ctx.tcAuto)) / num(ctx.tcAuto) > 0.03)
        add("tc_manual_lejos", "aviso", 0, "tipo_cambio", `El tipo de cambio manual difiere más de 3% del Banguat (${ftc(ctx.tcAuto)}).`);
    }
    if (v.tc > 0 && (v.tc < 5 || v.tc > 12)) add("tc_rango", "aviso", 0, null, `${ftc(v.tc)} está fuera del rango habitual del dólar (Q5 a Q12).`);

    // --- DAI ---
    if (exp.dai_modo === "partida") {
      if (!lleno(exp.partida)) add("partida_vacia", "aviso", 0, "partida", "Escribe la partida arancelaria o cambia el modo del DAI.");
      else if (!v.arancel) add("partida_no_tabla", "aviso", 0, "partida", "Esa partida no está en la tabla de aranceles. Agrégala o usa otro modo.");
      else if (v.cif > 0 && Math.abs(num(v.arancel.dai) - v.daiDeducidoPct) > 0.15)
        add("partida_vs_factura", "aviso", 0, "partida", `La partida indica DAI de ${v.arancel.dai}% pero la factura de TACSA implica ${nf(v.daiDeducidoPct)}%. Confírmalo con el agente aduanero.`);
    }
    if (exp.dai_modo === "manual" && (num(exp.dai_pct) < 0 || num(exp.dai_pct) > 20)) add("dai_manual_rango", "aviso", 0, "dai_pct", "El DAI normalmente va de 0 a 20%.");

    // --- Formatos ---
    if (lleno(e.pedido) && !/^\d{2}-\d{5}-\d{5}$/.test(String(e.pedido).trim())) add("fmt_pedido", "aviso", 1, "documentos.ebay.pedido", "El número de pedido de eBay suele tener el formato 00-00000-00000.");
    if (lleno(exp.guia) && !/^\d+$/.test(String(exp.guia).trim())) add("fmt_guia", "aviso", 0, null, "La guía de TACSA suele ser solo números.");
    if (lleno(t.numero) && !/^\d+$/.test(String(t.numero).trim())) add("fmt_factura", "aviso", 2, "documentos.tacsa.numero", "El número de factura suele ser solo números.");
    if (lleno(b.cuenta) && !/^[\d-]{6,}$/.test(String(b.cuenta).trim())) add("fmt_cuenta", "aviso", 4, "documentos.banco.cuenta", "La cuenta debe llevar solo números y guiones.");

    // --- Duplicados contra otras guías ---
    (ctx.otros || []).forEach((o) => {
      const od = o.documentos || {};
      const dup = (id, doc, campo, valor, otro, que) => { if (lleno(valor) && lleno(otro) && String(valor).trim() === String(otro).trim()) add(id + ":" + o.id, "error", doc, campo, `${que} ya está registrada en la guía ${o.guia}.`); };
      if (od.tacsa) dup("dup_factura", 2, "documentos.tacsa.numero", t.numero, od.tacsa.numero, "La factura de TACSA");
      if (od.makan) dup("dup_control", 3, "documentos.makan.numero", m.numero, od.makan.numero, "El control de Makan");
      if (od.banco) dup("dup_nota", 4, "documentos.banco.numero", b.numero, od.banco.numero, "La nota de débito");
      if (od.ebay) dup("dup_pedido", 1, "documentos.ebay.pedido", e.pedido, od.ebay.pedido, "El pedido de eBay");
    });

    // --- Plazos de pago ---
    if (!exp.vinculo_banco_confirmado && v.vencimiento && esFecha(hoy)) {
      const falta = diasEntre(hoy, v.vencimiento);
      if (falta < 0) add("vencida", "aviso", 2, null, `La factura de TACSA venció hace ${dias(-falta)} y no tiene pago confirmado.`);
      else if (falta <= 2) add("vence_pronto", "aviso", 2, null, falta === 0 ? "La factura de TACSA vence hoy." : `La factura de TACSA vence en ${dias(falta)}.`);
    }

    out.sort((x, y) => (x.nivel === y.nivel ? 0 : x.nivel === "error" ? -1 : 1));
    return out;
  }

  // Libro de compras: una fila por documento de compra, con las columnas del libro contable.
  function libroCompras(exp, v) {
    const d = exp.documentos;
    const e = d.ebay, t = d.tacsa;
    const pagada = !!exp.vinculo_banco_confirmado;
    const rev = (exp.revision && exp.revision.estado) || "Pendiente";
    return [
      {
        n: 1, fecha: e.fecha || null, tipo: "Importación", condicion: "Contado", vence: null, origen: "PayPal (eBay)",
        docTipo: "Invoice exterior", doc: e.pedido, proveedor: "eBay · " + e.vendedor, moneda: "USD",
        montoOrig: v.ebayTotal, tc: v.tc, valorQ: v.mercaderiaQ, dai: null, iva: null, total: v.mercaderiaQ,
        revision: rev, pago: "Pagado",
      },
      {
        n: 2, fecha: t.fecha, tipo: "Importación", condicion: "Crédito " + num(t.credito_dias) + " días",
        vence: v.vencimiento, origen: pagada ? "Banco / Transferencia" : "Por pagar (crédito)",
        docTipo: "Factura cambiaria FEL", doc: t.serie + " · " + t.numero, proveedor: "TACSA", moneda: "GTQ",
        montoOrig: num(t.total_cobro), tc: 1, valorQ: v.cif, dai: v.dai, iva: v.iva, total: num(t.total_cobro),
        revision: rev, pago: pagada ? "Pagado" : "Pendiente",
      },
    ];
  }

  // Partida contable sugerida (partida doble) para el expediente.
  function asiento(exp, v) {
    const pagada = !!exp.vinculo_banco_confirmado;
    const lineas = [
      { clave: "inventario", cuenta: "Inventario de repuestos", debe: v.costoPuesto, haber: 0,
        nota: "Mercadería + gastos de TACSA + DAI" },
      { clave: "iva", cuenta: "IVA crédito fiscal (importaciones)", debe: v.iva, haber: 0,
        nota: "12% sobre CIF + DAI" },
      pagada
        ? { clave: "bancos", cuenta: "Bancos", debe: 0, haber: num(exp.documentos.tacsa.total_cobro),
            nota: "Pago a TACSA con la nota de débito " + exp.documentos.banco.numero }
        : { clave: "proveedores", cuenta: "Proveedores (TACSA)", debe: 0, haber: num(exp.documentos.tacsa.total_cobro),
            nota: "Factura " + exp.documentos.tacsa.numero + " por pagar" },
      { clave: "paypal", cuenta: "PayPal / tarjeta (eBay)", debe: 0, haber: v.mercaderiaQ,
        nota: fu(v.ebayTotal) + " al tipo de cambio aplicado" },
    ].map((l) => ({ ...l, debe: r2(l.debe), haber: r2(l.haber) }));
    const totalDebe = r2(lineas.reduce((s, l) => s + l.debe, 0));
    const totalHaber = r2(lineas.reduce((s, l) => s + l.haber, 0));
    return { lineas, totalDebe, totalHaber, cuadra: cuadra(totalDebe, totalHaber), diferencia: r2(totalDebe - totalHaber) };
  }

  // Cuentas por pagar: estado de la factura de TACSA a la fecha de hoy.
  function cuentasPorPagar(exp, v, hoy) {
    const t = exp.documentos.tacsa;
    const pagada = !!exp.vinculo_banco_confirmado;
    let estado = "Pendiente";
    let tono = "pendiente";
    let dias = null;
    if (pagada) {
      estado = "Pagada";
      tono = "ok";
    } else if (v.vencimiento && esFecha(hoy)) {
      dias = diasEntre(hoy, v.vencimiento);
      if (dias < 0) { estado = `Vencida hace ${diasTxt(-dias)}`; tono = "alerta"; }
      else if (dias === 0) { estado = "Vence hoy"; tono = "pendiente"; }
      else { estado = `Vigente, vence en ${diasTxt(dias)}`; tono = "ok"; }
    }
    return {
      filas: [{ proveedor: "TACSA", doc: t.serie + " · " + t.numero, fecha: t.fecha, vence: v.vencimiento,
                monto: num(t.total_cobro), estado, tono, dias }],
      pendiente: pagada ? 0 : num(t.total_cobro),
    };
  }

  function aCSV(exp, v) {
    const filas = [
      ["Expediente", "Guía " + exp.guia],
      ["Descripción", exp.titulo],
      [],
      ["Costeo", "Valor"],
      ["Pedido eBay (US$)", v.ebayTotal],
      ["Tipo de cambio", v.tc],
      ["Origen del tipo de cambio", v.tcOrigen],
      ["Mercadería (Q)", v.mercaderiaQ],
      ["Gastos TACSA (Q)", v.cargos],
      ["DAI (%)", v.daiPct],
      ["Origen del DAI", v.daiOrigen],
      ["DAI (Q)", v.dai],
      ["Costo puesto sin IVA (Q)", v.costoPuesto],
      ["IVA de importación (Q)", v.iva],
      ["Coeficiente de gastos (%)", v.coefGastos],
      [],
      ["Verificación", "Estado", "Detalle"],
      ...v.verificaciones.map((x) => [x.titulo, x.estado, x.detalle]),
    ];
    const celda = (c) => '"' + String(c === undefined || c === null ? "" : c).replace(/"/g, '""') + '"';
    return "﻿" + filas.map((f) => f.map(celda).join(",")).join("\r\n");
  }

  const api = {
    calcular, avisos, sanear, libroCompras, asiento, cuentasPorPagar, buscarArancel, aCSV,
    nf, fq, fu, ftc, parseMonto, normalizar, titulo, limpiar, dias, fpct, fdate, fdateVacio, parseFecha, esFecha, r2, num, hoyISO, diasEntre, TASAS_DAI,
  };
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.Calc = api;
})(typeof window !== "undefined" ? window : this);
