import mongoose from 'mongoose';
import User from '../src/models/User';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/timanager';

async function setAdminJimmy() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Conectado a MongoDB');

        // Buscar el usuario JIMMY
        const user = await User.findOne({ username: 'JIMMY' });
        
        if (!user) {
            console.log('Usuario JIMMY no encontrado');
            console.log('Usuarios disponibles:');
            const allUsers = await User.find({}, 'username isAdmin');
            allUsers.forEach(u => {
                console.log(`- ${u.username} (isAdmin: ${u.isAdmin})`);
            });
            return;
        }

        // Actualizar el flag isAdmin
        user.isAdmin = true;
        await user.save();

        console.log('✓ Usuario JIMMY actualizado correctamente');
        console.log('ID:', user._id);
        console.log('Username:', user.username);
        console.log('isAdmin:', user.isAdmin);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Desconectado de MongoDB');
    }
}

setAdminJimmy();
