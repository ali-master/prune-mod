/**
 * Another package main entry point
 */
const _ = require("lodash");

class AnotherPackage {
  constructor(name = "another-package") {
    this.name = name;
    this.version = "2.1.0";
  }

  getMessage() {
    return `Greetings from ${this.name}`;
  }

  processArray(arr) {
    return _.uniq(arr).sort();
  }

  getInfo() {
    return {
      name: this.name,
      version: this.version,
      timestamp: new Date().toISOString(),
    };
  }
}

module.exports = AnotherPackage;
