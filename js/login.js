// actualizado
// --- PASO 1: Configuración de Supabase ---
const SUPABASE_URL = 'https://itnjnoqcppkvzqlbmyrq.supabase.co'; // TODO: Reemplaza si es necesario
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0bmpub3FjcHBrdnpxbGJteXJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1ODczODEsImV4cCI6MjA3NzE2MzM4MX0.HP2ChKbP4O5YWu73I6UYgLoH2O80rMcJiWdZRSTYrV8'; // TODO: Reemplaza si es necesario

if (SUPABASE_URL === 'TU_SUPABASE_URL' || !SUPABASE_URL) {
    console.warn('¡Atención! Debes configurar tus claves de Supabase en login.js y app.js');
    alert('Error: Claves de Supabase no configuradas en login.js');
}

// --- Lógica de la página de Login ---
document.addEventListener('DOMContentLoaded', () => {
    
    // Inicializa Supabase
    if (!window.supabase) {
        alert("Error crítico: La librería de Supabase no se cargó.");
        return;
    }
    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    const btnLogin = document.getElementById('btn-login');
    const btnGuest = document.getElementById('btn-guest');
    const emailEl = document.getElementById('email');
    const passwordEl = document.getElementById('password');
    const errorMessageContainer = document.getElementById('error-message');
    const errorText = document.getElementById('error-text');

    // 1. Iniciar Sesión como Admin
    btnLogin.addEventListener('click', async () => {
        const email = emailEl.value;
        const password = passwordEl.value;

        // Limpiar errores previos
        showError(null);

        if (!email || !password) {
            showError("Por favor, ingrese email y contraseña.");
            return;
        }

        // Estado de carga
        const originalText = btnLogin.textContent;
        btnLogin.innerHTML = `<svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Ingresando...`;
        btnLogin.disabled = true;

        const { data, error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) {
            console.error('Error de login completo:', error);
            
            const msg = (error.message || '').toLowerCase();
            let userMessage = 'Ocurrió un error al iniciar sesión.';
            
            if (msg.includes('invalid login credentials') || msg.includes('invalid login')) {
                userMessage = 'Correo o contraseña incorrectos.';
            } else if (msg.includes('email not confirmed')) {
                userMessage = 'El correo electrónico no ha sido confirmado.';
            } else if (msg.includes('too many requests')) {
                userMessage = 'Demasiados intentos. Intente más tarde.';
            } else if (error.message) {
                userMessage = `Error: ${error.message}`; 
            }

            showError(userMessage);
            
            // Restaurar botón
            btnLogin.innerHTML = "Iniciar Sesión (Admin)";
            btnLogin.disabled = false;
        } else {
            // ¡Éxito! Redirige a la app de admin
            window.location.href = 'app.html';
        }
    });

    // 2. Entrar como Invitado
    btnGuest.addEventListener('click', () => {
        window.location.href = 'invitado.html';
    });

    // Función para mostrar/ocultar errores con estilo robusto
    function showError(message) {
        if (message) {
            if (errorText) errorText.textContent = message;
            if (errorMessageContainer) {
                // CAMBIO: Forzar visibilidad anulando estilo inline y clases hidden
                errorMessageContainer.classList.remove('hidden');
                errorMessageContainer.style.display = 'flex'; 
                
                // Animación simple de entrada
                errorMessageContainer.classList.add('animate-pulse');
                setTimeout(() => errorMessageContainer.classList.remove('animate-pulse'), 500);
            } else {
                alert(message);
            }
        } else {
            if (errorMessageContainer) {
                errorMessageContainer.classList.add('hidden');
                errorMessageContainer.style.display = 'none'; // Re-ocultar forzosamente
            }
            if (errorText) errorText.textContent = '';
        }
    }
    
    // Permitir "Enter" para enviar
    if (passwordEl) {
        passwordEl.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') btnLogin.click();
        });
    }
});