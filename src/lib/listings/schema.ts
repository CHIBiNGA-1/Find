import { z } from "zod";
import { parseMinor } from "@/lib/money";

export const CONDITIONS = ["new", "like_new", "good", "fair", "poor"] as const;
export const CONDITION_LABEL: Record<(typeof CONDITIONS)[number], string> = {
  new: "New", like_new: "Like new", good: "Good", fair: "Fair", poor: "Poor",
};

export const listingInput = z.object({
  title: z.string().trim().min(3, "Use at least 3 characters.").max(120, "Keep it under 120 characters."),
  description: z.string().trim().max(4000, "Keep it under 4000 characters."),
  price: z.string().refine((v) => parseMinor(v) !== null, "Enter a price like 150 or 150.50."),
  condition: z.enum(CONDITIONS, { message: "Choose a condition." }),
  categoryId: z.string().uuid("Choose a category."),
  meetingPreferences: z.string().trim().max(500).optional(),
  campusArea: z.string().trim().max(120, "Keep it under 120 characters.").optional(),
});
export type ListingInput = z.infer<typeof listingInput>;
