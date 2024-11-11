import express from "express";
import { PORT, SECRET_JWT_KEY, CONNECTION } from "./config.js";
import jwt from "jsonwebtoken";
import { UserRepository } from "./user-repository.js";
import cookieParser from "cookie-parser";

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

// probando neovim
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
  const { dni, nickname, email, password, name, surname, birthdate } = req.body;
  try {
    const id = await UserRepository.create({
      dni,
      nickname,
      email,
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
