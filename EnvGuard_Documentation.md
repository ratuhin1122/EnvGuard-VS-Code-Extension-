# EnvGuard - Official Product Documentation

## 1. Overview
**EnvGuard** is a framework-agnostic environment file manager built specifically for Visual Studio Code. It is designed to take the pain out of managing configuration files (`.env`, `.properties`, `.yaml`) across large and complex workspaces. Whether you are building with Laravel, Node.js, Spring Boot, React, or .NET, EnvGuard ensures that your local, staging, and production environments remain perfectly in sync.

### Why EnvGuard?
Configuration drift is one of the most common causes of deployment failures. A developer might add a new `STRIPE_API_KEY` to their local `.env` file but forget to add it to `.env.example` or `.env.production`. EnvGuard solves this by visually auditing and comparing your environment files, instantly flagging any missing keys or inconsistencies.

---

## 2. Core Features

### 🔍 1. Smart Environment File Discovery
EnvGuard automatically scans your entire workspace to locate configuration files. 
- **Supported Formats:** `.env`, `.env.*` (local, production, test, etc.), `application*.properties`, and `application*.yml|yaml`.
- **Intelligent Filtering:** Automatically skips irrelevant directories such as `node_modules`, `vendor`, build outputs, and `virtualenvs` to ensure blazing-fast performance.

### 🔄 2. Unified Parsing Engine
Different frameworks use different configuration formats. EnvGuard normalizes them all into a unified `key = value` structure.
- Nested YAML structures are intelligently flattened using dot notation (e.g., `spring.datasource.url`). 
- This allows you to effortlessly compare a Spring Boot `.yml` config directly against a `.properties` or `.env` file.

### ⚖️ 3. Side-by-Side Comparison Tool
Select any two configuration files (for example, `.env.example` vs. `.env`) and instantly see the differences. 
- Highlights **Missing Keys**.
- Highlights **Extra Keys**.
- Highlights **Value Differences**.
Results are displayed beautifully in a dedicated sidebar view and an extended report panel.

### 🛡️ 4. Missing Key Detector (Auto-Audit)
EnvGuard actively audits all files of the same format against each other. If `APP_SECRET` exists in your development `.env` but is missing from `.env.production`, EnvGuard will flag it immediately, preventing potential production crashes before they happen.

### 💾 5. Exportable Reports
Need to share configuration inconsistencies with your DevOps team or fellow developers? EnvGuard allows you to export a complete audit report as `report.json` to your workspace root with a single click.

### 🖱️ 6. Click-to-Navigate
Every key displayed in the EnvGuard sidebar or report panel is fully interactive. Simply click on a missing or mismatched key, and VS Code will immediately open the file and jump to the exact line number, allowing for lightning-fast fixes.

---

## 3. Privacy & Security
EnvGuard is built with enterprise-grade security principles:
- **100% Local Processing:** Your environment files contain highly sensitive secrets, API keys, and database credentials. EnvGuard processes everything entirely on your local machine.
- **Zero Telemetry:** We track absolutely nothing.
- **No Network Calls:** The extension makes zero external HTTP requests.
- **No Accounts Required:** Install the extension and start using it instantly.

---

## 4. Getting Started

1. **Installation:** Download and install EnvGuard from the Visual Studio Code Marketplace.
2. **Access the Panel:** Click on the shield icon (EnvGuard) in the VS Code Activity Bar on the left.
3. **Scan:** Click the "Refresh" (↻) icon to discover all environment files in your active workspace.
4. **Compare:** Hover over any two files in the list, right-click, and select "Compare Files", or use the inline navigation icons.
5. **Fix:** Review the "Missing Keys" and "Comparison Results" panels. Click on any flagged item to navigate directly to the source code and apply your fixes.

---

## 5. Contact & Support
- **Publisher:** Tuhin
- **Version:** 1.0.0
- **License:** MIT
- **Feedback & Issues:** Please visit our GitHub repository to submit feature requests or report any bugs.

*EnvGuard - Making configuration management effortless, secure, and reliable.*
