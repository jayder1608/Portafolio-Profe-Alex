const $ = (s, root=document) => root.querySelector(s);
const KEYS = { MESAS:"mesas", RESERVAS:"reservas" };
const ESTADOS_RESERVA = ["Pendiente","Confirmada","Cancelada","Finalizada","No Show"];
const OCASIONES = ["Ninguna","Cumpleaños","Aniversario","Reunión de Negocios","Compromiso","Graduación","Despedida","Cena Romántica","Amigos","Familiar"];
const HOURS = { min:"08:00", max:"20:00" };

const load  = (k)=> JSON.parse(localStorage.getItem(k) || "[]");
const save  = (k,v)=> localStorage.setItem(k, JSON.stringify(v));
const genId = (p="id") => p+"-"+Math.random().toString(36).slice(2,9);

function showToast(msg,type="info"){
  const el=$("#toast");
  if(!el) return;
  el.textContent=msg;
  el.style.background = type==="error"?"#dc2626":type==="success"?"#16a34a":"#111";
  el.classList.remove("hidden");
  setTimeout(()=>el.classList.add("hidden"),2000);
}

function isFutureDate(d){ 
  if(!d) return false; 
  const today=new Date(); 
  const inDate=new Date(d+'T00:00:00'); 
  return inDate.setHours(0,0,0,0) >= today.setHours(0,0,0,0);
}

const isTimeInRange = (t)=> HOURS.min <= t && t <= HOURS.max;

const DURACION_MIN = 90; 
const INTERVALO_MIN = 120;


function addMinutesToTime(timeString, minutesToAdd) {
  const [hours, minutes] = timeString.split(':').map(Number);
  const totalMinutes = hours * 60 + minutes + minutesToAdd;
  const newHours = Math.floor(totalMinutes / 60);
  const newMinutes = totalMinutes % 60;
  return `${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}`;
}


function timeToMinutes(timeString) {
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
}


function timeIntervalsOverlap(start1, end1, start2, end2) {
  return (timeToMinutes(start1) < timeToMinutes(end2)) && 
         (timeToMinutes(start2) < timeToMinutes(end1));
}

function rangoReserva(reserva) {
  const inicio = reserva.horaReserva;
  const fin = addMinutesToTime(reserva.horaReserva, DURACION_MIN);
  return { inicio, fin };
}

function mesaDisponible(idMesa, fecha, hora, ignore=null) {
  const reservas = load(KEYS.RESERVAS);
  const nueva = { fechaReserva: fecha, horaReserva: hora };
  const { inicio: inicioNuevo, fin: finNuevo } = rangoReserva(nueva);
  
  
  const reservasActivas = reservas.filter(r => {
    if(ignore && r.idReserva === ignore) return false;
    if(r.idMesaAsignada !== idMesa) return false;
    if(["Cancelada","Finalizada","No Show"].includes(r.estado)) return false;
    if(r.fechaReserva !== fecha) return false;
    return true;
  });
 
  if (reservasActivas.length === 0) {
    return true;
  }
  

  for (const r of reservasActivas) {
    const { inicio: inicioExistente, fin: finExistente } = rangoReserva(r);
    
 
    const solapamientoBasico = timeIntervalsOverlap(
      inicioNuevo, finNuevo, 
      inicioExistente, finExistente
    );
    
    if (solapamientoBasico) {
      return false; 
    }
    
  
    const inicioNuevoMin = timeToMinutes(inicioNuevo);
    const finNuevoMin = timeToMinutes(finNuevo);
    const inicioExistenteMin = timeToMinutes(inicioExistente);
    const finExistenteMin = timeToMinutes(finExistente);
    
    // Verificar si hay menos de 2 horas (120 minutos) de diferencia
    const diferenciaAntes = Math.abs(inicioNuevoMin - finExistenteMin);
    const diferenciaDespues = Math.abs(finNuevoMin - inicioExistenteMin);
    
    if (diferenciaAntes < INTERVALO_MIN || diferenciaDespues < INTERVALO_MIN) {
      return false; // No hay suficiente intervalo de tiempo
    }
  }
  
  return true; // Pasó todas las validaciones, está disponible
}

