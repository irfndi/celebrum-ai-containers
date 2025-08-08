# Celebrum AI Trading Platform

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/cloudflare/templates/tree/main/containers-template)

![Containers Template Preview](https://imagedelivery.net/_yJ02hpOMj_EnGvsU2aygw/5aba1fb7-b937-46fd-fa67-138221082200/public)

---

This is a production-ready, single-package application for Cloudflare Containers.

- **No monorepo or workspace dependencies.**
- **All dependencies are managed with [pnpm](https://pnpm.io/).**
- **All debug and test output files are cleaned before production deploys.**

## Getting Started

Install dependencies (pnpm only):

```bash
pnpm install
```

Run the development server:

```bash
pnpm run dev
```

Open [http://localhost:8787](http://localhost:8787) with your browser to see the result.

Edit your Worker in `src/index.ts` and your Container in `container_src/`.

## Testing & Linting

- Run all tests (unit, integration, e2e):
  ```bash
  pnpm run test:all
  ```
- Run E2E tests only (headless):
  ```bash
  pnpm run test:e2e
  ```
- Lint the codebase:
  ```bash
  pnpm run lint
  ```

## Deploying To Production

| Command            | Action                                |
| :---------------- | :------------------------------------ |
| `pnpm run deploy` | Deploy your application to Cloudflare |

## Clean Up for Production

Before deploying, ensure all debug and test output files are removed:
- `test-output*.txt`, `test-results*.xml`, `debug-*.js`, etc.

## Learn More

- [Container Documentation](https://developers.cloudflare.com/containers/)
- [Container Class](https://github.com/cloudflare/containers)

---

Your feedback and contributions are welcome!
