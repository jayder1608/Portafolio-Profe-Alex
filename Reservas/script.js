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

function isFutureDate(d){ if(!d) return false; const today=new Date(); const inDate=new Date(d+'T00:00:00'); return inDate.setHours(0,0,0,0)>=today.setHours(0,0,0,0);}
const isTimeInRange = (t)=> HOURS.min<=t && t<=HOURS.max;
function mesaDisponible(idMesa, fecha, hora, ignore=null){
  return !load(KEYS.RESERVAS).some(r=>{
    const activa=!["Cancelada","Finalizada","No Show"].includes(r.estado);
    if(ignore && r.idReserva===ignore) return false;
    return activa && r.idMesaAsignada===idMesa && r.fechaReserva===fecha && r.horaReserva===hora;
  });
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
      if(action==="res") window.location.href=`reserva.html?mesa=${id}`;
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

  if(filtroEstado) reservas = reservas.filter(r => r.estado === filtroEstado);
  if(filtroFecha) reservas = reservas.filter(r => r.fechaReserva === filtroFecha);

  if(reservas.length===0){
    grid.innerHTML=`<div class="card"><div class="card-body" data-tipo="reserva" style="color:gray">No hay reservas</div></div>`; 
    return;
  }

  reservas.forEach(r=>{
    const tag=r.estado==="Pendiente"?"badge-amber":r.estado==="Confirmada"?"badge-green":r.estado==="Cancelada"?"badge-red":r.estado==="Finalizada"?"badge-blue":"badge-neutral";
    const card=document.createElement("div");
    card.className="card";
    card.innerHTML=`
      <div class="card-body" data-tipo="reserva">
        <div style="display:flex;justify-content:space-between">
          <h3 style="margin:0">Reserva #${r.idReserva}</h3>
          <span class="badge ${tag}">${r.estado}</span>
        </div>
        <div>Cliente: <b>${r.nombreCliente}</b></div>
        <div>Personas: <b>${r.numeroPersonas}</b></div>
        <div>Fecha: <b>${r.fechaReserva}</b> Hora: <b>${r.horaReserva}</b></div>
        <div>Mesa: <b>${r.idMesaAsignada}</b></div>
        <div>Ocasión: <b>${r.ocasionEspecial}</b></div>
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
}

function openModalCrearMesa(){ openModal("Nueva Mesa", formMesa()); }
function openModalEditarMesa(id){
  const mesa=load(KEYS.MESAS).find(m=>m.id===id);
  openModal("Editar Mesa", formMesa(mesa));
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
  save(KEYS.RESERVAS,rs); renderReservas(); showToast("Reserva eliminada","success");
}
function pagarReserva(id){
  let rs=load(KEYS.RESERVAS); const i=rs.findIndex(r=>r.idReserva===id);
  rs[i].estado="Confirmada"; save(KEYS.RESERVAS,rs); renderReservas();
  showToast("Reserva confirmada","success");
}
function formReserva(r={}){
  const f=document.createElement("form");
  f.innerHTML=`
    <div class="field"><label>Nombre</label><input required value="${r.nombreCliente||""}"></div>
    <div class="field"><label>Personas</label><input type="number" min="1" required value="${r.numeroPersonas||1}"></div>
    <div class="form-row">
      <div class="field"><label>Fecha</label><input type="date" required value="${r.fechaReserva||""}"></div>
      <div class="field"><label>Hora</label><input type="time" required value="${r.horaReserva||""}"></div>
    </div>
    <div class="field"><label>Mesa</label>
      <select>${load(KEYS.MESAS).map(m=>`<option ${r.idMesaAsignada===m.id?"selected":""}>${m.id}</option>`).join("")}</select>
    </div>
    <div class="field"><label>Ocasión</label>
      <select>${OCASIONES.map(o=>`<option ${r.ocasionEspecial===o?"selected":""}>${o}</option>`).join("")}</select>
    </div>
    <div class="field"><label>Estado</label>
      <select>${ESTADOS_RESERVA.map(e=>`<option ${r.estado===e?"selected":""}>${e}</option>`).join("")}</select>
    </div>
    <button class="btn btn-primary" type="submit">Guardar</button>
  `;
  f.addEventListener("submit",ev=>{
    ev.preventDefault();
    const [nombre,personas,fecha,hora,mesaSel,ocas,estado]=[...f.querySelectorAll("input,select")].map(e=>e.value);
    if(!isFutureDate(fecha)) return showToast("La fecha debe ser futura","error");
    if(!isTimeInRange(hora)) return showToast("Hora fuera de rango","error");
    if(!mesaDisponible(mesaSel,fecha,hora,r.idReserva)) return showToast("Mesa ocupada en esa hora","error");

    let rs=load(KEYS.RESERVAS);
    if(r.idReserva){
      const i=rs.findIndex(x=>x.idReserva===r.idReserva);
      rs[i]={idReserva:r.idReserva,nombreCliente:nombre,numeroPersonas:+personas,fechaReserva:fecha,horaReserva:hora,idMesaAsignada:mesaSel,ocasionEspecial:ocas,estado};
    }else{
      rs.push({idReserva:genId("res"),nombreCliente:nombre,numeroPersonas:+personas,fechaReserva:fecha,horaReserva:hora,idMesaAsignada:mesaSel,ocasionEspecial:ocas,estado:"Pendiente"});
    }
    save(KEYS.RESERVAS,rs); renderReservas(); closeModal(); showToast("Reserva guardada","success");
  });
  return f;
}

function renderReservaForm(){
  const container=$("#reservaFormContainer"); if(!container) return;
  const urlParams=new URLSearchParams(window.location.search);
  const mesaSel=urlParams.get("mesa")||"";
  container.appendChild(formReserva({idMesaAsignada:mesaSel}));
}

function openModal(title,content){
  if(!$("#modal")) return;
  $("#modalTitle").textContent=title;
  const c=$("#modalContent"); c.innerHTML=""; c.appendChild(content);
  $("#modal").classList.remove("hidden");
}
function closeModal(){ if($("#modal")) $("#modal").classList.add("hidden"); }
if($("#modalClose")) $("#modalClose").addEventListener("click",closeModal);
if($(".modal-backdrop")) $(".modal-backdrop").addEventListener("click",closeModal);

if($("#btnAddMesa")) $("#btnAddMesa").addEventListener("click",openModalCrearMesa);
if($("#btnAddReserva")) $("#btnAddReserva").addEventListener("click",openModalCrearReserva);

if($("#filtroEstado")) $("#filtroEstado").addEventListener("change", renderReservas);
if($("#filtroFecha")) $("#filtroFecha").addEventListener("change", renderReservas);
if($("#btnClearFiltros")) $("#btnClearFiltros").addEventListener("click", ()=>{
  $("#filtroEstado").value="";
  $("#filtroFecha").value="";
  renderReservas();
});

initData();
renderMesas();
renderReservas();
renderReservaForm();
