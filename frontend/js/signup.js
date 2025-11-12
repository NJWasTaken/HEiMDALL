document.addEventListener('DOMContentLoaded', () => {
    const signupForm = document.getElementById('signupForm');

    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        if (password !== confirmPassword) {
            alert("Passwords don't match!");
            return;
        }

        try {
            const response = await fetch('/api/signup', {
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
                const data = await response.json();
                alert(data.message || 'Error creating account');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('An error occurred during signup');
        }
    });
});