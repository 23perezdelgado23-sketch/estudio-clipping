"use strict";
// Radar de campañas: las campañas reales de Whop y Vyro (sus listados públicos), puntuadas para tus cuentas.
// Se actualiza desde la app del Mac (el iPhone no puede leer esos listados) y llega al iPhone con la sincronización.

const RADAR_MAX = 120; // campañas guardadas (todas las del idioma elegido y las mejores del resto)
const RADAR_HORAS = 6; // el Mac la actualiza solo si la última lectura tiene más de 6 horas
const IDIOMAS = { es: "Español", en: "Inglés", pt: "Portugués", fr: "Francés", it: "Italiano", de: "Alemán", nl: "Neerlandés" };
const RIESGO = /gambl|casino|betting|apuesta|\bbet\b|crypto|cripto|forex|onlyfans/i;

// Palabras que relacionan un nicho con una campaña (se suman a las «palabras clave» de cada cuenta)
const NICHO_CLAVES = [
  [/negocio|emprend|empresa|business/i, ["business", "negocio", "emprend", "entrepreneur", "ceo", "founder", "fundador", "empresa", "marketing", "ventas", "sales", "coaching", "network marketing"]],
  [/dinero|finan|invers|trading|bolsa/i, ["finance", "financ", "dinero", "money", "invers", "invest", "trading", "trader", "wealth", "bolsa", "mentalidad"]],
  [/p[óo]dcast/i, ["podcast", "pódcast", "episodio", "episode"]],
  [/stream|directo|twitch|kick|irl/i, ["stream", "kick", "twitch", "directo", "just chatting", "irl", "livestream"]],
  [/humor|comedia|risa|comedy/i, ["comedy", "comedia", "humor", "funny", "gracios", "risa", "sketch", "prank", "stand-up", "standup"]],
  [/entrevista|true crime|crimen|historia|aventura/i, ["interview", "entrevista", "true crime", "crimen", "crime", "historia", "story", "storytime", "documental", "aventura", "viaj", "travel", "sobreviv", "reto", "challenge", "vlog"]],
  [/marca personal|personal brand|lifestyle|estilo de vida/i, ["personal brand", "marca personal", "lifestyle", "estilo de vida", "motivaci"]],
  [/tendencia|m[úu]sica|meme/i, ["song", "canción", "cancion", "música", "musica", "music", "sound", "trend", "tendencia", "meme"]],
  [/gaming|videojuego|juego/i, ["gaming", "game", "videojuego", "juego", "fortnite", "valorant", "minecraft"]],
  [/fitness|gym|deporte|salud/i, ["fitness", "gym", "workout", "entren", "salud", "health", "sport", "deporte"]],
];

let radarFiltro = { texto: "", idioma: "", plat: "", cuenta: "", soloJoyas: false, orden: "puntos" };
let radarLeyendo = false;

const radar = () => (D.radar ||= { actualizado: "", items: [], vistos: {}, errores: [] });
const idiomaObjetivo = () => D.ajustes.idiomaRadar || "es";

function clavesCuenta(a) {
  const propias = (a.claves || "").split(",").map((x) => x.trim().toLowerCase()).filter(Boolean);
  const auto = NICHO_CLAVES.filter(([rx]) => rx.test(a.nicho || "")).flatMap(([, k]) => k);
  return [...new Set([...propias, ...auto])];
}

function textoCampana(c) {
  return `${c.nombre} ${c.org} ${c.desc} ${(c.cats || []).join(" ")}`.toLowerCase();
}

// Cuántas palabras del nicho de la cuenta aparecen en la campaña
function encaje(c, a) {
  const t = textoCampana(c);
  return clavesCuenta(a).filter((k) => t.includes(k)).length;
}

const diasHasta = (f) => (f ? Math.ceil((new Date(f) - new Date(hoyISO())) / 864e5) : null);

// Puntuación de 0 a 100 con sus motivos. Todo sale de los datos de la campaña; nada es inventado.
function puntuar(c, cuentaObj) {
  const motivos = [];
  let p = 0;
  if (c.idioma === idiomaObjetivo()) (p += 30), motivos.push(`En ${IDIOMAS[c.idioma] || c.idioma}`);
  p += Math.min(1, c.tarifa / 3) * 20;
  if (c.tarifa >= 1.5) motivos.push(`Paga ${c.tarifa.toFixed(2)} $/1.000`);
  const porClipper = c.clippers == null ? c.restante / 10 : c.restante / (c.clippers + 1);
  p += Math.min(1, porClipper / 300) * 15;
  if (c.clippers != null && c.clippers <= 10) motivos.push(c.clippers ? `Solo ${c.clippers} clippers` : "Nadie trabaja en ella aún");
  if (c.minVistas && c.minVistas <= 1000) (p += 10), motivos.push("Cobras desde ~1.000 vistas");
  else if (c.minVistas <= 5000) p += 6;
  else if (c.minVistas <= 10000) p += 3;
  const d = diasHasta(c.fin);
  if (d == null) p += 6;
  else if (d >= 14) p += 10;
  else if (d >= 7) p += 6;
  else if (d >= 3) p += 3;
  if (!c.solicitud) p += 5;
  if (c.bloqueada) p -= 20;
  const v = veredicto(c);
  if (v.tipo === "si") (p += 10), motivos.push("Sus clips están cobrando");
  if (v.tipo === "no") (p -= 25), motivos.push("Los datos dicen que no renta");
  if (cuentaObj && encaje(c, cuentaObj)) (p += 10), motivos.push(`Encaja con ${cuentaObj.usuario}`);
  return { puntos: Math.max(0, Math.min(100, Math.round(p))), motivos };
}

