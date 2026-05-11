import posts from "@/content/news/posts.json";

export type NewsSection = {
  title: string;
  items: string[];
};

export type NewsPost = {
  slug: string;
  title: string;
  summary: string;
  publishedAt: string;
  tags: string[];
  sections: NewsSection[];
};

const newsPosts = (posts as NewsPost[]).slice().sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));

export function listNewsPosts(): NewsPost[] {
  return newsPosts;
}

export function getNewsPostBySlug(slug: string): NewsPost | null {
  return newsPosts.find((post) => post.slug === slug) ?? null;
}
