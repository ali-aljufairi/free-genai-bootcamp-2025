import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';

export async function GET() {
  try {
    // Basic health check
    const healthStatus = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      database: {
        status: 'migrating',
        message: 'Database migration in progress - some features disabled'
      },
      features: {
        wordFlashcards: 'enabled',
        kanjiCards: 'enabled',
        studySessions: 'disabled',
        dashboard: 'limited',
        activityTracking: 'disabled'
      }
    };

    return NextResponse.json(healthStatus);
  } catch (error) {
    // Report health check errors to Sentry
    Sentry.captureException(error, {
      tags: {
        location: 'health-check',
        component: 'HealthCheckAPI',
      },
      extra: {
        timestamp: new Date().toISOString(),
      },
    });

    return NextResponse.json(
      { 
        status: 'error', 
        message: 'Health check failed',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

