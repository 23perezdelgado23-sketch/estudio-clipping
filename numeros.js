"use strict";
// Números: todo sale de lo que apuntas (vistas de cada clip, seguidores, cobros) y de las condiciones de tus campañas.
// Cada vez que actualizas las vistas de un clip se guarda un punto con la fecha: así se sabe cuántas vistas y euros ganas cada día.

let tabNumeros = "actualizar";
let periodoNumeros = "30";

// ---------- Historial ----------
// Guarda las vistas de hoy del clip (un punto por día; si ya hay uno de hoy, lo sustituye)
function registrarVistas(clip, vistas) {
  const v = n(vistas);
  clip.historial ||= [];
  const hoy = hoyISO();
  const ult = clip.historial[clip.historial.length - 1];
  if (ult && ult.f === hoy) ult.v = v;
  else if (!ult || ult.v !== v) clip.historial.push({ f: hoy, v });
}
function registrarSeguidores(a, seg) {
  const v = n(seg);
  a.historialSeg ||= [];
  const hoy = hoyISO();
  const ult = a.historialSeg[a.historialSeg.length - 1];
  if (ult && ult.f === hoy) ult.n = v;
  else if (!ult || ult.n !== v) a.historialSeg.push({ f: hoy, n: v });
}

// Euros de un clip si tuviera estas vistas (mismas reglas que gananciaClip: mínimo, máximo, moneda y comisión)
function gananciaConVistas(clip, vistas) {
  const c = campana(clip.campanaId);
  if (!c) return 0;
  const v = n(vistas);
  if (n(c.minVistas) && v < n(c.minVistas)) return 0;
  let g = (v / 1000) * n(c.cpm);
  if (n(c.maxPorClip)) g = Math.min(g, n(c.maxPorClip));
  if (c.moneda === "USD") g *= cambioUsd() || 1;
  return g * (1 - n(D.ajustes.comision) / 100);
}

// Puntos de vistas de un clip: los apuntados y, si no hay, uno con las vistas actuales en su fecha de publicación
function puntosClip(c) {
  const h = (c.historial || []).filter((p) => p.f);
  if (h.length) return h;
  if (c.fechaPub && n(c.vistas)) return [{ f: c.fechaPub.slice(0, 10), v: n(c.vistas) }];
  return [];
}

// Vistas y euros ganados por cada día (lo que sube entre un punto y el siguiente se cuenta el día del segundo)
function ganadoPorDia() {
  const dias = {};
  D.clips.forEach((c) => {
    if (!CUENTAN_VISTAS.includes(c.estado)) return;
    let antV = 0, antG = 0;
    puntosClip(c).forEach((p) => {
      const g = gananciaConVistas(c, p.v);
      const d = (dias[p.f] ||= { v: 0, g: 0 });
      d.v += Math.max(0, p.v - antV);
      d.g += Math.max(0, g - antG);
      antV = Math.max(antV, p.v);
      antG = Math.max(antG, g);
    });
  });
  return dias;
}

function desdePeriodo(p) {
  const d = new Date(hoyISO());
  if (p === "mes") return hoyISO().slice(0, 8) + "01";
  if (p === "todo") return "0000-00-00";
  d.setDate(d.getDate() - (n(p) - 1));
  return d.toISOString().slice(0, 10);
}

const mediana = (xs) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

// ---------- Vista ----------
function vistaNumeros() {
  const tabs = [
    ["actualizar", "Actualizar vistas"],
    ["resumen", "Resumen"],
    ["rankings", "Qué funciona"],
    ["evolucion", "Evolución"],
    ["informe", "Informe semanal"],
    ["consejos", "✨ Consejos IA"],
    ["exportar", "Exportar"],
  ];
  $("#contenido").innerHTML = `<div class="pestanas">${tabs.map(([id, t]) => `<button class="${id === tabNumeros ? "activo" : ""}" data-tab="${id}">${t}</button>`).join("")}</div><div id="num-cuerpo"></div>`;
  $("#contenido").querySelectorAll("[data-tab]").forEach((b) => (b.onclick = () => ((tabNumeros = b.dataset.tab), vistaNumeros())));
  ({ actualizar: numActualizar, resumen: numResumen, rankings: numRankings, evolucion: numEvolucion, informe: numInforme, consejos: numConsejos, exportar: numExportar })[tabNumeros]();
}

