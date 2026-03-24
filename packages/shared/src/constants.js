export const GOAL_WEIGHTS = {
    rent: { qualityOfLife: 0.2, mobility: 0.2, health: 0.2, climateRisk: 0.1, services: 0.1, futureValue: 0.2 },
    buy: { qualityOfLife: 0.2, mobility: 0.15, health: 0.15, climateRisk: 0.15, services: 0.1, futureValue: 0.25 },
    sell: { qualityOfLife: 0.1, mobility: 0.1, health: 0.1, climateRisk: 0.1, services: 0.15, futureValue: 0.45 },
    invest: { qualityOfLife: 0.1, mobility: 0.1, health: 0.1, climateRisk: 0.1, services: 0.1, futureValue: 0.5 },
    build: { qualityOfLife: 0.15, mobility: 0.15, health: 0.1, climateRisk: 0.2, services: 0.1, futureValue: 0.3 },
    manage_rental: { qualityOfLife: 0.15, mobility: 0.2, health: 0.1, climateRisk: 0.1, services: 0.15, futureValue: 0.3 }
};
export const API_ROUTES = {
    auth: {
        signup: "/api/auth/signup",
        login: "/api/auth/login",
        me: "/api/auth/me",
        logout: "/api/auth/logout"
    },
    profile: "/api/profile",
    zones: "/api/zones",
    analyzeZones: "/api/analyze/zones",
    analyzeTcl: "/api/analyze/tcl",
    analyzeCompare: "/api/analyze/compare",
    report: "/api/report",
    reportPdf: "/api/report/pdf"
};
