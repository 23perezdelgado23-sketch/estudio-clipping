"use strict";
// Estudio Clipping · apartado Estrategia (solo clipping con permiso).
// Investigado en octubre de 2026. Cada dato indica su fuente y su fiabilidad:
// «oficial» = condiciones o ayuda de la propia plataforma; «estudio» = estudio con datos;
// «sector» = webs de empresas del sector (orientativo); «sin confirmar» = no se pudo verificar.

// Las 5 cuentas (4.18, 02/11/2026): salen de leer las 444 campañas de Whop y Vyro y medir lo que pagan de verdad
// (dinero gastado ÷ clips aprobados), quitando las que piden público de otro país, no pagan en TikTok o son de apuestas.
// Criterio de Eduardo: los nichos que más rentan y que funcionan con público de España.
// Hasta la 4.17 eran Dinero, Música, Textos, Negocios y Creadores (estudio del 15–18/10, campañas en español que se apagaron).
// Los datos de cada nicho son del Radar del 02/11/2026; las campañas cambian cada semana: lo vigente está en el Radar.
const NICHOS_RECOMENDADOS = [
  {
    id: "dinero",
    nombre: "Dinero, trading e inversión",
    foto: "Una gráfica que sube, en blanco sobre verde. Diseño propio: sin caras ni logos de nadie.",
    claves: "trading, trader, invers, dinero, finanzas, mentalidad, bolsa, podcast, pódcast, ceo, emprend, negocio, network marketing",
    idiomas: "es",
    color: "cian",
    porque:
      "Es la cuenta en español: la que mejor entiende tu público de España. Las campañas en español son pocas y pagan menos por clip que las de música, pero Daniel Curto vuelve a ir a más y cobra desde 1.000 vistas. Desde la 4.18 recoge también las de negocios y pódcast en español.",
    datos: [
      ["Campañas en español (02/11)", "Daniel Curto («Renta: va a más») y Matías Matti («No renta: saturada»)"],
      ["Lo que paga de verdad", "Daniel Curto: unos 2,50 $ por clip aprobado de media, con 53 clippers"],
      ["Para cobrar un clip", "≈1.000 vistas"],
      ["Ojo", "Daniel Curto exige página dedicada solo a él: esta cuenta, tal como está, no vale para esa campaña"],
    ],
    clips: ["Una frase sobre dinero o mentalidad que se entiende sola", "Una explicación corta de un concepto (qué es el interés compuesto, por ejemplo)", "Su historia: de dónde empezó y cómo le fue", "Un error típico que señala él"],
    ganchos: ["Esto es lo que nadie te explica del dinero", "Así empezó", "El error que comete casi todo el mundo"],
    herramientas: "Subtítulos con las cifras y palabras clave resaltadas. Clips cortos: lo que importa es la frase.",
    ojo: "No des tú consejos de inversión ni prometas ganancias en la descripción ni en la biografía: corta lo que dice el creador y nada más.",
  },
  {
    id: "electronica",
    nombre: "Música electrónica y nightlife (sin cara)",
    foto: "Unos auriculares con una onda de sonido, en blanco sobre morado. Diseño propio: nada de portadas de discos ni fotos de artistas.",
    claves: "edm, house, techno, dance, dj, electronic, electrónica, nightlife, club, rave, festival, trance, ibiza, remix, drop, funk, song, music",
    idiomas: "es,en",
    color: "ambar",
    porque:
      "Es el nicho con más campañas que rentan: la música paga unos 12 $ por clip aprobado de mediana, y no hace falta entender el idioma para engancharse a una canción. La electrónica encaja con el público de España (club, festival, Ibiza) y con lo que tú conoces de la noche.",
    datos: [
      ["Campañas de música (02/11)", "95 encajan con esta cuenta, 57 de ellas joyas; casi todas en inglés"],
      ["Lo que paga de verdad", "Audien «7 Miles High» ≈39 $, ZHU «Call Me Baby» ≈18 $, Bushbaby «Back To Funk» ≈17 $ y Restricted (techno) ≈13 $ por clip aprobado"],
      ["Competencia", "Entre 7 y 17 clippers en las mejores"],
      ["Para cobrar un clip", "≈1.000 vistas en la mayoría"],
      ["Cómo son", "Campañas de 1–2 meses y 600–5.000 $: hay que ir saltando a las nuevas (el piloto te las propone)"],
    ],
    clips: ["El drop o el estribillo de la canción oficial, en los 2 primeros segundos", "Imágenes que pide cada campaña (fiesta, club, coches, transiciones)", "Siempre con el sonido oficial de TikTok que indica la campaña"],
    ganchos: ["Espera al drop", "La canción de este finde", "Ponla a todo volumen"],
    herramientas: "Un clip = un momento de la canción oficial (el drop) con imágenes que encajen: fiesta, club, coches, F1, escenas. Hook en 2 segundos. Sin cara.",
    ojo: "Usa solo el material que da cada campaña (su Drive) o fondos tuyos o de bancos con licencia. Si una campaña pide escenas de series, F1 o pelis y no te las da, no las cojas de internet: no tienes derecho a usarlas.",
  },
  {
    id: "futbol",
    nombre: "Fútbol y deporte (en español)",
    foto: "Un balón de fútbol, en blanco sobre verde césped. Diseño propio: sin escudos ni jugadores.",
    claves: "football, fútbol, futbol, soccer, laliga, champions, fotmob, sports, deporte, f1, nba, ufc, boxing",
    idiomas: "es,en",
    color: "verde",
    porque:
      "Es el nicho con más público en España y tiene la campaña en español mejor pagada de hoy: FotMob Spain, pensada justo para público de España. Además, varias campañas de música piden edits de deporte y entran también aquí.",
    datos: [
      ["Campañas (02/11)", "FotMob Spain (en español, para público de España) y 12 más de deporte en inglés"],
      ["Lo que paga de verdad", "FotMob Spain: ≈54 $ por clip aprobado, con solo 3 clippers y 4.247 $ por repartir"],
      ["Ojo con la fecha", "FotMob Spain termina el 14/11: si quieres entrar, esta cuenta va la segunda. FotMob hace campañas por países (hoy también Alemania): es probable que repita"],
      ["Para cobrar un clip", "≈2.000 vistas en FotMob Spain"],
    ],
    clips: ["Lo que pide FotMob: la app en pantalla con datos reales (notas de jugadores, resultados, estadísticas)", "Un dato del partido de ayer que sorprende, enseñado en la app", "La previa de un partido grande con las estadísticas de la app"],
    ganchos: ["Mira la nota que le ha puesto FotMob", "Este dato no lo sabía nadie", "El partido de hoy en 3 datos"],
    herramientas: "Graba la pantalla del iPhone con la app que da la campaña y explícalo con texto en pantalla y subtítulos. Ritmo rápido.",
    ojo: "Nunca imágenes de partidos de la tele: son de LaLiga, la UEFA y las cadenas, y TikTok las borra. Usa solo el material que te da cada campaña. Cuidado con las campañas de apuestas deportivas: la app las marca y no las recomienda.",
  },
  {
    id: "pop",
    nombre: "Música pop, indie y edits de cine (sin cara)",
    foto: "Una claqueta de cine con una nota musical, en blanco sobre rosa. Diseño propio: sin fotos de artistas ni carteles de películas.",
    claves: "pop, indie, rock, band, country music, acoustic, soul, singer, movie, film, cine, music video, videoclip, anime, trailer, song, music",
    idiomas: "es,en",
    color: "rosa",
    porque:
      "La segunda cuenta de música, con otro estilo para no competir con la de electrónica: canciones pop, indie, rock y country, videoclips y tráileres de cine. Así cada cuenta tiene su público y no repites canciones entre tus cuentas.",
    datos: [
      ["Campañas (02/11)", "25 encajan con esta cuenta, 12 de ellas joyas; casi todas en inglés"],
      ["Lo que paga de verdad", "Film Reality (app de cine) ≈20 $, Ryan Gosling's Band ≈9 $ y A24 «Slayground» ≈7 $ por clip aprobado"],
      ["Además", "Las canciones generales (Leon Bridges, Ella Langley, Zach Top) valen para las dos cuentas de música: elige en el Radar a cuál va cada una"],
      ["Para cobrar un clip", "≈1.000–2.000 vistas"],
    ],
    clips: ["El estribillo de la canción oficial sobre el videoclip o las escenas que da la campaña", "Un tráiler cortado en su momento más fuerte", "Un texto corto arriba que cuente qué pasa"],
    ganchos: ["Esta canción no sale de mi cabeza", "La escena que lo cambió todo", "Escúchala hasta el final"],
    herramientas: "La canción oficial de la campaña sobre las escenas o el videoclip que dé la campaña. Texto corto arriba que cuente qué pasa.",
    ojo: "Igual que en electrónica: solo el material que da la campaña o fondos con licencia, nunca escenas cogidas de internet.",
  },
  {
    id: "gaming",
    nombre: "Gaming y videojuegos (sin cara)",
    foto: "Un mando de consola, en blanco sobre azul. Diseño propio: sin logos de juegos ni de consolas.",
    claves: "gaming, game, gameplay, gamer, videojuego, fortnite, valorant, minecraft, roblox, call of duty, warzone, gta",
    idiomas: "es,en",
    color: "",
    porque:
      "El gameplay se entiende sin idioma, así que funciona con público de España, y hay campañas grandes y largas (Roblox, Minecraft). Paga menos por clip que la música (≈6 $ de mediana): es la 5.ª cuenta. Call of Duty MW4 ya saca campañas por idioma (francés y árabe): si sale una en español, esta cuenta estará lista.",
    datos: [
      ["Campañas (02/11)", "43 encajan con esta cuenta, 12 de ellas joyas; en inglés"],
      ["Lo que paga de verdad", "HardcoreSMP (Minecraft) ≈17 $, How to God ≈6 $ y Showcase (Roblox) ≈4,50 $ por clip aprobado; Showcase tiene 13.600 $ por repartir"],
      ["Call of Duty", "Las dos en inglés se quedan sin dinero en unos 7 días y la árabe pide público del Golfo: hoy no valen"],
      ["Para cobrar un clip", "≈1.000–2.000 vistas en la mayoría"],
    ],
    clips: ["El momento más fuerte del tráiler o del gameplay oficial, en los 2 primeros segundos", "Una jugada o un fallo que sorprende", "Lo nuevo de un estreno (mapa, arma, modo)"],
    ganchos: ["Nadie esperaba esto", "Lo nuevo de este juego en 20 segundos", "La jugada de la semana"],
    herramientas: "Material oficial de cada campaña (tráiler, gameplay). El momento más fuerte primero y subtítulos en español.",
    ojo: "Algunas campañas son de juegos con premios o apuestas (cajas, «gana dinero jugando»): la app las marca como riesgo. Usa solo el material de la campaña.",
  },
];

