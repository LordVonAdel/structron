export type ReportOptions = {
  monitorUsage: boolean
}

export default class Report {

  constructor(buffer: BufferSource, options: ReportOptions)
  toString(): string
  getUsage(): number
  
}