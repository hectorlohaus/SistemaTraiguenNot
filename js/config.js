// 1
// js/config.js
const CONFIG = {
    SUPABASE_URL: 'https://itnjnoqcppkvzqlbmyrq.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0bmpub3FjcHBrdnpxbGJteXJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1ODczODEsImV4cCI6MjA3NzE2MzM4MX0.HP2ChKbP4O5YWu73I6UYgLoH2O80rMcJiWdZRSTYrV8',
    RECORDS_PER_PAGE: 20
};

const SCHEMAS = {
    'repertorio_instrumentos': {
        tableName: 'Repertorio de Instrumentos Públicos',
        dbReadFields: ['id', 'fecha', 'n_rep', 'contratante_1_nombre', 'contratante_1_apellido', 'contratante_2_nombre', 'contratante_2_apellido', 'acto_o_contrato', 'abogado_redactor', 'n_agregado', 'created_at'],
        columnNames: ['ID', 'Fecha', 'N° Rep', 'Contratante 1', 'Contratante 2', 'Acto o Contrato', 'Abogado Redactor', 'N° Agregado', 'Terminado'],

        sortMap: [
            'id', 'fecha', 'n_rep', 'contratante_1_apellido', 'contratante_2_apellido', 'acto_o_contrato', 'abogado_redactor', 'n_agregado', 'created_at'
        ],

        hiddenColumns: [0],
        formFields: [
            { id: 'fecha', label: 'Fecha', type: 'date', span: 1, required: true },
            { id: 'n_rep', label: 'N° Repertorio (Auto)', type: 'text', span: 1, required: true, placeholder: 'Calculando...' },
            { id: 'acto_o_contrato', label: 'Acto o Contrato', type: 'datalist', span: 2, required: true, options: ['Adjudicación', 'Alzamiento Derecho Real de Uso', 'Alzamiento de Hipoteca', 'Alzamiento Serviu', 'Alzamiento Usufructo', 'Arriendo', 'Arriendo con promesa de compraventa', 'Cancelación de deuda', 'Cesión de Derechos', 'Comodato', 'Compraventa', 'Compraventa Derechos de agua', 'Compraventa con hipoteca', 'Compraventa y Mutuo', 'Constitución de Corporación', 'Constitución de EIRL', 'Constitución de Fundación', 'Constitución de Persona Jurídica Religiosa', 'Constitución de Prohibición', 'Constitución de Servidumbre', 'Constitución de Sociedad', 'Constitución de Usufructo', 'Constitución Derecho Real de Uso', 'Disolución de Sociedad Conyugal', 'Escritura de Complementación o Rectificación', 'Escritura de fusión de inmueble', 'Liquidación de Sociedad Conyugal', 'Mandato Especial', 'Mandato General', 'Mandato Judicial', 'Minuta de dominio', 'Modificación de Sociedad', 'Mutuo', 'Mutuo con hipoteca', 'Pacto de Indivisión', 'Partición', 'Permuta', 'Prenda sin desplazamiento', 'Promesa de Compraventa', 'Protocolización de documentos', 'Reconocimiento de deuda', 'Rectificación', 'Reducción a Escritura Pública de acta', 'Reducción de Sentencia', 'Reducción Reglamento de Copropiedad', 'Resciliación', 'Revocación de Mandato', 'Testamento', 'Transacción'] },
            { id: 'contratante_1_nombre', label: 'Nombre Contratante 1', type: 'text', span: 1, required: true },
            { id: 'contratante_1_apellido', label: 'Apellido Contratante 1', type: 'text', span: 1, required: true },
            { id: 'contratante_2_nombre', label: 'Nombre Contratante 2', type: 'text', span: 1, },
            { id: 'contratante_2_apellido', label: 'Apellido Contratante 2', type: 'text', span: 1, },
            { id: 'abogado_redactor', label: 'Abogado Redactor', type: 'text', span: 2, required: true },
            { id: 'n_agregado', label: 'N° Agregado', type: 'text', span: 2, required: false }
        ],
        filterColumns: ['n_rep', 'contratante_1_nombre', 'contratante_1_apellido', 'contratante_2_nombre', 'contratante_2_apellido', 'acto_o_contrato', 'abogado_redactor'],

        // CAMBIO: Fechas desde/hasta
        advancedSearch: [
            { id: 'n_rep', label: 'N° Repertorio', type: 'text' },
            { id: 'fecha_desde', label: 'Fecha Desde', type: 'date' },
            { id: 'fecha_hasta', label: 'Fecha Hasta', type: 'date' },
            { id: 'contratante_1_apellido', label: 'Apellido Contratante 1', type: 'text' },
            { id: 'contratante_1_nombre', label: 'Nombre Contratante 1', type: 'text' },
            { id: 'contratante_2_apellido', label: 'Apellido Contratante 2', type: 'text' },
            { id: 'contratante_2_nombre', label: 'Nombre Contratante 2', type: 'text' },
            { id: 'acto_o_contrato', label: 'Acto o Contrato', type: 'text' },
            { id: 'abogado_redactor', label: 'Abogado Redactor', type: 'text' }
        ]
    },
    'repertorio_conservador': {
        tableName: 'Repertorio Conservador',
        dbReadFields: ['id', 'interesado', 'acto_o_contrato', 'clase_inscripcion', 'hora', 'fecha', 'numero_inscripcion', 'registro_parcial', 'observaciones', 'created_at'],
        columnNames: ['Número', 'Interesado', 'Acto o Contrato', 'Clase Inscripción', 'Hora', 'Fecha', 'N° Inscripción', 'Registro Parcial', 'Observaciones', 'Ingresado'],

        sortMap: ['id', 'interesado', 'acto_o_contrato', 'clase_inscripcion', 'hora', 'fecha', 'numero_inscripcion', 'registro_parcial', 'observaciones', 'created_at'],

        formFields: [
            { id: 'interesado', label: 'Interesado', type: 'text', span: 2, required: true },
            { id: 'acto_o_contrato', label: 'Acto o Contrato', type: 'datalist', span: 2, required: true, options: ['Adjudicación', 'Alzamiento Derecho Real de Uso', 'Alzamiento de Hipoteca', 'Alzamiento Serviu', 'Alzamiento Usufructo', 'Arriendo', 'Arriendo con promesa de compraventa', 'Cancelación de deuda', 'Cesión de Derechos', 'Comodato', 'Compraventa', 'Compraventa Derechos de agua', 'Compraventa con hipoteca', 'Compraventa y Mutuo', 'Constitución de Corporación', 'Constitución de EIRL', 'Constitución de Fundación', 'Constitución de Persona Jurídica Religiosa', 'Constitución de Prohibición', 'Constitución de Servidumbre', 'Constitución de Sociedad', 'Constitución de Usufructo', 'Constitución Derecho Real de Uso', 'Disolución de Sociedad Conyugal', 'Escritura de Complementación o Rectificación', 'Escritura de fusión de inmueble', 'Liquidación de Sociedad Conyugal', 'Mandato Especial', 'Mandato General', 'Mandato Judicial', 'Minuta de dominio', 'Modificación de Sociedad', 'Mutuo', 'Mutuo con hipoteca', 'Pacto de Indivisión', 'Partición', 'Permuta', 'Prenda sin desplazamiento', 'Promesa de Compraventa', 'Protocolización de documentos', 'Reconocimiento de deuda', 'Rectificación', 'Reducción a Escritura Pública de acta', 'Reducción de Sentencia', 'Reducción Reglamento de Copropiedad', 'Resciliación', 'Revocación de Mandato', 'Testamento', 'Transacción'] },
            { id: 'clase_inscripcion', label: 'Clase Inscripción', type: 'text', span: 2, required: true },
            { id: 'registro_parcial', label: 'Registro Parcial', type: 'datalist', span: 2, required: true, options: ['Registro de Propiedad', 'Registro de Hipotecas y Gravamenes', 'Registro de Interdicciones y Prohibiciones', 'Registro de Comercio', 'Registro de Aguas'] },
            { id: 'fecha', label: 'Fecha', type: 'date', span: 1, required: true },
            { id: 'hora', label: 'Hora', type: 'time', span: 1, required: true },
            { id: 'numero_inscripcion', label: 'N° Inscripción (Auto)', type: 'text', span: 2, required: true, placeholder: 'Calculando...' },
            { id: 'observaciones', label: 'Observaciones', type: 'textarea', span: 4, required: false }
        ],
        filterColumns: ['interesado', 'acto_o_contrato', 'clase_inscripcion', 'numero_inscripcion'],

        // CAMBIO: Fechas desde/hasta
        advancedSearch: [
            { id: 'interesado', label: 'Interesado', type: 'text' },
            { id: 'fecha_desde', label: 'Fecha Desde', type: 'date' },
            { id: 'fecha_hasta', label: 'Fecha Hasta', type: 'date' },
            { id: 'numero_inscripcion', label: 'N° Inscripción', type: 'text' },
            { id: 'acto_o_contrato', label: 'Acto o Contrato', type: 'text' },
            { id: 'clase_inscripcion', label: 'Clase Inscripción', type: 'text' }
        ]
    }
};