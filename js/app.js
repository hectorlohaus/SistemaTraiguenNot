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

    // CAMBIO: Orden por defecto 'n_rep' ascendente
    sort: { field: 'n_rep', ascending: true },

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
        } catch (e) { UI.showError('Error: ' + e.message); }
        finally { UI.showLoading(false); }
    },

    // Función para cambiar el orden al hacer click en header
    changeSort(field) {
        if (!field) return;
        if (State.sort.field === field) {
            State.sort.ascending = !State.sort.ascending;
        } else {
            State.sort.field = field;
            State.sort.ascending = true;
        }
        State.currentPage = 1; // Volver a la primera página al reordenar

        // CORRECCIÓN IMPORTANTE: 
        // Usamos updateUI() en lugar de loadData() para que también se 
        // regeneren los encabezados (flechas y colores) con el nuevo orden.
        this.updateUI();
    },

    updateUI() {
        // Solo actualizar si estamos en la pestaña de registros
        if (State.activeTab !== 'registros') return;

        const schema = SCHEMAS[State.currentTable];
        if (UI.els['app-title']) UI.els['app-title'].textContent = isAdmin ? schema.tableName : `${schema.tableName} (Invitado)`;

        if (UI.els['table-header']) {
            let headerHtml = `<tr class="bg-slate-100 text-slate-600 uppercase text-xs leading-normal"><th class="py-3 px-6 text-left w-10"><input type="checkbox" id="select-all-checkbox" class="rounded text-blue-600"></th>`;

            schema.columnNames.forEach((name, index) => {
                if (schema.hiddenColumns?.includes(index)) return;

                // Determinar el campo de la base de datos para ordenar
                let dbField = null;
                if (schema.sortMap && schema.sortMap[index]) {
                    dbField = schema.sortMap[index];
                } else if (schema.dbReadFields && schema.dbReadFields[index]) {
                    dbField = schema.dbReadFields[index];
                }

                const isActive = State.sort.field === dbField;

                // Estilos dinámicos para resaltar la columna activa
                let thClass = "py-3 px-6 text-left font-bold tracking-wider cursor-pointer select-none transition-all duration-200 border-b-2 group";

                if (isActive) {
                    // Si está activa: Fondo azul, texto azul, borde azul
                    thClass += " bg-blue-50 text-blue-700 border-blue-500";
                } else {
                    // Si no está activa: Gris normal, hover gris claro
                    thClass += " hover:bg-slate-200 text-slate-600 border-transparent hover:border-slate-300";
                }

                // Icono SVG dinámico
                let iconHtml = '';
                if (isActive) {
                    if (State.sort.ascending) {
                        // Flecha Arriba
                        iconHtml = `<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 ml-1 inline-block" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clip-rule="evenodd" /></svg>`;
                    } else {
                        // Flecha Abajo
                        iconHtml = `<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 ml-1 inline-block" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" /></svg>`;
                    }
                } else {
                    // Icono fantasma (doble flecha) que aparece al pasar el mouse
                    iconHtml = `<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 ml-1 inline-block text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" /></svg>`;
                }

                headerHtml += `
                    <th class="${thClass}" onclick="App.changeSort('${dbField}')">
                        <div class="flex items-center">
                            ${name}
                            ${iconHtml}
                        </div>
                    </th>`;
            });

            // Columna de Acciones si es Admin
            if (typeof isAdmin !== 'undefined' && isAdmin) {
                headerHtml += `<th class="py-3 px-6 text-center font-bold tracking-wider border-b-2 border-transparent">Acciones</th>`;
            }

            UI.els['table-header'].innerHTML = headerHtml + `</tr>`;

            const cbAll = document.getElementById('select-all-checkbox');
            if (cbAll) cbAll.addEventListener('change', (e) => document.querySelectorAll('.row-checkbox').forEach(cb => cb.checked = e.target.checked));
        }

        if (isAdmin) UI.renderForm();
        this.loadData();
    },

    switchTable(tableName) {
        State.currentTable = tableName;
        State.currentPage = 1;

        // CAMBIO: Definir orden por defecto según la tabla seleccionada
        if (tableName === 'repertorio_instrumentos') {
            State.sort = { field: 'n_rep', ascending: true };
        } else {
            // Ordenar por defecto por Número de Inscripción en lugar de ID
            State.sort = { field: 'numero_inscripcion', ascending: true };
        }

        this.cancelEdit();
        this.updateUI();
        this.updateTabStyles();
    },

    // Función para manejar el cambio entre "Registros" y "Buscador Avanzado"
    switchMainTab(tabName) {
        State.activeTab = tabName;

        const secRegistros = document.getElementById('section-registros');
        const secBuscador = document.getElementById('section-buscador');
        const navRegistros = document.getElementById('nav-registros');

        if (tabName === 'registros') {
            if (secRegistros) secRegistros.style.display = 'block';
            if (secBuscador) secBuscador.style.display = 'none';
            if (navRegistros) navRegistros.style.display = 'flex';
            this.updateUI();
        } else {
            if (secRegistros) secRegistros.style.display = 'none';
            if (secBuscador) secBuscador.style.display = 'block';
            if (navRegistros) navRegistros.style.display = 'none';
            if (typeof BuscadorService !== 'undefined') BuscadorService.renderFilters();
        }

        this.updateTabStyles();
    },

    updateTabStyles() {
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
    async startEdit(id) {
        const user = (await State.supabase.auth.getUser()).data.user;
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

        const schema = SCHEMAS[State.currentTable];
        schema.formFields.forEach(f => {
            const el = document.getElementById(`form-${f.id}`);
            if (el) el.value = record[f.id] || '';
        });

        const btnSave = document.getElementById('btn-save');
        if (btnSave) {
            btnSave.textContent = 'Actualizar Registro';
            btnSave.classList.remove('bg-blue-600', 'hover:bg-blue-700');
            btnSave.classList.add('bg-amber-600', 'hover:bg-amber-700');
        }

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

        document.getElementById('form-container').scrollIntoView({ behavior: 'smooth' });
        UI.showToast("Modo edición activado.");
    },

    cancelEdit() {
        State.editingId = null;

        // 1. Limpiamos el formulario (esto borra la fecha)
        document.getElementById('form-nuevo-registro')?.reset();

        // 2. CÓDIGO NUEVO: Volvemos a poner la fecha de hoy
        const dateInput = document.getElementById('form-fecha');
        if (dateInput) {
            const now = new Date();
            now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
            dateInput.valueAsDate = now;
            dateInput.dispatchEvent(new Event('change'));
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
                const val = el.value;
                // CAMBIO: Permitir guardar vacíos (para poder borrar datos al editar)
                // Si es requerido y está vacío -> Error
                // Si no es requerido -> Se guarda tal cual (vacío o con valor)

                if (f.required && !val) {
                    isValid = false;
                    el.classList.add('border-red-500');
                } else {
                    newRow[f.id] = val;
                }
            }
        });

        if (!isValid) { UI.showError('Faltan campos obligatorios.'); return; }

        try {
            const btn = document.getElementById('btn-save');
            if (btn) { btn.disabled = true; btn.innerHTML = State.editingId ? 'Actualizando...' : 'Guardando...'; }

            if (State.editingId) {
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
                await DataService.saveRecord(newRow);
                document.getElementById('form-nuevo-registro').reset();
                UI.showToast(`Registro guardado.`);
                // Restablecer fecha tras guardar
                this.cancelEdit();
            }

            UI.showError(null);
            this.loadData();
        } catch (e) { UI.showError('Error al guardar: ' + e.message); }
        finally {
            const btn = document.getElementById('btn-save');
            if (btn) {
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

        // CORRECCIÓN: Forzar ocultación de columna ID si es invitado
        if (typeof isAdmin !== 'undefined' && !isAdmin) {
            if (SCHEMAS['repertorio_conservador']) {
                SCHEMAS['repertorio_conservador'].hiddenColumns = [0];
            }
        }

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

        State.supabase.auth.onAuthStateChange((event, session) => {
            if (typeof isAdmin !== 'undefined' && isAdmin && !session) window.location.href = 'index.html';
            else if (UI.els['app-view']) {
                UI.els['app-view'].style.display = 'block';
                App.updateUI();
            }
        });

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

        if (UI.els['btn-prev']) UI.els['btn-prev'].addEventListener('click', () => { if (State.currentPage > 1) { State.currentPage--; App.loadData(); } });
        if (UI.els['btn-next']) UI.els['btn-next'].addEventListener('click', () => { State.currentPage++; App.loadData(); });

        const btnPdf = document.getElementById('btn-pdf');
        if (btnPdf) btnPdf.addEventListener('click', (e) => { e.preventDefault(); ExportService.generatePDF(false); });
        const btnPrint = document.getElementById('btn-print');
        if (btnPrint) btnPrint.addEventListener('click', (e) => { e.preventDefault(); ExportService.generatePrint(); });
        const btnExcel = document.getElementById('btn-excel');
        if (btnExcel) btnExcel.addEventListener('click', (e) => { e.preventDefault(); ExportService.generateExcel(false); });

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

        const yearInput = document.getElementById('year-indice-cons');
        if (yearInput) yearInput.value = new Date().getFullYear();

        const setupIndiceCons = (id, tipo) => {
            const btn = document.getElementById(id);
            if (btn) {
                btn.addEventListener('click', () => {
                    const yearInput = document.getElementById('year-indice-cons');
                    const yearVal = yearInput ? yearInput.value : null;

                    State.currentTable = 'repertorio_conservador';
                    ExportService.generateIndiceConservador(tipo, yearVal);
                });
            }
        };

        setupIndiceCons('btn-indice-propiedad', 'Registro de Propiedad');
        setupIndiceCons('btn-indice-hipotecas', 'Registro de Hipotecas y Gravamenes');
        setupIndiceCons('btn-indice-interdicciones', 'Registro de Interdicciones y Prohibiciones');
        setupIndiceCons('btn-indice-comercio', 'Registro de Comercio');
        setupIndiceCons('btn-indice-aguas', 'Registro de Aguas');

        if (UI.els['btn-cancel-modal']) UI.els['btn-cancel-modal'].addEventListener('click', () => UI.els['confirmation-modal'].style.display = 'none');

    } catch (e) { console.error(e); UI.showError(e.message); }
});