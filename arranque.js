"use strict";
// Estudio Clipping · «Empieza aquí»: plan de 30 días, rutina diaria, revisión semanal y errores típicos.
// Lo que sale de condiciones oficiales se marca como tal; lo que sale de guías del sector, también.

// Plan para una persona sola con 5 cuentas (decisión de Eduardo, 18/10/2026). Los IDs de pasos que ya existían se mantienen
// para no perder lo que ya estuviera marcado.
const PLAN = [
  {
    fase: "Fase 0 · Preparar todo",
    cuando: "Día 1",
    pasos: [
      ["p-edad", "Tener 18 años o más. TikTok lo exige para ganar dinero, y Whop y Vyro para participar.", "oficial"],
      ["p-gmail", "Crear los 5 Gmail (uno por cuenta, los tienes en Estrategia → Las 5 cuentas), con tu correo personal de recuperación y la verificación en dos pasos activada.", ""],
      ["p-claves", "Guardar cada contraseña en el Llavero de iCloud: una distinta para cada Gmail y cada cuenta de TikTok.", ""],
      ["p-whop", "Crear UNA cuenta en whop.com y entrar en Content Rewards (ver «Conseguir vídeos → Whop»).", "oficial"],
      ["p-vyro", "Opcional: crear UNA sola cuenta en vyro.com. Hoy no tiene campañas en español, así que puede esperar.", "oficial"],
      ["p-capcut", "Instalar CapCut (gratis) para los textos de las cuentas de Música y Textos.", ""],
      ["p-ajustes", "Rellenar Ajustes: el cambio del dólar y el objetivo de 3 clips al día (una por cuenta activa la primera semana).", ""],
    ],
  },
  {
    fase: "Fase 1 · Crear las 5 cuentas",
    cuando: "Días 1–2",
    pasos: [
      ["p-tiktok", "Crear las 5 cuentas de TikTok desde Perfil → tu nombre → Añadir cuenta, cada una con su Gmail. Fecha de nacimiento real.", "oficial"],
      ["p-telefono", "Poner tu número de teléfono solo en una cuenta (Dinero): cada teléfono y cada correo solo se pueden vincular a una cuenta.", "oficial"],
      ["p-personal", "Dejarlas como cuenta personal y pública, no de empresa: las de empresa solo pueden usar la música comercial.", "oficial"],
      ["p-perfil", "Usuario, nombre, foto y biografía de cada una tal como vienen en Estrategia → Las 5 cuentas. Sin la cara ni el nombre de ningún creador y sin enlaces.", "oficial"],
      ["p-apuntar-cuentas", "Pulsar «Crear estas 5 cuentas en la app» (Estrategia → Las 5 cuentas) y corregir el usuario si usaste el alternativo.", ""],
      ["p-normas", "Leer entera la pestaña «Que no te baneen» de este apartado.", "oficial"],
    ],
  },
  {
    fase: "Fase 2 · Calentar y primeros clips",
    cuando: "Días 2–7",
    pasos: [
      ["p-usar", "Usar cada cuenta 10–15 minutos al día como una persona normal: ver vídeos de su tema y seguir a algunas cuentas del nicho.", "sector"],
      ["p-masivo", "Nada de acciones masivas (seguir o dar «me gusta» a todo de golpe) y nunca interactuar entre tus propias cuentas.", "oficial"],
      ["p-unirse", "Unirse en Whop a las 3 campañas para empezar: Daniel Curto (Dinero), MY SONG SPANISH TREND (Música) y SPANISH TEXT TIKTOK (Textos). Mira antes el Radar por si han cambiado.", ""],
      ["p-apuntar", "Leer las reglas de cada campaña y apuntarlas en Campañas: tarifa, mínimo, máximo, presupuesto, fecha de fin, duración y etiqueta de publicidad.", "oficial"],
      ["p-conectar", "Conectar cada cuenta de TikTok en Whop al unirte a su campaña.", "oficial"],
      ["p-uno", "Desde el día 3: 1 clip al día en Dinero, Música y Textos, en la franja de tarde (Estrategia → Horas).", "estudio"],
      ["p-check", "Antes de publicar cada clip: checklist de TikTok del clip, «Contenido de marca» activado y la etiqueta de publicidad al principio.", "oficial"],
      ["p-enviar", "Enviar el enlace de cada clip a su campaña nada más publicarlo.", "oficial"],
    ],
  },
  {
    fase: "Fase 3 · Las 5 cuentas en marcha",
    cuando: "Días 8–21",
    pasos: [
      ["p-negocios", "Unir Negocios a Víctor Rodríguez o Next Level y Creadores a Adriano Finucci, y empezar 1 clip al día en las 5 cuentas.", ""],
      ["p-pablo", "Solicitar Pablo Pérez cuando Creadores tenga varios clips publicados.", ""],
      ["p-48h", "Apuntar las vistas de cada clip a las 48 horas (Números → Actualizar vistas).", ""],
      ["p-semana1", "Hacer la revisión semanal cada domingo (pestaña «Revisión semanal»).", ""],
      ["p-rechazos", "Si te rechazan un clip, leer el motivo y corregirlo en el siguiente. Nunca reenviar el mismo.", "oficial"],
    ],
  },
  {
    fase: "Fase 4 · Probar y crecer",
    cuando: "Días 22–30",
    pasos: [
      ["p-dos", "Subir a 2 clips al día en las cuentas que mejor respondan (Números te lo dice) y mantener 1 en las demás.", "estudio"],
      ["p-segunda", "Añadir una segunda campaña del mismo nicho en cada cuenta que pueda con ello (por ejemplo, Matías Matti en Dinero). Cada clip, a una sola campaña.", "oficial"],
      ["p-ganchos", "Probar ganchos y tipos de momento distintos y mirar en Ganchos cuáles dan más vistas.", ""],
      ["p-presupuesto", "Cambiar las campañas que se acaban por otras del mismo nicho (el piloto del Radar te las propone).", "oficial"],
      ["p-cobro", "Apuntar el primer cobro en Cobros.", ""],
    ],
  },
  {
    fase: "Fase 5 · Escalar",
    cuando: "Mes 2 en adelante",
    pasos: [
      ["p-tres", "2–3 clips al día por cuenta en lo que mejor funciona; dejar lo que no.", "estudio"],
      ["p-mejores", "Ir pasando a las campañas que mejor pagan de cada nicho.", ""],
      ["p-directo", "Proponer acuerdos directos a creadores sin campaña (plantilla en «Conseguir vídeos → Creador directo»).", ""],
      ["p-gestoria", "Consultar con una gestoría cómo declarar los ingresos.", "oficial"],
    ],
  },
];

