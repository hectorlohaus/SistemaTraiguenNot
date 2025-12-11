// 1
// actualizado
// --- PASO 1: Configuración de Supabase ---
const SUPABASE_URL = 'https://itnjnoqcppkvzqlbmyrq.supabase.co'; // TODO: Reemplaza si es necesario
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0bmpub3FjcHBrdnpxbGJteXJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1ODczODEsImV4cCI6MjA3NzE2MzM4MX0.HP2ChKbP4O5YWu73I6UYgLoH2O80rMcJiWdZRSTYrV8'; // TODO: Reemplaza si es necesario

if (SUPABASE_URL === 'TU_SUPABASE_URL' || !SUPABASE_URL) {
    console.warn('¡Atención! Debes configurar tus claves de Supabase en login.js y app.js');
    alert('Error: Claves de Supabase no configuradas en app.js');
}

// --- Definición de la Estructura de Datos (SCHEMA) ---
// NOTA: Se cambió la grilla a 4 columnas para mejor distribución
const tableSchemas = {
    'repertorio_instrumentos': { 
        tableName: 'Repertorio de Instrumentos Públicos',
        dbReadFields: ['id', 'fecha', 'n_rep', 'contratante_1', 'contratante_2', 'acto_o_contrato', 'abogado_redactor', 'n_agregado', 'created_at'],
        columnNames: ['ID Interno', 'Fecha', 'N° Rep', 'Contratante 1', 'Contratante 2', 'Acto o Contrato', 'Abogado Redactor', 'N° Agregado', 'Terminado'], 
        hiddenColumns: [0], 
        formFields: [
            // Fila 1: Fecha (1/4), N° Rep (1/4), Acto o Contrato (2/4)
            { id: 'fecha', label: 'Fecha', type: 'date', span: 1, required: true },
            { id: 'n_rep', label: 'N° Repertorio (Auto)', type: 'text', span: 1, required: true, placeholder: 'Calculando...' },
            { id: 'acto_o_contrato', label: 'Acto o Contrato', type: 'datalist', span: 2, required: true, options: ['Compraventa', 'Mandato General', 'Mandato Especial', 'Promesa de Compraventa', 'Arrendamiento', 'Testamento', 'Declaración Jurada'] },
            
            // Fila 2: Contratante 1 (2/4) y Contratante 2 (2/4) - Mitad y mitad
            { id: 'contratante_1', label: 'Contratante 1', type: 'text', span: 2, required: true },
            { id: 'contratante_2', label: 'Contratante 2', type: 'text', span: 2, required: true },
            
            // Fila 3: Abogado (2/4) y N° Agregado (2/4)
            { id: 'abogado_redactor', label: 'Abogado Redactor', type: 'text', span: 2, required: true },
            { id: 'n_agregado', label: 'N° Agregado', type: 'text', span: 2, required: false }
        ],
        filterColumns: ['n_rep', 'contratante_1', 'contratante_2', 'acto_o_contrato', 'abogado_redactor']
    },
    'repertorio_conservador': { 
        tableName: 'Repertorio Conservador',
        dbReadFields: ['id', 'interesado', 'acto_o_contrato', 'clase_inscripcion', 'hora', 'dia', 'mes', 'registro_parcial', 'observaciones', 'created_at'],
        columnNames: ['Número', 'Interesado', 'Acto o Contrato', 'Clase Inscripción', 'Hora', 'Día', 'Mes', 'Registro Parcial', 'Observaciones', 'Ingresado'],
        formFields: [
            // Adaptado a grilla de 4 columnas
            { id: 'interesado', label: 'Interesado', type: 'text', span: 2, required: true },
            { id: 'acto_o_contrato', label: 'Acto o Contrato', type: 'datalist', span: 2, required: true, options: ['Constitución de Sociedad', 'Modificación de Sociedad', 'Disolución', 'Poder', 'Saneamiento'] },
            
            { id: 'clase_inscripcion', label: 'Clase Inscripción', type: 'text', span: 2, required: true },
            { id: 'registro_parcial', label: 'Registro Parcial', type: 'text', span: 2, required: true },
            
            { id: 'hora', label: 'Hora', type: 'time', span: 1, required: true },
            { id: 'dia', label: 'Día', type: 'text', span: 1, required: true, placeholder: 'Ej: 01' },
            { id: 'mes', label: 'Mes', type: 'text', span: 2, required: true, placeholder: 'Ej: Enero' },
            
            { id: 'observaciones', label: 'Observaciones', type: 'textarea', span: 4, required: true }
        ],
        filterColumns: ['interesado', 'acto_o_contrato', 'clase_inscripcion', 'observaciones']
    }
};

