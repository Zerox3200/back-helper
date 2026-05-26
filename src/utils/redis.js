import redis from 'redis'

let client = null
let isConnected = false
let connectionAttempted = false
let errorLogged = false

const initRedis = async () => {
  if (connectionAttempted) return
  
  connectionAttempted = true
  
  try {
    client = redis.createClient({
      url: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            console.log('Redis: Max reconnection attempts reached. Continuing without Redis.')
            return false
          }
          return Math.min(retries * 100, 3000)
        }
      }
    })

    client.on('error', (err) => {
      isConnected = false
      // Only log once to avoid spam
      if (!errorLogged && err.code === 'ECONNREFUSED') {
        errorLogged = true
        console.log('⚠ Redis not available. App will continue without caching.')
        console.log('  To enable Redis: Install and start Redis server')
        console.log('  Windows: Download from https://github.com/microsoftarchive/redis/releases')
        console.log('  Or use: docker run -d -p 6379:6379 redis')
      }
    })

    client.on('connect', () => {
      isConnected = true
      console.log('✓ Connected to Redis')
    })

    client.on('ready', () => {
      isConnected = true
      console.log('✓ Redis is ready')
    })

    client.on('end', () => {
      isConnected = false
      console.log('Redis connection closed')
    })

    await client.connect()
    isConnected = true
  } catch (err) {
    isConnected = false
    console.log('⚠ Redis not available. App will continue without caching.')
    console.log('  To enable Redis: Install and start Redis server')
    console.log('  Windows: Download from https://github.com/microsoftarchive/redis/releases')
    console.log('  Or use: docker run -d -p 6379:6379 redis')
  }
}

// Initialize Redis connection
initRedis()

const setCache = async (key, value, expiryInSeconds = 3600) => {
  if (!client) {
    return null // Fail silently if Redis client is not initialized
  }
  
  // Check if client is actually connected and ready
  try {
    // Ping to verify connection
    await client.ping()
  } catch (err) {
    // Not connected, fail silently
    return null
  }
  
  try {
    const reply = await client.setEx(key, expiryInSeconds, JSON.stringify(value))
    
    // Log cache set in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`✓ Cache SET: ${key} (TTL: ${expiryInSeconds}s)`)
    }
    
    return reply
  } catch (err) {
    // Fail silently - don't break the app if cache fails
    // But log in development for debugging
    if (process.env.NODE_ENV === 'development') {
      console.warn(`Redis setCache error for key "${key}":`, err.message)
    }
    return null
  }
}

const getCache = async (key) => {
  if (!client) {
    return null // Return null if Redis client is not initialized
  }
  
  // Check if client is actually connected and ready
  try {
    // Ping to verify connection
    await client.ping()
  } catch (err) {
    // Not connected, return null (fail silently)
    return null
  }
  
  try {
    const reply = await client.get(key)
    if (reply) {
      const parsed = JSON.parse(reply)
      
      // Log cache hit in development
      if (process.env.NODE_ENV === 'development') {
        console.log(`✓ Cache HIT: ${key}`)
      }
      
      return parsed
    }
    
    // Log cache miss in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`✗ Cache MISS: ${key}`)
    }
    
    return null
  } catch (err) {
    // Fail silently - don't break the app if cache fails
    // But log in development for debugging
    if (process.env.NODE_ENV === 'development') {
      console.warn(`Redis getCache error for key "${key}":`, err.message)
    }
    return null
  }
}

const deleteCache = async (key) => {
  if (!client) {
    return null // Fail silently if Redis client is not initialized
  }
  
  // Check if client is actually connected and ready
  try {
    // Ping to verify connection
    await client.ping()
  } catch (err) {
    // Not connected, fail silently
    return null
  }
  
  try {
    const reply = await client.del(key)
    
    // Log cache deletion in development
    if (process.env.NODE_ENV === 'development' && reply > 0) {
      console.log(`✓ Cache DELETED: ${key}`)
    }
    
    return reply
  } catch (err) {
    // Fail silently - don't break the app if cache fails
    // But log in development for debugging
    if (process.env.NODE_ENV === 'development') {
      console.warn(`Redis deleteCache error for key "${key}":`, err.message)
    }
    return null
  }
}

const deleteCacheByPattern = async (pattern) => {
  if (!client) {
    return null
  }
  
  // Check if client is actually connected and ready
  try {
    // Ping to verify connection
    await client.ping()
  } catch (err) {
    // Not connected, fail silently
    return null
  }
  
  try {
    const keys = []

    // scanIterator yields one array of keys per SCAN page (node-redis v4+), not a single key
    for await (const keyChunk of client.scanIterator({
      MATCH: pattern,
      COUNT: 100
    })) {
      if (Array.isArray(keyChunk)) {
        for (const k of keyChunk) {
          if (k != null && k !== '') keys.push(k)
        }
      } else if (keyChunk != null && keyChunk !== '') {
        keys.push(keyChunk)
      }
    }
    
    // Delete all matching keys
    if (keys.length > 0) {
      // Delete keys - in redis v4+, del() accepts an array
      // But we'll delete in batches to be safe
      let totalDeleted = 0
      const batchSize = 100
      
      for (let i = 0; i < keys.length; i += batchSize) {
        const batch = keys.slice(i, i + batchSize)
        // Use spread operator for maximum compatibility
        // In redis v4+, del() accepts multiple keys as arguments
        const deletedCount = await client.del(...batch)
        totalDeleted += deletedCount || 0
      }
      
      // Log in development for debugging
      if (process.env.NODE_ENV === 'development') {
        console.log(`✓ Deleted ${totalDeleted} cache keys matching pattern: ${pattern}`)
        if (keys.length <= 10) {
          console.log(`  Keys deleted: ${keys.join(', ')}`)
        } else {
          console.log(`  Keys deleted: ${keys.length} keys (first 5: ${keys.slice(0, 5).join(', ')}, ...)`)
        }
      }
      
      return totalDeleted
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`No cache keys found matching pattern: ${pattern}`)
    }
    
    return 0
  } catch (err) {
    // Log error for debugging
    if (process.env.NODE_ENV === 'development') {
      console.warn('Redis deleteCacheByPattern error:', err.message)
      console.warn('Pattern:', pattern)
      console.warn('Error details:', err)
    }
    // Fail silently in production - don't break the app if cache fails
    return null
  }
}

export { setCache, getCache, deleteCache, deleteCacheByPattern }
