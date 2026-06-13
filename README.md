# Expense Bot — Slack to Notion (v2: receipts included)

## What's new in v2
- Bubble tea / boba / milk tea / drinks → categorized as Food
- Receipt photos: send an image with your message in Slack, and it gets
  uploaded to Cloudinary and embedded in Notion's "Receipt" file property

## New setup step: Cloudinary (free)

1. Sign up at cloudinary.com (free tier: 25GB storage, no card needed)
2. On your dashboard, copy your **Cloud Name**
3. Go to Settings → Upload → scroll to "Upload presets" → click "Add upload preset"
   - Set **Signing Mode** to **Unsigned**
   - Save, then copy the **preset name**
4. Add to Render environment variables:
   - `CLOUDINARY_CLOUD_NAME`
   - `CLOUDINARY_UPLOAD_PRESET`

## Slack setup change

Add this Bot Token Scope (in addition to existing ones):
- `files:read`

Then reinstall the app to your workspace (Slack will prompt you).

## Usage

- Text only: `lunch 250` → logs without receipt
- Text + photo: type `lunch 250` as the message AND attach a photo in the
  same message → logs with receipt image embedded in Notion

All other setup steps are the same as v1 (see previous README).
