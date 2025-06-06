// cache.js
// This cache module is designed to support the data operations
// defined in the provided blog controller.js file.

const NodeCache = require("node-cache");

// Create a new cache instance.
// stdTTL: (standard TTL) The default time to live for cached items in seconds.
// checkperiod: The interval in seconds to check for expired keys.
// Use a reasonable default TTL, e.g., 5 minutes (300 seconds)
const myCache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

// Define cache keys as constants or functions for better maintainability
// These keys are specific to the data fetched/modified by the provided controller.js
const CACHE_KEYS = {
  // Dashboard data key (can be made dynamic based on date range or user if personalized dashboard)
  // Assuming dashboard data might be added later
  DASHBOARD_DATA: (userId = "global", startDate = "all", endDate = "all") =>
    `dashboard_data:${userId}:${startDate}:${endDate}`,

  // Admin users list key based on query parameters (search, pagination)
  // Assuming a getUsers function for admin might be added later
  ADMIN_USERS_LIST: (search = "all", page = 1, limit = 10) =>
    `admin_users_list:${search}:${page}:${limit}`,

  // --- NEW CACHE KEY FOR ALL BLOG POSTS ---
  ALL_BLOG_POSTS: () => "all_blog_posts",

  // Blog post list keys (examples - adjust based on your blog's filtering/sorting)
  // The BLOG_POSTS_LIST key is now less relevant if frontend handles filtering/sorting/pagination
  // but kept for potential other uses or if the backend still provides paginated lists elsewhere.
  BLOG_POSTS_LIST: (filter = "all", sort = "date", page = 1, limit = 10) =>
    `blog_posts_list:${filter}:${sort}:${page}:${limit}`,
  BLOG_POST_DETAIL: (postId) => `blog_post_detail:${postId}`,

  // --- NEW CACHE KEY FOR COMMENTS ---
  POST_COMMENTS: (postId) => `post_comments:${postId}`,

  // Add other cache keys only if new data types/endpoints are added to the controller
  // e.g., COMMENTS_LIST: (postId) => `comments_list:${postId}`,
};

/**
 * Get data from the cache.
 * @param {string} key - The cache key.
 * @returns {any | undefined} The cached data, or undefined if not found.
 */
const get = (key) => {
  // console.log(`Attempting to get cache key: ${key}`); // Optional: Log cache access
  const value = myCache.get(key);
  // if (value !== undefined) {
  //   console.log(`Cache hit for key: ${key}`); // Optional: Log cache hit
  // } else {
  //   console.log(`Cache miss for key: ${key}`); // Optional: Log cache miss
  // }
  return value;
};

/**
 * Set data in the cache.
 * @param {string} key - The cache key.
 * @param {any} value - The data to cache.
 * @param {number} [ttl=null] - Optional time to live in seconds. If null, uses the default stdTTL.
 * @returns {boolean} True if the operation was successful.
 */
const set = (key, value, ttl = null) => {
  // console.log(`Setting cache key: ${key} with TTL: ${ttl || myCache.options.stdTTL}`); // Optional: Log cache set
  if (ttl) {
    return myCache.set(key, value, ttl);
  } else {
    return myCache.set(key, value);
  }
};

/**
 * Delete data from the cache.
 * @param {string} key - The cache key.
 * @returns {number} The number of keys deleted (0 or 1 in this case).
 */
const del = (key) => {
  // console.log(`Deleting cache key: ${key}`); // Optional: Log cache deletion
  return myCache.del(key);
};

/**
 * Delete multiple keys from the cache.
 * @param {string[]} keys - An array of cache keys to delete.
 * @returns {number} The number of keys deleted.
 */
const delMany = (keys) => {
  // console.log(`Deleting multiple cache keys: ${keys.join(", ")}`); // Optional: Log cache deletion
  return myCache.del(keys);
};

/**
 * Invalidate all user-related caches.
 * Called when user data (name, role, password) is created, updated, or deleted.
 * Also invalidates dashboard data as user changes might affect totals/stats.
 */
const invalidateAllUserCaches = () => {
  const userKeys = myCache.keys().filter(
    (key) => key.startsWith("admin_users_list:") // Invalidate admin user lists
  );
  if (userKeys.length > 0) {
    delMany(userKeys);
  }
  // Invalidate dashboard data as user changes might affect totals/stats
  const dashboardKeys = myCache
    .keys()
    .filter((key) => key.startsWith("dashboard_data:"));
  if (dashboardKeys.length > 0) {
    delMany(dashboardKeys);
  }
};

/**
 * Invalidate all blog post related caches.
 * Called when blog posts are created, updated, or deleted.
 * Also invalidates dashboard data if it includes post counts/stats.
 * NOTE: With frontend filtering/sorting, the primary cache to invalidate
 * is the 'ALL_BLOG_POSTS' cache.
 * Also invalidates comments cache for the specific post if provided.
 * @param {string} [postId] - Optional post ID to invalidate specific comment cache.
 */
/**
 * Invalidate all blog post related caches.
 * Called when blog posts are created, updated, or deleted.
 * Also invalidates dashboard data if it includes post counts/stats.
 * NOTE: With frontend filtering/sorting, the primary cache to invalidate
 * is the 'ALL_BLOG_POSTS' cache.
 * Also invalidates comments cache for the specific post if provided.
 * @param {string} [postId] - Optional post ID to invalidate specific comment cache.
 */
const invalidateAllBlogCaches = (postId) => {
  // Invalidate the main cache for all posts
  del(CACHE_KEYS.ALL_BLOG_POSTS());

  // Invalidate individual post detail caches (optional, but good practice)
  // This might require a more complex approach if you have many post detail caches
  // or if you don't want to fetch all post IDs just to invalidate.
  // For simplicity, we'll just invalidate the main 'all posts' cache and rely
  // on fetching fresh data for individual posts when needed.
  // If a specific post is updated/deleted, invalidating its detail cache is good.
  if (postId) {
    del(CACHE_KEYS.BLOG_POST_DETAIL(postId));
    // Also invalidate comments cache for this specific post
    del(CACHE_KEYS.POST_COMMENTS(postId));
  }

  // Invalidate dashboard data if it includes post counts/stats
  const dashboardKeys = myCache
    .keys()
    .filter((key) => key.startsWith("dashboard_data:"));
  if (dashboardKeys.length > 0) {
    delMany(dashboardKeys);
  }
};

// Export the cache functions and keys for use in the controller
module.exports = {
  get,
  set,
  del,
  delMany,
  invalidateAllUserCaches,
  invalidateAllBlogCaches, // Export the new blog invalidation
  CACHE_KEYS,
};
