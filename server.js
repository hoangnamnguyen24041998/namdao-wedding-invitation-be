import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { google } from "googleapis";
dotenv.config();
const app = express();
const PORT = process.env.PORT || 3002;
const SHEET_ID_A = process.env.GOOGLE_SHEET_ID_A;
const SHEET_ID_B = process.env.GOOGLE_SHEET_ID_B;
const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";
// let corsOptions: cors.CorsOptions = {
//   methods: ["GET", "POST", "OPTIONS"],
// };
// const allowedOrigins = CORS_ORIGIN.split(",").map((url) => url.trim());
// corsOptions.origin = allowedOrigins;
const corsOptions = {
    origin: [
        "http://localhost:5173",
        "https://hnxd.io.vn",
        "https://www.hnxd.io.vn",
        "https://namdao-wedding-invitation-be.vercel.app",
    ],
    methods: ["GET", "POST", "OPTIONS"],
    credentials: true,
};
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
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
app.post("/confirm-attend", async (req, res) => {
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
            spreadsheetId: SHEET_ID_A,
            range: "A1:E1",
        });
        const values = readRes.data.values || [];
        if (values.length === 0) {
            const headers = ["Thời gian", "Tên", "Xác nhận", "Số lượng", "Bên"];
            await sheets.spreadsheets.values.append({
                spreadsheetId: SHEET_ID_A,
                range: "A:E",
                valueInputOption: "USER_ENTERED",
                requestBody: { values: [headers, row] },
            });
            console.log("📝 Header row added:", headers);
        }
        else {
            await sheets.spreadsheets.values.append({
                spreadsheetId: SHEET_ID_A,
                range: "A:E",
                valueInputOption: "USER_ENTERED",
                requestBody: { values: [row] },
            });
        }
        console.log("✅ Added new row:", row);
        res.json({ success: true, message: "Data added to Google Sheets" });
    }
    catch (err) {
        console.error("❌ Google Sheets API error:", err);
        res.status(500).json({ success: false, message: err.message });
    }
});
app.get("/confirm-attend", async (req, res) => {
    try {
        const readRes = await sheets.spreadsheets.values.get({
            spreadsheetId: SHEET_ID_A,
            range: "A:E",
        });
        const values = readRes.data.values || [];
        if (values.length < 2) {
            return res.json({ success: true, data: [] });
        }
        const customKeys = [
            "timestamp",
            "name",
            "confirmation",
            "quantity",
            "side",
        ];
        const rows = values.slice(1);
        const data = rows.map((row) => {
            const entry = {};
            customKeys.forEach((key, index) => {
                entry[key] = row[index] || "";
            });
            return entry;
        });
        res.json({ success: true, data });
    }
    catch (err) {
        console.error("❌ Error reading attendance sheet:", err);
        res.status(500).json({ success: false, message: err.message });
    }
});
app.post("/sent-wishes", async (req, res) => {
    try {
        const { name, wish } = req.body;
        if (!name || !wish) {
            return res
                .status(400)
                .json({ success: false, message: "Missing fields" });
        }
        const date = new Date().toLocaleString("vi-VN", {
            timeZone: "Asia/Ho_Chi_Minh",
        });
        const row = [date, name, wish];
        const readRes = await sheets.spreadsheets.values.get({
            spreadsheetId: SHEET_ID_B,
            range: "A1:E1",
        });
        const values = readRes.data.values || [];
        if (values.length === 0) {
            const headers = ["Thời gian", "Tên", "Lời chúc"];
            await sheets.spreadsheets.values.append({
                spreadsheetId: SHEET_ID_B,
                range: "A:E",
                valueInputOption: "USER_ENTERED",
                requestBody: { values: [headers, row] },
            });
            console.log("📝 Header row added:", headers);
        }
        else {
            await sheets.spreadsheets.values.append({
                spreadsheetId: SHEET_ID_B,
                range: "A:E",
                valueInputOption: "USER_ENTERED",
                requestBody: { values: [row] },
            });
        }
        console.log("✅ Added new row:", row);
        res.json({ success: true, message: "Data added to Google Sheets" });
    }
    catch (err) {
        console.error("❌ Google Sheets API error:", err);
        res.status(500).json({ success: false, message: err.message });
    }
});
app.get("/sent-wishes", async (req, res) => {
    try {
        const readRes = await sheets.spreadsheets.values.get({
            spreadsheetId: SHEET_ID_B,
            range: "A:E",
        });
        const values = readRes.data.values || [];
        if (values.length < 2) {
            return res.json({ success: true, data: [] });
        }
        const customKeys = ["timestamp", "name", "wish"];
        const rows = values.slice(1);
        let data = rows.map((row) => {
            const entry = {};
            customKeys.forEach((key, index) => {
                entry[key] = row[index] || "";
            });
            return entry;
        });
        data.sort((a, b) => {
            const dateA = new Date(a.timestamp.split(" ").reverse().join(" "));
            const dateB = new Date(b.timestamp.split(" ").reverse().join(" "));
            return dateA.getTime() - dateB.getTime();
        });
        const { timestamp, name, wish } = req.query;
        if (timestamp || name || wish) {
            data = data.filter((entry) => {
                return ((!timestamp || entry.timestamp === timestamp) &&
                    (!name || entry.name === name) &&
                    (!wish || entry.wish === wish));
            });
        }
        res.json({ success: true, data });
    }
    catch (err) {
        console.error("❌ Error reading wishes sheet:", err);
        res.status(500).json({ success: false, message: err.message });
    }
});
app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
});
