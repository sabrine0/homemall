import type { FutureOutlook, TCLResult, UserProfileInput, ZoneMetrics, ZoneScoreResult } from "@homemall/shared";
import { ScoreProfile } from "../../domain/models/ScoreProfile.js";
import { Zone, type TclInput } from "../../domain/models/Zone.js";

const buildAnonymousZone = (metrics: Partial<ZoneMetrics>) =>
  new Zone({
    id: "zone-temp",
    name: "Zone",
    city: "City",
    centerLat: 0,
    centerLng: 0,
    metrics
  });

export class ZoneAnalysisService {
  computeZoneScore(profile: UserProfileInput, zoneMetrics: ZoneMetrics): ZoneScoreResult {
    const scoreProfile = ScoreProfile.fromUserProfile(profile);
    return buildAnonymousZone(zoneMetrics).computeScore(scoreProfile).toJSON();
  }

  computeTCL(profile: UserProfileInput, option: TclInput, zoneMetrics: ZoneMetrics): TCLResult {
    const scoreProfile = ScoreProfile.fromUserProfile(profile);
    return buildAnonymousZone(zoneMetrics).computeTCL(scoreProfile, option).toJSON();
  }

  computeFutureOutlook(zoneMetrics: ZoneMetrics): FutureOutlook {
    return buildAnonymousZone(zoneMetrics).computeFutureOutlook();
  }
}
