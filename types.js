/**
 * Inbuilt types
 */

module.exports = {
  /* 
   * Signed 4 byte LE Integer 
   */
  INT: {
    read(buffer, offset) {
      return buffer.readInt32LE(offset);
    },
    write(value, buffer, offset) {
      buffer.writeInt32LE(value, offset);
    },
    SIZE: 4
  },

  /**
   * Signed 4 byte BE Integer
   */
  INT_BE: {
    read(buffer, offset) {
      return buffer.readInt32BE(offset);
    },
    write(value, buffer, offset) {
      buffer.writeInt32BE(value, offset);
    },
    SIZE: 4
  },

  /**
   * Unsigned 4 byte LE integer
   */
  UINT: {
    read(buffer, offset) {
      return buffer.readUInt32LE(offset);
    },
    write(value, buffer, offset) {
      buffer.writeUInt32LE(value, offset);
    },
    SIZE: 4
  },

  /**
   * Unsigned 4 byte BE Integer
   */
  UINT_BE: {
    read(buffer, offset) {
      return buffer.readUInt32BE(offset);
    },
    write(value, buffer, offset) {
      buffer.writeUInt32BE(value, offset);
    },
    SIZE: 4
  },


  /**
   * Signed 16 bit LE integer
   */
  SHORT: {
    read(buffer, offset) {
      return buffer.readInt16LE(offset);
    },
    write(value, buffer, offset) {
      buffer.writeInt16LE(value, offset);
    },
    SIZE: 2
  },

  /**
   * Signed 16 bit BE integer
   */
  SHORT_BE: {
    read(buffer, offset) {
      return buffer.readInt16BE(offset);
    },
    write(value, buffer, offset) {
      buffer.writeInt16BE(value, offset);
    },
    SIZE: 2
  },

  /**
   * Unsigned 16 bit LE integer
   */
  USHORT: {
    read(buffer, offset) {
      return buffer.readUInt16LE(offset);
    },
    write(value, buffer, offset) {
      buffer.writeUInt16LE(value, offset);
    },
    SIZE: 2
  },

  /**
   * Unsigned 16 bit BE integer
   */
  USHORT_BE: {
    read(buffer, offset) {
      return buffer.readUInt16BE(offset);
    },
    write(value, buffer, offset) {
      buffer.writeUInt16BE(value, offset);
    },
    SIZE: 2
  },

  /**
   * 4 Byte LE float
   */
  FLOAT: {
    read(buffer, offset) {
      return buffer.readFloatLE(offset);
    },
    write(value, buffer, offset) {
      buffer.writeFloatLE(value, offset);
    },
    SIZE: 4
  },

  /**
   * 4 Byte BE float
   */
  FLOAT_BE: {
    read(buffer, offset) {
      return buffer.readFloatBE(offset);
    },
    write(value, buffer, offset) {
      buffer.writeFLoatBE(value, offset);
    },
    SIZE: 4
  },

  /**
   * 1 ASCII character 
   */
  CHAR: {
    read(buffer, offset) {
      // Will be now (package version 0.3.0) converted to string. Hope this will not break anything
      return String.fromCharCode(buffer.readUInt8(offset));
    },
    write(value, buffer, offset) {
      buffer.writeUInt8(String(value).charCodeAt(0), offset);
    },
    SIZE: 1
  },

  /**
   * Unsigned 8 bit int
   */
  BYTE: {
    read(buffer, offset) {
      return buffer.readUInt8(offset)
    },
    write(value, buffer, offset) {
      buffer.writeUInt8(value, offset);
    },
    SIZE: 1
  },

  /**
   * String with fixed Length
   * @param {number} length Length to read
   * @param {=string} encoding Codec to use. Anything that is supported by buffer.toString()
   */
  STRING(length, encoding = "ascii") {
    return {
      read(buffer, offset) {
        return buffer.toString(encoding, offset, offset + length).replace(/\0/g, '');
      },
      write(value, buffer, offset) {
        buffer.write(value, offset);
      },
      SIZE: length
    }
  },

  /**
   * Null terminated string. Don't use this type in a struct. Only as reference!
   * @param {=string} encoding Codec to use. Anything that is supported by buffer.toString()
   */
  NULL_TERMINATED_STRING(encoding = "ascii") {
    return {
      read(buffer, offset, report = null) {
        let len = 0;
        while (buffer.readUInt8(offset + len) != 0) {
          len++;
          if (len >= buffer.length) {
            throw new Error("Null terminated string went outside buffer!");
          }
        }

        // Also report last byte as used information
        if (report) {
          report.markAreaAsRead(offset, len + 1)
        }

        return buffer.toString(encoding, offset, offset + len);
      },
      SIZE: NaN
    }
  },

  /**
   * Skips a given amount of bytes
   * @param {number} length Number of bytes to skip
   */
  SKIP(length) {
    return {
      read() { return null },
      write() {},
      SIZE: length
    }
  }
}