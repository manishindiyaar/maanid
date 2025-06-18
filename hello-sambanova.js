import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "https://api.sambanova.ai/v1",
  apiKey: "94af0546-481f-409f-af65-fd63a2ec8a31",
});

const chatCompletion = await client.chat.completions.create({
  messages: [
    { role: "system", content: "Answer the question in a couple sentences." },
    { role: "user", content: "Share a happy story with me" },
  ],
  model: "Meta-Llama-3.1-405B-Instruct",
});

console.log(chatCompletion.choices[0].message.content);