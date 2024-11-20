// Function to manage sidebar display
function manageSidebarDisplay(action, route = null) {
    const mainSidebar = document.getElementById('sidebar');
    const routeInfoSidebar = document.getElementById('routeInfoSidebar');

    if (action === 'showMainSidebar') {
        routeInfoSidebar.classList.remove('visible');
        setTimeout(() => {
            mainSidebar.classList.add('visible');
        }, 300);
    } else if (action === 'showRouteInfoSidebar' && route) {
        mainSidebar.classList.remove('visible');
        setTimeout(() => {
            routeInfoSidebar.classList.add('visible');
            routeInfoSidebar.classList.add(route.routeType);
            document.getElementById('routeTitle').textContent = route.routeName;
            document.getElementById('routeTypeText').textContent = `Route Type: ${route.routeType}`;
        }, 300);
    }
}

// Define the selectRoute function
function selectRoute(route) {
    // Deselect the current route
    window.deselectCurrentRoute();

    // Highlight the selected route
    const latlngs = route.coordinates.map((coord) => [coord.lat, coord.lng]);
    const polyline = L.polyline(latlngs, { color: 'blue', weight: 6 }).addTo(window.map);
    window.currentSelectedRoute = polyline;

    // Hide other routes from the map
    if (window.busStopLayerGroup) {
        window.busStopLayerGroup.eachLayer((layer) => {
            if (layer !== polyline) {
                window.map.removeLayer(layer);
            }
        });
    }

    // Update route info sidebar
    window.manageSidebarDisplay('showRouteInfoSidebar', route);
}

// Remaining code continues as-is...

let busStopLayerGroup;
document.addEventListener("busStopLayerGroupInitialized", () => {
    loadAndAddBusStops(window.map);
});

// Function to load and add bus stops
window.loadAndAddBusStops = function(map) {
    // Logic to load and add bus stops
};

// Attach functions to window object to make them globally accessible
window.selectRoute = selectRoute;
window.manageSidebarDisplay = manageSidebarDisplay;
window.loadAndAddBusStops = loadAndAddBusStops;

// Other code follows...

async function openIndexedDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open("routerDB", 3);

        request.onsuccess = (event) => resolve(event.target.result);
        request.onerror = (event) => reject(event.target.error);
    });
}

// Function to manage sidebar display
window.manageSidebarDisplay = function(action, route = null) {
    const mainSidebar = document.getElementById('sidebar');
    const routeInfoSidebar = document.getElementById('routeInfoSidebar');

    if (action === 'showMainSidebar') {
        routeInfoSidebar.classList.remove('visible');
        setTimeout(() => {
            mainSidebar.classList.add('visible');
        }, 300);
    } else if (action === 'showRouteInfoSidebar' && route) {
        mainSidebar.classList.remove('visible');
        setTimeout(() => {
            routeInfoSidebar.classList.add('visible');
            routeInfoSidebar.classList.add(route.routeType);
            document.getElementById('routeTitle').textContent = route.routeName;
            document.getElementById('routeTypeText').textContent = `Route Type: ${route.routeType}`;
        }, 300);
    }
};

async function getAllSavedRoutes(db) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(["routes"], "readonly");
        const store = transaction.objectStore("routes");
        const request = store.getAll();

        request.onsuccess = (event) => resolve(event.target.result);
        request.onerror = (event) => reject(event.target.error);
    });
}

function getRouteBranchIcon(label = "") {
    return L.divIcon({
        className: 'route-branch-icon',
        html: `<div class="route-label">${label || ""}</div>`,
        iconSize: [25, 25],
        iconAnchor: [12, 12],
        popupAnchor: [0, -12]
    });
}

document.addEventListener("mapInitialized", () => {
    // Ensure map and bus stops are ready
    if (window.map && window.busStopLayerGroup) {
        loadAndAddBusStops(window.map);  // Call this to update bus stops in the UI after map is initialized
    }
});

