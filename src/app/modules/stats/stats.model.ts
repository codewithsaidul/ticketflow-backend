// stats.model.ts (for Mongoose)
import mongoose from "mongoose";

const statsSchema = new mongoose.Schema({
  // define schema fields
});

export const StatsModel = mongoose.model("Stats", statsSchema);
