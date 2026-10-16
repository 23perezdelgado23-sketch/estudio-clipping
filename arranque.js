"use strict";
// Estudio Clipping · «Empieza aquí»: plan de 30 días, rutina diaria, revisión semanal y errores típicos.
// Lo que sale de condiciones oficiales se marca como tal; lo que sale de guías del sector, también.

const PLAN = [
  {
    fase: "Fase 0 · Antes de empezar",
    cuando: "Día 1",
    pasos: [
      ["p-edad", "Tener 18 años o más: Whop y Vyro lo exigen.", "oficial"],
      ["p-whop", "Crear la cuenta en whop.com y entrar en Content Rewards (ver «Conseguir vídeos → Whop»).", "oficial"],
      ["p-vyro", "Crear UNA sola cuenta en vyro.com y comprobar al registrarte que funciona en tu país.", "oficial"],
      ["p-campanas", "Mirar en el Radar de campañas las que hay activas para los 4 nichos y en tu idioma. Si un nicho no tiene campañas, cambiarlo por otro que sí tenga.", ""],
      ["p-capcut", "Instalar CapCut (gratis) para editar.", ""],
      ["p-ajustes", "Rellenar Ajustes: el cambio del dólar y vuestro objetivo de clips al día.", ""],
    ],
  },
  {
    fase: "Fase 1 · Montar las cuentas",
    cuando: "Días 1–2",
    pasos: [
      ["p-tiktok", "Crear las 4 cuentas de TikTok, una por nicho (en Estrategia → Las 4 cuentas tienes el botón para apuntarlas en la app).", ""],
      ["p-personal", "Dejarlas como cuenta personal, no de empresa: según las guías, las de empresa solo pueden usar la música de la biblioteca comercial.", "sector"],
      ["p-perfil", "Nombre, foto y biografía que digan claramente de qué va cada cuenta (por ejemplo: «Los mejores momentos de pódcast de negocios»).", ""],
      ["p-conectar", "Conectar las cuentas de TikTok dentro de Vyro (obligatorio antes de enviar clips) y tenerlas listas para Whop.", "oficial"],
    ],
  },
  {
    fase: "Fase 2 · Calentar las cuentas",
    cuando: "Días 2–7",
    pasos: [
      ["p-usar", "Usar cada cuenta como una persona normal: ver vídeos del nicho, dar «me gusta», seguir a cuentas del tema y comentar algo de vez en cuando.", "sector"],
      ["p-masivo", "Nada de acciones masivas (seguir o dar «me gusta» a todo de golpe): las guías dicen que parece un bot.", "sector"],
      ["p-unirse", "Unirse a 1–2 campañas por nicho después de repasar «Conseguir vídeos → Elegir campaña».", ""],
      ["p-apuntar", "Apuntar cada campaña en Campañas con su tarifa, mínimo, máximo, presupuesto, reglas y etiqueta de publicidad.", ""],
      ["p-material", "Descargar el material de las campañas y marcar los mejores momentos en la Mesa de corte.", ""],
    ],
  },
  {
    fase: "Fase 3 · Primeros clips",
    cuando: "Días 8–14",
    pasos: [
      ["p-uno", "Publicar 1 clip al día por cuenta, en la franja de 18:00 a 21:00.", "estudio"],
      ["p-check", "Pasar el checklist de TikTok de cada clip antes de publicar (incluida la etiqueta de publicidad).", "oficial"],
      ["p-enviar", "Enviar el enlace de cada clip a su campaña nada más publicarlo.", "oficial"],
      ["p-48h", "Apuntar las vistas de cada clip a las 48 horas.", ""],
      ["p-semana1", "Hacer la primera revisión semanal (pestaña «Revisión semanal»).", ""],
    ],
  },
  {
    fase: "Fase 4 · Probar y aprender",
    cuando: "Días 15–30",
    pasos: [
      ["p-dos", "Subir a 2 clips al día por cuenta si la calidad se mantiene.", "estudio"],
      ["p-ganchos", "Probar ganchos y tipos de momento distintos y mirar en Ganchos cuáles dan más vistas de media.", ""],
      ["p-hora", "Comparar las horas con el Panel y con las estadísticas de TikTok, y ajustar.", ""],
      ["p-presupuesto", "Dejar las campañas a las que se les acaba el presupuesto y buscar otras.", "oficial"],
      ["p-cobro", "Apuntar el primer cobro en Cobros.", ""],
    ],
  },
  {
    fase: "Fase 5 · Escalar",
    cuando: "Mes 2 en adelante",
    pasos: [
      ["p-tres", "2–3 clips al día por cuenta en lo que mejor funciona; dejar lo que no.", "estudio"],
      ["p-opus", "Con los primeros cobros, valorar OpusClip Starter (15 $/mes) para ahorrar tiempo buscando momentos.", "oficial"],
      ["p-mejores", "Ir pasando a las campañas que mejor pagan de cada nicho.", ""],
      ["p-directo", "Proponer acuerdos directos a creadores sin campaña (plantilla en «Conseguir vídeos → Creador directo»).", ""],
      ["p-gestoria", "Consultar con una gestoría cómo declarar los ingresos.", "oficial"],
    ],
  },
];

