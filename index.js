import express from "express";
import { PORT, SECRET_JWT_KEY, CONNECTION } from "./config.js";
import jwt from "jsonwebtoken";
import { UserRepository } from "./user-repository.js";
import cookieParser from "cookie-parser";
import upload from "./upload.js";
import path from "path";
import { CLIENT_RENEG_LIMIT } from "tls";

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

app.post("/delete-account", async (req, res) => {
  const { nickname } = req.body;
  try {
    await UserRepository.delete({ nickname });
    res.send("user deleted");
  } catch (error) {
    res.status(500).send(error.message);
  }
});

app.post("/update-account", async (req, res) => {
  const { dni, nickname, email, name, surname, balance } = req.body;
  try {
    await UserRepository.update({ dni, nickname, email, name, surname, balance });
    res.send("user updated");
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).send(error.message);
  }
});

app.post("/change-password", async (req, res) => {
  const { email, newPassword } = req.body;
  try {
    await UserRepository.changePassword({ email, newPassword });
    res.send("password updated");
  } catch (error) {
    console.error('Error updating password user:', error);
    res.status(500).send(error.message);
  }
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

app.post('/substract-balance', async (req, res) => {
  const { identifier, amount } = req.body;

  if (!identifier || !amount) {
    return res.status(400).json({ message: 'DNI o nickname y monto son requeridos' });
  }

  try {
    const user = req.session.user || {};
    // Llamamos al repositorio para realizar la transacción
    await UserRepository.substractBalance({ identifier, amount });
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

app.get('/users', async (req, res) => {
  try {
    const result = await UserRepository.getAllUsers();
    console.log(result);
    res.status(200).json({ result });
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


// Endpoint para crear un ticket
app.post("/create-ticket", upload.single("photo"), async (req, res) => {
  const { type, message } = req.body;
  const photoPath = req.file ? `/uploads/${req.file.filename}` : null; // Ruta de la imagen subida
  const userId = req.session.user?.id; // ID del usuario desde la sesión

  if (!userId) {
    return res.status(401).json({ message: "User not authenticated" });
  }

  try {
    // Insertar el ticket en la base de datos
    const [result] = await CONNECTION.promise().query(
      "INSERT INTO tickets (id_user, email_user, type, img, message, status) VALUES (?, ?, ?, ?, ?, ?)",
      [userId, req.session.user.email, type, photoPath, message, "unresolved"]
    );

    res.status(201).json({ message: "Ticket created successfully", ticketId: result.insertId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error creating ticket", error: error.message });
  }
});

app.get("/tickets", async (req, res) => {
  try {
    const [tickets] = await CONNECTION.promise().query("SELECT * FROM tickets");
    res.status(200).json({ tickets }); // Asegúrate de devolver { tickets: [...] }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching tickets", error: error.message });
  }
});

app.post("/update-ticket", async (req, res) => {
  const { ticketId, status } = req.body;

  if (!ticketId || !status) {
    return res.status(400).json({ message: "Ticket ID and status are required" });
  }

  try {
    await CONNECTION.promise().query("UPDATE tickets SET status = ? WHERE id = ?", [status, ticketId]);
    res.status(200).json({ message: "Ticket updated successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error updating ticket", error: error.message });
  }
});

app.post("/save-transaction", async (req, res) => {
  const { userId, amount, cardNumber, type } = req.body;

  if (!userId || !amount || !cardNumber || !type) {
    return res.status(400).json({ message: "User ID, amount, cardNumber and type are required" });
  }

  try {
    await CONNECTION.promise().query(
      "INSERT INTO transactions (id_user, balance, card_number, type) VALUES (?, ?, ?, ?)",
      [userId, amount, cardNumber, type]
    );

    res.status(201).json({ message: "Transaction saved successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error saving transaction", error: error.message });
  }
});

app.get("/transactions", async (req, res) => {
  try {
    const [transactions] = await CONNECTION.promise().query("SELECT * FROM transactions");
    res.status(200).json({ transactions });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching transactions", error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
