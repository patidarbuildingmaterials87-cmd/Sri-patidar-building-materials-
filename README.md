# Sri Patidar Building Materials: Billing and Stock App

Static mobile-first web app (no build step). Data is saved in your own Google Drive as `spbm-data.json`.

## 1. Google setup (one time)
1. Open https://console.cloud.google.com and create a project.
2. APIs & Services > Library > enable **Google Drive API**.
3. OAuth consent screen: choose External, fill app name, add your Gmail under **Test users**.
4. Credentials > Create credentials > **OAuth client ID** > Web application.
5. Authorized JavaScript origins: add `http://localhost:3000` and your Vercel URL (for example `https://your-app.vercel.app`).
6. Copy the Client ID into `config.js` and put your Gmail in `ALLOWED_EMAILS`.

## 2. Publish
1. Push this folder to a GitHub repository.
2. On https://vercel.com choose Add New > Project > import the repo. Framework preset: **Other**. Deploy.
3. Add the Vercel URL to the Authorized JavaScript origins in step 1.5.
4. Open the URL on your phone and use Add to Home Screen.

## Notes
- Sign-in uses your Gmail. The app asks for the `drive.file` scope, so it only sees files it created.
- The password is set on first login and stored as a salted hash in the Drive file. It is a lock on the app screen, so keep your Gmail secure as well.
- PDF import reads text-based invoices (rows with quantity, rate and amount). Scanned image PDFs need manual entry.
