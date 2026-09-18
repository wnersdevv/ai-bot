import { EmbedBuilder } from 'discord.js';
import { Types } from 'mongoose';
import { BotInstance } from '../../models/BotInstance';
import { Usage } from '../../models/Usage';
import { HealthManager } from '../HealthManager/HealthManager';
import { ProviderManager } from '../../providers/provider-manager/ProviderManager';
import { APIKey } from '../../models/APIKey';
import { SecretBox } from '../../security/encryption';

const statusEmoji: Record<string, string> = {
  online: '🟢',
  offline: '🔴',
  starting: '🟡',
  stopping: '🟡',
  error: '🔴',
};

/**
 * "WNERSAI CONTROL CENTER" - platform-wide dashboard for one owner: how many
 * of their bots are online/offline, total guilds across them, total AI
 * requests, and live provider health. Everything here is computed from the
 * DB + a live health check, never hardcoded.
 */
export async function renderControlCenter(ownerId: Types.ObjectId, healthManager: HealthManager, encryptionKey: string) {
  const bots = await BotInstance.find({ ownerId });
  const onlineCount = bots.filter((b) => b.status === 'online').length;
  const offlineCount = bots.length - onlineCount;
  const totalGuilds = bots.reduce((sum, b) => sum + b.guildCount, 0);

  const totalRequests = await Usage.countDocuments({ botInstanceId: { $in: bots.map((b) => b._id) } });

  const secretBox = new SecretBox(encryptionKey);
  const providerStatusLines: string[] = [];
  for (const kind of ProviderManager.KNOWN_PROVIDERS) {
    const keyDoc = await APIKey.findOne({ ownerId, provider: kind, isActive: true }).select('+encryptedKey');
    if (!keyDoc) continue;
    const health = await healthManager.check(kind, {
      apiKey: secretBox.decrypt(keyDoc.encryptedKey),
      baseUrl: keyDoc.baseUrl,
      headers: keyDoc.headers,
    });
    const emoji = health.status === 'online' ? '🟢' : health.status === 'degraded' ? '🟡' : '🔴';
    providerStatusLines.push(`${providerLabel(kind)} ${emoji}`);
  }

  const embed = new EmbedBuilder()
    .setTitle('🎛️ WNERSAI CONTROL CENTER')
    .setColor(0x5865f2)
    .addFields(
      { name: 'Bots', value: `${onlineCount} Online\n${offlineCount} Offline`, inline: true },
      { name: 'Total Guilds', value: String(totalGuilds), inline: true },
      { name: 'AI Requests', value: String(totalRequests), inline: true },
      { name: 'Provider Status', value: providerStatusLines.length ? providerStatusLines.join('\n') : '-' },
    );

  return embed;
}

/** "WnersAI #01" per-bot panel with start/stop/restart/settings/stats/logs buttons (buttons wired in components/buttons/botInstancePanel.ts). */
export function renderBotInstancePanelEmbed(bot: {
  name: string;
  status: string;
  guildCount: number;
  userCount: number;
  defaultProviderKind?: string;
  defaultPrefix: string;
  language: string;
}) {
  return new EmbedBuilder()
    .setTitle(bot.name)
    .setColor(0x2f3136)
    .addFields(
      { name: 'Status', value: `${statusEmoji[bot.status] ?? '⚪'} ${bot.status}`, inline: true },
      { name: 'Guilds', value: String(bot.guildCount), inline: true },
      { name: 'Users', value: String(bot.userCount), inline: true },
      { name: 'Provider', value: bot.defaultProviderKind ?? '-', inline: true },
      { name: 'Prefix', value: bot.defaultPrefix, inline: true },
      { name: 'Language', value: bot.language, inline: true },
    );
}

function providerLabel(kind: string): string {
  const names: Record<string, string> = {
    openai: 'OpenAI',
    google: 'Gemini',
    anthropic: 'Claude',
    xai: 'Grok',
    custom: 'Custom',
  };
  return names[kind] ?? kind;
}
