# Filament Tracker — Setup Guide

Follow these steps in order. It takes about 20–30 minutes total.

---

## STEP 1 — Create your Google Sheet

1. Go to https://sheets.google.com and create a new spreadsheet
2. Name it something like **Filament Tracker**
3. At the bottom, you'll see a tab called "Sheet1" — rename it to **User1**
   - Right-click the tab → Rename → type `User1`
4. Create a second tab for the other person:
   - Click the **+** button at the bottom left → rename it to **User2**
5. Copy the **Sheet ID** from the URL bar:
   - The URL looks like: `https://docs.google.com/spreadsheets/d/COPY_THIS_PART/edit`
   - Copy everything between `/d/` and `/edit`
6. Open `js/config.js` and paste it as the `sheetId` value

---

## STEP 2 — Get a Google Sheets API Key

1. Go to https://console.cloud.google.com
2. Click **Select a project** (top left) → **New Project**
   - Name it anything, e.g. "Filament Tracker" → click **Create**
3. Once created, make sure your new project is selected
4. In the search bar at the top, type **Google Sheets API** → click it → click **Enable**
5. In the left menu go to **APIs & Services → Credentials**
6. Click **+ Create Credentials → API Key**
7. Copy the API key that appears
8. Click **Edit API key** (pencil icon):
   - Under **API restrictions** → select **Restrict key** → choose **Google Sheets API**
   - Under **Application restrictions** → select **HTTP referrers**
   - Add your GitHub Pages URL (you'll get this in Step 4) — for now add `*` as a wildcard
   - Click **Save**
9. Open `js/config.js` and paste the key as the `apiKey` value

---

## STEP 3 — Edit your config file

Open `js/config.js` and update:

```js
const CONFIG = {
  users: [
    { name: "Maria",  sheet: "User1", color: "#5E43B7" },
    { name: "John",   sheet: "User2", color: "#0F6E56" },
  ],
  sheetId: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms",  // ← your sheet ID
  apiKey:  "AIzaSyD-9tSrke72PouQMnMX-a7eZSW0jkFTd-c",        // ← your API key
};
```

Change "Maria" and "John" to your real names.
You can pick any hex color for each person's avatar.

---

## STEP 4 — Share the Google Sheet with the other person

1. Open your Google Sheet
2. Click the **Share** button (top right)
3. Enter the other person's Gmail address
4. Set their permission to **Editor**
5. Click **Send**

They'll get an email invitation — they need to accept it.

---

## STEP 5 — Deploy to GitHub Pages (free hosting)

This gives you a permanent URL anyone can open in a browser.

1. Go to https://github.com and create a free account if you don't have one
2. Click **+** (top right) → **New repository**
   - Name it `filament-tracker`
   - Set it to **Public**
   - Click **Create repository**
3. Upload your files:
   - Click **uploading an existing file**
   - Drag and drop ALL the files from this folder:
     - `index.html`
     - `css/style.css`
     - `js/config.js`
     - `js/sheets.js`
     - `js/app.js`
   - Click **Commit changes**
4. Enable GitHub Pages:
   - Go to your repo → **Settings** → **Pages** (left sidebar)
   - Under **Source** → select **Deploy from a branch**
   - Branch: **main**, folder: **/ (root)**
   - Click **Save**
5. Wait 1–2 minutes, then your app will be live at:
   `https://YOUR-GITHUB-USERNAME.github.io/filament-tracker`

---

## STEP 6 — Update your API key restrictions

Go back to Google Cloud Console → Credentials → your API key → Edit:
- Replace the `*` wildcard with your actual GitHub Pages URL:
  `https://YOUR-GITHUB-USERNAME.github.io/*`
- Click **Save**

---

## STEP 7 — Share the URL with the other person

Just send them the GitHub Pages URL. They open it in any browser,
pick their name, and they're in. That's it!

---

## Troubleshooting

**"Error loading data"** — Check that your Sheet ID and API key are correct in config.js.
Make sure the Google Sheets API is enabled in Google Cloud Console.

**"Failed to append row"** — The API key needs write access.
Make sure you're using an API key (not OAuth) and the sheet is shared with edit access.

**Data not showing** — Make sure the tab names in your Sheet exactly match
the `sheet` values in config.js (e.g. "User1" not "user1").

**Changes by one person not visible to the other** — Click the browser
refresh button. The app loads fresh data each time you open it or switch users.

---

## Updating the app later

If you want to change user names, colors, or add more users:
1. Edit `js/config.js` locally
2. Go to your GitHub repo → click on `js/config.js` → click the pencil (edit) icon
3. Paste your updated config → click **Commit changes**
The live app updates within a minute.
