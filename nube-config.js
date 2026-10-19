// Datos públicos del proyecto de Supabase (la dirección y la clave publicable). No son secretos:
// la seguridad la ponen las reglas de la tabla, que solo dejan a cada usuario ver y cambiar sus propios datos.
window.NUBE_CONFIG = {
  url: "https://avnqxjmymryhihgrwgxr.supabase.co",
  // Dirección de la app web: a ella llevan los enlaces de los correos (invitación al equipo y cambio de contraseña)
  web: "https://23perezdelgado23-sketch.github.io/estudio-clipping/",
  // Clave pública de los avisos al móvil (Web Push). La privada solo la tiene el servidor.
  avisos: "BDbZ5I3-amzAoS_Mh38pp5978nkFa1dPenLN5rM-ZOsHt7dAIaJ4bcNT_ha36r7uDj1tjS873mlqOiWnQ2lFEzA",
  clave: "sb_publishable_x1IfzRStAdsDUtaCyfRrPw_W0Af1LzS",
};
