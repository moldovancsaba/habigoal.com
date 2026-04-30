import { Button, Container, Title, Text, Stack, Group, Box, ThemeIcon, Alert } from "@mantine/core";
import { getTranslations } from "next-intl/server";
import Image from "next/image";
import { KIDEX_COLORS } from "@/theme/tokens";

export default async function LandingPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const t = await getTranslations("Landing");
  const { error } = await searchParams;

  return (
    <Box bg={KIDEX_COLORS.brandNavy} style={{ minHeight: "100vh", color: KIDEX_COLORS.white }}>
      <Container size="lg" py={100}>
        <Stack gap={60} align="center" style={{ textAlign: "center" }}>
          {error === "access_denied" && (
            <Alert color="red" title="Access Denied" radius="md" style={{ maxWidth: 500 }}>
              {t("accessDenied")}
            </Alert>
          )}
          {/* Logo */}
          <Box style={{ backgroundColor: KIDEX_COLORS.white, borderRadius: "var(--mantine-radius-lg)", padding: 24, boxShadow: "0 20px 40px rgba(0,0,0,0.3)" }}>
            <Image src="/logo.jpeg" alt="KIDEX" width={180} height={180} priority />
          </Box>

          {/* Hero Text */}
          <Stack gap="xl">
            <Title order={1} size={64} fw={900} style={{ letterSpacing: "-2px", lineHeight: 1.1 }}>
              {t("title")}
            </Title>
            <Text size="xl" c={KIDEX_COLORS.navTextMuted} maw={700} mx="auto" style={{ lineHeight: 1.6 }}>
              {t("subtitle")}
            </Text>
          </Stack>

          {/* Features */}
          <Group gap="xl" justify="center">
            {[t("feature1"), t("feature2"), t("feature3")].map((feature, i) => (
              <Group key={i} gap="sm" wrap="nowrap">
                <ThemeIcon color={KIDEX_COLORS.brandTeal} size={24} radius="xl">
                  <Box style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: "white" }} />
                </ThemeIcon>
                <Text fw={500}>{feature}</Text>
              </Group>
            ))}
          </Group>

          {/* CTA */}
          <Stack gap="md" align="center">
            <Button
              component="a"
              href="/api/auth/login"
              size="xl"
              radius="md"
              bg={KIDEX_COLORS.brandTeal}
              styles={{
                root: {
                  paddingInline: 40,
                  height: 60,
                  fontSize: "1.2rem",
                  fontWeight: 700,
                  transition: "transform 0.2s ease",
                  "&:hover": {
                    backgroundColor: "#2bb5b5",
                    transform: "translateY(-2px)"
                  }
                }
              }}
            >
              {t("login")}
            </Button>
            <Text size="sm" c={KIDEX_COLORS.navTextMuted}>
              Secure SSO via DoneIsBetter
            </Text>
          </Stack>
        </Stack>
      </Container>
      
      {/* Legal Footer */}
      <Box 
        component="footer" 
        py="xl" 
        style={{ 
          borderTop: `1px solid rgba(255, 255, 255, 0.1)`,
          textAlign: "center"
        }}
      >
        <Container size="lg">
          <Group justify="center" gap="xl">
            <Text 
              component="a" 
              href="/en/legal/gtc" 
              size="sm" 
              c={KIDEX_COLORS.navTextMuted}
              style={{ textDecoration: "none" }}
            >
              Terms of Service
            </Text>
            <Text 
              component="a" 
              href="/en/legal/privacy" 
              size="sm" 
              c={KIDEX_COLORS.navTextMuted}
              style={{ textDecoration: "none" }}
            >
              Privacy Policy
            </Text>
          </Group>
        </Container>
      </Box>

      {/* Footer Decoration */}
      <Box 
        style={{ 
          position: "relative", 
          height: 10, 
          background: `linear-gradient(90deg, ${KIDEX_COLORS.brandTeal}, ${KIDEX_COLORS.brandNavy})` 
        }} 
      />
    </Box>
  );
}
