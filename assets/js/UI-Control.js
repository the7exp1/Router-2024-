// Full Cleaned-Up Version of UI-Control.js

// Function to manage sidebar display
function manageSidebarDisplay(action, route = null) {
    const mainSidebar = document.getElementById('sidebar');
    const routeInfoSidebar = document.getElementById('routeInfoSidebar');
    const busStopInfoSidebar = document.getElementById('busStopInfoSidebar');

    if (!mainSidebar || !routeInfoSidebar || !busStopInfoSidebar) {
        console.error("One or more sidebar elements not found.");
        return;
    }

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
}

// Centralized function to deselect the current route if any
function deselectCurrentRoute() {
    if (window.currentSelectedRoute && typeof window.currentSelectedRoute.setStyle === 'function') {
        window.currentSelectedRoute.setStyle({ weight: 3, opacity: 1 });
        console.log("Deselecting route:", window.currentSelectedRoute);
    } else if (window.currentSelectedRoute) {
        console.warn("No valid selected route to deselect or route is missing setStyle method.");
    }

    if (window.currentRouteBranchMarker) {
        if (window.map && typeof window.map.removeLayer === 'function') {
            window.map.removeLayer(window.currentRouteBranchMarker);
        }
        window.currentRouteBranchMarker = null;
        console.log("Removed branch marker.");
    }

    window.currentSelectedRoute = null;
}

// Centralized function to select a route and manage all related UI updates
function selectRoute(route) {
    if (!route || !route.shapeLayer) {
        console.error("Invalid route or shapeLayer is not defined. Skipping route selection.");
        return;
    }

    deselectCurrentRoute();

    if (window.routeLayers && Array.isArray(window.routeLayers)) {
        window.routeLayers.forEach(layer => {
            if (layer !== route.shapeLayer && window.map && window.map.hasLayer(layer)) {
                window.map.removeLayer(layer);
            }
        });
    }

    window.currentSelectedRoute = route.shapeLayer;
    if (window.currentSelectedRoute && typeof window.currentSelectedRoute.setStyle === "function") {
        window.currentSelectedRoute.setStyle({ weight: 6, opacity: 1 });
        console.log("Selected route:", route.routeName);
    } else {
        console.warn("ShapeLayer is missing or does not support setStyle.");
    }

    addBranchMarkerToRoute(route);

    manageSidebarDisplay('showRouteInfoSidebar', route);
}

// Function to add a branch marker to the selected route
function addBranchMarkerToRoute(route) {
    if (route && route.coordinates && route.coordinates.length > 0) {
        const branchIcon = getRouteBranchIcon(route.routeName || route.route_id);
        const firstCoord = route.coordinates[0];
        if (window.map) {
            window.currentRouteBranchMarker = L.marker([firstCoord.lat, firstCoord.lng], { icon: branchIcon }).addTo(window.map);
            console.log(`Added branch marker for route: ${route.routeName}`);
        } else {
            console.error("Map instance is not available.");
        }
    } else {
        console.warn("No valid coordinates available to add a branch marker.");
    }
}

// Utility function to get a branch icon for a route
function getRouteBranchIcon(label = "") {
    return L.divIcon({
        className: 'route-branch-icon',
        html: `<div class="route-label">${label || ""}</div>`,
        iconSize: [25, 25],
        iconAnchor: [12, 12],
        popupAnchor: [0, -12]
    });
}

// Function to open IndexedDB
async function openIndexedDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open("routerDB", 3);

        request.onsuccess = (event) => resolve(event.target.result);
        request.onerror = (event) => reject(event.target.error);
    });
}

// Function to display saved routes
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
                updateMainSidebar(projectData.routes);
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

// Function to add a route to the map
function addRouteToMap(route) {
    if (!route || !Array.isArray(route.coordinates)) {
        logError("Invalid route data. Missing or malformed coordinates.");
        return;
    }

    if (window.map) {
        const routeLayer = L.polyline(route.coordinates, { weight: 3, color: 'blue' }).addTo(window.map);
        if (!window.routeLayers) {
            window.routeLayers = [];
        }
        window.routeLayers.push(routeLayer);
        route.shapeLayer = routeLayer;
    } else {
        console.error("Map instance is not available.");
    }

    if (!window.busStopLayerGroup) {
        window.busStopLayerGroup = L.layerGroup().addTo(window.map);
    }
}

// Function to update the main sidebar with saved routes
function updateMainSidebar(savedRoutes = []) {
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
}

window.deselectCurrentRoute = deselectCurrentRoute;
window.selectRoute = selectRoute;
window.manageSidebarDisplay = manageSidebarDisplay;
window.updateMainSidebar = updateMainSidebar;