// Function to set up the sticky header navigation
function setupStickyHeader() {
    // Set up the pill position based on active nav item
    function updatePill() {
        const $activeItem = $('.nav-item.active');
        const position = $activeItem.position();
        const width = $activeItem.outerWidth();
        
        $('.pill').css({
            left: position.left,
            width: width
        });
    }
    
    // Initialize pill position on page load
    updatePill();
    
    // Handle navigation item clicks
    $('.nav-item').click(function() {
        const page = $(this).data('page');
        
        // Update active class
        $('.nav-item').removeClass('active');
        $(this).addClass('active');
        
        // Update pill position
        updatePill();
        
        // Handle page navigation
        switch(page) {
            case 'paired':
                window.location.href = 'index.html';
                break;
            case 'index':
                window.location.href = 'collection.html';
                break;
            case 'visualized':
                window.location.href = 'dataviz.html';
                break;
        }
    });
    
    // Handle action button clicks
    $('.action-button').click(function() {
        const action = $(this).data('action');
        
        switch(action) {
            case 'about':
                alert('About: "It\'s Been A Day" is a website that collects and displays the best and worst moments of people\'s days.');
                break;
            case 'submit':
                window.location.href = 'form.html';
                break;
        }
    });
}

// Handle window resize
function handleResize() {
    // Cancel existing animation
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }
    
    // Recalculate positions and restart animation
    const bubbles = document.querySelectorAll('.best-bubble, .worst-bubble');
    const bestContainer = document.getElementById('best-bubbles-canvas');
    const worstContainer = document.getElementById('worst-bubbles-canvas');
    
    bubbles.forEach(bubble => {
        const container = bubble.classList.contains('best-bubble') ? bestContainer : worstContainer;
        const size = parseFloat(bubble.dataset.size);
        
        // New random position within container
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;
        
        const leftPos = Math.random() * (containerWidth - size);
        const topPos = Math.random() * (containerHeight - size);
        
        // Update positions and velocities
        bubble.style.left = `${leftPos}px`;
        bubble.style.top = `${topPos}px`;
        bubble.dataset.posX = leftPos;
        bubble.dataset.posY = topPos;
        
        // Give new random velocities
        const speedFactor = BUBBLE_SPEED_MIN + Math.random() * (BUBBLE_SPEED_MAX - BUBBLE_SPEED_MIN);
        bubble.dataset.velX = (Math.random() * 2 - 1) * speedFactor;
        bubble.dataset.velY = (Math.random() * 2 - 1) * speedFactor;
    });
    
    // Update stats overlay
    createStatsOverlay();
    
    // Restart animation
    startFloatingAnimation();
}

// Initialize on document ready
$(document).ready(function() {
    console.log('Document ready, initializing visualization');
    
    // Setup sticky header navigation
    setupStickyHeader();
    
    // Load data and create bubbles
    loadDataFromGoogleSheets();
    
    // Handle window resize
    window.addEventListener('resize', handleResize);
    
    // Clean up on page unload
    window.addEventListener('beforeunload', () => {
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
        }
    });
    
    // Remove the duplicate event listener code from dataviz.html
    // by setting a global flag
    window.tooltipSetupComplete = true;
});// Helper function to check for bubble collisions
function checkBubbleCollision(bubble1, bubble2) {
    // Get positions and sizes
    const pos1X = parseFloat(bubble1.dataset.posX) + parseFloat(bubble1.dataset.size) / 2;
    const pos1Y = parseFloat(bubble1.dataset.posY) + parseFloat(bubble1.dataset.size) / 2;
    const pos2X = parseFloat(bubble2.dataset.posX) + parseFloat(bubble2.dataset.size) / 2;
    const pos2Y = parseFloat(bubble2.dataset.posY) + parseFloat(bubble2.dataset.size) / 2;
    
    // Calculate distance between centers
    const dx = pos2X - pos1X;
    const dy = pos2Y - pos1Y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Sum of radii
    const radius1 = parseFloat(bubble1.dataset.size) / 2;
    const radius2 = parseFloat(bubble2.dataset.size) / 2;
    const minDistance = radius1 + radius2;
    
    // Check if bubbles are colliding
    if (distance < minDistance) {
        return {
            colliding: true,
            dx: dx,
            dy: dy,
            distance: distance,
            overlap: minDistance - distance
        };
    }
    
    return { colliding: false };
}

