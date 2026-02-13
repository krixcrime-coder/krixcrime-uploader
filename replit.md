# replit.md

## Overview

This is a Python-based game bot for Free Fire (a mobile battle royale game). It connects to the game's servers using raw TCP sockets with SSL, communicates via Protocol Buffers (protobuf), and is controlled through a Telegram bot interface. The bot can log into game accounts, send/receive chat messages (whispers, clan chat, team chat), handle anti-AFK keepalive packets, invite players, and perform automated actions within the game's network protocol.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Core Design

- **Language**: Python 3 with asyncio for concurrent network connections
- **Entry Point**: `Glory.py` is the main application file; `main.py` is currently empty and may serve as an alternate entry point
- **Communication Protocol**: The bot communicates with Free Fire game servers using custom binary protocols over SSL/TLS TCP connections. Messages are serialized/deserialized using Protocol Buffers (protobuf).

### Protocol Buffer Definitions

The project contains many `_pb2.py` files, each generated from `.proto` definitions. These define the message structures for different game operations:

| File | Purpose |
|------|---------|
| `MajorLoginReq_pb2.py` | Login request message (sent to server) |
| `MajorLoginRes_pb2.py` | Login response message (received from server) |
| `GetLoginDataRes_pb2.py` | Account login data (UID, region) |
| `GenWhisperMsg_pb2.py` | Generating/sending whisper (private) messages |
| `DecodeWhisperMsg_pb2.py` | Decoding received whisper messages |
| `clan_msg_pb2.py` / `Team_msg_pb2.py` | Clan/team chat messages |
| `Clan_Startup_pb2.py` / `Team_Chat_Startup_pb2.py` | Clan/team initialization packets |
| `Anti_Afk_pb2.py` | Anti-AFK keepalive packets |
| `bot_mode_pb2.py` / `random_pb2.py` | Bot mode configuration |
| `bot_invite_pb2.py` / `wlxd_spam_pb2.py` | Player invite functionality |
| `spam_join_pb2.py` | Spam join functionality |
| `recieved_chat_pb2.py` | Received chat message parsing |

### Network Architecture

- Uses `asyncio` for async TCP socket connections with SSL
- Maintains persistent connections to game servers with global `online_writer` and `whisper_writer` stream writers
- HTTP requests via `aiohttp` for REST API calls to game services
- AES encryption (from `pycryptodome`) for packet encryption/decryption
- Custom headers emulate an Android device running the game client (Android 11, ASUS_Z01QD)

### Telegram Bot Interface

- Uses `pyTelegramBotAPI` (telebot) library for the control interface
- Bot token is hardcoded in `Glory.py` (should be moved to environment variable)
- Provides commands for controlling bot behavior via Telegram messages

### Account Management

- Game accounts are stored in JSON format (`attached_assets/accounts_1770997287855.json`)
- Each account has a `uid` and `password` (guest account format: `FFACC...-GUEST_FF`)
- Multiple accounts can be managed simultaneously

### Key Architectural Decisions

1. **Protobuf for serialization**: The game uses protobuf for all network messages. The `_pb2.py` files are auto-generated and should not be edited manually. If protocol changes are needed, edit the `.proto` source files and regenerate.

2. **Asyncio for concurrency**: Multiple socket connections and operations run concurrently using Python's asyncio event loop, allowing simultaneous account management.

3. **Telegram as control plane**: Rather than a web UI, the bot is controlled entirely through Telegram, making it accessible from mobile devices.

## External Dependencies

### Python Packages (from requirements.txt)
- `Flask` - Web framework (may be used for secondary endpoints)
- `pycryptodome` - AES encryption for game packet encryption/decryption
- `requests` / `aiohttp` - HTTP client for game API calls
- `protobuf` - Google Protocol Buffers for message serialization
- `protobuf-decoder` - For decoding/inspecting raw protobuf data
- `PyJWT` - JSON Web Token handling (likely for authentication)
- `pytelegrambotapi` - Telegram Bot API wrapper
- `pytz` - Timezone handling

### External Services
- **Telegram Bot API** - Control interface (bot token in code, should use env var)
- **Free Fire Game Servers** - Target game servers (SSL/TLS connections)
- **Free Fire REST APIs** - Game HTTP APIs for login and account operations

### Security Notes
- The Telegram bot token is hardcoded and should be moved to an environment variable
- Account credentials are stored in plaintext JSON — consider securing these
- Game server communication uses SSL and AES encryption