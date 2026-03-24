import type { ZoneDetails } from "@homemall/shared";

export const estimateZoneTcl = (zone: ZoneDetails) => {
  const housing = 3200 + zone.metrics.futureValueIndex * 85;
  const commute = Math.max(160, 1400 - zone.metrics.transitIndex * 11);
  const utilities = 260 + zone.metrics.heatIndex * 9;
  const health =
    150 +
    (100 - zone.metrics.airQualityIndex) * 8 +
    zone.metrics.pollenIndex * 6;
  const risk =
    zone.metrics.floodRiskIndex * 18 + zone.metrics.zoningRiskIndex * 12;
  const services = Math.max(
    0,
    (100 - (zone.metrics.walkIndex + zone.metrics.transitIndex) / 2) * 12,
  );

  return {
    housing,
    commute,
    utilities,
    health,
    risk,
    services,
    total: housing + commute + utilities + health + risk + services,
  };
};

export const buildZoneRiskAlerts = (zone: ZoneDetails) => {
  const alerts: string[] = [];
  if (zone.metrics.pollenIndex > 55)
    alerts.push("High pollen days can impact allergy-sensitive households.");
  if (zone.metrics.heatIndex > 60)
    alerts.push("Summer heat exposure is above comfort baseline.");
  if (zone.metrics.floodRiskIndex > 45)
    alerts.push("Flood risk should be included in insurance estimates.");
  if (zone.metrics.zoningRiskIndex > 40)
    alerts.push("Zoning change risk can affect long-term certainty.");
  return alerts;
};
