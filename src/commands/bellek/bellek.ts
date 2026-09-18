import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { Types } from 'mongoose';
import { User } from '../../models/User';
import { clearMemories } from '../../ai/context/ContextManager';
import { t } from '../../localization/i18n';

export const bellekCommandData = new SlashCommandBuilder()
  .setName('bellek')
  .setDescription('Bellek yönetimi')
  .addSubcommand((sub) => sub.setName('temizle').setDescription('Tüm belleğinizi temizler'));

export async function handleBellekCommand(
  interaction: ChatInputCommandInteraction,
  botInstanceId: Types.ObjectId,
): Promise<void> {
  const sub = interaction.options.getSubcommand();
  const dbUser = await User.findOneAndUpdate(
    { discordId: interaction.user.id },
    { $setOnInsert: { username: interaction.user.username } },
    { upsert: true, new: true },
  );

  if (sub === 'temizle') {
    const deleted = await clearMemories(dbUser._id as Types.ObjectId, botInstanceId);
    await interaction.reply({
      content: `${t(dbUser.language, 'memory.cleared')} (${deleted})`,
      ephemeral: true,
    });
  }
}
