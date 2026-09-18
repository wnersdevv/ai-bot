import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { User } from '../../models/User';
import { BotInstance } from '../../models/BotInstance';
import { renderBotInstancePanelEmbed } from '../../bots/BotManager/ControlCenter';
import { buildBotInstanceButtons } from '../../components/buttons/botInstancePanel';

export const botlarCommandData = new SlashCommandBuilder()
  .setName('botlar')
  .setDescription('Sahip olduğunuz WNERSAI botlarını listeler ve yönetir');

/**
 * Lists every BotInstance owned by the calling user (multi-tenant scoped to
 * ownerId) and renders one Bot Instance Panel per bot with
 * start/stop/restart/settings/stats/logs buttons.
 */
export async function handleBotlarCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  const dbUser = await User.findOne({ discordId: interaction.user.id });
  if (!dbUser) {
    await interaction.reply({ content: '❌ Henüz bir botunuz yok.', ephemeral: true });
    return;
  }

  const bots = await BotInstance.find({ ownerId: dbUser._id }).limit(10);
  if (!bots.length) {
    await interaction.reply({ content: '❌ Henüz bir botunuz yok.', ephemeral: true });
    return;
  }

  await interaction.reply({ content: `🤖 ${bots.length} bot bulundu:`, ephemeral: true });

  for (const bot of bots) {
    const embed = renderBotInstancePanelEmbed({
      name: bot.name,
      status: bot.status,
      guildCount: bot.guildCount,
      userCount: bot.userCount,
      defaultProviderKind: bot.defaultProviderKind,
      defaultPrefix: bot.defaultPrefix,
      language: bot.language,
    });
    await interaction.followUp({
      embeds: [embed],
      components: buildBotInstanceButtons((bot._id as any).toString()),
      ephemeral: true,
    });
  }
}