async function loadAndAddBusStops(map) {
    if (!map || typeof map.addLayer !== "function") {
        logError("Invalid map instance provided.");
        return;
    }

    try {
        if (!window.db) {
            logError("IndexedDB is not initialized.");
            return;
        }

        const stops = await getStopsFromDB(); // Use globally defined function
        if (stops && stops.length > 0) {
            addBusStopsToMap(stops);
        } else {
            logWarning("No bus stops found in IndexedDB.");
        }
    } catch (error) {
        logError(`Error in loadAndAddBusStops: ${error.message}`);
    }
}

function addBusStopsToMap(stops) {
    if (!window.busStopLayerGroup) {
        console.error("Bus stop layer group not initialized.");
        return;
    }

    window.busStopLayerGroup.clearLayers();  // Clear any previous markers

    stops.forEach((stop) => {
        if (stop && stop.stop_lat && stop.stop_lon) {
            const marker = L.circleMarker([stop.stop_lat, stop.stop_lon], {
                radius: 8,
                color: 'blue',
                fillColor: 'blue',
                fillOpacity: 0.5,
                weight: 2,
            });

            marker.bindPopup(stop.stop_name || "Unnamed Stop");
            window.busStopLayerGroup.addLayer(marker);
        }
    });
}


// Listen for the 'mapReady' event before calling the function
document.addEventListener("mapReady", () => {
    if (window.map) {
        loadAndAddBusStops(window.map);
    } else {
        logError("Map instance is not available after mapReady event.");
    }
});

function parseStopsFile(text) {
    const lines = text.split("\n");
    const headers = lines[0].split(",").map(header => header.trim());
    const stops = [];

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const values = line.split(",").map(value => value.trim());
        const stop = {};

        headers.forEach((header, index) => {
            stop[header] = values[index] || ""; // Prevent undefined values
        });

        stops.push(stop);
    }

    logInfo(`Parsed ${stops.length} stops from the file.`);
    return stops;
}

function dispatchStopsLoadedEvent() {
    document.dispatchEvent(new Event("stopsLoaded"));
}


function logInfo(message) {
    console.log("Info:", message);
}

function logError(message) {
    console.error("Error:", message);
}

function logWarning(message) {
    console.warn("Warning:", message);
}

function getProjectNameFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get("project");
}

async function displaySavedRoutes() {
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
                // Update the sidebar with loaded routes
window.updateMainSidebar(projectData.routes);
                logInfo("Routes displayed from IndexedDB.");
            } else {
                logInfo("No saved routes found for this project.");
            }
        };

        getRequest.onerror = () => {
            logError("Error fetching saved routes from IndexedDB.");
        };
    };

    request.onerror = () => {
        logError("Failed to open IndexedDB.");
    };
}

function addRouteToMap(route) {
    if (!route || !Array.isArray(route.coordinates)) {
        logError("Invalid route data. Missing or malformed coordinates.");
        return;
    }

    window.selectRoute(route);

    if (!window.busStopLayerGroup) {
        window.busStopLayerGroup = L.layerGroup().addTo(window.map);
    }

    window.busStopLayerGroup.addLayer(polyline);
}

function getProjectNameFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get("project");
}

function displayRouteOnMap(route) {
    if (!route || !Array.isArray(route.waypoints)) {
        logError("Invalid route data. Missing or malformed waypoints.");
        return;
    }

    // Remove existing routing control if present
    if (window.routingControl) {
        window.map.removeControl(window.routingControl);
        logInfo("Existing routing control removed.");
    }

    const waypoints = route.waypoints.map((wp) => L.latLng(wp.lat, wp.lng));
    window.routingControl = L.Routing.control({
        waypoints: waypoints,
        createMarker: () => null,
        routeWhileDragging: true,
    }).addTo(window.map);

    // Initialize savedStopsLayer if not already present
    if (!window.savedStopsLayer) {
        window.savedStopsLayer = L.layerGroup().addTo(window.map);
    } else {
        window.savedStopsLayer.clearLayers();
    }

    route.stops.forEach((stop) => {
        const marker = L.circleMarker([stop.stop_lat, stop.stop_lon], {
            radius: 5,
            color: 'green',
        }).bindPopup(stop.stop_name);
        window.savedStopsLayer.addLayer(marker);
    });

    updateRouteInfo(route.length, route.stops.length);
    logInfo(`Route "${route.routeName}" displayed on the map.`);
}

