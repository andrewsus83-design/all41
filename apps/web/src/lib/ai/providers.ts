/** Provider registry — direct first-party APIs only. Model ids are "provider:model". */
export type LlmProvider = "anthropic" | "openai" | "google" | "groq" | "perplexity" | "deepseek" | "xai" | "mistral" | "mock";

export const PROVIDERS: Record<LlmProvider, {
  label: string;
  kind: "anthropic" | "openai-compat" | "google" | "mock";
  baseUrl?: string;
  /** how structured output is requested */
  json: "native" | "json_object" | "prompt";
  modelsUrl?: string;     // for /admin "test key"
  keysUrl?: string;       // where to get a key
  suggested: string[];    // model ids to seed; benchmark decides leaders
}> = {
  anthropic: { label: "Anthropic", kind: "anthropic", json: "native", modelsUrl: "https://api.anthropic.com/v1/models", keysUrl: "https://console.anthropic.com/settings/keys",
    suggested: ["claude-opus-5", "claude-sonnet-5", "claude-haiku-4-5"] },
  openai:    { label: "OpenAI", kind: "openai-compat", baseUrl: "https://api.openai.com/v1", json: "native", modelsUrl: "https://api.openai.com/v1/models", keysUrl: "https://platform.openai.com/api-keys",
    suggested: ["gpt-5", "gpt-5-mini", "gpt-5-nano"] },
  google:    { label: "Google Gemini", kind: "google", json: "native", modelsUrl: "https://generativelanguage.googleapis.com/v1beta/models", keysUrl: "https://aistudio.google.com/apikey",
    suggested: ["gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.5-flash-lite"] },
  groq:      { label: "Groq", kind: "openai-compat", baseUrl: "https://api.groq.com/openai/v1", json: "json_object", modelsUrl: "https://api.groq.com/openai/v1/models", keysUrl: "https://console.groq.com/keys",
    suggested: ["llama-3.3-70b-versatile", "openai/gpt-oss-120b"] },
  perplexity:{ label: "Perplexity", kind: "openai-compat", baseUrl: "https://api.perplexity.ai", json: "prompt", keysUrl: "https://www.perplexity.ai/settings/api",
    suggested: ["sonar", "sonar-pro"] },
  deepseek:  { label: "DeepSeek", kind: "openai-compat", baseUrl: "https://api.deepseek.com", json: "json_object", modelsUrl: "https://api.deepseek.com/models", keysUrl: "https://platform.deepseek.com/api_keys",
    suggested: ["deepseek-chat", "deepseek-reasoner"] },
  xai:       { label: "xAI", kind: "openai-compat", baseUrl: "https://api.x.ai/v1", json: "native", modelsUrl: "https://api.x.ai/v1/models", keysUrl: "https://console.x.ai",
    suggested: ["grok-4", "grok-4-fast"] },
  mistral:   { label: "Mistral", kind: "openai-compat", baseUrl: "https://api.mistral.ai/v1", json: "json_object", modelsUrl: "https://api.mistral.ai/v1/models", keysUrl: "https://console.mistral.ai/api-keys",
    suggested: ["mistral-large-latest", "mistral-small-latest"] },
  mock:      { label: "Mock (offline)", kind: "mock", json: "native", suggested: ["mock-model"] },
};

export const LLM_PROVIDERS = Object.keys(PROVIDERS).filter((p) => p !== "mock") as LlmProvider[];
export function isLlmProvider(p: string): p is LlmProvider { return p in PROVIDERS; }
