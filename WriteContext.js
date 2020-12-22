class WriteContext {

  constructor(options) {

    this.buffer = Buffer.alloc(options.bufferSize || 1024);

    this.errors = [];

    this.path = "root";
    this.allocationPoint = 0;
  }

  allocate(size) {
    let position = this.allocationPoint;
    this.allocationPoint += size;
    return position;
  }

  addError(message) {
    this.errors.push({
      path: this.path,
      message
    });
  }

}

module.exports = WriteContext;