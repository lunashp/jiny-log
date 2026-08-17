import { getCollection, render, type CollectionEntry } from "astro:content";

import { resolveCover } from "./cover";
import { extractHeadings } from "./headings";
import { isLocale } from "./schema";
import type { Locale, Post, PostSummary } from "./types";

/**
 * ★ 콘텐츠 파이프라인 격리 경계.
 *
 * 이 파일이 `astro:content` 를 import 하는 유일한 런타임 지점이다.
 * 바깥은 전부 아래의 도메인 타입/함수만 쓴다. (docs/ARCHITECTURE.md §4)
 */

type Entry = CollectionEntry<"posts">;

/**
 * draft 가시성 규칙 — 순수 함수로 분리해 직접 테스트한다.
 *
 * 프로덕션에서는 draft 글이 목록·본문·사이트맵·RSS·llms.txt 어디에도
 * 나타나면 안 된다. 개발 서버에서만 보인다.
 */
export function isPostVisible(draft: boolean, isDev: boolean): boolean {
  return isDev || !draft;
}

/**
 * ★ 이 함수가 유일한 필터링 지점이다.
 *
 * 각 페이지가 개별적으로 필터링하면 언젠가 하나를 빠뜨리고,
 * 그게 사이트맵이면 미완성 글의 URL이 색인된다.
 */
function isVisible(entry: Entry): boolean {
  return isPostVisible(entry.data.draft, import.meta.env.DEV);
}

/** id 는 `<locale>/<slug>`. 로케일 디렉터리가 아니면 빌드를 실패시킨다. */
function splitId(entry: Entry): { locale: Locale; slug: string } {
  const [locale, ...rest] = entry.id.split("/");

  if (!locale || !isLocale(locale) || rest.length !== 1) {
    throw new Error(
      `[content] 잘못된 글 경로 "${entry.id}". ` +
        `글은 content/posts/ko/<slug>.mdx 또는 content/posts/en/<slug>.mdx 여야 합니다.`,
    );
  }

  const slug = rest[0]!;

  // frontmatter 의 slug 는 선택이지만, 있다면 파일명과 일치해야 한다.
  // 불일치를 허용하면 URL과 파일이 갈려 추적이 불가능해진다.
  if (entry.data.slug && entry.data.slug !== slug) {
    throw new Error(
      `[content] slug 불일치 (${entry.id}): ` +
        `frontmatter는 "${entry.data.slug}", 파일명은 "${slug}". 둘을 일치시키세요.`,
    );
  }

  return { locale, slug };
}

function toSummary(entry: Entry): PostSummary {
  const { locale, slug } = splitId(entry);
  const d = entry.data;

  return {
    slug,
    locale,
    title: d.title,
    description: d.description,
    date: d.date,
    updated: d.updated,
    summary: d.summary,
    tags: d.tags,
    category: d.category,
    series: d.series,
    canonical: d.canonical,
    cover: resolveCover(d.cover, entry.id),
    draft: d.draft,
  };
}

function toPost(entry: Entry): Post {
  const raw = entry.body ?? "";

  return {
    ...toSummary(entry),
    entry,
    raw,
    related: entry.data.related,
    headings: extractHeadings(raw),
  };
}

/** 최신순. 같은 날짜면 슬러그로 안정 정렬한다. */
function byDateDesc(a: PostSummary, b: PostSummary): number {
  return b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug);
}

const visibleEntries = async (): Promise<Entry[]> =>
  await getCollection("posts", isVisible);

/** 해당 로케일의 공개 가능한 글 목록 (최신순). */
export async function getPosts(locale: Locale): Promise<PostSummary[]> {
  const entries = await visibleEntries();
  return entries
    .map(toSummary)
    .filter((p) => p.locale === locale)
    .sort(byDateDesc);
}

/** 전 로케일의 공개 가능한 글. 사이트맵·llms.txt·정적 경로 생성용. */
export async function getAllPosts(): Promise<PostSummary[]> {
  const entries = await visibleEntries();
  return entries.map(toSummary).sort(byDateDesc);
}

export async function getPostBySlug(
  locale: Locale,
  slug: string,
): Promise<Post | undefined> {
  const entries = await visibleEntries();
  const found = entries.find((entry) => {
    const parts = splitId(entry);
    return parts.locale === locale && parts.slug === slug;
  });
  return found ? toPost(found) : undefined;
}

/** 본문 렌더링에 필요한 전체 글 목록. 정적 경로 생성에서 함께 넘긴다. */
export async function getAllFullPosts(): Promise<Post[]> {
  const entries = await visibleEntries();
  return entries.map(toPost).sort(byDateDesc);
}

export async function getPostsByTag(locale: Locale, tag: string): Promise<PostSummary[]> {
  const posts = await getPosts(locale);
  return posts.filter((p) => p.tags.includes(tag));
}

/** 태그와 글 수. */
export async function getAllTags(
  locale: Locale,
): Promise<Array<{ tag: string; count: number }>> {
  const posts = await getPosts(locale);
  const counts = new Map<string, number>();

  for (const post of posts) {
    for (const tag of post.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

/**
 * 이 슬러그로 실제 존재하는 로케일 목록.
 *
 * hreflang 과 언어 전환 버튼이 이걸 쓴다. 없는 번역을 가리키는 hreflang은
 * SEO에 해로우므로 "존재하는 것만" 반환하는 것이 계약이다.
 */
export async function getAvailableLocales(slug: string): Promise<Locale[]> {
  const entries = await visibleEntries();
  return entries
    .map(splitId)
    .filter((p) => p.slug === slug)
    .map((p) => p.locale)
    .sort();
}

/**
 * 본문 렌더링. `astro:content` 의 render 를 이 레이어 안에 가둔다 —
 * 페이지가 직접 import 하면 격리가 깨진다 (docs/ARCHITECTURE.md §4).
 */
export async function renderPost(post: Post) {
  return await render(post.entry);
}

/** frontmatter의 related 슬러그를 실제 글로 해석한다. 없는 슬러그는 조용히 제외. */
export async function getRelatedPosts(post: Post): Promise<PostSummary[]> {
  const pool = await getPosts(post.locale);
  return post.related
    .map((slug) => pool.find((p) => p.slug === slug))
    .filter((p): p is PostSummary => p !== undefined);
}
