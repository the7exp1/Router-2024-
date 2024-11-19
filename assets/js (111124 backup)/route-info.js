function updateRouteInfo(routeLength, stopCount) {
    console.log("Calling updateRouteInfo. Current stopsArray:", window.stopsArray);

    if (typeof routeLength === "undefined" || routeLength === 0) {
        console.error("Invalid route length received.");
        document.getElementById("routeLength").innerText = `N/A`;
        document.getElementById("stopsAndSpacing").innerText = `N/A`;
        return;
    }

    // Convert route length from meters to miles
    const lengthInMiles = routeLength / 1609.34;
    document.getElementById("routeLength").innerText = `${lengthInMiles.toFixed(2)} mi`;
    console.log("UI updated with route length in miles:", lengthInMiles);

    // Use the provided stopCount
    const totalStops = stopCount || (window.stopsArray ? window.stopsArray.length : 0);

    // Calculate average spacing between stops (in miles)
    let avgSpacingText = "N/A";
    if (totalStops > 1) {
        const avgSpacing = lengthInMiles / (totalStops - 1);
        avgSpacingText = `${avgSpacing.toFixed(2)} mi`;
    }

    // Update the combined stops and average spacing line
    const stopsAndSpacingText = `${totalStops} stops, Avg Spacing: ${avgSpacingText}`;
    document.getElementById("stopsAndSpacing").innerText = stopsAndSpacingText;
    console.log("UI updated with stops and spacing:", stopsAndSpacingText);
}
