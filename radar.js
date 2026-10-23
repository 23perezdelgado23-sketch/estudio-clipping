"use strict";
// Radar de campañas: las campañas reales de Whop y Vyro (sus listados públicos), puntuadas para tus cuentas.
// Las lee el servidor 24 h (Supabase, cada 3 horas, aunque el Mac esté apagado) y, si hace falta, el propio Mac.
// El iPhone no puede leer esos listados directamente: recibe la lectura del servidor o la del Mac.

const RADAR_MAX = 120; // campañas guardadas (todas las del idioma elegido y las mejores del resto)
const RADAR_HORAS = 6; // el Mac la actualiza solo si la última lectura tiene más de 6 horas
const IDIOMAS = { es: "Español", en: "Inglés", pt: "Portugués", fr: "Francés", it: "Italiano", de: "Alemán", nl: "Neerlandés" };
const RIESGO = /gambl|casino|betting|apuesta|\bbet\b|crypto|cripto|forex|onlyfans/i;
// TikTok no deja cobrar por contenido político de marca (Normas de la comunidad, «Integridad de procesos cívicos y electorales»)
const POLITICA = /politic|polític|elecci|election|anti-élite|\bélites?\b/i;

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
// Idiomas de campañas que acepta cada cuenta (en su ficha); si no tiene, el idioma del Radar (Ajustes).
// Por ejemplo, la cuenta de música puede trabajar campañas en español y en inglés: la música no necesita entenderse.
const idiomasCuenta = (a) => (a?.idiomas ? a.idiomas.split(",").map((x) => x.trim()).filter(Boolean) : [idiomaObjetivo()]);

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

// Estados de clip con vistas reales (los mismos que CUENTAN_VISTAS en app.js; aquí aparte porque el servidor usa este archivo solo)
const ESTADOS_CON_VISTAS = ["publicado", "enviado", "aprobado"];
// Campañas que exigen una cuenta solo para ellas (como Daniel Curto): en ese caso no sirve una cuenta de nicho con varios creadores
const DEDICADA = /p[áa]gina dedicada|cuenta dedicada|p[áa]gina exclusiva|dedicated (page|account|clipping)|fan ?page/i;
const DIAS_MINIMOS = 10;
const POR_CUENTA = 6; // campañas que se enseñan en «Lo mejor para cada cuenta»
// Campañas que piden público de un país concreto: con cuentas que trabajan desde España es difícil cumplirlo
const PUBLICO_PAIS = [
  [/mexic|m[ée]xico|🇲🇽/i, "México"],
  [/canad|🇨🇦/i, "Canadá"],
  [/\b(us|u\.s\.|usa|american|united states)\b[^.]{0,20}audienc|audienc[^.]{0,20}\b(us|usa|american|united states)\b|🇺🇸/i, "EE. UU."],
  [/brasil|brazil|🇧🇷/i, "Brasil"],
  [/argentin|🇦🇷/i, "Argentina"],
  [/colombia|🇨🇴/i, "Colombia"],
];
const PAIS_PROPIO = "España"; // una campaña que se queda sin dinero antes no le da tiempo a una cuenta nueva

// Rentabilidad real con lo que publica Whop: lo que la campaña ya ha gastado, repartido entre sus clips aprobados y sus clippers,
// y a qué ritmo gasta (para saber cuándo se queda sin dinero). Vyro no publica clips aprobados ni clippers.
function rentabilidad(c) {
  const gastado = Math.max(0, n(c.presupuesto) - n(c.restante));
  const porClip = n(c.aprobados) >= 10 ? gastado / c.aprobados : null;
  const porClipper = c.medioPorClipper ?? (n(c.clippers) ? gastado / c.clippers : null);
  const dias = c.lanzada ? Math.max(1, (Date.parse(hoyISO()) - Date.parse(c.lanzada)) / 864e5) : null;
  const ritmo = dias && gastado > 0 ? gastado / dias : null;
  const seAgota = ritmo ? n(c.restante) / ritmo : null;
  const fin = c.fin && !c.finEstimado ? diasHasta(c.fin) : null;
  const vida = [seAgota, fin].filter((x) => x != null);
  return { gastado, porClip, porClipper, ritmo, diasVida: vida.length ? Math.min(...vida) : null, tiktok: !(c.redes || []).length || c.redes.includes("tiktok") };
}

// Vistas típicas de los clips de una cuenta (la mediana), en cuanto tiene 5 clips con vistas apuntadas
function vistasCuenta(a) {
  if (!a) return null;
  const v = (D.clips || [])
    .filter((x) => x.cuentaId === a.id && ESTADOS_CON_VISTAS.includes(x.estado) && n(x.vistas) > 0)
    .map((x) => n(x.vistas))
    .sort((x, y) => x - y);
  return v.length >= 5 ? v[Math.floor(v.length / 2)] : null;
}

