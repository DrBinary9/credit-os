// Role toggle styling for login page
const roleInputs = document.querySelectorAll('input[name="role"]');
roleInputs.forEach(input => {
    input.addEventListener('change', () => {
        const usernameInput = document.getElementById('username');
        if (input.value === 'admin') {
            usernameInput.value = 'admin';
        } else {
            usernameInput.value = 'user';
        }
        document.getElementById('password').value = '';
        document.getElementById('password').focus();
    });
});
