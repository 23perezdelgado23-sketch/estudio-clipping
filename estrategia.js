"use strict";
// Estudio Clipping · apartado Estrategia (solo clipping con permiso).
// Investigado en octubre de 2026. Cada dato indica su fuente y su fiabilidad:
// «oficial» = condiciones o ayuda de la propia plataforma; «estudio» = estudio con datos;
// «sector» = webs de empresas del sector (orientativo); «sin confirmar» = no se pudo verificar.

const NICHOS_RECOMENDADOS = [
  {
    id: "negocios",
    nombre: "Pódcast de negocios, dinero y emprendimiento",
    usuario: "@…negocios",
    color: "verde",
    porque:
      "Es de los nichos que mejor pagan por cada 1.000 vistas y tiene pocos clippers dedicados. Las webs del sector sitúan las campañas de finanzas y trading en 4–6 $ por cada 1.000 vistas, frente a 1–3 $ de una campaña normal.",
    datos: [
      ["Competencia", "Baja–media"],
      ["Facilidad para sacar clips", "Media–alta"],
      ["Pago", "Alto (finanzas: 4–6 $ por 1.000 vistas según webs del sector; mira siempre la tarifa real)"],
      ["Riesgo", "Bajo, si no haces tú recomendaciones de inversión"],
    ],
    clips: [
      "Una cifra concreta que sorprende («ganaba 1.200 € y ahora…»)",
      "Un error caro que cuenta el invitado",
      "Un consejo práctico que se entiende en 30 segundos",
      "Una opinión contraria a lo que piensa todo el mundo",
    ],
    ganchos: ["Este error le costó 50.000 €", "Nadie te cuenta esto sobre el dinero", "Así empezó con 0 €", "La pregunta que le incomodó"],
    herramientas: "OpusClip para localizar los momentos en pódcast largos y subtítulos con las cifras resaltadas.",
    ojo: "Las campañas de cripto pagan aún más (4–9 $ según una web del sector), pero hay más proyectos dudosos: revisa bien quién paga y no prometas ganancias.",
  },
  {
    id: "streamers",
    nombre: "Streamers: directos, Just Chatting e IRL",
    usuario: "@…directos",
    color: "rosa",
    porque:
      "Es el nicho de volumen: los directos dan cada día momentos espontáneos que se cortan solos. Las webs del sector ponen a los streamers IRL y Just Chatting (sobre todo de Kick) con competencia baja y facilidad muy alta.",
    datos: [
      ["Competencia", "Baja (IRL, Kick) – alta (gaming de un juego concreto)"],
      ["Facilidad para sacar clips", "Muy alta"],
      ["Pago", "Tarifa normal; se gana por volumen de vistas"],
      ["Riesgo", "Medio: música de fondo del directo y contenido de terceros"],
    ],
    clips: [
      "Reacciones fuertes en el momento (sorpresa, enfado, risa)",
      "Situaciones IRL que salen mal o raras",
      "Discusiones o retos con el chat o con invitados",
      "Frases que se convierten en meme",
    ],
    ganchos: ["No se lo esperaba nadie", "El chat no se lo podía creer", "Esto pasó en directo", "Mira su cara"],
    herramientas: "CapCut para cortes rápidos y zoom en las reacciones, con subtítulos automáticos. OpusClip si el directo dura horas.",
    ojo: "Si en el directo suena música con derechos, quítala o bájala. En reacciones a vídeos de otros, corta el comentario del streamer, no el vídeo al que reacciona.",
  },
  {
    id: "humor",
    nombre: "Humor: pódcast y programas de comedia",
    usuario: "@…risas",
    color: "ambar",
    porque: "Es el nicho con más potencial viral: muy fácil de sacar clips y con mucho recorrido de vistas. Paga una tarifa media, pero un clip que explota compensa.",
    datos: [
      ["Competencia", "Media"],
      ["Facilidad para sacar clips", "Muy alta"],
      ["Pago", "Medio, con mucho volumen de vistas"],
      ["Riesgo", "Bajo"],
    ],
    clips: [
      "Un chiste o anécdota completa con su remate",
      "Momentos en los que el invitado no puede parar de reír",
      "Historias absurdas contadas en primera persona",
      "Respuestas rápidas e inesperadas",
    ],
    ganchos: ["Espera al final.", "La historia más absurda que he oído", "No pudo aguantarse la risa", "Le preguntaron esto y…"],
    herramientas: "CapCut o Submagic para subtítulos con estilo. El remate siempre al final del clip para que se vea entero.",
    ojo: "No cortes el remate. Si el chiste necesita contexto, ponlo en una línea de texto arriba en 5 palabras.",
  },
  {
    id: "historias",
    nombre: "Entrevistas largas y true crime",
    usuario: "@…historias",
    color: "cian",
    porque:
      "Las entrevistas tipo «gran conversación» y los pódcast de true crime tienen mucha facilidad para sacar clips y una audiencia algo mayor y fiel, que ve los clips enteros. Encaja con la tendencia «Curiosity Detours» de TikTok para 2026: la gente usa TikTok para buscar y descubrir.",
    datos: [
      ["Competencia", "Media"],
      ["Facilidad para sacar clips", "Alta"],
      ["Pago", "Constante; depende del invitado y del tema"],
      ["Riesgo", "Medio: casos sensibles e imágenes de víctimas reales"],
    ],
    clips: [
      "El giro de una historia («y entonces descubrieron que…»)",
      "Una revelación personal del invitado",
      "Un dato que casi nadie conoce",
      "La pregunta incómoda y su respuesta",
    ],
    ganchos: ["Nadie sabía esto de…", "Lo que pasó después nadie lo esperaba", "Esta historia parece inventada, pero es real", "Le preguntaron por qué lo hizo"],
    herramientas: "OpusClip para localizar los momentos en entrevistas de 1–3 horas. Subtítulos sobrios.",
    ojo: "En true crime, nada de imágenes violentas ni datos de víctimas: TikTok lo puede retirar y entonces la campaña no lo paga (y en Vyro pueden reclamar lo cobrado).",
  },
];

