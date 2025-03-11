const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const supabase = require('../config/supabase');

// Signup / Register
const signup = async (req, res) => {
  const { email, password, name, phone } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({ message: 'Email, password, dan nama wajib diisi' });
  }

  try {
    // Cek apakah email sudah terdaftar
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (existingUser) {
      return res.status(400).json({ message: 'Email sudah terdaftar' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate UUID untuk user_id
    const userId = uuidv4();

    // Insert user baru
    const { data: newUser, error } = await supabase
      .from('users')
      .insert([
        {
          id: userId,
          email,
          password: hashedPassword,
          name,
          phone: phone || null,
          created_at: new Date()
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Signup error:', error);
      return res.status(500).json({ message: 'Gagal mendaftarkan pengguna', error: error.message });
    }

    // Buat profile untuk user baru
    const { error: profileError } = await supabase
      .from('profiles')
      .insert([
        {
          id: uuidv4(),
          user_id: userId,
          avatar: null,
          created_at: new Date()
        }
      ]);

    if (profileError) {
      console.error('Profile creation error:', profileError);
      // Tetap lanjutkan meskipun pembuatan profil gagal
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: userId, email: newUser.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'Pendaftaran berhasil',
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name
      },
      token
    });
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan pada server', error: error.message });
  }
};

// Signin / Login
const signin = async (req, res) => {
  const { email, password } = req.body;
  const userAgent = req.headers['user-agent'];
  const ip = req.ip || req.connection.remoteAddress;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email dan password wajib diisi' });
  }

  try {
    // Cari user berdasarkan email
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !user) {
      return res.status(401).json({ message: 'Email atau password salah' });
    }

    // Verifikasi password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Email atau password salah' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Catat sesi login
    const { error: sessionError } = await supabase
      .from('sessions')
      .insert([
        {
          id: uuidv4(),
          user_id: user.id,
          ip_address: ip,
          user_agent: userAgent,
          last_activity: new Date()
        }
      ]);

    if (sessionError) {
      console.error('Session creation error:', sessionError);
      // Tetap lanjutkan meskipun pencatatan sesi gagal
    }

    res.status(200).json({
      message: 'Login berhasil',
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      },
      token
    });
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan pada server', error: error.message });
  }
};

// Get User Profile
const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    // Ambil data user
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, name, phone, created_at')
      .eq('id', userId)
      .single();

    if (userError) {
      return res.status(404).json({ message: 'Pengguna tidak ditemukan' });
    }

    // Ambil data profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('avatar')
      .eq('user_id', userId)
      .single();

    res.status(200).json({
      user: {
        ...user,
        avatar: profile?.avatar || null
      }
    });
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan pada server', error: error.message });
  }
};

// Update User Profile
const updateProfile = async (req, res) => {
  const { name, phone, avatar } = req.body;
  const userId = req.user.id;

  try {
    // Update user data
    const userUpdates = {};
    if (name) userUpdates.name = name;
    if (phone) userUpdates.phone = phone;

    if (Object.keys(userUpdates).length > 0) {
      const { error: userError } = await supabase
        .from('users')
        .update(userUpdates)
        .eq('id', userId);

      if (userError) {
        return res.status(500).json({ message: 'Gagal memperbarui profil', error: userError.message });
      }
    }

    // Update avatar jika ada
    if (avatar) {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ avatar })
        .eq('user_id', userId);

      if (profileError) {
        return res.status(500).json({ message: 'Gagal memperbarui avatar', error: profileError.message });
      }
    }

    res.status(200).json({ message: 'Profil berhasil diperbarui' });
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan pada server', error: error.message });
  }
};

// Logout
const logout = async (req, res) => {
  const userId = req.user.id;

  try {
    // Hapus sesi aktif (opsional)
    const { error } = await supabase
      .from('sessions')
      .delete()
      .eq('user_id', userId);

    if (error) {
      console.error('Session deletion error:', error);
      // Tetap lanjutkan meskipun penghapusan sesi gagal
    }

    res.status(200).json({ message: 'Logout berhasil' });
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan pada server', error: error.message });
  }
};

module.exports = {
  signup,
  signin,
  getProfile,
  updateProfile,
  logout
};
