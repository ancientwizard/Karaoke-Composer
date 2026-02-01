#!/usr/bin/env node

/**
 * Packet Diagnostics: Track dropped, malformed, or anomalous packets
 * 
 * Purpose: Instrument the rendering pipeline to definitively measure packet loss
 * Provides callbacks for packet generation, validation, and serialization events
 */

/**
 * Represents a packet anomaly (dropped, malformed, incomplete, etc.)
 */
export interface PacketAnomaly {
  timestamp: number
  type: 'dropped' | 'malformed' | 'incomplete' | 'validation_failed' | 'serialization_error' | 'other'
  severity: 'critical' | 'warning' | 'info'
  message: string
  context?: Record<string, any>
  stackTrace?: string
}

/**
 * Packet generation telemetry
 */
export interface PacketTelemetry {
  totalPacketsGenerated: number
  totalPacketsAttempted: number
  anomalies: PacketAnomaly[]
  startTime: number
  endTime?: number
}

/**
 * Callback function for packet events
 */
export type PacketEventCallback = (event: {
  type: 'created' | 'skipped' | 'anomaly' | 'serialized'
  packet?: Uint8Array
  anomaly?: PacketAnomaly
  context?: Record<string, any>
}) => void

/**
 * Packet diagnostics tracker
 */
export class PacketDiagnostics {
  private telemetry: PacketTelemetry = {
    totalPacketsGenerated: 0,
    totalPacketsAttempted: 0,
    anomalies: [],
    startTime: Date.now()
  }

  private callbacks: PacketEventCallback[] = []

  /**
   * Register a callback for packet events
   */
  onPacketEvent(callback: PacketEventCallback): void {
    this.callbacks.push(callback)
  }

  /**
   * Record a packet creation
   */
  recordPacketCreated(packet: Uint8Array, context?: Record<string, any>): void {
    this.telemetry.totalPacketsGenerated++
    this.telemetry.totalPacketsAttempted++
    this.notify({
      type: 'created',
      packet,
      context
    })
  }

  /**
   * Record a packet that was skipped (e.g., duplicate)
   */
  recordPacketSkipped(reason: string, context?: Record<string, any>): void {
    this.telemetry.totalPacketsAttempted++
    this.notify({
      type: 'skipped',
      context: {
 reason, ...context 
}
    })
  }

  /**
   * Record a dropped packet
   */
  recordDroppedPacket(reason: string, expectedData?: any, context?: Record<string, any>): void {
    this.telemetry.totalPacketsAttempted++
    const anomaly: PacketAnomaly = {
      timestamp: Date.now(),
      type: 'dropped',
      severity: 'critical',
      message: `Packet dropped: ${reason}`,
      context: {
 ...context, expectedData 
}
    }
    this.telemetry.anomalies.push(anomaly)
    this.notify({
      type: 'anomaly',
      anomaly
    })
  }

  /**
   * Record a malformed packet
   */
  recordMalformedPacket(packet: Uint8Array, reason: string, context?: Record<string, any>): void {
    const anomaly: PacketAnomaly = {
      timestamp: Date.now(),
      type: 'malformed',
      severity: 'critical',
      message: `Malformed packet: ${reason}`,
      context: {
 packetLength: packet.length, ...context 
}
    }
    this.telemetry.anomalies.push(anomaly)
    this.notify({
      type: 'anomaly',
      anomaly
    })
  }

  /**
   * Record an incomplete packet
   */
  recordIncompletePacket(packet: Uint8Array, reason: string, context?: Record<string, any>): void {
    const anomaly: PacketAnomaly = {
      timestamp: Date.now(),
      type: 'incomplete',
      severity: 'critical',
      message: `Incomplete packet: ${reason}`,
      context: {
 packetLength: packet.length, expectedLength: 24, ...context 
}
    }
    this.telemetry.anomalies.push(anomaly)
    this.notify({
      type: 'anomaly',
      anomaly
    })
  }

  /**
   * Record validation failure
   */
  recordValidationFailure(reason: string, packet?: Uint8Array, context?: Record<string, any>): void {
    const anomaly: PacketAnomaly = {
      timestamp: Date.now(),
      type: 'validation_failed',
      severity: 'warning',
      message: `Validation failed: ${reason}`,
      context: {
 packetLength: packet?.length, ...context 
}
    }
    this.telemetry.anomalies.push(anomaly)
    this.notify({
      type: 'anomaly',
      anomaly
    })
  }

  /**
   * Record serialization error
   */
  recordSerializationError(error: Error, context?: Record<string, any>): void {
    const anomaly: PacketAnomaly = {
      timestamp: Date.now(),
      type: 'serialization_error',
      severity: 'critical',
      message: `Serialization error: ${error.message}`,
      context,
      stackTrace: error.stack
    }
    this.telemetry.anomalies.push(anomaly)
    this.notify({
      type: 'anomaly',
      anomaly
    })
  }

  /**
   * Record a successfully serialized packet
   */
  recordPacketSerialized(packet: Uint8Array, context?: Record<string, any>): void {
    this.notify({
      type: 'serialized',
      packet,
      context
    })
  }

  /**
   * Get current telemetry
   */
  getTelemetry(): PacketTelemetry {
    return {
      ...this.telemetry,
      endTime: Date.now()
    }
  }

  /**
   * Format telemetry as human-readable report
   */
  formatReport(): string {
    const telemetry = this.getTelemetry()
    const elapsed = telemetry.endTime ? telemetry.endTime - telemetry.startTime : 0
    const dropRate = telemetry.totalPacketsAttempted > 0 
      ? ((telemetry.totalPacketsAttempted - telemetry.totalPacketsGenerated) / telemetry.totalPacketsAttempted * 100).toFixed(2)
      : '0.00'
    
    let report = `
Packet Diagnostics Report
=========================

Generation Stats:
  Total Generated:  ${telemetry.totalPacketsGenerated}
  Total Attempted:  ${telemetry.totalPacketsAttempted}
  Drop Rate:        ${dropRate}%
  Elapsed Time:     ${elapsed}ms

Anomalies: ${telemetry.anomalies.length}
`;

    if (telemetry.anomalies.length > 0) {
      report += '\nDetailed Anomalies:\n'
      for (const anomaly of telemetry.anomalies) {
        const timestamp = new Date(anomaly.timestamp).toISOString()
        report += `\n  [${timestamp}] ${anomaly.type.toUpperCase()} (${anomaly.severity})\n`
        report += `    ${anomaly.message}\n`
        if (anomaly.context) {
          report += `    Context: ${JSON.stringify(anomaly.context)}\n`
        }
        if (anomaly.stackTrace) {
          report += `    Stack: ${anomaly.stackTrace.split('\n')[0]}\n`
        }
      }
    } else {
      report += '\n✓ No anomalies detected\n'
    }

    report += '\n'
    return report
  }

  /**
   * Emit notification to all registered callbacks
   */
  private notify(event: Parameters<PacketEventCallback>[0]): void {
    for (const callback of this.callbacks) {
      try {
        callback(event)
      } catch (err) {
        console.error('Error in packet event callback:', err)
      }
    }
  }

  /**
   * Reset diagnostics
   */
  reset(): void {
    this.telemetry = {
      totalPacketsGenerated: 0,
      totalPacketsAttempted: 0,
      anomalies: [],
      startTime: Date.now()
    }
  }
}

// Global singleton for use throughout the app
export const globalPacketDiagnostics = new PacketDiagnostics()

// VIM: set ts=2 sw=2 et:
// END
