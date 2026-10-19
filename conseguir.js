"use strict";
// Estudio Clipping · apartado «Conseguir vídeos»: dónde conseguir vídeos CON PERMISO
// (Whop, Vyro o acuerdo directo con un creador) y registro de permisos.
// Datos comprobados en las webs y condiciones oficiales el 15/10/2026 (normas de baneo y borrado revisadas el 19/10/2026).

const CONSEGUIR_TABS = [
  ["whop", "Whop"],
  ["vyro", "Vyro"],
  ["elegir", "Elegir campaña"],
  ["directo", "Creador directo"],
  ["permisos", "Registro de permisos"],
];
let tabConseguir = "whop";

function vistaConseguir() {
  acciones(tabConseguir === "permisos" ? [["nuevo-permiso", "+ Apuntar permiso", "prim"]] : []);
  const html = { whop: tabWhop, vyro: tabVyro, elegir: tabElegir, directo: tabDirecto, permisos: tabPermisos }[tabConseguir]();
  $("#contenido").innerHTML = `
    <div class="pestanas">${CONSEGUIR_TABS.map(([id, t]) => `<button class="${id === tabConseguir ? "activo" : ""}" data-tab="${id}">${t}</button>`).join("")}</div>
    <div class="guia">${html}</div>`;
  $("#contenido").querySelectorAll("[data-tab]").forEach((b) => (b.onclick = () => ((tabConseguir = b.dataset.tab), vistaConseguir(), ($("#contenido").scrollTop = 0))));
  $("#nuevo-permiso") && ($("#nuevo-permiso").onclick = () => editarPermiso());
  $("#contenido").querySelectorAll("tr[data-permiso]").forEach((tr) => (tr.onclick = () => editarPermiso(D.permisos.find((p) => p.id === tr.dataset.permiso))));
  const copiar = $("#copiar-plantilla");
  copiar &&
    (copiar.onclick = async () => {
      await navigator.clipboard.writeText($("#plantilla").innerText);
      aviso("Mensaje copiado");
    });
}

