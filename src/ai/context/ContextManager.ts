import { Types } from 'mongoose';
import { Conversation, Message } from '../../models/Conversation';
import { Memory } from '../../models/Memory';
import { ChatMessage } from '../../providers/types';

const RECENT_MESSAGE_LIMIT = 20;
/** rough char-based budget stand-in for a token counter; swap for a real tokenizer as needed */
const CONTEXT_CHAR_BUDGET = 24_000;

/**
 * Builds the context sent to the provider as:
 *   Relevant Memories + Conversation Summary + Recent Messages + new prompt
 * When recent history would blow the char budget, older messages are dropped
 * from what's sent (the rolling `summary` on Conversation is meant to absorb
 * them - summarization itself is left as an async follow-up job, not inline
 * here, to keep this call fast).
 */
export async function buildContext(conversationId: Types.ObjectId, newPrompt: string): Promise<ChatMessage[]> {
  const conversation = await Conversation.findById(conversationId);
  const recent = await Message.find({ conversationId }).sort({ createdAt: -1 }).limit(RECENT_MESSAGE_LIMIT);
  recent.reverse();

  const memories = conversation
    ? await Memory.find({ userId: conversation.userId, botInstanceId: conversation.botInstanceId })
        .sort({ updatedAt: -1 })
        .limit(10)
    : [];

  const messages: ChatMessage[] = [];

  if (memories.length) {
    messages.push({
      role: 'system',
      content: `Relevant memories about this user:\n${memories.map((m) => `- ${m.content}`).join('\n')}`,
    });
  }

  if (conversation?.summary) {
    messages.push({ role: 'system', content: `Conversation summary so far:\n${conversation.summary}` });
  }

  let usedChars = messages.reduce((sum, m) => sum + m.content.length, 0);
  const recentToInclude: ChatMessage[] = [];
  for (let i = recent.length - 1; i >= 0; i--) {
    const m = recent[i];
    usedChars += m.content.length;
    if (usedChars > CONTEXT_CHAR_BUDGET) break;
    recentToInclude.unshift({ role: m.role, content: m.content });
  }

  messages.push(...recentToInclude);
  messages.push({ role: 'user', content: newPrompt });

  return messages;
}

/** /bellek temizle */
export async function clearMemories(userId: Types.ObjectId, botInstanceId: Types.ObjectId): Promise<number> {
  const res = await Memory.deleteMany({ userId, botInstanceId });
  return res.deletedCount ?? 0;
}

/** /sifirla */
export async function resetConversation(conversationId: Types.ObjectId): Promise<void> {
  await Message.deleteMany({ conversationId });
  await Conversation.findByIdAndUpdate(conversationId, { summary: undefined, isActive: false });
}