function showDeleteModal(routeName) {
    const modal = document.getElementById("deleteModal");
    const modalText = document.getElementById("modalText");
    const confirmDeleteButton = document.getElementById("confirmDeleteButton");
    const cancelDeleteButton = document.getElementById("cancelDeleteButton");

    // Validate modal elements
    if (!modal || !modalText || !confirmDeleteButton || !cancelDeleteButton) {
        logError("Delete modal elements not found.");
        return;
    }

    modalText.textContent = `Are you sure you want to delete the route "${routeName}"?`;
    modal.classList.add("show-modal");

    // Cleanup previous event listeners
    confirmDeleteButton.onclick = null;
    cancelDeleteButton.onclick = null;

    confirmDeleteButton.onclick = () => {
        deleteRoute(routeName);
        closeModal();
    };

    cancelDeleteButton.onclick = closeModal;
}

function closeModal() {
    const modal = document.getElementById("deleteModal");
    if (modal) {
        modal.classList.remove("show-modal");
        setTimeout(() => {
            modal.style.display = "none";
        }, 300);
    } else {
        logError("Delete modal not found.");
    }
}

// Add event listener for creating a new route
const createRouteButton = document.getElementById("createRoute");
if (createRouteButton) {
    createRouteButton.addEventListener("click", () => {
        console.log("Add button clicked.");
        showRouteNameModal();
    });
} else {
    logError("Create route button not found.");
}

const submitButton = document.getElementById("routeNameSubmit");
if (submitButton) {
    submitButton.removeEventListener("click", handleEnterButtonClick);
    submitButton.addEventListener("click", (e) => {
        e.preventDefault();
        handleEnterButtonClick();
    });
} else {
    logError("Submit button not found.");
}

function showRouteNameModal() {
    const modal = document.getElementById("routeNameModal");
    const routeTypeSelect = document.getElementById("routeTypeSelect");

    if (modal) {
        updateModalColor();

        modal.style.display = "block";
        modal.style.opacity = "0";
        modal.style.visibility = "hidden";
        modal.style.transform = "translate(-50%, -50%) scale(0.9)";

        requestAnimationFrame(() => {
            modal.style.visibility = "visible";
            requestAnimationFrame(() => {
                modal.style.opacity = "1";
                modal.style.transform = "translate(-50%, -50%) scale(1)";
            });
        });
        console.log("Route name modal displayed.");
    } else {
        console.error("Route name modal not found.");
    }
}

function updateModalColor() {
    const modal = document.getElementById("routeNameModal");
    const routeTypeSelect = document.getElementById("routeTypeSelect");

    if (modal && routeTypeSelect) {
        modal.classList.remove("local", "limited", "express", "special", "summer-express", "default");

        const selectedType = routeTypeSelect.value.toLowerCase();
        modal.classList.add(selectedType);

        console.log(`Applied route type class: ${selectedType} to routeNameModal`);
    } else {
        console.error("Failed to update modal color. Elements not found.");
    }
}

const routeTypeSelect = document.getElementById("routeTypeSelect");
if (routeTypeSelect) {
    routeTypeSelect.addEventListener("change", updateModalColor);
} else {
    logError("Route type select element not found.");
}

