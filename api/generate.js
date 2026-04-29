export default async function handler(req, res) {
  try {
    let prompt = "Cute unicorn child drawing"

    if (req.method === "GET") {
      prompt = req.query.prompt || prompt
    } else if (req.method === "POST") {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body
      prompt = body?.prompt || prompt
    } else {
      return res.status(405).json({ error: "Only GET or POST allowed" })
    }

    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-image-1",
        prompt,
        size: "auto",
        quality: "low",
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      return res.status(response.status).json(data)
    }

    const imageBase64 = data.data[0].b64_json

    res.setHeader("Content-Type", "image/png")
    return res.status(200).send(Buffer.from(imageBase64, "base64"))
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}
