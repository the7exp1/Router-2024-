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
            await loadAndParseStopsFiles(); // This should parse and populate `allBusStops`
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

    const routeInfoSidebar = document.getElementById('routeInfoSidebar');
    const mainSidebar = document.getElementById('sidebar');

    if (routeInfoSidebar && mainSidebar) {
        routeInfoSidebar.style.display = 'block';
        routeInfoSidebar.style.visibility = 'visible';
        routeInfoSidebar.style.transform = 'translateX(0)';
        routeInfoSidebar.style.opacity = '1';
        routeInfoSidebar.style.backgroundColor = getRouteColorByType(route.route_type);
        mainSidebar.style.display = 'none';

        const routeTitleElement = document.getElementById('routeTitle');
        const routeTypeTextElement = document.getElementById('routeTypeText');
        const routeNameInput = document.getElementById('routeNameInput');

        if (routeTitleElement) {
            routeTitleElement.textContent = route.routeName;
        }

        if (routeTypeTextElement) {
            routeTypeTextElement.textContent = `Route Type: ${route.route_type}`;
        }

        if (routeNameInput) {
            routeNameInput.value = route.routeName;
        } else {
            console.error("Element with ID 'routeNameInput' not found.");
        }

        console.log("Route info sidebar should now be visible with updated content.");
    } else {
        console.error("Sidebar elements not found. Ensure correct IDs are used in the HTML.");
        return;
    }

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
                // Mark the first shape as the main route, others as branches
                const isMainRoute = (index === 0);
                drawRoute(waypoints, route.route_type, shape_id, isMainRoute);

                if (!isMainRoute) {
                    // Create a dynamic branch icon using the route number or name
                    const branchIcon = createBranchIcon(route.routeName || route.route_id);
                    L.marker(waypoints[0], { icon: branchIcon }).addTo(map);
                    console.log(`Added branch marker for shape ID: ${shape_id} at starting point.`);
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
    }).addTo(map);

    console.log("Route drawn successfully with waypoints:", waypoints);

    // Place markers at key points for branches/deviations
    if (!isMainRoute) {
        // Place a route icon marker at the start of the branch
        const startMarker = L.marker(latLngs[0], { icon: routeBranchIcon }).addTo(map);
        console.log(`Added branch marker for shape ID: ${shapeId} at starting point.`);
    }

    // Fit the map to the bounds of the drawn route
    const bounds = L.latLngBounds(latLngs);
    map.fitBounds(bounds);
}


