import { z } from "zod";
import { parseMinor } from "@/lib/money";

export const requestInput = z.object({
  title: z.string().trim().min(3, "Use at least 3 characters.").max(120),
  description: z.string().trim().max(2000),
  categoryId: z.string().uuid().optional().or(z.literal("")),
  budget: z.string().trim().refine((v) => v === "" || parseMinor(v) !== null, "Enter a budget like 150 or 150.50."),
  days: z.enum(["7", "14", "30"]),
});

// Long digit runs look like ID, student or document numbers. Never publish those.
const noIdNumbers = (v: string) => !/(?:\d[\s-]?){7,}/.test(v);
const idMsg = "Don't include ID, student or document numbers. Describe the item without them.";
export const lostFoundInput = z.object({
  kind: z.enum(["lost", "found"]),
  title: z.string().trim().min(3, "Use at least 3 characters.").max(120).refine(noIdNumbers, idMsg),
  description: z.string().trim().max(2000).refine(noIdNumbers, idMsg),
  area: z.string().trim().min(2, "Name the campus area.").max(120),
  occurredOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date."),
  imagePath: z.string().nullable(),
});
