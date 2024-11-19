console.log("Is updateRouteInfo defined?", typeof updateRouteInfo);

window.routingControl = null;

function onMapClick(e) {
    if (!isCreatingRoute) return;

    const lat = e.latlng.lat;
    const lng = e.latlng.lng;
    console.log("Map clicked at:", lat, lng);

    // Add the stop to the global window.stopsArray
    window.stopsArray.push([lat, lng]);
    console.log("Updated window.stopsArray:", window.stopsArray);

    // Create a circle marker for the stop
    L.circleMarker([lat, lng], {
        radius: 6,
        color: "blue"
    }).addTo(map).bindPopup(`Stop ${window.stopsArray.length}`).openPopup();

    // Update the route on the map
    updateRoute();
}

function checkStopCoordinates(e, stopLat, stopLng) {
    if (stopLat === null || stopLng === null) {
        console.error("Could not retrieve stop coordinates. Event data:", e);
        return;
    }
}

window.stopsArray = window.stopsArray.filter(stop => stop && stop[0] !== undefined && stop[1] !== undefined);
function onMapClick(e) {
    if (!isCreatingRoute) return;

    const lat = e.latlng.lat;
    const lng = e.latlng.lng;
    let snappedPoint = [lat, lng];

    // Snap the start point to the nearest bus stop
    if (window.stopsArray.length === 0) {
        const nearestStartStop = findNearestBusStop([lat, lng]);
        if (nearestStartStop) {
            snappedPoint = [nearestStartStop.stop_lat, nearestStartStop.stop_lon];
            console.log(`Snapped start point to nearest stop: ${nearestStartStop.stop_name}`);
        }
    }

    // Snap the end point to the nearest bus stop when adding the last point
    if (window.stopsArray.length > 0) {
        const nearestEndStop = findNearestBusStop([lat, lng]);
        if (nearestEndStop) {
            snappedPoint = [nearestEndStop.stop_lat, nearestEndStop.stop_lon];
            console.log(`Snapped end point to nearest stop: ${nearestEndStop.stop_name}`);
        }
    }

    window.stopsArray.push(snappedPoint);

    L.circleMarker(snappedPoint, {
        radius: 4,
        color: "blue"
    }).addTo(map);

    updateRoute();
}

// Function to update the route
function updateRoute() {
    if (routingControl) {
        routingControl.setWaypoints(window.stopsArray);
    } else {
        routingControl = L.Routing.control({
            waypoints: window.stopsArray.map(coord => L.latLng(coord[0], coord[1])),
            createMarker: () => null,
            routeWhileDragging: true,
            show: false // Disable the default directions box
        }).addTo(map);
    }

    addBusStopsAlongRoute(window.stopsArray);
    updateBusStopSidebar(addedBusStops);
document.getElementById("busStopSidebar").style.display = "block";
}

function addBusStopsAlongRoute(drawnRoute) {
    const thresholdDistance = 30;
    addedBusStops = []; // Reset the list of added bus stops

    // Clear previous green markers
    map.eachLayer((layer) => {
        if (layer instanceof L.CircleMarker && layer.options.color === "green") {
            map.removeLayer(layer);
        }
    });

    // Iterate over all bus stops
    allBusStops.forEach((stop) => {
        const stopLatLng = [stop.stop_lat, stop.stop_lon];
        let isNearRoute = false;

        // Check if the stop is near any segment of the drawn route
        for (let i = 0; i < drawnRoute.length - 1; i++) {
            const segmentStart = [drawnRoute[i][0], drawnRoute[i][1]];
            const segmentEnd = [drawnRoute[i + 1][0], drawnRoute[i + 1][1]];

            const distance = calculatePerpendicularDistance(stopLatLng, segmentStart, segmentEnd);

            if (distance <= thresholdDistance && isOnSegmentProjection(stopLatLng, segmentStart, segmentEnd)) {
                isNearRoute = true;
                break;
            }
        }

        // Add stop if it's near the route
        if (isNearRoute) {
            const stopName = (stop.stop_name || "Unnamed Stop").trim();
            addedBusStops.push({
                stop_name: stopName,
                stop_lat: stop.stop_lat,
                stop_lon: stop.stop_lon,
            });

            // Add a marker for the stop on the map
            L.circleMarker([stop.stop_lat, stop.stop_lon], {
                radius: 8,
                color: "green",
                opacity: 1,
            }).addTo(map).bindPopup(stopName);
        }
    });

    console.log("Final list of added stops:", addedBusStops);
    updateBusStopSidebar(addedBusStops);
}

// Helper function to check if a point lies on the projected line segment
function isOnSegmentProjection(point, segmentStart, segmentEnd) {
    const [px, py] = point;
    const [sx, sy] = segmentStart;
    const [ex, ey] = segmentEnd;

    const dotProduct = (px - sx) * (ex - sx) + (py - sy) * (ey - sy);
    const segmentLengthSquared = (ex - sx) ** 2 + (ey - sy) ** 2;

    return dotProduct >= 0 && dotProduct <= segmentLengthSquared;
}

