import { z } from "zod";
import { EventMode } from "./events.interface";

export const seatLayoutSchema = z.object({
  rows: z
    .number({ error: "Rows count is required" })
    .int()
    .min(1, "Rows must be at least 1"),
  cols: z
    .number({ error: "Columns count is required" })
    .int()
    .min(1, "Columns must be at least 1"),
  matrix: z.array(z.array(z.number().int().min(0).max(1))).optional(),
  basePrice: z
    .number({ error: "Base price is required" })
    .min(0, "Price cannot be negative"),
});

export const zoneSchema = z.object({
  name: z.string({ error: "Zone name is required" }).min(1),
  capacity: z
    .number({ error: "Zone capacity is required" })
    .int()
    .positive("Capacity must be positive"),
  price: z
    .number({ error: "Zone price is required" })
    .min(0, "Price cannot be negative"),
});

export const createEventZodSchema = z
  .object({
    title: z
      .string({ error: "Title is required" })
      .min(3, "Title must be at least 3 characters long"),
    description: z.string().optional(),
    date: z.string({ error: "Date is required" }).datetime({
      message:
        "Invalid date format. Expected ISO 8601 (e.g., 2025-12-16T18:00:00Z)",
    }),

    location: z.string({ error: "Location is required" }),

    image: z
      .string().optional(),

    category: z.string({ error: "Category is required" }),

    mode: z.enum([...Object.values(EventMode)], {
      message: "Mode must be ASSIGNED, OPEN, or STANDING",
    }),

    minParticipants: z.number().int().min(1).default(1),
    maxParticipants: z.number().int().min(1).optional(),

    seatLayout: seatLayoutSchema.optional(),
    zones: z.array(zoneSchema).optional(),
  })

  .superRefine((data, ctx) => {
    if (data.mode === EventMode.ASSIGNED) {
      if (!data.seatLayout) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Seat Layout is required when mode is ASSIGNED",
          path: ["seatLayout"],
        });
      }
    }

    if (data.mode === EventMode.OPEN || data.mode === EventMode.STANDING) {
      if (!data.zones || data.zones.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Zones are required when mode is OPEN or STANDING",
          path: ["zones"],
        });
      }
    }
  });

export const updateEventZodSchema = z.object({
  title: z.string().min(3).optional(),
  description: z.string().optional(),
  date: z.string().datetime().optional(),
  location: z.string().optional(),
  image: z.string().url().optional(),
  category: z.string().optional(),
  status: z.string().optional(),
  minParticipants: z.number().int().min(1).optional(),
  maxParticipants: z.number().int().min(1).optional(),
  seatLayout: seatLayoutSchema.partial().optional(),
  zones: z.array(zoneSchema).optional(),
});
