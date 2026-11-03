import Link from "next/link";
import { REPO_URL } from "@/lib/registry";

export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="min-h-screen bg-paper text-ink">
      <div className="mx-auto max-w-5xl px-4 sm:px-8">
        <header className="flex items-center justify-between py-6 text-sm">
          <Link href="/" className="font-semibold tracking-tight">
            PerfectLib
          </Link>
          <a href={REPO_URL} className="text-muted hover:text-ink">
            Repo auf GitHub
          </a>
        </header>
        <main className="pb-24">{children}</main>
      </div>
    </div>
  );
}
