<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1UMjZtZg_T2xUb0s-RCZO24Xxf7DccWjB

## Run Locally

**Prerequisites:**  Node.js

1. Install dependencies:
   `npm install`
2. Create a `.env.local` file (copy from `.env.example`):
   ```bash
   cp .env.example .env.local
   ```
3. Set the `VITE_GEMINI_API_KEY` in `.env.local` to your Gemini API key
   - **⚠️ Never commit `.env.local` - it's automatically ignored by `.gitignore`**
4. Run the app:
   `npm run dev`
