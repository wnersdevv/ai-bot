import { createCanvas } from '@napi-rs/canvas';
import { AttachmentBuilder } from 'discord.js';

/**
 * Canvas is cached in memory per (provider+model) combo for the static parts
 * (background/branding) - only the dynamic text is redrawn per response, so
 * repeated cards don't re-render the whole background from scratch.
 */
const backgroundCache = new Map<string, ReturnType<typeof createCanvas>>();

function getBackground(width: number, height: number): ReturnType<typeof createCanvas> {
  const key = `${width}x${height}`;
  const cached = backgroundCache.get(key);
  if (cached) return cached;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#1a1b2e');
  gradient.addColorStop(1, '#2d1b4e');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  backgroundCache.set(key, canvas);
  return canvas;
}

export function renderAIResponseCard(params: {
  provider: string;
  model: string;
  responseTimeMs: number;
  responsePreview: string;
}): AttachmentBuilder {
  const width = 800;
  const height = 300;
  const bg = getBackground(width, height);

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(bg as any, 0, 0);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 28px sans-serif';
  ctx.fillText('WNERSDEV', 30, 45);
  ctx.font = 'bold 20px sans-serif';
  ctx.fillStyle = '#a78bfa';
  ctx.fillText('WNERSAI', 30, 75);

  ctx.fillStyle = '#d1d5db';
  ctx.font = '16px sans-serif';
  ctx.fillText(`Provider: ${params.provider}`, 30, 120);
  ctx.fillText(`Model: ${params.model}`, 30, 145);
  ctx.fillText(`Response Time: ${(params.responseTimeMs / 1000).toFixed(2)}s`, 30, 170);

  ctx.fillStyle = '#ffffff';
  ctx.font = '15px sans-serif';
  wrapText(ctx, params.responsePreview, 30, 210, width - 60, 20);

  const buffer = canvas.toBuffer('image/png');
  return new AttachmentBuilder(buffer, { name: 'wnersai-response.png' });
}

export function renderUsageCard(params: { requests: number; tokens: number; successRate: number }): AttachmentBuilder {
  const width = 600;
  const height = 260;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#0f172a');
  gradient.addColorStop(1, '#1e293b');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText('WNERSDEV', 24, 40);
  ctx.font = 'bold 18px sans-serif';
  ctx.fillStyle = '#38bdf8';
  ctx.fillText('WNERSAI ANALYTICS', 24, 65);

  drawStat(ctx, 'Requests', String(params.requests), 24, 130);
  drawStat(ctx, 'Tokens', formatTokens(params.tokens), 224, 130);
  drawStat(ctx, 'Success Rate', `${params.successRate.toFixed(1)}%`, 424, 130);

  const buffer = canvas.toBuffer('image/png');
  return new AttachmentBuilder(buffer, { name: 'wnersai-usage.png' });
}

function drawStat(ctx: any, label: string, value: string, x: number, y: number) {
  ctx.fillStyle = '#94a3b8';
  ctx.font = '14px sans-serif';
  ctx.fillText(label, x, y);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 28px sans-serif';
  ctx.fillText(value, x, y + 32);
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

function wrapText(ctx: any, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
  const words = text.split(' ');
  let line = '';
  let cursorY = y;
  const maxLines = 4;
  let lines = 0;

  for (const word of words) {
    const testLine = line + word + ' ';
    if (ctx.measureText(testLine).width > maxWidth && line !== '') {
      ctx.fillText(line, x, cursorY);
      line = word + ' ';
      cursorY += lineHeight;
      lines += 1;
      if (lines >= maxLines) {
        ctx.fillText(line.trim() + '…', x, cursorY);
        return;
      }
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, cursorY);
}