function actualizarEstadoMesa(idMesa, nuevoEstado) {
  let mesas = load(KEYS.MESAS);
  const mesaIndex = mesas.findIndex(m => m.id === idMesa);
  if (mesaIndex !== -1) {
    mesas[mesaIndex].estado = nuevoEstado;
    save(KEYS.MESAS, mesas);
    if (typeof renderMesas === 'function') renderMesas();
  }
}

// Función para actualizar el estado de todas las mesas basado en las reservas
function actualizarEstadosMesas() {
  const mesas = load(KEYS.MESAS);
  const reservas = load(KEYS.RESERVAS);
  
  const hoy = new Date().toISOString().split('T')[0];
  
  mesas.forEach(mesa => {
    // Si la mesa está deshabilitada, mantener ese estado
    if (mesa.estado === "deshabilitada") {
      return;
    }
    
    // Obtener reservas activas para esta mesa hoy
    const reservasActivasHoy = reservas.filter(r => 
      r.idMesaAsignada === mesa.id && 
      r.fechaReserva === hoy &&
      !["Cancelada","Finalizada","No Show"].includes(r.estado)
    );
    
    if (reservasActivasHoy.length > 0) {
      // Si tiene reservas activas hoy, está ocupada
      mesa.estado = "ocupada";
    } else {
      // Si no tiene reservas activas hoy, está disponible
      mesa.estado = "disponible";
    }
  });
  
  save(KEYS.MESAS, mesas);
  if (typeof renderMesas === 'function') renderMesas();
}

function generarOpcionesHora() {
  const horas = [];
  for (let h = 8; h <= 20; h++) {
    for (let m = 0; m < 60; m += 30) {
      const hora = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
      horas.push(hora);
    }
  }
  return horas;
}

function initData(){
  if(!localStorage.getItem(KEYS.MESAS)){
    save(KEYS.MESAS, [
      {id:"mesa1", capacidad:2, ubicacion:"Ventana", estado:"disponible"},
      {id:"mesa2", capacidad:4, ubicacion:"Centro", estado:"ocupada"},
      {id:"mesa3", capacidad:6, ubicacion:"Jardín", estado:"deshabilitada"}
    ]);
  }
  if(!localStorage.getItem(KEYS.RESERVAS)) save(KEYS.RESERVAS,[]);
  
  // Actualizar estados de mesas basado en reservas existentes
  actualizarEstadosMesas();
}

function renderMesas(){
  const grid=$("#mesasGrid"); if(!grid) return;
  grid.innerHTML="";
  load(KEYS.MESAS).forEach(m=>{
    const card=document.createElement("div");
    card.className="card";
    card.innerHTML=`
      <div class="card-body" data-estado="${m.estado}">
        <h3 style="margin:0">${m.id}</h3>
        <div>Capacidad: <b>${m.capacidad}</b></div>
        <div>Ubicación: <b>${m.ubicacion}</b></div>
        <div>Estado: <b>${m.estado}</b></div>
        <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:8px">
          <button class="btn btn-ghost" data-action="edit" data-id="${m.id}">✏️ Editar</button>
          <button class="btn btn-danger" data-action="del" data-id="${m.id}">🗑️ Eliminar</button>
          <button class="btn btn-success" data-action="res" data-id="${m.id}">📅 Reservar</button>
        </div>
      </div>
    `;
    card.addEventListener("click",(ev)=>{
      const btn=ev.target.closest("button"); if(!btn)return;
      const {action,id}=btn.dataset;
      if(action==="edit") openModalEditarMesa(id);
      if(action==="del") eliminarMesa(id);
      if(action==="res") openModalCrearReservaConMesa(id);
    });
    grid.appendChild(card);
  });
}

