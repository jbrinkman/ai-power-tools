# Authentication Reference

Authentication is shared across all atlassian-cli services (Jira, Confluence, Bitbucket). Profiles store credentials in the system keychain.

---

## Login

Create or update a profile with credentials.

```bash
atlassian-cli auth login --profile <PROFILE> --base-url <URL> --email <EMAIL> --token <TOKEN>
```

| Flag | Required | Description |
|------|----------|-------------|
| `--profile` | Yes | Profile name to create or update |
| `--base-url` | Yes | Site URL (e.g., `https://example.atlassian.net`) |
| `--email` | Yes | Account email |
| `--token` | No | API token (falls back to `ATLASSIAN_API_TOKEN` env var or interactive prompt) |
| `--default` | No | Mark this profile as the default |

### Examples

```bash
# Login using env var (recommended; avoids leaking tokens via shell history/process list)
export ATLASSIAN_API_TOKEN="your-api-token"
atlassian-cli auth login --profile work --base-url https://mysite.atlassian.net --email user@example.com

# Avoid passing --token on the command line; it may be captured in shell history/CI logs

# Login and set as default
atlassian-cli auth login --profile work --base-url https://mysite.atlassian.net --email user@example.com --default
```

---

## Status

Show authentication status for all services.

```bash
atlassian-cli auth status [OPTIONS]
```

| Flag | Required | Description |
|------|----------|-------------|
| `--profile` | No | Check specific profile (defaults to default profile) |
| `--configured-only` | No | Only show configured services |

### Examples

```bash
atlassian-cli auth status
atlassian-cli auth status --profile work --configured-only
```

---

## Whoami

Show current user information.

```bash
atlassian-cli auth whoami [OPTIONS]
```

| Flag | Required | Description |
|------|----------|-------------|
| `--profile` | No | Profile to use (defaults to default profile) |
| `-f, --format` | No | Output format: `json`, `yaml`, `markdown`, `table` |
### Examples

```bash
atlassian-cli auth whoami
atlassian-cli auth whoami --profile work -f json
```

---

## Test

Test authentication for a profile.

```bash
atlassian-cli auth test [OPTIONS]
```

| Flag | Required | Description |
|------|----------|-------------|
| `--profile` | No | Profile to test (defaults to default profile) |

### Examples

```bash
atlassian-cli auth test
atlassian-cli auth test --profile work
```

---

## List

List configured profiles.

```bash
atlassian-cli auth list [OPTIONS]
```

| Flag | Required | Description |
|------|----------|-------------|
| `--all` | No | Show all profiles, including those without active tokens |

### Examples

```bash
atlassian-cli auth list
atlassian-cli auth list --all -f json
```

---

## Logout

Remove stored credentials for a profile.

```bash
atlassian-cli auth logout --profile <PROFILE>
```

| Flag | Required | Description |
|------|----------|-------------|
| `--profile` | Yes | Profile to remove credentials for |
| `--remove-profile` | No | Remove the profile from config entirely |

### Examples

```bash
# Remove credentials only
atlassian-cli auth logout --profile work

# Remove profile entirely
atlassian-cli auth logout --profile old-account --remove-profile
```