// Helper function to resolve bubble collision
function resolveBubbleCollision(bubble1, bubble2, collisionInfo) {
    // Get velocities
    let vel1X = parseFloat(bubble1.dataset.velX);
    let vel1Y = parseFloat(bubble1.dataset.velY);
    let vel2X = parseFloat(bubble2.dataset.velX);
    let vel2Y = parseFloat(bubble2.dataset.velY);
    
    // Get positions
    let pos1X = parseFloat(bubble1.dataset.posX);
    let pos1Y = parseFloat(bubble1.dataset.posY);
    let pos2X = parseFloat(bubble2.dataset.posX);
    let pos2Y = parseFloat(bubble2.dataset.posY);
    
    // Get sizes and masses (mass proportional to area/size)
    const size1 = parseFloat(bubble1.dataset.size);
    const size2 = parseFloat(bubble2.dataset.size);
    const mass1 = size1 * size1;
    const mass2 = size2 * size2;
    
    // Normalize collision vector
    const nx = collisionInfo.dx / collisionInfo.distance;
    const ny = collisionInfo.dy / collisionInfo.distance;
    
    // Relative velocity along collision normal
    const dvx = vel2X - vel1X;
    const dvy = vel2Y - vel1Y;
    const dotProduct = nx * dvx + ny * dvy;
    
    // Don't resolve if bubbles are moving away from each other
    if (dotProduct > 0) return;
    
    // Calculate impulse scalar
    const impulseScalar = (-(1 + COLLISION_DAMPING) * dotProduct) / 
                          (1/mass1 + 1/mass2);
    
    // Apply impulse
    vel1X -= impulseScalar * nx / mass1;
    vel1Y -= impulseScalar * ny / mass1;
    vel2X += impulseScalar * nx / mass2;
    vel2Y += impulseScalar * ny / mass2;
    
    // Resolve overlap - move bubbles apart
    const percent = 0.2; // Penetration resolution percentage
    const correction = collisionInfo.overlap * percent;
    
    pos1X -= nx * correction * (mass2 / (mass1 + mass2));
    pos1Y -= ny * correction * (mass2 / (mass1 + mass2));
    pos2X += nx * correction * (mass1 / (mass1 + mass2));
    pos2Y += ny * correction * (mass1 / (mass1 + mass2));
    
    // Update bubble data
    bubble1.dataset.velX = vel1X;
    bubble1.dataset.velY = vel1Y;
    bubble1.dataset.posX = pos1X;
    bubble1.dataset.posY = pos1Y;
    
    bubble2.dataset.velX = vel2X;
    bubble2.dataset.velY = vel2Y;
    bubble2.dataset.posX = pos2X;
    bubble2.dataset.posY = pos2Y;
    
    // Apply new positions
    bubble1.style.left = `${pos1X}px`;
    bubble1.style.top = `${pos1Y}px`;
    bubble2.style.left = `${pos2X}px`;
    bubble2.style.top = `${pos2Y}px`;
}

// Google Sheets API constants
const SPREADSHEET_ID = '1C-iegnutKxu5hfmqd07HA5081Ie_pfdxc0a-B_7jezI';
const API_KEY = 'AIzaSyCJ0TaH0vypcPDs9vXUbobqXaHfc_AlnmI';
const SHEET_RANGE = 'Sheet1!A2:F';

// Data storage
let entriesData = [];

