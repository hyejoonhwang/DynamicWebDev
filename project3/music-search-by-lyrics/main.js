/*
 * =============================================
 * MY MUSIC CHAT — main.js
 * =============================================
 *
 * This file has 6 sections:
 *   1. window.onload (wait for the page to load)
 *   2. Element references (grabbing HTML elements)
 *   3. Event listeners (what happens when you click/type)
 *   4. API functions (talking to LRCLIB and iTunes)
 *   5. Lyric matching (finding the best matching line)
 *   6. Display function (showing results on the page)
 *
 * APIs used (both free, no API key needed!):
 *   - LRCLIB: https://lrclib.net/docs
 *   - iTunes Search API: https://developer.apple.com/library/archive/documentation/AudioVideo/Conceptual/iTuneSearchAPI/
 * =============================================
 */


/* =============================================
   1. WINDOW.ONLOAD
   We wait for the entire page to load before running any code.
   This makes sure all HTML elements exist before we try to grab them.
   Docs: https://developer.mozilla.org/en-US/docs/Web/API/Window/load_event
   ============================================= */

window.onload = function () {
    console.log("page is fully loaded");
    init();
};


/* =============================================
   2 & 3. ELEMENT REFERENCES + EVENT LISTENERS
   document.getElementById() finds an HTML element by its "id" attribute.
   Docs: https://developer.mozilla.org/en-US/docs/Web/API/Document/getElementById

   addEventListener() "listens" for user actions and runs a function when they happen.
   Docs: https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener
   ============================================= */

function init() {
    // Grab our HTML elements and save them in variables
    var searchInput = document.getElementById("searchInput");
    var searchBtn = document.getElementById("searchBtn");
    var resultsDiv = document.getElementById("results");

    // Run search when clicking the Search button
    searchBtn.addEventListener("click", function () {
        performSearch(searchInput, searchBtn, resultsDiv);
    });

    // Run search when pressing Enter in the input box
    searchInput.addEventListener("keydown", function (event) {
        // event.key tells us which key was pressed
        if (event.key === "Enter") {
            performSearch(searchInput, searchBtn, resultsDiv);
        }
    });
}


/* =============================================
   4. MAIN SEARCH FUNCTION

   "async" means this function can use "await" inside it.
   "await" pauses the function until a slow operation (like an API call) finishes.
   Docs: https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Asynchronous/Promises
   ============================================= */

async function performSearch(searchInput, searchBtn, resultsDiv) {
    // .trim() removes extra spaces from the start and end
    var query = searchInput.value.trim();

    // Don't search if the input is empty
    if (!query) return;

    // Disable button and show loading text while we wait
    searchBtn.disabled = true;
    resultsDiv.innerHTML =
        '<div class="loading">' +
            '<p>Searching lyrics...</p>' +
        '</div>';

    try {
        // Step 1: Search LRCLIB for songs with matching lyrics
        var lrcResults = await searchLRCLIB(query);

        if (lrcResults.length === 0) {
            resultsDiv.innerHTML =
                '<div class="no-results">' +
                    '<div class="emoji">🔇</div>' +
                    '<p>No songs found. Try different words!</p>' +
                '</div>';
            searchBtn.disabled = false;
            return;
        }

        // Step 2: Find the best matching lyric line in each song
        var songsWithMatches = [];
        for (var i = 0; i < lrcResults.length && songsWithMatches.length < 10; i++) {
            var song = lrcResults[i];
            var match = findBestMatch(query, song.syncedLyrics, song.plainLyrics);
            if (match) {
                songsWithMatches.push({
                    trackName: song.trackName,
                    artistName: song.artistName,
                    albumName: song.albumName,
                    matchingLine: match.line,
                    timestamp: match.timestamp
                });
            }
        }

        // Step 3: Get album art from iTunes for each song
        // We use a regular for loop to go through each song one by one
        var enrichedSongs = [];
        for (var i = 0; i < songsWithMatches.length; i++) {
            var currentSong = songsWithMatches[i];
            var itunesData = await searchiTunes(currentSong.trackName, currentSong.artistName);

            // Build a new object that combines song info + iTunes info
            enrichedSongs.push({
                trackName: currentSong.trackName,
                artistName: currentSong.artistName,
                albumName: currentSong.albumName,
                matchingLine: currentSong.matchingLine,
                timestamp: currentSong.timestamp,
                albumArt: itunesData.albumArt,
                previewUrl: itunesData.previewUrl,
                itunesUrl: itunesData.itunesUrl
            });
        }

        // Step 4: Display results on the page
        displayResults(query, enrichedSongs, resultsDiv);

    } catch (error) {
        // If something goes wrong, show a friendly error
        // console.error() prints to the browser dev console (press F12 to see it)
        console.error("Search error:", error);
        resultsDiv.innerHTML =
            '<div class="no-results">' +
                '<div class="emoji">⚠️</div>' +
                '<p>Something went wrong. Please try again!</p>' +
            '</div>';
    }

    searchBtn.disabled = false;
}


