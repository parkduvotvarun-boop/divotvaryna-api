export default async function handler(req, res) {
  try {
    let prompt =
      "Transform the uploaded child's drawing into a whimsical fantasy creature. Keep the main shapes and idea from the drawing, but make it polished, soft, friendly, magical, clean, high quality, white background."

    let imageUrl = ""

    if (req.method === "GET") {
      imageUrl = req.query.image || ""
      prompt = req.query.prompt || prompt
    } else {
      return res.status(405).json({ error: "Only GET requests allowed" })
    }

    if (!imageUrl) {
      return res.status(400).json({ error: "Missing image URL" })
    }

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
            image_url: imageUrl,
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

    const imageBase64 = data.data[0].b64_json

    res.setHeader("Content-Type", "image/png")
    return res.status(200).send(Buffer.from(imageBase64, "base64"))
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}
