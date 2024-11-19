// Function to update the route information in the UI using IndexedDB
function updateRouteInfo(routeLength, stopCount) {
    console.log("Calling updateRouteInfo.");

    // Open IndexedDB
    const request = indexedDB.open("routerDB", 3);

    request.onsuccess = (event) => {
        const db = event.target.result;
        const projectName = getProjectNameFromURL();
        const transaction = db.transaction("projects", "readonly");
        const store = transaction.objectStore("projects");
        const getRequest = store.get(projectName);

        getRequest.onsuccess = () => {
            const projectData = getRequest.result;
            if (!projectData) {
                console.error(`Project data for "${projectName}" not found in IndexedDB.`);
                updateUIWithRouteInfo(0, 0);
                return;
            }

            // Use the provided stopCount or fetch from IndexedDB data
            const totalStops = stopCount || projectData.stops.length || 0;
            const lengthInMiles = routeLength ? routeLength / 1609.34 : 0;

            // Calculate average spacing between stops (in miles)
            let avgSpacingText = "N/A";
            if (totalStops > 1) {
                const avgSpacing = lengthInMiles / (totalStops - 1);
                avgSpacingText = `${avgSpacing.toFixed(2)} mi`;
            }

            // Update UI with the calculated values
            updateUIWithRouteInfo(lengthInMiles, totalStops, avgSpacingText);
        };

        getRequest.onerror = () => {
            console.error(`Error retrieving project data for "${projectName}" from IndexedDB.`);
        };
    };

    request.onerror = () => {
        console.error("Failed to open IndexedDB.");
    };
}

// Helper function to update the UI with route information
function updateUIWithRouteInfo(lengthInMiles, totalStops, avgSpacingText) {
    // Convert route length from meters to miles
    const lengthText = lengthInMiles ? `${lengthInMiles.toFixed(2)} mi` : "N/A";
    document.getElementById("routeLength").innerText = lengthText;

    // Update stops and spacing information
    const stopsAndSpacingText = totalStops > 0
        ? `${totalStops} stops, Avg Spacing: ${avgSpacingText}`
        : "N/A";
    document.getElementById("stopsAndSpacing").innerText = stopsAndSpacingText;

    console.log(`UI updated: Length - ${lengthText}, Stops - ${totalStops}, Avg Spacing - ${avgSpacingText}`);
}

// Helper function to get the project name from the URL
function getProjectNameFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get("project") || "NET Bus";
}