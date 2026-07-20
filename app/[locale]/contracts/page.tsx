import { Badge, Box, Container, Group, SimpleGrid, Stack } from "@sovereignsquad/gds/client";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Paper, Text, Title } from "@/components/gds/SurfacePrimitives";
import {
  BUSINESS_LOGIC_CONTRACT_VERSION,
  apiContract,
  businessContractSourceDocuments,
  businessPersonaContracts,
  dataSharingContract,
  interfaceSeparationRules,
  operationalContract,
  outcomeContract,
  storageContract,
  trainerSupportFlow,
  type BusinessContractSection,
  type BusinessPersonaContract
} from "@/lib/business-logic-contracts";
import { getProductColor } from "@/lib/product-ui-contracts";

type SubsectionLabels = {
  dataReads: string;
  dataWrites: string;
  outcomes: string;
  responsibilities: string;
  rights: string;
  uiSeparation: string;
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "BusinessContracts.metadata" });

  return {
    title: t("title"),
    description: t("description")
  };
}

export default async function BusinessContractsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "BusinessContracts" });
  const subsectionLabels: SubsectionLabels = {
    dataReads: t("subsections.dataReads"),
    dataWrites: t("subsections.dataWrites"),
    outcomes: t("subsections.outcomes"),
    responsibilities: t("subsections.responsibilities"),
    rights: t("subsections.rights"),
    uiSeparation: t("subsections.uiSeparation")
  };

  return (
    <Box component="main" style={{ minHeight: "100vh", color: "var(--text-primary)" }}>
      <Container size="xl" py={{ base: 40, md: 72 }}>
        <Stack gap="xl">
          <Stack gap="md">
            <Group gap="sm" wrap="wrap">
              <Badge color={getProductColor("public", "primaryAction")} variant="light" size="lg" w="fit-content">
                {t("badge.partnerContract")}
              </Badge>
              <Badge color={getProductColor("public", "neutral")} variant="outline" size="lg" w="fit-content">
                {BUSINESS_LOGIC_CONTRACT_VERSION}
              </Badge>
            </Group>
            <Title order={1}>{t("title")}</Title>
            <Text size="lg" c="var(--text-secondary)" maw={900}>
              {t("intro")}
            </Text>
            <Group gap="md" wrap="wrap">
              <Text component="a" href={`/${locale}`} fw={800} c="var(--gds-vibe-accent)" style={{ textDecoration: "none" }}>
                {t("links.appSelector")}
              </Text>
              <Text component="a" href={`/${locale}/legal/privacy`} fw={800} c="var(--gds-vibe-accent)" style={{ textDecoration: "none" }}>
                {t("links.privacyPolicy")}
              </Text>
            </Group>
          </Stack>

          <SimpleGrid cols={{ base: 1, lg: 3 }} spacing="lg">
            {businessPersonaContracts.map((contract) => (
              <PersonaContractCard key={contract.id} contract={contract} labels={subsectionLabels} />
            ))}
          </SimpleGrid>

          <ContractPanel
            eyebrow={t("trainerSupport.eyebrow")}
            title={t("trainerSupport.title")}
            description={t("trainerSupport.description")}
          >
            <OrderedContractList items={trainerSupportFlow} />
          </ContractPanel>

          <SectionGrid eyebrow={t("data.eyebrow")} title={t("data.title")} sections={dataSharingContract} />
          <SectionGrid eyebrow={t("storage.eyebrow")} title={t("storage.title")} sections={storageContract} />

          <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg">
            <ContractPanel
              eyebrow={t("ui.eyebrow")}
              title={t("ui.title")}
              description={t("ui.description")}
            >
              <ContractList items={interfaceSeparationRules} />
            </ContractPanel>
            <ContractPanel
              eyebrow={t("api.eyebrow")}
              title={t("api.title")}
              description={t("api.description")}
            >
              <ContractList items={apiContract} />
            </ContractPanel>
          </SimpleGrid>

          <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg">
            <ContractPanel
              eyebrow={t("outcomes.eyebrow")}
              title={t("outcomes.title")}
              description={t("outcomes.description")}
            >
              <ContractList items={outcomeContract} />
            </ContractPanel>
            <ContractPanel
              eyebrow={t("operations.eyebrow")}
              title={t("operations.title")}
              description={t("operations.description")}
            >
              <ContractList items={operationalContract} />
            </ContractPanel>
          </SimpleGrid>

          <Paper component="section" className="glass-panel surface-outline" withBorder radius="md" p={{ base: "lg", md: "xl" }}>
            <Stack gap="md">
              <Title order={2}>{t("sources.title")}</Title>
              <Text c="var(--text-secondary)">
                {t("sources.description")}
              </Text>
              <SimpleGrid cols={{ base: 1, md: 2 }} spacing="sm">
                {businessContractSourceDocuments.map((source) => (
                  <Text key={source} size="sm" c="var(--text-secondary)">
                    <strong>{source}</strong>
                  </Text>
                ))}
              </SimpleGrid>
            </Stack>
          </Paper>
        </Stack>
      </Container>
    </Box>
  );
}