function tabWhop() {
  return `
  <h2 style="margin-top:6px">Whop · Content Rewards</h2>
  <p>Es el mercado de campañas de clipping más grande. Marcas y creadores ponen un presupuesto y una tarifa por cada 1.000 vistas; tú cortas su material y cobras por las vistas.</p>
  <h3>Paso a paso</h3>
  <ol>
    <li><b>Crea una cuenta en whop.com</b> (gratis). Tienes que ser <b>mayor de 18 años</b>. ${fiab("oficial")}</li>
    <li>Entra en el apartado de <b>Content Rewards</b> o <b>Whop Clips</b> (desde «Discover» de Whop) y únete. Según Whop, no importan los seguidores ni la experiencia. ${fiab("oficial")}</li>
    <li><b>Elige una campaña</b>. Cada una muestra su <b>presupuesto restante</b>, su tarifa y sus <b>reglas de envío</b>. Antes de unirte, repasa la pestaña «Elegir campaña» de este apartado. ${fiab("oficial")}</li>
    <li><b>Descarga el material</b> que da la campaña y haz el clip en vertical, con tu edición.</li>
    <li><b>Publícalo en tu TikTok</b> con la etiqueta de publicidad: <b>#Sponsored</b> o <b>#[Marca]Ad</b>, visible <b>sin pulsar «más»</b>. ${fiab("oficial")}</li>
    <li><b>Envía el clip</b> en Content Rewards: la <b>URL de tu publicación</b> y el <b>archivo del vídeo</b>. Lo sigues en «My submissions». ${fiab("oficial")}</li>
    <li><b>Revisión:</b> la marca lo aprueba o lo rechaza. Si no lo revisa en <b>48 horas</b> y la IA de Whop no lo marca, se aprueba solo. ${fiab("oficial")}</li>
    <li><b>Cobro:</b> pagan por las <b>vistas legítimas</b> (las que Whop valida), por orden de llegada hasta que se acaba el presupuesto. El dinero llega a tu saldo de Whop y se retira con <b>Whop Payments</b>. ${fiab("oficial")}</li>
  </ol>
  <table><thead><tr><th>Dato</th><th>Detalle</th><th>Fuente</th></tr></thead><tbody>
    <tr><td>Comisión</td><td>Whop cobra un 10 %, pero <b>se lo descuenta a la marca</b>, no a ti.</td><td>${fiab("oficial")}</td></tr>
    <tr><td>Tarifas</td><td>Cada campaña pone la suya. Las webs del sector hablan de 0,20–6 $ por cada 1.000 vistas, con media cerca de 1 $.</td><td>${fiab("sector")}</td></tr>
    <tr><td>Mínimo para retirar</td><td>Las condiciones oficiales no lo indican. Una web habla de 10 $: compruébalo en tu cuenta.</td><td>${fiab("sin")}</td></tr>
    <tr><td>Prohibido</td><td>Bots, comprar vistas, dar premios o pagos al público por ver el vídeo, entregas duplicadas y cobrar fuera de Whop.</td><td>${fiab("oficial")}</td></tr>
    <tr><td>Licencia</td><td>Al participar das a Whop y a la marca una licencia permanente para usar tu clip.</td><td>${fiab("oficial")}</td></tr>
    <tr><td>Borrar si te lo piden</td><td>Si la marca o Whop te piden quitar o cambiar un clip, hay que hacerlo enseguida, también con la campaña terminada.</td><td>${fiab("oficial")}</td></tr>
    <tr><td>Baneo de la marca</td><td>Cada marca puede echarte de su campaña o de todas las suyas si un clip no cumple sus criterios, si incumples las condiciones o si sospecha fraude.</td><td>${fiab("oficial")}</td></tr>
    <tr><td>Fecha y presupuesto</td><td>Lo publicado o enviado después de la fecha de fin o con el máximo ya pagado se rechaza. Vigilarlo es cosa tuya.</td><td>${fiab("oficial")}</td></tr>
    <tr><td>Material</td><td>Todo tiene que ser original salvo lo que te da la marca, y no puede infringir derechos de nadie.</td><td>${fiab("oficial")}</td></tr>
    <tr><td>Si incumples</td><td>Whop puede echarte, retener los pagos y reclamar lo ya cobrado.</td><td>${fiab("oficial")}</td></tr>
  </tbody></table>
  ${fuente("condiciones oficiales de Content Rewards de Whop; blog oficial de Whop (Content Rewards y Whop Clips), 15/10/2026.")}
  <p><a class="btn" href="https://whop.com/content-rewards-terms-of-service/" target="_blank">Leer las condiciones de Whop ↗</a></p>`;
}

