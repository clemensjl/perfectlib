import registry from "@/registry.json";

export const SITE_URL = "https://perfectlib.vercel.app";
export const REPO_URL = "https://github.com/clemensjl/perfectlib";

export type Maker = "clemens" | "philipp" | "raphael";

export const makers: Record<Maker, { name: string; color: string }> = {
  clemens: { name: "Clemens", color: "var(--maker-clemens)" },
  philipp: { name: "Philipp", color: "var(--maker-philipp)" },
  raphael: { name: "Raphael", color: "var(--maker-raphael)" },
};

export type RegistryItem = {
  name: string;
  type: string;
  title: string;
  description?: string;
  author?: string;
  categories?: string[];
  files: { path: string; type: string }[];
};

export const items = registry.items as RegistryItem[];

export function makerOf(item: RegistryItem): Maker | undefined {
  const key = item.author?.toLowerCase().split(" ")[0];
  return key && key in makers ? (key as Maker) : undefined;
}

export function installCommand(name: string) {
  return `npx shadcn@latest add ${SITE_URL}/r/${name}.json`;
}
