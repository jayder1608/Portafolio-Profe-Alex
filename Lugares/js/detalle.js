const params = new URLSearchParams(window.location.search);
const id = params.get('id');

fetch('data/lugares.json')
  .then(res => res.json())
  .then(data => {
    const lugar = data.find(item => item.id == id);
    const contenedor = document.getElementById('detalle');

    if (!lugar) {
      contenedor.innerHTML = '<p>Lugar no encontrado.</p>';
      return;
    }

contenedor.innerHTML = `
  <div class="detalle-contenido" style="
    background: linear-gradient(135deg, ${lugar.categoria.colorPrimario}, ${lugar.categoria.colorSecundario});
  ">
    <img class="imagen-detalle" src="${lugar.url_imagen}" alt="${lugar.nombre}" />
    <div class="detalle-texto">
      <h1>${lugar.nombre}</h1>
      <p><strong>Ciudad:</strong> ${lugar.ciudad}</p>
      <p><strong>País:</strong> ${lugar.pais}</p>
      <p><strong>Descripción:</strong> ${lugar.descripcion}</p>

      <h3>Datos interesantes:</h3>
      <ul>
        ${lugar.datosInteresantes.map(d => `<li><strong>${d.titulo}:</strong> ${d.valor}</li>`).join('')}
      </ul>

      <h3>Actividades recomendadas:</h3>
      <ul>
        ${lugar.actividadesRecomendadas.map(a => `<li>${a}</li>`).join('')}
      </ul>

      <a class="btn-volver" href="index.html">⬅ Volver</a>
    </div>
  </div>
`;
  });
