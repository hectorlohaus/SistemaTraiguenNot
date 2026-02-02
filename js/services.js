// 1
// js/services.js
// Lógica de negocio: Datos (Supabase) y Exportación (PDF/Excel/Print)

const DataService = {
    async loadData(filtro = '') {
        const schema = SCHEMAS[State.currentTable];
        const from = (State.currentPage - 1) * CONFIG.RECORDS_PER_PAGE;

        // Sorting Configuration
        const sortField = State.sort?.field || 'id';
        const sortAsc = State.sort?.ascending !== false; // Default true
        const isSpecialSort = (sortField === 'n_rep' || sortField === 'numero_inscripcion');

        let queryBase = State.supabase.from(State.currentTable);

        // Filter Construction
        let filterStr = '';
        if (filtro && schema.filterColumns.length > 0) {
            filterStr = schema.filterColumns.map(col => `${col}.ilike.%${filtro}%`).join(',');
        }

        try {
            if (isSpecialSort) {
                // STRATEGY: Fetch ALL minimal data, sort in JS, paginate, fetch details
                let allQuery = queryBase.select(`id, ${sortField}`);
                if (filterStr) allQuery = allQuery.or(filterStr);

                const { data: allIds, error: allError } = await allQuery;
                if (allError) throw allError;

                // Natural Sort (Numeric start of string)
                allIds.sort((a, b) => {
                    const valA = a[sortField] || '';
                    const valB = b[sortField] || '';
                    const numA = parseInt(valA.split('-')[0]) || 0;
                    const numB = parseInt(valB.split('-')[0]) || 0;

                    if (numA !== numB) return sortAsc ? numA - numB : numB - numA;
                    // Fallback to year part or full string if numbers equal
                    return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
                });

                const count = allIds.length;
                const sliced = allIds.slice(from, from + CONFIG.RECORDS_PER_PAGE);

                if (sliced.length === 0) return { data: [], count };

                // Fetch details for the current page
                const targetIds = sliced.map(x => x.id);
                const { data: details, error: detError } = await queryBase
                    .select(schema.dbReadFields.join(','))
                    .in('id', targetIds);

                if (detError) throw detError;

                // Re-sort details to match the sliced order (Supabase .in() is unordered)
                const orderMap = new Map(sliced.map((item, index) => [item.id, index]));
                details.sort((a, b) => orderMap.get(a.id) - orderMap.get(b.id));

                return { data: details, count };

            } else {
                // NORMAL/LEGACY BEHAVIOR (Server-side sort)
                let query = queryBase.select(schema.dbReadFields.join(','), { count: 'exact' });
                if (filterStr) query = query.or(filterStr);

                query = query.order(sortField, { ascending: sortAsc })
                    .range(from, from + CONFIG.RECORDS_PER_PAGE - 1);

                const { data, count, error } = await query;
                if (error) throw error;
                return { data, count };
            }
        } catch (e) {
            throw new Error(e.message);
        }
    },

    async saveRecord(record) {
        const { data, error } = await State.supabase.from(State.currentTable).insert([record]).select('id');
        if (error) throw error;
        return data;
    },

    async getNextRepertorio(year) {
        const { data, error } = await State.supabase
            .from('repertorio_instrumentos')
            .select('n_rep')
            .ilike('n_rep', `%-${year}`)
            .order('id', { ascending: false })
            .limit(1);

        if (error) throw error;

        let next = 1;
        if (data && data.length > 0) {
            const parts = data[0].n_rep.split('-');
            if (parts[0] && !isNaN(parseInt(parts[0]))) next = parseInt(parts[0]) + 1;
        }
        return `${next < 10 ? '0' + next : next}-${year}`;
    },

    async getNextInscripcion(year) {
        const { data, error } = await State.supabase
            .from('repertorio_conservador')
            .select('numero_inscripcion')
            .ilike('numero_inscripcion', `%-${year}`)
            .order('id', { ascending: false })
            .limit(1);

        if (error) throw error;

        let next = 1;
        if (data && data.length > 0) {
            const parts = data[0].numero_inscripcion.split('-');
            if (parts[0] && !isNaN(parseInt(parts[0]))) next = parseInt(parts[0]) + 1;
        }
        return `${next < 10 ? '0' + next : next}-${year}`;
    },

    async getAllRecordsForExport(isCierreDia, monthFilter = null, specificDate = null) {
        const schema = SCHEMAS[State.currentTable];
        let query = State.supabase.from(State.currentTable).select(schema.dbReadFields.join(','));

        // CAMBIO: Determinar campo de orden y si es ordenamiento especial
        let sortField = 'id';
        let isSpecialSort = false;

        if (State.currentTable === 'repertorio_instrumentos') {
            sortField = 'n_rep';
            isSpecialSort = true;
        }
        else if (State.currentTable === 'repertorio_conservador') {
            sortField = 'numero_inscripcion';
            isSpecialSort = true;
        }

        if (isCierreDia) {
            const targetDate = specificDate || new Date().toISOString().split('T')[0];
            query = query.eq('fecha', targetDate);
        } else if (monthFilter) {
            const [year, month] = monthFilter.split('-');
            const startDate = `${year}-${month}-01`;
            const lastDay = new Date(year, month, 0).getDate();
            const endDate = `${year}-${month}-${lastDay}`;
            query = query.gte('fecha', startDate).lte('fecha', endDate);
        }

        // Fetch data. If not special sort, usage of basic sort is fine, but for reports 
        // we might want natural sort anyway if numerical strings are involved.
        // We fetch UNORDERED or basic ordered first.
        // For standard fields (created_at, etc) basic sort is fine. 
        // But for n_rep/n_insc we MUST use JS sort.

        if (!isSpecialSort) {
            query = query.order(sortField, { ascending: true });
        }

        const { data, error } = await query;
        if (error) throw error;

        // Apply Custom Natural Sort if needed
        if (isSpecialSort && data.length > 0) {
            data.sort((a, b) => {
                const valA = a[sortField] || '';
                const valB = b[sortField] || '';
                const numA = parseInt(valA.split('-')[0]) || 0;
                const numB = parseInt(valB.split('-')[0]) || 0;

                if (numA !== numB) return numA - numB;
                return valA.localeCompare(valB);
            });
        }

        return data;
    },

    async getRecordsForIndice(startDate, endDate) {
        return await State.supabase
            .from('repertorio_instrumentos')
            .select('n_rep, fecha, contratante_1_nombre, contratante_1_apellido, contratante_2_nombre, contratante_2_apellido, acto_o_contrato')
            .gte('fecha', startDate)
            .lte('fecha', endDate)
            .order('contratante_1_apellido', { ascending: true });
    },

    async getRecordsForIndiceConservador(startDate, endDate, registroParcial) {
        let query = State.supabase
            .from('repertorio_conservador')
            .select('*') // Seleccionar todo para tener todos los datos disponibles
            .gte('fecha', startDate)
            .lte('fecha', endDate);

        if (registroParcial) {
            query = query.eq('registro_parcial', registroParcial);
        }

        return await query.order('interesado', { ascending: true });
    }
};

