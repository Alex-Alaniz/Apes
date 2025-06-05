// This is a placeholder for Supabase configuration
// Since we're not actually using Supabase, we'll export a mock object

module.exports = {
  from: (table) => ({
    upsert: async (data, options) => {
      console.log(`Mock Supabase: Upserting into ${table}`, data);
      return { data, error: null };
    },
    select: async (fields) => {
      console.log(`Mock Supabase: Selecting from ${table}`);
      return { data: [], error: null };
    },
    insert: async (data) => {
      console.log(`Mock Supabase: Inserting into ${table}`, data);
      return { data, error: null };
    }
  })
}; 