import chalk from "chalk";

interface LoggerOptions {
  prefix?: string;
  timestamp?: boolean;
}

class Logger {
  private options: LoggerOptions;

  constructor(options: LoggerOptions = {}) {
    this.options = options;
  }

  private formatMessage(...args: any[]): string {
    let formatted = args
      .map((arg) => (typeof arg === "object" ? JSON.stringify(arg, null, 2) : String(arg)))
      .join(" ");

    if (this.options.timestamp) {
      const timestamp = new Date().toISOString();
      formatted = `[${timestamp}] ${formatted}`;
    }

    if (this.options.prefix) {
      formatted = `${this.options.prefix} ${formatted}`;
    }

    return formatted;
  }

  info(...args: any[]): void {
    console.log(chalk.cyan(this.formatMessage(...args)));
  }

  error(...args: any[]): void {
    console.error(chalk.red(this.formatMessage(...args)));
  }

  warn(...args: any[]): void {
    console.warn(chalk.yellow(this.formatMessage(...args)));
  }

  success(...args: any[]): void {
    console.log(chalk.green(this.formatMessage(...args)));
  }

  debug(...args: any[]): void {
    console.log(chalk.gray(this.formatMessage(...args)));
  }

  log(...args: any[]): void {
    console.log(this.formatMessage(...args));
  }
}

export const logger = new Logger();

export default Logger;