// Helper function to calculate the perpendicular distance from a point to a line segment
function calculatePerpendicularDistance(point, segmentStart, segmentEnd) {
    const [px, py] = point;
    const [sx, sy] = segmentStart;
    const [ex, ey] = segmentEnd;

    const ap = [px - sx, py - sy];
    const ab = [ex - sx, ey - sy];

    const abSquared = ab[0] ** 2 + ab[1] ** 2;
    const dotProduct = ap[0] * ab[0] + ap[1] * ab[1];
    let t = dotProduct / abSquared;

    t = Math.max(0, Math.min(1, t));

    const closestPoint = [sx + t * ab[0], sy + t * ab[1]];

    const dx = px - closestPoint[0];
    const dy = py - closestPoint[1];

    return Math.sqrt(dx * dx + dy * dy) * 111139; // Convert degrees to meters
}

// Function to enable route creation
function enableRouteCreation() {
    isCreatingRoute = true;
    window.stopsArray = window.stopsArray || [];
    window.map.on('click', onMapClick);
}

// Event listener for Create Route button
document.getElementById("createRoute").addEventListener("click", () => {
    enableRouteCreation();
    console.log("Route creation started.");
});

function snapToNearestBusStops() {
    if (window.stopsArray.length < 2 || allBusStops.length === 0) return;

    const startPoint = window.stopsArray[0];
    const nearestStartStop = findNearestBusStop(startPoint);
    if (nearestStartStop) {
        window.stopsArray[0] = [nearestStartStop.stop_lat, nearestStartStop.stop_lon];
        console.log(`Snapped start point to nearest stop: ${nearestStartStop.stop_name}`);
    }

    const endPoint = window.stopsArray[window.stopsArray.length - 1];
    const nearestEndStop = findNearestBusStop(endPoint);
    if (nearestEndStop) {
        window.stopsArray[window.stopsArray.length - 1] = [nearestEndStop.stop_lat, nearestEndStop.stop_lon];
        console.log(`Snapped end point to nearest stop: ${nearestEndStop.stop_name}`);
    }

    console.log("Updated stopsArray after snapping:", window.stopsArray);
}

// Helper function to find the nearest bus stop to a given point
function findNearestBusStop(point) {
    let nearestStop = null;
    let minDistance = Infinity;

    allBusStops.forEach(stop => {
        const stopLatLng = [stop.stop_lat, stop.stop_lon];
        const distance = calculateDistance(point, stopLatLng);

        if (distance < minDistance) {
            minDistance = distance;
            nearestStop = stop;
        }
    });

    return nearestStop;
}

// Helper function to calculate the distance between two points (in meters)
function calculateDistance(point1, point2) {
    const [lat1, lon1] = point1;
    const [lat2, lon2] = point2;

    const R = 6371000; // Radius of the Earth in meters
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return distance;
}

function onAddEndPoint() {
    // Existing code for adding the end point...
    addBusStopsAlongRoute(window.stopsArray); // Ensure bus stops are added first
    showBusStopSidebar(); // Show the sidebar after adding stops
}

function finalizeRoute() {
    isCreatingRoute = false;
    window.map.off('click', onMapClick);
    console.log("Finalizing route with stopsArray:", window.stopsArray);

    if (!window.stopsArray || window.stopsArray.length === 0) {
        console.error("No stops found. Skipping route info update.");
        updateRouteInfo(0, 0);
        return;
    }

    // Snap the stops to nearest bus stops and update stopsArray
    snapToNearestBusStops();
    addBusStopsAlongRoute(window.stopsArray);

    const routeLength = calculateRouteLength();
    const stopCount = window.stopsArray.length;

    if (typeof routeLength !== 'number' || isNaN(routeLength) || routeLength <= 0) {
        console.error("Invalid route length calculated:", routeLength);
        updateRouteInfo(0, stopCount);
    } else {
        updateRouteInfo(routeLength, stopCount);
    }

    // Get the route name from the modal input field
    const routeNameInput = document.getElementById("routeNameInput");
    const routeName = routeNameInput ? routeNameInput.value.trim() : `Route ${window.savedRoutes?.length + 1 || 1}`;

    // Validate the route name
    if (!routeName) {
        console.warn("No route name provided. Skipping save.");
        return;
    }

    // Save the route using saveCurrentRoute from map-saveroutes.js
    saveCurrentRoute(routeName);
    console.log(`Route "${routeName}" saved successfully.`);
}


function addUniqueStop(stop) {
    const existingStop = window.stopsArray.find(s => s[0] === stop[0] && s[1] === stop[1]);
    if (!existingStop) {
        window.stopsArray.push(stop);
    }
}

function updateRoute() {
    console.log("Updating route with stopsArray:", window.stopsArray);
    if (!window.stopsArray || window.stopsArray.length < 2) {
        console.warn("Not enough waypoints to draw a route.");
        return;
    }

    try {
        if (!window.routingControl) {
            window.routingControl = L.Routing.control({
                waypoints: [],
                createMarker: () => null, // No markers initially
            }).addTo(window.map);
        } else {
            console.warn("Routing control already initialized.");
        }

        // Update waypoints for routing control
        const waypoints = window.stopsArray.map(stop => L.latLng(stop[0], stop[1]));
        window.routingControl.setWaypoints(waypoints);
        console.log("Waypoints updated:", waypoints);

    } catch (error) {
        console.error("Error updating route:", error);
    }
} // End of updateRoute function

document.addEventListener("mapInitialized", () => {
    if (!window.map || !(window.map instanceof L.Map)) {
        console.error("Map is not initialized or is not a valid Leaflet map instance.");
        return;
    }

    // Your existing map-related code goes here, for example:
    window.map.on("dblclick", () => {
        console.log("Double-click detected. Finalizing route.");
        updateRouteInfo();
    });
});

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
