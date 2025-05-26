/**
 * Convert MovieLens IDs to TMDB IDs using the dataset links
 * This is a temporary solution until the backend is updated to handle this conversion
 */

// Map of MovieLens ID to TMDB ID
const movieIdToTmdbId = {
  1: 862,        // Toy Story
  2: 8844,       // Jumanji
  3: 15602,      // Grumpier Old Men
  4: 31357,      // Waiting to Exhale
  5: 11862,      // Father of the Bride Part II
  6: 949,        // Heat
  7: 11860,      // Sabrina
  8: 45325,      // Tom and Huck
  9: 9091,       // Sudden Death
  10: 710,       // GoldenEye
  // Add more mappings as needed for your dataset
  // This is just a starting point and should be expanded
  // based on the movies in your recommendations
};

/**
 * Convert a MovieLens ID to TMDB ID
 * @param {number} movieLensId - MovieLens movie ID
 * @returns {number|null} - TMDB movie ID or null if not found
 */
function convertToTmdbId(movieLensId) {
  return movieIdToTmdbId[movieLensId] || null;
}
