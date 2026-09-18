import { evaluate } from 'mathjs';
import { ToolDefinition, ToolError } from '../types';

interface CalculatorArgs {
  expression: string;
}

/**
 * Safe arithmetic evaluator via mathjs (no eval, no code execution). Only
 * numeric/expression syntax is accepted - mathjs itself rejects JS-level
 * constructs, and we additionally cap input length to avoid pathological
 * expressions.
 */
export const calculatorTool: ToolDefinition<CalculatorArgs, { result: string }> = {
  name: 'calculator',
  description: 'Evaluates a mathematical expression (e.g. "2 + 2 * (3 - 1)")',
  timeoutMs: 2_000,
  rateLimitPerMinute: 30,
  validate: (args: unknown) => {
    if (typeof args !== 'object' || args === null || typeof (args as any).expression !== 'string') {
      throw new ToolError('calculator requires a string "expression" argument', 'validation');
    }
    const expression = (args as any).expression as string;
    if (expression.length > 200) {
      throw new ToolError('expression too long', 'validation');
    }
    return { expression };
  },
  execute: async ({ expression }) => {
    try {
      const value = evaluate(expression);
      return { result: String(value) };
    } catch (err) {
      throw new ToolError(`Could not evaluate expression: ${(err as Error).message}`, 'execution');
    }
  },
};
