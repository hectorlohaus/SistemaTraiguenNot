// 1
// js/app.js
// Punto de entrada principal: Inicialización y Event Listeners

// --- CONFIGURACIÓN DE EDICIÓN ---
// Reemplaza esto con el UUID del usuario que tiene permiso para editar
const ALLOWED_EDIT_UUID = '4fde3166-b632-44f9-be12-f59de4e458f4'; 

// --- MÓDULO: Estado Global ---
const State = {
    currentTable: 'repertorio_instrumentos',
    activeTab: 'registros', // 'registros' o 'buscador'
    currentPage: 1,
    supabase: null,
    editingId: null, // ID del registro que se está editando (null si es nuevo)
    currentData: [], // Almacena los datos cargados actualmente para acceso rápido
    
    init() {
        if (!window.supabase) throw new Error("Supabase no cargado");
        this.supabase = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
    }
};

// --- MÓDULO: Controlador App ---
const App = {
    async loadData() {
        if (!document.getElementById('data-table')) return; 
        UI.showLoading(true); UI.showError(null);
        try {
            const filtro = UI.els['filtro-busqueda']?.value || '';
            const { data, count } = await DataService.loadData(filtro);
            
            // Guardar datos en el estado para poder editarlos por ID luego
            State.currentData = data;
            
            UI.renderTable(data);
            UI.updatePagination(count);
            
            // Resetear estado de edición al recargar datos si no estamos editando activamente
            if (!State.editingId) this.cancelEdit();
        } catch(e) { UI.showError('Error: ' + e.message); }
        finally { UI.showLoading(false); }
    },

      updateUI() {
        // Solo actualizar si estamos en la pestaña de registros
        if (State.activeTab !== 'registros') return;

        const schema = SCHEMAS[State.currentTable];
        if (UI.els['app-title']) UI.els['app-title'].textContent = isAdmin ? schema.tableName : `${schema.tableName} (Invitado)`;
        
        if (UI.els['table-header']) {
            let headerHtml = `<tr class="bg-slate-100 text-slate-600 uppercase text-xs leading-normal"><th class="py-3 px-6 text-left w-10"><input type="checkbox" id="select-all-checkbox" class="rounded text-blue-600"></th>`;
            schema.columnNames.forEach((name, index) => {
                if (!schema.hiddenColumns?.includes(index)) headerHtml += `<th class="py-3 px-6 text-left font-bold tracking-wider">${name}</th>`;
            });
            
            // CAMBIO: Agregar columna de Acciones si es Admin
            if (typeof isAdmin !== 'undefined' && isAdmin) {
                headerHtml += `<th class="py-3 px-6 text-center font-bold tracking-wider">Acciones</th>`;
            }
            
            UI.els['table-header'].innerHTML = headerHtml + `</tr>`;
            
            const cbAll = document.getElementById('select-all-checkbox');
            if(cbAll) cbAll.addEventListener('change', (e) => document.querySelectorAll('.row-checkbox').forEach(cb => cb.checked = e.target.checked));
        }

        if (isAdmin) UI.renderForm();
        this.loadData();
    },

    switchTable(tableName) {
        State.currentTable = tableName;
        State.currentPage = 1;
        this.cancelEdit(); // Cancelar edición al cambiar tabla
        this.updateUI();
        this.updateTabStyles();
    },
    
    // Nueva función para manejar el cambio entre "Registros" y "Buscador Avanzado"
    switchMainTab(tabName) {
        State.activeTab = tabName;
        
        // Mostrar/Ocultar secciones
        const secRegistros = document.getElementById('section-registros');
        const secBuscador = document.getElementById('section-buscador');
        const navRegistros = document.getElementById('nav-registros'); // Pestañas de libros
        
        if (tabName === 'registros') {
            if(secRegistros) secRegistros.style.display = 'block';
            if(secBuscador) secBuscador.style.display = 'none';
            if(navRegistros) navRegistros.style.display = 'flex'; // Mostrar selector de libros
            this.updateUI(); // Cargar datos normales
        } else {
            if(secRegistros) secRegistros.style.display = 'none';
            if(secBuscador) secBuscador.style.display = 'block';
            if(navRegistros) navRegistros.style.display = 'none'; // Ocultar selector de libros (el buscador tiene el suyo)
            // Inicializar buscador si es la primera vez
            if (typeof BuscadorService !== 'undefined') BuscadorService.renderFilters();
        }
        
        this.updateTabStyles();
    },

    updateTabStyles() {
        // Estilos para los botones de libros (Propiedad/Sociedad)
        const activeClass = ['border-blue-600', 'text-blue-600', 'bg-blue-50'];
        const inactiveClass = ['border-transparent', 'text-gray-500', 'hover:text-gray-700', 'hover:border-gray-300'];
        
        const btnP = UI.els['btn-propiedad'];
        const btnS = UI.els['btn-sociedad'];
        
        if (State.activeTab === 'registros') {
            if (State.currentTable === 'repertorio_instrumentos') {
                btnP?.classList.add(...activeClass); btnP?.classList.remove(...inactiveClass);
                btnS?.classList.remove(...activeClass); btnS?.classList.add(...inactiveClass);
            } else {
                btnS?.classList.add(...activeClass); btnS?.classList.remove(...inactiveClass);
                btnP?.classList.remove(...activeClass); btnP?.classList.add(...inactiveClass);
            }
        }
        
        // Estilos para los botones principales (Registros/Buscador)
        const btnMainReg = document.getElementById('btn-main-registros');
        const btnMainBus = document.getElementById('btn-main-buscador');
        
        if (btnMainReg && btnMainBus) {
             const mainActive = ['bg-slate-200', 'text-slate-900'];
             const mainInactive = ['bg-white', 'text-slate-600', 'hover:text-slate-900'];
             
             if (State.activeTab === 'registros') {
                 btnMainReg.classList.add(...mainActive); btnMainReg.classList.remove(...mainInactive);
                 btnMainBus.classList.remove(...mainActive); btnMainBus.classList.add(...mainInactive);
             } else {
                 btnMainBus.classList.add(...mainActive); btnMainBus.classList.remove(...mainInactive);
                 btnMainReg.classList.remove(...mainActive); btnMainReg.classList.add(...mainInactive);
             }
        }
    },
    
    // --- Lógica de Edición ---
    
    // Función para iniciar edición desde el botón del lápiz
    async startEdit(id) {
        const user = (await State.supabase.auth.getUser()).data.user;
        // Validación de UUID
        if (!user || user.id !== ALLOWED_EDIT_UUID) {
            UI.showError("No tienes permiso para editar registros.");
            return;
        }

        const record = State.currentData.find(r => r.id == id);
        if (!record) {
            UI.showError("Registro no encontrado en memoria.");
            return;
        }

        State.editingId = record.id;
        
        // Llenar formulario
        const schema = SCHEMAS[State.currentTable];
        schema.formFields.forEach(f => {
            const el = document.getElementById(`form-${f.id}`);
            if (el) el.value = record[f.id] || '';
        });

        // Cambiar estado visual del botón guardar
        const btnSave = document.getElementById('btn-save');
        if (btnSave) {
            btnSave.textContent = 'Actualizar Registro';
            btnSave.classList.remove('bg-blue-600', 'hover:bg-blue-700');
            btnSave.classList.add('bg-amber-600', 'hover:bg-amber-700');
        }
        
        // Mostrar botón cancelar edición
        let btnCancel = document.getElementById('btn-cancel-edit');
        if (!btnCancel && btnSave) {
            btnCancel = document.createElement('button');
            btnCancel.id = 'btn-cancel-edit';
            btnCancel.type = 'button';
            btnCancel.textContent = 'Cancelar Edición';
            btnCancel.className = "ml-2 inline-flex items-center justify-center py-2.5 px-6 bg-gray-500 text-white font-medium rounded-lg shadow-md hover:bg-gray-600 transition-all";
            btnCancel.onclick = () => App.cancelEdit();
            btnSave.parentNode.insertBefore(btnCancel, btnSave.nextSibling);
        }
        
        // Scroll al formulario
        document.getElementById('form-container').scrollIntoView({ behavior: 'smooth' });
        UI.showToast("Modo edición activado.");
    },

    cancelEdit() {
        State.editingId = null;
        document.getElementById('form-nuevo-registro')?.reset();
        const dateInput = document.getElementById('form-fecha');
        if (dateInput) {
            dateInput.valueAsDate = new Date();
        }
        
        const btnSave = document.getElementById('btn-save');
        if (btnSave) {
            btnSave.textContent = 'Guardar Registro';
            btnSave.classList.add('bg-blue-600', 'hover:bg-blue-700');
            btnSave.classList.remove('bg-amber-600', 'hover:bg-amber-700');
        }
        
        const btnCancel = document.getElementById('btn-cancel-edit');
        if (btnCancel) btnCancel.remove();
    },

    async saveRecord() {
         const schema = SCHEMAS[State.currentTable];
        const newRow = {};
        let isValid = true;
        
        schema.formFields.forEach(f => {
            const el = document.getElementById(`form-${f.id}`);
            if (el) {
                if(el.value) newRow[f.id] = el.value;
                else if(f.required) { isValid = false; el.classList.add('border-red-500'); }
            }
        });

        if (!isValid) { UI.showError('Faltan campos obligatorios.'); return; }

        try {
            const btn = document.getElementById('btn-save');
            if(btn) { btn.disabled = true; btn.innerHTML = State.editingId ? 'Actualizando...' : 'Guardando...'; }
            
            if (State.editingId) {
                // MODIFICACIÓN: Actualizar registro existente
                const user = (await State.supabase.auth.getUser()).data.user;
                if (!user || user.id !== ALLOWED_EDIT_UUID) {
                    throw new Error("Permiso denegado para editar.");
                }

                const { error } = await State.supabase
                    .from(State.currentTable)
                    .update(newRow)
                    .eq('id', State.editingId);
                
                if (error) throw error;
                UI.showToast(`Registro actualizado correctamente.`);
                this.cancelEdit();

            } else {
                // Insertar nuevo registro
                await DataService.saveRecord(newRow);
                document.getElementById('form-nuevo-registro').reset();
                UI.showToast(`Registro guardado.`);
            }
            
            UI.showError(null);
            State.currentPage = 1;
            this.updateUI();
        } catch(e) { UI.showError('Error al guardar: ' + e.message); }
        finally {
            const btn = document.getElementById('btn-save');
            if(btn) { 
                btn.disabled = false; 
                btn.textContent = State.editingId ? 'Actualizar Registro' : 'Guardar Registro'; 
            }
        }
    }
};

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', async () => {
    try {
        State.init();
        UI.init();
        if (typeof BuscadorService !== 'undefined') BuscadorService.init(); 
        
        // Ocultar elementos para invitados
        if (typeof isAdmin !== 'undefined' && !isAdmin) {
            const cierreElements = document.querySelectorAll('[id^="btn-cierre-"]');
            cierreElements.forEach(el => {
                const container = el.closest('.flex.items-start.gap-4');
                if (container) {
                    container.style.display = 'none';
                    const separator = container.previousElementSibling;
                    if (separator && separator.classList.contains('border-t')) {
                        separator.style.display = 'none';
                    }
                } else {
                    el.style.display = 'none';
                }
            });
        }

        // Auth Listener
        State.supabase.auth.onAuthStateChange((event, session) => {
            if (typeof isAdmin !== 'undefined' && isAdmin && !session) window.location.href = 'index.html';
            else if (UI.els['app-view']) {
                UI.els['app-view'].style.display = 'block';
                App.updateUI();
            }
        });

        // Event Listeners
        if (typeof isAdmin !== 'undefined' && isAdmin && UI.els['btn-logout']) UI.els['btn-logout'].addEventListener('click', async () => await State.supabase.auth.signOut());
        
        if (UI.els['btn-propiedad']) UI.els['btn-propiedad'].addEventListener('click', () => App.switchTable('repertorio_instrumentos'));
        if (UI.els['btn-sociedad']) UI.els['btn-sociedad'].addEventListener('click', () => App.switchTable('repertorio_conservador'));

        const btnMainReg = document.getElementById('btn-main-registros');
        const btnMainBus = document.getElementById('btn-main-buscador');
        
        if (btnMainReg) btnMainReg.addEventListener('click', () => App.switchMainTab('registros'));
        if (btnMainBus) btnMainBus.addEventListener('click', () => App.switchMainTab('buscador'));

        const buscar = () => { State.currentPage = 1; App.loadData(); };
        if (UI.els['btn-buscar']) UI.els['btn-buscar'].addEventListener('click', buscar);
        if (UI.els['filtro-busqueda']) UI.els['filtro-busqueda'].addEventListener('keyup', (e) => { if (e.key === 'Enter') buscar(); });

        if (typeof isAdmin !== 'undefined' && isAdmin && UI.els['form-nuevo-registro']) {
            UI.els['form-nuevo-registro'].addEventListener('submit', async (e) => {
                e.preventDefault();
                await App.saveRecord();
            });
        }
        
        if (UI.els['btn-prev']) UI.els['btn-prev'].addEventListener('click', () => { if(State.currentPage > 1) { State.currentPage--; App.loadData(); } });
        if (UI.els['btn-next']) UI.els['btn-next'].addEventListener('click', () => { State.currentPage++; App.loadData(); });
        
        // Exportaciones
        const btnPdf = document.getElementById('btn-pdf');
        if (btnPdf) btnPdf.addEventListener('click', (e) => { e.preventDefault(); ExportService.generatePDF(false); });
        const btnPrint = document.getElementById('btn-print');
        if (btnPrint) btnPrint.addEventListener('click', (e) => { e.preventDefault(); ExportService.generatePrint(); });
        const btnExcel = document.getElementById('btn-excel');
        if (btnExcel) btnExcel.addEventListener('click', (e) => { e.preventDefault(); ExportService.generateExcel(false); });

        // CAMBIO: Listener para botones de edición (Delegación de eventos en la tabla)
        const tbody = document.getElementById('table-body');
        if (tbody) {
            tbody.addEventListener('click', (e) => {
                const btn = e.target.closest('.btn-edit-row');
                if (btn) {
                    const id = btn.dataset.id;
                    App.startEdit(id);
                }
            });
        }

        // Informes Modals
        const setupModal = (btnId, dateInputId, title) => {
            const btn = document.getElementById(btnId); 
            const dateInput = document.getElementById(dateInputId);
            
            if (btn) {
                if (dateInput && !dateInput.value) { dateInput.valueAsDate = new Date(); }
                btn.addEventListener('click', () => {
                    if (btnId.includes('inst')) State.currentTable = 'repertorio_instrumentos';
                    else State.currentTable = 'repertorio_conservador';
                    
                    const selectedDate = dateInput ? dateInput.value : null;
                    const dateDisplay = selectedDate ? new Date(selectedDate + 'T00:00:00').toLocaleDateString('es-CL') : 'HOY';

                    if (UI.els['modal-title']) UI.els['modal-title'].textContent = title;
                    if (UI.els['modal-message']) UI.els['modal-message'].textContent = `¿Confirmar generación para el día ${dateDisplay}?`;
                    if (UI.els['confirmation-modal']) UI.els['confirmation-modal'].style.display = 'flex';
                    if (UI.els['btn-confirm-modal']) UI.els['btn-confirm-modal'].onclick = async () => {
                        if (UI.els['confirmation-modal']) UI.els['confirmation-modal'].style.display = 'none';
                        await ExportService.generatePDF(true, null, selectedDate);
                    };
                });
            }
        };

        if (typeof isAdmin !== 'undefined' && isAdmin) {
            setupModal('btn-cierre-inst', 'date-cierre-inst', 'Cierre Instrumentos');
            setupModal('btn-cierre-cons', 'date-cierre-cons', 'Cierre Conservador');
            setupModal('btn-cierre-dia', null, 'Cierre de Día');
        }
        
        const btnIndice = document.getElementById('btn-indice-inst');
        if (btnIndice) {
             btnIndice.addEventListener('click', () => {
                State.currentTable = 'repertorio_instrumentos';
                ExportService.generateIndiceGeneral();
            });
        }
        
        const setupDirectExport = (btnId, action) => {
            const btn = document.getElementById(btnId);
            if (btn) {
                btn.addEventListener('click', () => {
                    if (btnId.includes('inst')) State.currentTable = 'repertorio_instrumentos';
                    if (btnId.includes('cons')) State.currentTable = 'repertorio_conservador';
                    action();
                });
            }
        };

        setupDirectExport('btn-excel-inst', () => ExportService.generateExcel(true));
        setupDirectExport('btn-excel-cons', () => ExportService.generateExcel(true));
        
        const setupMonthExport = (btnId, inputId) => {
            const btn = document.getElementById(btnId);
            const input = document.getElementById(inputId);
            if (btn && input) {
                btn.addEventListener('click', () => {
                    if (btnId.includes('inst')) State.currentTable = 'repertorio_instrumentos';
                    if (btnId.includes('cons')) State.currentTable = 'repertorio_conservador';
                    const val = input.value; 
                    if (!val) { UI.showError("Por favor, seleccione un mes."); return; }
                    ExportService.generateExcel(true, val); 
                });
            }
        };
        setupMonthExport('btn-excel-month-inst', 'month-excel-inst');
        setupMonthExport('btn-excel-month-cons', 'month-excel-cons');
        
        if (UI.els['btn-cancel-modal']) UI.els['btn-cancel-modal'].addEventListener('click', () => UI.els['confirmation-modal'].style.display = 'none');

    } catch (e) { console.error(e); UI.showError(e.message); }
});