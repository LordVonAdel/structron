const ReadContext = require('./ReadContext.js');
const WriteContext = require('./WriteContext.js');

/**
 * @todo Fatal rules option
 * @todo Validate rules on writing
 * @todo raw data type
 */

class Struct {

  /**
   * Creates a new struct definition
   * @param {=String} name Optional name. Only used for debugging purposes
   */
  constructor(name = "") {
    this.members = [];
    this.arrays = [];
    this.references = [];
    this.rules = [];
    this.statics = [];
    this.name = name;
  }

  /**
   * Adds a member to load
   * @param {Type} type Datatype of the member to load
   * @param {string} name Name of the member
   * @returns {Struct}
   */
  addMember(type, name) {
    if (isNaN(type.SIZE)) throw new Error("Element with no fixed size is not allowed as struct member (" + name + ")!",);

    let offset = this.members.reduce((size, mem) => size+mem.SIZE, 0);
    this.members.push({type, name, offset});

    return this;
  }

  /**
   * Adds a an array to load from values inside this struct. The order is not important
   * @param {Type} type Datatype of the member to load
   * @param {string} name Name of the member
   * @param {any} offsetMemberName Number or Name of the member which stores the address of the array
   * @param {any} countMemberName Number or name of the member which stores the length of the array
   * @param {Boolean} relative Is the address in the target member relative to the structs address?
   * @returns {Struct}
   */
  addArray(type, name, offsetMemberName, countMemberName, relative = false) {

    if (typeof offsetMemberName == 'number') {
      let value = offsetMemberName;
      offsetMemberName = "_" + name + "_offset";
      this.addStatic(offsetMemberName, value);
    }

    if (typeof countMemberName == 'number') {
      let value = countMemberName;
      countMemberName = "_" + name + "_count";
      this.addStatic(countMemberName, value);
    }

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
   * @param {string} name Name of the new data member
   * @param {string} memberName Name of the address containg existing data member
   * @param {Boolean} relative Is the adress relative to the structs address?
   * @returns {Struct}
   */
  addReference(type, name, memberName, relative = false) {

    if (typeof memberName == 'number') {
      let value = memberName;
      memberName = "_" + name + "_offset";
      this.addStatic(memberName, value);
    }

    this.references.push({
      type,
      name,
      memberName,
      relative
    });
    return this;
  }

  /**
   * Adds a static value. (will not be written to, or read from buffer)
   * @param {string} name 
   * @param {any} value 
   */
  addStatic(name, value) {
    this.statics.push({
      name, 
      value
    });
    return this;
  }

  /**
   * Adds a rule. Rules give extra validation options
   * @param {Rule} rule The rule to add. Rules can be generated with the static methods of Struct.RULES
   * @returns {Struct} itself
   */
  addRule(rule) {
    this.rules.push({
      rule
    });
    return this;
  }

  /**
   * Converts a buffer to an object with the structs structure
   * @param {Buffer} buffer Buffer to read from
   * @param {=number} offset Offset byte to start reading from
   * @returns {Object} The data that was read
   */
  read(buffer, offset = 0, readContext = null) {
    let data = {};
    let address = offset;

    if (!readContext) readContext = new ReadContext({}, buffer);

    let path = readContext.path;

    for (let _static of this.statics) {
      data[_static.name] = _static.value;
    }

    for (let member of this.members) {
      readContext.path = path + "." + member.name;
      data[member.name] = member.type.read(buffer, address, readContext);
      address += member.type.SIZE;
    }

    for (let array of this.arrays) {
      let arrayOffset = data[array.offsetMemberName];
      let arrayCount = data[array.countMemberName];

      if (array.relative) arrayOffset += offset;

      let arr = [];
      for (let i = 0; i < arrayCount; i++) {
        readContext.path = path + "." + array.name + "[" + i + "]";
        arr.push(
          array.type.read(buffer, arrayOffset + i * array.type.SIZE, readContext)
        );
      }

      // Does double mark some fields that are only read once :/
      readContext.markAreaAsRead(arrayOffset, arrayCount * array.type.SIZE);

      data[array.name] = arr;

      if (readContext) {
        readContext.arrays.push({
          name: array.name,
          start: arrayOffset,
          count: arrayCount,
          length: arrayCount * array.type.SIZE,
          path: path + "." + array.name
        });
      }
    }

    for (let reference of this.references) {
      readContext.path = path + "." + reference.name;

      try {
        let referenceOffset = data[reference.memberName];
        if (reference.relative) referenceOffset += offset;

        if (referenceOffset in readContext.referenceOffsets) {
          data[reference.name] = readContext.referenceOffsets[referenceOffset];
        } else {
          let ref = reference.type.read(buffer, referenceOffset, readContext);
          data[reference.name] = ref;
          readContext.referenceOffsets[referenceOffset] = ref;
        }
      } catch (e) {
        readContext.addError(e.message);
      }
    }

    for (let i = 0; i < this.rules.length; i++) {
      let rule = this.rules[i];
      let response = rule.rule(data, buffer);
      if (response) {
        readContext.path = path + ":rule[" + i + "]";
        readContext.addError(response);
      }
    }

    if (readContext) {
      readContext.markAreaAsRead(offset, this.SIZE);

      if (readContext.hideReferenceValues) {
        // Remove all values that are only used as pointers or other data structure data to keep the result clean
        for (let array of this.arrays) {
          if (typeof array.offsetMemberName == 'string') delete data[array.offsetMemberName];
          if (typeof array.countMemberName == 'string') delete data[array.countMemberName];
        }
        for (let reference of this.references) {
          if (typeof reference.memberName == 'string') delete data[reference.memberName];
        }
      }
    }

    return data;
  }

  /**
   * Calculates the size needed for a buffer, to store the given object.
   * @param {any} object The data object
   * @returns {number} Size in bytes
   */
  getWriteSize(object) {
    let size = this.SIZE;

    for (let array of this.arrays) {
      let type = array.type;

      for (let item of object[array.name]) {

        if (type.getWriteSize) {
          size += type.getWriteSize(item);
        } else {
          size += type.SIZE;
        }

      }
    }

    for (let reference of this.references) {
      let type = reference.type;

      if (type.getWriteSize) {
        size += type.getWriteSize(object[reference.name]);
      } else {
        size += type.SIZE;
      }
    }

    return size;
  }

  /**
   * Writes data to an buffer, using this structure
   * @param {any} object Data holding object
   * @param {=WriteContext} context Internally used for the write process
   * @param {=number} offset Offset, for start writing
   */
  write(object, context = null, offset = 0) {
    if (!context) {
      context = new WriteContext({
        bufferSize: this.getWriteSize(object)
      });
      context.allocate(this.SIZE);
    }

    let p = context.path;

    for (let array of this.arrays) {
      context.path = p + "." + array.name;

      if (!(array.name in object)) {
        context.addError("Attribute does not exists!");
        continue;
      }

      let data = object[array.name];
      if (!Array.isArray(data)) {
        context.addError("Attribute is not an array!");
        continue;
      }

      let arrayOffset = context.allocate(data.length * array.type.SIZE);

      if (typeof array.offsetMemberName == 'string') {
        object[array.offsetMemberName] = arrayOffset;
        if (array.relative) {
          object[array.offsetMemberName] -= offset;
        }
      }

      if (typeof array.countMemberName == 'string') {
        object[array.countMemberName] = data.length;
      }

      for (let index in data) {
        context.path = p + "." + array.name + "[" + index + "]";
        array.type.write(data[index], context, arrayOffset + index * array.type.SIZE);
      }
    }

    for (let reference of this.references) {
      context.path = p + "." + reference.name;
      
      if (!(reference.name in object)) {
        context.addError("Attribute does not exists!");
        continue;
      }

      let data = object[reference.name];
      let type = reference.type;

      let size = type.SIZE;
      if (type.getWriteSize) {
        size += type.getWriteSize(object[reference.name]);
      }
      
      let referenceOffset = context.allocate(size);

      if (typeof reference.memberName == 'string') {
        object[reference.memberName] = referenceOffset;
        if (reference.relative) {
          object[reference.memberName] -= offset;
        }
      }

      context.path = p + "." + reference.name;
      type.write(data, context, referenceOffset);
    }

    for (let member of this.members) {
      context.path = p + "." + member.name;

      if (!(member.name in object)) {
        context.addError("Attribute does not exists!");
        continue;
      }

      context.path = p + "." + member.name;
      member.type.write(object[member.name], context, offset + this.getOffsetByName(member.name));
    }

    return context;
  }

  /**
   * backwards compatibility. Use .read instead! 
   */
  import() {
    this.read(...arguments);
  }

  /**
   * backwards compatibility. Use .readContext instead! 
   */
  report(buffer, offset, options = { monitorUsage: true }) {
    return this.readContext(...arguments);
  }

  /**
   * Parses an givien buffer. Returns the read context. It will contain the extracted data as well as some statistics like how many bytes were read and what errors occoured.
   * @param {*} buffer Buffer to read from
   * @param {*} offset Offset byte to start reading from
   * @returns {ReadContext} The ReadContext
   */
  readContext(buffer, offset, options) {
    let context = new ReadContext(buffer, options);
    context.data = this.read(buffer, offset, context);
    context.checkForArrayCollisions();
    return context;
  }

  /**
   * Validates a structure
   * @param {Buffer} buffer Buffer to read from
   * @param {number} offset Byte offset in the buffer to begin reading from
   * @returns {Boolean} True when valid 
   */
  validate(buffer, offset = 0) {
    try {
      this.read(buffer, offset)
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * The size, an instance of this struct will occupy. This does not contain the content of arrays.
   * @returns {number}
   */
  get SIZE() {
    return this.members.reduce((val, member) => val + member.type.SIZE, 0);
  }

  /**
   * Returns the relative offset of an attribute in this struct definition
   * @param {string} name Name of the attribute
   * @returns {number} Relative offset in bytes
   */
  getOffsetByName(name) {
    let address = 0;
    for (let member of this.members) {
      if (member.name == name) return address;
      address += member.type.SIZE
    }
    return NaN;
  }

}

Struct.TYPES = require('./types.js');
Struct.RULES = require('./rules.js');

module.exports = Struct;
