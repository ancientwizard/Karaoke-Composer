# Wipe Animation Integration Analysis

## What We Have (Already Implemented)

### 1. DeveloperView Wipe Animation ✅
- **File**: `src/views/DeveloperView.vue` (lines 595-680)
- **Status**: WORKING - Pixel-based wipe animation implemented
- **How it works**:
  - Calculates wipe progress: `(timeMs - startTime) / (endTime - startTime)`
  - Finds syllable pixel bounds and wipe position
  - Highlights characters whose START position < wipeX
  - Characters stay highlighted after syllable ends (persistence)
- **Colors used**: 
  - `COLOR_HIGHLIGHTED = 2` (bright color)
  - `COLOR_UNHIGHLIGHTED = 15` (white)

### 2. TextRenderComposer Service ✅
- **File**: `src/karaoke/presentation/TextRenderComposer.ts` (570+ lines)
- **Status**: COMPLETE - Reusable composition engine
- **Provides**: 
  - `charToSyllableMap` with `startTime` and `endTime` for each syllable
  - `PlaceableLine[]` output ready for layout

### 3. Command Infrastructure ✅
- **File**: `src/karaoke/presentation/Command.ts`
- **Defined LogicalColors**:
  - `Background` = 'background'
  - `ActiveText` = 'active'
  - `TransitionText` = 'transition'
- **Available Commands**:
  - `ShowTextCommand` - display text
  - `ChangeColorCommand` - change color of character range at specific time
  - `RemoveTextCommand` - remove text

### 4. CDG Renderer Infrastructure ✅
- **Files**:
  - `src/karaoke/renderers/CDGFileRenderer.ts`
  - `src/karaoke/renderers/cdg/CDGCore.ts`
- **Color Mapping**: 
  - Default: `activeColor = 1` (yellow), `backgroundColor = 0`, `transitionColor = 2`
  - Can be configured via `CDGRendererConfig`
- **Handler**: `handleChangeColor()` already implements character-range recoloring

### 5. TimingConverter Syllable Highlighting ✅
- **File**: `src/karaoke/presentation/TimingConverter.ts` (lines 318-410)
- **Status**: COMPLETE - Fixed with revert commands
- **Currently generates**:
  - `ChangeColorCommand` at `syllable.startTime` to change to `LogicalColor.ActiveText`
  - `ChangeColorCommand` at `syllable.endTime` to change to `LogicalColor.TransitionText`
  - Correctly maps syllables to wrapped lines and character positions
- **What was fixed**:
  - Added missing endTime revert commands that turn off highlighting when syllable ends

---

## What's Missing for CDG Export

### ✅ FIXED: Revert Color Commands
**The Problem**: TimingConverter was generating highlight-ON commands but never generating highlight-OFF commands.

**Fixed Flow** (now implemented):
```
syllable.startTime → ChangeColorCommand(ActiveText) → wipe animation happens
syllable.endTime   → ChangeColorCommand(TransitionText) → revert to default
```

**What was changed**:
- Added lines 395-406 in `TimingConverter.ts` to generate the endTime revert command
- Uses `LogicalColor.TransitionText` to revert (consistent with other text elements)

---

## Color Consistency Check

| Component | Color Config | Status |
|-----------|--------------|--------|
| DeveloperView | `COLOR_HIGHLIGHTED=2`, `COLOR_UNHIGHLIGHTED=15` | ✅ Using defined values |
| CDGFileRenderer | `activeColor=1`, `transitionColor=2` | ✅ Configurable defaults |
| LogicalColor enum | Background, ActiveText, TransitionText | ✅ Defined |
| TimingConverter | Uses `LogicalColor.ActiveText` for ON, `LogicalColor.TransitionText` for OFF | ✅ Fixed |
| CDGCore | Maps LogicalColor → palette indices | ✅ Handles all colors |

---

## Integration Path

1. ✅ **DeveloperView**: Wipe animation working (real-time preview)
2. ✅ **TextRenderComposer**: Provides syllable timing and layout
3. ✅ **TimingConverter**: Now generates both startTime and endTime revert commands
4. ✅ **CDGCore/CDGFileRenderer**: Already supports ChangeColorCommand
5. ✅ **Colors**: All defined and mapped correctly

---

## Status Summary

**✅ COMPLETE**: All pieces integrated for syllable-level wipe animation with proper color persistence and reversion

- DeveloperView preview: Pixel-based wipe animation flowing during syllable duration
- CDG export: Generates ChangeColorCommand at both startTime (highlight) and endTime (revert)
- Color consistency: DeveloperView colors match CDG mapped colors
- Persistence: Characters highlighted after syllable end with TransitionText color
