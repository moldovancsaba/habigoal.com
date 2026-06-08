import { globalEventBus, DomainEvent } from "../lib/events/event-bus";
import { findTwinByAthleteId } from "../repositories/athlete-twin.repository";
import { computeReadiness } from "../lib/engines/readiness.engine";
import { computeRecovery } from "../lib/engines/recovery.engine";
import { computeInjuryRisk } from "../lib/engines/injury-risk.engine";
import { EngineContext } from "../types/ai-engine";

export interface ClusterResult {
  clusterId: string;
  confidence: number;
  tags: string[];
  engines: {
    readiness?: any;
    recovery?: any;
    injuryRisk?: any;
  };
}

export class AiClusteringService {
  constructor() {
    this.registerListeners();
  }

  private registerListeners() {
    globalEventBus.subscribe("SKELETON_TRACKED", async (event: DomainEvent) => {
      console.log("AI Cluster received SKELETON_TRACKED event", event.payload);
      await this.computeCluster(event.payload);
    });

    globalEventBus.subscribe("TWIN_UPDATED", async (event: DomainEvent) => {
      console.log("AI Cluster received TWIN_UPDATED event", event.payload);
      await this.computeCluster(event.payload);
    });
  }

  async computeCluster(payload: any): Promise<ClusterResult> {
    const athleteId = payload.athleteId;
    if (!athleteId) {
      throw new Error("athleteId is required for AI clustering");
    }

    const twin = await findTwinByAthleteId(athleteId);
    if (!twin) {
      console.warn(`Cannot run AI engines. Twin not found for athlete: ${athleteId}`);
      throw new Error("Twin not found");
    }

    const context: EngineContext = {
      athleteId,
      twin,
      organisationId: twin.organisationId,
    };

    // Run engines in parallel
    const [readiness, recovery, injuryRisk] = await Promise.all([
      computeReadiness(context),
      computeRecovery(context),
      computeInjuryRisk(context),
    ]);

    // Aggregate tags based on engine outputs
    const tags: string[] = [];
    if (readiness.result.zone === "peak") tags.push("peak-readiness");
    if (recovery.result.status === "under_recovered") tags.push("needs-rest");
    if (injuryRisk.result.riskLevel === "high") tags.push("injury-risk");

    const result: ClusterResult = {
      clusterId: `cluster-${athleteId}-${Date.now()}`,
      confidence: (readiness.confidence === "high" && recovery.confidence === "high") ? 0.9 : 0.6,
      tags,
      engines: {
        readiness,
        recovery,
        injuryRisk,
      },
    };

    await globalEventBus.publish({
      type: "CLUSTER_COMPUTED",
      payload: result,
      timestamp: new Date().toISOString(),
    });

    return result;
  }
}

export const aiClusteringService = new AiClusteringService();
