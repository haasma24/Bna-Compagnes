require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const twilio = require('twilio');
const crypto = require('crypto');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

const db = require('./db');

const app = express();

// create the upload directory if it doesn't exist
const uploadDir = path.join(__dirname, 'Uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// Nodemailer configuration
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
});

// Twilio configuration
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
console.log('Services externes (Email, SMS) configurés.');


/**
 * Génère le corps HTML d'un email stylisé avec la charte graphique BNA.
 * @param {string} title 
 * @param {string} bodyHtml 
 * @param {object} [button] 
 * @returns {string} 
 */

function createStyledEmailHtml(title, bodyHtml, button) {
    //const headerImageUrl = `${process.env.APP_URL || 'http://localhost:8081'}/images/bna.png`;
    const colorPrimary = '#16528d'; 
    const colorSecondary = '#1f947a'; 
    const colorText = '#333333';
    const backgroundColor = '#f4f4f4';

    let buttonHtml = '';
    if (button && button.url && button.text) {
        buttonHtml = `
            <a href="${button.url}" target="_blank" style="background-color: ${colorSecondary}; color: #ffffff; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; margin-top: 20px;">
                ${button.text}
            </a>
        `;
    }
    return `
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: ${backgroundColor};">
            <table border="0" cellpadding="0" cellspacing="0"  width="100%">
                <tr>
                    <td style="padding: 20px 0;">
                        <table align="center" border="0" cellpadding="0" cellspacing="0" width="600" style="border-collapse: collapse; background-color: #ffffff; border: 1px solid #cccccc; border-radius: 8px; overflow: hidden;">
                            <!-- Header avec logo -->
                            <tr>
                                <td align="center" style="background-color:rgb(255, 255, 255); padding: 20px 0;">
                                    <h1 style="color: #1f947a;"> BNA Assurances </h1>
                                </td>
                            </tr>
                            <!-- Contenu principal -->
                            <tr>
                                <td style="padding: 40px 30px;">
                                    <h1 style="color: ${colorPrimary}; margin-top: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">${title}</h1>
                                    <div style="color: ${colorText}; font-size: 16px; line-height: 1.5;">
                                        ${bodyHtml}
                                    </div>
                                    ${buttonHtml ? `<div style="text-align: center;">${buttonHtml}</div>` : ''}
                                </td>
                            </tr>
                            <!-- Footer -->
                            <tr>
                                <td style="background-color: #eeeeee; padding: 20px 30px; text-align: center;">
                                    <p style="margin: 0; color: #555555; font-size: 12px;">
                                        © ${new Date().getFullYear()} BNA Assurances. Tous droits réservés.<br/>
                                        Ceci est un email automatique, merci de ne pas y répondre.
                                    </p>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </body>
    `;
}

// Multer Configuration for File Uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'Uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, `${uniqueSuffix}-${file.originalname}`);
    },
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Seules les images sont autorisées.'), false);
        }
    },
});

// General middlewares
app.use(express.json());
app.use(cors());

app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'Uploads')));


app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

const publicRouter = express.Router();
const apiRouter = express.Router();

app.use('/', publicRouter);
app.use('/api', apiRouter);


// Multer error handling middleware
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        return res.status(400).json({ message: `Erreur de téléchargement: ${err.message}` });
    } else if (err) {
        console.error('Erreur serveur:', err);
        return res.status(500).json({ message: 'Erreur serveur.' });
    }
    next();
});