const RUTINA = [
  ["r-campanas", "Mirar el Radar y los avisos: campañas que se acaban, presupuesto que queda y campañas nuevas"],
  ["r-whop", "Mirar en Whop si te han aprobado, rechazado o pedido borrar algún clip (si lo piden, bórralo en el momento)"],
  ["r-momentos", "Sacar los clips del día con la Fábrica o la Mesa de corte: uno distinto por cuenta"],
  ["r-editar", "Pasar el checklist de cada clip: reglas de la campaña, duración, etiqueta de publicidad y clip único"],
  ["r-publicar", "Publicar cada cuenta a su hora (Calendario), con «Contenido de marca» activado"],
  ["r-enviar", "Enviar el enlace de cada clip a su campaña nada más publicarlo"],
  ["r-comentarios", "Responder comentarios en la primera hora de cada clip (sin comentar entre tus propias cuentas)"],
  ["r-uso", "Usar cada cuenta unos minutos como una persona normal: ver vídeos de su tema"],
  ["r-vistas", "Apuntar las vistas de los clips de hace 48 horas"],
];

const ARRANQUE_TABS = [
  ["plan", "Plan de 30 días"],
  ["baneo", "Que no te baneen"],
  ["rutina", "Rutina diaria"],
  ["semana", "Revisión semanal"],
  ["errores", "Errores que hacen perder dinero"],
];
let tabArranque = "plan";

