# OASIS HyperDrive Client — Design Specification

**Version:** 1.0  
**Date:** 2026-07-17  
**Status:** Draft

---

## Table of Contents

1. [Overview](#1-overview)
2. [Goals & Non-Goals](#2-goals--non-goals)
3. [Technology Stack](#3-technology-stack)
4. [Architecture](#4-architecture)
5. [System Tray Icon & States](#5-system-tray-icon--states)
6. [File Browser Window](#6-file-browser-window)
7. [Content Types & Display](#7-content-types--display)
8. [Provider Filter](#8-provider-filter)
9. [File & Holon Operations](#9-file--holon-operations)
10. [Send to Avatar Feature](#10-send-to-avatar-feature)
11. [Metadata Viewer](#11-metadata-viewer)
12. [Context Menu](#12-context-menu)
13. [Settings & Configuration](#13-settings--configuration)
14. [HyperDrive Status Dashboard](#14-hyperdrive-status-dashboard)
15. [Notifications](#15-notifications)
16. [Authentication & Session Management](#16-authentication--session-management)
17. [API Integration](#17-api-integration)
18. [Cross-Platform Considerations](#18-cross-platform-considerations)
19. [Project Structure](#19-project-structure)
20. [Data Models](#20-data-models)
21. [Error Handling & Resilience](#21-error-handling--resilience)
22. [Security](#22-security)
23. [Build & Distribution](#23-build--distribution)
24. [Roadmap & Phasing](#24-roadmap--phasing)

---

## 1. Overview

The **OASIS HyperDrive Client** is a cross-platform desktop system-tray application that gives users a native file-explorer experience over the OASIS HyperDrive — the decentralised, multi-provider storage layer built into the OASIS Architecture.

Like OneDrive, Google Drive, or Dropbox, the client sits quietly in the system tray and lights up when something needs attention. Double-clicking it opens a purpose-built file browser that surfaces the user's **holons, files, NFTs, GeoNFTs**, and other OASIS digital assets stored across all enabled providers. Because OASIS HyperDrive provides **auto-failover, auto-load-balancing, and auto-replication** between providers, the client abstracts all that complexity away — users see a single unified view of their data, with the option to inspect per-provider details when they want to.

The client communicates exclusively with the **WEB4 OASIS API** (`NextGenSoftware.OASIS.API.ONODE.WebAPI`) — specifically the **Data API** (`api/data/*`) and the **HyperDrive API** (`api/hyperDrive/*`).

---

## 2. Goals & Non-Goals

### Goals

- Cross-platform system-tray app (Windows, macOS, Linux)
- Neon-glowing "O" tray icon with clear colour-coded states
- File browser showing holons, files, NFTs, GeoNFTs
- Provider filter (All / per-provider)
- Full CRUD on holons and files: create, rename, edit metadata, delete (soft and hard), download
- Send holon/file to another avatar
- View rich metadata for any item
- Real-time HyperDrive health status (active providers, failover events, replication state)
- Notifications for important events (failover triggered, quota warning, error)
- Secure local session (JWT stored in OS credential store)
- Auto-start on login (opt-in)

### Non-Goals

- Replacing the full ONODE Manager dashboard (that is a separate app)
- Offline/sync mode (reads and writes go live to the API; local caching is a future phase)
- Local file system sync (like OneDrive folder sync) — Phase 2
- Mobile client

---

## 3. Technology Stack

### Primary Recommendation: Avalonia UI (same as ONODE Manager)

**Avalonia UI** is the recommended framework, consistent with the ONODE Manager decision from the previous session. The key reasons remain the same and are even stronger here:

| Criterion | Avalonia | Electron | MAUI |
|---|---|---|---|
| **Cross-platform** | Windows / macOS / Linux native | Windows / macOS / Linux | Windows / macOS only (no Linux) |
| **Language** | C# / .NET | JS/TS | C# / .NET |
| **System tray** | `Avalonia.Controls.TrayIcon` (built-in) | `Tray` module (built-in) | Limited / workarounds |
| **Native look & feel** | Avalonia Fluent theme + custom | Chromium shell | Platform-native controls |
| **Binary size** | ~30–50 MB self-contained | ~120–200 MB | ~50–80 MB |
| **Custom neon effects** | `AvaloniaGlowEffect` / `Skia` shaders | CSS | Limited |
| **Consistency with ONODE Manager** | Same codebase patterns, shared libs | None | None |
| **Maturity** | Stable 11.x | Very mature | Newer, gaps |

**Verdict: Avalonia 11.x** — same recommendation as ONODE Manager. Shared `OasisApiClient` and model libraries reduce duplication between the two apps.

### Full Stack

| Layer | Technology |
|---|---|
| UI Framework | Avalonia UI 11.x |
| Language | C# 12, .NET 8 |
| MVVM | ReactiveUI (built into Avalonia ecosystem) |
| HTTP Client | `HttpClient` + `System.Text.Json` |
| Auth token storage | `Microsoft.Windows.CredentialManager` (Win) / `libsecret` (Linux) / `Keychain` (macOS) via `CredentialStore.Net` |
| Tray icon | `Avalonia.Controls.TrayIcon` |
| Icon rendering | SkiaSharp (neon glow shader on the O) |
| Notifications | `Avalonia.Controls.Notifications` + OS toasts |
| Logging | Serilog → file |
| Config | `Microsoft.Extensions.Configuration` + `appsettings.json` |
| DI Container | `Microsoft.Extensions.DependencyInjection` |
| Packaging | `dotnet publish` → self-contained; `Velopack` for installers |

---

## 4. Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    OASIS HyperDrive Client                      │
│                                                                 │
│  ┌─────────────┐   ┌──────────────────┐   ┌─────────────────┐  │
│  │  Tray Icon  │   │  File Browser    │   │  Settings /     │  │
│  │  (always    │   │  Window          │   │  Dashboard      │  │
│  │   running)  │   │  (on dbl-click)  │   │  Window         │  │
│  └──────┬──────┘   └────────┬─────────┘   └────────┬────────┘  │
│         │                   │                       │           │
│  ┌──────▼───────────────────▼───────────────────────▼────────┐  │
│  │                    ViewModels (ReactiveUI)                 │  │
│  │  TrayIconViewModel  FileBrowserViewModel  SettingsViewModel│  │
│  └──────────────────────────┬────────────────────────────────┘  │
│                             │                                   │
│  ┌──────────────────────────▼────────────────────────────────┐  │
│  │                     Services Layer                        │  │
│  │  HyperDriveService  DataService  AvatarService            │  │
│  │  AuthService        NotificationService                   │  │
│  └──────────────────────────┬────────────────────────────────┘  │
│                             │                                   │
│  ┌──────────────────────────▼────────────────────────────────┐  │
│  │               OasisApiClient (shared lib)                 │  │
│  │  Wraps HttpClient, handles JWT injection, OASISResult<T>  │  │
│  └──────────────────────────┬────────────────────────────────┘  │
└─────────────────────────────┼───────────────────────────────────┘
                              │ HTTPS
                              ▼
             ┌────────────────────────────────┐
             │   WEB4 OASIS API               │
             │   api/data/*                   │
             │   api/hyperDrive/*             │
             │   api/avatar/*                 │
             └────────────────────────────────┘
```

### Key Design Decisions

- **Single-process**: tray icon and all windows run in one process. The tray icon boots first; the browser window is created lazily on first open.
- **Background polling**: a lightweight `HyperDriveMonitorService` polls `GET api/hyperDrive/dashboard` every 30 seconds to update tray icon state.
- **Shared library**: `OasisHyperDriveClient.Core` (models, API client, services) is a separate project referenced by both this client and potentially the ONODE Manager, avoiding duplication.
- **Reactive state**: `TrayIconState` is an `IObservable<TrayState>` that all icon and notification components subscribe to.

---

## 5. System Tray Icon & States

### The "O" Icon

The tray icon is a stylised capital **O** letter rendered with a neon glow effect using SkiaSharp. At 16×16 and 32×32 (for HiDPI) it reads as a clean circle-like symbol; at tooltip hover size it is clearly the OASIS "O".

The glow colour and inner fill communicate system health at a glance.

### Colour States

| State | Colour | Glow | Meaning |
|---|---|---|---|
| `Disabled` | **Grey** `#808080` | None / faint | Client not connected / ONODE unreachable |
| `Connecting` | **Blue** `#4488FF` | Pulsing | Authenticating or initial connection |
| `Healthy` | **Cyan** `#00FFEE` | Steady glow | All providers healthy, HyperDrive running |
| `Degraded` | **Yellow** `#FFD700` | Slow pulse | Warning — at least one provider degraded, quota approaching, or non-critical alert |
| `Error` | **Red** `#FF3333` | Fast pulse | Error — failover triggered, provider down, quota exceeded |
| `Syncing` | **Purple** `#CC44FF` | Animated sweep | Active replication in progress |
| `Busy` | **Orange** `#FF8800` | Steady | Upload/download in progress |

The pulse animation is a sinusoidal opacity oscillation on the outer glow ring; it does not flicker the icon itself. State changes animate smoothly with a 300 ms cross-fade.

### Tooltip

Hovering over the tray icon shows a tooltip with:

```
OASIS HyperDrive
● 5 providers active  ▲ 0 warnings  ✕ 0 errors
Last sync: 14 seconds ago
```

### Tray Right-Click Menu

```
OASIS HyperDrive Client
─────────────────────────────
▶ Open HyperDrive Browser
─────────────────────────────
  Status: Healthy (5/5 providers)
─────────────────────────────
  Pause Sync
  View Dashboard
  Settings
─────────────────────────────
  Sign Out
  Quit
```

---

## 6. File Browser Window

### Layout

```
┌──────────────────────────────────────────────────────────────────────────┐
│  ⊙  OASIS HyperDrive                                    [—] [□] [✕]      │
├──────────────────────────────────────────────────────────────────────────┤
│  [← Back] [→ Forward]  [↑ Up]   📁 My HyperDrive / Files               │
│  ┌───────────────┐  Filter: [All Providers ▼]  [🔍 Search...]  [☰] [⊞]  │
│  │ 📁 All Files  │  ┌──────────────────────────────────────────────────┐ │
│  │ 🔷 Holons     │  │ Name ↕     │ Type    │ Provider  │ Size │ Modified│ │
│  │ 🖼 NFTs        │  ├────────────┼─────────┼───────────┼──────┼────────┤ │
│  │ 🌍 GeoNFTs    │  │ 📄 report… │ File    │ Holochain │ 2 MB │ 2h ago  │ │
│  │ 🔑 Keys       │  │ 🔷 profile  │ Holon   │ IPFS      │  —   │ 5d ago  │ │
│  │ 💠 Avatar     │  │ 🖼 CryptoArt│ NFT     │ Ethereum  │  —   │ 1w ago  │ │
│  │               │  │ 🌍 Hyde Park│ GeoNFT  │ Solana    │  —   │ 3d ago  │ │
│  │               │  │ 📄 photo.jpg│ File    │ IPFS      │ 4 MB │ 1h ago  │ │
│  │               │  └──────────────────────────────────────────────────┘ │
│  └───────────────┘                                                        │
│  Status: 47 items  |  3.2 GB used  |  ● Holochain  ● IPFS  ● Ethereum   │
└──────────────────────────────────────────────────────────────────────────┘
```

### Navigation

- **Breadcrumb bar**: shows current path (e.g. `My HyperDrive / Files / Projects`). Each segment is clickable.
- **Back / Forward / Up**: standard navigation history stack.
- **Left sidebar**: content-type navigation — switches the main list filter without changing location.
- **Double-click folder**: navigates into it (holons with children act as folders).
- **Double-click file**: opens preview or downloads, depending on MIME type.

### View Modes

- **List view** (default): multi-column grid with Name, Type, Provider, Size, Modified
- **Grid / icon view**: large thumbnail tiles (for NFTs/GeoNFTs especially)
- **Details view**: expands each row to show a sub-row of key metadata

Toggle via toolbar buttons `[☰] [⊞]`.

### Sorting & Filtering

All columns are sortable. The search box does a real-time filter on loaded items and issues a server-side search for deeper results after a 400 ms debounce.

---

## 7. Content Types & Display

| Type | Icon | API Source | Notes |
|---|---|---|---|
| **File** | 📄 (type-specific) | `api/data/load-file` | Blob stored in holon |
| **Holon** | 🔷 | `api/data/load-holon` | Generic OASIS data object |
| **NFT** | 🖼 | `api/nft/*` | Shows token ID, chain |
| **GeoNFT** | 🌍 | `api/oland/*` | Map pin thumbnail |
| **Avatar** | 💠 | `api/avatar/*` | Current user's avatar data |
| **Keys** | 🔑 | `api/keys/*` | Public key listings |

The sidebar filter switches which `HolonType` is passed to `api/data/load-all-holons`. The "All Files" view loads everything and merges results.

---

## 8. Provider Filter

A **Provider Filter** dropdown sits in the toolbar. It controls which storage provider results are fetched from / displayed.

```
[All Providers ▼]
  ✓ All Providers
  ─────────────
    Holochain
    IPFS
    Ethereum
    Solana
    Polkadot
    Telos
    ThreeFold
    ...
```

When a specific provider is selected:
- Requests pass `Provider = "<ProviderType>"` to the Data API endpoints.
- The status bar highlights which provider is active.
- Items that exist **only** on other providers are greyed out and show a "Not on this provider" badge.

The provider list is populated dynamically from `GET api/hyperDrive/config` → `EnabledProviders`.

---

## 9. File & Holon Operations

### Toolbar Operations

| Action | Icon | Endpoint |
|---|---|---|
| Upload file | ⬆ | `POST api/data/save-file` |
| New Holon | + | `POST api/data/save-holon` |
| Download | ⬇ | `POST api/data/load-file` |
| Rename | ✏ | `PUT api/data/save-holon` (update name field) |
| Delete | 🗑 | `DELETE api/data/delete-holon` |
| Send to Avatar | ➤ | `POST api/share/*` or holon transfer |
| View Metadata | ℹ | Local display of loaded holon data |
| Copy Link | 🔗 | Generates shareable OASIS deep link |

### Delete Dialog

Deleting prompts the user with a choice:

```
Delete "report.pdf"?

  ○ Soft delete (can be recovered later)
  ● Permanent delete (cannot be undone)

  [ Cancel ]  [ Delete ]
```

Maps to `SoftDelete: true/false` on `api/data/delete-holon`.

### Rename

Inline rename via F2 or double-click on the name (not double-click on the row, which navigates). The new name is sent via `save-holon` with the updated `Name` field in the `Holon` body.

### Upload

Drag-and-drop onto the browser window, or click the Upload toolbar button. For each file:
1. Read file bytes.
2. Call `POST api/data/save-file` with `Data` (base64), `FileName`, `FileExtension`, `MimeType`, `Provider` (from current filter, or user's default), and the current avatar's `AvatarId`.
3. Refresh the list on success.

Progress indicator in the status bar and a Busy tray state while uploading.

---

## 10. Send to Avatar Feature

Users can send any holon or file to another avatar's HyperDrive.

### Flow

1. Right-click item → **"Send to Avatar..."**
2. A dialog opens:

```
┌────────────────────────────────────────┐
│  Send to Avatar                        │
│                                        │
│  To: [Search avatars...    🔍]         │
│                                        │
│  ┌─────────────────────────────────┐   │
│  │ @alice.oasis    [Select]        │   │
│  │ @bob.nextsoftware [Select]      │   │
│  └─────────────────────────────────┘   │
│                                        │
│  Message (optional):                   │
│  [                                    ]│
│                                        │
│  [ Cancel ]            [ Send ]        │
└────────────────────────────────────────┘
```

3. Avatar search uses `GET api/avatar/search?searchQuery=...`
4. On send: the holon's `ParentAvatarId` (or a share record) is updated via `api/share/*` or a `save-holon` mutation.
5. Recipient gets an OS notification if they have the client running; otherwise notified next login.

---

## 11. Metadata Viewer

Right-click any item → **"View Metadata"** (or press `Alt+Enter`). A side panel slides in on the right, or a modal opens, showing the full holon structure:

```
┌───────────────────────────────────────────────────┐
│ ℹ Metadata — report.pdf                           │
├───────────────────────────────────────────────────┤
│ ID:               3fa85f64-5717-4562-b3fc-...     │
│ Name:             report.pdf                      │
│ Type:             File                            │
│ MIME:             application/pdf                 │
│ Size:             2.1 MB                          │
│ Created:          2026-05-12 09:34 UTC            │
│ Modified:         2026-07-01 14:22 UTC            │
│ Created By:       avatar@nextgensoftware.co.uk    │
│                                                   │
│ Provider Keys:                                    │
│   Holochain:      hh_entry_abc123...              │
│   IPFS:           bafybeig...                     │
│                                                   │
│ Version:          3 (view history)                │
│                                                   │
│ Provider Metadata:                                │
│   [Holochain ▼]                                   │
│     ZomeName: files                               │
│     EntryHash: abc123...                          │
│                                                   │
│ Replication Status:                               │
│   ✓ Holochain    ✓ IPFS    ✗ Ethereum            │
│                                                   │
│ Parent Holon:     (none — root item)              │
│                                                   │
│              [ Edit Metadata ]  [ Close ]         │
└───────────────────────────────────────────────────┘
```

**Replication Status** is derived from `ProviderUniqueStorageKey` — if a provider key exists, it's replicated there.

**Version history** opens a history pane listing previous versions (via `PreviousVersionId` chain), with option to restore.

---

## 12. Context Menu

Right-clicking any item in the file browser shows:

```
Open
Open With...
──────────────
Download
Send to Avatar...
Copy Link
──────────────
Rename        [F2]
Duplicate
──────────────
View Metadata  [Alt+Enter]
View on Provider ▶
  Holochain (view on explorer)
  IPFS (view on gateway)
──────────────
Delete...      [Del]
```

Right-clicking an empty area:

```
Upload File...
New Folder (Holon)
──────────────
Refresh        [F5]
View ▶
  List View
  Grid View
Sort By ▶
──────────────
Paste          [Ctrl+V]
```

---

## 13. Settings & Configuration

Accessed via tray right-click → **Settings**, or from the browser toolbar.

### General

- **ONODE API URL**: base URL for the WEB4 API (e.g. `https://api.oasis.ac`)
- **Auto-start on login**: checkbox (creates OS autostart entry)
- **Theme**: Light / Dark / System
- **Default Provider**: which provider to prefer when uploading (populated from enabled providers)
- **Language**: locale selector

### HyperDrive

- **Auto-Failover**: toggle (calls `POST api/hyperDrive/failover/rules`)
- **Auto-Replication**: toggle
- **Auto-Load Balancing**: toggle
- **Intelligent Mode**: toggle (`POST api/hyperDrive/intelligent-mode/enable|disable`)
- **HyperDrive Mode**: Legacy or OASISHyperDrive2 (radio, calls `PUT api/hyperDrive/mode`)
- **Dashboard refresh interval**: slider 10s–300s

### Notifications

- Failover triggered: on/off
- Provider down: on/off
- Quota warning at: % threshold input
- Replication complete: on/off
- File sent to you: on/off

### Account

- Signed in as: `avatar username`
- **Sign Out** button
- **Change Password** (opens browser to OASIS portal)

---

## 14. HyperDrive Status Dashboard

Accessible from tray menu → **View Dashboard**. A secondary window (or tab within Settings) showing live HyperDrive metrics from `GET api/hyperDrive/dashboard`.

### Dashboard Layout

```
┌──────────────────────────────────────────────────────┐
│  OASIS HyperDrive — Live Dashboard                   │
├──────────────────────────────────────────────────────┤
│  System Health: ████████░░ 84%        5 providers    │
│                                                      │
│  ┌────────────┐ ┌────────────┐ ┌───────────────────┐ │
│  │ Requests   │ │ Avg Latency│ │ Total Cost (month)│ │
│  │  4,821     │ │  142 ms    │ │  $0.003           │ │
│  └────────────┘ └────────────┘ └───────────────────┘ │
│                                                      │
│  Provider Health                                     │
│  ● Holochain   99.9% uptime  ▲ 120ms                │
│  ● IPFS        98.1% uptime  ▲ 210ms                │
│  ● Ethereum    95.3% uptime  ▲ 580ms  ⚠ High cost   │
│  ● Solana      99.7% uptime  ▲  88ms                │
│  ● Polkadot    91.2% uptime  ▲ 320ms  ⚠ Degraded    │
│                                                      │
│  Active Alerts:                                      │
│  ⚠ Polkadot error rate 4.2% (threshold: 3%)         │
│                                                      │
│  AI Recommendations:                                 │
│  💡 Route 30% of NFT reads to Solana (saves ~$0.001) │
│                                                      │
│  [ Refresh ]                    [ Open Full Report ] │
└──────────────────────────────────────────────────────┘
```

Data sources:
- `GET api/hyperDrive/dashboard` — headline metrics and alerts
- `GET api/hyperDrive/metrics` — per-provider performance
- `GET api/hyperDrive/ai/recommendations` — AI suggestions

---

## 15. Notifications

The client uses OS-native toast notifications (via `Avalonia.Controls.Notifications` + platform bridges).

### Notification Events

| Trigger | Severity | Example |
|---|---|---|
| Provider goes offline | Error | "Ethereum provider offline. HyperDrive has failed over to Solana." |
| Failover triggered | Warning | "Auto-failover: Polkadot → IPFS due to high error rate." |
| Replication complete | Info | "Your file 'report.pdf' has been replicated to 3 providers." |
| Quota at threshold | Warning | "IPFS quota at 80%. Consider upgrading or cleaning up." |
| File received from avatar | Info | "@alice sent you a holon: 'project-brief'" |
| Upload complete | Info | "'photo.jpg' uploaded to OASIS HyperDrive." |
| Error on operation | Error | "Failed to delete 'old-notes'. See details." |

Notifications link back to the relevant item in the file browser when clicked.

---

## 16. Authentication & Session Management

### Login Flow

1. On first launch, a **Login Window** appears (Avalonia dialog, not a browser window).
2. User enters their OASIS avatar credentials (username/email + password).
3. Client calls `POST api/avatar/authenticate` → receives JWT.
4. JWT and refresh token stored in the OS credential store (Windows Credential Manager / macOS Keychain / Linux libsecret via `CredentialStore.Net`).
5. On subsequent launches, client reads stored token and validates via `GET api/avatar/get-logged-in-avatar`.
6. If token expired: silently attempt refresh; if that fails, prompt re-login.

### Session

- JWT is attached as `Authorization: Bearer <token>` on all API calls via `OasisApiClient`.
- `AvatarId` is stored in memory for the session and passed to data endpoints where required.
- Sign-out clears the credential store entry.

---

## 17. API Integration

### Base Client

```csharp
public class OasisApiClient
{
    private readonly HttpClient _http;
    private string _jwtToken;

    public async Task<OASISResult<T>> GetAsync<T>(string path) { ... }
    public async Task<OASISResult<T>> PostAsync<T>(string path, object body) { ... }
    public async Task<OASISResult<T>> DeleteAsync<T>(string path) { ... }
}

public record OASISResult<T>
{
    public bool IsError { get; init; }
    public bool IsWarning { get; init; }
    public string Message { get; init; }
    public string? ErrorCode { get; init; }
    public T? Result { get; init; }
}
```

### Data Service

```csharp
public class DataService
{
    Task<IEnumerable<Holon>> LoadAllHolonsAsync(string holonType, string? provider = null);
    Task<Holon> LoadHolonAsync(Guid holonId, string? provider = null);
    Task<byte[]> LoadFileAsync(Guid fileId, string? provider = null);
    Task<Guid> SaveFileAsync(byte[] data, string fileName, string ext, string mime, string? provider = null);
    Task<Holon> SaveHolonAsync(Holon holon, string? provider = null);
    Task DeleteHolonAsync(Guid holonId, bool softDelete);
}
```

### HyperDrive Monitor Service

```csharp
public class HyperDriveMonitorService : IHostedService
{
    // Polls api/hyperDrive/dashboard every N seconds
    // Publishes TrayState changes to IObservable<TrayState>
    // Fires notification events
}
```

### Key Endpoint Mapping

| UI Action | HTTP | Endpoint |
|---|---|---|
| Load file list | POST | `api/data/load-all-holons` |
| Load specific holon | POST | `api/data/load-holon` |
| Load file bytes | POST | `api/data/load-file` |
| Upload file | POST | `api/data/save-file` |
| Save / rename holon | POST | `api/data/save-holon` |
| Delete item | DELETE | `api/data/delete-holon` |
| Get provider health | GET | `api/hyperDrive/dashboard` |
| Get provider list | GET | `api/hyperDrive/config` |
| Get metrics | GET | `api/hyperDrive/metrics` |
| Get AI recommendations | GET | `api/hyperDrive/ai/recommendations` |
| Toggle intelligent mode | POST | `api/hyperDrive/intelligent-mode/enable|disable` |

---

## 18. Cross-Platform Considerations

### System Tray

- **Windows**: `Avalonia.Controls.TrayIcon` renders in the taskbar notification area. Shell integration via `Shell32` for context menus if needed.
- **macOS**: `Avalonia.Controls.TrayIcon` renders in the macOS menu bar. The "O" icon respects dark/light menu bar automatically.
- **Linux (X11/Wayland)**: `Avalonia.Controls.TrayIcon` uses `StatusNotifierItem` (SNI) for KDE/GNOME. Wayland support is provided by XWayland or the SNI protocol via `libappindicator3` bridge on Ubuntu/Pop_OS.

### Credential Storage

Use `CredentialStore.Net` which abstracts:
- Windows Credential Manager
- macOS Keychain Services
- Linux Secret Service (GNOME Keyring / KWallet)

### File Open / Save Dialogs

Use `Avalonia.Platform.Storage` (`IStorageProvider`) for native file pickers on all platforms.

### Auto-start on Login

| Platform | Mechanism |
|---|---|
| Windows | Registry `HKCU\Software\Microsoft\Windows\CurrentVersion\Run` |
| macOS | LaunchAgent plist in `~/Library/LaunchAgents/` |
| Linux | `.desktop` file in `~/.config/autostart/` |

Managed via a platform-abstracted `IAutoStartService`.

### Icon Sizes

Provide icons at: 16×16, 32×32 (for HiDPI / Retina), 22×22 (Linux SNI standard).

---

## 19. Project Structure

```
OasisHyperDriveClient/
├── OasisHyperDriveClient.Core/          # Shared library
│   ├── Models/
│   │   ├── Holon.cs
│   │   ├── HyperDriveDashboard.cs
│   │   ├── ProviderMetrics.cs
│   │   └── TrayState.cs
│   ├── Api/
│   │   ├── OasisApiClient.cs
│   │   ├── DataService.cs
│   │   ├── HyperDriveService.cs
│   │   └── AvatarService.cs
│   ├── Auth/
│   │   ├── AuthService.cs
│   │   └── CredentialStore.cs
│   └── Services/
│       ├── HyperDriveMonitorService.cs
│       ├── NotificationService.cs
│       └── AutoStartService.cs
│
├── OasisHyperDriveClient/               # Avalonia UI project
│   ├── App.axaml
│   ├── App.axaml.cs
│   ├── Program.cs
│   ├── Assets/
│   │   ├── Icons/
│   │   │   ├── tray-healthy.png
│   │   │   ├── tray-warning.png
│   │   │   ├── tray-error.png
│   │   │   └── tray-disabled.png
│   │   └── Fonts/
│   ├── ViewModels/
│   │   ├── TrayIconViewModel.cs
│   │   ├── FileBrowserViewModel.cs
│   │   ├── LoginViewModel.cs
│   │   ├── MetadataViewModel.cs
│   │   ├── SendToAvatarViewModel.cs
│   │   ├── SettingsViewModel.cs
│   │   └── DashboardViewModel.cs
│   ├── Views/
│   │   ├── FileBrowserWindow.axaml
│   │   ├── FileBrowserWindow.axaml.cs
│   │   ├── LoginWindow.axaml
│   │   ├── MetadataPanel.axaml
│   │   ├── SendToAvatarDialog.axaml
│   │   ├── SettingsWindow.axaml
│   │   └── DashboardWindow.axaml
│   ├── Controls/
│   │   ├── NeonOIcon.axaml        # Custom SkiaSharp neon-O control
│   │   ├── FileListItem.axaml
│   │   ├── ProviderBadge.axaml
│   │   └── ProviderStatusBar.axaml
│   └── Converters/
│       ├── HolonTypeToIconConverter.cs
│       ├── TrayStateToColorConverter.cs
│       └── BytesToSizeStringConverter.cs
│
├── OasisHyperDriveClient.Tests/
│   ├── DataServiceTests.cs
│   ├── HyperDriveMonitorTests.cs
│   └── TrayStateTests.cs
│
└── build/
    ├── build-win.ps1
    ├── build-mac.sh
    └── build-linux.sh
```

---

## 20. Data Models

### TrayState

```csharp
public enum TrayState
{
    Disabled,
    Connecting,
    Healthy,
    Degraded,
    Error,
    Syncing,
    Busy
}
```

### HolonViewModel (display model)

```csharp
public class HolonViewModel
{
    public Guid Id { get; init; }
    public string Name { get; init; }
    public string HolonType { get; init; }          // "File", "Holon", "NFT", "GeoNFT" etc
    public string? Provider { get; init; }           // which provider this instance came from
    public long? SizeBytes { get; init; }
    public DateTime? Modified { get; init; }
    public DateTime? Created { get; init; }
    public Dictionary<string, string> ProviderKeys { get; init; }  // ProviderUniqueStorageKey
    public Dictionary<string, Dictionary<string, string>> ProviderMeta { get; init; }
    public bool HasChildren { get; init; }
    public string DisplayIcon { get; init; }        // emoji or asset key
    public IReadOnlyList<string> ReplicatedProviders { get; init; }
}
```

### ProviderStatusViewModel

```csharp
public class ProviderStatusViewModel
{
    public string ProviderType { get; init; }
    public double UptimePercentage { get; init; }
    public double AverageLatencyMs { get; init; }
    public double ErrorRate { get; init; }
    public bool IsHealthy => ErrorRate < 0.03 && UptimePercentage > 95;
    public string StatusColour => IsHealthy ? "#00FFEE" : ErrorRate > 0.1 ? "#FF3333" : "#FFD700";
}
```

---

## 21. Error Handling & Resilience

### API Errors

Every API call returns `OASISResult<T>`. The client checks `isError` before processing. On error:
- Log via Serilog to `%APPDATA%/OasisHyperDriveClient/logs/`
- Show inline error badge on the affected item in the file browser
- If it is a connectivity error, transition tray to `Disabled` state and start a reconnection backoff timer (5s, 15s, 30s, 60s)

### Transient Failures

HTTP calls use `Polly` retry policies:
- 3 retries with exponential backoff (1s, 2s, 4s) for `5xx` and `HttpRequestException`
- Circuit breaker opens after 5 failures in 30 seconds
- When circuit is open, the tray transitions to `Error` and shows a notification

### HyperDrive Auto-Failover

The OASIS HyperDrive handles provider-level failover automatically server-side. The client surfaces this to the user by:
- Catching `isWarning: true` on responses and showing the `Degraded` state
- Reading `Alerts` from the dashboard poll and showing OS notifications

The client never needs to implement its own failover — that is OASIS core architecture.

---

## 22. Security

- **JWT never written to plain text files** — stored only in OS credential store
- **API base URL validated** on save in settings (must be HTTPS in production, HTTP allowed for localhost dev)
- **No telemetry** without explicit opt-in
- **File content streamed**, not held in memory longer than needed for upload/download
- **Avatar search results** are sanitised before display to prevent injection via holon names
- **Soft delete default** — permanent delete requires a second confirmation dialog
- **Certificate pinning**: optional setting to pin the ONODE's TLS certificate (for enterprise deployments)

---

## 23. Build & Distribution

### Build Targets

```
dotnet publish -c Release -r win-x64  --self-contained -o ./dist/win
dotnet publish -c Release -r osx-arm64 --self-contained -o ./dist/mac
dotnet publish -c Release -r linux-x64 --self-contained -o ./dist/linux
```

### Installers (Velopack)

**Velopack** (the Squirrel successor) provides:
- Windows: `.exe` NSIS installer + auto-update
- macOS: `.dmg` with drag-to-Applications + Sparkle updates
- Linux: `.AppImage` (universal), `.deb` (Debian/Ubuntu), `.rpm` (Fedora/RHEL)

### Auto-Update

On startup, client checks a configured update URL for a `releases.json` manifest (Velopack format). If a newer version exists, it downloads and installs in background, prompting restart.

---

## 24. Roadmap & Phasing

### Phase 1 — MVP (core tray + browser)

- [ ] Avalonia project scaffold with system tray
- [ ] Neon-O icon with colour states (grey, yellow, red, cyan)
- [ ] Login window and JWT auth
- [ ] File browser with list view
- [ ] Load holons (All / by type) via `api/data/load-all-holons`
- [ ] Provider filter dropdown
- [ ] Basic operations: download file, delete (soft), rename
- [ ] Metadata viewer panel
- [ ] 30-second dashboard poll → tray state updates
- [ ] Windows + macOS + Linux builds

### Phase 2 — Full Operations

- [ ] Upload files (drag & drop + toolbar)
- [ ] Send to Avatar dialog + avatar search
- [ ] Grid/icon view mode for NFTs/GeoNFTs
- [ ] Version history viewer
- [ ] OS toast notifications for events
- [ ] HyperDrive status dashboard window
- [ ] AI recommendations display
- [ ] Context menu "View on Provider" links

### Phase 3 — Advanced

- [ ] Local caching layer with background sync
- [ ] Offline read access to cached holons
- [ ] Folder-level replication control
- [ ] Batch operations (multi-select)
- [ ] Sharing links (public/private)
- [ ] Quota usage breakdown per provider
- [ ] Cost optimisation recommendations in-app
- [ ] Certificate pinning for enterprise

---

*This document is the authoritative design specification for the OASIS HyperDrive Client. Implementation should begin with Phase 1 in a new solution at `C:\Source\OasisHyperDriveClient\`.*