// Authentification
publicRouter.post('/register', async (req, res) => {
    const { first_name, last_name, email, phone, role, password, birthdate } = req.body;
    if (!first_name || !last_name || !email || !phone || !role || !password) {
        return res.status(400).json({ message: 'Tous les champs obligatoires doivent être remplis' });
    }
    try {
        const [users] = await db.query('SELECT email FROM user WHERE email = ?', [email]);
        if (users.length > 0) {
            return res.status(409).json({ message: 'Email déjà enregistré' });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        await db.query(
            'INSERT INTO user (first_name, last_name, email, phone, role, password, birthdate) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [first_name, last_name, email, phone, role, hashedPassword, birthdate || null]
        );
        return res.status(201).json({ message: 'Inscription réussie' });
    } catch (err) {
        console.error('Erreur /register:', err);
        return res.status(500).json({ message: 'Erreur serveur' });
    }
});

publicRouter.post('/login', async (req, res) => {
    try {
        const [users] = await db.query('SELECT * FROM user WHERE email = ?', [req.body.email]);
        if (users.length === 0) {
            return res.status(401).json({ message: 'Email ou mot de passe invalide' });
        }
        const user = users[0];
        const match = await bcrypt.compare(req.body.password, user.password);
        if (!match) {
            return res.status(401).json({ message: 'Email ou mot de passe invalide' });
        }
        const payload = { user: { id: user.id_user } };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
        
        delete user.password;
        delete user.passwordResetToken;
        delete user.passwordResetExpires;

        return res.status(200).json({ message: 'Connexion réussie', token: token, user: user });
    } catch (err) {
        console.error('Erreur /login:', err);
        return res.status(500).json({ message: 'Erreur serveur' });
    }
});

publicRouter.post('/forgot-password', async (req, res) => {
    const { method, identifier } = req.body;
    try {
        const column = method === 'email' ? 'email' : 'phone';
        const findUserSql = `SELECT * FROM user WHERE ${column} = ?`;
        const [users] = await db.query(findUserSql, [identifier]);

        if (users.length === 0) {
            return res.status(200).json({ success: true, message: "Si un compte est associé à cette information, des instructions ont été envoyées." });
        }
        const user = users[0];
        const passwordResetExpires = Date.now() + 10 * 60 * 1000;

        if (method === 'email') {
            const resetToken = crypto.randomBytes(32).toString('hex');
            const passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
            
            await db.query('UPDATE user SET passwordResetToken = ?, passwordResetExpires = ? WHERE email = ?', [passwordResetToken, passwordResetExpires, user.email]);

            const resetUrl = `http://localhost:3000/new-password/${resetToken}`;

            const emailTitle = 'Réinitialisation de votre mot de passe';
            const emailBody = `
                <p>Bonjour ${user.first_name || ''},</p>
                <p>Nous avons reçu une demande de réinitialisation du mot de passe pour votre compte. Si vous êtes à l'origine de cette demande, veuillez cliquer sur le bouton ci-dessous pour définir un nouveau mot de passe.</p>
                <p>Ce lien expirera dans 10 minutes.</p>
                <p>Si vous n'avez pas demandé cette réinitialisation, vous pouvez ignorer cet e-mail en toute sécurité.</p>
            `;
            const emailHtml = createStyledEmailHtml(emailTitle, emailBody, {
                text: 'Réinitialiser le mot de passe',
                url: resetUrl
            });

            await transporter.sendMail({
                from: { name: 'BNA Assurances', address: process.env.EMAIL_USER },
                to: user.email,
                subject: emailTitle,
                html: emailHtml 
            });

        } else { // Logique SMS
            const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
            await db.query('UPDATE user SET passwordResetToken = ?, passwordResetExpires = ? WHERE phone = ?', [resetCode, passwordResetExpires, user.phone]);
            await twilioClient.messages.create({
                body: `Votre code de réinitialisation BNA est : ${resetCode}. Il expire dans 10 minutes.`,
                from: process.env.TWILIO_PHONE_NUMBER,
                to: user.phone
            });
        }
        return res.status(200).json({ success: true, message: "Instructions envoyées." });
    } catch (err) {
        console.error("Erreur /forgot-password:", err);
        res.status(500).json({ success: false, message: "Une erreur interne est survenue." });
    }
});

publicRouter.post('/reset-password', async (req, res) => {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
        return res.status(400).json({ success: false, message: "Données manquantes." });
    }
    try {
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
        const [users] = await db.query('SELECT * FROM user WHERE passwordResetToken = ? AND passwordResetExpires > ?', [hashedToken, Date.now()]);
        if (users.length === 0) {
            return res.status(400).json({ success: false, message: "Le lien est invalide ou a expiré." });
        }
        const user = users[0];
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await db.query('UPDATE user SET password = ?, passwordResetToken = NULL, passwordResetExpires = NULL WHERE id_user = ?', [hashedPassword, user.id_user]);
        return res.status(200).json({ success: true, message: "Mot de passe réinitialisé avec succès." });
    } catch (err) {
        console.error("Erreur /reset-password:", err);
        res.status(500).json({ success: false, message: "Une erreur interne est survenue." });
    }
});

