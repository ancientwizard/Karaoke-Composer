/*
 * KaraokePacketTiming module features.
 * Contains implementation for karaoke packet timing.
 */

export class KaraokePacketTiming {
  private static readonly ticksPerSecond = 10_000_000;

  private static readonly sectorsPerSecond = 75;

  private static readonly packetsPerSector = 4;

  public static getRenderDurationMs(packetCount: number): number {
    const numerator = packetCount * this.ticksPerSecond;
    const denominator = this.sectorsPerSecond * this.packetsPerSector;
    return Math.floor((numerator / denominator) / 10_000);
  }

  public static getPacketCount(durationMs: number): number {
    const ticks = durationMs * 10_000;
    const numerator = ticks * this.sectorsPerSecond * this.packetsPerSector;
    return Math.floor(numerator / this.ticksPerSecond);
  }
}
