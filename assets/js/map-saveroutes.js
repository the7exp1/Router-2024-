// map-saveroutes.js - Save Routes Logic without UI Elements
window.saveCurrentRoute = saveCurrentRoute;
window.loadSavedRoutes = loadSavedRoutes;
window.loadRoute = loadRoute;
window.deleteRoute = deleteRoute;
// Wait for IndexedDB to be ready before performing any actions
window.addEventListener("indexedDBReady", () => {
    if (!dbInstance) {
        console.error("IndexedDB is not initialized.");
        alert("Unable to access project data. Please try reloading the page.");
        return;
    }
    loadSavedRoutes();
});

// Function to save the current route to IndexedDB
function saveCurrentRoute(routeData) {
    if (!dbInstance) {
        console.error("IndexedDB is not initialized.");
        return;
    }

    const transaction = dbInstance.transaction("routes", "readwrite");
    const store = transaction.objectStore("routes");

    // Add or update the route data
    const route = {
        route_id: routeData.route_id,
        routeName: routeData.routeName,
        routeType: routeData.routeType,
        waypoints: routeData.waypoints ? routeData.waypoints.map(coord => ({ lat: coord.lat, lng: coord.lng })) : [],
        stops: routeData.stops || [],
        shape_id: routeData.shape_id || null,
    };

    const putRequest = store.put(route);

    putRequest.onsuccess = function() {
        console.log("Route data successfully saved to IndexedDB:", route);
    };

    putRequest.onerror = function(event) {
        console.error("Error saving route data to IndexedDB:", event.target.error);
    };
}

function loadSavedRoutes() {
    if (!dbInstance) {
        console.error("IndexedDB is not initialized.");
        return;
    }

    const transaction = dbInstance.transaction("routes", "readonly");
    const store = transaction.objectStore("routes");
    const getAllRequest = store.getAll();

    getAllRequest.onsuccess = () => {
        const savedRoutes = getAllRequest.result;
        if (savedRoutes && savedRoutes.length > 0) {
            console.log("Loaded saved routes from IndexedDB:", savedRoutes);
            window.manageSidebarDisplay('showMainSidebar'); // Ensure the main sidebar is shown
            window.updateMainSidebar(savedRoutes); // Update the sidebar with the loaded routes
        } else {
            console.log("No saved routes found in IndexedDB.");
        }
    };

    getAllRequest.onerror = () => {
        console.error("Error retrieving saved routes from IndexedDB.");
    };
}

// Function to load a route from IndexedDB
function loadRoute(routeName) {
    if (!dbInstance) {
        console.error("IndexedDB is not initialized.");
        return;
    }

    const transaction = dbInstance.transaction("routes", "readonly");
    const store = transaction.objectStore("routes");
    const getRequest = store.get(routeName);

getRequest.onsuccess = () => {
    const selectedRoute = getRequest.result;
    if (selectedRoute) {
        console.log("Loading route:", selectedRoute);
        window.selectRoute(selectedRoute); // Use selectRoute to manage the visualization and sidebar update
    } else {
        console.error(`Route "${routeName}" not found in IndexedDB.`);
    }
};

    getRequest.onerror = () => {
        console.error(`Error loading route "${routeName}" from IndexedDB.`);
    };
}

// Function to delete a route from IndexedDB
function deleteRoute(routeName) {
    if (!dbInstance) {
        console.error("IndexedDB is not initialized.");
        return;
    }

    const transaction = dbInstance.transaction("routes", "readwrite");
    const store = transaction.objectStore("routes");

    store.delete(routeName);

transaction.oncomplete = () => {
    console.log(`Route "${routeName}" deleted successfully from IndexedDB.`);
    window.manageSidebarDisplay('showMainSidebar'); // Ensure the main sidebar is visible after deletion
    window.updateMainSidebar(); // Update the sidebar to remove the deleted route
};

    transaction.onerror = (event) => {
        console.error(`Error deleting route "${routeName}":`, event.target.error);
    };
}