import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { Types } from 'mongoose';
import { Usage } from '../../models/Usage';
import { User } from '../../models/User';

export const istatistikCommandData = new SlashCommandBuilder()
  .setName('istatistik')
  .setDescription('Kullanım istatistiklerinizi gösterir');

/**
 * Personal usage analytics: total/successful/failed requests, total tokens,
 * average latency, and a per-provider breakdown. All computed live from the
 * Usage collection - nothing cached or guessed.
 */
export async function handleIstatistikCommand(
  interaction: ChatInputCommandInteraction,
  botInstanceId: Types.ObjectId,
): Promise<void> {
  const dbUser = await User.findOne({ discordId: interaction.user.id });
  if (!dbUser) {
    await interaction.reply({ content: '❌ Henüz kullanım geçmişiniz yok.', ephemeral: true });
    return;
  }

  const [totals] = await Usage.aggregate([
    { $match: { userId: dbUser._id, botInstanceId } },
    {
      $group: {
        _id: null,
        totalRequests: { $sum: 1 },
        successCount: { $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] } },
        failureCount: { $sum: { $cond: [{ $eq: ['$status', 'error'] }, 1, 0] } },
        totalTokens: { $sum: '$totalTokens' },
        avgLatencyMs: { $avg: '$latencyMs' },
      },
    },
  ]);

  const byProvider = await Usage.aggregate([
    { $match: { userId: dbUser._id, botInstanceId, status: 'success' } },
    { $group: { _id: '$provider', requests: { $sum: 1 }, tokens: { $sum: '$totalTokens' } } },
    { $sort: { requests: -1 } },
  ]);

  const embed = new EmbedBuilder()
    .setTitle('📊 WNERSAI İstatistik')
    .setColor(0x57f287)
    .addFields(
      { name: 'Toplam İstek', value: String(totals?.totalRequests ?? 0), inline: true },
      { name: 'Başarılı', value: String(totals?.successCount ?? 0), inline: true },
      { name: 'Başarısız', value: String(totals?.failureCount ?? 0), inline: true },
      { name: 'Toplam Token', value: String(totals?.totalTokens ?? 0), inline: true },
      { name: 'Ort. Gecikme', value: `${Math.round(totals?.avgLatencyMs ?? 0)}ms`, inline: true },
      {
        name: 'Sağlayıcı Kullanımı',
        value: byProvider.length
          ? byProvider.map((p) => `${p._id}: ${p.requests} istek, ${p.tokens} token`).join('\n')
          : '-',
      },
    );

  await interaction.reply({ embeds: [embed], ephemeral: true });
}
