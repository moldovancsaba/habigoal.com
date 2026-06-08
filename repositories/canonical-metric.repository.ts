import { getDatabase } from "@/lib/mongodb";
import { CanonicalMetric, CanonicalMetricKey, MetricSource } from "../types/canonical-metric";

const COLLECTION_NAME = "canonical_metrics";

export async function upsertCanonicalMetric(metric: CanonicalMetric): Promise<void> {
  const db = await getDatabase();
  const collection = db.collection(COLLECTION_NAME);

  const filter = { metricId: metric.metricId };
  const update = {
    $set: {
      ...metric,
      updatedAt: new Date().toISOString(),
    },
    $setOnInsert: {
      createdAt: new Date().toISOString(),
    },
  };

  await collection.updateOne(filter, update, { upsert: true });
}

export async function upsertManyCanonicalMetrics(metrics: CanonicalMetric[]): Promise<void> {
  if (metrics.length === 0) return;

  const db = await getDatabase();
  const collection = db.collection(COLLECTION_NAME);

  const operations = metrics.map((metric) => ({
    updateOne: {
      filter: { metricId: metric.metricId },
      update: {
        $set: {
          ...metric,
          updatedAt: new Date().toISOString(),
        },
        $setOnInsert: {
          createdAt: new Date().toISOString(),
        },
      },
      upsert: true,
    },
  }));

  await collection.bulkWrite(operations);
}

export async function findByAthleteAndDateRange(
  athleteId: string,
  from: string,
  to: string,
  keys?: CanonicalMetricKey[]
): Promise<CanonicalMetric[]> {
  const db = await getDatabase();
  const collection = db.collection<CanonicalMetric>(COLLECTION_NAME);

  const query: any = {
    athleteId,
    date: { $gte: from, $lte: to },
  };

  if (keys && keys.length > 0) {
    query.canonicalKey = { $in: keys };
  }

  return await collection.find(query).toArray();
}

export async function getSourceCompleteness(
  athleteId: string,
  date: string
): Promise<Record<MetricSource, boolean>> {
  const db = await getDatabase();
  const collection = db.collection<CanonicalMetric>(COLLECTION_NAME);

  const metrics = await collection
    .find({ athleteId, date })
    .project({ source: 1 })
    .toArray();

  const completeness: Record<string, boolean> = {};
  for (const metric of metrics) {
    completeness[metric.source] = true;
  }

  // Cast back to Record<MetricSource, boolean> implicitly by usage, but here we just return the map
  return completeness as Record<MetricSource, boolean>;
}