const selectorPeriodo = () =>
  `<div class="filtros"><select id="num-periodo">${opciones(
    [["7", "Últimos 7 días"], ["30", "Últimos 30 días"], ["90", "Últimos 90 días"], ["mes", "Este mes"], ["todo", "Desde el principio"]],
    periodoNumeros
  )}</select></div>`;
const montarPeriodo = () => $("#num-periodo") && ($("#num-periodo").onchange = (e) => ((periodoNumeros = e.target.value), vistaNumeros()));

// 1. Actualización rápida: apuntas las vistas de hoy de cada clip y los seguidores de cada cuenta
function numActualizar() {
  const limite = new Date();
  limite.setDate(limite.getDate() - 60);
  const clips = D.clips
    .filter((c) => CUENTAN_VISTAS.includes(c.estado) && (!c.fechaPub || new Date(c.fechaPub) >= limite))
    .sort((a, b) => (b.fechaPub || "").localeCompare(a.fechaPub || ""));
  const hoy = hoyISO();
  $("#num-cuerpo").innerHTML = `
    <div class="tarjeta" style="margin-bottom:14px">Abre TikTok Studio y copia aquí las vistas que tiene <b>ahora</b> cada clip. La app guarda un punto por día y con eso calcula cuánto ganas cada día, qué clips siguen creciendo y tu ritmo real. Hazlo una vez al día (por ejemplo, por la noche).</div>
    ${
      clips.length
        ? `<table class="tabla-num"><thead><tr><th>Clip</th><th>Cuenta · campaña</th><th class="num">Antes</th><th class="num">Vistas ahora</th><th class="num">Estimado</th></tr></thead><tbody>
      ${clips
        .map((c) => {
          const h = c.historial || [];
          const ult = h[h.length - 1];
          const hecho = ult && ult.f === hoy;
          const c0 = campana(c.campanaId);
          const minimo = n(c0?.minVistas);
          return `<tr><td><b>${esc(c.titulo)}</b><div class="peq">${c.fechaPub ? "Publicado " + fechaCorta(c.fechaPub) : ""}${hecho ? " · ✓ hoy" : ""}</div></td>
          <td class="peq">${esc(cuenta(c.cuentaId)?.usuario || "—")}<br>${esc(c0?.nombre || "Sin campaña")}</td>
          <td class="num">${fmtNum(c.vistas)}${minimo && n(c.vistas) < minimo ? `<div class="peq" style="color:var(--ambar)">faltan ${fmtCorto(minimo - n(c.vistas))} para cobrar</div>` : ""}</td>
          <td class="num"><input class="num-in" type="number" min="0" inputmode="numeric" data-clip="${c.id}" placeholder="${esc(c.vistas || 0)}" /></td>
          <td class="num">${fmtEur(gananciaClip(c))}</td></tr>`;
        })
        .join("")}</tbody></table>`
        : `<div class="vacio">Cuando tengas clips publicados (estado Publicado, Enviado o Aprobado), aparecerán aquí para apuntar sus vistas.</div>`
    }
    ${
      D.cuentas.length
        ? `<h2>Seguidores de cada cuenta</h2><table class="tabla-num"><thead><tr><th>Cuenta</th><th class="num">Antes</th><th class="num">Seguidores ahora</th></tr></thead><tbody>
      ${D.cuentas.map((a) => `<tr><td><b>${esc(a.usuario)}</b><div class="peq">${esc(a.nicho || "")}</div></td><td class="num">${fmtNum(a.seguidores)}</td><td class="num"><input class="num-in" type="number" min="0" inputmode="numeric" data-cuenta="${a.id}" placeholder="${esc(a.seguidores || 0)}" /></td></tr>`).join("")}
      </tbody></table>`
        : ""
    }
    <div style="margin-top:16px"><button class="btn prim" id="num-guardar">Guardar lo apuntado</button></div>`;
  $("#num-guardar").onclick = () => {
    let cambios = 0;
    $("#num-cuerpo").querySelectorAll("[data-clip]").forEach((i) => {
      if (i.value === "") return;
      const c = D.clips.find((x) => x.id === i.dataset.clip);
      c.vistas = n(i.value);
      registrarVistas(c, c.vistas);
      cambios++;
    });
    $("#num-cuerpo").querySelectorAll("[data-cuenta]").forEach((i) => {
      if (i.value === "") return;
      const a = cuenta(i.dataset.cuenta);
      a.seguidores = n(i.value);
      registrarSeguidores(a, a.seguidores);
      cambios++;
    });
    if (!cambios) return aviso("No has apuntado nada nuevo");
    guardar();
    aviso(`Guardado: ${cambios} dato(s) de hoy`);
    vistaNumeros();
  };
}