const ExportService = {
    async generatePDF(isCierreDia, customData = null, specificDate = null) {
        if (typeof window.jspdf === 'undefined') { UI.showError("Librerías cargando..."); return; }

        let registros = [];
        const schema = SCHEMAS[State.currentTable];

        UI.showLoading(true);
        try {
            if (customData) {
                registros = customData;
            } else if (isCierreDia) {
                const data = await DataService.getAllRecordsForExport(true, null, specificDate);
                if (!data || data.length === 0) throw new Error("No hay registros para la fecha seleccionada.");
                registros = data;
            } else {
                registros = this.getSelectedData();
            }
        } catch (e) { UI.showError(e.message); UI.showLoading(false); return; }
        UI.showLoading(false);

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

        let title = schema.tableName;
        if (isCierreDia) {
            const dateStr = specificDate ? new Date(specificDate + 'T00:00:00').toLocaleDateString('es-CL') : new Date().toLocaleDateString('es-CL');
            title = `CIERRE DE DÍA (${dateStr}) - ${schema.tableName}`;
        } else if (customData) {
            title = `INFORME - ${schema.tableName}`;
        }

        const todayStr = new Date().toLocaleDateString('es-CL');

        const body = registros.map(row => {
            if (State.currentTable === 'repertorio_instrumentos') {
                return [
                    UI.formatDate(row.fecha),
                    row.n_rep,
                    `${row.contratante_1_nombre} ${row.contratante_1_apellido}`,
                    `${row.contratante_2_nombre} ${row.contratante_2_apellido}`,
                    row.acto_o_contrato, row.abogado_redactor, row.n_agregado, UI.formatDate(row.created_at)
                ];
            } else {
                return schema.dbReadFields
                    .filter((_, i) => !schema.hiddenColumns?.includes(i))
                    .map(f => {
                        let val = row[f];
                        if (f === 'fecha' || f === 'created_at') val = UI.formatDate(val);
                        return val || '';
                    });
            }
        });

        const headers = schema.columnNames.filter((_, i) => !schema.hiddenColumns?.includes(i));

        doc.autoTable({
            head: [headers], body: body, theme: 'grid', startY: 25,
            styles: { fontSize: 8 }, headStyles: { fillColor: [15, 23, 42] },
            didDrawPage: (d) => {
                doc.setFontSize(14); doc.text(title, 15, 15);
                doc.setFontSize(10); doc.text(`Generado: ${todayStr}`, 280, 15, { align: 'right' });
            }
        });

        if (isCierreDia || customData) {
            if (doc.lastAutoTable.finalY > 170) doc.addPage();

            // Lógica Min/Max
            let min, max;
            const getId = (r) => r.n_rep || r.numero_inscripcion || r.id;

            if (registros.length > 0) {
                // Al estar ordenado Ascendente, el primero es el menor y el último el mayor
                min = getId(registros[0]);
                max = getId(registros[registros.length - 1]);
            } else {
                min = '?';
                max = '?';
            }

            doc.setFontSize(11);
            doc.text(`Certifico que se realizaron ${registros.length} anotaciones (del ${min} al ${max}).`, 15, doc.lastAutoTable.finalY + 15);
            doc.text("_______________________", 150, doc.lastAutoTable.finalY + 30);
            doc.text("Firma Responsable", 165, doc.lastAutoTable.finalY + 35, { align: 'center' });
        }

        doc.save(`Reporte_${new Date().getTime()}.pdf`);
    },

    async generateExcel(isFullExport, monthFilter = null, customData = null) {
        let registros = [];
        UI.showLoading(true);
        try {
            if (customData) {
                registros = customData;
            } else if (isFullExport) {
                registros = await DataService.getAllRecordsForExport(false, monthFilter);
            } else {
                registros = this.getSelectedData();
            }
        } catch (e) { UI.showError(e.message); UI.showLoading(false); return; }
        UI.showLoading(false);

        if (!registros || registros.length === 0) { UI.showError("Sin datos."); return; }

        const schema = SCHEMAS[State.currentTable];
        const headers = schema.columnNames.filter((_, i) => !schema.hiddenColumns?.includes(i));

        let csvRows = [];
        csvRows.push(headers.join(";"));

        registros.forEach(row => {
            let rowData = [];
            if (State.currentTable === 'repertorio_instrumentos') {
                rowData = [
                    UI.formatDate(row.fecha),
                    `="${row.n_rep}"`,
                    `${row.contratante_1_nombre} ${row.contratante_1_apellido}`,
                    `${row.contratante_2_nombre} ${row.contratante_2_apellido}`,
                    row.acto_o_contrato, row.abogado_redactor, row.n_agregado, UI.formatDate(row.created_at)
                ];
            } else {
                rowData = schema.dbReadFields
                    .filter((_, i) => !schema.hiddenColumns?.includes(i))
                    .map(f => {
                        let val = row[f];
                        if (f === 'fecha' || f === 'created_at') val = UI.formatDate(val);
                        val = val ? String(val).replace(/(\r\n|\n|\r)/gm, " ") : '';
                        if (val && /^\d{1,4}-\d{2,4}$/.test(val)) return `="${val}"`;
                        return val;
                    });
            }
            csvRows.push(rowData.join(";"));
        });

        const csvString = csvRows.join("\r\n");
        const blob = new Blob(["\uFEFF" + csvString], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);

        let filename = `Exportacion_${schema.tableName}`;
        if (monthFilter) filename += `_${monthFilter}`;
        filename += ".csv";

        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    },

    async generateIndiceGeneral() {
        const mesAnio = prompt("Ingrese MM-AAAA:", new Date().toLocaleDateString('es-CL', { month: '2-digit', year: 'numeric' }).replace('/', '-'));
        if (!mesAnio) return;
        const [mes, anio] = mesAnio.split('-');
        if (!mes || !anio) { UI.showError("Formato incorrecto."); return; }

        UI.showLoading(true);
        const startDate = `${anio}-${mes}-01`;
        const lastDay = new Date(anio, mes, 0).getDate();
        const endDate = `${anio}-${mes}-${lastDay}`;

        const { data, error } = await DataService.getRecordsForIndice(startDate, endDate);
        UI.showLoading(false);

        if (error) { UI.showError(error.message); return; }
        if (!data || data.length === 0) { UI.showError("No hay datos."); return; }

        const grouped = {};
        data.forEach(r => {
            const letra = (r.contratante_1_apellido || '').charAt(0).toUpperCase();
            if (!grouped[letra]) grouped[letra] = [];
            grouped[letra].push(r);
        });

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ unit: 'mm', format: 'a4' });
        const letras = Object.keys(grouped).sort();

        letras.forEach((letra, index) => {
            if (index > 0) doc.addPage();
            doc.setFontSize(16); doc.text(`INDICE GENERAL - ${letra}`, 105, 20, { align: 'center' });
            doc.setFontSize(10); doc.text(`Período: ${mes}-${anio}`, 105, 26, { align: 'center' });

            const body = grouped[letra].map(r => [
                `${r.contratante_1_apellido}, ${r.contratante_1_nombre}`,
                `${r.contratante_2_nombre} ${r.contratante_2_apellido}`,
                r.acto_o_contrato, r.n_rep
            ]);

            doc.autoTable({
                head: [['Contratante 1 (Orden)', 'Contratante 2', 'Acto', 'N° Rep']],
                body: body, startY: 35, theme: 'plain', styles: { fontSize: 9, cellPadding: 2 },
                columnStyles: { 0: { fontStyle: 'bold' } }
            });
        });
        doc.save(`Indice_General_${mes}_${anio}.pdf`);
    },

    async generateIndiceConservador(registroParcial, yearInput) {
        const anio = yearInput || new Date().getFullYear();
        if (!anio || isNaN(anio) || String(anio).length !== 4) { UI.showError("Año inválido. Debe ser YYYY."); return; }

        UI.showLoading(true);
        const startDate = `${anio}-01-01`;
        const endDate = `${anio}-12-31`;

        const { data, error } = await DataService.getRecordsForIndiceConservador(startDate, endDate, registroParcial);
        UI.showLoading(false);

        if (error) { UI.showError(error.message); return; }
        if (!data || data.length === 0) { UI.showError("No hay datos para este registro y año."); return; }

        // Agrupar por letra inicial del interesado
        const grouped = {};
        data.forEach(r => {
            const letra = (r.interesado || '').trim().charAt(0).toUpperCase();
            if (/[A-Z]/.test(letra)) {
                if (!grouped[letra]) grouped[letra] = [];
                grouped[letra].push(r);
            } else {
                if (!grouped['#']) grouped['#'] = [];
                grouped['#'].push(r);
            }
        });

        const { jsPDF } = window.jspdf;
        // Landscape orientation
        const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
        const letras = Object.keys(grouped).sort();

        // Columnas solicitadas: N° Inscripción primero, excluir ID
        const headers = ['N° Inscripción', 'Interesado', 'Acto o Contrato', 'Clase Inscripción', 'Hora', 'Fecha', 'Registro Parcial', 'Observaciones', 'Ingresado'];

        letras.forEach((letra, index) => {
            if (index > 0) doc.addPage();
            // Título centrado (Landscape A4 width ~297mm -> center ~148mm)
            doc.setFontSize(16); doc.text('ÍNDICE GENERAL ANUAL', 148, 20, { align: 'center' });

            doc.setFontSize(10);
            doc.text(`Registro: ${registroParcial || 'Todos'}`, 148, 26, { align: 'center' });
            doc.text(`Año: ${anio}`, 148, 31, { align: 'center' });

            const body = grouped[letra].map(r => [
                r.numero_inscripcion, // Primero
                r.interesado,
                r.acto_o_contrato,
                r.clase_inscripcion,
                r.hora,
                UI.formatDate(r.fecha),
                r.registro_parcial,
                r.observaciones,
                UI.formatDate(r.created_at)
            ]);

            doc.autoTable({
                head: [headers],
                body: body,
                startY: 40,
                theme: 'grid',
                styles: {
                    fontSize: 7, // Un poco más pequeño para que quepa todo
                    cellPadding: 2,
                    overflow: 'linebreak'
                },
                headStyles: {
                    fillColor: [0, 0, 0],
                    textColor: 255,
                    fontStyle: 'bold',
                    halign: 'center'
                },
                columnStyles: {
                    0: { fontStyle: 'bold', cellWidth: 25 }, // N° Inscripción
                    1: { cellWidth: 45 }, // Interesado
                    2: { cellWidth: 35 }, // Acto
                    3: { cellWidth: 25 }, // Clase
                    4: { cellWidth: 15 }, // Hora
                    5: { cellWidth: 20 }, // Fecha
                    6: { cellWidth: 35 }, // Registro Parcial
                    7: { cellWidth: 35 }, // Observaciones
                    8: { cellWidth: 20 }  // Ingresado
                    // Total aprox: 255mm (A4 Landscape margins left default)
                }
            });
        });

        const cleanName = (registroParcial || 'General').replace(/\s+/g, '_');
        doc.save(`Indice_Anual_${cleanName}_${anio}.pdf`);
    },

    getSelectedData() {
        const r = [];
        document.querySelectorAll('.row-checkbox:checked').forEach(c => r.push(JSON.parse(c.dataset.registro)));
        if (r.length === 0) throw new Error('Seleccione registros.');
        return r;
    },

    generatePrint(customData = null) {
        let registros = [];
        try {
            if (customData) {
                registros = customData;
            } else {
                registros = this.getSelectedData();
            }
        } catch (e) { UI.showError(e.message); return; }

        if (!registros || registros.length === 0) { UI.showError("No hay datos para imprimir."); return; }

        const schema = SCHEMAS[State.currentTable];

        const tableRows = registros.map(row => {
            let cells = '';
            if (State.currentTable === 'repertorio_instrumentos') {
                const data = [
                    UI.formatDate(row.fecha),
                    row.n_rep,
                    `${row.contratante_1_nombre} ${row.contratante_1_apellido}`,
                    `${row.contratante_2_nombre} ${row.contratante_2_apellido}`,
                    row.acto_o_contrato, row.abogado_redactor, row.n_agregado, UI.formatDate(row.created_at)
                ];
                cells = data.map(val => `<td>${val || ''}</td>`).join('');
            } else {
                cells = schema.dbReadFields
                    .filter((_, i) => !schema.hiddenColumns?.includes(i))
                    .map(f => {
                        let val = row[f];
                        if (f === 'fecha' || f === 'created_at') val = UI.formatDate(val);
                        return `<td>${val || ''}</td>`;
                    }).join('');
            }
            return `<tr>${cells}</tr>`;
        }).join('');

        const headers = schema.columnNames
            .filter((_, i) => !schema.hiddenColumns?.includes(i))
            .map(h => `<th>${h}</th>`).join('');

        const content = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Impresión</title>
                <style>
                    body, html { margin: 0; padding: 0; font-family: 'Arial', sans-serif; font-size: 11px; }
                    @page { margin: 0; size: landscape; }
                    .print-container { padding: 1.5cm; }
                    h2 { text-align: center; margin-bottom: 5px; font-size: 16px; text-transform: uppercase; }
                    .meta { text-align: right; font-size: 10px; color: #555; margin-bottom: 20px; border-bottom: 1px solid #ccc; padding-bottom: 5px; }
                    table { width: 100%; border-collapse: collapse; }
                    th, td { border: 1px solid #000; padding: 4px 6px; text-align: left; vertical-align: top; }
                    th { background-color: #f0f0f0; font-weight: bold; text-transform: uppercase; font-size: 10px; }
                    tr:nth-child(even) { background-color: #f9f9f9; }
                </style>
            </head>
            <body>
                <div class="print-container">
                    <h2>${schema.tableName}</h2>
                    <div class="meta">Fecha de emisión: ${new Date().toLocaleDateString('es-CL')} ${new Date().toLocaleTimeString('es-CL')}</div>
                    <table>
                        <thead><tr>${headers}</tr></thead>
                        <tbody>${tableRows}</tbody>
                    </table>
                </div>
                <script>window.onload = function() { window.print(); window.close(); };</script>
            </body>
            </html>
        `;

        let iframe = document.getElementById('print-iframe');
        if (!iframe) {
            iframe = document.createElement('iframe');
            iframe.id = 'print-iframe';
            iframe.style.position = 'absolute';
            iframe.style.width = '0';
            iframe.style.height = '0';
            iframe.style.border = 'none';
            document.body.appendChild(iframe);
        }

        const doc = iframe.contentWindow.document;
        doc.open();
        doc.write(content);
        doc.close();
    }
};