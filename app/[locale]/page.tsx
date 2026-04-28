import { redirect } from "@/i18n/navigation";

export default async function RootPage() {
  redirect("/dashboard/assessment");
}
