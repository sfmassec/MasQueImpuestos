// index.js (CommonJS)
// Requisitos: Node 18+ (trae fetch nativo), .env configurado

const express = require("express");
const path = require("path");
const fs = require("fs");
const nodemailer = require("nodemailer");
const logFile = path.join(__dirname, "logs", "server.log");
require("dotenv").config();

const app = express();

console.log(__dirname);
if (!fs.existsSync(path.dirname(logFile))) {

  fs.mkdirSync(path.dirname(logFile), { recursive: true });

}

// Helper de logging
function logToFile(message) {
  const timestamp = new Date().toISOString();
  fs.appendFileSync(logFile, `[${timestamp}]-- ${message}\n`);
}
logToFile("0");
// ===== Middleware =====
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Estáticos: ajustá si tu estructura difiere
app.use(express.static(path.join(__dirname, "public"))); // debe contener Index.html, Imagenes/, Js/, Styles/ si los copias acá
app.use("/Styles", express.static(path.join(__dirname, "Styles"))); // si mantenés /Styles fuera de /public

// ===== Util: verificación reCAPTCHA v3 =====
async function verifyRecaptchaV3(token, remoteIp, expectedAction) {
  const params = new URLSearchParams({
    secret: process.env.RECAPTCHA_SECRET,
    response: token,
  });
  if (remoteIp) params.append("remoteip", remoteIp);

  const res = await fetch("https://www.google.com/recaptcha/api/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });

  const data = await res.json();
  const min = Number(process.env.RECAPTCHA_MIN_SCORE || 0.5);

  const ok =
    data.success === true &&
    (typeof data.score === "number" ? data.score >= min : true) &&
    (expectedAction ? data.action === expectedAction : true);

  return { ok, data };
}



// ===== Formulario de contacto =====
app.post("/contacto", async (req, res) => {
  
  const { nombre, motivo, email, conociste, phone, recaptcha_token, recaptcha_action } = req.body;

  try {
    // 1) Verificar reCAPTCHA v3
    const remoteIp =
      req.headers["x-forwarded-for"]?.split(",")[0] || req.socket.remoteAddress;
    const { ok, data } = await verifyRecaptchaV3(
      recaptcha_token,
      remoteIp,
      recaptcha_action
    );

    if (!ok) {
      console.warn("reCAPTCHA falló:", data);
      return res
        .status(400)
        .send("Validación reCAPTCHA fallida. Intenta nuevamente.");
    }

    // 2) Transporter nodemailer
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // 3) Enviar email
    await transporter.sendMail({
      from: `<${process.env.SMTP_USER}>`,
      to: process.env.MAIL_TO,
      subject: `Nuevo contacto: ${motivo}`,
      html: `<h1><b>Has recibuido un mensaje desde el formulario.</b></h1>
<br/>
<ul>
  <li><b>Nombre:</b> ${nombre}</li>
  <li><b>Email:</b> ${email}</li>
  <li><b>Telefono:</b> ${phone}</li>
  <li><b>Como nos conocio:</b> ${conociste}</li>
  <li><b>Motivo:</b> ${motivo}</li>
</ul>`,
    });

    // 4) Redirigir a página de gracias (asegurate de tenerla en /public)
    return res.redirect("/Gracias.html");
  } catch (err) {
    logToFile('Error en envio info de contacto.\n' + err );
    return res.status(500).send("Hubo un error al procesar tu solicitud." + err);
  }
});

// ===== Home (sirve tu Index.html) =====
app.get("/", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "Index.html"));
});

// ===== Server =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor en http://localhost:${PORT}`);
});