publicRouter.post('/reset-password-with-code', async (req, res) => {
    const { identifier, code, newPassword } = req.body;
    if (!identifier || !code || !newPassword) {
        return res.status(400).json({ success: false, message: "Données manquantes." });
    }
    if (newPassword.length < 6) {
        return res.status(400).json({ success: false, message: "Le mot de passe doit contenir au moins 6 caractères." });
    }
    try {
        const findUserSql = 'SELECT * FROM user WHERE phone = ? AND passwordResetToken = ? AND passwordResetExpires > ?';
        const [users] = await db.query(findUserSql, [identifier, code, Date.now()]);
        if (users.length === 0) {
            return res.status(400).json({ success: false, message: "Le code est invalide ou a expiré." });
        }
        const user = users[0];
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await db.query('UPDATE user SET password = ?, passwordResetToken = NULL, passwordResetExpires = NULL WHERE id_user = ?', [hashedPassword, user.id_user]);
        return res.status(200).json({ success: true, message: "Votre mot de passe a été réinitialisé avec succès." });
    } catch (err) {
        console.error("Erreur /reset-password-with-code:", err);
        res.status(500).json({ success: false, message: "Une erreur interne est survenue." });
    }
});


const authMiddleware = (req, res, next) => {
    const authHeader = req.header('Authorization');
    if (!authHeader) return res.status(401).json({ message: 'Accès refusé. Aucun token fourni.' });
    const token = authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Accès refusé. Format de token invalide.' });
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded.user;
        next();
    } catch (err) {
        console.error('Erreur authMiddleware:', err);
        res.status(401).json({ message: 'Token invalide.' });
    }
};

apiRouter.use(authMiddleware);

// User-specific routes
apiRouter.get('/user/me', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT id_user, first_name, last_name, email, role, contract_type, status, city, profile_picture_url, inscription_date FROM user WHERE id_user = ?', [req.user.id]);
        if (rows.length === 0) {
            return res.status(404).json({ message: "Utilisateur non trouvé." });
        }
        res.json(rows[0]);
    } catch (err) {
        console.error("Erreur /api/user/me:", err);
        res.status(500).json({ message: "Erreur serveur." });
    }
});

apiRouter.post('/user/upload-picture', upload.single('profilePicture'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'Aucun fichier téléchargé.' });
        }
        const filePath = `uploads/${req.file.filename}`;
        const userId = req.user.id;
        await db.query('UPDATE user SET profile_picture_url = ? WHERE id_user = ?', [filePath, userId]);
        return res.status(200).json({ message: 'Photo de profil téléchargée avec succès.', filePath });
    } catch (err) {
        if (err instanceof multer.MulterError) {
            return res.status(400).json({ message: `Erreur de fichier: ${err.message}` });
        }
        if (err.message === 'Seules les images sont autorisées.') {
            return res.status(400).json({ message: err.message });
        }
        console.error('Erreur /api/user/upload-picture:', err);
        return res.status(500).json({ message: 'Erreur serveur lors du téléchargement de la photo.' });
    }
});