function tabVyro() {
  return `
  <h2 style="margin-top:6px">Vyro</h2>
  <p>Plataforma de campañas de clipping (la usa, entre otros, MrBeast según su web). Funciona igual: eliges campaña, publicas el clip y envías el enlace.</p>
  <h3>Paso a paso</h3>
  <ol>
    <li><b>Regístrate gratis en vyro.com</b> con tus redes. Requisitos: <b>mayor de 18 años</b> y residir en un país donde Vyro funcione (sus condiciones no publican la lista: compruébalo al registrarte). ${fiab("oficial")}</li>
    <li><b>Una sola cuenta de Vyro por persona.</b> Conecta dentro tus cuentas de TikTok: es obligatorio antes de enviar clips. Abrir varias cuentas de Vyro puede acabar en cierre y pérdida de los pagos. ${fiab("oficial")}</li>
    <li>Date de alta en el <b>proveedor de pagos</b> (Stripe, o PayPal donde esté disponible). ${fiab("oficial")}</li>
    <li><b>Elige una campaña</b> y lee su brief: fechas, tarifa, <b>mínimo de vistas</b> y normas de publicación. Vyro dice que revisa cada campaña. ${fiab("oficial")}</li>
    <li><b>Publica el clip</b> en tu TikTok, con la etiqueta de publicidad que exige Vyro, y <b>envía el enlace</b> en Vyro. ${fiab("oficial")}</li>
    <li>Las vistas cuentan <b>desde que envías</b> el enlace. Empiezas a ganar cuando el clip está aprobado y pasa el mínimo de vistas de la campaña. ${fiab("oficial")}</li>
    <li>Las ganancias salen como <b>pendientes</b> mientras dura la campaña y pasan a disponibles cuando termina. ${fiab("oficial")}</li>
    <li><b>Retirada:</b> desde <b>10 $</b>, <b>una vez cada 7 días</b>, por Stripe o PayPal. El pago puede tardar <b>72 horas o más</b>. ${fiab("oficial")}</li>
  </ol>
  <table><thead><tr><th>Dato</th><th>Detalle</th><th>Fuente</th></tr></thead><tbody>
    <tr><td>Promoción pagada</td><td>Prohibido poner anuncios o «boosted posts» sin permiso del cliente.</td><td>${fiab("oficial")}</td></tr>
    <tr><td>Spam y publicación automática</td><td>Prohibido promocionar con mensajes masivos, comentarios de spam o publicación automática.</td><td>${fiab("oficial")}</td></tr>
    <tr><td>Cuentas conectadas</td><td>Cada cuenta de TikTok solo puede estar en una cuenta de Vyro. Ni varias cuentas de Vyro ni varios correos o identidades.</td><td>${fiab("oficial")}</td></tr>
    <tr><td>Interacción falsa</td><td>Prohibido comprar seguidores o interacción y usar bots.</td><td>${fiab("oficial")}</td></tr>
    <tr><td>Si TikTok borra el clip</td><td>Pierdes lo de ese clip y pueden reclamarte lo ya cobrado.</td><td>${fiab("oficial")}</td></tr>
    <tr><td>Publicidad sin indicar</td><td>Puede suponer la expulsión y devolver lo cobrado.</td><td>${fiab("oficial")}</td></tr>
    <tr><td>Comisiones del pago</td><td>Stripe o PayPal pueden cobrar sus comisiones; Vyro no se hace cargo.</td><td>${fiab("oficial")}</td></tr>
    <tr><td>Mínimo de vistas</td><td>Lo fija cada campaña. Una web del sector habla de 5.000 vistas por clip: mira el brief.</td><td>${fiab("sector")}</td></tr>
  </tbody></table>
  ${fuente("web oficial de Vyro y condiciones oficiales para clippers de Vyro, 15/10/2026.")}
  <p><a class="btn" href="https://vyro.com/clipper-terms" target="_blank">Leer las condiciones de Vyro ↗</a></p>`;
}

function tabElegir() {
  return `
  <h2 style="margin-top:6px">Qué mirar antes de unirte a una campaña</h2>
  <p>Repasa esta lista con cada campaña. Si algo no está claro en el brief, pregunta antes de ponerte a cortar.</p>
  <table><thead><tr><th>Mira</th><th>Por qué</th></tr></thead><tbody>
    <tr><td><b>Tarifa por cada 1.000 vistas</b></td><td>Es lo que cobras. Compárala con otras campañas del mismo nicho.</td></tr>
    <tr><td><b>Presupuesto que queda</b></td><td>Cuando se acaba, deja de pagar aunque tus clips sigan sumando vistas. Si queda poco, puede no compensar.</td></tr>
    <tr><td><b>Mínimo de vistas por clip</b></td><td>Por debajo no cobras nada de ese clip.</td></tr>
    <tr><td><b>Máximo por clip</b></td><td>A partir de ahí, más vistas no te dan más dinero.</td></tr>
    <tr><td><b>Redes permitidas</b></td><td>Tiene que admitir TikTok.</td></tr>
    <tr><td><b>Idioma y público</b></td><td>Si la campaña es en inglés, el clip y los subtítulos también.</td></tr>
    <tr><td><b>Reglas</b></td><td>Duración, menciones, hashtags, lo prohibido, si admite voces o imágenes de IA.</td></tr>
    <tr><td><b>Etiqueta de publicidad</b></td><td>Cuál exige (#Sponsored, #[Marca]Ad…) y dónde ponerla.</td></tr>
    <tr><td><b>Fecha de fin</b></td><td>Los clips enviados tarde no cuentan.</td></tr>
    <tr><td><b>Quién paga</b></td><td>Que sea un creador o marca reconocible. Desconfía de lo que prometa ganancias seguras o te pida pagar para entrar.</td></tr>
  </tbody></table>
  ${nota("<b>Puedes unirte a varias campañas del mismo nicho con la misma cuenta.</b> Cada clip va a una sola campaña, con su material y su etiqueta. Antes de cada una, comprueba en el Radar que le queda presupuesto y fecha: lo publicado tarde se rechaza.", "")}
  ${nota("Cuando te unas, apúntala en <b>Campañas</b> (+ Nueva campaña) con todos estos datos: así la app calcula lo que llevas ganado y te avisa cuando se acaba el presupuesto.", "cian")}`;
}

