// MaxDock DB12 Supabase Edge Function: maxdock-ai-brief
// Deploy as index.ts with "Verify JWT with legacy secret" OFF.
// The function validates the live user session and database permission itself.

import { createClient } from "npm:@supabase/supabase-js@2.110.3";

const appUrl = (Deno.env.get("MAXDOCK_APP_URL") ??
  "https://maxsolutionsmiss.github.io/MaxDock/db04").replace(/\/$/, "");
const allowedOrigin = new URL(appUrl).origin;

function corsHeaders(request: Request): Record<string, string> {
  const requestOrigin = request.headers.get("Origin");
  return {
    "Access-Control-Allow-Origin": requestOrigin === allowedOrigin ? requestOrigin : allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Cache-Control": "no-store",
    "Vary": "Origin"
  };
}

function jsonResponse(request: Request, status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {...corsHeaders(request), "Content-Type": "application/json"}
  });
}

type OperationContext = {
  location?: {name?: string};
  range?: {start_date?: string; end_date?: string; days?: number};
  summary?: Record<string, number>;
  by_day?: Array<Record<string, number | string>>;
  by_hour?: Array<Record<string, number | string>>;
  compatibility?: Record<string, number>;
};

function numberValue(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function buildRulesBrief(context: OperationContext) {
  const summary = context.summary ?? {};
  const days = context.by_day ?? [];
  const hours = context.by_hour ?? [];
  const compatibility = context.compatibility ?? {};
  const appointments = numberValue(summary.appointments);
  const cancelled = numberValue(summary.cancelled);
  const priority = numberValue(summary.priority);
  const utilization = numberValue(summary.occupied_utilization_percent);
  const inbound = numberValue(summary.inbound_skids);
  const outbound = numberValue(summary.outbound_skids);
  const cancellationRate = appointments ? cancelled / appointments * 100 : 0;
  const peakDay = [...days].sort((a, b) => numberValue(b.appointments) - numberValue(a.appointments))[0];
  const peakHour = [...hours].sort((a, b) => numberValue(b.appointments) - numberValue(a.appointments))[0];
  const pressures: string[] = [];
  const opportunities: string[] = [];
  const actions: Array<{priority: string; action: string; reason: string}> = [];

  if (peakDay && numberValue(peakDay.appointments) > 0) {
    pressures.push(`${peakDay.date} is the busiest day with ${peakDay.appointments} appointment${numberValue(peakDay.appointments) === 1 ? "" : "s"}.`);
  }
  if (peakHour && numberValue(peakHour.appointments) > 1) {
    pressures.push(`${peakHour.label} is the busiest start hour across the selected period.`);
  }
  if (priority > 0) pressures.push(`${priority} priority load${priority === 1 ? "" : "s"} require advance attention.`);
  if (cancellationRate >= 15) pressures.push(`The cancellation rate is ${cancellationRate.toFixed(1)}%, which may affect labour and dock planning.`);
  if (numberValue(compatibility.docks_without_vehicle_types) > 0) {
    pressures.push(`${compatibility.docks_without_vehicle_types} active dock${numberValue(compatibility.docks_without_vehicle_types) === 1 ? " has" : "s have"} no accepted vehicle type configured.`);
  }
  if (numberValue(compatibility.vehicle_types_without_docks) > 0) {
    pressures.push(`${compatibility.vehicle_types_without_docks} enabled vehicle type${numberValue(compatibility.vehicle_types_without_docks) === 1 ? " has" : "s have"} no compatible dock.`);
  }

  if (utilization < 40) opportunities.push(`Occupied dock utilization is ${utilization.toFixed(1)}%; lower-volume periods may support load consolidation.`);
  if (utilization >= 75) opportunities.push(`Occupied dock utilization is ${utilization.toFixed(1)}%; protect buffer time around the busiest periods.`);
  if (inbound !== outbound) opportunities.push(`${inbound > outbound ? "Inbound" : "Outbound"} volume is heavier by ${Math.abs(inbound - outbound)} skids; align staging space accordingly.`);
  if (!opportunities.length) opportunities.push("The selected period is balanced; continue monitoring daily volume and compatibility coverage.");

  if (peakDay) actions.push({
    priority: "High",
    action: `Review staffing and dock readiness for ${peakDay.date}.`,
    reason: "It carries the highest appointment volume in the selected period."
  });
  if (priority > 0) actions.push({
    priority: "High",
    action: "Pre-stage priority loads and confirm their assigned dock capacity.",
    reason: `${priority} priority load${priority === 1 ? " is" : "s are"} scheduled.`
  });
  actions.push({
    priority: "Normal",
    action: "Review the Operations Queue at the start of the shift and confirm inbound/outbound staging.",
    reason: "The queue is the execution list for the selected operating day."
  });

  return {
    title: `${context.location?.name ?? "MaxDock"} Operations Brief`,
    summary: appointments
      ? `${appointments} appointment${appointments === 1 ? "" : "s"} are in the selected period, with ${inbound} inbound and ${outbound} outbound skids. Occupied dock utilization is ${utilization.toFixed(1)}%.`
      : "No appointments are scheduled in the selected period. The operation has open capacity unless dock blocks are present.",
    pressures: pressures.length ? pressures.slice(0, 4) : ["No significant capacity pressure is visible in the selected period."],
    opportunities: opportunities.slice(0, 4),
    actions: actions.slice(0, 3)
  };
}

const insightSchema = {
  type: "object",
  additionalProperties: false,
  required: ["title", "summary", "pressures", "opportunities", "actions"],
  properties: {
    title: {type: "string"},
    summary: {type: "string"},
    pressures: {type: "array", items: {type: "string"}},
    opportunities: {type: "array", items: {type: "string"}},
    actions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["priority", "action", "reason"],
        properties: {
          priority: {type: "string", enum: ["High", "Normal"]},
          action: {type: "string"},
          reason: {type: "string"}
        }
      }
    }
  }
};

