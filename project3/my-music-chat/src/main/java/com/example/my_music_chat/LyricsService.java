package com.example.my_music_chat;

import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * LyricsService — talks to the LRCLIB API to search for song lyrics.
 *
 * LRCLIB is a free, open-source lyrics database.
 * It gives us lyrics WITH timestamps (so we know when each line is sung).
 * No API key needed!
 *
 * API: https://lrclib.net/docs
 *
 * HOW THE MATCHING WORKS:
 * 1. User types something like "dancing in the moonlight"
 * 2. We search LRCLIB for songs matching that text
 * 3. For each song, we look through the lyrics line by line
 * 4. We find the line that matches closest to what the user typed
 * 5. We return the song info + the matching lyric line + its timestamp
 */
@Service
public class LyricsService {

    // WebClient to talk to LRCLIB's API
    private final WebClient lrcClient = WebClient.builder()
            .baseUrl("https://lrclib.net/api")
            .defaultHeader("User-Agent", "MyMusicChat/1.0")
            .build();

    /**
     * Search for songs whose lyrics match the user's input.
     *
     * @param query What the user typed (e.g. "dancing in the moonlight")
     * @return A list of matching songs with the best-matching lyric line
     */
    public List<Map<String, Object>> searchByLyrics(String query) {
        // Step 1: Search LRCLIB for songs matching the query
        // The API returns a JSON array of songs
        List<Map> rawResults;
        try {
            rawResults = lrcClient.get()
                    .uri("/search?q=" + URLEncoder.encode(query, StandardCharsets.UTF_8))
                    .retrieve()
                    .bodyToFlux(Map.class)   // Each item in the array becomes a Map
                    .collectList()           // Collect them all into a List
                    .block();                // Wait for the response
        } catch (Exception e) {
            // If the API call fails, return an empty list
            return new ArrayList<>();
        }

        if (rawResults == null || rawResults.isEmpty()) {
            return new ArrayList<>();
        }

        // Step 2: Process each result — find the best matching lyric line
        List<Map<String, Object>> results = new ArrayList<>();

        // Only process the first 10 results to keep it fast
        int limit = Math.min(rawResults.size(), 10);

        for (int i = 0; i < limit; i++) {
            Map raw = rawResults.get(i);

            // Get the synced lyrics (with timestamps) or plain lyrics
            String syncedLyrics = (String) raw.get("syncedLyrics");
            String plainLyrics = (String) raw.get("plainLyrics");

            // Find the line that best matches the user's query
            Map<String, String> matchResult = findBestMatch(query, syncedLyrics, plainLyrics);

            if (matchResult != null) {
                Map<String, Object> song = new HashMap<>();
                song.put("trackName", raw.get("trackName"));
                song.put("artistName", raw.get("artistName"));
                song.put("albumName", raw.get("albumName"));
                song.put("duration", raw.get("duration"));
                song.put("matchingLine", matchResult.get("line"));
                song.put("timestamp", matchResult.get("timestamp"));
                song.put("matchScore", matchResult.get("score"));
                results.add(song);
            }
        }

        return results;
    }

    /**
     * Find the lyric line that best matches the user's query.
     *
     * We check every line in the song and calculate how many words
     * from the user's query appear in that line. The line with the
     * most matching words wins.
     *
     * @param query        What the user typed
     * @param syncedLyrics Lyrics with timestamps like "[00:27.93] Listen to the wind"
     * @param plainLyrics  Lyrics without timestamps
     * @return A map with "line" (the matching text), "timestamp", and "score"
     */
    private Map<String, String> findBestMatch(String query, String syncedLyrics, String plainLyrics) {
        String lyrics = syncedLyrics != null ? syncedLyrics : plainLyrics;
        if (lyrics == null || lyrics.isEmpty()) {
            return null;
        }

        // Split lyrics into individual lines
        String[] lines = lyrics.split("\n");
        String queryLower = query.toLowerCase();
        String[] queryWords = queryLower.split("\\s+"); // Split by spaces

        String bestLine = null;
        String bestTimestamp = "";
        int bestScore = 0;

        for (String line : lines) {
            String timestamp = "";
            String text = line;

            // If synced lyrics, extract the timestamp [MM:SS.xx]
            if (line.matches("^\\[\\d{2}:\\d{2}\\.\\d{2,3}\\].*")) {
                int closeBracket = line.indexOf(']');
                timestamp = line.substring(1, closeBracket); // e.g. "00:27.93"
                text = line.substring(closeBracket + 1).trim();
            }

            if (text.isEmpty()) {
                continue;
            }

            // Count how many of the user's words appear in this line
            String textLower = text.toLowerCase();
            int score = 0;
            for (String word : queryWords) {
                if (word.length() > 1 && textLower.contains(word)) {
                    score++;
                }
            }

            // Keep track of the best match
            if (score > bestScore) {
                bestScore = score;
                bestLine = text;
                bestTimestamp = timestamp;
            }
        }

        if (bestLine == null || bestScore == 0) {
            return null;
        }

        Map<String, String> result = new HashMap<>();
        result.put("line", bestLine);
        result.put("timestamp", bestTimestamp);
        result.put("score", String.valueOf(bestScore));
        return result;
    }
}