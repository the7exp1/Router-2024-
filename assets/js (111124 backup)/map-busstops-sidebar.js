function updateBusStopSidebar(busStops) {
    const sidebarList = document.getElementById("stopsList");

    if (!sidebarList) {
        console.error("Element with ID 'stopsList' not found.");
        return;
    }

    // Clear existing list
    sidebarList.innerHTML = "";

    // Iterate through busStops and populate the sidebar
    busStops.forEach((stop, index) => {
        // Check if stop has a valid name
        const stopName = stop?.stop_name?.trim() || "Unnamed Stop";

        // Create a new list item
        const listItem = document.createElement("li");
        listItem.textContent = `${index + 1}. ${stopName}`;

        // Append the list item to the sidebar
        sidebarList.appendChild(listItem);
    });

    console.log("Sidebar updated with stops:", busStops);
}

function showBusStopSidebar() {
    const sidebar = document.getElementById("busStopSidebar");
    sidebar.style.display = "block";
    document.getElementById("map").style.right = "300px";
    window.map.invalidateSize();
}

function hideBusStopSidebar() {
    const sidebar = document.getElementById("busStopSidebar");
    sidebar.style.display = "none";
    document.getElementById("map").style.right = "0";
    window.map.invalidateSize();
}