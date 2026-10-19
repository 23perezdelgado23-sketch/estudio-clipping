"use strict";
// Estudio Clipping · «TikTok a fondo»: cómo funciona TikTok y cómo sacarle el máximo en clipping.
// Lo oficial sale del Newsroom y la ayuda de TikTok; lo demás se marca como guías del sector.

const TIKTOK_TABS = [
  ["algoritmo", "Cómo recomienda"],
  ["foryou", "Qué frena un vídeo"],
  ["busqueda", "Búsqueda"],
  ["publicar", "Publicar bien"],
  ["studio", "TikTok Studio"],
  ["fuentes", "Fuentes"],
];
let tabTikTok = "algoritmo";

function vistaTikTok() {
  acciones([]);
  const html = { algoritmo: ttAlgoritmo, foryou: ttForYou, busqueda: ttBusqueda, publicar: ttPublicar, studio: ttStudio, fuentes: ttFuentes }[tabTikTok]();
  $("#contenido").innerHTML = `
    <div class="pestanas">${TIKTOK_TABS.map(([id, t]) => `<button class="${id === tabTikTok ? "activo" : ""}" data-tab="${id}">${t}</button>`).join("")}</div>
    <div class="guia">${html}</div>`;
  $("#contenido").querySelectorAll("[data-tab]").forEach((b) => (b.onclick = () => ((tabTikTok = b.dataset.tab), vistaTikTok(), ($("#contenido").scrollTop = 0))));
}

const paraTi = (txt) => `<div class="caja cian"><b>Qué significa para tus clips:</b> ${txt}</div>`;

function ttAlgoritmo() {
  return `
  <h2 style="margin-top:6px">Cómo decide TikTok a quién enseña un vídeo</h2>
  <p>El feed «Para ti» es la forma en que TikTok enseña tus clips a gente que no te sigue, y es lo que hace que una cuenta nueva pueda tener muchas vistas. TikTok ha explicado oficialmente cómo funciona su sistema de recomendación:</p>
  <table><thead><tr><th>Lo que tiene en cuenta</th><th>Ejemplos</th><th>Fuente</th></tr></thead><tbody>
    <tr><td><b>Lo que hace cada persona</b> (interacciones)</td><td>Vídeos que le gustan o comparte, cuentas que sigue, comentarios que escribe, si termina de ver un vídeo</td><td>${fiab("oficial")}</td></tr>
    <tr><td><b>La información del vídeo</b></td><td>Descripción, sonidos y hashtags</td><td>${fiab("oficial")}</td></tr>
    <tr><td><b>Ajustes del usuario</b> (menos peso)</td><td>Idioma, país y tipo de dispositivo</td><td>${fiab("oficial")}</td></tr>
  </tbody></table>
  <ul>
    <li><b>Las señales fuertes pesan más que las débiles.</b> TikTok pone como ejemplo que <b>terminar de ver un vídeo largo</b> pesa más que una señal débil como compartir país. ${fiab("oficial")}</li>
    <li><b>El número de seguidores NO es un factor directo</b>, ni haber tenido antes vídeos que funcionaron. Una cuenta grande tiene más vistas porque tiene más público, no porque TikTok la premie. ${fiab("oficial")}</li>
    <li>La importancia de cada factor <b>cambia con el tiempo</b>, y TikTok mezcla en el feed creadores y temas nuevos para no repetir siempre lo mismo. ${fiab("oficial")}</li>
  </ul>
  ${paraTi("una cuenta nueva y sin seguidores puede tener un clip con millones de vistas: lo que cuenta es lo que hace la gente con <b>ese</b> clip. Por eso el gancho y que lo vean entero importan más que nada. Cada clip es una oportunidad nueva.")}
  ${fuente("TikTok Newsroom, «How TikTok recommends videos #ForYou», y ayuda oficial de TikTok, «How TikTok recommends content». TikTok no publica cuánto pesa cada factor.")}

  <h3>Cómo se traduce en la práctica ${fiab("sector")}</h3>
  <ol>
    <li><b>Primer segundo:</b> si la gente pasa el vídeo enseguida, TikTok deja de enseñarlo. El gancho manda.</li>
    <li><b>Que lo vean entero</b> (o casi): es de las señales más fuertes. Quita todo lo que sobre antes del remate.</li>
    <li><b>Comentarios y compartidos:</b> un final que invite a opinar ayuda. Responde a los primeros comentarios.</li>
    <li><b>Constancia de nicho:</b> si una cuenta siempre publica del mismo tema, la gente que reacciona bien a ese tema la ve más.</li>
  </ol>
  <p class="peq">Esta parte resume lo que coinciden en decir las guías de 2026 (Hootsuite, Sprout Social, SocialPilot) a partir de lo oficial; no es un documento de TikTok.</p>`;
}

