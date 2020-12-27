interface ValueType<T> {
  read(buffer: BufferSource, offset: number): T
  write?(value: any, context: WriteContext, offset: number): void
  SIZE: number
}

type Rule = (...params: any) => (dataObj: any, buffer: BufferSource) => boolean

/**
 * Represents the structure of a C-like Struct
 */
declare class Struct implements ValueType<Struct> {

  /**
   * Creates a new struct definition
   * @param name Optional name. Only used for debugging purposes
   */
  constructor(name?: string)

  /**
   * Adds a member to load
   * @param type Datatype of the member to load
   * @param name Name of the member
   */
  addMember(type: ValueType<any>, name: string): this

  /**
   * Adds a an array to load from values inside this struct. The order is not important
   * @param type Datatype of the member to load
   * @param name Name of the member
   * @param offset Number or name of the member which stores the address of the array
   * @param count Number or name of the member which stores the length of the array
   * @param relative Is the address in the target member relative to the structs address?
   */
  addArray(type: ValueType<any>, name: string, offset: string | number, count: string | number, relative?: boolean): this
  
  /**
   * Adds a reference. This marks a member as pointer. References will appear as own members in the out data. Recursive references are allowed and will produce an circular structure.
   * @param type Type of the reference
   * @param name Name of the new data member
   * @param offset Number or name of member containing the offset
   * @param relative Is the address relative to the structs address?
   */
  addReference(type: ValueType<any>, name: string, offset: string | number, relative?: boolean): this

  /**
   * Adds a rule. Rules give extra validation options
   * @param rule The rule to add. Rules can be generated with the static methods of Struct.RULES
   */
  addRule(rule: Rule): this

  /**
   * Adds a static value. Will be attached to every read object. Statics have no have any influence on the binary data!
   * @param name 
   * @param value 
   */
  addStatic(name, value): this

  /**
   * Converts a buffer to an object with the structs structure
   * @param buffer Buffer to read from
   * @param offset Offset byte to start reading from
   * @returns {Object} The data that was read
   */
  read(buffer: BufferSource, offset: number, readContext?: ReadContext): any

  /**
   * Parses an givien buffer. Returns the read context. It will contain the extracted data as well as some statistics like how many bytes were read and what errors occoured.
   * @param buffer Buffer to read from
   * @param offset Offset byte to start reading from
   * @param options Parsing options
   * @returns The report
   */
  readContext(buffer: BufferSource, offset: number, options: ReadOptions): ReadContext

  /**
   * Writes data to an buffer, using this structure
   * @param any Data holding object
   * @param WriteContext Internally used for the write process. Will create automatically a new one if none is given
   * @param number Offset, for start writing
   */
  write(object: object, context?: WriteContext = null, offset?: number = 1): WriteContext

  /**
   * Validates a structure
   * @param buffer Buffer to read from
   * @param offset Byte offset in the buffer to begin reading from
   * @returns True when valid 
   */
  validate(buffer: BufferSource, offset?: number): boolean

  /**
   * Returns the relative offset of an attribute in this struct definition
   * @param name Name of the attribute
   * @returns Relative offset in bytes
   */
  getOffsetByName(name: string): number

  /**
   * The size, an instance of this struct will occupy. This does not contain the content of arrays.
   */
  get SIZE(): number

  /**
   * Inbuilt rules
   */
  static RULES: {
    EQUAL: Rule
  }

  /**
   * Inbuilt types
   */
  static TYPES: {

    /* 
     * Signed 4 byte little-endian Integer 
     */
    INT: ValueType<number>

    /**
     * Signed 4 byte big-endian Integer
     */
    INT_BE: ValueType<number>

    /**
     * Unsigned 4 byte little-endian integer
     */
    UINT: ValueType<number>

    /**
     * Unsigned 4 byte big-endian Integer
     */
    UINT_BE: ValueType<number>

    /**
     * Signed 16 bit little-endian integer
     */
    SHORT: ValueType<number>

    /**
     * Signed 16 bit big-endian integer
     */
    SHORT_BE: ValueType<number>

    /**
     * Unsigned 16 bit little-endian integer
     */
    USHORT: ValueType<number>

    /**
     * Unsigned 16 bit big-endian integer
     */
    USHORT_BE: ValueType<number>

    /**
     * 4 Byte little-endian float
     */
    FLOAT: ValueType<number>

    /**
     * 4 Byte big-endian float
     */
    FLOAT_BE: ValueType<number>

    /**
     * 1 ASCII character 
     */
    CHAR: ValueType<string>

    /**
     * Unsigned 8 bit int
     */
    BYTE: ValueType<number>

    /**
     * String with fixed Length
     * @param {number} length Length to read
     * @param {=string} encoding Codec to use. Anything that is supported by buffer.toString()
     */
    STRING(length: number, encoding: string|"ascii"): ValueType<string>

    /**
     * Null terminated string. Don't use this type in a struct. Only as reference!
     * @param encoding Codec to use. Anything that is supported by buffer.toString()
     */
    NULL_TERMINATED_STRING(encoding: string|"ascii"): ValueType<string>

    /**
     * Skips a given amount of bytes
     * @param length Number of bytes to skip
     */
    SKIP(length: number): ValueType<void>
  }
}

type ReadOptions = {

  /**
   * Calculate how much of the source buffer was read
   */
  monitorUsage?: boolean

  /**
   * Remove reference fields (array offset, array length and reference offset fields) from output data.
   */
  hideReferenceValues?: boolean
}

/**
 * Stores the result of an import/read.
 */
declare class ReadContext {

  constructor(buffer: BufferSource, options: ReadOptions)

  /**
   * Returns a formatted string containing the reports result.
   */
  toString(): string

  /**
   * Returns the number of read bytes. Returns NaN, if monitorUsage is false
   */
  getUsage(): number

  /**
   * Returns true if the imported data had errors
   */
  hasErrors(): boolean

  /**
   * Raw data read
   */
  data: object
  
}

type WriteOptions = {

  /**
   * Output buffer size in bytes
   */
  bufferSize?: number
}

declare class WriteContext {

  /**
   * Output buffer
   */
  public buffer: Buffer;

  constructor(options: WriteOptions)

}

export = Struct;