const RUTINA = [
  ["r-campanas", "Revisar las campañas: presupuesto que queda, fechas de fin y campañas nuevas"],
  ["r-momentos", "Elegir los momentos del día en la Mesa de corte"],
  ["r-editar", "Editar los clips del día con el checklist de TikTok"],
  ["r-publicar", "Publicar en la franja buena (18:00–21:00), separando las cuentas"],
  ["r-enviar", "Enviar el enlace de cada clip a su campaña"],
  ["r-comentarios", "Responder comentarios en la primera hora de cada clip"],
  ["r-vistas", "Apuntar las vistas de los clips de hace 48 horas"],
];

const ARRANQUE_TABS = [
  ["plan", "Plan de 30 días"],
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
  const html = { plan: tabPlan, rutina: tabRutina, semana: tabSemana, errores: tabErrores }[tabArranque]();
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
  <h2 style="margin-top:6px">Tu plan para empezar con el clipping</h2>
  <p>Sigue los pasos en orden y márcalos al hacerlos. Cada paso indica si viene de las condiciones oficiales, de un estudio o de guías del sector.</p>
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
    <tr><td>Fuera de fecha</td><td>Lo enviado después de la fecha de fin no cuenta.</td><td>${fiab("oficial")}</td></tr>
    <tr><td>No llega al mínimo de vistas</td><td>Por debajo del mínimo de la campaña, normalmente no se cobra ese clip (Whop puede pagar una parte proporcional si al acabar la campaña sobra presupuesto).</td><td>${fiab("oficial")}</td></tr>
    <tr><td>TikTok borra el clip</td><td>Pierdes lo de ese clip y en Vyro pueden reclamar lo cobrado. Cuidado con música, contenido sensible y normas de TikTok.</td><td>${fiab("oficial")}</td></tr>
    <tr><td>País no admitido</td><td>Algunas campañas limitan por país. Compruébalo antes de cortar.</td><td>${fiab("sector")}</td></tr>
  </tbody></table>
  ${fuente("condiciones oficiales de Whop Content Rewards y de Vyro para clippers; guías de FindClout y ClipSpeed (2026) para el motivo principal de rechazo y la limitación por país.")}

  <h3>Errores de cuenta</h3>
  <ul>
    <li><b>Mezclar nichos</b> en una cuenta: TikTok no sabe a quién enseñarla.</li>
    <li><b>Resubir sin editar:</b> TikTok penaliza el contenido no original. Añade siempre reencuadre, cortes, texto y subtítulos. ${fiab("sector")}</li>
    <li><b>Música con derechos</b> sonando de fondo: puede tumbar el clip.</li>
    <li><b>Varias cuentas en Vyro:</b> solo una por persona; si no, te la pueden cerrar y quitar los pagos. ${fiab("oficial")}</li>
    <li><b>Actividad de bot:</b> seguir o dar «me gusta» a todo de golpe. ${fiab("sector")}</li>
    <li><b>Cobrar fuera de la plataforma</b> en una campaña de Whop: está prohibido. ${fiab("oficial")}</li>
    <li><b>Creerse las promesas</b> de ganancias seguras o pagar por entrar en una campaña.</li>
  </ul>
  ${nota("Sobre «shadowban» y similares: no hay ninguna fuente oficial que los confirme como norma. Si una cuenta cae, lo primero es revisar si el contenido aporta edición propia y si cumple las normas de TikTok.", "cian")}`;
}
