import { notFound } from "next/navigation";
import { items } from "@/lib/registry";
import { previews } from "@/registry/previews";

export const dynamicParams = false;

export function generateStaticParams() {
  return items.map((item) => ({ name: item.name }));
}

export default async function PreviewPage({ params }: PageProps<"/preview/[name]">) {
  const { name } = await params;
  const Preview = previews[name];
  if (!Preview) notFound();
  return <Preview />;
}
