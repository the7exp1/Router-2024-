// map-routedraw.js - Route Drawing Logic without UI Elements

window.routingControl = null;
window.allBusStops = [];  // Initialize as an empty array to prevent undefined errors
let isCreatingRoute = false;
window.stopsArray = window.stopsArray || [];
window.stopsArray = window.stopsArray.filter(stop => stop && stop[0] !== undefined && stop[1] !== undefined);
let currentRouteId = null; // This will hold the ID of the route being edited

async function initializeAllBusStops() {
    console.log("Initializing all bus stops...");

    try {
        const stops = await getAllStops();
        if (stops && stops.length > 0) {
            window.allBusStops = stops;
            console.log("Successfully loaded bus stops from IndexedDB:", stops.length);
        } else {
            console.warn("No bus stops found in IndexedDB. Attempting to reload from files.");
            await loadAndStoreBusStops(); // This should parse and populate `allBusStops`
            console.log("Bus stops reloaded from files and stored in `allBusStops`:", window.allBusStops.length);
        }
    } catch (error) {
        console.error("Error initializing bus stops:", error);
    }
}

function checkStopCoordinates(e, stopLat, stopLng) {
    if (stopLat === null || stopLng === null) {
        console.error("Could not retrieve stop coordinates. Event data:", e);
        return;
    }
}

function loadAndEditRoute(route) {
    if (!route) {
        console.error("Route object is not defined.");
        return;
    }

    currentRouteId = route.route_id;  // Always use route_id for consistency
    isCreatingRoute = true;

    // Clear existing stops and routing controls from the map
    if (window.routingControl) {
        window.map.removeControl(window.routingControl);
        window.routingControl = null;
    }
    window.stopsArray = [];
    window.addedBusStops = [];

    console.log("Loaded route data:", route);

    // Load waypoints for all shape IDs associated with the route
    if (!route.shape_ids || route.shape_ids.length === 0) {
        console.error(`No valid shape_ids found for route ${route.route_id}`);
        return;
    }

    // Iterate over all shape_ids and load waypoints for each
    route.shape_ids.forEach((shape_id, index) => {
        if (shape_id) {
            console.log(`Loading waypoints for shape ID: ${shape_id}`);
            loadWaypointsFromShape(shape_id).then((waypoints) => {
                if (waypoints && waypoints.length > 0) {
                    const isMainRoute = (index === 0);
                    drawRoute(waypoints, route.route_type, shape_id, isMainRoute);

                    if (!isMainRoute) {
                        const branchIcon = createBranchIcon(route.routeName || route.route_id);
                        L.marker(waypoints[0], { icon: branchIcon }).addTo(window.map);
                        console.log(`Added branch marker for shape ID: ${shape_id} at starting point.`);
                    }

                    // After the main route has been drawn, call selectRoute to manage highlighting and UI updates
                    if (isMainRoute) {
                        window.selectRoute(route);
                    }
                } else {
                    console.error("No waypoints found in IndexedDB for shape ID:", shape_id);
                }
            }).catch(error => {
                console.error("Error loading waypoints from shape:", error);
            });
        } else {
            console.warn(`Shape ID is undefined for route: ${route.route_id}`);
        }
    });

    // Event listener for map click
    window.map.on('click', onMapClick);
    console.log(`Route "${route.routeName}" loaded for editing.`);
}

function createBranchIcon(routeIdentifier) {
    return L.divIcon({
        className: 'route-branch-icon',
        html: `<div style="background-color: #003399; font:bold; color: white; padding: 5px; border-radius: 3px;">${routeIdentifier}</div>`,
        iconSize: [30, 30], // Width and height of the icon
        iconAnchor: [15, 15] // Center the icon over the point
    });
}

function drawRoute(waypoints, routeType, shapeId, isMainRoute = false) {
    if (!waypoints || waypoints.length === 0) {
        console.error("No waypoints provided to draw the route.");
        return;
    }

    // Convert waypoints into an array of LatLng for Leaflet
    const latLngs = waypoints.map(point => [point.lat, point.lng]);

    // Draw the route as a polyline
    const routePolyline = L.polyline(latLngs, {
        color: isMainRoute ? 'blue' : 'green', // Use different colors for main and branches
        weight: 5,
        opacity: 0.7
    }).addTo(window.map);

    console.log("Route drawn successfully with waypoints:", waypoints);

    // Attach the event to select the route when clicked
    routePolyline.on('click', function () {
        window.selectRoute({ shapeLayer: routePolyline, routeName: shapeId, routeId: shapeId, route_type: routeType });
    });

    // Place markers at key points for branches/deviations
    if (!isMainRoute) {
        // Place a route icon marker at the start of the branch
        const startMarker = L.marker(latLngs[0], { icon: getRouteBranchIcon() }).addTo(window.map);
        console.log(`Added branch marker for shape ID: ${shapeId} at starting point.`);
    }

    // Fit the map to the bounds of the drawn route
    const bounds = L.latLngBounds(latLngs);
    window.map.fitBounds(bounds);
}

