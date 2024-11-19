// Ensure map initialization after the entire page is loaded
window.addEventListener("load", () => {
    if (!window.map || !(window.map instanceof L.Map)) {
        console.log("Initializing map...");
        try {
            window.map = L.map('map').setView([40.7128, -74.0060], 13);

            // Set up the tile layer
            L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
                attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
                subdomains: "abcd",
                maxZoom: 19,
            }).addTo(window.map);
            console.log("Tile layer added.");

            // Initialize bus stop layer group
            if (!window.busStopLayerGroup || !(window.busStopLayerGroup instanceof L.LayerGroup)) {
                window.busStopLayerGroup = L.layerGroup().addTo(window.map);
                console.log("Initialized busStopLayerGroup.");
            }

            // Dispatch custom event when map is fully initialized
            document.dispatchEvent(new Event("mapInitialized"));
            console.log("Map initialization completed.");

        } catch (error) {
            console.error("Map setup failed:", error);
        }
    }
});

document.addEventListener("DOMContentLoaded", () => {
    displaySavedRoutes();
});

// IndexedDB Initialization (Add this at the top of map-script.js or a shared script file)
const dbRequest = indexedDB.open("routerDB", 3);

dbRequest.onupgradeneeded = (event) => {
    const db = event.target.result;

    // Create object stores if they do not already exist
    if (!db.objectStoreNames.contains("projects")) {
        db.createObjectStore("projects", { keyPath: "projectName" });
    }
    if (!db.objectStoreNames.contains("busStops")) {
        db.createObjectStore("busStops", { keyPath: "stop_id" });
    }
    if (!db.objectStoreNames.contains("routes")) {
        db.createObjectStore("routes", { keyPath: "routeName" });
    }
    if (!db.objectStoreNames.contains("stopTimes")) {
        db.createObjectStore("stopTimes", { keyPath: "trip_id" });
    }
    if (!db.objectStoreNames.contains("shapes")) {
        db.createObjectStore("shapes", { keyPath: "shape_id" });
    }

    console.log("All necessary object stores have been created.");
};

dbRequest.onsuccess = (event) => {
    console.log("IndexedDB opened successfully.");
};

dbRequest.onerror = (event) => {
    const error = event.target.error;
    console.error("Failed to open IndexedDB:", error);

    if (error.name === "QuotaExceededError") {
        console.error("QuotaExceededError: The storage limit has been exceeded.");
    } else if (error.name === "VersionError") {
        console.error("VersionError: The database version is not compatible.");
    } else if (error.name === "InvalidStateError") {
        console.error("InvalidStateError: The database is in an invalid state.");
    } else if (error.name === "BlockedError") {
        console.error("BlockedError: The database request was blocked.");
    } else {
        console.error("An unknown error occurred:", error);
    }

    alert("Unable to access IndexedDB. Please clear your browser's IndexedDB data and try again.");
};

// Function to display saved routes from IndexedDB
function displaySavedRoutes() {
    const request = indexedDB.open("routerDB", 3);

    request.onsuccess = (event) => {
        const db = event.target.result;
        const transaction = db.transaction("projects", "readonly");
        const store = transaction.objectStore("projects");

        const projectName = getProjectNameFromURL();
        const getRequest = store.get(projectName);

        getRequest.onsuccess = () => {
            const projectData = getRequest.result;
            if (projectData && projectData.routes) {
                projectData.routes.forEach((route) => {
                    addRouteToMap(route);
                });
                console.log("Routes displayed from IndexedDB.");
            } else {
                console.log("No saved routes found for this project.");
            }
        };

        getRequest.onerror = () => {
            console.error("Error fetching saved routes from IndexedDB.");
        };
    };

    request.onerror = () => {
        console.error("Failed to open IndexedDB.");
    };
}

// Helper function to add a route to the map
function addRouteToMap(route) {
    const latlngs = route.coordinates.map((coord) => [coord.lat, coord.lng]);
    const polyline = L.polyline(latlngs, { color: 'blue' }).addTo(window.map);
    window.busStopLayerGroup.addLayer(polyline);
}

// Helper function to get the project name from the URL
function getProjectNameFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get("project");
}