const Struct = require('./index.js');

// --- First we need to define the custom datatypes ---

// Define via another struct
const Dimensions = new Struct()
  .addMember(Struct.TYPES.INT, "width")
  .addMember(Struct.TYPES.INT, "height");

// Define via custom function
const rgb565 = {
  import(buffer, offset) {
    let short = buffer.readUInt16LE(offset);
    return {
      r: short & 0b1111100000000000 >> 11,
      g: short & 0b0000011111100000 >> 5,
      b: short & 0b0000000000011111
    }
  },
  SIZE: 2 // Size in bytes
};

const Pixel = new Struct()
  .addMember(rgb565, "color")
  .addMember(Struct.TYPES.BYTE, "alpha");

// --- Then we define our file header ---
const Image = new Struct()
  .addMember(Struct.TYPES.INT, "magicNumber")
  .addMember(Dimensions, "size")
  .addMember(Struct.TYPES.INT, "pixelOffset")
  .addMember(Struct.TYPES.INT, "pixelNumber")
  .addMember(Struct.TYPES.INT, "nameIndex")
  .addMember(Struct.TYPES.SKIP(8), "unused")
  .addReference(Struct.TYPES.NULL_TERMINATED_STRING(), "name", "nameIndex")
  .addArray(Pixel, "pixels", "pixelOffset", "pixelNumber");

let data = Buffer.alloc(85);
data.writeInt32LE(0x24011999, 0);
data.writeInt32LE(4, 4);
data.writeInt32LE(4, 8);
data.writeInt32LE(32, 12);
data.writeInt32LE(16, 16);
data.writeInt32LE(80, 20); // Name address
// Skip 24 and 28
for (let i = 32; i < 80; i++) {
  data.writeUInt8((i * 9) % 255, i);
}
data.writeInt8(0x54, 80);
data.writeInt8(0x69, 81);
data.writeInt8(0x6e, 82);
data.writeInt8(0x61, 83);
console.log(data.toString('base64'));

console.log(Image.validate(data) ? "Valid" : "Invalid");

console.log(JSON.stringify(Image.import(data)));