apiRouter.put('/user/complete-profile', async (req, res) => {
    const { contract_type, status, city } = req.body;
    const userId = req.user.id;
    if (!contract_type || !status || !city) {
        return res.status(400).json({ message: 'Toutes les informations (type de contrat, statut, ville) sont requises.' });
    }
    try {
        await db.query(
            'UPDATE user SET contract_type = ?, status = ?, city = ? WHERE id_user = ?',
            [contract_type, status, city, userId]
        );
        return res.status(200).json({ message: 'Profil mis à jour avec succès.' });
    } catch (err) {
        console.error('Erreur /api/user/complete-profile:', err);
        return res.status(500).json({ message: 'Erreur serveur lors de la mise à jour du profil.' });
    }
});

// Campaign routes
apiRouter.post('/campaigns', async (req, res) => {
    const { title, message, channel, selection_criteria } = req.body;
    if (!title || !message || !channel || !selection_criteria) {
        return res.status(400).json({ message: 'Tous les champs sont requis.' });
    }
    try {
        const sql = `INSERT INTO campaign (title, message, channel, selection_criteria, scheduled_by) VALUES (?, ?, ?, ?, ?)`;
        const [result] = await db.query(sql, [title, message, channel, selection_criteria, req.user.id]);
        return res.status(201).json({ message: 'Campagne créée avec succès', campaignId: result.insertId });
    } catch (err) {
        console.error('Erreur lors de la création de la campagne :', err);
        return res.status(500).json({ message: 'Erreur serveur lors de la création de la campagne.' });
    }
});

apiRouter.get('/campaigns', async (req, res) => {
    try {
        const sql = `
            SELECT 
                c.id_camp, c.title, c.message, c.channel, c.status, 
                c.created_at, c.selection_criteria, c.scheduled_by, 
                u.first_name, u.last_name
            FROM campaign c
            INNER JOIN user u ON c.scheduled_by = u.id_user
            ORDER BY c.created_at DESC`;
        const [campaigns] = await db.query(sql);
        return res.status(200).json(campaigns);
    } catch (err) {
        console.error('Erreur lors de la récupération des campagnes :', err);
        return res.status(500).json({ message: 'Erreur serveur lors de la récupération des campagnes.' });
    }
});

apiRouter.get('/campaigns/:id', async (req, res) => {
    try {
        const campaignId = req.params.id;
        const sql = `
            SELECT 
                c.id_camp, c.title, c.message, c.channel, c.status, 
                c.created_at, c.selection_criteria, c.scheduled_by,
                u.first_name, u.last_name
            FROM campaign c
            INNER JOIN user u ON c.scheduled_by = u.id_user
            WHERE c.id_camp = ?`;
        const [campaigns] = await db.query(sql, [campaignId]);
        if (campaigns.length === 0) {
            return res.status(404).json({ message: 'Campagne non trouvée.' });
        }
        return res.status(200).json(campaigns[0]);
    } catch (err) {
        console.error(`Erreur lors de la récupération de la campagne ${req.params.id}:`, err);
        return res.status(500).json({ message: 'Erreur serveur.' });
    }
});

apiRouter.delete('/campaigns/:id', async (req, res) => {
    const campaignId = req.params.id;
    try {
        const [campaigns] = await db.query('SELECT status FROM campaign WHERE id_camp = ?', [campaignId]);
        if (campaigns.length === 0) {
            return res.status(404).json({ message: "Campagne non trouvée." });
        }
        const campaign = campaigns[0];
        if (campaign.status === 'SENT') {
            return res.status(403).json({ message: "Impossible de supprimer une campagne qui a déjà été envoyée." });
        }
        const deleteSql = 'DELETE FROM campaign WHERE id_camp = ?';
        const [result] = await db.query(deleteSql, [campaignId]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Campagne non trouvée ou déjà supprimée." });
        }
        return res.status(200).json({ message: 'Campagne supprimée avec succès.' });
    } catch (err) {
        console.error(`Erreur lors de la suppression de la campagne ${campaignId}:`, err);
        return res.status(500).json({ message: 'Erreur serveur lors de la suppression.' });
    }
});