const pasosPlan = () => PLAN.flatMap((f) => f.pasos);
function progresoPlan() {
  const total = pasosPlan().length;
  const hechos = pasosPlan().filter(([id]) => D.plan?.[id]).length;
  return { total, hechos, pct: Math.round((hechos / total) * 100) };
}
function siguientePaso() {
  for (const f of PLAN) for (const p of f.pasos) if (!D.plan?.[p[0]]) return { fase: f.fase, texto: p[1] };
  return null;
}
function rutinaHoy() {
  const hoy = hoyISO();
  if (!D.rutina || D.rutina.fecha !== hoy) D.rutina = { fecha: hoy, hechos: {} };
  return D.rutina;
}

function vistaArranque() {
  acciones([]);
  const html = { plan: tabPlan, baneo: tabBaneo, rutina: tabRutina, semana: tabSemana, errores: tabErrores }[tabArranque]();
  $("#contenido").innerHTML = `
    <div class="pestanas">${ARRANQUE_TABS.map(([id, t]) => `<button class="${id === tabArranque ? "activo" : ""}" data-tab="${id}">${t}</button>`).join("")}</div>
    <div class="guia">${html}</div>`;
  $("#contenido").querySelectorAll("[data-tab]").forEach((b) => (b.onclick = () => ((tabArranque = b.dataset.tab), vistaArranque(), ($("#contenido").scrollTop = 0))));
  $("#contenido").querySelectorAll("input[data-plan]").forEach(
    (el) =>
      (el.onchange = () => {
        (D.plan ||= {})[el.dataset.plan] = el.checked;
        guardar();
        const y = $("#contenido").scrollTop;
        vistaArranque();
        $("#contenido").scrollTop = y;
      })
  );
  $("#contenido").querySelectorAll("input[data-rutina]").forEach(
    (el) =>
      (el.onchange = () => {
        rutinaHoy().hechos[el.dataset.rutina] = el.checked;
        guardar();
        vistaArranque();
        pintarMenu();
      })
  );
}

function tabPlan() {
  const p = progresoPlan();
  const sig = siguientePaso();
  return `
  <h2 style="margin-top:6px">Tu plan para empezar: tú solo, con 5 cuentas</h2>
  <p>Sigue los pasos en orden y márcalos al hacerlos. Cada paso indica si viene de las condiciones oficiales, de un estudio o de guías del sector. Empiezas con 3 cuentas publicando (Dinero, Música y Textos, que cobran desde 1.000 vistas) y sumas Negocios y Creadores en la segunda semana, para que una sola persona pueda con todo.</p>
  <div class="tarjeta" style="margin:12px 0">
    <div style="display:flex;justify-content:space-between"><b>Progreso</b><span>${p.hechos} de ${p.total} pasos · ${p.pct} %</span></div>
    <div class="barra" style="margin-top:8px"><div style="width:${p.pct}%"></div></div>
    ${sig ? `<p style="margin-bottom:0"><b>Siguiente paso:</b> ${esc(sig.texto)} <span class="peq">(${esc(sig.fase)})</span></p>` : `<p style="margin-bottom:0"><b>¡Plan completado!</b> A partir de aquí: rutina diaria y revisión semanal.</p>`}
  </div>
  ${PLAN.map(
    (f) => `
    <div class="tarjeta" style="margin:14px 0">
      <h3 style="margin-top:0">${esc(f.fase)} <span class="chip">${esc(f.cuando)}</span></h3>
      <div class="checks" style="grid-template-columns:1fr">
        ${f.pasos
          .map(
            ([id, texto, fuenteTipo]) =>
              `<label style="align-items:flex-start"><input type="checkbox" data-plan="${id}" ${D.plan?.[id] ? "checked" : ""} style="margin-top:3px"/><span style="${D.plan?.[id] ? "text-decoration:line-through;color:var(--suave)" : ""}">${esc(texto)} ${fuenteTipo ? fiab(fuenteTipo) : ""}</span></label>`
          )
          .join("")}
      </div>
    </div>`
  ).join("")}
  <p class="peq">Los días son orientativos: si una fase te lleva más, no pasa nada. Lo importante es el orden.</p>`;
}

