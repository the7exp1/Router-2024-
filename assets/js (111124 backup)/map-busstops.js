// Load stops and parse from both stops.txt and stops2.txt
document.addEventListener("mapInitialized", () => {
    if (!window.map || !(window.map instanceof L.Map)) {
        console.error("Map is not properly initialized as a Leaflet map.");
        return;
    }

    if (!window.busStopLayerGroup || !(window.busStopLayerGroup instanceof L.LayerGroup)) {
        window.busStopLayerGroup = L.layerGroup().addTo(window.map);
        console.log("Initialized busStopLayerGroup inside map-busstops.js.");
    }

    // Function to load and parse stops from a file
const loadStopsFile = async (fileName) => {
    try {
        console.log(`Attempting to load file: ${fileName}`);
        const response = await fetch(fileName);
        if (!response.ok) {
            console.error(`Failed to load ${fileName}. Status: ${response.status}`);
            return [];
        }

        const text = await response.text();
        console.log(`Loaded content from ${fileName}:\n${text.slice(0, 200)}...`);

        const lines = text.split(/\r?\n/).map(line => line.trim());
        console.log(`Total lines found in ${fileName}: ${lines.length}`);

        if (lines.length === 0) {
            console.error(`File ${fileName} is empty.`);
            return [];
        }

        // Parse the header line and detect column indices
        const headers = lines[0].split(',').map(header => header.trim().toLowerCase());
        console.log(`Parsed headers from ${fileName}:`, headers);

        const stopIdIndex = headers.indexOf("stop_id");
        const stopNameIndex = headers.indexOf("stop_name");
        const stopLatIndex = headers.indexOf("stop_lat");
        const stopLonIndex = headers.indexOf("stop_lon");

        console.log(`Field indices for ${fileName}:`, {
            stopIdIndex,
            stopNameIndex,
            stopLatIndex,
            stopLonIndex,
        });

        if (stopIdIndex === -1 || stopNameIndex === -1 || stopLatIndex === -1 || stopLonIndex === -1) {
            console.error(`Missing required fields in ${fileName}.`);
            return [];
        }

        const stops = [];
        for (let i = 1; i < lines.length; i++) {
            const columns = lines[i].split(',').map(col => col.trim());
            if (columns.length < headers.length) {
                console.warn(`Skipping line ${i + 1} due to insufficient columns:`, lines[i]);
                continue;
            }

            const stop_id = columns[stopIdIndex];
            const stop_name = columns[stopNameIndex]?.replace(/["\\]/g, '').normalize('NFKC').trim();
            const stop_lat = parseFloat(columns[stopLatIndex]);
            const stop_lon = parseFloat(columns[stopLonIndex]);

            if (!isNaN(stop_lat) && !isNaN(stop_lon)) {
                stops.push({ stop_id, stop_name, stop_lat, stop_lon });
                console.log(`Parsed stop from line ${i + 1}:`, { stop_id, stop_name, stop_lat, stop_lon });
            } else {
                console.warn(`Invalid latitude/longitude at line ${i + 1}:`, lines[i]);
            }
        }

        console.log(`Total stops parsed from ${fileName}: ${stops.length}`);
        return stops;
    } catch (error) {
        console.error(`Error loading ${fileName}:`, error.message);
        return [];
    }
};

    // Load stops from both stops.txt and stops2.txt
    Promise.all([loadStopsFile('stops.txt'), loadStopsFile('stops2.txt')])
        .then(([stops1, stops2]) => {
            console.log(`Total stops parsed from stops.txt: ${stops1.length}`);
            console.log(`Total stops parsed from stops2.txt: ${stops2.length}`);

            window.allBusStops = [...stops1, ...stops2];
			console.log(`Combined stops data (allBusStops length): ${window.allBusStops.length}`);

if (window.allBusStops.length > 0) {
    addStopsToMap(window.allBusStops);
} else {
    console.warn("No valid stops data found.");
}
        })
        .catch(error => console.error("Error loading stops files:", error));

    // Function to add stops to the map
    function addStopsToMap(stops) {
        stops.forEach(stop => {
            const lat = parseFloat(stop.stop_lat);
            const lng = parseFloat(stop.stop_lon);

            if (!isNaN(lat) && !isNaN(lng)) {
                const stopMarker = L.circleMarker([lat, lng], {
                    radius: 4,
                    color: "transparent",
                    opacity: 0
                }).bindPopup(`${stop.stop_name}`);

                window.busStopLayerGroup.addLayer(stopMarker);
                console.log(`Added stop marker for: ${stop.stop_name}`);
            }
        });
    }

    console.log("map-busstops.js script loaded successfully.");
	console.log("Loading stops files: stops.txt and stops2.txt");
	
	// Dispatch a custom event once all stops are loaded
document.dispatchEvent(new Event("stopsLoaded"));
console.log("Custom event 'stopsLoaded' dispatched after loading stops.");
}); // <-- Missing closing brace added here