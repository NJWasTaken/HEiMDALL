document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const loginError = document.getElementById('loginError');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');

    const showError = (msg) => {
        if (!loginError) {
            // fallback to alert if the element is missing
            alert(msg);
            return;
        }
        loginError.textContent = msg;
        loginError.classList.remove('hidden');
        // return focus to the username field so user can retry typing
        usernameInput.focus();
        // hide after a short delay
        clearTimeout(window.__loginErrorTimer);
        window.__loginErrorTimer = setTimeout(() => {
            loginError.classList.add('hidden');
        }, 3000);
    };

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = usernameInput.value;
        const password = passwordInput.value;

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            if (response.ok) {
                localStorage.setItem('isLoggedIn', 'true');
                window.location.href = '/profiles.html';
            } else {
                showError('Invalid username or password');
            }
        } catch (error) {
            console.error('Error:', error);
            showError('An error occurred during login');
        }
    });
});