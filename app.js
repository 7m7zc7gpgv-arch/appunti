/* I miei appunti — nessuna dipendenza esterna, nessun dato inviato in rete. */
const $ = (s) => document.querySelector(s);
const DB_NAME = "miei-appunti-db";
const STORE = "notes";
const defaultFolders = ["Tutti gli appunti", "Università", "Lavoro", "Personale"];
let db, notes = [], folder = "Tutti gli appunti", current = null, pageIndex = 0;
let tool = "pen", drawing = false, last = null, history = [], future = [];

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: "id" });
    req.onsuccess = () => { db = req.result; resolve(); };
    req.onerror = () => reject(req.error);
  });
}
function request(store, mode, action) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, mode); const result = action(tx.objectStore(store));
    tx.oncomplete = () => resolve(result?.result); tx.onerror = () => reject(tx.error);
  });
}
async function loadNotes() { notes = await request(STORE, "readonly", s => s.getAll()); notes.sort((a,b) => b.updated - a.updated); }
async function persist(note) { note.updated = Date.now(); await request(STORE, "readwrite", s => s.put(note)); await loadNotes(); }
function uid() { return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`; }
function escapeHTML(value) { const el = document.createElement("div"); el.textContent = value; return el.innerHTML; }
function plural(n) { return `${n} appunto${n === 1 ? "" : "i"}`; }
function fmt(date) { return new Intl.DateTimeFormat("it-IT", { day:"numeric", month:"short" }).format(date); }
function toast(message) { const t = $("#toast"); t.textContent = message; t.classList.add("show"); clearTimeout(toast.timer); toast.timer = setTimeout(() => t.classList.remove("show"), 2400); }

function allFolders() { return [...new Set([...defaultFolders, ...notes.map(n => n.folder)])]; }
function renderFolders() {
  const folders = allFolders();
  $("#folderList").innerHTML = folders.map(name => {
    const count = name === "Tutti gli appunti" ? notes.length : notes.filter(n => n.folder === name).length;
    return `<button class="folder ${folder === name ? "active" : ""}" data-folder="${escapeHTML(name)}"><span>${name === "Tutti gli appunti" ? "▦" : "▱"} ${escapeHTML(name)}</span><span class="count">${count}</span></button>`;
  }).join("");
  document.querySelectorAll(".folder").forEach(button => button.onclick = () => { folder = button.dataset.folder; renderLibrary(); $(".sidebar").classList.remove("open"); });
}
function renderLibrary() {
  renderFolders(); $("#folderTitle").textContent = folder;
  const list = folder === "Tutti gli appunti" ? notes : notes.filter(n => n.folder === folder);
  $("#noteGrid").innerHTML = list.map(n => `<button class="note-card" data-id="${n.id}"><span class="paper-icon">▤</span><span class="card-title">${escapeHTML(n.title)}</span><span class="card-meta">${n.pages.length} pag. · ${fmt(new Date(n.updated))}</span></button>`).join("");
  $("#emptyState").hidden = list.length !== 0; $("#noteGrid").hidden = list.length === 0;
  document.querySelectorAll(".note-card").forEach(card => card.onclick = () => openNote(card.dataset.id));
}
function fillNewFolders() { $("#newFolderSelect").innerHTML = allFolders().filter(x => x !== "Tutti gli appunti").map(x => `<option ${x===folder ? "selected" : ""}>${escapeHTML(x)}</option>`).join(""); }
function showNewNote() { fillNewFolders(); $("#newTitle").value = ""; $("#noteDialog").showModal(); setTimeout(() => $("#newTitle").focus(), 100); }
async function makeNote() {
  const title = $("#newTitle").value.trim(); if (!title) return;
  const template = document.querySelector('input[name="template"]:checked').value;
  const selectedFolder = $("#newFolderSelect").value || "Personale";
  const note = { id:uid(), title, folder:selectedFolder, template, updated:Date.now(), pages:[null] };
  await persist(note); $("#noteDialog").close(); await openNote(note.id);
}
function saveCurrentCanvas() { if (current) current.pages[pageIndex] = $("#canvas").toDataURL("image/png"); }
function drawPaper(ctx, template) {
  const c = ctx.canvas; ctx.fillStyle = "#fffdf2"; ctx.fillRect(0,0,c.width,c.height);
  if (template === "blank") return;
  ctx.strokeStyle = template === "grid" ? "#dce4d4" : "#dce8dc"; ctx.lineWidth = 1;
  const step = template === "grid" ? 24 : 42;
  for (let y=step; y<c.height; y+=step) { ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(c.width,y);ctx.stroke(); }
  if (template === "grid") for (let x=step; x<c.width; x+=step) { ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,c.height);ctx.stroke(); }
  if (template === "lined") { ctx.strokeStyle="#ee9d9d";ctx.beginPath();ctx.moveTo(90,0);ctx.lineTo(90,c.height);ctx.stroke(); }
}
function loadPage(index) {
  pageIndex = index; const canvas = $("#canvas"), ctx = canvas.getContext("2d"); drawPaper(ctx,current.template);
  const img = new Image(); const stored = current.pages[index];
  if (stored) { img.onload = () => ctx.drawImage(img,0,0,canvas.width,canvas.height); img.src = stored; }
  history=[]; future=[]; renderPages(); updateUndo();
}
function renderPages() { $("#pageTabs").innerHTML = current.pages.map((_,i) => `<button class="page-tab ${i===pageIndex?"active":""}" data-page="${i}">${i+1}</button>`).join(""); document.querySelectorAll(".page-tab").forEach(t => t.onclick = () => { saveCurrentCanvas(); loadPage(Number(t.dataset.page)); }); }
async function openNote(id) {
  current = notes.find(n => n.id === id); if (!current) return; pageIndex = 0;
  $("#libraryView").hidden=true; $("#editorView").hidden=false; $("#noteTitle").value=current.title; loadPage(0);
}
async function closeNote() { if (!current) return; saveCurrentCanvas(); await persist(current); current=null; $("#editorView").hidden=true; $("#libraryView").hidden=false; renderLibrary(); }
function canvasPoint(event) { const r=$("#canvas").getBoundingClientRect(); return { x:(event.clientX-r.left)*1024/r.width, y:(event.clientY-r.top)*1448/r.height }; }
function snapshot() { history.push($("#canvas").toDataURL()); if(history.length>30) history.shift(); future=[]; updateUndo(); }
function restore(src) { const canvas=$("#canvas"),ctx=canvas.getContext("2d"),img=new Image(); img.onload=()=>{ctx.clearRect(0,0,1024,1448);ctx.drawImage(img,0,0);};img.src=src; }
function updateUndo(){ $("#undo").disabled=!history.length; $("#redo").disabled=!future.length; }
function startDraw(event) { if (!current) return; event.preventDefault(); snapshot(); drawing=true; last=canvasPoint(event); $("#canvas").setPointerCapture?.(event.pointerId); }
function moveDraw(event) {
  if(!drawing) return; event.preventDefault(); const p=canvasPoint(event),ctx=$("#canvas").getContext("2d");
  ctx.save(); ctx.lineCap="round";ctx.lineJoin="round";
  const base=Number($("#size").value); ctx.lineWidth= tool === "highlighter" ? base*3 : base;
  if(tool === "eraser") { ctx.globalCompositeOperation="destination-out";ctx.strokeStyle="rgba(0,0,0,1)";ctx.lineWidth=base*4; }
  else { ctx.globalCompositeOperation="source-over";ctx.strokeStyle=$("#color").value; if(tool === "highlighter")ctx.globalAlpha=.28; }
  ctx.beginPath();ctx.moveTo(last.x,last.y);ctx.lineTo(p.x,p.y);ctx.stroke();ctx.restore();last=p;
}
function endDraw() { if (!drawing) return; drawing=false; saveCurrentCanvas(); persist(current); }
function chooseTool(name) { tool=name; document.querySelectorAll("[data-tool]").forEach(b=>b.classList.toggle("active",b.dataset.tool===name)); }
async function addPage() { saveCurrentCanvas(); current.pages.push(null); await persist(current); loadPage(current.pages.length-1); toast("Nuova pagina aggiunta"); }
async function deleteCurrent() { if (!confirm(`Eliminare “${current.title}”?`)) return; await request(STORE,"readwrite",s=>s.delete(current.id)); current=null; await loadNotes(); $("#editorView").hidden=true;$("#libraryView").hidden=false;renderLibrary();toast("Appunto eliminato"); }
async function applyTemplate() { const value=document.querySelector('input[name="change-template"]:checked').value; current.template=value; await persist(current); if (!current.pages[pageIndex]) loadPage(pageIndex); $("#templateDialog").close();toast("Modello aggiornato per le nuove pagine"); }
function printNote() { saveCurrentCanvas(); const image=$("#canvas").toDataURL(); const win=window.open("","_blank"); win.document.write(`<title>${escapeHTML(current.title)}</title><img style="width:100%" src="${image}">`); win.document.close(); win.onload=()=>win.print(); }
function addFolder() { const name=prompt("Nome della nuova cartella:"); if (!name?.trim()) return; defaultFolders.push(name.trim()); folder=name.trim(); renderLibrary(); }
function bind() {
  [$("#newNote"),$("#newNoteTop"),$("#emptyNewNote")].forEach(x=>x.onclick=showNewNote); $("#newFolder").onclick=addFolder; $("#mobileMenu").onclick=()=>$(".sidebar").classList.add("open");
  $("#noteForm").addEventListener("submit", e=>{if(e.submitter?.value!=="cancel"){e.preventDefault();makeNote();}}); $("#backToLibrary").onclick=closeNote; $("#addPage").onclick=addPage; $("#deleteNote").onclick=deleteCurrent; $("#exportPdf").onclick=printNote;
  $("#noteTitle").addEventListener("change",async e=>{current.title=e.target.value.trim()||"Senza titolo";await persist(current);});
  document.querySelectorAll("[data-tool]").forEach(b=>b.onclick=()=>chooseTool(b.dataset.tool)); const canvas=$("#canvas");canvas.addEventListener("pointerdown",startDraw);canvas.addEventListener("pointermove",moveDraw);canvas.addEventListener("pointerup",endDraw);canvas.addEventListener("pointercancel",endDraw);
  $("#undo").onclick=()=>{if(!history.length)return;future.push($("#canvas").toDataURL());restore(history.pop());updateUndo();}; $("#redo").onclick=()=>{if(!future.length)return;history.push($("#canvas").toDataURL());restore(future.pop());updateUndo();};
  $("#changeTemplate").onclick=()=>{document.querySelector(`input[name="change-template"][value="${current.template}"]`).checked=true;$("#templateDialog").showModal();}; $("#templateForm").addEventListener("submit",e=>{if(e.submitter?.value!=="cancel"){e.preventDefault();applyTemplate();}});
}
async function init() { await openDB(); await loadNotes(); bind(); renderLibrary(); if("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js"); }
init().catch(err=>{console.error(err);toast("Impossibile aprire l'archivio locale");});

