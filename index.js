class Struct {

  /**
   * Creates a new struct definition
   * @param {=String} name Optional name. Only used for debugging purposes
   */
  constructor(name = "") {
    this.members = [];
    this.arrays = [];
    this.references = [];
    this.name = name;
  }

  /**
   * Adds a member to load
   * @param {Type} type Datatype of the member to load
   * @param {String} name Name of the member
   * @returns {Struct}
   */
  addMember(type, name) {
    this.members.push({type, name});
    return this;
  }

  /**
   * Adds a an array to load from values inside this struct. The order is not important
   * @param {Type} type Datatype of the member to load
   * @param {String} name Name of the member
   * @param {String} offsetMemberName Name of the member which stores the address of the array
   * @param {String} countMemberName Name of the member which stores the length of the array
   * @param {Boolean} relative Is the address in the target member relative to the structs address?
   * @returns {Struct}
   */
  addArray(type, name, offsetMemberName, countMemberName, relative = false) {
    this.arrays.push({
      name,
      offsetMemberName,
      countMemberName,
      type,
      relative
    });
    return this;
  }

  /**
   * Adds a reference. References will appear as own members in the out data.
   * @param {*} type Type of the reference
   * @param {String} name Name of the new data member
   * @param {String} membername Name of the address containg existing data member
   * @param {Boolean} relative Is the adress relative to the structs address?
   * @returns {Struct}
   */
  addReference(type, name, memberName, relative = false) {
    this.references.push({
      type,
      name,
      memberName,
      relative
    });
    return this;
  }

  /**
   * Converts a buffer to an object with the structs structure
   * @param {Buffer} buffer Buffer to read from
   * @param {=Number} offset Offset i bytes to start reading from
   */
  import(buffer, offset = 0) {
    let data = {};
    let address = offset;
    for (let member of this.members) {
      data[member.name] = member.type.import(buffer, address);
      address += member.type.SIZE;
    }

    for (let array of this.arrays) {
      let arrayOffset = data[array.offsetMemberName];
      let arrayCount = data[array.countMemberName];
      if (array.relative) arrayOffset += offset;

      let arr = [];
      for (let i = 0; i < arrayCount; i++) {
        arr.push(
          array.type.import(buffer, arrayOffset + i * array.type.SIZE)
        );
      }
      data[array.name] = arr;
    }

    for (let reference of this.references) {
      let referenceOffset = data[reference.memberName];
      if (reference.relative) referenceOffset += offset;
      data[reference.name] = reference.type.import(buffer, referenceOffset);
    }

    return data;
  }

  /**
   * Validates a structure
   * @param {Buffer} buffer Buffer to read from
   * @param {Number} offset Byte offset in the buffer to begin reading from
   * @returns {Boolean} True when valid 
   */
  validate(buffer, offset = 0) {
    try {
      this.import(buffer, offset)
      return true;
    } catch (e) {
      return false;
    }
  }

  get SIZE() {
    return this.members.reduce((val, member) => val + member.type.SIZE, 0);
  }

  getOffsetByName(name) {
    let address = 0;
    for (let member of this.members) {
      if (member.name == name) return address;
      address += member.type.SIZE
    }
    return NaN;
  }

}

Struct.TYPES = {
  /* 
   * Signed 4 byte LE Integer 
   */
  INT: {
    import(buffer, offset) {
      return buffer.readInt32LE(offset)
    },
    SIZE: 4
  },

  /**
   * Unsigned 4 byte LE integer
   */
  UINT: {
    import(buffer, offset) {
      return buffer.readUInt32LE(offset)
    },
    SIZE: 4
  },

  /**
   * Unsigned 16 bit LE integer
   */
  USHORT: {
    import(buffer, offset) {
      return buffer.readUInt16LE(offset)
    },
    SIZE: 2
  },

  /**
   * Signed 16 bit LE integer
   */
  SHORT: {
    import(buffer, offset) {
      return buffer.readInt16LE(offset)
    },
    SIZE: 2
  },

  /**
   * 4 Byte LE float
   */
  FLOAT: {
    import(buffer, offset) {
      return buffer.readFloatLE(offset)
    },
    SIZE: 4
  },

  /**
   * 1 Byte char
   */
  CHAR: {
    import(buffer, offset) {
      return buffer.readUInt8(offset)
    },
    SIZE: 1
  },

  /**
   * Unsigned 8 bit int
   */
  BYTE: {
    import(buffer, offset) {
      return buffer.readUInt8(offset)
    },
    SIZE: 1
  },

  /**
   * String with fixed Length
   * @param {Number} length Length to read
   * @param {=String} encoding Codec to use. Anything that is supported by buffer.toString()
   */
  STRING(length, encoding = "ascii") {
    return {
      import(buffer, offset) {
        return buffer.toString(encoding, offset, offset + length).replace(/\0/g, '');
      },
      SIZE: length
    }
  },

  /**
   * Null terminated string
   * @param {=String} encoding Codec to use. Anything that is supported by buffer.toString()
   */
  NULL_TERMINATED_STRING(encoding = "ascii") {
    return {
      import(buffer, offset) {
        let len = 0;
        while (buffer.readUInt8(offset + len) != 0) {
          len++;
        }
        return buffer.toString(encoding, offset, offset + len)
      },
      SIZE: NaN
    }
  },

  /**
   * Skips a given amount of bytes
   * @param {Number} length Number of bytes to skip
   */
  SKIP(length) {
    return {
      import() { return null },
      SIZE: length
    }
  }
}

module.exports = Struct;
