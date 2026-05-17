# test100991

CloudPress로 생성된 WordPress 사이트입니다.

## 사이트 정보
- **URL**: https://cp-e9e3c0ba-wp.choichoi3227.workers.dev
- **관리자**: https://cp-e9e3c0ba-wp.choichoi3227.workers.dev/wp-admin/ (ID: `admin`)
- **Worker 이름**: `cp-e9e3c0ba-wp`
- **Worker URL**: https://cp-e9e3c0ba-wp.choichoi3227.workers.dev
- **GitHub**: [choichoi3227-crypto/cp-e9e3c0ba-test100991](https://github.com/choichoi3227-crypto/cp-e9e3c0ba-test100991)

## 아키텍처
```
요청 → Cloudflare Worker (미러링) → PHP Runner (php-wasm) → WordPress
                ↕                            ↕
           KV 캐시                    GitHub 레포 (_db/wordpress.db)
```

## GitHub Actions
| 워크플로우 | 설명 |
|-----------|------|
| install-wordpress.yml | WordPress 설치 + SQLite DB 초기화 |
| deploy-worker.yml | Cloudflare Worker 재배포 |
| gh-pages-fallback.yml | 정적 캐시 갱신 (SEO 폴백) |
