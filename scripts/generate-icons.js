const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Generates a valid PNG file of specified dimensions with dark background and centered white triangle
function createPng(width, height) {
  const rowSize = width * 4 + 1; // 4 bytes per pixel (RGBA) + 1 filter byte
  const rawData = Buffer.alloc(rowSize * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter: None

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;

      // Coordinate normalized to [0, 1]
      const nx = x / width;
      const ny = y / height;

      // Triangle check: top at (0.5, 0.22), bottom-left at (0.2, 0.78), bottom-right at (0.8, 0.78)
      const inTriangle =
        ny >= 0.22 &&
        ny <= 0.78 &&
        nx >= 0.5 - ((ny - 0.22) / (0.78 - 0.22)) * 0.35 &&
        nx <= 0.5 + ((ny - 0.22) / (0.78 - 0.22)) * 0.35;

      if (inTriangle) {
        rawData[pxOffset] = 255; // R
        rawData[pxOffset + 1] = 255; // G
        rawData[pxOffset + 2] = 255; // B
        rawData[pxOffset + 3] = 255; // A
      } else {
        // Dark gradient background #0a0e1a
        rawData[pxOffset] = 10; // R
        rawData[pxOffset + 1] = 14; // G
        rawData[pxOffset + 2] = 26; // B
        rawData[pxOffset + 3] = 255; // A
      }
    }
  }

  const compressedData = zlib.deflateSync(rawData);

  // Helper to build chunk
  function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);

    const typeBuf = Buffer.from(type, 'ascii');
    const crcBuf = Buffer.alloc(4);

    // CRC32 table
    let crc = 0xffffffff;
    const updateCrc = (b) => {
      for (let i = 0; i < b.length; i++) {
        crc ^= b[i];
        for (let j = 0; j < 8; j++) {
          crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
        }
      }
    };
    updateCrc(typeBuf);
    updateCrc(data);
    crc ^= 0xffffffff;
    crcBuf.writeUInt32BE(crc >>> 0, 0);

    return Buffer.concat([len, typeBuf, data, crcBuf]);
  }

  // PNG Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR Chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth: 8
  ihdrData[9] = 6; // color type: RGBA (6)
  ihdrData[10] = 0; // compression: deflate
  ihdrData[11] = 0; // filter method
  ihdrData[12] = 0; // interlace: none

  const ihdrChunk = chunk('IHDR', ihdrData);
  const idatChunk = chunk('IDAT', compressedData);
  const iendChunk = chunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

const iconsDir = path.join(__dirname, '..', 'dashboard', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

fs.writeFileSync(path.join(iconsDir, 'icon-192.png'), createPng(192, 192));
fs.writeFileSync(path.join(iconsDir, 'icon-512.png'), createPng(512, 512));
fs.writeFileSync(path.join(iconsDir, 'icon-maskable.png'), createPng(512, 512));

console.log('✔ Generated 192x192, 512x512, and maskable PNG app icons successfully.');
