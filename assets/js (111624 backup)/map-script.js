// Event Listeners
document.getElementById("createRoute").addEventListener("click", () => {
    console.log("Add button clicked.");
    showRouteNameModal();
});

const submitButton = document.getElementById("routeNameSubmit");
submitButton.removeEventListener("click", handleEnterButtonClick);
submitButton.addEventListener("click", (e) => {
    e.preventDefault();
    handleEnterButtonClick();
});

function showRouteNameModal() {
    const modal = document.getElementById("routeNameModal");
    const routeTypeSelect = document.getElementById("routeTypeSelect");

    if (modal) {
        // Apply the selected route type color immediately
        updateModalColor();

        // Display the modal
        modal.style.display = "block";
        modal.style.opacity = "0";
        modal.style.visibility = "hidden";
        modal.style.transform = "translate(-50%, -50%) scale(0.9)";

        requestAnimationFrame(() => {
            modal.style.visibility = "visible";
            requestAnimationFrame(() => {
                modal.style.opacity = "1";
                modal.style.transform = "translate(-50%, -50%) scale(1)";
            });
        });
        console.log("Route name modal displayed.");
    } else {
        console.error("Route name modal not found.");
    }
}

function saveRouteInfo() {
    const routeNameInput = document.getElementById("routeNameInput").value.trim();
    const routeTypeSelect = document.getElementById("routeTypeSelect").value.toLowerCase();

    // Store route name and type in global variables for consistency
    window.selectedRouteName = routeNameInput;
    window.selectedRouteType = routeTypeSelect;

    // Other existing logic...
}


function updateModalColor() {
    const modal = document.getElementById("routeNameModal");
    const routeTypeSelect = document.getElementById("routeTypeSelect");

    if (modal && routeTypeSelect) {
        // Remove any previous route type classes
        modal.classList.remove("local", "limited", "express", "special", "summer-express", "default");

        // Get the selected route type and apply the corresponding class
        const selectedType = routeTypeSelect.value.toLowerCase();
        modal.classList.add(selectedType);

        console.log(`Applied route type class: ${selectedType} to routeNameModal`);
    } else {
        console.error("Failed to update modal color. Elements not found.");
    }
}

document.getElementById("routeTypeSelect").addEventListener("change", () => {
    updateModalColor();
});

// Handle Enter Button Click
function handleEnterButtonClick() {
    const routeNameInput = document.getElementById("routeNameInput").value.trim();
    const routeTypeSelect = document.getElementById("routeTypeSelect").value;
    const mainSidebar = document.getElementById("sidebar");
    const routeInfoSidebar = document.getElementById("routeInfoSidebar");
    const routeTitleElement = document.getElementById("routeTitle");
    const routeTypeText = document.getElementById("routeTypeText");

    if (!routeNameInput) {
        alert("Please enter a route name.");
        return;
    }

    // Set route info
    routeTitleElement.textContent = routeNameInput;
    routeTypeText.textContent = `Route Type: ${routeTypeSelect.charAt(0).toUpperCase() + routeTypeSelect.slice(1)}`;

    hideModal();

    // Reset and apply color class
    routeInfoSidebar.className = ""; // Reset all classes
    const routeTypeClass = routeTypeSelect.toLowerCase();
    routeInfoSidebar.classList.add(routeTypeClass, "visible");

    console.log(`Applied route type class: ${routeTypeClass} to routeInfoSidebar`);

    // Hide main sidebar and show route info sidebar
    mainSidebar.classList.add("sidebar-hidden");
    routeInfoSidebar.classList.add("visible");

    // Check if enableRouteCreation from map-routedraw.js is defined
    if (typeof enableRouteCreation === 'function') {
        enableRouteCreation();
        console.log("Called enableRouteCreation from map-routedraw.js");
    } else {
        console.error("enableRouteCreation is not defined.");
    }
}

// Hide Modal
function hideModal() {
    const modal = document.getElementById("routeNameModal");
    if (modal) {
        modal.style.opacity = "0";
        modal.style.transform = "translate(-50%, -50%) scale(0.9)";
        setTimeout(() => {
            modal.style.display = "none";
            modal.style.visibility = "hidden";
        }, 300);
        console.log("Modal hidden.");
    } else {
        console.error("Modal not found.");
    }
}

// IndexedDB Error Handling
function loadProjectData() {
    if (!db) {
        console.error("IndexedDB not initialized. Skipping data load.");
        return;
    }
    // Load data logic here
}

function saveProjectData() {
    if (!db) {
        console.error("IndexedDB not initialized. Skipping data save.");
        return;
    }
    // Save data logic here
}

console.log("Script loaded successfully.");
