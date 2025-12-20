# CDGPaletteManager Architecture

## Overview

The `CDGPaletteManager` is an advanced palette resource management system for CDG rendering that treats color slots as **leased resources** with packet-based timing and intelligent allocation strategies.

## Key Concepts

### 1. Lease System (Packet-Based)

Instead of static color assignments, colors are **leased** for specific durations:

```typescript
// Unlimited lease (static color, entire song)
const backgroundIdx = manager.leaseColor(black, Infinity, 'background')

// Time-limited lease (dynamic color, 2 seconds = 600 packets at 300 pps)
const transitionIdx = manager.leaseColor(cyan, 600, 'transition-effect')
```

**Why packets instead of milliseconds?**
- CDG operates at 300 pps (packets per second)
- Palette changes are packet-aligned
- Math is cleaner: 2 seconds = exactly 600 packets
- No floating-point rounding errors

### 2. Smart Allocation Strategy

```
Lower Half (0-7):   Static/Unlimited colors
               ├─ Background colors
               ├─ Text colors
               └─ Long-running visual elements

Upper Half (8-15):  Dynamic/Time-Limited colors
               ├─ Transitions
               ├─ Effects
               └─ Temporary overlays
```

This separation ensures:
- Static colors remain stable throughout the song
- Dynamic colors can be recycled after expiration
- Minimal palette load packet generation (only when needed)

### 3. Lease Chaining

When a slot's lease expires, the same index can be reused. Leases are **chained** to track the timeline:

```typescript
// Packet 100: Lease red for 200 packets
manager.updatePacket(100)
const idx = manager.leaseColor(red, 200, 'phase-1')

// Packet 300: Same index, new color (chain link)
manager.updatePacket(300)
manager.leaseColor(green, 200, 'phase-2', idx)

// Chain is: [red: 100-300] -> [green: 300-500]
const chain = manager.getLeaseChain(idx)
// chain[0]: {index: idx, color: red, startPacket: 100, endPacket: 300, ...}
// chain[1]: {index: idx, color: green, startPacket: 300, endPacket: 500, ...}
```

### 4. Change Tracking & Dirty Regions

The manager tracks which halves of the palette changed:

```typescript
interface PaletteChangeEvent {
  packet: number
  lowerChanged: boolean  // Colors 0-7 modified
  upperChanged: boolean  // Colors 8-15 modified
  changedLeases: ColorLease[]
}
```

**Benefits:**
- Only emit palette load packets when necessary
- Only load the half (0-7 or 8-15) that changed
- Reduces CDG packet count

## API Reference

### Core Methods

#### `leaseColor(color, durationPackets, label?, preferredIndex?): number`

Lease a color slot.

**Returns:** Palette index (0-15) or -1 if no slot available

```typescript
// Unlimited
const idx = manager.leaseColor(yellow, Infinity, 'text-active')

// 2 seconds (600 packets)
const idx = manager.leaseColor(cyan, 600, 'transition')

// Prefer specific index
const idx = manager.leaseColor(red, 200, 'text', 5)
```

#### `updatePacket(packet): void`

Update current packet position (for lease expiration tracking).

```typescript
manager.updatePacket(150)
```

#### `getActiveLease(index): ColorLease | undefined`

Get the currently active lease at an index.

```typescript
const lease = manager.getActiveLease(5)
if (lease) {
  console.log(`Index 5: ${lease.label} (ends at packet ${lease.endPacket})`)
}
```

#### `getActiveLeases(): ColorLease[]`

Get all active leases at current packet.

```typescript
const active = manager.getActiveLeases()
console.log(`${active.length} colors in use`)
```

#### `getLeaseChain(index): ColorLease[]`

Get the timeline of all leases at an index.

```typescript
const history = manager.getLeaseChain(10)
// [phase-1 (100-300), phase-2 (300-500), phase-3 (500-∞)]
```

#### `getChangeEvents(): PaletteChangeEvent[]`

Get palette change history.

```typescript
const events = manager.getChangeEvents()
for (const event of events) {
  if (event.lowerChanged) {
    // Emit LOAD_COLOR_TABLE_LOW packet
  }
  if (event.upperChanged) {
    // Emit LOAD_COLOR_TABLE_HIGH packet
  }
}
```

#### `getStats(): object`

Get manager statistics.

```typescript
const stats = manager.getStats()
// {
//   staticIndices: [0, 1, 2, 3],
//   dynamicIndices: [8, 9, 10],
//   currentPacket: 500,
//   activeLeases: 7,
//   changeEvents: 12
// }
```

### Helper Methods

- `releaseLease(lease)` - Mark a lease as released (slot becomes reusable)
- `isLeaseExpired(lease)` - Check if lease has expired
- `getColor(index)` - Get current color at index
- `getColors()` - Get all 16 colors
- `clearChangeHistory()` - Reset change events

## Lease State Machine

```
┌─────────────┐
│   ACTIVE    │ ◄──── Packet >= startPacket AND (endPacket = ∞ OR packet < endPacket)
└──────┬──────┘
       │ packet >= endPacket
       ▼
┌──────────────┐
│   EXPIRED    │ ◄──── Can chain to next lease
└──────┬───────┘
       │ releaseLease()
       ▼
┌────────────────┐
│   RELEASED     │ ◄──── Slot available for reallocation
└────────────────┘
```

## Example: Karaoke Visualization Timeline

```typescript
const manager = new CDGPaletteManager()

// 0s: Setup static colors
manager.updatePacket(0)
const bgIdx = manager.leaseColor(darkBlue, Infinity, 'background')
const activeIdx = manager.leaseColor(yellow, Infinity, 'active-text')
const inactiveIdx = manager.leaseColor(gray, Infinity, 'inactive-text')

// 2s: Verse 1 starts, add decorative effect
manager.updatePacket(600)
const effectIdx = manager.leaseColor(cyan, 300, 'verse1-border') // 1s effect

// 3s: Fade transition
manager.updatePacket(900)
const fadeIdx = manager.leaseColor(purple, 600, 'fade-transition') // 2s fade

// 3.5s: effectIdx expires, reuse for new effect
manager.updatePacket(1050)
const effect2Idx = manager.leaseColor(magenta, 450, 'effect2', effectIdx)

// Check state at 4.5s
manager.updatePacket(1350)
const active = manager.getActiveLeases()
// bgIdx, activeIdx, inactiveIdx, fadeIdx, effect2Idx = 5 active leases
// Can now emit palette load packets only for changed indices
```

## Test Coverage

See `src/tests/cdg-palette-manager.test.ts` for comprehensive test suite covering:
- Initialization and defaults
- Unlimited vs time-limited allocation
- Lease chaining over time
- Active lease tracking
- Palette change events
- Preferred index allocation
- Slot exhaustion handling
- Realistic karaoke scenarios

## Future Enhancements

1. **Palette Load Packet Generation** - Emit CDG packets based on change events
2. **BMP Color Extraction** - Seed palette from background images
3. **Conflict Resolution** - Handle allocation conflicts with strategies
4. **Lease Renewal** - Extend leases without changing index
5. **Priority System** - Higher-priority colors get better indices

// VIM: set filetype=markdown :
// END
