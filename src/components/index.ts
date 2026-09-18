import { Client, Interaction } from 'discord.js';
import { Types } from 'mongoose';
import Redis from 'ioredis';
import { AIService } from '../services/AIService';
import { handleAiSlashCommand } from '../commands/ai/ai';
import { handleModelCommand, handleModelProviderSelected } from '../commands/model/model';
import { handleAyarlaCommand, buildApiKeyModal, handleApiKeyModalSubmit } from '../commands/ayarla/ayarla';
import { handleBellekCommand } from '../commands/bellek/bellek';
import { handleSifirlaCommand } from '../commands/sifirla/sifirla';
import { handleIstatistikCommand } from '../commands/istatistik/istatistik';
import { handleDilCommand } from '../commands/dil/dil';
import { handleYardimCommand } from '../commands/yardim/yardim';
import { handleKontrolCommand } from '../commands/kontrol/kontrol';
import { handleBotlarCommand } from '../commands/botlar/botlar';
import { AIProviderConfig } from '../models/AIProviderConfig';
import { User } from '../models/User';
import { ProviderKind } from '../providers/provider-manager/ProviderManager';
import { logger } from '../utils/logger';
import { HealthManager } from '../bots/HealthManager/HealthManager';
import { BotManagerLike } from '../bots/BotInstance/BotRuntime';
import { handleBotControlButton } from './buttons/botInstancePanel';
import { ToolManager } from '../ai/tools/ToolManager';
import { handleAraclarCommand } from '../commands/araclar/araclar';

/**
 * Wires up all interaction handling (slash commands + buttons + select
 * menus + modals) for one bot's discord.js Client. Kept as a single
 * registration point so BotRuntime doesn't need to know the details.
 */
export function registerInteractionHandlers(
  client: Client,
  aiService: AIService,
  botInstanceId: Types.ObjectId,
  encryptionKey: string,
  redis: Redis,
  botManager: BotManagerLike,
  toolManager: ToolManager,
): void {
  const healthManager = new HealthManager();
  client.on('interactionCreate', async (interaction: Interaction) => {
    try {
      if (interaction.isChatInputCommand()) {
        switch (interaction.commandName) {
          case 'ai':
          case 'sohbet':
            return void (await handleAiSlashCommand(interaction, aiService, botInstanceId));
          case 'model':
            return void (await handleModelCommand(interaction, botInstanceId));
          case 'ayarla':
            return void (await handleAyarlaCommand(interaction));
          case 'bellek':
            return void (await handleBellekCommand(interaction, botInstanceId));
          case 'sifirla':
            return void (await handleSifirlaCommand(interaction, botInstanceId));
          case 'istatistik':
            return void (await handleIstatistikCommand(interaction, botInstanceId));
          case 'dil':
            return void (await handleDilCommand(interaction));
          case 'yardim':
            return void (await handleYardimCommand(interaction));
          case 'kontrol':
            return void (await handleKontrolCommand(interaction, healthManager, encryptionKey));
          case 'botlar':
            return void (await handleBotlarCommand(interaction));
          case 'araclar':
            return void (await handleAraclarCommand(interaction, toolManager, botInstanceId));
          default:
            return;
        }
      }

      if (interaction.isButton()) {
        const parts = interaction.customId.split(':');
        const [ns, group] = parts;
        if (ns !== 'wnersai') return;

        // Bot Instance Panel controls: wnersai:botctl:<action>:<botInstanceId>
        if (group === 'botctl') {
          const [, , action, targetBotId] = parts;
          await handleBotControlButton(
            interaction,
            action as 'start' | 'stop' | 'restart' | 'settings' | 'stats' | 'logs',
            targetBotId,
            botManager,
          );
          return;
        }

        // /ai panel buttons: wnersai:model / wnersai:provider / wnersai:memory / wnersai:reset / wnersai:stats / wnersai:settings
        // Each re-uses the exact same handler as its slash-command equivalent -
        // there is exactly one implementation per flow, just two entry points.
        switch (group) {
          case 'model':
            // handleModelCommand only calls interaction.reply/.user - safe to reuse from a button.
            await handleModelCommand(interaction as any, botInstanceId);
            return;
          case 'provider':
            await handleAyarlaCommand(interaction as any);
            return;
          case 'memory': {
            // Inline instead of handleBellekCommand: that handler expects a
            // slash subcommand (`interaction.options.getSubcommand()`), which
            // a ButtonInteraction does not have.
            const dbUser = await User.findOneAndUpdate(
              { discordId: interaction.user.id },
              { $setOnInsert: { username: interaction.user.username } },
              { upsert: true, new: true },
            );
            const { clearMemories } = await import('../ai/context/ContextManager');
            const deleted = await clearMemories(dbUser._id as Types.ObjectId, botInstanceId);
            const { t } = await import('../localization/i18n');
            await interaction.reply({ content: `${t(dbUser.language, 'memory.cleared')} (${deleted})`, ephemeral: true });
            return;
          }
          case 'reset':
            await handleSifirlaCommand(interaction as any, botInstanceId);
            return;
          case 'stats':
            await handleIstatistikCommand(interaction as any, botInstanceId);
            return;
          case 'settings':
            await handleKontrolCommand(interaction as any, healthManager, encryptionKey);
            return;
          default:
            return;
        }
      }

      if (interaction.isStringSelectMenu()) {
        const [ns, group, step, provider] = interaction.customId.split(':');
        if (ns !== 'wnersai') return;

        if (group === 'ayarla' && step === 'provider') {
          const modal = buildApiKeyModal(interaction.values[0] as ProviderKind);
          await interaction.showModal(modal);
          return;
        }

        if (group === 'model' && step === 'provider') {
          const menu = await handleModelProviderSelected(interaction.user.id, interaction.values[0] as ProviderKind, encryptionKey);
          await interaction.update({ content: 'Model seç:', components: [{ type: 1, components: [menu.toJSON()] } as any] });
          return;
        }

        if (group === 'model' && step === 'select' && provider) {
          const dbUser = await User.findOne({ discordId: interaction.user.id });
          if (dbUser) {
            await AIProviderConfig.findOneAndUpdate(
              { ownerId: dbUser._id, provider, botInstanceId },
              { selectedModel: interaction.values[0] },
            );
          }
          await interaction.update({ content: `✅ Model güncellendi: \`${interaction.values[0]}\``, components: [] });
          return;
        }
        return;
      }

      if (interaction.isModalSubmit()) {
        const [ns, group, step, provider] = interaction.customId.split(':');
        if (ns === 'wnersai' && group === 'ayarla' && step === 'submit' && provider) {
          await handleApiKeyModalSubmit(interaction, provider as ProviderKind, botInstanceId, encryptionKey);
        }
        return;
      }
    } catch (err) {
      logger.error({ err }, 'Interaction handling failed');
      if (interaction.isRepliable() && !interaction.replied) {
        await interaction.reply({ content: '❌ Bir hata oluştu.', ephemeral: true }).catch(() => {});
      }
    }
  });
}