function loadWaypointsFromShape(shape_id) {
    return new Promise((resolve, reject) => {
        if (!dbInstance) {
            console.error("IndexedDB is not initialized.");
            reject("IndexedDB is not initialized");
            return;
        }

        console.log(`Attempting to load waypoints for shape ID: ${shape_id}`);

        const transaction = dbInstance.transaction("shapes", "readonly");
        const store = transaction.objectStore("shapes");
        const getRequest = store.get(shape_id);

        getRequest.onsuccess = () => {
            const shapeData = getRequest.result;
            if (shapeData && shapeData.coordinates) {
                console.log(`Waypoints retrieved for shape ${shape_id}:`, shapeData.coordinates); // Log the coordinates
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

// Create a custom icon using Leaflet
const routeBranchIcon = L.divIcon({
    className: 'route-branch-icon',
    html: '<div style="background-color: #003399; color: white; padding: 5px; border-radius: 3px;">40</div>',
    iconSize: [30, 30], // Width and height of the icon
    iconAnchor: [15, 15] // Center the icon over the point
});

// Add event listener for the back button in the route info sidebar
document.getElementById('backButton').addEventListener('click', () => {
    const routeInfoSidebar = document.getElementById('routeInfoSidebar');
    const mainSidebar = document.getElementById('sidebar');

    if (routeInfoSidebar && mainSidebar) {
        // Hide the route info sidebar
        routeInfoSidebar.style.display = 'none';

        // Show the main sidebar
        mainSidebar.style.display = 'block';

        // Stop route creation/editing
        isCreatingRoute = false;
        currentRouteId = null;

        // Clear any active route editing controls
        if (window.routingControl) {
            window.map.removeControl(window.routingControl);
            window.routingControl = null;
        }

        // Clear any route markers
        window.stopsArray = [];
        window.addedBusStops = [];

        // Remove click handler for adding waypoints if it was active
        window.map.off('click', onMapClick);

        console.log("Back button clicked. Route editing/creation has been stopped and sidebars have been updated.");
    } else {
        console.error("Sidebar elements not found. Ensure correct IDs are used in the HTML.");
    }
});

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

function updateRoute() {
    if (window.routingControl) {
        map.removeControl(window.routingControl); // Remove existing routing control to refresh with new styles
        console.log("Removed existing routing control to apply new styles.");
    }

    // Get the color and width from the selected route type
    const routeColor = getRouteColorByType(window.selectedRouteType);
    const routeWeight = 8; // Set a thicker line

    console.log("Route Type:", window.selectedRouteType); // Debugging output
    console.log("Route Color Selected:", routeColor); // Debugging output
    console.log("Route Line Weight:", routeWeight); // Debugging output

    // Re-create the routing control with updated styles
    window.routingControl = L.Routing.control({
        waypoints: window.stopsArray.map(coord => L.latLng(coord[0], coord[1])),
        createMarker: () => null,
        routeWhileDragging: true,
        show: false, // Disable the default directions box
        lineOptions: {
            styles: [{
                color: routeColor, // Update the color using the selected route type
                opacity: 1,
                weight: routeWeight // Make the line thicker
            }]
        }
    }).addTo(map);

    addBusStopsAlongRouteWithEnhancedPrecision(window.stopsArray);
    updateBusStopSidebar(addedBusStops);
    document.getElementById("busStopSidebar").style.display = "block";
}



function getRouteColorByType(routeType) {
    switch (routeType) {
        case "local":
            return "blue";
        case "express":
            return "red";
        case "limited":
            return "green";
        case "special":
            return "purple";
        case "summer-express":
            return "orange";
        default:
            return "black";
    }
}


function getStreetNameFromStopName(stopName) {
    const stopParts = stopName.split(/[@\/]/); // Split by '@' or '/'
    return stopParts[0].trim().toUpperCase(); // Use only the first part, trim spaces, and make uppercase
}

function normalizeStreetName(streetName) {
    if (!streetName) return "";

    // Convert to uppercase for case-insensitive matching
    let normalized = streetName.toUpperCase();

    // Remove common suffixes that might differ in names
    const suffixes = [" AVENUE", " ROAD", " PLAZA", " STREET", " BOULEVARD", " LANE", " DRIVE", " COURT", " TERRACE", " PARKWAY", " SQUARE", " WAY", " POST"];
    
    // Remove each suffix if it appears at the end of the name
    suffixes.forEach(suffix => {
        if (normalized.endsWith(suffix)) {
            normalized = normalized.replace(suffix, "");
        }
    });

    // Trim any remaining whitespace
    return normalized.trim();
}


// Improved street name matching with leeway for minor variations
function areStreetNamesSimilar(streetName1, streetName2) {
    // Normalize both street names for consistent comparison
    const normalized1 = normalizeStreetName(streetName1);
    const normalized2 = normalizeStreetName(streetName2);

    // Check if one street name contains the other (substring containment)
    return normalized1.includes(normalized2) || normalized2.includes(normalized1);
}

// Define THRESHOLD_DISTANCE at the top of the script to use it globally
const THRESHOLD_DISTANCE = 100; // Adjust this value as needed

// Use the improved function to match street names
async function addBusStopsAlongRouteWithEnhancedPrecision(drawnRoute) {
    const thresholdDistance = 150; // Consider increasing this value if necessary
    addedBusStops = []; // Reset the list of added bus stops
    let currentStreetName = null;

    console.log("Starting to add bus stops with enhanced precision.");

    for (let i = 0; i < drawnRoute.length - 1; i++) {
        const segmentStart = drawnRoute[i];
        const segmentEnd = drawnRoute[i + 1];

        // Get street name for the current segment start point
        const streetName = await getStreetNameForSegment(segmentStart);
        if (streetName && streetName !== currentStreetName) {
            currentStreetName = streetName;
            currentStreetName = streetName;
        }

        if (!currentStreetName) {
            console.warn(`Street name could not be found for segment starting at ${segmentStart}`);
            continue;
        }


        // Iterate over all bus stops to check if they are close to the current segment
        allBusStops.forEach((stop) => {
            const stopLatLng = [parseFloat(stop.stop_lat), parseFloat(stop.stop_lon)];
            const stopStreetName = getStreetNameFromStopName(stop.stop_name);

            // Calculate distance from stop to segment
            const distance = calculatePerpendicularDistance(stopLatLng, segmentStart, segmentEnd);

            if (distance <= thresholdDistance && areStreetNamesSimilar(stopStreetName, currentStreetName)) {

                // Check if stop is already added to avoid duplicates
                const isAlreadyAdded = addedBusStops.some((addedStop) =>
                    addedStop.stop_lat === stop.stop_lat && addedStop.stop_lon === stop.stop_lon
                );

                if (!isAlreadyAdded) {
                    addedBusStops.push({
                        stop_name: stop.stop_name,
                        stop_lat: stop.stop_lat,
                        stop_lon: stop.stop_lon,
                    });

                    // Add marker on map for debugging purposes
                    L.circleMarker(stopLatLng, {
                        radius: 8,
                        color: "green",
                        opacity: 1,
                    }).addTo(map).bindPopup(stop.stop_name);
                }
            }
        });
    }

    console.log("Final list of added stops:", addedBusStops);
    updateBusStopSidebar(addedBusStops);
}

function interpolateWaypoints(route, numPoints = 15) {
    const interpolatedRoute = [];

    for (let i = 0; i < route.length - 1; i++) {
        const startPoint = route[i];
        const endPoint = route[i + 1];

        interpolatedRoute.push(startPoint);

        // Add intermediate points between startPoint and endPoint
        for (let j = 1; j <= numPoints; j++) {
            const fraction = j / (numPoints + 1);
            const interpolatedLat = startPoint[0] + fraction * (endPoint[0] - startPoint[0]);
            const interpolatedLng = startPoint[1] + fraction * (endPoint[1] - startPoint[1]);
            interpolatedRoute.push([interpolatedLat, interpolatedLng]);
        }
    }

    interpolatedRoute.push(route[route.length - 1]); // Add the last point
    return interpolatedRoute;
}

// Ensure getStreetNameFromMap dynamically returns the correct street name based on the route
async function getStreetNameFromMap(drawnRoute) {
    const firstPoint = drawnRoute[0];
    const streetName = await fetchStreetNameForCoordinate(firstPoint[0], firstPoint[1]);
    return streetName || "Unknown";
}

async function fetchStreetNameForCoordinate(lat, lng) {
    try {
        // Use an open geocoding API or Mapbox/OSM if you have access.
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
        const data = await response.json();

        if (data && data.address && data.address.road) {
            return data.address.road.toUpperCase();
        } else {
            console.warn("No street name found for coordinate:", lat, lng);
            return null;
        }
    } catch (error) {
        console.error("Error fetching street name for coordinate:", error);
        return null;
    }
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

// Function to clean street names for flexible matching
function cleanStreetName(streetName) {
    if (!streetName) return '';
    return streetName.toUpperCase().replace(/\b(S|N|E|W)\b\.?\s*/g, '').trim();
}

async function getStreetNameForSegment(start) {
    try {
        // Use the start coordinate to get the street name.
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${start[0]}&lon=${start[1]}`);
        const data = await response.json();

        if (data && data.address && data.address.road) {
            return data.address.road.toUpperCase(); // Convert to uppercase for consistency
        } else {
            console.warn("No street name found for coordinates:", start);
            return null; // No street name found
        }
    } catch (error) {
        console.error("Error fetching street name for segment:", error);
        return null;
    }
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

function calculatePerpendicularDistance(point, segmentStart, segmentEnd) {
    const [px, py] = point;
    const [sx, sy] = segmentStart;
    const [ex, ey] = segmentEnd;

    const ap = [px - sx, py - sy];
    const ab = [ex - sx, ey - sy];

    const abSquared = ab[0] ** 2 + ab[1] ** 2;
    const dotProduct = ap[0] * ab[0] + ap[1] * ab[1];
    let t = dotProduct / abSquared;

    // Clamp t to ensure the closest point is on the segment
    t = Math.max(0, Math.min(1, t));

    const closestPoint = [sx + t * ab[0], sy + t * ab[1]];

    const dx = px - closestPoint[0];
    const dy = py - closestPoint[1];

    return Math.sqrt(dx * dx + dy * dy) * 111139; // Convert degrees to meters
}

// Helper function to check if a point lies within the bounds of a segment projection
function isOnSegmentProjection(point, segmentStart, segmentEnd) {
    const [px, py] = point;
    const [sx, sy] = segmentStart;
    const [ex, ey] = segmentEnd;

    const dotProduct = (px - sx) * (ex - sx) + (py - sy) * (ey - sy);
    const segmentLengthSquared = (ex - sx) ** 2 + (ey - sy) ** 2;

    return dotProduct >= 0 && dotProduct <= segmentLengthSquared;
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

    window.stopsArray = window.stopsArray.map((point) => {
        const nearestStop = findNearestBusStop(point[0], point[1], THRESHOLD_DISTANCE);
        if (nearestStop) {
            console.log(`Snapped point to nearest stop: ${nearestStop.stop_name}`);
            return [nearestStop.stop_lat, nearestStop.stop_lon];
        }
        return point;
    });

    console.log("Updated stopsArray after snapping:", window.stopsArray);
}

function findNearestBusStop(lat, lng, radius = 150) {
    if (!allBusStops || allBusStops.length === 0) {
        console.warn("allBusStops is empty.");
        return null;
    }

    lat = parseFloat(lat);
    lng = parseFloat(lng);

    if (isNaN(lat) || isNaN(lng)) {
        console.error("Invalid lat/lng values passed to findNearestBusStop:", lat, lng);
        return null;
    }

    let nearestStop = null;
    let shortestDistance = radius;

    allBusStops.forEach((stop) => {
        const stopLat = parseFloat(stop.stop_lat);
        const stopLon = parseFloat(stop.stop_lon);

        if (isNaN(stopLat) || isNaN(stopLon)) {
            console.warn(`Skipping invalid stop coordinates: ${stop.stop_lat}, ${stop.stop_lon}`);
            return;
        }

        const distance = calculateDistance([lat, lng], [stopLat, stopLon]);
        if (distance < shortestDistance) {
            nearestStop = stop;
            shortestDistance = distance;
        }
    });

    return nearestStop;
}

function onMapClick(e) {
    if (!isCreatingRoute) return;

    let lat = parseFloat(e.latlng.lat);
    let lng = parseFloat(e.latlng.lng);

    if (isNaN(lat) || isNaN(lng)) {
        console.error("Invalid map click coordinates:", e.latlng);
        return;
    }

    console.log("Map clicked at:", lat, lng);

    let snappedPoint = [lat, lng];

    // Snap the start point to the nearest bus stop
    if (window.stopsArray.length === 0) {
        const nearestStartStop = findNearestBusStop(lat, lng);
        if (nearestStartStop) {
            snappedPoint = [nearestStartStop.stop_lat, nearestStartStop.stop_lon];
            console.log(`Snapped start point to nearest stop: ${nearestStartStop.stop_name}`);
        }
    }

    // Snap the end point to the nearest bus stop when adding the last point
    if (window.stopsArray.length > 0) {
        const nearestEndStop = findNearestBusStop(lat, lng);
        if (nearestEndStop) {
            snappedPoint = [nearestEndStop.stop_lat, nearestEndStop.stop_lon];
            console.log(`Snapped end point to nearest stop: ${nearestEndStop.stop_name}`);
        }
    }

    window.stopsArray.push(snappedPoint);
    console.log("Updated window.stopsArray:", window.stopsArray);

    L.circleMarker(snappedPoint, {
        radius: 6,
        color: "blue"
    }).addTo(map).bindPopup(`Stop ${window.stopsArray.length}`).openPopup();

    updateRoute();
}

function calculateDistance([lat1, lon1], [lat2, lon2]) {
    // Verify the coordinates are valid numbers
    if (isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2)) {
        console.error("Invalid coordinates for distance calculation:", lat1, lon1, lat2, lon2);
        return NaN;
    }

    const R = 6371e3; // Radius of Earth in meters
    const toRad = (deg) => (deg * Math.PI) / 180;

    const φ1 = toRad(lat1);
    const φ2 = toRad(lat2);
    const Δφ = toRad(lat2 - lat1);
    const Δλ = toRad(lon2 - lon1);

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Returns distance in meters
}
function onAddEndPoint() {
    // Existing code for adding the end point...
    addBusStopsAlongRouteWithEnhancedPrecision(window.stopsArray); // Ensure bus stops are added first
    showBusStopSidebar(); // Show the sidebar after adding stops
}

function finalizeRoute() {
    isCreatingRoute = false;

    if (window.map) {
        window.map.off("click", onMapClick);
        console.log("Double-click detected. Finalizing route.");
    }

    snapToNearestBusStops();
    updateRoute();

    const routeLength = calculateRouteLength();
    const stopCount = window.stopsArray.length;

    if (typeof updateRouteInfo === 'function') {
        updateRouteInfo(routeLength, stopCount);
    } else {
        console.error("updateRouteInfo function is missing. Unable to update route information.");
    }

    if (routeLength > 0 && stopCount > 1) {
        const routeNameInput = document.getElementById("routeNameInput");
        let routeName = routeNameInput ? routeNameInput.value.trim() : "";

        if (!routeName) {
            routeName = currentRouteId ? `Modified Route ${currentRouteId}` : `Route ${Date.now()}`;
        }

        // Get the selected route type from the dropdown instead of an input with name attribute
        const routeTypeSelect = document.getElementById("routeTypeSelect");
        const routeType = routeTypeSelect ? routeTypeSelect.value : "local";

        const routeData = {
            id: currentRouteId || Date.now(),
            routeName: routeName,
            routeType: routeType,
            waypoints: window.stopsArray,
            stops: window.addedBusStops,
            length: routeLength,
            stopCount: stopCount
        };

        saveCurrentRoute(routeData);
        console.log(`Route "${routeName}" finalized and saved successfully.`);

        currentRouteId = null;
    } else {
        console.warn("Not enough waypoints to finalize the route.");
    }

    console.log("Finalized stopsArray:", window.stopsArray);
}

function addUniqueStop(stop) {
    const existingStop = window.stopsArray.find(s => s[0] === stop[0] && s[1] === stop[1]);
    if (!existingStop) {
        window.stopsArray.push(stop);
    }
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

// Ensure this runs after the map is fully initialized
document.addEventListener("mapInitialized", () => {
    if (window.map && window.map instanceof L.Map) {
        console.log("Map initialized. Binding double-click event for route finalization.");

        // Bind double-click event to finalizeRoute
        window.map.on("dblclick", finalizeRoute);
    } else {
        console.error("Map instance not available or not a valid Leaflet map instance.");
    }

    // Additional map setup code if needed
    // For example, enabling route creation if a button is clicked
    const createRouteButton = document.getElementById("createRoute");
    if (createRouteButton) {
        createRouteButton.addEventListener("click", () => {
            enableRouteCreation();
            console.log("Route creation started.");
        });
    } else {
        console.warn("Create Route button not found.");
    }
});
