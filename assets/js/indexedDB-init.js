const dbVersion = 3; // Incremented version to force schema upgrade
let dbInstance = null;
window.db = dbInstance;

// Initialize IndexedDB
function initializeIndexedDB() {
    const dbRequest = indexedDB.open("routerDB", dbVersion);

    dbRequest.onerror = (event) => {
        console.error("Error opening IndexedDB:", event.target.error);
        alert("Unable to access IndexedDB. Please clear your browser's IndexedDB data and try again.");
    };

    dbRequest.onupgradeneeded = (event) => {
        const db = event.target.result;
        console.log("Upgrade needed. Current database version:", event.oldVersion);

        // Define all necessary object stores
        const objectStores = [
            { name: "users", keyPath: "username" },
            { name: "agencies", keyPath: "name" },
            { name: "projects", keyPath: "projectName" },
            { name: "busStops", keyPath: "stop_id" },
            { name: "routes", keyPath: "routeName" },
            { name: "stopTimes", keyPath: "trip_id" },
            { name: "shapes", keyPath: "shape_id" }
        ];

        // Iterate through the list of object stores to create if not already existing
        objectStores.forEach(({ name, keyPath }) => {
            if (!db.objectStoreNames.contains(name)) {
                const objectStore = db.createObjectStore(name, { keyPath });
                console.log(`Created '${name}' object store.`);

                // Add indexes if needed, e.g., for querying routes or shapes
                if (name === "shapes") {
                    objectStore.createIndex("shape_id", "shape_id", { unique: true });
                } else if (name === "routes") {
                    objectStore.createIndex("routeName", "routeName", { unique: true });
                    objectStore.createIndex("routeType", "routeType", { unique: false });
                }

                console.log(`Indexes created for '${name}' if applicable.`);
            } else {
                console.log(`Object store '${name}' already exists.`);
            }
        });

        console.log("All necessary object stores have been created or verified.");
    };

    dbRequest.onsuccess = (event) => {
        console.log("IndexedDB initialized successfully.");
        dbInstance = event.target.result;
        window.db = dbInstance;  // Properly assign dbInstance to window.db for global usage
        document.dispatchEvent(new Event("indexedDBReady"));

        // Log existing object stores
        const storeNames = Array.from(dbInstance.objectStoreNames);
        console.log("Available object stores:", storeNames);
    };

    dbRequest.onblocked = () => {
        console.error("IndexedDB open request was blocked.");
        alert("Please close other tabs with this application open and try again.");
    };
}

// Save user data to IndexedDB
function saveUser(user, callback) {
    if (!dbInstance) {
        console.error("IndexedDB is not initialized. Cannot save user.");
        return;
    }

    const transaction = dbInstance.transaction('users', 'readwrite');
    const store = transaction.objectStore('users');
    const request = store.put(user);

    request.onsuccess = () => {
        console.log("User data saved successfully:", user);
        if (callback) callback();
    };

    request.onerror = (event) => {
        console.error("Failed to save user data:", event.target.error);
        alert("Error saving user data. Please try again.");
    };
}

// Fetch user data from IndexedDB
function fetchUser(username, callback) {
    if (!dbInstance) {
        console.error("IndexedDB is not initialized. Cannot fetch user.");
        return;
    }

    const transaction = dbInstance.transaction('users', 'readonly');
    const store = transaction.objectStore('users');
    const request = store.get(username);

    request.onsuccess = () => {
        console.log("User data fetched successfully:", request.result);
        callback(request.result);
    };

    request.onerror = (event) => {
        console.error("Failed to fetch user data:", event.target.error);
        alert("Error fetching user data. Please try again.");
    };
}

// Check if user is logged in
function checkUserSession() {
    const loggedInUser = localStorage.getItem('loggedInUser');
    console.log("Checking user session:", loggedInUser);

    if (!loggedInUser) {
        window.location.href = "login.html";
    } else {
        console.log("User session found:", loggedInUser);
    }
}

function refreshRoutesFromDB() {
    const request = indexedDB.open("routerDB", 3);
    
    request.onsuccess = (event) => {
        const db = event.target.result;
        const transaction = db.transaction(["routes"], "readonly");
        const store = transaction.objectStore("routes");
        
        store.getAll().onsuccess = (event) => {
            const savedRoutes = event.target.result;

            if (savedRoutes && savedRoutes.length > 0) {
                // Call existing function to update the sidebar
                updateMainSidebar(savedRoutes);
            } else {
                console.error("No routes found in IndexedDB.");
            }
        };
    };

    request.onerror = () => {
        console.error("Failed to open IndexedDB for refreshing routes.");
    };
}

// Attach functions to the global window object
window.initializeIndexedDB = initializeIndexedDB;
window.saveUser = saveUser;
window.fetchUser = fetchUser;
window.checkUserSession = checkUserSession;

// Initialize IndexedDB when the script is loaded
initializeIndexedDB();