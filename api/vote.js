module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type")

  if (req.method === "OPTIONS") return res.status(200).end()

  const redisUrl = process.env.UPSTASH_REDIS_REST_URL?.trim().replace(/^"|"$/g, "")
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN?.trim().replace(/^"|"$/g, "")

  const animals = ["barashok", "pony", "capybara"]

  async function getVotes() {
    const votes = {}

    for (const animal of animals) {
      const response = await fetch(`${redisUrl}/get/poll:${animal}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${redisToken}`,
        },
      })

      const data = await response.json()
      votes[animal] = Number(data.result || 0)
    }

    return votes
  }

  if (req.method === "GET") {
    const votes = await getVotes()

    return res.status(200).json({
      ok: true,
      votes,
    })
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST requests allowed" })
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body
    const { animal } = body || {}

    if (!animals.includes(animal)) {
      return res.status(400).json({ error: "Invalid animal" })
    }

    await fetch(`${redisUrl}/incr/poll:${animal}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${redisToken}`,
      },
    })

    const votes = await getVotes()

    return res.status(200).json({
      ok: true,
      message: "Vote saved",
      votes,
    })
  } catch (error) {
    return res.status(500).json({
      error: error.message || "Server error",
    })
  }
}
