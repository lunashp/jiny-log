# 웹폰트 라이선스

이 디렉터리의 폰트는 원본을 서브셋한 것이며, 전부 **SIL Open Font License 1.1** 로 배포된다.
전문: https://scripts.sil.org/OFL

| 파일 | 원본 | 저작권 |
|---|---|---|
| `pretendard-variable.subset.woff2` | [Pretendard](https://github.com/orioncactus/pretendard) v1.3.9 | Copyright (c) 2021 Kil Hyung-jin, with Reserved Font Name Pretendard |
| `gowun-batang.subset.woff2` | [Gowun Batang](https://fonts.google.com/specimen/Gowun+Batang) | Copyright (c) 2020 Yanghee Ryu |
| `jetbrains-mono.subset.woff2` | [JetBrains Mono](https://github.com/JetBrains/JetBrainsMono) | Copyright (c) 2020 The JetBrains Mono Project Authors |

## 서브셋 고지

OFL 은 수정본 배포를 허용하되 **예약 폰트명(Reserved Font Name)을 그대로 쓰지 못하게** 한다.
이 파일들은 글자 수를 줄인 서브셋일 뿐 자형을 수정하지 않았으므로, CSS `font-family` 는
원본 이름을 유지한다. 자형을 고치게 되면 이름을 바꿔야 한다.

생성 방법은 `tools/fonts/build-fonts.mjs` 참조.
