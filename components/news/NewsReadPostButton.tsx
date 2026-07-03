"use client";

import { createGdsVocabularyPack, GdsIcons, SemanticButton } from "@sovereignsquad/gds/client";
import { Link } from "@/i18n/navigation";

type NewsReadPostButtonProps = {
  href: string;
  label: string;
};

export function NewsReadPostButton({ href, label }: NewsReadPostButtonProps) {
  const newsActionPack = createGdsVocabularyPack("news", {
    readPost: {
      defaultMessage: label,
      icon: GdsIcons.Notifications
    }
  });

  return (
    <Link href={href} style={{ textDecoration: "none" }}>
      <SemanticButton action="news:readPost" variant="light" vocabularyPacks={[newsActionPack]} />
    </Link>
  );
}
