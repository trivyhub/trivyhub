# TrivyHub

Self-hosted dashboard for [Trivy](https://trivy.dev) vulnerability reports. Push scan results from your CI pipelines and visualize them in one place.

![License](https://img.shields.io/github/license/trivyhub/trivy-dashboard-web)
![Docker Image](https://img.shields.io/badge/ghcr.io-trivyhub%2Ftrivy--dashboard--web-blue)

## Features

- **Overview** — global risk score, CVE trend chart, top at-risk projects
- **Projects** — card grid with severity bars, risk score, environment filter
- **Project detail** — CVE evolution chart, diff vs previous scan, recent scans
- **Vulnerabilities** — paginated table with SLA age badge, severity filter, CSV export
- **Scan history** — full timeline per project with branch/commit/pipeline context, CVE drill-down
- **Members** — invite, role management (owner / admin / member / viewer)
- **API Keys** — create, copy, revoke
- **Settings** — change password, account info
- **Dark / Light mode** — toggle in sidebar, persisted

## Stack

| Component | Technology |
|-----------|------------|
| Framework | Next.js (App Router) |
| Language | TypeScript |
| ORM | Prisma (SQLite or PostgreSQL) |
| Charts | Recharts |
| Icons | Lucide React |

---

## Quick Start

### Option 1 — Docker (SQLite, zero config)

The simplest way to get started. Data is persisted in a Docker volume.

```bash
docker run -d \
  --name trivyhub \
  -p 3000:3000 \
  -e JWT_SECRET=$(openssl rand -hex 32) \
  -v trivyhub-data:/app/data \
  ghcr.io/trivyhub/trivy-dashboard-web:latest
```

Open [http://localhost:3000](http://localhost:3000) and create your account.

---

### Option 2 — Docker Compose (PostgreSQL, recommended for production)

```bash
curl -O https://raw.githubusercontent.com/trivyhub/trivy-dashboard-web/main/docker-compose.yml
JWT_SECRET=$(openssl rand -hex 32) POSTGRES_PASSWORD=$(openssl rand -hex 16) docker compose up -d
```

Or clone the repo and run:

```bash
git clone https://github.com/trivyhub/trivy-dashboard-web.git
cd trivy-dashboard-web
JWT_SECRET=$(openssl rand -hex 32) POSTGRES_PASSWORD=$(openssl rand -hex 16) docker compose up -d
```

---

### Option 3 — Kubernetes / Helm

```bash
helm install trivyhub oci://ghcr.io/trivyhub/charts/trivy-dashboard-web \
  --set env.JWT_SECRET=$(openssl rand -hex 32) \
  --set postgres.password=$(openssl rand -hex 16) \
  --set ingress.enabled=true \
  --set ingress.host=trivyhub.your-company.com
```

Or from source:

```bash
git clone https://github.com/trivyhub/trivy-dashboard-web.git
cd trivy-dashboard-web

helm install trivyhub ./helm/trivyhub \
  --set env.JWT_SECRET=$(openssl rand -hex 32) \
  --set postgres.password=$(openssl rand -hex 16) \
  --set ingress.enabled=true \
  --set ingress.host=trivyhub.your-company.com
```

With TLS (cert-manager):

```bash
helm install trivyhub ./helm/trivyhub \
  --set env.JWT_SECRET=$(openssl rand -hex 32) \
  --set postgres.password=$(openssl rand -hex 16) \
  --set ingress.enabled=true \
  --set ingress.host=trivyhub.your-company.com \
  --set ingress.tls.enabled=true \
  --set ingress.tls.secretName=trivyhub-tls
```

#### HTTPS with Caddy (VPS)

```
trivyhub.your-company.com {
    reverse_proxy localhost:3000
}
```

Caddy handles Let's Encrypt automatically.

---

## Pushing scan reports from CI

### 1. Generate an API token

In TrivyHub: **Settings → API Keys → New key**

### 2. Add to your pipeline

**GitHub Actions:**

```yaml
- name: Trivy scan
  run: trivy image --format json --output report.json $IMAGE

- name: Push to TrivyHub
  run: |
    curl -X POST \
      -H "Authorization: Bearer ${{ secrets.TRIVYHUB_TOKEN }}" \
      -F "project=${{ github.repository }}" \
      -F "file=@report.json" \
      -F "environment=production" \
      -F "branch=${{ github.ref_name }}" \
      -F "commit=${{ github.sha }}" \
      -F "pipeline_url=${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}" \
      -F "triggered_by=${{ github.actor }}" \
      https://trivyhub.your-company.com/api/v1/report
```

**GitLab CI:**

```yaml
trivy-scan:
  script:
    - trivy image --format json --output report.json $IMAGE
    - curl -X POST \
        -H "Authorization: Bearer $TRIVYHUB_TOKEN" \
        -F "project=$CI_PROJECT_NAME" \
        -F "file=@report.json" \
        -F "environment=production" \
        -F "branch=$CI_COMMIT_REF_NAME" \
        -F "commit=$CI_COMMIT_SHA" \
        -F "pipeline_url=$CI_JOB_URL" \
        -F "triggered_by=$GITLAB_USER_LOGIN" \
        https://trivyhub.your-company.com/api/v1/report
```

### API fields

| Field | Required | Description |
|-------|----------|-------------|
| `project` | **Yes** | Project name |
| `file` | **Yes** | Trivy JSON report |
| `environment` | No | Target environment (`production`, `staging`...) |
| `branch` | No | Git branch |
| `commit` | No | Git commit SHA |
| `pipeline_url` | No | Link to CI job |
| `pipeline_id` | No | CI job ID |
| `triggered_by` | No | User who triggered the scan |
| `owner` | No | Team responsible |

---

## Environment variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `JWT_SECRET` | **Yes** | — | Secret for signing JWT tokens. Generate with `openssl rand -hex 32` |
| `DATABASE_URL` | No | SQLite (`file:/app/data/trivyhub.db`) | PostgreSQL connection string |
| `DATABASE_PROVIDER` | No | `sqlite` | Set to `postgresql` when using PostgreSQL |

---

## Local development

```bash
git clone https://github.com/trivyhub/trivy-dashboard-web.git
cd trivy-dashboard-web
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## License

MIT
