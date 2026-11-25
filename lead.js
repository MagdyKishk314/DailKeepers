// Handles POST /api/lead: checks the audit form and emails it to you.
// Used by server.js locally and by api/lead.js on Vercel.
import nodemailer from "nodemailer";

const FIELDS = {
  name: "Name",
  email: "Email",
  company: "Company",
  platform: "Dialer",
  seats: "Seats",
  spend: "Monthly spend on numbers and data",
  message: "Message",
};
const REQUIRED = ["name", "email", "company", "platform"];

const escapeHtml = (s) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

async function readBody(req) {
  // Vercel has usually parsed the body already. Plain Node has not.
  let body = req.body;
  if (body === undefined) {
    const chunks = [];
    let size = 0;
    for await (const chunk of req) {
      size += chunk.length;
      if (size > 20_000) throw new Error("Body too large");
      chunks.push(chunk);
    }
    body = Buffer.concat(chunks).toString("utf8");
  }
  if (Buffer.isBuffer(body)) body = body.toString("utf8");
  if (typeof body === "object" && body !== null) return body;
  if (typeof body !== "string" || body === "") return {};
  if ((req.headers["content-type"] || "").includes("application/json")) return JSON.parse(body);
  return Object.fromEntries(new URLSearchParams(body));
}

async function sendEmail(lead) {
  const { SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_USER || !SMTP_PASS) throw new Error("SMTP_USER and SMTP_PASS are not set");
  const port = Number(process.env.SMTP_PORT || 465);
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port,
    secure: port === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  const rows = Object.entries(FIELDS).filter(([key]) => lead[key]);
  await transport.sendMail({
    from: process.env.LEAD_EMAIL_FROM || SMTP_USER,
    to: process.env.LEAD_EMAIL_TO || SMTP_USER,
    replyTo: lead.email,
    subject: `New audit request: ${lead.company}`.replace(/[\r\n]+/g, " ").slice(0, 120),
    text: rows.map(([key, label]) => `${label}: ${lead[key]}`).join("\n"),
    html:
      "<h2>New free-audit request</h2><table cellpadding=\"6\">" +
      rows
        .map(([key, label]) => `<tr><td><b>${label}</b></td><td>${escapeHtml(lead[key]).replace(/\n/g, "<br>")}</td></tr>`)
        .join("") +
      "</table>",
  });
}

export async function handleLead(req, res) {
  const wantsJson = (req.headers.accept || "").includes("application/json");
  const reply = (status, message) => {
    if (wantsJson) {
      res.writeHead(status, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: status === 200, message }));
    } else if (status === 200) {
      res.writeHead(303, { Location: "/thanks" });
      res.end();
    } else {
      res.writeHead(status, { "Content-Type": "text/plain; charset=utf-8" });
      res.end(`${message}\n\nGo back and try again.`);
    }
  };

  if (req.method !== "POST") return reply(405, "Method not allowed.");

  let body;
  try {
    body = await readBody(req);
  } catch {
    return reply(400, "Check the form and try again.");
  }

  // Hidden spam trap: bots fill it, people never see it. Pretend it worked.
  if (body.website) return reply(200);

  const lead = {};
  for (const key of Object.keys(FIELDS)) lead[key] = String(body[key] ?? "").trim().slice(0, 2000);
  if (REQUIRED.some((key) => !lead[key])) return reply(400, "Fill in your name, email, company and dialer.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email)) return reply(400, "Enter a valid work email.");

  try {
    await sendEmail(lead);
  } catch (err) {
    console.error("Could not email lead:", err.message);
    return reply(500, "Something went wrong on our side. Try again in a minute.");
  }
  return reply(200);
}
