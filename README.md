# Lingora

Lingora là web app học tiếng Anh bằng AI cho người Việt, xây bằng Next.js App
Router, TypeScript, Tailwind CSS, shadcn/ui và Supabase.

## Tính năng hiện có

- Dashboard responsive, theo dõi tiến độ và các module học.
- Gia sư AI với gateway nhiều provider.
- Auto Detect theo API key, model hoặc Base URL.
- Google Gemini, Groq, OpenAI, OpenRouter, Anthropic và API
  OpenAI-compatible tùy chỉnh.
- Workspace cho tài liệu, từ vựng, flashcards, đọc, nói, viết, dịch, quiz.
- Route trích xuất nội dung PDF, DOCX và TXT.
- Supabase migration gồm Auth profile, Storage, pgvector, RLS và semantic search.

## Chạy local

```bash
pnpm install
Copy-Item .env.example .env.local
pnpm dev
```

Mở `http://localhost:3000`.

Không bắt buộc cấu hình Supabase để xem UI. Để gọi AI, nhập API key ở trang
`/settings` hoặc cấu hình một trong các biến môi trường AI.

## Supabase

Chạy migration:

```text
supabase/migrations/202606090001_initial_lingora.sql
```

Storage path của mỗi file phải bắt đầu bằng user id:

```text
<user-id>/<document-id>/<file-name>
```

Vector hiện dùng 1536 chiều. Nếu embedding model của bạn có dimension khác,
đổi cả cột `embedding` và tham số `query_embedding` trong migration trước khi
đưa dữ liệu production vào.

## Bảo mật API key

Key nhập trong UI chỉ lưu ở `sessionStorage` của tab và được gửi đến Next.js
Route Handler qua HTTPS. Không lưu key vào Supabase. Với production nhiều người
dùng, nên cấu hình key server-side hoặc dùng secret manager/KMS.
