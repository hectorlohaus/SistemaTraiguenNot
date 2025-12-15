// 1
// js/buscador.js
// Lógica para la pestaña de Buscador Avanzado

const BuscadorService = {
    // Estado local del buscador
    state: {
        currentTable: 'repertorio_instrumentos', // Tabla seleccionada para buscar
        filters: {}, // Filtros activos
        sort: { field: 'id', ascending: false }, // Orden actual
        results: [] // Resultados actuales
    },

    // Inicialización
    init() {
        const btnSearch = document.getElementById('btn-adv-search');
        const btnClear = document.getElementById('btn-adv-clear');
        const selectType = document.getElementById('adv-search-type');
        
        if (btnSearch) btnSearch.addEventListener('click', () => this.executeSearch());
        if (btnClear) btnClear.addEventListener('click', () => this.clearFilters());
        
        if (selectType) {
            selectType.addEventListener('change', (e) => {
                this.state.currentTable = e.target.value;
                this.renderFilters();
                // Limpiar resultados al cambiar de tabla
                this.state.results = [];
                this.renderResults();
            });
            // Inicializar filtros con la tabla por defecto
            this.renderFilters();
        }
    },

    // Renderiza los campos de filtro según la tabla seleccionada
    renderFilters() {
        const container = document.getElementById('adv-search-filters');
        if (!container) return;

        const schema = SCHEMAS[this.state.currentTable];
        if (!schema || !schema.advancedSearch) return;

        container.innerHTML = ''; // Limpiar filtros anteriores

        schema.advancedSearch.forEach(field => {
            let inputHtml = '';
            const baseClass = "mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border";

            if (field.type === 'date') {
                inputHtml = `<input type="date" id="adv-${field.id}" class="${baseClass}">`;
            } else {
                inputHtml = `<input type="text" id="adv-${field.id}" class="${baseClass}" placeholder="Buscar...">`;
            }

            container.innerHTML += `
                <div class="col-span-1">
                    <label for="adv-${field.id}" class="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                        ${field.label}
                    </label>
                    ${inputHtml}
                </div>
            `;
        });
    },

    // Recopila filtros y ejecuta la consulta
    async executeSearch() {
        UI.showLoading(true);
        UI.showError(null);

        try {
            const schema = SCHEMAS[this.state.currentTable];
            let query = State.supabase.from(this.state.currentTable).select(schema.dbReadFields.join(','));

            // Aplicar filtros dinámicos
            schema.advancedSearch.forEach(field => {
                const el = document.getElementById(`adv-${field.id}`);
                if (el && el.value) {
                    if (field.type === 'text') {
                        // Búsqueda insensible a mayúsculas (ilike)
                        query = query.ilike(field.id, `%${el.value}%`);
                    } else if (field.type === 'date') {
                        // Búsqueda exacta de fecha
                        query = query.eq(field.id, el.value);
                    }
                }
            });

            // Aplicar ordenamiento
            query = query.order(this.state.sort.field, { ascending: this.state.sort.ascending });

            // Límite de seguridad
            query = query.limit(100);

            const { data, error } = await query;
            
            if (error) throw error;
            
            this.state.results = data;
            this.renderResults();
            
            if (data.length === 0) {
                UI.showToast("No se encontraron resultados.");
            } else {
                UI.showToast(`Se encontraron ${data.length} resultados.`);
            }

        } catch (e) {
            UI.showError('Error en la búsqueda: ' + e.message);
        } finally {
            UI.showLoading(false);
        }
    },

    // Renderiza la tabla de resultados con encabezados ordenables
    renderResults() {
        const container = document.getElementById('adv-results-body');
        const headerContainer = document.getElementById('adv-results-header');
        if (!container || !headerContainer) return;

        const schema = SCHEMAS[this.state.currentTable];
        container.innerHTML = '';
        headerContainer.innerHTML = '';

        // 1. Renderizar Encabezados (Click para ordenar)
        let headerHtml = `<th class="py-3 px-6 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-10">#</th>`;
        schema.columnNames.forEach((name, index) => {
            if (schema.hiddenColumns?.includes(index)) return;
            
            // CAMBIO: Usar sortMap para determinar el campo de ordenamiento correcto
            const dbField = schema.sortMap ? schema.sortMap[index] : schema.dbReadFields[index];
            
            // Icono de orden
            let sortIcon = '';
            // Mostrar flecha si es la columna activa
            if (this.state.sort.field === dbField) {
                sortIcon = this.state.sort.ascending ? ' ▲' : ' ▼';
            }

            headerHtml += `
                <th class="py-3 px-6 text-left text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    onclick="BuscadorService.changeSort('${dbField}')">
                    ${name} <span class="text-blue-600">${sortIcon}</span>
                </th>`;
        });
        headerContainer.innerHTML = `<tr>${headerHtml}</tr>`;

        // 2. Renderizar Datos
        if (this.state.results.length === 0) {
            container.innerHTML = `<tr><td colspan="99" class="text-center p-8 text-gray-500">Realice una búsqueda para ver resultados.</td></tr>`;
            return;
        }

        this.state.results.forEach((row, rowIndex) => {
            const tr = document.createElement('tr');
            tr.className = "border-b border-gray-200 hover:bg-slate-50 transition duration-150 ease-in-out bg-white";
            
            let html = `<td class="py-3 px-6 text-xs text-gray-400">${rowIndex + 1}</td>`;

            if (this.state.currentTable === 'repertorio_instrumentos') {
                html += `
                    <td class="py-3 px-6 text-sm text-gray-700 whitespace-nowrap">${UI.formatDate(row.fecha)}</td>
                    <td class="py-3 px-6 text-sm text-gray-700 whitespace-nowrap font-medium">${row.n_rep || '-'}</td>
                    <td class="py-3 px-6 text-sm text-gray-700 whitespace-nowrap">${row.contratante_1_nombre} ${row.contratante_1_apellido}</td>
                    <td class="py-3 px-6 text-sm text-gray-700 whitespace-nowrap">${row.contratante_2_nombre} ${row.contratante_2_apellido}</td>
                    <td class="py-3 px-6 text-sm text-gray-700 whitespace-nowrap">${row.acto_o_contrato || '-'}</td>
                    <td class="py-3 px-6 text-sm text-gray-700 whitespace-nowrap">${row.abogado_redactor || '-'}</td>
                    <td class="py-3 px-6 text-sm text-gray-700 whitespace-nowrap">${row.n_agregado || '-'}</td>
                    <td class="py-3 px-6 text-sm text-gray-700 whitespace-nowrap">${UI.formatDate(row.created_at)}</td>
                `;
            } else {
                schema.dbReadFields.forEach((field, i) => {
                    if (schema.hiddenColumns?.includes(i)) return;
                    let val = row[field];
                    if (field === 'created_at' || field === 'fecha') val = UI.formatDate(val);
                    html += `<td class="py-3 px-6 text-sm text-gray-700 whitespace-nowrap">${val || '-'}</td>`;
                });
            }
            
            tr.innerHTML = html;
            container.appendChild(tr);
        });
    },

    // Cambia el orden y re-ejecuta la búsqueda
    changeSort(field) {
        if (!field) return; // Evitar error si el campo es nulo
        if (this.state.sort.field === field) {
            this.state.sort.ascending = !this.state.sort.ascending;
        } else {
            this.state.sort.field = field;
            this.state.sort.ascending = true;
        }
        this.executeSearch();
    },

    clearFilters() {
        const inputs = document.querySelectorAll('#adv-search-filters input');
        inputs.forEach(input => input.value = '');
        this.state.results = [];
        this.renderResults();
    }
};