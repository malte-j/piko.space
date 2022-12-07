export function parseFileTitle(title: string): {
  emoji: string;
  title: string;
  oldFormat: boolean;
} {
  // try to get emoji from title using \uE000 as a separator
  // match <emoji>\uE000<title>
  const seperatorMatch = title.match(/^(.*)\uE000(.*)/);
  if (seperatorMatch) {
    const [_, emoji, title] = seperatorMatch;
    return { emoji, title, oldFormat: false };
  }

  // try loading the emoji the old way to keep backwards compatibility
  const emojiRegex = /^\p{Emoji} /u;
  if (emojiRegex.test(title)) {
    const [_, emoji, text] = title.match(/(.*?) (.*)/)!;
    return { emoji, title: text, oldFormat: true };
  }

  return {
    emoji: "",
    title,
    oldFormat: false,
  };
}

export function mergeFileTitle(emoji: string, title: string) {
  if (emoji === "") return title;
  return emoji + "\uE000" + title;
}

export function fileTitleToString(title: string) {
  return title.replace("\uE000", " ");
}
