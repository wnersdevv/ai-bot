import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { Types } from 'mongoose';
import { ToolManager } from '../../ai/tools/ToolManager';
import { ToolError } from '../../ai/tools/types';

export const araclarCommandData = new SlashCommandBuilder()
  .setName('araclar')
  .setDescription('Kullanılabilir araçları listeler veya bir aracı çalıştırır')
  .addStringOption((opt) => opt.setName('arac').setDescription('Araç adı (örn: calculator)').setRequired(false))
  .addStringOption((opt) => opt.setName('girdi').setDescription('Araca gönderilecek JSON argüman').setRequired(false));

/**
 * Every invocation goes through ToolManager.call(), which enforces
 * validation -> user permission -> bot permission -> rate limit -> timeout,
 * exactly the same path the AI itself would use when it decides to call a
 * tool mid-conversation (tool-calling integration point for future
 * provider-native function calling - the enforcement pipeline is already
 * live and testable via this command today).
 */
export async function handleAraclarCommand(
  interaction: ChatInputCommandInteraction,
  toolManager: ToolManager,
  botInstanceId: Types.ObjectId,
): Promise<void> {
  const toolName = interaction.options.getString('arac');
  const rawInput = interaction.options.getString('girdi');

  if (!toolName) {
    const tools = toolManager.list();
    await interaction.reply({
      content: `🧰 Kullanılabilir araçlar:\n${tools.map((t) => `- **${t.name}**: ${t.description}`).join('\n')}`,
      ephemeral: true,
    });
    return;
  }

  let args: unknown = {};
  if (rawInput) {
    try {
      args = JSON.parse(rawInput);
    } catch {
      await interaction.reply({ content: '❌ girdi geçerli bir JSON olmalı, örn: {"expression":"2+2"}', ephemeral: true });
      return;
    }
  }

  try {
    const result = await toolManager.call(toolName, args, {
      discordUserId: interaction.user.id,
      guildId: interaction.guildId ?? undefined,
      userPermissions: interaction.memberPermissions?.bitfield,
      botPermissions: interaction.guild?.members.me?.permissions.bitfield,
      botInstanceId,
    });
    await interaction.reply({ content: `✅ Sonuç:\n\`\`\`json\n${JSON.stringify(result, null, 2)}\n\`\`\``, ephemeral: true });
  } catch (err) {
    if (err instanceof ToolError) {
      await interaction.reply({ content: `❌ [${err.code}] ${err.message}`, ephemeral: true });
    } else {
      await interaction.reply({ content: '❌ Araç çalıştırılamadı.', ephemeral: true });
    }
  }
}
