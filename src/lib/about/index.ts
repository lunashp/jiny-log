import type { Locale } from "@/lib/content";

/**
 * `/about` 의 서술 내용.
 *
 * 메시지 카탈로그(`messages/*.json`)가 아니라 여기에 두는 이유는, 이 내용이
 * UI 문자열이 아니라 **구조를 가진 콘텐츠**이기 때문이다. JSON 에 긴 산문을 넣으면
 * 줄바꿈이 escape 로 깨지고 타입도 얻지 못한다.
 *
 * ★ 연락처(휴대폰·이메일)를 여기에 넣지 않는다 — 공개 페이지에 두면 크롤러가 수집한다.
 *   이력서 전문은 지원 시 개별 전달한다 (docs/PORTFOLIO.md §2).
 */

export interface CareerRow {
  company: string;
  period: string;
  role: string;
  summary: string;
}

export interface OtherWork {
  name: string;
  summary: string;
}

export interface AboutContent {
  lede: string;
  paragraphs: string[];
  career: CareerRow[];
  otherWork: OtherWork[];
  site: string[];
}

const ko: AboutContent = {
  lede: "클라우드 엔지니어에서 풀스택을 거쳐 프론트엔드로 옮겨온 개발자입니다.",
  paragraphs: [
    "AI 브랜드 분석 SaaS 에서 프론트엔드 개발자 1명 체제로 일하고 있습니다. 분석 대시보드·사내 운영 백오피스·리더보드·랜딩·블로그 플랫폼·회사 소개 사이트·사내 업무 시스템까지 웹 프로덕트 7건의 프론트엔드를 전담했고, 그중 4건은 요구사항 정리부터 배포 구성까지 0에서 만들었습니다.",
    "타입 정의부터 API 연동·인증 프록시·배포 구성까지 한 흐름으로 다룹니다. 특히 사람 눈으로는 잡히지 않는 결함을 자동 검증 게이트로 바꾸는 일과, 답변 엔진·AI 에이전트가 읽고 쓰는 프론트엔드에 강점이 있습니다.",
    "이 사이트의 케이스 스터디는 그 일들 중 판단이 갈렸던 지점만 골라 쓴 것입니다. 잘된 것보다 되돌린 것과 틀렸던 것을 남기려 했습니다.",
  ],
  career: [
    {
      company: "플립비",
      period: "2025.11 – 재직 중",
      role: "Frontend",
      summary: "AI 브랜드 분석 SaaS 프론트엔드 전담. 웹 프로덕트 7건(4건 단독 0→1).",
    },
    {
      company: "아콘소프트",
      period: "2025.02 – 2025.07",
      role: "DevOps",
      summary: "금융권 MSA 컨설팅. 프론트엔드 모듈화 구조 설계, 승인 기반 배포 자동화.",
    },
    {
      company: "휴버텍",
      period: "2023.05 – 2024.05",
      role: "Full Stack",
      summary: "KaaS 플랫폼. MSW 로 백엔드 선행 의존 없는 병렬 개발 환경 구축.",
    },
    {
      company: "레빗",
      period: "2022.05 – 2023.04",
      role: "Cloud Engineer",
      summary: "개방형 클라우드 플랫폼. 보안 점검 자동화, CCE·CVE 취약점 분석.",
    },
  ],
  otherWork: [
    {
      name: "사내 ITSM · 그룹웨어",
      summary:
        "외부 협업툴 종료에 대응해 자체 구축을 기획했습니다. 기능정의서 17개 문서를 쓰고, 기능 130건 중 89건만 1차 범위로 확정하면서 '만들지 않을 것' 46건을 따로 명시했습니다. STEP 1 화면 17종을 구현했습니다.",
    },
    {
      name: "제품 소개 랜딩",
      summary:
        "리드 확보 플로우와 SEO/GEO 표면을 만들었습니다. 라우트별 canonical 중복을 제거하고, AI 크롤러용 llms.txt 를 한·영으로 제공했습니다.",
    },
    {
      name: "멀티테넌트 블로그 플랫폼",
      summary:
        "하나의 코드베이스로 고객사별 독립 블로그를 제공합니다. 테넌트 브랜딩을 CSS 변수 주입으로 처리해 코드 분기를 두지 않았습니다.",
    },
    {
      name: "AI 에이전트 개발 환경",
      summary:
        "저장소마다 코딩 에이전트 작업 환경을 구성했습니다. 역할별 서브에이전트와 훅·스킬을 정의하고, 규칙을 '읽고 판단하는 문서'가 아니라 '실행하면 답이 나오는 검사 명령' 형태로 저장소당 7~13개 배치했습니다.",
    },
  ],
  site: [
    "이 블로그는 Astro 7 로 만들었습니다. 처음에는 Next.js 16 App Router 로 구현했는데, 클라이언트 컴포넌트를 전부 제거해도 JS 138KB 가 남는 것을 실측하고 옮겼습니다. 현재 글 본문 라우트의 JS 는 2.2KB 입니다.",
    "번들 예산은 CI 하드 게이트입니다. 초과하면 빌드가 실패하고, 예산을 올려서 통과시키지 않습니다. 접근성·시각 회귀도 같은 방식으로 묶여 있습니다.",
  ],
};