const ESTRATEGIA_TABS = [
  ["cobro", "Cómo se cobra"],
  ["nichos", "Las 4 cuentas"],
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
  const crear = $("#crear-cuentas");
  crear &&
    (crear.onclick = () => {
      let n = 0;
      NICHOS_RECOMENDADOS.forEach((ni) => {
        if (D.cuentas.some((c) => c.nicho === ni.nombre)) return;
        D.cuentas.push({ id: uid(), red: "TikTok", usuario: ni.usuario, nicho: ni.nombre, estado: "calentando", notas: "Cambia el usuario por el real. " + ni.herramientas });
        n++;
      });
      NICHOS_RECOMENDADOS.forEach((ni) =>
        ni.ganchos.forEach((g) => {
          if (!D.ganchos.some((x) => x.texto === g)) D.ganchos.push({ id: uid(), texto: g, tipo: ni.nombre.split(":")[0], favorito: false });
        })
      );
      guardar();
      aviso(n ? `Creadas ${n} cuentas y añadidos sus ganchos` : "Las 4 cuentas ya estaban creadas");
    });
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
    <tr><td>Una cuenta por persona</td><td>Vyro: una cuenta por persona o correo. Si abres varias te pueden cerrar y quitar los pagos. Tus 4 cuentas de TikTok se conectan dentro de esa única cuenta.</td><td>${fiab("oficial")}</td></tr>
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

function tabNichos() {
  return `
  <h2 style="margin-top:6px">Las 4 cuentas: un nicho de clipping cada una</h2>
  <p>Entre las cuatro cubren lo que necesita un equipo de clipping:</p>
  <ul>
    <li>Una que <b>paga mucho por vista</b>: negocios.</li>
    <li>Dos que <b>dan mucho volumen</b>: streamers y humor.</li>
    <li>Una con <b>audiencia fiel</b>: entrevistas y true crime.</li>
    <li>Ninguna toca deporte televisado, música ni películas, que dan problemas de derechos.</li>
  </ul>
  ${nota(
    "<b>Antes de abrir cada cuenta:</b> entra en Whop y en Vyro y comprueba que hay <b>campañas activas de ese nicho</b> y en el idioma en el que vais a publicar (la mayoría son en inglés). Si un nicho no tiene campañas, cámbialo por otro que sí tenga: sin campaña no hay cobro.<br><b>Regla de oro:</b> una cuenta = un nicho, para que TikTok sepa a quién enseñarla.",
    "cian"
  )}
  <div style="margin:14px 0"><button class="btn prim" id="crear-cuentas">Crear estas 4 cuentas en la app (con sus ganchos)</button></div>
  ${NICHOS_RECOMENDADOS.map(
    (n, i) => `
    <div class="tarjeta" style="margin:16px 0">
      <h3 style="margin-top:0"><span class="chip ${n.color}">Cuenta ${i + 1}</span> ${esc(n.nombre)}</h3>
      <p>${esc(n.porque)}</p>
      <table style="margin:8px 0">${n.datos.map(([k, v]) => `<tr><td style="width:220px" class="peq">${k}</td><td>${esc(v)}</td></tr>`).join("")}</table>
      <b>Qué momentos cortar</b><ul>${n.clips.map((c) => `<li>${esc(c)}</li>`).join("")}</ul>
      <b>Ganchos de ejemplo</b><div style="display:flex;gap:6px;flex-wrap:wrap;margin:6px 0 10px">${n.ganchos.map((g) => `<span class="chip">${esc(g)}</span>`).join("")}</div>
      <b>Cómo editarlo</b><p style="margin-top:4px">${esc(n.herramientas)}</p>
      <div class="peq"><b>Ojo:</b> ${esc(n.ojo)}</div>
    </div>`
  ).join("")}
  ${fuente("clasificación de nichos de clipping de ClipSpeed (2026) y tarifas de AScynd y ClipAffiliates (2026). Son webs del sector: la clasificación es cualitativa y las tarifas cambian cada semana.")}`;
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
  <h3>Reparto propuesto para las 4 cuentas</h3>
  <p>No publiques las 4 a la vez desde el mismo móvil. Repártelas dentro de la franja buena:</p>
  <table><thead><tr><th>Cuenta</th><th>Clip 1</th><th>Clip 2</th><th>Extra fin de semana</th></tr></thead><tbody>
    <tr><td>Negocios</td><td>18:00</td><td>21:00</td><td>Domingo 10:00</td></tr>
    <tr><td>Streamers</td><td>19:00</td><td>22:00</td><td>Sábado 12:00</td></tr>
    <tr><td>Humor</td><td>20:00</td><td>22:30</td><td>Domingo 12:30</td></tr>
    <tr><td>Entrevistas y true crime</td><td>18:30</td><td>21:30</td><td>Domingo 9:30</td></tr>
  </tbody></table>
  <p class="peq">Es un punto de partida propuesto a partir de los estudios, no un dato. Ajústalo con las estadísticas de cada cuenta.</p>
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
    <tr><td>Negocios</td><td>OpusClip (pódcast de 1–2 h) + subtítulos con cifras resaltadas + ChatGPT/Claude para la descripción.</td></tr>
    <tr><td>Streamers</td><td>CapCut (cortes rápidos, zoom en la reacción) + subtítulos automáticos. OpusClip para directos de horas.</td></tr>
    <tr><td>Humor</td><td>CapCut o Submagic (subtítulos que acompañan el ritmo del chiste).</td></tr>
    <tr><td>Entrevistas y true crime</td><td>OpusClip para localizar momentos + CapCut para afinar. Subtítulos sobrios.</td></tr>
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
