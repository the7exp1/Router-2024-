// In map-script.js
window.stopsArray = [];

// In map-routedraw.js
window.addedBusStops = [];

window.stopsArray = window.stopsArray || []; // Array to hold the stops
let allBusStops = []; // Array to hold all bus stops
let routingControl; // To hold the routing control instance

// Load bus stops data from your source
// Function to load stops from a specified file
async function loadStopsFile(fileName) {
    try {
        console.log(`Loading stops from file: ${fileName}`);
        const response = await fetch(fileName);
        if (!response.ok) {
            console.error(`Failed to load ${fileName}. Status: ${response.status}`);
            return [];
        }

        const data = await response.text();
        const lines = data.split('\n').map(line => line.trim());

        // Debug: Print the first 10 lines of the file
        console.log(`First 10 lines of ${fileName}:`, lines.slice(0, 10));

        if (lines.length === 0) {
            console.error(`File ${fileName} is empty.`);
            return [];
        }

        // Detect header indices dynamically
        const headers = lines[0].split(',').map(header => header.trim().toLowerCase());
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

        if (stopLatIndex === -1 || stopLonIndex === -1) {
            console.error(`Latitude or longitude index not found in ${fileName}.`);
            return [];
        }

        // Skip the header line and start parsing from the second line
const stops = [];
for (let i = 1; i < lines.length; i++) {
    let line = lines[i].trim(); // Declare and initialize the 'line' variable
    if (line.toLowerCase().includes("stop_id")) {
        console.warn(`Skipping header line at line ${i + 1} in ${fileName}`);
        continue;
    }
            const parts = [];
let current = '';
let insideQuotes = false;

for (let char of line) {
    if (char === '"' && !insideQuotes) {
        insideQuotes = true;
    } else if (char === '"' && insideQuotes) {
        insideQuotes = false;
    } else if (char === ',' && !insideQuotes) {
        parts.push(current.trim());
        current = '';
    } else {
        current += char;
    }
}
parts.push(current.trim());

            if (parts.length <= stopLonIndex) {
                console.warn(`Skipping line ${i + 1} in ${fileName} due to insufficient columns:`, parts);
                continue;
            }

            const stop_id = parts[stopIdIndex];
            const stop_name = parts[stopNameIndex]?.replace(/["\\]/g, '');
            const stop_lat = parseFloat(parts[stopLatIndex]);
            const stop_lon = parseFloat(parts[stopLonIndex]);

            if (!stop_id || isNaN(stop_lat) || isNaN(stop_lon)) {
                console.warn(`Skipping invalid stop at line ${i + 1} in ${fileName}:`, parts);
                continue;
            }

            stops.push({ stop_id, stop_name, stop_lat, stop_lon });
        }

        console.log(`Total stops parsed from ${fileName}: ${stops.length}`);
        return stops;
    } catch (error) {
        console.error(`Error loading stops from ${fileName}:`, error.message);
        return [];
    }
}

async function initializeBusStops() {
    try {
        console.log("Attempting to load stops from stops.txt and stops2.txt...");

        const stops1 = await loadStopsFile('stops.txt');
        console.log(`Total stops parsed from stops.txt: ${stops1.length}`);

        const stops2 = await loadStopsFile('stops2.txt');
        if (!stops2 || stops2.length === 0) {
            console.error("stops2.txt failed to load or returned no stops.");
        } else {
            console.log(`Total stops parsed from stops2.txt: ${stops2.length}`);
        }

        // Combine stops from both files
        allBusStops = [...stops1, ...stops2];
        console.log(`Total combined bus stops loaded: ${allBusStops.length}`);

        // Sample output to verify combined data
        console.log("Sample stops:", allBusStops.slice(0, 5));
    } catch (error) {
        console.error("Error in initializeBusStops:", error.message);
    }
}

// Load stops from both `stops.txt` and `stops2.txt`
async function initializeBusStops() {
    const stops1 = await loadStopsFile('stops.txt');
    const stops2 = await loadStopsFile('stops2.txt');

    // Combine stops from both files
    allBusStops = [...stops1, ...stops2];
    console.log(`Total combined bus stops loaded: ${allBusStops.length}`);

    // Filter valid stops and log a sample
    allBusStops = allBusStops.filter(stop => stop && !isNaN(stop.stop_lat) && !isNaN(stop.stop_lon));
    console.log("Sample of combined bus stops:", allBusStops.slice(0, 5));
}

// Initialize bus stops when the map is ready
document.addEventListener("DOMContentLoaded", initializeBusStops);

document.addEventListener("DOMContentLoaded", function() {
    const elementToBind = document.getElementById("createRoute");
    console.log("Element to bind:", elementToBind);

    if (elementToBind) {
        elementToBind.addEventListener("click", function() {
            console.log("Create Route button clicked!");
            enableRouteCreation(); // Enable route creation
        });
    } else {
        console.error("Element with ID 'createRoute' not found in the DOM.");
    }
});

document.addEventListener("DOMContentLoaded", () => {
    const routeNameModal = document.getElementById("routeNameModal");
    const routeNameSubmit = document.getElementById("routeNameSubmit");
    const routeNameInput = document.getElementById("routeNameInput");
    const createButton = document.getElementById("createRoute");

    // Check if all modal elements exist
    if (!routeNameModal || !routeNameSubmit || !routeNameInput || !createButton) {
        console.error("One or more modal elements not found.");
        return;
    }

    // Hide the modal initially
    routeNameModal.style.display = "none";

    // Show modal when the + button is clicked
    createButton.addEventListener("click", () => {
        routeNameModal.style.display = "block";
    });

    // Close modal and log the input value when the submit button is clicked
    routeNameSubmit.addEventListener("click", () => {
        const routeName = routeNameInput.value.trim();
        if (routeName) {
            console.log(`Route Name Entered: ${routeName}`);
            // Hide the modal
            routeNameModal.style.display = "none";
        } else {
            alert("Please enter a valid route name.");
        }
    });
});

function showModal() {
    const modal = document.getElementById("routeNameModal");
    modal.style.display = "block";
    modal.style.opacity = "1";
    modal.style.visibility = "visible";
    modal.style.transform = "translate(-50%, -50%) scale(1)";
}

// Function to hide the modal with a smooth transition
function hideModal() {
    const modal = document.getElementById("routeNameModal");
    if (modal) {
        modal.classList.remove("show");
        setTimeout(() => {
            modal.style.display = "none";
        }, 300); // Wait for the transition to complete before hiding
    }
}

// Event listener for the submit button to hide the modal
document.getElementById("routeNameSubmit").addEventListener("click", (e) => {
    e.preventDefault();
    hideModal();
});

function showModal() {
    const modal = document.getElementById("routeNameModal");
    if (modal) {
        // Step 1: Reset classes and prepare initial state
        modal.classList.remove("local", "limited", "express", "special", "summer-express", "default");
        modal.style.display = "block";
        modal.style.opacity = "0";
        modal.style.visibility = "hidden";
        modal.style.transform = "translate(-50%, -50%) scale(0.9)";
        modal.style.transition = "opacity 0.3s ease, transform 0.3s ease";

        // Step 2: Trigger entrance animation
        requestAnimationFrame(() => {
            modal.style.visibility = "visible";
            requestAnimationFrame(() => {
                modal.style.opacity = "1";
                modal.style.transform = "translate(-50%, -50%) scale(1)";

                // Step 3: Apply color change after the entrance transition
                setTimeout(() => {
                    applyModalColor();
                }, 300); // Delay matches the entrance transition duration
            });
        });
    }
}

function applyModalColor() {
    const modal = document.getElementById("routeNameModal");
    const routeTypeSelect = document.getElementById("routeTypeSelect");
    const selectedType = routeTypeSelect.value;

    // Reset background color and classes
    modal.style.transition = "background-color 0.5s ease";
    modal.classList.remove("local", "limited", "express", "special", "summer-express", "default");

    // Apply the new color class
    if (selectedType) {
        modal.classList.add(selectedType);
    } else {
        modal.classList.add("default");
    }
}

function hideModal() {
    const modal = document.getElementById("routeNameModal");
    if (modal) {
        // Hide the modal with a smooth transition
        modal.style.opacity = "0";
        modal.style.transform = "translate(-50%, -50%) scale(0.9)";
        setTimeout(() => {
            modal.style.visibility = "hidden";
        }, 300); // Match the transition duration
    }
}

document.getElementById("routeTypeSelect").addEventListener("change", updateModalColor);

function updateModalColor() {
    const modal = document.getElementById("routeNameModal");
    const routeTypeSelect = document.getElementById("routeTypeSelect");
    const selectedType = routeTypeSelect.value;

    // Reset inline background color for smooth transitions
    modal.style.backgroundColor = "";

    // Remove all existing color classes
    modal.classList.remove("local", "limited", "express", "special", "summer-express", "default");

    // Apply the selected color class with a fallback to black (default)
    if (selectedType) {
        modal.classList.add(selectedType);
    } else {
        modal.classList.add("default");
    }
}

// Event listener for the submit button
document.getElementById("routeNameSubmit").addEventListener("click", (e) => {
    e.preventDefault();
    hideModal();
});

// Event listener for the dropdown change
document.getElementById("routeTypeSelect").addEventListener("change", updateModalColor);

function handleEnterButtonClick() {
    const modal = document.getElementById("routeNameModal");
    const routeNameInput = document.getElementById("routeNameInput").value.trim();
    const routeTypeSelect = document.getElementById("routeTypeSelect").value;
    const mainSidebar = document.getElementById("sidebar");
    const routeInfoSidebar = document.getElementById("routeInfoSidebar");
    const routeTitleElement = document.getElementById("routeTitle");
    const routeTypeText = document.getElementById("routeTypeText");

    // Validate the input
    if (!routeNameInput) {
        alert("Please enter a route name.");
        return;
    }

    // Set the route name and type text in the route info sidebar
    routeTitleElement.textContent = routeNameInput;
    routeTypeText.textContent = `Route Type: ${routeTypeSelect.charAt(0).toUpperCase() + routeTypeSelect.slice(1)}`;

    // Close the modal
    hideModal();

    // Hide the main sidebar
    mainSidebar.style.transform = "translateX(-100%)";
    mainSidebar.style.opacity = "0";
    mainSidebar.style.visibility = "hidden";

    // Reset the state of the route info sidebar
    routeInfoSidebar.style.display = "none";
    routeInfoSidebar.classList.remove("default", "local", "limited", "express", "special", "summer-express");

    // Apply the selected route type class to change the background color
    const routeTypeClass = routeTypeSelect.toLowerCase();
    routeInfoSidebar.classList.add(routeTypeClass);

    // Force reflow (to reset the transition state)
    void routeInfoSidebar.offsetHeight;

    // Show the route info sidebar with a smooth transition
    routeInfoSidebar.style.display = "block";
    setTimeout(() => {
        routeInfoSidebar.style.visibility = "visible";
        routeInfoSidebar.style.opacity = "1";
        routeInfoSidebar.style.transform = "translateX(0)";
        console.log(`Route info sidebar displayed with background class: ${routeTypeClass}`);
    }, 50);

    // Start route creation after form submission
    enableRouteCreation();
    console.log("Route creation enabled after form submission.");

    // Double-click to finalize the route
    map.on('dblclick', () => {
        if (isCreatingRoute) {
            console.log("Double-click detected. Finalizing the route...");
            finalizeRoute();
        }
    });
}

document.getElementById("createRoute").addEventListener("click", () => {
    const modal = document.getElementById("routeNameModal");
    modal.style.display = "block";
    requestAnimationFrame(showModal);
});

// Back Button Click Handler
document.getElementById("backButton").addEventListener("click", () => {
    const sidebar = document.getElementById("sidebar");
    const routeInfoSidebar = document.getElementById("routeInfoSidebar");

    // Add transition effects
    routeInfoSidebar.style.transform = "translateX(100%)"; // Slide out
    routeInfoSidebar.style.opacity = "0";

    setTimeout(() => {
        routeInfoSidebar.style.display = "none";
        sidebar.style.display = "block";
        sidebar.style.transform = "translateX(0)";
        sidebar.style.opacity = "1";
    }, 300); // Wait for the transition to finish (0.3s)
});

function showRouteInfoSidebar(routeName, routeType) {
    const sidebar = document.getElementById("sidebar");
    const routeInfoSidebar = document.getElementById("routeInfoSidebar");

    // Hide the main sidebar
    sidebar.classList.add("sidebar-hidden");

    // Set color based on route type
    routeInfoSidebar.className = "sidebar-visible " + routeType;

    // Show the route info sidebar
    routeInfoSidebar.classList.add("sidebar-visible");
    routeInfoSidebar.style.opacity = '1';
}

// Event Listener for the Enter button
const enterButton = document.getElementById("routeNameSubmit");
if (enterButton) {
    enterButton.addEventListener("click", handleEnterButtonClick);
}

// Function to enable route creation
function enableRouteCreation() {
    isCreatingRoute = true; // Set the flag to true
    stopsArray = []; // Reset stops array for a new route

    // Ensure the bus stop sidebar is hidden initially
    const busStopSidebar = document.getElementById("busStopSidebar");
    if (busStopSidebar) {
        busStopSidebar.style.display = "block";
        console.log("Bus stop sidebar is now visible.");
    } else {
        console.error("Bus stop sidebar element not found.");
    }

    // Attach the map click event
    map.on('click', onMapClick);
    console.log("Route creation started. Click on the map to set stops.");
}

// Function that handles clicks on the map
function onMapClick(e) {
    if (!isCreatingRoute) return; // If not in route creation mode, do nothing
    
    const lat = e.latlng.lat;
    const lng = e.latlng.lng;
    console.log("Map clicked at:", lat, lng); // Log the clicked coordinates

    // Add the clicked stop to the stops array
    stopsArray.push({ lat, lng });

    // Create a circle marker for the stop
    L.circleMarker([lat, lng], {
        radius: 6,
        color: "blue"
    }).addTo(map).bindPopup(`Stop ${stopsArray.length}`).openPopup();

    // After adding a stop, update the route
    updateRoute();
}

// Function to update the route based on stops
function updateRoute() {
    if (routingControl) {
        routingControl.setWaypoints(stopsArray.map(stop => L.latLng(stop.lat, stop.lng))); // Update waypoints for the existing route
    } else {
        routingControl = L.Routing.control({
            waypoints: stopsArray.map(stop => L.latLng(stop.lat, stop.lng)),
            createMarker: function() { return null; }, // Prevent markers from being created automatically
            routeWhileDragging: true // Allow dragging the route to adjust
        }).addTo(map);
    }
}
