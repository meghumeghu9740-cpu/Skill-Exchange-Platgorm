const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const skillsRoutes = require('./routes/skills');
const exchangeRoutes = require('./routes/exchange');
const messagesRoutes = require('./routes/messages');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../frontend')));

// API Routes
app.use('/api', authRoutes);
app.use('/api', dashboardRoutes);
app.use('/api', skillsRoutes);
app.use('/api', exchangeRoutes);
app.use('/api', messagesRoutes);
app.use('/api/admin', adminRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Skill Exchange API server is running smoothly.' });
});

// Fallback to frontend index.html for unmatched non-API routes
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
  } else {
    res.status(404).json({ success: false, message: 'API route not found' });
  }
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

// Start Server with auto port recovery
function startServer() {
  const server = app.listen(PORT, '0.0.0.0', () => {
    const base = `http://localhost:${PORT}`;
    const makeLink = (path, label) => {
      const full = `${base}${path}`;
      const osc8 = `\x1b[36m\x1b[4m\x1b]8;;${full}\x07${full}\x1b]8;;\x07\x1b[0m`;
      return `  👉 ${label.padEnd(26)} : ${osc8}`;
    };

    console.log(`\n======================================================================`);
    console.log(`🚀 Skill Exchange Backend Server is RUNNING on PORT ${PORT}`);
    console.log(`======================================================================`);
    console.log(`\n📂 USER PLATFORM LINKS (Ctrl+Click to open or copy URL):`);
    console.log(makeLink('/', 'Home / Login'));
    console.log(makeLink('/dashboard.html', 'User Dashboard'));
    console.log(makeLink('/add-skills.html', 'Add / Manage Skills'));
    console.log(makeLink('/match.html', 'Find Skill Matches'));
    console.log(makeLink('/requests.html', 'Requests & Chat'));
    console.log(makeLink('/profile.html', 'User Profile'));

    console.log(`\n🛡️ ADMIN PORTAL LINKS:`);
    console.log(makeLink('/admin-login.html', 'Admin Login Portal'));
    console.log(makeLink('/admin.html', 'Admin Dashboard'));

    console.log(`\n🔑 DEFAULT CREDENTIALS:`);
    console.log(`  • Admin : admin@skillexchange.com | Password: admin123`);
    console.log(`  • User  : bob@example.com         | Password: password123`);
    console.log(`======================================================================\n`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`⚠️ Port ${PORT} busy. Clearing and restarting in 1 second...`);
      try {
        const { execSync } = require('child_process');
        const out = execSync(`netstat -ano | findstr LISTENING | findstr :${PORT}`).toString();
        const lines = out.trim().split('\n');
        for (const line of lines) {
          const parts = line.trim().split(/\s+/);
          const pid = parts[parts.length - 1];
          if (pid && pid !== process.pid.toString()) {
            try {
              execSync(`taskkill /F /PID ${pid} 2>nul`);
              console.log(`✅ Cleared conflicting PID ${pid}.`);
            } catch (kErr) {}
          }
        }
      } catch (e) {}
      setTimeout(startServer, 1500);
    } else {
      console.error('Server error:', err);
    }
  });
}

startServer();
