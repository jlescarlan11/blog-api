// query.js
// Load the Prisma client
const { PrismaClient } = require("../generated/prisma");
const prisma = new PrismaClient();

// The query object with user, post, and comment operations
module.exports = {
  user: {
    create: async (firstName, lastName, email, password, admin) => {
      return await prisma.user.create({
        data: {
          firstName,
          lastName,
          email,
          password,
          role: admin ? "ADMIN" : "USER",
        },
      });
    },
    getByEmail: async (email) => {
      return await prisma.user.findUnique({ where: { email } });
    },
    getById: async (id) => {
      return await prisma.user.findUnique({ where: { id } });
    },
    // New Prisma query to update user's first and last name
    updateName: async (id, firstName, lastName) => {
      return await prisma.user.update({
        where: { id },
        data: { firstName, lastName },
      });
    },
    // New Prisma query to update user's password
    updatePassword: async (id, password) => {
      return await prisma.user.update({
        where: { id },
        data: { password },
      });
    },
    // Placeholder for deleteUser - Uncomment and implement if needed
    // deleteUser: async (userId) => {
    //   return await prisma.user.delete({ where: { id: userId } });
    // },
    // Placeholder for getPaginated - Uncomment and implement if needed
    // getPaginated: async (search, page, limit) => {
    //   // Implement pagination logic here
    //   return { users: [], totalUsers: 0 }; // Placeholder return
    // },
  },
  post: {
    create: async (title, content, published, authorId, tags = []) => {
      // Add tags parameter with default empty array
      return await prisma.post.create({
        data: {
          title: title,
          content: content,
          published: published,
          author: {
            connect: { id: authorId },
          },
          tags: tags, // Add tags to the data
        },
      });
    },
    // --- NEW FUNCTION TO GET ALL POSTS ---
    getAll: async () => {
      // Fetch all posts, including author information
      return await prisma.post.findMany({
        include: { author: true },
        orderBy: { createdAt: "desc" }, // Default order, can be overridden client-side
      });
    },
    getAllPost: async () => {
      return await prisma.post.findMany({
        include: {
          author: true,
          comments: {
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        where: { published: true },
      });
    },
    // --- END OF NEW FUNCTION ---
    getPaginated: async (skip, take, search, filter, sort) => {
      // Build dynamic where clause based on search and filter
      const where = {};
      if (search) {
        where.OR = [
          { title: { contains: search, mode: "insensitive" } },
          { content: { contains: search, mode: "insensitive" } },
          // Add other searchable fields if needed
        ];
      }
      // Apply filter based on status
      if (filter && filter !== "all") {
        where.published = filter === "published"; // true for published, false for unpublished
      }
      // Build dynamic orderBy clause based on sort
      const orderBy = {};
      if (sort) {
        const [field, direction] = sort.split(":"); // e.e.g., "createdAt:desc"
        // Ensure valid fields and directions are used
        const validSortFields = ["createdAt", "title", "author"]; // Add other sortable fields if needed
        const validSortDirections = ["asc", "desc"];
        if (
          validSortFields.includes(field) &&
          validSortDirections.includes(direction)
        ) {
          if (field === "author") {
            // Sorting by author's firstName as a proxy for author sorting
            orderBy.author = { firstName: direction };
          } else {
            // Standard sorting for direct fields
            orderBy[field] = direction;
          }
        } else {
          // Fallback or error handling for invalid sort parameters
          console.warn(
            `Invalid sort parameters: ${sort}. Falling back to default sort.`
          );
          // Optionally, set a default sort here if the provided one is invalid
          orderBy.createdAt = "desc"; // Default sort
        }
      } else {
        // Default sort if no sort parameter is provided
        orderBy.createdAt = "desc";
      }
      const posts = await prisma.post.findMany({
        skip: skip, // Number of records to skip
        take: take, // Number of records to take (limit)
        where: where, // Apply dynamic filters/search
        orderBy: orderBy, // Apply dynamic sorting
        include: { author: true }, // Include author information
      });
      const totalPosts = await prisma.post.count({
        where: where, // Count records matching the same filter/search criteria
      });
      return { posts, totalPosts }; // Return both the data and the total count
    },
    // Add other post queries like getById, update, delete
    getById: async (postId) => {
      return await prisma.post.findUnique({
        where: { id: postId }, // Ensure ID is an integer if needed
        include: {
          author: true, // Include the post author
          comments: {
            // Include comments
            include: {
              // *** ADD THIS INCLUDE TO GET COMMENT AUTHOR DETAILS ***
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  // Removed createdAt and updatedAt as they are not needed for comment author display
                },
              },
            },
            orderBy: { createdAt: "asc" }, // Order comments chronologically
          },
          // --- INCLUDE NEW FIELDS HERE ---
          // When using 'include' at the top level, scalar fields (id, title, content, etc.)
          // are automatically included. We only need to include relations here.
          // The new scalar fields (tags, views, likes) will be included by default.
          // --- END INCLUDE NEW FIELDS ---
        },
        // --- REMOVED SELECT BLOCK ---
        // The select block is removed as it conflicts with the include block.
        // All scalar fields and the included relations will be returned.
        // --- END REMOVED SELECT BLOCK ---
      });
    },
    // Updated update function to handle partial updates including tags
    update: async (postId, data) => {
      // Validate data object to ensure it's not empty before attempting update
      if (Object.keys(data).length === 0) {
        console.warn(`Update called for post ${postId} with empty data.`);
        return null; // Or throw an error depending on desired behavior
      }
      // Ensure 'tags' is handled correctly if present in data
      if (data.tags !== undefined && !Array.isArray(data.tags)) {
        // Optionally handle invalid tags input, e.g., log a warning or throw an error
        console.warn(
          `Invalid tags format for post ${postId}. Expected array, got ${typeof data.tags}.`
        );
        // Decide how to proceed: ignore invalid tags, throw error, etc.
        // For now, we'll assume the controller sends an array or undefined.
        // If tags is present but invalid, we might want to remove it from data
        // or throw an error before the Prisma update call.
        // For now, assuming controller validates or sends correct format.
      }
      try {
        return await prisma.post.update({
          where: { id: postId },
          data: data, // Data object should now include any fields provided (title, content, published, tags)
        });
      } catch (error) {
        // Log and re-throw Prisma errors
        console.error(`Prisma error updating post ${postId}:`, error);
        throw error; // Re-throw to be caught by the controller
      }
    },
    delete: async (postId) => {
      try {
        return await prisma.post.delete({
          where: { id: postId },
        });
      } catch (error) {
        // Log and re-throw Prisma errors
        console.error(`Prisma error deleting post ${postId}:`, error);
        throw error; // Re-throw to be caught by the controller
      }
    },
    /************* ✨ Windsurf Command ⭐  *************/
    /**
     * Delete all blog posts in the database. This function is
     * intended to be used for development or testing purposes.
     * It is not intended to be used in a production environment.
     * @returns {Promise} The number of records deleted.
     */
    /******* 6619c471-adf4-4f9f-accd-f1731fd6b17d  *******/
    // Updated deleteAll to accept an optional filter for bulk delete
    deleteMany: async (filter = {}) => {
      try {
        return await prisma.post.deleteMany({
          where: filter, // Apply the filter if provided
        });
      } catch (error) {
        console.error("Prisma error during deleteMany:", error);
        throw error;
      }
    },

    /**
     * Increments the view count for a specific post.
     * @param {string} postId - The ID of the post.
     * @returns {Promise} The updated post object.
     */
    incrementViews: async (postId) => {
      try {
        return await prisma.post.update({
          where: { id: postId },
          data: {
            views: {
              // This 'views' field must match the one in schema.prisma
              increment: 1,
            },
          },
        });
      } catch (error) {
        console.error(
          `Prisma error incrementing views for post ${postId}:`,
          error
        );
        throw error;
      }
    },

    /**
     * Toggles the like status for a post by a user.
     * If the user has liked the post, it unlikes it (decrements count).
     * If the user has not liked the post, it likes it (increments count).
     * @param {string} postId - The ID of the post.
     * @param {string} userId - The ID of the user.
     * @returns {Promise<{ post: Post, liked: boolean }>} The updated post object and a boolean indicating if the post is now liked.
     */
    toggleLike: async (postId, userId) => {
      try {
        const existingLike = await prisma.userLikePost.findUnique({
          where: {
            userId_postId: {
              // This is the unique constraint composite key
              userId: userId,
              postId: postId,
            },
          },
        });

        let updatedPost;
        let liked;

        if (existingLike) {
          // User has already liked, so unlike it
          await prisma.userLikePost.delete({
            where: { id: existingLike.id },
          });
          updatedPost = await prisma.post.update({
            where: { id: postId },
            data: {
              likes: {
                decrement: 1, // Decrement the like count
              },
            },
          });
          liked = false; // Post is now unliked
        } else {
          // User has not liked, so like it
          await prisma.userLikePost.create({
            data: {
              userId: userId,
              postId: postId,
            },
          });
          updatedPost = await prisma.post.update({
            where: { id: postId },
            data: {
              likes: {
                increment: 1, // Increment the like count
              },
            },
          });
          liked = true; // Post is now liked
        }

        return { post: updatedPost, liked: liked };
      } catch (error) {
        console.error(
          `Prisma error toggling like for post ${postId} by user ${userId}:`,
          error
        );
        throw error;
      }
    },

    // --- MOVED hasUserLikedPost INSIDE post OBJECT ---
    /**
     * Checks if a specific user has liked a specific post.
     * @param {string} userId - The ID of the user.
     * @param {string} postId - The ID of the post.
     * @returns {Promise<boolean>} True if the user has liked the post, false otherwise.
     */
    hasUserLikedPost: async (userId, postId) => {
      try {
        const likeRecord = await prisma.userLikePost.findUnique({
          where: {
            userId_postId: {
              userId: userId,
              postId: postId,
            },
          },
        });
        return !!likeRecord; // Return true if a record exists, false otherwise
      } catch (error) {
        console.error(
          `Prisma error checking like status for post ${postId} by user ${userId}:`,
          error
        );
        throw error;
      }
    },
    // --- END MOVED FUNCTION ---
  },
  // --- NEW COMMENT QUERIES ---
  comment: {
    /**
     * Get all comments for a specific post, ordered by creation date.
     * Includes author information.
     * @param {string} postId - The ID of the post.
     * @returns {Promise} An array of comments.
     */
    getByPostId: async (postId) => {
      try {
        return await prisma.comment.findMany({
          where: { postId: postId },
          include: {
            user: {
              // Include the user who authored the comment
              select: {
                // Select only necessary user fields
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
          orderBy: { createdAt: "asc" }, // Order comments chronologically
        });
      } catch (error) {
        console.error(
          `Prisma error fetching comments for post ${postId}:`,
          error
        );
        throw error;
      }
    },
    /**
     * Create a new comment for a post.
     * @param {string} postId - The ID of the post the comment belongs to.
     * @param {string} userId - The ID of the user creating the comment.
     * @param {string} content - The content of the comment.
     * @returns {Promise} The newly created comment.
     */
    create: async (postId, userId, content) => {
      try {
        return await prisma.comment.create({
          data: {
            content: content,
            post: { connect: { id: postId } },
            user: { connect: { id: userId } },
          },
          include: {
            // Include author info in the response
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        });
      } catch (error) {
        console.error(
          `Prisma error creating comment for post ${postId} by user ${userId}:`,
          error
        );
        throw error;
      }
    },

    update: async (commentId, content) => {
      try {
        return await prisma.comment.update({
          where: { id: commentId },
          data: { content: content.content },
        });
      } catch (error) {
        console.error(`Prisma error updating comment ${commentId}:`, error);
        throw error;
      }
    },
    /**
     * Delete a comment by its ID.
     * @param {string} commentId - The ID of the comment to delete.
     * @returns {Promise} The deleted comment.
     * @throws {Error} If the comment is not found.
     */
    delete: async (commentId) => {
      try {
        return await prisma.comment.delete({
          where: { id: commentId },
        });
      } catch (error) {
        // Handle cases where the comment doesn't exist
        if (error.code === "P2025") {
          const notFoundError = new Error(
            `Comment with ID ${commentId} not found.`
          );
          notFoundError.code = "P2025"; // Attach code for controller to check
          throw notFoundError;
        }
        // Log and re-throw other Prisma errors
        console.error(`Prisma error deleting comment ${commentId}:`, error);
        throw error; // Re-throw other errors
      }
    },
  },
  // --- NEW USER LIKE POST QUERIES ---
  // Moved these inside the 'post' object in the corrected code above
  // userLikePost: { ... }
  // --- END OF NEW USER LIKE POST QUERIES ---
};
