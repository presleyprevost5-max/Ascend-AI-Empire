import { AuthError } from "./middleware/auth";

// Route handlers
import {
  handleRegister,
  handleLogin,
  handleLogout,
  handleMe,
} from "./routes/auth";
import {
  handleGetBusiness,
  handleUpdateBusiness,
  handleBusinessDashboard,
} from "./routes/businesses";
import {
  handleCreateProgram,
  handleListBusinessPrograms,
  handleGetProgram,
  handleUpdateProgram,
  handleDeactivateProgram,
} from "./routes/programs";
import {
  handleGetMyProfile,
  handleUpdateMyProfile,
  handleApplyToProgram,
  handleMyPrograms,
  handleApproveRejectAffiliate,
} from "./routes/affiliates";
import { handleCreateLink, handleMyLinks } from "./routes/links";
import { errorResponse } from "./lib/response";

// ─── CORS Headers ────────────────────────────────────────────────────

function corsHeaders(): HeadersInit {
  return {
    "Access-Control-Allow-Origin": "http://localhost:5173",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, Cookie",
  };
}

// ─── Route Matching ──────────────────────────────────────────────────

type RouteHandler = (request: Request, ...params: string[]) => Promise<Response>;

interface Route {
  pattern: URLPattern;
  handler: RouteHandler;
}

const routes: Route[] = [];

function addRoute(
  method: string,
  pathname: string,
  handler: RouteHandler
): void {
  routes.push({
    pattern: new URLPattern({ pathname }),
    handler: async (request: Request, ...params: string[]) => {
      if (request.method !== method && request.method !== "OPTIONS") {
        return errorResponse("Method not allowed", 405);
      }
      return handler(request, ...params);
    },
  });
}

// ─── Auth Routes ─────────────────────────────────────────────────────

addRoute("POST", "/api/v1/auth/register", handleRegister);
addRoute("POST", "/api/v1/auth/login", handleLogin);
addRoute("POST", "/api/v1/auth/logout", handleLogout);
addRoute("GET", "/api/v1/auth/me", handleMe);

// ─── Business Routes ─────────────────────────────────────────────────

addRoute("GET", "/api/v1/businesses/:id", (req, _, id) =>
  handleGetBusiness(req, id!)
);
addRoute("PUT", "/api/v1/businesses/:id", (req, _, id) =>
  handleUpdateBusiness(req, id!)
);
addRoute("GET", "/api/v1/businesses/:id/dashboard", (req, _, id) =>
  handleBusinessDashboard(req, id!)
);

// ─── Program Routes ──────────────────────────────────────────────────

addRoute("POST", "/api/v1/programs", handleCreateProgram);
addRoute("GET", "/api/v1/businesses/:id/programs", (req, _, id) =>
  handleListBusinessPrograms(req, id!)
);
addRoute("GET", "/api/v1/programs/:id", (req, _, id) =>
  handleGetProgram(req, id!)
);
addRoute("PUT", "/api/v1/programs/:id", (req, _, id) =>
  handleUpdateProgram(req, id!)
);
addRoute("POST", "/api/v1/programs/:id/deactivate", (req, _, id) =>
  handleDeactivateProgram(req, id!)
);

// ─── Affiliate Routes ────────────────────────────────────────────────

addRoute("GET", "/api/v1/affiliates/me", handleGetMyProfile);
addRoute("PUT", "/api/v1/affiliates/me", handleUpdateMyProfile);
addRoute("POST", "/api/v1/programs/:id/apply", (req, _, id) =>
  handleApplyToProgram(req, id!)
);
addRoute("GET", "/api/v1/affiliates/me/programs", handleMyPrograms);
addRoute(
  "PUT",
  "/api/v1/programs/:id/affiliates/:affiliateId",
  (req, _, progId, affId) =>
    handleApproveRejectAffiliate(req, progId!, affId!)
);

// ─── Link Routes ─────────────────────────────────────────────────────

addRoute("POST", "/api/v1/links", handleCreateLink);
addRoute("GET", "/api/v1/affiliates/me/links", handleMyLinks);

// ─── Server ──────────────────────────────────────────────────────────

const PORT = parseInt(process.env.PORT || "3001", 10);

const server = Bun.serve({
  port: PORT,
  hostname: "0.0.0.0",
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(),
      });
    }

    // Try to match a route
    for (const route of routes) {
      const match = route.pattern.exec(url);
      if (match) {
        try {
          const response = await route.handler(
            request,
            ...match.pathname.groups
              ? Object.values(match.pathname.groups)
              : []
          );

          // Add CORS headers
          const corsResp = new Response(response.body, response);
          for (const [key, value] of Object.entries(corsHeaders())) {
            corsResp.headers.set(key, value);
          }
          return corsResp;
        } catch (err) {
          if (err instanceof AuthError) {
            return errorResponse(err.message, 401);
          }
          console.error("Route error:", err);
          return errorResponse("Internal server error", 500);
        }
      }
    }

    return errorResponse("Not found", 404);
  },
});

console.log(`🚀 Ascnd API server running on http://localhost:${PORT}`);
console.log(`📋 Endpoints:`);
console.log(`   Auth:    /api/v1/auth/{register,login,logout,me}`);
console.log(`   Business: /api/v1/businesses/:id`);
console.log(`   Programs: /api/v1/programs`);
console.log(`   Affiliates: /api/v1/affiliates/me`);
console.log(`   Links:   /api/v1/links`);