function loadWaypointsFromShape(shape_id) {
    return new Promise((resolve, reject) => {
        if (!dbInstance) {
            console.error("IndexedDB is not initialized.");
            reject("IndexedDB is not initialized");
            return;
        }

        const transaction = dbInstance.transaction("shapes", "readonly");
        const store = transaction.objectStore("shapes");
        const getRequest = store.get(shape_id);

        getRequest.onsuccess = () => {
            const shapeData = getRequest.result;
            if (shapeData && shapeData.coordinates) {
                const waypoints = shapeData.coordinates.map(coord => ({ lat: coord[0], lng: coord[1] }));
                resolve(waypoints);
            } else {
                console.error(`Shape "${shape_id}" not found or invalid in IndexedDB.`);
                resolve([]);
            }
        };

        getRequest.onerror = () => {
            console.error(`Error loading shape "${shape_id}" from IndexedDB.`);
            reject(getRequest.error);
        };
    });
}

// Helper to add stop to route and display on map
function addStopToRoute(stop, stopLatLng) {
    const stopName = stop.stop_name.trim();
    addedBusStops.push({
        stop_name: stopName,
        stop_lat: stop.stop_lat,
        stop_lon: stop.stop_lon,
    });

    console.log(`Adding stop to route: ${stopName} at ${stopLatLng}`);

    // Add a marker for the stop on the map
    L.circleMarker(stopLatLng, {
        radius: 8,
        color: "green",
        opacity: 1,
    }).addTo(map).bindPopup(stopName);
}

function enableRouteCreation() {
    isCreatingRoute = true;
    window.stopsArray = window.stopsArray || [];
    window.map.on('click', onMapClick);
}

function updateRoute() {
    console.log("Updating route with stopsArray:", window.stopsArray);

    // Ensure there are enough waypoints to create a route
    if (!window.stopsArray || window.stopsArray.length < 2) {
        console.warn("Not enough waypoints to draw a route.");
        return;
    }

    try {
        // Initialize routing control if not already done
        if (!window.routingControl) {
            window.routingControl = L.Routing.control({
                waypoints: [],
                createMarker: () => null, // No markers initially
            }).addTo(window.map);
        }

        // Update waypoints for routing control
        const waypoints = window.stopsArray.map(stop => L.latLng(stop[0], stop[1]));
        window.routingControl.setWaypoints(waypoints);
        console.log("Waypoints updated:", waypoints);

    } catch (error) {
        console.error("Error updating route:", error);
    }
} // End of updateRoute function

// Function to download data as JSON
function downloadJSON(data, filename) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
}

// Function to save the current drawn route as JSON
function downloadDrawnRoute() {
    if (window.stopsArray && window.stopsArray.length > 0) {
        downloadJSON(window.stopsArray, 'drawn_route.json');
    } else {
        console.warn("No route points to save.");
    }
}

// Function to save the current added bus stops as JSON
function downloadBusStops() {
    if (window.allBusStops && window.allBusStops.length > 0) {
        downloadJSON(window.allBusStops, 'bus_stops.json');
    } else {
        console.warn("No bus stops to save.");
    }
}

function calculateRouteLength() {
    if (!window.routingControl) {
        console.error("Routing control not defined. Cannot calculate route length.");
        return 0;
    }

    const waypoints = window.routingControl.getPlan().getWaypoints();
    if (!waypoints || waypoints.length < 2) {
        console.error("Invalid waypoints. Cannot calculate length.");
        return 0;
    }

    let totalDistance = 0;
    for (let i = 0; i < waypoints.length - 1; i++) {
        const latLng1 = waypoints[i].latLng;
        const latLng2 = waypoints[i + 1].latLng;
        if (latLng1 && latLng2) {
            totalDistance += latLng1.distanceTo(latLng2);
        }
    }

    console.log("Calculated total route length:", totalDistance);
    return totalDistance;
} // End of calculateRouteLength function

// Added missing function onMapClick
function onMapClick(e) {
    console.log("Map clicked at coordinates:", e.latlng);

    if (isCreatingRoute) {
        // Add the clicked point to the stops array
        window.stopsArray.push([e.latlng.lat, e.latlng.lng]);
        console.log("Added stop to route:", e.latlng);

        // Update the route with the newly added point
        updateRoute();
    }
}
window.onMapClick = onMapClick; // Ensure it is globally accessible