function tabDirecto() {
  return `
  <h2 style="margin-top:6px">Acuerdo directo con un creador</h2>
  <p>Para creadores que aún no tienen campaña (por ejemplo, un pódcast o un streamer pequeño de España). Le propones cortar sus vídeos y os ponéis de acuerdo en cómo te paga.</p>
  ${nota("<b>Sin permiso por escrito, no cortes nada.</b> El permiso tiene que decir claramente que puedes <b>publicar</b> los clips en tus cuentas y si puedes <b>cobrar</b> por ellos. Guarda la prueba (correo, mensaje o contrato) y apúntala en «Registro de permisos».", "")}
  <h3>Qué tiene que quedar claro</h3>
  <ul>
    <li><b>Qué contenido</b> puedes cortar (qué canal, qué vídeos o directos).</li>
    <li><b>Dónde</b> puedes publicarlo (tus cuentas de TikTok, cuáles).</li>
    <li><b>Cómo te paga</b>: por cada 1.000 vistas, una cantidad por clip o una cantidad al mes. Y cuándo y por dónde.</li>
    <li>Si tienes que <b>mencionarle</b> o enlazar su canal en cada clip.</li>
    <li><b>Hasta cuándo</b> vale el permiso y que puede pedirte que borres un clip.</li>
  </ul>
  <h3>Plantilla de mensaje</h3>
  <div class="tarjeta" id="plantilla" style="white-space:pre-wrap;line-height:1.6">Hola, [nombre]:

Soy [tu nombre] y llevo cuentas de TikTok de clips de [nicho]. Me gusta mucho tu contenido y creo que tus [vídeos / directos / episodios] tienen momentos que pueden funcionar muy bien en formato corto.

Te propongo cortar los mejores momentos, editarlos en vertical con subtítulos y publicarlos en mi cuenta [@usuario], siempre mencionándote y enlazando a tu canal para llevarte público.

Para hacerlo bien necesito tu permiso por escrito. En concreto:
1. Que puedo cortar y publicar clips de [qué contenido] en [@usuario].
2. Cómo me pagarías: [por cada 1.000 vistas / por clip / al mes] y cuánto.
3. Si quieres que te mencione de alguna forma concreta.

Si en algún momento quieres que retire un clip, lo quito. ¿Te encaja? Puedo enseñarte antes un par de ejemplos.

Gracias,
[tu nombre]</div>
  <p><button class="btn" id="copiar-plantilla">Copiar mensaje</button></p>
  <p class="peq">Es una plantilla para empezar la conversación, no un contrato. Si el acuerdo es de dinero importante, conviene ponerlo en un documento firmado por los dos y consultarlo con un profesional.</p>`;
}

