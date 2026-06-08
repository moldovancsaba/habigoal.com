import { EngineContext, EngineOutput, TechniqueResult } from "../../types/ai-engine";

export async function computeTechnique(context: EngineContext): Promise<EngineOutput<TechniqueResult>> {
  const { twin } = context;
  const limitations: string[] = [];
  const factors: string[] = [];
  let confidence: "high" | "medium" | "low" = "low";

  const symmetry = twin.technical?.movementSymmetryIndex;
  const form = twin.technical?.runningFormScore;

  if (symmetry == null && form == null) {
    limitations.push("No vision or kinematics data available.");
    return {
      result: { confidence: "low", limitations },
      confidence: "low",
      contributingFactors: [],
      dataRecency: "missing",
      missingData: ["vision_analysis"],
      humanReviewRecommended: false,
      generatedAt: new Date().toISOString(),
    };
  }

  if (symmetry != null) {
    factors.push(`Movement symmetry index: ${symmetry}`);
    confidence = twin.technical?.confidence ?? "medium";
    if (symmetry < 0.7) {
      limitations.push("Asymmetry detected — human review recommended.");
    }
  }

  if (form != null) {
    factors.push(`Running form score: ${form}`);
    if (form < 60) {
      limitations.push("Form quality below threshold — avoid automated conclusions.");
      confidence = "low";
    }
  }

  return {
    result: {
      movementSymmetryIndex: symmetry,
      runningFormScore: form,
      confidence,
      limitations,
    },
    confidence,
    contributingFactors: factors,
    dataRecency: "current",
    missingData: [],
    humanReviewRecommended: limitations.length > 0,
    generatedAt: new Date().toISOString(),
  };
}
