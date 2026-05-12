import { Badge, Box, Button, Container, Group, Paper, Stack, Text, Title } from "@mantine/core";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { listNewsPosts } from "@/lib/news";
import { BrandMark } from "@/components/ui/BrandMark";

export default async function NewsIndexPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "News" });
  const posts = listNewsPosts(locale);

  return (
    <Box style={{ minHeight: "100vh", color: "var(--text-primary)" }}>
      <Container size="lg" py={{ base: 40, md: 72 }}>
        <Stack gap="xl">
          <Box>
            <BrandMark size={84} align="left" href="/dashboard" />
          </Box>

          <Stack gap="sm">
            <Badge color="ingress" variant="light" size="lg" w="fit-content">
              {t("badge")}
            </Badge>
            <Title order={1}>{t("title")}</Title>
            <Text size="lg" c="var(--text-secondary)" maw={760}>
              {t("subtitle")}
            </Text>
          </Stack>

          <Stack gap="lg">
            {posts.map((post) => (
              <Paper key={post.slug} withBorder radius="md" p="xl" className="glass-panel surface-outline">
                <Stack gap="md">
                  <Group justify="space-between" align="flex-start">
                    <Stack gap={4}>
                      <Text size="sm" c="dimmed">{post.publishedLabel}</Text>
                      <Title order={2}>{post.title}</Title>
                    </Stack>
                    <Group gap="xs">
                      {post.tags.map((tag) => (
                        <Badge key={tag} variant="light" color="strategy">
                          {t(`tags.${tag}`)}
                        </Badge>
                      ))}
                    </Group>
                  </Group>

                  <Text c="var(--text-secondary)">{post.summary}</Text>

                  <Link href={`/news/${post.slug}`} style={{ textDecoration: "none" }}>
                    <Button variant="light" w="fit-content">
                      {t("readPost")}
                    </Button>
                  </Link>
                </Stack>
              </Paper>
            ))}
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}
