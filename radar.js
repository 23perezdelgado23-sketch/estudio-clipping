"use strict";
// Radar de campañas: las campañas reales de Whop y Vyro (sus listados públicos), puntuadas para tus cuentas.
// Se actualiza desde la app del Mac (el iPhone no puede leer esos listados) y llega al iPhone con la sincronización.

const RADAR_MAX = 150; // campañas guardadas (todas las del idioma elegido y las mejores del resto)
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
  const joya = r.puntos >= 65 && c.idioma === idiomaObjetivo() && c.restante >= 200 && !c.bloqueada && !RIESGO.test(textoCampana(c)) && (!D.cuentas.length || !!a);
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
    guardar();
    if (!silencioso || r.errores.length) aviso(r.errores.length ? "Radar actualizado con avisos: " + r.errores.join(" · ") : `Radar actualizado: ${r.items.length} campañas`);
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
        (!f.soloJoyas || c.joya)
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
    <h2>Todas las campañas</h2>
    <div class="filtros">
      <input id="r-texto" placeholder="Buscar (creador, tema…)" value="${esc(f.texto)}" />
      <select id="r-idioma">${opciones(Object.entries(IDIOMAS), f.idioma, "Todos los idiomas")}</select>
      <select id="r-plat">${opciones([["Whop", "Whop"], ["Vyro", "Vyro"]], f.plat, "Whop y Vyro")}</select>
      <select id="r-cuenta">${opciones(D.cuentas.map((a) => [a.id, "Encaja con " + a.usuario]), f.cuenta, "Cualquier nicho")}</select>
      <select id="r-orden">${opciones([["puntos", "Mejor puntuación"], ["tarifa", "Mejor tarifa"], ["restante", "Más presupuesto"], ["nuevas", "Más nuevas"], ["fin", "Terminan antes"]], f.orden)}</select>
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
        .map((c) => ({ ...c, ...puntuar(c, a) }))
        .sort((x, y) => y.puntos - x.puntos)
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
      <a class="btn peq" href="${esc(c.enlace)}" target="_blank">Abrir en ${c.plat} ↗</a>
      ${tienes ? `<span class="chip verde">En tus campañas</span>` : `<button class="btn peq prim" data-anadir="${c.id}">+ Añadir a mis campañas</button>`}
    </div>
  </div>`;
}