apiRouter.delete('/campaignsadmin/:id', async (req, res) => {
    const campaignId = req.params.id;
    try {
        const [campaigns] = await db.query('SELECT status FROM campaign WHERE id_camp = ?', [campaignId]);
        if (campaigns.length === 0) {
            return res.status(404).json({ message: "Campagne non trouvée." });
        }
        const deleteSql = 'DELETE FROM campaign WHERE id_camp = ?';
        const [result] = await db.query(deleteSql, [campaignId]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Campagne non trouvée ou déjà supprimée." });
        }
        return res.status(200).json({ message: 'Campagne supprimée avec succès.' });
    } catch (err) {
        console.error(`Erreur lors de la suppression de la campagne ${campaignId}:`, err);
        return res.status(500).json({ message: 'Erreur serveur lors de la suppression.' });
    }
});


async function findCampaignRecipients(campaignId) {
    const [campaigns] = await db.query('SELECT * FROM campaign WHERE id_camp = ?', [campaignId]);
    if (campaigns.length === 0) {
        return { success: false, error: 'Campagne non trouvée.', status: 404 };
    }
    const campaign = campaigns[0];

    const criteria = campaign.selection_criteria.split(',').map(c => c.trim());
    let conditions = ['role = ?'];
    let params = ['Client'];
    let governorates = [];
    const filteredCriteria = criteria.filter(c => {
        if (c.startsWith('city_any:')) {
            governorates = c.replace('city_any:', '').split(',').map(g => g.trim());
            return false;
        }
        return true;
    });

    if (filteredCriteria.includes('new_clients')) conditions.push('inscription_date >= DATE_SUB(NOW(), INTERVAL 3 DAY)');
    if (filteredCriteria.includes('auto_contract')) { conditions.push('contract_type = ?'); params.push('Assurance Auto'); }
    if (filteredCriteria.includes('home_contract')) { conditions.push('contract_type = ?'); params.push('Assurance Domicile'); }
    if (filteredCriteria.includes('health_contract')) { conditions.push('contract_type = ?'); params.push('Assurance Santé'); }
    if (governorates.length > 0) {
        conditions.push(`city IN (${governorates.map(() => '?').join(',')})`);
        params.push(...governorates);
    }

    const sql = `SELECT id_user, first_name, last_name, email, phone FROM user WHERE ${conditions.join(' AND ')}`;
    const [clients] = await db.query(sql, params);

    return { success: true, campaign, clients };
}

apiRouter.get('/campaigns/:id/recipients', async (req, res) => {
    try {
        const result = await findCampaignRecipients(req.params.id);

        if (!result.success) {
            return res.status(result.status || 404).json({ message: result.error });
        }

        res.status(200).json({
            count: result.clients.length,
            recipients: result.clients
        });

    } catch (error) {
        console.error(`Erreur lors de la prévisualisation des destinataires pour la campagne ${req.params.id}:`, error);
        res.status(500).json({ message: 'Erreur serveur.' });
    }
});

