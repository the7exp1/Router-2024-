// Ensure map initialization after the entire page is loaded
window.addEventListener("load", () => {
    if (!window.map || !(window.map instanceof L.Map)) {
        console.log("Initializing map...");
        try {
            window.map = L.map('map').setView([40.7128, -74.0060], 13);

            L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
                attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
                subdomains: "abcd",
                maxZoom: 19,
            }).addTo(window.map);
            console.log("Tile layer added.");

            // Initialize the bus stop layer group if it doesn't exist
            if (!window.busStopLayerGroup) {
                window.busStopLayerGroup = L.layerGroup().addTo(window.map);
                console.log("Bus stop layer group initialized.");
            }

            // Dispatch map initialization event
            document.dispatchEvent(new Event("mapInitialized"));
            console.log("Map initialization completed.");

            // Now load and store bus stops after map initialization
            loadAndStoreBusStops(window.map); // This will be called once the map is ready

        } catch (error) {
            console.error("Map setup failed:", error);
        }
    }
});

// New function to load and store bus stops from stops.txt and stops2.txt
async function loadAndStoreBusStops(map) {
    const fileNames = ["stops.txt", "stops2.txt"];
    const allStops = [];

    for (const fileName of fileNames) {
        try {
            const response = await fetch(fileName);
            if (!response.ok) {
                logError(`Failed to load ${fileName}.`);
                continue;
            }

            const text = await response.text();
            if (!text.trim()) {
                logWarning(`${fileName} is empty.`);
                continue;
            }

            const parsedStops = parseStopsFile(text);
            if (parsedStops && parsedStops.length > 0) {
                allStops.push(...parsedStops);
            } else {
                logWarning(`No valid stops in ${fileName}.`);
            }

        } catch (error) {
            logError(`Error loading ${fileName}: ${error.message}`);
        }
    }

    if (allStops.length > 0) {
        try {
            await storeStopsInDB(allStops); // Assuming this function stores stops in IndexedDB
            logInfo("Bus stops stored in database.");
            addBusStopsToMap(allStops); // Add bus stops to map

        } catch (error) {
            logError(`Error storing stops in database: ${error.message}`);
        }
    } else {
        logWarning("No stops to store in database.");
    }
}

// Listen for the mapInitialized event to load bus stops
document.addEventListener("mapInitialized", () => {
    if (typeof loadAndAddBusStops === "function" && window.map instanceof L.Map) {
        loadAndAddBusStops(window.map);
        console.log("loadAndAddBusStops called after map initialization.");
    } else {
        console.error("loadAndAddBusStops function is not defined or map is not initialized.");
    }
});

// Loading saved routes after map is initialized
document.addEventListener("DOMContentLoaded", async () => {
    try {
        if (window.map && typeof loadAndAddBusStops === "function") {
            // Load bus stops first
            loadAndAddBusStops(window.map);

            // Now load saved routes for the sidebar
            const db = await openIndexedDB();
            const savedRoutes = await getAllSavedRoutes(db);
            window.updateMainSidebar(savedRoutes); // Use centralized function
            console.log("Sidebar updated with saved routes.");
        } else {
            console.error("Map is not ready or loadAndAddBusStops is not defined.");
        }
    } catch (error) {
        console.error("Error while loading bus stops and saved routes:", error);
    }
});

// Function to open the IndexedDB and retrieve saved routes
async function openIndexedDB() {
    const request = indexedDB.open("routerDB", 3);
    return new Promise((resolve, reject) => {
        request.onsuccess = (event) => {
            resolve(event.target.result);
        };
        request.onerror = (event) => {
            reject(event.target.error);
        };
    });
}

// Function to get all saved routes from IndexedDB
async function getAllSavedRoutes(db) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction("routes", "readonly");
        const objectStore = transaction.objectStore("routes");
        const request = objectStore.getAll();

        request.onsuccess = (event) => {
            resolve(event.target.result);
        };

        request.onerror = (event) => {
            reject(event.target.error);
        };
    });
}

// Fetch saved routes from IndexedDB
function fetchSavedRoutes(db) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction("routes", "readonly");
        const objectStore = transaction.objectStore("routes");
        const request = objectStore.getAll();

        request.onsuccess = (event) => {
            resolve(event.target.result);
        };

        request.onerror = (event) => {
            reject("Failed to fetch saved routes from IndexedDB");
        };
    });
}

function initializeMapWithSavedRoutes() {
    const request = indexedDB.open("routerDB", 3);

    request.onsuccess = (event) => {
        const db = event.target.result;
        fetchSavedRoutes(db).then((savedRoutes) => {
            if (savedRoutes.length > 0) {
                console.log("Displaying saved routes on the map.");

                // Store references to all the route layers
                const routeLayers = [];

                savedRoutes.forEach(route => {
                    if (route.shape_ids && route.shape_ids.length > 0) {
                        route.shape_ids.forEach(shape_id => {
                            loadWaypointsFromShape(shape_id).then((waypoints) => {
                                if (waypoints && waypoints.length > 0) {
                                    // Create the route layer with a CSS class name that matches the route type
                                    const shapeLayer = L.polyline(waypoints, { className: route.route_type });
                                    shapeLayer.addTo(window.map);

                                    // Attach the shapeLayer to the route object
                                    route.shapeLayer = shapeLayer;

                                    // Store the route layer reference
                                    routeLayers.push(shapeLayer);

                                    // Attach unified event handlers
                                    shapeLayer.on('click', function () {
                                        window.selectRoute(route);
                                    });

                                    shapeLayer.on('mouseover', function () {
                                        window.highlightRoute(route, true);
                                    });

                                    shapeLayer.on('mouseout', function () {
                                        window.highlightRoute(route, false);
                                    });
                                }
                            }).catch(error => {
                                console.error("Error loading waypoints from shape:", error);
                            });
                        });
                    } else {
                        console.warn(`No valid shape_ids found for route ${route.route_id}`);
                    }
                });

                // Store references globally to route layers
                window.routeLayers = routeLayers;

                // Add the event listener to show all routes again (back button)
                document.addEventListener('showAllRoutes', function () {
                    manageRouteDisplay('showAllRoutes');
                });
            }
        });
    };
}

window.highlightRoute = function(route, isHighlight) {
    if (!route || !route.shapeLayer) {
        console.error("Invalid route or shapeLayer is not defined. Skipping highlight operation.");
        return;
    }

    if (isHighlight) {
        route.shapeLayer.setStyle({ weight: 6, opacity: 0.8 });
        const center = route.shapeLayer.getBounds().getCenter();
        window.currentRouteBranchMarker = L.marker(center, {
            icon: getRouteBranchIcon(route.routeName),
            riseOnHover: true
        }).addTo(window.map);
    } else {
        route.shapeLayer.setStyle({ weight: 3, opacity: 1 });
        if (window.currentRouteBranchMarker) {
            window.map.removeLayer(window.currentRouteBranchMarker);
            window.currentRouteBranchMarker = null;
        }
    }
};

window.manageRouteDisplay = function(action) {
    if (action === 'showAllRoutes') {
        window.routeLayers.forEach(layer => {
            if (!window.map.hasLayer(layer)) {
                layer.addTo(window.map);
                console.log("Restoring route layer:", layer);
            }
        });

        // Deselect any highlighted route
        if (window.deselectCurrentRoute) {
            window.deselectCurrentRoute();
        }
    }
};

// Call the initialization function once the map is ready
window.addEventListener('load', () => {
    initializeMapWithSavedRoutes();
});