// --- Variables Globales ---
let currentTable = 'repertorio_instrumentos'; 
let currentPage = 1;
const recordsPerPage = 20;

// --- Lógica Principal ---
document.addEventListener('DOMContentLoaded', () => {

    if (!window.supabase) {
        showError("Error crítico: La librería de Supabase no se cargó correctamente.");
        return;
    }
    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // --- Elementos del DOM ---
    const appView = document.getElementById('app-view');
    const appTitle = document.getElementById('app-title');
    const formContainer = document.getElementById('form-container');
    const btnLogout = document.getElementById('btn-logout');
    const form = document.getElementById('form-nuevo-registro');
    const dynamicFormFields = document.getElementById('dynamic-form-fields');
    const btnPropiedad = document.getElementById('btn-propiedad');
    const btnSociedad = document.getElementById('btn-sociedad');
    const tableHeader = document.getElementById('table-header');
    const tableBody = document.getElementById('table-body');
    const filtroBusqueda = document.getElementById('filtro-busqueda');
    const btnBuscar = document.getElementById('btn-buscar');
    const btnCierreDia = document.getElementById('btn-cierre-dia'); 
    const loadingSpinner = document.getElementById('loading-spinner');
    const errorMessage = document.getElementById('error-message');
    const paginationControls = document.getElementById('pagination-controls');
    const paginationStatus = document.getElementById('pagination-status');
    const btnPrev = document.getElementById('btn-prev');
    const btnNext = document.getElementById('btn-next');
    
    // Elementos del Modal
    const modal = document.getElementById('confirmation-modal');
    const btnConfirmModal = document.getElementById('btn-confirm-modal');
    const btnCancelModal = document.getElementById('btn-cancel-modal');
    const modalMessage = document.getElementById('modal-message');

    // --- Listeners ---

    if (btnPropiedad) {
        btnPropiedad.addEventListener('click', () => switchTable('repertorio_instrumentos'));
    }
    if (btnSociedad) {
        btnSociedad.addEventListener('click', () => switchTable('repertorio_conservador'));
    }

    if (btnBuscar) {
        btnBuscar.addEventListener('click', () => { currentPage = 1; loadData(); });
    }
    if (filtroBusqueda) {
        filtroBusqueda.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') { currentPage = 1; loadData(); }
        });
    }

    // Lógica del Botón Cierre de Día con Modal
    if (btnCierreDia) {
        btnCierreDia.addEventListener('click', () => {
            const currentTableName = tableSchemas[currentTable].tableName;
            modalMessage.textContent = `¿Desea generar el certificado de cierre de día para "${currentTableName}"? Se incluirán todos los registros de la fecha actual.`;
            modal.style.display = 'flex';
        });
    }

    if (btnConfirmModal) {
        btnConfirmModal.addEventListener('click', async () => {
            modal.style.display = 'none'; 
            await exportPDF(true); 
        });
    }

    if (btnCancelModal) {
        btnCancelModal.addEventListener('click', () => {
            modal.style.display = 'none'; 
        });
    }

    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });

    const btnPdf = document.getElementById('btn-pdf');
    const btnPrint = document.getElementById('btn-print');

    if (btnPdf) btnPdf.addEventListener('click', () => exportPDF(false));
    if (btnPrint) btnPrint.addEventListener('click', exportPrint);

    if (tableHeader) {
        tableHeader.addEventListener('change', (e) => {
            if (e.target.id === 'select-all-checkbox') {
                document.querySelectorAll('.row-checkbox').forEach(cb => {
                    cb.checked = e.target.checked;
                });
            }
        });
    }

    if (isAdmin && btnLogout) { 
        btnLogout.addEventListener('click', async () => { await supabase.auth.signOut(); });
    }
    
    if (isAdmin && form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const saveButton = document.getElementById('btn-save');
            if (saveButton) saveButton.disabled = true;
            saveButton.innerHTML = `<svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Guardando...`;
            await saveNewRecord(); 
            if (saveButton) {
                saveButton.disabled = false;
                saveButton.textContent = 'Guardar Registro';
            }
        });
    }
    
    if (btnPrev) btnPrev.addEventListener('click', () => { if (currentPage > 1) { currentPage--; loadData(); } });
    if (btnNext) btnNext.addEventListener('click', () => { currentPage++; loadData(); });

    // --- Autenticación ---
    let initialLoadCalled = false; 
    supabase.auth.onAuthStateChange((event, session) => {
        if (isAdmin) {
            if (event === 'SIGNED_OUT') { window.location.href = 'index.html'; return; }
            if (session) {
                if (!initialLoadCalled) {
                    initialLoadCalled = true;
                    appView.style.display = 'block';
                    updateTableUI(); 
                }
            } else {
                alert("Acceso denegado. Debes iniciar sesión.");
                window.location.href = 'index.html';
            }
        } else {
            if (!initialLoadCalled) {
                initialLoadCalled = true;
                appView.style.display = 'block';
                updateTableUI(); 
            }
        }
    });

    // --- Funciones ---

    function switchTable(tableName) {
        currentTable = tableName;
        currentPage = 1; 

        [btnPropiedad, btnSociedad].forEach(btn => {
            if(btn) {
                btn.classList.remove('border-blue-600', 'text-blue-600', 'bg-blue-50');
                btn.classList.add('border-transparent', 'text-gray-500', 'hover:text-gray-700', 'hover:border-gray-300');
            }
        });
        
        const activeBtn = (tableName === 'repertorio_instrumentos') ? btnPropiedad : btnSociedad;
        if(activeBtn) {
            activeBtn.classList.add('border-blue-600', 'text-blue-600', 'bg-blue-50');
            activeBtn.classList.remove('border-transparent', 'text-gray-500', 'hover:text-gray-700', 'hover:border-gray-300');
        }

        updateTableUI();
    }
    
    async function loadData() {
        showLoading(true);
        showError(null);
        
        const schema = tableSchemas[currentTable];
        const filtro = filtroBusqueda ? filtroBusqueda.value : '';
        const from = (currentPage - 1) * recordsPerPage;
        const to = from + recordsPerPage - 1;
        
        let query = supabase.from(currentTable);
        let countQuery = query.select('*', { count: 'exact', head: true });
        let dataQuery = query.select(schema.dbReadFields.join(','))
            .order('id', { ascending: false })
            .range(from, to);
        
        if (filtro && schema.filterColumns.length > 0) {
            const filtroQuery = schema.filterColumns
                .map(col => `${col}.ilike.%${filtro}%`)
                .join(',');
            countQuery = countQuery.or(filtroQuery);
            dataQuery = dataQuery.or(filtroQuery);
        }
        
        const { data, error } = await dataQuery;
        const { count, error: countError } = await countQuery;
        
        showLoading(false);
        if (error || countError) {
            showError('Error al cargar datos: ' + (error || countError).message);
            return;
        }
        
        renderTable(data);
        updatePagination(count);
    }

    function updateTableUI() {
        const schema = tableSchemas[currentTable];
        
        if (appTitle) {
            appTitle.textContent = isAdmin ? schema.tableName : `${schema.tableName} (Invitado)`;
        }
       
        if (tableHeader) {
            let headerHtml = `<tr class="bg-slate-100 text-slate-600 uppercase text-xs leading-normal">
                <th class="py-3 px-6 text-left w-10"><input type="checkbox" id="select-all-checkbox" class="rounded text-blue-600 focus:ring-blue-500 border-gray-300"></th>`;
            
            schema.columnNames.forEach((name, index) => {
                if (schema.hiddenColumns && schema.hiddenColumns.includes(index)) return;
                headerHtml += `<th class="py-3 px-6 text-left font-bold tracking-wider">${name}</th>`;
            });
            headerHtml += `</tr>`;
            tableHeader.innerHTML = headerHtml;
        }

        if (isAdmin && dynamicFormFields) {
            renderForm(schema);
        }
        loadData();
    }
    
    function renderForm(schema) {
        if (!dynamicFormFields) return;
        
        // CAMBIO: Cambiar la grilla a 4 columnas para permitir 50%/50% exacto
        dynamicFormFields.className = "grid grid-cols-1 md:grid-cols-4 gap-6";
        dynamicFormFields.innerHTML = '';
        
        schema.formFields.forEach(field => {
            let inputHtml = '';
            const requiredAttr = field.required ? 'required' : '';
            // Estilos de Input mejorados
            const baseInputClass = "mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border transition duration-150 ease-in-out";
            
            if (field.type === 'textarea') {
                inputHtml = `<textarea id="form-${field.id}" ${requiredAttr} class="${baseInputClass}" rows="3"></textarea>`;
            } else if (field.type === 'datalist') {
                // CAMBIO: Eliminada la flecha de selectStyle
                inputHtml = `
                    <input list="list-${field.id}" id="form-${field.id}" ${requiredAttr} class="${baseInputClass}" placeholder="Seleccione o escriba...">
                    <datalist id="list-${field.id}">
                        ${field.options.map(opt => `<option value="${opt}">`).join('')}
                    </datalist>
                `;
            } else {
                inputHtml = `<input type="${field.type}" id="form-${field.id}" ${requiredAttr} placeholder="${field.placeholder || ''}" class="${baseInputClass}">`;
            }
            
            // CAMBIO: Adaptar spans a la nueva grilla de 4 columnas
            // Si el span original era 1 (en grilla de 3), ahora es 1 (1/4) aprox o 2 (2/4 = mitad)
            // La lógica de renderizado usa directamente el span definido en el schema.
            dynamicFormFields.innerHTML += `
                <div class="col-span-1 md:col-span-${field.span || 1}">
                    <label for="form-${field.id}" class="block text-sm font-medium text-gray-700 mb-1">
                        ${field.label} ${field.required ? '<span class="text-red-500">*</span>' : ''}
                    </label>
                    ${inputHtml}
                </div>
            `;
        });

        // --- LÓGICA AUTOMÁTICA DE REPERTORIO ---
        if (currentTable === 'repertorio_instrumentos') {
            const dateField = document.getElementById('form-fecha');
            const repField = document.getElementById('form-n_rep');
            
            if (dateField && repField) {
                if (!dateField.value) {
                    dateField.valueAsDate = new Date();
                }
                
                const calcularCorrelativo = async () => {
                    const fecha = dateField.value;
                    if (!fecha) return;
                    
                    const year = fecha.split('-')[0]; 
                    
                    const originalPlaceholder = repField.placeholder;
                    repField.value = `Calculando...`;
                    repField.readOnly = true;

                    try {
                        const { data, error } = await supabase
                            .from('repertorio_instrumentos')
                            .select('n_rep')
                            .ilike('n_rep', `%-${year}`)
                            .order('id', { ascending: false }) 
                            .limit(1);

                        if (error) throw error;

                        let nextNum = 1;
                        if (data && data.length > 0) {
                            const lastRep = data[0].n_rep; 
                            const parts = lastRep.split('-');
                            if (parts.length > 0) {
                                const lastNum = parseInt(parts[0]);
                                if (!isNaN(lastNum)) {
                                    nextNum = lastNum + 1;
                                }
                            }
                        }

                        const nextNumStr = nextNum < 10 ? `0${nextNum}` : `${nextNum}`;
                        repField.value = `${nextNumStr}-${year}`;
                        
                    } catch (err) {
                        console.error("Error calculando correlativo:", err);
                        repField.value = ``; 
                        repField.placeholder = "Ingrese manualmente";
                    } finally {
                        repField.readOnly = false; 
                    }
                };

                calcularCorrelativo();
                dateField.addEventListener('change', calcularCorrelativo);
            }
        }
    }

    function renderTable(data) {
        if (!tableBody) return;
        tableBody.innerHTML = '';
        
        if (!data || data.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="99" class="text-center p-8 text-gray-500 bg-white">${currentPage === 1 ? 'No hay registros encontrados.' : 'No hay más registros.'}</td></tr>`;
            return;
        }

        const schema = tableSchemas[currentTable];
        
        data.forEach(row => {
            const tr = document.createElement('tr');
            tr.className = "border-b border-gray-200 hover:bg-slate-50 transition duration-150 ease-in-out bg-white";
            
            let rowHtml = `<td class="py-3 px-6 text-left whitespace-nowrap"><input type="checkbox" class="row-checkbox rounded text-blue-600 focus:ring-blue-500 border-gray-300"></td>`;
            
            schema.dbReadFields.forEach((field, index) => {
                if (schema.hiddenColumns && schema.hiddenColumns.includes(index)) return;

                let cellData = row[field];
                if (field === 'created_at' || field === 'fecha') {
                    if(cellData) {
                        const dateObj = new Date(cellData);
                        const userTimezoneOffset = dateObj.getTimezoneOffset() * 60000;
                        const correctedDate = new Date(dateObj.getTime() + userTimezoneOffset); 
                        cellData = correctedDate.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
                    }
                }
                rowHtml += `<td class="py-3 px-6 text-left whitespace-nowrap text-sm text-gray-700">${cellData || '<span class="text-gray-300">-</span>'}</td>`;
            });
            
            tr.innerHTML = rowHtml;
            const checkbox = tr.querySelector('.row-checkbox');
            if(checkbox) checkbox.dataset.registro = JSON.stringify(row);
            tableBody.appendChild(tr);
        });
    }
    
    async function saveNewRecord() {
        const schema = tableSchemas[currentTable];
        const newRow = {};
        let isValid = true;
        
        schema.formFields.forEach(field => {
            const input = document.getElementById(`form-${field.id}`);
            if (input) {
                if (input.value) {
                    newRow[field.id] = input.value;
                } else if (field.required) {
                    isValid = false;
                    input.classList.add('border-red-500');
                    input.addEventListener('input', () => input.classList.remove('border-red-500'), {once: true});
                }
            }
        });

        if (!isValid) { showError('Por favor, complete todos los campos requeridos (*).'); return; }
        
        const { data, error } = await supabase.from(currentTable).insert([newRow]).select('id');
        
        if (error) {
            showError('Error al guardar: ' + error.message);
        } else {
            showError(null); 
            if(form) form.reset();
            if (data && data[0]) showToast(`Registro guardado (ID Interno: ${data[0].id}).`);
            currentPage = 1;
            updateTableUI(); 
        }
    }

    async function exportPDF(isCierreDia) {
        if (typeof window.jspdf === 'undefined') { showError("Librerías PDF cargando..."); return; }

        let registros = [];
        const schema = tableSchemas[currentTable];

        if (isCierreDia) {
            const today = new Date().toISOString().split('T')[0];
            let query = supabase.from(currentTable).select(schema.dbReadFields.join(','));
            
            if (currentTable === 'repertorio_instrumentos') {
                query = query.eq('fecha', today);
            } else {
                query = query.gte('created_at', `${today}T00:00:00`).lte('created_at', `${today}T23:59:59`);
            }
            
            showLoading(true);
            const { data, error } = await query;
            showLoading(false);
            
            if (error) { showError("Error al generar cierre: " + error.message); return; }
            if (!data || data.length === 0) { showError("No hay registros hoy para cerrar el día."); return; }
            registros = data;
        } else {
            registros = getSelectedData();
        }

        if (!registros || registros.length === 0) return;
        
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

        const title = isCierreDia ? `CIERRE DE DÍA - ${schema.tableName}` : schema.tableName;
        const todayStr = new Date().toLocaleDateString('es-CL');

        const body = registros.map(row => {
            return schema.dbReadFields
                .filter((_, i) => !schema.hiddenColumns || !schema.hiddenColumns.includes(i)) 
                .map(field => {
                    let cellData = row[field] || '';
                    if (field === 'created_at' || field === 'fecha') {
                        if(cellData) {
                            const d = new Date(cellData);
                            const offset = d.getTimezoneOffset() * 60000;
                            cellData = new Date(d.getTime() + offset).toLocaleDateString('es-CL');
                        }
                    }
                    return cellData;
            });
        });

        const visibleColumns = schema.columnNames.filter((_, i) => !schema.hiddenColumns || !schema.hiddenColumns.includes(i));

        doc.autoTable({
            head: [visibleColumns],
            body: body,
            theme: 'grid',
            styles: { fontSize: 9, cellPadding: 3, valign: 'middle' },
            headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' },
            startY: 25,
            didDrawPage: (data) => {
                doc.setFontSize(16);
                doc.text(title, data.settings.margin.left, 15);
                doc.setFontSize(10);
                doc.text(`Fecha: ${todayStr}`, doc.internal.pageSize.width - 20, 15, { align: 'right' });
            }
        });

        let minRep = null;
        let maxRep = null;
        const totalDocs = registros.length;

        if (currentTable === 'repertorio_instrumentos') {
            const reps = registros.map(r => r.n_rep).sort((a, b) => {
                const numA = parseInt(a.split('-')[0]) || 0;
                const numB = parseInt(b.split('-')[0]) || 0;
                return numA - numB;
            });
            if (reps.length > 0) {
                minRep = reps[0];
                maxRep = reps[reps.length - 1];
            }
        } else {
            minRep = registros[registros.length - 1].id; 
            maxRep = registros[0].id;
        }

        const finalY = doc.lastAutoTable.finalY + 15;
        
        if (finalY > 180) doc.addPage();

        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");
        
        const certText = `Certifico que con la fecha de hoy ${todayStr} se hicieron ${totalDocs} anotaciones desde el nro correlativo ${minRep || '?'} al nro ${maxRep || '?'}.`;
        
        doc.text(certText, 15, doc.lastAutoTable.finalY + 15);

        doc.text("_____________________________", 150, doc.lastAutoTable.finalY + 35);
        doc.text("Firma Responsable", 165, doc.lastAutoTable.finalY + 42, { align: 'center' });

        doc.save(`${title.replace(/ /g, '_')}_${todayStr}.pdf`);
    }

    function getSelectedData() {
        const registros = [];
        document.querySelectorAll('.row-checkbox:checked').forEach(cb => registros.push(JSON.parse(cb.dataset.registro)));
        if (registros.length === 0) showError('Seleccione al menos un registro.');
        return registros;
    }
    
    function exportPrint() { window.print(); } 
    function showLoading(isLoading) { if(loadingSpinner) loadingSpinner.style.display = isLoading ? 'block' : 'none'; }
    function showError(message) { if(errorMessage) { errorMessage.textContent = message || ''; errorMessage.style.display = message ? 'block' : 'none'; } }
    function showToast(message) { 
        const toast = document.getElementById('toast-success');
        if(toast) { 
            document.getElementById('toast-message').textContent = message; 
            toast.style.display = 'flex'; 
            setTimeout(() => { toast.classList.remove('opacity-0'); }, 10);
            setTimeout(() => { toast.style.display = 'none'; }, 3000); 
        } 
    }
    function updatePagination(count) { if(!paginationControls) return; paginationControls.style.display = count > 0 ? 'flex' : 'none'; if(count>0) paginationStatus.textContent = `Total: ${count}`; }

});