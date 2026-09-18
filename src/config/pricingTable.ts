/**
 * Configurable, editable pricing table (USD per 1M tokens). This is NOT
 * assumed to stay accurate forever - update it as providers change pricing.
 * Any model not listed here returns `null` cost ("unknown"), never a guess.
 */
export interface ModelPricing {
  inputPer1M: number;
  outputPer1M: number;
}

export const PRICING_TABLE: Record<string, ModelPricing> = {
  // Fill in as needed, e.g.:
  // 'openai:gpt-4o-mini': { inputPer1M: 0.15, outputPer1M: 0.6 },
};

export function estimateCostUsd(
  provider: string,
  model: string,
  inputTokens: number,
  outputTokens: number,
): number | null {
  const entry = PRICING_TABLE[`${provider}:${model}`];
  if (!entry) return null;
  return (inputTokens / 1_000_000) * entry.inputPer1M + (outputTokens / 1_000_000) * entry.outputPer1M;
}
