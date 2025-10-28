// actualizado
// --- PASO 1: Configuración de Supabase ---
const SUPABASE_URL = 'https://itnjnoqcppkvzqlbmyrq.supabase.co'; // TODO: Reemplaza si es necesario
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0bmpub3FjcHBrdnpxbGJteXJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1ODczODEsImV4cCI6MjA3NzE2MzM4MX0.HP2ChKbP4O5YWu73I6UYgLoH2O80rMcJiWdZRSTYrV8'; // TODO: Reemplaza si es necesario

if (SUPABASE_URL === 'TU_SUPABASE_URL' || !SUPABASE_URL) {
    console.warn('¡Atención! Debes configurar tus claves de Supabase en login.js y app.js');
    alert('Error: Claves de Supabase no configuradas en app.js');
}

// CAMBIO: Se elimina la inicialización de Supabase de aquí.

// --- Definición de la Estructura de Datos (SCHEMA) ---
const tableSchemas = {
    'registros_propiedad': {
        tableName: 'Libro de Propiedad',
        dbReadFields: ['id', 'fecha', 'partes_involucradas', 'tipo_documento', 'solicitante', 'registro_manual_num', 'created_at'],
        // CAMBIO: 'ID' ahora es 'Número'
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
        // CAMPO 'numero' ELIMINADO (revertido a la estructura original)
        dbReadFields: ['id', 'nombre_completo', 'tipo_movimiento', 'hora', 'numero_escrito', 'mes_escrito', 'tipo_registro', 'observaciones', 'created_at'],
        // CAMBIO: 'ID' ahora es 'Número'
        columnNames: ['Número', 'Nombre Completo', 'Tipo Movimiento', 'Hora', 'N° Escrito', 'Mes Escrito', 'Tipo Registro', 'Observaciones', 'Ingresado'],
        // FORMULARIO REVERTIDO (sin 'numero')
        formFields: [
            { id: 'nombre_completo', label: 'Nombre Completo', type: 'text', span: 2, required: true },
            { id: 'tipo_movimiento', label: 'Tipo Movimiento', type: 'text', span: 1, required: false, placeholder: 'Ej: Constitución...' },
            { id: 'hora', label: 'Hora', type: 'time', span: 1, required: false },
            { id: 'numero_escrito', label: 'N° Escrito', type: 'text', span: 1, required: false },
            { id: 'mes_escrito', label: 'Mes Escrito', type: 'text', span: 1, required: false },
            { id: 'tipo_registro', label: 'Tipo de Registro', type: 'text', span: 1, required: false },
            { id: 'observaciones', label: 'Observaciones', type: 'textarea', span: 2, required: false }
        ],
        // FILTROS REVERTIDOS
        filterColumns: ['nombre_completo', 'tipo_movimiento', 'tipo_registro', 'observaciones']
    }
};

// --- Variables Globales ---
let currentTable = 'registros_propiedad'; // Tabla por defecto
// 'isAdmin' se define en el HTML (app.html o invitado.html)

