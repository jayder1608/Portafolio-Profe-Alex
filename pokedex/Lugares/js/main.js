fetch('data/lugares.json')
  .then(res => res.json())
  .then(data => {
    const swiperWrapper = document.getElementById('swiper-lugares');

    data.forEach(lugar => {
      const slide = document.createElement('div');
      slide.className = 'swiper-slide';
      slide.innerHTML = `
        <div class="slide-content" style="background-color: ${lugar.categoria.colorPrimario}; border-color: ${lugar.categoria.colorSecundario};">
          <img src="${lugar.url_imagen}" alt="${lugar.nombre}" />
          <div class="texto-tarjeta">
            <h2>${lugar.pais}</h2>
            <p>${lugar.ciudad}, ${lugar.nombre}</p>
          </div>
        </div>
      `;
      slide.addEventListener('click', () => {
        window.location.href = `detalle.html?id=${lugar.id}`;
      });
      swiperWrapper.appendChild(slide);
    });

    new Swiper('.swiper', {
      loop: true,
      slidesPerView: 5,
      spaceBetween: 20,
      navigation: {
        nextEl: '.swiper-button-next',
        prevEl: '.swiper-button-prev',
      },
      breakpoints: {
        0:     { slidesPerView: 1 },
        576:   { slidesPerView: 2 },
        768:   { slidesPerView: 3 },
        992:   { slidesPerView: 4 },
        1200:  { slidesPerView: 5 },
      }
    });
  });
