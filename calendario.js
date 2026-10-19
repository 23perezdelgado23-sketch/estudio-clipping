"use strict";
// Calendario: qué publica cada cuenta cada día de la semana. Lo programado (con día y, si quieres, hora) y lo ya publicado.

let semanaCal = 0; // 0 = esta semana, -1 la anterior, 1 la siguiente

function lunesDe(desplazamiento) {
  const d = new Date(hoyISO());
  const dia = (d.getDay() + 6) % 7; // lunes = 0
  d.setDate(d.getDate() - dia + desplazamiento * 7);
  return d;
}

// ---------- Planificador automático ----------
// Reparte los clips «Listos» sin día entre las cuentas para los próximos 7 días: respeta el objetivo diario de cada cuenta,
// lo ya programado, la cuenta que propuso el piloto para su campaña y sus horas; nunca pone el mismo tramo en dos cuentas.
const HORAS_POR_DEFECTO = "13:00, 19:30, 21:30";
const horasCuenta = (a) => (a.horas || D.ajustes.horas || HORAS_POR_DEFECTO).split(/[,;\s]+/).filter((h) => /^\d{1,2}:\d{2}$/.test(h)).map((h) => h.padStart(5, "0")).sort();
function planificarSemana() {
  const cuentas = D.cuentas.filter((a) => a.estado !== "pausada");
  if (!cuentas.length) return { error: "Añade primero tus cuentas en Cuentas" };
  const pendientes = D.clips.filter((c) => c.estado === "listo" && !c.programadoDia);
  if (!pendientes.length) return { error: "No hay clips «Listos para subir» sin día" };
  const hoy = hoyISO();
  const ahora = new Date().toTimeString().slice(0, 5);
  const dias = [...Array(7)].map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return fechaLocal(d);
  });
  const cuantos = (cuentaId, dia, extra) => D.clips.concat(extra).filter((c) => c.cuentaId === cuentaId && (c.programadoDia === dia || ((c.fechaPub || "").slice(0, 10) === dia && CUENTAN_VISTAS.includes(c.estado)))).length;
  const ocupada = (cuentaId, dia, hora, extra) => D.clips.concat(extra).some((c) => c.cuentaId === cuentaId && c.programadoDia === dia && c.programadoHora === hora);
  // La cuenta preferida: la del clip, la que el piloto propuso para su campaña o la que más encaja con la campaña
  const preferida = (c) => {
    if (c.cuentaId && cuentas.some((a) => a.id === c.cuentaId)) return c.cuentaId;
    return cuentaDeCampana(campana(c.campanaId), cuentas) || null;
  };
  const propuesta = [];
  const sinHueco = [];
  for (const c of pendientes) {
    const pref = preferida(c);
    const candidatas = pref ? [cuentas.find((a) => a.id === pref), ...cuentas.filter((a) => a.id !== pref)] : [...cuentas];
    let hecho = null;
    for (const dia of dias) {
      for (const a of pref ? candidatas.slice(0, 1) : candidatas.sort((x, y) => cuantos(x.id, dia, propuesta) - cuantos(y.id, dia, propuesta))) {
        const objetivo = n(a.objetivoDia) || 1;
        if (cuantos(a.id, dia, propuesta) >= objetivo) continue;
        // Nada de duplicados: el mismo tramo no va a dos cuentas
        if (duplicadosDe({ ...c, cuentaId: a.id }, D.clips.concat(propuesta)).length) continue;
        const hora = horasCuenta(a).find((h) => !ocupada(a.id, dia, h, propuesta) && (dia > hoy || h > ahora));
        if (!hora) continue;
        hecho = { ...c, cuentaId: a.id, programadoDia: dia, programadoHora: hora };
        break;
      }
      if (hecho) break;
    }
    if (hecho) propuesta.push(hecho);
    else {
      const dup = pref ? duplicadosDe({ ...c, cuentaId: pref }, D.clips.concat(propuesta)) : [];
      sinHueco.push({ ...c, motivo: dup.length ? `el mismo tramo ya está en ${dup.map((x) => cuenta(x.cuentaId)?.usuario).join(", ")}` : pref ? `${cuenta(pref)?.usuario} no tiene huecos libres esta semana` : "no quedan huecos" });
    }
  }
  return { propuesta, sinHueco };
}
function abrirPlanificador() {
  const r = planificarSemana();
  if (r.error) return aviso(r.error);
  const nombre = (id) => cuenta(id)?.usuario || "—";
  const dia = (d) => new Date(d).toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" });
  abrirModal(
    `<h3>🪄 Planificar la semana</h3>
    <p class="peq">Reparto propuesto de tus clips «Listos para subir» en los próximos 7 días: respeta el objetivo diario y las horas de cada cuenta (en Cuentas), la cuenta que el piloto propuso para cada campaña y nunca pone el mismo tramo en dos cuentas. Revísalo y aplícalo.</p>
    ${
      r.propuesta.length
        ? `<table><thead><tr><th>Clip</th><th>Cuenta</th><th>Cuándo</th></tr></thead><tbody>${r.propuesta.map((c) => `<tr><td>${esc(c.titulo)}</td><td>${esc(nombre(c.cuentaId))}</td><td>${dia(c.programadoDia)} · ${c.programadoHora}</td></tr>`).join("")}</tbody></table>`
        : `<div class="vacio">No hay huecos libres esta semana con los objetivos diarios actuales.</div>`
    }
    ${r.sinHueco.length ? `<p class="peq" style="color:var(--ambar)">Sin colocar: ${r.sinHueco.map((c) => `<b>${esc(c.titulo)}</b> (${esc(c.motivo)})`).join(" · ")}. Si es por falta de huecos, sube el objetivo diario de la cuenta o añádele horas en Cuentas.</p>` : ""}
    <div class="modal-pie"><button class="btn" id="plan-cancelar">Cancelar</button>${r.propuesta.length ? `<button class="btn prim" id="plan-aplicar">Aplicar y avisarme</button>` : ""}</div>`,
    (caja) => {
      caja.querySelector("#plan-cancelar").onclick = cerrarModal;
      caja.querySelector("#plan-aplicar") &&
        (caja.querySelector("#plan-aplicar").onclick = () => {
          r.propuesta.forEach((p) => Object.assign(D.clips.find((c) => c.id === p.id), { cuentaId: p.cuentaId, programadoDia: p.programadoDia, programadoHora: p.programadoHora }));
          guardar();
          cerrarModal();
          semanaCal = 0;
          vistaCalendario();
          aviso(`${r.propuesta.length} clip(s) programados. Te avisaré al móvil cuando toque subir cada uno.`);
        });
    }
  );
}

