import Link from "next/link";

/** The plasma-screen icon and the wordmark, "date a globe" with a light "a". */
export function Brand({ size = 30, href = "/" }: { size?: number; href?: string }) {
  return (
    <Link href={href} className="brand" aria-label="Date a Globe home">
      {/* biome-ignore lint/performance/noImgElement: a vector icon, nothing for next/image to do */}
      <img src="/brand/icon-small.svg" width={size} height={size} alt="" />
      <span className="word">
        date <i>a</i> globe
      </span>
    </Link>
  );
}