const ESTRATEGIA_TABS = [
  ["cobro", "Cómo se cobra"],
  ["nichos", "Las 5 cuentas"],
  ["crear", "Crear y cuidar las cuentas"],
  ["publicar", "Qué publicar"],
  ["horas", "Horas"],
  ["frecuencia", "Cuántos clips"],
  ["promocion", "Promoción pagada"],
  ["ia", "Herramientas de IA"],
  ["fuentes", "Fuentes"],
];
let tabEstrategia = "cobro";

const fuente = (t) => `<div class="peq" style="margin-top:6px">Fuente: ${t}</div>`;
const nota = (txt, tipo = "") => `<div class="caja ${tipo}">${txt}</div>`;
const fiab = (t) =>
  ({
    oficial: '<span class="chip verde">Oficial</span>',
    estudio: '<span class="chip cian">Estudio</span>',
    sector: '<span class="chip ambar">Webs del sector</span>',
    sin: '<span class="chip rosa">Sin confirmar</span>',
  }[t]);

function vistaEstrategia() {
  acciones([]);
  const html = {
    cobro: tabCobro,
    nichos: tabNichos,
    crear: tabCrear,
    publicar: tabPublicar,
    horas: tabHoras,
    frecuencia: tabFrecuencia,
    promocion: tabPromocion,
    ia: tabIA,
    fuentes: tabFuentes,
  }[tabEstrategia]();
  $("#contenido").innerHTML = `
    <div class="pestanas">${ESTRATEGIA_TABS.map(([id, t]) => `<button class="${id === tabEstrategia ? "activo" : ""}" data-tab="${id}">${t}</button>`).join("")}</div>
    <div class="guia">${html}</div>`;
  $("#contenido").querySelectorAll("[data-tab]").forEach((b) => (b.onclick = () => ((tabEstrategia = b.dataset.tab), vistaEstrategia(), ($("#contenido").scrollTop = 0))));
  $("#contenido").querySelectorAll("[data-copiar]").forEach(
    (b) =>
      (b.onclick = async () => {
        try {
          await navigator.clipboard.writeText(b.dataset.copiar);
          aviso("Copiado");
        } catch {
          aviso("No se ha podido copiar: selecciónalo a mano");
        }
      })
  );
  $("#contenido").querySelectorAll("[data-ver-foto]").forEach((b) => (b.onclick = () => verFotoPerfil(cuenta(b.dataset.verFoto))));
  $("#contenido").querySelectorAll("[data-editar-cuenta]").forEach((b) => (b.onclick = () => editarCuenta(cuenta(b.dataset.editarCuenta))));
  const crear = $("#crear-cuentas");
  crear &&
    (crear.onclick = () => {
      const { creadas, actualizadas } = actualizarCuentasRecomendadas();
      aviso(creadas || actualizadas ? `${creadas ? `Creadas ${creadas}` : ""}${creadas && actualizadas ? " y " : ""}${actualizadas ? `actualizadas ${actualizadas}` : ""} cuenta(s), con sus ganchos` : "Las 5 cuentas ya estaban creadas");
      vistaEstrategia();
    });
}