// País del público que pide la campaña según su nombre o descripción («for Mexican audiences»), si no es el tuyo
function publicoPais(c) {
  const t = `${c.nombre} ${c.desc || ""}`;
  const hit = PUBLICO_PAIS.find(([rx]) => rx.test(t));
  return hit && hit[1] !== PAIS_PROPIO ? hit[1] : "";
}

// Si la campaña exige página dedicada: «si» cuando lo has marcado en su ficha, «posible» cuando lo dice su descripción
function dedicada(c) {
  const k = (D.campanas || []).find((x) => x.radarId === c.id);
  if (k?.paginaDedicada) return "si";
  return DEDICADA.test(`${c.nombre} ${c.desc || ""}`) ? "posible" : "";
}

// La cuenta con la que trabajas una campaña (la que pusiste en su ficha), si la has añadido
const cuentaAsignada = (c) => {
  const k = (D.campanas || []).find((x) => x.radarId === c.id);
  return (k?.cuentaSugerida && D.cuentas.find((a) => a.id === k.cuentaSugerida)) || null;
};

// Puntuación de rentabilidad de 0 a 100 con sus motivos. Todo sale de los datos de la campaña y de tus clips; nada es inventado.
//  · Dinero real por clip aprobado (30) · Si puedes cobrar con tus vistas (20) · Tiempo hasta que se quede sin dinero (15)
//  · Dinero que queda por clipper (15) · Tendencia de sus vistas (10) · Tu idioma y el nicho de la cuenta (10)
function puntuar(c, cuentaObj) {
  const motivos = [];
  const R = rentabilidad(c);
  const v = veredicto(c);
  let p = 0;
  if (R.porClip != null) {
    p += Math.min(1, R.porClip / 15) * 30;
    motivos.push(`Cada clip aprobado ha cobrado ${R.porClip.toFixed(2)} $ de media`);
  } else {
    p += Math.min(1, c.tarifa / 3) * 10;
    motivos.push(c.plat === "Vyro" ? "Vyro no publica lo que paga por clip" : "Sin clips aprobados suficientes para saber lo que paga de verdad");
  }
  const min = n(c.minVistas);
  const vc = vistasCuenta(cuentaObj);
  if (vc != null) {
    p += vc >= min ? 20 : vc >= min * 0.5 ? 8 : 0;
    motivos.push(vc >= min ? `Tus clips llegan al mínimo (${fmtNum(vc)} vistas de media frente a ${fmtNum(min)})` : `Tus clips aún no llegan al mínimo (${fmtNum(vc)} de ${fmtNum(min)} vistas)`);
  } else {
    p += min <= 1000 ? 20 : min <= 3000 ? 15 : min <= 5000 ? 10 : min <= 10000 ? 5 : 0;
    if (min <= 1000) motivos.push("Cobras desde ~1.000 vistas: buena para empezar");
    else if (min > 10000) motivos.push(`Pide ${fmtNum(min)} vistas por clip: difícil para una cuenta nueva`);
  }
  const dv = R.diasVida;
  p += dv == null ? 8 : dv >= 30 ? 15 : dv >= 14 ? 10 : dv >= DIAS_MINIMOS ? 5 : 0;
  if (dv != null && dv < DIAS_MINIMOS) motivos.push(`Se queda sin dinero en ~${Math.max(1, Math.round(dv))} días`);
  const porClipper = n(c.restante) / ((c.clippers ?? 9) + 1);
  p += Math.min(1, porClipper / 100) * 15;
  if (c.clippers != null && c.clippers <= 10) motivos.push(c.clippers ? `Solo ${c.clippers} clippers` : "Nadie trabaja en ella aún");
  p += v.creciendo ? 10 : v.hundida ? 0 : v.parada ? 3 : 5;
  if (v.creciendo) motivos.push("Sus vistas van a más");
  if (cuentaObj ? idiomasCuenta(cuentaObj).includes(c.idioma) : c.idioma === idiomaObjetivo()) p += 5;
  if (cuentaObj && (encaje(c, cuentaObj) || cuentaAsignada(c)?.id === cuentaObj.id)) (p += 5), motivos.push(`Para ${cuentaObj.usuario}`);
  if (c.solicitud) p -= 5;
  if (c.bloqueada) p -= 20;
  if (!R.tiktok) (p -= 30), motivos.push("No paga en TikTok");
  const pais = publicoPais(c);
  if (pais) (p -= 20), motivos.push(`Pide público de ${pais}: difícil con cuentas desde España`);
  if (dv != null && dv < DIAS_MINIMOS) p -= 15;
  if (v.tipo === "no") p -= 15;
  return { puntos: Math.max(0, Math.min(100, Math.round(p))), motivos, rent: R };
}