// 2. Resumen del periodo
function numResumen() {
  const desde = desdePeriodo(periodoNumeros);
  const dias = ganadoPorDia();
  const enPeriodo = Object.entries(dias).filter(([f]) => f >= desde);
  const vistasP = enPeriodo.reduce((s, [, d]) => s + d.v, 0);
  const ganadoP = enPeriodo.reduce((s, [, d]) => s + d.g, 0);
  const pubs = D.clips.filter((c) => CUENTAN_VISTAS.includes(c.estado) && (c.fechaPub || "").slice(0, 10) >= desde);
  const vistasClips = pubs.map((c) => n(c.vistas));
  const conMinimo = pubs.filter((c) => n(campana(c.campanaId)?.minVistas));
  const superan = conMinimo.filter((c) => n(c.vistas) >= n(campana(c.campanaId).minVistas));
  const conInteraccion = pubs.filter((c) => n(c.vistas) && (n(c.likes) || n(c.comentarios) || n(c.compartidos)));
  const engagement = conInteraccion.length
    ? conInteraccion.reduce((s, c) => s + (n(c.likes) + n(c.comentarios) + n(c.compartidos)) / n(c.vistas), 0) / conInteraccion.length
    : null;
  const minutos = pubs.reduce((s, c) => s + n(c.minutos), 0);
  const ganadoPubs = pubs.reduce((s, c) => s + gananciaClip(c), 0);
  const cobrado = D.cobros.filter((p) => p.estado === "cobrado").reduce((s, p) => s + aEur(p.importe, p.moneda), 0);
  const total = D.clips.reduce((s, c) => s + gananciaClip(c), 0);
  // Proyección del mes: lo ganado este mes al mismo ritmo diario hasta fin de mes
  const hoy = new Date(hoyISO());
  const diaMes = hoy.getDate();
  const diasMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate();
  const ganadoMes = Object.entries(dias).filter(([f]) => f >= desdePeriodo("mes")).reduce((s, [, d]) => s + d.g, 0);
  const proyeccion = diaMes >= 3 ? (ganadoMes / diaMes) * diasMes : null;
  const sinHistorial = D.clips.filter((c) => CUENTAN_VISTAS.includes(c.estado) && !(c.historial || []).length).length;
  $("#num-cuerpo").innerHTML = `${selectorPeriodo()}
    <div class="rejilla kpis">
      <div class="kpi"><div class="et">Vistas ganadas</div><div class="val">${fmtCorto(vistasP)}</div><div class="nota">en el periodo</div></div>
      <div class="kpi"><div class="et">Ganado (estimado)</div><div class="val">${fmtEur(ganadoP)}</div><div class="nota">según las tarifas de tus campañas</div></div>
      <div class="kpi"><div class="et">€ por 1.000 vistas</div><div class="val">${vistasP ? fmtEur((ganadoP / vistasP) * 1000) : "—"}</div><div class="nota">lo que te rinde de verdad cada 1.000 vistas</div></div>
      <div class="kpi"><div class="et">Clips publicados</div><div class="val">${pubs.length}</div><div class="nota">media ${fmtCorto(pubs.length ? vistasClips.reduce((a, b) => a + b, 0) / pubs.length : 0)} · mediana ${fmtCorto(mediana(vistasClips))} vistas</div></div>
      <div class="kpi"><div class="et">Llegan al mínimo de cobro</div><div class="val">${conMinimo.length ? Math.round((superan.length / conMinimo.length) * 100) + " %" : "—"}</div><div class="nota">${conMinimo.length ? `${superan.length} de ${conMinimo.length} clips con mínimo` : "ninguna campaña con mínimo"}</div></div>
      <div class="kpi"><div class="et">Interacción media</div><div class="val">${engagement == null ? "—" : (engagement * 100).toFixed(1) + " %"}</div><div class="nota">(me gusta + comentarios + compartidos) / vistas</div></div>
      <div class="kpi"><div class="et">€ por hora de trabajo</div><div class="val">${minutos ? fmtEur(ganadoPubs / (minutos / 60)) : "—"}</div><div class="nota">${minutos ? `${fmtNum(minutos)} min apuntados en estos clips` : "apunta los minutos de edición en cada clip"}</div></div>
      <div class="kpi"><div class="et">Si sigues a este ritmo</div><div class="val">${proyeccion == null ? "—" : fmtEur(proyeccion)}</div><div class="nota">${proyeccion == null ? "a partir del día 3 del mes" : `este mes (llevas ${fmtEur(ganadoMes)})`}</div></div>
    </div>
    <div class="rejilla dos" style="margin-top:14px">
      <div class="tarjeta"><h3 style="margin-top:0">Dinero</h3>
        <div class="fila-num"><span>Estimado total (todos los clips)</span><b>${fmtEur(total)}</b></div>
        <div class="fila-num"><span>Cobrado</span><b>${fmtEur(cobrado)}</b></div>
        <div class="fila-num"><span>Pendiente de cobrar (estimado)</span><b>${fmtEur(Math.max(0, total - cobrado))}</b></div>
      </div>
      <div class="tarjeta"><h3 style="margin-top:0">Cómo se calcula</h3>
        <p class="peq" style="margin:0">Vistas y euros por día salen de lo que apuntas en <b>Actualizar vistas</b>: lo que sube un clip entre dos días se cuenta el segundo. El dinero usa la tarifa, el mínimo y el máximo de cada campaña, tu cambio del dólar y tu comisión (Ajustes). Es una estimación: lo que manda es lo que te paga la plataforma.${sinHistorial ? ` <b>${sinHistorial} clip(s)</b> aún no tienen vistas apuntadas por días: se cuentan enteros en su fecha de publicación.` : ""}</p>
      </div>
    </div>`;
  montarPeriodo();
}

