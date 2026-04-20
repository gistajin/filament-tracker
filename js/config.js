// ============================================================
//  FILAMENT TRACKER — CONFIG
//  Edit the values below to set up your app.
// ============================================================

const CONFIG = {

  // ----------------------------------------------------------
  // USERS
  // Add as many users as you want. Each needs:
  //   name:   Display name shown in the app
  //   sheet:  The exact tab name in your Google Sheet
  //   color:  Avatar color (any CSS hex color)
  // ----------------------------------------------------------
  users: [
    { name: "Gisela",       sheet: "User1", color: "#0F6E56" },
    { name: "Angie",      sheet: "User2", color: "#5E43B7" },
  ],

  // ----------------------------------------------------------
  // GOOGLE SHEETS — fill these in after Step 2 of the setup guide
  // ----------------------------------------------------------

  // Your Google Sheet ID (the long string in the URL)
  // e.g. https://docs.google.com/spreadsheets/d/THIS_PART_HERE/edit
  sheetId: "1DyTiuRaB2Z34F5XGTo8fq-ilcLaP-YWriuzYCENsccg",

  // Your Google Sheets API key (from Google Cloud Console)
  apiKey: "AIzaSyAgiUL1QA6HWUYIw-0iyoeorPMK3cYaUYc",

};
