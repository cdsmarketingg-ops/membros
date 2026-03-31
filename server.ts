
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
import admin from 'firebase-admin';

// Import Firebase config for projectId
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const firebaseConfig = JSON.parse(fs.readFileSync(path.join(__dirname, 'firebase-applet-config.json'), 'utf8'));

// Initialize Firebase Admin
admin.initializeApp({
  projectId: firebaseConfig.projectId
});

const db = firebaseConfig.firestoreDatabaseId 
  ? admin.firestore(firebaseConfig.firestoreDatabaseId)
  : admin.firestore();
const JWT_SECRET = process.env.JWT_SECRET || 'nexus-lms-secret-key';

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 500 * 1024 * 1024 } // 500MB limit
});

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
  app.post('/api/webhook/hotmart', async (req, res) => {
    const { event, data } = req.body;
    
    console.log('Received Hotmart Webhook:', event);
    
    if (data && data.buyer && data.buyer.email) {
      const email = data.buyer.email.toLowerCase().trim();
      const productId = data.product?.id?.toString();
      
      // List of events that grant access
      const approvalEvents = ['PURCHASE_APPROVED', 'PURCHASE_COMPLETE'];
      
      // List of events that revoke access (Refund, Chargeback, Cancellation)
      const revokeEvents = ['PURCHASE_REFUNDED', 'PURCHASE_CHARGEBACK', 'PURCHASE_CANCELED', 'SUBSCRIPTION_CANCELLATION'];

      try {
        const userRef = db.collection('users').doc(email); // Using email as doc ID for simplicity in webhooks
        const userDoc = await userRef.get();
        let products = userDoc.exists ? (userDoc.data()?.products || []) : [];

        if (approvalEvents.includes(event)) {
          if (productId && !products.includes(productId)) {
            products.push(productId);
          }
          await userRef.set({
            email,
            products,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            createdAt: userDoc.exists ? userDoc.data()?.createdAt : admin.firestore.FieldValue.serverTimestamp()
          }, { merge: true });
          console.log(`User authorized via Hotmart: ${email} (Product: ${productId})`);
        } else if (revokeEvents.includes(event)) {
          if (productId) {
            products = products.filter((id: string) => id !== productId);
          }
          await userRef.set({
            products,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          }, { merge: true });
          console.log(`User access REVOKED via Hotmart: ${email} (Reason: ${event})`);
        }

        // Log the webhook
        await db.collection('webhook_logs').add({
          platform: 'hotmart',
          event,
          email,
          productId,
          payload: req.body,
          timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
      } catch (error) {
        console.error('Error processing Hotmart webhook:', error);
      }
    }
    
    // Always return 200 to Hotmart
    res.status(200).send('OK');
  });

  // --- Webhook Kiwify ---
  app.post('/api/webhook/kiwify', async (req, res) => {
    const { order_status, Customer, product_id } = req.body;
    
    console.log('Received Kiwify Webhook:', order_status);
    
    if (Customer && Customer.email) {
      const email = Customer.email.toLowerCase().trim();
      const productId = product_id?.toString();
      
      // List of events that grant access
      const approvalEvents = ['paid', 'completed'];
      
      // List of events that revoke access
      const revokeEvents = ['refunded', 'chargeback', 'canceled'];

      try {
        const userRef = db.collection('users').doc(email);
        const userDoc = await userRef.get();
        let products = userDoc.exists ? (userDoc.data()?.products || []) : [];

        if (approvalEvents.includes(order_status)) {
          if (productId && !products.includes(productId)) {
            products.push(productId);
          }
          await userRef.set({
            email,
            products,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            createdAt: userDoc.exists ? userDoc.data()?.createdAt : admin.firestore.FieldValue.serverTimestamp()
          }, { merge: true });
          console.log(`User authorized via Kiwify: ${email} (Product: ${productId})`);
        } else if (revokeEvents.includes(order_status)) {
          if (productId) {
            products = products.filter((id: string) => id !== productId);
          }
          await userRef.set({
            products,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          }, { merge: true });
          console.log(`User access REVOKED via Kiwify: ${email} (Reason: ${order_status})`);
        }

        // Log the webhook
        await db.collection('webhook_logs').add({
          platform: 'kiwify',
          event: order_status,
          email,
          productId,
          payload: req.body,
          timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
      } catch (error) {
        console.error('Error processing Kiwify webhook:', error);
      }
    }
    
    res.status(200).send('OK');
  });

  // --- Auth Endpoints ---

  // Check current session
  app.get('/api/auth/session', async (req, res) => {
    const token = req.cookies.nexus_session;
    if (!token) return res.status(401).json({ authenticated: false });

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { email: string };
      const userDoc = await db.collection('users').doc(decoded.email).get();
      const products = userDoc.exists ? (userDoc.data()?.products || []) : [];
      
      res.json({ 
        authenticated: true, 
        email: decoded.email,
        products: products
      });
    } catch (e) {
      res.status(401).json({ authenticated: false });
    }
  });

  // Login (Passwordless)
  app.post('/api/auth/login', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const normalizedEmail = email.toLowerCase().trim();
    
    try {
      const userDoc = await db.collection('users').doc(normalizedEmail).get();
      const products = userDoc.exists ? (userDoc.data()?.products || []) : [];
      
      const isAuthorized = products.length > 0 || normalizedEmail === 'cdsmarketingg@gmail.com';

      if (isAuthorized) {
        const token = jwt.sign({ email: normalizedEmail }, JWT_SECRET, { expiresIn: '7d' });
        
        res.cookie('nexus_session', token, {
          httpOnly: true,
          secure: true,
          sameSite: 'none',
          maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        res.json({ 
          success: true, 
          email: normalizedEmail,
          products: products
        });
      } else {
        res.status(403).json({ error: 'Email não autorizado. Verifique se sua compra foi aprovada.' });
      }
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Erro interno ao processar login' });
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
  app.post('/api/admin/authorize', async (req, res) => {
    const { email, productId } = req.body;
    if (!email) return res.status(400).send('Email required');
    
    const normalizedEmail = email.toLowerCase().trim();
    try {
      const userRef = db.collection('users').doc(normalizedEmail);
      const userDoc = await userRef.get();
      let products = userDoc.exists ? (userDoc.data()?.products || []) : [];
      
      if (productId && !products.includes(productId)) {
        products.push(productId);
      } else if (!productId && products.length === 0) {
        products.push('default_product');
      }

      await userRef.set({
        email: normalizedEmail,
        products,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: userDoc.exists ? userDoc.data()?.createdAt : admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      
      res.send('Authorized');
    } catch (error) {
      res.status(500).send('Error');
    }
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

  // --- Config Endpoints ---
  app.get('/api/admin/config', async (req, res) => {
    try {
      const doc = await db.collection('config').doc('main').get();
      if (doc.exists) {
        res.json(doc.data());
      } else {
        res.json({});
      }
    } catch (error) {
      console.error('Error fetching config:', error);
      res.status(500).json({ error: 'Failed to fetch configuration' });
    }
  });

  app.post('/api/admin/config', async (req, res) => {
    // Check if user is admin
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

    const configData = req.body;
    console.log('💾 RECEBENDO CONFIG:', JSON.stringify(configData).substring(0, 200) + '...');

    try {
      await db.collection('config').doc('main').set({
        ...configData,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      console.log('✅ CONFIG SALVA COM SUCESSO');
      res.json({ success: true });
    } catch (error) {
      console.error('❌ Erro ao salvar config:', error);
      res.status(500).json({ error: 'Failed to save configuration' });
    }
  });

  // --- Student Endpoints ---
  app.get('/api/admin/students', async (req, res) => {
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

    try {
      const snapshot = await db.collection('users').get();
      const students = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.json(students);
    } catch (error) {
      console.error('Error fetching students:', error);
      res.status(500).json({ error: 'Failed to fetch students' });
    }
  });

  app.post('/api/admin/students', async (req, res) => {
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

    const { email, products } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });

    try {
      await db.collection('users').doc(email.toLowerCase().trim()).set({
        email: email.toLowerCase().trim(),
        products: products || ['manual_entry'],
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      res.json({ success: true });
    } catch (error) {
      console.error('Error adding student:', error);
      res.status(500).json({ error: 'Failed to add student' });
    }
  });

  app.delete('/api/admin/students/:email', async (req, res) => {
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

    const { email } = req.params;
    try {
      await db.collection('users').doc(email).delete();
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting student:', error);
      res.status(500).json({ error: 'Failed to delete student' });
    }
  });

  // --- Bunny.net List Files ---
  app.get('/api/admin/files', async (req, res) => {
    // Check if user is admin
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

    const storageZone = process.env.BUNNY_STORAGE_ZONE || 'teste-aula';
    const accessKey = process.env.BUNNY_ACCESS_KEY || '22baafe9-93d9-4501-b18ebad00488-7e0a-4567';
    const region = process.env.BUNNY_REGION || 'br';
    // Using the regional endpoint as seen in previous logic
    const bunnyUrl = `https://${region}.storage.bunnycdn.com/${storageZone}/`;

    try {
      console.log(`Listing files from Bunny.net: ${bunnyUrl}`);
      const response = await fetch(bunnyUrl, {
        method: 'GET',
        headers: {
          'AccessKey': accessKey,
          'Accept': 'application/json'
        },
      });

      if (response.ok) {
        const files = await response.json();
        res.json(files);
      } else {
        const errorText = await response.text();
        console.error('Bunny.net list error:', errorText);
        res.status(500).json({ error: 'Failed to list files from Bunny.net', details: errorText });
      }
    } catch (error) {
      console.error('List error:', error);
      res.status(500).json({ error: 'Internal server error during listing', details: error instanceof Error ? error.message : String(error) });
    }
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

    const storageZone = process.env.BUNNY_STORAGE_ZONE || 'teste-aula';
    const accessKey = process.env.BUNNY_ACCESS_KEY || '22baafe9-93d9-4501-b18ebad00488-7e0a-4567';
    const pullZoneUrl = process.env.BUNNY_PULL_ZONE_URL || 'https://aevopro.b-cdn.net';
    const region = process.env.BUNNY_REGION || 'br';

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
