// map-busstops.js - Bus Stops Logic without UI Elements
// Logging Functions
function logError(message) {
    console.error(`[Error]: ${message}`);
}

function logInfo(message) {
    console.info(`[Info]: ${message}`);
}

// Layer group to hold bus stop markers
window.busStopLayerGroup = window.busStopLayerGroup || L.layerGroup();
window.loadAndAddBusStops = loadAndAddBusStops;

// Function to load and add bus stops to the map
async function loadAndAddBusStops(map) {
    if (!map || typeof map.addLayer !== "function") {
        logError("Invalid map instance provided.");
        return;
    }

    if (!busStopLayerGroup) {
        busStopLayerGroup = L.layerGroup().addTo(map);
        logInfo("Bus stop layer group initialized.");
    }

    try {
        const db = await openIndexedDB();
        if (!db) {
            logError("Failed to open bus stops database.");
            return;
        }

        const stops = await getStopsFromDB(db);
        if (stops && stops.length > 0) {
            logInfo("Bus stops retrieved from database.");
            // Removed reference to addBusStopsToMap
        } else {
            logInfo("No stops found in database, loading from files.");
            await loadAndStoreBusStops(db);
        }
    } catch (error) {
        logError(`Error loading bus stops: ${error.message}`);
    }
}

// Function to open IndexedDB for storing bus stops
function openIndexedDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open("routerDB", 3);

        request.onsuccess = (event) => {
            resolve(event.target.result);
        };

        request.onerror = (event) => {
            reject(event.target.error);
        };

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains("busStops")) {
                db.createObjectStore("busStops", { keyPath: "stop_id" });
                logInfo("Created busStops object store in database.");
            }
        };
    });
}

function getStopsFromDB(db) {
    return new Promise((resolve, reject) => {
        if (!db) {
            console.error("IndexedDB is not initialized.");
            reject(new Error("Database not initialized"));
            return;
        }

        const transaction = db.transaction("busStops", "readonly");
        const objectStore = transaction.objectStore("busStops");
        const request = objectStore.getAll();

        request.onsuccess = (event) => resolve(event.target.result);
        request.onerror = (event) => reject(event.target.error);
    });
}

// Attach to the global window object
window.getStopsFromDB = getStopsFromDB;

// Function to load and store bus stops from text files
async function loadAndStoreBusStops(db) {
    try {
        const response = await fetch('stops.txt');
        const text = await response.text();
        const stops = parseStopsFile(text);

        if (stops.length > 0) {
            await storeStopsInDB(stops);
            // Removed reference to addBusStopsToMap
        }
    } catch (error) {
        logError(`Error loading stops file: ${error.message}`);
    }
}

async function storeStopsInDB(stops) {
    if (!window.db) {
        logError("IndexedDB is not initialized.");
        return;
    }

    return new Promise(async (resolve, reject) => {
        try {
            const transaction = window.db.transaction("busStops", "readwrite");
            const objectStore = transaction.objectStore("busStops");

            for (const stop of stops) {
                const existingStopRequest = objectStore.get(stop.stop_id);

                existingStopRequest.onsuccess = () => {
                    const existingStop = existingStopRequest.result;

                    if (!existingStop) {
                        objectStore.put(stop);
                    }
                };

                existingStopRequest.onerror = (event) => {
                    logError(`Error checking stop in IndexedDB: ${event.target.error}`);
                };
            }

            transaction.oncomplete = () => {
                document.dispatchEvent(new Event("stopsLoaded"));
                resolve();
            };

            transaction.onerror = (event) => {
                logError("Failed to store bus stops in IndexedDB.");
                reject(event.target.error);
            };
        } catch (error) {
            logError(`Transaction error: ${error.message}`);
            reject(error);
        }
    });
}

// Function to parse stops from text files
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
            stop[header] = values[index];
        });

        stops.push(stop);
    }

    logInfo("Parsed stops from file.");

    return stops;
}