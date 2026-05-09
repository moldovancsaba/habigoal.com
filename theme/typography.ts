export const APP_FONT_FAMILY_LTR = 'var(--font-noto-sans),"Noto Sans","Helvetica","Arial",sans-serif';
export const APP_FONT_FAMILY_RTL =
  'var(--font-noto-sans-arabic),"Noto Sans Arabic",var(--font-noto-sans),"Noto Sans","Helvetica","Arial",sans-serif';

export const APP_FONT_SIZES = {
  xs: "0.75rem",
  sm: "0.875rem",
  md: "1rem",
  lg: "1.125rem",
  xl: "1.25rem",
  h1: "2rem",
  h2: "1.5rem",
  h3: "1.25rem",
  h4: "1.125rem"
} as const;

export const APP_FONT_WEIGHTS = {
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  extrabold: 800
} as const;