// Bubble configuration
const BUBBLE_MIN_SIZE = 20;  // Size for rating 1
const BUBBLE_MAX_SIZE = 110; // Size for rating 5
const BUBBLE_SPEED_MIN = 0.001;
const BUBBLE_SPEED_MAX = 1;
const CENTER_ATTRACTION_STRENGTH = 0.00001; // How strongly bubbles are attracted to center
const COLLISION_DAMPING = 1;      // Energy loss in collisions

// Bubble color constants based on collection-styles.css
const BEST_MOMENT_COLORS = {
    1: 'rgba(59, 255, 95, 0.2)',
    2: 'rgba(59, 255, 95, 0.325)',
    3: 'rgba(59, 255, 95, 0.55)',
    4: 'rgba(59, 255, 95, 0.775)',
    5: 'rgba(59, 255, 95, 0.9)'
};

const WORST_MOMENT_COLORS = {
    1: 'rgba(147, 219, 255, 0.2)',
    2: 'rgba(147, 219, 255, 0.325)',
    3: 'rgba(147, 219, 255, 0.55)',
    4: 'rgba(147, 219, 255, 0.775)',
    5: 'rgba(147, 219, 255, 0.9)'
};

// Animation frame ID for cancellation
let animationFrameId = null;

// Tooltip element
let tooltip = null;

// Function to parse date from Google Sheets (expected format: MM/DD/YYYY HH:MM:SS)
function parseSheetDate(dateString) {
    if (!dateString) return { date: formatDate(), time: formatTime() };
    
    try {
        const parts = dateString.split(' ');
        if (parts.length >= 2) {
            return {
                date: parts[0], // MM/DD/YYYY
                time: parts[1]  // HH:MM:SS
            };
        }
    } catch (e) {
        console.error('Error parsing date:', e);
    }
    
    // Fallback to current date/time
    return { date: formatDate(), time: formatTime() };
}

// Function to format the current date in MM/DD/YYYY format
function formatDate() {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const year = now.getFullYear();
    return `${month}/${day}/${year}`;
}

// Function to format the current time in HH:MM:SS format
function formatTime() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
}

