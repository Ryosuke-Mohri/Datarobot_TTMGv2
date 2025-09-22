# Talk to My Docs

A modular, application template for building, developing, and deploying an AI-powered applications with multi-agent orchestration, modern web frontends, and robust infrastructure-as-code to dynamically talk to your documents across different providers such as Google Drive, Box, and your local computer.

> **Warning**
> This template is a starting point. You must adapt it for your business requirements before deploying to production.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Architecture Overview](#architecture-overview)
3. [Development Workflow](#development-workflow)
4. [Deployment](#deployment)
5. [Change the LLM](#change-the-llm)
6. [Web Configuration](#web-configuration)
7. [OAuth Applications](#oauth-applications)
8. [Subproject Documentation](#subproject-documentation)
9. [Advanced Usage](#advanced-usage)
10. [Additional Resources](#additional-resources)

---

## Quick Start

### Prerequisites

If you are using DataRobot Codespaces, this is already complete for you. If not, install the following tools:

- [Python](https://www.python.org/downloads/) (3.11+ required for infrastructure and backend development)
- [Taskfile.dev](https://taskfile.dev/#/installation) (task runner)
- [uv](https://docs.astral.sh/uv/getting-started/installation/) (Python package manager)
- [Node.js](https://nodejs.org/en/download/) (JavaScript runtime for frontend development)
- [Pulumi](https://www.pulumi.com/docs/iac/download-install/) (infrastructure as code)

#### Example Installation Commands

For the latest and most accurate installation instructions for your platform, visit:

- https://www.python.org/downloads/
- https://taskfile.dev/installation/
- https://docs.astral.sh/uv/getting-started/installation/
- https://nodejs.org/en/download/
- https://www.pulumi.com/docs/iac/download-install/

We provide the instructions below to save you a context flip, but your system may not meet the common expectations from these shortcut scripts:

**macOS:**

```sh
brew install python
brew install go-task/tap/go-task
brew install uv
brew install node
brew install pulumi/tap/pulumi
```

**Linux (Debian/Ubuntu/DataRobot Codespaces):**

```sh
# Python
sudo apt-get update
sudo apt-get install -y python3 python3-pip python3-venv
# Taskfile.dev
sh -c "$(curl --location https://taskfile.dev/install.sh)" -- -d -b ~/.local/bin
# uv
curl -Ls https://astral.sh/uv/install.sh | sh
# Node.js
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs
# Pulumi
curl -fsSL https://get.pulumi.com | sh
```

**Windows (PowerShell):**

```powershell
# Python
winget install --id=Python.Python.3.12 -e
# Taskfile.dev
winget install --id=Task.Task -e
# uv
winget install --id=astral-sh.uv  -e
# Node.js
winget install --id=OpenJS.NodeJS -e
# Pulumi
winget install pulumi
winget upgrade pulumi
# Windows Developer Tools
winget install Microsoft.VisualStudio.2022.BuildTools
# For Windows 10/11, toggle Developer Mode to "On" under System > For developer to enable symbolic link
```

### Pulumi Login

Pulumi requires a location to store the state of the application template. The easiest option is to
run:

```
pulumi login --local
```

We recommend using a shared backend like Ceph, Minio, S3, or Azure Blob Storage. See
[Managing Pulumi State and Backends](https://www.pulumi.com/docs/iac/concepts/state-and-backends/) for
more details. For production CI/CD information see our comprehensive
[CI/CD Guide for Application Templates](https://docs.datarobot.com/en/docs/workbench/wb-apps/app-templates/pulumi-tasks/cicd-tutorial.html)

### Clone the Repository

```sh
git clone https://github.com/datarobot-community/talk-to-my-docs-agents
cd talk-to-my-docs-agents
```

### Environment Setup

Copy the sample environment file and fill in your credentials:

```sh
cp .env.template .env
# Edit .env with your API keys and secrets
```

The `task` commands will automatically read the `.env` file directly to ensure each task gets the correct configuration.
If you need to source those variables directly into your shell you can:

**Linux/macOS:**

```sh
set -a && source .env && set +a
```

**Windows (PowerShell):**

```powershell
Get-Content .env | ForEach-Object {
	if ($_ -match '^\s*([^#][^=]*)=(.*)$') {
		[System.Environment]::SetEnvironmentVariable($matches[1], $matches[2])
	}
}
```

---

## Architecture Overview

This template is organized into modular components:

- **agent_retrieval_agent/**: Multi-agent orchestration and core agent logic using CrewAI for complex processing and capabilities with you documents ([README](agent_retrieval_agent/README.md))
- **core/**: Shared Python core logic ([README](core/README.md))
- **frontend_web/**: React + Vite web frontend ([README](frontend_web/README.md))
- **web/**: FastAPI backend ([README](web/README.md))
- **infra/**: Pulumi infrastructure-as-code

![Architectural Diagram](_docs/static/img/architectural-diagram.png)

Each component can be developed and deployed independently or as part of the full stack.

---

## Development Workflow

All subprojects use [Taskfile.dev](https://taskfile.dev/#/installation) for common tasks. See each subproject’s README for details.

### Common Tasks

The project uses [Taskfile.dev](https://taskfile.dev/#/) to manage common development tasks. Here are the most frequently used commands:

- `task install-all`: Installs all dependencies for every subproject.
- `task dev-all`: Starts all development servers and processes.

### Getting Started

To get started, run:

```sh
task install-all
task infra:deploy-dev
```

This will install all dependencies for each component, and deploy the backend LLM which sets you up
for local/Codespace development.

To get running the three components that run locally, the agent, backend web, and frontend Web server
you can run the single command:

```sh
task dev-all
```

And if you want to work on each one separately, you'll want to run them on their own:

#### Running the Agent Locally

```sh
task agent:dev
```

#### Running the Frontend

```sh
task frontend:dev
```

#### Running the Backend

```sh
task web:dev-agent
```

Running the Web backend with a deployed Agent:

```sh
task web:dev
```

---

## Deployment

Infrastructure is managed with Pulumi. To deploy:

```sh
task infra:deploy
```

Or, for manual control:

```sh
set -a && source .env && set +a
cd infra
uv run pulumi stack init <your-stack-name>
uv run pulumi up
```

There are also several shortcut tasks in that `task infra:` component such as only
deploying the backing LLM, getting stack info, or changing your stack if you have multiple stacks.

---

## Change the LLM

Talk to My Docs supports multiple flexible LLM options including:

- LLM Blueprint with LLM Gateway (default)
- LLM Blueprint with an External LLM
- Registered model such as an NVIDIA NIM
- Already Deployed Text Generation model in DataRobot

### LLM Configuration Recommended Option

You can edit the LLM configuration by manually changing which configuration is active.
Simply run:

```sh
ln -sf ../configurations/<chosen_configuration> infra/infra/llm.py
```

After doing so, you'll likely want to edit the llm.py to have the correct model selected. Particularly
for non-LLM Gateway options.

### LLM Configuration Alternative Option

If you want to do it dynamically, you can set it as a configuration value with:

```sh
INFRA_ENABLE_LLM=<chosen_configuration>
```

from the list of options in the `infra/configurations/llm` folder.

Here are some examples of each configuration using the dynamic option described above:

#### LLM Blueprint with LLM Gateway (default)

Default option is LLM Blueprint with LLM Gateway if not specified in your `.env` file.

```sh
INFRA_ENABLE_LLM=blueprint_with_llm_gateway.py
```

#### Existing LLM Deployment in DataRobot

Uncomment and configure these in your `.env` file:

```sh
TEXTGEN_DEPLOYMENT_ID=<your_deployment_id>
INFRA_ENABLE_LLM=deployed_llm.py
```

#### Registered Model with LLM Blueprint

Like an NVIDIA NIM. This also shows how you can adjust the timeout in case getting a GPU takes a long time:

```sh
DATAROBOT_TIMEOUT_MINUTES=120
TEXTGEN_REGISTERED_MODEL_ID='<Your Registered Model ID>'
INFRA_ENABLE_LLM=registered_model.py
```

#### External LLM Provider

Configure an LLM with an external LLM provider like Azure, Bedrock, Anthropic, or VertexAI. Here's an Azure AI example:

```sh
INFRA_ENABLE_LLM=blueprint_with_external_llm.py
LLM_DEFAULT_MODEL="azure/gpt-4o"
OPENAI_API_VERSION='2024-08-01-preview'
OPENAI_API_BASE='https://<your_custom_endpoint>.openai.azure.com'
OPENAI_API_DEPLOYMENT_ID='<your deployment_id>'
OPENAI_API_KEY='<your_api_key>'
```

See the [DataRobot documentation](https://docs.datarobot.com/en/docs/gen-ai/playground-tools/deploy-llm.html) for details on other providers.

In addition to the changes for the `.env` file, you can also edit the respective llm.py file to make additional changes
such as the default LLM, temperature, top_p, etc within the chosen configuration

---

## Web Configuration

The Web component is one of the more complex components and requires
additional configuration such as setting up a SQLAlchemy asyncio
compatible [database](web/README.md#database-configuration) and [OAuth
providers](web/README.md#oauth-applications) to integrate documents
from third-party document stores

---

## OAuth Applications

The template can work with files stored in Google Drive and Box.
In order to give it access to those files, you need to configure OAuth Applications.

### Google OAuth Application

- Go to [Google API Console](https://console.developers.google.com/) from your Google account
- Navigate to "APIs & Services" > "Enabled APIs & services" > "Enable APIs and services" search for Drive, and add it.
- Navigate to "APIs & Services" > "OAuth consent screen" and make sure you have your consent screen configured. You may have both "External" and "Internal" audience types.
- Navigate to "APIs & Services" > "Credentials" and click on the "Create Credentials" button. Select "OAuth client ID".
- Select "Web application" as Application type, fill in "Name" & "Authorized redirect URIs" fields. For example, for local development, the redirect URL will be:
  - `http://localhost:5173/oauth/callback` - local vite dev server (used by frontend folks)
  - `http://localhost:8080/oauth/callback` - web-proxied frontend
  - `http://localhost:8080/api/v1/oauth/callback/` - the local web API (optional).
  - For production, you'll want to add your DataRobot callback URL. For example, in US Prod it is `https://app.datarobot.com/custom_applications/{appId}/oauth/callback`. For any installation of DataRobot it is `https://<datarobot-endpoint>/custom_applications/{appId}/oauth/callback`.
- Hit the "Create" button when you are done.
- Copy the "Client ID" and "Client Secret" values from the created OAuth client ID and set them in the template env variables as `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` correspondingly.
- Make sure you have the "Google Drive API" enabled in the "APIs & Services" > "Library" section. Otherwise, you will get 403 errors.
- Finally, go to "APIs & Services" > "OAuth consent screen" > "Data Access" and make sure you have the following scopes selected:
  - `openid`
  - `https://www.googleapis.com/auth/userinfo.email`
  - `https://www.googleapis.com/auth/userinfo.profile`
  - `https://www.googleapis.com/auth/drive.readonly`

### Box OAuth Application

- Head to [Box Developer Console](https://app.box.com/developers/console) from your Box account
- Create a new platform application, then select "Custom App" type
- Fill in "Application Name" and select "Purpose" (e.g. "Integration"). Then, fill in three more info fields. The actual selection doesn't matter.
- Select "User Authentication (OAuth 2.0)" as Authentication Method and click on the "Create App" button
- In the "OAuth 2.0 Redirect URIs" section, please fill in callback URLs you want to use.
  - `http://localhost:5173/oauth/callback` - local vite dev server (used by frontend folks)
  - `http://localhost:8080/oauth/callback` - web-proxied frontend
  - `http://localhost:8080/api/v1/oauth/callback/` - the local web API (optional).
  - For production, you'll want to add your DataRobot callback URL. For example, in US Prod it is `https://app.datarobot.com/custom_applications/{appId}/oauth/callback`.
- Hit "Save Changes" after that.
- Under the "Application Scopes", please make sure you have both `Read all files and folders stored in Box` and "Write all files and folders store in Box" checkboxes selected. We need both because we need to "write" to the log that we've downloaded the selected files.
- Finally, under the "OAuth 2.0 Credentials" section, you should be able to find your Client ID and Client Secret pair to setup in the template env variables as `BOX_CLIENT_ID` and `BOX_CLIENT_SECRET` correspondingly.

After you've set those in your project `.env` file, on the next Pulumi Up, we'll create OAuth
providers in your DataRobot installation. To view and manage those and verify they are working
navigate to `<your_datarobot_url>/account/oauth-providers` or in US production: https://app.datarobot.com/account/oauth-providers.

Additionally, the Pulumi output variables get used to populate those providers for your Codespace and
local development environment as well.

---

## Subproject Documentation

- [Agent Retrieval Agent](agent_retrieval_agent/README.md)
- [Core](core/README.md)
- [Frontend Web](frontend_web/README.md)
- [Web (FastAPI)](web/README.md)

---

## Advanced Usage

- Customize environment variables in `.env`
- Extend agents or add new tools in `agent_retrieval_agent/`
- Add or modify frontend components in `frontend_web/`
- Update infrastructure in `infra/`

---

## Additional Resources

- [Taskfile.dev Documentation](https://taskfile.dev/#/)
- [Pulumi Documentation](https://www.pulumi.com/docs/)
- [Vite Documentation](https://vitejs.dev/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)

---

For more details, see the README in each subproject.
