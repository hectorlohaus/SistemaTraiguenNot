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
    
    // CAMBIO: Inicializa Supabase AQUÍ, dentro de DOMContentLoaded
    if (!window.supabase) {
        alert("Error crítico: La librería de Supabase no se cargó.");
        return;
    }
    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    const btnLogin = document.getElementById('btn-login');
    const btnGuest = document.getElementById('btn-guest');
    const emailEl = document.getElementById('email');
    const passwordEl = document.getElementById('password');
    const errorEl = document.getElementById('error-message');

    // 1. Iniciar Sesión como Admin
    btnLogin.addEventListener('click', async () => {
        const email = emailEl.value;
        const password = passwordEl.value;

        if (!email || !password) {
            showError("Por favor, ingrese email y contraseña.");
            return;
        }

        btnLogin.textContent = "Ingresando...";
        btnLogin.disabled = true;

        const { data, error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) {
            showError('Error: ' + error.message);
            btnLogin.textContent = "Iniciar Sesión (Admin)";
            btnLogin.disabled = false;
        } else {
            // ¡Éxito! Redirige a la app de admin
            window.location.href = 'app.html';
        }
    });

    // 2. Entrar como Invitado
    btnGuest.addEventListener('click', () => {
        // Redirige a la app de invitado
        window.location.href = 'invitado.html';
    });

    function showError(message) {
        errorEl.textContent = message;
        errorEl.classList.remove('hidden');
    }
});

