// Load saved routes from localStorage when the script initializes
if (!window.savedRoutes) {
    window.savedRoutes = JSON.parse(localStorage.getItem("savedRoutes")) || [];
    console.log("Loaded saved routes on initialization:", window.savedRoutes);
}

function saveCurrentRoute(routeName) {
    const routeTypeSelect = document.getElementById("routeTypeSelect");
    const routeType = routeTypeSelect ? routeTypeSelect.value : "default";

    const routeData = {
        name: routeName,
        type: routeType || "default", // Ensure a default value if undefined
        length: calculateRouteLength(),
        stops: window.stopsArray,
        waypoints: window.routingControl.getWaypoints().map((wp) => ({
            lat: wp.latLng.lat,
            lng: wp.latLng.lng,
        })),
    };

    const existingRoutes = JSON.parse(localStorage.getItem("savedRoutes")) || [];
    existingRoutes.push(routeData);
    localStorage.setItem("savedRoutes", JSON.stringify(existingRoutes));

    console.log(`Route "${routeName}" of type "${routeType}" saved successfully.`);
}

function updateMainSidebar() {
    const mainSidebarList = document.getElementById("mainSidebarList");
    mainSidebarList.innerHTML = ''; // Clear the current list

    if (!window.savedRoutes || window.savedRoutes.length === 0) {
        mainSidebarList.innerHTML = "<p>No routes saved.</p>";
        return;
    }

    // Populate the list with saved routes
    window.savedRoutes.forEach((route, index) => {
        const routeItem = document.createElement("div");
        routeItem.classList.add("route-item");
        routeItem.innerHTML = `<span>${route.name}</span>`;
        routeItem.addEventListener("click", () => loadRoute(index));
        mainSidebarList.appendChild(routeItem);
    });

    console.log("Main sidebar updated with saved routes.");
}

function displaySavedRoutes() {
    const routeListContainer = document.getElementById("routeListContainer");
    routeListContainer.innerHTML = ""; // Clear the current list

    if (!window.savedRoutes || window.savedRoutes.length === 0) {
        console.log("No saved routes found.");
        routeListContainer.innerHTML = "<p>No saved routes available.</p>";
        return;
    }

    console.log("Displaying saved routes:", window.savedRoutes);

    window.savedRoutes.forEach((route, index) => {
        // Ensure the route type exists, default to "default" if undefined
        const routeType = route.type ? route.type.toLowerCase() : "default";

        // Create a route button element and apply the color class directly
        const routeButton = document.createElement("div");
        routeButton.className = `route-button ${routeType}`;
        routeButton.textContent = route.name;
        routeButton.onclick = () => loadRoute(index);

        // Right-click event to show delete confirmation modal
        routeButton.addEventListener("contextmenu", (event) => {
            event.preventDefault();
            showDeleteModal(index, route.name);
        });

        // Append the route button to the list container
        routeListContainer.appendChild(routeButton);
    });
}

function loadRoute(index) {
    if (!window.savedRoutes || index < 0 || index >= window.savedRoutes.length) {
        console.error("Invalid route index:", index);
        return;
    }

    const selectedRoute = window.savedRoutes[index];
    console.log("Loading route:", selectedRoute);

    // Ensure map is initialized
    if (!window.map) {
        console.error("Map is not initialized.");
        return;
    }

    // Clear any existing routes or markers on the map
    if (window.routingControl) {
        window.map.removeControl(window.routingControl);
        console.log("Existing routing control removed.");
    }

    // Use the correct waypoints from the saved data
    const waypoints = selectedRoute.waypoints.map((wp) => L.latLng(wp.lat, wp.lng));
    window.routingControl = L.Routing.control({
        waypoints: waypoints,
        createMarker: () => null,
        routeWhileDragging: true,
    }).addTo(window.map);

    // Add stop markers to the map
    window.savedStopsLayer = L.layerGroup();
    selectedRoute.stops.forEach((stop) => {
        const marker = L.circleMarker([stop.stop_lat, stop.stop_lon], {
            radius: 5,
            color: 'green',
        }).bindPopup(stop.stop_name);
        window.savedStopsLayer.addLayer(marker);
    });
    window.savedStopsLayer.addTo(window.map);

    // Update the route information sidebar
    const routeLength = selectedRoute.length || 0;
    const stopCount = selectedRoute.stops.length || 0;
    updateRouteInfo(routeLength, stopCount);

    console.log(`Route loaded successfully: ${selectedRoute.name}`);
}

// Function to show the delete confirmation modal with transition
function showDeleteModal(index, routeName) {
    const modal = document.getElementById("deleteModal");
    const modalText = document.getElementById("modalText");
    const confirmDeleteButton = document.getElementById("confirmDeleteButton");
    const cancelDeleteButton = document.getElementById("cancelDeleteButton");

    modalText.textContent = `Are you sure you want to delete the route "${routeName}"?`;

    // Show the modal with smooth transition
    modal.classList.add("show-modal");

    // Confirm delete button click
    confirmDeleteButton.onclick = () => {
        deleteRoute(index);
        closeModal();
    };

    // Cancel button click
    cancelDeleteButton.onclick = closeModal;

    // Close modal when clicking the close icon
    document.getElementById("closeModal").onclick = closeModal;
}

// Function to close the modal with smooth transition
function closeModal() {
    const modal = document.getElementById("deleteModal");
    modal.classList.remove("show-modal");

    // Wait for the transition to end before hiding the modal
    setTimeout(() => {
        modal.style.display = "none";
    }, 300);
}

// Function to delete the selected route from localStorage
function deleteRoute(index) {
    // Check if there are saved routes
    if (!window.savedRoutes || index < 0 || index >= window.savedRoutes.length) {
        console.error("Invalid route index:", index);
        return;
    }

    // Remove the route from the saved routes array
    window.savedRoutes.splice(index, 1);

    // Update localStorage with the new array
    localStorage.setItem("savedRoutes", JSON.stringify(window.savedRoutes));

    console.log(`Route at index ${index} deleted successfully.`);

    // Update the main sidebar UI
    updateMainSidebar();

    // Close the delete confirmation modal
    closeModal();
}