"use client";

import Link from "next/link";
import { ConnectKitButton } from "connectkit";

export function Navbar() {
  return (
    <nav className="border-b border-zinc-800 bg-zinc-950">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <div className="flex items-center gap-8">
          <Link href="/" className="text-xl font-bold text-white">
            FlowBack
          </Link>
          <div className="hidden items-center gap-6 md:flex">
            <Link
              href="/campaigns"
              className="text-sm text-zinc-400 transition hover:text-white"
            >
              Campaigns
            </Link>
            <Link
              href="/dashboard"
              className="text-sm text-zinc-400 transition hover:text-white"
            >
              Dashboard
            </Link>
          </div>
        </div>
        <ConnectKitButton />
      </div>
    </nav>
  );
}
