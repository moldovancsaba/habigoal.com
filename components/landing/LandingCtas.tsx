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
        <SemanticButton
          action="landing:athleteApp"
          component={Link}
          href={athleteHref}
          color="ingress"
          vocabularyPacks={[landingActionPack]}
        />
      }
      secondary={
        <SemanticButton
          action="landing:trainerApp"
          component={Link}
          href={trainerHref}
          variant="default"
          vocabularyPacks={[landingActionPack]}
        />
      }
      tertiary={
        <SemanticButton
          action="landing:whatsNew"
          component={Link}
          href={newsHref}
          variant="subtle"
          vocabularyPacks={[landingActionPack]}
        />
      }
    />
  );
}
