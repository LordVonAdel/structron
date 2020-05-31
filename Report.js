/** 
 *  @class Report
 *  @type {Object}
 *  @property {Object} data The exported data.
 */

class Report {

  constructor(options, buffer) {
    this.buffer = buffer;
    
    this.monitorUsage = !!options.monitorUsage;

    if (this.monitorUsage) {
      this.usageBuffer = Buffer.alloc(buffer.length);
    }

    // Path to the current read entry
    this.path = "root";

    this.errors = [];
    this.arrays = [];
  }

  addError(message) {
    this.errors.push({
      path: this.path,
      message
    });
  }

  markAreaAsRead(start, length) {
    if (!this.monitorUsage) return;

    for (let i = start; i < start + length; i++) {
      if (this.usageBuffer[i] < 255) {
        this.usageBuffer[i]++;
      }
    }
  }

  checkForArrayCollisions() {
    for (let i = 0; i < this.arrays.length; i++) {
      let a1 = this.arrays[i];
      for (let j = i; j < this.arrays.length; j++) {
        let a2 = this.arrays[j];

        if (a1.length == 0 || a2.length == 0) continue;
        if (a1 == a2) continue;
        if (a1.start == a2.start) continue;

        if (a1.start < (a2.start + a2.length) && a2.start < (a1.start + a1.length)) {
          this.path = a1.path + "/" + a2.path;
          this.addError("Array " + a1.name + " overlaps with " + a2.name);
        }
      }
    }
  }

  toString() {
    let out = "\n===Structron-Report==="
    + "\n Buffer size: " + this.buffer.length;

    if (this.monitorUsage) {
      let bytesRead = this.getUsage();
      out += "\n Bytes read: " + bytesRead + " (" + Math.floor((bytesRead / this.buffer.length) * 100) + "%)";
    }

    out += "\n Number of arrays: " + this.arrays.length;

    if (this.errors.length) {
      out += "\n Errors (" + this.errors.length + "):\n  "
      + this.errors.map(e => e.path + ": " + e.message).join("\n  ");
    } else {
      out += "\n No errors were found."
    }
    
    return out;
  }

  getUsage() {
    let number = 0;
    for (let i = 0; i < this.usageBuffer.length; i++) {
      if (this.usageBuffer[i] > 0) number++;
    }
    return number;
  }

}

module.exports = Report;