// Nichos de versiones anteriores y en qué nicho nuevo se convierten. Hasta la 4.8 eran 4 con otros nombres;
// en la 4.18 (02/11/2026) Música pasa a Electrónica y las cuentas sin campañas que rentaran (Textos, Creadores y Negocios)
// pasan a Pop y cine, Fútbol y Gaming. Ninguna de esas cuatro estaba creada todavía en TikTok.
const NICHOS_ANTIGUOS = {
  "Creadores hispanos: marca personal y estilo de vida": "futbol",
  "Tendencias y música en español (sin cara)": "electronica",
  "Textos y humor del día a día (sin cara)": "pop",
  "Música y tendencias en español (sin cara)": "electronica",
  "Textos en español: frases y situaciones (sin cara)": "pop",
  "Creadores hispanos: retos, viajes y estilo de vida": "futbol",
  "Negocios y emprendimiento (pódcast y eventos)": "gaming",
};
// Crea las cuentas que falten y pone al día las que se crearon con una versión anterior, sin duplicar ninguna.
// El perfil de cada cuenta (usuario, correo, nombre, biografía y foto) no está en el código, que es público en la web:
// solo vive en los datos de cada usuario (Cuentas). Las cuentas nuevas se crean con el usuario de ejemplo «@…nicho».
// De una cuenta ya existente solo se ponen al día nicho, palabras clave y nota si el usuario era de ejemplo. Lo que hayas escrito tú no se toca.
function actualizarCuentasRecomendadas() {
  let creadas = 0, actualizadas = 0;
  NICHOS_RECOMENDADOS.forEach((ni) => {
    const a = D.cuentas.find((c) => c.nicho === ni.nombre || NICHOS_ANTIGUOS[c.nicho] === ni.id || c.usuario === "@…" + ni.id);
    if (!a) {
      D.cuentas.push({ id: uid(), red: "TikTok", usuario: "@…" + ni.id, nicho: ni.nombre, claves: ni.claves, idiomas: ni.idiomas, estado: "calentando", objetivoDia: 1, notas: ni.herramientas });
      creadas++;
      return;
    }
    const deEjemplo = !a.usuario || a.usuario.startsWith("@…");
    const antes = JSON.stringify(a);
    if (deEjemplo) Object.assign(a, { nicho: ni.nombre, claves: ni.claves, idiomas: ni.idiomas, notas: a.notas || ni.herramientas });
    // Al cambiar de nicho, sus palabras clave e idiomas son las del nicho nuevo (las antiguas llevarían campañas que ya no tocan)
    else if (NICHOS_ANTIGUOS[a.nicho]) {
      Object.assign(a, { nicho: ni.nombre, claves: ni.claves, idiomas: ni.idiomas });
      soltarCampanasQueNoEncajan(a);
    }
    if (!n(a.objetivoDia)) a.objetivoDia = 1;
    if (JSON.stringify(a) !== antes) actualizadas++;
  });
  NICHOS_RECOMENDADOS.forEach((ni) =>
    ni.ganchos.forEach((g) => {
      if (!D.ganchos.some((x) => x.texto === g)) D.ganchos.push({ id: uid(), texto: g, tipo: ni.nombre.split(":")[0], favorito: false });
    })
  );
  if (creadas || actualizadas) guardar();
  return { creadas, actualizadas };
}
// Una cuenta que cambia de nicho deja de llevar las campañas que el piloto le asignó y ya no encajan con ella
// (si no, el Radar le seguiría mandando las del nicho anterior). Las que tienen clips o añadiste tú no se tocan.
function soltarCampanasQueNoEncajan(a) {
  const items = typeof radar === "function" ? radar().items || [] : [];
  D.campanas.forEach((k) => {
    if (k.cuentaSugerida !== a.id || !(k.notas || "").startsWith("Añadida por el piloto automático") || D.clips.some((x) => x.campanaId === k.id)) return;
    const c = items.find((x) => x.id === k.radarId);
    if (c && !encaje(c, a)) delete k.cuentaSugerida;
  });
}
// Al abrir la app (o al llegar datos de otro dispositivo): si quedan cuentas de ejemplo de una versión anterior, se ponen al día solas
function revisarCuentasAntiguas() {
  if (!D.cuentas.some((c) => (c.usuario || "").startsWith("@…") || NICHOS_ANTIGUOS[c.nicho])) return;
  const { creadas, actualizadas } = actualizarCuentasRecomendadas();
  if (creadas || actualizadas) aviso("Tus cuentas se han puesto al día con los 5 nichos nuevos (Estrategia → Las 5 cuentas)");
}

function tabCobro() {
  return `
  <h2 style="margin-top:6px">Cómo se gana dinero con el clipping</h2>
  <p>Solo hay una forma limpia: <b>cortar vídeos de creadores o marcas que te dan permiso y te pagan por las vistas</b>. Lo paga la campaña (o el creador), no TikTok.</p>
  <div class="rejilla dos" style="margin:12px 0">
    <div class="tarjeta"><h3 style="margin-top:0"><span class="chip verde">Vía principal</span> Plataformas de campañas</h3>
      <p>Whop (Content Rewards) y Vyro. Te unes a una campaña, cortas su material, publicas en tu TikTok y envías el enlace. Cobras por cada 1.000 vistas válidas, <b>desde el primer clip aprobado</b> y sin mínimo de seguidores.</p>
      <p class="peq">Paso a paso en el apartado <b>Conseguir vídeos</b>.</p></div>
    <div class="tarjeta"><h3 style="margin-top:0"><span class="chip cian">Vía secundaria</span> Acuerdo directo con un creador</h3>
      <p>Un creador te da permiso por escrito y os ponéis de acuerdo en cuánto y cómo te paga (por vistas, por clip o al mes). Más trabajo de negociar, pero menos competencia.</p>
      <p class="peq">Plantilla del mensaje y registro de permisos en <b>Conseguir vídeos</b>.</p></div>
  </div>

  ${nota(
    "<b>Lo que NO da dinero:</b><br>• <b>Cortar vídeos sin permiso</b> (series, fútbol, pelis, otros creadores): infringe derechos de autor, TikTok puede borrar el vídeo o penalizar la cuenta, y nadie te lo va a pagar.<br>• <b>Esperar a que TikTok te pague por los clips:</b> el programa de TikTok (Creator Rewards) solo paga por contenido <b>original, grabado y producido por ti</b>. Los clips de otros no cuentan, aunque tengas permiso.",
    ""
  )}
  ${fuente("ayuda oficial de TikTok sobre Creator Rewards.")}

  <h3>Las normas que hay que cumplir para cobrar</h3>
  <table><thead><tr><th>Norma</th><th>Qué significa</th><th>Fuente</th></tr></thead><tbody>
    <tr><td>Indicar que es publicidad</td><td>En Whop: hashtag tipo <b>#Sponsored</b> o <b>#[Marca]Ad</b> que se vea <b>sin pulsar «más»</b>. En Vyro también es obligatorio; si no lo haces te pueden echar y pedir que devuelvas lo cobrado.</td><td>${fiab("oficial")}</td></tr>
    <tr><td>Solo vistas reales</td><td>Prohibido comprar seguidores, vistas o interacción, usar bots, o dar premios o pagos a la gente por ver el vídeo.</td><td>${fiab("oficial")}</td></tr>
    <tr><td>Nada de promoción pagada</td><td>Vyro prohíbe anuncios y «boosted posts» sin permiso del cliente. Whop excluye las vistas con «incentivos pagados».</td><td>${fiab("oficial")}</td></tr>
    <tr><td>Clips únicos</td><td>Whop prohíbe entregas duplicadas: no envíes el mismo clip dos veces ni lo subas a varias cuentas.</td><td>${fiab("oficial")}</td></tr>
    <tr><td>Solo material de la campaña</td><td>En Whop todo tiene que ser original salvo lo que te da la marca. Los fondos que añadas, tuyos o con licencia libre.</td><td>${fiab("oficial")}</td></tr>
    <tr><td>La marca te puede banear</td><td>De su campaña o de todas las suyas, si un clip no cumple sus criterios o sospecha fraude.</td><td>${fiab("oficial")}</td></tr>
    <tr><td>Borrar si te lo piden</td><td>Si la marca o Whop te piden quitar un clip, hay que hacerlo enseguida, incluso con la campaña terminada.</td><td>${fiab("oficial")}</td></tr>
    <tr><td>Dentro de fecha y presupuesto</td><td>Lo publicado después de la fecha de fin o con el máximo ya pagado se rechaza. Vigilarlo es cosa tuya.</td><td>${fiab("oficial")}</td></tr>
    <tr><td>Una cuenta por persona</td><td>Vyro: una cuenta por persona o correo. Si abres varias te pueden cerrar y quitar los pagos. Tus 5 cuentas de TikTok se conectan dentro de esa única cuenta.</td><td>${fiab("oficial")}</td></tr>
    <tr><td>Mayor de 18 años</td><td>Obligatorio en Whop y en Vyro.</td><td>${fiab("oficial")}</td></tr>
    <tr><td>Si TikTok borra el clip</td><td>Vyro: pierdes lo de ese clip y pueden reclamar lo ya pagado.</td><td>${fiab("oficial")}</td></tr>
    <tr><td>Impuestos</td><td>Los dos dicen que los impuestos son cosa tuya y pagan sin retener nada. En España hay que declararlo: consulta con una gestoría.</td><td>${fiab("oficial")}</td></tr>
  </tbody></table>
  ${fuente("condiciones oficiales de Content Rewards de Whop y condiciones oficiales para clippers de Vyro (consultadas el 15/10/2026).")}

  <h3>Cuánto se cobra</h3>
  <ul>
    <li>Cada campaña pone su tarifa. Las webs del sector hablan de <b>0,50–3 $ por cada 1.000 vistas</b> como lo normal (más en finanzas). Vyro pone de ejemplo: 100.000 vistas a 1 $ = 100 $.</li>
    <li>Cada campaña fija un <b>mínimo de vistas</b> por clip (por debajo no cobras) y a veces un <b>máximo por clip</b>.</li>
    <li>Cuando se acaba el <b>presupuesto</b> de la campaña, deja de pagar.</li>
    <li>La comisión del 10 % de Whop la paga la marca, no tú (condiciones oficiales). Algunas webs dicen lo contrario: lo que vale es lo que veas en tu cuenta.</li>
  </ul>
  ${fuente("Vyro (web oficial), condiciones de Whop y webs del sector (ClipAffiliates, OpenClip, 2026).")}`;
}

