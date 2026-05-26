"use client";

import Image from "next/image";
import { Box } from "@mantine/core";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

type BrandMarkProps = {
  size?: number;
  subtitle?: string;
  align?: "left" | "center";
  href?: string;
};

export function BrandMark({ size = 88, subtitle: _subtitle, align = "center", href = "/" }: BrandMarkProps) {
  const iconSize = Math.round(size);
  const t = useTranslations("Common");
  void _subtitle;

  return (
    <Link href={href} aria-label={t("goHome")} style={{ display: "inline-flex", textDecoration: "none" }}>
      <Box style={{ display: "inline-flex", alignItems: align === "center" ? "center" : "flex-start", lineHeight: 1 }}>
        <Image
          src="/images/habigoal_logo.png"
          alt="Habigoal"
          width={iconSize}
          height={iconSize}
          priority={size >= 140}
          style={{
            width: iconSize,
            height: iconSize,
            display: "block"
          }}
        />
      </Box>
    </Link>
  );
}
