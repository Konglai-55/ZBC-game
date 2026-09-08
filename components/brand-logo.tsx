import Image from "next/image";
import { mediaUrl } from "@/lib/media-url";

type BrandLogoProps = {
  variant?: "header" | "footer" | "admin" | "login";
  priority?: boolean;
};

export function BrandLogo({ variant = "header", priority = false }: BrandLogoProps) {
  return (
    <span className={`brand-logo brand-logo--${variant}`}>
      <Image
        alt="ZBC Game"
        height={476}
        priority={priority}
        sizes={variant === "header" ? "132px" : variant === "footer" ? "176px" : "190px"}
        src={mediaUrl("/brand/zbc-game-logo.jpg")}
        width={1580}
      />
    </span>
  );
}
