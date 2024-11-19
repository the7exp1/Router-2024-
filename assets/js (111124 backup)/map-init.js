// Ensure map initialization after the entire page is loaded
window.addEventListener("load", () => {
    if (!window.map || !(window.map instanceof L.Map)) {
        console.log("Initializing map...");
        try {
            window.map = L.map('map').setView([40.7128, -74.0060], 13);

            // Set up the tile layer
            L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
                attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
                subdomains: "abcd",
                maxZoom: 19,
            }).addTo(window.map);
            console.log("Tile layer added.");

            // Initialize bus stop layer group
            if (!window.busStopLayerGroup || !(window.busStopLayerGroup instanceof L.LayerGroup)) {
                window.busStopLayerGroup = L.layerGroup().addTo(window.map);
                console.log("Initialized busStopLayerGroup.");
            }

            // Initialize routing control only after the map is fully ready
            window.map.whenReady(() => {
                if (!window.routingControl) {
                    setTimeout(() => {
                        window.routingControl = L.Routing.control({
                            waypoints: [],
                            routeWhileDragging: true,
                            createMarker: () => null,
                            show: false,
                        }).addTo(window.map);
                        console.log("Initialized routing control.");
                    }, 100);
                }
            });

        } catch (error) {
            console.error("Map setup failed:", error);
        }
    } else {
        console.warn("Map was already initialized.");
    }

    // Check and set sidebars visibility
    const busStopSidebar = document.getElementById("busStopSidebar");
    const mainSidebar = document.getElementById("sidebar");

    if (busStopSidebar) {
        busStopSidebar.style.display = "block";
        console.log("Bus stop sidebar set to visible.");
    }

    if (mainSidebar) {
        mainSidebar.style.display = "block";
        console.log("Main sidebar set to visible.");
    }

    // Adjust the map size after ensuring the sidebars are visible
    if (window.map && typeof window.map.invalidateSize === 'function') {
        setTimeout(() => {
            window.map.invalidateSize();
            console.log("Map size adjusted after sidebars are visible.");
        }, 200);
    } else {
        console.error("Map initialization failed. Please check map setup.");
    }
});

// Ensure map initialization after the entire page is loaded
// Ensure map initialization after the entire page is loaded
window.addEventListener("load", () => {
    if (!window.map || !(window.map instanceof L.Map)) {
        console.log("Initializing map...");
        try {
            window.map = L.map('map').setView([40.7128, -74.0060], 13);

            // Set up the tile layer
            L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
                attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
                subdomains: "abcd",
                maxZoom: 19,
            }).addTo(window.map);
            console.log("Tile layer added.");

            // Initialize bus stop layer group
            if (!window.busStopLayerGroup || !(window.busStopLayerGroup instanceof L.LayerGroup)) {
                window.busStopLayerGroup = L.layerGroup().addTo(window.map);
                console.log("Initialized busStopLayerGroup.");
            }

            // Dispatch custom event when map is fully initialized
            document.dispatchEvent(new Event("mapInitialized"));
            console.log("Map initialization completed.");

        } catch (error) {
            console.error("Map setup failed:", error);
        }
    }
});

document.addEventListener("DOMContentLoaded", () => {
    displaySavedRoutes();
});