// Load stops and parse from both stops.txt and stops2.txt
window.allBusStops = [];
document.addEventListener("mapInitialized", () => {
    if (!window.map || !(window.map instanceof L.Map)) {
        console.error("Map is not properly initialized as a Leaflet map.");
        return;
    }

    if (!window.busStopLayerGroup || !(window.busStopLayerGroup instanceof L.LayerGroup)) {
        window.busStopLayerGroup = L.layerGroup().addTo(window.map);
        console.log("Initialized busStopLayerGroup inside map-busstops.js.");
    }

    // Open IndexedDB
    const request = indexedDB.open("routerDB", 3);

    request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains("busStops")) {
            db.createObjectStore("busStops", { keyPath: "stop_id" });
            console.log("Created 'busStops' object store.");
        }
    };

    request.onsuccess = (event) => {
        const db = event.target.result;
        checkIndexedDBForStops(db);
    };

    request.onerror = () => {
        console.error("Failed to open IndexedDB.");
        loadAndParseStopsFiles(); // Fallback to loading files if IndexedDB fails
    };

    // Check if stops data exists in IndexedDB
    function checkIndexedDBForStops(db) {
        const transaction = db.transaction("busStops", "readonly");
        const store = transaction.objectStore("busStops");
        const getAllRequest = store.getAll();

getAllRequest.onsuccess = () => {
    const stopsData = getAllRequest.result;
    if (stopsData && stopsData.length > 0) {
        console.log("Retrieved stops data from IndexedDB.");
        allBusStops = stopsData; // Assign data to allBusStops
    } else {
        console.log("No stops data found in IndexedDB. Loading from files.");
        loadAndParseStopsFiles(db);
    }
};

        getAllRequest.onerror = () => {
            console.error("Error retrieving stops data from IndexedDB.");
            loadAndParseStopsFiles(db);
        };
    }

    // Load and parse stops from files if not in IndexedDB
    const loadStopsFile = async (fileName) => {
        try {
            console.log(`Attempting to load file: ${fileName}`);
            const response = await fetch(fileName);
            if (!response.ok) {
                console.error(`Failed to load ${fileName}. Status: ${response.status}`);
                return [];
            }

            const text = await response.text();
            const lines = text.split(/\r?\n/).map(line => line.trim());

            if (lines.length === 0) {
                console.error(`File ${fileName} is empty.`);
                return [];
            }

            const headers = lines[0].split(',').map(header => header.trim().toLowerCase());
            const stopIdIndex = headers.indexOf("stop_id");
            const stopNameIndex = headers.indexOf("stop_name");
            const stopLatIndex = headers.indexOf("stop_lat");
            const stopLonIndex = headers.indexOf("stop_lon");

            if (stopIdIndex === -1 || stopNameIndex === -1 || stopLatIndex === -1 || stopLonIndex === -1) {
                console.error(`Missing required fields in ${fileName}.`);
                return [];
            }

            const stops = [];
            for (let i = 1; i < lines.length; i++) {
                const columns = lines[i].split(',').map(col => col.trim());
                const stop_id = columns[stopIdIndex];
                const stop_name = columns[stopNameIndex]?.replace(/["\\]/g, '').normalize('NFKC').trim();
                const stop_lat = parseFloat(columns[stopLatIndex]);
                const stop_lon = parseFloat(columns[stopLonIndex]);

                if (!isNaN(stop_lat) && !isNaN(stop_lon)) {
                    stops.push({ stop_id, stop_name, stop_lat, stop_lon });
                }
            }

            return stops;
        } catch (error) {
            console.error(`Error loading ${fileName}:`, error.message);
            return [];
        }
    };

    // Load stops from files and store in IndexedDB
async function loadAndParseStopsFiles(db) {
    const stops1 = await loadStopsFile('stops.txt');
    const stops2 = await loadStopsFile('stops2.txt');
    const allStops = [...stops1, ...stops2];

    if (allStops.length > 0) {
        console.log(`Total stops parsed: ${allStops.length}`);
        allBusStops = allStops; // Assign data to allBusStops
        storeStopsInIndexedDB(db, allStops);
    } else {
        console.warn("No valid stops data found.");
    }
}

    // Store stops in IndexedDB
    function storeStopsInIndexedDB(db, stops) {
        const transaction = db.transaction("busStops", "readwrite");
        const store = transaction.objectStore("busStops");

        stops.forEach((stop) => {
            store.put(stop);
        });

        transaction.oncomplete = () => {
            console.log("Bus stops data successfully stored in IndexedDB.");
        };

        transaction.onerror = () => {
            console.error("Error storing bus stops data in IndexedDB.");
        };
    }

    // Dispatch a custom event once all stops are loaded
    document.dispatchEvent(new Event("stopsLoaded"));
    console.log("Custom event 'stopsLoaded' dispatched after loading stops.");
});