function renderReservas(){
  const grid=$("#reservasGrid"); if(!grid) return;
  grid.innerHTML="";
  let reservas=load(KEYS.RESERVAS);

  const filtroEstado=$("#filtroEstado")?.value || "";
  const filtroFecha=$("#filtroFecha")?.value || "";
  const filtroMesa=$("#filtroMesa")?.value || "";

  if(filtroEstado) reservas = reservas.filter(r => r.estado === filtroEstado);
  if(filtroFecha) reservas = reservas.filter(r => r.fechaReserva === filtroFecha);
  if(filtroMesa) reservas = reservas.filter(r => r.idMesaAsignada === filtroMesa);

  if(reservas.length===0){
    grid.innerHTML=`<div class="card"><div class="card-body" data-tipo="reserva" style="color:gray">No hay reservas</div></div>`; 
    return;
  }

  reservas.forEach(r=>{
    const { inicio, fin } = rangoReserva(r);
    const tagClass = `badge-${r.estado.replace(" ", ".")}`;
    const imgO = (r.ocasionEspecial && r.ocasionEspecial !== "Ninguna")
      ? `<div><img src="imagenes/${r.ocasionEspecial}.png" alt="${r.ocasionEspecial}" style="max-width:80px; margin-top:8px"></div>`
      : "";

    const card=document.createElement("div");
    card.className="card";
    card.innerHTML=`
      <div class="card-body" data-tipo="reserva">
        <div style="display:flex;justify-content:space-between">
          <h3 style="margin:0">Reserva #${r.idReserva}</h3>
          <span class="badge ${tagClass}">${r.estado}</span>
        </div>
        <div>Cliente: <b>${r.nombreCliente}</b></div>
        <div>Personas: <b>${r.numeroPersonas}</b></div>
        <div>Fecha: <b>${r.fechaReserva}</b> Hora: <b>${inicio} - ${fin}</b></div>
        <div>Mesa: <b>${r.idMesaAsignada}</b></div>
        <div>Ocasión: <b>${r.ocasionEspecial}</b></div>
        ${imgO}
        <div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn btn-ghost" data-action="edit" data-id="${r.idReserva}">✏️ Editar</button>
          <button class="btn btn-primary" data-action="pay" data-id="${r.idReserva}">💳 Pagar Factura</button>
          <button class="btn btn-danger" data-action="del" data-id="${r.idReserva}">🗑️ Eliminar</button>
        </div>
      </div>
    `;

    card.addEventListener("click",(ev)=>{
      const btn=ev.target.closest("button"); if(!btn) return;
      const {action,id}=btn.dataset;
      if(action==="edit") openModalEditarReserva(id);
      if(action==="pay") pagarReserva(id);
      if(action==="del") eliminarReserva(id);
    });
    grid.appendChild(card);
  });
  
  // Actualizar opciones del filtro de mesas
  if ($("#filtroMesa")) {
    const filtroMesa = $("#filtroMesa");
    const mesas = load(KEYS.MESAS);
    const currentValue = filtroMesa.value;
    
    filtroMesa.innerHTML = '<option value="">Todas</option>';
    mesas.forEach(m => {
      const option = document.createElement("option");
      option.value = m.id;
      option.textContent = m.id;
      if (m.id === currentValue) option.selected = true;
      filtroMesa.appendChild(option);
    });
  }
}

function openModalCrearMesa(){ openModal("Nueva Mesa", formMesa()); }

function openModalEditarMesa(id){
  const mesa=load(KEYS.MESAS).find(m=>m.id===id);
  openModal("Editar Mesa", formMesa(mesa));
}

function openModalCrearReservaConMesa(mesaId = null) {
  openModal("Nueva Reserva", formReserva(mesaId ? {idMesaAsignada: mesaId} : {}));
}

function eliminarMesa(id){
  let mesas=load(KEYS.MESAS).filter(m=>m.id!==id);
  save(KEYS.MESAS,mesas); renderMesas(); showToast("Mesa eliminada","success");
}

