package com.example.my_music_chat;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.http.MediaType;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Map;

/**
 * SpotifyService — talks to the Spotify API to get album art and song info.
 *
 * We use the "Client Credentials" flow here. This means:
 *   - NO user login needed
 *   - We just use our Client ID + Secret to get a token
 *   - We can only access PUBLIC data (song info, album art, previews)
 *   - We CANNOT access personal data (playlists, top tracks, etc.)
 *
 * Docs: https://developer.spotify.com/documentation/web-api/tutorials/client-credentials-flow
 */
@Service
public class SpotifyService {

    @Value("${spotify.client-id}")
    private String clientId;

    @Value("${spotify.client-secret}")
    private String clientSecret;

    private final WebClient authClient = WebClient.builder()
            .baseUrl("https://accounts.spotify.com")
            .build();

    private final WebClient apiClient = WebClient.builder()
            .baseUrl("https://api.spotify.com/v1")
            .build();

    // We cache the token so we don't request a new one every time
    private String cachedToken = null;
    private long tokenExpiresAt = 0;

    /**
     * Get an access token using Client Credentials flow.
     * No user login needed — just our app's ID and secret.
     *
     * Docs: https://developer.spotify.com/documentation/web-api/tutorials/client-credentials-flow
     */
    private String getToken() {
        // If we have a valid cached token, reuse it
        if (cachedToken != null && System.currentTimeMillis() < tokenExpiresAt) {
            return cachedToken;
        }

        String credentials = clientId + ":" + clientSecret;
        String encoded = Base64.getEncoder().encodeToString(credentials.getBytes());

        Map response = authClient.post()
                .uri("/api/token")
                .header("Authorization", "Basic " + encoded)
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .bodyValue("grant_type=client_credentials")
                .retrieve()
                .bodyToMono(Map.class)
                .block();

        cachedToken = (String) response.get("access_token");
        int expiresIn = (int) response.get("expires_in");
        // Set expiry 60 seconds early to be safe
        tokenExpiresAt = System.currentTimeMillis() + (expiresIn - 60) * 1000L;

        return cachedToken;
    }

    /**
     * Search Spotify for a track by name and artist.
     * Returns album art URL and preview URL if available.
     *
     * Docs: https://developer.spotify.com/documentation/web-api/reference/search
     *
     * @param trackName  Song title
     * @param artistName Artist name
     * @return Map with "albumArt" and "previewUrl" keys, or null if not found
     */
    public Map<String, Object> searchTrack(String trackName, String artistName) {
        try {
            String token = getToken();
            String query = URLEncoder.encode(trackName + " " + artistName, StandardCharsets.UTF_8);

            Map response = apiClient.get()
                    .uri("/search?q=" + query + "&type=track&limit=1")
                    .header("Authorization", "Bearer " + token)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();

            // Navigate the JSON to get the first track
            Map tracks = (Map) response.get("tracks");
            java.util.List items = (java.util.List) tracks.get("items");

            if (items == null || items.isEmpty()) {
                return null;
            }

            Map track = (Map) items.get(0);
            Map album = (Map) track.get("album");
            java.util.List images = (java.util.List) album.get("images");

            // Build a clean result
            java.util.Map<String, Object> result = new java.util.HashMap<>();
            result.put("spotifyTrackName", track.get("name"));
            result.put("previewUrl", track.get("preview_url")); // 30-second audio clip
            result.put("spotifyUrl", ((Map) track.get("external_urls")).get("spotify"));

            if (images != null && !images.isEmpty()) {
                result.put("albumArt", ((Map) images.get(0)).get("url"));
            }

            return result;
        } catch (Exception e) {
            // If Spotify search fails, just return null — the app still works
            return null;
        }
    }
}