// 3. Qué funciona: rankings por cuenta, campaña, gancho, duración, hora y día
function numRankings() {
  const desde = desdePeriodo(periodoNumeros);
  const pubs = D.clips.filter((c) => CUENTAN_VISTAS.includes(c.estado) && (c.fechaPub || "").slice(0, 10) >= desde);
  const agrupar = (clave) => {
    const g = {};
    pubs.forEach((c) => {
      const k = clave(c);
      if (k == null || k === "") return;
      const x = (g[k] ||= { clips: 0, vistas: 0, euros: 0 });
      x.clips++;
      x.vistas += n(c.vistas);
      x.euros += gananciaClip(c);
    });
    return Object.entries(g).sort((a, b) => b[1].vistas / b[1].clips - a[1].vistas / a[1].clips);
  };
  const tramoDur = (c) => (!n(c.duracion) ? null : n(c.duracion) < 20 ? "Menos de 20 s" : n(c.duracion) < 40 ? "20–39 s" : n(c.duracion) < 60 ? "40–59 s" : "60 s o más");
  const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
  const tabla = (titulo, filas, vacio) =>
    `<h2>${titulo}</h2>${
      filas.length
        ? `<table><thead><tr><th></th><th class="num">Clips</th><th class="num">Vistas de media</th><th class="num">Estimado</th><th class="num">€ por clip</th></tr></thead><tbody>${filas
            .map(([k, x]) => `<tr><td>${esc(k)}</td><td class="num">${x.clips}</td><td class="num">${fmtCorto(x.vistas / x.clips)}</td><td class="num">${fmtEur(x.euros)}</td><td class="num">${fmtEur(x.euros / x.clips)}</td></tr>`)
            .join("")}</tbody></table>`
        : `<p class="peq">${vacio}</p>`
    }`;
  $("#num-cuerpo").innerHTML = `${selectorPeriodo()}
    ${pubs.length < 5 ? `<div class="tarjeta" style="border-color:var(--ambar)">Con ${pubs.length} clip(s) en el periodo, estas tablas son solo una pista. A partir de unos 20 clips por grupo empiezan a ser fiables.</div>` : ""}
    ${tabla("Por cuenta", agrupar((c) => cuenta(c.cuentaId)?.usuario), "Asigna una cuenta a tus clips.")}
    ${tabla("Por campaña", agrupar((c) => campana(c.campanaId)?.nombre), "Asigna una campaña a tus clips.")}
    ${tabla("Por gancho", agrupar((c) => (c.gancho || "").trim()), "Escribe el gancho de cada clip para saber cuál funciona.")}
    ${tabla("Por duración", agrupar(tramoDur), "Apunta la duración de cada clip.")}
    ${tabla("Por hora de publicación", agrupar((c) => ((c.fechaPub || "").length > 10 ? new Date(c.fechaPub).getHours() + ":00" : null)), "Apunta fecha y hora de publicación.")}
    ${tabla("Por día de la semana", agrupar((c) => (c.fechaPub ? DIAS[new Date(c.fechaPub).getDay()] : null)), "Apunta la fecha de publicación.")}`;
  montarPeriodo();
}