function formMesa(mesa={}){
  const f=document.createElement("form");
  f.innerHTML=`
    <div class="field"><label>ID</label><input required value="${mesa.id||""}" ${mesa.id?"readonly":""}></div>
    <div class="field"><label>Capacidad</label><input type="number" min="1" required value="${mesa.capacidad||1}"></div>
    <div class="field"><label>Ubicación</label><input required value="${mesa.ubicacion||""}"></div>
    <div class="field"><label>Estado</label>
      <select>${["disponible","ocupada","deshabilitada"].map(x=>`<option ${mesa.estado===x?"selected":""}>${x}</option>`).join("")}</select>
    </div>
    <button class="btn btn-primary" type="submit">Guardar</button>
  `;
  f.addEventListener("submit",ev=>{
    ev.preventDefault();
    const [id,cap,ubi,est]=[...f.querySelectorAll("input,select")].map(e=>e.value);
    let mesas=load(KEYS.MESAS);
    if(mesa.id){
      const i=mesas.findIndex(m=>m.id===mesa.id);
      mesas[i]={id,capacidad:+cap,ubicacion:ubi,estado:est};
    }else{
      mesas.push({id,capacidad:+cap,ubicacion:ubi,estado:est});
    }
    save(KEYS.MESAS,mesas); renderMesas(); closeModal(); showToast("Mesa guardada","success");
  });
  return f;
}

function openModalCrearReserva(){ openModal("Nueva Reserva", formReserva()); }

function openModalEditarReserva(id){
  const r=load(KEYS.RESERVAS).find(x=>x.idReserva===id);
  openModal("Editar Reserva", formReserva(r));
}

function eliminarReserva(id){
  let rs=load(KEYS.RESERVAS).filter(r=>r.idReserva!==id);
  save(KEYS.RESERVAS,rs); 
  actualizarEstadosMesas(); // Actualizar estados después de eliminar reserva
  if (typeof renderReservas === 'function') renderReservas(); 
  showToast("Reserva eliminada","success");
}

function pagarReserva(id){
  let rs=load(KEYS.RESERVAS); const i=rs.findIndex(r=>r.idReserva===id);
  if (i !== -1) {
    rs[i].estado="Finalizada";
    // Cambiar el estado de la mesa a disponible (RF4.1.3)
    actualizarEstadoMesa(rs[i].idMesaAsignada, "disponible");
    save(KEYS.RESERVAS,rs); 
    if (typeof renderReservas === 'function') renderReservas();
    showToast("Reserva finalizada y mesa liberada","success");
  }
}

