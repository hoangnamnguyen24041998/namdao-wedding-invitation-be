import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { google } from "googleapis";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;
const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";
const SHEET_ID = process.env.GOOGLE_SHEET_ID;

app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json());

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);
// const CREDENTIALS_PATH = path.resolve(__dirname, "credentials.json");

// Securely parse credentials from environment variable for Vercel
// const credentials = process.env.GOOGLE_CREDENTIALS
//   ? JSON.parse(process.env.GOOGLE_CREDENTIALS)
//   : undefined;

const auth = new google.auth.GoogleAuth({
  //   credentials,
  //   keyFile: credentials ? undefined : "./credentials.json",
  //   scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  },
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});


const sheets = google.sheets({ version: "v4", auth });

app.get("/", (req, res) => {
  res.json({ mess: "NamDao Wedding Invitation Backend is running!" });
});

app.post("/confirm-attend", async (req: Request, res: Response) => {
  try {
    const { name, attendance, quantity, side } = req.body;
    if (!name || !attendance || !quantity || !side) {
      return res
        .status(400)
        .json({ success: false, message: "Missing fields" });
    }

    const date = new Date().toLocaleString("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
    });
    const row = [date, name, attendance, quantity, side];

    const readRes = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: "A1:E1",
    });

    const values = readRes.data.values || [];

    if (values.length === 0) {
      const headers = ["Thời gian", "Tên", "Xác nhận", "Số lượng", "Bên"];
      await sheets.spreadsheets.values.append({
        spreadsheetId: SHEET_ID,
        range: "A:E",
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [headers, row] },
      });
      console.log("📝 Header row added:", headers);
    } else {
      await sheets.spreadsheets.values.append({
        spreadsheetId: SHEET_ID,
        range: "A:E",
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [row] },
      });
    }
    console.log("✅ Added new row:", row);

    res.json({ success: true, message: "Data added to Google Sheets" });
  } catch (err: any) {
    console.error("❌ Google Sheets API error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
