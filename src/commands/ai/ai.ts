import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { Types } from 'mongoose';
import { AIService } from '../../services/AIService';
import { User } from '../../models/User';
import { renderAIPanel } from '../../components/aiPanel';
import { t } from '../../localization/i18n';
import { ProviderError } from '../../providers/types';

export const aiCommandData = new SlashCommandBuilder()
  .setName('ai')
  .setDescription('WNERSAI ile konuş')
  .addStringOption((opt) => opt.setName('mesaj').setDescription('Mesajınız').setRequired(false));

/**
 * Handles BOTH /ai and /sohbet (they are aliases at the command-registration
 * level) - and is called from prefix/prefixHandler.ts too, via AIService,
 * so the actual AI logic never forks between entry points.
 */
export async function handleAiSlashCommand(
  interaction: ChatInputCommandInteraction,
  aiService: AIService,
  botInstanceId: Types.ObjectId,
): Promise<void> {
  await interaction.deferReply();

  const prompt = interaction.options.getString('mesaj');
  const dbUser = await User.findOneAndUpdate(
    { discordId: interaction.user.id },
    { $setOnInsert: { username: interaction.user.username } },
    { upsert: true, new: true },
  );

  if (!prompt) {
    const panel = renderAIPanel({
      provider: '-',
      model: '-',
      conversationActive: false,
      locale: dbUser.language,
    });
    await interaction.editReply(panel);
    return;
  }

  try {
    const result = await aiService.ask({
      userId: dbUser._id as Types.ObjectId,
      botInstanceId,
      prompt,
    });
    await interaction.editReply(`**${result.provider} / ${result.model}**\n${result.content}`);
  } catch (err) {
    const message =
      err instanceof ProviderError && err.providerId === 'none'
        ? t(dbUser.language, 'errors.no_provider_configured')
        : t(dbUser.language, 'errors.provider_unreachable');
    await interaction.editReply(message);
  }
}
