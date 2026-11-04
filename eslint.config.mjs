import { FlatCompat } from "@eslint/eslintrc";
import { dirname } from "path";
import { fileURLToPath } from "url";

const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) });
const config = [
  { ignores: [".next/**", "node_modules/**", "next-env.d.ts", "public/sw.js"] },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // Photos are short-lived signed Supabase Storage URLs, resized to <=1600px WebP in the browser before upload.
      // Routing them through next/image would add a second transform hop and cache entries keyed on expiring URLs.
      "@next/next/no-img-element": "off",
      // Apostrophes in copy are a typographic choice, not a defect; React renders them correctly.
      "react/no-unescaped-entities": "off",
    },
  },
];

export default config;
