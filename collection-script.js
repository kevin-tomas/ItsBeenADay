// Modified collection-script.js with sorting functionality

// Google Sheets API constants - use the same as in script.js
const SPREADSHEET_ID = '1C-iegnutKxu5hfmqd07HA5081Ie_pfdxc0a-B_7jezI';
const API_KEY = 'AIzaSyCJ0TaH0vypcPDs9vXUbobqXaHfc_AlnmI';
const SHEET_RANGE = 'Sheet1!A2:F';

// Global variable to store the data for sorting
let collectionData = [];

// Sort states for toggle functionality
const sortState = {
    date: 'newest', // 'none', 'newest', 'oldest' - Changed default to 'newest'
    bestRating: 'none', // 'none', 'highest', 'lowest'
    worstRating: 'none' // 'none', 'highest', 'lowest'
};

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

// Function to load data from Google Sheets and populate the index table
function loadIndexData() {
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
            
            // Process the data and store for sorting
            collectionData = [];
            
            rows.forEach(row => {
                // Check if we have a proper row with enough elements
                if (row && row.length >= 5) {
                    const dateTimeObj = parseSheetDate(row[0] || '');
                    const location = row.length >= 6 ? row[5] : "UNKNOWN";
                    const bestMoment = row[1] || '';
                    const bestRating = parseInt(row[2]) || 3;
                    const worstMoment = row[3] || '';
                    const worstRating = parseInt(row[4]) || 3;
                    
                    // Only create a row if we have at least one of best or worst moment
                    if (bestMoment.trim() !== '' || worstMoment.trim() !== '') {
                        // Store the data for sorting
                        collectionData.push({
                            dateString: row[0] || '',
                            dateObj: new Date(dateTimeObj.date + ' ' + dateTimeObj.time),
                            dateFormatted: dateTimeObj.date,
                            timeFormatted: dateTimeObj.time,
                            location: location,
                            bestMoment: bestMoment,
                            bestRating: bestRating,
                            worstMoment: worstMoment,
                            worstRating: worstRating
                        });
                    }
                }
            });
            
            // Render the table with default sorting (newest first)
            renderTable();
        })
        .catch(error => {
            console.error('Error fetching data from Google Sheets:', error);
            // Fallback to mock data if API fails
            useMockData();
        });
}

// Function to render the table based on current sort state
function renderTable() {
    const tableBody = document.getElementById('index-entries');
    tableBody.innerHTML = ''; // Clear existing entries
    
    // Apply sorting based on current state
    sortData();
    
    // If no data was found, display a message
    if (collectionData.length === 0) {
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = 3;
        td.textContent = 'No entries found. Be the first to submit!';
        td.style.textAlign = 'center';
        td.style.padding = '20px';
        tr.appendChild(td);
        tableBody.appendChild(tr);
        return;
    }
    
    // Add data to the table
    collectionData.forEach(entry => {
        const tr = document.createElement('tr');
        
        // Add combined date, time, and location cell
        const metadataCell = document.createElement('td');
        
        // Create date and time div
        const dateTimeDiv = document.createElement('div');
        dateTimeDiv.className = 'date-time';
        dateTimeDiv.textContent = `${entry.dateFormatted}, ${entry.timeFormatted}`;
        metadataCell.appendChild(dateTimeDiv);
        
        // Create location div
        const locationDiv = document.createElement('div');
        locationDiv.className = 'location';
        locationDiv.textContent = entry.location;
        metadataCell.appendChild(locationDiv);
        
        tr.appendChild(metadataCell);
        
        // Add best moment cell
        const bestCell = document.createElement('td');
        if (entry.bestMoment.trim() !== '') {
            const bestDiv = document.createElement('div');
            bestDiv.className = 'best-moment';
            bestDiv.setAttribute('data-rating', entry.bestRating);
            
            // Create rating badge first
            const ratingBadge = document.createElement('span');
            ratingBadge.className = 'rating-badge rating-badge-front';
            ratingBadge.textContent = `${entry.bestRating}/5`;
            bestDiv.appendChild(ratingBadge);
            
            // Add a text node after the badge for the best moment content
            const textNode = document.createTextNode(entry.bestMoment);
            bestDiv.appendChild(textNode);
            
            bestCell.appendChild(bestDiv);
        }
        tr.appendChild(bestCell);
        
        // Add worst moment cell
        const worstCell = document.createElement('td');
        if (entry.worstMoment.trim() !== '') {
            const worstDiv = document.createElement('div');
            worstDiv.className = 'worst-moment';
            worstDiv.setAttribute('data-rating', entry.worstRating);
            
            // Create rating badge first
            const ratingBadge = document.createElement('span');
            ratingBadge.className = 'rating-badge rating-badge-front';
            ratingBadge.textContent = `${entry.worstRating}/5`;
            worstDiv.appendChild(ratingBadge);
            
            // Add a text node after the badge for the worst moment content
            const textNode = document.createTextNode(entry.worstMoment);
            worstDiv.appendChild(textNode);
            
            worstCell.appendChild(worstDiv);
        }
        tr.appendChild(worstCell);
        
        // Add the row to the table
        tableBody.appendChild(tr);
    });
}

