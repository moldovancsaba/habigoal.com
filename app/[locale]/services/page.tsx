import Link from "next/link";

import { Container, Title, Text, SimpleGrid, Card, Badge, Group } from "@mantine/core";
import { listTrainersServices } from "@/repositories/trainers-service.repository";

export default async function ServicesDirectoryPage() {
  const services = await listTrainersServices();

  return (
    <Container size="lg" py="xl">
      <Title order={1} mb="md">Sport Services & Training Directory</Title>
      <Text c="dimmed" mb="xl">
        Discover verified sport academies, training clubs, and coaching services to level up your game.
      </Text>

      {services.length === 0 ? (
        <Text c="dimmed">No services available yet.</Text>
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="lg">
          {services.map((service) => {
            const title = (service.draftPayload?.title as string) || service.id;
            const description = (service.draftPayload?.description as string) || "No description available.";
            
            return (
              <Card key={service.id} shadow="sm" padding="lg" radius="md" withBorder component={Link} href={`/en/services/${service.id}`}>
                <Group justify="space-between" mt="md" mb="xs">
                  <Text fw={500} lineClamp={1}>{title}</Text>
                  <Badge color="blue">{service.entityKind}</Badge>
                </Group>
                <Text size="sm" c="dimmed" lineClamp={3}>
                  {description}
                </Text>
              </Card>
            );
          })}
        </SimpleGrid>
      )}
    </Container>
  );
}
