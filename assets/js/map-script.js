// Function to deselect the current route if any
window.deselectCurrentRoute = function() {
    if (window.currentSelectedRoute && window.currentSelectedRoute.setStyle) {
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
            if (layer.routeId !== route.routeId && window.map.hasLayer(layer)) {
                window.map.removeLayer(layer);
            }
        });
    }

    // Highlight the selected route
    window.currentSelectedRoute = route.shapeLayer;
    if (window.currentSelectedRoute && window.currentSelectedRoute.setStyle) {
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

// Function to add a branch marker to the selected route
// Function to add a branch marker to the selected route
window.addBranchMarkerToRoute = function(route) {
    if (!route || !route.shapeLayer) {
        console.warn("Invalid route or shapeLayer is not defined. Cannot add branch marker.");
        return;
    }

    const center = route.shapeLayer.getBounds().getCenter();
    window.currentRouteBranchMarker = L.marker(center, {
        icon: getRouteBranchIcon(route.routeName),
        riseOnHover: true
    }).addTo(window.map);
    console.log("Added branch marker for route:", route.routeName);
};

// Attach `addBranchMarkerToRoute` to the window object
window.addBranchMarkerToRoute = addBranchMarkerToRoute;

// Function to display saved routes
window.displaySavedRoutes = async function() {
    if (!window.db) {
        console.error("IndexedDB is not initialized.");
        return;
    }

    try {
        const savedRoutes = await getAllSavedRoutes(window.db);
        if (savedRoutes && savedRoutes.length > 0) {
            const validRoutes = savedRoutes.filter(route => {
                if (route.shapeLayer) {
                    return true;
                } else {
                    console.warn(`Skipping route "${route.routeName}" as shapeLayer is not defined.`);
                    return false;
                }
            });

            if (validRoutes.length === 0) {
                console.warn("No valid routes found with defined shapeLayer. Skipping map display.");
                return;
            }

            validRoutes.forEach(route => {
                addRouteToMap(route);
            });
            console.log("Valid routes displayed from IndexedDB.");
        } else {
            console.info("No saved routes found for this project.");
        }
    } catch (error) {
        console.error("Error fetching saved routes from IndexedDB:", error);
    }
};

// Function to add a route to the map
function addRouteToMap(route) {
    if (!route.shapeLayer) {
        console.error("Cannot add route to map: shapeLayer is not defined.");
        return;
    }

    window.map.addLayer(route.shapeLayer);
    if (!window.routeLayers) {
        window.routeLayers = [];
    }
    window.routeLayers.push(route.shapeLayer);
    console.log(`Route "${route.routeName}" added to map.`);
}

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

// Function to highlight a route
window.highlightRoute = function(route) {
    // Avoid calling this function if the route or shapeLayer is not valid
    if (!route || !route.shapeLayer || typeof route.shapeLayer.setStyle !== 'function') {
        console.warn("Invalid route or shapeLayer is not defined. Skipping highlight operation.");
        return;
    }

    route.shapeLayer.setStyle({ weight: 6, opacity: 1 });
    console.log("Highlighted route:", route.routeName);
};

// Ensure highlightRoute is only called for valid routes
window.handleRouteMouseover = function(route) {
    if (!route || !route.shapeLayer) {
        console.warn(`Skipping mouseover event for route "${route?.routeName || 'unknown'}" because shapeLayer is undefined.`);
        return;
    }

    window.highlightRoute(route);
};

// Use `handleRouteMouseover` wherever mouseover events are attached
// Example of attaching mouseover event
window.attachMouseoverEvents = function(route) {
    if (route && route.shapeLayer) {
        route.shapeLayer.on('mouseover', () => {
            window.handleRouteMouseover(route);
        });
    } else {
        console.warn(`Cannot attach mouseover event to route "${route?.routeName || 'unknown'}" due to missing shapeLayer.`);
    }
};