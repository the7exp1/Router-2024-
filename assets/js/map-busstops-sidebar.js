// Bus Stops Sidebar Functions - Utilizing UI-Control Global Functions

// Function to show the bus stop sidebar
function showBusStopSidebar() {
    window.showBusStopSidebar();
}

// Function to hide the bus stop sidebar
function hideBusStopSidebar() {
    window.hideBusStopSidebar();
}

// Function to update the bus stop sidebar
function updateBusStopSidebar(busStops) {
    window.updateBusStopSidebar(busStops);
}

// Function to initialize bus stop sidebars and other logic if needed
function initializeBusStopSidebar(busStops) {
    updateBusStopSidebar(busStops);
    showBusStopSidebar();
}

// Example function call to update the sidebar
document.addEventListener('busStopsLoaded', (event) => {
    const busStops = event.detail; // Assuming bus stops data is passed in event detail
    initializeBusStopSidebar(busStops);
});