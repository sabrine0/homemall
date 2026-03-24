import type { Goal } from "./types";
export declare const GOAL_WEIGHTS: Record<Goal, {
    qualityOfLife: number;
    mobility: number;
    health: number;
    climateRisk: number;
    services: number;
    futureValue: number;
}>;
export declare const API_ROUTES: {
    readonly auth: {
        readonly signup: "/api/auth/signup";
        readonly login: "/api/auth/login";
        readonly me: "/api/auth/me";
        readonly logout: "/api/auth/logout";
    };
    readonly profile: "/api/profile";
    readonly zones: "/api/zones";
    readonly analyzeZones: "/api/analyze/zones";
    readonly analyzeTcl: "/api/analyze/tcl";
    readonly analyzeCompare: "/api/analyze/compare";
    readonly report: "/api/report";
    readonly reportPdf: "/api/report/pdf";
};
