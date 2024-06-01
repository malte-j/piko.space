export async function createOpenAIEmbedding({
  apiKey,
  input,
}: {
  apiKey: string;
  input: string | string[];
}) {
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: input,
      dimensions: 256,
    }),
  });

  if (!res.ok) {
    throw new Error(res.statusText);
  }

  return res.json() as Promise<{
    object: "list";
    data: {
      object: "embedding";
      embedding: number[];
      index: number;
    }[];
    model: string;
    usage: {
      prompt_tokens: number;
      total_tokens: number;
    };
  }>;
}

export async function listModels({ apiKey }: { apiKey: string }) {
  const res = await fetch("https://api.openai.com/v1/models", {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!res.ok) {
    const err = (await res.json()) as { error: { message: string } };
    throw new Error(err.error.message);
  }

  return res.json() as Promise<{
    object: "list";
    data: {
      id: string;
      object: "model";
      created: number;
      owned_by: string;
    }[];
  }>;
}

interface Message {
  role: "system" | "user";
  content: [
    {
      type: "text";
      text: string;
    }
  ];
}

export async function createOpenAICompletion({
  key,
  messages,
  maxTokens = 256,
}: {
  key: string;
  messages: Message[];
  maxTokens?: number;
}) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: "gpt-3.5-turbo-0125",
      messages,
      temperature: 1,
      max_tokens: maxTokens,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
    }),
  });

  if (!res.ok) {
    const err = (await res.json()) as { error: { message: string } };
    throw new Error(err.error.message);
  }

  return res.json() as Promise<{
    choices: {
      index: number;
      message: {
        content: string;
      };
      logprobs: null;
      finish_reason: "stop";
    }[];
    created: number;
    id: string;
    model: string;
    object: "chat.completion";
    system_fingerprint: string;
    usage: {
      prompt_tokens: number;
      completion_tokens: number;
      total_tokens: number;
    };
  }>;
}
