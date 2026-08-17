"use client";

import Image from "next/image";
import studioDesk from "./studio-desk.png";

export function HeroPhotograph() {
  return (
    <figure className="relative isolate overflow-hidden rounded-[1.75rem] bg-surface ring-1 ring-line">
      <div className="relative aspect-[4/5] w-full md:aspect-[5/6]">
        <Image
          src={studioDesk}
          alt="A quiet studio desk in north light, with paper, pencils, and a closed notebook."
          fill
          priority
          sizes="(max-width: 768px) 100vw, 40vw"
          className="object-cover transition-transform duration-500 ease-out motion-safe:hover:scale-[1.03]"
        />
      </div>
      <figcaption className="sr-only">
        Editorial photograph of a working studio table. No product interface is shown.
      </figcaption>
    </figure>
  );
}
