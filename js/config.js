
const CONFIG = {
    SUPABASE_URL: 'https://itnjnoqcppkvzqlbmyrq.supabase.co', 
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0bmpub3FjcHBrdnpxbGJteXJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1ODczODEsImV4cCI6MjA3NzE2MzM4MX0.HP2ChKbP4O5YWu73I6UYgLoH2O80rMcJiWdZRSTYrV8', // Reemplaza con tu Key
    RECORDS_PER_PAGE: 20
};

const SCHEMAS = {
    'repertorio_instrumentos': { 
        tableName: 'Repertorio de Instrumentos Públicos',
        dbReadFields: ['id', 'fecha', 'n_rep', 'contratante_1_nombre', 'contratante_1_apellido', 'contratante_2_nombre', 'contratante_2_apellido', 'acto_o_contrato', 'abogado_redactor', 'n_agregado', 'created_at'],
        columnNames: ['ID', 'Fecha', 'N° Rep', 'Contratante 1', 'Contratante 2', 'Acto o Contrato', 'Abogado Redactor', 'N° Agregado', 'Terminado'], 
        hiddenColumns: [0], 
        formFields: [
            { id: 'fecha', label: 'Fecha', type: 'date', span: 1, required: true },
            { id: 'n_rep', label: 'N° Repertorio (Auto)', type: 'text', span: 1, required: true, placeholder: 'Calculando...' },
            { id: 'acto_o_contrato', label: 'Acto o Contrato', type: 'datalist', span: 2, required: true, options: ['Compraventa', 'Mandato General', 'Mandato Especial', 'Promesa de Compraventa', 'Arrendamiento', 'Testamento', 'Declaración Jurada'] },
            
            { id: 'contratante_1_nombre', label: 'Nombre Contratante 1', type: 'text', span: 1, required: true },
            { id: 'contratante_1_apellido', label: 'Apellido Contratante 1', type: 'text', span: 1, required: true },
            
            { id: 'contratante_2_nombre', label: 'Nombre Contratante 2', type: 'text', span: 1, required: true },
            { id: 'contratante_2_apellido', label: 'Apellido Contratante 2', type: 'text', span: 1, required: true },
            
            { id: 'abogado_redactor', label: 'Abogado Redactor', type: 'text', span: 2, required: true },
            { id: 'n_agregado', label: 'N° Agregado', type: 'text', span: 2, required: false }
        ],
        filterColumns: ['n_rep', 'contratante_1_nombre', 'contratante_1_apellido', 'contratante_2_nombre', 'contratante_2_apellido', 'acto_o_contrato', 'abogado_redactor']
    },
    'repertorio_conservador': { 
        tableName: 'Repertorio Conservador',
        dbReadFields: ['id', 'interesado', 'acto_o_contrato', 'clase_inscripcion', 'hora', 'fecha', 'numero_inscripcion', 'registro_parcial', 'observaciones', 'created_at'],
        columnNames: ['Número', 'Interesado', 'Acto o Contrato', 'Clase Inscripción', 'Hora', 'Fecha', 'N° Inscripción', 'Registro Parcial', 'Observaciones', 'Ingresado'],
        formFields: [
            { id: 'interesado', label: 'Interesado', type: 'text', span: 2, required: true },
            { id: 'acto_o_contrato', label: 'Acto o Contrato', type: 'datalist', span: 2, required: true, options: ['Constitución de Sociedad', 'Modificación de Sociedad', 'Disolución', 'Poder', 'Saneamiento'] },
            
            { id: 'clase_inscripcion', label: 'Clase Inscripción', type: 'text', span: 2, required: true },
            { id: 'registro_parcial', label: 'Registro Parcial', type: 'text', span: 2, required: true },
            
            { id: 'fecha', label: 'Fecha', type: 'date', span: 1, required: true },
            { id: 'hora', label: 'Hora', type: 'time', span: 1, required: true },
            { id: 'numero_inscripcion', label: 'N° Inscripción', type: 'text', span: 2, required: true },
            { id: 'observaciones', label: 'Observaciones', type: 'textarea', span: 4, required: false }
        ],
        filterColumns: ['interesado', 'acto_o_contrato', 'clase_inscripcion', 'numero_inscripcion']
    }
};