package com.example.my_music_chat;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;

import java.util.List;
import java.util.Map;

/**
 * SearchController — handles web requests for our lyrics search app.
 *
 * NO LOGIN NEEDED! Users just type text and get matching songs.
 *
 * Routes:
 *   GET "/"         → shows the search page
 *   GET "/search"   → performs the search and shows results
 */
@Controller
public class SearchController {

    private final LyricsService lyricsService;
    private final SpotifyService spotifyService;

    public SearchController(LyricsService lyricsService, SpotifyService spotifyService) {
        this.lyricsService = lyricsService;
        this.spotifyService = spotifyService;
    }

    /**
     * HOME PAGE — shows the search bar
     */
    @GetMapping("/")
    public String home() {
        return "index";
    }

    /**
     * SEARCH — user typed something, let's find matching songs!
     *
     * @RequestParam("q") means: grab the value from the URL like /search?q=hello
     *
     * Flow:
     * 1. Search LRCLIB for songs with matching lyrics
     * 2. For each result, ask Spotify for album art
     * 3. Pass everything to the HTML template to display
     */
    @GetMapping("/search")
    public String search(@RequestParam("q") String query, Model model) {

        // Step 1: Search LRCLIB for matching lyrics
        List<Map<String, Object>> results = lyricsService.searchByLyrics(query);

        // Step 2: For each result, try to get album art from Spotify
        for (Map<String, Object> song : results) {
            String trackName = (String) song.get("trackName");
            String artistName = (String) song.get("artistName");

            Map<String, Object> spotifyData = spotifyService.searchTrack(trackName, artistName);

            if (spotifyData != null) {
                song.put("albumArt", spotifyData.get("albumArt"));
                song.put("previewUrl", spotifyData.get("previewUrl"));
                song.put("spotifyUrl", spotifyData.get("spotifyUrl"));
            }
        }

        // Step 3: Pass data to the template
        model.addAttribute("query", query);
        model.addAttribute("results", results);

        return "results";
    }
}