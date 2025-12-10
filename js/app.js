// actualizado
// --- PASO 1: Configuración de Supabase ---
const SUPABASE_URL = 'https://itnjnoqcppkvzqlbmyrq.supabase.co'; // TODO: Reemplaza si es necesario
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0bmpub3FjcHBrdnpxbGJteXJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1ODczODEsImV4cCI6MjA3NzE2MzM4MX0.HP2ChKbP4O5YWu73I6UYgLoH2O80rMcJiWdZRSTYrV8'; // TODO: Reemplaza si es necesario

if (SUPABASE_URL === 'TU_SUPABASE_URL' || !SUPABASE_URL) {
    console.warn('¡Atención! Debes configurar tus claves de Supabase en login.js y app.js');
    alert('Error: Claves de Supabase no configuradas en app.js');
}

// --- Definición de la Estructura de Datos (SCHEMA) ---
const tableSchemas = {
    'registros_propiedad': {
        tableName: 'Libro de Propiedad',
        dbReadFields: ['id', 'fecha', 'n_rep', 'nombre_contratantes', 'acto_o_contrato', 'abogado_redactor', 'n_agregado', 'created_at'],
        columnNames: ['Número', 'Fecha', 'N° Rep (mm-yyyy)', 'Nombre de los contratantes', 'Acto o Contrato', 'Abogado Redactor', 'N° Agregado', 'Ingresado'],
        formFields: [
            { id: 'fecha', label: 'Fecha', type: 'date', span: 1, required: true },
            { id: 'n_rep', label: 'N° Rep (mm-yyyy)', type: 'text', span: 1, required: false, placeholder: 'Ej: 05-2025' },
            { id: 'nombre_contratantes', label: 'Nombre de los contratantes', type: 'text', span: 2, required: true },
            { id: 'acto_o_contrato', label: 'Acto o Contrato', type: 'text', span: 1, required: false },
            { id: 'abogado_redactor', label: 'Abogado Redactor', type: 'text', span: 1, required: true },
            { id: 'n_agregado', label: 'N° Agregado', type: 'text', span: 1, required: false }
        ],
        filterColumns: ['nombre_contratantes', 'acto_o_contrato', 'abogado_redactor', 'n_agregado', 'n_rep']
    },
    'movimientos_sociedad': {
        tableName: 'Libro de Sociedad',
        dbReadFields: ['id', 'interesado', 'acto_o_contrato', 'clase_inscripcion', 'hora', 'dia', 'mes', 'registro_parcial', 'observaciones', 'created_at'],
        columnNames: ['Número', 'Interesado', 'Acto o Contrato', 'Clase Inscripción', 'Hora', 'Día', 'Mes', 'Registro Parcial', 'Observaciones', 'Ingresado'],
        formFields: [
            { id: 'interesado', label: 'Interesado', type: 'text', span: 2, required: true },
            { id: 'acto_o_contrato', label: 'Acto o Contrato', type: 'text', span: 2, required: false },
            { id: 'clase_inscripcion', label: 'Clase Inscripción', type: 'text', span: 1, required: false },
            { id: 'hora', label: 'Hora', type: 'time', span: 1, required: false },
            { id: 'dia', label: 'Día', type: 'text', span: 1, required: false, placeholder: 'Ej: 01, 23...' },
            { id: 'mes', label: 'Mes', type: 'text', span: 1, required: false, placeholder: 'Ej: Enero, 05...' },
            { id: 'registro_parcial', label: 'Registro Parcial', type: 'text', span: 1, required: false },
            { id: 'observaciones', label: 'Observaciones', type: 'textarea', span: 2, required: false }
        ],
        filterColumns: ['interesado', 'acto_o_contrato', 'clase_inscripcion', 'observaciones']
    }
};

// --- Variables Globales ---
let currentTable = 'registros_propiedad'; // Tabla por defecto
let currentPage = 1;
const recordsPerPage = 20;