// La mejor cuenta para una campaña: la que pusiste en su ficha y, si no, la que más encaja con su nicho.
// Si exige página dedicada y no tiene cuenta asignada, no se la propone a ninguna cuenta de nicho.
function mejorCuenta(c) {
  const asignada = cuentaAsignada(c);
  if (asignada) return asignada;
  if (dedicada(c) === "si") return null;
  let mejor = null, max = 0;
  D.cuentas.forEach((a) => {
    if (!idiomasCuenta(a).includes(c.idioma)) return;
    const e = encaje(c, a);
    if (e > max) (max = e), (mejor = a);
  });
  return mejor;
}

// Se puede recomendar: en un idioma de la cuenta (o del Radar), paga en TikTok, no bloqueada, sin apuestas ni política y con tiempo para cobrar
function recomendable(c, R = rentabilidad(c), a = null) {
  const t = textoCampana(c);
  return (a ? idiomasCuenta(a).includes(c.idioma) : c.idioma === idiomaObjetivo()) && R.tiktok && !publicoPais(c) && !c.bloqueada && !RIESGO.test(t) && !POLITICA.test(t) && n(c.restante) >= 100 && (R.diasVida == null || R.diasVida >= DIAS_MINIMOS);
}

function evaluar(c) {
  const a = mejorCuenta(c);
  const r = puntuar(c, a);
  const joya = r.puntos >= 60 && recomendable(c, r.rent, a) && n(c.restante) >= 200 && (!D.cuentas.length || !!a) && veredicto(c).tipo !== "no";
  return { ...c, cuentaSug: a, ...r, joya };
}

// ---------- Actualizar ----------
// Con sesión iniciada se le pide la lectura al servidor 24 h (sirve en el Mac y en el iPhone).
// Sin sesión, o si el servidor falla, el Mac lee Whop y Vyro él mismo.
const servidorRadar = () => !!(window.nube && nube.correo());

async function actualizarRadar(silencioso = false) {
  const local = !!window.estudio.radar;
  if (radarLeyendo) return;
  if (!local && !servidorRadar()) return aviso("Entra con tu cuenta en Ajustes → Sincronización para actualizar el radar desde aquí");
  radarLeyendo = true;
  const progreso = (t) => {
    const el = document.getElementById("radar-progreso");
    if (el) el.textContent = t;
  };
  if (local && window.estudio.alProgresoRadar) window.estudio.alProgresoRadar(progreso);
  if (seccion === "radar") vistaRadar();
  try {
    let r = null;
    if (servidorRadar()) {
      progreso("El servidor está leyendo Whop y Vyro (unos 20 segundos)…");
      try {
        await nube.funcion("radar", {});
        r = await nube.radarServidor();
      } catch (e) {
        if (!local) throw e;
      }
    }
    if (!r && local) r = await window.estudio.radar();
    procesarRadar(r, silencioso);
  } catch (e) {
    aviso("No se ha podido actualizar el radar: " + e.message);
  } finally {
    radarLeyendo = false;
    pintarMenu();
    if (seccion === "radar") vistaRadar();
  }
}

// Recoge la última lectura del servidor si es más nueva que la que hay (al abrir la app y tras cada sincronización)
async function traerRadarServidor() {
  if (!servidorRadar() || radarLeyendo) return;
  try {
    const r = await nube.radarServidor();
    if (!r?.actualizado || !r.items?.length || (radar().actualizado && r.actualizado <= radar().actualizado)) return;
    procesarRadar(r, true);
    pintarMenu();
    if (seccion === "radar" || seccion === "panel" || seccion === "campanas") ir(seccion);
  } catch {}
}

