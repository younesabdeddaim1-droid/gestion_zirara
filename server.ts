import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import * as dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { db } from './src/db/index.ts';
import * as schema from './src/db/schema.ts';
import { eq, inArray } from 'drizzle-orm';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '50mb' }));

// Helper to seed initial data if database is empty
async function seedDatabaseIfEmpty() {
  try {
    console.log('Checking database state...');
    
    // Check settings
    const currentSettings = await db.select().from(schema.settings).limit(1);
    if (currentSettings.length === 0) {
      console.log('Seeding settings table...');
      await db.insert(schema.settings).values({
        id: 'current_settings',
        nomCentre: "Corps Marocain pour l'Éducation et Développement",
        nomCentreAr: "الهيئة المغربية للتربية والتنمية",
        ministereFr: "Ministère de l'Éducation Nationale, du Préscolaire et des Sports",
        ministereAr: "وزارة التربية الوطنية والتعليم الأولي والرياضة",
        academieFr: "Académie Régionale d'Éducation et de Formation – Rabat-Salé-Kénitra",
        academieAr: "الأكاديمية الجهوية للتربية والتكوين – جهة الرباط سلا القنيطرة",
        directionProvincialeFr: "Centre de Deuxième Chance – Nouvelle Génération ZIRARA",
        directionProvincialeAr: "مركز الفرصة الثانية الجيل الجديد زيرارة",
        adresse: "Centre Deuxième Chance N.G., Centre Urbain Zirara, Route Nationale 4",
        adresseAr: "مركز الفرصة الثانية الجيل الجديد، مركز جماعة زيرارة، الطريق الوطنية رقم 4",
        ville: "Zirara",
        province: "Skhirat - Témara",
        telephone: "+212 5 37 59 12 34",
        email: "contact@e2c-zirara.ma",
        nomDirecteur: "Directeur du Centre Zirara",
        heureDebutJournee: "08:30",
        heureFinJournee: "17:00",
        dureeSeanceMinutes: 90,
        seuilConvocationAbsences: 3,
        anneeScolaireCourante: "2026-2027"
      });
    }

    // Check users
    const allUsers = await db.select().from(schema.users).limit(1);
    if (allUsers.length === 0) {
      console.log('Seeding users table...');
      await db.insert(schema.users).values([
        {
          id: "usr-admin-1",
          email: "admin@zirara.ma",
          password: "admin",
          nom: "Younes",
          prenom: "Directeur",
          nomComplet: "Directeur Younes Administrateur",
          nomCompletAr: "المدير يونس المشرف الإداري",
          role: "admin",
          telephone: "+212 6 61 23 45 67",
          specialite: "Direction Pédagogique & Coordination",
          statut: "actif",
          avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120&auto=format&fit=crop&q=80",
          permissions: {
            gestionBeneficiaires: true,
            lectureBeneficiaires: true,
            gestionPlanning: true,
            lecturePlanning: true,
            saisieAbsences: true,
            emettreConvocations: true,
            resoudreConvocations: true,
            imprimerRapports: true,
            gestionParametrage: true,
            gestionUtilisateurs: true
          }
        },
        {
          id: "usr-admin-ali",
          email: "ali-adm@zirara.com",
          password: "admin",
          nom: "Ali",
          prenom: "Administrateur",
          nomComplet: "Ali Administrateur",
          nomCompletAr: "علي المشرف الإداري",
          role: "admin",
          telephone: "+212 6 61 00 00 00",
          specialite: "Administration & Gestion Centre",
          statut: "actif",
          avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80",
          permissions: {
            gestionBeneficiaires: true,
            lectureBeneficiaires: true,
            gestionPlanning: true,
            lecturePlanning: true,
            saisieAbsences: true,
            emettreConvocations: true,
            resoudreConvocations: true,
            imprimerRapports: true,
            gestionParametrage: true,
            gestionUtilisateurs: true
          }
        },
        {
          id: "usr-admin-younes",
          email: "younesabdeddaim1@gmail.com",
          password: "admin",
          nom: "Younes",
          prenom: "Abdeddaim",
          nomComplet: "Younes Abdeddaim",
          nomCompletAr: "يونس عبد الدائم",
          role: "admin",
          telephone: "+212 6 61 00 00 01",
          specialite: "Direction Générale",
          statut: "actif",
          avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120&auto=format&fit=crop&q=80",
          permissions: {
            gestionBeneficiaires: true,
            lectureBeneficiaires: true,
            gestionPlanning: true,
            lecturePlanning: true,
            saisieAbsences: true,
            emettreConvocations: true,
            resoudreConvocations: true,
            imprimerRapports: true,
            gestionParametrage: true,
            gestionUtilisateurs: true
          }
        }
      ]);
    }

    // Check filieres
    const allFilieres = await db.select().from(schema.filieres).limit(1);
    if (allFilieres.length === 0) {
      console.log('Seeding filieres table...');
      await db.insert(schema.filieres).values([
        {
          id: "fil-eb",
          code: "EB",
          nomFr: "Électricité de Bâtiment & Domotique",
          nomAr: "كهرباء البناء والأنظمة المنزلية الذكية",
          description: "Formation professionnelle aux installations électriques résidentielles et de sécurité.",
          statut: "actif"
        },
        {
          id: "fil-cc",
          code: "CC",
          nomFr: "Coupe, Couture & Confection",
          nomAr: "الفصالة والخياطة والنسيج",
          description: "Apprentissage des techniques de coupe artisanale et moderne, modélisme et broderie.",
          statut: "actif"
        },
        {
          id: "fil-inf",
          code: "INF",
          nomFr: "Informatique, Bureautique & Digital",
          nomAr: "المعلوميات والمكتبات والرقمنة",
          description: "Compétences numériques fondamentales, saisie de données et maintenance de base.",
          statut: "actif"
        }
      ]);
    }

    // Check classes
    const allClasses = await db.select().from(schema.classes).limit(1);
    if (allClasses.length === 0) {
      console.log('Seeding classes table...');
      await db.insert(schema.classes).values([
        {
          id: "cls-eb-1",
          code: "EB-1",
          nomFr: "Électricité Bâtiment - Groupe 1",
          nomAr: "كهرباء البناء - الفوج 1",
          filiereId: "fil-eb",
          anneeScolaire: "2026-2027",
          statut: "actif"
        },
        {
          id: "cls-cc-1",
          code: "CC-1",
          nomFr: "Couture & Confection - Groupe 1",
          nomAr: "الفصالة والخياطة - الفوج 1",
          filiereId: "fil-cc",
          anneeScolaire: "2026-2027",
          statut: "actif"
        },
        {
          id: "cls-inf-1",
          code: "INF-1",
          nomFr: "Informatique & Bureautique - Groupe 1",
          nomAr: "المعلوميات والمكتبات - الفوج 1",
          filiereId: "fil-inf",
          anneeScolaire: "2026-2027",
          statut: "actif"
        }
      ]);
    }

    // Check motifs
    const allMotifs = await db.select().from(schema.motifs).limit(1);
    if (allMotifs.length === 0) {
      console.log('Seeding motifs table...');
      await db.insert(schema.motifs).values([
        {
          id: "mtf-1",
          code: "NJ",
          libelleFr: "Non justifié",
          libelleAr: "غياب غير مبرر",
          justifieParDefaut: false
        },
        {
          id: "mtf-2",
          code: "MAL",
          libelleFr: "Maladie (Certificat médical)",
          libelleAr: "مرض مع شهادة طبية",
          justifieParDefaut: true
        },
        {
          id: "mtf-3",
          code: "FAM",
          libelleFr: "Obligation familiale",
          libelleAr: "ظروف عائلية مبررة",
          justifieParDefaut: true
        }
      ]);
    }

    console.log('Database verification and seeding complete!');
  } catch (error) {
    console.error('Database seeding check failed:', error);
  }
}

