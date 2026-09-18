import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { Types } from 'mongoose';
import { Conversation } from '../../models/Conversation';
import { User } from '../../models/User';
import { resetConversation } from '../../ai/context/ContextManager';
import { t } from '../../localization/i18n';

export const sifirlaCommandData = new SlashCommandBuilder()
  .setName('sifirla')
  .setDescription('Aktif konuşmanızı sıfırlar');

export async function handleSifirlaCommand(
  interaction: ChatInputCommandInteraction,
  botInstanceId: Types.ObjectId,
): Promise<void> {
  const dbUser = await User.findOne({ discordId: interaction.user.id });
  if (!dbUser) {
    await interaction.reply({ content: '❌ Aktif bir konuşmanız yok.', ephemeral: true });
    return;
  }

  const conversation = await Conversation.findOne({
    userId: dbUser._id,
    botInstanceId,
    isActive: true,
  }).sort({ updatedAt: -1 });

  if (!conversation) {
    await interaction.reply({ content: '❌ Aktif bir konuşmanız yok.', ephemeral: true });
    return;
  }

  await resetConversation(conversation._id as Types.ObjectId);
  await interaction.reply({ content: t(dbUser.language, 'conversation.reset'), ephemeral: true });
}
