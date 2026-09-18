import {
  ActionRowBuilder,
  ChatInputCommandInteraction,
  ModalBuilder,
  ModalSubmitInteraction,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';
import { Types } from 'mongoose';
import { User } from '../../models/User';
import { APIKey } from '../../models/APIKey';
import { AIProviderConfig } from '../../models/AIProviderConfig';
import { SecretBox } from '../../security/encryption';
import { ProviderKind } from '../../providers/provider-manager/ProviderManager';

export const ayarlaCommandData = new SlashCommandBuilder()
  .setName('ayarla')
  .setDescription('AI sağlayıcı API anahtarınızı ayarlayın');

/** Step 1: which provider to configure. */
export async function handleAyarlaCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  const menu = new StringSelectMenuBuilder()
    .setCustomId('wnersai:ayarla:provider')
    .setPlaceholder('🌐 Sağlayıcı seç')
    .addOptions(
      { label: 'OpenAI', value: 'openai' },
      { label: 'Google Gemini', value: 'google' },
      { label: 'Anthropic Claude', value: 'anthropic' },
      { label: 'xAI Grok', value: 'xai' },
      { label: 'Custom (OpenAI-compatible)', value: 'custom' },
    );
  const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu);
  await interaction.reply({ content: '⚙️ Hangi sağlayıcıyı ayarlamak istersiniz?', components: [row], ephemeral: true });
}

/** Step 2: opens a modal to collect the API key (and baseUrl for custom). */
export function buildApiKeyModal(provider: ProviderKind): ModalBuilder {
  const modal = new ModalBuilder().setCustomId(`wnersai:ayarla:submit:${provider}`).setTitle(`${provider} API Anahtarı`);

  const keyInput = new TextInputBuilder()
    .setCustomId('apiKey')
    .setLabel('API Anahtarı')
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const rows = [new ActionRowBuilder<TextInputBuilder>().addComponents(keyInput)];

  if (provider === 'custom') {
    const baseUrlInput = new TextInputBuilder()
      .setCustomId('baseUrl')
      .setLabel('Base URL (örn: https://api.example.com/v1)')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);
    rows.push(new ActionRowBuilder<TextInputBuilder>().addComponents(baseUrlInput));
  }

  modal.addComponents(...rows);
  return modal;
}

/** Step 3: modal submit -> encrypt & store the key, activate a default provider config. */
export async function handleApiKeyModalSubmit(
  interaction: ModalSubmitInteraction,
  provider: ProviderKind,
  botInstanceId: Types.ObjectId,
  encryptionKey: string,
): Promise<void> {
  const rawKey = interaction.fields.getTextInputValue('apiKey');
  const baseUrl = provider === 'custom' ? interaction.fields.getTextInputValue('baseUrl') : undefined;

  const dbUser = await User.findOneAndUpdate(
    { discordId: interaction.user.id },
    { $setOnInsert: { username: interaction.user.username } },
    { upsert: true, new: true },
  );

  const secretBox = new SecretBox(encryptionKey);
  const keyDoc = await APIKey.create({
    ownerId: dbUser._id,
    provider,
    label: `${provider} key`,
    encryptedKey: secretBox.encrypt(rawKey),
    baseUrl,
  });

  // A default model is set to a safe placeholder; the user picks a real one via /model,
  // which pulls the live model list rather than trusting a hardcoded default.
  await AIProviderConfig.findOneAndUpdate(
    { ownerId: dbUser._id, provider, botInstanceId },
    { apiKeyId: keyDoc._id, selectedModel: 'default', enabled: true },
    { upsert: true },
  );

  await interaction.reply({
    content: `✅ ${provider} anahtarınız kaydedildi: \`${SecretBox.mask(rawKey)}\`\nModel seçmek için /model kullanın.`,
    ephemeral: true,
  });
}
