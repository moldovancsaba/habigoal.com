import { Badge, Box, Container, Group, Stack } from "@sovereignsquad/gds/client";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Paper, Text, Title } from "@/components/gds/SurfacePrimitives";
import { Link } from "@/i18n/navigation";
import { getNewsPostBySlug } from "@/lib/news";

export default async function NewsPostPage({
  params
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "News" });
  const post = getNewsPostBySlug(slug, locale);

  if (!post) {
    notFound();
  }

  return (
    <Box style={{ minHeight: "100vh", color: "var(--text-primary)" }}>
      <Container size="md" py={{ base: 40, md: 72 }}>
        <Stack gap="xl">
          <Box>
            <Link href="/dashboard" style={{ display: "inline-flex", textDecoration: "none" }}>
              <Image src="/images/habigoal_logo.png" alt="Habigoal" width={84} height={84} priority />
            </Link>
          </Box>

          <Stack gap="md">
            <Link href="/news" style={{ textDecoration: "none" }}>
              <Text c="var(--text-secondary)">{t("backToNews")}</Text>
            </Link>
            <Text size="sm" c="dimmed">{post.publishedLabel}</Text>
            <Title order={1}>{post.title}</Title>
            <Text size="lg" c="var(--text-secondary)">{post.summary}</Text>
            <Group gap="xs">
              {post.tags.map((tag) => (
                <Badge key={tag} variant="light" color="strategy">
                  {t(`tags.${tag}`)}
                </Badge>
              ))}
            </Group>
          </Stack>

          <Stack gap="lg">
            {post.sections.map((section) => (
              <Paper key={section.title} withBorder radius="md" p="xl" className="glass-panel surface-outline">
                <Stack gap="md">
                  <Title order={2}>{section.title}</Title>
                  <Stack gap="sm">
                    {section.items.map((item) => (
                      <Text key={item}>{`\u2022 ${item}`}</Text>
                    ))}
                  </Stack>
                </Stack>
              </Paper>
            ))}
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}