function vistaCalendario() {
  acciones([["cal-plan", "🪄 Planificar la semana", "prim"], ["cal-ant", "‹ Anterior"], ["cal-hoy", "Esta semana"], ["cal-sig", "Siguiente ›"]]);
  $("#cal-plan").onclick = abrirPlanificador;
  $("#cal-ant").onclick = () => (semanaCal--, vistaCalendario());
  $("#cal-hoy").onclick = () => ((semanaCal = 0), vistaCalendario());
  $("#cal-sig").onclick = () => (semanaCal++, vistaCalendario());
  const lunes = lunesDe(semanaCal);
  const dias = [...Array(7)].map((_, i) => {
    const d = new Date(lunes);
    d.setDate(d.getDate() + i);
    return d.toISOString().slice(0, 10);
  });
  const hoy = hoyISO();
  const filas = [...D.cuentas.map((a) => ({ id: a.id, nombre: a.usuario, obj: n(a.objetivoDia) })), { id: "", nombre: "Sin cuenta", obj: 0 }];
  const delDia = (cuentaId, dia) =>
    D.clips.filter(
      (c) =>
        (c.cuentaId || "") === cuentaId &&
        ((CUENTAN_VISTAS.includes(c.estado) && (c.fechaPub || "").slice(0, 10) === dia) || (!CUENTAN_VISTAS.includes(c.estado) && c.programadoDia === dia))
    );
  const sinFecha = D.clips.filter((c) => c.estado === "listo" && !c.programadoDia);
  const filasConAlgo = filas.filter((f) => f.id || dias.some((d) => delDia("", d).length));
  const nombreDia = (d) => new Date(d).toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" });

  $("#contenido").innerHTML = `
    <p class="peq" style="margin-top:0">Semana del <b>${nombreDia(dias[0])}</b> al <b>${nombreDia(dias[6])}</b>. En cada casilla: lo <b>programado</b> (clips sin publicar con día asignado) y lo <b>publicado</b> ✓. El número es lo de ese día frente al objetivo de la cuenta (lo pones en Cuentas).</p>
    ${sinFecha.length ? `<div class="tarjeta" style="border-color:var(--cian);margin-bottom:14px">Tienes <b>${sinFecha.length}</b> clip(s) <b>listos para subir</b> sin día: ${sinFecha.map((c) => `<a href="#" data-clip="${c.id}">${esc(c.titulo)}</a>`).join(", ")}. Ábrelos y ponles día.</div>` : ""}
    ${
      D.cuentas.length
        ? `<table class="cal"><thead><tr><th>Cuenta</th>${dias.map((d) => `<th class="${d === hoy ? "cal-hoy" : ""}">${nombreDia(d)}</th>`).join("")}</tr></thead><tbody>
      ${filasConAlgo
        .map(
          (f) => `<tr><td><b>${esc(f.nombre)}</b>${f.obj ? `<div class="peq">${f.obj} al día</div>` : ""}</td>${dias
            .map((d) => {
              const cs = delDia(f.id, d).sort((a, b) => ((a.programadoHora || a.fechaPub?.slice(11) || "") > (b.programadoHora || b.fechaPub?.slice(11) || "") ? 1 : -1));
              const pub = cs.filter((c) => CUENTAN_VISTAS.includes(c.estado)).length;
              const falta = f.obj && d <= hoy && pub < f.obj;
              return `<td class="${d === hoy ? "cal-hoy" : ""}">
                ${f.obj ? `<div class="peq" style="color:${falta ? "var(--ambar)" : pub >= f.obj ? "var(--verde)" : "var(--suave)"}">${pub}/${f.obj}</div>` : ""}
                ${cs
                  .map((c) => {
                    const hecho = CUENTAN_VISTAS.includes(c.estado);
                    const hora = hecho ? (c.fechaPub || "").slice(11, 16) : c.programadoHora || "";
                    const dup = duplicadosDe(c).length;
                    return `<div class="cal-clip ${hecho ? "hecho" : c.estado === "listo" ? "listo" : ""}" data-clip="${c.id}" ${dup ? `title="Este tramo también está en otra cuenta"` : ""}>${dup ? "⚠ " : ""}${hecho ? "✓ " : ""}${hora ? `<b>${hora}</b> ` : ""}${esc(c.titulo)}</div>`;
                  })
                  .join("")}
                ${f.id && d >= hoy ? `<button class="cal-mas" data-nuevo="${f.id}|${d}" title="Programar un clip">+</button>` : ""}
              </td>`;
            })
            .join("")}</tr>`
        )
        .join("")}</tbody></table>`
        : `<div class="vacio">Añade tus cuentas en <b>Cuentas</b> para planificar qué publica cada una.</div>`
    }
    <p class="peq">Para programar: pulsa <b>+</b> en una casilla o pon «Programado para» en la ficha del clip. TikTok también deja programar publicaciones desde su web en el ordenador (lo tienes en TikTok a fondo → Publicar bien).</p>
    <label style="flex-direction:row;align-items:center;gap:8px;color:var(--texto);margin-top:10px"><input type="checkbox" id="cal-recordar" ${D.ajustes.recordatorios === false ? "" : "checked"} /> <span><b>Recordármelo en el móvil</b> <span class="peq">— aviso cuando toque subir cada clip programado con hora, resumen del día a las 9:00 y las cuentas que no llegan a su objetivo a las 20:00 (activa los avisos en Ajustes → Sincronización)</span></span></label>`;
  $("#contenido").querySelectorAll("[data-clip]").forEach(
    (el) =>
      (el.onclick = (e) => {
        e.preventDefault();
        editarClip(D.clips.find((c) => c.id === el.dataset.clip));
      })
  );
  $("#cal-recordar").onchange = (e) => ((D.ajustes.recordatorios = e.target.checked), guardar(), aviso(e.target.checked ? "Recordatorios activados" : "Recordatorios desactivados"));
  $("#contenido").querySelectorAll("[data-nuevo]").forEach((b) => {
    b.onclick = () => {
      const [cuentaId, dia] = b.dataset.nuevo.split("|");
      editarClip(null, { cuentaId, programadoDia: dia });
    };
  });
}
