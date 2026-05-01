export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type")

  if (req.method === "OPTIONS") return res.status(200).end()
  if (req.method === "GET") return res.status(200).json({ ok: true, message: "API works" })
  if (req.method !== "POST") return res.status(405).json({ error: "Only POST requests allowed" })

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body
    const { image, childName, email } = body || {}

    if (!image) return res.status(400).json({ error: "Missing uploaded image" })
    if (!childName) return res.status(400).json({ error: "Missing child name" })
    if (!email) return res.status(400).json({ error: "Missing email" })

    const prompt = `
Using the provided child’s drawing as inspiration (not a direct copy), create a whimsical fantasy character that feels like a high-quality animated movie hero.
Reimagine the shapes, colors, and ideas from the drawing into a cohesive, polished character design with expressive features and a magical, friendly personality.

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
      return res.status(500).json({ error: "No image returned" })
    }

    const HEADER_IMAGE_URL = "https://YOUR-HEADER-IMAGE-URL-HERE.jpg"

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; color:#004912; max-width:680px; margin:0 auto;">
        <img src="${HEADER_IMAGE_URL}" width="100%" style="max-width:680px; height:auto; border-radius:12px;" />

        <h2>Привіт, ${childName}!</h2>

        <p>Ти щойно зробив(-ла) маленьке диво. І ми це зафіксували 💫</p>

        <p>На основі твоєї картинки народилася унікальна Дивотварина. Жодної такої більше не існує. Це чиста магія + трішки технологій.</p>

        <h3>Що далі?</h3>

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
        from: "Парк Дивотварин <onboarding@resend.dev>",
        to: [email],
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

    return res.status(200).json({
      ok: true,
      message: "Email sent",
    })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}
