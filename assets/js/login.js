// Check if login.js is loaded
console.log('login.js loaded');

// Validate login credentials
function validateLogin(event) {
    event.preventDefault();
    const usernameInput = document.getElementById('username').value;
    const passwordInput = document.getElementById('password').value;

    if (usernameInput === 'admin' && passwordInput === 'Router') {
        console.log("Login successful. Saving user session...");

        // Save to localStorage
        localStorage.setItem('loggedInUser', usernameInput);
        console.log("Logged-in user saved in localStorage:", usernameInput);

        // Save user data in IndexedDB
        saveUser({ username: usernameInput }, () => {
            console.log("User data saved in IndexedDB. Redirecting to index.html...");
            window.location.href = 'index.html';
        });
    } else {
        console.warn("Invalid login credentials.");
        document.getElementById('error-message').style.display = 'block';
    }
}

// Attach the validateLogin function to the login button click event
document.addEventListener("DOMContentLoaded", () => {
    console.log("DOM content loaded. Attaching event listener to login button.");
    const loginButton = document.querySelector(".login-button");
    if (loginButton) {
        console.log("Login button found. Attaching click event listener.");
        loginButton.addEventListener('click', validateLogin);
    } else {
        console.error("Login button not found. Check your HTML structure.");
    }
});