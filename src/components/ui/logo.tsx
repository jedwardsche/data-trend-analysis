import * as React from "react"

import { cn } from "@/lib/utils"

const CHE_LOGO_BASE_URL = "https://che-mcp.web.app/images/logos"

/**
 * Inline SVG of the CHE symbol mark (pentagon house + compass arrow).
 * Uses currentColor so it inherits text color by default, or che-orange via className.
 */
function CheLogoSymbol({
  className,
  width = 40,
  height = 40,
  ...props
}: React.SVGProps<SVGSVGElement> & { width?: number; height?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 200 200"
      width={width}
      height={height}
      className={cn("shrink-0", className)}
      aria-label="CHE logo"
      {...props}
    >
      {/* Pentagon / house shape */}
      <path
        d="M100 8 L188 72 L188 188 Q188 196 180 196 L20 196 Q12 196 12 188 L12 72 Z"
        fill="currentColor"
      />
      {/* Compass arrow (white cutout pointing up) */}
      <path
        d="M100 38 L140 148 L100 120 L60 148 Z"
        fill="white"
      />
    </svg>
  )
}

type LogoVariant = "symbol" | "full" | "abbreviated" | "white" | "black"

interface CheLogoProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  /** Logo variant to render */
  variant?: LogoVariant
  /** Width in pixels (default: auto for image variants, 40 for symbol) */
  width?: number | string
  /** Height in pixels (default: auto for image variants, 40 for symbol) */
  height?: number | string
}

const VARIANT_FILES: Record<Exclude<LogoVariant, "symbol">, string> = {
  full: "che-logo-full.png",
  abbreviated: "che-logo-abbreviated.png",
  white: "che-logo-white.png",
  black: "che-logo-black.png",
}

/**
 * CHE Logo component.
 *
 * @example
 * // Symbol only (inline SVG, inherits color)
 * <CheLogo variant="symbol" className="text-che-orange" />
 *
 * // Full logo with text
 * <CheLogo variant="full" height={48} />
 *
 * // Abbreviated "che" logo
 * <CheLogo variant="abbreviated" height={32} />
 *
 * // White version (for dark backgrounds)
 * <CheLogo variant="white" height={48} />
 *
 * // Black version (for print / high contrast)
 * <CheLogo variant="black" height={48} />
 */
function CheLogo({
  variant = "symbol",
  className,
  width,
  height,
  ...props
}: CheLogoProps) {
  if (variant === "symbol") {
    return (
      <CheLogoSymbol
        className={className}
        width={typeof width === "number" ? width : 40}
        height={typeof height === "number" ? height : 40}
      />
    )
  }

  const file = VARIANT_FILES[variant]
  const src = `${CHE_LOGO_BASE_URL}/${file}`

  return (
    <img
      src={src}
      alt="Colorado Homeschool Enrichment"
      width={width}
      height={height}
      className={cn("shrink-0", className)}
      {...props}
    />
  )
}

export { CheLogo, CheLogoSymbol }