// Function to sort the data based on current sort state
function sortData() {
    // Sort by date if active
    if (sortState.date !== 'none') {
        collectionData.sort((a, b) => {
            if (sortState.date === 'newest') {
                return b.dateObj - a.dateObj; // Newest first
            } else {
                return a.dateObj - b.dateObj; // Oldest first
            }
        });
    }
    
    // Sort by best rating if active
    if (sortState.bestRating !== 'none') {
        collectionData.sort((a, b) => {
            if (sortState.bestRating === 'highest') {
                return b.bestRating - a.bestRating; // Highest first
            } else {
                return a.bestRating - b.bestRating; // Lowest first
            }
        });
    }
    
    // Sort by worst rating if active
    if (sortState.worstRating !== 'none') {
        collectionData.sort((a, b) => {
            if (sortState.worstRating === 'highest') {
                return b.worstRating - a.worstRating; // Highest first
            } else {
                return a.worstRating - b.worstRating; // Lowest first
            }
        });
    }
}

// Function to toggle sorting
function toggleSort(sortType) {
    // Reset all sort states except the one being toggled
    if (sortType !== 'date') sortState.date = 'none';
    if (sortType !== 'bestRating') sortState.bestRating = 'none';
    if (sortType !== 'worstRating') sortState.worstRating = 'none';
    
    // Toggle the selected sort state
    if (sortType === 'date') {
        if (sortState.date === 'none' || sortState.date === 'oldest') {
            sortState.date = 'newest';
        } else {
            sortState.date = 'oldest';
        }
    } else if (sortType === 'bestRating') {
        if (sortState.bestRating === 'none' || sortState.bestRating === 'lowest') {
            sortState.bestRating = 'highest';
        } else {
            sortState.bestRating = 'lowest';
        }
    } else if (sortType === 'worstRating') {
        if (sortState.worstRating === 'none' || sortState.worstRating === 'lowest') {
            sortState.worstRating = 'highest';
        } else {
            sortState.worstRating = 'lowest';
        }
    }
    
    // Update UI to show active sort
    updateSortUI();
    
    // Re-render the table with the new sorting
    renderTable();
}

