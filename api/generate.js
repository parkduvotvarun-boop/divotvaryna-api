module.exports = async function handler(req, res) {
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
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body
    const { image, childName, email } = body || {}

    if (!image) return res.status(400).json({ error: "No image" })
    if (!childName) return res.status(400).json({ error: "No name" })
    if (!email) return res.status(400).json({ error: "No email" })

    const normalizedEmail = email.trim().toLowerCase()
    const redisKey = `generated:${normalizedEmail}`

    const redisUrl = process.env.UPSTASH_REDIS_REST_URL
      ?.trim()
      .replace(/^"|"$/g, "")

    const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN
      ?.trim()
      .replace(/^"|"$/g, "")

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

    const prompt = `
Using the provided child’s drawing as inspiration, create a whimsical fantasy character that feels like a high-quality animated movie hero.

Reimagine the shapes, colors, and ideas from the drawing into a cohesive, polished character design with expressive features and a magical, friendly personality.

The character should look like a modern 3D animated mascot, with smooth clean rendering, soft lighting, and slightly glossy toy-like materials.

Design details:
- big expressive eyes
- rounded soft shapes
- appealing proportions
- cute friendly expression
- vibrant playful colors

Keep the main idea and recognizable silhouette from the original drawing.

Render:
- high-quality 3D character
- centered composition
- pure white background
- minimal soft shadow
- no text
- no extra objects
`

    const imageResponse = await fetch("https://api.openai.com/v1/images/edits", {
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
        output_format: "png",
      }),
    })

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

    const HEADER_IMAGE_URL =
      "https://framerusercontent.com/images/OyIOx97mExAaOlDIALevV7bls.jpg?scale-down-to=1024&width=1200&height=300"

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; color:#004912; max-width:680px; margin:0 auto; line-height:1.5;">
        <img src="${HEADER_IMAGE_URL}" width="100%" style="max-width:680px; height:auto; border-radius:12px; display:block; margin-bottom:24px;" />

        <h2 style="color:#004912;">Привіт, ${childName}!</h2>

        <p>Ти щойно зробив(-ла) маленьке диво. І ми це зафіксували 💫</p>

        <p>На основі твоєї картинки народилася унікальна Дивотварина. Жодної такої більше не існує. Це чиста магія + трішки технологій.</p>

        <h3 style="color:#004912;">Що далі?</h3>

        <p>Збережи її собі — вона любить бути поруч.</p>
        <p>Поділись у соцмережах і покажи світові свою фантазію.</p>
        <p>А ще приходь у Парк Дивотварин у своєму місті і познайомся з іншими мешканцями наживо.</p>

        <p>Це диво стало можливим завдяки нашому генеральному партнеру — <strong>Кернел</strong>.</p>

        <p>Кернел — українська компанія, виробник олії «Щедрий Дар» та «Стожар», які щодня обирають українські родини.</p>

        <p>Кожна Дивотварина — це історія.<br/>Твоя вже почалася.</p>

        <p>До зустрічі в Парку 🐾</p>

        <p><strong>Команда Дивотварин</strong></p>
      </div>
    `

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
       from: "Парк Дивотварин <hello@parkdyvotvaryn.com>",
        to: [normalizedEmail],
        subject: "Твоя Дивотварина вже народилася ✨",
        html: emailHtml,
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

    const saveResponse = await fetch(`${redisUrl}/set/${redisKey}/true`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${redisToken}`,
      },
    })
body: JSON.stringify({
  from: "Парк Дивотварин <hello@parkdyvotvaryn.com>",
  to: [normalizedEmail],
  subject: "Твоя Дивотварина вже народилася ✨",
  html: emailHtml,
  attachments: [
    {
      filename: "dyvotvaryna.png",
      content: imageBase64,
    },
  ],
}),
    const saveData = await saveResponse.json()

    if (!saveResponse.ok || saveData.error) {
      return res.status(500).json({
        error: "Email was sent, but usage was not saved",
      })
    }

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
