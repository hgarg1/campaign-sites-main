import { prisma } from '@campaignsites/database';
import { initializeProcessLogging } from '@campaignsites/logging';
import { logger } from './logger';
import { isDatabaseEnabled } from './runtime-config';

declare global {
  var __campaignsites_logging_initialized: boolean | undefined;
}

/**
 * Initialize application logging system
 * This should be called once during server startup
 */
export function initializeLogging() {
  if (global.__campaignsites_logging_initialized) {
    return;
  }

  try {
    if (isDatabaseEnabled()) {
      logger.initialize(prisma);
    }

    // Log application startup
    logger.info(
      'CampaignSites web application started',
      'startup',
      {
        environment: process.env.NODE_ENV || 'development',
        nodeVersion: process.version,
        timestamp: new Date().toISOString(),
      }
    );

    // Set up global error handlers
    setupGlobalErrorHandlers();

    global.__campaignsites_logging_initialized = true;

    console.log('[Logger] Application logging initialized successfully');
  } catch (error) {
    console.error('[Logger] Failed to initialize logging:', error);
    throw error;
  }
}

/**
 * Set up global error handlers for uncaught exceptions and unhandled rejections
 */
function setupGlobalErrorHandlers() {
  initializeProcessLogging(logger, {
    sourcePrefix: 'web',
    rethrowUncaught: true,
  });
}
