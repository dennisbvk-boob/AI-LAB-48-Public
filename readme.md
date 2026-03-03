# CAP Base Project + Hello World (BTP Cloud Foundry)

Base SAP CAP Node.js scaffold intended as the starting point for follow-up agents.

## Included

- CAP project scaffolded via `cds init` (Node.js)
- OData v4 hello-world function in `srv/hello-service.cds`
- Service implementation in `srv/hello-service.js`
- Cloud Foundry deployment manifests (`manifest.yml`, `mta.yaml`)
- Claude Code MCP config for SAP CAP in `.mcp.json`
- GitHub Actions workflows for test/build and CF deploy

## OData endpoint

Local or deployed endpoint:

`GET /odata/v4/hello/hello(name='YourName')`

Example response:

```json
{
  "@odata.context": "$metadata#Edm.String",
  "value": "Hello, YourName!"
}
```

## Run locally

```bash
npm ci
npm run watch
```

Smoke test:

```bash
curl "http://localhost:4004/odata/v4/hello/hello(name='Local')"
```

## Claude Code MCP (SAP CAP aware)

Project-level MCP server is committed in `.mcp.json`:

```json
{
  "mcpServers": {
    "sap-cap": {
      "command": "npx",
      "args": ["-y", "@cap-js/mcp-server"]
    }
  }
}
```

Equivalent CLI command:

```bash
claude mcp add sap-cap --scope project -- npx -y @cap-js/mcp-server
```

## Connect to BTP Cloud Foundry

```bash
cf login -a "https://api.cf.<region>.hana.ondemand.com" -o "<ORG>" -s "<SPACE>"
cf target
```

## Deploy hello-world to BTP (manifest flow)

```bash
npm ci
npm run build
cf push -f manifest.yml
```

Check app and route:

```bash
cf app cap-base-hello-world-srv
```

Validate deployed endpoint:

```bash
APP_URL="https://<your-app-route>"
curl "${APP_URL}/odata/v4/hello/hello(name='BTP')"
```

## Optional: MTA deployment

If your landscape standardizes on MTA:

```bash
npx cds build --production
mbt build -t mta_archives --mtar cap-base-hello-world.mtar
cf deploy mta_archives/cap-base-hello-world.mtar
```

## GitHub Actions secrets / variables

For `.github/workflows/cf.yaml` configure:

- Repository variables: `CF_API`, `CF_ORG`, `CF_SPACE`, `CF_USERNAME`
- Repository secret: `CF_PASSWORD`
