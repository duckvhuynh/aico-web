"use client";

import Link from "next/link";
import { ArrowUpRight } from "@phosphor-icons/react";

export function EnterCta() {
  return (
    <Link
      href="/enter"
      className="inline-flex min-h-11 items-center gap-2 bg-pine px-6 py-3 text-base text-surface transition-transform duration-200 ease-out motion-safe:active:translate-y-px"
    >
      Enter with an invite
      <ArrowUpRight size={18} weight="regular" aria-hidden="true" />
    </Link>
  );
}