// Function to update the sort buttons UI
function updateSortUI() {
    // Reset all button states
    document.querySelectorAll('.sort-button').forEach(button => {
        button.classList.remove('sort-active', 'sort-asc', 'sort-desc');
    });
    
    // Update date sort button
    if (sortState.date !== 'none') {
        const dateButton = document.querySelector('[data-sort="date"]');
        dateButton.classList.add('sort-active');
        if (sortState.date === 'newest') {
            dateButton.classList.add('sort-desc');
            dateButton.setAttribute('title', 'Sorted by Date (Newest First)');
        } else {
            dateButton.classList.add('sort-asc');
            dateButton.setAttribute('title', 'Sorted by Date (Oldest First)');
        }
    }
    
    // Update best rating sort button
    if (sortState.bestRating !== 'none') {
        const bestButton = document.querySelector('[data-sort="bestRating"]');
        bestButton.classList.add('sort-active');
        if (sortState.bestRating === 'highest') {
            bestButton.classList.add('sort-desc');
            bestButton.setAttribute('title', 'Sorted by Best Rating (Highest First)');
        } else {
            bestButton.classList.add('sort-asc');
            bestButton.setAttribute('title', 'Sorted by Best Rating (Lowest First)');
        }
    }
    
    // Update worst rating sort button
    if (sortState.worstRating !== 'none') {
        const worstButton = document.querySelector('[data-sort="worstRating"]');
        worstButton.classList.add('sort-active');
        if (sortState.worstRating === 'highest') {
            worstButton.classList.add('sort-desc');
            worstButton.setAttribute('title', 'Sorted by Worst Rating (Highest First)');
        } else {
            worstButton.classList.add('sort-asc');
            worstButton.setAttribute('title', 'Sorted by Worst Rating (Lowest First)');
        }
    }
}

// Fallback mock data in case the API fails
function useMockData() {
    const mockData = [
        {
            date: "04/16/2025",
            time: "07:16:23",
            location: "SCHOOL",
            bestMoment: "my english teacher canceled class",
            bestRating: 5,
            worstMoment: "i now can't fall back asleep. woke up for nothing and don't have another class until 12:30 (it's currently 9:10 here).",
            worstRating: 2
        },
        {
            date: "04/16/2025",
            time: "15:22:10",
            location: "HOME",
            bestMoment: "finally finished that assignment I've been procrastinating",
            bestRating: 4,
            worstMoment: "spilled coffee on my notes right before class",
            worstRating: 3
        },
        {
            date: "04/16/2025",
            time: "12:05:33",
            location: "CAFE",
            bestMoment: "had a really good sandwich for lunch",
            bestRating: 3,
            worstMoment: "missed the bus and had to walk in the rain",
            worstRating: 4
        },
        {
            date: "04/16/2025",
            time: "09:12:23",
            location: "UNKNOWN",
            bestMoment: "went for a walk with my sister",
            bestRating: 4,
            worstMoment: "got a papercut on my hand",
            worstRating: 2
        },
        {
            date: "04/16/2025",
            time: "09:12:23",
            location: "UNKNOWN",
            bestMoment: "quit my job!",
            bestRating: 5,
            worstMoment: "don't have any income!",
            worstRating: 5
        },
        {
            date: "04/07/2025",
            time: "12:12:23",
            location: "UNKNOWN",
            bestMoment: "went to breakfast and caught up with an old friend",
            bestRating: 4,
            worstMoment: "my favorite sweater got a hole in it",
            worstRating: 3
        }
    ];
    
    // Convert mock data to our collectionData format
    collectionData = mockData.map(entry => {
        return {
            dateString: `${entry.date} ${entry.time}`,
            dateObj: new Date(entry.date + ' ' + entry.time),
            dateFormatted: entry.date,
            timeFormatted: entry.time,
            location: entry.location,
            bestMoment: entry.bestMoment,
            bestRating: entry.bestRating,
            worstMoment: entry.worstMoment,
            worstRating: entry.worstRating
        };
    });
    
    // Render the table with default sorting
    renderTable();
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
    
    // Handle sort button clicks
    $('.sort-button').click(function() {
        const sortType = $(this).data('sort');
        toggleSort(sortType);
    });
}

// Initialize on document ready
$(document).ready(function() {
    // Setup sticky header navigation
    setupStickyHeader();
    
    // Set initial sort state UI to match the default (newest first)
    updateSortUI();
    
    // Load and display index data
    loadIndexData();
});