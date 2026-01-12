// set-admin-ahernandez.js
const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const MONGODB_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/timanager';

// Importar el modelo User usando mongoose.model y el schema
const userSchema = require('./src/models/User').schema;
const User = mongoose.model('User', userSchema);

async function setAdmin() {
  await mongoose.connect(MONGODB_URI);
  // Actualizar ahernandez
  const userAhernandez = await User.findOne({ username: 'ahernandez' });
  if (!userAhernandez) {
    console.log('Usuario ahernandez no encontrado');
  } else {
    userAhernandez.isAdmin = true;
    await userAhernandez.save();
    console.log('Usuario actualizado:', userAhernandez.username, 'isAdmin:', userAhernandez.isAdmin);
  }

  // Actualizar JIMMY
  const userJimmy = await User.findOne({ username: 'JIMMY' });
  if (!userJimmy) {
    console.log('Usuario JIMMY no encontrado');
  } else {
    userJimmy.isAdmin = true;
    await userJimmy.save();
    console.log('Usuario actualizado:', userJimmy.username, 'isAdmin:', userJimmy.isAdmin);
  }
  await mongoose.disconnect();
}

setAdmin();