// Que no te baneen: normas oficiales de TikTok (Normas de la comunidad en vigor desde el 24/09/2026 y Centro de ayuda),
// de Whop (condiciones de Content Rewards) y de Vyro (condiciones para clippers), leídas el 19/10/2026.
function tabBaneo() {
  const lista = (filas) =>
    `<table><thead><tr><th>Qué haces</th><th>Por qué</th><th>Fuente</th></tr></thead><tbody>${filas
      .map(([q, p, f]) => `<tr><td><b>${q}</b></td><td>${p}</td><td>${fiab(f)}</td></tr>`)
      .join("")}</tbody></table>`;
  return `
  <h2 style="margin-top:6px">Que no te baneen: ni las cuentas, ni los clips, ni los cobros</h2>
  <p>Hay tres que te pueden sancionar, y cada uno por cosas distintas:</p>
  <table><thead><tr><th>Quién</th><th>Qué te puede hacer</th></tr></thead><tbody>
    <tr><td><b>TikTok</b></td><td>Quitar un clip de «Para ti», borrarlo, restringir la cuenta o bloquearla. Ante una infracción grave o si intentas saltarte una sanción, <b>puede bloquear todas tus cuentas, incluidas las asociadas</b>: con 5 cuentas, un error grave en una puede costarte las cinco.</td></tr>
    <tr><td><b>Cada marca de Whop</b></td><td>Rechazar un clip y <b>banearte de su campaña o de todas sus campañas</b> si un clip no cumple sus criterios, si incumples las condiciones o si sospecha fraude.</td></tr>
    <tr><td><b>Whop y Vyro</b></td><td>Cerrar tu cuenta, retener los pagos y <b>reclamarte lo ya cobrado</b> si hay fraude o incumplimiento.</td></tr>
  </tbody></table>
  ${fuente("Normas de la comunidad de TikTok («Cuentas y funciones», «Integridad y autenticidad»); condiciones de Content Rewards de Whop (apartados «Banning» y «Termination»); condiciones para clippers de Vyro («Termination» y «Payouts»).")}

  <h3>1. El primer día, al crear las cuentas</h3>
  ${lista([
    ["Tu edad real (18 o más)", "Mentir en la edad es motivo de bloqueo. TikTok exige 18 para ganar dinero, y Whop y Vyro para participar.", "oficial"],
    ["Un correo para cada cuenta y tu teléfono solo en una", "Cada correo y cada teléfono solo se pueden vincular a una cuenta de TikTok.", "oficial"],
    ["Cuentas personales, no de empresa", "Las de empresa solo pueden usar la música comercial: las campañas de canciones no funcionarían.", "oficial"],
    ["Ni el nombre ni la foto de ningún creador", "Es suplantación de identidad, que TikTok prohíbe. Tus perfiles dicen «clips con permiso».", "oficial"],
    ["Una sola cuenta de Whop y una sola de Vyro", "Vyro prohíbe tener varias cuentas o registrarse con varios correos o identidades. Las 5 cuentas de TikTok se conectan dentro de esa única cuenta.", "oficial"],
    ["Cada cuenta de TikTok, conectada solo a tu Vyro", "Vyro no deja usar una red social que ya esté en otra cuenta de Vyro. No la compartas con nadie.", "oficial"],
    ["Contraseñas distintas y verificación en dos pasos", "Si roban una cuenta y publica algo prohibido, la sanción te puede salpicar en las demás.", "sin"],
  ])}

  <h3>2. Antes de publicar cada clip</h3>
  ${lista([
    ["Estar unido a la campaña, dentro de fecha y con presupuesto", "Sin unirte no tienes permiso para usar ese material. Whop rechaza lo publicado después de la fecha de fin o cuando ya se ha pagado el máximo, y vigilarlo es cosa tuya.", "oficial"],
    ["Usar solo el material de la campaña", "Whop exige que todo sea original salvo lo que te da la marca. Si necesitas un fondo (Música y Textos), que sea grabado por ti o de un banco gratuito con licencia, nunca «un vídeo que encuentres por internet».", "oficial"],
    ["Edición propia en cada clip", "Lo no original o reutilizado sin aportar nada no sale en «Para ti». Reencuadre, cortes, subtítulos y gancho.", "oficial"],
    ["Cumplir las reglas de la campaña", "Duración, menciones, hashtags, país del público. Si no, la marca rechaza el clip y puede banearte.", "oficial"],
    ["Etiqueta de publicidad visible sin pulsar «más»", "#Sponsored o #[Marca]Ad al principio de la descripción, no escondida entre otros hashtags. Es obligatoria en Whop y en Vyro.", "oficial"],
    ["«Contenido de marca» activado en TikTok", "Al publicar: «Divulgación de contenido y anuncios» → activar → Contenido de marca. Si no, TikTok puede quitarlo de «Para ti», y si se repite, restringir o bloquear la cuenta. Una vez publicado no se puede cambiar.", "oficial"],
    ["Clip único", "Nunca el mismo clip en dos cuentas ni enviado a dos campañas: Whop prohíbe los duplicados y TikTok no los recomienda.", "oficial"],
    ["La música que pide la campaña o el audio original", "Nada de canciones añadidas por tu cuenta: pueden tumbar el clip.", "oficial"],
    ["Etiqueta de IA si usas voces o imágenes realistas hechas con IA", "TikTok lo exige. Los subtítulos y cortes de la Fábrica no la necesitan.", "oficial"],
    ["Nada de campañas políticas", "TikTok no permite cobrar por contenido político (la app las marca en el Radar).", "oficial"],
    ["No prometer ganancias", "En Dinero y Negocios, corta lo que dice el creador; no añadas tú promesas de dinero.", "oficial"],
  ])}

  <h3>3. Todos los días</h3>
  ${lista([
    ["Publicar tú, desde la app o la web oficial de TikTok", "TikTok prohíbe las herramientas de automatización y los trucos para saltarse sus sistemas, y Vyro prohíbe la publicación automática. Programar desde la web oficial de TikTok sí está permitido.", "oficial"],
    ["Cero compras, sorteos o premios por ver", "Comprar seguidores, vistas o «me gusta», o dar premios a la gente por ver el vídeo: TikTok lo prohíbe y Whop y Vyro no pagan esas vistas y te pueden reclamar lo cobrado.", "oficial"],
    ["No interactuar entre tus propias cuentas", "Darte «me gusta» o comentarte desde otra cuenta tuya es interacción artificial.", "oficial"],
    ["Nada de spam", "No dejes «sígueme» ni enlaces en otros vídeos, ni mensajes masivos.", "oficial"],
    ["Nada de promoción pagada", "Ni «Promocionar» de TikTok ni anuncios sobre clips de campañas. Vyro lo prohíbe y puede reclamarte lo cobrado; Whop solo paga vistas legítimas y decide él cuáles lo son, así que tampoco.", "oficial"],
    ["No borrar y volver a subir", "Un clip que arranca lento no se resube: TikTok lo trata como duplicado.", "oficial"],
    ["Si la marca o Whop te piden borrar un clip, bórralo enseguida", "Es obligatorio en las condiciones de Whop, también cuando la campaña ya ha terminado.", "oficial"],
    ["Cobrar solo dentro de Whop", "Si cobras de la marca por fuera, Whop te puede echar.", "oficial"],
    ["Ritmo normal", "Nada de seguir o dar «me gusta» a cientos de cuentas de golpe: parece un bot.", "sector"],
  ])}

  <h3>4. Si algo va mal</h3>
  <table><thead><tr><th>Si pasa esto…</th><th>…haz esto</th></tr></thead><tbody>
    <tr><td>TikTok te avisa de una infracción o restringe una cuenta</td><td>Para de publicar en esa cuenta, lee el motivo y recurre desde la app. <b>Nunca abras otra cuenta</b> para lo mismo: está prohibido y puede tumbar las demás.</td></tr>
    <tr><td>TikTok borra un clip</td><td>Recurre si crees que es un error. En Vyro pierdes lo de ese clip y pueden reclamarte lo cobrado.</td></tr>
    <tr><td>La marca rechaza un clip</td><td>Lee el motivo y corrígelo en el siguiente. No reenvíes el mismo.</td></tr>
    <tr><td>Una campaña se acaba</td><td>Deja de publicar clips de ese creador y pasa a otra campaña del mismo nicho. Los clips viejos, déjalos publicados salvo que te pidan borrarlos.</td></tr>
    <tr><td>Un clip va muy mal</td><td>Déjalo publicado y aprende de él. No lo borres ni lo vuelvas a subir.</td></tr>
  </tbody></table>
  ${fuente("Normas de la comunidad de TikTok, Centro de ayuda de TikTok («Promoting a brand, product, or service» y «Cómo crear una cuenta»), condiciones de Content Rewards de Whop y condiciones para clippers de Vyro, consultadas el 18 y 19/10/2026.")}`;
}