/* =============================================
   5. API FUNCTIONS
   ============================================= */

/**
 * Search LRCLIB for songs matching the user's text.
 *
 * fetch() makes an HTTP request — like visiting a URL in code.
 * Docs: https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API
 * LRCLIB docs: https://lrclib.net/docs
 */
async function searchLRCLIB(query) {
    // encodeURIComponent() makes text safe to put in a URL
    // e.g. spaces become %20
    var url = "https://lrclib.net/api/search?q=" + encodeURIComponent(query);

    var response = await fetch(url, {
        headers: {
            "User-Agent": "MyMusicChat/1.0"
        }
    });

    // If the request failed, return an empty array
    if (!response.ok) return [];

    // .json() converts the response text into a JavaScript object/array
    var jsonData = await response.json();
    return jsonData;
}


/**
 * Search iTunes for album art and a 30-second audio preview.
 * Completely free, no API key needed!
 *
 * iTunes API docs:
 * https://developer.apple.com/library/archive/documentation/AudioVideo/Conceptual/iTuneSearchAPI/
 */
async function searchiTunes(trackName, artistName) {
    try {
        var searchTerm = encodeURIComponent(trackName + " " + artistName);
        var url = "https://itunes.apple.com/search?term=" + searchTerm + "&media=music&limit=1";

        var response = await fetch(url);
        var data = await response.json();

        if (data.results && data.results.length > 0) {
            var track = data.results[0];
            return {
                albumArt: track.artworkUrl100
                    ? track.artworkUrl100.replace("100x100", "300x300")
                    : null,
                previewUrl: track.previewUrl || null,
                itunesUrl: track.trackViewUrl || null
            };
        }
    } catch (e) {
        console.warn("iTunes lookup failed for:", trackName);
    }

    return { albumArt: null, previewUrl: null, itunesUrl: null };
}


/* =============================================
   6. LYRIC MATCHING
   ============================================= */

/**
 * Find the lyric line that best matches the user's text.
 *
 * How it works:
 *   1. Split the user's input into individual words
 *   2. Go through every line of the song's lyrics
 *   3. Count how many of the user's words appear in each line
 *   4. The line with the most matching words wins!
 */
