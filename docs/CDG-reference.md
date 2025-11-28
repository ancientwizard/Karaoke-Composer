# 🎼 CD+G Packet Format and Encoding Summary

## 📦 CD+G Packet Structure

A **CD+G packet** is a fixed-length 24-byte structure used to encode graphical instructions alongside audio data on CD+G discs. Each packet consists of:

- **Byte 0**: Command (e.g., tile block, color table, scroll)
- **Byte 1**: Instruction (subtype of command)
- **Bytes 2–3**: Parity (error correction)
- **Bytes 4–19**: Payload (typically 16 bytes of graphics data)
- **Bytes 20–23**: Additional parity

These packets encode low-resolution visuals such as 12×6 pixel tiles, palette changes, and scrolling effects. The format is defined by the CD+G specification, an extension of the Red Book audio CD standard.

## 🔗 CD+G Encoding via Subchannels

CD+G data is embedded into the **R–W subchannels** of the audio CD format. These are six 1-bit channels (R, S, T, U, V, W) available in each CD frame. While the main channel carries 2,352 bytes of audio, the subchannels provide a narrow auxiliary stream:

- **6 bits per frame** (1 bit from each of R–W)
- CD+G packets are serialized across **32 consecutive frames**, yielding:

  \[
  32 \text{ frames} \times 6 \text{ bits} = 192 \text{ bits} = 24 \text{ bytes}
  \]

Thus, each CD+G packet is spread across 32 frames, and the effective bandwidth is limited by the audio CD’s frame rate. This results in approximately **2.34 CD+G packets per second**, constraining visual update speed and resolution.

## 💾 .CDG Files and Playback Versatility

A **.cdg file** is a raw dump of CD+G packets, typically used in karaoke playback software. These files contain only the graphics data — no audio — and are structured as a continuous stream of 24-byte packets.

Unlike CD+G discs, .cdg files are not bound by subchannel bandwidth. They are often encoded or interpreted at **300 packets per second**, providing:

- **Higher temporal resolution**
- **Smoother visual transitions**
- **More flexible playback and editing**

This decoupling from physical disc constraints allows .cdg files to serve as a more versatile format for karaoke and CD+G emulation. However, the shared structure — the 24-byte packet — is the **only commonality** between CD+G discs and .cdg files.

## 📌 Summary

+-----------------+-------------------+------------------------+
| Feature         | CD+G Disc         | .CDG File              |
+-----------------+-------------------+------------------------+
| Packet Format   | 24 bytes          | 24 bytes               |
| Encoding Medium | R–W subchannels   | Raw file               |
| Bandwidth       | ~2.34 packets/sec | 300 packets/sec        |
| Audio Included  | Yes               | No                     |
| Flexibility     | Limited by disc   | High (software-driven) |
+-----------------+-------------------+------------------------+

This distinction is critical when designing playback systems, encoders, or renderers that aim to support both formats. CD+G’s subchannel encoding is a clever use of otherwise unused bandwidth, but .cdg files unlock the fuller potential of the packet format.