// Las 5 campañas que más rentan para empezar (18/10/2026, con la puntuación y el veredicto de la propia app).
// Whop estaba caído ese día: son los datos de su última lectura buena (18/10, 8:07).
// Las mejores campañas de ahora mismo, en directo desde el Radar (antes era una lista fija del 18/10 que se quedaba vieja)
function mejoresAhora() {
  const R = typeof radar === "function" ? radar() : null;
  if (!R?.items?.length) return `<p class="peq">Abre el <b>Radar</b> y pulsa «Actualizar ahora» para ver aquí las mejores campañas de hoy.</p>`;
  const top = R.items
    .map(evaluar)
    .filter((c) => c.cuentaSug && recomendable(c, c.rent, c.cuentaSug) && veredicto(c).tipo !== "no")
    .sort((a, b) => b.puntos - a.puntos)
    .slice(0, 6);
  if (!top.length) return `<p class="peq">Ahora mismo ninguna campaña encaja con tus cuentas y les da tiempo a cobrar. Mira el Radar en unos días.</p>`;
  return `<ol style="padding-left:20px">${top
    .map((c) => {
      const v = veredicto(c);
      return `<li style="margin:8px 0"><b>${esc(c.nombre)}</b> <span class="chip ${COLOR_VEREDICTO[v.tipo]}">${esc(v.etiqueta)} · ${c.puntos}</span> <span class="chip">${esc(c.cuentaSug.usuario)}</span><div class="peq" style="margin-top:4px">${lineaRentabilidad(c, c.rent)}</div></li>`;
    })
    .join("")}</ol><p class="peq">En directo del Radar (lectura del ${new Date(R.actualizado).toLocaleString("es-ES", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}). Antes de unirte, lee sus reglas: país del público, página dedicada y si permiten herramientas de IA.</p>`;
}

function tabNichos() {
  const copiar = (t) => `<button class="btn peq" data-copiar="${esc(t)}" title="Copiar">Copiar</button>`;
  return `
  <h2 style="margin-top:6px">Las 5 cuentas: un nicho de clipping cada una</h2>
  <p>Estos 5 nichos salen de leer <b>las 444 campañas de Whop y Vyro</b> (02/11/2026) y medir lo que pagan de verdad (dinero gastado ÷ clips aprobados), no de webs del sector. Criterio: <b>los que más rentan y funcionan con público de España</b>: que paguen en TikTok, no pidan público de otro país, no sean de apuestas y se entiendan sin idioma (música, deporte, videojuegos) o estén en español.</p>
  <table style="margin:8px 0 12px"><thead><tr><th>Nicho</th><th class="num">Campañas que rentan y no piden público de otro país</th><th class="num">Lo que paga un clip aprobado (mediana)</th></tr></thead><tbody>
    <tr><td>Entretenimiento (videojuegos, cine, marcas y streamers en inglés)</td><td class="num">26</td><td class="num">≈13 $</td></tr>
    <tr><td>Música</td><td class="num">19</td><td class="num">≈12 $</td></tr>
    <tr><td>Videojuegos (aparte de los anteriores)</td><td class="num">6</td><td class="num">≈6 $</td></tr>
    <tr><td>Deporte</td><td class="num">3</td><td class="num">≈6 $ (FotMob Spain, ≈54 $)</td></tr>
    <tr><td>En español (todas)</td><td class="num">4</td><td class="num">Muy desigual: de 2,50 $ a 54 $</td></tr>
  </tbody></table>
  <p class="peq">Lectura del 02/11/2026. Finanzas en inglés paga bien, unos 20 $ por clip, pero no encaja con una cuenta en español; política, apuestas y las que piden público de EE. UU., México o Canadá se descartan.</p>

  <h3>Las campañas que más te rentan ahora mismo</h3>
  ${mejoresAhora()}

  ${nota(
    "<b>Por dónde empezar:</b> por las cuentas que tengan campañas buenas hoy en el Radar («Lo mejor para cada cuenta»). Las campañas cambian cada semana: las de español de octubre se han ido apagando y en música hay muchas más en inglés.<br><b>Regla de oro:</b> una cuenta = un nicho, para que TikTok sepa a quién enseñarla. Cómo crearlas sin problemas, en la pestaña <b>Crear y cuidar las cuentas</b>.",
    "cian"
  )}
  <div style="margin:14px 0"><button class="btn prim" id="crear-cuentas">Crear estas 5 cuentas en la app (con usuario, correo, palabras clave y ganchos)</button></div>
  ${NICHOS_RECOMENDADOS.map((n, i) => {
    const c = D.cuentas.find((x) => x.nicho === n.nombre) || {};
    const fila = (titulo, v, extra = "") => `<tr><td style="width:150px" class="peq">${titulo}</td><td>${v ? `${esc(v)} ${copiar(v)}` : '<span class="peq">Sin rellenar</span>'}${extra}</td></tr>`;
    const usuario = c.usuario && !c.usuario.startsWith("@…") ? c.usuario : "";
    return `
    <div class="tarjeta" style="margin:16px 0">
      <h3 style="margin-top:0"><span class="chip ${n.color}">Cuenta ${i + 1}</span> ${esc(n.nombre)}</h3>
      <table style="margin:8px 0 12px">
        <tr><td style="width:150px" class="peq">Usuario</td><td>${usuario ? `<b>${esc(usuario)}</b> ${copiar(usuario.replace(/^@/, ""))}` : '<span class="peq">Sin rellenar</span>'}${c.alternativa ? `<div class="peq">Si está cogido: ${esc(c.alternativa)}</div>` : ""}</td></tr>
        ${fila("Nombre del perfil", c.nombrePerfil)}
        ${fila("Correo (Gmail nuevo)", c.correo, c.correo ? `<div class="peq">Usa exactamente este. Si Gmail dice que está cogido, no te inventes otro: cámbialo aquí (Cambiarlos) para que la app tenga siempre el que usas.</div>` : "")}
        ${fila("Biografía", c.bio, c.bio ? `<div class="peq">${[...c.bio].length} caracteres (TikTok deja 80)</div>` : "")}
        <tr><td class="peq">Foto de perfil</td><td><div style="display:flex;gap:12px;align-items:center">${c.foto ? `<img src="${esc(c.foto)}" alt="Foto de perfil" style="width:72px;height:72px;border-radius:50%;flex:none"/>` : ""}<div>${esc(n.foto)}<div style="margin-top:6px">${c.foto ? `<button class="btn peq" data-ver-foto="${esc(c.id)}">Abrir la foto para guardarla</button>` : '<span class="peq">Sin foto: súbela en Cuentas</span>'}</div></div></div></td></tr>
      </table>
      ${c.id ? `<div class="peq" style="margin:-4px 0 10px">Estos datos son privados: solo están en tus datos (Cuentas), no en el código de la app. <button class="btn peq" data-editar-cuenta="${esc(c.id)}">Cambiarlos</button></div>` : ""}
      <p>${esc(n.porque)}</p>
      <table style="margin:8px 0">${n.datos.map(([k, v]) => `<tr><td style="width:220px" class="peq">${k}</td><td>${esc(v)}</td></tr>`).join("")}</table>
      <div class="peq" style="margin-bottom:10px">Datos de las campañas: ${fiab("oficial")} · Radar del 02/11/2026</div>
      <b>Qué momentos cortar</b> <span class="peq">(consejo)</span><ul>${n.clips.map((c) => `<li>${esc(c)}</li>`).join("")}</ul>
      <b>Ganchos de ejemplo</b><div style="display:flex;gap:6px;flex-wrap:wrap;margin:6px 0 10px">${n.ganchos.map((g) => `<span class="chip">${esc(g)}</span>`).join("")}</div>
      <b>Cómo editarlo</b><p style="margin-top:4px">${esc(n.herramientas)}</p>
      <div class="peq"><b>Ojo:</b> ${esc(n.ojo)}</div>
    </div>`;
  }).join("")}`;
}

