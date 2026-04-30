export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type")

  if (req.method === "OPTIONS") {
    return res.status(200).end()
  }
if (req.method === "GET") {
  res.setHeader("Access-Control-Allow-Origin", "*")
  return res.status(200).json({ ok: true, message: "API works" })
}
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST requests allowed" })
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body

    const image = body?.image
    const userPrompt = body?.prompt || ""

    if (!image) {
      return res.status(400).json({ error: "Missing uploaded image" })
    }

    const prompt = `Using the provided child’s drawing as inspiration (not a direct copy), create a whimsical fantasy character that feels like a high-quality animated movie hero. Reimagine the shapes, colors, and ideas from the drawing into a cohesive, polished character design with expressive features and a magical, friendly personality. The character should look like it belongs in a modern animated film, with soft forms, appealing proportions, and a charming, storybook-like style. Render it as a clean, high-quality image on a pure white background, centered, with minimal or very soft shadow. No additional elements. Focus on clarity, smooth lighting, and a professional character design while preserving the imagination and spirit of the child’s drawing.

Extra instruction from user: ${userPrompt}
`

    const response = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-image-1",
        prompt,
        images: [
          {
            image_url: image,
          },
        ],
        size: "auto",
        quality: "low",
        output_format: "png",
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      return res.status(response.status).json(data)
    }

    const imageBase64 = data.data?.[0]?.b64_json

    if (!imageBase64) {
      return res.status(500).json({ error: "No image returned" })
    }

    res.setHeader("Content-Type", "image/png")
    return res.status(200).send(Buffer.from(imageBase64, "base64"))
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}
