// 1
// actualizado v8 (Excel Mensual)
// js/app.js
// Punto de entrada principal: Inicialización y Event Listeners

// --- MÓDULO: Estado Global ---
const State = {
    currentTable: 'repertorio_instrumentos',
    currentPage: 1,
    supabase: null,
    
    init() {
        if (!window.supabase) throw new Error("Supabase no cargado");
        this.supabase = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
    }
};

// --- MÓDULO: Controlador App ---
const App = {
    async loadData() {
        if (!document.getElementById('data-table')) return; // Solo si hay tabla
        UI.showLoading(true); UI.showError(null);
        try {
            const filtro = UI.els['filtro-busqueda']?.value || '';
            const { data, count } = await DataService.loadData(filtro);
            UI.renderTable(data);
            UI.updatePagination(count);
        } catch(e) { UI.showError('Error: ' + e.message); }
        finally { UI.showLoading(false); }
    },

    updateUI() {
        const schema = SCHEMAS[State.currentTable];
        if (UI.els['app-title']) UI.els['app-title'].textContent = isAdmin ? schema.tableName : `${schema.tableName} (Invitado)`;
        
        // Render headers
        if (UI.els['table-header']) {
            let headerHtml = `<tr class="bg-slate-100 text-slate-600 uppercase text-xs leading-normal"><th class="py-3 px-6 text-left w-10"><input type="checkbox" id="select-all-checkbox" class="rounded text-blue-600"></th>`;
            schema.columnNames.forEach((name, index) => {
                if (!schema.hiddenColumns?.includes(index)) headerHtml += `<th class="py-3 px-6 text-left font-bold tracking-wider">${name}</th>`;
            });
            UI.els['table-header'].innerHTML = headerHtml + `</tr>`;
            
            // Re-bind checkbox all
            const cbAll = document.getElementById('select-all-checkbox');
            if(cbAll) cbAll.addEventListener('change', (e) => document.querySelectorAll('.row-checkbox').forEach(cb => cb.checked = e.target.checked));
        }

        if (isAdmin) UI.renderForm();
        this.loadData();
    },

    switchTable(tableName) {
        State.currentTable = tableName;
        State.currentPage = 1;
        this.updateUI();
        
        // Visual updates for tabs
        const activeClass = ['border-blue-600', 'text-blue-600', 'bg-blue-50'];
        const inactiveClass = ['border-transparent', 'text-gray-500', 'hover:text-gray-700', 'hover:border-gray-300'];
        const btnP = UI.els['btn-propiedad'];
        const btnS = UI.els['btn-sociedad'];
        
        if (tableName === 'repertorio_instrumentos') {
            btnP?.classList.add(...activeClass); btnP?.classList.remove(...inactiveClass);
            btnS?.classList.remove(...activeClass); btnS?.classList.add(...inactiveClass);
        } else {
            btnS?.classList.add(...activeClass); btnS?.classList.remove(...inactiveClass);
            btnP?.classList.remove(...activeClass); btnP?.classList.add(...inactiveClass);
        }
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
            if(btn) { btn.disabled = true; btn.innerHTML = 'Guardando...'; }
            
            await DataService.saveRecord(newRow);
            
            UI.showError(null);
            document.getElementById('form-nuevo-registro').reset();
            UI.showToast(`Registro guardado.`);
            State.currentPage = 1;
            this.updateUI();
        } catch(e) { UI.showError('Error al guardar: ' + e.message); }
        finally {
            const btn = document.getElementById('btn-save');
            if(btn) { btn.disabled = false; btn.textContent = 'Guardar Registro'; }
        }
    }
};

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', async () => {
    try {
        State.init();
        UI.init();
        
        // Auth Listener
        State.supabase.auth.onAuthStateChange((event, session) => {
            if (isAdmin && !session) window.location.href = 'index.html';
            else if (UI.els['app-view']) {
                UI.els['app-view'].style.display = 'block';
                App.updateUI();
            }
        });

        // Event Listeners (Solo si los elementos existen)
        if (isAdmin && UI.els['btn-logout']) UI.els['btn-logout'].addEventListener('click', async () => await State.supabase.auth.signOut());
        
        // Tabs
        if (UI.els['btn-propiedad']) UI.els['btn-propiedad'].addEventListener('click', () => App.switchTable('repertorio_instrumentos'));
        if (UI.els['btn-sociedad']) UI.els['btn-sociedad'].addEventListener('click', () => App.switchTable('repertorio_conservador'));

        // Búsqueda
        const buscar = () => { State.currentPage = 1; App.loadData(); };
        if (UI.els['btn-buscar']) UI.els['btn-buscar'].addEventListener('click', buscar);
        if (UI.els['filtro-busqueda']) UI.els['filtro-busqueda'].addEventListener('keyup', (e) => { if (e.key === 'Enter') buscar(); });

        // Guardar
        if (isAdmin && UI.els['form-nuevo-registro']) {
            UI.els['form-nuevo-registro'].addEventListener('submit', async (e) => {
                e.preventDefault();
                await App.saveRecord();
            });
        }

        // Paginación
        if (UI.els['btn-prev']) UI.els['btn-prev'].addEventListener('click', () => { if(State.currentPage > 1) { State.currentPage--; App.loadData(); } });
        if (UI.els['btn-next']) UI.els['btn-next'].addEventListener('click', () => { State.currentPage++; App.loadData(); });

        // --- BOTONES DE EXPORTACIÓN (App.html) ---
        
        const btnPdf = document.getElementById('btn-pdf');
        if (btnPdf) {
            btnPdf.addEventListener('click', (e) => {
                e.preventDefault(); 
                ExportService.generatePDF(false);
            });
        }

        const btnPrint = document.getElementById('btn-print');
        if (btnPrint) {
            btnPrint.addEventListener('click', (e) => {
                e.preventDefault();
                ExportService.generatePrint();
            });
        }

        const btnExcel = document.getElementById('btn-excel');
        if (btnExcel) {
            btnExcel.addEventListener('click', (e) => {
                e.preventDefault();
                ExportService.generateExcel(false); // False = Solo selección actual
            });
        }

        // --- LÓGICA DE LA PÁGINA DE INFORMES (informes.html) ---
        const setupModal = (btnId, title, action) => {
            const btn = document.getElementById(btnId); 
            if (btn) {
                btn.addEventListener('click', () => {
                    if (btnId.includes('inst')) State.currentTable = 'repertorio_instrumentos';
                    else State.currentTable = 'repertorio_conservador';
                    
                    if (UI.els['modal-title']) UI.els['modal-title'].textContent = title;
                    if (UI.els['modal-message']) UI.els['modal-message'].textContent = "¿Confirmar generación?";
                    if (UI.els['confirmation-modal']) UI.els['confirmation-modal'].style.display = 'flex';
                    if (UI.els['btn-confirm-modal']) UI.els['btn-confirm-modal'].onclick = async () => {
                        if (UI.els['confirmation-modal']) UI.els['confirmation-modal'].style.display = 'none';
                        await action();
                    };
                });
            }
        };

        setupModal('btn-cierre-inst', 'Cierre Instrumentos', () => ExportService.generatePDF(true));
        setupModal('btn-cierre-cons', 'Cierre Conservador', () => ExportService.generatePDF(true));
        setupModal('btn-cierre-dia', 'Cierre de Día', () => ExportService.generatePDF(true));

        const btnIndice = document.getElementById('btn-indice-inst');
        if (btnIndice) {
             btnIndice.addEventListener('click', () => {
                State.currentTable = 'repertorio_instrumentos';
                ExportService.generateIndiceGeneral();
            });
        }

        // --- EXPORTACIÓN EXCEL COMPLETO Y MENSUAL ---
        
        // Función auxiliar para exportar excel completo (sin fechas)
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

        // Función para exportar excel mensual (con selector)
        const setupMonthExport = (btnId, inputId) => {
            const btn = document.getElementById(btnId);
            const input = document.getElementById(inputId);
            
            if (btn && input) {
                btn.addEventListener('click', () => {
                    if (btnId.includes('inst')) State.currentTable = 'repertorio_instrumentos';
                    if (btnId.includes('cons')) State.currentTable = 'repertorio_conservador';
                    
                    const val = input.value; // YYYY-MM
                    if (!val) {
                        UI.showError("Por favor, seleccione un mes.");
                        return;
                    }
                    
                    // Llamar a exportar con filtro de fechas
                    ExportService.generateExcel(true, val); 
                });
            }
        };

        // Configurar botones de descarga completa
        setupDirectExport('btn-excel-inst', () => ExportService.generateExcel(true));
        setupDirectExport('btn-excel-cons', () => ExportService.generateExcel(true));

        // Configurar botones de descarga mensual
        setupMonthExport('btn-excel-month-inst', 'month-excel-inst');
        setupMonthExport('btn-excel-month-cons', 'month-excel-cons');


        if (UI.els['btn-cancel-modal']) UI.els['btn-cancel-modal'].addEventListener('click', () => UI.els['confirmation-modal'].style.display = 'none');

    } catch (e) { console.error(e); UI.showError(e.message); }
});