// Crear las cuentas y cuidarlas: normas oficiales de TikTok (Normas de la comunidad en vigor desde el 24/09/2026 y Centro de ayuda,
// consultados el 18/10/2026) y cómo manejar 5 cuentas una sola persona.
function tabCrear() {
  return `
  <h2 style="margin-top:6px">Crear las 5 cuentas sin problemas</h2>
  ${nota("<b>Lo más importante:</b> TikTok permite tener varias cuentas, «pero no para engañar a otros o incumplir las normas». Y si alguien comete una infracción grave o intenta saltarse una sanción, <b>puede bloquear todas sus cuentas, incluidas las asociadas</b>. Con 5 cuentas, un error grave en una puede costarte las cinco: cuídalas todas igual.", "")}
  ${fuente("Normas de la comunidad de TikTok: «Integridad y autenticidad» y «Cuentas y funciones» (en vigor desde el 24/09/2026).")}

  <h3>Antes de empezar</h3>
  <table><thead><tr><th>Qué</th><th>Por qué</th><th>Fuente</th></tr></thead><tbody>
    <tr><td><b>Tener 18 años o más</b> y poner tu fecha de nacimiento real</td><td>TikTok exige 18 para las funciones de dinero, y Whop y Vyro también. Mentir en la edad es motivo de bloqueo.</td><td>${fiab("oficial")}</td></tr>
    <tr><td><b>Un correo distinto para cada cuenta</b></td><td>Cada correo y cada número de teléfono solo se pueden vincular a <b>una</b> cuenta de TikTok. Por eso hay 5 Gmail (los tienes en «Las 5 cuentas»).</td><td>${fiab("oficial")}</td></tr>
    <tr><td><b>Tu teléfono, solo en una</b></td><td>Por la misma regla: ponlo en la cuenta que más te importe (Dinero). Las otras entran con su correo.</td><td>${fiab("oficial")}</td></tr>
    <tr><td><b>Cuentas personales</b>, no de empresa</td><td>Las cuentas de empresa solo pueden usar la biblioteca de música comercial: las campañas de música piden canciones que no estarían.</td><td>${fiab("oficial")}</td></tr>
    <tr><td><b>Contraseñas distintas</b> y guardadas en el Llavero de iCloud</td><td>Si roban una, no caen las demás. Activa también la verificación en dos pasos en cada Gmail.</td><td>Recomendación</td></tr>
  </tbody></table>

  <h3>Paso a paso (para cada cuenta)</h3>
  <ol>
    <li><b>Crea el Gmail</b> de esa cuenta (gmail.com → Crear cuenta). Como correo de recuperación, pon tu correo personal.</li>
    <li>En TikTok: <b>Perfil → toca tu nombre arriba → Añadir cuenta → Registrarse</b> con ese correo.</li>
    <li>Fecha de nacimiento real, <b>usuario</b>, <b>nombre</b>, <b>foto</b> y <b>biografía</b> de su ficha (botones «Copiar» en «Las 5 cuentas»).</li>
    <li>Déjala <b>pública</b> y como cuenta <b>personal</b>. No pongas enlaces en la biografía.</li>
    <li>Apúntala en esta app (botón «Crear estas 5 cuentas») y cambia el usuario si tuviste que usar el alternativo.</li>
    <li>En Vyro, conéctala dentro de tu <b>única</b> cuenta de Vyro. En Whop, conéctala cuando te unas a una campaña.</li>
  </ol>
  ${fuente("Centro de ayuda de TikTok: «Cómo crear una cuenta de TikTok» y «Cómo añadir cuentas o cambiar entre ellas»; ayuda de TikTok para empresas sobre la biblioteca de música comercial.")}

  <h3>Las normas que cierran cuentas (y qué hacer tú)</h3>
  <table><thead><tr><th>Norma de TikTok</th><th>Qué haces tú</th><th>Fuente</th></tr></thead><tbody>
    <tr><td>Solo puedes publicar contenido que hayas creado o <b>tengas derecho a compartir</b></td><td>Corta solo material de campañas a las que te has unido o de creadores que te han dado permiso por escrito (apúntalo en <b>Conseguir vídeos → Permisos</b>).</td><td>${fiab("oficial")}</td></tr>
    <tr><td>Lo <b>no original o reutilizado sin aportar nada nuevo</b> no sale en «Para ti»</td><td>Siempre edición propia: reencuadre, cortes, subtítulos y gancho. Nunca resubas el vídeo tal cual.</td><td>${fiab("oficial")}</td></tr>
    <tr><td>Todo contenido comercial debe llevar la <b>divulgación de contenido</b> activada; si no, TikTok puede quitarlo de «Para ti», y si se repite, restringir o bloquear la cuenta</td><td>En <b>cada</b> clip de campaña: al publicar, «Divulgación de contenido y anuncios» → activar → <b>Contenido de marca</b>. Además, la etiqueta que pida la campaña (#Ad…) al principio de la descripción.</td><td>${fiab("oficial")}</td></tr>
    <tr><td>Prohibido <b>aumentar la interacción de forma artificial</b>: comprar seguidores, vistas o «me gusta»</td><td>Nada de compras, sorteos de seguidores ni grupos de «yo te sigo, tú me sigues». Tampoco te des «me gusta» ni comentes entre tus propias cuentas.</td><td>${fiab("oficial")}</td></tr>
    <tr><td>Prohibidas las <b>herramientas de automatización, guiones o trucos</b> para eludir los sistemas</td><td>Publica tú, desde la app o la web oficial de TikTok. Nada de bots ni programas que sigan, comenten o publiquen solos.</td><td>${fiab("oficial")}</td></tr>
    <tr><td>Prohibida la <b>suplantación de identidad</b></td><td>Ni el nombre ni la foto de los creadores en tus perfiles. Por eso las biografías dicen «clips con permiso».</td><td>${fiab("oficial")}</td></tr>
    <tr><td>Si te restringen o bloquean una cuenta, <b>no puedes crear ni usar otra</b> para evitarlo</td><td>Si te sancionan, recurre desde la app. Nunca abras una cuenta nueva para lo mismo.</td><td>${fiab("oficial")}</td></tr>
    <tr><td>Lo hecho con IA que parece real hay que <b>etiquetarlo</b></td><td>Los subtítulos y cortes de la Fábrica no hace falta. Si añades voces o imágenes realistas hechas con IA, activa la etiqueta de contenido generado por IA.</td><td>${fiab("oficial")}</td></tr>
    <tr><td>El <b>spam</b> en comentarios se esconde y puede costarte la cuenta</td><td>No vayas a otros vídeos a dejar «sígueme» o enlaces.</td><td>${fiab("oficial")}</td></tr>
  </tbody></table>
  ${fuente("Normas de la comunidad de TikTok («Integridad y autenticidad», «Cuentas y funciones», «Requisitos del feed Para ti») y Centro de ayuda de TikTok («Promoting a brand, product, or service»), consultados el 18/10/2026.")}

  <h2>Que el perfil llame la atención (sin saltarte ninguna norma)</h2>
  <p>Quien llega a tu perfil desde un clip decide en un par de segundos si te sigue. Lo que lo decide es que se entienda al momento de qué va la cuenta y que lo que ve tenga un aspecto cuidado.</p>
  <table><thead><tr><th>Qué</th><th>Cómo</th></tr></thead><tbody>
    <tr><td><b>Foto</b></td><td>La de su ficha en «Las 5 cuentas»: un color propio por cuenta y un icono que se reconoce aunque se vea pequeño.</td></tr>
    <tr><td><b>Nombre</b></td><td>El tema en dos o tres palabras. Es lo que la gente lee junto al usuario.</td></tr>
    <tr><td><b>Biografía</b></td><td>Qué va a encontrar quien te siga, en una línea, sin promesas de dinero. Las de la ficha ya cumplen.</td></tr>
    <tr><td><b>Primeros 9 clips</b></td><td>Lo primero que se ve del perfil es la cuadrícula: que todos sean del mismo tema y con portadas parecidas (mismo tipo de letra y color para el texto del gancho).</td></tr>
    <tr><td><b>Clips fijados</b></td><td>Cuando tengas varios, fija arriba los 3 que más vistas hayan tenido: son la mejor presentación de la cuenta.</td></tr>
    <tr><td><b>Constancia</b></td><td>Publicar todos los días a horas parecidas hace que la cuenta parezca viva y da datos para mejorar.</td></tr>
  </tbody></table>
  ${nota("<b>Lo que no hay que hacer para llamar la atención:</b> pedir «me gusta», seguidores o regalos a cambio de algo (lo que intenta manipular para eso no sale en «Para ti»), usar la cara, el nombre o el logo de un creador o de una marca en tu perfil (suplantación), comprar seguidores o hacer sorteos, y prometer ganancias en Dinero. Todo eso lo prohíben TikTok, Whop o Vyro.", "")}
  ${fuente("Normas de la comunidad de TikTok («Integridad y autenticidad» y «Requisitos del feed Para ti»); el resto son recomendaciones de presentación, no normas.")}

  <h2>Varias campañas en una cuenta y cambiar de campaña</h2>
  <ul>
    <li><b>Una cuenta puede estar en varias campañas del mismo nicho a la vez</b> (por ejemplo, Dinero con Daniel Curto y Matías Matti). Las condiciones de Whop y Vyro no limitan cuántas: lo que prohíben es enviar el mismo clip dos veces. Si una campaña concreta pide exclusividad, lo dirá en sus reglas y mandan esas reglas. <b>Ojo con las que exigen página dedicada</b> (como Daniel Curto): esas solo pagan las vistas de una cuenta dedicada a ese creador, con su nombre en el usuario. ${fiab("oficial")}</li>
    <li><b>Cada clip va a una sola campaña</b>, hecho con el material de esa campaña y con su etiqueta de publicidad.</li>
    <li><b>Cuando una campaña se acaba</b>, pasa a otra del mismo tema con otro creador, en la misma cuenta. No afecta al cobro: te paga cada campaña, no TikTok. Deja de publicar clips del creador anterior (sin campaña no tienes permiso) y deja los viejos publicados, salvo que te pidan borrarlos. ${fiab("oficial")}</li>
    <li><b>No cambies de tema</b> en una cuenta: si pasas de dinero a música, tus seguidores dejan de interesarse. ${fiab("sector")}</li>
    <li>El <b>piloto del Radar</b> retira las campañas que se acaban y te propone las nuevas que encajan con el tema de cada cuenta.</li>
  </ul>

  <h2>Manejar 5 cuentas tú solo</h2>
  <h3>En el móvil</h3>
  <p>Se añaden en <b>Perfil → tu nombre → Añadir cuenta</b> y se cambia de una a otra desde ahí mismo. TikTok <b>no publica un límite</b> de cuentas por móvil: las webs dicen 3, 5 o más y no coinciden. ${fiab("sin")} Si al añadir la cuarta o la quinta no te deja, usa el Mac para las que falten.</p>
  <h3>En el Mac (recomendado para subir)</h3>
  <ol>
    <li>En Chrome, crea <b>un perfil por cuenta</b> (icono de tu cara arriba a la derecha → Añadir). Ponle a cada perfil el nombre de la cuenta.</li>
    <li>En cada perfil, entra en <b>tiktok.com</b> con su cuenta y déjala abierta. Así no tienes que cerrar y abrir sesión.</li>
    <li>Sube desde la web (<b>Subir</b>) los clips que hace la Fábrica en este mismo Mac. Desde ahí también se pueden <b>programar</b>: activa «Programar» y elige día y hora. Lo programado no se puede editar: si te equivocas, bórralo y vuelve a subirlo.</li>
    <li>El <b>Calendario</b> de esta app te dice qué toca en cada cuenta y te avisa al móvil 15 minutos antes.</li>
  </ol>
  ${fuente("Centro de ayuda de TikTok (añadir y cambiar de cuenta); blog oficial de TikTok para empresas sobre el programador de vídeos de la web. El plazo para programar varía según la cuenta: lo verás en la propia web.")}
  <h3>Orden recomendado</h3>
  <table><thead><tr><th>Cuándo</th><th>Qué</th></tr></thead><tbody>
    <tr><td><b>Día 1</b></td><td>Crear los Gmail y las cuentas que te deje Google (así reservas los usuarios) con foto y biografía.</td></tr>
    <tr><td><b>Semana 1</b></td><td>Dinero y Música electrónica: calentar (mirar vídeos de su tema, seguir a cuentas del nicho) y subir <b>1 clip al día</b>. Crear Fútbol en cuanto puedas si quieres llegar a FotMob Spain (termina el 14/11).</td></tr>
    <tr><td><b>Semanas 2–3</b></td><td>Crear Pop y cine y Gaming, una cada pocos días (Google no deja crear muchos Gmail seguidos), con 1 clip al día cada una.</td></tr>
    <tr><td><b>Después</b></td><td>2 clips al día en las cuentas que mejor respondan (Números te lo dice) y como mínimo 1 en las demás.</td></tr>
  </tbody></table>
  <p class="peq">Es una propuesta para que una sola persona pueda con todo: 5 clips al día la primera semana y unos 10 después. No es una norma de TikTok.</p>`;
}

