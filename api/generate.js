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

    if (!image)
      return res.status(400).json({ error: "Missing uploaded image" })
    if (!childName)
      return res.status(400).json({ error: "Missing child name" })
    if (!email)
      return res.status(400).json({ error: "Missing email" })

    const normalizedEmail = email.trim().toLowerCase()
    const redisKey = `generated:${normalizedEmail}`

    // 🔒 CHECK IF EMAIL USED
    const checkResponse = await fetch(
      `${process.env.UPSTASH_REDIS_REST_URL}/get/${redisKey}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
        },
      }
    )

    const checkData = await checkResponse.json()

    if (checkData.result === "true") {
      return res.status(409).json({
        error: "Цей email вже використав генерацію",
      })
    }

    // 🎨 GENERATE IMAGE
    const prompt = `
Create a cute whimsical 3D fantasy character based on a child's drawing.

Style:
- Pixar / Disney style
- Soft lighting
- Rounded shapes
- Friendly face
- White background
`

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
          prompt,
          images: [{ image_url: image }],
          size: "auto",
          quality: "low",
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
        error: "No image returned",
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
        html: `
          <h2>Привіт, ${childName}!</h2>
          <p>Твоя Дивотварина готова 🐾</p>
        `,
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

    // 💾 SAVE EMAIL AS USED
    await fetch(
      `${process.env.UPSTASH_REDIS_REST_URL}/set/${redisKey}/true`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
        },
      }
    )

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
