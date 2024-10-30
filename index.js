import express from "express";
import { PORT, SECRET_JWT_KEY, CONNECTION } from "./config.js";
import jwt from "jsonwebtoken";
import { UserRepository } from "./user-repository.js";
import cookieParser from "cookie-parser";
import axios from "axios";
import FormData from "form-data";
import fs from "fs";

const app = express();

CONNECTION.connect(function (err) {
  if (err) {
    console.error("error connecting: " + err.stack);
    return;
  }
  console.log("connected as id " + CONNECTION.threadId);
});

app.set("view engine", "ejs");
app.use(express.json()); // middleware para tratar las siguientes peticiones para req.body
app.use(cookieParser());

app.use((req, res, next) => {
  // middleware para verificar el token en cada peticion
  const token = req.cookies.access_token;
  req.session = { user: null };
  try {
    const data = jwt.verify(token, SECRET_JWT_KEY);
    req.session.user = data;
  } catch {}
  next(); // para que continue con la siguiente peticion
});

app.get("/formulario", (req, res) => {
  res.render("formulario");
});

app.get("/", (req, res) => {
  const user = req.session.user || {};
  res.render("prueba", { user });
});

app.post("/login", async (req, res) => {
  const { nickname, password } = req.body;

  if (!nickname || !password) {
    return res.status(400).send("Nickname and password are required");
  }

  try {
    const user = await UserRepository.login({ nickname, password });
    const token = jwt.sign(user, SECRET_JWT_KEY, { expiresIn: "1h" });
    res
      .cookie("access_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production", // todo: cambiarlo a true
        sameSite: "strict",
        maxAge: 1000 * 60 * 60,
      })
      .send({ user });
  } catch (error) {
    res.status(401).send(error.message);
  }
});

app.post("/register", async (req, res) => {
  const { dni, nickname, password, name, surname, birthdate } = req.body;
  try {
    const id = await UserRepository.create({
      dni,
      nickname,
      password,
      name,
      surname,
      birthdate,
    });
    res.send("user created");
  } catch (error) {
    // NORMALMENTE POR SEGURIDAD NO SE DEBE DE HACER ASI (se suele hacer con condicional)
    res.status(400).send(error.message);
  }
});

app.post("/logout", (req, res) => {
  req.session.user = null;
  res.clearCookie("access_token").send("logout");
});

app.get("/protected", (req, res) => {
  const { user } = req.session;
  if (!user) return res.status(403).send("access denied");
  res.render("protected", { user }); // Pasa user como un objeto
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Validar dni x foto API

let data = new FormData();
// También puede enviar una sola imagen con ambas caras
data.append("files", fs.createReadStream("./DNI-falso.jpg"));
// data.append('files', fs.createReadStream('/Users/demo/reverso.jpeg'));

let config = {
  method: "post",
  maxBodyLength: Infinity,
  url: "https://api.wheelz-app.es/dni/process",
  headers: {
    "x-api-key": "BdoATJhnAGQa5Bx73jH1Kk6unVLv4AkroZgvgCI5f5U",
    ...data.getHeaders(),
  },
  data: data,
};

axios
  .request(config)
  .then((response) => {
    const data = response.data;
    // Extraer y mostrar la fecha de nacimiento
    const birthDate = data.birthDate;
    console.log(`Fecha de nacimiento: ${birthDate}`);
  })
  .catch((error) => {
    console.log(error);
  });
