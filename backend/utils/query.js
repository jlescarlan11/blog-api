// Load the Prisma client
const { PrismaClient } = require("../generated/prisma");
const prisma = new PrismaClient();

// The query object with user operations
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
  },
  post: {
    create: async (title, content, published, authorId) => {
      return await prisma.post.create({
        data: {
          title: title,
          content: content,
          published: published,
          author: {
            connect: { id: authorId },
          },
        },
      });
    },
    // --- IMPLEMENT THIS FUNCTION ---
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
        const [field, direction] = sort.split(":"); // e.g., "createdAt:desc"

        // Ensure valid fields and directions are used
        const validSortFields = ["createdAt", "title", "author"]; // Add other sortable fields if needed
        const validSortDirections = ["asc", "desc"];

        if (
          validSortFields.includes(field) &&
          validSortDirections.includes(direction)
        ) {
          if (field === "author") {
            // Special handling for sorting by author name (assuming author has firstName and lastName)
            // This might require a more complex query or a different approach depending on your schema
            // For a simple case, we might sort by firstName or a concatenated name if available in the model
            // Example sorting by firstName:
            orderBy.author = { firstName: direction };
            // If you need to sort by full name, you might need raw SQL or a different schema design.
            // For now, we'll assume sorting by author's first name is acceptable or adjust based on schema.
            // Let's refine this: If 'author' is a relation, sorting directly like this might not work as expected
            // depending on Prisma version and relation type. A common pattern is to sort by a field *within* the related model.
            // Let's assume sorting by author's firstName is the intent based on the frontend display.
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
        include: { author: true, comments: true },
      });
    },
    update: async (postId, data) => {
      return await prisma.post.update({
        where: { id: postId },
        data: data,
      });
    },
    delete: async (postId) => {
      return await prisma.post.delete({
        where: { id: postId },
      });
    },
    /*************  ✨ Windsurf Command ⭐  *************/
    /**
     * Delete all blog posts in the database. This function is
     * intended to be used for development or testing purposes.
     * It is not intended to be used in a production environment.
     * @returns {Promise<number>} The number of records deleted.
     */
    /*******  6619c471-adf4-4f9f-accd-f1731fd6b17d  *******/
    deleteAll: async () => {
      return await prisma.post.deleteMany();
    },
  },
};