function ttForYou() {
  return `
  <h2 style="margin-top:6px">Qué hace que TikTok no recomiende un vídeo</h2>
  <table><thead><tr><th>No se recomienda</th><th>Qué hacer</th><th>Fuente</th></tr></thead><tbody>
    <tr><td><b>Contenido duplicado</b></td><td>No subas el mismo clip dos veces ni en dos cuentas. (Además, Whop prohíbe entregar duplicados.)</td><td>${fiab("oficial")}</td></tr>
    <tr><td><b>Spam</b> y vídeos que intentan inflar el tráfico artificialmente</td><td>Nada de bots, compra de vistas ni trucos de «sígueme y te sigo».</td><td>${fiab("oficial")}</td></tr>
    <tr><td>Vídeos <b>recién subidos o en revisión</b></td><td>Es normal que un clip tarde un poco en empezar a moverse. No lo borres ni lo vuelvas a subir por eso.</td><td>${fiab("oficial")}</td></tr>
    <tr><td>Contenido sensible (procedimientos médicos explícitos, productos regulados…)</td><td>Puede no recomendarse al público general. En true crime, cuidado con imágenes duras.</td><td>${fiab("oficial")}</td></tr>
    <tr><td><b>Contenido no original</b> o reutilizado sin aportar nada nuevo</td><td>Añade siempre reencuadre, cortes, texto, subtítulos y tu propio gancho.</td><td>${fiab("oficial")}</td></tr>
    <tr><td>Contenido comercial <b>sin la divulgación</b> activada</td><td>Activa «Contenido de marca» en cada clip de campaña.</td><td>${fiab("oficial")}</td></tr>
    <tr><td>Contenido que pide regalos, «me gusta» o seguidores</td><td>Nada de «dale like y sígueme para…» como gancho.</td><td>${fiab("oficial")}</td></tr>
    <tr><td>Música con derechos sin licencia</td><td>Quita o baja la música de fondo que no sea del creador o de la campaña.</td><td>${fiab("sector")}</td></tr>
  </tbody></table>
  ${fuente("TikTok Newsroom, «How TikTok recommends videos #ForYou»; Normas de la comunidad de TikTok («Integridad y autenticidad» y «Cuentas y funciones», en vigor desde el 24/09/2026); guías de 2026 para la música.")}
  ${nota("<b>Una cuenta que publica mucho contenido no apto para «Para ti»</b> puede quedar entera fuera de «Para ti» y ser más difícil de encontrar, aunque no incumpla ninguna norma (oficial). Por eso cuida todos los clips, no solo los buenos.", "")}
  ${nota("Sobre el «shadowban»: TikTok no reconoce ese término. Lo que sí dice oficialmente es qué contenido no recomienda (la tabla de arriba). Si una cuenta deja de moverse, revisa esa tabla antes de nada.", "cian")}`;
}

