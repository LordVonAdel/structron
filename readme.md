# Structron
Structron is a reader for binary data. It parses buffers from in code defined models and returns the result as object.

## Installation
Install using [npm](https://www.npmjs.com/):
```
npm i structron
```

## Example
Example of reading a custom image format with the following structure:
```
header:
  int magicNumber   (Magic number of the file)
  Dimensions size   (Custom Data-Type of 2 ints)
  int pixelOffset   (Start address of the pixel array)
  int pixelNumber   (Pixel array size)
  int namePosition  (Pointer to a null-terminated string)
  int unused[2]     (2 unused integer reserved for later use)

pixel:
  rgb565 color      (Color values)
  byte alpha        (Opacity)
```

Reading with structron:
```js
const Struct = require('structron');

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
  .addReference(Struct.TYPES.NULL_TERMINATED_STRING('ASCII'), "name", "nameIndex")
  .addArray(Pixel, "pixels", "pixelOffset", "pixelNumber")
  .addRule(Struct.RULES.EQUAL("magicNumber", 604051865));

// --- And now import our image ---
const data = Buffer.from("mRkBJAQAAAAEAAAAUAAAAAAAAAAAAAAAAAAAAAAAAAAhKjM8RU5XYGlye4SNlp+osbrDzNXe5/D5AwwVHicwOUJLVF1mb3iBipOcpa63wMlUaW5hAA==", "base64");

let ctx = Image.readContext(data);

// Check for errors in the input data
if (!ctx.hasErrors()) {

  // Log the result
  console.log(ctx.data);
}
```
`ctx.data` will then look like this:
```json
{
  "magicNumber": 604051865,
  "size": { "width": 4, "height": 4 },
  "pixelOffset": 32,
  "pixelNumber": 16,
  "nameIndex": 80,
  "unused": null,
  "pixels": [
    { "color": { "r": 5,  "g": 17, "b": 1 },  "alpha": 51 },
    { "color": { "r": 8,  "g": 41, "b": 28 }, "alpha": 78 },
    { "color": { "r": 12, "g": 2,  "b": 23 }, "alpha": 105 },
    { "color": { "r": 15, "g": 27, "b": 18 }, "alpha": 132 },
    { "color": { "r": 18, "g": 52, "b": 13 }, "alpha": 159 },
    { "color": { "r": 22, "g": 13, "b": 8 },  "alpha": 186 },
    { "color": { "r": 25, "g": 38, "b": 3 },  "alpha": 213 },
    { "color": { "r": 28, "g": 62, "b": 30 }, "alpha": 240 },
    { "color": { "r": 0,  "g": 31, "b": 25 }, "alpha": 12 },
    { "color": { "r": 3,  "g": 48, "b": 21 }, "alpha": 39 },
    { "color": { "r": 7,  "g": 9,  "b": 16 }, "alpha": 66 },
    { "color": { "r": 10, "g": 34, "b": 11 }, "alpha": 93 },
    { "color": { "r": 13, "g": 59, "b": 6 },  "alpha": 120 },
    { "color": { "r": 17, "g": 20, "b": 1 },  "alpha": 147 },
    { "color": { "r": 20, "g": 44, "b": 28 }, "alpha": 174 },
    { "color": { "r": 24, "g": 5,  "b": 23 }, "alpha": 201 }
  ],
  "name": "Tina"
}
```

## Methods
### `struct.read(buffer, offset)`
Reads data from a buffer from a specific address on. Returns the data as object.

### `struct.readContext(buffer, offset, options)`
Reads data from a buffer from a specific address on. Returns an object containing additional data about the import like how many bytes were actually read. The returned object also holds the imported data.

`options.monitorUsage`: Keep track of what bytes were read.

`options.hideReferenceValues`: Remove reference fields (array offset, array length and reference offset fields) from output data.

### `struct.validate(buffer, offset)`
Returns an boolean if the data matches the struct.

### `struct.addMember(type, name)`
Adds an member to the struct definition.

### `struct.addArray(type, name, index, length, relative)`
`type` is the type of the elements in the array. To work, the size of the elements need to be correct.

`name` is the name of the member that will be added to the output object containing the array.

`index` is the start address of the array. If a string is given, it will read the value from another member with that name.

`length` is the number of elements in the array. (Not the size in bytes!). If a string is given, it will read the value from another member with that name.

When `relative` is set to true, the array will be read from the index + the structs address.

### `struct.addReference(type, name, index, relative)`
Circular references are possible.

`type` is the type of the object to reference.

`name` is the name of the member that will be added to the output object.

`index` is the start address of the element to load. If a string is given, it will read the value from another member with that name.

When `relative` is set to true, the index is relative to the start of the parent struct.

### `struct.addRule(rule)`
Adds a rule. A rule is like a test. If it is not successful, an error will be added to the report.

### `struct.addStatic(name, value)`
Adds a static value. These will show in the output data, but will not be written to buffers when writing.

### `write(object, context, offset)`
Writes a struct to a buffer. Returns a new context if none is given. 

## Inbuilt Types
These inbuilt types are accessible with `Structron.TYPES.`

### `INT`
4 byte signed little-endian Integer

### `INT_BE`
4 byte signed big-endian Integer

### `UINT`
4 byte unsigned little-endian Integer

### `UINT_BE`
2 byte unsigned big-endian Integer

### `SHORT`
2 byte signed little-endian Integer

### `SHORT_BE`
2 byte signed big-endian Integer

### `USHORT`
2 byte signed little-endian Integer

### `USHORT_BE`
2 byte signed big-endian Integer

### `BYTE`
Unsigned 1 byte

### `FLOAT`
4 byte little-endian Float

### `FLOAT_BE`
4 byte big-endian Float

### `CHAR`
1 ASCII character

### `STRING(length, encoding)`
String with variable length. 
Supports all encodings from `buffer.toString()`.

### `NULL_TERMINATED_STRING(encoding)`
Null terminated string. Reads a string from an address until a null byte is hit.
Can't be used inside a Struct. Only as reference.
Supports all encodings from `buffer.toString()`.

### `SKIP(length)`
Skips a given amount of bytes.