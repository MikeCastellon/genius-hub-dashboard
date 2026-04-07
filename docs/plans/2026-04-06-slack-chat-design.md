# Slack-Like Chat System — Design

## Overview
Internal team chat for detailing businesses. Shop owners and technicians communicate via named channels and direct messages. Real-time messaging powered by Supabase Realtime.

## Approach
Pure Supabase — Realtime postgres_changes for messages, Presence API for typing indicators and online status. No external chat services.

## Database Schema

### channels
- id UUID PK, business_id FK, name TEXT, description TEXT
- type TEXT CHECK (channel | direct | group_dm)
- created_by UUID FK -> profiles, created_at, updated_at

### channel_members
- channel_id FK, user_id FK, role TEXT (owner | member)
- last_read_at TIMESTAMPTZ, joined_at TIMESTAMPTZ
- PK (channel_id, user_id)

### messages
- id UUID PK, channel_id FK, sender_id FK -> profiles
- content TEXT, message_type TEXT (text | image | file | system)
- parent_id UUID FK -> messages (threaded replies)
- edited_at TIMESTAMPTZ, deleted_at TIMESTAMPTZ (soft delete)
- metadata JSONB (mentions array, etc.), created_at TIMESTAMPTZ

### message_reactions
- message_id FK, user_id FK, emoji TEXT
- UNIQUE (message_id, user_id, emoji)

### message_attachments
- id UUID PK, message_id FK, file_url TEXT, file_name TEXT
- file_size INT, file_type TEXT

All scoped by business_id via channels. RLS uses get_my_business_id().

## Real-Time Architecture
- **Messages**: postgres_changes subscription filtered by channel_id
- **Typing**: Presence API on channel-scoped room, 3s debounce
- **Online status**: Global Presence room per business
- **Read receipts**: channel_members.last_read_at updated on view
- **Unread counts**: COUNT messages WHERE created_at > last_read_at
- **Mentions**: Parse @name, store in metadata.mentions[], separate badge
- **Search**: Postgres full-text search with GIN index on messages.content

## UI Design

### Full Page (/chat) — Desktop
- Left panel (280px): channel list + DM list with unread badges, search, new message button
- Right panel: channel header, scrollable messages grouped by date, typing indicator, composer with emoji/file/mentions

### Slide-out Panel
- Chat icon in sidebar with unread badge
- 400px right panel overlay, compressed channel list
- "Open Full Chat" link to /chat

### Mobile
- Single column: channel list -> tap to enter -> back button
- Floating chat bubble for slide-out

## Features
- Named channels (#general, #detailing-bay, etc.)
- Direct messages (1:1) and group DMs
- File/image sharing with inline preview
- Emoji reactions on messages
- Typing indicators
- Read receipts / unread badges
- @mentions with notifications
- Message search
- Threaded replies
- Soft delete / edit messages