function ttBusqueda() {
  return `
  <h2 style="margin-top:6px">TikTok también es un buscador</h2>
  <p>El informe oficial <b>TikTok Next 2026</b> marca la tendencia «Curiosity Detours»: la gente usa TikTok para <b>buscar y descubrir</b>. Un clip que aparece en las búsquedas sigue sumando vistas durante semanas. ${fiab("oficial")}</p>
  <h3>Qué lee TikTok para entender de qué va tu clip</h3>
  <ul>
    <li>La <b>descripción</b> y los <b>hashtags</b> (TikTok lo dice oficialmente como «información del vídeo»). ${fiab("oficial")}</li>
    <li>El <b>texto en pantalla</b> y lo que <b>se dice en voz</b> (las guías dicen que TikTok también los lee). ${fiab("sector")}</li>
  </ul>
  <h3>Cómo escribirlo</h3>
  <ol>
    <li><b>Piensa en qué buscaría alguien</b> para encontrar ese momento: el nombre del invitado o del streamer, el tema («ahorrar dinero», «primer negocio»).</li>
    <li><b>Ponlo en el texto del gancho</b> en pantalla y en la <b>primera frase de la descripción</b>, escrito como habla la gente, no una lista de palabras sueltas.</li>
    <li><b>3–5 hashtags</b> del tema y del creador. Más no ayuda y parece spam.</li>
    <li><b>La etiqueta de publicidad</b> de la campaña (#Sponsored o #[Marca]Ad) al principio, para que se vea sin pulsar «más».</li>
  </ol>
  <div class="tarjeta"><b>Ejemplo de descripción</b>
    <p style="margin-bottom:0;white-space:pre-wrap">#Sponsored · [Invitado] cuenta el error que le costó su primer negocio y qué haría distinto hoy. ¿Tú lo habrías visto venir?
#emprendimiento #negocios #podcast #[nombredelpodcast]</p></div>
  ${fuente("TikTok Next 2026 (oficial); TikTok Newsroom (información del vídeo); guías de SEO en TikTok de 2026 (texto en pantalla y voz).")}`;
}

function ttPublicar() {
  return `
  <h2 style="margin-top:6px">Publicar un clip paso a paso</h2>
  <ol>
    <li><b>Formato:</b> vertical 9:16, 1080×1920, sin bandas negras ni marcas de agua de otras apps.</li>
    <li><b>Portada:</b> elige un fotograma con la cara y el momento fuerte, con el texto del gancho legible.</li>
    <li><b>Descripción:</b> etiqueta de publicidad al principio, frase con palabras de búsqueda y 3–5 hashtags (ver «Búsqueda»).</li>
    <li><b>Mención:</b> si la campaña lo pide, menciona al creador.</li>
    <li><b>Divulgación de contenido (obligatoria en campañas):</b> en la pantalla de publicar, «Divulgación de contenido y anuncios» (o «Más opciones» → «Divulgación de contenido y anuncios») → activa «Divulgar contenido comercial» → elige <b>Contenido de marca</b>. El vídeo sale como «Colaboración pagada». No afecta a cuántas veces se recomienda, pero si no lo activas TikTok puede quitarlo de «Para ti» y, si se repite, restringir o bloquear la cuenta. Una vez publicado no se puede cambiar. ${fiab("oficial")}</li>
    <li><b>Sonido:</b> el audio original del clip. Si añades música, que sea de la biblioteca de sonidos de TikTok y bajita.</li>
    <li><b>Hora:</b> dentro de la franja buena (ver Estrategia → Horas).</li>
    <li><b>Después de publicar:</b> copia el enlace, envíalo a la campaña, pasa el clip a «Enviado a campaña» en la app y responde a los primeros comentarios.</li>
  </ol>
  ${nota("<b>No borres y vuelvas a subir</b> un clip porque arranque lento: los vídeos recién subidos tardan un poco en recomendarse (oficial) y un resubido cuenta como duplicado. Si no funciona, aprende de él y haz el siguiente mejor.", "cian")}
  ${fuente("TikTok Newsroom (vídeos recién subidos y duplicados); Centro de ayuda de TikTok, «Promoting a brand, product, or service», y Normas de la comunidad («Cuentas y funciones → Monetización»), consultados el 18/10/2026.")}`;
}

