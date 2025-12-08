# Firebase Hosting Setup Guide

This project is ready to be hosted on Firebase. Follow these steps to deploy your application.

## Prerequisites

1.  **Google Account**: You need a Google account to use Firebase.
2.  **Node.js**: Ensure Node.js is installed on your system.

## Step 1: Install Firebase CLI

Open your terminal and run:

```bash
npm install -g firebase-tools
```

## Step 2: Login to Firebase

Log in to your Google account via the CLI:

```bash
firebase login
```

## Step 3: Initialize Firebase in Project

1.  Navigate to the project root directory:
    ```bash
    cd /path/to/hyperlocal-navi-assistant-v3
    ```

2.  Initialize Firebase Hosting:
    ```bash
    firebase init hosting
    ```

3.  **Configuration Prompts**:
    -   **Select a project**: Choose "Create a new project" or select an existing one.
    -   **What do you want to use as your public directory?**: Type `dist` (Vite builds to `dist` by default).
    -   **Configure as a single-page app (rewrite all urls to /index.html)?**: Type `Yes` (Important for React Router/Single Page Apps).
    -   **Set up automatic builds and deploys with GitHub?**: Type `No` (unless you want to set this up now).
    -   **File exists check**: If it asks to overwrite `index.html`, say `No`.

## Step 4: Environment Variables

Since this is a Vite app, you must set up your environment variables for production.

1.  In your Firebase project console, go to **Project Settings**.
2.  Create a web app if you haven't already.
3.  Copy the `firebaseConfig` values.
4.  For local development, create a `.env` file in the root:
    ```env
    VITE_FIREBASE_API_KEY=your_api_key
    VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
    VITE_FIREBASE_PROJECT_ID=your_project_id
    VITE_FIREBASE_STORAGE_BUCKET=your_bucket.appspot.com
    VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
    VITE_FIREBASE_APP_ID=your_app_id
    ```

## Step 5: Build and Deploy

1.  Build the project:
    ```bash
    npm run build
    ```

2.  Deploy to Firebase:
    ```bash
    firebase deploy
    ```

Your app will be live at the URL provided by the CLI (typically `https://<your-project-id>.web.app`).