// Guarda una lectura (del servidor o del Mac) y aplica el piloto automático
function procesarRadar(r, silencioso) {
  const R = radar();
  const antes = R.actualizado;
  R.vistos ||= {};
  r.items.forEach((c) => (R.vistos[c.id] ||= r.actualizado));
  // Se guardan todas las del idioma elegido y, del resto, las mejores (para no hacer pesada la sincronización)
  const evaluados = r.items.map(evaluar).sort((a, b) => b.puntos - a.puntos);
  // Se guardan todas las del idioma del Radar, las de otros idiomas de tus cuentas que encajan con ellas (hasta 80) y, del resto, las mejores
  const deCuentas = evaluados.filter((c) => c.idioma !== idiomaObjetivo() && D.cuentas.some((a) => idiomasCuenta(a).includes(c.idioma) && encaje(c, a) > 0)).slice(0, 80);
  const propias = [...evaluados.filter((c) => c.idioma === idiomaObjetivo()), ...deCuentas];
  const resto = evaluados.filter((c) => !propias.includes(c)).slice(0, Math.max(0, RADAR_MAX - propias.length));
  R.items = [...propias, ...resto].map(({ cuentaSug, puntos, motivos, joya, rent, ...c }) => c);
  R.anterior = antes;
  R.actualizado = r.actualizado;
  R.errores = r.errores || [];
  R.total = r.items.length;
  // Limpia de «vistos» las que ya no existen
  const ids = new Set(r.items.map((c) => c.id));
  Object.keys(R.vistos).forEach((k) => ids.has(k) || delete R.vistos[k]);
  sincronizarCampanasDesdeRadar(r.items);
  const cambios = pilotoAutomatico(r.items);
  guardar();
  if (cambios.length) {
    aviso(`Piloto automático: ${cambios.length} cambio(s) en tus campañas. Míralos en el Radar.`);
    // En el Mac, además, aviso del sistema (en el iPhone llega el aviso del servidor)
    if (window.estudio.radar && "Notification" in window) new Notification("Piloto automático", { body: cambios.slice(0, 3).join("\n") });
  } else if (!silencioso || R.errores.length) aviso(R.errores.length ? "Radar actualizado con avisos: " + R.errores.join(" · ") : `Radar actualizado: ${r.items.length} campañas`);
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
  const puede = esMac || servidorRadar();
  acciones(puede ? [["radar-act", radarLeyendo ? "Leyendo…" : "↻ Actualizar ahora", "prim"]] : []);
  if (puede) $("#radar-act").onclick = () => actualizarRadar();
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
      // Lo que la campaña ya ha pagado de media a cada clipper (dato real de Whop; Vyro no lo publica y va al final)
      if (f.orden === "dinero") return (b.medioPorClipper ?? -1) - (a.medioPorClipper ?? -1);
      if (f.orden === "porclip") return (b.rent.porClip ?? -1) - (a.rent.porClip ?? -1);
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
        servidorRadar() ? "El servidor lo lee solo cada 3 horas, aunque el Mac esté apagado." : esMac ? "Se actualiza solo cada 6 horas mientras la app está abierta." : "Entra con tu cuenta en Ajustes para que se actualice solo."
      }</p>${R.errores?.length ? `<div class="tarjeta" style="border-color:var(--ambar)">⚠ ${esc(R.errores.join(" · "))}</div>` : ""}${
        servidorRadar() && Date.now() - Date.parse(R.actualizado) > 7 * 36e5
          ? `<div class="tarjeta" style="border-color:var(--ambar)">⚠ La última lectura es de hace ${Math.round((Date.now() - Date.parse(R.actualizado)) / 36e5)} horas y el servidor lee cada 3. Pulsa <b>Actualizar ahora</b>; si sigue igual, avísame.</div>`
          : ""
      }`
    : `<div class="vacio">${puede ? "Pulsa <b>Actualizar ahora</b> para leer las campañas reales de Whop y Vyro." : "Entra con tu cuenta en <b>Ajustes → Sincronización</b>: el servidor lee Whop y Vyro cada 3 horas y aquí aparecerán las campañas."}</div>`;

  $("#contenido").innerHTML = `
    ${cabecera}
    <p class="peq" id="radar-progreso">${radarLeyendo ? "Leyendo…" : ""}</p>
    ${
      R.items.length
        ? `<div class="rejilla kpis">
      <div class="kpi"><div class="et">En ${IDIOMAS[idiomaObjetivo()]}</div><div class="val">${enIdioma.length}</div><div class="nota">campañas de clipping con TikTok</div></div>
      <div class="kpi"><div class="et">Joyas</div><div class="val">${joyas.length}</div><div class="nota">60+ de rentabilidad, tu idioma y con tiempo para cobrar</div></div>
      <div class="kpi"><div class="et">Nuevas</div><div class="val">${nuevas.length}</div><div class="nota">desde la lectura anterior</div></div>
      <div class="kpi"><div class="et">Mejor tarifa (${IDIOMAS[idiomaObjetivo()]})</div><div class="val">${enIdioma.length ? Math.max(...enIdioma.map((c) => c.tarifa)).toFixed(2) + " $" : "—"}</div><div class="nota">por cada 1.000 vistas en TikTok</div></div>
    </div>
    ${tarjetasPorCuenta(todos)}
    <h2>Piloto automático</h2>
    <div class="rejilla dos">
      <div class="tarjeta">
        <label style="flex-direction:row;align-items:center;gap:8px;color:var(--texto);font-size:14px"><input type="checkbox" id="r-piloto" ${D.ajustes.piloto === false ? "" : "checked"}/> <b>Cambiar mis campañas solo</b></label>
        <p class="peq">En cada lectura del radar (Whop y Vyro): pasa a <b>Terminada</b> la que se acaba o ya no aparece y a <b>Pausada</b> la que se hunde o casi no deja dinero por clipper (solo en las campañas a las que te has unido), y te <b>propone</b> hasta 5 joyas nuevas que encajen con tus cuentas. Las propuestas salen aparte en Campañas: unirte lo haces tú y lo que descartes no vuelve.</p>
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
      <select id="r-orden">${opciones([["puntos", "Más rentable (recomendado)"], ["porclip", "Más dinero por clip aprobado"], ["dinero", "Más dinero ha pagado a cada clipper"], ["tarifa", "Mejor tarifa"], ["restante", "Más presupuesto"], ["nuevas", "Más nuevas"], ["fin", "Terminan antes"]], f.orden)}</select>
      <select id="r-veredicto">${opciones([["si", "Renta"], ["duda", "Dudosa"], ["nueva", "Nueva (sin datos)"], ["no", "No renta"], ["sindatos", "Sin datos (Vyro)"]], f.veredicto, "Cualquier veredicto")}</select>
      <label style="flex-direction:row;align-items:center;gap:6px;color:var(--texto)"><input type="checkbox" id="r-joyas" ${f.soloJoyas ? "checked" : ""}/> Solo joyas</label>
    </div>
    ${f.orden === "dinero" ? `<div class="caja cian peq" style="margin:8px 0">Ordenadas por lo que cada campaña <b>ya ha pagado de media a cada clipper</b> (dato real que publica Whop; Vyro no lo publica). Ojo: es lo que han ganado clippers con cuentas ya hechas. Con cuentas nuevas, mira también <b>«Cobras desde»</b>: las que piden muchas vistas por clip pagan mucho a quien llega, pero a una cuenta nueva le cuesta llegar.</div>` : ""}
    <p class="peq">${lista.length} campañas${R.items.length < (R.total || 0) ? ` (se guardan todas las de tu idioma y las ${RADAR_MAX} mejores del resto)` : ""}.</p>
    <div class="radar-lista">${lista.slice(0, 80).map((c) => tarjetaCampanaRadar(c, nuevo(c))).join("")}</div>
    ${lista.length > 80 ? `<p class="peq">Mostrando las 80 primeras. Usa los filtros para afinar.</p>` : ""}
    <details class="plegable"><summary>Cómo se puntúa y de dónde sale cada dato</summary>
    <div class="tarjeta peq"><b>Rentabilidad de 0 a 100</b>, solo con datos reales: <b>dinero que ha cobrado de verdad cada clip aprobado</b> (presupuesto gastado ÷ clips aprobados, hasta 30), <b>si puedes cobrar</b> (con las vistas medias de tus clips en cuanto tienes 5; si la cuenta es nueva, lo bajo que sea el mínimo de vistas, hasta 20), <b>tiempo hasta que se quede sin dinero</b> a su ritmo de gasto (hasta 15), <b>dinero que queda por clipper</b> (hasta 15), <b>tendencia</b> de sus vistas (hasta 10) y <b>tu idioma y el nicho de la cuenta</b> (hasta 10). Restan: no pagar en TikTok, pedir público de otro país (México, Canadá, EE. UU.…), quedarse sin dinero en menos de ${DIAS_MINIMOS} días, que los datos digan que no renta, tener que solicitarla o estar bloqueada.<br><br>
    <b>Joya</b> = 60 o más, en tu idioma, que paga en TikTok, sin pedir público de otro país, con 200 $ o más y al menos ${DIAS_MINIMOS} días de dinero, sin apuestas, cripto ni política. Las que exigen página dedicada solo se proponen para la cuenta que les asignes en su ficha (Campañas).<br><br>
    <b>De dónde sale cada dato:</b> tarifa, presupuesto, clippers, mínimo y máximo por clip y solicitud son los que publica cada plataforma. En Vyro, el idioma y la fecha de fin también son oficiales. En Whop el idioma se <b>detecta por el texto</b> de la campaña y la fecha de fin es una <b>estimación</b> según lo rápido que gasta su presupuesto. Las reglas completas (duración, país del público, menciones) solo se ven dentro de cada campaña: léelas antes de unirte.</div></details>`
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

// Línea corta con lo que importa de verdad de una campaña: dinero real por clip, cuándo se acaba, mínimo y competencia
function lineaRentabilidad(c, R = rentabilidad(c)) {
  return [
    R.porClip != null ? `<b>${R.porClip.toFixed(2)} $</b> por clip aprobado` : `${c.tarifa.toFixed(2)} $/1.000 (sin datos de pago aún)`,
    R.diasVida != null ? `se agota en ~${R.diasVida > 365 ? "+365" : fmtNum(R.diasVida)} días` : "",
    c.minVistas ? `cobra desde ${fmtCorto(c.minVistas)} vistas` : "",
    c.clippers != null ? `${fmtNum(c.clippers)} clippers` : "",
  ]
    .filter(Boolean)
    .join(" · ");
}

// Las mejores para cada cuenta (POR_CUENTA), ordenadas por lo que le pueden dar a esa cuenta (con sus vistas, si ya tiene clips).
// Las campañas que exigen página dedicada solo salen en la cuenta que les asignes en su ficha.
function tarjetasPorCuenta(todos) {
  if (!D.cuentas.length)
    return `<div class="tarjeta" style="margin-top:14px">Añade tus cuentas en <b>Cuentas</b> (con su nicho y, si quieres, palabras clave) y aquí verás las mejores campañas para cada una.</div>`;
  return `<h2>Lo mejor para cada cuenta</h2>
  <p class="peq" style="margin-top:-6px">Ordenado por <b>rentabilidad real</b>: lo que ha cobrado cada clip aprobado, si tus clips llegan al mínimo, cuánto le queda de presupuesto y la competencia. Solo campañas en los idiomas de cada cuenta (en su ficha), que pagan en TikTok, sin pedir público de otro país, que no salen como «No renta» y con al menos ${DIAS_MINIMOS} días de dinero.</p>
  <div class="rejilla dos">${D.cuentas
    .map((a) => {
      const claves = clavesCuenta(a);
      const vc = vistasCuenta(a);
      const top = todos
        .filter((c) => recomendable(c, undefined, a) && veredicto(c).tipo !== "no" && (cuentaAsignada(c)?.id === a.id || (encaje(c, a) > 0 && dedicada(c) !== "si" && !cuentaAsignada(c))))
        .map((c) => ({ ...c, ...puntuar(c, a) }))
        .sort((x, y) => y.puntos - x.puntos)
        .slice(0, POR_CUENTA);
      return `<div class="tarjeta"><div><b>${esc(a.usuario)}</b> <span class="peq">· ${esc(a.nicho || "sin nicho")} · ${idiomasCuenta(a).map((x) => IDIOMAS[x] || x).join(" e ")}</span></div>
        <div class="peq" style="margin:2px 0 6px">${vc != null ? `Tus clips: ${fmtNum(vc)} vistas de media` : "Cuenta nueva: se priorizan las que cobran con pocas vistas"}</div>
        ${
          !claves.length && !todos.some((c) => cuentaAsignada(c)?.id === a.id)
            ? `<p class="peq">Ponle un nicho o palabras clave en Cuentas para buscarle campañas.</p>`
            : top.length
            ? top
                .map((c) => {
                  const ded = dedicada(c);
                  return `<div class="radar-mini"><span class="radar-p ${c.puntos >= 60 ? "alta" : ""}" style="--p:${c.puntos}">${c.puntos}</span><div style="flex:1;min-width:0"><div class="radar-mini-t">${esc(c.nombre)}</div><div class="peq">${c.plat} · ${lineaRentabilidad(c, c.rent)}</div>${
                    ded ? `<div class="peq" style="color:var(--ambar)">${ded === "si" ? "Exige página dedicada" : "Puede exigir página dedicada: mira sus reglas"}</div>` : ""
                  }</div><button class="btn peq" data-informe="${c.id}">Ver</button></div>`;
                })
                .join("")
            : `<p class="peq">Ahora mismo no hay campañas en ${idiomasCuenta(a).map((x) => IDIOMAS[x] || x).join(" ni en ")} que encajen con esta cuenta y le den tiempo a cobrar.</p>`
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
      <span class="radar-p ${c.puntos >= 65 ? "alta" : ""}" style="--p:${c.puntos}" title="Puntuación">${c.puntos}</span>
      <div style="flex:1;min-width:0">
        <div class="radar-t">${c.joya ? "💎 " : ""}${esc(c.nombre)}</div>
        ${(() => { const v = veredicto(c); return `<div style="margin-top:4px"><span class="chip ${COLOR_VEREDICTO[v.tipo]}">${v.etiqueta}</span> <span class="peq">${esc(v.motivos[0] || "")}</span></div>`; })()}
        <div class="peq">${esc(c.org)}</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px">
          <span class="chip ${c.plat === "Whop" ? "rosa" : "cian"}">${c.plat}</span>
          <span class="chip ${c.idioma === idiomaObjetivo() ? "verde" : ""}" title="${c.idiomaFuente === "oficial" ? "Idioma oficial de la campaña" : "Idioma detectado por el texto de la campaña"}">${IDIOMAS[c.idioma] || c.idioma}${c.idiomaFuente === "oficial" ? "" : " *"}</span>
          ${esNueva ? `<span class="chip ambar">Nueva</span>` : ""}
          ${c.solicitud ? `<span class="chip">Hay que solicitarla</span>` : ""}
          ${c.rent && !c.rent.tiktok ? `<span class="chip rosa">No paga en TikTok</span>` : ""}
          ${publicoPais(c) ? `<span class="chip rosa">Pide público de ${publicoPais(c)}</span>` : ""}
          ${dedicada(c) ? `<span class="chip ambar">${dedicada(c) === "si" ? "Exige página dedicada" : "Puede exigir página dedicada"}</span>` : ""}
          ${cuentaAsignada(c) ? `<span class="chip verde">Para ${esc(cuentaAsignada(c).usuario)}</span>` : ""}
          ${c.bloqueada ? `<span class="chip">Bloqueada</span>` : ""}
          ${riesgo ? `<span class="chip rosa">Apuestas / cripto</span>` : ""}
          ${POLITICA.test(textoCampana(c)) ? `<span class="chip rosa" title="TikTok no permite cobrar por contenido político">Política: TikTok no deja cobrar</span>` : ""}
          ${(c.cats || []).slice(0, 2).map((x) => `<span class="chip">${esc(x)}</span>`).join("")}
        </div>
      </div>
    </div>
    <div class="radar-datos">
      <div><span>Tarifa TikTok</span><b>${c.tarifa.toFixed(2)} $</b><small>por 1.000 vistas</small></div>
      <div><span>Queda</span><b>${fmtNum(c.restante)} $</b><small>${gastado} % gastado</small></div>
      <div><span>Clippers</span><b>${c.clippers == null ? "—" : fmtNum(c.clippers)}</b><small>${c.clippers == null ? "Vyro no lo publica" : "trabajando en ella"}</small></div>
      <div><span>Por clip aprobado</span><b>${c.rent?.porClip == null ? "—" : c.rent.porClip.toFixed(2) + " $"}</b><small>${c.rent?.porClip == null ? (c.plat === "Vyro" ? "Vyro no lo publica" : "aún sin datos") : "lo que ha cobrado de media"}</small></div>
      <div><span>Ha pagado</span><b>${c.medioPorClipper == null ? "—" : fmtNum(c.medioPorClipper) + " $"}</b><small>${c.medioPorClipper == null ? "Vyro no lo publica" : "de media a cada clipper"}</small></div>
      <div><span>Cobras desde</span><b>${c.minVistas ? fmtCorto(c.minVistas) : "—"}</b><small>vistas por clip${c.maxPago ? ` · máx. ${fmtNum(c.maxPago)} $` : ""}</small></div>
      <div><span>Se agota en</span><b>${c.rent?.diasVida == null ? "—" : c.rent.diasVida > 365 ? "+1 año" : "~" + fmtNum(c.rent.diasVida) + " días"}</b><small>${c.rent?.diasVida == null ? "sin datos" : c.fin && !c.finEstimado ? "a su ritmo de gasto o su fecha de fin" : "a su ritmo de gasto"}</small></div>
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
  // Si dice haber pagado más vistas de las que tiene, el dato es raro: no se usa
  const pctBruto = c.vistas ? c.vistasPagadas / c.vistas : null;
  const pctPagadas = pctBruto != null && pctBruto <= 1 ? pctBruto : null;
  const R = rentabilidad(c);
  // Lo que ha cobrado de verdad cada clip aprobado (presupuesto gastado ÷ clips aprobados); la media de vistas se infla con los virales
  const porClip = R.porClip ?? clipMedio;
  const caida = c.pico7 > 0 && c.ult7 < 0.15 * c.pico7 && c.prev7 > c.ult7;
  const aprob14 = (c.serieAprob || []).slice(-14).reduce((a, b) => a + b, 0);
  // Caída con clips nuevos entrando = el público se ha cansado (saturada). Sin clips nuevos = parada (nadie publica).
  const parada = caida && !!c.serieAprob && aprob14 === 0;
  const hundida = caida && !parada;
  const creciendo = c.prev7 > 0 && c.ult7 > c.prev7 * 1.2;
  const porClipper = c.restante / ((c.clippers || 0) + 1);
  motivos.push(`Un clip aprobado saca ${fmtNum(vpc)} vistas de media${min ? ` (cobras desde ${fmtNum(min)})` : ""}`);
  if (R.porClip != null) motivos.push(`Cada clip aprobado ha cobrado ${R.porClip.toFixed(2)} $ de media (${fmtNum(R.gastado)} $ pagados entre ${fmtNum(c.aprobados)} clips)`);
  else motivos.push(clipMedio ? `Un clip medio cobraría ~${clipMedio.toFixed(2)} $` : "Un clip medio no llega al mínimo: cobraría 0 $");
  if (pctPagadas != null) motivos.push(`Se han pagado ${Math.round(pctPagadas * 100)} % de sus vistas`);
  else if (pctBruto != null) motivos.push("Whop da un dato raro de vistas pagadas (más que vistas totales): no se tiene en cuenta");
  if (R.diasVida != null) motivos.push(R.diasVida < DIAS_MINIMOS ? `A su ritmo de gasto se queda sin dinero en ~${Math.max(1, Math.round(R.diasVida))} días` : `Le quedan ~${R.diasVida > 365 ? "más de 365" : fmtNum(R.diasVida)} días de presupuesto a su ritmo de gasto`);
  if (c.medioPorClipper != null) motivos.push(`Cada clipper ha ganado ${c.medioPorClipper.toFixed(2)} $ de media`);
  if (hundida) motivos.push(`Saturada: siguen entrando clips pero sus vistas se han hundido (${fmtNum(c.ult7)} en 7 días frente a ${fmtNum(c.pico7)} en su mejor semana)`);
  else if (parada) motivos.push(`Parada: ningún clip aprobado en 14 días (${fmtNum(c.ult7)} vistas esta semana). Quedan ${fmtNum(c.restante)} $: puede ser una oportunidad o que el contenido ya no tire`);
  else if (creciendo) motivos.push(`Va a más: ${fmtNum(c.ult7)} vistas en 7 días (${fmtNum(c.prev7)} la semana anterior)`);
  motivos.push(`Quedan ${fmtNum(porClipper)} $ por clipper`);
  let tipo = "duda";
  if ((min && vpc < min * 0.8) || hundida || porClipper < 3 || c.restante < 50 || (R.diasVida != null && R.diasVida < 7)) tipo = "no";
  else if (porClip >= 2.5 && (pctPagadas == null || pctPagadas >= 0.4)) tipo = "si";
  const etiqueta = { si: "Renta", duda: "Dudosa", no: "No renta" }[tipo];
  return { tipo, etiqueta, motivos, clipMedio, porClip, pctPagadas, hundida, parada, creciendo };
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
    <div class="peq">${esc(c.org)} · ${c.plat} · ${IDIOMAS[c.idioma] || c.idioma}${c.idiomaFuente === "oficial" ? "" : " (detectado)"} · rentabilidad ${ev.puntos}/100</div>
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
      <div><span>Vistas pagadas</span><b>${c.vistas && c.vistasPagadas <= c.vistas ? Math.round((c.vistasPagadas / c.vistas) * 100) + " %" : "—"}</b><small>${c.vistas && c.vistasPagadas > c.vistas ? "dato raro de Whop: no se usa" : `${fmtCorto(c.vistasPagadas)} de ${fmtCorto(c.vistas)}`}</small></div>
      <div><span>Por clip aprobado</span><b>${ev.rent.porClip == null ? "—" : ev.rent.porClip.toFixed(2) + " $"}</b><small>${ev.rent.porClip == null ? "menos de 10 clips aprobados" : "presupuesto gastado ÷ clips"}</small></div>
      <div><span>Se agota en</span><b>${ev.rent.diasVida == null ? "—" : ev.rent.diasVida > 365 ? "+1 año" : "~" + fmtNum(ev.rent.diasVida) + " días"}</b><small>a su ritmo de gasto</small></div>
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
    <p class="peq">Con las condiciones de la campaña (mínimo, máximo y tarifa en TikTok), pasado a euros con el ${esc(textoCambio())}.</p>
    <div id="inf-ia"></div>
    <div class="modal-pie"><div><a class="btn" href="${esc(c.enlace)}" target="_blank">Abrir en ${c.plat} ↗</a> ${window.ia ? `<button class="btn" id="inf-ia-btn">✨ Analizar con IA</button>` : ""}</div>
    <div><button class="btn" id="m-cancelar">Cerrar</button> ${tienes ? "" : `<button class="btn prim" id="inf-anadir">+ Añadir a mis campañas</button>`}</div></div>`,
    (caja) => {
      const calc = () => {
        const x = n(caja.querySelector("#inf-vistas").value);
        let g = x < (c.minVistas || 0) ? 0 : (x / 1000) * c.tarifa;
        if (c.maxPago) g = Math.min(g, c.maxPago);
        const eur = g * (cambioUsd() || 1) * (1 - n(D.ajustes.comision) / 100);
        caja.querySelector("#inf-res").textContent = x < (c.minVistas || 0) ? `0 $ (no llega al mínimo de ${fmtNum(c.minVistas)})` : `${g.toFixed(2)} $${cambioUsd() ? ` ≈ ${fmtEur(eur)}${n(D.ajustes.comision) ? " (ya sin tu comisión)" : ""}` : ""}`;
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
  // Si de una plataforma no ha llegado ninguna campaña es un fallo de lectura, no que se hayan acabado todas
  const leidas = new Set(itemsTodos.map((c) => c.plat));
  D.campanas.forEach((k) => {
    if (!k.radarId || !["activa", "porunirte"].includes(k.estado)) return;
    const c = porId[k.radarId];
    if (!c && !leidas.has(k.plataforma)) return;
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
  // Joyas nuevas: hasta 5 por lectura, las mejores primero. Sin cuentas con nicho no se propone nada (no sabe qué te encaja).
  const descartadas = radar().descartadas || {};
  const conNicho = D.cuentas.filter((a) => clavesCuenta(a).length);
  const nuevas = (conNicho.length ? itemsTodos : [])
    .map(evaluar)
    .filter((c) => c.joya && c.cuentaSug && veredicto(c).tipo !== "no" && !descartadas[c.id] && !D.campanas.some((k) => k.radarId === c.id))
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
