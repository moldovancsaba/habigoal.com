import posts from "@/content/news/posts.json";

type LocalizedText = Record<string, string>;
type LocalizedItems = Record<string, string[]>;

type RawNewsSection = {
  title: LocalizedText;
  items: LocalizedItems;
};

type RawNewsPost = {
  slug: string;
  title: LocalizedText;
  summary: LocalizedText;
  publishedAt: string;
  tags: string[];
  sections: RawNewsSection[];
};

export type NewsSection = {
  title: string;
  items: string[];
};

export type NewsPost = {
  slug: string;
  title: string;
  summary: string;
  publishedAt: string;
  publishedLabel: string;
  tags: string[];
  sections: NewsSection[];
};

const rawNewsPosts = (posts as RawNewsPost[]).slice().sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));

function hasLocalizedText(value: LocalizedText | undefined, locale: string): boolean {
  return Boolean(value && typeof value[locale] === "string" && value[locale].trim().length > 0);
}

function hasLocalizedItems(value: LocalizedItems | undefined, locale: string): boolean {
  const items = value?.[locale];
  return Array.isArray(items) && items.length > 0 && items.every((item) => typeof item === "string" && item.trim().length > 0);
}

function getLocalizedText(value: LocalizedText, locale: string): string {
  return value[locale] ?? "";
}

function getLocalizedItems(value: LocalizedItems, locale: string): string[] {
  return value[locale] ?? [];
}

function formatPublishedDate(publishedAt: string, locale: string): string {
  const parsed = new Date(`${publishedAt}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) {
    return publishedAt;
  }

  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "long",
    day: "numeric"
  }).format(parsed);
}

function postSupportsLocale(post: RawNewsPost, locale: string): boolean {
  return hasLocalizedText(post.title, locale)
    && hasLocalizedText(post.summary, locale)
    && post.sections.every((section) => hasLocalizedText(section.title, locale) && hasLocalizedItems(section.items, locale));
}

function localizePost(post: RawNewsPost, locale: string): NewsPost | null {
  if (!postSupportsLocale(post, locale)) {
    return null;
  }

  return {
    slug: post.slug,
    title: getLocalizedText(post.title, locale),
    summary: getLocalizedText(post.summary, locale),
    publishedAt: post.publishedAt,
    publishedLabel: formatPublishedDate(post.publishedAt, locale),
    tags: post.tags,
    sections: post.sections.map((section) => ({
      title: getLocalizedText(section.title, locale),
      items: getLocalizedItems(section.items, locale)
    }))
  };
}

export function listNewsPosts(locale: string): NewsPost[] {
  return rawNewsPosts.map((post) => localizePost(post, locale)).filter((post): post is NewsPost => post !== null);
}

export function getNewsPostBySlug(slug: string, locale: string): NewsPost | null {
  const post = rawNewsPosts.find((entry) => entry.slug === slug);
  return post ? localizePost(post, locale) : null;
}

export function getLatestUnseenNewsPost(locale: string, seenVersions: string[]): NewsPost | null {
  const seen = new Set(seenVersions);
  for (const post of rawNewsPosts) {
    if (seen.has(post.slug)) {
      continue;
    }

    const localized = localizePost(post, locale);
    if (localized) {
      return localized;
    }
  }

  return null;
}