function tabRutina() {
  const r = rutinaHoy();
  const hechos = RUTINA.filter(([id]) => r.hechos[id]).length;
  const objDia = n(D.ajustes.objetivoDia);
  const hoyN = D.clips.filter((c) => CUENTAN_VISTAS.includes(c.estado) && (c.fechaPub || "").slice(0, 10) === hoyISO()).length;
  const hace48 = D.clips.filter((c) => {
    if (!CUENTAN_VISTAS.includes(c.estado) || !c.fechaPub) return false;
    const h = (Date.now() - new Date(c.fechaPub)) / 36e5;
    return h >= 48 && h < 96 && !n(c.vistas);
  }).length;
  return `
  <h2 style="margin-top:6px">Rutina de hoy · ${new Date().toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })}</h2>
  <p>Las casillas se reinician cada día.</p>
  <div class="rejilla kpis" style="margin:12px 0">
    <div class="kpi"><div class="et">Rutina</div><div class="val">${hechos}/${RUTINA.length}</div><div class="barra" style="margin-top:8px"><div style="width:${(hechos / RUTINA.length) * 100}%"></div></div></div>
    <div class="kpi"><div class="et">Clips publicados hoy</div><div class="val">${hoyN}${objDia ? ` <span class="peq">/ ${objDia}</span>` : ""}</div><div class="nota">${objDia ? "Objetivo de Ajustes" : "Pon tu objetivo diario en Ajustes"}</div></div>
    <div class="kpi"><div class="et">Vistas por apuntar</div><div class="val">${hace48}</div><div class="nota">Clips de hace 48–96 h sin vistas apuntadas</div></div>
  </div>
  <div class="tarjeta"><div class="checks" style="grid-template-columns:1fr">
    ${RUTINA.map(([id, t]) => `<label><input type="checkbox" data-rutina="${id}" ${r.hechos[id] ? "checked" : ""}/><span style="${r.hechos[id] ? "text-decoration:line-through;color:var(--suave)" : ""}">${esc(t)}</span></label>`).join("")}
  </div></div>
  <p class="peq">Por qué responder comentarios pronto: según el estudio de Metricool (2,3 millones de publicaciones), los comentarios pesan más que los «me gusta» en la interacción.</p>`;
}

