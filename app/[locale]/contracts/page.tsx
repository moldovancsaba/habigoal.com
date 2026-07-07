import { Badge, Box, Container, Group, SimpleGrid, Stack } from "@sovereignsquad/gds/client";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { setRequestLocale } from "next-intl/server";
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

export const metadata: Metadata = {
  title: "Business Logic Contracts",
  description: "Public partner contract for Habigoal habit builder, Athlete IQ athlete workspace, and Athlete IQ trainer workspace."
};

export default async function BusinessContractsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <Box component="main" style={{ minHeight: "100vh", color: "var(--text-primary)" }}>
      <Container size="xl" py={{ base: 40, md: 72 }}>
        <Stack gap="xl">
          <Stack gap="md">
            <Group gap="sm" wrap="wrap">
              <Badge color={getProductColor("public", "primaryAction")} variant="light" size="lg" w="fit-content">
                Partner contract
              </Badge>
              <Badge color={getProductColor("public", "neutral")} variant="outline" size="lg" w="fit-content">
                {BUSINESS_LOGIC_CONTRACT_VERSION}
              </Badge>
            </Group>
            <Title order={1}>Business logic and persona contracts</Title>
            <Text size="lg" c="var(--text-secondary)" maw={900}>
              This page defines how the three public personas work next to each other, what each persona can do, what each persona is responsible for, how data moves, how user interfaces stay separated, where records are stored, and what outcomes the system must produce.
            </Text>
            <Group gap="md" wrap="wrap">
              <Text component="a" href={`/${locale}`} fw={800} c="var(--gds-vibe-accent)" style={{ textDecoration: "none" }}>
                App selector
              </Text>
              <Text component="a" href={`/${locale}/legal/privacy`} fw={800} c="var(--gds-vibe-accent)" style={{ textDecoration: "none" }}>
                Privacy policy
              </Text>
            </Group>
          </Stack>

          <SimpleGrid cols={{ base: 1, lg: 3 }} spacing="lg">
            {businessPersonaContracts.map((contract) => (
              <PersonaContractCard key={contract.id} contract={contract} />
            ))}
          </SimpleGrid>

          <ContractPanel
            eyebrow="Trainer support model"
            title="How trainers manage and support athletes"
            description="The trainer workflow is an Athlete IQ workflow. It uses assigned-athlete data and auditable actions; it does not enter or copy the Habigoal habitbuilder interface."
          >
            <OrderedContractList items={trainerSupportFlow} />
          </ContractPanel>

          <SectionGrid eyebrow="Data contract" title="How data is shared and distributed" sections={dataSharingContract} />
          <SectionGrid eyebrow="Storage contract" title="Where the system stores records" sections={storageContract} />

          <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg">
            <ContractPanel
              eyebrow="UI boundary"
              title="How the user interfaces stay separated"
              description="Routes, shells, function registries, and API authorization all enforce product separation."
            >
              <ContractList items={interfaceSeparationRules} />
            </ContractPanel>
            <ContractPanel
              eyebrow="API boundary"
              title="Which contracts enforce access"
              description="Every product read or write must pass through the correct entitlement and role-aware API contract."
            >
              <ContractList items={apiContract} />
            </ContractPanel>
          </SimpleGrid>

          <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg">
            <ContractPanel
              eyebrow="Outcomes"
              title="What the system produces"
              description="The products share one compatible data foundation while producing different outputs for each persona."
            >
              <ContractList items={outcomeContract} />
            </ContractPanel>
            <ContractPanel
              eyebrow="Operations"
              title="Safety, accessibility, retries, and rollback"
              description="Operational behavior protects users, partners, and data integrity when modules fail or data is incomplete."
            >
              <ContractList items={operationalContract} />
            </ContractPanel>
          </SimpleGrid>

          <Paper component="section" className="glass-panel surface-outline" withBorder radius="md" p={{ base: "lg", md: "xl" }}>
            <Stack gap="md">
              <Title order={2}>Source contracts used</Title>
              <Text c="var(--text-secondary)">
                This public page is derived from the repository contracts below. The online page is the partner-facing summary; the source files remain the engineering implementation contracts.
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

function PersonaContractCard({ contract }: { contract: BusinessPersonaContract }) {
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

        <ContractSubsection title="Rights" items={contract.rights} />
        <ContractSubsection title="Responsibilities" items={contract.responsibilities} />
        <ContractSubsection title="Data writes" items={contract.dataWrites} />
        <ContractSubsection title="Data reads" items={contract.dataReads} />
        <ContractSubsection title="UI separation" items={contract.uiBoundary} />
        <ContractSubsection title="Outcomes" items={contract.outcomes} />
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
