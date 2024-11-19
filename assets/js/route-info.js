// route-info.js - Non-UI Logic

// Function to update the route information in the UI using IndexedDB
window.updateRouteInfo = function(routeLength, stopCount) {
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

            console.log(`Length in miles: ${lengthInMiles}, Total stops: ${totalStops}, Avg Spacing: ${avgSpacingText}`);

            // Show the route info sidebar with updated data using the centralized sidebar function
            window.manageSidebarDisplay('showRouteInfoSidebar', {
                routeName: projectData.routeName || "Unnamed Route",
                route_type: projectData.routeType || "local",
                lengthInMiles: lengthInMiles.toFixed(2),
                totalStops,
                avgSpacingText
            });
        };

        getRequest.onerror = () => {
            console.error(`Error retrieving project data for "${projectName}" from IndexedDB.`);
        };
    };

    request.onerror = () => {
        console.error("Failed to open IndexedDB.");
    };
};

// Helper function to get the project name from the URL
function getProjectNameFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get("project") || "NET Bus";
}