/**
 * Structured Logging System
 * Phase 5: Monitoring & Reliability
 * 
 * Provides consistent, queryable logging across the application
 */

export type LogLevel = 'info' | 'warn' | 'error' | 'debug'

export interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  context?: Record<string, any>
  error?: Error
  userId?: string
  sessionId?: string
}

class Logger {
  private sessionId: string

  constructor() {
    // Generate session ID for tracking logs across a user session
    this.sessionId = typeof window !== 'undefined' 
      ? `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      : 'server'
  }

  private formatLog(entry: LogEntry): string {
    const parts = [
      `[${entry.timestamp}]`,
      `[${entry.level.toUpperCase()}]`,
      entry.message,
    ]

    if (entry.context) {
      parts.push(`Context: ${JSON.stringify(entry.context)}`)
    }

    if (entry.error) {
      parts.push(`Error: ${entry.error.message}`)
      if (entry.error.stack) {
        parts.push(`Stack: ${entry.error.stack}`)
      }
    }

    return parts.join(' ')
  }

  private createEntry(
    level: LogLevel,
    message: string,
    context?: Record<string, any>,
    error?: Error
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      error,
      sessionId: this.sessionId,
    }
  }

  private sendToBackend(entry: LogEntry): void {
    // In production, send to logging service (e.g., Sentry, LogRocket, etc.)
    // For now, we'll just use console but in a structured way
    
    if (typeof window !== 'undefined') {
      // Client-side: Could send to /api/logs endpoint
      // For Phase 5, we'll keep it simple with structured console logs
    }
  }

  info(message: string, context?: Record<string, any>): void {
    const entry = this.createEntry('info', message, context)
    console.info(this.formatLog(entry))
    this.sendToBackend(entry)
  }

  warn(message: string, context?: Record<string, any>): void {
    const entry = this.createEntry('warn', message, context)
    console.warn(this.formatLog(entry))
    this.sendToBackend(entry)
  }

  error(message: string, error?: Error, context?: Record<string, any>): void {
    const entry = this.createEntry('error', message, context, error)
    console.error(this.formatLog(entry))
    this.sendToBackend(entry)
  }

  debug(message: string, context?: Record<string, any>): void {
    if (process.env.NODE_ENV === 'development') {
      const entry = this.createEntry('debug', message, context)
      console.debug(this.formatLog(entry))
    }
  }

  // Specialized logging methods for common scenarios

  playbackStart(titleId: string, userId?: string): void {
    this.info('Playback started', { titleId, userId, event: 'playback_start' })
  }

  playbackError(titleId: string, error: Error, userId?: string): void {
    this.error('Playback error', error, { titleId, userId, event: 'playback_error' })
  }

  uploadStart(fileName: string, userId?: string): void {
    this.info('Upload started', { fileName, userId, event: 'upload_start' })
  }

  uploadError(fileName: string, error: Error, userId?: string): void {
    this.error('Upload failed', error, { fileName, userId, event: 'upload_error' })
  }

  adError(adId: string, error: Error): void {
    this.error('Ad playback error', error, { adId, event: 'ad_error' })
  }

  apiError(endpoint: string, error: Error, statusCode?: number): void {
    this.error('API error', error, { endpoint, statusCode, event: 'api_error' })
  }
}

// Export singleton instance
export const logger = new Logger()

// Export convenience function for quick logging
export function log(message: string, level: LogLevel = 'info', context?: Record<string, any>): void {
  if (level === 'error') {
    logger.error(message, undefined, context)
  } else if (level === 'info') {
    logger.info(message, context)
  } else if (level === 'warn') {
    logger.warn(message, context)
  } else if (level === 'debug') {
    logger.debug(message, context)
  }
}

