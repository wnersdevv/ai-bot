import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import { Locale, t } from '../localization/i18n';

export interface AIPanelData {
  provider: string;
  model: string;
  conversationActive: boolean;
  locale: Locale;
}

/**
 * Renders the /ai panel embed + buttons. Used identically whether the
 * triggering entry point was the slash command or the prefix command -
 * there is exactly one implementation of this UI.
 */
export function renderAIPanel(data: AIPanelData) {
  const embed = new EmbedBuilder()
    .setTitle(t(data.locale, 'ai.panel.title'))
    .addFields(
      { name: t(data.locale, 'ai.panel.model'), value: data.model, inline: true },
      { name: t(data.locale, 'ai.panel.provider'), value: data.provider, inline: true },
      {
        name: t(data.locale, 'ai.panel.conversation'),
        value: data.conversationActive ? t(data.locale, 'ai.panel.active') : '-',
        inline: true,
      },
    )
    .setColor(0x5865f2);

  const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId('wnersai:model').setLabel(t(data.locale, 'buttons.model')).setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('wnersai:provider').setLabel(t(data.locale, 'buttons.provider')).setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('wnersai:memory').setLabel(t(data.locale, 'buttons.memory')).setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('wnersai:reset').setLabel(t(data.locale, 'buttons.reset')).setStyle(ButtonStyle.Danger),
  );

  const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId('wnersai:stats').setLabel(t(data.locale, 'buttons.stats')).setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('wnersai:settings').setLabel(t(data.locale, 'buttons.settings')).setStyle(ButtonStyle.Primary),
  );

  return { embeds: [embed], components: [row1, row2] };
}
