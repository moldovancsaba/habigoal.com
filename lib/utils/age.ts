export type AgeGroup = "4-6" | "7-9" | "10-12";

export function calculateAgeGroup(birthDate: string): AgeGroup | "" {
  if (!birthDate) return "";
  
  const birth = new Date(birthDate);
  const now = new Date();
  
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
    age--;
  }

  if (age >= 4 && age <= 6) return "4-6";
  if (age >= 7 && age <= 9) return "7-9";
  if (age >= 10 && age <= 12) return "10-12";
  
  return "";
}
