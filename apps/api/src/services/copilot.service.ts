import type { Goal, UserProfileInput } from "@homemall/shared";
import { AnalysisService } from "./analysis.service.js";
import { DEFAULT_PROFILE } from "./default-profile.js";
import { ZoneService } from "./zone.service.js";

interface CopilotContext {
  goal?: Goal;
  budgetMin?: number;
  budgetMax?: number;
  workLat?: number | null;
  workLng?: number | null;
  mobilityModes?: string[];
  sensitivities?: {
    noise: number;
    heat: number;
    allergies: number;
  };
}

interface ParsedIntent {
  goal?: Goal;
  city?: string;
  budgetMin?: number;
  budgetMax?: number;
  quiet: boolean;
  lowAllergy: boolean;
  green: boolean;
  safe: boolean;
  compareZoneHints: string[];
}

export class CopilotService {
  private analysisService = new AnalysisService();
  private zoneService = new ZoneService();

  private parseIntent(message: string): ParsedIntent {
    const text = message.toLowerCase();
    const goal: Goal | undefined = text.includes("invest")
      ? "invest"
      : text.includes("build")
        ? "build"
        : text.includes("buy")
          ? "buy"
          : text.includes("sell")
            ? "sell"
            : text.includes("rent")
              ? "rent"
              : undefined;

    const budgetMatches = [...text.matchAll(/\b(\d{3,6})\b/g)].map((match) => Number(match[1]));
    let budgetMin: number | undefined;
    let budgetMax: number | undefined;
    if (budgetMatches.length >= 2) {
      budgetMin = Math.min(budgetMatches[0], budgetMatches[1]);
      budgetMax = Math.max(budgetMatches[0], budgetMatches[1]);
    } else if (budgetMatches.length === 1) {
      budgetMax = budgetMatches[0];
      budgetMin = Math.round(budgetMatches[0] * 0.65);
    }

    const city = text.includes("casablanca")
      ? "casablanca"
      : text.includes("rabat")
        ? "rabat"
        : text.includes("marrakech")
          ? "marrakech"
          : undefined;

    const compareZoneHints =
      text.includes("compare") || text.includes("vs")
        ? text
            .replace(/compare/gi, "")
            .split(/vs|versus|and/gi)
            .map((item) => item.trim())
            .filter((item) => item.length > 2)
            .slice(0, 2)
        : [];

    return {
      goal,
      city,
      budgetMin,
      budgetMax,
      quiet: /\b(quiet|calm|low noise)\b/.test(text),
      lowAllergy: /\b(allergy|low pollen|pollen)\b/.test(text),
      green: /\b(green|parks|nature)\b/.test(text),
      safe: /\b(safe|safety|low flood|flood risk)\b/.test(text),
      compareZoneHints
    };
  }

  private buildProfile(context: CopilotContext | undefined, intent: ParsedIntent): UserProfileInput {
    const base = DEFAULT_PROFILE;
    return {
      goal: context?.goal ?? intent.goal ?? base.goal,
      budgetMin: context?.budgetMin ?? intent.budgetMin ?? base.budgetMin,
      budgetMax: context?.budgetMax ?? intent.budgetMax ?? base.budgetMax,
      workLat: context?.workLat ?? base.workLat,
      workLng: context?.workLng ?? base.workLng,
      mobilityModes: context?.mobilityModes?.length ? context.mobilityModes : base.mobilityModes,
      sensitivities: {
        noise: context?.sensitivities?.noise ?? (intent.quiet ? 4 : base.sensitivities.noise),
        heat: context?.sensitivities?.heat ?? (intent.green ? 2 : base.sensitivities.heat),
        allergies: context?.sensitivities?.allergies ?? (intent.lowAllergy ? 4 : base.sensitivities.allergies)
      }
    };
  }

  private buildBadges(input: {
    quiet: boolean;
    transitFriendly: boolean;
    allergyFriendly: boolean;
    floodRiskHigh: boolean;
  }) {
    const badges: string[] = [];
    if (input.quiet) badges.push("Quiet");
    if (input.transitFriendly) badges.push("Good transit");
    if (input.allergyFriendly) badges.push("Low pollen");
    if (!input.floodRiskHigh) badges.push("Lower flood risk");
    return badges.slice(0, 4);
  }

