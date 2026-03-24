export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "HomeMall API",
    version: "1.0.0",
    description: "REST API for HomeMall housing decision platform"
  },
  servers: [
    {
      url: "http://localhost:4000",
      description: "Local"
    }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT"
      }
    }
  },
  paths: {
    "/api/auth/signup": {
      post: {
        summary: "Sign up",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  email: { type: "string", format: "email" },
                  password: { type: "string", minLength: 8 }
                },
                required: ["email", "password"]
              }
            }
          }
        },
        responses: {
          "201": { description: "Created" }
        }
      }
    },
    "/api/auth/login": {
      post: {
        summary: "Login",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  email: { type: "string", format: "email" },
                  password: { type: "string", minLength: 8 }
                },
                required: ["email", "password"]
              }
            }
          }
        },
        responses: {
          "200": { description: "OK" }
        }
      }
    },
    "/api/auth/forgot-password": {
      post: {
        summary: "Request password reset verification code",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  email: { type: "string", format: "email" }
                },
                required: ["email"]
              }
            }
          }
        },
        responses: {
          "200": { description: "OK" }
        }
      }
    },
    "/api/auth/forgot-password/verify": {
      post: {
        summary: "Verify password reset code",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  email: { type: "string", format: "email" },
                  code: { type: "string", pattern: "^\\d{6}$" }
                },
                required: ["email", "code"]
              }
            }
          }
        },
        responses: {
          "200": { description: "OK" }
        }
      }
    },
    "/api/auth/reset-password": {
      post: {
        summary: "Reset password with verified code",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  email: { type: "string", format: "email" },
                  code: { type: "string", pattern: "^\\d{6}$" },
                  newPassword: { type: "string", minLength: 8 }
                },
                required: ["email", "code", "newPassword"]
              }
            }
          }
        },
        responses: {
          "200": { description: "OK" }
        }
      }
    },
    "/api/auth/me": {
      get: {
        summary: "Current user",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "OK" }
        }
      },
      patch: {
        summary: "Update current user profile",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  displayName: { type: "string", maxLength: 80 },
                  avatarUrl: { type: "string", format: "uri", maxLength: 2000 },
                  contactPhone: { type: "string", maxLength: 32 },
                  contactWhatsApp: { type: "string", maxLength: 32 },
                  contactInstagram: { type: "string", maxLength: 200 },
                  contactFacebook: { type: "string", maxLength: 200 },
                  contactWebsite: { type: "string", format: "uri", maxLength: 2000 }
                }
              }
            }
          }
        },
        responses: {
          "200": { description: "OK" }
        }
      }
    },
    "/api/profile": {
      get: {
        summary: "Get onboarding profile",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "OK" }
        }
      },
      post: {
        summary: "Create or update profile (legacy alias)",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "OK" }
        }
      }
    },
    "/api/profile/save": {
      post: {
        summary: "Create or update profile",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "OK" }
        }
      }
    },
    "/api/zones": {
      get: {
        summary: "List zones",
        responses: {
          "200": { description: "OK" }
        }
      }
    },
    "/api/zones/{id}": {
      get: {
        summary: "Zone details",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "OK" }
        }
      }
    },
    "/api/analyze/zones": {
      post: {
        summary: "Analyze zones for profile",
        responses: {
          "200": { description: "OK" }
        }
      }
    },
    "/api/analyze/tcl": {
      post: {
        summary: "Compute True Cost of Living",
        responses: {
          "200": { description: "OK" }
        }
      }
    },
    "/api/analyze/compare": {
      post: {
        summary: "Compare two options",
        responses: {
          "200": { description: "OK" }
        }
      }
    },
    "/api/copilot/chat": {
      post: {
        summary: "HomeMall Copilot chat recommendations",
        responses: {
          "200": { description: "OK" }
        }
      }
    },
    "/api/search/ai": {
      post: {
        summary: "AI real-estate search (rule-based parser + zone ranking)",
        responses: {
          "200": { description: "OK" }
        }
      }
    },
    "/api/favorites": {
      get: {
        summary: "List current user favorites",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "OK" }
        }
      },
      post: {
        summary: "Save a zone as favorite / report candidate",
        security: [{ bearerAuth: [] }],
        responses: {
          "201": { description: "Created" }
        }
      }
    },
    "/api/listings/{id}/report": {
      post: {
        summary: "Report a listing with a reason",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  reason: { type: "string", minLength: 3, maxLength: 1000 }
                },
                required: ["reason"]
              }
            }
          }
        },
        responses: {
          "201": { description: "Created" }
        }
      }
    },
    "/api/listings/{id}": {
      patch: {
        summary: "Update one of current user's listings",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "OK" }
        }
      },
      delete: {
        summary: "Delete one of current user's listings",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "204": { description: "Deleted" }
        }
      }
    },
    "/api/report": {
      get: {
        summary: "Decision report JSON",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "OK" }
        }
      }
    },
    "/api/report/pdf": {
      get: {
        summary: "Decision report PDF",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "PDF file" }
        }
      }
    },
    "/api/admin/login": {
      post: {
        summary: "Admin login",
        responses: {
          "200": { description: "OK" }
        }
      }
    },
    "/api/admin/dashboard": {
      get: {
        summary: "Admin dashboard stats",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "OK" }
        }
      }
    },
    "/api/admin/zones": {
      get: {
        summary: "Admin list zones",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "OK" }
        }
      },
      post: {
        summary: "Admin create zone",
        security: [{ bearerAuth: [] }],
        responses: {
          "201": { description: "Created" }
        }
      }
    },
    "/api/admin/zones/{id}": {
      get: {
        summary: "Admin get zone",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "OK" }
        }
      },
      put: {
        summary: "Admin update zone",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "OK" }
        }
      },
      delete: {
        summary: "Admin delete zone",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "204": { description: "Deleted" }
        }
      }
    },
    "/api/admin/zones/{id}/metrics": {
      get: {
        summary: "Admin get zone metrics",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "OK" }
        }
      },
      put: {
        summary: "Admin update zone metrics",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "OK" }
        }
      }
    },
    "/api/admin/import": {
      post: {
        summary: "Admin import zones/metrics from CSV/JSON",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  source: { type: "string", enum: ["generic", "avito"], default: "generic" },
                  format: { type: "string", enum: ["csv", "json"] },
                  content: { type: "string" }
                },
                required: ["format", "content"]
              }
            }
          }
        },
        responses: {
          "200": { description: "OK" }
        }
      }
    },
    "/api/admin/users": {
      get: {
        summary: "Admin list users",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "OK" }
        }
      }
    },
    "/api/admin/reports": {
      get: {
        summary: "Admin list decision reports and listing reports",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "OK" }
        }
      }
    },
    "/api/admin/reports/export": {
      get: {
        summary: "Admin export reports as JSON",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "JSON file" }
        }
      }
    }
  }
};
