# Database Indexes

This directory contains PostgreSQL index definitions for optimizing query performance.

## Files

- `user_management_indexes.sql` - Indexes for user management tables

## Index Categories

### User Management Indexes
- User lookup optimization (clerk_id, email)
- Role and permission queries
- Subscription and billing queries
- User settings and preferences

## Performance Impact

These indexes significantly improve query performance for:
- User authentication and authorization
- User profile and settings retrieval
- Subscription and billing operations
- Role-based access control

## Maintenance

Run this file after the main schema to ensure optimal database performance.