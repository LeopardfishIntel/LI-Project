/** Direct engine - the real web fetch and the real AI call (gemini-2.5-flash, the model the site already uses). */
import { getAI } from "@/ai/genkit";
import type { DirectDeps, PageResult, AiJob } from "./directEngine";
import type { Anchor } from "./directRules";

const UA = "Mozilla/5.0 (compatible; LeopardfishIntelBot/1.0; +https://leopardfishintel.com)";

export async function fetchPageReal(url: string): Promise<PageResult> {
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 12000);
  try {
    const res = await fetch(url, { redirect: "follow", signal: ctl.signal, headers: { "User-Agent": UA, Accept: "text/html,application/pdf,*/*" } });
    const ct = String(res.headers.get("content-type") || "").toLowerCase();
    const html = ct.includes("pdf") ? "" : Buffer.from(await res.arrayBuffer()).subarray(0, 1_500_000).toString("utf8");
    return { ok: res.ok, status: res.status, url: res.url, html, contentType: ct };
  } catch (e: any) {
    return { ok: false, status: 0, url, html: "", contentType: "", err: String(e?.name === "AbortError" ? "timeout" : e?.cause?.code || e?.message || e) };
  } finally { clearTimeout(t); }
}

export async function askAiReal(i: { schoolName: string; pageUrl: string; text: string; links: Anchor[] }): Promise<{ jobs: AiJob[]; tokensIn: number; tokensOut: number }> {
  const linkLines = i.links.map((l) => `- ${l.label || "(no text)"} -> ${l.href}`).join("\n").slice(0, 8000);
  const prompt = `You read the careers page of the school "${i.schoolName}" (${i.pageUrl}). Below is the page text and the links found on it.
List ONLY vacancies that are explicitly advertised in this text or in these links. Never invent or guess a job, and never use knowledge from outside the text.
Do NOT list: tenders or supplier notices, policies, application forms, job-board home pages, general "work with us" pages, or news.
For each vacancy give: "title" (exactly as written on the page), "applyUrl" (copy exactly from the links below if the job has its own link, otherwise null), "closingDate" (as written, only if it is clearly the last day to apply, otherwise null), "evidence" (a short quote from the text that shows it is a vacancy).
If the page says there are no vacancies, or lists none, return {"jobs":[]}.
Return JSON only, no markdown: {"jobs":[{"title":"","applyUrl":null,"closingDate":null,"evidence":""}]}

PAGE TEXT:
${i.text}

LINKS:
${linkLines}`;
  const response: any = await getAI().generate({ model: "googleai/gemini-2.5-flash", prompt, config: { temperature: 0 } });
  const u = response.usage || {};
  const raw = String(response.text || "").replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  let jobs: AiJob[] = [];
  try { jobs = JSON.parse(raw).jobs || []; } catch { jobs = []; }
  return { jobs, tokensIn: Number(u.inputTokens || 0), tokensOut: Number(u.outputTokens || 0) };
}

export const realDeps: DirectDeps = { fetchPage: fetchPageReal, askAI: askAiReal };
