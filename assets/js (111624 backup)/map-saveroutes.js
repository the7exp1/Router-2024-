// Wait for IndexedDB to be ready before performing any actions
document.addEventListener("indexedDBReady", () => {
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

// Function to load saved routes from IndexedDB
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
            updateMainSidebar(savedRoutes);
        } else {
            console.log("No saved routes found in IndexedDB.");
        }
    };

    getAllRequest.onerror = () => {
        console.error("Error retrieving saved routes from IndexedDB.");
    };
}

function updateMainSidebar(savedRoutes = []) {
    const routeListContainer = document.getElementById('routeListContainer');
    if (!routeListContainer) {
        console.error("Element with ID 'routeListContainer' not found.");
        return;
    }

    // Clear the sidebar before adding new routes
    routeListContainer.innerHTML = '';

    savedRoutes.forEach((route) => {
        const button = document.createElement('button');
        button.classList.add('route-button');

        // Assign the correct CSS class for styling based on route type
        switch (route.routeType) {
            case "local":
                button.classList.add("local");
                break;
            case "limited":
                button.classList.add("limited");
                break;
            case "express":
                button.classList.add("express");
                break;
            case "special":
                button.classList.add("special");
                break;
            case "summer-express":
                button.classList.add("summer-express");
                break;
            default:
                console.warn(`Unknown route type "${route.routeType}". Defaulting to "local".`);
                button.classList.add("local");
        }

        button.textContent = route.routeName;

        // Add click event for loading and editing the route
        button.addEventListener('click', () => {
            loadAndEditRoute(route); // This function will be defined in map-routedraw.js
        });

        // Add context menu event for deleting the route
        button.addEventListener('contextmenu', (event) => {
            event.preventDefault();
            showDeleteModal(route.routeName);
        });

        routeListContainer.appendChild(button);
    });

    console.log("Main sidebar updated with saved routes:", savedRoutes);
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
            displayRouteOnMap(selectedRoute);
        } else {
            console.error(`Route "${routeName}" not found in IndexedDB.`);
        }
    };

    getRequest.onerror = () => {
        console.error(`Error loading route "${routeName}" from IndexedDB.`);
    };
}

// Function to display a route on the map
function displayRouteOnMap(route) {
    if (window.routingControl) {
        window.map.removeControl(window.routingControl);
        console.log("Existing routing control removed.");
    }

    const waypoints = route.waypoints.map((wp) => L.latLng(wp.lat, wp.lng));
    window.routingControl = L.Routing.control({
        waypoints: waypoints,
        createMarker: () => null,
        routeWhileDragging: true,
    }).addTo(window.map);

    window.savedStopsLayer = L.layerGroup();
    route.stops.forEach((stop) => {
        const marker = L.circleMarker([stop.stop_lat, stop.stop_lon], {
            radius: 5,
            color: 'green',
        }).bindPopup(stop.stop_name);
        window.savedStopsLayer.addLayer(marker);
    });
    window.savedStopsLayer.addTo(window.map);

    updateRouteInfo(route.length, route.stops.length);
    console.log(`Route "${route.routeName}" displayed on the map.`);
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
        updateMainSidebar();
    };

    transaction.onerror = (event) => {
        console.error(`Error deleting route "${routeName}":`, event.target.error);
    };
}

// Function to show the delete confirmation modal
function showDeleteModal(routeName) {
    const modal = document.getElementById("deleteModal");
    const modalText = document.getElementById("modalText");
    const confirmDeleteButton = document.getElementById("confirmDeleteButton");
    const cancelDeleteButton = document.getElementById("cancelDeleteButton");

    modalText.textContent = `Are you sure you want to delete the route "${routeName}"?`;
    modal.classList.add("show-modal");

    confirmDeleteButton.onclick = () => {
        deleteRoute(routeName);
        closeModal();
    };

    cancelDeleteButton.onclick = closeModal;
}

// Function to close the delete modal
function closeModal() {
    const modal = document.getElementById("deleteModal");
    modal.classList.remove("show-modal");
    setTimeout(() => {
        modal.style.display = "none";
    }, 300);
}