apiRouter.post('/campaigns/:id/launch', async (req, res) => {
    try {
        const campaignId = req.params.id;
        
        const { success, campaign, clients, error, status } = await findCampaignRecipients(campaignId);

        if (!success) {
            return res.status(status || 404).json({ message: error });
        }
        
        if (campaign.status !== 'PENDING' && campaign.status !== 'APPROVED') {
             return res.status(400).json({ message: `La campagne ne peut être lancée car son statut est '${campaign.status}'.` });
        }

        if (clients.length === 0) {
            await db.query("UPDATE campaign SET status = 'EMPTY' WHERE id_camp = ?", [campaignId]);
            return res.status(200).json({ 
                message: 'Aucun client trouvé pour ces critères. Campagne marquée comme vide.', 
                newStatus: 'EMPTY',
                recipientCount: 0 
            });
        }

        const notificationValues = clients.map(client => [client.id_user, campaignId, campaign.channel]);
        await db.query('INSERT INTO user_notifications (user_id, campaign_id, channel) VALUES ?', [notificationValues]);

        if (campaign.channel === 'EMAIL') {
            console.log(`Canal EMAIL détecté pour la campagne #${campaignId}. Envoi à ${clients.length} clients...`);
            for (const client of clients) {
                try {
                    const emailHtml = createStyledEmailHtml(campaign.title, campaign.message);

                    await transporter.sendMail({
                        from: { name: 'BNA Assurances Campagnes', address: process.env.EMAIL_USER },
                        to: client.email,
                        subject: campaign.title,
                        html: emailHtml, 
                    });
                    console.log(`Email envoyé à ${client.email} pour la campagne #${campaignId}.`);
                } catch (error) {
                    console.error(`Erreur lors de l'envoi de l'email à ${client.email}:`, error);
                }
            }
        } else if (campaign.channel === 'SMS') {
            console.log(`Canal SMS détecté pour la campagne #${campaignId}. Envoi à ${clients.length} clients...`);
            for (const client of clients) {
                try {
                    await twilioClient.messages.create({
                        body: campaign.message,
                        from: process.env.TWILIO_PHONE_NUMBER,
                        to: client.phone
                    });
                    console.log(`SMS envoyé à ${client.phone} pour la campagne #${campaignId}.`);
                } catch (error) {
                    console.error(`Erreur lors de l'envoi du SMS à ${client.phone}:`, error);
                }
            }
        } else if (campaign.channel === 'IN_APP') {
            console.log(`Canal IN_APP détecté pour la campagne #${campaignId}. Notifications enregistrées pour ${clients.length} clients.`);
        }
        
        await db.query("UPDATE campaign SET status = 'SENT' WHERE id_camp = ?", [campaignId]);
        
        res.status(200).json({
            message: `Campagne lancée avec succès à ${clients.length} client(s).`,
            newStatus: 'SENT',
            recipientCount: clients.length,
            recipients: clients.map(client => ({ email: client.email, phone: client.phone }))
        });

    } catch (error) {
        console.error(`Erreur lors du lancement de la campagne ${req.params.id}:`, error);
        res.status(500).json({ message: 'Erreur serveur lors du lancement de la campagne.' });
    }
});


// Notification routes
apiRouter.get('/notifications/history', async (req, res) => {
    try {
        const userId = req.user.id;
        const sql = `
            SELECT 
                c.id_camp AS campaign_id, 
                c.title, 
                c.message, 
                c.channel, 
                un.is_read, 
                un.created_at
            FROM campaign c
            JOIN user_notifications un ON c.id_camp = un.campaign_id
            WHERE un.user_id = ?
            ORDER BY un.created_at DESC`;
        const [notifications] = await db.query(sql, [userId]);
        return res.status(200).json(notifications);
    } catch (err) {
        console.error('Erreur /notifications/history:', err);
        return res.status(500).json({ message: 'Erreur serveur lors de la récupération de l\'historique.' });
    }
});

apiRouter.get('/notifications/unread-count', async (req, res) => {
    try {
        const sql = `
            SELECT COUNT(*) as unreadCount 
            FROM user_notifications un
            JOIN campaign c ON un.campaign_id = c.id_camp
            WHERE un.user_id = ? AND un.is_read = FALSE AND c.channel = 'IN_APP'`;
        const [rows] = await db.query(sql, [req.user.id]);
        res.status(200).json(rows[0]);
    } catch (err) {
        console.error("Erreur /notifications/unread-count:", err);
        res.status(500).json({ message: "Erreur serveur." });
    }
});

apiRouter.post('/notifications/mark-as-read', async (req, res) => {
    try {
        const sql = `
            UPDATE user_notifications 
            SET is_read = TRUE 
            WHERE user_id = ? 
              AND is_read = FALSE
              AND campaign_id IN (SELECT id_camp FROM campaign WHERE channel = 'IN_APP')`;
        await db.query(sql, [req.user.id]);
        res.status(200).json({ message: 'Notifications marquées comme lues.' });
    } catch (err) {
        console.error("Erreur /notifications/mark-as-read:", err);
        res.status(500).json({ message: "Erreur serveur." });
    }
});

