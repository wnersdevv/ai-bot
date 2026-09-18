import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ButtonInteraction, EmbedBuilder } from 'discord.js';
import { Types } from 'mongoose';
import { BotManagerLike } from '../../bots/BotInstance/BotRuntime';
import { BotInstance } from '../../models/BotInstance';
import { User } from '../../models/User';
import { renderBotInstancePanelEmbed } from '../../bots/BotManager/ControlCenter';
import { AuditLog } from '../../models/Usage';
import { logger } from '../../utils/logger';

export function buildBotInstanceButtons(botInstanceId: string) {
  const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`wnersai:botctl:start:${botInstanceId}`).setLabel('▶ Başlat').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`wnersai:botctl:stop:${botInstanceId}`).setLabel('⏹ Durdur').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`wnersai:botctl:restart:${botInstanceId}`).setLabel('🔄 Yeniden Başlat').setStyle(ButtonStyle.Secondary),
  );
  const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`wnersai:botctl:settings:${botInstanceId}`).setLabel('⚙️ Ayarlar').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`wnersai:botctl:stats:${botInstanceId}`).setLabel('📊 İstatistik').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`wnersai:botctl:logs:${botInstanceId}`).setLabel('📋 Loglar').setStyle(ButtonStyle.Secondary),
  );
  return [row1, row2];
}

/**
 * Handles the ▶/⏹/🔄 buttons on a Bot Instance Panel. Ownership is checked
 * before any start/stop/restart is allowed - a user can only control bots
 * they own (multi-tenant isolation, same rule enforced at the DB query level).
 */
export async function handleBotControlButton(
  interaction: ButtonInteraction,
  action: 'start' | 'stop' | 'restart' | 'settings' | 'stats' | 'logs',
  botInstanceId: string,
  botManager: BotManagerLike,
): Promise<void> {
  const bot = await BotInstance.findById(botInstanceId);
  if (!bot) {
    await interaction.reply({ content: '❌ Bot bulunamadı.', ephemeral: true });
    return;
  }

  // Multi-tenant isolation: only the Discord user mapped to bot.ownerId may control it.
  const dbUser = await User.findOne({ discordId: interaction.user.id });
  if (!dbUser || bot.ownerId.toString() !== (dbUser._id as Types.ObjectId).toString()) {
    await interaction.reply({ content: '❌ Bu botu yönetme yetkiniz yok.', ephemeral: true });
    return;
  }

  const id = bot._id as Types.ObjectId;

  try {
    switch (action) {
      case 'start':
        await botManager.startBot(id);
        break;
      case 'stop':
        await botManager.stopBot(id);
        break;
      case 'restart':
        await botManager.restartBot(id);
        break;
      case 'stats':
      case 'settings':
      case 'logs':
        // Read-only informational panels - rendered from existing data, no state change.
        break;
    }

    await AuditLog.create({
      actorUserId: dbUser._id,
      action: `bot.${action}`,
      targetType: 'BotInstance',
      targetId: id.toString(),
    });

    const refreshed = await BotInstance.findById(id);
    if (!refreshed) throw new Error('Bot disappeared after action');

    const embed = renderBotInstancePanelEmbed({
      name: refreshed.name,
      status: refreshed.status,
      guildCount: refreshed.guildCount,
      userCount: refreshed.userCount,
      defaultProviderKind: refreshed.defaultProviderKind,
      defaultPrefix: refreshed.defaultPrefix,
      language: refreshed.language,
    });

    await interaction.update({ embeds: [embed], components: buildBotInstanceButtons(id.toString()) });
  } catch (err) {
    logger.error({ err, action, botInstanceId }, 'Bot control action failed');
    await interaction.reply({ content: `❌ İşlem başarısız: ${(err as Error).message}`, ephemeral: true });
  }
}
