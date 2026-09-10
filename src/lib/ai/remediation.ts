import Anthropic from "@anthropic-ai/sdk";

export interface VulnerabilityMetadata {
  id?: string;
  category?: string;
  title?: string;
  cwe?: string;
  severity?: string;
  language?: string;
  filePath?: string;
  file?: string;
  line?: number;
  lineNumber?: number;
  taintSource?: string;
  taintSink?: string;
  codeSnippet?: string;
  engine?: string;
}

export interface RemediationResult {
  isExploitable: boolean;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  exploitScenario: string;
  remediation: string;
}

/**
 * Strips markdown code blocks (e.g. ```json ... ```) from LLM output.
 */
function stripMarkdownFences(text: string): string {
  let cleaned = text.trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.replace(/^```json\s*/i, "").replace(/\s*```$/, "");
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```\s*/, "").replace(/\s*```$/, "");
  }
  return cleaned.trim();
}

/**
 * Resilient deterministic fallback in case LLM API calls fail, timeout, or key is missing.
 */
export function getFallbackRemediation(vuln: VulnerabilityMetadata): RemediationResult {
  const cwe = String(vuln?.cwe || "").toLowerCase();
  const title = String(vuln?.title || vuln?.category || "").toLowerCase();
  const sink = String(vuln?.taintSink || "").toLowerCase();
  const snippet = String(vuln?.codeSnippet || "").toLowerCase();

  // Check for common sanitize patterns
  const isSanitized =
    snippet.includes("sanitize") ||
    snippet.includes("dompurify") ||
    snippet.includes("preparedstatement");

  if (isSanitized) {
    return {
      isExploitable: false,
      confidence: "LOW",
      exploitScenario: "Sanitizer or boundary validation identified along call chain before sink; risk is currently mitigated.",
      remediation: "Ensure the sanitizer is continuously maintained and covers all character encodings and bypass vectors.",
    };
  }

  if (cwe.includes("89") || title.includes("sql")) {
    return {
      isExploitable: true,
      confidence: "HIGH",
      exploitScenario: "An attacker injects malicious SQL tokens into unescaped user inputs, altering query structure and allowing unauthorized database access or data extraction.",
      remediation: "Replace dynamic SQL string interpolation with parameterized queries or prepared statements (e.g., db.query('SELECT * FROM users WHERE id = $1', [userId])).",
    };
  }

  if (cwe.includes("78") || title.includes("command") || sink.includes("exec")) {
    return {
      isExploitable: true,
      confidence: "HIGH",
      exploitScenario: "User-controlled input reaches system execution sink without validation, permitting arbitrary command injection and remote code execution on the host.",
      remediation: "Avoid invoking shell interpreters. Pass arguments as a structured array using child_process.execFile() or spawn() with shell: false.",
    };
  }

  if (cwe.includes("22") || title.includes("traversal") || title.includes("path")) {
    return {
      isExploitable: true,
      confidence: "HIGH",
      exploitScenario: "Unfiltered path traversal sequences (e.g. '../') in user input allow an attacker to escape the designated folder and read arbitrary sensitive files on the server.",
      remediation: "Resolve paths strictly against an absolute base directory using path.resolve() and verify path.startsWith(baseDir) before file system access.",
    };
  }

  if (cwe.includes("79") || title.includes("xss")) {
    return {
      isExploitable: true,
      confidence: "MEDIUM",
      exploitScenario: "Unencoded user input is rendered into DOM or response context, allowing attackers to execute arbitrary client-side JavaScript in victim browser sessions.",
      remediation: "Contextually encode user output before rendering and enforce an active Content Security Policy (CSP) with DOMPurify sanitization.",
    };
  }

  if (cwe.includes("918") || title.includes("ssrf") || sink.includes("fetch") || sink.includes("http")) {
    return {
      isExploitable: true,
      confidence: "HIGH",
      exploitScenario: "Untrusted destination URL is processed by a server-side HTTP request library, enabling network reconnaissance and access to internal cloud metadata (169.254.169.254).",
      remediation: "Validate destination hosts against a strict domain allowlist and explicitly reject private IP ranges (127.0.0.1, 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16).",
    };
  }

  if (cwe.includes("502") || title.includes("yaml") || title.includes("deserialize")) {
    return {
      isExploitable: true,
      confidence: "HIGH",
      exploitScenario: "Untrusted serialized data deserialized directly can lead to arbitrary object instantiation, prototype pollution, or remote code execution.",
      remediation: "Use safe parser loaders (such as yaml.safeLoad() or JSON.parse()) and validate input schemas using zod or joi.",
    };
  }

  return {
    isExploitable: true,
    confidence: "MEDIUM",
    exploitScenario: "Untrusted input reaches a sensitive execution sink without adequate boundary sanitization, exposing application logic to malicious input vectors.",
    remediation: "Enforce strict schema validation and input sanitization at the entry point prior to delegating data to sensitive execution sinks.",
  };
}

/**
 * Analyzes an individual vulnerability finding using Claude 3.5 Sonnet via @anthropic-ai/sdk.
 * Falls back safely if API is unavailable, times out, or returns malformed data.
 */
export async function analyzeVulnerability(vuln: VulnerabilityMetadata): Promise<RemediationResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN;

  // If no valid Anthropic key provided, return intelligent deterministic fallback immediately
  if (!apiKey || apiKey.includes("placeholder")) {
    return getFallbackRemediation(vuln);
  }

  try {
    const anthropic = new Anthropic({
      apiKey,
      baseURL: process.env.ANTHROPIC_BASE_URL || undefined,
      timeout: 12000, // 12-second timeout
    });

    const prompt = `You are a Principal Application Security Engineer and automated SAST remediation engine. Analyze the following taint path and vulnerability finding from a code scan: ${JSON.stringify(vuln, null, 2)}. Evaluate real-world exploitability, assess confidence, and formulate a concrete code fix. Return ONLY a raw JSON object (no markdown wrappers, no backticks, no preamble) adhering strictly to this schema: { "isExploitable": boolean, "confidence": "HIGH" | "MEDIUM" | "LOW", "exploitScenario": "1-2 concise sentences explaining the attack vector", "remediation": "Concrete code patch, sanitization function, or fix instructions" }`;

    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1024,
      temperature: 0.1,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const contentBlock = response.content[0];
    if (contentBlock && contentBlock.type === "text") {
      const rawText = contentBlock.text;
      const stripped = stripMarkdownFences(rawText);
      const parsed = JSON.parse(stripped);

      if (typeof parsed.isExploitable === "boolean" && parsed.exploitScenario && parsed.remediation) {
        return {
          isExploitable: parsed.isExploitable,
          confidence: parsed.confidence || "MEDIUM",
          exploitScenario: parsed.exploitScenario,
          remediation: parsed.remediation,
        };
      }
    }

    return getFallbackRemediation(vuln);
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.warn(`[Sentinel AI Remediation] LLM call notice for finding ${vuln?.title || vuln?.cwe || "item"}: ${errorMsg}. Using fallback remediation.`);
    return getFallbackRemediation(vuln);
  }
}

/**
 * Batches vulnerability items into chunks (default 4 items) processed concurrently via Promise.all.
 */
export async function batchAnalyzeVulnerabilities(
  items: VulnerabilityMetadata[],
  batchSize: number = 4
): Promise<RemediationResult[]> {
  const results: RemediationResult[] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const chunk = items.slice(i, i + batchSize);
    const chunkResults = await Promise.all(chunk.map((item) => analyzeVulnerability(item)));
    results.push(...chunkResults);
  }
  return results;
}
