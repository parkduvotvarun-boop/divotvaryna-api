export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Only POST requests allowed" });
    }

    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
const { prompt } = body || {};

    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-image-1",
        prompt: prompt || "Cute child drawing style animal",
        size: "auto",
        quality: "low",
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    const imageBase64 = data.data?.[0]?.b64_json;

    return res.status(200).json({
      image: `data:image/png;base64,${imageBase64}`,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
