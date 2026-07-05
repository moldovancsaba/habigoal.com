import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Container, Title, Text, Card, Badge, Group, Stack } from "@mantine/core";
import { getProductColor } from "@/lib/product-ui-contracts";
import { getTrainersServiceById } from "@/repositories/trainers-service.repository";

export default async function ServiceDetailPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "Services" });
  const service = await getTrainersServiceById(id);

  if (!service) {
    notFound();
  }

  const title = (service.draftPayload?.title as string) || service.id;
  const description = (service.draftPayload?.description as string) || t("noDescription");

  return (
    <Container size="md" py="xl">
      <Card shadow="sm" padding="xl" radius="md" withBorder>
        <Stack gap="md">
          <Group justify="space-between">
            <Title order={1}>{title}</Title>
            <Badge color={getProductColor("public", "primaryAction")} size="lg">{service.entityKind}</Badge>
          </Group>

          <Text size="lg">{description}</Text>

          <Title order={3} mt="xl">{t("rawDataTitle")}</Title>
          <pre style={{ whiteSpace: "pre-wrap", wordWrap: "break-word", background: "var(--surface-elevated)", padding: "1rem", borderRadius: "var(--gds-radius-medium)" }}>
            {JSON.stringify(service.draftPayload, null, 2)}
          </pre>
        </Stack>
      </Card>
    </Container>
  );
}