function tabPublicar() {
  return `
  <h2 style="margin-top:6px">Qué clips funcionan ahora</h2>
  <h3>Lo que dice TikTok para 2026 ${fiab("oficial")}</h3>
  <p>El informe oficial <b>TikTok Next 2026</b> marca tres tendencias:</p>
  <ul>
    <li><b>Reali-Tea:</b> gusta lo auténtico y sin filtros. <i>Para clipping:</i> los momentos espontáneos de un directo o una charla funcionan mejor que un clip recargado de efectos.</li>
    <li><b>Curiosity Detours:</b> la gente usa TikTok para buscar y descubrir. <i>Para clipping:</i> pon en el texto en pantalla y en la descripción las palabras que alguien buscaría (nombre del invitado, tema).</li>
    <li><b>Emotional ROI:</b> se queda lo que hace sentir algo: risa, sorpresa, inspiración.</li>
  </ul>
  <h3>Lo que dicen los datos ${fiab("estudio")}</h3>
  <ul>
    <li>El <b>vídeo</b> gana claramente a los carruseles de fotos, y los <b>comentarios</b> pesan más que los «me gusta» (Metricool, 2,3 millones de publicaciones).</li>
    <li><b>Duración:</b> cuanto más largo, menos gente lo ve entero. La mayor interacción está en vídeos de <b>unos 30–90 segundos</b>; por encima de 90 baja bastante el alcance (FanpageKarma).</li>
    <li><b>Recomendación:</b> clips de <b>20–60 segundos</b>, salvo que la campaña pida otra duración.</li>
  </ul>
  <h3>Cómo montar cada clip</h3>
  <ol>
    <li><b>Segundo 0:</b> la frase o el momento más fuerte, con el gancho escrito en pantalla.</li>
    <li><b>Subtítulos quemados</b>, grandes, en el centro (abajo los tapa la interfaz de TikTok).</li>
    <li><b>Una idea por clip.</b> Fuera todo lo que no la empuje.</li>
    <li><b>Edición propia:</b> reencuadre vertical, cortes, zoom y texto. TikTok penaliza lo que se resube sin aportar nada.</li>
    <li><b>Final:</b> el remate o una pregunta para los comentarios.</li>
    <li><b>Descripción:</b> 1–2 frases con palabras de búsqueda, 3–5 hashtags del tema y <b>la etiqueta de publicidad que pida la campaña</b> (#Sponsored o #[Marca]Ad) al principio, para que se vea sin pulsar «más».</li>
  </ol>
  ${nota("<b>IA:</b> si usas imágenes o voces de IA realistas, TikTok exige marcarlo como contenido generado por IA, y prohíbe los <i>deepfakes</i> que engañan. Usar IA para escribir ganchos o descripciones no necesita etiqueta. Nunca clones la voz ni la cara de nadie sin permiso.", "cian")}
  ${fuente("TikTok Next 2026 (oficial); Metricool, estudio de tendencias de TikTok 2026; FanpageKarma, duración de vídeos; condiciones de Whop (etiqueta de publicidad); norma de TikTok sobre IA (anuncio oficial de 2023 y guías de 2026).")}`;
}

