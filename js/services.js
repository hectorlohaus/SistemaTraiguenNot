// 1
// js/services.js
// Lógica de negocio: Datos (Supabase) y Exportación (PDF/Excel/Print)

// --- MÓDULO: Servicios de Datos ---
const DataService = {
    async loadData(filtro = '') {
        const schema = SCHEMAS[State.currentTable];
        const from = (State.currentPage - 1) * CONFIG.RECORDS_PER_PAGE;
        const to = from + CONFIG.RECORDS_PER_PAGE - 1;
        
        let query = State.supabase.from(State.currentTable);
        let countQuery = query.select('*', { count: 'exact', head: true });
        let dataQuery = query.select(schema.dbReadFields.join(',')).order('id', { ascending: false }).range(from, to);
        
        if (filtro && schema.filterColumns.length > 0) {
            const filtroQuery = schema.filterColumns.map(col => `${col}.ilike.%${filtro}%`).join(',');
            countQuery = countQuery.or(filtroQuery); 
            dataQuery = dataQuery.or(filtroQuery);
        }
        
        const { data, error } = await dataQuery;
        const { count, error: countError } = await countQuery;
        
        if (error || countError) throw new Error((error || countError).message);
        return { data, count };
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
        if(data && data.length > 0) {
            const parts = data[0].n_rep.split('-');
            if(parts[0] && !isNaN(parseInt(parts[0]))) next = parseInt(parts[0]) + 1;
        }
        return `${next < 10 ? '0'+next : next}-${year}`;
    },

    async getAllRecordsForExport(isCierreDia, monthFilter = null) {
        const schema = SCHEMAS[State.currentTable];
        let query = State.supabase.from(State.currentTable).select(schema.dbReadFields.join(','));
        
        if (isCierreDia) {
            const today = new Date().toISOString().split('T')[0];
            query = query.eq('fecha', today);
        } else if (monthFilter) {
            const [year, month] = monthFilter.split('-');
            const startDate = `${year}-${month}-01`;
            const lastDay = new Date(year, month, 0).getDate();
            const endDate = `${year}-${month}-${lastDay}`;
            
            query = query.gte('fecha', startDate).lte('fecha', endDate);
        }
        
        query = query.order('id', { ascending: false });
        
        const { data, error } = await query;
        if (error) throw error;
        return data;
    },

    async getRecordsForIndice(startDate, endDate) {
        return await State.supabase
            .from('repertorio_instrumentos')
            .select('n_rep, fecha, contratante_1_nombre, contratante_1_apellido, contratante_2_nombre, contratante_2_apellido, acto_o_contrato')
            .gte('fecha', startDate)
            .lte('fecha', endDate)
            .order('contratante_1_apellido', { ascending: true });
    }
};

// --- MÓDULO: Exportación ---
const ExportService = {
    async generatePDF(isCierreDia) {
        if (typeof window.jspdf === 'undefined') { UI.showError("Librerías cargando..."); return; }
        
        let registros = [];
        const schema = SCHEMAS[State.currentTable];

        UI.showLoading(true);
        try {
            if (isCierreDia) {
                const data = await DataService.getAllRecordsForExport(true);
                if (!data || data.length === 0) throw new Error("No hay registros hoy.");
                registros = data;
            } else {
                registros = this.getSelectedData();
            }
        } catch(e) { UI.showError(e.message); UI.showLoading(false); return; }
        UI.showLoading(false);

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
        const title = isCierreDia ? `CIERRE DE DÍA - ${schema.tableName}` : schema.tableName;
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
                doc.setFontSize(10); doc.text(todayStr, 280, 15, { align: 'right' });
            }
        });

        if (doc.lastAutoTable.finalY > 170) doc.addPage();
        const min = registros.length > 0 ? (registros[registros.length-1].n_rep || registros[registros.length-1].id) : '?';
        const max = registros.length > 0 ? (registros[0].n_rep || registros[0].id) : '?';
        
        doc.setFontSize(11);
        doc.text(`Certifico que hoy se realizaron ${registros.length} anotaciones (del ${min} al ${max}).`, 15, doc.lastAutoTable.finalY + 15);
        doc.text("_______________________", 150, doc.lastAutoTable.finalY + 30);
        doc.text("Firma Responsable", 165, doc.lastAutoTable.finalY + 35, { align: 'center' });

        doc.save(`Reporte_${new Date().getTime()}.pdf`);
    },

    async generateExcel(isFullExport, monthFilter = null) {
        let registros = [];
        UI.showLoading(true);
        try {
            if (isFullExport) {
                registros = await DataService.getAllRecordsForExport(false, monthFilter);
            } else {
                registros = this.getSelectedData();
            }
        } catch(e) { UI.showError(e.message); UI.showLoading(false); return; }
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
        const mesAnio = prompt("Ingrese MM-AAAA:", new Date().toLocaleDateString('es-CL', {month:'2-digit', year:'numeric'}).replace('/', '-'));
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

    getSelectedData() {
        const r = [];
        document.querySelectorAll('.row-checkbox:checked').forEach(c => r.push(JSON.parse(c.dataset.registro)));
        if (r.length === 0) throw new Error('Seleccione registros.');
        return r;
    },

    generatePrint() {
        let registros = [];
        try {
            registros = this.getSelectedData();
        } catch (e) {
            UI.showError(e.message);
            return;
        }

        if (!registros || registros.length === 0) return;

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
                    /* Reset básico */
                    body, html { margin: 0; padding: 0; font-family: 'Arial', sans-serif; font-size: 11px; }
                    
                    /* TRUCO: Ocultar encabezados/pies del navegador con margin 0 */
                    @page { 
                        margin: 0; 
                        size: landscape; 
                    }
                    
                    /* Contenedor principal con margen manual */
                    .print-container {
                        padding: 1.5cm; /* Margen visual para el contenido */
                    }
                    
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
                <script>
                    window.onload = function() { window.print(); window.close(); };
                </script>
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