function ttStudio() {
  return `
  <h2 style="margin-top:6px">TikTok Studio: tus estadísticas</h2>
  <p>Desde mayo de 2024, las antiguas «Herramientas para creadores» se llaman <b>TikTok Studio</b>. Para entrar: <b>Perfil → menú ☰ (arriba a la derecha) → TikTok Studio → Estadísticas</b>. ${fiab("sector")}</p>
  <h3>Los datos que de verdad importan en clipping</h3>
  <table><thead><tr><th>Dato</th><th>Dónde</th><th>Para qué lo usas</th></tr></thead><tbody>
    <tr><td><b>Tiempo medio de visualización</b></td><td>Al abrir cada vídeo</td><td>Saber si el gancho engancha. Compáralo con la duración del clip.</td></tr>
    <tr><td><b>Vieron el vídeo completo</b></td><td>Al abrir cada vídeo</td><td>Saber si el clip es demasiado largo o tarda en llegar al remate.</td></tr>
    <tr><td><b>Fuentes de tráfico</b></td><td>Al abrir cada vídeo</td><td>Ver si las vistas vienen de «Para ti» (TikTok lo recomienda) o de búsqueda.</td></tr>
    <tr><td><b>Actividad de los seguidores</b></td><td>Pestaña de seguidores</td><td>Ver a qué horas está conectada tu audiencia y ajustar la hora de publicar.</td></tr>
  </tbody></table>
  <p class="peq">Los nombres pueden variar un poco según la versión de la app. TikTok no publica qué cifras son «buenas»: compara cada clip con la media de tu propia cuenta, y apunta las vistas en esta app para que el Panel te diga tu mejor hora y tus mejores ganchos.</p>
  <h3>Publicar desde el ordenador ${fiab("sector")}</h3>
  <p>Desde la web de TikTok en el ordenador se pueden subir vídeos y, según las guías, programarlos para más tarde. Viene bien para subir lo que editas en el Mac. Un vídeo programado no se puede editar después: si te equivocas, hay que borrarlo y programarlo de nuevo antes de que se publique.</p>
  ${fuente("HubSpot (cambio a TikTok Studio, mayo de 2024); guías de analítica de Hootsuite y Sprout Social (2026); guías de programación de Captions (2025). No se pudo leer la documentación oficial de TikTok Studio.")}`;
}

function ttFuentes() {
  const f = [
    ["TikTok Newsroom · How TikTok recommends videos #ForYou (oficial)", "https://newsroom.tiktok.com/en-us/how-tiktok-recommends-videos-for-you"],
    ["TikTok Newsroom · Learn why a video is recommended For You (oficial)", "https://newsroom.tiktok.com/en-us/learn-why-a-video-is-recommended-for-you"],
    ["TikTok · How TikTok recommends content (ayuda oficial)", "https://support.tiktok.com/en/using-tiktok/exploring-videos/how-tiktok-recommends-content"],
    ["TikTok Next 2026 (oficial)", "https://ads.tiktok.com/business/en-US/next"],
    ["TikTok · Política de contenido de marca (blog oficial)", "https://ads.tiktok.com/business/en/blog/shedding-light-on-our-new-branded-content-policy"],
    ["TikTok Newsroom · Consejos de creadores (2025)", "https://newsroom.tiktok.com/scroll-stopping-tips-from-top-tiktok-creators?lang=en-GB"],
    ["Hootsuite · Analítica de TikTok 2026", "https://blog.hootsuite.com/tiktok-analytics/"],
    ["Sprout Social · Métricas de TikTok 2026", "https://sproutsocial.com/insights/tiktok-metrics/"],
    ["HubSpot · Trucos de TikTok (TikTok Studio)", "https://blog.hubspot.com/marketing/tiktok-tricks"],
    ["SocialPilot · Algoritmo de TikTok 2026", "https://www.socialpilot.co/blog/tiktok-algorithm"],
    ["Emplicit · Ajustes de colaboración pagada", "https://emplicit.co/blog/tiktok-paid-partnership-settings-guide/"],
  ];
  return `<h2 style="margin-top:6px">Fuentes de «TikTok a fondo»</h2>
  <p>Consultadas el 15/10/2026. Lo marcado como ${fiab("oficial")} sale de TikTok; lo marcado como ${fiab("sector")}, de guías de terceros.</p>
  <ul>${f.map(([t, u]) => `<li><a href="${u}" target="_blank">${esc(t)}</a></li>`).join("")}</ul>`;
}