function tabHoras() {
  return `
  <h2 style="margin-top:6px">A qué hora publicar (hora de España)</h2>
  <div class="rejilla kpis" style="margin:12px 0">
    <div class="kpi"><div class="et">Franja principal</div><div class="val" style="font-size:22px">18:00–21:00</div><div class="nota">Todos los días. Pico hacia las 20:00</div></div>
    <div class="kpi"><div class="et">Segunda franja</div><div class="val" style="font-size:22px">21:00–23:00</div><div class="nota">La tarde-noche sigue rindiendo</div></div>
    <div class="kpi"><div class="et">Fin de semana</div><div class="val" style="font-size:22px">9:00–13:00</div><div class="nota">Domingo por la mañana y a mediodía</div></div>
    <div class="kpi"><div class="et">Lo más flojo</div><div class="val" style="font-size:22px">12:00–17:00</div><div class="nota">Entre semana, salvo la hora de comer</div></div>
  </div>
  <h3>De dónde salen ${fiab("estudio")}</h3>
  <ul>
    <li><b>Metricool</b> (2 millones de publicaciones de 92.000 cuentas): mejor de 18:00 a 20:00; mejores días, domingo por la tarde y lunes.</li>
    <li><b>Buffer</b> (7,1 millones de publicaciones): la interacción sube de 18:00 a 23:00; la mejor franja suelta es el domingo a las 9:00; de 12:00 a 17:00 es lo más flojo.</li>
    <li><b>Sprout Social</b> apunta a martes–jueves por la tarde y <b>Hootsuite</b> al jueves por la mañana. Los estudios <b>no coinciden en los días</b>, pero casi todos coinciden en la tarde-noche.</li>
  </ul>
  ${nota("<b>Importante:</b> son estudios globales, no de España ni de clipping. Empieza con estas franjas y, a las 2–3 semanas, mira <b>tus datos</b>: TikTok te dice cuándo está activa tu audiencia (TikTok Studio → Estadísticas → Seguidores) y el Panel de esta app te dice a qué hora te ha ido mejor. Si tu público es de Latinoamérica o EE. UU. (campañas en inglés), las horas cambian.", "cian")}
  <h3>Reparto propuesto para las 5 cuentas</h3>
  <p>No publiques las 5 a la vez. Repártelas dentro de la franja buena:</p>
  <table><thead><tr><th>Cuenta</th><th>Clip 1</th><th>Clip 2</th><th>Extra fin de semana</th></tr></thead><tbody>
    <tr><td>Dinero, trading e inversión</td><td>19:00</td><td>22:00</td><td>Sábado 12:00</td></tr>
    <tr><td>Música electrónica y nightlife</td><td>18:30</td><td>21:30</td><td>Viernes y sábado 20:00</td></tr>
    <tr><td>Fútbol y deporte</td><td>18:00</td><td>Al acabar el partido del día</td><td>Domingo 12:30</td></tr>
    <tr><td>Música pop, indie y cine</td><td>20:00</td><td>22:30</td><td>Domingo 9:30</td></tr>
    <tr><td>Gaming y videojuegos</td><td>19:30</td><td>22:30</td><td>Sábado 10:30</td></tr>
  </tbody></table>
  <p class="peq">Es un punto de partida propuesto a partir de los estudios, no un dato. Ajústalo con las estadísticas de cada cuenta. Si una campaña busca público de otro país (México, EE. UU.), ten en cuenta que allí es entre 6 y 9 horas antes que en España (según el país y la época del año): su tarde-noche es tu madrugada. Mira en TikTok Studio de dónde es tu público.</p>
  ${fuente("Metricool, estudio TikTok 2026; Buffer, «Best time to post on TikTok in 2026»; Sprout Social y Hootsuite según recopilaciones de 2026.")}`;
}

function tabFrecuencia() {
  return `
  <h2 style="margin-top:6px">Cuántos clips subir y cada cuánto</h2>
  <h3>Lo que dicen los datos ${fiab("estudio")}</h3>
  <p>El estudio más grande es el de <b>Buffer</b>: 11,4 millones de publicaciones de más de 150.000 cuentas, comparando cada cuenta consigo misma.</p>
  <table><thead><tr><th>Vídeos por semana</th><th class="num">Vistas por vídeo (frente a 1 a la semana)</th><th class="num">El 10 % mejor llega a</th></tr></thead><tbody>
    <tr><td>1</td><td class="num">base</td><td class="num">3.722 vistas</td></tr>
    <tr><td>2–5</td><td class="num">+17 %</td><td class="num">6.983 vistas</td></tr>
    <tr><td>6–10</td><td class="num">+29 %</td><td class="num">10.092 vistas</td></tr>
    <tr><td>11 o más</td><td class="num">+34 %</td><td class="num">14.401 vistas</td></tr>
  </tbody></table>
  <ul>
    <li>Publicar más <b>no sube el vídeo normal</b>: la mediana se queda en unas 500 vistas.</li>
    <li>Lo que sube es la probabilidad de que <b>uno explote</b>, y en clipping eso es lo que da dinero.</li>
    <li>El salto grande está en pasar de 1 a 2–5 por semana; después sigue mejorando, pero cada vez menos.</li>
  </ul>
  ${fuente("Buffer, 11,4 millones de publicaciones (octubre de 2025), según Search Engine Journal. Son correlaciones: no garantizan que a ti te pase igual.")}
  <h3>Plan propuesto por cuenta</h3>
  <table><thead><tr><th>Fase</th><th>Clips por cuenta</th><th>Qué hacer</th></tr></thead><tbody>
    <tr><td><b>Semana 1 · Calentar</b></td><td>1 al día</td><td>Usa la cuenta con normalidad: mira vídeos del nicho, sigue a gente del tema. Publica tus mejores clips.</td></tr>
    <tr><td><b>Semanas 2–4 · Probar</b></td><td>2 al día</td><td>Prueba ganchos y momentos distintos. Apunta las vistas a las 48 h.</td></tr>
    <tr><td><b>Mes 2 en adelante · Escalar</b></td><td>2–3 al día</td><td>Solo si la calidad se mantiene. Más del tipo de clip que mejor te funcione.</td></tr>
  </tbody></table>
  ${nota("<b>Cada clip, único:</b> Whop prohíbe entregar duplicados. No subas el mismo clip a dos cuentas ni lo envíes dos veces. Para probar otro gancho, haz un corte distinto (otro arranque, otro tramo) y comprueba que las reglas de la campaña lo permiten.<br><b>Carga de trabajo:</b> 4 cuentas × 2 clips = 8 clips al día. A unos 10–20 minutos por clip con herramientas de IA (estimación propia), son 1,5–3 horas diarias. Mejor 2 buenos que 5 malos.", "cian")}
  <p class="peq">El plan por fases es una propuesta basada en los datos de arriba, no una regla de TikTok. Pon el objetivo diario en Ajustes y el Panel te dirá cómo vas.</p>`;
}

function tabPromocion() {
  return `
  <h2 style="margin-top:6px">¿Pagar promoción? En clipping, no</h2>
  ${nota(
    "<b>No pagues promoción de TikTok en clips de campañas.</b><br>• Vyro lo prohíbe en sus condiciones oficiales: no puedes poner anuncios ni «boosted posts» sin permiso del cliente.<br>• Whop solo cuenta vistas «legítimas» y excluye las conseguidas con incentivos pagados o con cualquier medio que altere el recuento.<br>Si lo haces, te pueden anular el pago, reclamar lo cobrado o echarte.",
    ""
  )}
  ${fuente("condiciones oficiales para clippers de Vyro y condiciones oficiales de Content Rewards de Whop (15/10/2026).")}
  <h3>Otros motivos ${fiab("sector")}</h3>
  <ul>
    <li><b>Promocionar</b> de TikTok solo admite vídeos con audio original o con licencia comercial. Un clip lleva el audio del creador, que no es tuyo, así que muchas veces ni se podrá.</li>
    <li>Con tarifas de 1–3 $ por cada 1.000 vistas, pagar por vistas casi nunca sale a cuenta.</li>
  </ul>
  ${fuente("guías de TikTok Promote de Sprout Social, Hootsuite y NapoleonCat (2026). No se pudo leer la ayuda oficial de TikTok.")}
  <h3>La única excepción</h3>
  <p>Si una campaña <b>permite por escrito</b> la promoción pagada (algunas marcas lo autorizan), sigue exactamente lo que diga su brief. Apúntalo en las reglas de la campaña en la app.</p>
  ${nota("<b>Para crecer sin pagar:</b> volumen constante, buenos ganchos, las horas buenas y un nicho por cuenta. Es lo que hacen los clippers que cobran.", "cian")}`;
}

