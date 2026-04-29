export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Only POST requests allowed" });
    }

    const { prompt } = req.body;

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
        quality: "low"
      }),
    });

    const data = await response.json();

    const imageBase64 = data.data[0].b64_json;

    res.status(200).json({
      image: `data:image/png;base64,${imageBase64}`
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
