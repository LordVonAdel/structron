interface ValueType<T> {
  read(buffer: BufferSource, offset: number): T
  SIZE: number
}

type Rule = (...params: any) => (dataObj: any, buffer: BufferSource) => boolean

export class Struct implements ValueType<Struct> {

  constructor(name?: string)

  addMember(type: ValueType, name: string): this
  addArray(type: ValueType, name: string, offsetMemberName: string, countMemberName: string, relative?: boolean): this
  addReference(type: ValueType, name: string, memberName: string, relative?: boolean): this
  addRule(rule: Rule): this
  read(buffer: BufferSource, offset: number, report?: Report): any
  report(buffer: BufferSource, offset: number, options: ReportOptions): Report
  validate(buffer: BufferSource, offset?: number): boolean
  getOffsetByName(name: string): number

  get SIZE(): number

  static RULES: {
    EQUAL: Rule
  }

  static TYPES: {
    INT: ValueType<number>
    INT_BE: ValueType<number>
    UINT: ValueType<Number>
    UINT_BE: ValueType<number>
    SHORT: ValueType<number>
    SHORT_BE: ValueType<number>
    USHORT: ValueType<number>
    USHORT_BE: ValueType<number>
    FLOAT: ValueType<number>
    CHAR: ValueType<number>
    BYTE: ValueType<number>
    STRING(length: number, encoding: string|"ascii"): ValueType<string>
    NULL_TERMINATED_STRING(encoding: string|"ascii"): ValueType<string>
    SKIP(length: number): ValueType<void>
  }
}