// --- Lógica Principal ---
document.addEventListener('DOMContentLoaded', () => {

    // CAMBIO: Inicializa Supabase AQUÍ, dentro de DOMContentLoaded
    if (!window.supabase) {
        showError("Error crítico: La librería de Supabase no se cargó correctamente.");
        console.error("Error: window.supabase no está definido.");
        return; // Detiene la ejecución si Supabase no se cargó
    }
    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


    // --- Referencias a Elementos del DOM ---
    const appView = document.getElementById('app-view');
    const appTitle = document.getElementById('app-title');
    
    // Elementos solo para Admin (pueden ser null en modo invitado)
    const formContainer = document.getElementById('form-container');
    const btnLogout = document.getElementById('btn-logout');
    const form = document.getElementById('form-nuevo-registro');
    const dynamicFormFields = document.getElementById('dynamic-form-fields');
    
    // Elementos comunes
    const btnPropiedad = document.getElementById('btn-propiedad');
    const btnSociedad = document.getElementById('btn-sociedad');
    const tableHeader = document.getElementById('table-header');
    const tableBody = document.getElementById('table-body');
    const filtroBusqueda = document.getElementById('filtro-busqueda');
    const loadingSpinner = document.getElementById('loading-spinner');
    const errorMessage = document.getElementById('error-message');

    // 1. Manejo de Autenticación y Carga Inicial
    // CAMBIO: Se quita la verificación de !supabase.auth, ya que si llegamos aquí, supabase SÍ existe.
    // CORRECCIÓN DEFINITIVA: Es 'onAuthStateChange' (sin la 'd' al final)
    supabase.auth.onAuthStateChange((event, session) => {
        if (isAdmin) {
            // Estamos en app.html (Admin)
            if (!session) {
                // No hay sesión, ¡expulsar al login!
                alert("Acceso denegado. Debes iniciar sesión.");
                window.location.href = 'index.html';
            } else {
                // Hay sesión, inicializar la app de admin
                initializeApp(session.user);
            }
        } else {
            // Estamos en invitado.html (Invitado)
            initializeApp(null); // 'null' significa modo invitado
        }
    });


    // 2. Función de Inicialización Principal
    function initializeApp(user) {
        
        // Muestra la app (antes estaba oculta por style.css)
        appView.style.display = 'block';

        // 3. Manejo de Pestañas (Libros)
        btnPropiedad.addEventListener('click', () => switchTable('registros_propiedad'));
        btnSociedad.addEventListener('click', () => switchTable('movimientos_sociedad'));

        // 4. Filtro de Búsqueda
        let searchTimeout;
        filtroBusqueda.addEventListener('keyup', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(loadData, 300);
        });

        // 5. Funciones de Exportación (PDF e Imprimir)
        document.getElementById('btn-pdf').addEventListener('click', exportPDF);
        document.getElementById('btn-print').addEventListener('click', exportPrint);
        
        // Listener de "seleccionar todo" (si la cabecera existe)
        if (tableHeader) {
            tableHeader.addEventListener('change', (e) => {
                if (e.target.id === 'select-all-checkbox') {
                    document.querySelectorAll('.row-checkbox').forEach(cb => {
                        cb.checked = e.target.checked;
                    });
                }
            });
        }
        
        // 6. Lógica Específica de ADMIN (si los elementos existen)
        if (user && isAdmin && btnLogout && form) {
            
            btnLogout.addEventListener('click', async () => {
                await supabase.auth.signOut();
                window.location.href = 'index.html';
            });

            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                saveNewRecord();
            });
        }
        
        // Carga inicial
        updateTableUI();
    }


    // --- Funciones de la Aplicación ---

    function switchTable(tableName) {
        currentTable = tableName;
        
        [btnPropiedad, btnSociedad].forEach(btn => {
            btn.classList.remove('border-gray-800', 'text-gray-800');
            btn.classList.add('border-transparent', 'text-gray-500', 'hover:text-gray-700', 'hover:border-gray-300');
        });
        
        const activeBtn = (tableName === 'registros_propiedad') ? btnPropiedad : btnSociedad;
        activeBtn.classList.add('border-gray-800', 'text-gray-800');
        activeBtn.classList.remove('border-transparent', 'text-gray-500');

        updateTableUI();
    }
    
    async function loadData() {
        showLoading(true);
        showError(null);
        
        const schema = tableSchemas[currentTable];
        const filtro = filtroBusqueda.value;
        
        let query = supabase.from(currentTable).select(schema.dbReadFields.join(',')).order('id', { ascending: false });
        
        if (filtro) {
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
            schema.columnNames.forEach(name => {
                headerRow.innerHTML += `<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">${name}</th>`;
            });
        }

        // Renderizar formulario (solo si estamos en modo admin)
        if (isAdmin && dynamicFormFields) {
            renderForm(schema);
        }
        
        loadData();
    }
    
    function renderForm(schema) {
        // Esta función solo se llama si 'isAdmin' es true
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
        if (data.length === 0) {
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
            
            tr.querySelector('.row-checkbox').dataset.registro = JSON.stringify(row);
            tableBody.appendChild(tr);
        });
    }
    
    async function saveNewRecord() {
        // Esta función solo se llama si 'isAdmin' es true
        const schema = tableSchemas[currentTable];
        const newRow = {};
        
        schema.formFields.forEach(field => {
            const input = document.getElementById(`form-${field.id}`);
            if (input.value) {
                newRow[field.id] = input.value;
            }
        });
        
        const { error } = await supabase.from(currentTable).insert([newRow]);
        
        if (error) {
            showError('Error al guardar: ' + error.message);
        } else {
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
                doc.setFont('Merriweather', 'bold');
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
        let html = `
            <style>
                body { font-family: 'Inter', sans-serif; }
                h2 { font-family: 'Merriweather', serif; }
                table { width: 100%; border-collapse: collapse; font-size: 10px; }
                th, td { border: 1px solid #ccc; padding: 4px; }
                th { background-color: #f0f0f0; }
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
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
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