function handleEnterButtonClick() {
    const routeNameInput = document.getElementById("routeNameInput")?.value.trim();
    const routeTypeSelect = document.getElementById("routeTypeSelect")?.value;
    const mainSidebar = document.getElementById("sidebar");
    const routeInfoSidebar = document.getElementById("routeInfoSidebar");
    const routeTitleElement = document.getElementById("routeTitle");
    const routeTypeText = document.getElementById("routeTypeText");

    if (!routeNameInput) {
        alert("Please enter a route name.");
        return;
    }

    if (!routeTypeSelect) {
        alert("Please select a route type.");
        return;
    }

    routeTitleElement.textContent = routeNameInput;
    routeTypeText.textContent = `Route Type: ${routeTypeSelect.charAt(0).toUpperCase() + routeTypeSelect.slice(1)}`;

    hideModal();

    routeInfoSidebar.className = ""; // Reset all classes
    const routeTypeClass = routeTypeSelect.toLowerCase();
    routeInfoSidebar.classList.add(routeTypeClass, "visible");

    console.log(`Applied route type class: ${routeTypeClass} to routeInfoSidebar`);

    mainSidebar.classList.add("sidebar-hidden");
    window.manageSidebarDisplay('showRouteInfoSidebar', route);;

    if (typeof enableRouteCreation === 'function') {
        enableRouteCreation();
        console.log("Called enableRouteCreation from map-routedraw.js");
    } else {
        console.error("enableRouteCreation is not defined.");
    }
}

function hideModal() {
    const modal = document.getElementById("routeNameModal");
    if (modal) {
        modal.style.opacity = "0";
        modal.style.transform = "translate(-50%, -50%) scale(0.9)";
        setTimeout(() => {
            modal.style.display = "none";
            modal.style.visibility = "hidden";
        }, 300);
        console.log("Modal hidden.");
    } else {
        console.error("Modal not found.");
    }
}

function updateUIWithRouteInfo(lengthInMiles, totalStops, avgSpacingText) {
    const lengthText = lengthInMiles ? `${lengthInMiles.toFixed(2)} mi` : "N/A";
    document.getElementById("routeLength").innerText = lengthText;

    const stopsAndSpacingText = totalStops > 0
        ? `${totalStops} stops, Avg Spacing: ${avgSpacingText}`
        : "N/A";
    document.getElementById("stopsAndSpacing").innerText = stopsAndSpacingText;

    console.log(`UI updated: Length - ${lengthText}, Stops - ${totalStops}, Avg Spacing - ${avgSpacingText}`);
}

function showLoadingScreen() {
    const loadingScreen = document.getElementById("loadingScreen");
    if (loadingScreen) {
        loadingScreen.classList.remove("hidden");
    }
}

function hideLoadingScreen() {
    const loadingScreen = document.getElementById("loadingScreen");
    if (loadingScreen) {
        loadingScreen.classList.add("hidden");
    }
}

// Existing code...

document.addEventListener("DOMContentLoaded", () => {
    const backButton = document.getElementById("backButton");
    if (backButton) {
        backButton.addEventListener("click", () => {
            window.manageSidebarDisplay('showMainSidebar');
            window.deselectCurrentRoute();
            document.dispatchEvent(new Event('showAllRoutes'));
        });
    }
});

// Main Sidebar Functions
window.updateMainSidebar = function(savedRoutes = []) {
    const routeListContainer = document.getElementById('routeListContainer');
    if (!routeListContainer) {
        console.error("Element with ID 'routeListContainer' not found.");
        return;
    }

    routeListContainer.innerHTML = '';

    savedRoutes.forEach((route) => {
        const button = document.createElement('button');
        button.classList.add('route-button');

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

        button.addEventListener('click', () => {
            loadAndEditRoute(route);
        });

        button.addEventListener('contextmenu', (event) => {
            event.preventDefault();
            showDeleteModal(route.routeName);
        });

        routeListContainer.appendChild(button);
    });

    console.log("Main sidebar updated with saved routes:", savedRoutes);
};

