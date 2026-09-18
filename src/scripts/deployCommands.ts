import 'dotenv/config';
import { REST, Routes } from 'discord.js';
import { aiCommandData } from '../commands/ai/ai';
import { modelCommandData, modellerCommandData } from '../commands/model/model';
import { ayarlaCommandData } from '../commands/ayarla/ayarla';
import { bellekCommandData } from '../commands/bellek/bellek';
import { sifirlaCommandData } from '../commands/sifirla/sifirla';
import { istatistikCommandData } from '../commands/istatistik/istatistik';
import { dilCommandData } from '../commands/dil/dil';
import { yardimCommandData } from '../commands/yardim/yardim';
import { kontrolCommandData } from '../commands/kontrol/kontrol';
import { botlarCommandData } from '../commands/botlar/botlar';
import { araclarCommandData } from '../commands/araclar/araclar';
import { logger } from '../utils/logger';

/**
 * Registers all WNERSAI slash commands for a given bot token + application id.
 * Usage: ts-node src/scripts/deployCommands.ts <botToken> <applicationId> [guildId]
 * Global registration (no guildId) can take up to an hour to propagate;
 * pass a guildId for instant registration while developing.
 */
async function main() {
  const [botToken, applicationId, guildId] = process.argv.slice(2);
  if (!botToken || !applicationId) {
    logger.error('Usage: deployCommands <botToken> <applicationId> [guildId]');
    process.exit(1);
  }

  const commands = [
    aiCommandData.toJSON(),
    { ...aiCommandData.toJSON(), name: 'sohbet' }, // /sohbet as an alias of /ai
    modelCommandData.toJSON(),
    modellerCommandData.toJSON(),
    ayarlaCommandData.toJSON(),
    bellekCommandData.toJSON(),
    sifirlaCommandData.toJSON(),
    istatistikCommandData.toJSON(),
    dilCommandData.toJSON(),
    yardimCommandData.toJSON(),
    kontrolCommandData.toJSON(),
    botlarCommandData.toJSON(),
    araclarCommandData.toJSON(),
  ];

  const rest = new REST({ version: '10' }).setToken(botToken);
  const route = guildId
    ? Routes.applicationGuildCommands(applicationId, guildId)
    : Routes.applicationCommands(applicationId);

  await rest.put(route, { body: commands });
  logger.info(`Registered ${commands.length} commands ${guildId ? `for guild ${guildId}` : 'globally'}`);
}

main().catch((err) => {
  logger.error({ err }, 'Command deployment failed');
  process.exit(1);
});
