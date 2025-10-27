import fs from 'fs';
import path from 'path';

function readUInt8(buf: Buffer, offset: number) {
  return {
 value: buf[offset], size: 1 
};
}
function readIntBE(buf: Buffer, offset: number) {
  if (offset + 4 > buf.length) throw new Error(`readIntBE out of range (offset=${offset}, len=${buf.length})`);
  // Manual big-endian read to avoid ESM Buffer method edge-cases during quick parsing.
  const b0 = buf[offset] & 0xFF;
  const b1 = buf[offset + 1] & 0xFF;
  const b2 = buf[offset + 2] & 0xFF;
  const b3 = buf[offset + 3] & 0xFF;
  const value = (b0 << 24) | (b1 << 16) | (b2 << 8) | b3;
  return {
 value: value | 0, size: 4 
};
}
function readShortBE(buf: Buffer, offset: number) {
  if (offset + 2 > buf.length) throw new Error(`readShortBE out of range (offset=${offset}, len=${buf.length})`);
  const b0 = buf[offset] & 0xFF;
  const b1 = buf[offset + 1] & 0xFF;
  const value = (b0 << 8) | b1;
  return {
 value: value | 0, size: 2 
};
}
function readString(buf: Buffer, offset: number) {
  let end = offset;
  while (end < buf.length && buf[end] !== 0) end++;
  const value = buf.toString('utf8', offset, end);
  return {
 value, size: (end - offset) + 1 
};
}

function ensure(prefix: string, actual: string) {
  if (actual !== prefix) throw new Error(`Expected '${prefix}' but got '${actual}'`);
}

function parseBMPClip(buf: Buffer, off: number) {
  const startOff = off;
  const track = readUInt8(buf, off); off += 1;
  const start = readIntBE(buf, off).value; off += 4;
  const duration = readIntBE(buf, off).value; off += 4;
  console.log(`parseTextClip: after text, offset=${off}, bufLen=${buf.length}, remaining=${buf.length-off}`);
  if (off + 4 > buf.length) { console.log('Remaining tail:', buf.slice(off).toString('hex')); }
  const total_events = readIntBE(buf, off).value; off += 4;

  const events: any[] = [];
  for (let ev = 0; ev < total_events; ev++) {
    const clip_time_offset = readIntBE(buf, off).value; off += 4;
    const clip_time_duration = readIntBE(buf, off).value; off += 4;
    const bmpPathRes = readString(buf, off); const bmp_path = bmpPathRes.value; off += bmpPathRes.size;
    const height = readIntBE(buf, off).value; off += 4;
    const width = readIntBE(buf, off).value; off += 4;
    const x_offset = readIntBE(buf, off).value; off += 4;
    const y_offset = readIntBE(buf, off).value; off += 4;
    const fill_index = readUInt8(buf, off).value; off += 1;
    const composite_index = readUInt8(buf, off).value; off += 1;
    const should_composite = readIntBE(buf, off).value; off += 4;
    const border_index = readUInt8(buf, off).value; off += 1;
    const screen_index = readUInt8(buf, off).value; off += 1;
    const should_palette = readIntBE(buf, off).value; off += 4;
    const transRes = readString(buf, off); const transition_file = transRes.value; off += transRes.size;
    const transition_length = readShortBE(buf, off).value; off += 2;

    events.push({
 clip_time_offset, clip_time_duration, bmp_path, width, height, x_offset, y_offset, fill_index, composite_index, should_composite, border_index, screen_index, should_palette, transition_file, transition_length 
});
  }

  return {
 clip: {
 type: 'BMPClip', track, start, duration, total_events, events 
}, size: off - startOff 
};
}

