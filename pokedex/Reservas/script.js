const $ = (s, root=document) => root.querySelector(s);
const KEYS = { MESAS:"mesas", RESERVAS:"reservas" };
const ESTADOS_RESERVA = ["Pendiente","Confirmada","Cancelada","Finalizada","No Show"];
const OCASIONES = ["Ninguna","Cumpleaños","Aniversario","Reunión de Negocios","Compromiso","Graduación","Despedida","Cena Romántica","Amigos","Familiar"];
const HOURS = { min:"08:00", max:"20:00" };

const DURACION_MIN = 90;     
const INTERVALO_MIN = 120;   

const load  = (k)=> JSON.parse(localStorage.getItem(k) || "[]");
const save  = (k,v)=> localStorage.setItem(k, JSON.stringify(v));
const genId = (p="id") => p+"-"+Math.random().toString(36).slice(2,9);

function swalToast(message, icon="info"){
  Swal.fire({ 
    toast:true, position:"top-end", showConfirmButton:false, timer:2200, timerProgressBar:true,
    icon, title: message 
  });
}
async function swalConfirm({title="¿Estás seguro?", text="Esta acción no se puede deshacer.", confirmText="Sí, continuar"}={}){
  const r = await Swal.fire({
    title, text, icon:"warning", showCancelButton:true,
    confirmButtonText:confirmText, cancelButtonText:"Cancelar"
  });
  return r.isConfirmed;
}


function isFutureDate(d){ 
  if(!d) return false; 
  const today = new Date(); today.setHours(0,0,0,0);
  const inDate = new Date(d); inDate.setHours(0,0,0,0);
  return inDate >= today;
}
const isTimeInRange = (t)=> HOURS.min <= t && t <= HOURS.max;

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
  if (reservasActivas.length === 0) return true;
  
  for (const r of reservasActivas) {
    const { inicio: inicioExistente, fin: finExistente } = rangoReserva(r);
    if (timeIntervalsOverlap(inicioNuevo, finNuevo, inicioExistente, finExistente)) return false;

    const inicioNuevoMin = timeToMinutes(inicioNuevo);
    const finNuevoMin = timeToMinutes(finNuevo);
    const inicioExistenteMin = timeToMinutes(inicioExistente);
    const finExistenteMin = timeToMinutes(finExistente);
    const gapAntes = Math.abs(inicioNuevoMin - finExistenteMin);
    const gapDespues = Math.abs(finNuevoMin - inicioExistenteMin);
    if (gapAntes < INTERVALO_MIN || gapDespues < INTERVALO_MIN) return false;
  }
  return true;
}

function actualizarEstadoMesa(idMesa, nuevoEstado) {
  const mesas = load(KEYS.MESAS);
  const i = mesas.findIndex(m => m.id === idMesa);
  if (i !== -1) {
    mesas[i].estado = nuevoEstado;
    save(KEYS.MESAS, mesas);
    if (typeof renderMesas === 'function') renderMesas();
  }
}

function actualizarEstadosMesas() {
  const mesas = load(KEYS.MESAS);
  const reservas = load(KEYS.RESERVAS);
  const hoy = new Date().toISOString().split('T')[0];
  mesas.forEach(mesa => {
    if (mesa.estado === "deshabilitada") return;
    const hayReservaVigente = reservas.some(r =>
      r.idMesaAsignada === mesa.id &&
      !["Cancelada","Finalizada","No Show"].includes(r.estado) &&
      r.fechaReserva >= hoy
    );
    mesa.estado = hayReservaVigente ? "ocupada" : "disponible";
  });
  save(KEYS.MESAS, mesas);
  if (typeof renderMesas === 'function') renderMesas();
}

function generarOpcionesHora() {
  const horas = [];
  for (let h = 8; h <= 20; h++) {
    for (let m = 0; m < 60; m += 30) {
      const hora = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
      horas.push(hora);
    }
  }
  return horas;
}

function ensureMesaIdFromNumber(numStr){
  const n = String(numStr || "").trim();
  if(!/^\d+$/.test(n)) return null;
  return `mesa${parseInt(n,10)}`;
}
function splitMesaNumberFromId(id){
  const m = /^mesa(\d+)$/.exec(id || "");
  return m ? m[1] : "";
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
  actualizarEstadosMesas();
}

