"""
PostgreSQL database connection for Agent service.
"""

import psycopg2
from psycopg2 import pool
from psycopg2.extras import RealDictCursor
from typing import Optional
import logging

from config import (
    POSTGRES_HOST,
    POSTGRES_PORT,
    POSTGRES_USER,
    POSTGRES_PASSWORD,
    POSTGRES_DB,
)

logger = logging.getLogger(__name__)

# Connection pool
_connection_pool: Optional[pool.ThreadedConnectionPool] = None


def get_connection_pool() -> pool.ThreadedConnectionPool:
    """Get or create PostgreSQL connection pool."""
    global _connection_pool
    
    if _connection_pool is None:
        try:
            _connection_pool = pool.ThreadedConnectionPool(
                minconn=1,
                maxconn=10,
                host=POSTGRES_HOST,
                port=POSTGRES_PORT,
                user=POSTGRES_USER,
                password=POSTGRES_PASSWORD,
                database=POSTGRES_DB,
                cursor_factory=RealDictCursor,
            )
            logger.info("PostgreSQL connection pool created successfully")
        except Exception as e:
            logger.error(f"Failed to create PostgreSQL connection pool: {e}")
            raise
    
    return _connection_pool


def get_db_connection():
    """Get a database connection from the pool."""
    pool = get_connection_pool()
    return pool.getconn()


def return_db_connection(conn):
    """Return a database connection to the pool."""
    pool = get_connection_pool()
    pool.putconn(conn)


def close_all_connections():
    """Close all connections in the pool."""
    global _connection_pool
    if _connection_pool:
        _connection_pool.closeall()
        _connection_pool = None
        logger.info("All PostgreSQL connections closed")








