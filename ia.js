"use strict";
// Herramientas de IA (Claude, SDK oficial de Anthropic empaquetado en vendor/anthropic.js).
// La clave de la API se guarda solo en este dispositivo (no se sincroniza) y cada consulta la pagas tú en tu cuenta de Anthropic.
// La IA solo trabaja con los datos que le pasa la app: se le pide que no invente cifras.

(() => {
  const LS = { clave: "ia:clave", modelo: "ia:modelo", gasto: "ia:gasto" };
  const ls = {
    get: (k) => {
      try {
        return localStorage.getItem(k);
      } catch {
        return null;
      }
    },
    set: (k, v) => {
      try {
        v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v);
      } catch {}
    },
  };
  // Precios por millón de tokens (entrada / salida), tarifa de Anthropic
  const MODELOS = {
    "claude-opus-5-5": { nombre: "Claude Opus 5.5 (la mejor calidad)", entrada: 4, salida: 20, fallback: true },
    "claude-sonnet-5-5": { nombre: "Claude Sonnet 5.5 (buena y más barata)", entrada: 2, salida: 10, fallback: true },
    "claude-haiku-5-5": { nombre: "Claude Haiku 5.5 (la más barata)", entrada: 0.1, salida: 0.5, fallback: false },
  };
  const modelo = () => (MODELOS[ls.get(LS.modelo)] ? ls.get(LS.modelo) : "claude-opus-5-5");
  const clave = () => ls.get(LS.clave) || "";

  const BASE = `Eres el asistente de Estudio Clipping, una app para ganar dinero haciendo clipping en TikTok con permiso (campañas de Whop Content Rewards y Vyro, o acuerdos con creadores). Escribes en español de España, claro y directo, para alguien que empieza.
Reglas: usa solo los datos que te doy; si un dato no está, dilo y no lo inventes. No prometas ganancias. No recomiendes comprar vistas, bots, promoción pagada ni subir contenido sin permiso: está prohibido en las campañas. Cuando des cifras, di de dónde salen.`;

  function cliente() {
    if (!clave()) throw new Error("Falta tu clave de la API de Claude (Ajustes → Inteligencia artificial)");
    return new window.AnthropicSDK({ apiKey: clave(), dangerouslyAllowBrowser: true });
  }

  function apuntarGasto(uso) {
    const m = MODELOS[modelo()];
    const eur = ((uso.input_tokens || 0) * m.entrada + (uso.output_tokens || 0) * m.salida) / 1e6;
    const g = JSON.parse(ls.get(LS.gasto) || '{"mes":"","total":0}');
    const mes = hoyISO().slice(0, 7);
    if (g.mes !== mes) (g.mes = mes), (g.total = 0);
    g.total += eur;
    ls.set(LS.gasto, JSON.stringify(g));
    return eur;
  }

  // Llamada con salida JSON validada por la API (structured outputs)
  async function pedirJSON(instrucciones, datos, esquema, effort = "medium") {
    const m = modelo();
    const peticion = {
      model: m,
      max_tokens: 16000,
      system: BASE + "\n\n" + instrucciones,
      messages: [{ role: "user", content: typeof datos === "string" ? datos : JSON.stringify(datos, null, 1) }],
      output_config: { effort, format: { type: "json_schema", schema: esquema } },
    };
    const r = MODELOS[m].fallback
      ? await cliente().beta.messages.create({ ...peticion, betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" })
      : await cliente().messages.create(peticion);
    if (r.stop_reason === "refusal") throw new Error("La IA ha rechazado esta petición");
    if (r.stop_reason === "max_tokens") throw new Error("La respuesta era demasiado larga; prueba con menos texto");
    const texto = r.content.filter((b) => b.type === "text").map((b) => b.text).join("");
    const coste = apuntarGasto(r.usage || {});
    return { datos: JSON.parse(texto), coste };
  }

  async function pedirTexto(instrucciones, mensajes, effort = "medium") {
    const m = modelo();
    const peticion = { model: m, max_tokens: 16000, system: BASE + "\n\n" + instrucciones, messages: mensajes, output_config: { effort } };
    const r = MODELOS[m].fallback
      ? await cliente().beta.messages.create({ ...peticion, betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" })
      : await cliente().messages.create(peticion);
    if (r.stop_reason === "refusal") throw new Error("La IA ha rechazado esta petición");
    const coste = apuntarGasto(r.usage || {});
    return { texto: r.content.filter((b) => b.type === "text").map((b) => b.text).join(""), coste };
  }

  const traducirError = (e) => {
    const m = e?.message || String(e);
    if (e?.status === 401 || /authentication|api key|x-api-key/i.test(m)) return "La clave de la API no es válida. Revísala en Ajustes → Inteligencia artificial.";
    if (e?.status === 429) return "Demasiadas consultas seguidas o límite de gasto alcanzado. Espera un poco o revisa tu cuenta de Anthropic.";
    if (e?.status === 400 && /credit|balance/i.test(m)) return "Tu cuenta de Anthropic no tiene saldo. Añade crédito en console.anthropic.com.";
    if (/fetch|network|failed/i.test(m)) return "Sin conexión con la IA. Revisa internet.";
    return m;
  };
  const pie = (coste) => `<p class="peq" style="margin-top:8px">✨ ${MODELOS[modelo()].nombre.split(" (")[0]} · esta consulta ≈ ${coste < 0.01 ? "menos de 1 céntimo" : coste.toFixed(2) + " $"}. Revisa siempre lo que propone.</p>`;
  const cargando = (zona, t) => (zona.innerHTML = `<div class="tarjeta ia-cargando">✨ ${t}…</div>`);
  const fallo = (zona, e) => (zona.innerHTML = `<div class="tarjeta" style="border-color:var(--rosa)">⚠ ${esc(traducirError(e))}</div>`);
  const sinClave = (zona) =>
    !clave() &&
    ((zona.innerHTML = `<div class="tarjeta" style="border-color:var(--cian)">Para usar la IA, pon tu clave de la API de Claude en <b>Ajustes → Inteligencia artificial</b> (allí te explica cómo conseguirla).</div>`), true);

  // Resumen de tus números para dar contexto a la IA (solo datos reales de la app)
  function resumenTusDatos() {
    const pubs = D.clips.filter((c) => CUENTAN_VISTAS.includes(c.estado));
    const v = pubs.map((c) => n(c.vistas));
    return {
      idioma_de_tus_cuentas: IDIOMAS[idiomaObjetivo()],
      cuentas: D.cuentas.map((a) => ({ usuario: a.usuario, nicho: a.nicho, seguidores: a.seguidores || null, estado: a.estado })),
      clips_publicados: pubs.length,
      vistas_media_por_clip: pubs.length ? Math.round(v.reduce((a, b) => a + b, 0) / pubs.length) : null,
      vistas_mediana_por_clip: pubs.length ? Math.round(mediana(v)) : null,
    };
  }

  const datosCampana = (c) => {
    const v = veredicto(c);
    return {
      id: c.id,
      nombre: c.nombre,
      creador: c.org,
      plataforma: c.plat,
      idioma: IDIOMAS[c.idioma] + (c.idiomaFuente === "oficial" ? "" : " (detectado por el texto)"),
      descripcion: c.desc,
      categorias: c.cats,
      tarifa_tiktok_usd_por_1000: c.tarifa,
      vistas_minimas_para_cobrar: c.minVistas || null,
      pago_maximo_por_clip_usd: c.maxPago || null,
      presupuesto_usd: c.presupuesto,
      queda_usd: Math.round(c.restante),
      clippers: c.clippers,
      clips_aprobados: c.aprobados ?? null,
      vistas_totales: c.vistas ?? null,
      vistas_media_por_clip_aprobado: c.vistasPorClip ?? null,
      vistas_pagadas: c.vistasPagadas ?? null,
      ganado_medio_por_clipper_usd: c.medioPorClipper ?? null,
      vistas_ultimos_7_dias: c.ult7 ?? null,
      vistas_7_dias_anteriores: c.prev7 ?? null,
      vistas_mejor_semana: c.pico7 ?? null,
      clips_aprobados_ultimos_14_dias: c.serieAprob ? c.serieAprob.slice(-14).reduce((a, b) => a + b, 0) : null,
      mejores_ganadores: c.topGanadores || [],
      mejores_clips: (c.topClips || []).map((t) => ({ vistas: t.vistas, titulo: t.titulo })),
      fin: c.fin ? c.fin + (c.finEstimado ? " (estimado por su ritmo de gasto)" : " (oficial)") : null,
      hay_que_solicitarla: c.solicitud,
      bloqueada: c.bloqueada,
      veredicto_de_la_app: v.etiqueta,
      motivos_de_la_app: v.motivos,
    };
  };

  window.ia = {
    MODELOS,
    modelo,
    configurada: () => !!clave(),

    // ---------- Ajustes ----------
    tarjetaAjustes() {
      const g = JSON.parse(ls.get(LS.gasto) || '{"mes":"","total":0}');
      return `<h2>Inteligencia artificial</h2>
      <div class="tarjeta" style="max-width:720px">
        <p class="peq" style="margin-top:0">Las herramientas ✨ usan Claude, la IA de Anthropic, con <b>tu propia clave</b>. Cómo conseguirla: entra en <b>console.anthropic.com</b>, crea una cuenta, añade algo de saldo (Billing) y en <b>API Keys</b> pulsa «Create Key». Cópiala y pégala aquí. La clave se guarda <b>solo en este dispositivo</b> (no se sincroniza): ponla también en el otro.</p>
        <div class="form">
          <label class="ancho">Clave de la API de Claude<input id="ia-clave" type="password" autocomplete="off" placeholder="sk-ant-…" value="${esc(clave())}" /></label>
          <label class="ancho">Modelo<select id="ia-modelo">${opciones(Object.entries(MODELOS).map(([id, m]) => [id, `${m.nombre} · ${m.entrada} $ / ${m.salida} $ por millón de tokens`]), modelo())}</select></label>
        </div>
        <p class="peq">Coste orientativo: una consulta típica (ganchos de un clip, informe de una campaña) usa unos pocos miles de tokens: con Opus 5.5, del orden de céntimos; con Haiku 5.5, una fracción de céntimo. Gastado este mes en este dispositivo (estimado): <b>${(g.mes === hoyISO().slice(0, 7) ? g.total : 0).toFixed(2)} $</b>.</p>
        <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn prim" id="ia-guardar">Guardar</button><button class="btn" id="ia-probar">Probar la conexión</button>${clave() ? `<button class="btn peligro" id="ia-borrar">Quitar la clave</button>` : ""}</div>
        <div id="ia-prueba"></div>
      </div>`;
    },
    montarAjustes() {
      const $$ = (id) => document.getElementById(id);
      if (!$$("ia-guardar")) return;
      $$("ia-guardar").onclick = () => {
        ls.set(LS.clave, $$("ia-clave").value.trim() || null);
        ls.set(LS.modelo, $$("ia-modelo").value);
        aviso("Ajustes de IA guardados");
        vistaAjustes();
      };
      $$("ia-borrar") && ($$("ia-borrar").onclick = () => (ls.set(LS.clave, null), vistaAjustes(), aviso("Clave quitada")));
      $$("ia-probar").onclick = async () => {
        ls.set(LS.clave, $$("ia-clave").value.trim() || null);
        ls.set(LS.modelo, $$("ia-modelo").value);
        const z = $$("ia-prueba");
        if (sinClave(z)) return;
        cargando(z, "Probando");
        try {
          const r = await pedirTexto("Responde solo con: «Conexión correcta».", [{ role: "user", content: "Prueba de conexión" }], "low");
          z.innerHTML = `<div class="tarjeta" style="border-color:var(--verde)">✓ ${esc(r.texto)}</div>${pie(r.coste)}`;
        } catch (e) {
          fallo(z, e);
        }
      };
    },

    // ---------- 1. Ganchos y texto de un clip ----------
    async ganchosClip(f, zona, alUsar) {
      if (sinClave(zona)) return;
      cargando(zona, "Pensando ganchos y texto para TikTok");
      const camp = campana(f.campanaId);
      const cta = cuenta(f.cuentaId);
      try {
        const { datos, coste } = await pedirJSON(
          `Te paso un clip de TikTok que va a publicar un clipper. Propón 5 ganchos distintos para los primeros 1–3 segundos (texto en pantalla, máximo 10 palabras, en el idioma de la cuenta), un título corto para poner en pantalla, una descripción para TikTok con palabras que la gente buscaría y hashtags. Respeta las reglas de la campaña (mención, hashtags obligatorios, etiqueta de publicidad al principio de la descripción si la pide). No inventes datos del clip que no estén en la información.`,
          {
            clip: { titulo: f.titulo, de_donde_sale: f.fuente, tramo: [f.inicio, f.fin].filter(Boolean).join("–"), duracion_s: f.duracion, gancho_actual: f.gancho, descripcion_actual: f.descripcion, notas: f.notas },
            cuenta: cta ? { usuario: cta.usuario, nicho: cta.nicho } : null,
            campana: camp ? { nombre: camp.nombre, creador: camp.creador, reglas: camp.reglas, mencion: camp.mencion, hashtags_obligatorios: camp.hashtagsObl, etiqueta_publicidad: camp.divulgacion } : null,
            idioma: IDIOMAS[idiomaObjetivo()],
            ganchos_que_mejor_te_funcionan: D.ganchos
              .map((g) => {
                const cs = D.clips.filter((c) => (c.gancho || "").trim() === g.texto.trim() && CUENTAN_VISTAS.includes(c.estado));
                return { texto: g.texto, usos: cs.length, media: cs.length ? Math.round(cs.reduce((s, c) => s + n(c.vistas), 0) / cs.length) : 0 };
              })
              .filter((g) => g.usos)
              .sort((a, b) => b.media - a.media)
              .slice(0, 5),
          },
          {
            type: "object",
            properties: {
              ganchos: { type: "array", items: { type: "object", properties: { texto: { type: "string" }, por_que: { type: "string" } }, required: ["texto", "por_que"], additionalProperties: false } },
              titulo_en_pantalla: { type: "string" },
              descripcion: { type: "string" },
              hashtags: { type: "array", items: { type: "string" } },
            },
            required: ["ganchos", "titulo_en_pantalla", "descripcion", "hashtags"],
            additionalProperties: false,
          }
        );
        zona.innerHTML = `<div class="tarjeta ia-res">
          <b>Ganchos</b>${datos.ganchos.map((g, i) => `<div class="ia-item"><div style="flex:1"><div>${esc(g.texto)}</div><div class="peq">${esc(g.por_que)}</div></div><button class="btn peq" type="button" data-g="${i}">Usar</button></div>`).join("")}
          <b style="display:block;margin-top:10px">Título en pantalla</b><div>${esc(datos.titulo_en_pantalla)}</div>
          <b style="display:block;margin-top:10px">Descripción</b><div style="white-space:pre-wrap">${esc(datos.descripcion)}</div>
          <div class="peq">${datos.hashtags.map(esc).join(" ")}</div>
          <button class="btn peq prim" type="button" id="ia-usar-desc" style="margin-top:8px">Usar descripción y hashtags</button>
        </div>${pie(coste)}`;
        zona.querySelectorAll("[data-g]").forEach((b) => (b.onclick = () => alUsar({ gancho: datos.ganchos[b.dataset.g].texto })));
        zona.querySelector("#ia-usar-desc").onclick = () => alUsar({ descripcion: datos.descripcion, hashtags: datos.hashtags.map((h) => (h.startsWith("#") ? h : "#" + h)).join(" ") });
      } catch (e) {
        fallo(zona, e);
      }
    },

    // ---------- 2. Momentos virales desde una transcripción ----------
    async momentos(transcripcion, opciones, zona) {
      if (sinClave(zona)) return;
      if (transcripcion.trim().length < 200) return (zona.innerHTML = `<div class="tarjeta">Pega una transcripción más larga (con los tiempos, como la que da YouTube en «Mostrar transcripción»).</div>`);
      cargando(zona, "Leyendo la transcripción y buscando los mejores momentos");
      const camp = campana(opciones.campanaId);
      try {
        const { datos, coste } = await pedirJSON(
          `Te paso la transcripción con tiempos de un vídeo largo (pódcast, directo, entrevista). Encuentra los ${opciones.cuantos} mejores momentos para clips verticales de TikTok de ${opciones.durMin}–${opciones.durMax} segundos: momentos que se entienden solos, con una frase fuerte al principio o un remate claro. Usa SOLO tiempos que aparezcan en la transcripción (formato mm:ss o h:mm:ss) y cita la frase exacta con la que arranca. Ordénalos de mejor a peor. Si la transcripción no tiene tiempos, dilo en «aviso» y estima por orden de aparición.`,
          `Campaña: ${camp ? camp.nombre + " (" + (camp.creador || "") + "). Reglas: " + (camp.reglas || "sin reglas apuntadas") : "sin campaña"}\nIdioma de la cuenta: ${IDIOMAS[idiomaObjetivo()]}\n\nTRANSCRIPCIÓN:\n${transcripcion.slice(0, 400000)}`,
          {
            type: "object",
            properties: {
              aviso: { type: "string" },
              momentos: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    inicio: { type: "string" },
                    fin: { type: "string" },
                    frase_inicial: { type: "string" },
                    titulo: { type: "string" },
                    gancho: { type: "string" },
                    por_que_funciona: { type: "string" },
                    puntuacion: { type: "integer" },
                  },
                  required: ["inicio", "fin", "frase_inicial", "titulo", "gancho", "por_que_funciona", "puntuacion"],
                  additionalProperties: false,
                },
              },
            },
            required: ["aviso", "momentos"],
            additionalProperties: false,
          },
          "high"
        );
        zona.innerHTML = `${datos.aviso ? `<div class="tarjeta" style="border-color:var(--ambar)">${esc(datos.aviso)}</div>` : ""}
          ${datos.momentos
            .map(
              (m, i) => `<div class="tarjeta ia-res" style="margin-top:10px"><div style="display:flex;gap:10px;align-items:flex-start">
              <span class="radar-p ${m.puntuacion >= 7 ? "alta" : ""}">${m.puntuacion}</span>
              <div style="flex:1;min-width:0"><b>${esc(m.titulo)}</b> <span class="chip cian">${esc(m.inicio)} – ${esc(m.fin)}</span>
              <div class="peq">«${esc(m.frase_inicial)}»</div><div style="margin-top:4px">⚡ ${esc(m.gancho)}</div><div class="peq">${esc(m.por_que_funciona)}</div></div>
              <button class="btn peq prim" data-m="${i}">Crear clip</button></div></div>`
            )
            .join("")}${pie(coste)}`;
        zona.querySelectorAll("[data-m]").forEach(
          (b) =>
            (b.onclick = () => {
              const m = datos.momentos[b.dataset.m];
              editarClip(null, { titulo: m.titulo, inicio: m.inicio, fin: m.fin, gancho: m.gancho, fuente: opciones.fuente || "", campanaId: opciones.campanaId || "", notas: `Momento propuesto por la IA: ${m.por_que_funciona}\nArranca con: «${m.frase_inicial}»` });
            })
        );
      } catch (e) {
        fallo(zona, e);
      }
    },

    // ---------- 3. Analizar una campaña ----------
    async analizarCampana(c, zona) {
      if (sinClave(zona)) return;
      cargando(zona, "Analizando la campaña con sus datos");
      try {
        const { datos, coste } = await pedirJSON(
          `Analiza si esta campaña le renta a este clipper, como un analista que mira los números. Fíjate sobre todo en: vistas medias por clip frente al mínimo para cobrar, qué parte de las vistas se ha pagado, lo que gana de media cada clipper y el mejor, la tendencia de vistas (últimos 7 días frente a los anteriores y su mejor semana), el dinero que queda por clipper y si encaja con sus cuentas e idioma. Da una ganancia esperada realista por clip y por mes SOLO si los datos lo permiten, explicando el cálculo.`,
          { campana: datosCampana(c), tus_datos: resumenTusDatos() },
          {
            type: "object",
            properties: {
              veredicto: { type: "string", enum: ["Renta", "Dudosa", "No renta", "Sin datos suficientes"] },
              resumen: { type: "string" },
              ganancia_esperada: { type: "string" },
              a_favor: { type: "array", items: { type: "string" } },
              en_contra: { type: "array", items: { type: "string" } },
              si_te_unes: { type: "array", items: { type: "string" } },
              cuenta_recomendada: { type: "string" },
            },
            required: ["veredicto", "resumen", "ganancia_esperada", "a_favor", "en_contra", "si_te_unes", "cuenta_recomendada"],
            additionalProperties: false,
          },
          "high"
        );
        const col = { Renta: "verde", Dudosa: "ambar", "No renta": "rosa" }[datos.veredicto] || "";
        zona.innerHTML = `<div class="tarjeta ia-res" style="margin-top:12px"><b>✨ Análisis de la IA</b> <span class="chip ${col}">${esc(datos.veredicto)}</span>
          <p>${esc(datos.resumen)}</p><p><b>Ganancia esperada:</b> ${esc(datos.ganancia_esperada)}</p>
          <div class="rejilla dos"><div><b>A favor</b><ul>${datos.a_favor.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div><div><b>En contra</b><ul>${datos.en_contra.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div></div>
          <b>Si te unes</b><ul>${datos.si_te_unes.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
          <p class="peq"><b>Cuenta:</b> ${esc(datos.cuenta_recomendada)}</p></div>${pie(coste)}`;
      } catch (e) {
        fallo(zona, e);
      }
    },

    // ---------- 4. Agente de campañas ----------
    async agenteCampanas(zona) {
      if (sinClave(zona)) return;
      const R = radar();
      if (!R.items.length) return (zona.innerHTML = `<p class="peq">Primero actualiza el radar.</p>`);
      cargando(zona, "Revisando tus campañas y las del radar");
      const mias = D.campanas
        .filter((k) => k.estado !== "terminada")
        .map((k) => {
          const c = k.radarId && R.items.find((x) => x.id === k.radarId);
          const clips = D.clips.filter((x) => x.campanaId === k.id && CUENTAN_VISTAS.includes(x.estado));
          return { id: k.id, nombre: k.nombre, estado: k.estado, tus_clips: clips.length, tus_vistas: clips.reduce((s, x) => s + n(x.vistas), 0), datos_publicos: c ? datosCampana(c) : "no está en el radar (campaña apuntada a mano)" };
        });
      const candidatas = R.items
        .map(evaluar)
        .filter((c) => !D.campanas.some((k) => k.radarId === c.id) && !c.bloqueada && !(R.descartadas || {})[c.id])
        .sort((a, b) => b.puntos - a.puntos)
        .slice(0, 25)
        .map((c) => ({ ...datosCampana(c), puntuacion_app: c.puntos }));
      try {
        const { datos, coste } = await pedirJSON(
          `Eres el gestor de campañas de este clipper. Revisa sus campañas actuales y las candidatas del radar (Whop y Vyro) y decide qué hacer en cada cuenta para ganar más con su tiempo: retirar (o pausar) las que ya no rinden o se acaban, mantener las que funcionan y añadir las mejores candidatas que encajen con el nicho e idioma de cada cuenta. Máximo 3 campañas activas por cuenta. Justifica cada decisión con los datos. Usa exactamente los «id» que te paso.`,
          { tus_datos: resumenTusDatos(), tus_campanas: mias, candidatas_del_radar: candidatas },
          {
            type: "object",
            properties: {
              resumen: { type: "string" },
              cambios: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    accion: { type: "string", enum: ["añadir", "mantener", "pausar", "retirar"] },
                    id: { type: "string" },
                    nombre: { type: "string" },
                    cuenta: { type: "string" },
                    motivo: { type: "string" },
                  },
                  required: ["accion", "id", "nombre", "cuenta", "motivo"],
                  additionalProperties: false,
                },
              },
            },
            required: ["resumen", "cambios"],
            additionalProperties: false,
          },
          "high"
        );
        const col = { añadir: "verde", mantener: "cian", pausar: "ambar", retirar: "rosa" };
        zona.innerHTML = `<div class="ia-res" style="margin-top:10px"><p>${esc(datos.resumen)}</p>
          ${datos.cambios
            .map(
              (x, i) => `<div class="ia-item"><span class="chip ${col[x.accion]}">${esc(x.accion)}</span><div style="flex:1;min-width:0"><b>${esc(x.nombre)}</b> <span class="peq">· ${esc(x.cuenta)}</span><div class="peq">${esc(x.motivo)}</div></div>${x.accion === "mantener" ? "" : `<button class="btn peq" data-cambio="${i}">Aplicar</button>`}</div>`
            )
            .join("")}
          <button class="btn prim" id="ia-aplicar-todo" style="margin-top:8px">Aplicar todos los cambios</button></div>${pie(coste)}`;
        const aplicar = (x) => {
          if (x.accion === "añadir") {
            const c = R.items.find((y) => y.id === x.id);
            if (!c || D.campanas.some((k) => k.radarId === c.id)) return false;
            D.campanas.push({ id: uid(), radarId: c.id, nombre: c.nombre, plataforma: c.plat, creador: c.org, cpm: c.tarifa, moneda: "USD", presupuesto: c.presupuesto, gastadoPct: c.presupuesto ? Math.round((1 - c.restante / c.presupuesto) * 100) : 0, minVistas: c.minVistas || "", maxPorClip: c.maxPago || "", fechaFin: c.fin && !c.finEstimado ? c.fin : "", enlace: c.enlace, redes: (c.redes || []).join(", "), estado: "porunirte", reglas: "", notas: `Propuesta por el agente de IA para ${x.cuenta}: ${x.motivo}` });
            registrarPiloto(`IA: añadida «${c.nombre}» para ${x.cuenta}`);
            return true;
          }
          const k = D.campanas.find((y) => y.id === x.id);
          if (!k) return false;
          k.estado = x.accion === "pausar" ? "pausada" : "terminada";
          registrarPiloto(`IA: ${x.accion === "pausar" ? "pausada" : "retirada"} «${k.nombre}» (${x.motivo})`);
          return true;
        };
        zona.querySelectorAll("[data-cambio]").forEach(
          (b) =>
            (b.onclick = () => {
              if (aplicar(datos.cambios[b.dataset.cambio])) (guardar(), (b.textContent = "✓ Hecho"), (b.disabled = true));
            })
        );
        zona.querySelector("#ia-aplicar-todo").onclick = () => {
          const n = datos.cambios.filter((x) => x.accion !== "mantener").filter(aplicar).length;
          guardar();
          aviso(`${n} cambio(s) aplicados. Las nuevas están en Campañas como «Por unirte».`);
          vistaRadar();
        };
      } catch (e) {
        fallo(zona, e);
      }
    },

    // ---------- 5. Consejos sobre tus números ----------
    async consejos(zona) {
      if (sinClave(zona)) return;
      const pubs = D.clips.filter((c) => CUENTAN_VISTAS.includes(c.estado));
      if (pubs.length < 3) return (zona.innerHTML = `<div class="tarjeta">Necesitas al menos 3 clips publicados con sus vistas para que la IA saque conclusiones.</div>`);
      cargando(zona, "Estudiando tus números");
      const clips = pubs.slice(-150).map((c) => ({
        cuenta: cuenta(c.cuentaId)?.usuario,
        campana: campana(c.campanaId)?.nombre,
        publicado: c.fechaPub,
        duracion_s: n(c.duracion) || null,
        gancho: c.gancho || null,
        vistas: n(c.vistas),
        me_gusta: n(c.likes) || null,
        comentarios: n(c.comentarios) || null,
        compartidos: n(c.compartidos) || null,
        minutos_edicion: n(c.minutos) || null,
        estimado_eur: +gananciaClip(c).toFixed(2),
        minimo_campana: n(campana(c.campanaId)?.minVistas) || null,
      }));
      try {
        const { datos, coste } = await pedirJSON(
          `Analiza los clips publicados de este clipper y dile qué está funcionando y qué no, con cifras de sus propios datos (cuenta, campaña, gancho, duración, hora y día de publicación, interacción, minutos de edición frente a lo que gana). Luego dale acciones concretas para la próxima semana. Si hay pocos datos para una conclusión, dilo.`,
          { tus_datos: resumenTusDatos(), clips, cobrado_eur: D.cobros.filter((p) => p.estado === "cobrado").reduce((s, p) => s + aEur(p.importe, p.moneda), 0) },
          {
            type: "object",
            properties: {
              diagnostico: { type: "string" },
              funciona: { type: "array", items: { type: "string" } },
              no_funciona: { type: "array", items: { type: "string" } },
              acciones: { type: "array", items: { type: "object", properties: { accion: { type: "string" }, por_que: { type: "string" }, prioridad: { type: "string", enum: ["alta", "media", "baja"] } }, required: ["accion", "por_que", "prioridad"], additionalProperties: false } },
            },
            required: ["diagnostico", "funciona", "no_funciona", "acciones"],
            additionalProperties: false,
          },
          "high"
        );
        const col = { alta: "rosa", media: "ambar", baja: "" };
        zona.innerHTML = `<div class="tarjeta ia-res"><p>${esc(datos.diagnostico)}</p>
          <div class="rejilla dos"><div><b>Funciona</b><ul>${datos.funciona.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div><div><b>No funciona</b><ul>${datos.no_funciona.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div></div>
          <b>Esta semana</b>${datos.acciones.map((a) => `<div class="ia-item"><span class="chip ${col[a.prioridad]}">${esc(a.prioridad)}</span><div style="flex:1"><b>${esc(a.accion)}</b><div class="peq">${esc(a.por_que)}</div></div></div>`).join("")}</div>${pie(coste)}`;
      } catch (e) {
        fallo(zona, e);
      }
    },

    // ---------- 6. Asistente (chat) ----------
    chat: [],
    async preguntar(texto, zona) {
      if (sinClave(zona)) return;
      this.chat.push({ role: "user", content: texto });
      vistaAsistente();
      try {
        const R = radar();
        const contexto = {
          tus_datos: resumenTusDatos(),
          tus_campanas: D.campanas.filter((k) => k.estado !== "terminada").map((k) => ({ nombre: k.nombre, estado: k.estado, plataforma: k.plataforma, tarifa: k.cpm, minimo_vistas: k.minVistas })),
          radar_actualizado: R.actualizado || "nunca",
          mejores_del_radar: R.items.map(evaluar).sort((a, b) => b.puntos - a.puntos).slice(0, 12).map(datosCampana),
          nichos_recomendados_en_la_app: NICHOS_RECOMENDADOS.map((x) => x.nombre),
        };
        const r = await pedirTexto(
          `Respondes preguntas del clipper sobre clipping en TikTok, sus campañas y sus números. Tienes estos datos actuales de su app (úsalos cuando ayuden):\n${JSON.stringify(contexto)}\nSé concreto y breve. Si la pregunta necesita un dato que no tienes, dilo y explica dónde mirarlo (TikTok Studio, Whop, Vyro o un apartado de la app).`,
          this.chat.slice(-20),
          "medium"
        );
        this.chat.push({ role: "assistant", content: r.texto, coste: r.coste });
      } catch (e) {
        this.chat.push({ role: "assistant", content: "⚠ " + traducirError(e), error: true });
      }
      vistaAsistente();
    },
  };
})();