// --- Lógica Principal ---
document.addEventListener('DOMContentLoaded', () => {

    if (!window.supabase) {
        showError("Error crítico: La librería de Supabase no se cargó correctamente.");
        console.error("Error: window.supabase no está definido.");
        return;
    }
    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // --- Referencias a Elementos del DOM ---
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
    const loadingSpinner = document.getElementById('loading-spinner');
    const errorMessage = document.getElementById('error-message');
    const paginationControls = document.getElementById('pagination-controls');
    const paginationStatus = document.getElementById('pagination-status');
    const btnPrev = document.getElementById('btn-prev');
    const btnNext = document.getElementById('btn-next');

    // --- 1. CONFIGURACIÓN DE EVENT LISTENERS (UNA SOLA VEZ) ---

    if (btnPropiedad) {
        btnPropiedad.addEventListener('click', () => switchTable('registros_propiedad'));
    }
    if (btnSociedad) {
        btnSociedad.addEventListener('click', () => switchTable('movimientos_sociedad'));
    }

    if (btnBuscar) {
        btnBuscar.addEventListener('click', () => {
            currentPage = 1; 
            loadData();
        });
    }
    if (filtroBusqueda) {
        filtroBusqueda.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') {
                currentPage = 1; 
                loadData();
            }
        });
    }

    const btnPdf = document.getElementById('btn-pdf');
    const btnPrint = document.getElementById('btn-print');

    if (btnPdf) {
        btnPdf.addEventListener('click', exportPDF);
    }
    if (btnPrint) {
        btnPrint.addEventListener('click', exportPrint);
    }

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
        btnLogout.addEventListener('click', async () => {
            await supabase.auth.signOut();
        });
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
    
    if (btnPrev) {
        btnPrev.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                loadData();
            }
        });
    }
    if (btnNext) {
        btnNext.addEventListener('click', () => {
            currentPage++;
            loadData();
        });
    }

    // --- 2. MANEJO DE AUTENTICACIÓN Y CARGA INICIAL ---
    let initialLoadCalled = false; 
    
    supabase.auth.onAuthStateChange((event, session) => {
        if (isAdmin) {
            if (event === 'SIGNED_OUT') {
                window.location.href = 'index.html';
                return;
            }
            if (session) {
                if (!initialLoadCalled) {
                    initialLoadCalled = true;
                    appView.style.display = 'block';
                    updateTableUI(); 
                }
            } else {
                alert("Acceso denegado. Debes iniciar sesión.");
                window.location.href = 'index.html';
                return;
            }
        } else {
            if (!initialLoadCalled) {
                initialLoadCalled = true;
                appView.style.display = 'block';
                updateTableUI(); 
            }
        }
    });

    // --- 3. FUNCIONES DE LA APLICACIÓN ---

    function switchTable(tableName) {
        currentTable = tableName;
        currentPage = 1; 

        // Estilos para pestañas activas/inactivas
        [btnPropiedad, btnSociedad].forEach(btn => {
            if(btn) {
                btn.classList.remove('border-blue-600', 'text-blue-600', 'bg-blue-50');
                btn.classList.add('border-transparent', 'text-gray-500', 'hover:text-gray-700', 'hover:border-gray-300');
            }
        });
        
        const activeBtn = (tableName === 'registros_propiedad') ? btnPropiedad : btnSociedad;
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
            const e = error || countError;
            showError('Error al cargar datos: ' + e.message);
            console.error(e);
            return;
        }
        
        renderTable(data);
        updatePagination(count);
    }

    function updateTableUI() {
        const schema = tableSchemas[currentTable];
        
        if (appTitle) {
            if (isAdmin) {
                appTitle.textContent = schema.tableName;
            } else {
                appTitle.textContent = `${schema.tableName} (Invitado)`;
            }
        }
       
        if (tableHeader) {
            // Estilos de Cabecera mejorados
            tableHeader.innerHTML = `<tr class="bg-slate-100 text-slate-600 uppercase text-xs leading-normal">
                <th class="py-3 px-6 text-left w-10"><input type="checkbox" id="select-all-checkbox" class="rounded text-blue-600 focus:ring-blue-500 border-gray-300"></th>
            </tr>`;
            const headerRow = tableHeader.querySelector('tr');
            if (headerRow) {
                schema.columnNames.forEach(name => {
                    headerRow.innerHTML += `<th class="py-3 px-6 text-left font-bold tracking-wider">${name}</th>`;
                });
            }
        }

        if (isAdmin && dynamicFormFields) {
            renderForm(schema);
        }
        
        loadData();
    }
    
    function renderForm(schema) {
        if (!dynamicFormFields) return;
        
        dynamicFormFields.innerHTML = '';
        schema.formFields.forEach(field => {
            let inputHtml = '';
            const requiredAttr = field.required ? 'required' : '';
            
            // Estilos de Input mejorados
            const baseInputClass = "mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border transition duration-150 ease-in-out";
            
            if (field.type === 'textarea') {
                inputHtml = `<textarea id="form-${field.id}" ${requiredAttr} class="${baseInputClass}" rows="3"></textarea>`;
            } else {
                inputHtml = `<input type="${field.type}" id="form-${field.id}" ${requiredAttr} 
                                placeholder="${field.placeholder || ''}" 
                                class="${baseInputClass}">`;
            }
            
            dynamicFormFields.innerHTML += `
                <div class="col-span-1 md:col-span-${field.span || 1}">
                    <label for="form-${field.id}" class="block text-sm font-medium text-gray-700 mb-1">
                        ${field.label} ${field.required ? '<span class="text-red-500">*</span>' : ''}
                    </label>
                    ${inputHtml}
                </div>
            `;
        });
    }

    function renderTable(data) {
        if (!tableBody) return;
        
        tableBody.innerHTML = '';
        if (!data || data.length === 0) {
            if (currentPage === 1) {
                 tableBody.innerHTML = '<tr><td colspan="99" class="text-center p-8 text-gray-500 bg-white">No hay registros encontrados.</td></tr>';
            } else {
                 tableBody.innerHTML = '<tr><td colspan="99" class="text-center p-8 text-gray-500 bg-white">No hay más registros en esta página.</td></tr>';
            }
            return;
        }

        const schema = tableSchemas[currentTable];
        
        data.forEach(row => {
            // Estilos de Fila y Celda mejorados
            const tr = document.createElement('tr');
            tr.className = "border-b border-gray-200 hover:bg-slate-50 transition duration-150 ease-in-out bg-white";
            
            tr.innerHTML = `<td class="py-3 px-6 text-left whitespace-nowrap">
                <input type="checkbox" class="row-checkbox rounded text-blue-600 focus:ring-blue-500 border-gray-300">
            </td>`;
            
            schema.dbReadFields.forEach(field => {
                let cellData = row[field];
                if (field === 'created_at' || field === 'fecha') {
                    if(cellData) {
                        // Intentar corregir zona horaria o fecha simple
                        const dateObj = new Date(cellData);
                        // Asegurar que se muestre bien (evitar desfase de zona horaria básico)
                        const userTimezoneOffset = dateObj.getTimezoneOffset() * 60000;
                        const correctedDate = new Date(dateObj.getTime() + userTimezoneOffset); 
                        cellData = correctedDate.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
                    }
                }
                tr.innerHTML += `<td class="py-3 px-6 text-left whitespace-nowrap text-sm text-gray-700">${cellData || '<span class="text-gray-300">-</span>'}</td>`;
            });
            
            const checkbox = tr.querySelector('.row-checkbox');
            if(checkbox) {
                checkbox.dataset.registro = JSON.stringify(row);
            }
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
                    // Resaltar error visualmente
                    input.classList.add('border-red-500', 'focus:border-red-500', 'focus:ring-red-500');
                    // Remover clase de error al escribir
                    input.addEventListener('input', () => {
                        input.classList.remove('border-red-500', 'focus:border-red-500', 'focus:ring-red-500');
                    }, {once: true});
                }
            }
        });

        if (!isValid) {
            showError('Por favor, complete todos los campos requeridos (*).');
            return; 
        }
        
        const { data, error } = await supabase.from(currentTable).insert([newRow]).select('id');
        
        if (error) {
            showError('Error al guardar: ' + error.message);
        } else {
            showError(null); 
            if(form) form.reset();
            
            if (data && data[0]) {
                showToast(`Registro N° ${data[0].id} guardado con éxito.`);
            } else {
                showToast(`Registro guardado con éxito.`);
            }
            currentPage = 1;
            loadData();
        }
    }

    // --- Funciones de Exportación (comunes) ---
    function getSelectedData() {
        const registros = [];
        document.querySelectorAll('.row-checkbox:checked').forEach(cb => {
            registros.push(JSON.parse(cb.dataset.registro));
        });
        
        if (registros.length === 0) {
            showError('Por favor, seleccione al menos un registro.');
            setTimeout(() => showError(null), 3000);
        }
        return registros;
    }

    function exportPDF() {
        if (typeof window.jspdf === 'undefined' || typeof window.jspdf.jsPDF === 'undefined') {
            showError("La librería PDF principal (jspdf) no está cargada. Intente de nuevo.");
            return;
        }

        const registros = getSelectedData();
        if (registros.length === 0) return;
        
        const { jsPDF } = window.jspdf;
        // CAMBIO: Configuración explícita A4 Landscape y unidad en mm para precisión
        const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

        if (typeof doc.autoTable !== 'function') {
            showError("La librería PDF (autoTable) aún no está lista. Intente de nuevo en unos segundos.");
            return;
        }

        const schema = tableSchemas[currentTable];
        const title = schema.tableName;
        const generationDate = new Date().toLocaleDateString('es-CL');

        const body = registros.map(row => {
            return schema.dbReadFields.map(field => {
                let cellData = row[field] || '';
                if (field === 'created_at' || field === 'fecha') {
                    if(cellData) {
                        const dateObj = new Date(cellData);
                        const userTimezoneOffset = dateObj.getTimezoneOffset() * 60000;
                        const correctedDate = new Date(dateObj.getTime() + userTimezoneOffset);
                        cellData = correctedDate.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
                    }
                }
                return cellData;
            });
        });

        doc.autoTable({
            head: [schema.columnNames],
            body: body,
            // CAMBIO: Tema 'grid' para apariencia de reporte formal
            theme: 'grid',
            styles: { 
                fontSize: 9, 
                cellPadding: 3,
                valign: 'middle',
                font: 'helvetica',
                lineWidth: 0.1,
                lineColor: [203, 213, 225] // Slate-300
            },
            headStyles: { 
                fillColor: [15, 23, 42], // Slate-900 (Azul oscuro/Negro)
                textColor: [255, 255, 255], // Blanco
                fontStyle: 'bold',
                halign: 'center'
            },
            alternateRowStyles: {
                fillColor: [248, 250, 252] // Slate-50 (Gris muy claro)
            },
            margin: { top: 30 },
            didDrawPage: (data) => {
                // Título
                doc.setFontSize(18);
                doc.setTextColor(15, 23, 42);
                doc.setFont("helvetica", "bold");
                doc.text(title, data.settings.margin.left, 20);
                
                // Fecha
                doc.setFontSize(10);
                doc.setFont("helvetica", "normal");
                doc.setTextColor(100, 116, 139); // Slate-500
                doc.text(`Generado: ${generationDate}`, doc.internal.pageSize.width - data.settings.margin.right, 20, { align: 'right' });
                
                // Paginación (Pie de página)
                const str = 'Página ' + doc.internal.getNumberOfPages();
                doc.setFontSize(8);
                doc.text(str, data.settings.margin.left, doc.internal.pageSize.height - 10);
            }
        });
        doc.save(`registros_${currentTable}.pdf`);
    }
    
    function exportPrint() {
        const registros = getSelectedData();
        if (registros.length === 0) return;

        const schema = tableSchemas[currentTable];
        let html = `
            <style>
                body { font-family: 'Inter', sans-serif; font-size: 10px; }
                h2 { font-family: 'Merriweather', serif; font-size: 16px; margin-bottom: 10px; }
                table { width: 100%; border-collapse: collapse; }
                th, td { border: 1px solid #000; padding: 5px; text-align: left; }
                th { font-weight: bold; background-color: #fff !important; }
                @media print { 
                    body { -webkit-print-color-adjust: exact; }
                }
            </style>
            <h2>${schema.tableName}</h2>
            <table>
                <thead>
                    <tr>${schema.columnNames.map(name => `<th>${name}</th>`).join('')}</tr>
                </thead>
                <tbody>
                    ${registros.map(row => `
                        <tr>
                            ${schema.dbReadFields.map(field => {
                                let cellData = row[field] || '';
                                if (field === 'created_at' || field === 'fecha') {
                                    if(cellData) {
                                        const dateObj = new Date(cellData);
                                        const userTimezoneOffset = dateObj.getTimezoneOffset() * 60000;
                                        const correctedDate = new Date(dateObj.getTime() + userTimezoneOffset);
                                        cellData = correctedDate.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
                                    }
                                }
                                return `<td>${cellData}</td>`;
                            }).join('')}
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(html);
            printWindow.document.title = schema.tableName;
            printWindow.document.close();
            printWindow.focus();
            printWindow.print();
        } else {
            showError("No se pudo abrir la ventana de impresión. Revise los permisos de pop-ups.");
        }
    }

    // --- Funciones de Utilidad (comunes) ---
    function showLoading(isLoading) {
        if(loadingSpinner) loadingSpinner.style.display = isLoading ? 'block' : 'none';
    }

    function showError(message) {
        if(errorMessage) {
            if (message) {
                errorMessage.style.display = 'block';
                errorMessage.textContent = message;
            } else {
                errorMessage.style.display = 'none';
                errorMessage.textContent = '';
            }
        }
    }

    // CAMBIO: Actualizamos la función para que sepa mostrar el toast oculto por inline style
    function showToast(message) {
        const toast = document.getElementById('toast-success');
        const toastMessage = document.getElementById('toast-message');
        
        if (toast && toastMessage) {
            toastMessage.textContent = message;
            
            // 1. Mostrarlo anulando el display: none
            toast.style.display = 'flex'; 
            
            // 2. Permitir un pequeño reflow para que la transición de opacidad funcione
            setTimeout(() => {
                toast.classList.remove('opacity-0', 'translate-y-2');
                toast.classList.add('opacity-100', 'translate-y-0');
            }, 10);

            // 3. Ocultarlo después de 3 segundos
            setTimeout(() => {
                // Iniciar transición de salida
                toast.classList.remove('opacity-100', 'translate-y-0');
                toast.classList.add('opacity-0', 'translate-y-2');
                
                // Esperar a que termine la transición para volver a poner display: none
                setTimeout(() => {
                    toast.style.display = 'none';
                }, 300); 
            }, 3000);
        }
    }

    function updatePagination(totalCount) {
        if (!paginationControls || !paginationStatus || !btnPrev || !btnNext || totalCount === null) {
            if (paginationControls) paginationControls.style.display = 'none';
            return;
        }

        if (totalCount === 0) {
            paginationControls.style.display = 'none';
            return;
        }

        paginationControls.style.display = 'flex'; 
        
        const totalPages = Math.ceil(totalCount / recordsPerPage);

        if (totalPages <= 1) {
             paginationControls.style.display = 'none';
             return;
        }

        const fromRecord = (currentPage - 1) * recordsPerPage + 1;
        const toRecord = Math.min(currentPage * recordsPerPage, totalCount);

        paginationStatus.textContent = `Mostrando ${fromRecord}-${toRecord} de ${totalCount} registros`;

        btnPrev.disabled = (currentPage === 1);
        btnNext.disabled = (currentPage === totalPages);
        
        // Estilos visuales para botones deshabilitados
        if(btnPrev.disabled) {
            btnPrev.classList.add('opacity-50', 'cursor-not-allowed');
        } else {
            btnPrev.classList.remove('opacity-50', 'cursor-not-allowed');
        }
        if(btnNext.disabled) {
            btnNext.classList.add('opacity-50', 'cursor-not-allowed');
        } else {
            btnNext.classList.remove('opacity-50', 'cursor-not-allowed');
        }
    }

}); // Fin de DOMContentLoaded