function PersonaContractCard({ contract, labels }: { contract: BusinessPersonaContract; labels: SubsectionLabels }) {
  return (
    <Paper component="article" className="glass-panel surface-outline" withBorder radius="md" p={{ base: "lg", md: "xl" }}>
      <Stack gap="md">
        <Stack gap={6}>
          <Badge color={getProductColor("public", "primaryAction")} variant="light" w="fit-content">
            {contract.label}
          </Badge>
          <Title order={2} size="h3">{contract.publicName}</Title>
          <Text size="sm" c="var(--text-secondary)">{contract.route}</Text>
        </Stack>

        <Text>{contract.purpose}</Text>
        <Text size="sm" c="var(--text-secondary)">{contract.audience}</Text>

        <ContractSubsection title={labels.rights} items={contract.rights} />
        <ContractSubsection title={labels.responsibilities} items={contract.responsibilities} />
        <ContractSubsection title={labels.dataWrites} items={contract.dataWrites} />
        <ContractSubsection title={labels.dataReads} items={contract.dataReads} />
        <ContractSubsection title={labels.uiSeparation} items={contract.uiBoundary} />
        <ContractSubsection title={labels.outcomes} items={contract.outcomes} />
      </Stack>
    </Paper>
  );
}

function SectionGrid({ eyebrow, title, sections }: { eyebrow: string; title: string; sections: readonly BusinessContractSection[] }) {
  return (
    <ContractPanel eyebrow={eyebrow} title={title}>
      <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">
        {sections.map((section) => (
          <Box key={section.title}>
            <ContractSubsection title={section.title} items={section.items} />
          </Box>
        ))}
      </SimpleGrid>
    </ContractPanel>
  );
}

function ContractPanel({
  children,
  description,
  eyebrow,
  title
}: {
  children: ReactNode;
  description?: string;
  eyebrow: string;
  title: string;
}) {
  return (
    <Paper component="section" className="glass-panel surface-outline" withBorder radius="md" p={{ base: "lg", md: "xl" }}>
      <Stack gap="md">
        <Stack gap={6}>
          <Badge color={getProductColor("public", "primaryAction")} variant="outline" w="fit-content">
            {eyebrow}
          </Badge>
          <Title order={2}>{title}</Title>
          {description ? <Text c="var(--text-secondary)">{description}</Text> : null}
        </Stack>
        {children}
      </Stack>
    </Paper>
  );
}

function ContractSubsection({ items, title }: { items: readonly string[]; title: string }) {
  return (
    <Stack gap={6}>
      <Title order={3} size="h4">{title}</Title>
      <ContractList items={items} />
    </Stack>
  );
}

function ContractList({ items }: { items: readonly string[] }) {
  return (
    <Box component="ul" m={0} pl="lg">
      {items.map((item) => (
        <Text key={item} component="li" size="sm" c="var(--text-secondary)" mb={6}>
          {item}
        </Text>
      ))}
    </Box>
  );
}

function OrderedContractList({ items }: { items: readonly string[] }) {
  return (
    <Box component="ol" m={0} pl="lg">
      {items.map((item) => (
        <Text key={item} component="li" c="var(--text-secondary)" mb={8}>
          {item}
        </Text>
      ))}
    </Box>
  );
}