function tabSemana() {
  return `
  <h2 style="margin-top:6px">Revisión semanal (30 minutos, un día fijo)</h2>
  <h3>1. En TikTok Studio, clip por clip ${fiab("sector")}</h3>
  <p>Entra en TikTok Studio → Estadísticas y abre cada clip. Fíjate en tres datos:</p>
  <table><thead><tr><th>Dato</th><th>Qué es</th><th>Qué te dice</th></tr></thead><tbody>
    <tr><td><b>Tiempo medio de visualización</b></td><td>Lo que se queda de media la gente viendo el clip</td><td>Si es bajo, el gancho no engancha o el clip es largo.</td></tr>
    <tr><td><b>Vieron el vídeo completo</b></td><td>% de gente que lo vio entero</td><td>Si es bajo, recorta: quita lo que sobra antes del remate.</td></tr>
    <tr><td><b>Fuentes de tráfico</b></td><td>De dónde vienen las vistas (Para ti, perfil, búsqueda…)</td><td>Si casi nada viene de «Para ti», TikTok no lo está recomendando: revisa que el clip aporte edición propia.</td></tr>
  </tbody></table>
  <p class="peq">Las definiciones vienen de guías de 2026 (Hootsuite, Sprout Social). TikTok no publica qué cifra es «buena»: compara cada clip con la media de tu propia cuenta.</p>

  <h3>2. En esta app</h3>
  <ul>
    <li><b>Panel:</b> mejor hora de publicación y mejores clips.</li>
    <li><b>Ganchos:</b> qué ganchos dan más vistas de media. Marca como favoritos los que funcionan.</li>
    <li><b>Cuentas:</b> qué cuenta rinde más por clip.</li>
    <li><b>Campañas:</b> presupuesto gastado y cuánto te deja cada una.</li>
  </ul>

  <h3>3. Decide (una o dos cosas por semana, no todo a la vez)</h3>
  <table><thead><tr><th>Si pasa esto…</th><th>…prueba esto</th></tr></thead><tbody>
    <tr><td>Muchas vistas pero poca gente lo ve entero</td><td>Clips más cortos y el remate antes.</td></tr>
    <tr><td>Pocas vistas desde el principio</td><td>Cambia el gancho del segundo 0 y el texto en pantalla.</td></tr>
    <tr><td>Una cuenta va mucho peor que las otras</td><td>Revisa que publique un solo nicho; prueba otro tipo de momento o cambia de campaña.</td></tr>
    <tr><td>No llegas a publicar en las 5 cuentas</td><td>Mejor 1 clip bueno al día por cuenta que 3 malos. Deja en 1 al día las que menos rinden.</td></tr>
    <tr><td>Una campaña paga poco o casi no le queda presupuesto</td><td>Pasa esa cuenta a otra campaña del mismo nicho.</td></tr>
    <tr><td>Te rechazan clips</td><td>Vuelve a leer el brief: es lo que decide. Mira «Errores que hacen perder dinero».</td></tr>
    <tr><td>Una hora va claramente mejor</td><td>Mueve a esa hora los clips de esa cuenta.</td></tr>
  </tbody></table>
  <p class="peq">Cambia pocas cosas cada vez: si cambias todo a la vez, no sabrás qué ha funcionado.</p>`;
}

