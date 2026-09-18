import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js';

export const yardimCommandData = new SlashCommandBuilder().setName('yardim').setDescription('Komut listesini gösterir');

export async function handleYardimCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  const embed = new EmbedBuilder()
    .setTitle('📖 WNERSAI Komutları')
    .setColor(0x5865f2)
    .setDescription(
      [
        '`/ai [mesaj]` - Yapay zekâ ile konuş (panel açar veya doğrudan yanıt verir)',
        '`/sohbet [mesaj]` - /ai ile aynı',
        '`/model` - Aktif modeli değiştir',
        '`/modeller` - Sağlayıcının desteklediği modelleri listele',
        '`/ayarla` - API anahtarınızı ekleyin/güncelleyin',
        '`/bellek temizle` - Belleğinizi temizleyin',
        '`/sifirla` - Konuşmayı sıfırlayın',
        '`/istatistik` - Kullanım istatistiklerinizi görün',
        '`/dil <secim>` - Arayüz dilini değiştirin',
        '`/kontrol` - WNERSAI kontrol merkezi (botlar, sağlayıcı durumu)',
        '`/botlar` - Botlarınızı listeleyin ve yönetin (başlat/durdur/yeniden başlat)',
        '`/araclar [arac] [girdi]` - Kullanılabilir araçları listeleyin veya çalıştırın',
        '',
        `Prefix komutlar da desteklenir (varsayılan \`w!\`): \`w!ai Merhaba\`, \`w!prefix ?\``,
      ].join('\n'),
    );

  await interaction.reply({ embeds: [embed], ephemeral: true });
}