function tabIA() {
  return `
  <h2 style="margin-top:6px">Herramientas de IA para clipping</h2>
  <p>Precios comprobados en la web oficial el 15/10/2026 cuando pone «web oficial»; el resto, de comparativas. En dólares y sin impuestos.</p>
  <table><thead><tr><th>Para qué</th><th>Herramienta</th><th>Precio</th><th>Por qué</th></tr></thead><tbody>
    <tr><td><b>Encontrar los momentos y cortar solo</b></td><td>OpusClip</td><td>Gratis (con marca de agua), Starter 15 $/mes, Pro 29 $/mes · <i>web oficial</i></td><td>La más valorada para elegir momentos con pinta de viral. Reencuadra a 9:16, pone subtítulos y gancho, y publica en TikTok desde Starter.</td></tr>
    <tr><td>Alternativa</td><td>Vizard</td><td>Unos 14,50–29 $/mes · <i>comparativas</i></td><td>Plan gratis generoso (60 min/mes, 720p, sin marca de agua) y exportación 4K.</td></tr>
    <tr><td><b>Editar y subtítulos gratis</b></td><td>CapCut</td><td>Gratis; Pro unos 10–15 $/mes · <i>comparativas</i></td><td>Cortes, zoom, subtítulos automáticos y plantillas. Es de la misma empresa que TikTok.</td></tr>
    <tr><td><b>Subtítulos con estilo</b></td><td>Submagic</td><td>Desde 12 $/mes (pago anual) · <i>comparativas</i></td><td>Subtítulos animados con emojis y palabras resaltadas.</td></tr>
    <tr><td><b>Ganchos y descripciones</b></td><td>ChatGPT o Claude</td><td>Gratis o unos 20 $/mes</td><td>Para sacar varios ganchos de un momento o escribir descripciones con palabras de búsqueda. Repasa siempre nombres y datos.</td></tr>
    <tr><td>Voz en off (solo si la campaña lo admite)</td><td>ElevenLabs</td><td>Gratis 10.000 créditos/mes; Starter 6 $/mes; Creator 22 $/mes · <i>web oficial</i></td><td>Para una frase de contexto al inicio. Uso comercial desde Starter. En clipping casi nunca hace falta: el clip lleva la voz del creador.</td></tr>
  </tbody></table>
  ${fuente("OpusClip y ElevenLabs, precios oficiales (15/10/2026); Vizard, Submagic y CapCut según comparativas de Choppity, FrameKit y Less Tools (2026).")}
  <h3>Qué usar en cada cuenta</h3>
  <table><thead><tr><th>Cuenta</th><th>Combinación</th></tr></thead><tbody>
    <tr><td>Dinero, trading e inversión</td><td>Mesa de corte de esta app para localizar momentos y subtítulos con cifras y palabras clave resaltadas. Clips cortos centrados en una frase.</td></tr>
    <tr><td>Música electrónica y Pop y cine</td><td>El material de la campaña con el sonido oficial de TikTok que pide; CapCut para el texto de arriba. El drop o el estribillo, en los 2 primeros segundos.</td></tr>
    <tr><td>Fútbol y deporte</td><td>Grabación de pantalla del iPhone con la app de la campaña (FotMob) + subtítulos y texto en pantalla.</td></tr>
    <tr><td>Gaming y videojuegos</td><td>Mesa de corte para reencuadrar el gameplay oficial a vertical y poner subtítulos en español.</td></tr>
  </tbody></table>
  <p class="peq">Para empezar sin gastar: CapCut gratis + la Mesa de corte de esta app para localizar momentos. Cuando lleguen los primeros cobros, OpusClip Starter ahorra mucho tiempo.</p>`;
}

function tabFuentes() {
  const f = [
    ["Whop · Condiciones de Content Rewards (oficial)", "https://whop.com/content-rewards-terms-of-service/"],
    ["Whop · Cómo funciona Content Rewards (oficial)", "https://whop.com/blog/whop-content-rewards/"],
    ["Whop · Whop Clips (oficial)", "https://whop.com/blog/whop-clips/"],
    ["Vyro · Web oficial", "https://vyro.com/"],
    ["Vyro · Condiciones para clippers (oficial)", "https://vyro.com/clipper-terms"],
    ["TikTok · Creator Rewards (ayuda oficial)", "https://www.tiktok.com/support/faq_detail?id=7581821550694013452&category=web_account"],
    ["TikTok Next 2026 · informe oficial", "https://ads.tiktok.com/business/en-US/next"],
    ["TikTok · Normas de la comunidad", "https://www.tiktok.com/community-guidelines/es"],
    ["Buffer · Mejor hora para publicar en TikTok 2026", "https://buffer.com/resources/best-time-to-post-on-tiktok/"],
    ["Search Engine Journal · Estudio de frecuencia de Buffer", "https://www.searchenginejournal.com/study-shows-2-5-weekly-tiktoks-deliver-biggest-view-increase/558641/"],
    ["Metricool · Mejor hora para publicar", "https://metricool.com/best-time-to-post-social-networks/"],
    ["Metricool · Tendencias de TikTok", "https://metricool.com/tiktok-trends/"],
    ["FanpageKarma · Duración de vídeos de TikTok", "https://www.fanpagekarma.com/insights/optimal-tiktok-video-length/"],
    ["ClipSpeed · Nichos de clipping", "https://www.clipspeed.ai/blog/best-niches-clip-channels-2026.html"],
    ["AScynd · Nichos por tarifa", "https://ascynd.io/en/blog/best-clipping-niches"],
    ["ClipAffiliates · Tarifas de clipping 2026", "https://www.clipaffiliates.com/blog/clipping-cpm-rates-2026"],
    ["Sprout Social · TikTok Promote", "https://sproutsocial.com/insights/tiktok-promotion/"],
    ["OpusClip · Precios (oficial)", "https://www.opus.pro/pricing"],
    ["ElevenLabs · Precios (oficial)", "https://elevenlabs.io/pricing"],
    ["Choppity · Comparativa de herramientas de clips", "https://www.choppity.com/blog/best-ai-clip-maker/"],
  ];
  return `
  <h2 style="margin-top:6px">Fuentes y fiabilidad</h2>
  <p>Investigación hecha el 15 de octubre de 2026. En toda la app cada dato lleva una de estas marcas:</p>
  <ul>
    <li>${fiab("oficial")} Sacado de las condiciones o la ayuda de la propia plataforma (Whop, Vyro, TikTok). Es lo más fiable, aunque las plataformas pueden cambiarlo.</li>
    <li>${fiab("estudio")} Estudios con millones de publicaciones (Buffer, Metricool). Datos reales, pero globales: no son solo de España ni de clipping.</li>
    <li>${fiab("sector")} Webs de empresas del sector. Sirven para orientarse; tienen interés en que el clipping parezca rentable.</li>
    <li>${fiab("sin")} No se ha podido comprobar. Por ejemplo: en qué países funciona Vyro (sus condiciones no publican la lista; compruébalo al registrarte).</li>
  </ul>
  ${nota("<b>Nada garantiza vistas ni ingresos.</b> Las normas de las plataformas cambian: antes de cada campaña lee su brief, que es lo que manda. Lo que mejor predice tus resultados son tus propios datos: apúntalos en la app y revisa el Panel cada semana.", "cian")}
  <ul>${f.map(([t, u]) => `<li><a href="${u}" target="_blank">${esc(t)}</a></li>`).join("")}</ul>`;
}