function tabErrores() {
  return `
  <h2 style="margin-top:6px">Errores que hacen perder dinero</h2>
  <h3>Por qué rechazan o no pagan un clip</h3>
  <table><thead><tr><th>Motivo</th><th>Cómo evitarlo</th><th>Fuente</th></tr></thead><tbody>
    <tr><td>No cumple el brief de la campaña</td><td>Es el motivo principal. Lee las reglas antes de cortar y apúntalas en la campaña: la app te las enseña al editar el clip.</td><td>${fiab("sector")}</td></tr>
    <tr><td>Sin etiqueta de publicidad</td><td>#Sponsored o #[Marca]Ad visible sin pulsar «más». Sin ella pueden echarte y reclamar lo cobrado.</td><td>${fiab("oficial")}</td></tr>
    <tr><td>Clip duplicado</td><td>Cada clip, único. No lo envíes dos veces ni lo subas a dos cuentas.</td><td>${fiab("oficial")}</td></tr>
    <tr><td>Vistas sospechosas</td><td>Nada de comprar vistas, bots, sorteos ni pagar promoción.</td><td>${fiab("oficial")}</td></tr>
    <tr><td>Presupuesto agotado</td><td>Se paga por orden de llegada: entra pronto en las campañas y vigila el % gastado.</td><td>${fiab("oficial")}</td></tr>
    <tr><td>Fuera de fecha o sin presupuesto</td><td>Whop rechaza lo publicado o enviado después de la fecha de fin o cuando ya se ha pagado el máximo. Vigilarlo es cosa tuya: mira el Radar antes de cortar.</td><td>${fiab("oficial")}</td></tr>
    <tr><td>La marca te banea</td><td>Cada marca puede echarte de su campaña o de todas las suyas si un clip no cumple sus criterios. Lee las reglas antes de cada campaña.</td><td>${fiab("oficial")}</td></tr>
    <tr><td>Sin «Contenido de marca» en TikTok</td><td>Actívalo en cada clip de campaña. Si no, TikTok puede quitarlo de «Para ti» y, si se repite, restringir la cuenta.</td><td>${fiab("oficial")}</td></tr>
    <tr><td>Material que no es de la campaña</td><td>Whop exige que todo sea original salvo lo que da la marca. Los fondos, tuyos o con licencia libre.</td><td>${fiab("oficial")}</td></tr>
    <tr><td>No llega al mínimo de vistas</td><td>Por debajo del mínimo de la campaña, normalmente no se cobra ese clip (Whop puede pagar una parte proporcional si al acabar la campaña sobra presupuesto).</td><td>${fiab("oficial")}</td></tr>
    <tr><td>TikTok borra el clip</td><td>Pierdes lo de ese clip y en Vyro pueden reclamar lo cobrado. Cuidado con música, contenido sensible y normas de TikTok.</td><td>${fiab("oficial")}</td></tr>
    <tr><td>País no admitido</td><td>Algunas campañas limitan por país. Compruébalo antes de cortar.</td><td>${fiab("sector")}</td></tr>
  </tbody></table>
  ${fuente("condiciones oficiales de Whop Content Rewards y de Vyro para clippers; guías de FindClout y ClipSpeed (2026) para el motivo principal de rechazo y la limitación por país.")}

  <h3>Errores de cuenta</h3>
  <ul>
    <li><b>Mezclar nichos</b> en una cuenta: TikTok no sabe a quién enseñarla.</li>
    <li><b>Resubir sin editar:</b> lo no original o reutilizado sin aportar nada no sale en «Para ti». Añade siempre reencuadre, cortes, texto y subtítulos. ${fiab("oficial")}</li>
    <li><b>Interactuar entre tus cuentas</b> (darte «me gusta» o comentarte desde otra cuenta tuya): es interacción artificial. ${fiab("oficial")}</li>
    <li><b>Abrir otra cuenta si te sancionan una:</b> está prohibido y TikTok puede bloquear todas las asociadas. ${fiab("oficial")}</li>
    <li><b>Música con derechos</b> sonando de fondo: puede tumbar el clip.</li>
    <li><b>Varias cuentas en Vyro:</b> solo una por persona, y cada cuenta de TikTok solo puede estar en una cuenta de Vyro; si no, te la pueden cerrar y quitar los pagos. ${fiab("oficial")}</li>
    <li><b>Actividad de bot:</b> seguir o dar «me gusta» a todo de golpe. ${fiab("sector")}</li>
    <li><b>Cobrar fuera de la plataforma</b> en una campaña de Whop: está prohibido. ${fiab("oficial")}</li>
    <li><b>Creerse las promesas</b> de ganancias seguras o pagar por entrar en una campaña.</li>
  </ul>
  ${nota("Sobre «shadowban» y similares: no hay ninguna fuente oficial que los confirme como norma. Si una cuenta cae, lo primero es revisar si el contenido aporta edición propia y si cumple las normas de TikTok.", "cian")}`;
}