const en: AboutContent = {
  lede: "A frontend developer who came by way of cloud engineering and full-stack work.",
  paragraphs: [
    "I am the sole frontend developer at an AI brand-analytics SaaS. I own the frontend of seven web products — the analytics dashboard, internal back office, leaderboard, landing site, blog platform, company site, and an internal operations system. Four of them I built from zero, from requirements through deployment.",
    "I work across the whole path: type definitions, API integration, the auth proxy, and deployment configuration. My strength is turning defects that no one can see by eye into automated verification gates, and building frontends that answer engines and AI agents can actually read.",
    "The case studies here cover only the moments where a judgment call went one way rather than another. I tried to write down what I reverted and got wrong, not what went smoothly.",
  ],
  career: [
    {
      company: "FlipB",
      period: "2025.11 – present",
      role: "Frontend",
      summary:
        "Sole frontend for an AI brand-analytics SaaS. Seven web products, four built from zero.",
    },
    {
      company: "Aconsoft",
      period: "2025.02 – 2025.07",
      role: "DevOps",
      summary:
        "MSA consulting for a financial client. Frontend module federation design, approval-gated deployment.",
    },
    {
      company: "Hubertech",
      period: "2023.05 – 2024.05",
      role: "Full Stack",
      summary:
        "Kubernetes-as-a-Service platform. Introduced MSW so frontend work no longer waited on the backend.",
    },
    {
      company: "Rabbit",
      period: "2022.05 – 2023.04",
      role: "Cloud Engineer",
      summary:
        "Open cloud platform. Automated security auditing, CCE and CVE vulnerability analysis.",
    },
  ],
  otherWork: [
    {
      name: "Internal ITSM & groupware",
      summary:
        "Planned an in-house replacement for a collaboration tool being sunset. Wrote 17 specification documents and fixed the first release at 89 of 130 features — while explicitly listing the 46 we would not build. Implemented 17 screens for step one.",
    },
    {
      name: "Product landing site",
      summary:
        "Built the lead funnel and the SEO/GEO surface. Removed duplicate canonical tags per route and shipped llms.txt for AI crawlers in both languages.",
    },
    {
      name: "Multi-tenant blog platform",
      summary:
        "One codebase serving an independent blog per customer. Tenant branding is injected as CSS variables, so there is no per-tenant branching in code.",
    },
    {
      name: "AI agent development environment",
      summary:
        "Configured coding-agent workspaces per repository — role-specific subagents, hooks, and skills. Rules are written as runnable check commands rather than prose to be interpreted, 7 to 13 per repository.",
    },
  ],
  site: [
    "This blog runs on Astro 7. It started as Next.js 16 App Router, but even after removing every client component 138KB of JavaScript remained, so I moved it. The article route now ships 2.2KB.",
    "The bundle budget is a hard CI gate. Exceeding it fails the build, and the budget is not raised to make it pass. Accessibility and visual regression are wired the same way.",
  ],
};

const CONTENT = { ko, en } as const;

export function getAbout(locale: Locale): AboutContent {
  return CONTENT[locale];
}