// Centralized function to deselect the current route if any
window.deselectCurrentRoute = function() {
    if (window.currentSelectedRoute && typeof window.currentSelectedRoute.setStyle === 'function') {
        // Reset the style of the currently selected route
        window.currentSelectedRoute.setStyle({ weight: 3, opacity: 1 });
        console.log("Deselecting route:", window.currentSelectedRoute);
    } else if (window.currentSelectedRoute) {
        console.warn("No valid selected route to deselect or route is missing setStyle method.");
    }

    // Remove any branch markers/icons related to the selected route
    if (window.currentRouteBranchMarker) {
        window.map.removeLayer(window.currentRouteBranchMarker);
        window.currentRouteBranchMarker = null;
        console.log("Removed branch marker.");
    }

    // Clear the reference to the current selected route
    window.currentSelectedRoute = null;
};

// Centralized function to select a route and manage all related UI updates
window.selectRoute = function(route) {
    if (!route || !route.shapeLayer) {
        console.error("Invalid route or shapeLayer is not defined. Skipping route selection.");
        return;
    }

    // Deselect the current route if one exists
    window.deselectCurrentRoute();

    // Hide all other routes from the map
    if (window.routeLayers) {
        window.routeLayers.forEach(layer => {
            if (layer !== route.shapeLayer && window.map.hasLayer(layer)) {
                window.map.removeLayer(layer);
            }
        });
    }

    // Highlight the selected route
    window.currentSelectedRoute = route.shapeLayer;
    if (window.currentSelectedRoute && typeof window.currentSelectedRoute.setStyle === "function") {
        window.currentSelectedRoute.setStyle({ weight: 6, opacity: 1 });
        console.log("Selected route:", route.routeName);
    } else {
        console.warn("ShapeLayer is missing or does not support setStyle.");
    }

    // Add branch marker to the selected route
    window.addBranchMarkerToRoute(route);

    // Show the route info sidebar with route details
    window.manageSidebarDisplay('showRouteInfoSidebar', route);
};

// Attach `selectRoute` and `deselectCurrentRoute` to the window object
window.selectRoute = selectRoute;
window.deselectCurrentRoute = deselectCurrentRoute;

// Attach `selectRoute` to window object
window.selectRoute = selectRoute;

// Improved function to manage sidebar display
window.manageSidebarDisplay = function(action, route = null) {
    const mainSidebar = document.getElementById('sidebar');
    const routeInfoSidebar = document.getElementById('routeInfoSidebar');
    const busStopInfoSidebar = document.getElementById('busStopInfoSidebar');

    if (action === 'showMainSidebar') {
        routeInfoSidebar.classList.remove('visible');
        busStopInfoSidebar.classList.remove('visible');
        setTimeout(() => {
            mainSidebar.classList.add('visible');
        }, 300);
    } else if (action === 'showRouteInfoSidebar' && route) {
        if (!route || !route.shapeLayer) {
            console.warn("Cannot show route info sidebar for invalid route.");
            return;
        }
        mainSidebar.classList.remove('visible');
        setTimeout(() => {
            routeInfoSidebar.classList.add('visible');
            routeInfoSidebar.classList.add(route.routeType);
            document.getElementById('routeTitle').textContent = route.routeName;
            document.getElementById('routeTypeText').textContent = `Route Type: ${route.routeType}`;
        }, 300);
    } else if (action === 'showBusStopInfoSidebar') {
        mainSidebar.classList.remove('visible');
        setTimeout(() => {
            busStopInfoSidebar.classList.add('visible');
        }, 300);
    }
};

// Attach `manageSidebarDisplay` to the window object
window.manageSidebarDisplay = manageSidebarDisplay;

// Attach `manageSidebarDisplay` to window object
window.manageSidebarDisplay = manageSidebarDisplay;

// Additional closing of open blocks
// Ensure that the document ends properly