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

function getLocalizedText(value: LocalizedText, locale: string): string {
  return value[locale] ?? value.en ?? Object.values(value)[0] ?? "";
}

function getLocalizedItems(value: LocalizedItems, locale: string): string[] {
  return value[locale] ?? value.en ?? Object.values(value)[0] ?? [];
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

function localizePost(post: RawNewsPost, locale: string): NewsPost {
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
  return rawNewsPosts.map((post) => localizePost(post, locale));
}

export function getNewsPostBySlug(slug: string, locale: string): NewsPost | null {
  const post = rawNewsPosts.find((entry) => entry.slug === slug);
  return post ? localizePost(post, locale) : null;
}
