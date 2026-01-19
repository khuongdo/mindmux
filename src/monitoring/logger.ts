/**
 * Structured JSON logger for MindMux
 * Handles JSON-formatted logging with component-specific loggers
 */

export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  component: string;
  action: string;
  data?: Record<string, unknown>;
  error?: string;
}

class Logger {
  private component: string;
  private minLevel: LogLevel = 'info';
  private levelOrder: Record<LogLevel, number> = {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3,
  };

  constructor(component: string, minLevel?: LogLevel) {
    this.component = component;
    if (minLevel) {
      this.minLevel = minLevel;
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return this.levelOrder[level] <= this.levelOrder[this.minLevel];
  }

  private formatEntry(
    level: LogLevel,
    action: string,
    data?: Record<string, unknown>,
    error?: Error | string
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      component: this.component,
      action,
      ...(data && { data }),
      ...(error && { error: typeof error === 'string' ? error : error.message }),
    };
  }

  private output(level: LogLevel, entry: LogEntry): void {
    const json = JSON.stringify(entry);
    switch (level) {
      case 'error':
        console.error(json);
        break;
      case 'warn':
        console.warn(json);
        break;
      case 'info':
        console.log(json);
        break;
      case 'debug':
        console.log(json);
        break;
    }
  }

  error(action: string, data?: Record<string, unknown>, error?: Error | string): void {
    if (this.shouldLog('error')) {
      this.output('error', this.formatEntry('error', action, data, error));
    }
  }

  warn(action: string, data?: Record<string, unknown>): void {
    if (this.shouldLog('warn')) {
      this.output('warn', this.formatEntry('warn', action, data));
    }
  }

  info(action: string, data?: Record<string, unknown>): void {
    if (this.shouldLog('info')) {
      this.output('info', this.formatEntry('info', action, data));
    }
  }

  debug(action: string, data?: Record<string, unknown>): void {
    if (this.shouldLog('debug')) {
      this.output('debug', this.formatEntry('debug', action, data));
    }
  }
}

class LoggerFactory {
  private minLevel: LogLevel = 'info';
  private loggers: Map<string, Logger> = new Map();

  setMinLevel(level: LogLevel): void {
    this.minLevel = level;
    // Update existing loggers
    this.loggers.forEach((logger) => {
      logger['minLevel'] = level;
    });
  }

  getLogger(component: string): Logger {
    if (!this.loggers.has(component)) {
      this.loggers.set(component, new Logger(component, this.minLevel));
    }
    return this.loggers.get(component)!;
  }
}

export const loggerFactory = new LoggerFactory();

export function createLogger(component: string): Logger {
  return loggerFactory.getLogger(component);
}

export function setLogLevel(level: LogLevel): void {
  loggerFactory.setMinLevel(level);
}