function formReserva(r = {}) {
  const f = document.createElement("form");
  const horasOptions = generarOpcionesHora().map(h => 
    `<option ${r.horaReserva === h ? "selected" : ""}>${h}</option>`
  ).join("");
  
  // Obtener todas las mesas
  const todasLasMesas = load(KEYS.MESAS);
  
  f.innerHTML = `
    <div class="field"><label>Nombre</label><input required value="${r.nombreCliente || ""}"></div>
    <div class="field"><label>Personas</label><input type="number" min="1" required value="${r.numeroPersonas || 1}"></div>
    <div class="form-row">
      <div class="field"><label>Fecha</label><input type="date" required value="${r.fechaReserva || ""}"></div>
      <div class="field"><label>Hora</label>
        <select required>
          <option value="">Seleccione hora</option>
          ${horasOptions}
        </select>
      </div>
    </div>
    <div class="field"><label>Mesa</label>
      <select id="selectMesa">
        ${todasLasMesas.map(m => {
          const estaDisponible = m.estado === "disponible";
          return `<option value="${m.id}" ${r.idMesaAsignada === m.id ? "selected" : ""} ${!estaDisponible ? "disabled" : ""}>
            ${m.id} - ${m.ubicacion} (Capacidad: ${m.capacidad}) ${!estaDisponible ? " - NO DISPONIBLE" : ""}
          </option>`;
        }).join("")}
      </select>
      <small style="color: #666;">Solo se pueden seleccionar mesas disponibles</small>
    </div>
    <div class="field"><label>Ocasión</label>
      <select>
        ${OCASIONES.map(o =>
          `<option ${r.ocasionEspecial === o ? "selected" : ""}>${o}</option>`
        ).join("")}
      </select>
    </div>
    <div class="field"><label>Estado</label>
      <select>
        ${ESTADOS_RESERVA.map(e =>
          `<option ${r.estado === e ? "selected" : ""}>${e}</option>`
        ).join("")}
      </select>
    </div>
    <button class="btn btn-primary" type="submit">Guardar</button>
  `;

  f.addEventListener("submit", ev => {
    ev.preventDefault();

    const inputs = [...f.querySelectorAll("input,select")];
    const [nombre, personas, fecha, hora, mesaSel, ocas, estado] = inputs.map(e => e.value);

    // Validaciones
    if (!nombre.trim()) { showToast("El nombre es obligatorio", "error"); return; }
    if (parseInt(personas) < 1) { showToast("Número de personas inválido", "error"); return; }
    
    // Validar que la mesa seleccionada esté disponible
    const mesa = load(KEYS.MESAS).find(m => m.id === mesaSel);
    if (!mesa) {
      showToast("Mesa no encontrada", "error");
      return;
    }
    if (mesa.estado !== "disponible") {
      showToast(`La mesa ${mesaSel} no está disponible para reservar`, "error");
      return;
    }
    
    // Validación de capacidad de la mesa
    if (parseInt(personas) > mesa.capacidad) {
      showToast(`La mesa ${mesaSel} tiene capacidad para ${mesa.capacidad} personas`, "error");
      return;
    }
    
    if (!isFutureDate(fecha)) { showToast("La fecha debe ser futura", "error"); return; }
    if (!isTimeInRange(hora)) { showToast("Hora fuera de rango (08:00 - 20:00)", "error"); return; }
    if (!mesaDisponible(mesaSel, fecha, hora, r.idReserva)) { 
      showToast("Mesa no disponible en ese horario (se requiere 2 horas de diferencia entre reservas)", "error"); 
      return; 
    }

    let rs = load(KEYS.RESERVAS);

    if (r.idReserva) {
      // Editar reserva existente
      const i = rs.findIndex(x => x.idReserva === r.idReserva);
      rs[i] = {
        idReserva: r.idReserva,
        nombreCliente: nombre,
        numeroPersonas: +personas,
        fechaReserva: fecha,
        horaReserva: hora,
        idMesaAsignada: mesaSel,
        ocasionEspecial: ocas,
        estado
      };
    } else {
      // Crear nueva reserva
      rs.push({
        idReserva: genId("res"),
        nombreCliente: nombre,
        numeroPersonas: +personas,
        fechaReserva: fecha,
        horaReserva: hora,
        idMesaAsignada: mesaSel,
        ocasionEspecial: ocas,
        estado: estado || "Pendiente"
      });
      
      // Cambiar estado de la mesa a ocupada SOLO si es una nueva reserva
      actualizarEstadoMesa(mesaSel, "ocupada");
    }

    save(KEYS.RESERVAS, rs);
    actualizarEstadosMesas(); // Actualizar estados de todas las mesas
    if (typeof renderReservas === 'function') renderReservas();
    closeModal();
    showToast("Reserva guardada correctamente", "success");
  });

  return f;
}

function openModal(title,content){
  if(!$("#modal")) return;
  $("#modalTitle").textContent=title;
  const c=$("#modalContent"); c.innerHTML=""; c.appendChild(content);
  $("#modal").classList.remove("hidden");
}

function closeModal(){ if($("#modal")) $("#modal").classList.add("hidden"); }

// Event listeners
if($("#modalClose")) $("#modalClose").addEventListener("click",closeModal);
if($(".modal-backdrop")) $(".modal-backdrop").addEventListener("click",closeModal);

if($("#btnAddMesa")) $("#btnAddMesa").addEventListener("click",openModalCrearMesa);
if($("#btnAddReserva")) $("#btnAddReserva").addEventListener("click",openModalCrearReserva);

if($("#filtroEstado")) $("#filtroEstado").addEventListener("change", renderReservas);
if($("#filtroFecha")) $("#filtroFecha").addEventListener("change", renderReservas);
if($("#filtroMesa")) $("#filtroMesa").addEventListener("change", renderReservas);
if($("#btnClearFiltros")) $("#btnClearFiltros").addEventListener("click", ()=>{
  $("#filtroEstado").value="";
  $("#filtroFecha").value="";
  $("#filtroMesa").value="";
  renderReservas();
});

// Inicializar la aplicación
document.addEventListener('DOMContentLoaded', function() {
  initData();
  
  // Solo ejecutar estas funciones si los elementos existen en la página
  if ($("#mesasGrid")) renderMesas();
  if ($("#reservasGrid")) renderReservas();
});