// 4. Evolución: vistas y euros por día, por semana y seguidores
function numEvolucion() {
  const dias = ganadoPorDia();
  const ult30 = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(hoyISO());
    d.setDate(d.getDate() - i);
    const k = d.toISOString().slice(0, 10);
    ult30.push({ k, et: d.getDate(), ...(dias[k] || { v: 0, g: 0 }) });
  }
  const maxV = Math.max(1, ...ult30.map((d) => d.v));
  const maxG = Math.max(0.01, ...ult30.map((d) => d.g));
  // Acumulado de euros (todos los días)
  let acum = 0;
  const acumulado = ult30.map((d) => (acum += d.g));
  const seg = D.cuentas.filter((a) => (a.historialSeg || []).length);
  $("#num-cuerpo").innerHTML = `
    <div class="tarjeta"><h3 style="margin-top:0">Vistas ganadas cada día · 30 días</h3>
      <div class="barras">${ult30.map((d) => `<div class="b" style="height:${(d.v / maxV) * 100}%" data-t="${fechaCorta(d.k)} · ${fmtNum(d.v)} vistas"></div>`).join("")}</div>
      <div class="ejes">${ult30.map((d, i) => `<span>${i % 5 === 0 ? d.et : ""}</span>`).join("")}</div></div>
    <div class="tarjeta" style="margin-top:14px"><h3 style="margin-top:0">Euros ganados cada día (estimado) · 30 días · total ${fmtEur(acumulado[acumulado.length - 1])}</h3>
      <div class="barras">${ult30.map((d) => `<div class="b verdes" style="height:${(d.g / maxG) * 100}%" data-t="${fechaCorta(d.k)} · ${fmtEur(d.g)}"></div>`).join("")}</div>
      <div class="ejes">${ult30.map((d, i) => `<span>${i % 5 === 0 ? d.et : ""}</span>`).join("")}</div></div>
    <h2>Seguidores</h2>
    ${
      seg.length
        ? `<div class="rejilla dos">${seg
            .map((a) => {
              const h = a.historialSeg.slice(-30);
              const max = Math.max(1, ...h.map((p) => p.n));
              const crec = h.length > 1 ? h[h.length - 1].n - h[0].n : 0;
              return `<div class="tarjeta"><b>${esc(a.usuario)}</b> <span class="peq">· ${fmtNum(h[h.length - 1].n)} seguidores${h.length > 1 ? ` · ${crec >= 0 ? "+" : ""}${fmtNum(crec)} desde ${fechaCorta(h[0].f)}` : ""}</span>
              <div class="barras" style="height:90px">${h.map((p) => `<div class="b" style="height:${(p.n / max) * 100}%" data-t="${fechaCorta(p.f)} · ${fmtNum(p.n)}"></div>`).join("")}</div></div>`;
            })
            .join("")}</div>`
        : `<p class="peq">Apunta los seguidores de cada cuenta en <b>Actualizar vistas</b> y aquí verás cómo crecen.</p>`
    }`;
}

