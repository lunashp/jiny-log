import { getCollection, render, type CollectionEntry } from "astro:content";

import { resolveCover } from "./cover";
import { extractHeadings } from "./headings";
import { isLocale } from "./schema";
import type { Locale, Work, WorkSummary } from "./types";

/**
 * ★ 콘텐츠 파이프라인 격리 경계 (케이스 스터디).
 *
 * `queries.ts` 와 함께, 이 파일이 `astro:content` 를 import 하는 런타임 지점이다.
 * 바깥은 전부 도메인 타입/함수만 쓴다. (docs/ARCHITECTURE.md §4, docs/PORTFOLIO.md §6-2)
 *
 * 글(posts)과 파일을 나눈 이유는 두 가지다.
 *  1. `queries.ts` 가 이미 200줄대라 합치면 파일 크기 규칙을 넘는다.
 *  2. 두 컬렉션의 계약이 달라 한 파일에서 분기하면 실수가 조용히 섞인다.
 */

type Entry = CollectionEntry<"work">;

/**
 * draft 가시성 규칙 — 순수 함수로 분리해 직접 테스트한다.
 *
 * 프로덕션에서는 draft 케이스가 목록·본문·사이트맵·llms.txt 어디에도
 * 나타나면 안 된다. 개발 서버에서만 보인다.
 */
export function isWorkVisible(draft: boolean, isDev: boolean): boolean {
  return isDev || !draft;
}

/** ★ 케이스의 유일한 필터링 지점. 페이지가 각자 거르면 언젠가 하나를 빠뜨린다. */
function isVisible(entry: Entry): boolean {
  return isWorkVisible(entry.data.draft, import.meta.env.DEV);
}

/** id 는 `<locale>/<slug>`. 로케일 디렉터리가 아니면 빌드를 실패시킨다. */
function splitId(entry: Entry): { locale: Locale; slug: string } {
  const [locale, ...rest] = entry.id.split("/");

  if (!locale || !isLocale(locale) || rest.length !== 1) {
    throw new Error(
      `[content] 잘못된 케이스 경로 "${entry.id}". ` +
        `케이스는 content/work/ko/<slug>.mdx 또는 content/work/en/<slug>.mdx 여야 합니다.`,
    );
  }

  const slug = rest[0]!;

  if (entry.data.slug && entry.data.slug !== slug) {
    throw new Error(
      `[content] slug 불일치 (${entry.id}): ` +
        `frontmatter는 "${entry.data.slug}", 파일명은 "${slug}". 둘을 일치시키세요.`,
    );
  }

  return { locale, slug };
}

function toSummary(entry: Entry): WorkSummary {
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
    canonical: d.canonical,
    cover: resolveCover(d.cover, entry.id),
    draft: d.draft,
    role: d.role,
    period: d.period,
    stack: d.stack,
    links: d.links,
  };
}

function toWork(entry: Entry): Work {
  const raw = entry.body ?? "";

  return {
    ...toSummary(entry),
    entry,
    raw,
    headings: extractHeadings(raw),
  };
}

/** 최신순. 같은 날짜면 슬러그로 안정 정렬한다. */
function byDateDesc(a: WorkSummary, b: WorkSummary): number {
  return b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug);
}

const visibleEntries = async (): Promise<Entry[]> =>
  await getCollection("work", isVisible);

/** 해당 로케일의 공개 가능한 케이스 목록 (최신순). */
export async function getWorks(locale: Locale): Promise<WorkSummary[]> {
  const entries = await visibleEntries();
  return entries
    .map(toSummary)
    .filter((w) => w.locale === locale)
    .sort(byDateDesc);
}

/** 전 로케일의 공개 가능한 케이스. 사이트맵·llms.txt·정적 경로 생성용. */
export async function getAllWorks(): Promise<WorkSummary[]> {
  const entries = await visibleEntries();
  return entries.map(toSummary).sort(byDateDesc);
}

export async function getWorkBySlug(
  locale: Locale,
  slug: string,
): Promise<Work | undefined> {
  const entries = await visibleEntries();
  const found = entries.find((entry) => {
    const parts = splitId(entry);
    return parts.locale === locale && parts.slug === slug;
  });
  return found ? toWork(found) : undefined;
}

/** 본문 렌더링에 필요한 전체 케이스. 정적 경로 생성에서 함께 넘긴다. */
export async function getAllFullWorks(): Promise<Work[]> {
  const entries = await visibleEntries();
  return entries.map(toWork).sort(byDateDesc);
}

/**
 * 이 슬러그로 실제 존재하는 로케일 목록.
 *
 * 글의 `getAvailableLocales` 와 이름이 다른 이유는 **다른 컬렉션을 보기 때문**이다.
 * 글용 함수를 케이스에 쓰면 존재하지 않는 글을 조회해 hreflang 이 조용히 비어버린다.
 * 없는 번역을 가리키는 hreflang 은 SEO 에 해로우므로 "존재하는 것만" 반환이 계약이다.
 */
export async function getAvailableWorkLocales(slug: string): Promise<Locale[]> {
  const entries = await visibleEntries();
  return entries
    .map(splitId)
    .filter((w) => w.slug === slug)
    .map((w) => w.locale)
    .sort();
}

/** 본문 렌더링. `render` 를 이 레이어 안에 가둔다 (docs/ARCHITECTURE.md §4). */
export async function renderWork(work: Work) {
  return await render(work.entry);
}
