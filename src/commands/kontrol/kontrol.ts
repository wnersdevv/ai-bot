import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { User } from '../../models/User';
import { HealthManager } from '../../bots/HealthManager/HealthManager';
import { renderControlCenter } from '../../bots/BotManager/ControlCenter';

export const kontrolCommandData = new SlashCommandBuilder()
  .setName('kontrol')
  .setDescription('WNERSAI kontrol merkezini gösterir (botlarınız, sağlayıcı durumu, toplam istek)');

/**
 * "WNERSAI CONTROL CENTER" - only uses interaction.user + interaction.reply,
 * so it can be triggered identically from the /kontrol slash command or the
 * ⚙️ Ayarlar button on the /ai panel.
 */
export async function handleKontrolCommand(
  interaction: ChatInputCommandInteraction,
  healthManager: HealthManager,
  encryptionKey: string,
): Promise<void> {
  const dbUser = await User.findOneAndUpdate(
    { discordId: interaction.user.id },
    { $setOnInsert: { username: interaction.user.username } },
    { upsert: true, new: true },
  );

  const embed = await renderControlCenter(dbUser._id as any, healthManager, encryptionKey);
  await interaction.reply({ embeds: [embed], ephemeral: true });
}
