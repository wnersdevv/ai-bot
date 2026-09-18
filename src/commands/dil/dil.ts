import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { User } from '../../models/User';
import { Locale } from '../../localization/i18n';

export const dilCommandData = new SlashCommandBuilder()
  .setName('dil')
  .setDescription('Arayüz dilinizi değiştirir')
  .addStringOption((opt) =>
    opt
      .setName('secim')
      .setDescription('Dil')
      .setRequired(true)
      .addChoices(
        { name: 'Türkçe', value: 'tr' },
        { name: 'English', value: 'en' },
        { name: 'Deutsch', value: 'de' },
        { name: 'Español', value: 'es' },
      ),
  );

export async function handleDilCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  const locale = interaction.options.getString('secim', true) as Locale;
  await User.findOneAndUpdate(
    { discordId: interaction.user.id },
    { language: locale, $setOnInsert: { username: interaction.user.username } },
    { upsert: true },
  );
  await interaction.reply({ content: `✅ Dil güncellendi: ${locale}`, ephemeral: true });
}
