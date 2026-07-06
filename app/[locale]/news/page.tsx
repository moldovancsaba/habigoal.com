import { Badge, Box, Container, Group, Stack } from "@sovereignsquad/gds/client";
import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Paper, Text, Title } from "@/components/gds/SurfacePrimitives";
import { Link } from "@/i18n/navigation";
import { listNewsPosts } from "@/lib/news";
import { NewsReadPostButton } from "@/components/news/NewsReadPostButton";
import { getProductColor } from "@/lib/product-ui-contracts";

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
            <Link href="/dashboard" style={{ display: "inline-flex", textDecoration: "none" }}>
              <Image src="/images/habigoal_logo.png" alt="Habigoal" width={84} height={84} priority />
            </Link>
          </Box>

          <Stack gap="sm">
            <Badge color={getProductColor("public", "primaryAction")} variant="light" size="lg" w="fit-content">
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
                        <Badge key={tag} variant="light" color={getProductColor("public", "primaryAction")}>
                          {t(`tags.${tag}`)}
                        </Badge>
                      ))}
                    </Group>
                  </Group>

                  <Text c="var(--text-secondary)">{post.summary}</Text>

                  <NewsReadPostButton href={`/news/${post.slug}`} label={t("readPost")} />
                </Stack>
              </Paper>
            ))}
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}
