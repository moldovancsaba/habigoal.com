import { createTheme, type Direction, type ThemeOptions } from "@mui/material/styles";

const brandNavy = "#3D3F4D";
const brandTeal = "#13A59E";
const brandGold = "#FDCB58";

const baseFontFamily = '"Outfit","Inter","Helvetica","Arial",sans-serif';

const baseTypography: ThemeOptions["typography"] = {
  fontFamily: baseFontFamily,
  h1: { fontWeight: 700, fontSize: "1.75rem" },
  h2: { fontWeight: 700, fontSize: "1.35rem" },
  h3: { fontWeight: 600, fontSize: "1.1rem" },
  button: { textTransform: "none", fontWeight: 600 }
};

export function getKidexTheme(mode: "light" | "dark", direction: Direction = "ltr") {
  const isLight = mode === "light";

  return createTheme({
    direction,
    palette: {
      mode,
      primary: {
        main: isLight ? brandNavy : "#90caf9",
        contrastText: isLight ? "#ffffff" : "#0f172a"
      },
      secondary: {
        main: brandTeal,
        contrastText: "#ffffff"
      },
      warning: {
        main: brandGold,
        contrastText: isLight ? brandNavy : "#0f172a"
      },
      background: {
        default: isLight ? "#f5f7fb" : "#0f172a",
        paper: isLight ? "#ffffff" : "#1e293b"
      },
      text: {
        primary: isLight ? brandNavy : "#f1f5f9",
        secondary: isLight ? "#6b7280" : "#94a3b8"
      },
      divider: isLight ? "#e5e7eb" : "#334155"
    },
    typography: {
      ...baseTypography,
      // Arabic gets a more readable fallback stack.
      fontFamily:
        direction === "rtl"
          ? '"Cairo","Tajawal","Noto Kufi Arabic","Outfit","Inter","Helvetica","Arial",sans-serif'
          : baseFontFamily
    },
    shape: { borderRadius: 10 },
    components: {
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: { root: { borderRadius: 10, fontWeight: 600 } }
      },
      MuiToggleButton: {
        styleOverrides: {
          root: {
            borderRadius: 10,
            "&.Mui-selected": {
              backgroundColor: brandTeal,
              borderColor: brandTeal,
              color: "#ffffff"
            },
            "&.Mui-selected:hover": {
              backgroundColor: "#0f8f89",
              borderColor: "#0f8f89"
            }
          }
        }
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            border: `1px solid ${isLight ? "#e5e7eb" : "#334155"}`,
            boxShadow: isLight
              ? "0 10px 30px -20px rgba(15, 23, 42, 0.18)"
              : "0 8px 24px -12px rgba(0,0,0,0.45)"
          }
        }
      },
      MuiAppBar: {
        styleOverrides: {
          root: { backgroundImage: "none" }
        }
      }
    }
  });
}
