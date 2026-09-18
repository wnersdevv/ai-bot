import { Client, Message } from 'discord.js';
import { Types } from 'mongoose';
import { AIService } from '../services/AIService';
import { User } from '../models/User';
import { GuildSettings, Guild } from '../models/Guild';
import { t } from '../localization/i18n';
import { ProviderError } from '../providers/types';

const DEFAULT_PREFIX = 'w!';

/**
 * Registers messageCreate-based prefix commands (w!ai, w!sohbet, w!model, ...).
 * Every branch below calls the SAME AIService.ask() used by the /ai slash
 * command - no separate prefix-only AI code path, per "command compatibility".
 * Per-guild prefix is read from GuildSettings (falls back to w!) and can be
 * changed with `w!prefix <yeni_prefix>`.
 */
export function registerPrefixHandler(client: Client, aiService: AIService, botInstanceId: Types.ObjectId): void {
  client.on('messageCreate', async (message: Message) => {
    if (message.author.bot || !message.guild) return;

    let prefix = DEFAULT_PREFIX;
    let guildDoc = null;
    try {
      guildDoc = await Guild.findOne({ botInstanceId, guildId: message.guild.id });
      if (guildDoc) {
        const settings = await GuildSettings.findOne({ guildId: guildDoc._id });
        if (settings?.prefix) prefix = settings.prefix;
      }
    } catch {
      // fall back to default prefix on lookup failure
    }

    if (!message.content.startsWith(prefix)) return;

    const withoutPrefix = message.content.slice(prefix.length).trim();
    const [commandName, ...rest] = withoutPrefix.split(/\s+/);
    const argText = rest.join(' ');

    if (commandName === 'prefix') {
      // Guild admin only in a real deployment - permission check omitted from this stub.
      if (argText && guildDoc) {
        await GuildSettings.findOneAndUpdate(
          { guildId: guildDoc._id },
          { prefix: argText },
          { upsert: true },
        );
        await message.reply(`✅ Prefix güncellendi: \`${argText}\``);
      }
      return;
    }

    if (commandName !== 'ai' && commandName !== 'sohbet') return;
    if (!argText) return;

    const dbUser = await User.findOneAndUpdate(
      { discordId: message.author.id },
      { $setOnInsert: { username: message.author.username } },
      { upsert: true, new: true },
    );

    try {
      const result = await aiService.ask({
        userId: dbUser._id as Types.ObjectId,
        botInstanceId,
        guildId: guildDoc?._id as Types.ObjectId | undefined,
        prompt: argText,
      });
      await message.reply(`**${result.provider} / ${result.model}**\n${result.content}`);
    } catch (err) {
      const msg =
        err instanceof ProviderError && err.providerId === 'none'
          ? t(dbUser.language, 'errors.no_provider_configured')
          : t(dbUser.language, 'errors.provider_unreachable');
      await message.reply(msg);
    }
  });
}
