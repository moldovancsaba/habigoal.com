import { getDatabase } from "@/lib/mongodb";
import { upsertChild } from "@/repositories/child.repository";

export async function syncChildrenFromAssessments() {
  const db = await getDatabase();
  const assessments = await db.collection("assessments").find({}).toArray();
  
  console.log(`Syncing children from ${assessments.length} assessments...`);
  
  for (const a of assessments) {
    if (a.child) {
      await upsertChild({
        name: a.child.name,
        birthDate: a.child.birthDate,
        knownTraits: a.child.knownTraits || "",
        parentSignals: a.child.parentSignals || "",
        dominantHand: a.child.dominantHand || "",
        dominantEye: a.child.dominantEye || "",
        dominantFoot: a.child.dominantFoot || ""
      });
    }
  }
}