function findBestMatch(query, syncedLyrics, plainLyrics) {
    // Use synced lyrics first (they have timestamps), fall back to plain
    var lyrics = syncedLyrics || plainLyrics;
    if (!lyrics) return null;

    // Split the lyrics into individual lines
    var lines = lyrics.split("\n");

    // Split the user's query into words, then remove short words like "I", "a"
    // .filter() keeps only items where the function returns true
    // Docs: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/filter
    var allWords = query.toLowerCase().split(" ");
    var queryWords = [];
    for (var i = 0; i < allWords.length; i++) {
        if (allWords[i].length > 1) {
            queryWords.push(allWords[i]);
        }
    }

    var bestLine = null;
    var bestTimestamp = "";
    var bestScore = 0;

    for (var i = 0; i < lines.length; i++) {
        var timestamp = "";
        var text = lines[i];

        // Check if line has a timestamp like [00:27.93]
        // .match() checks if text matches a pattern (called a "regex")
        // Docs: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/match
        var timeMatch = lines[i].match(/^\[(\d{2}:\d{2}\.\d{2,3})\](.*)/);
        if (timeMatch) {
            timestamp = timeMatch[1];
            text = timeMatch[2].trim();
        }

        // Skip empty lines
        if (!text) continue;

        // Count how many of the user's words appear in this lyric line
        var textLower = text.toLowerCase();
        var score = 0;

        for (var j = 0; j < queryWords.length; j++) {
            // .includes() checks if a string contains another string
            // Docs: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/includes
            if (textLower.includes(queryWords[j])) {
                score = score + 1;
            }
        }

        // Keep track of the best match so far
        if (score > bestScore) {
            bestScore = score;
            bestLine = text;
            bestTimestamp = timestamp;
        }
    }

    if (!bestLine || bestScore === 0) return null;

    return { line: bestLine, timestamp: bestTimestamp };
}


/* =============================================
   7. DISPLAY FUNCTION
   ============================================= */

/**
 * Build the HTML for search results and put it on the page.
 *
 * We build the HTML as a string and then set innerHTML to display it.
 * Docs: https://developer.mozilla.org/en-US/docs/Web/API/Element/innerHTML
 */
function displayResults(query, songs, resultsDiv) {
    if (songs.length === 0) {
        resultsDiv.innerHTML =
            '<div class="no-results">' +
                '<div class="emoji">🔇</div>' +
                '<p>No matching lyrics found. Try different words!</p>' +
            '</div>';
        return;
    }

    // Start building the HTML string
    var html =
        '<div class="results-header">' +
            '<h2>Results for "<span>' + escapeHTML(query) + '</span>"</h2>' +
        '</div>';

    // Loop through each song and build a card for it
    for (var i = 0; i < songs.length; i++) {
        var song = songs[i];

        // Album art (or a placeholder emoji if none available)
        var artHTML;
        if (song.albumArt) {
            artHTML = '<img class="album-art" src="' + song.albumArt + '" alt="Album art" />';
        } else {
            artHTML = '<div class="no-art">🎵</div>';
        }

        // Timestamp badge (only if we have one)
        var timeHTML = "";
        if (song.timestamp) {
            timeHTML = '<span class="timestamp">[' + song.timestamp + '] </span>';
        }

        // Links row: Apple Music link + audio preview player
        var linksHTML = "";
        if (song.itunesUrl || song.previewUrl) {
            linksHTML = '<div class="links-row">';
            if (song.itunesUrl) {
                linksHTML = linksHTML + '<a class="music-link" href="' + song.itunesUrl + '" target="_blank">Open in Apple Music ↗</a>';
            }
            if (song.previewUrl) {
                linksHTML = linksHTML + '<audio class="preview-player" controls preload="none" src="' + song.previewUrl + '"></audio>';
            }
            linksHTML = linksHTML + '</div>';
        }

        // Build the card HTML
        html = html +
            '<div class="song-card">' +
                artHTML +
                '<div class="song-info">' +
                    '<div class="track-name">' + escapeHTML(song.trackName) + '</div>' +
                    '<div class="artist-name">' + escapeHTML(song.artistName) + '</div>' +
                    '<div class="matching-lyric">' +
                        timeHTML +
                        '<span>' + escapeHTML(song.matchingLine) + '</span>' +
                    '</div>' +
                    linksHTML +
                '</div>' +
            '</div>';
    }

    // Put the finished HTML into the results container
    resultsDiv.innerHTML = html;
}


/**
 * Escape HTML special characters to prevent XSS attacks.
 *
 * If a song title contained <script>alert("hacked")</script>,
 * and we put it directly into innerHTML, the browser would run that code!
 * This function makes it safe by converting < to &lt; etc.
 *
 * Docs: https://developer.mozilla.org/en-US/docs/Web/API/Node/textContent
 */
function escapeHTML(text) {
    if (!text) return "";
    var div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}