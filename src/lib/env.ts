import { z } from "zod";

const schema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20),
});

type Env = z.infer<typeof schema>;

// Validate lazily at first property access so Next.js build-time static analysis
// doesn't throw when env vars aren't set in the build environment.
// At runtime (server request or client hydration) the vars must be present.
let _parsed: Env | null = null;

function getEnv(): Env {
  if (!_parsed) {
    _parsed = schema.parse({
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    });
  }
  return _parsed;
}

export const env = new Proxy({} as Env, {
  get(_target, prop: string) {
    return getEnv()[prop as keyof Env];
  },
});
