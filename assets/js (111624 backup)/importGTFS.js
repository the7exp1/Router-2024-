// Event listener for the GTFS import button
document.getElementById("importGTFS").addEventListener("click", () => {
    document.getElementById("gtfsFileInput").click();
});

// Event listener for GTFS file input change
document.getElementById("gtfsFileInput").addEventListener("change", async (event) => {
    const file = event.target.files[0];

    if (!file) {
        alert("No file selected!");
        return;
    }

    if (!file.name.endsWith(".zip")) {
        alert("Please select a valid GTFS .zip file.");
        return;
    }

    try {
        // Load the zip file using JSZip
        const zip = await JSZip.loadAsync(file);
        const files = zip.files;

        // Ensure required GTFS files exist
        const requiredFiles = ["stops.txt", "routes.txt", "stop_times.txt", "shapes.txt", "trips.txt"];
        for (const fileName of requiredFiles) {
            if (!files[fileName]) {
                alert(`Missing required GTFS file: ${fileName}`);
                return;
            }
        }

        // Read and parse the contents of the files
        const stopsText = await files["stops.txt"].async("text");
        const routesText = await files["routes.txt"].async("text");
        const stopTimesText = await files["stop_times.txt"].async("text");
        const shapesText = await files["shapes.txt"].async("text");
        const tripsText = await files["trips.txt"].async("text");

        const stopsData = parseCSV(stopsText);
        const routesData = parseCSV(routesText);
        const stopTimesData = parseCSV(stopTimesText);
        const shapesData = parseCSV(shapesText);
        const tripsData = parseCSV(tripsText);

        // Format and link the data before storing it in IndexedDB
        const formattedStops = formatStops(stopsData);
        const formattedStopTimes = formatStopTimes(stopTimesData);
        const formattedShapes = formatShapes(shapesData);
        const formattedRoutes = formatRoutes(routesData, stopTimesData, stopsData, shapesData, tripsData);

        // Open IndexedDB and store the formatted data
        const request = indexedDB.open("routerDB", 3);

        // Add the onupgradeneeded handler here
        request.onupgradeneeded = (event) => {
            const db = event.target.result;

            // Define object stores with consistent key paths
            if (!db.objectStoreNames.contains("busStops")) {
                db.createObjectStore("busStops", { keyPath: "stop_id" });
            }
            if (!db.objectStoreNames.contains("routes")) {
                db.createObjectStore("routes", { keyPath: "route_id" });
            }
            if (!db.objectStoreNames.contains("stopTimes")) {
                db.createObjectStore("stopTimes", { keyPath: "trip_id" });
            }
            if (!db.objectStoreNames.contains("shapes")) {
                db.createObjectStore("shapes", { keyPath: "shape_id" }); // Ensure shape_id is used as the key path
            }
        };

        // Success handler for when the database is opened successfully
        request.onsuccess = (event) => {
            const db = event.target.result;

            // Store all data in IndexedDB
            storeDataInIndexedDB(db, "busStops", formattedStops);
            storeDataInIndexedDB(db, "routes", formattedRoutes);
            storeDataInIndexedDB(db, "stopTimes", formattedStopTimes);
            storeDataInIndexedDB(db, "shapes", formattedShapes);
        };

        // Error handler for the database open request
        request.onerror = () => {
            console.error("Failed to open IndexedDB.");
            alert("An error occurred while accessing the database.");
        };

    } catch (error) {
        console.error("Error processing the GTFS file:", error);
        alert("An error occurred while processing the GTFS file.");
    }
});

// Parse CSV content into an array of objects
function parseCSV(csvText) {
    const rows = csvText.split("\n").map(row => row.trim()).filter(row => row);
    if (rows.length <= 1) {
        console.error("CSV data appears to be empty or incorrectly formatted.");
        return [];
    }
    const headers = rows[0].split(",");
    return rows.slice(1).map(row => {
        const values = row.split(",");
        const obj = {};
        headers.forEach((header, index) => {
            obj[header] = values[index];
        });
        return obj;
    });
}

// Function to format stops data
function formatStops(stopsData) {
    return stopsData.map(stop => ({
        stop_id: stop.stop_id,
        stop_name: stop.stop_name,
        stop_lat: parseFloat(stop.stop_lat),
        stop_lon: parseFloat(stop.stop_lon),
    }));
}

// Function to format stop times data
function formatStopTimes(stopTimesData) {
    return stopTimesData.map(stopTime => ({
        trip_id: stopTime.trip_id,
        stop_id: stopTime.stop_id,
        arrival_time: stopTime.arrival_time,
        departure_time: stopTime.departure_time,
        stop_sequence: parseInt(stopTime.stop_sequence),
    }));
}

