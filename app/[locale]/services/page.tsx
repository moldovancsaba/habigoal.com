import { getTranslations, setRequestLocale } from "next-intl/server";
import Link from "next/link";

import { Badge, Container, Group, SimpleGrid } from "@sovereignsquad/gds/client";
import { Paper, Text, Title } from "@/components/gds/SurfacePrimitives";
import { getProductColor } from "@/lib/product-ui-contracts";
import { listTrainersServices } from "@/repositories/trainers-service.repository";

export default async function ServicesDirectoryPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "Services" });
  const services = await listTrainersServices();

  return (
    <Container size="lg" py="xl">
      <Title order={1} mb="md">{t("directoryTitle")}</Title>
      <Text c="dimmed" mb="xl">
        {t("directorySubtitle")}
      </Text>

      {services.length === 0 ? (
        <Text c="dimmed">{t("empty")}</Text>
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="lg">
          {services.map((service) => {
            const title = (service.draftPayload?.title as string) || service.id;
            const description = (service.draftPayload?.description as string) || t("noDescription");

            return (
              <Paper key={service.id} p="lg" radius="md" withBorder component={Link} href={`/${locale}/services/${service.id}`} className="glass-panel surface-outline" style={{ display: "block", textDecoration: "none" }}>
                <Group justify="space-between" mt="md" mb="xs">
                  <Text fw={500} lineClamp={1}>{title}</Text>
                  <Badge color={getProductColor("public", "primaryAction")}>{service.entityKind}</Badge>
                </Group>
                <Text size="sm" c="dimmed" lineClamp={3}>
                  {description}
                </Text>
              </Paper>
            );
          })}
        </SimpleGrid>
      )}
    </Container>
  );
}