apiRouter.patch('/notifications/:campaignId/read', async (req, res) => {
    const userId = req.user.id;
    const { campaignId } = req.params;
    
    try {
        const sql = 'UPDATE user_notifications SET is_read = TRUE WHERE user_id = ? AND campaign_id = ?';
        const [result] = await db.query(sql, [userId, campaignId]);

        if (result.affectedRows === 0) {
            return res.status(200).json({ message: 'Notification déjà lue ou introuvable.' });
        }
        
        res.status(200).json({ message: 'Notification marquée comme lue.' });
    } catch (err) {
        console.error(`Erreur /notifications/${campaignId}/read:`, err);
        res.status(500).json({ message: "Erreur serveur." });
    }
});

// Logout route
apiRouter.post('/logout', authMiddleware, async (req, res) => {
    try {
        return res.status(200).json({ message: 'Déconnexion réussie. Le client doit supprimer le token.' });
    } catch (error) {
        console.error('Erreur /logout:', error);
        return res.status(500).json({ message: 'Erreur serveur lors de la déconnexion.' });
    }
});

// Admin-specific routes
const adminOnly = async (req, res, next) => {
    try {
        const [users] = await db.query('SELECT role FROM user WHERE id_user = ?', [req.user.id]);
        if (users.length === 0 || users[0].role !== 'Admin') {
            return res.status(403).json({ message: 'Accès refusé. Action réservée aux administrateurs.' });
        }
        next();
    } catch (err) {
        console.error("Erreur middleware adminOnly:", err);
        return res.status(500).json({ message: 'Erreur serveur.' });
    }
}

apiRouter.get('/users', adminOnly, async (req, res) => {
    try {
        const [users] = await db.query('SELECT * FROM user ORDER BY inscription_date DESC');
        const usersWithoutPasswords = users.map(user => {
            delete user.password;
            delete user.passwordResetToken;
            delete user.passwordResetExpires;
            return user;
        });
        res.status(200).json(usersWithoutPasswords);
    } catch (err) {
        console.error('Erreur /api/users:', err);
        res.status(500).json({ message: 'Erreur serveur lors de la récupération des utilisateurs.' });
    }
});

apiRouter.patch('/campaigns/:id/status', adminOnly, async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    if (!['APPROVED', 'REJECTED'].includes(status)) {
        return res.status(400).json({ message: 'Statut invalide.' });
    }
    try {
        const [result] = await db.query(
            'UPDATE campaign SET status = ? WHERE id_camp = ?',
            [status, id]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Campagne non trouvée.' });
        }
        res.status(200).json({ message: `Statut de la campagne mis à jour à ${status}.` });
    } catch (err) {
        console.error(`Erreur lors de la mise à jour du statut pour la campagne ${id}:`, err);
        res.status(500).json({ message: 'Erreur serveur.' });
    }
});

apiRouter.patch('/users/:id', adminOnly, async (req, res) => {
    const { id } = req.params;
    const updateData = req.body;
    const allowedFields = ['first_name', 'last_name', 'email', 'phone', 'role', 'birthdate', 'city', 'contract_type', 'status'];
    const params = [];
    let sqlSetPart = '';
    for (const field of allowedFields) {
        if (updateData[field] !== undefined) {
            if (sqlSetPart.length > 0) sqlSetPart += ', ';
            sqlSetPart += `${field} = ?`;
            params.push(updateData[field] === '' ? null : updateData[field]);
        }
    }
    if (params.length === 0) {
        return res.status(400).json({ message: "Aucun champ valide à mettre à jour." });
    }
    params.push(id);
    try {
        const sql = `UPDATE user SET ${sqlSetPart} WHERE id_user = ?`;
        await db.query(sql, params);
        const [updatedUsers] = await db.query('SELECT * FROM user WHERE id_user = ?', [id]);
        if (updatedUsers.length === 0) {
            return res.status(404).json({ message: "Utilisateur non trouvé après la mise à jour." });
        }
        const updatedUser = updatedUsers[0];
        delete updatedUser.password;
        res.status(200).json({ message: "Utilisateur mis à jour avec succès", user: updatedUser });
    } catch (err) {
        console.error(`Erreur lors de la mise à jour de l'utilisateur ${id}:`, err);
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: "Cet email est déjà utilisé par un autre compte." });
        }
        res.status(500).json({ message: "Erreur serveur lors de la mise à jour." });
    }
});

