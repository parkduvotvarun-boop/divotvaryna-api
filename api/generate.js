export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type")

  if (req.method === "OPTIONS") return res.status(200).end()

  if (req.method === "GET") {
    return res.status(200).json({ ok: true, message: "API works" })
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST requests allowed" })
  }

  try {
    const body =
      typeof req.body === "string" ? JSON.parse(req.body) : req.body

    const { image, childName, email } = body || {}

    if (!image) return res.status(400).json({ error: "No image" })
    if (!childName) return res.status(400).json({ error: "No name" })
    if (!email) return res.status(400).json({ error: "No email" })

    const normalizedEmail = email.trim().toLowerCase()
    const redisKey = `generated:${normalizedEmail}`

    // 🔥 FIX URL (на випадок лапок)
    const redisUrl = process.env.UPSTASH_REDIS_REST_URL
      ?.trim()
      .replace(/^"|"$/g, "")

    const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN
      ?.trim()
      .replace(/^"|"$/g, "")

    // 🔒 CHECK EMAIL
    const checkResponse = await fetch(`${redisUrl}/get/${redisKey}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${redisToken}`,
      },
    })

    const checkData = await checkResponse.json()

    if (checkData.result === "true") {
      return res.status(409).json({
        error: "Цей email вже використав генерацію 💫",
      })
    }

    // 🎨 GENERATE IMAGE
    const imageResponse = await fetch(
      "https://api.openai.com/v1/images/edits",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-image-1",
          prompt:
            "Create a cute 3D fantasy character based on a child drawing. Pixar style, white background.",
          images: [{ image_url: image }],
          size: "auto",
        }),
      }
    )

    const imageData = await imageResponse.json()

    if (!imageResponse.ok) {
      return res.status(imageResponse.status).json(imageData)
    }

    const imageBase64 = imageData.data?.[0]?.b64_json

    if (!imageBase64) {
      return res.status(500).json({
        error: "Image generation failed",
      })
    }

    // 📧 SEND EMAIL
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Парк Дивотварин <onboarding@resend.dev>",
        to: [normalizedEmail],
        subject: "Твоя Дивотварина ✨",
        html: `<h2>Привіт, ${childName}!</h2><p>Твоя Дивотварина готова 🐾</p>`,
        attachments: [
          {
            filename: "dyvotvaryna.png",
            content: imageBase64,
          },
        ],
      }),
    })

    const emailData = await emailResponse.json()

    if (!emailResponse.ok) {
      return res.status(emailResponse.status).json(emailData)
    }

    // 💾 SAVE EMAIL
    await fetch(`${redisUrl}/set/${redisKey}/true`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${redisToken}`,
      },
    })

    return res.status(200).json({
      ok: true,
      message: "Email sent",
    })
  } catch (error) {
    return res.status(500).json({
      error: error.message || "Server error",
    })
  }
}
