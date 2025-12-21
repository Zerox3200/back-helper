import redis from 'redis'

const client = redis.createClient()

client.on('error', (err) => {
  console.error('Redis error: ', err)
})

const setCache = (key, value, expiryInSeconds = 3600) => {
  return new Promise((resolve, reject) => {
    client.setex(key, expiryInSeconds, JSON.stringify(value), (err, reply) => {
      if (err) reject(err)
      resolve(reply)
    })
  })
}

const getCache = (key) => {
  return new Promise((resolve, reject) => {
    client.get(key, (err, reply) => {
      if (err) reject(err)
      if (reply) {
        resolve(JSON.parse(reply))
      } else {
        resolve(null)
      }
    })
  })
}

const deleteCache = (key) => {
  return new Promise((resolve, reject) => {
    client.del(key, (err, reply) => {
      if (err) reject(err)
      resolve(reply)
    })
  })
}

export { setCache, getCache, deleteCache }