  private toTitleCase(text: string) {
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
  }

  private escapeRegExp(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  private detectCityFromMessage(message: string, availableCities: string[]) {
    const normalized = message.toLowerCase();
    const sortedCities = [...availableCities].sort((a, b) => b.length - a.length);

    for (const city of sortedCities) {
      const escapedCity = this.escapeRegExp(city.toLowerCase()).replace(/\s+/g, "\\s+");
      if (city.toLowerCase() === "sale") {
        const saleWithPreposition = new RegExp(`\\b(in|at|near|around)\\s+${escapedCity}\\b`, "i");
        if (saleWithPreposition.test(normalized)) {
          return city.toLowerCase();
        }
        continue;
      }

      const directPattern = new RegExp(`\\b${escapedCity}\\b`, "i");
      if (directPattern.test(normalized)) {
        return city.toLowerCase();
      }
    }

    return undefined;
  }

  private hasHousingIntent(message: string, intent: ParsedIntent, requestedCity?: string) {
    if (
      intent.goal ||
      intent.city ||
      requestedCity ||
      intent.budgetMin !== undefined ||
      intent.budgetMax !== undefined ||
      intent.quiet ||
      intent.lowAllergy ||
      intent.green ||
      intent.safe ||
      intent.compareZoneHints.length > 0
    ) {
      return true;
    }

    const housingKeywords = [
      "zone",
      "area",
      "neighborhood",
      "city",
      "budget",
      "price",
      "rent",
      "buy",
      "sell",
      "invest",
      "build",
      "commute",
      "school",
      "quiet",
      "noise",
      "allergy",
      "pollen",
      "safe",
      "flood",
      "walk",
      "transit",
      "compare",
      "tcl",
      "cost",
      "home",
      "house",
      "apartment"
    ];

    return housingKeywords.some((keyword) => message.includes(keyword));
  }

  private smallTalkReply(message: string):
    | {
        assistantText: string;
        followUpQuestions: string[];
      }
    | undefined {
    const normalized = message.trim().toLowerCase();
    const words = normalized.split(/\s+/).filter(Boolean);
    const isShortMessage = words.length <= 4;

    const greetingPattern = /\b(hi|hello|hey|yo|salam|salut|hola)\b/;
    if (isShortMessage && greetingPattern.test(normalized)) {
      return {
        assistantText:
          "Hi. I can help you pick the best zones. Share your city, budget, and priorities, and I will tailor the suggestions.",
        followUpQuestions: [
          "Which city should we focus on?",
          "What is your monthly budget range?",
          "What matters most: quiet, transit, safety, or low allergy?"
        ]
      };
    }

    if (/\b(thanks|thank you|thx|merci|shukran)\b/.test(normalized)) {
      return {
        assistantText:
          "You are welcome. Send your city, budget, and top priorities and I will refine the recommendations.",
        followUpQuestions: []
      };
    }

    if (/(what can you do|help|how does this work|who are you)/.test(normalized)) {
      return {
        assistantText:
          "I can recommend zones, compare options, and prepare TCL comparisons. Tell me your city, budget, and priorities to start.",
        followUpQuestions: [
          "Do you want to rent, buy, or invest?",
          "Which city should I search in?"
        ]
      };
    }

    return undefined;
  }

  async chat(input: { message: string; context?: CopilotContext }) {
    const intent = this.parseIntent(input.message);
    const normalizedMessage = input.message.trim().toLowerCase();
    const smallTalk = this.smallTalkReply(input.message);
    if (smallTalk) {
      return {
        assistantText: smallTalk.assistantText,
        recommendations: [],
        followUpQuestions: smallTalk.followUpQuestions
      };
    }

    const profile = this.buildProfile(input.context, intent);
    const recommendations = await this.analysisService.analyzeZones(profile, 500);
    const zones = await this.zoneService.list(profile);

    const zoneMap = new Map(zones.map((zone) => [zone.id, zone]));
    const availableCities = Array.from(new Set(recommendations.map((item) => item.city)));
    const requestedCity = intent.city ?? this.detectCityFromMessage(normalizedMessage, availableCities);
    const housingIntent = this.hasHousingIntent(normalizedMessage, intent, requestedCity);

    if (!housingIntent) {
      return {
        assistantText:
          "I can help with housing decisions. Tell me your city, budget range, and priorities, and I will suggest the best zones.",
        recommendations: [],
        followUpQuestions: [
          "Which city should I search in?",
          "What is your budget range?"
        ]
      };
    }

    let filtered = recommendations;

    if (requestedCity) {
      filtered = filtered.filter((item) => item.city.toLowerCase().includes(requestedCity));
    }
    if (intent.quiet) {
      filtered = filtered.filter((item) => item.metrics.noiseIndex <= 50);
    }
    if (intent.lowAllergy) {
      filtered = filtered.filter((item) => item.metrics.pollenIndex <= 45);
    }
    if (intent.safe) {
      filtered = filtered.filter((item) => item.metrics.floodRiskIndex <= 45);
    }

    const shouldFallbackToUnfiltered = !requestedCity && filtered.length === 0;
    const ranked = shouldFallbackToUnfiltered ? recommendations : filtered;

    const top = ranked.slice(0, 3).map((item) => {
      const summary = zoneMap.get(item.zoneId);
      const badges = this.buildBadges({
        quiet: summary?.flags.quiet ?? item.metrics.noiseIndex <= 45,
        transitFriendly: summary?.flags.transitFriendly ?? item.metrics.transitIndex >= 65,
        allergyFriendly: summary?.flags.allergyFriendly ?? item.metrics.pollenIndex <= 40,
        floodRiskHigh: summary?.flags.floodRiskHigh ?? item.metrics.floodRiskIndex >= 55
      });

      return {
        zoneId: item.zoneId,
        name: item.zoneName,
        score: item.score.total,
        badges,
        why: item.score.explanations.slice(0, 3)
      };
    });

    const followUpQuestions: string[] = [];
    if (!input.context?.budgetMin && !input.context?.budgetMax && !intent.budgetMax) {
      followUpQuestions.push("What budget range should I optimize for?");
    }
    if (!requestedCity) {
      followUpQuestions.push("Which city should I focus on?");
    }
    if (requestedCity && top.length === 0 && availableCities.length > 0) {
      const preview = availableCities.slice(0, 12);
      const remaining = availableCities.length - preview.length;
      const suffix = remaining > 0 ? `, and ${remaining} more` : "";
      followUpQuestions.push(`I currently have zone data for: ${preview.join(", ")}${suffix}.`);
    }

    let tclSuggestion:
      | {
          optionAZoneId: string;
          optionBZoneId: string;
        }
      | undefined;

    if (intent.compareZoneHints.length >= 2) {
      const rawZones = await this.zoneService.listRaw();
      const findMatch = (hint: string) =>
        rawZones.find((zone) => zone.name.toLowerCase().includes(hint.toLowerCase().trim()));
      const a = findMatch(intent.compareZoneHints[0]);
      const b = findMatch(intent.compareZoneHints[1]);
      if (a && b) {
        tclSuggestion = {
          optionAZoneId: a.id,
          optionBZoneId: b.id
        };
      }
    }

    if (!tclSuggestion && top.length >= 2) {
      tclSuggestion = {
        optionAZoneId: top[0].zoneId,
        optionBZoneId: top[1].zoneId
      };
    }

    const assistantText =
      top.length > 0
        ? `I found ${top.length} strong zone matches${requestedCity ? ` in ${this.toTitleCase(requestedCity)}` : ""}. The current best fit is ${top[0].name} with score ${top[0].score}.`
        : requestedCity
          ? `I could not find zone matches in ${this.toTitleCase(requestedCity)}. Try another city or relax one preference.`
          : "I could not find strong matches with the current input. Try relaxing one preference.";

    return {
      assistantText,
      recommendations: top,
      followUpQuestions,
      tclSuggestion
    };
  }
}
