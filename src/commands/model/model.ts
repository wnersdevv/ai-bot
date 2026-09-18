import {
  ActionRowBuilder,
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
} from 'discord.js';
import { Types } from 'mongoose';
import { AIProviderConfig, AIModelCache } from '../../models/AIProviderConfig';
import { APIKey } from '../../models/APIKey';
import { User } from '../../models/User';
import { SecretBox } from '../../security/encryption';
import { ProviderManager, ProviderKind } from '../../providers/provider-manager/ProviderManager';

export const modelCommandData = new SlashCommandBuilder().setName('model').setDescription('Aktif AI modelini seç');
export const modellerCommandData = new SlashCommandBuilder()
  .setName('modeller')
  .setDescription('Sağlayıcının desteklediği modelleri listele');

/**
 * /model -> shows a select menu of the user's ENABLED providers first (see spec's
 * two-step select: provider -> model). Selecting a provider triggers a follow-up
 * select populated from AIModelCache (refreshed from the live provider API - never
 * a hardcoded model list).
 */
export async function handleModelCommand(
  interaction: ChatInputCommandInteraction,
  botInstanceId: Types.ObjectId,
): Promise<void> {
  const dbUser = await User.findOne({ discordId: interaction.user.id });
  if (!dbUser) {
    await interaction.reply({ content: '❌ Önce /ai komutunu bir kez çalıştırın.', ephemeral: true });
    return;
  }

  const configs = await AIProviderConfig.find({ ownerId: dbUser._id, botInstanceId, enabled: true });
  if (!configs.length) {
    await interaction.reply({ content: '❌ Henüz bir sağlayıcı ayarlamadınız. /ayarla kullanın.', ephemeral: true });
    return;
  }

  const menu = new StringSelectMenuBuilder()
    .setCustomId('wnersai:model:provider')
    .setPlaceholder('🌍 Yapay Zekâ Modeli Seç')
    .addOptions(
      configs.map((c) => ({
        label: providerDisplayName(c.provider as ProviderKind),
        description: `Seçili model: ${c.selectedModel}`,
        value: c.provider,
      })),
    );

  const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu);
  await interaction.reply({ content: '🤖 Sağlayıcı seç:', components: [row], ephemeral: true });
}

/**
 * Second step of /model: once a provider is chosen, populate a model select
 * menu from AIModelCache. If the cache for this provider is empty/stale,
 * refresh it live from the provider's models() endpoint first.
 */
export async function handleModelProviderSelected(
  discordUserId: string,
  provider: ProviderKind,
  encryptionKey: string,
): Promise<StringSelectMenuBuilder> {
  const dbUser = await User.findOne({ discordId: discordUserId });
  if (!dbUser) throw new Error('User not found');

  const secretBox = new SecretBox(encryptionKey);
  let cached = await AIModelCache.find({ provider }).limit(25);

  const isStale = !cached.length || Date.now() - cached[0].fetchedAt.getTime() > 6 * 60 * 60 * 1000;
  if (isStale) {
    const keyDoc = await APIKey.findOne({ ownerId: dbUser._id, provider }).select('+encryptedKey');
    if (keyDoc) {
      const adapter = ProviderManager.create(provider, {
        apiKey: secretBox.decrypt(keyDoc.encryptedKey),
        baseUrl: keyDoc.baseUrl,
        headers: keyDoc.headers,
      });
      try {
        const live = await adapter.models();
        await Promise.all(
          live.slice(0, 25).map((m) =>
            AIModelCache.findOneAndUpdate(
              { provider, modelId: m.id },
              { displayName: m.displayName, contextWindow: m.contextWindow, fetchedAt: new Date() },
              { upsert: true },
            ),
          ),
        );
        cached = await AIModelCache.find({ provider }).limit(25);
      } catch {
        // keep serving whatever was cached, even if stale, rather than failing the interaction
      }
    }
  }

  return new StringSelectMenuBuilder()
    .setCustomId(`wnersai:model:select:${provider}`)
    .setPlaceholder('Model seç')
    .addOptions(cached.slice(0, 25).map((m) => ({ label: m.displayName, value: m.modelId })));
}

function providerDisplayName(kind: ProviderKind): string {
  const names: Record<ProviderKind, string> = {
    openai: 'OpenAI',
    google: 'Google Gemini',
    anthropic: 'Anthropic Claude',
    xai: 'xAI Grok',
    custom: 'Custom',
  };
  return names[kind];
}
