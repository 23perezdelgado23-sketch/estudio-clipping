"use strict";
// Calendario: qué publica cada cuenta cada día de la semana. Lo programado (con día y, si quieres, hora) y lo ya publicado.

let semanaCal = 0; // 0 = esta semana, -1 la anterior, 1 la siguiente

function lunesDe(desplazamiento) {
  const d = new Date(hoyISO());
  const dia = (d.getDay() + 6) % 7; // lunes = 0
  d.setDate(d.getDate() - dia + desplazamiento * 7);
  return d;
}

function vistaCalendario() {
  acciones([["cal-ant", "‹ Anterior"], ["cal-hoy", "Esta semana"], ["cal-sig", "Siguiente ›"]]);
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
                    return `<div class="cal-clip ${hecho ? "hecho" : c.estado === "listo" ? "listo" : ""}" data-clip="${c.id}">${hecho ? "✓ " : ""}${hora ? `<b>${hora}</b> ` : ""}${esc(c.titulo)}</div>`;
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
    <p class="peq">Para programar: pulsa <b>+</b> en una casilla o pon «Programado para» en la ficha del clip. TikTok también deja programar publicaciones desde su web en el ordenador (lo tienes en TikTok a fondo → Publicar bien).</p>`;
  $("#contenido").querySelectorAll("[data-clip]").forEach(
    (el) =>
      (el.onclick = (e) => {
        e.preventDefault();
        editarClip(D.clips.find((c) => c.id === el.dataset.clip));
      })
  );
  $("#contenido").querySelectorAll("[data-nuevo]").forEach((b) => {
    b.onclick = () => {
      const [cuentaId, dia] = b.dataset.nuevo.split("|");
      editarClip(null, { cuentaId, programadoDia: dia });
    };
  });
}
