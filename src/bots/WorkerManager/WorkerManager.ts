import { Types } from 'mongoose';

/**
 * For the 1000-bot target: rather than one process holding 1000 discord.js
 * Clients, bots are sharded across N worker processes by consistent hashing
 * on botInstanceId. Each worker process runs its own BotManager and only
 * starts the bot ids assigned to it.
 *
 * This module intentionally stays simple until it's actually needed - a
 * single worker (WORKER_COUNT=1, WORKER_INDEX=0) behaves exactly like a
 * single BotManager with no sharding overhead. Wire in a real process
 * supervisor (pm2, k8s deployment replicas, etc.) once bot count justifies it.
 */
export class WorkerManager {
  constructor(
    private workerIndex: number,
    private workerCount: number,
  ) {
    if (workerIndex < 0 || workerIndex >= workerCount) {
      throw new Error('workerIndex must be within [0, workerCount)');
    }
  }

  private hash(id: string): number {
    let h = 0;
    for (let i = 0; i < id.length; i++) {
      h = (h * 31 + id.charCodeAt(i)) >>> 0;
    }
    return h;
  }

  /** Returns true if the given bot belongs to this worker process. */
  owns(botInstanceId: Types.ObjectId): boolean {
    if (this.workerCount <= 1) return true;
    return this.hash(botInstanceId.toString()) % this.workerCount === this.workerIndex;
  }

  filterOwned(botInstanceIds: Types.ObjectId[]): Types.ObjectId[] {
    return botInstanceIds.filter((id) => this.owns(id));
  }
}
