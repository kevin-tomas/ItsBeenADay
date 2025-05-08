// Google Sheets API constants
const SPREADSHEET_ID = '1C-iegnutKxu5hfmqd07HA5081Ie_pfdxc0a-B_7jezI';
const API_KEY = 'AIzaSyCJ0TaH0vypcPDs9vXUbobqXaHfc_AlnmI';
const SHEET_RANGE = 'Sheet1!A2:F'; // Updated to include column F for location

// Data storage
let pairedEntries = []; // New array to store paired entries
let previousPairIndex = -1; // Track the previously shown pair index

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

// New function to load a paired entry
function loadPairedEntry() {
    const $leftContainer = $('.half.left');
    const $rightContainer = $('.half.right');
    
    const $leftEntryContent = $leftContainer.find('.entry-content');
    const $rightEntryContent = $rightContainer.find('.entry-content');
    
    const $leftEntry = $leftContainer.find('.entry-text');
    const $rightEntry = $rightContainer.find('.entry-text');
    
    const $leftLoading = $leftContainer.find('.loading');
    const $rightLoading = $rightContainer.find('.loading');
    
    // Show loading spinners
    $leftLoading.fadeIn();
    $rightLoading.fadeIn();
    
    // Check if we have entries
    if (pairedEntries.length === 0) {
        $leftEntry.text("No best moments found. Add some!");
        $rightEntry.text("No worst moments found. Add some!");
        $leftLoading.fadeOut();
        $rightLoading.fadeOut();
        return;
    }
    
    // Simulate API call delay
    setTimeout(() => {
        let randomIndex;
        
        // If we only have one entry, just show it
        if (pairedEntries.length === 1) {
            randomIndex = 0;
        } else {
            // Keep generating new random indices until we get one different from the previous
            do {
                randomIndex = Math.floor(Math.random() * pairedEntries.length);
            } while (randomIndex === previousPairIndex && pairedEntries.length > 1);
        }
        
        // Update the previous index tracker
        previousPairIndex = randomIndex;
        
        const pair = pairedEntries[randomIndex];
        
        // Display left (best) entry
        $leftEntry.text(pair.best.content);
        $leftContainer.attr('data-rating', pair.best.rating);
        $leftContainer.find('.location-field').text(pair.best.location || "UNKNOWN");
        $leftContainer.find('.date-field').text(pair.date || formatDate());
        $leftContainer.find('.time-field').text(pair.time || formatTime());
        $leftContainer.find('.rating-field').text(pair.best.rating);
        
        // Display right (worst) entry
        $rightEntry.text(pair.worst.content);
        $rightContainer.attr('data-rating', pair.worst.rating);
        $rightContainer.find('.location-field').text(pair.worst.location || "UNKNOWN");
        $rightContainer.find('.date-field').text(pair.date || formatDate());
        $rightContainer.find('.time-field').text(pair.time || formatTime());
        $rightContainer.find('.rating-field').text(pair.worst.rating);
        
        // Hide loading spinners
        $leftLoading.fadeOut();
        $rightLoading.fadeOut();
    }, 500);
}

// Function to load data from Google Sheets
function loadDataFromGoogleSheets() {
    const apiUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${SHEET_RANGE}?key=${API_KEY}`;
    
    console.log("Requesting from URL:", apiUrl); // For debugging
    
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
            console.log("Raw data from sheet:", data);
            console.log("Data loaded from Google Sheets:", rows);
            
            // Reset array
            pairedEntries = [];
            
            // Process the data
            rows.forEach(row => {
                // Check if we have a proper row with enough elements
                if (row && row.length >= 5) {
                    const dateTimeObj = parseSheetDate(row[0] || '');
                    const location = row.length >= 6 ? row[5] : "UNKNOWN";
                    
                    // Both best and worst moments need to be present
                    if (row[1] && row[1].trim() !== '' && row[3] && row[3].trim() !== '') {
                        pairedEntries.push({
                            date: dateTimeObj.date,
                            time: dateTimeObj.time,
                            best: {
                                content: row[1],
                                rating: parseInt(row[2]) || 3,
                                location: location
                            },
                            worst: {
                                content: row[3],
                                rating: parseInt(row[4]) || 3,
                                location: location
                            }
                        });
                    }
                }
            });
            
            console.log("After processing - paired entries:", pairedEntries);
            
            // Reset previous index
            previousPairIndex = -1;
            
            // Initial load of paired entry
            loadPairedEntry();
        })
        .catch(error => {
            console.error('Error fetching data from Google Sheets:', error);
            // Fallback to mock data if API fails
            console.log("Falling back to mock data");
            useMockData();
            
            // Reset previous index
            previousPairIndex = -1;
            
            // Load the mock paired entry
            loadPairedEntry();
        });
}

// Fallback mock data in case the API fails
function useMockData() {
    pairedEntries = [
        { 
            date: "04/16/2025",
            time: "07:16:23",
            best: { 
                content: "my english teacher canceled class", 
                rating: 5,
                location: "SCHOOL"
            },
            worst: { 
                content: "i now can't fall back asleep. woke up for nothing and don't have another class until 12:30 (it's currently 9:10 here).", 
                rating: 2,
                location: "BED"
            }
        },
        { 
            date: "04/16/2025",
            time: "15:22:10",
            best: { 
                content: "finally finished that assignment I've been procrastinating", 
                rating: 4,
                location: "HOME"
            },
            worst: { 
                content: "spilled coffee on my notes right before class", 
                rating: 3,
                location: "CLASSROOM"
            }
        },
        { 
            date: "04/16/2025",
            time: "12:05:33",
            best: { 
                content: "had a really good sandwich for lunch", 
                rating: 3,
                location: "CAFE"
            },
            worst: { 
                content: "missed the bus and had to walk in the rain", 
                rating: 4,
                location: "BUS STOP"
            }
        }
    ];
}

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

// Function to set up the cursor message
function setupCursorMessage() {
    // Create the cursor message element
    const cursorMessage = document.createElement('div');
    cursorMessage.classList.add('cursor-message');
    cursorMessage.textContent = 'click to advance';
    document.body.appendChild(cursorMessage);
    
    // Track mouse position
    document.addEventListener('mousemove', (e) => {
        if (cursorMessage.classList.contains('visible')) {
            cursorMessage.style.left = `${e.clientX}px`;
            cursorMessage.style.top = `${e.clientY}px`;
        }
    });
    
    // Show message when hovering over entry content
    $('.entry-content').on('mouseenter', function() {
        cursorMessage.classList.add('visible');
    });
    
    // Hide message when leaving entry content
    $('.entry-content').on('mouseleave', function() {
        cursorMessage.classList.remove('visible');
    });
}

// Initial setup on document ready
$(document).ready(function() {
    // Set initial date and time fields
    $('.date-field').text(formatDate());
    $('.time-field').text(formatTime());
    $('.location-field').text("UNKNOWN");
    $('.rating-field').text("3"); // Default rating
    
    // Setup sticky header navigation
    setupStickyHeader();
    
    // Setup cursor message
    setupCursorMessage();
    
    // Load data from Google Sheets
    loadDataFromGoogleSheets();
    
    // Click handlers for the content areas - now both sides trigger the same function
    $('.entry-content').click(function() {
        loadPairedEntry();
    });
});