// Function to format shapes data for polylines
function formatShapes(shapesData) {
    const shapesMap = {};

    shapesData.forEach(shape => {
        const shapeId = String(shape.shape_id); // Ensure shape_id is a string for consistency
        const lat = parseFloat(shape.shape_pt_lat);
        const lon = parseFloat(shape.shape_pt_lon);
        const sequence = parseInt(shape.shape_pt_sequence);

        if (!shapesMap[shapeId]) {
            shapesMap[shapeId] = [];
        }

        shapesMap[shapeId].push({ sequence, lat, lon });
    });

    return Object.keys(shapesMap).map(shapeId => {
        const sortedCoordinates = shapesMap[shapeId]
            .sort((a, b) => a.sequence - b.sequence)
            .map(point => [point.lat, point.lon]);

        console.log(`Formatted shape for shape_id ${shapeId}:`, sortedCoordinates); // Debugging log

        return {
            shape_id: shapeId,
            coordinates: sortedCoordinates
        };
    });
}

// Function to format routes data
function formatRoutes(routesData, stopTimesData, stopsData, shapesData, tripsData) {
    const stopsMap = {};
    stopsData.forEach(stop => {
        stopsMap[stop.stop_id] = {
            stop_id: stop.stop_id,
            stop_name: stop.stop_name,
            stop_lat: parseFloat(stop.stop_lat),
            stop_lon: parseFloat(stop.stop_lon),
        };
    });

    const shapesMap = {};
    shapesData.forEach(shape => {
        const shapeId = String(shape.shape_id); // Ensure shape_id is a string
        if (!shapesMap[shapeId]) {
            shapesMap[shapeId] = [];
        }
        shapesMap[shapeId].push({
            lat: parseFloat(shape.shape_pt_lat),
            lng: parseFloat(shape.shape_pt_lon),
            sequence: parseInt(shape.shape_pt_sequence)
        });
    });

    // Sort waypoints in each shape by sequence
    Object.keys(shapesMap).forEach(shapeId => {
        shapesMap[shapeId].sort((a, b) => a.sequence - b.sequence);
    });

    // Create a mapping of route_id to shape_ids from tripsData
    const routeShapeMap = {};
    tripsData.forEach(trip => {
        if (trip.route_id && trip.shape_id) {
            routeShapeMap[trip.route_id] = routeShapeMap[trip.route_id] || [];
            if (!routeShapeMap[trip.route_id].includes(trip.shape_id)) {
                routeShapeMap[trip.route_id].push(trip.shape_id);
            }
        }
    });

    // Process routes
    return routesData.map(route => {
        if (!route.route_id) {
            console.error("Route is missing route_id:", route);
            return null; // Skip this route if route_id is missing
        }

        route.route_id = String(route.route_id);
        const shape_ids = routeShapeMap[route.route_id] || [];

        if (shape_ids.length === 0) {
            console.warn(`Route ${route.route_id} is missing shape_ids. Please verify trips.txt.`);
        } else {
            console.log(`Assigned shape_ids ${shape_ids.join(", ")} to route ${route.route_id}`);
        }

        // Create waypoints from shape data if available
        let waypoints = [];
        shape_ids.forEach(shape_id => {
            if (shapesMap[shape_id]) {
                waypoints = waypoints.concat(shapesMap[shape_id].map(point => ({ lat: point.lat, lng: point.lng })));
                console.log(`Waypoints found for shape_id: ${shape_id}`, shapesMap[shape_id]);
            } else {
                console.warn(`No waypoints or shape ID found for route: ${route.route_id}`);
            }
        });

        // Find relevant stops using stop_times
        const relevantStopTimes = stopTimesData.filter(stopTime => stopTime.trip_id.startsWith(route.route_id));
        const stops = relevantStopTimes.map(stopTime => stopsMap[stopTime.stop_id]).filter(stop => stop);

        return {
            route_id: route.route_id,
            routeName: route.route_desc || route.route_long_name || route.route_short_name || `Route ${route.route_id}`, // Added route_desc priority
            route_type: isNaN(parseInt(route.route_type)) ? route.route_type : "local", // Default to "local" if route_type is a number
            stops: stops,
            waypoints: waypoints,
            shape_ids: shape_ids // Store all shape_ids associated with the route
        };
    }).filter(route => route !== null);
}

function storeDataInIndexedDB(db, storeName, data) {
    const transaction = db.transaction([storeName], "readwrite");
    const objectStore = transaction.objectStore(storeName);

    data.forEach(item => {
        if (!item[objectStore.keyPath]) {
            console.error(`Missing keyPath value for store "${storeName}". Item:`, item);
            return;
        }

        console.log(`Storing item in store "${storeName}":`, item); // Added logging to debug data being saved
        objectStore.put(item);
    });

    transaction.oncomplete = () => {
        console.log(`${storeName} data saved successfully.`);
        alert(`${storeName} data imported successfully.`);
    };

    transaction.onerror = (event) => {
        console.error(`Error storing ${storeName} data:`, event.target.error);
        alert(`Failed to store ${storeName} data.`);
    };
}