seedDatabaseIfEmpty();

// --- API ENDPOINTS FOR FRONTEND ---

// Settings
app.get('/api/settings', async (req, res) => {
  try {
    const list = await db.select().from(schema.settings).limit(1);
    res.json(list[0] || {});
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

app.post('/api/settings', async (req, res) => {
  try {
    await db.insert(schema.settings)
      .values({ ...req.body, id: 'current_settings' })
      .onConflictDoUpdate({
        target: schema.settings.id,
        set: req.body
      });
    res.json({ success: true });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save settings' });
  }
});

// Users
app.get('/api/users', async (req, res) => {
  try {
    const list = await db.select().from(schema.users);
    res.json(list);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

app.post('/api/users', async (req, res) => {
  try {
    const user = req.body;
    await db.insert(schema.users)
      .values(user)
      .onConflictDoUpdate({
        target: schema.users.id,
        set: user
      });
    res.json({ success: true });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save user' });
  }
});

app.delete('/api/users/:id', async (req, res) => {
  try {
    await db.delete(schema.users).where(eq(schema.users.id, req.params.id));
    res.json({ success: true });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Filieres
app.get('/api/filieres', async (req, res) => {
  try {
    const list = await db.select().from(schema.filieres);
    res.json(list);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch filieres' });
  }
});

app.post('/api/filieres', async (req, res) => {
  try {
    const filiere = req.body;
    await db.insert(schema.filieres)
      .values(filiere)
      .onConflictDoUpdate({
        target: schema.filieres.id,
        set: filiere
      });
    res.json({ success: true });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save filiere' });
  }
});

app.delete('/api/filieres/:id', async (req, res) => {
  try {
    await db.delete(schema.filieres).where(eq(schema.filieres.id, req.params.id));
    res.json({ success: true });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete filiere' });
  }
});

// Classes
app.get('/api/classes', async (req, res) => {
  try {
    const list = await db.select().from(schema.classes);
    res.json(list);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch classes' });
  }
});

app.post('/api/classes', async (req, res) => {
  try {
    const classe = req.body;
    await db.insert(schema.classes)
      .values(classe)
      .onConflictDoUpdate({
        target: schema.classes.id,
        set: classe
      });
    res.json({ success: true });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save classe' });
  }
});

app.delete('/api/classes/:id', async (req, res) => {
  try {
    await db.delete(schema.classes).where(eq(schema.classes.id, req.params.id));
    res.json({ success: true });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete classe' });
  }
});

// Beneficiaires
app.get('/api/beneficiaires', async (req, res) => {
  try {
    const list = await db.select().from(schema.beneficiaires);
    res.json(list);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch beneficiaires' });
  }
});

app.post('/api/beneficiaires', async (req, res) => {
  try {
    const ben = req.body;
    await db.insert(schema.beneficiaires)
      .values(ben)
      .onConflictDoUpdate({
        target: schema.beneficiaires.id,
        set: ben
      });
    res.json({ success: true });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save beneficiaire' });
  }
});

app.post('/api/beneficiaires/bulk', async (req, res) => {
  try {
    const list = req.body;
    if (list && list.length > 0) {
      for (const ben of list) {
        await db.insert(schema.beneficiaires)
          .values(ben)
          .onConflictDoUpdate({
            target: schema.beneficiaires.id,
            set: ben
          });
      }
    }
    res.json({ success: true, count: list?.length || 0 });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: 'Failed to bulk import beneficiaires' });
  }
});

app.post('/api/beneficiaires/delete-bulk', async (req, res) => {
  try {
    const { ids } = req.body;
    if (ids && ids.length > 0) {
      await db.delete(schema.beneficiaires).where(inArray(schema.beneficiaires.id, ids));
      // Delete cascade relations
      await db.delete(schema.absences).where(inArray(schema.absences.beneficiaireId, ids));
      await db.delete(schema.convocations).where(inArray(schema.convocations.beneficiaireId, ids));
      await db.delete(schema.billets).where(inArray(schema.billets.beneficiaireId, ids));
    }
    res.json({ success: true });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: 'Failed to bulk delete beneficiaires' });
  }
});

// Seances
app.get('/api/seances', async (req, res) => {
  try {
    const list = await db.select().from(schema.seances);
    res.json(list);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch seances' });
  }
});

app.post('/api/seances', async (req, res) => {
  try {
    const seance = req.body;
    await db.insert(schema.seances)
      .values(seance)
      .onConflictDoUpdate({
        target: schema.seances.id,
        set: seance
      });
    res.json({ success: true });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save seance' });
  }
});

app.delete('/api/seances/:id', async (req, res) => {
  try {
    await db.delete(schema.seances).where(eq(schema.seances.id, req.params.id));
    res.json({ success: true });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete seance' });
  }
});

// Absences
app.get('/api/absences', async (req, res) => {
  try {
    const list = await db.select().from(schema.absences);
    res.json(list);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch absences' });
  }
});

app.post('/api/absences', async (req, res) => {
  try {
    const record = req.body;
    await db.insert(schema.absences)
      .values(record)
      .onConflictDoUpdate({
        target: schema.absences.id,
        set: record
      });
    res.json({ success: true });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save absence' });
  }
});

app.post('/api/absences/bulk-save', async (req, res) => {
  try {
    const { seanceId, records, userId } = req.body;
    
    // Delete existing absences for this seance
    await db.delete(schema.absences).where(eq(schema.absences.seanceId, seanceId));
    
    // Insert new records
    if (records && records.length > 0) {
      for (const rec of records) {
        await db.insert(schema.absences).values(rec);
      }
    }
    
    res.json({ success: true });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save pointage' });
  }
});

// Motifs
app.get('/api/motifs', async (req, res) => {
  try {
    const list = await db.select().from(schema.motifs);
    res.json(list);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch motifs' });
  }
});

app.post('/api/motifs', async (req, res) => {
  try {
    const motif = req.body;
    await db.insert(schema.motifs)
      .values(motif)
      .onConflictDoUpdate({
        target: schema.motifs.id,
        set: motif
      });
    res.json({ success: true });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save motif' });
  }
});

app.delete('/api/motifs/:id', async (req, res) => {
  try {
    await db.delete(schema.motifs).where(eq(schema.motifs.id, req.params.id));
    res.json({ success: true });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete motif' });
  }
});

// Convocations
app.get('/api/convocations', async (req, res) => {
  try {
    const list = await db.select().from(schema.convocations);
    res.json(list);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch convocations' });
  }
});

app.post('/api/convocations', async (req, res) => {
  try {
    const conv = req.body;
    await db.insert(schema.convocations)
      .values(conv)
      .onConflictDoUpdate({
        target: schema.convocations.id,
        set: conv
      });
    res.json({ success: true });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save convocation' });
  }
});

// Billets Retard
app.get('/api/billets', async (req, res) => {
  try {
    const list = await db.select().from(schema.billets);
    res.json(list);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch billets' });
  }
});

app.post('/api/billets', async (req, res) => {
  try {
    const billet = req.body;
    await db.insert(schema.billets)
      .values(billet)
      .onConflictDoUpdate({
        target: schema.billets.id,
        set: billet
      });
    res.json({ success: true });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save billet' });
  }
});

app.delete('/api/billets/:id', async (req, res) => {
  try {
    await db.delete(schema.billets).where(eq(schema.billets.id, req.params.id));
    res.json({ success: true });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete billet' });
  }
});

// Setup Vite development server or production build static folder
const PORT = Number(process.env.PORT) || 3000;

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    console.log('Starting server in DEVELOPMENT mode...');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    console.log('Starting server in PRODUCTION mode...');
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Full-stack application listening on http://localhost:${PORT}`);
  });
}

startServer();
