const Struct = require('./index.js');

function testImage() {
  // --- First we need to define the custom datatypes ---

  // Define via another struct
  const Dimensions = new Struct()
    .addMember(Struct.TYPES.INT, "width")
    .addMember(Struct.TYPES.INT, "height");

  // Define via custom function
  const rgb565 = {
    read(buffer, offset) {
      let short = buffer.readUInt16LE(offset);
      return {
        r: (short & 0b1111100000000000) >> 11,
        g: (short & 0b0000011111100000) >> 5,
        b: (short & 0b0000000000011111)
      }
    },
    write(value, context, offset) {
      let val = (value.r << 11) | (value.g << 5) | value.b;
      context.buffer.writeUInt16LE(val, offset);
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

  // Create image data
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

  // Read image data
  let out = Image.report(data, 0, { hideReferenceValues: true });
  if ("nameIndex" in out.data) return false;

  let jsonData = `{"magicNumber":604051865,"size":{"width":4,"height":4},"unused":null,"pixels":[{"color":{"r":5,"g":17,"b":1},"alpha":51},{"color":{"r":8,"g":41,"b":28},"alpha":78},{"color":{"r":12,"g":2,"b":23},"alpha":105},{"color":{"r":15,"g":27,"b":18},"alpha":132},{"color":{"r":18,"g":52,"b":13},"alpha":159},{"color":{"r":22,"g":13,"b":8},"alpha":186},{"color":{"r":25,"g":38,"b":3},"alpha":213},{"color":{"r":28,"g":62,"b":30},"alpha":240},{"color":{"r":0,"g":31,"b":25},"alpha":12},{"color":{"r":3,"g":48,"b":21},"alpha":39},{"color":{"r":7,"g":9,"b":16},"alpha":66},{"color":{"r":10,"g":34,"b":11},"alpha":93},{"color":{"r":13,"g":59,"b":6},"alpha":120},{"color":{"r":17,"g":20,"b":1},"alpha":147},{"color":{"r":20,"g":44,"b":28},"alpha":174},{"color":{"r":24,"g":5,"b":23},"alpha":201}],"name":"Tina"}`;
  if (JSON.stringify(out.data) != jsonData) return false;

  // Write image data
  let ctx = Image.write(JSON.parse(jsonData));
  let buffer = ctx.buffer;

  // Read image data again from written buffer
  let report = Image.report(buffer, 0, { hideReferenceValues: true });
  let newJsonData = JSON.stringify(report.data);
  return (newJsonData == jsonData);
}

/**
 * Tests overlapping arrays and usage
 */
function testReadOverlappingArrays() {
  let buffer = Buffer.alloc(64);

  buffer.writeUInt8(16, 0);
  buffer.writeUInt8(48, 1);
  buffer.writeUInt8(32, 2);
  buffer.writeUInt8(16, 3);

  let testStruct = new Struct()
    .addMember(Struct.TYPES.BYTE, "aPos")
    .addMember(Struct.TYPES.BYTE, "aLen")
    .addMember(Struct.TYPES.BYTE, "bPos")
    .addMember(Struct.TYPES.BYTE, "bLen")
    .addArray(Struct.TYPES.BYTE, "a", "aPos", "aLen")
    .addArray(Struct.TYPES.BYTE, "b", "bPos", "bLen");

  let report = testStruct.report(buffer);
  return report.errors.length == 1 && report.getUsage() == 52;
}

function testRuleEqual() {
  let buffer = Buffer.alloc(64);
  buffer.writeUInt32LE(0x12657832, 0);

  let testStruct = new Struct()
    .addMember(Struct.TYPES.UINT, "magic")
    .addRule(Struct.RULES.EQUAL("magic", 308639794))
    .addRule(Struct.RULES.EQUAL("magic", 42));

  let report = testStruct.report(buffer);
  return report.errors.length == 1;
}

function testCharType() {
  let buffer = Buffer.alloc(8);
  buffer[0] = 2;
  buffer[1] = 6;
  buffer[2] = 76;
  buffer[3] = 69;
  buffer[4] = 79;
  buffer[5] = 78;
  buffer[6] = 73;
  buffer[7] = 69;

  let testStruct = new Struct()
    .addMember(Struct.TYPES.BYTE, "offset")
    .addMember(Struct.TYPES.BYTE, "length")
    .addArray(Struct.TYPES.CHAR, "chars", "offset", "length")

  let report = testStruct.report(buffer);
  return report.data.chars.join("") == "LEONIE";
}

function testRecursiveRead() {
  let buffer = Buffer.alloc(16);
  buffer.writeUInt32LE(2206, 0);
  buffer.writeUInt32LE(8, 4);
  buffer.writeUInt32LE(1994, 8);
  buffer.writeUInt32LE(0, 12);

  let node = new Struct()
    .addMember(Struct.TYPES.INT, "exampleValue")
    .addMember(Struct.TYPES.INT, "partnerOffset");
  node.addReference(node, "partner", "partnerOffset");

  let report = node.report(buffer);
  return (report.data.partner.exampleValue === report.data.partner.partner.partner.exampleValue);
}

console.log("--- Reading tests ---")
console.log("Overlapping arrays:", testReadOverlappingArrays());
console.log("Equal rule:", testRuleEqual());
console.log("Character type:", testCharType());
console.log("Recursive:", testRecursiveRead());

console.log("--- Common ---");
console.log("Image:", testImage());