const SUPABASE_URL = 'https://itnjnoqcppkvzqlbmyrq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0bmpub3FjcHBrdnpxbGJteXJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1ODczODEsImV4cCI6MjA3NzE2MzM4MX0.HP2ChKbP4O5YWu73I6UYgLoH2O80rMcJiWdZRSTYrV8'; // TODO: Reemplaza si es necesario

if (SUPABASE_URL === 'TU_SUPABASE_URL' || !SUPABASE_URL) {
    console.warn('¡Atención! Debes configurar tus claves de Supabase en login.js y app.js');
    alert('Error: Claves de Supabase no configuradas en app.js');
}
const tableSchemas = {
    'registros_propiedad': {
        tableName: 'Libro de Propiedad',      
        dbReadFields: ['id', 'fecha', 'n_rep', 'nombre_contratantes', 'acto_o_contrato', 'abogado_redactor', 'n_agregado', 'created_at'],       
        columnNames: ['Número', 'Fecha', 'N° Rep (mm-yyyy)', 'Nombre de los contratantes', 'Acto o Contrato', 'Abogado Redactor', 'N° Agregado', 'Ingresado'],      
        formFields: [
            { id: 'fecha', label: 'Fecha', type: 'date', span: 1, required: true },
            { id: 'n_rep', label: 'N° Rep (mm-yyyy)', type: 'text', span: 1, required: true, placeholder: 'mm-yyyy' },
            { id: 'nombre_contratantes', label: 'Nombre de los contratantes', type: 'text', span: 2, required: true },
            { id: 'acto_o_contrato', label: 'Acto o Contrato', type: 'text', span: 1, required: true },
            { id: 'abogado_redactor', label: 'Abogado Redactor', type: 'text', span: 1, required: true },
            { id: 'n_agregado', label: 'N° Agregado', type: 'text', span: 1, required: true }
        ],
       
        filterColumns: ['n_rep', 'nombre_contratantes', 'acto_o_contrato', 'abogado_redactor', 'n_agregado']
    },
    'movimientos_sociedad': {
        tableName: 'Libro de Sociedad',
        dbReadFields: ['id', 'interesado', 'acto_o_contrato', 'clase_inscripcion', 'hora', 'dia', 'mes', 'registro_parcial', 'observaciones', 'created_at'],
        columnNames: ['Número', 'Interesado', 'Acto o Contrato', 'Clase Inscripción', 'Hora', 'Día', 'Mes', 'Registro Parcial', 'Observaciones', 'Ingresado'],       
        formFields: [
            { id: 'interesado', label: 'Interesado', type: 'text', span: 2, required: true },
            { id: 'acto_o_contrato', label: 'Acto o Contrato', type: 'text', span: 2, required: true },
            { id: 'clase_inscripcion', label: 'Clase Inscripción', type: 'text', span: 1, required: true },
            { id: 'hora', label: 'Hora', type: 'time', span: 1, required: true },
            { id: 'dia', label: 'Día', type: 'text', span: 1, required: true, placeholder: 'Ej: 01, 23...' },
            { id: 'mes', label: 'Mes', type: 'text', span: 1, required: true, placeholder: 'Ej: Enero, 05...' },
            { id: 'registro_parcial', label: 'Registro Parcial', type: 'text', span: 1, required: true },
            { id: 'observaciones', label: 'Observaciones', type: 'textarea', span: 2, required: true }
        ],
        filterColumns: ['interesado', 'acto_o_contrato', 'clase_inscripcion', 'observaciones']
    }
};
let currentTable = 'registros_propiedad'; 

document.addEventListener('DOMContentLoaded', () => {
    if (!window.supabase) {
        showError("Error crítico: La librería de Supabase no se cargó correctamente.");
        console.error("Error: window.supabase no está definido.");
        return; 
    }
    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
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

    if (btnPropiedad) {
        btnPropiedad.addEventListener('click', () => switchTable('registros_propiedad'));
    }
    if (btnSociedad) {
        btnSociedad.addEventListener('click', () => switchTable('movimientos_sociedad'));
    }
    if (filtroBusqueda && btnBuscar) {
        btnBuscar.addEventListener('click', loadData);
        filtroBusqueda.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') {
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

            await saveNewRecord(); 
            
            if (saveButton) saveButton.disabled = false;
        });
    }
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
                        ${field.label} 
                        <!-- CAMBIO: Se muestra el asterisco en todos -->
                        <span class="text-red-500">*</span>
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
                } else {
                    isValid = false; 
                }
            }
        });

        if (!isValid) {
            showError('Por favor, complete todos los campos requeridos (*).');
            const saveButton = document.getElementById('btn-save');
            if (saveButton) saveButton.disabled = false;
            return; 
        }       
        const { error } = await supabase.from(currentTable).insert([newRow]);        
        if (error) {
            showError('Error al guardar: ' + error.message);
        } else {
            showError(null); 
            if(form) form.reset();
            loadData();
        }
    }

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
        const doc = new jsPDF({ orientation: 'landscape' });
        if (typeof doc.autoTable !== 'function') {
            showError("La librería PDF (autoTable) aún no está lista. Intente de nuevo en unos segundos.");
            return;
        }
        const schema = tableSchemas[currentTable];
        const body = registros.map(row => {
            return schema.dbReadFields.map(field => {
                let cellData = row[field] || '';
                if (field === 'created_at' || field === 'fecha') {
                    if(cellData) {
                        cellData = new Date(cellData).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
                    }
                }
                return cellData;
            });
        });
        doc.autoTable({
            head: [schema.columnNames],
            body: body,
            styles: { fontSize: 8 },
            headStyles: { fillColor: [41, 41, 41] }, 
            startY: 22,
            didDrawPage: (data) => {
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
            printWindow.document.title = schema.tableName;
            printWindow.document.close();
            printWindow.focus();
            printWindow.print();
        } else {
            showError("No se pudo abrir la ventana de impresión. Revise los permisos de pop-ups.");
        }
    }

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

