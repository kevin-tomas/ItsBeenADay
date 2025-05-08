const SPREADSHEET_ID = '1C-iegnutKxu5hfmqd07HA5081Ie_pfdxc0a-B_7jezI';
const API_KEY = 'AIzaSyCJ0TaH0vypcPDs9vXUbobqXaHfc_AlnmI';
const SHEET_RANGE = 'Sheet1!A2:F'; 

let pairedEntries = []; 
let previousPairIndex = -1; 

function parseSheetDate(dateString) {
    if (!dateString) return { date: formatDate(), time: formatTime() };
    
    try {
        const parts = dateString.split(' ');
        if (parts.length >= 2) {
            return {
                date: parts[0],
                time: parts[1]
            };
        }
    } catch (e) {
        console.error('Error parsing date:', e);
    }
    
    return { date: formatDate(), time: formatTime() };
}

function formatDate() {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const year = now.getFullYear();
    return `${month}/${day}/${year}`;
}

function formatTime() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
}

function loadPairedEntry() {
    const $leftContainer = $('.half.left');
    const $rightContainer = $('.half.right');
    
    const $leftEntryContent = $leftContainer.find('.entry-content');
    const $rightEntryContent = $rightContainer.find('.entry-content');
    
    const $leftEntry = $leftContainer.find('.entry-text');
    const $rightEntry = $rightContainer.find('.entry-text');
    
    const $leftLoading = $leftContainer.find('.loading');
    const $rightLoading = $rightContainer.find('.loading');
    
    $leftLoading.fadeIn();
    $rightLoading.fadeIn();
    
    if (pairedEntries.length === 0) {
        $leftEntry.text("No best moments found. Add some!");
        $rightEntry.text("No worst moments found. Add some!");
        $leftLoading.fadeOut();
        $rightLoading.fadeOut();
        return;
    }
    
    setTimeout(() => {
        let randomIndex;
        
        if (pairedEntries.length === 1) {
            randomIndex = 0;
        } else {
            do {
                randomIndex = Math.floor(Math.random() * pairedEntries.length);
            } while (randomIndex === previousPairIndex && pairedEntries.length > 1);
        }
        
        previousPairIndex = randomIndex;
        
        const pair = pairedEntries[randomIndex];
        
        $leftEntry.text(pair.best.content);
        $leftContainer.attr('data-rating', pair.best.rating);
        $leftContainer.find('.location-field').text(pair.best.location || "UNKNOWN");
        $leftContainer.find('.date-field').text(pair.date || formatDate());
        $leftContainer.find('.time-field').text(pair.time || formatTime());
        $leftContainer.find('.rating-field').text(pair.best.rating);
        
        $rightEntry.text(pair.worst.content);
        $rightContainer.attr('data-rating', pair.worst.rating);
        $rightContainer.find('.location-field').text(pair.worst.location || "UNKNOWN");
        $rightContainer.find('.date-field').text(pair.date || formatDate());
        $rightContainer.find('.time-field').text(pair.time || formatTime());
        $rightContainer.find('.rating-field').text(pair.worst.rating);
        
        $leftLoading.fadeOut();
        $rightLoading.fadeOut();
    }, 500);
}

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
            
            pairedEntries = [];
            
            rows.forEach(row => {
                if (row && row.length >= 5) {
                    const dateTimeObj = parseSheetDate(row[0] || '');
                    const location = row.length >= 6 ? row[5] : "UNKNOWN";
                    
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
            
            previousPairIndex = -1;
            loadPairedEntry();
        })
        .catch(error => {
            console.error('Error fetching data from Google Sheets:', error);
            useMockData();
            previousPairIndex = -1;
            loadPairedEntry();
        });
}

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

function setupStickyHeader() {
    function updatePill() {
        const $activeItem = $('.nav-item.active');
        const position = $activeItem.position();
        const width = $activeItem.outerWidth();
        
        $('.pill').css({
            left: position.left,
            width: width
        });
    }
    
    updatePill();
    
    $('.nav-item').click(function() {
        const page = $(this).data('page');
        
        $('.nav-item').removeClass('active');
        $(this).addClass('active');
        
        updatePill();
        
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
    
    $('.action-button').click(function() {
        const action = $(this).data('action');
        
        switch(action) {
            case 'about':
                alert('It\'s Been A Day is a website that collects and displays the best and worst moments of people\'s days. Share your day via the submit button! :)');
                break;
            case 'submit':
                window.location.href = 'form.html';
                break;
        }
    });
}

function setupCursorMessage() {
    const cursorMessage = document.createElement('div');
    cursorMessage.classList.add('cursor-message');
    cursorMessage.textContent = 'click to advance';
    document.body.appendChild(cursorMessage);
    
    document.addEventListener('mousemove', (e) => {
        if (cursorMessage.classList.contains('visible')) {
            cursorMessage.style.left = `${e.clientX}px`;
            cursorMessage.style.top = `${e.clientY}px`;
        }
    });
    
    $('.entry-content').on('mouseenter', function() {
        cursorMessage.classList.add('visible');
    });
    
    $('.entry-content').on('mouseleave', function() {
        cursorMessage.classList.remove('visible');
    });
}

$(document).ready(function() {
    $('.date-field').text(formatDate());
    $('.time-field').text(formatTime());
    $('.location-field').text("UNKNOWN");
    $('.rating-field').text("3");
    
    setupStickyHeader();
    setupCursorMessage();
    loadDataFromGoogleSheets();
    
    $('.entry-content').click(function() {
        loadPairedEntry();
    });
});