apiRouter.delete('/users/:id', adminOnly, async (req, res) => {
    const { id } = req.params;
    if (parseInt(id, 10) === req.user.id) {
        return res.status(403).json({ message: "Vous ne pouvez pas supprimer votre propre compte." });
    }
    try {
        const [users] = await db.query('SELECT id_user FROM user WHERE id_user = ?', [id]);
        if (users.length === 0) {
            return res.status(404).json({ message: "Utilisateur non trouvé." });
        }
        await db.query('DELETE FROM user WHERE id_user = ?', [id]);
        res.status(200).json({ message: "Utilisateur supprimé avec succès." });
    } catch (err) {
        console.error(`Erreur lors de la suppression de l'utilisateur ${id}:`, err);
        res.status(500).json({ message: "Erreur serveur lors de la suppression." });
    }
});

apiRouter.post('/users/:userId/reveal-password', adminOnly, async (req, res) => {
    const { userId } = req.params;
    const { admin_password } = req.body;
    const adminId = req.user.id;
    if (!admin_password) {
        return res.status(400).json({ message: "Le mot de passe de l'administrateur est requis." });
    }
    try {
        const [admins] = await db.query('SELECT password FROM user WHERE id_user = ?', [adminId]);
        if (admins.length === 0) {
            return res.status(404).json({ message: "Compte administrateur non trouvé." });
        }
        const adminUser = admins[0];
        const isPasswordCorrect = await bcrypt.compare(admin_password, adminUser.password);
        if (!isPasswordCorrect) {
            return res.status(403).json({ message: "Mot de passe administrateur incorrect." });
        }
        const [targetUsers] = await db.query('SELECT password FROM user WHERE id_user = ?', [userId]);
        if (targetUsers.length === 0) {
            return res.status(404).json({ message: "Utilisateur cible non trouvé." });
        }
        res.status(200).json({ password_hash: targetUsers[0].password });
    } catch (err) {
        console.error(`Erreur lors de la révélation du mot de passe pour l'utilisateur ${userId}:`, err);
        res.status(500).json({ message: "Erreur serveur." });
    }
});


apiRouter.put('/campaigns/:id', async (req, res) => {
    const { id } = req.params;
    const { title, message, channel, status, selection_criteria } = req.body;

    if (!title || !message || !channel || !status || !selection_criteria) {
        return res.status(400).json({ message: "Tous les champs sont requis pour la mise à jour." });
    }

    try {
        const [campaigns] = await db.query('SELECT status FROM campaign WHERE id_camp = ?', [id]);
        if (campaigns.length === 0) {
            return res.status(404).json({ message: "Campagne non trouvée." });
        }
        if (campaigns[0].status === 'SENT') {
            return res.status(403).json({ message: "Impossible de modifier une campagne déjà envoyée." });
        }

        const sql = `
            UPDATE campaign SET 
                title = ?, 
                message = ?, 
                channel = ?, 
                status = ?, 
                selection_criteria = ?
            WHERE id_camp = ?
        `;
        const params = [title, message, channel, status, selection_criteria, id];
        
        const [result] = await db.query(sql, params);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Campagne non trouvée lors de la mise à jour." });
        }
        
        const [updatedCampaigns] = await db.query('SELECT * FROM campaign WHERE id_camp = ?', [id]);
        
        res.status(200).json(updatedCampaigns[0]);

    } catch (err) {
        console.error(`Erreur lors de la mise à jour de la campagne ${id}:`, err);
        return res.status(500).json({ message: "Erreur serveur lors de la mise à jour de la campagne." });
    }
});

// Start server
const PORT = process.env.PORT || 8081;
app.listen(PORT, () => {
    console.log(`Serveur démarré sur le port ${PORT}`);
});