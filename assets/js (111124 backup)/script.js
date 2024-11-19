// Validate login credentials
function validateLogin() {
    const usernameInput = document.getElementById('username').value;
    const passwordInput = document.getElementById('password').value;

    // Check if credentials match
    if (usernameInput === 'admin' && passwordInput === 'Router') {
        // Save login status
        localStorage.setItem('loggedInUser', usernameInput);

        // Redirect to index.html
        window.location.href = 'index.html';
        return false; // Prevent default form submission
    } else {
        // Display error message
        document.getElementById('error-message').style.display = 'block';
        return false; // Prevent form submission
    }
}

// Function to display username on index.html
function displayUsername() {
    const username = localStorage.getItem('loggedInUser');
    if (username) {
        document.getElementById('username-display').textContent = username;
    } else {
        window.location.href = 'login.html'; // Redirect to login if not logged in
    }
}

// Logout function to clear login data and redirect to login.html
function logout() {
    localStorage.removeItem('loggedInUser');
    window.location.href = 'login.html';
}

// Initialize dropdown with saved agencies on index.html page load
function initializeAgencies() {
    const agencies = JSON.parse(localStorage.getItem('agencies') || '[]');
    const agencyDropdown = document.getElementById('agency');
    agencies.forEach(agency => {
        const option = document.createElement('option');
        option.value = agency;
        option.textContent = agency;
        agencyDropdown.insertBefore(option, agencyDropdown.querySelector('option[value="create-new"]'));
    });
}

// Check for "Create New Agency" selection in index.html
function checkNewAgency() {
    const agencyDropdown = document.getElementById('agency');
    if (agencyDropdown.value === 'create-new') {
        openModal();
    }
}

// Open and Close Modal Functions
function openModal() {
    document.getElementById('new-agency-modal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('new-agency-modal').style.display = 'none';
    document.getElementById('agency').value = ''; // Reset dropdown
}

// Save New Agency to LocalStorage and Update Dropdown
function saveNewAgency() {
    const newAgencyName = document.getElementById('newAgencyName').value.trim();
    if (newAgencyName) {
        let agencies = JSON.parse(localStorage.getItem('agencies') || '[]');
        agencies.push(newAgencyName);
        localStorage.setItem('agencies', JSON.stringify(agencies));

        // Add new agency to dropdown
        const agencyDropdown = document.getElementById('agency');
        const newOption = document.createElement('option');
        newOption.value = newAgencyName;
        newOption.textContent = newAgencyName;
        agencyDropdown.insertBefore(newOption, agencyDropdown.querySelector('option[value="create-new"]'));

        closeModal();
    }
}

// Create Project Function in index.html
function createProject() {
    const city = document.getElementById('city').value;
    const agency = document.getElementById('agency').value;
    const projectName = document.getElementById('projectName').value;

    if (projectName === '') {
        alert('Please enter a project name.');
        return;
    }

    // Save data to localStorage
    localStorage.setItem('city', city);
    localStorage.setItem('agency', agency);
    localStorage.setItem('projectName', projectName);

    // Redirect to map page
    window.location.href = 'map.html';
}

// Run displayUsername if on index.html
if (document.getElementById('username-display')) {
    displayUsername();
}

// Initialize agencies on page load for index.html
if (document.getElementById('agency')) {
    initializeAgencies();
}
