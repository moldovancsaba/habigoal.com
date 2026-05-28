import { createTheme, rgba, type MantineTheme, type MantineThemeOverride } from "@mantine/core";
import { getSemanticTone, getThemeFoundation, type ThemeMode } from "@/theme/semantic-theme";
import { SEMANTIC_TONES, type SemanticTone } from "@/theme/tokens";
import { APP_FONT_FAMILY_LTR, APP_FONT_FAMILY_RTL, APP_FONT_SIZES, APP_FONT_WEIGHTS } from "@/theme/typography";

type Direction = "ltr" | "rtl";

function isSemanticTone(value: string | undefined): value is SemanticTone {
  return typeof value === "string" && SEMANTIC_TONES.includes(value as SemanticTone);
}

export function getHabigoalMantineTheme(mode: ThemeMode, direction: Direction = "ltr"): MantineThemeOverride {
  const foundation = getThemeFoundation(mode);
  const tone = (name: Parameters<typeof getSemanticTone>[1]) => getSemanticTone(mode, name);
  const fontFamily = direction === "rtl" ? APP_FONT_FAMILY_RTL : APP_FONT_FAMILY_LTR;

  return createTheme({
    primaryColor: "ingress",
    defaultRadius: "md",
    fontFamily,
    fontSizes: {
      xs: APP_FONT_SIZES.xs,
      sm: APP_FONT_SIZES.sm,
      md: APP_FONT_SIZES.md,
      lg: APP_FONT_SIZES.lg,
      xl: APP_FONT_SIZES.xl
    },
    headings: {
      fontFamily,
      fontWeight: String(APP_FONT_WEIGHTS.bold),
      sizes: {
        h1: { fontSize: APP_FONT_SIZES.h1, lineHeight: "1.1", fontWeight: String(APP_FONT_WEIGHTS.extrabold) },
        h2: { fontSize: APP_FONT_SIZES.h2, lineHeight: "1.2", fontWeight: String(APP_FONT_WEIGHTS.bold) },
        h3: { fontSize: APP_FONT_SIZES.h3, lineHeight: "1.25", fontWeight: String(APP_FONT_WEIGHTS.bold) },
        h4: { fontSize: APP_FONT_SIZES.h4, lineHeight: "1.4", fontWeight: String(APP_FONT_WEIGHTS.bold) }
      }
    },
    colors: {
      ingress: tone("ingress").palette,
      synthesis: tone("synthesis").palette,
      knowmore: tone("knowmore").palette,
      strategy: tone("strategy").palette,
      checklist: tone("checklist").palette,
      tactical: tone("tactical").palette,
      review: tone("review").palette,
      neutral: tone("neutral").palette
    },
    black: foundation.textPrimary,
    white: "#ffffff",
    primaryShade: 6,
    defaultGradient: {
      from: "strategy.5",
      to: "synthesis.7",
      deg: 135
    },
    components: {
      Text: {
        defaultProps: {
          c: "var(--text-primary)",
          ff: fontFamily
        }
      },
      Title: {
        defaultProps: {
          c: "var(--text-primary)",
          ff: fontFamily
        },
        styles: {
          root: {
            letterSpacing: "-0.03em"
          }
        }
      },
      Paper: {
        defaultProps: {
          radius: "md",
          withBorder: true,
          shadow: "md"
        },
        styles: {
          root: {
            background: "linear-gradient(180deg, var(--surface-gradient-top), var(--surface-gradient-bottom)), var(--surface-base)",
            backdropFilter: "blur(18px) saturate(1.18)",
            WebkitBackdropFilter: "blur(18px) saturate(1.18)",
            borderColor: "var(--border-primary)",
            boxShadow: "var(--surface-shadow-elevated)"
          }
        }
      },
      Card: {
        defaultProps: {
          radius: "md",
          withBorder: true,
          padding: "xl",
          shadow: "md"
        },
        styles: {
          root: {
            background: "linear-gradient(180deg, var(--surface-gradient-top), var(--surface-gradient-bottom)), var(--surface-base)",
            backdropFilter: "blur(18px) saturate(1.18)",
            WebkitBackdropFilter: "blur(18px) saturate(1.18)",
            borderColor: "var(--border-primary)",
            boxShadow: "var(--surface-shadow-elevated)"
          }
        }
      },
      Badge: {
        defaultProps: {
          radius: "sm"
        },
        styles: {
          root: {
            fontWeight: APP_FONT_WEIGHTS.bold,
            letterSpacing: "0.04em"
          }
        }
      },
      Button: {
        defaultProps: {
          radius: "md",
          variant: "gradient"
        },
        styles: (theme: MantineTheme, props: { color?: string; variant?: string }) => {
          const selectedToneName = isSemanticTone(props.color) ? props.color : "ingress";
          const selectedTone = tone(selectedToneName);
          const isGhost = props.variant === "subtle" || props.variant === "transparent" || props.variant === "default";
          const isOutline = props.variant === "outline";

          return {
            root: {
              fontFamily,
              fontWeight: APP_FONT_WEIGHTS.bold,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              border: `1px solid ${selectedTone.border}`,
              boxShadow: isGhost
                ? "none"
                : "0 0 24px rgba(0, 174, 239, 0.22), 0 14px 36px rgba(0, 0, 0, 0.18)",
              background: isGhost
                ? "transparent"
                : isOutline
                  ? "linear-gradient(180deg, rgba(31, 43, 66, 0.9), rgba(24, 34, 53, 0.88))"
                  : "var(--brand-gradient)",
              color: isGhost ? "var(--text-primary)" : "#0A0F1C"
            }
          };
        }
      },
      NavLink: {
        defaultProps: {
          variant: "subtle"
        },
        styles: {
          root: {
            borderRadius: 10
          },
          label: {
            fontFamily,
            fontWeight: APP_FONT_WEIGHTS.medium,
            letterSpacing: "-0.01em"
          }
        }
      },
      TextInput: {
        styles: {
          input: {
            fontFamily,
            background: "var(--surface-elevated)",
            borderColor: "var(--border-primary)",
            color: "var(--text-primary)"
          },
          label: {
            fontSize: APP_FONT_SIZES.sm,
            fontWeight: APP_FONT_WEIGHTS.medium,
            color: "var(--text-secondary)"
          },
          description: {
            color: "var(--text-muted)",
            fontStyle: "italic"
          }
        }
      },
      Select: {
        styles: {
          input: {
            fontFamily,
            background: "var(--surface-elevated)",
            borderColor: "var(--border-primary)",
            color: "var(--text-primary)"
          },
          label: {
            fontSize: APP_FONT_SIZES.sm,
            fontWeight: APP_FONT_WEIGHTS.medium,
            color: "var(--text-secondary)"
          },
          description: {
            color: "var(--text-muted)",
            fontStyle: "italic"
          },
          dropdown: {
            background: "linear-gradient(180deg, var(--surface-gradient-top), var(--surface-gradient-bottom)), var(--surface-base)",
            borderColor: "var(--border-primary)",
            backdropFilter: "blur(18px) saturate(1.18)"
          }
        }
      },
      Textarea: {
        styles: {
          input: {
            fontFamily,
            background: "var(--surface-elevated)",
            borderColor: "var(--border-primary)",
            color: "var(--text-primary)"
          },
          label: {
            fontSize: APP_FONT_SIZES.sm,
            fontWeight: APP_FONT_WEIGHTS.medium,
            color: "var(--text-secondary)"
          },
          description: {
            color: "var(--text-muted)",
            fontStyle: "italic"
          }
        }
      },
      Modal: {
        styles: {
          content: {
            background: "linear-gradient(180deg, var(--surface-gradient-top), var(--surface-gradient-bottom)), var(--surface-elevated)",
            border: "1px solid var(--border-primary)",
            boxShadow: "0 28px 90px rgba(0, 0, 0, 0.3)",
            backdropFilter: "blur(22px) saturate(1.18)"
          },
          header: {
            background: "transparent"
          }
        }
      },
      Divider: {
        styles: {
          root: {
            borderColor: rgba(foundation.textPrimary, 0.08)
          }
        }
      }
    }
  });
}
