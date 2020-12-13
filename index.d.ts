interface ValueType<T> {
  read(buffer: BufferSource, offset: number): T
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
   * @param offsetMemberName Number or Name of the member which stores the address of the array
   * @param countMemberName Number or name of the member which stores the length of the array
   * @param relative Is the address in the target member relative to the structs address?
   */
  addArray(type: ValueType<any>, name: string, offsetMemberName: string, countMemberName: string, relative?: boolean): this
  
  /**
   * Adds a reference. References will appear as own members in the out data.
   * @param type Type of the reference
   * @param name Name of the new data member
   * @param membername Name of the address containg existing data member
   * @param relative Is the adress relative to the structs address?
   */
  addReference(type: ValueType<any>, name: string, memberName: string, relative?: boolean): this

  /**
   * Adds a rule. Rules give extra validation options
   * @param rule The rule to add. Rules can be generated with the static methods of Struct.RULES
   */
  addRule(rule: Rule): this

  /**
   * Converts a buffer to an object with the structs structure
   * @param buffer Buffer to read from
   * @param offset Offset byte to start reading from
   * @returns {Object} The data that was read
   */
  read(buffer: BufferSource, offset: number, report?: Report): any

  /**
   * Returns an report object. It will contain the extracted data as well as some statistics like how many bytes were read and what errors occoured.
   * @param buffer Buffer to read from
   * @param offset Offset byte to start reading from
   * @returns The report
   */
  report(buffer: BufferSource, offset: number, options: ReportOptions): Report

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
    UINT: ValueType<Number>

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

type ReportOptions = {
  monitorUsage: boolean
}

class Report {

  constructor(buffer: BufferSource, options: ReportOptions)

  /**
   * Returns a formatted string containing the reports result.
   */
  toString(): string

  /**
   * Returns the number of read bytes. Returns NaN, if monitorUsage is false
   */
  getUsage(): number

  /**
   * Raw data read
   */
  data: any
  
}

export = Struct;