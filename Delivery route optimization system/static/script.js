const form = document.getElementById("optimizeForm");
const btnSubmit = document.getElementById("btnSubmit");
const deliveryPointsList = document.getElementById("deliveryPointsList");
const btnAddPoint = document.getElementById("btnAddPoint");
const resultsPanel = document.getElementById("resultsPanel");
const errorMessage = document.getElementById("errorMessage");
const sourceSelect = document.getElementById("source");
const destinationSelect = document.getElementById("destination");

let lastResultData = null;
let map = null;
let directionsService = null;
let directionsRenderer = null;
let markers = [];
let fallbackPolyline = null;

// GPS Tracking Simulation State Variables
let trackingInterval = null;
let trackingActive = false;
let trackingPaused = false;
let trackingMarker = null;
let trackingPathIndex = 0;
let trackingPath = [];
let trackingStops = [];
let currentStopTargetIndex = 1;

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

document.addEventListener("DOMContentLoaded", () => {
    fetchLocations();
    loadHistory();

    document.getElementById("btnOptimizedMap")?.addEventListener("click", () => switchTab("optimized"));
    document.getElementById("btnUnoptimizedMap")?.addEventListener("click", () => switchTab("unoptimized"));
    document.getElementById("btnBackToInput")?.addEventListener("click", () => {
        if (trackingActive) {
            alert("Please terminate live tracking before returning to setup.");
            return;
        }
        document.getElementById("inputView").style.display = "block";
        document.getElementById("resultsView").style.display = "none";
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    document.getElementById("btnStartTracking")?.addEventListener("click", startGpsTracking);
    document.getElementById("btnPauseTracking")?.addEventListener("click", togglePauseGpsTracking);
    document.getElementById("btnStopTracking")?.addEventListener("click", () => stopGpsTracking(false));

    const btnLogout = document.getElementById("btnLogout");
    if (btnLogout) {
        btnLogout.onclick = (e) => {
            e.preventDefault();
            localStorage.removeItem("isAuthenticated");
            window.location.href = "/login";
        };
    }
});

let googleMapsReady = false;

window.initMap = function() {
    console.log("Google Maps API loaded.");
    googleMapsReady = true;
}

function initializeMapIfNeeded() {
    const mapDiv = document.getElementById("googleMap");
    if (!mapDiv || !window.google || !googleMapsReady) return false;

    if (!map) {
        console.log("Initializing map instance...");
        try {
            map = new google.maps.Map(mapDiv, {
                center: { lat: 17.385, lng: 78.4867 },
                zoom: 12,
                disableDefaultUI: true,
                zoomControl: true,
                styles: [
                    { elementType: "geometry", stylers: [{ color: "#0b0f19" }] },
                    { elementType: "labels.text.stroke", stylers: [{ color: "#0b0f19" }] },
                    { elementType: "labels.text.fill", stylers: [{ color: "#94a3b8" }] },
                    { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#818cf8" }] },
                    { featureType: "water", elementType: "geometry", stylers: [{ color: "#070a13" }] },
                    { featureType: "road", elementType: "geometry", stylers: [{ color: "#1e293b" }] },
                    { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#0f172a" }] },
                    { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#312e81" }] }
                ]
            });
            directionsService = new google.maps.DirectionsService();
            directionsRenderer = new google.maps.DirectionsRenderer({
                map: map,
                suppressMarkers: true
            });
        } catch (e) {
            console.error("Failed to initialize Google Maps:", e);
            return false;
        }
    }
    return true;
}

async function fetchLocations() {
    try {
        const res = await fetch("/locations");
        const data = await res.json();
        if (!data.locations || !Array.isArray(data.locations)) {
            throw new Error("No locations received");
        }

        window.__locations = data.locations;
        populateSelect(sourceSelect, data.locations);
        populateSelect(destinationSelect, data.locations);

        if (data.locations.length > 0) sourceSelect.value = data.locations[0];
        if (data.locations.length > 1) destinationSelect.value = data.locations[1];
    } catch (err) {
        console.error("Location fetch failed:", err);
    }
}

function populateSelect(selectEl, locations) {
    selectEl.innerHTML = '<option value="">Select location…</option>';
    locations.forEach((loc) => {
        const opt = document.createElement("option");
        opt.value = loc;
        opt.textContent = loc.replace(/_/g, " ");
        selectEl.appendChild(opt);
    });
}

btnAddPoint.addEventListener("click", () => {
    const row = document.createElement("div");
    row.className = "delivery-point-row";

    const sel = document.createElement("select");
    sel.className = "form-control delivery-point-select";
    if (window.__locations) populateSelect(sel, window.__locations);

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn-remove-point";
    btn.innerHTML = "×";
    btn.onclick = () => {
        row.style.opacity = '0';
        row.style.transform = 'translateY(10px)';
        setTimeout(() => row.remove(), 250);
    };

    row.appendChild(sel);
    row.appendChild(btn);
    deliveryPointsList.appendChild(row);
});

form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorMessage.textContent = "";

    const payload = {
        source: sourceSelect.value,
        destination: destinationSelect.value,
        delivery_points: Array.from(document.querySelectorAll(".delivery-point-select")).map(s => s.value).filter(Boolean),
        delivery_load: parseFloat(document.getElementById("deliveryLoad").value) || 0,
        vehicle_capacity: parseFloat(document.getElementById("vehicleCapacity").value) || 0
    };

    const loaderOverlay = document.getElementById("loaderOverlay");
    const step1 = document.getElementById("step1");
    const step2 = document.getElementById("step2");
    const step3 = document.getElementById("step3");
    const step4 = document.getElementById("step4");

    try {
        btnSubmit.disabled = true;
        
        // Reset loader overlay elements
        [step1, step2, step3, step4].forEach(el => {
            el.className = "loader-step";
        });
        
        // Display loader and start Step 1
        loaderOverlay.style.display = "flex";
        step1.classList.add("active");

        // Execute backend optimization promise
        const optimizationPromise = fetch("/optimize", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        await sleep(650);
        step1.classList.remove("active");
        step1.classList.add("completed");
        step2.classList.add("active");

        await sleep(650);
        step2.classList.remove("active");
        step2.classList.add("completed");
        step3.classList.add("active");

        // Await the network response
        const res = await optimizationPromise;
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Optimization failed");

        await sleep(650);
        step3.classList.remove("active");
        step3.classList.add("completed");
        step4.classList.add("active");

        lastResultData = data;
        renderResults(data);

        await sleep(550);
        step4.classList.remove("active");
        step4.classList.add("completed");
        
        await sleep(350);
        loaderOverlay.style.display = "none";
        
        const inputView = document.getElementById("inputView");
        const resultsView = document.getElementById("resultsView");
        if (inputView) inputView.style.display = "none";
        if (resultsView) resultsView.style.display = "block";
        
        setTimeout(() => {
            if (initializeMapIfNeeded()) {
                google.maps.event.trigger(map, "resize");
                drawRoute(data.path_coords, data.stop_coords, true);
            } else {
                console.warn("Google Maps not ready or failed to initialize.");
                const mapDiv = document.getElementById("googleMap");
                if(mapDiv) {
                    mapDiv.innerHTML = '<div class="map-error"><h3>Map View Unavailable</h3><p>Interactive Map visualization is disabled. Backend computations succeeded.</p></div>';
                    mapDiv.style.display = 'flex';
                    mapDiv.style.alignItems = 'center';
                    mapDiv.style.justifyContent = 'center';
                }
            }
        }, 100);

        loadHistory();
        errorMessage.classList.remove("visible");
    } catch (err) {
        loaderOverlay.style.display = "none";
        errorMessage.textContent = err.message;
        errorMessage.classList.add("visible");
    } finally {
        btnSubmit.disabled = false;
    }
});

function drawRoute(pathCoords, stopCoords, isOptimized = true) {
    if (!initializeMapIfNeeded()) return;
    
    markers.forEach(m => m.setMap(null));
    markers = [];
    if (fallbackPolyline) fallbackPolyline.setMap(null);

    const bounds = new google.maps.LatLngBounds();

    const pathLocations = [];
    const waypoints = [];

    pathCoords.forEach((pt, i) => {
        const latLng = new google.maps.LatLng(pt.lat, pt.lng);
        bounds.extend(latLng);
        pathLocations.push(latLng);

        if (i > 0 && i < pathCoords.length - 1) {
            waypoints.push({
                location: latLng,
                stopover: true
            });
        }
    });

    if (pathLocations.length === 0) return;

    const start = pathLocations[0];
    const end = pathLocations[pathLocations.length - 1];

    map.fitBounds(bounds);
    
    const padding = { top: 50, bottom: 50, left: 50, right: 50 };
    map.fitBounds(bounds, padding);

    fallbackPolyline = new google.maps.Polyline({
        path: pathLocations,
        geodesic: true,
        strokeColor: isOptimized ? "#6366f1" : "#f59e0b",
        strokeOpacity: 0.8,
        strokeWeight: 6
    });

    const coordinatesStr = pathCoords.map(pt => `${pt.lng},${pt.lat}`).join(';');
    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${coordinatesStr}?overview=full&geometries=geojson`;

    fetch(osrmUrl)
        .then(res => res.json())
        .then(data => {
            if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
                const routeCoords = data.routes[0].geometry.coordinates.map(c => new google.maps.LatLng(c[1], c[0]));
                fallbackPolyline.setPath(routeCoords);
                fallbackPolyline.setMap(map);
                window.__activeTrackingPath = routeCoords;
            } else {
                fallbackPolyline.setMap(map);
                window.__activeTrackingPath = pathLocations;
            }
            window.__activeTrackingStops = stopCoords;
            addCustomMarkers(stopCoords);
        })
        .catch(err => {
            console.warn("OSRM routing failed, falling back to straight paths:", err);
            fallbackPolyline.setMap(map);
            window.__activeTrackingPath = pathLocations;
            window.__activeTrackingStops = stopCoords;
            addCustomMarkers(stopCoords);
        });
}

function addCustomMarkers(stopCoords) {
    if (!window.google || !map) return;
    
    stopCoords.forEach((pt, i) => {
        const isStart = i === 0;
        const isEnd = i === stopCoords.length - 1;
        const labelText = isStart ? "S" : (isEnd ? "E" : i.toString());
        const pinColor = isStart ? "#10b981" : (isEnd ? "#f43f5e" : "#6366f1");

        const marker = new google.maps.Marker({
            position: { lat: pt.lat, lng: pt.lng },
            map: map,
            label: {
                text: labelText,
                color: "white",
                fontWeight: "bold",
                fontSize: "14px"
            },
            icon: {
                path: google.maps.SymbolPath.CIRCLE,
                fillColor: pinColor,
                fillOpacity: 1,
                strokeColor: 'white',
                strokeWeight: 2,
                scale: 14
            },
            title: `Stop ${i}: ${pt.name.replace(/_/g, ' ')}`,
            zIndex: 999
        });

        const infoWindow = new google.maps.InfoWindow({
            content: `<div style="color:black; font-family:inherit;"><b>Stop ${i}:</b> ${pt.name.replace(/_/g, ' ')}</div>`
        });

        marker.addListener("click", () => {
            infoWindow.open(map, marker);
        });

        markers.push(marker);
    });
}

function renderResults(data) {
    const optTimeMins = Math.round((data.total_distance / 35) * 60);
    const unoptTimeMins = Math.round((data.unoptimized_distance / 35) * 60);
    
    const formatTime = (mins) => {
        if (!isFinite(mins)) return "Unreachable";
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        return h > 0 ? `${h}h ${m}m` : `${m}m`;
    };

    const optTimeStr = formatTime(optTimeMins);
    const unoptTimeStr = formatTime(unoptTimeMins);

    // Animate stats values with subtle delays
    animateValue("statDistance", data.total_distance, " km");
    animateValue("statUnoptDistance", data.unoptimized_distance, " km");
    
    document.getElementById("statCapacity").textContent = data.capacity_status;
    document.getElementById("statETA").innerHTML = `${optTimeStr} <small style="display:block; font-size:0.65rem; color:var(--text-secondary); margin-top: 4px;">Original: ${unoptTimeStr}</small>`;

    renderChips("routeNodes", data.optimized_route);
}

function animateValue(id, value, suffix = "") {
    const obj = document.getElementById(id);
    if (!obj) return;
    let start = 0;
    const end = parseFloat(value);
    if (isNaN(end)) {
        obj.textContent = value;
        return;
    }
    const duration = 800; // ms
    const startTime = performance.now();
    
    function update(now) {
        const progress = Math.min((now - startTime) / duration, 1);
        const current = progress * end;
        obj.textContent = current.toFixed(1) + suffix;
        if (progress < 1) {
            requestAnimationFrame(update);
        } else {
            obj.textContent = end.toFixed(1) + suffix;
        }
    }
    requestAnimationFrame(update);
}

function renderChips(containerId, route) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = "";

    route.forEach((node, i) => {
        const chip = document.createElement("span");
        chip.className = "route-node";
        if (i === 0) chip.classList.add("source");
        else if (i === route.length - 1) chip.classList.add("destination");
        
        chip.textContent = node.replace(/_/g, " ");
        container.appendChild(chip);

        if (i < route.length - 1) {
            const arrow = document.createElement("span");
            arrow.className = "route-arrow";
            arrow.textContent = " → ";
            container.appendChild(arrow);
        }
    });
}

function switchTab(type) {
    if (!lastResultData) return;
    const isOptimized = type === "optimized";

    document.getElementById("btnOptimizedMap")?.classList.toggle("active", isOptimized);
    document.getElementById("btnUnoptimizedMap")?.classList.toggle("active", !isOptimized);

    const pathCoords = isOptimized
        ? lastResultData.path_coords
        : (lastResultData.unoptimized_coords || lastResultData.path_coords);
        
    const stopCoords = isOptimized
        ? lastResultData.stop_coords
        : (lastResultData.unoptimized_stop_coords || lastResultData.stop_coords);

    drawRoute(pathCoords, stopCoords, isOptimized);
}

async function loadHistory() {
    try {
        const res = await fetch("/history");
        const data = await res.json();
        const tbody = document.getElementById("historyBody");
        if (!tbody || !data.history) return;

        tbody.innerHTML = data.history.slice(0, 10).map(r => `
            <tr>
                <td style="font-weight: 600;">${r.source.replace(/_/g, ' ')}</td>
                <td style="font-weight: 600;">${r.destination.replace(/_/g, ' ')}</td>
                <td><small style="color: var(--brand-hover); font-weight: 500;">${r.optimized_route}</small></td>
                <td>
                    <span style="text-decoration: line-through; color: var(--text-muted); font-size: 0.8rem;">${r.unoptimized_distance} km</span>
                    <br>
                    <strong style="color: var(--accent-cyan); font-size: 0.95rem;">${r.total_distance} km</strong>
                </td>
                <td><span class="badge badge-${r.capacity_status === 'Valid' ? 'success' : 'danger'}">${r.capacity_status}</span></td>
            </tr>
        `).join("");
    } catch (err) {
        console.error("History load failed:", err);
    }
}

// ============================================================
// GPS LIVE SIMULATION TRACKING LOGIC
// ============================================================
function startGpsTracking() {
    if (!window.__activeTrackingPath || window.__activeTrackingPath.length === 0) {
        alert("Please optimize a route first to initialize GPS tracking.");
        return;
    }
    if (trackingActive) return;

    trackingActive = true;
    trackingPaused = false;
    trackingPath = window.__activeTrackingPath;
    trackingStops = window.__activeTrackingStops || [];
    trackingPathIndex = 0;
    currentStopTargetIndex = 1;

    document.getElementById("btnStartTracking").style.display = "none";
    document.getElementById("trackingPanel").style.display = "block";
    
    const backBtn = document.getElementById("btnBackToInput");
    if (backBtn) {
        backBtn.disabled = true;
        backBtn.style.opacity = "0.5";
    }

    // Reset delivered node styles
    document.querySelectorAll(".route-node").forEach(chip => {
        chip.classList.remove("delivered");
    });
    
    // Mark start stop as delivered immediately
    const chips = document.querySelectorAll(".route-node");
    if (chips.length > 0) {
        chips[0].classList.add("delivered");
    }

    if (trackingMarker) {
        trackingMarker.setMap(null);
    }

    // Render vehicle emoji as marker label
    trackingMarker = new google.maps.Marker({
        position: trackingPath[0],
        map: map,
        label: {
            text: "🚚",
            fontSize: "22px"
        },
        icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 0 // invisible marker body, only emoji is shown
        },
        zIndex: 1000
    });

    document.getElementById("btnPauseTracking").textContent = "⏸️ Pause";
    trackingInterval = setInterval(animateTrackingStep, 150);
}

function animateTrackingStep() {
    if (trackingPaused) return;

    if (trackingPathIndex >= trackingPath.length) {
        stopGpsTracking(true);
        return;
    }

    const currentPos = trackingPath[trackingPathIndex];
    trackingMarker.setPosition(currentPos);
    
    // Slow pan to track delivery vehicle position
    map.panTo(currentPos);

    // Update GPS coordinates display
    document.getElementById("gpsCoords").textContent = `${currentPos.lat().toFixed(5)}, ${currentPos.lng().toFixed(5)}`;

    // Simulated velocity variance
    const speedVal = Math.round(45 + Math.random() * 12);
    document.getElementById("gpsSpeed").textContent = `${speedVal} km/h`;

    // Progress Bar computation
    const progressVal = Math.round((trackingPathIndex / (trackingPath.length - 1)) * 100);
    document.getElementById("gpsProgressText").textContent = `${progressVal}%`;
    document.getElementById("gpsProgressBar").style.width = `${progressVal}%`;

    // Check stops status
    if (currentStopTargetIndex < trackingStops.length) {
        const nextStop = trackingStops[currentStopTargetIndex];
        const distanceToStop = getDistanceBetween(currentPos, new google.maps.LatLng(nextStop.lat, nextStop.lng));

        document.getElementById("gpsNextStop").textContent = nextStop.name.replace(/_/g, " ");

        // Estimate ETA
        const hoursLeft = distanceToStop / 50; // assuming avg 50km/h
        const secondsLeft = Math.round(hoursLeft * 3600);
        const mins = Math.floor(secondsLeft / 60);
        const secs = secondsLeft % 60;
        
        document.getElementById("gpsETA").textContent = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;

        // If distance to next stop is less than 250m, mark stop completed
        if (distanceToStop < 0.25) {
            const chips = document.querySelectorAll(".route-node");
            if (chips[currentStopTargetIndex]) {
                chips[currentStopTargetIndex].classList.add("delivered");
            }
            currentStopTargetIndex++;
        }
    } else {
        document.getElementById("gpsNextStop").textContent = "Arrived!";
        document.getElementById("gpsETA").textContent = "0s";
    }

    trackingPathIndex++;
}

function togglePauseGpsTracking() {
    if (!trackingActive) return;
    trackingPaused = !trackingPaused;

    const pauseBtn = document.getElementById("btnPauseTracking");
    if (trackingPaused) {
        pauseBtn.textContent = "▶️ Resume";
        document.getElementById("gpsSpeed").textContent = "0 km/h";
    } else {
        pauseBtn.textContent = "⏸️ Pause";
    }
}

function stopGpsTracking(completed = false) {
    trackingActive = false;
    trackingPaused = false;

    if (trackingInterval) {
        clearInterval(trackingInterval);
        trackingInterval = null;
    }

    const backBtn = document.getElementById("btnBackToInput");
    if (backBtn) {
        backBtn.disabled = false;
        backBtn.style.opacity = "1";
    }

    if (completed) {
        // Complete all nodes
        document.querySelectorAll(".route-node").forEach(chip => chip.classList.add("delivered"));
        document.getElementById("gpsProgressText").textContent = "100% (Complete)";
        document.getElementById("gpsProgressBar").style.width = "100%";
        document.getElementById("gpsSpeed").textContent = "0 km/h";
        document.getElementById("gpsETA").textContent = "Arrived!";
        document.getElementById("gpsNextStop").textContent = "All Stops Cleared!";

        document.getElementById("btnStartTracking").style.display = "block";
        document.getElementById("btnStartTracking").textContent = "📡 Restart Live GPS Tracking Simulation";
    } else {
        // Cancelled mid-flight
        if (trackingMarker) {
            trackingMarker.setMap(null);
            trackingMarker = null;
        }
        document.getElementById("trackingPanel").style.display = "none";
        document.getElementById("btnStartTracking").style.display = "block";
        document.getElementById("btnStartTracking").textContent = "📡 Start Live GPS Tracking Simulation";
    }
}

// Haversine Distance Calculator
function getDistanceBetween(p1, p2) {
    const R = 6371; // Earth radius in km
    const dLat = (p2.lat() - p1.lat()) * Math.PI / 180;
    const dLon = (p2.lng() - p1.lng()) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(p1.lat() * Math.PI / 180) * Math.cos(p2.lat() * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}