function tabPermisos() {
  const lista = [...(D.permisos || [])].sort((a, b) => (b.fecha || "").localeCompare(a.fecha || ""));
  return `
  <h2 style="margin-top:6px">Registro de permisos</h2>
  <p>Apunta aquí cada permiso que consigas de un creador (los de Whop y Vyro ya los da la campaña). Si algún día hay una reclamación, aquí tienes la prueba.</p>
  ${
    lista.length
      ? `<table><thead><tr><th>Creador</th><th>Fecha</th><th>Puedes publicar</th><th>Puedes cobrar</th><th>Pago acordado</th><th>Válido hasta</th></tr></thead><tbody>
      ${lista
        .map(
          (p) => `<tr data-permiso="${p.id}" style="cursor:pointer"><td><b>${esc(p.creador)}</b><div class="peq">${esc(p.canal || "")}</div></td><td>${fechaCorta(p.fecha)}</td>
        <td>${p.publicar ? '<span class="chip verde">Sí</span>' : '<span class="chip rosa">No</span>'}</td>
        <td>${p.cobrar ? '<span class="chip verde">Sí</span>' : '<span class="chip rosa">No</span>'}</td>
        <td>${esc(p.pago || "—")}</td><td>${p.hasta ? fechaCorta(p.hasta) : "Sin fecha"}</td></tr>`
        )
        .join("")}</tbody></table>`
      : `<div class="vacio">Todavía no hay permisos apuntados. Cuando un creador te dé permiso por escrito, apúntalo con «+ Apuntar permiso».</div>`
  }`;
}

function editarPermiso(p) {
  const nuevo = !p;
  p = p || { id: uid(), fecha: hoyISO(), publicar: true, cobrar: false };
  abrirModal(
    `<h3>${nuevo ? "Apuntar permiso" : esc(p.creador)}</h3>
    <div class="form">
      <label>Creador<input name="creador" value="${esc(p.creador)}" placeholder="Nombre del creador o canal" /></label>
      <label>Enlace a su canal<input name="canal" value="${esc(p.canal)}" placeholder="https://" /></label>
      <label>Fecha del permiso<input name="fecha" type="date" value="${esc(p.fecha)}" /></label>
      <label>Válido hasta (si lo dice)<input name="hasta" type="date" value="${esc(p.hasta)}" /></label>
      <label class="ancho">Qué contenido puedes cortar<input name="contenido" value="${esc(p.contenido)}" placeholder="Ej.: todos los episodios del pódcast desde 2025" /></label>
      <label class="ancho">En qué cuentas puedes publicar<input name="cuentas" value="${esc(p.cuentas)}" placeholder="@cuenta1, @cuenta2" /></label>
      <label style="flex-direction:row;align-items:center;gap:8px"><input type="checkbox" name="publicar" ${p.publicar ? "checked" : ""}/>Permite publicar los clips</label>
      <label style="flex-direction:row;align-items:center;gap:8px"><input type="checkbox" name="cobrar" ${p.cobrar ? "checked" : ""}/>Permite cobrar por ellos</label>
      <label class="ancho">Pago acordado<input name="pago" value="${esc(p.pago)}" placeholder="Ej.: 1 € por cada 1.000 vistas, pago mensual por transferencia" /></label>
      <label class="ancho">Dónde está la prueba<input name="prueba" value="${esc(p.prueba)}" placeholder="Ej.: correo del 15/10/2026 de creador@… / mensaje de Instagram / contrato firmado (carpeta…)" /></label>
      <label class="ancho">Mención obligatoria y notas<textarea name="notas">${esc(p.notas)}</textarea></label>
    </div>
    <div class="modal-pie">
      <div>${nuevo ? "" : `<button class="btn peligro" id="m-borrar">Borrar</button>`}</div>
      <div><button class="btn" id="m-cancelar">Cancelar</button> <button class="btn prim" id="m-guardar">Guardar</button></div>
    </div>`,
    (caja) => {
      caja.querySelector("#m-cancelar").onclick = cerrarModal;
      caja.querySelector("#m-guardar").onclick = () => {
        const f = leerForm(caja);
        if (!f.creador) return aviso("Pon el nombre del creador");
        if (!f.prueba) return aviso("Apunta dónde está la prueba del permiso");
        Object.assign(p, f);
        if (nuevo) (D.permisos ||= []).push(p);
        guardar();
        cerrarModal();
        ir("conseguir");
      };
      const b = caja.querySelector("#m-borrar");
      b &&
        (b.onclick = () => {
          if (!confirm(`¿Borrar el permiso de «${p.creador}»?`)) return;
          D.permisos = D.permisos.filter((x) => x.id !== p.id);
          guardar();
          cerrarModal();
          ir("conseguir");
        });
    }
  );
}
