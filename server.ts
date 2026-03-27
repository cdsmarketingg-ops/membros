
import express from 'express';
import { createServer as createViteServer } from 'vite';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const USERS_FILE = path.join(__dirname, 'users.json');
const JWT_SECRET = process.env.JWT_SECRET || 'nexus-lms-secret-key';

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 500 * 1024 * 1024 } // 500MB limit
});

// Initialize users file if it doesn't exist
if (!fs.existsSync(USERS_FILE)) {
  fs.writeFileSync(USERS_FILE, JSON.stringify({ authorizedEmails: [], userProducts: {} }));
}

function getUsers() {
  try {
    const data = fs.readFileSync(USERS_FILE, 'utf8');
    const parsed = JSON.parse(data);
    if (!parsed.userProducts) parsed.userProducts = {};
    return parsed;
  } catch (e) {
    return { authorizedEmails: [], userProducts: {} };
  }
}

function saveUsers(data: any) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(data, null, 2));
}

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const wss = new WebSocketServer({ server });
  const PORT = 3000;

  // Store active connections
  const clients = new Set<WebSocket>();

  wss.on('connection', (ws) => {
    clients.add(ws);
    console.log('New client connected. Total:', clients.size);

    ws.on('close', () => {
      clients.delete(ws);
      console.log('Client disconnected. Total:', clients.size);
    });
  });

  app.use(express.json({ limit: '500mb' }));
  app.use(express.urlencoded({ limit: '500mb', extended: true }));
  app.use(cookieParser());

  // --- Webhook Hotmart ---
  app.post('/api/webhook/hotmart', (req, res) => {
    const { event, data } = req.body;
    
    console.log('Received Hotmart Webhook:', event);
    
    if (data && data.buyer && data.buyer.email) {
      const email = data.buyer.email.toLowerCase().trim();
      const productId = data.product?.id?.toString();
      const users = getUsers();
      
      // List of events that grant access
      const approvalEvents = ['PURCHASE_APPROVED', 'PURCHASE_COMPLETE'];
      
      // List of events that revoke access (Refund, Chargeback, Cancellation)
      const revokeEvents = ['PURCHASE_REFUNDED', 'PURCHASE_CHARGEBACK', 'PURCHASE_CANCELED', 'SUBSCRIPTION_CANCELLATION'];

      if (approvalEvents.includes(event)) {
        if (!users.authorizedEmails.includes(email)) {
          users.authorizedEmails.push(email);
        }
        
        if (productId) {
          if (!users.userProducts[email]) users.userProducts[email] = [];
          if (!users.userProducts[email].includes(productId)) {
            users.userProducts[email].push(productId);
          }
        }
        
        saveUsers(users);
        console.log(`User authorized via Hotmart: ${email} (Product: ${productId})`);
      } else if (revokeEvents.includes(event)) {
        const index = users.authorizedEmails.indexOf(email);
        if (index > -1) {
          users.authorizedEmails.splice(index, 1);
        }
        
        if (productId && users.userProducts[email]) {
          users.userProducts[email] = users.userProducts[email].filter((id: string) => id !== productId);
        }
        
        saveUsers(users);
        console.log(`User access REVOKED via Hotmart: ${email} (Reason: ${event})`);
      }
    }
    
    // Always return 200 to Hotmart
    res.status(200).send('OK');
  });

  // --- Webhook Kiwify ---
  app.post('/api/webhook/kiwify', (req, res) => {
    const { order_status, Customer, product_id } = req.body;
    
    console.log('Received Kiwify Webhook:', order_status);
    
    if (Customer && Customer.email) {
      const email = Customer.email.toLowerCase().trim();
      const productId = product_id?.toString();
      const users = getUsers();
      
      // List of events that grant access
      const approvalEvents = ['paid', 'completed'];
      
      // List of events that revoke access
      const revokeEvents = ['refunded', 'chargeback', 'canceled'];

      if (approvalEvents.includes(order_status)) {
        if (!users.authorizedEmails.includes(email)) {
          users.authorizedEmails.push(email);
        }

        if (productId) {
          if (!users.userProducts[email]) users.userProducts[email] = [];
          if (!users.userProducts[email].includes(productId)) {
            users.userProducts[email].push(productId);
          }
        }

        saveUsers(users);
        console.log(`User authorized via Kiwify: ${email} (Product: ${productId})`);
      } else if (revokeEvents.includes(order_status)) {
        const index = users.authorizedEmails.indexOf(email);
        if (index > -1) {
          users.authorizedEmails.splice(index, 1);
        }

        if (productId && users.userProducts[email]) {
          users.userProducts[email] = users.userProducts[email].filter((id: string) => id !== productId);
        }

        saveUsers(users);
        console.log(`User access REVOKED via Kiwify: ${email} (Reason: ${order_status})`);
      }
    }
    
    res.status(200).send('OK');
  });

  // --- Auth Endpoints ---

  // Check current session
  app.get('/api/auth/session', (req, res) => {
    const token = req.cookies.nexus_session;
    if (!token) return res.status(401).json({ authenticated: false });

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { email: string };
      const users = getUsers();
      const userProducts = users.userProducts[decoded.email] || [];
      
      res.json({ 
        authenticated: true, 
        email: decoded.email,
        products: userProducts
      });
    } catch (e) {
      res.status(401).json({ authenticated: false });
    }
  });

  // Login (Passwordless)
  app.post('/api/auth/login', (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const normalizedEmail = email.toLowerCase().trim();
    const users = getUsers();

    const isAuthorized = users.authorizedEmails.includes(normalizedEmail) || 
                        (users.userProducts[normalizedEmail] && users.userProducts[normalizedEmail].length > 0);

    if (isAuthorized || normalizedEmail === 'cdsmarketingg@gmail.com') {
      const token = jwt.sign({ email: normalizedEmail }, JWT_SECRET, { expiresIn: '7d' });
      
      res.cookie('nexus_session', token, {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      const userProducts = users.userProducts[normalizedEmail] || [];
      res.json({ 
        success: true, 
        email: normalizedEmail,
        products: userProducts
      });
    } else {
      res.status(403).json({ error: 'Email não autorizado. Verifique se sua compra foi aprovada.' });
    }
  });

  // Logout
  app.post('/api/auth/logout', (req, res) => {
    res.clearCookie('nexus_session', {
      httpOnly: true,
      secure: true,
      sameSite: 'none'
    });
    res.json({ success: true });
  });

  // --- Admin Helper (For testing/demo) ---
  app.post('/api/admin/authorize', (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).send('Email required');
    
    const users = getUsers();
    const normalizedEmail = email.toLowerCase().trim();
    if (!users.authorizedEmails.includes(normalizedEmail)) {
      users.authorizedEmails.push(normalizedEmail);
      saveUsers(users);
    }
    res.send('Authorized');
  });

  // --- Real-time Notifications ---
  app.post('/api/admin/notify', (req, res) => {
    const token = req.cookies.nexus_session;
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { email: string };
      if (decoded.email !== 'cdsmarketingg@gmail.com') {
        return res.status(403).json({ error: 'Forbidden' });
      }
    } catch (e) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { title, text, link } = req.body;
    if (!title || !text) return res.status(400).json({ error: 'Title and text are required' });

    const notification = {
      type: 'NOTIFICATION',
      payload: {
        id: Date.now().toString(),
        title,
        text,
        link,
        createdAt: new Date().toISOString()
      }
    };

    const message = JSON.stringify(notification);
    let count = 0;
    clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
        count++;
      }
    });

    console.log(`Notification broadcasted to ${count} clients: ${title}`);
    res.json({ success: true, sentTo: count });
  });

  // --- Bunny.net Upload ---
  app.post('/api/admin/upload', upload.single('file'), async (req, res) => {
    console.log('--- NOVA TENTATIVA DE UPLOAD RECEBIDA ---');
    // Check if user is admin
    const token = req.cookies.nexus_session;
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { email: string };
      // Hardcoded admin for now as per App.tsx logic
      if (decoded.email !== 'cdsmarketingg@gmail.com') {
        return res.status(403).json({ error: 'Forbidden' });
      }
    } catch (e) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const file = req.file;
    if (!file) return res.status(400).json({ error: 'No file uploaded' });

    const storageZone = 'teste-aula';
    const accessKey = '22baafe9-93d9-4501-b18ebad00488-7e0a-4567';
    const pullZoneUrl = 'https://teste-aula.b-cdn.net';

    if (!storageZone || !accessKey) {
      return res.status(500).json({ error: 'Bunny.net configuration missing in environment variables' });
    }

    // Clean filename: remove special chars and spaces
    const cleanName = file.originalname.replace(/[^a-zA-Z0-9.]/g, '_');
    const fileName = `${Date.now()}-${cleanName}`;
    // Using the regional endpoint from the user's screenshot
    const bunnyUrl = `https://br.storage.bunnycdn.com/${storageZone}/${fileName}`;

    try {
      console.log(`Uploading to Bunny.net: ${bunnyUrl}`);
      const response = await fetch(bunnyUrl, {
        method: 'PUT',
        headers: {
          'AccessKey': accessKey,
          'Content-Type': 'application/octet-stream',
        },
        body: file.buffer,
      });

      if (response.ok) {
        const fileUrl = pullZoneUrl ? `${pullZoneUrl}/${fileName}` : bunnyUrl;
        console.log(`Upload successful: ${fileUrl}`);
        res.json({ success: true, url: fileUrl });
      } else {
        const errorText = await response.text();
        console.error('Bunny.net error:', errorText);
        res.status(500).json({ error: 'Failed to upload to Bunny.net', details: errorText });
      }
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ error: 'Internal server error during upload', details: error instanceof Error ? error.message : String(error) });
    }
  });

  // Global Error Handler to prevent HTML responses for API errors
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Global Error:', err);
    if (req.path.startsWith('/api/')) {
      return res.status(err.status || 500).json({
        error: err.message || 'Internal Server Error',
        details: err.details || null
      });
    }
    next(err);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
