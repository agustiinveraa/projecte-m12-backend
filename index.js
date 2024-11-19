import express from "express";
import { PORT, SECRET_JWT_KEY, CONNECTION } from "./config.js";
import jwt from "jsonwebtoken";
import { UserRepository } from "./user-repository.js";
import cookieParser from "cookie-parser";
import upload from "./upload.js";
import path from "path";

const app = express();

CONNECTION.connect(function (err) {
  if (err) {
    console.error("error connecting: " + err.stack);
    return;
  }
  console.log("connected as id " + CONNECTION.threadId);
});

app.set("view engine", "ejs");

// Middleware para Servir archivos estáticos desde la carpeta "uploads"
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

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
  res.send({ user });
});

app.post('/transaction', async (req, res) => {
  const { identifier, amount } = req.body;

  if (!identifier || !amount) {
    return res.status(400).json({ message: 'DNI o nickname y monto son requeridos' });
  }

  try {
    const user = req.session.user || {};
    // Llamamos al repositorio para realizar la transacción
    await UserRepository.transaction({ identifier, amount });
    res.status(200).json({ message: 'Transacción realizada con éxito', user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
});

app.get('/balance', async (req, res) => {
  try {
    const user = req.session.user || {};
    const balance = await UserRepository.getBalance(user.dni);
    res.status(200).json({ balance });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
});


// Endpoint para actualizar la foto de perfil
app.post('/update-profile-picture', upload.single('profile_picture'), async (req, res) => {
  try {
      const userId = req.body.user_id; // ID del usuario desde el body
      if (!req.file) {
          return res.status(400).json({ message: "Profile picture file is required" });
      }

      const profilePicturePath = `/uploads/${req.file.filename}`; // Ruta de la imagen subida

      // Llama al método del repositorio
      const result = await UserRepository.updateProfilePicture({
          userId,
          profilePicturePath,
      });

      res.status(200).json({
          message: result.message,
          profilePicture: profilePicturePath,
      });
  } catch (error) {
      res.status(500).json({
          message: "Error updating profile picture",
          error: error.message,
      });
  }
});

// Endpoint para obtener la foto de perfil según el id del usuario
app.get('/profile-picture/:nickname', async (req, res) => {
  const { nickname } = req.params; // Obtenemos el ID del usuario desde los parámetros de la URL

  try {
    // Consultamos la base de datos para obtener la ruta de la imagen de perfil
    const [user] = await CONNECTION.promise().query(
      "SELECT src FROM users WHERE nickname = ?",
      [nickname]
    );

    // Si el usuario no existe, respondemos con un error 404
    if (user.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    // Recuperamos la ruta de la imagen
    const profilePicture = user[0].src;
    if (!profilePicture) {
      return res.status(404).json({ message: "Profile picture not found" });
    }

    // Devolvemos la URL completa de la imagen de perfil
    return res.status(200).json({ profilePicture: `http://localhost:3000${profilePicture}` });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error fetching profile picture", error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