// 5. Consejos de la IA sobre tus propios números
function numConsejos() {
  $("#num-cuerpo").innerHTML = `<div class="tarjeta">La IA estudia tus clips publicados (cuenta, campaña, gancho, duración, hora, interacción y minutos de edición) y te dice qué funciona, qué no y qué hacer esta semana. Solo usa tus datos.</div>
    <button class="btn prim" id="num-ia" style="margin-top:12px">✨ Analizar mis números</button><div id="num-ia-res" style="margin-top:12px"></div>`;
  $("#num-ia").onclick = () => ia.consejos($("#num-ia-res"));
}

// Informe semanal: lo prepara el servidor cada lunes con la IA (con tus datos reales) y te avisa al móvil
let informeElegido = "";
async function numInforme() {
  const cuerpo = $("#num-cuerpo");
  if (!window.nube || !nube.correo())
    return (cuerpo.innerHTML = `<div class="tarjeta">El informe semanal lo prepara el servidor cada lunes. Entra con tu cuenta en <b>Ajustes → Sincronización</b> para verlo.</div>`);
  cuerpo.innerHTML = `<p class="peq">Cargando informes…</p>`;
  let lista = [];
  try {
    lista = await nube.informes();
  } catch (e) {
    return (cuerpo.innerHTML = `<div class="tarjeta">No se han podido cargar: ${esc(e.message)}</div>`);
  }
  const fecha = (f) => new Date(f + "T12:00").toLocaleDateString("es-ES", { day: "numeric", month: "long" });
  const inf = lista.find((x) => x.semana === informeElegido) || lista[0];
  const c = inf?.contenido;
  const col = { alta: "rosa", media: "ambar", baja: "" };
  cuerpo.innerHTML = `
    <div class="tarjeta">Cada <b>lunes por la mañana</b> el servidor estudia con IA tu semana anterior (cuentas, clips, vistas, seguidores, campañas, cobros y lo que hizo el piloto automático) y te avisa al móvil. Solo usa tus datos: lo que falta, lo dice.
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">
        ${lista.length > 1 ? `<select id="inf-semana">${lista.map((x) => `<option value="${x.semana}" ${x === inf ? "selected" : ""}>Semana del ${fecha(x.semana)}</option>`).join("")}</select>` : ""}
        <button class="btn" id="inf-ya">Prepararlo ahora</button>
      </div>
    </div>
    ${
      !c
        ? `<div class="vacio" style="margin-top:14px">Aún no hay informes. El primero llegará el lunes, o pulsa <b>Prepararlo ahora</b>.</div>`
        : `<div class="tarjeta ia-res" style="margin-top:14px">
        <div class="peq">Semana del ${fecha(c.semana.desde)} al ${fecha(c.semana.hasta)}</div>
        <h2 style="margin:6px 0 10px">${esc(c.titular)}</h2>
        <p>${esc(c.resumen)}</p>
        ${c.cifras.length ? `<div class="rejilla kpis" style="margin:12px 0">${c.cifras.map((x) => `<div class="kpi"><div class="et">${esc(x.dato)}</div><div class="val" style="font-size:20px">${esc(x.valor)}</div></div>`).join("")}</div>` : ""}
        <div class="rejilla dos"><div><b>Va bien</b><ul>${c.bien.map((x) => `<li>${esc(x)}</li>`).join("") || "<li>—</li>"}</ul></div><div><b>A mejorar</b><ul>${c.mejorar.map((x) => `<li>${esc(x)}</li>`).join("") || "<li>—</li>"}</ul></div></div>
        <b>Esta semana</b>${c.acciones.map((a) => `<div class="ia-item"><span class="chip ${col[a.prioridad] || ""}">${esc(a.prioridad)}</span><div style="flex:1"><b>${esc(a.accion)}</b><div class="peq">${esc(a.por_que)}</div></div></div>`).join("")}
        ${c.faltan_datos.length ? `<details class="plegable"><summary>Datos que le faltaban a la IA</summary><ul class="peq">${c.faltan_datos.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></details>` : ""}
        <p class="peq" style="margin-top:8px">✨ ${esc(inf.modelo || "")}${inf.coste_usd != null ? ` · coste ≈ ${Number(inf.coste_usd) < 0.01 ? "menos de 1 céntimo" : Number(inf.coste_usd).toFixed(2) + " $"}` : ""} · preparado el ${new Date(inf.creado).toLocaleString("es-ES", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}. Revisa siempre lo que propone.</p>
      </div>`
    }`;
  $("#inf-semana") && ($("#inf-semana").onchange = (e) => ((informeElegido = e.target.value), numInforme()));
  $("#inf-ya").onclick = async () => {
    $("#inf-ya").disabled = true;
    $("#inf-ya").textContent = "Preparando (unos 30 segundos)…";
    try {
      await nube.funcion("radar", { informe: true });
      informeElegido = "";
      aviso("Informe preparado");
    } catch (e) {
      aviso("No se ha podido preparar: " + e.message);
    }
    if (tabNumeros === "informe" && seccion === "numeros") numInforme();
  };
}

// 6. Exportar a CSV (se abre en Excel o Numbers)
function csv(filas) {
  return "﻿" + filas.map((f) => f.map((x) => `"${String(x ?? "").replace(/"/g, '""')}"`).join(";")).join("\n");
}
function numExportar() {
  $("#num-cuerpo").innerHTML = `
    <div class="tarjeta">Descarga tus datos en hojas de cálculo (CSV, separado por punto y coma: se abre en Excel, Numbers o Google Sheets).</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px">
      <button class="btn" id="csv-clips">Clips</button>
      <button class="btn" id="csv-dias">Vistas y euros por día</button>
      <button class="btn" id="csv-cobros">Cobros</button>
      <button class="btn" id="csv-campanas">Campañas</button>
    </div>`;
  const bajar = (nombre, texto) => window.estudio.guardarArchivo(nombre, texto).then((ok) => ok && aviso("Exportado"));
  $("#csv-clips").onclick = () =>
    bajar(
      `clips-${hoyISO()}.csv`,
      csv([
        ["Título", "Estado", "Cuenta", "Campaña", "Publicado", "Duración (s)", "Gancho", "Vistas", "Me gusta", "Comentarios", "Compartidos", "Minutos de edición", "Estimado (€)", "Enlace"],
        ...D.clips.map((c) => [c.titulo, c.estado, cuenta(c.cuentaId)?.usuario, campana(c.campanaId)?.nombre, c.fechaPub, c.duracion, c.gancho, c.vistas, c.likes, c.comentarios, c.compartidos, c.minutos, gananciaClip(c).toFixed(2).replace(".", ","), c.enlace]),
      ])
    );
  $("#csv-dias").onclick = () =>
    bajar(`dias-${hoyISO()}.csv`, csv([["Fecha", "Vistas ganadas", "Euros (estimado)"], ...Object.entries(ganadoPorDia()).sort().map(([f, d]) => [f, Math.round(d.v), d.g.toFixed(2).replace(".", ",")])]));
  $("#csv-cobros").onclick = () =>
    bajar(`cobros-${hoyISO()}.csv`, csv([["Fecha", "Campaña", "Plataforma", "Importe", "Moneda", "Estado", "Notas"], ...D.cobros.map((p) => [p.fecha, campana(p.campanaId)?.nombre, p.plataforma, p.importe, p.moneda, p.estado, p.notas])]));
  $("#csv-campanas").onclick = () =>
    bajar(
      `campanas-${hoyISO()}.csv`,
      csv([["Campaña", "Plataforma", "Creador", "Tarifa/1.000", "Moneda", "Presupuesto", "% gastado", "Mín. vistas", "Máx. por clip", "Estado", "Enlace"], ...D.campanas.map((c) => [c.nombre, c.plataforma, c.creador, c.cpm, c.moneda, c.presupuesto, c.gastadoPct, c.minVistas, c.maxPorClip, c.estado, c.enlace])])
    );
}
