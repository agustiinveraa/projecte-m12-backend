import express from 'express'
import { PORT, SECRET_JWT_KEY } from './config.js'
import jwt from 'jsonwebtoken'
import { UserRepository } from './user-repository.js'
import cookieParser from 'cookie-parser'
// TODO: import mysql from 'mysql'

const app = express()

// var mysql      = require('mysql');
// var connection = mysql.createConnection({
//     host     : 'localhost',
//     database : 'slots_casino',
//     user     : 'username',
//     password : 'password',
// });
// ! recuerda cerrar conexion con connection.end();

app.set('view engine', 'ejs')

app.use(express.json()) // middleware para tratar las siguientes peticiones para req.body
app.use(cookieParser())

app.use((req, res, next) => { // middleware para verificar el token en cada peticion
  const token = req.cookies.access_token
  req.session = { user: null }
  try {
    const data = jwt.verify(token, SECRET_JWT_KEY)
    req.session.user = data
  } catch {}
  next() // para que continue con la siguiente peticion
})

app.get('/', (req, res) => {
  const { user } = req.session
  res.render('prueba', user)
})

app.post('/login', async (req, res) => {
  const { username, password } = req.body
  try {
    const user = await UserRepository.login({ username, password })
    const token = jwt.sign({ id: user._id, user: user.username }, SECRET_JWT_KEY, { expiresIn: '1h' })
    res
      .cookie('access_token', token, {
        httpOnly: true, // no se puede acceder desde el front, solo en el servidor (back)
        secure: process.env.NODE_ENV === 'production', // solo en https (en produccion)
        sameSite: 'strict', // solo se puede acceder desde el mismo sitio/dominio
        maxAge: 1000 * 60 * 60 // 1h
      })
      .send({ user })
  } catch (error) {
    res.status(401).send(error.message)
  }
})

app.post('/register', async (req, res) => {
  const { username, password } = req.body // ?
  try {
    const id = await UserRepository.create({ username, password })
    res.send({ id })
  } catch (error) {
    // NORMALMENTE POR SEGURIDAD NO SE DEBE DE HACER ASI (se suele hacer con condicional)
    res.status(400).send(error.message)
  }
})

app.post('/logout', (req, res) => {
  res.clearCookie('access_token').send('logout')
})

app.post('/protected', (req, res) => { // aqui uso JWT para las sesiones pero con express session es facil se ve
  const { user } = req.session
  if (!user) return res.status(403).send('access denied')
  res.render('protected', user)
})

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
