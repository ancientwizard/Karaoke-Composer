#!/usr/bin/env node
/*
# CDG Constants

Constants for CD+G file format.
*/

// CDG packet size (always 24 bytes: 4 header + 16 data + 4 checksum)
const CDG_PACKET_SIZE = 24

// CDG packets per second (standard timing)
const CDG_PPS = 300 / 1000 // 0.3 packets per millisecond, or 300 per second

module.exports = { CDG_PACKET_SIZE, CDG_PPS }

// END
