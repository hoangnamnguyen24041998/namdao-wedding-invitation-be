import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { google } from "googleapis";
import path from "path";

const keyPath = path.resolve(__dirname, "./config/credentials.json");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";
const SHEET_ID = process.env.GOOGLE_SHEET_ID;

app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json());

const auth = new google.auth.GoogleAuth({
  keyFile: keyPath,
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const sheets = google.sheets({ version: "v4", auth });

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

    // Step 2️⃣: If no header exists → write headers first
    if (values.length === 0) {
      const headers = ["Thời gian", "Tên", "Xác nhận", "Số lượng", "Bên"];
      await sheets.spreadsheets.values.append({
        spreadsheetId: SHEET_ID,
        range: "A:E",
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [row] },
      });

      console.log("📝 Header row added:", headers);
    }

    // Step 3️⃣: Append the new data row
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: "A:E",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [row],
      },
    });

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