// La mejor cuenta para una campaña (la que más encaja)
function mejorCuenta(c) {
  let mejor = null, max = 0;
  D.cuentas.forEach((a) => {
    const e = encaje(c, a);
    if (e > max) (max = e), (mejor = a);
  });
  return mejor;
}

function evaluar(c) {
  const a = mejorCuenta(c);
  const r = puntuar(c, a);
  const joya = r.puntos >= 65 && c.idioma === idiomaObjetivo() && c.restante >= 200 && !c.bloqueada && !RIESGO.test(textoCampana(c)) && (!D.cuentas.length || !!a) && veredicto(c).tipo !== "no";
  return { ...c, cuentaSug: a, ...r, joya };
}

// ---------- Actualizar (solo en el Mac) ----------
async function actualizarRadar(silencioso = false) {
  if (!window.estudio.radar || radarLeyendo) return;
  radarLeyendo = true;
  const progreso = (t) => {
    const el = document.getElementById("radar-progreso");
    if (el) el.textContent = t;
  };
  window.estudio.alProgresoRadar && window.estudio.alProgresoRadar(progreso);
  if (seccion === "radar") vistaRadar();
  try {
    const r = await window.estudio.radar();
    const R = radar();
    const antes = R.actualizado;
    R.vistos ||= {};
    r.items.forEach((c) => (R.vistos[c.id] ||= r.actualizado));
    // Se guardan todas las del idioma elegido y, del resto, las mejores (para no hacer pesada la sincronización)
    const evaluados = r.items.map(evaluar).sort((a, b) => b.puntos - a.puntos);
    const propias = evaluados.filter((c) => c.idioma === idiomaObjetivo());
    const resto = evaluados.filter((c) => c.idioma !== idiomaObjetivo()).slice(0, Math.max(0, RADAR_MAX - propias.length));
    R.items = [...propias, ...resto].map(({ cuentaSug, puntos, motivos, joya, ...c }) => c);
    R.anterior = antes;
    R.actualizado = r.actualizado;
    R.errores = r.errores;
    R.total = r.items.length;
    // Limpia de «vistos» las que ya no existen
    const ids = new Set(r.items.map((c) => c.id));
    Object.keys(R.vistos).forEach((k) => ids.has(k) || delete R.vistos[k]);
    sincronizarCampanasDesdeRadar(r.items);
    const cambios = pilotoAutomatico(r.items);
    guardar();
    if (cambios.length) aviso(`Piloto automático: ${cambios.length} cambio(s) en tus campañas. Míralos en el Radar.`);
    else if (!silencioso || r.errores.length) aviso(r.errores.length ? "Radar actualizado con avisos: " + r.errores.join(" · ") : `Radar actualizado: ${r.items.length} campañas`);
  } catch (e) {
    aviso("No se ha podido actualizar el radar: " + e.message);
  } finally {
    radarLeyendo = false;
    pintarMenu();
    if (seccion === "radar") vistaRadar();
  }
}

// Las campañas que añadiste desde el radar se actualizan solas (presupuesto gastado, fin)
function sincronizarCampanasDesdeRadar(items) {
  const porId = Object.fromEntries(items.map((c) => [c.id, c]));
  D.campanas.forEach((k) => {
    const c = k.radarId && porId[k.radarId];
    if (!c) return;
    k.presupuesto = c.presupuesto;
    k.gastadoPct = c.presupuesto ? Math.round((1 - c.restante / c.presupuesto) * 100) : k.gastadoPct;
    k.cpm = c.tarifa;
    if (c.fin && !c.finEstimado) k.fechaFin = c.fin;
    k.radarVisto = hoyISO();
  });
}

function anadirDesdeRadar(c) {
  if (D.campanas.some((k) => k.radarId === c.id)) return aviso("Ya la tienes en Campañas");
  const nueva = {
    id: uid(),
    radarId: c.id,
    nombre: c.nombre,
    plataforma: c.plat,
    creador: c.org,
    cpm: c.tarifa,
    moneda: "USD",
    presupuesto: c.presupuesto,
    gastadoPct: c.presupuesto ? Math.round((1 - c.restante / c.presupuesto) * 100) : 0,
    minVistas: c.minVistas || "",
    maxPorClip: c.maxPago || "",
    fechaFin: c.fin && !c.finEstimado ? c.fin : "",
    enlace: c.enlace,
    redes: (c.redes || []).join(", "),
    estado: "activa",
    reglas: "",
  };
  D.campanas.push(nueva);
  guardar();
  aviso("Añadida a Campañas. Copia allí sus reglas desde la página de la campaña.");
  editarCampana(nueva);
}