// ---------- Sección Asistente IA ----------
function vistaAsistente() {
  acciones(ia.chat.length ? [["chat-nuevo", "Nueva conversación"]] : []);
  $("#chat-nuevo") && ($("#chat-nuevo").onclick = () => ((ia.chat = []), vistaAsistente()));
  const sugerencias = ["¿Qué campaña me conviene más ahora para cada cuenta?", "¿Por qué mis clips no pasan de 500 vistas?", "¿Cuántos clips al día debería subir para ganar 300 € al mes?", "¿Qué hago esta semana?"];
  const pendiente = ia.chat.length && ia.chat[ia.chat.length - 1].role === "user";
  $("#contenido").innerHTML = `
    ${ia.configurada() ? "" : `<div class="tarjeta" style="border-color:var(--cian);margin-bottom:14px">Para hablar con la IA, pon tu clave de la API de Claude en <b>Ajustes → Inteligencia artificial</b>.</div>`}
    <div class="chat">
      ${
        ia.chat.length
          ? ia.chat.map((m) => `<div class="chat-m ${m.role === "user" ? "yo" : "ia"} ${m.error ? "error" : ""}">${esc(m.content).replace(/\n/g, "<br>")}${m.coste != null ? `<div class="peq" style="margin-top:6px">≈ ${m.coste < 0.01 ? "<1 céntimo" : m.coste.toFixed(2) + " $"}</div>` : ""}</div>`).join("")
          : `<div class="vacio">Pregúntale lo que quieras sobre clipping, tus campañas o tus números. Conoce tus cuentas, tus campañas, tus vistas y las mejores campañas del radar.<div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin-top:14px">${sugerencias.map((s) => `<button class="btn peq" data-sug="${esc(s)}">${esc(s)}</button>`).join("")}</div></div>`
      }
      ${pendiente ? `<div class="chat-m ia ia-cargando">✨ Pensando…</div>` : ""}
    </div>
    <div class="chat-caja"><textarea id="chat-txt" placeholder="Escribe tu pregunta…" ${pendiente ? "disabled" : ""}></textarea><button class="btn prim" id="chat-enviar" ${pendiente ? "disabled" : ""}>Enviar</button></div>
    <div id="chat-zona"></div>`;
  const enviar = () => {
    const t = $("#chat-txt").value.trim();
    if (t) ia.preguntar(t, $("#chat-zona"));
  };
  $("#chat-enviar").onclick = enviar;
  $("#chat-txt").onkeydown = (e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), enviar());
  $("#contenido").querySelectorAll("[data-sug]").forEach((b) => (b.onclick = () => ia.preguntar(b.dataset.sug, $("#chat-zona"))));
  const c = $("#contenido");
  c.scrollTop = c.scrollHeight;
}

// ---------- Bloque «Buscar momentos con IA» de la Mesa de corte ----------
function bloqueMomentosIA() {
  return `<div class="tarjeta" style="margin-top:18px">
    <h3 style="margin-top:0">✨ Buscar los mejores momentos con IA</h3>
    <p class="peq">En YouTube, abre el vídeo largo → «…más» de la descripción → <b>Mostrar transcripción</b>, selecciona todo el texto (con los tiempos) y pégalo aquí. La IA lo lee entero y te propone los mejores momentos con su tiempo de inicio y fin, el gancho y por qué funcionan. Cada uno se convierte en un clip con un toque.</p>
    <div class="form">
      <label class="ancho">Transcripción con tiempos<textarea id="ia-trans" style="min-height:120px" placeholder="0:00 Bienvenidos a…&#10;0:07 Hoy tenemos con nosotros a…"></textarea></label>
      <label>Campaña<select id="ia-trans-camp">${opciones(D.campanas.filter((c) => c.estado !== "terminada").map((c) => [c.id, c.nombre]), "", "Sin campaña")}</select></label>
      <label>De dónde sale (opcional)<input id="ia-trans-fuente" placeholder="Nombre del vídeo o enlace" /></label>
      <label>Duración del clip (s)<div style="display:flex;gap:6px"><input id="ia-trans-min" type="number" value="25" min="5" /><input id="ia-trans-max" type="number" value="60" min="5" /></div></label>
      <label>Cuántos momentos<input id="ia-trans-n" type="number" value="8" min="1" max="20" /></label>
    </div>
    <button class="btn prim" id="ia-trans-btn" style="margin-top:10px">Buscar momentos</button>
    <div id="ia-trans-res"></div>
  </div>`;
}
function montarMomentosIA() {
  const b = document.getElementById("ia-trans-btn");
  if (!b) return;
  b.onclick = () =>
    ia.momentos(
      document.getElementById("ia-trans").value,
      {
        campanaId: document.getElementById("ia-trans-camp").value,
        fuente: document.getElementById("ia-trans-fuente").value,
        durMin: n(document.getElementById("ia-trans-min").value) || 25,
        durMax: n(document.getElementById("ia-trans-max").value) || 60,
        cuantos: Math.min(20, Math.max(1, n(document.getElementById("ia-trans-n").value) || 8)),
      },
      document.getElementById("ia-trans-res")
    );
}