// Function to load data from Google Sheets
function loadDataFromGoogleSheets() {
    const apiUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${SHEET_RANGE}?key=${API_KEY}`;
    
    fetch(apiUrl)
        .then(response => {
            if (!response.ok) {
                console.log("Response status:", response.status);
                return response.text().then(text => {
                    console.log("Error response body:", text);
                    throw new Error(`HTTP error! Status: ${response.status}`);
                });
            }
            return response.json();
        })
        .then(data => {
            const rows = data.values || [];
            console.log("Data loaded from Google Sheets:", rows);
            
            // Reset array
            entriesData = [];
            
            // Process the data
            rows.forEach(row => {
                // Check if we have a proper row with enough elements
                if (row && row.length >= 5) {
                    const dateTimeObj = parseSheetDate(row[0] || '');
                    const location = row.length >= 6 ? row[5] : "UNKNOWN";
                    
                    // Best moment (column B/index 1)
                    if (row[1] && row[1].trim() !== '' && row[2] && !isNaN(parseInt(row[2]))) {
                        entriesData.push({
                            type: 'best',
                            content: row[1],
                            rating: parseInt(row[2]) || 3,
                            date: dateTimeObj.date,
                            time: dateTimeObj.time,
                            location: location
                        });
                    }
                    
                    // Worst moment (column D/index 3)
                    if (row[3] && row[3].trim() !== '' && row[4] && !isNaN(parseInt(row[4]))) {
                        entriesData.push({
                            type: 'worst',
                            content: row[3],
                            rating: parseInt(row[4]) || 3,
                            date: dateTimeObj.date,
                            time: dateTimeObj.time,
                            location: location
                        });
                    }
                }
            });
            
            console.log("Processed data for visualization:", entriesData);
            
            // Create bubbles
            createBubbles();
        })
        .catch(error => {
            console.error('Error fetching data from Google Sheets:', error);
            // Fallback to mock data if API fails
            console.log("Falling back to mock data");
            useMockData();
            
            // Create bubbles with mock data
            createBubbles();
        });
}

// Fallback mock data in case the API fails
function useMockData() {
    entriesData = [
        { 
            type: 'best',
            content: "my english teacher canceled class", 
            rating: 5,
            date: "04/16/2025",
            time: "07:16:23",
            location: "SCHOOL"
        },
        { 
            type: 'worst',
            content: "i now can't fall back asleep. woke up for nothing.", 
            rating: 2,
            date: "04/16/2025",
            time: "09:10:15",
            location: "BED"
        },
        { 
            type: 'best',
            content: "finally finished that assignment I've been procrastinating", 
            rating: 4,
            date: "04/16/2025",
            time: "15:22:10",
            location: "HOME"
        },
        { 
            type: 'worst',
            content: "spilled coffee on my notes right before class", 
            rating: 3,
            date: "04/16/2025",
            time: "10:45:30",
            location: "CLASSROOM"
        },
        { 
            type: 'best',
            content: "had a really good sandwich for lunch", 
            rating: 3,
            date: "04/16/2025",
            time: "12:05:33",
            location: "CAFE"
        },
        { 
            type: 'worst',
            content: "missed the bus and had to walk in the rain", 
            rating: 4,
            date: "04/16/2025",
            time: "08:20:45",
            location: "BUS STOP"
        },
        {
            type: 'best',
            content: "went for a walk with my sister",
            rating: 4,
            date: "04/16/2025",
            time: "14:30:00",
            location: "PARK"
        },
        {
            type: 'worst',
            content: "got a papercut on my hand",
            rating: 2,
            date: "04/16/2025",
            time: "16:15:45",
            location: "OFFICE"
        },
        {
            type: 'best',
            content: "quit my job!",
            rating: 5,
            date: "04/16/2025",
            time: "17:00:00",
            location: "OFFICE"
        },
        {
            type: 'worst',
            content: "don't have any income!",
            rating: 5,
            date: "04/16/2025",
            time: "17:05:00",
            location: "OFFICE"
        }
    ];
}

// Function to get bubble color based on type and rating
function getBubbleColor(type, rating) {
    if (type === 'best') {
        return BEST_MOMENT_COLORS[rating] || BEST_MOMENT_COLORS[3]; // Default to rating 3 if not found
    } else {
        return WORST_MOMENT_COLORS[rating] || WORST_MOMENT_COLORS[3]; // Default to rating 3 if not found
    }
}

// Function to calculate statistics from entries data
function calculateDataStats(data) {
    if (!data || data.length === 0) {
        return {
            totalEntries: 0,
            bestCount: 0,
            worstCount: 0,
            avgBestRating: 0,
            avgWorstRating: 0,
            maxBestRating: 0,
            maxWorstRating: 0,
            bestLocations: [],
            worstLocations: []
        };
    }
    
    // Split by type
    const bestMoments = data.filter(entry => entry.type === 'best');
    const worstMoments = data.filter(entry => entry.type === 'worst');
    
    // Calculate average ratings
    const avgBestRating = bestMoments.length > 0 
        ? bestMoments.reduce((sum, entry) => sum + entry.rating, 0) / bestMoments.length 
        : 0;
        
    const avgWorstRating = worstMoments.length > 0 
        ? worstMoments.reduce((sum, entry) => sum + entry.rating, 0) / worstMoments.length 
        : 0;
    
    // Find max ratings
    const maxBestRating = bestMoments.length > 0 
        ? Math.max(...bestMoments.map(entry => entry.rating)) 
        : 0;
        
    const maxWorstRating = worstMoments.length > 0 
        ? Math.max(...worstMoments.map(entry => entry.rating)) 
        : 0;
    
    // Find most common locations
    const bestLocationCounts = {};
    bestMoments.forEach(entry => {
        const loc = entry.location || "UNKNOWN";
        bestLocationCounts[loc] = (bestLocationCounts[loc] || 0) + 1;
    });
    
    const worstLocationCounts = {};
    worstMoments.forEach(entry => {
        const loc = entry.location || "UNKNOWN";
        worstLocationCounts[loc] = (worstLocationCounts[loc] || 0) + 1;
    });
    
    // Convert to arrays and sort by count
    const bestLocations = Object.entries(bestLocationCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2) // Top 2 locations
        .map(([loc, count]) => ({ loc, count }));
        
    const worstLocations = Object.entries(worstLocationCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2) // Top 2 locations
        .map(([loc, count]) => ({ loc, count }));
    
    return {
        totalEntries: data.length,
        bestCount: bestMoments.length,
        worstCount: worstMoments.length,
        avgBestRating: avgBestRating.toFixed(1),
        avgWorstRating: avgWorstRating.toFixed(1),
        maxBestRating,
        maxWorstRating,
        bestLocations,
        worstLocations
    };
}

// Function to create and update stats overlay
function createStatsOverlay() {
    // Calculate stats first
    const stats = calculateDataStats(entriesData);
    
    // Create overlay element if it doesn't exist
    let statsOverlay = document.getElementById('stats-overlay');
    if (!statsOverlay) {
        statsOverlay = document.createElement('div');
        statsOverlay.id = 'stats-overlay';
        statsOverlay.className = 'stats-overlay';
        document.body.appendChild(statsOverlay);
    }
    
    // Create content based on stats
    let bestLocationsText = stats.bestLocations.length > 0 
        ? stats.bestLocations.map(l => `${l.loc} (${l.count})`).join(', ')
        : 'N/A';
        
    let worstLocationsText = stats.worstLocations.length > 0 
        ? stats.worstLocations.map(l => `${l.loc} (${l.count})`).join(', ')
        : 'N/A';
    
    statsOverlay.innerHTML = `
        <div class="stats-title">DATA SUMMARY</div>
        <div class="stats-content">
            <div class="stats-row">
                <span class="stats-label">Total Entries:</span>
                <span class="stats-value">${stats.bestCount}</span>
            </div>
            
            <div class="stats-divider"></div>
                        <div class="stats-row">
                <span class="stats-label" >BEST MOMENTS</span>
            </div>
            
            <div class="stats-row">
                <span class="stats-label">Average Rating:</span>
                <span class="stats-value">${stats.avgBestRating} / 5</span>
            </div>
            <div class="stats-row">
                <span class="stats-label">Top Rating:</span>
                <span class="stats-value">${stats.maxBestRating} / 5</span>
            </div>
            
            <div class="stats-divider"></div>
            
                        <div class="stats-row">
                <span class="stats-label" >WORST MOMENTS</span>
            </div>
            <div class="stats-row">
                <span class="stats-label">Average Rating:</span>
                <span class="stats-value">${stats.avgWorstRating} / 5</span>
            </div>
            <div class="stats-row">
                <span class="stats-label">Top Rating:</span>
                <span class="stats-value">${stats.maxWorstRating} / 5</span>
            </div>

            <div class="stats-divider"></div>
            
            <div class="stats-row">
                <span class="stats-label">Top Locations:</span>
                <span class="stats-value">${worstLocationsText}</span>
            </div>
        </div>
    `;
}

// Function to create floating bubbles
function createBubbles() {
    const bestContainer = document.getElementById('best-bubbles-canvas');
    const worstContainer = document.getElementById('worst-bubbles-canvas');
    
    // Clear existing bubbles
    bestContainer.innerHTML = '';
    worstContainer.innerHTML = '';
    
    // Create tooltip if it doesn't exist
    if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.className = 'bubble-tooltip';
        document.body.appendChild(tooltip);
    }
    
    // Create bubbles for each entry
    entriesData.forEach((entry, index) => {
        const bubble = document.createElement('div');
        bubble.className = entry.type === 'best' ? 'best-bubble' : 'worst-bubble';
        
        // Calculate bubble size based on rating (1-5)
        const size = BUBBLE_MIN_SIZE + ((BUBBLE_MAX_SIZE - BUBBLE_MIN_SIZE) * (entry.rating - 1) / 4);
        bubble.style.width = `${size}px`;
        bubble.style.height = `${size}px`;
        
        // Set bubble color based on type and rating
        bubble.style.backgroundColor = getBubbleColor(entry.type, entry.rating);
        
        // Set initial random position
        const containerWidth = entry.type === 'best' ? bestContainer.clientWidth : worstContainer.clientWidth;
        const containerHeight = entry.type === 'best' ? bestContainer.clientHeight : worstContainer.clientHeight;
        
        // Make sure bubbles are placed within view
        const leftPos = Math.random() * (containerWidth - size);
        const topPos = Math.random() * (containerHeight - size);
        
        bubble.style.left = `${leftPos}px`;
        bubble.style.top = `${topPos}px`;
        
        // Set inner text (rating)
        bubble.textContent = entry.rating;
        
        // Set data attributes for tooltip
        bubble.dataset.content = entry.content;
        bubble.dataset.date = entry.date;
        bubble.dataset.time = entry.time;
        bubble.dataset.location = entry.location;
        bubble.dataset.rating = entry.rating;
        bubble.dataset.index = index;
        bubble.dataset.size = size;
        bubble.dataset.type = entry.type;
        
        // Add physics data with random velocities
        const speedFactor = BUBBLE_SPEED_MIN + Math.random() * (BUBBLE_SPEED_MAX - BUBBLE_SPEED_MIN);
        bubble.dataset.velX = (Math.random() * 2 - 1) * speedFactor;
        bubble.dataset.velY = (Math.random() * 2 - 1) * speedFactor;
        bubble.dataset.posX = leftPos;
        bubble.dataset.posY = topPos;
        
        // IMPORTANT: Add this to mark that the bubble has been created properly with all data
        bubble.dataset.initialized = 'true';
        
        // IMPORTANT: We'll attach the event listeners directly here and mark them
        bubble.dataset.listenersAdded = 'true';
        
        bubble.addEventListener('mouseenter', function(e) {
            console.log(`Bubble entered: ${entry.type} - ${entry.content}`);
            showTooltip(e);
        });
        
        bubble.addEventListener('mousemove', moveTooltip);
        bubble.addEventListener('mouseleave', hideTooltip);
        
        // Add to appropriate container
        if (entry.type === 'best') {
            bestContainer.appendChild(bubble);
        } else {
            worstContainer.appendChild(bubble);
        }
    });
    
    // Create stats overlay
    createStatsOverlay();
    
    // Start animation
    startFloatingAnimation();
}

// Function to show tooltip on bubble hover
function showTooltip(event) {
    const bubble = event.target;
    
    // Debug to help identify any issues
    console.log('Bubble hover:', bubble.className, bubble.dataset.content);
    
    tooltip.innerHTML = `
        <p>${bubble.dataset.content}</p><br>
        Location: ${bubble.dataset.location}<br>
        Date: ${bubble.dataset.date}<br>
        Time: ${bubble.dataset.time}<br>
        Rating: ${bubble.dataset.rating}/5
    `;
    
    tooltip.style.opacity = '1';  // Set opacity directly
    tooltip.classList.add('visible');
    moveTooltip(event);
}

// Function to move tooltip with cursor
function moveTooltip(event) {
    const x = event.clientX + 10;
    const y = event.clientY + 10;
    
    tooltip.style.left = `${x}px`;
    tooltip.style.top = `${y}px`;
}

// Function to hide tooltip
function hideTooltip() {
    tooltip.style.opacity = '0';  // Set opacity directly
    tooltip.classList.remove('visible');
}

// Function to start floating animation with physics, bouncing and center attraction
function startFloatingAnimation() {
    // Cancel existing animation if any
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }
    
    const bestBubbles = document.querySelectorAll('.best-bubble');
    const worstBubbles = document.querySelectorAll('.worst-bubble');
    const bubbles = [...bestBubbles, ...worstBubbles];
    
    console.log(`Animation starting with ${bestBubbles.length} best bubbles and ${worstBubbles.length} worst bubbles`);
    
    const bestContainer = document.getElementById('best-bubbles-canvas');
    const worstContainer = document.getElementById('worst-bubbles-canvas');
    
    function animate() {
        // First update all bubble positions based on velocities
        bubbles.forEach(bubble => {
            // Skip bubbles that aren't fully initialized
            if (!bubble.dataset.initialized) return;
            
            // Get current position and velocity
            let posX = parseFloat(bubble.dataset.posX);
            let posY = parseFloat(bubble.dataset.posY);
            let velX = parseFloat(bubble.dataset.velX);
            let velY = parseFloat(bubble.dataset.velY);
            const size = parseFloat(bubble.dataset.size);
            
            // Get container dimensions (each bubble type has its own container)
            const container = bubble.classList.contains('best-bubble') ? bestContainer : worstContainer;
            const containerWidth = container.clientWidth;
            const containerHeight = container.clientHeight;
            
            // Calculate center of the container
            const centerX = containerWidth / 2;
            const centerY = containerHeight / 2;
            
            // Calculate bubble center
            const bubbleCenterX = posX + size / 2;
            const bubbleCenterY = posY + size / 2;
            
            // Calculate vector from bubble to center
            const dx = centerX - bubbleCenterX;
            const dy = centerY - bubbleCenterY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Apply attraction to center
            if (distance > 5) { // Only attract if not too close to center
                velX += dx * CENTER_ATTRACTION_STRENGTH;
                velY += dy * CENTER_ATTRACTION_STRENGTH;
            }
            
            // Update position with velocity
            posX += velX;
            posY += velY;
            
            // Bounce off container edges
            // Right edge
            if (posX + size > containerWidth) {
                posX = containerWidth - size;
                velX = -velX * 0.8; // Add damping factor
            }
            // Left edge
            if (posX < 0) {
                posX = 0;
                velX = -velX * 0.8;
            }
            // Bottom edge
            if (posY + size > containerHeight) {
                posY = containerHeight - size;
                velY = -velY * 0.8;
            }
            // Top edge
            if (posY < 0) {
                posY = 0;
                velY = -velY * 0.8;
            }
            
            // Apply slight drag/friction
            velX *= 0.99;
            velY *= 0.99;
            
            // Add small random movement to keep things interesting
            velX += (Math.random() - 0.5) * 0.1;
            velY += (Math.random() - 0.5) * 0.1;
            
            // Update bubble data
            bubble.dataset.posX = posX;
            bubble.dataset.posY = posY;
            bubble.dataset.velX = velX;
            bubble.dataset.velY = velY;
            
            // Apply new position
            bubble.style.left = `${posX}px`;
            bubble.style.top = `${posY}px`;
        });
        
        // Then check for and resolve collisions between bubbles
        for (let i = 0; i < bubbles.length; i++) {
            // Skip bubbles that aren't fully initialized
            if (!bubbles[i].dataset.initialized) continue;
            
            for (let j = i + 1; j < bubbles.length; j++) {
                // Skip bubbles that aren't fully initialized
                if (!bubbles[j].dataset.initialized) continue;
                
                const collision = checkBubbleCollision(bubbles[i], bubbles[j]);
                if (collision.colliding) {
                    resolveBubbleCollision(bubbles[i], bubbles[j], collision);
                }
            }
        }
        
        // Continue animation
        animationFrameId = requestAnimationFrame(animate);
    }
    
    // Start the animation
    animate();
}