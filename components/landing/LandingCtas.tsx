"use client";

import { CtaButtonGroup, createGdsVocabularyPack, GdsIcons, SemanticButton } from "@doneisbetter/gds/client";
import { useMemo } from "react";
import { Link } from "@/i18n/navigation";

type LandingCtasProps = {
  athleteAppLabel: string;
  trainerAppLabel: string;
  whatsNewLabel: string;
  athleteHref: string;
  trainerHref: string;
  newsHref: string;
};

export function LandingCtas({
  athleteAppLabel,
  trainerAppLabel,
  whatsNewLabel,
  athleteHref,
  trainerHref,
  newsHref
}: LandingCtasProps) {
  const landingActionPack = useMemo(
    () =>
      createGdsVocabularyPack("landing", {
        athleteApp: { defaultMessage: athleteAppLabel, icon: GdsIcons.Profile },
        trainerApp: { defaultMessage: trainerAppLabel, icon: GdsIcons.Dashboard },
        whatsNew: { defaultMessage: whatsNewLabel, icon: GdsIcons.Notifications }
      }),
    [athleteAppLabel, trainerAppLabel, whatsNewLabel]
  );

  return (
    <CtaButtonGroup
      primary={
        <Link href={athleteHref} style={{ textDecoration: "none" }}>
          <SemanticButton action="landing:athleteApp" color="ingress" vocabularyPacks={[landingActionPack]} />
        </Link>
      }
      secondary={
        <Link href={trainerHref} style={{ textDecoration: "none" }}>
          <SemanticButton action="landing:trainerApp" variant="default" vocabularyPacks={[landingActionPack]} />
        </Link>
      }
      tertiary={
        <Link href={newsHref} style={{ textDecoration: "none" }}>
          <SemanticButton action="landing:whatsNew" variant="subtle" vocabularyPacks={[landingActionPack]} />
        </Link>
      }
    />
  );
}
