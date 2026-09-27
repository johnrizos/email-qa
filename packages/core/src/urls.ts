export type UrlKind =
  | "empty"
  | "placeholder"
  | "script"
  | "merge-tag"
  | "insecure"
  | "relative"
  | "ok";

// ESP personalization tags that get replaced at send time:
// %%field%% (Acoustic, SFMC), {{ var }} (Handlebars/Liquid), *|MERGE|* (Mailchimp),
// #SPCUNSUBSCRIBE# and friends (Acoustic system links).
const MERGE_TAG = /^(%%[^%]+%%|\{\{.+\}\}|\*\|.+\|\*|#SPC\w+#)$/i;

export function classifyUrl(raw: string | undefined): UrlKind {
  const url = (raw ?? "").trim();

  if (!url) return "empty";
  if (MERGE_TAG.test(url)) return "merge-tag";
  if (url.startsWith("#")) return "placeholder";
  if (/^javascript:/i.test(url)) return "script";
  if (/^(https:\/\/|mailto:|tel:|sms:)/i.test(url)) return "ok";
  if (/^http:\/\//i.test(url)) return "insecure";

  return "relative";
}
