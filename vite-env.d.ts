interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY: string
  readonly VITE_FIREBASE_AUTH_DOMAIN: string
  readonly VITE_FIREBASE_PROJECT_ID: string
  readonly VITE_FIREBASE_STORAGE_BUCKET: string
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string
  readonly VITE_FIREBASE_APP_ID: string
  readonly VITE_FIREBASE_MEASUREMENT_ID: string
  readonly VITE_IMGBB_API_KEY: string
  readonly VITE_GOOGLE_GENAI_API_KEY: string
  readonly VITE_DROPBOX_ACCESS_TOKEN: string
  readonly VITE_GOOGLE_DRIVE_CLIENT_ID: string
  readonly VITE_GOOGLE_DRIVE_CLIENT_SECRET: string
  readonly VITE_TEST_GOOGLE_DRIVE_REFRESH_TOKEN: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}