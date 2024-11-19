// Initialize agencies if dropdown is present
if (document.getElementById('agency')) {
    initializeAgencies();
}

function fetchUserData() {
    console.log("Running fetchUserData...");

    const username = localStorage.getItem('loggedInUser');
    if (!username) {
        console.warn("No logged-in user found in localStorage. Redirecting to login page.");
        window.location.href = 'login.html';
        return;
    }

    const transaction = dbInstance.transaction('users', 'readonly');
    const store = transaction.objectStore('users');
    const request = store.get(username);

    request.onsuccess = () => {
        const user = request.result;
        if (user) {
            console.log("User data fetched successfully:", user);
            document.getElementById('username-display').textContent = user.username;
        } else {
            console.warn("User not found in IndexedDB. Redirecting to login page.");
            window.location.href = 'login.html';
        }
    };

    request.onerror = (event) => {
        console.error("Failed to fetch user data:", event.target.error);
        alert("Error fetching user data. Please try again.");
        window.location.href = 'login.html';
    };
}

// Use the globally initialized dbInstance
document.addEventListener("indexedDBReady", () => {
    console.log("IndexedDB is ready. Checking session...");

    setTimeout(() => {
        const loggedInUser = localStorage.getItem('loggedInUser');
        console.log("Session check - loggedInUser:", loggedInUser);

        if (!loggedInUser) {
            console.warn("No logged-in user found in localStorage. Redirecting to login page.");
            window.location.href = "login.html";
        } else {
            // Verify user data in IndexedDB
            fetchUser(loggedInUser, (user) => {
                if (user) {
                    console.log("User data found in IndexedDB:", user);
                    displayUsername();
                } else {
                    console.warn("User data not found in IndexedDB. Redirecting to login page.");
                    window.location.href = "login.html";
                }
            });
        }
    }, 1000);

    // Display username on index.html
    function displayUsername() {
        console.log("Running displayUsername function...");
        try {
            const transaction = dbInstance.transaction('users', 'readonly');
            const store = transaction.objectStore('users');
            const request = store.get(localStorage.getItem('loggedInUser'));

            request.onsuccess = () => {
                const user = request.result;
                if (user) {
                    document.getElementById('username-display').textContent = user.username;
                    console.log("Username displayed:", user.username);
                } else {
                    console.warn("User data not found. Redirecting to login page.");
                    window.location.href = 'login.html';
                }
            };

            request.onerror = (event) => {
                console.error("Failed to fetch user data:", event.target.error);
                alert("Error fetching user data. Please try again.");
                window.location.href = 'login.html';
            };
        } catch (error) {
            console.error("Error in displayUsername function:", error);
            alert("An unexpected error occurred. Please try again.");
            window.location.href = 'login.html';
        }
    }

    // Attach event listeners for project creation
    document.getElementById('createProjectBtn')?.addEventListener('click', createProject);

    // Initialize agencies if dropdown is present
    if (document.getElementById('agency')) {
        initializeAgencies();
    }

    // Fetch user data for display if on index.html
    if (document.getElementById('username-display')) {
        fetchUserData();
    }
});

// Add this function at the end of script.js, before the DOMContentLoaded event listener.

function initializeAgencies() {
    console.log("Initializing agencies...");

    if (!dbInstance) {
        console.error("Database instance is not ready. Retrying...");
        setTimeout(initializeAgencies, 500); // Retry after 500ms
        return;
    }

    const agencySelect = document.getElementById("agency");
    if (!agencySelect) {
        console.error("Agency dropdown not found.");
        return;
    }

    agencySelect.innerHTML = ""; // Clear existing options

    const createOption = document.createElement("option");
    createOption.value = "create-new";
    createOption.textContent = "Create New Agency";
    agencySelect.appendChild(createOption);

    // Fetch agencies from IndexedDB
    try {
        const transaction = dbInstance.transaction("agencies", "readonly");
        const store = transaction.objectStore("agencies");
        const request = store.getAll();

        request.onsuccess = () => {
            const agencies = request.result;
            agencies.forEach((agency) => {
                const option = document.createElement("option");
                option.value = agency.name;
                option.textContent = agency.name;
                agencySelect.appendChild(option);
            });
            console.log("Agencies initialized successfully.");
        };

        request.onerror = (event) => {
            console.error("Failed to fetch agencies:", event.target.error);
            alert("Error fetching agency data. Please try again.");
        };
    } catch (error) {
        console.error("Transaction error:", error);
    }
}

// Wait for IndexedDB to be ready
document.addEventListener("indexedDBReady", () => {
    console.log("IndexedDB is ready. You can now create a project.");
});

// Create Project using IndexedDB
function createProject() {
    // Check if IndexedDB is ready
    if (!dbInstance) {
        alert("Failed to open the database. Please try again.");
        return;
    }

    const city = document.getElementById("city").value;
    const agency = document.getElementById("agency").value;
    const projectName = document.getElementById("projectName").value;

    if (!projectName) {
        alert("Please enter a project name.");
        return;
    }

    const projectData = {
        projectName,
        city,
        agency,
        routes: [],
        stops: [],
    };

    try {
        const transaction = dbInstance.transaction("projects", "readwrite");
        const store = transaction.objectStore("projects");

        const request = store.put(projectData);

        request.onsuccess = () => {
            console.log("Project saved successfully:", projectData);
            window.location.href = `map.html?project=${encodeURIComponent(projectName)}`;
        };

        request.onerror = (event) => {
            console.error("Error saving project:", event.target.error);
            alert("Error saving project. Please try again.");
        };
    } catch (error) {
        console.error("Transaction error:", error);
        alert("Failed to open the database.");
    }
}

// Ensure the function is called when the page loads.
document.addEventListener("DOMContentLoaded", () => {
    console.log("DOM content loaded. Initializing index page...");

    if (document.getElementById("agency")) {
        initializeAgencies();
    }
});