function parseTextClip(buf: Buffer, off: number) {
  console.log(`parseTextClip start offset=${off}, next32=${buf.slice(off, Math.min(buf.length, off+32)).toString('hex')}`);
  const startOff = off;
  function rU8(name?: string) { const v = readUInt8(buf, off).value; console.log(`  rU8 ${name||''} @${off} => ${v}`); off += 1; return v; }
  function rI32(name?: string) { console.log(`  rI32(about to read) ${name||''} off=${off}`); const res = readIntBE(buf, off); console.log(`  rI32 ${name||''} @${off} => ${res.value}`); off += res.size; return res.value; }
  function rI16(name?: string) { const res = readShortBE(buf, off); console.log(`  rI16 ${name||''} @${off} => ${res.value}`); off += res.size; return res.value; }
  function rStr(name?: string) { const res = readString(buf, off); console.log(`  rStr ${name||''} @${off} => '${res.value}' (${res.size} bytes)`); off += res.size; return res.value; }

  const track = rU8('track');
  const start = rI32('start');
  const duration = rI32('duration');
  const font_face = rStr('font_face');
  const font_size = rI32('font_size');
  const karaoke_mode = rU8('karaoke_mode');
  const highlight_mode = rU8('highlight_mode');
  const foreground_color = rU8('foreground_color');
  const background_color = rU8('background_color');
  const outline_color = rU8('outline_color');
  const square_size = rU8('square_size');
  const round_size = rU8('round_size');
  const frame_color = rU8('frame_color');
  const box_color = rU8('box_color');
  const fill_index = rU8('fill_index');
  const composite_index = rU8('composite_index');
  const should_composite = rI32('should_composite');
  const xor_bandwidth = rI32('xor_bandwidth');
  const antialias_mode = rI32('antialias_mode');
  const default_palette_number = rI32('default_palette_number');
  const text_length = rI32('text_length');
  const text = rStr('text');

  console.log(`before total_events: off=${off}, bufLen=${buf.length}`);
  let total_events: number;
  if (off + 4 > buf.length) {
    console.warn('EOF reached unexpectedly after text; assuming total_events = 0');
    total_events = 0;
  } else {
    total_events = rI32('total_events');
    console.log(`  total_events read as ${total_events} at offset ${off}`);
  }
  const events: any[] = [];
  for (let ev = 0; ev < total_events; ev++) {
    const clip_time_offset = readIntBE(buf, off).value; off += 4;
    const clip_time_duration = readIntBE(buf, off).value; off += 4;
    const width = readIntBE(buf, off).value; off += 4;
    const height = readIntBE(buf, off).value; off += 4;
    const clip_x_offset = readIntBE(buf, off).value; off += 4;
    const clip_y_offset = readIntBE(buf, off).value; off += 4;
    const transition_file_res = readString(buf, off); const transition_file = transition_file_res.value; off += transition_file_res.size;
    const transition_length = readShortBE(buf, off).value; off += 2;
    const clip_kar_type = readIntBE(buf, off).value; off += 4;
    const clip_line_num = readIntBE(buf, off).value; off += 4;
    const clip_word_num = readIntBE(buf, off).value; off += 4;

    events.push({
 clip_time_offset, clip_time_duration, width, height, clip_x_offset, clip_y_offset, transition_file, transition_length, clip_kar_type, clip_line_num, clip_word_num 
});
  }

  return {
 clip: {
 type: 'TextClip', track, start, duration, font_face, font_size, karaoke_mode, highlight_mode, foreground_color, background_color, outline_color, square_size, round_size, frame_color, box_color, fill_index, composite_index, should_composite, xor_bandwidth, antialias_mode, default_palette_number, text, events 
}, size: off - startOff 
};
}

function parseProject(buf: Buffer) {
  let off = 0;
  const headerRes = readString(buf, off); const header = headerRes.value; off += headerRes.size;
  ensure('CDGMagic_ProjectFile::', header);

  const audioHeaderRes = readString(buf, off); const audioHeader = audioHeaderRes.value; off += audioHeaderRes.size; ensure('CDGMagic_AudioPlayback::', audioHeader);
  const audioPathRes = readString(buf, off); const audioPath = audioPathRes.value; off += audioPathRes.size;

  off += 4; // skip play position int

  const trackOptionsHeaderRes = readString(buf, off); const trackOptionsHeader = trackOptionsHeaderRes.value; off += trackOptionsHeaderRes.size; ensure('CDGMagic_TrackOptions::', trackOptionsHeader);
  const channels: number[] = [];
  for (let trk = 0; trk < 8; trk++) { channels.push(readUInt8(buf, off).value); off += 1; }

  const num_events = readIntBE(buf, off).value; off += 4;
  const clips: any[] = [];
  let i = 0;
  while (i < num_events && off < buf.length) {
    const nextHeaderRes = readString(buf, off);
    const nextHeader = nextHeaderRes.value;
    console.log(`Clip[${i}] at offset ${off}: header='${nextHeader}'`);
    if (!nextHeader || nextHeader.length === 0) {
      const dump = buf.slice(off, Math.min(buf.length, off + 64)).toString('hex').match(/.{1,2}/g)?.join(' ');
      console.log(`Raw bytes: ${dump}`);
      break; // reached end or padding
    }
    off += nextHeaderRes.size;
    if (nextHeader === 'CDGMagic_BMPClip::') {
      const res = parseBMPClip(buf, off);
      clips.push(res.clip);
      off += res.size;
    } else if (nextHeader === 'CDGMagic_TextClip::') {
      const res = parseTextClip(buf, off);
      clips.push(res.clip);
      off += res.size;
    } else {
      console.warn(`Unknown clip header at index ${i}: ${nextHeader}, stopping parse.`);
      break;
    }
    i++;
  }
  if (i < num_events) {
    console.warn(`Expected ${num_events} clips but parsed ${i}; file may have padding or truncation.`);
  }

  return {
 audioPath, channels, clips 
};
}

function main() {
  const argv = process.argv.slice(2);
  if (argv.length < 1) { console.error('Usage: node parse-cmp.js <project.cmp> [out.json]'); process.exit(2); }
  const inPath = argv[0];
  const outPath = argv[1] || path.join('diag', path.basename(inPath) + '.json');
  const buf = fs.readFileSync(inPath);
  const parsed = parseProject(buf);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(parsed, null, 2), 'utf8');
  console.log('Wrote', outPath);
}

// Support ESM execution via `npx tsx`.
if ((globalThis as any).process && (globalThis as any).process.argv) {
  // When run as a script via node/tsx the script argv will exist.
  if (process.argv[1] && process.argv[1].endsWith('parse-cmp.ts')) {
    main();
  }
}