// ---------- Vista ----------
function vistaRadar() {
  const R = radar();
  const esMac = !!window.estudio.radar;
  acciones(esMac ? [["radar-act", radarLeyendo ? "Leyendo…" : "↻ Actualizar ahora", "prim"]] : []);
  if (esMac) $("#radar-act").onclick = () => actualizarRadar();
  const f = radarFiltro;
  const todos = R.items.map(evaluar);
  const nuevo = (c) => R.anterior && R.vistos?.[c.id] && R.vistos[c.id] > R.anterior;
  const lista = todos
    .filter(
      (c) =>
        (!f.texto || textoCampana(c).includes(f.texto.toLowerCase())) &&
        (!f.idioma || c.idioma === f.idioma) &&
        (!f.plat || c.plat === f.plat) &&
        (!f.cuenta || encaje(c, cuenta(f.cuenta)) > 0) &&
        (!f.soloJoyas || c.joya) &&
        (!f.veredicto || veredicto(c).tipo === f.veredicto)
    )
    .sort((a, b) => {
      if (f.orden === "tarifa") return b.tarifa - a.tarifa;
      if (f.orden === "restante") return b.restante - a.restante;
      if (f.orden === "nuevas") return (R.vistos?.[b.id] || "").localeCompare(R.vistos?.[a.id] || "");
      if (f.orden === "fin") return (diasHasta(a.fin) ?? 9999) - (diasHasta(b.fin) ?? 9999);
      return b.puntos - a.puntos;
    });
  const enIdioma = todos.filter((c) => c.idioma === idiomaObjetivo());
  const joyas = todos.filter((c) => c.joya);
  const nuevas = todos.filter(nuevo);

  const cabecera = R.actualizado
    ? `<p class="peq" style="margin-top:0">Datos reales de los listados públicos de Whop y Vyro · leídos el <b>${new Date(R.actualizado).toLocaleString("es-ES", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</b>${R.total ? ` · ${R.total} campañas de clipping que pagan en TikTok` : ""}. ${
        esMac ? "Se actualiza solo cada 6 horas mientras la app del Mac está abierta." : "Se actualiza desde la app del Mac y llega aquí con la sincronización."
      }</p>${R.errores?.length ? `<div class="tarjeta" style="border-color:var(--ambar)">⚠ ${esc(R.errores.join(" · "))}</div>` : ""}`
    : `<div class="vacio">${esMac ? "Pulsa <b>Actualizar ahora</b> para leer las campañas reales de Whop y Vyro. La primera vez tarda 1–2 minutos (revisa la ficha de cada campaña); después, unos segundos." : "El radar se actualiza desde la app del Mac (el iPhone no puede leer los listados de Whop y Vyro). Ábrela en el Mac con la sincronización activada y aquí aparecerán las campañas."}</div>`;

  $("#contenido").innerHTML = `
    ${cabecera}
    <p class="peq" id="radar-progreso">${radarLeyendo ? "Leyendo…" : ""}</p>
    ${
      R.items.length
        ? `<div class="rejilla kpis">
      <div class="kpi"><div class="et">En ${IDIOMAS[idiomaObjetivo()]}</div><div class="val">${enIdioma.length}</div><div class="nota">campañas de clipping con TikTok</div></div>
      <div class="kpi"><div class="et">Joyas</div><div class="val">${joyas.length}</div><div class="nota">65+ puntos, tu idioma y tu nicho</div></div>
      <div class="kpi"><div class="et">Nuevas</div><div class="val">${nuevas.length}</div><div class="nota">desde la lectura anterior</div></div>
      <div class="kpi"><div class="et">Mejor tarifa (${IDIOMAS[idiomaObjetivo()]})</div><div class="val">${enIdioma.length ? Math.max(...enIdioma.map((c) => c.tarifa)).toFixed(2) + " $" : "—"}</div><div class="nota">por cada 1.000 vistas en TikTok</div></div>
    </div>
    ${tarjetasPorCuenta(todos)}
    <h2>Piloto automático</h2>
    <div class="rejilla dos">
      <div class="tarjeta">
        <label style="flex-direction:row;align-items:center;gap:8px;color:var(--texto);font-size:14px"><input type="checkbox" id="r-piloto" ${D.ajustes.piloto === false ? "" : "checked"}/> <b>Cambiar mis campañas solo</b></label>
        <p class="peq">En cada lectura del radar (Whop y Vyro): pasa a <b>Terminada</b> la que se acaba o ya no aparece, a <b>Pausada</b> la que se hunde o casi no deja dinero por clipper, y añade hasta 5 joyas nuevas como <b>Por unirte</b>. Unirte en la plataforma lo haces tú.</p>
        ${(R.registro || []).length ? `<div style="max-height:220px;overflow:auto">${R.registro.slice(0, 25).map((x) => `<div class="peq" style="padding:4px 0;border-top:1px solid var(--borde)"><b>${new Date(x.f).toLocaleString("es-ES", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</b> · ${esc(x.t)}</div>`).join("")}</div>` : `<p class="peq">Aún no ha hecho cambios.</p>`}
      </div>
      <div class="tarjeta">
        <b>✨ Agente de campañas (IA)</b>
        <p class="peq">Claude revisa tus campañas y las mejores del radar con todos sus datos (vistas por clip, lo que se ha pagado, tendencia, competencia) y te propone qué añadir, mantener o quitar en cada cuenta, explicando por qué.</p>
        <button class="btn prim" id="r-agente">Revisar mis campañas con IA</button>
        <div id="r-agente-res"></div>
      </div>
    </div>
    <h2>Todas las campañas</h2>
    <div class="filtros">
      <input id="r-texto" placeholder="Buscar (creador, tema…)" value="${esc(f.texto)}" />
      <select id="r-idioma">${opciones(Object.entries(IDIOMAS), f.idioma, "Todos los idiomas")}</select>
      <select id="r-plat">${opciones([["Whop", "Whop"], ["Vyro", "Vyro"]], f.plat, "Whop y Vyro")}</select>
      <select id="r-cuenta">${opciones(D.cuentas.map((a) => [a.id, "Encaja con " + a.usuario]), f.cuenta, "Cualquier nicho")}</select>
      <select id="r-orden">${opciones([["puntos", "Mejor puntuación"], ["tarifa", "Mejor tarifa"], ["restante", "Más presupuesto"], ["nuevas", "Más nuevas"], ["fin", "Terminan antes"]], f.orden)}</select>
      <select id="r-veredicto">${opciones([["si", "Renta"], ["duda", "Dudosa"], ["nueva", "Nueva (sin datos)"], ["no", "No renta"], ["sindatos", "Sin datos (Vyro)"]], f.veredicto, "Cualquier veredicto")}</select>
      <label style="flex-direction:row;align-items:center;gap:6px;color:var(--texto)"><input type="checkbox" id="r-joyas" ${f.soloJoyas ? "checked" : ""}/> Solo joyas</label>
    </div>
    <p class="peq">${lista.length} campañas${R.items.length < (R.total || 0) ? ` (se guardan todas las de tu idioma y las ${RADAR_MAX} mejores del resto)` : ""}.</p>
    <div class="radar-lista">${lista.slice(0, 80).map((c) => tarjetaCampanaRadar(c, nuevo(c))).join("")}</div>
    ${lista.length > 80 ? `<p class="peq">Mostrando las 80 primeras. Usa los filtros para afinar.</p>` : ""}
    <h2>Cómo se puntúa</h2>
    <div class="tarjeta peq">De 0 a 100, solo con datos de la campaña: idioma que eliges en Ajustes (30), tarifa en TikTok (hasta 20 a partir de 3 $/1.000), presupuesto que queda por cada clipper (15), vistas mínimas para cobrar (10), días que le quedan (10), sin solicitud (5) y si encaja con el nicho de una de tus cuentas (10). Las bloqueadas restan 20. <b>Joya</b> = 65 puntos o más, en tu idioma, que encaja con el nicho de alguna de tus cuentas, con 200 $ o más por gastar y sin apuestas ni cripto.<br><br>
    <b>De dónde sale cada dato:</b> tarifa, presupuesto, clippers, mínimo y máximo por clip y solicitud son los que publica cada plataforma. En Vyro, el idioma y la fecha de fin también son oficiales. En Whop el idioma se <b>detecta por el texto</b> de la campaña y la fecha de fin es una <b>estimación</b> según lo rápido que gasta su presupuesto. Las reglas completas (duración, país del público, menciones) solo se ven dentro de cada campaña: léelas antes de unirte.</div>`
        : ""
    }`;
  if (!R.items.length) return;
  const rep = () => vistaRadar();
  $("#r-texto").oninput = (e) => {
    f.texto = e.target.value;
    const pos = e.target.selectionStart;
    rep();
    $("#r-texto").focus();
    $("#r-texto").setSelectionRange(pos, pos);
  };
  $("#r-idioma").onchange = (e) => ((f.idioma = e.target.value), rep());
  $("#r-plat").onchange = (e) => ((f.plat = e.target.value), rep());
  $("#r-cuenta").onchange = (e) => ((f.cuenta = e.target.value), rep());
  $("#r-orden").onchange = (e) => ((f.orden = e.target.value), rep());
  $("#r-joyas").onchange = (e) => ((f.soloJoyas = e.target.checked), rep());
  $("#contenido").querySelectorAll("[data-anadir]").forEach((b) => (b.onclick = () => anadirDesdeRadar(R.items.find((c) => c.id === b.dataset.anadir))));
  $("#contenido").querySelectorAll("[data-informe]").forEach((b) => (b.onclick = () => abrirInforme(b.dataset.informe)));
  $("#r-veredicto") && ($("#r-veredicto").onchange = (e) => ((f.veredicto = e.target.value), rep()));
  $("#r-piloto") && ($("#r-piloto").onchange = (e) => ((D.ajustes.piloto = e.target.checked), guardar(), aviso(e.target.checked ? "Piloto automático activado" : "Piloto automático desactivado")));
  $("#r-agente") && ($("#r-agente").onclick = () => ia.agenteCampanas($("#r-agente-res")));
}

// Las 3 mejores para cada cuenta
function tarjetasPorCuenta(todos) {
  if (!D.cuentas.length)
    return `<div class="tarjeta" style="margin-top:14px">Añade tus cuentas en <b>Cuentas</b> (con su nicho y, si quieres, palabras clave) y aquí verás las mejores campañas para cada una.</div>`;
  return `<h2>Lo mejor para cada cuenta</h2><div class="rejilla dos">${D.cuentas
    .map((a) => {
      const claves = clavesCuenta(a);
      const top = todos
        .filter((c) => encaje(c, a) > 0 && c.idioma === idiomaObjetivo() && !c.bloqueada)
        .map((c) => ({ ...c, ...puntuar(c, a), enc: encaje(c, a) }))
        // Primero lo que más encaja con el nicho (cada palabra clave que coincide pesa 6 puntos), luego la puntuación
        .sort((x, y) => y.puntos + 6 * y.enc - (x.puntos + 6 * x.enc))
        .slice(0, 3);
      return `<div class="tarjeta"><div><b>${esc(a.usuario)}</b> <span class="peq">· ${esc(a.nicho || "sin nicho")}</span></div>
        ${
          !claves.length
            ? `<p class="peq">Ponle un nicho o palabras clave en Cuentas para buscarle campañas.</p>`
            : top.length
            ? top
                .map(
                  (c) => `<div class="radar-mini"><span class="radar-p ${c.puntos >= 65 ? "alta" : ""}">${c.puntos}</span><div style="flex:1;min-width:0"><div class="radar-mini-t">${esc(c.nombre)}</div><div class="peq">${c.plat} · ${c.tarifa.toFixed(2)} $/1.000 · quedan ${fmtNum(c.restante)} $${c.minVistas ? ` · cobra desde ${fmtCorto(c.minVistas)} vistas` : ""}</div></div><a class="btn peq" href="${esc(c.enlace)}" target="_blank">Ver ↗</a></div>`
                )
                .join("")
            : `<p class="peq">Ahora mismo no hay campañas en ${IDIOMAS[idiomaObjetivo()]} que encajen con este nicho.</p>`
        }</div>`;
    })
    .join("")}</div>`;
}

function tarjetaCampanaRadar(c, esNueva) {
  const tienes = D.campanas.some((k) => k.radarId === c.id);
  const d = diasHasta(c.fin);
  const gastado = c.presupuesto ? Math.round((1 - c.restante / c.presupuesto) * 100) : 0;
  const riesgo = RIESGO.test(textoCampana(c));
  return `<div class="tarjeta radar-c ${c.joya ? "joya" : ""}">
    <div style="display:flex;gap:12px;align-items:flex-start">
      <span class="radar-p ${c.puntos >= 65 ? "alta" : ""}" title="Puntuación">${c.puntos}</span>
      <div style="flex:1;min-width:0">
        <div class="radar-t">${c.joya ? "💎 " : ""}${esc(c.nombre)}</div>
        ${(() => { const v = veredicto(c); return `<div style="margin-top:4px"><span class="chip ${COLOR_VEREDICTO[v.tipo]}">${v.etiqueta}</span> <span class="peq">${esc(v.motivos[0] || "")}</span></div>`; })()}
        <div class="peq">${esc(c.org)}</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px">
          <span class="chip ${c.plat === "Whop" ? "rosa" : "cian"}">${c.plat}</span>
          <span class="chip ${c.idioma === idiomaObjetivo() ? "verde" : ""}" title="${c.idiomaFuente === "oficial" ? "Idioma oficial de la campaña" : "Idioma detectado por el texto de la campaña"}">${IDIOMAS[c.idioma] || c.idioma}${c.idiomaFuente === "oficial" ? "" : " *"}</span>
          ${esNueva ? `<span class="chip ambar">Nueva</span>` : ""}
          ${c.solicitud ? `<span class="chip">Hay que solicitarla</span>` : ""}
          ${c.bloqueada ? `<span class="chip">Bloqueada</span>` : ""}
          ${riesgo ? `<span class="chip rosa">Apuestas / cripto</span>` : ""}
          ${(c.cats || []).slice(0, 2).map((x) => `<span class="chip">${esc(x)}</span>`).join("")}
        </div>
      </div>
    </div>
    <div class="radar-datos">
      <div><span>Tarifa TikTok</span><b>${c.tarifa.toFixed(2)} $</b><small>por 1.000 vistas</small></div>
      <div><span>Queda</span><b>${fmtNum(c.restante)} $</b><small>${gastado} % gastado</small></div>
      <div><span>Clippers</span><b>${c.clippers == null ? "—" : fmtNum(c.clippers)}</b><small>${c.clippers == null ? "Vyro no lo publica" : "trabajando en ella"}</small></div>
      <div><span>Cobras desde</span><b>${c.minVistas ? fmtCorto(c.minVistas) : "—"}</b><small>vistas por clip${c.maxPago ? ` · máx. ${fmtNum(c.maxPago)} $` : ""}</small></div>
      <div><span>Termina</span><b>${c.fin ? (d != null && d > 365 ? "+1 año" : fechaCorta(c.fin)) : "—"}</b><small>${c.fin ? (c.finEstimado ? "estimado por su ritmo de gasto" : "fecha oficial") : "sin datos"}</small></div>
    </div>
    ${c.desc ? `<p class="peq" style="margin:8px 0 0">${esc(c.desc)}${c.desc.length >= 220 ? "…" : ""}</p>` : ""}
    ${c.motivos?.length ? `<p class="peq" style="margin:6px 0 0;color:var(--verde)">${c.motivos.map(esc).join(" · ")}</p>` : ""}
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">
      <button class="btn peq" data-informe="${c.id}">Informe: ¿me renta?</button>
      <a class="btn peq" href="${esc(c.enlace)}" target="_blank">Abrir en ${c.plat} ↗</a>
      ${tienes ? `<span class="chip verde">En tus campañas</span>` : `<button class="btn peq prim" data-anadir="${c.id}">+ Añadir a mis campañas</button>`}
    </div>
  </div>`;
}

// ======================================================
// INFORME «¿ME RENTA?» DE CADA CAMPAÑA
// ======================================================
// Mismo análisis que se hizo a mano con TDJ, con los datos públicos de la campaña.
function veredicto(c) {
  const motivos = [];
  if (c.plat === "Vyro") {
    motivos.push(`Pide ${fmtNum(c.minVistas)} vistas por clip para cobrar`);
    const d = diasHasta(c.fin);
    if (d != null) motivos.push(d <= 5 ? `Termina en ${d} día(s)` : `Termina el ${fechaCorta(c.fin)}`);
    const gastado = c.presupuesto - c.restante;
    const dias = c.lanzada ? Math.max(1, (Date.now() - Date.parse(c.lanzada)) / 864e5) : null;
    if (dias && gastado > 0) {
      const ritmo = gastado / dias;
      motivos.push(`Gasta ~${fmtNum(ritmo)} $ al día (lleva ${Math.round((gastado / c.presupuesto) * 100)} %)`);
      if (d != null && ritmo * d > c.restante) motivos.push(`A este ritmo se queda sin dinero en ~${Math.max(1, Math.round(c.restante / ritmo))} días, antes de su fecha de fin`);
    }
    return { tipo: "sindatos", etiqueta: "Sin datos de rendimiento", motivos: [...motivos, "Vyro no publica vistas, clips aprobados ni clippers"] };
  }
  if ((c.aprobados ?? 0) < 10) {
    motivos.push(c.aprobados ? `Solo ${c.aprobados} clips aprobados: aún no hay datos fiables` : "Aún no tiene clips aprobados");
    if ((c.clippers ?? 0) <= 10) motivos.push(c.clippers ? `Poca competencia: ${c.clippers} clippers` : "Nadie trabaja en ella todavía");
    return { tipo: "nueva", etiqueta: "Nueva: sin datos todavía", motivos };
  }
  const vpc = c.vistasPorClip || 0;
  const min = c.minVistas || 0;
  const clipMedio = vpc >= min ? Math.min(c.maxPago || Infinity, (vpc / 1000) * c.tarifa) : 0;
  const pctPagadas = c.vistas ? c.vistasPagadas / c.vistas : null;
  const caida = c.pico7 > 0 && c.ult7 < 0.15 * c.pico7 && c.prev7 > c.ult7;
  const aprob14 = (c.serieAprob || []).slice(-14).reduce((a, b) => a + b, 0);
  // Caída con clips nuevos entrando = el público se ha cansado (saturada). Sin clips nuevos = parada (nadie publica).
  const parada = caida && !!c.serieAprob && aprob14 === 0;
  const hundida = caida && !parada;
  const creciendo = c.prev7 > 0 && c.ult7 > c.prev7 * 1.2;
  const porClipper = c.restante / ((c.clippers || 0) + 1);
  motivos.push(`Un clip aprobado saca ${fmtNum(vpc)} vistas de media${min ? ` (cobras desde ${fmtNum(min)})` : ""}`);
  motivos.push(clipMedio ? `Un clip medio cobraría ~${clipMedio.toFixed(2)} $` : "Un clip medio no llega al mínimo: cobraría 0 $");
  if (pctPagadas != null) motivos.push(`Se han pagado ${Math.round(pctPagadas * 100)} % de sus vistas`);
  if (c.medioPorClipper != null) motivos.push(`Cada clipper ha ganado ${c.medioPorClipper.toFixed(2)} $ de media`);
  if (hundida) motivos.push(`Saturada: siguen entrando clips pero sus vistas se han hundido (${fmtNum(c.ult7)} en 7 días frente a ${fmtNum(c.pico7)} en su mejor semana)`);
  else if (parada) motivos.push(`Parada: ningún clip aprobado en 14 días (${fmtNum(c.ult7)} vistas esta semana). Quedan ${fmtNum(c.restante)} $: puede ser una oportunidad o que el contenido ya no tire`);
  else if (creciendo) motivos.push(`Va a más: ${fmtNum(c.ult7)} vistas en 7 días (${fmtNum(c.prev7)} la semana anterior)`);
  motivos.push(`Quedan ${fmtNum(porClipper)} $ por clipper`);
  let tipo = "duda";
  if ((min && vpc < min * 0.8) || hundida || porClipper < 3 || c.restante < 50) tipo = "no";
  else if (clipMedio >= 2.5 && (pctPagadas == null || pctPagadas >= 0.4)) tipo = "si";
  const etiqueta = { si: "Renta", duda: "Dudosa", no: "No renta" }[tipo];
  return { tipo, etiqueta, motivos, clipMedio, pctPagadas, hundida, parada, creciendo };
}
const COLOR_VEREDICTO = { si: "verde", duda: "ambar", no: "rosa", nueva: "cian", sindatos: "" };

function abrirInforme(id) {
  const c = radar().items.find((x) => x.id === id);
  if (!c) return;
  const v = veredicto(c);
  const ev = evaluar(c);
  const serie = c.serie || [];
  const maxS = Math.max(1, ...serie);
  const desde = c.serieDesde ? new Date(c.serieDesde) : null;
  const tienes = D.campanas.some((k) => k.radarId === c.id);
  abrirModal(
    `<h3 style="margin-bottom:2px" data-sinfoco>${esc(c.nombre)}</h3>
    <div class="peq">${esc(c.org)} · ${c.plat} · ${IDIOMAS[c.idioma] || c.idioma}${c.idiomaFuente === "oficial" ? "" : " (detectado)"} · puntuación ${ev.puntos}</div>
    <div class="tarjeta" style="margin-top:12px;border-color:var(--${COLOR_VEREDICTO[v.tipo] === "rosa" ? "rosa" : COLOR_VEREDICTO[v.tipo] === "verde" ? "verde" : COLOR_VEREDICTO[v.tipo] === "ambar" ? "ambar" : "borde"})">
      <span class="chip ${COLOR_VEREDICTO[v.tipo]}" style="font-size:14px">${v.etiqueta}</span>
      <ul style="margin:10px 0 0;padding-left:18px">${v.motivos.map((m) => `<li>${esc(m)}</li>`).join("")}</ul>
    </div>
    <div class="radar-datos" style="grid-template-columns:repeat(auto-fit,minmax(140px,1fr))">
      <div><span>Tarifa TikTok</span><b>${c.tarifa.toFixed(2)} $</b><small>por 1.000 vistas</small></div>
      <div><span>Cobras desde</span><b>${c.minVistas ? fmtNum(c.minVistas) : "—"}</b><small>vistas${c.maxPago ? ` · máx. ${fmtNum(c.maxPago)} $/clip` : ""}</small></div>
      <div><span>Queda</span><b>${fmtNum(c.restante)} $</b><small>de ${fmtNum(c.presupuesto)} $</small></div>
      ${c.plat === "Whop" ? `
      <div><span>Clippers</span><b>${fmtNum(c.clippers)}</b><small>${fmtNum(c.aprobados)} clips aprobados</small></div>
      <div><span>Vistas por clip</span><b>${c.vistasPorClip == null ? "—" : fmtNum(c.vistasPorClip)}</b><small>media de los aprobados</small></div>
      <div><span>Vistas pagadas</span><b>${c.vistas ? Math.round((c.vistasPagadas / c.vistas) * 100) + " %" : "—"}</b><small>${fmtCorto(c.vistasPagadas)} de ${fmtCorto(c.vistas)}</small></div>
      <div><span>Gana un clipper</span><b>${c.medioPorClipper == null ? "—" : c.medioPorClipper.toFixed(2) + " $"}</b><small>de media</small></div>
      <div><span>El que más gana</span><b>${c.topGanadores?.[0] ? c.topGanadores[0].ganado.toFixed(2) + " $" : "—"}</b><small>${c.topGanadores?.[0] ? `${c.topGanadores[0].clips} clips` : ""}</small></div>` : ""}
    </div>
    ${
      serie.length
        ? `<h3>Vistas de toda la campaña cada día</h3>
      <div class="barras" style="height:110px">${serie
        .map((x, i) => {
          const d = desde ? new Date(desde.getTime() + i * 864e5) : null;
          return `<div class="b" style="height:${(x / maxS) * 100}%" data-t="${d ? fechaCorta(d.toISOString()) + " · " : ""}${fmtNum(x)} vistas"></div>`;
        })
        .join("")}</div>
      <p class="peq">Últimos 7 días: <b>${fmtNum(c.ult7)}</b> · 7 días anteriores: ${fmtNum(c.prev7)} · mejor semana: ${fmtNum(c.pico7)} ${c.serieAprob ? ` · clips aprobados en 14 días: ${fmtNum(c.serieAprob.slice(-14).reduce((a, b) => a + b, 0))}` : ""}</p>`
        : ""
    }
    ${
      c.topClips?.length
        ? `<h3>Sus mejores clips</h3>${c.topClips
            .map((t) => `<div class="radar-mini"><b style="min-width:70px">${fmtCorto(t.vistas)}</b><div style="flex:1;min-width:0" class="radar-mini-t">${esc(t.titulo || t.url)}</div><a class="btn peq" href="${esc(t.url)}" target="_blank">Ver ↗</a></div>`)
            .join("")}<p class="peq">Míralos antes de empezar: es lo que mejor le está funcionando a otros clippers en esta campaña.</p>`
        : ""
    }
    <h3>¿Cuánto ganarías?</h3>
    <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><input type="number" id="inf-vistas" min="0" value="${c.vistasPorClip || c.minVistas || 1000}" style="width:150px" /> <span>vistas en un clip →</span> <b id="inf-res"></b></div>
    <p class="peq">Con las condiciones de la campaña (mínimo, máximo y tarifa en TikTok)${n(D.ajustes.usdEur) ? " y tu cambio del dólar" : ""}.</p>
    <div id="inf-ia"></div>
    <div class="modal-pie"><div><a class="btn" href="${esc(c.enlace)}" target="_blank">Abrir en ${c.plat} ↗</a> ${window.ia ? `<button class="btn" id="inf-ia-btn">✨ Analizar con IA</button>` : ""}</div>
    <div><button class="btn" id="m-cancelar">Cerrar</button> ${tienes ? "" : `<button class="btn prim" id="inf-anadir">+ Añadir a mis campañas</button>`}</div></div>`,
    (caja) => {
      const calc = () => {
        const x = n(caja.querySelector("#inf-vistas").value);
        let g = x < (c.minVistas || 0) ? 0 : (x / 1000) * c.tarifa;
        if (c.maxPago) g = Math.min(g, c.maxPago);
        const eur = g * (n(D.ajustes.usdEur) || 1) * (1 - n(D.ajustes.comision) / 100);
        caja.querySelector("#inf-res").textContent = x < (c.minVistas || 0) ? `0 $ (no llega al mínimo de ${fmtNum(c.minVistas)})` : `${g.toFixed(2)} $${n(D.ajustes.usdEur) ? ` ≈ ${fmtEur(eur)}` : ""}`;
      };
      caja.querySelector("#inf-vistas").oninput = calc;
      calc();
      caja.querySelector("#m-cancelar").onclick = cerrarModal;
      caja.querySelector("#inf-anadir") && (caja.querySelector("#inf-anadir").onclick = () => (cerrarModal(), anadirDesdeRadar(c)));
      caja.querySelector("#inf-ia-btn") && (caja.querySelector("#inf-ia-btn").onclick = () => ia.analizarCampana(c, caja.querySelector("#inf-ia")));
    }
  );
}

// ======================================================
// PILOTO AUTOMÁTICO DE CAMPAÑAS
// ======================================================
// En cada lectura del radar: retira de «Campañas» las que se acaban o dejan de rendir y añade las joyas nuevas.
// Unirse a la campaña en Whop o Vyro lo tienes que hacer tú: las nuevas entran como «Por unirte».
function registrarPiloto(texto) {
  const R = radar();
  (R.registro ||= []).unshift({ f: new Date().toISOString(), t: texto });
  R.registro = R.registro.slice(0, 80);
}

function pilotoAutomatico(itemsTodos) {
  if (D.ajustes.piloto === false) return [];
  const cambios = [];
  const porId = Object.fromEntries(itemsTodos.map((c) => [c.id, c]));
  D.campanas.forEach((k) => {
    if (!k.radarId || !["activa", "porunirte"].includes(k.estado)) return;
    const c = porId[k.radarId];
    if (!c) {
      k.estado = "terminada";
      cambios.push(`Terminada «${k.nombre}»: ya no aparece en ${k.plataforma} (acabada o sin presupuesto)`);
      return;
    }
    if (c.fin && !c.finEstimado && diasHasta(c.fin) < 1) {
      k.estado = "terminada";
      cambios.push(`Terminada «${k.nombre}»: su fecha de fin era el ${fechaCorta(c.fin)}`);
      return;
    }
    if (c.restante < Math.max(50, c.presupuesto * 0.05)) {
      k.estado = "terminada";
      cambios.push(`Terminada «${k.nombre}»: solo le quedan ${fmtNum(c.restante)} $`);
      return;
    }
    const v = veredicto(c);
    if (v.tipo === "no" && (v.hundida || c.restante / ((c.clippers || 0) + 1) < 3)) {
      k.estado = "pausada";
      cambios.push(`Pausada «${k.nombre}»: ${v.hundida ? "sus vistas se han hundido" : "queda muy poco dinero por clipper"} (${v.motivos[0]})`);
    }
  });
  // Joyas nuevas: hasta 5 por lectura, las mejores primero
  const nuevas = itemsTodos
    .map(evaluar)
    .filter((c) => c.joya && veredicto(c).tipo !== "no" && !D.campanas.some((k) => k.radarId === c.id))
    .sort((a, b) => b.puntos - a.puntos)
    .slice(0, 5);
  nuevas.forEach((c) => {
    D.campanas.push({
      id: uid(),
      radarId: c.id,
      nombre: c.nombre,
      plataforma: c.plat,
      creador: c.org,
      cpm: c.tarifa,
      moneda: "USD",
      presupuesto: c.presupuesto,
      gastadoPct: c.presupuesto ? Math.round((1 - c.restante / c.presupuesto) * 100) : 0,
      minVistas: c.minVistas || "",
      maxPorClip: c.maxPago || "",
      fechaFin: c.fin && !c.finEstimado ? c.fin : "",
      enlace: c.enlace,
      redes: (c.redes || []).join(", "),
      estado: "porunirte",
      cuentaSugerida: c.cuentaSug?.id || "",
      reglas: "",
      notas: `Añadida por el piloto automático el ${fechaCorta(hoyISO())} (${c.puntos} puntos${c.cuentaSug ? ", para " + c.cuentaSug.usuario : ""}). Únete en ${c.plat} y copia aquí sus reglas.`,
    });
    cambios.push(`Añadida «${c.nombre}» (${c.puntos} puntos${c.cuentaSug ? ", para " + c.cuentaSug.usuario : ""}): únete en ${c.plat}`);
  });
  cambios.forEach(registrarPiloto);
  return cambios;
}