function responseText(payload: Record<string, unknown>): string {
  if (typeof payload.output_text === "string") return payload.output_text;
  const output = Array.isArray(payload.output) ? payload.output : [];
  for (const item of output as Array<Record<string, unknown>>) {
    const content = Array.isArray(item.content) ? item.content : [];
    for (const part of content as Array<Record<string, unknown>>) {
      if (part.type === "output_text" && typeof part.text === "string") return part.text;
    }
  }
  return "";
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", {headers: corsHeaders(request)});
  if (request.method !== "POST") return jsonResponse(request, 405, {error: "Method not allowed."});

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !anonKey) {
    return jsonResponse(request, 500, {error: "The MaxDock insight service is not configured."});
  }

  try {
    const authHeader = request.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) return jsonResponse(request, 401, {error: "A signed-in MaxDock account is required."});

    const userClient = createClient(supabaseUrl, anonKey, {
      global: {headers: {Authorization: `Bearer ${token}`}},
      auth: {persistSession: false, autoRefreshToken: false}
    });
    const {data: userData, error: userError} = await userClient.auth.getUser(token);
    if (userError || !userData.user) {
      return jsonResponse(request, 401, {error: "The MaxDock login session is invalid or expired."});
    }

    const input = await request.json();
    const locationId = String(input.locationId ?? "").trim();
    const startDate = String(input.startDate ?? "").trim();
    const endDate = String(input.endDate ?? "").trim();
    if (!locationId || !/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
      return jsonResponse(request, 400, {error: "A location and valid report date range are required."});
    }

    const {data: context, error: contextError} = await userClient.rpc("get_ai_operations_context", {
      p_location_id: locationId,
      p_start_date: startDate,
      p_end_date: endDate
    });
    if (contextError || !context) {
      return jsonResponse(request, 403, {error: contextError?.message ?? "Operational insight data is unavailable."});
    }

    const rulesBrief = buildRulesBrief(context as OperationContext);
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) {
      return jsonResponse(request, 200, {
        mode: "rules",
        generatedAt: new Date().toISOString(),
        warning: "OpenAI is not configured; MaxDock rules analysis is shown.",
        brief: rulesBrief
      });
    }

    const model = Deno.env.get("OPENAI_MODEL") ?? "gpt-5.6";
    const openAIResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        input: [
          {
            role: "system",
            content: "You are MaxDock's operational planning assistant. Analyze only the aggregate dock-scheduling data provided. Give concise, practical advice for a shipping manager. Do not invent appointments, people, causes, or operational facts. Never claim to have changed the schedule."
          },
          {
            role: "user",
            content: `Create an operations brief from this aggregate MaxDock context:\n${JSON.stringify(context)}`
          }
        ],
        text: {
          format: {
            type: "json_schema",
            name: "maxdock_operations_brief",
            strict: true,
            schema: insightSchema
          }
        },
        max_output_tokens: 1200
      })
    });

    const payload = await openAIResponse.json() as Record<string, unknown>;
    if (!openAIResponse.ok) throw new Error("The AI service did not return an operational brief.");
    const output = responseText(payload);
    if (!output) throw new Error("The AI service returned an empty operational brief.");
    const brief = JSON.parse(output);

    return jsonResponse(request, 200, {
      mode: "ai",
      model,
      generatedAt: new Date().toISOString(),
      brief
    });
  } catch (error: unknown) {
    console.error("MaxDock AI brief error", error);
    return jsonResponse(request, 500, {
      error: error instanceof Error ? error.message : "Unexpected MaxDock insight service error."
    });
  }
});
