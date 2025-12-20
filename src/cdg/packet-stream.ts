/**
 * PacketStream
 *
 * A composable packet streaming architecture with:
 * - Observer pattern for packet flow
 * - Backpressure/buffering for sources faster than realtime
 * - Event emission for stream lifecycle
 * - Multiple simultaneous observers (VRAM, logger, inspector, file writer, etc.)
 */

/**
 * Single CDG packet (24 bytes)
 */
export type CDGPacket = Uint8Array

/**
 * Observer function signature - called for each packet
 */
export type PacketObserver = (packet: CDGPacket, index: number) => void | Promise<void>

/**
 * Stream event types
 */
export enum StreamEventType
{
  PACKET_RECEIVED = 'packet-received',
  PACKET_PROCESSED = 'packet-processed',
  BUFFER_FULL = 'buffer-full',
  BUFFER_EMPTY = 'buffer-empty',
  STREAM_START = 'stream-start',
  STREAM_END = 'stream-end',
  STREAM_ERROR = 'stream-error'
}

/**
 * Stream event data
 */
export interface StreamEvent
{
  type: StreamEventType
  timestamp: number
  packetIndex?: number
  bufferSize?: number
  error?: Error
}

/**
 * PacketStream configuration
 */
export interface PacketStreamConfig
{
  /**
   * Maximum number of packets to buffer (backpressure storage)
   * Default: 9000 packets ≈ 30 seconds at 300 pps
   */
  maxBufferSize?: number

  /**
   * Enable automatic overflow handling (drop oldest packets when buffer full)
   */
  autoOverflow?: boolean

  /**
   * Event emission enabled
   */
  emitEvents?: boolean
}

/**
 * PacketStream
 *
 * Manages a stream of CDG packets with backpressure and multiple observers.
 */
export class PacketStream
{
  private buffer: CDGPacket[] = []
  private observers: PacketObserver[] = []
  private eventListeners: Map<StreamEventType, ((event: StreamEvent) => void)[]> = new Map()
  private packetCount = 0
  private isProcessing = false
  private config: Required<PacketStreamConfig>

  constructor(config: PacketStreamConfig = {})
  {
    this.config = {
      maxBufferSize: config.maxBufferSize ?? 9000,
      autoOverflow: config.autoOverflow ?? true,
      emitEvents: config.emitEvents ?? true
    }

    // Initialize event listener map
    Object.values(StreamEventType).forEach(eventType => {
      this.eventListeners.set(eventType, [])
    })
  }

  /**
   * Add a packet observer
   */
  observe(observer: PacketObserver): void
  {
    this.observers.push(observer)
  }

  /**
   * Remove a packet observer
   */
  unobserve(observer: PacketObserver): void
  {
    const idx = this.observers.indexOf(observer)
    if (idx >= 0)
    {
      this.observers.splice(idx, 1)
    }
  }

  /**
   * Listen for stream events
   */
  on(eventType: StreamEventType, listener: (event: StreamEvent) => void): void
  {
    const listeners = this.eventListeners.get(eventType)
    if (listeners && !listeners.includes(listener))
    {
      listeners.push(listener)
    }
  }

  /**
   * Stop listening for stream events
   */
  off(eventType: StreamEventType, listener: (event: StreamEvent) => void): void
  {
    const listeners = this.eventListeners.get(eventType)
    if (listeners)
    {
      const idx = listeners.indexOf(listener)
      if (idx >= 0)
      {
        listeners.splice(idx, 1)
      }
    }
  }

  /**
   * Emit a stream event
   */
  private emit(event: StreamEvent): void
  {
    if (!this.config.emitEvents) return

    const listeners = this.eventListeners.get(event.type)
    if (listeners)
    {
      listeners.forEach(listener => {
        try
        {
          listener(event)
        }
        catch (err)
        {
          console.error(`Error in event listener for ${event.type}:`, err)
        }
      })
    }
  }

  /**
   * Push a single packet into the stream
   */
  push(packet: CDGPacket): boolean
  {
    if (this.buffer.length >= this.config.maxBufferSize)
    {
      if (this.config.autoOverflow)
      {
        // Drop oldest packet
        this.buffer.shift()
        this.emit({
          type: StreamEventType.BUFFER_FULL,
          timestamp: Date.now(),
          bufferSize: this.buffer.length
        })
      }
      else
      {
        return false // Backpressure: reject packet
      }
    }

    this.buffer.push(new Uint8Array(packet))
    this.emit({
      type: StreamEventType.PACKET_RECEIVED,
      timestamp: Date.now(),
      bufferSize: this.buffer.length
    })

    return true
  }

  /**
   * Push multiple packets into the stream
   */
  pushBatch(packets: CDGPacket[]): number
  {
    let pushed = 0
    for (const packet of packets)
    {
      if (this.push(packet))
      {
        pushed++
      }
      else
      {
        break // Backpressure
      }
    }
    return pushed
  }

  /**
   * Get current buffer size
   */
  getBufferSize(): number
  {
    return this.buffer.length
  }

  /**
   * Get maximum buffer size
   */
  getMaxBufferSize(): number
  {
    return this.config.maxBufferSize
  }

  /**
   * Check if buffer is empty
   */
  isEmpty(): boolean
  {
    return this.buffer.length === 0
  }

  /**
   * Check if buffer is full
   */
  isFull(): boolean
  {
    return this.buffer.length >= this.config.maxBufferSize
  }

  /**
   * Get total packets processed
   */
  getPacketCount(): number
  {
    return this.packetCount
  }

  /**
   * Process all buffered packets through observers
   * Returns number of packets processed
   */
  async process(): Promise<number>
  {
    if (this.isProcessing)
    {
      throw new Error('Stream already processing')
    }

    this.isProcessing = true
    this.emit({
      type: StreamEventType.STREAM_START,
      timestamp: Date.now()
    })

    let processed = 0

    try
    {
      while (this.buffer.length > 0)
      {
        const packet = this.buffer.shift()!
        processed++

        // Call all observers sequentially
        for (const observer of this.observers)
        {
          try
          {
            const result = observer(packet, this.packetCount)
            if (result instanceof Promise)
            {
              await result
            }
          }
          catch (err)
          {
            this.emit({
              type: StreamEventType.STREAM_ERROR,
              timestamp: Date.now(),
              packetIndex: this.packetCount,
              error: err as Error
            })
          }
        }

        this.packetCount++

        this.emit({
          type: StreamEventType.PACKET_PROCESSED,
          timestamp: Date.now(),
          packetIndex: this.packetCount - 1,
          bufferSize: this.buffer.length
        })

        // Yield control to prevent blocking
        await new Promise(resolve => setTimeout(resolve, 0))
      }

      if (this.buffer.length === 0)
      {
        this.emit({
          type: StreamEventType.BUFFER_EMPTY,
          timestamp: Date.now()
        })
      }

      this.emit({
        type: StreamEventType.STREAM_END,
        timestamp: Date.now()
      })
    }

    finally
    {
      this.isProcessing = false
    }

    return processed
  }

  /**
   * Clear all buffered packets
   */
  clear(): void
  {
    this.buffer = []
  }

  /**
   * Get snapshot of buffered packets (read-only)
   */
  getBuffer(): ReadonlyArray<CDGPacket>
  {
    return [...this.buffer]
  }
}
