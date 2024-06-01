import { createOpenAICompletion } from "./openAI";

export function generateFileTitle(openAIKey: string, fileContent: string) {
  return createOpenAICompletion({
    key: openAIKey,
    maxTokens: 64,
    messages: [
      {
        role: "system",
        content: [
          {
            type: "text",
            text: "Generate a short title with up to four words that fits the following file content. The title should start with an emoji, followed by a space. Respond ONLY with the title, nothing else.",
          },
        ],
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text:
              "[start_file_content]\n" + fileContent + "\n[end_file_content]",
          },
        ],
      },
    ],
  });
}