function renderMesas(){
  const grid=$("#mesasGrid"); if(!grid) return;
  grid.innerHTML="";
  load(KEYS.MESAS).forEach(m=>{
    const card=document.createElement("div");
    card.className="card";
    let styleEstado = "";
    let textColor = "color:#0f172a;"; 

    if (m.estado === "disponible"){
      styleEstado = "background: linear-gradient(135deg, #34d399, #10b981); border:1px solid #059669;";
      textColor = "color:#052e2b;";
    } else if (m.estado === "ocupada"){
      styleEstado = "background: linear-gradient(135deg, #60a5fa, #2563eb); border:1px solid #1d4ed8;";
      textColor = "color:#0b1e3a;";
    } else if (m.estado === "deshabilitada"){
      styleEstado = "background: linear-gradient(135deg, #4b5563, #111827); border:1px solid #374151;";
      textColor = "color:#f9fafb;";
    }

    card.innerHTML=`
      <div class="card-body" data-estado="${m.estado}" style="${styleEstado} ${textColor}">
        <h3 style="margin:0">${m.id}</h3>
        <div>Capacidad: <b>${m.capacidad}</b></div>
        <div>Ubicación: <b>${m.ubicacion}</b></div>
        <div>Estado: <b>${m.estado}</b></div>
        <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:8px">
          <button class="btn btn-ghost" data-action="edit" data-id="${m.id}">✏️ Editar</button>
          <button class="btn btn-danger" data-action="del" data-id="${m.id}">🗑️ Eliminar</button>
          <button class="btn btn-success" data-action="res" data-id="${m.id}" ${m.estado !== "disponible" ? "disabled style='opacity:0.5; cursor:not-allowed;'" : ""}>📅 Reservar</button>
        </div>
      </div>
    `;
    card.addEventListener("click",async (ev)=>{
      const btn=ev.target.closest("button"); if(!btn)return;
      const {action,id}=btn.dataset;
      if(action==="edit") openModalEditarMesa(id);
      if(action==="del"){
        if(await swalConfirm({title:"Eliminar mesa", text:`¿Eliminar ${id}?` , confirmText:"Sí, eliminar"})){
          eliminarMesa(id);
        }
      }
      if(action==="res" && btn.disabled === false) {
        openModalCrearReservaConMesa(id);
      }
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
    grid.innerHTML=`<div class="card"><div class="card-body" data-tipo="reserva" style="color:gray; text-align:center; padding:20px;">
      <h3>No hay reservas registradas</h3>
      <p>Utilice el botón "➕ Nueva Reserva" para crear una</p>
    </div></div>`;
    return;
  }

  const MEDIA_HEIGHT = 220; 
  const CARD_MIN_HEIGHT = 520; 

  reservas.forEach(r=>{
    const { inicio, fin } = rangoReserva(r);
    const tagClass = `badge-${r.estado.replace(" ", ".")}`;
    let cardBackground = "";
    if(r.estado === "Pendiente") cardBackground = "background: linear-gradient(135deg, #f59e0b, #fbbf24);";
    else if(r.estado === "Confirmada") cardBackground = "background: linear-gradient(135deg, #16a34a, #4ade80);";
    else if(r.estado === "Cancelada") cardBackground = "background: linear-gradient(135deg, #dc2626, #ef4444);";
    else if(r.estado === "Finalizada") cardBackground = "background: linear-gradient(135deg, #2563eb, #60a5fa);";
    else cardBackground = "background: linear-gradient(135deg, #9333ea, #c084fc);";

    const imgSrc = (r.ocasionEspecial && r.ocasionEspecial !== "Ninguna")
      ? `imagenes/${r.ocasionEspecial}.png`
      : null;

    const mediaBlock = imgSrc ? `
      <div style="
        width:100%;
        height:${MEDIA_HEIGHT}px;
        margin-bottom:12px;
        border-radius:10px;
        overflow:hidden;
        display:flex; align-items:center; justify-content:center;
      ">
        <img src="${imgSrc}" alt="${r.ocasionEspecial}" style="
          max-width:100%;
          max-height:100%;
          width:auto; height:auto;
          display:block;
        ">
      </div>
    ` : "";

    const card=document.createElement("div");
    card.className="card";
    card.setAttribute("style", `min-height:${CARD_MIN_HEIGHT}px; display:flex;`);
    card.innerHTML=`
      <div class="card-body" data-tipo="reserva" style="${cardBackground}; display:flex; flex-direction:column; flex:1;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
          <h3 style="margin:0;font-size:18px;">Reserva #${r.idReserva.slice(-6)}</h3>
          <span class="badge ${tagClass}" style="font-size:11px;padding:6px 10px;">${r.estado}</span>
        </div>

        ${mediaBlock}

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">
          <div style="background:rgba(255,255,255,0.12);padding:8px;border-radius:6px;">
            <div style="font-size:12px;opacity:0.9;">Cliente</div>
            <div style="font-weight:bold;font-size:14px;">${r.nombreCliente}</div>
          </div>
          <div style="background:rgba(255,255,255,0.12);padding:8px;border-radius:6px;">
            <div style="font-size:12px;opacity:0.9;">Personas</div>
            <div style="font-weight:bold;font-size:14px;">${r.numeroPersonas}</div>
          </div>
        </div>
        <div style="background:rgba(255,255,255,0.12);padding:8px;border-radius:6px;margin-bottom:12px;">
          <div style="font-size:12px;opacity:0.9;">Fecha y Hora</div>
          <div style="font-weight:bold;font-size:14px;">${r.fechaReserva} | ${inicio} - ${fin}</div>
        </div>
        <div style="background:rgba(255,255,255,0.12);padding:8px;border-radius:6px;margin-bottom:12px;">
          <div style="font-size:12px;opacity:0.9;">Mesa</div>
          <div style="font-weight:bold;font-size:14px;">${r.idMesaAsignada}</div>
        </div>

        <div style="margin-top:auto; display:flex;gap:8px;flex-wrap:wrap;justify-content:center;">
          <button class="btn btn-ghost" data-action="edit" data-id="${r.idReserva}" style="padding:6px 12px;font-size:12px;">✏️ Editar</button>
          <button class="btn btn-primary" data-action="pay" data-id="${r.idReserva}" style="padding:6px 12px;font-size:12px;" ${r.estado !== "Pendiente" && r.estado !== "Confirmada" ? "disabled" : ""}>💳 Pagar</button>
          <button class="btn btn-danger" data-action="del" data-id="${r.idReserva}" style="padding:6px 12px;font-size:12px;">🗑️ Eliminar</button>
        </div>
      </div>
    `;

    card.addEventListener("click", async (ev)=>{
      const btn=ev.target.closest("button"); if(!btn) return;
      const {action,id}=btn.dataset;
      if(action==="edit") openModalEditarReserva(id);
      if(action==="pay" && btn.disabled === false) {
        const ok = await swalConfirm({title:"Finalizar/Pagar", text:"¿Marcar la reserva como finalizada y liberar mesa?", confirmText:"Sí, finalizar"});
        if (ok) pagarReserva(id);
      }
      if(action==="del"){
        if(await swalConfirm({title:"Eliminar reserva", text:"¿Deseas eliminar esta reserva?", confirmText:"Sí, eliminar"})){
          eliminarReserva(id);
        }
      }
    });

    grid.appendChild(card);
  });

  if ($("#filtroMesa")) {
    const filtroMesa = $("#filtroMesa");
    const mesas = load(KEYS.MESAS);
    const currentValue = filtroMesa.value;
    filtroMesa.innerHTML = '<option value="">Todas las mesas</option>';
    mesas.forEach(m => {
      const option = document.createElement("option");
      option.value = m.id;
      option.textContent = `${m.id} (${m.ubicacion})`;
      if (m.id === currentValue) option.selected = true;
      filtroMesa.appendChild(option);
    });
  }
}
function openModalCrearMesa(){ 
  openModal("Nueva Mesa", formMesa(), { locked: true }); 
}
function openModalEditarMesa(id){
  const mesa=load(KEYS.MESAS).find(m=>m.id===id);
  openModal("Editar Mesa", formMesa(mesa), { locked: true });
}
async function eliminarMesa(id){
  let mesas=load(KEYS.MESAS).filter(m=>m.id!==id);
  save(KEYS.MESAS,mesas); 
  renderMesas(); 
  Swal.fire({ icon:"success", title:"Mesa eliminada", timer:1400, showConfirmButton:false });
}

function formMesa(mesa={}){
  const currentNum = mesa.id ? splitMesaNumberFromId(mesa.id) : "";
  const f=document.createElement("form");
  f.innerHTML=`
    <div class="field" style="display:flex;gap:8px;align-items:center;">
      <label style="min-width:120px;">ID de la Mesa</label>
      <span style="padding:8px 10px;border:1px solid #ddd;border-radius:6px;background:#f8fafc; user-select:none;">mesa</span>
      <input id="mesaNum" type="number" min="1" step="1" required value="${currentNum}" ${mesa.id?"readonly":""} style="max-width:120px;">
      <small style="color:#666; margin-left:8px;">El ID final será <b>mesa#</b></small>
    </div>
    <div class="field">
      <label>Capacidad</label>
      <input id="capacidad" type="number" min="1" max="20" required value="${mesa.capacidad||1}">
    </div>
    <div class="field">
      <label>Ubicación</label>
      <input id="ubicacion" required value="${mesa.ubicacion||""}">
    </div>
    <div class="field">
      <label>Estado</label>
      <select id="estado">
        ${["disponible","ocupada","deshabilitada"].map(x=>`<option ${mesa.estado===x?"selected":""}>${x}</option>`).join("")}
      </select>
    </div>
    <button class="btn btn-primary" type="submit">Guardar Mesa</button>
  `;

  if (mesa.id){
    const numInput = f.querySelector("#mesaNum");
    numInput.setAttribute("readonly", "true");
    numInput.setAttribute("tabindex", "-1");
    numInput.style.userSelect = "none";
    numInput.style.caretColor = "transparent";
    numInput.style.cursor = "default";
    numInput.style.background = "#f3f4f6";
    numInput.addEventListener("focus", e=> e.target.blur());
    numInput.addEventListener("keydown", e=> e.preventDefault());
    numInput.addEventListener("mousedown", e=> { e.preventDefault(); e.stopPropagation(); });
  }

  f.addEventListener("submit",ev=>{
    ev.preventDefault();

    const id = mesa.id ? mesa.id : ensureMesaIdFromNumber(f.querySelector("#mesaNum").value.trim());
    if(!id){ Swal.fire({icon:"error", title:"Número de mesa inválido"}); return; }

    const cap = parseInt(f.querySelector("#capacidad").value.trim(),10);
    const ubi = f.querySelector("#ubicacion").value.trim();
    const est = f.querySelector("#estado").value.trim();

    if(!ubi){ Swal.fire({icon:"error", title:"La ubicación es obligatoria"}); return; }
    if(!(cap>0)){ Swal.fire({icon:"error", title:"La capacidad debe ser mayor a 0"}); return; }

    let mesas=load(KEYS.MESAS);
    if(mesa.id){
      const i=mesas.findIndex(m=>m.id===mesa.id);
      mesas[i]={id: mesa.id, capacidad:cap, ubicacion:ubi, estado:est};
    }else{
      if(mesas.some(m => m.id === id)) { Swal.fire({icon:"error", title:"Ya existe una mesa con ese número"}); return; }
      mesas.push({id,capacidad:cap,ubicacion:ubi,estado:est});
    }
    save(KEYS.MESAS,mesas); renderMesas(); closeModal(); 
    Swal.fire({ icon:"success", title:"Mesa guardada", timer:1400, showConfirmButton:false });
  });
  return f;
}

function openModalCrearReserva(){ 
  openModal("Nueva Reserva", formReserva(), { locked: true }); 
}
function openModalCrearReservaConMesa(mesaId = null) {
  openModal("Nueva Reserva", formReserva(mesaId ? {idMesaAsignada: mesaId} : {}), { locked: true });
}
function openModalEditarReserva(id){
  const r=load(KEYS.RESERVAS).find(x=>x.idReserva===id);
  openModal("Editar Reserva", formReserva(r), { locked: true });
}
function eliminarReserva(id){
  let rs=load(KEYS.RESERVAS).filter(r=>r.idReserva!==id);
  save(KEYS.RESERVAS,rs); 
  actualizarEstadosMesas();
  if (typeof renderReservas === 'function') renderReservas(); 
  Swal.fire({ icon:"success", title:"Reserva eliminada", timer:1400, showConfirmButton:false });
}
function pagarReserva(id){
  let rs=load(KEYS.RESERVAS); 
  const i=rs.findIndex(r=>r.idReserva===id);
  if (i !== -1) {
    rs[i].estado="Finalizada";
    save(KEYS.RESERVAS,rs);
    actualizarEstadosMesas();
    if (typeof renderReservas === 'function') renderReservas();
    Swal.fire({ icon:"success", title:"Reserva finalizada", text:"Mesa liberada correctamente.", timer:1500, showConfirmButton:false });
  }
}

function formReserva(r = {}) {
  const f = document.createElement("form");

  f.noValidate = true;
  f.addEventListener("invalid", (e) => e.preventDefault(), true);

  const horasOptions = generarOpcionesHora().map(h => 
    `<option ${r.horaReserva === h ? "selected" : ""}>${h}</option>`
  ).join("");
  
  const todasLasMesas = load(KEYS.MESAS);

  let mesasParaSelect = todasLasMesas.filter(m => m.estado === "disponible");
  if (r.idMesaAsignada) {
    const mesaActual = todasLasMesas.find(m => m.id === r.idMesaAsignada);
    if (mesaActual && !mesasParaSelect.some(m => m.id === mesaActual.id)) {
      mesasParaSelect = [mesaActual, ...mesasParaSelect];
    }
  }

  f.innerHTML = `
    <div class="field">
      <label>Nombre del Cliente *</label>
      <input id="nombre" value="${r.nombreCliente || ""}" placeholder="Ingrese el nombre completo">
    </div>
    <div class="field">
      <label>Número de Personas *</label>
      <input id="personas" type="number" min="1" max="20" value="${r.numeroPersonas || 1}">
    </div>
    <div class="form-row" style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
      <div class="field">
        <label>Fecha de Reserva *</label>
        <input id="fecha" type="date" value="${r.fechaReserva || ""}" min="${new Date().toISOString().split('T')[0]}">
      </div>
      <div class="field">
        <label>Hora de Reserva *</label>
        <select id="hora">
          <option value="">Seleccione una hora</option>
          ${horasOptions}
        </select>
      </div>
    </div>
    <div class="field">
      <label>Mesa *</label>
      <select id="selectMesa">
        <option value="">Seleccione una mesa</option>
        ${mesasParaSelect.map(m => 
          `<option value="${m.id}" ${r.idMesaAsignada === m.id ? "selected" : ""}>
            ${m.id} - ${m.ubicacion} (Capacidad: ${m.capacidad})${(r.idMesaAsignada === m.id && m.estado !== "disponible") ? " [Actual]" : ""}
          </option>`
        ).join("")}
      </select>
      <small style="color: #666;">Se listan mesas disponibles ${r.idMesaAsignada ? "y la mesa actual" : ""}</small>
    </div>
    <div class="field">
      <label>Ocasión Especial</label>
      <select id="ocas">
        ${OCASIONES.map(o => `<option ${r.ocasionEspecial === o ? "selected" : ""}>${o}</option>`).join("")}
      </select>
    </div>
    <div class="field">
      <label>Estado de la Reserva</label>
      <select id="estado" ${r.idReserva ? "" : "disabled"}>
        ${ESTADOS_RESERVA.map(e => `<option ${r.estado === e ? "selected" : ""}>${e}</option>`).join("")}
      </select>
      <small style="color: #666;">${r.idReserva ? "Puede editar el estado" : "El estado se establecerá como 'Pendiente' para nuevas reservas"}</small>
    </div>
    <button class="btn btn-primary" type="submit">${r.idReserva ? "Actualizar Reserva" : "Crear Reserva"}</button>
  `;

  f.addEventListener("submit", ev => {
    ev.preventDefault();

    const nombre = f.querySelector("#nombre").value.trim();
    const personas = parseInt(f.querySelector("#personas").value.trim(),10);
    const fecha = f.querySelector("#fecha").value.trim();
    const hora = f.querySelector("#hora").value.trim();
    const mesaSel = f.querySelector("#selectMesa").value.trim();
    const ocas = f.querySelector("#ocas").value.trim();
    const estado = (r.idReserva ? f.querySelector("#estado").value.trim() : "Pendiente");

    if (!nombre || nombre.length < 3){ Swal.fire({icon:"error", title:"El nombre es obligatorio (mín. 3 caracteres)"}); return; }
    if (!(personas > 0)){ Swal.fire({icon:"error", title:"El número de personas debe ser mayor a 0"}); return; }

    const mesa = load(KEYS.MESAS).find(m => m.id === mesaSel);
    if (!mesa){ Swal.fire({icon:"error", title:"Mesa no encontrada"}); return; }
    if (mesa.estado !== "disponible" && mesa.id !== r.idMesaAsignada){ 
      Swal.fire({icon:"error", title:`La ${mesaSel} no está disponible`}); 
      return; 
    }
    if (personas > mesa.capacidad){ Swal.fire({icon:"error", title:`Capacidad máxima ${mesa.capacidad} personas`}); return; }

    if (!isFutureDate(fecha)){ Swal.fire({icon:"error", title:"La fecha debe ser hoy o futura"}); return; }
    if (!isTimeInRange(hora)){ Swal.fire({icon:"error", title:"La hora debe estar entre 08:00 y 20:00"}); return; }

    if (!mesaDisponible(mesaSel, fecha, hora, r.idReserva)){ 
      Swal.fire({icon:"error", title:"Mesa no disponible", text:"Se requieren 2 horas entre reservas (antes y después)."}); 
      return; 
    }

    let rs = load(KEYS.RESERVAS);

    if (r.idReserva) {
      const i = rs.findIndex(x => x.idReserva === r.idReserva);
      rs[i] = {
        idReserva: r.idReserva,
        nombreCliente: nombre,
        numeroPersonas: personas,
        fechaReserva: fecha,
        horaReserva: hora,
        idMesaAsignada: mesaSel,
        ocasionEspecial: ocas,
        estado
      };
    } else {
      rs.push({
        idReserva: genId("res"),
        nombreCliente: nombre,
        numeroPersonas: personas,
        fechaReserva: fecha,
        horaReserva: hora,
        idMesaAsignada: mesaSel,
        ocasionEspecial: ocas,
        estado: "Pendiente"
      });
      actualizarEstadoMesa(mesaSel, "ocupada");
    }

    save(KEYS.RESERVAS, rs);
    actualizarEstadosMesas();
    if (typeof renderReservas === 'function') renderReservas();
    closeModal();

    Swal.fire({
      icon: "success",
      title: r.idReserva ? "Reserva actualizada" : "Reserva creada",
      text: r.idReserva ? "Los cambios se guardaron correctamente." : "Tu reserva fue creada correctamente.",
      timer: 1800,
      showConfirmButton: false
    });
  });

  return f;
}

let _modalEscHandler = null;
function openModal(title, content, options = { locked: true }){
  if(!$("#modal")) return;
  const locked = options.locked ?? true;

  $("#modalTitle").textContent = title;
  const c=$("#modalContent"); c.innerHTML=""; c.appendChild(content);

  const backdrop = $(".modal-backdrop");
  if (backdrop){
    backdrop.style.pointerEvents = locked ? "none" : "auto";
  }
  if (_modalEscHandler) {
    document.removeEventListener("keydown", _modalEscHandler);
    _modalEscHandler = null;
  }
  if (locked) {
    _modalEscHandler = (e)=>{ if(e.key === "Escape"){ e.preventDefault(); e.stopPropagation(); } };
    document.addEventListener("keydown", _modalEscHandler, true);
  }

  if ($("#modalClose")){
    $("#modalClose").style.display = "";
  }

  $("#modal").classList.remove("hidden");
}
function closeModal(){ 
  if($("#modal")) $("#modal").classList.add("hidden"); 
  if (_modalEscHandler){
    document.removeEventListener("keydown", _modalEscHandler, true);
    _modalEscHandler = null;
  }
}

if($("#modalClose")) $("#modalClose").addEventListener("click",closeModal);
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

document.addEventListener('DOMContentLoaded', function() {
  initData();
  if ($("#mesasGrid")) renderMesas();
  if ($("#reservasGrid")) renderReservas();
});
