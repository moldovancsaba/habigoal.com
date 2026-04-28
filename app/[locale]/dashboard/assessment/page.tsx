import { KidexAssessmentApp } from "@/components/forms/KidexAssessmentApp";

export default function AssessmentPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  return <KidexAssessmentApp />;
}
