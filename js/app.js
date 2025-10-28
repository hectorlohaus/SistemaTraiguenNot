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
        dbReadFields: ['id', 'fecha', 'partes_involucradas', 'tipo_documento', 'solicitante', 'registro_manual_num', 'created_at'],
        columnNames: ['Número', 'Fecha', 'Partes Involucradas', 'Tipo Documento', 'Solicitante', 'N° Reg. Manual', 'Ingresado'],
        formFields: [
            { id: 'fecha', label: 'Fecha', type: 'date', span: 1, required: true },
            { id: 'partes_involucradas', label: 'Partes Involucradas', type: 'text', span: 2, required: true },
            { id: 'tipo_documento', label: 'Tipo Documento', type: 'text', span: 1, required: false, placeholder: 'Ej: Mandato' },
            { id: 'solicitante', label: 'Nombre Solicitante', type: 'text', span: 1, required: true },
            { id: 'registro_manual_num', label: 'N° Registro Manual', type: 'text', span: 1, required: false }
        ],
        filterColumns: ['partes_involucradas', 'tipo_documento', 'solicitante', 'registro_manual_num']
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
// 'isAdmin' se define en el HTML (app.html o invitado.html)

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
    const loadingSpinner = document.getElementById('loading-spinner');
    const errorMessage = document.getElementById('error-message');

    // --- 1. CONFIGURACIÓN DE EVENT LISTENERS (UNA SOLA VEZ) ---

    // 1.1. Manejo de Pestañas (Libros)
    if (btnPropiedad) {
        btnPropiedad.addEventListener('click', () => switchTable('registros_propiedad'));
    }
    if (btnSociedad) {
        btnSociedad.addEventListener('click', () => switchTable('movimientos_sociedad'));
    }

    // 1.2. Filtro de Búsqueda
    if (filtroBusqueda) {
        let searchTimeout;
        filtroBusqueda.addEventListener('keyup', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(loadData, 300);
        });
    }

    // 1.3. Funciones de Exportación (PDF e Imprimir)
    const btnPdf = document.getElementById('btn-pdf');
    const btnPrint = document.getElementById('btn-print');
    
    if (btnPdf) {
        btnPdf.addEventListener('click', exportPDF);
    }
    if (btnPrint) {
        btnPrint.addEventListener('click', exportPrint);
    }
    
    // 1.4. Listener de "seleccionar todo"
    if (tableHeader) {
        tableHeader.addEventListener('change', (e) => {
            if (e.target.id === 'select-all-checkbox') {
                document.querySelectorAll('.row-checkbox').forEach(cb => {
                    cb.checked = e.target.checked;
                });
            }
        });
    }
    
    // 1.5. Lógica Específica de ADMIN (Logout y Guardar)
    if (isAdmin && btnLogout && form) {
        
        btnLogout.addEventListener('click', async () => {
            await supabase.auth.signOut();
            window.location.href = 'index.html';
        });

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Deshabilitar botón para prevenir doble clic
            const saveButton = document.getElementById('btn-save');
            if (saveButton) saveButton.disabled = true;

            await saveNewRecord(); // Espera a que termine de guardar
            
            // Vuelve a habilitar el botón
            if (saveButton) saveButton.disabled = false;
        });
    }
    
    // --- 2. MANEJO DE AUTENTICACIÓN Y CARGA INICIAL ---
    
    let initialLoadCalled = false; // Flag para evitar recargas por refresh de token
    
    supabase.auth.onAuthStateChange((event, session) => {
        
        if (isAdmin) {
            // --- MODO ADMIN (app.html) ---
            if (!session) {
                // No hay sesión, ¡expulsar al login!
                alert("Acceso denegado. Debes iniciar sesión.");
                window.location.href = 'index.html';
                return;
            }
            
            // Si hay sesión y es la primera vez que cargamos
            if (session && !initialLoadCalled) {
                initialLoadCalled = true;
                appView.style.display = 'block';
                updateTableUI(); // Carga inicial de datos
            }

        } else {
            // --- MODO INVITADO (invitado.html) ---
            if (!initialLoadCalled) {
                initialLoadCalled = true;
                appView.style.display = 'block';
                updateTableUI(); // Carga inicial de datos
            }
        }
    });


    // --- 3. FUNCIONES DE LA APLICACIÓN ---

    function switchTable(tableName) {
        currentTable = tableName;
        
        [btnPropiedad, btnSociedad].forEach(btn => {
            if(btn) {
                btn.classList.remove('border-gray-800', 'text-gray-800');
                btn.classList.add('border-transparent', 'text-gray-500', 'hover:text-gray-700', 'hover:border-gray-300');
            }
        });
        
        const activeBtn = (tableName === 'registros_propiedad') ? btnPropiedad : btnSociedad;
        if(activeBtn) {
            activeBtn.classList.add('border-gray-800', 'text-gray-800');
            activeBtn.classList.remove('border-transparent', 'text-gray-500');
        }

        updateTableUI();
    }
    
    async function loadData() {
        showLoading(true);
        showError(null);
        
        const schema = tableSchemas[currentTable];
        const filtro = filtroBusqueda ? filtroBusqueda.value : '';
        
        let query = supabase.from(currentTable).select(schema.dbReadFields.join(',')).order('id', { ascending: false });
        
        if (filtro && schema.filterColumns.length > 0) {
            const filtroQuery = schema.filterColumns
                .map(col => `${col}.ilike.%${filtro}%`)
                .join(',');
            query = query.or(filtroQuery);
        }
        
        const { data, error } = await query;
        showLoading(false);
        
        if (error) {
            showError('Error al cargar datos: ' + error.message);
            console.error(error);
            return;
        }
        
        renderTable(data);
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
            tableHeader.innerHTML = `<tr><th class="p-3 w-12"><input type="checkbox" id="select-all-checkbox" class="rounded border-gray-300"></th></tr>`;
            const headerRow = tableHeader.querySelector('tr');
            if (headerRow) {
                schema.columnNames.forEach(name => {
                    headerRow.innerHTML += `<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">${name}</th>`;
                });
            }
        }

        // Renderizar formulario (solo si estamos en modo admin)
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
            
            if (field.type === 'textarea') {
                inputHtml = `<textarea id="form-${field.id}" ${requiredAttr} class="mt-1 block w-full border border-gray-300 rounded-md p-2" rows="2"></textarea>`;
            } else {
                inputHtml = `<input type="${field.type}" id="form-${field.id}" ${requiredAttr} 
                                placeholder="${field.placeholder || ''}" 
                                class="mt-1 block w-full border border-gray-300 rounded-md p-2">`;
            }
            
            dynamicFormFields.innerHTML += `
                <div class="col-span-1 md:col-span-${field.span || 1}">
                    <label for="form-${field.id}" class="block text-sm font-medium text-gray-700">
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
            tableBody.innerHTML = '<tr><td colspan="99" class="text-center p-4 text-gray-500">No hay registros.</td></tr>';
            return;
        }

        const schema = tableSchemas[currentTable];
        
        data.forEach(row => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td class="p-3"><input type="checkbox" class="row-checkbox rounded border-gray-300"></td>`;
            
            schema.dbReadFields.forEach(field => {
                let cellData = row[field];
                // Formateo de fechas y horas
                if (field === 'created_at' || field === 'fecha') {
                    if(cellData) {
                        cellData = new Date(cellData).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
                    }
                }
                tr.innerHTML += `<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">${cellData || ''}</td>`;
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
                }
            }
        });

        if (!isValid) {
            showError('Por favor, complete todos los campos requeridos (*).');
            // Habilita el botón de nuevo si falló la validación
            const saveButton = document.getElementById('btn-save');
            if (saveButton) saveButton.disabled = false;
            return; 
        }
        
        const { error } = await supabase.from(currentTable).insert([newRow]);
        
        if (error) {
            showError('Error al guardar: ' + error.message);
        } else {
            showError(null); // Limpia errores
            if(form) form.reset();
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
        // CAMBIO: Verificación de PDF más robusta y directa
        if (typeof window.jspdf === 'undefined' || typeof window.jspdf.jsPDF === 'undefined' || typeof window.jspdf.jsPDF.prototype.autoTable === 'undefined') {
            showError("Las librerías PDF aún no están cargadas. Intente de nuevo en unos segundos.");
            return;
        }

        const registros = getSelectedData();
        if (registros.length === 0) return;
        
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'landscape' });
        const schema = tableSchemas[currentTable];

        const body = registros.map(row => 
            schema.dbReadFields.map(field => row[field] || '')
        );

        doc.autoTable({
            head: [schema.columnNames],
            body: body,
            styles: { fontSize: 8 },
            headStyles: { fillColor: [41, 41, 41] }, // Color de cabecera (oscuro)
            didDrawPage: (data) => {
                // Título
                doc.setFontSize(16);
                doc.text(schema.tableName, data.settings.margin.left, 15);
            }
        });
        doc.save(`registros_${currentTable}.pdf`);
    }
    
    function exportPrint() {
        const registros = getSelectedData();
        if (registros.length === 0) return;

        const schema = tableSchemas[currentTable];
        // CAMBIO: Estilos de impresión mejorados
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
                                        cellData = new Date(cellData).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
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
            // CAMBIO: Añadir título a la ventana de impresión
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

}); // Fin de DOMContentLoaded

