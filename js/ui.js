// 1
// js/ui.js
// Manejo del DOM: Renderizado de tablas, formularios y notificaciones

// --- MÓDULO: Utilidades UI ---
const UI = {
    els: {}, // Cache de elementos DOM
    
    init() {
        const ids = [
            'app-view', 'app-title', 'form-container', 'btn-logout', 'form-nuevo-registro', 
            'dynamic-form-fields', 'btn-propiedad', 'btn-sociedad', 'table-header', 'table-body', 
            'filtro-busqueda', 'btn-buscar', 'btn-cierre-dia', 'btn-excel', 'btn-excel-inst', 
            'btn-excel-cons', 'btn-indice-inst', 'btn-cierre-inst', 'btn-cierre-cons',
            'loading-spinner', 'error-message', 'pagination-controls', 'pagination-status', 
            'btn-prev', 'btn-next', 'toast-success', 'toast-message',
            'confirmation-modal', 'btn-confirm-modal', 'btn-cancel-modal', 'modal-message', 'modal-title'
        ];
        ids.forEach(id => {
            const el = document.getElementById(id);
            if(el) this.els[id] = el;
        });
    },

    showLoading(show) { if(this.els['loading-spinner']) this.els['loading-spinner'].style.display = show ? 'block' : 'none'; },
    
    showError(msg) { 
        if(this.els['error-message']) { 
            this.els['error-message'].textContent = msg; 
            this.els['error-message'].style.display = msg ? 'block' : 'none'; 
        } 
    },
    
    showToast(msg) {
        const t = this.els['toast-success'];
        if(t) { 
            this.els['toast-message'].textContent = msg; 
            t.style.display = 'flex'; 
            setTimeout(() => t.classList.remove('opacity-0'), 10);
            setTimeout(() => t.style.display = 'none', 3000); 
        }
    },

    formatDate(dateStr) {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return new Date(d.getTime() + d.getTimezoneOffset()*60000).toLocaleDateString('es-CL');
    },

    renderTable(data) {
        if (!this.els['table-body']) return;
        const tbody = this.els['table-body'];
        tbody.innerHTML = '';
        
        if (!data || data.length === 0) { 
            tbody.innerHTML = `<tr><td colspan="99" class="text-center p-8 text-gray-500 bg-white">Sin registros.</td></tr>`; 
            return; 
        }

        const schema = SCHEMAS[State.currentTable];
        
        data.forEach(row => {
            const tr = document.createElement('tr');
            tr.className = "border-b border-gray-200 hover:bg-slate-50 bg-white";
            
            let html = `<td class="py-3 px-6"><input type="checkbox" class="row-checkbox rounded text-blue-600 focus:ring-blue-500 border-gray-300"></td>`;
            
            if (State.currentTable === 'repertorio_instrumentos') {
                const contratante1 = `${row.contratante_1_nombre || ''} ${row.contratante_1_apellido || ''}`.trim();
                const contratante2 = `${row.contratante_2_nombre || ''} ${row.contratante_2_apellido || ''}`.trim();

                html += `<td class="py-3 px-6 text-sm text-gray-700 whitespace-nowrap">${this.formatDate(row.fecha)}</td>`;
                html += `<td class="py-3 px-6 text-sm text-gray-700 whitespace-nowrap font-medium">${row.n_rep || '-'}</td>`;
                html += `<td class="py-3 px-6 text-sm text-gray-700 whitespace-nowrap">${contratante1 || '-'}</td>`;
                html += `<td class="py-3 px-6 text-sm text-gray-700 whitespace-nowrap">${contratante2 || '-'}</td>`;
                html += `<td class="py-3 px-6 text-sm text-gray-700 whitespace-nowrap">${row.acto_o_contrato || '-'}</td>`;
                html += `<td class="py-3 px-6 text-sm text-gray-700 whitespace-nowrap">${row.abogado_redactor || '-'}</td>`;
                html += `<td class="py-3 px-6 text-sm text-gray-700 whitespace-nowrap">${row.n_agregado || '-'}</td>`;
                html += `<td class="py-3 px-6 text-sm text-gray-700 whitespace-nowrap">${this.formatDate(row.created_at)}</td>`;
            } else {
                schema.dbReadFields.forEach((field, i) => {
                    if (schema.hiddenColumns?.includes(i)) return; 
                    let val = row[field];
                    if (field === 'created_at' || field === 'fecha') val = this.formatDate(val);
                    html += `<td class="py-3 px-6 text-sm text-gray-700 whitespace-nowrap max-w-xs truncate" title="${val || ''}">${val || '-'}</td>`;
                });
            }

            // CAMBIO: Columna de Acciones (Solo para Admin)
            if (typeof isAdmin !== 'undefined' && isAdmin) {
                html += `
                    <td class="py-3 px-6 text-center whitespace-nowrap">
                        <button class="btn-edit-row text-blue-600 hover:text-blue-800 transition-colors p-1 rounded hover:bg-blue-50" data-id="${row.id}" title="Editar">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                        </button>
                    </td>`;
            }
            
            tr.innerHTML = html;
            const checkbox = tr.querySelector('.row-checkbox');
            if(checkbox) checkbox.dataset.registro = JSON.stringify(row);
            tbody.appendChild(tr);
        });
    },

    renderForm() {
        if (!this.els['dynamic-form-fields']) return;
        const container = this.els['dynamic-form-fields'];
        const schema = SCHEMAS[State.currentTable];
        
        container.className = "grid grid-cols-1 md:grid-cols-4 gap-6";
        container.innerHTML = '';
        
        schema.formFields.forEach(field => {
            let inputHtml = '';
            const requiredAttr = field.required ? 'required' : '';
            const baseClass = "mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border transition duration-150 ease-in-out";
            
            if (field.type === 'textarea') {
                inputHtml = `<textarea id="form-${field.id}" ${requiredAttr} class="${baseClass}" rows="3"></textarea>`;
            } else if (field.type === 'datalist') {
                inputHtml = `<input list="list-${field.id}" id="form-${field.id}" ${requiredAttr} class="${baseClass}" placeholder="Seleccione o escriba..."><datalist id="list-${field.id}">${field.options.map(o => `<option value="${o}">`).join('')}</datalist>`;
            } else {
                inputHtml = `<input type="${field.type}" id="form-${field.id}" ${requiredAttr} placeholder="${field.placeholder || ''}" class="${baseClass}">`;
            }
            
            container.innerHTML += `
                <div class="col-span-1 md:col-span-${field.span || 1}">
                    <label for="form-${field.id}" class="block text-sm font-medium text-gray-700 mb-1">
                        ${field.label} ${field.required ? '<span class="text-red-500">*</span>' : ''}
                    </label>
                    ${inputHtml}
                </div>
            `;
        });

        const dateField = document.getElementById('form-fecha');
        if (dateField) {
            if (!dateField.value) dateField.valueAsDate = new Date();
            
            if (State.currentTable === 'repertorio_instrumentos') {
                const repField = document.getElementById('form-n_rep');
                const calc = async () => {
                    // Solo calcular si NO estamos editando (para no sobrescribir el número existente)
                    if (State.editingId) return;

                    const year = dateField.value.split('-')[0];
                    if(!year || !repField) return;
                    
                    repField.value = "Calculando...";
                    repField.readOnly = true;
                    try {
                        const nextRep = await DataService.getNextRepertorio(year);
                        repField.value = nextRep;
                    } catch(e) { 
                        console.error(e); 
                        repField.value = ""; 
                    } finally { 
                        repField.readOnly = false; 
                    }
                };
                calc();
                dateField.addEventListener('change', calc);
            }
        }
    },

    updatePagination(count) {
        if (!this.els['pagination-controls']) return;
        this.els['pagination-controls'].style.display = count > 0 ? 'flex' : 'none';
        if (this.els['pagination-status']) {
            const start = (State.currentPage - 1) * CONFIG.RECORDS_PER_PAGE + 1;
            const end = Math.min(State.currentPage * CONFIG.RECORDS_PER_PAGE, count);
            this.els['pagination-status'].textContent = `Mostrando ${start}-${end} de ${count} registros`;
        }
        
        if (this.els['btn-prev']) {
            this.els['btn-prev'].disabled = State.currentPage === 1;
            this.toggleButtonState(this.els['btn-prev']);
        }
        
        if (this.els['btn-next']) {
            const maxPage = Math.ceil(count / CONFIG.RECORDS_PER_PAGE);
            this.els['btn-next'].disabled = State.currentPage >= maxPage;
            this.toggleButtonState(this.els['btn-next']);
        }
    },

    toggleButtonState(btn) {
        if(btn.disabled) {
            btn.classList.add('opacity-50', 'cursor-not-allowed', 'bg-slate-100');
            btn.classList.remove('hover:bg-slate-50', 'bg-white');
        } else {
            btn.classList.remove('opacity-50', 'cursor-not-allowed', 'bg-slate-100');
            btn.classList.add('hover:bg-slate-50', 'bg-white');
        }
    }
};