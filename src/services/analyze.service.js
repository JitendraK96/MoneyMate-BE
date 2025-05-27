const { APP_CLAUDE_API_KEY, APP_CLAUDE_MESSAGE_URL } = require("../config");

const analyzeStatement = async ({ prompt, imageType, base64Data }) => {
  const anthropicResponse = await fetch(APP_CLAUDE_MESSAGE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": APP_CLAUDE_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 4000,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image",
              source: {
                type: "base64",
                media_type: imageType,
                data: base64Data,
              },
            },
          ],
        },
      ],
    }),
  });

  if (!anthropicResponse.ok) {
    const err = await anthropicResponse.text();
    throw new Error(`Claude API returned ${anthropicResponse.status}: ${err}`);
  }

  const data = await anthropicResponse.json();
  const content = data.content[0].text;

  return content;
};

module.exports = {
  analyzeStatement,
};
