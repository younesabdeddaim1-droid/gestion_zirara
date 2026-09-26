import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Role, UserPermissions } from '../types';
import { storageService } from '../services/storage';
import { getUserPermissions, getDefaultPermissionsForRole } from '../utils/permissions';
import { db, auth, initializeCollectionsIfEmpty } from '../services/firebase';
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  deleteDoc 
} from 'firebase/firestore';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  onAuthStateChanged
} from 'firebase/auth';

import { initialUsers } from '../data/mockData';

interface AuthContextType {
  currentUser: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isAnimateur: boolean;
  isBeneficiaire: boolean;
  isConsultation: boolean;
  role: Role | null;
  permissions: UserPermissions;
  hasPermission: (perm: keyof UserPermissions) => boolean;
  login: (emailOrCodeMassar: string, password?: string, roleHint?: Role) => Promise<boolean>;
  logout: () => void;
  switchUser: (userId: string) => void;
  users: User[];
  refreshUsers: () => void;
  updateUserPermissions: (userId: string, permissions: UserPermissions) => Promise<void>;
  addUser: (user: User) => Promise<void>;
  updateUser: (user: User) => Promise<void>;
  deleteUser: (userId: string) => Promise<boolean>;
  toggleUserStatus: (userId: string) => Promise<void>;
  resetUserPassword: (userId: string, newPassword: string) => Promise<boolean>;
  changeUserPassword: (userId: string, oldPassword: string, newPassword: string) => Promise<{ success: boolean; message: string }>;
  loginWithGitHub: (githubUser: any) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const normalizeUser = (u: User): User => ({
    ...u,
    filiereIds: u.filiereIds && u.filiereIds.length > 0 ? u.filiereIds : (u.filiereId ? [u.filiereId] : []),
    classeIds: u.classeIds && u.classeIds.length > 0 ? u.classeIds : (u.classeId ? [u.classeId] : []),
    permissions: getUserPermissions(u)
  });

  const [users, setUsers] = useState<User[]>(() => {
    const rawUsers = storageService.getUsers();
    return rawUsers.map(normalizeUser);
  });

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const currentId = storageService.getCurrentUserId();
    if (!currentId) return null;
    const allUsers = storageService.getUsers();
    const found = allUsers.find(u => u.id === currentId && u.statut === 'actif') || null;
    return found ? normalizeUser(found) : null;
  });

  // Realtime synchronization of the users collection and session state mapping
  const reloadUsersFromApi = async () => {
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        let liveUsers = await res.json();
        if (Array.isArray(liveUsers) && liveUsers.length > 0) {
          // Always ensure default admins are present to prevent lockouts
          initialUsers.forEach(defaultUser => {
            if (defaultUser.role === 'admin' && !liveUsers.some(u => u.id === defaultUser.id)) {
              liveUsers.push(defaultUser);
            }
          });
          const normalized = liveUsers.map(normalizeUser);
          setUsers(normalized);
          storageService.setUsers(normalized);

          const currentId = storageService.getCurrentUserId();
          if (currentId) {
            const found = normalized.find(u => u.id === currentId && u.statut === 'actif');
            if (found) {
              setCurrentUser(found);
            } else {
              setCurrentUser(null);
              storageService.setCurrentUserId(null);
            }
          }
        }
      }
    } catch (err) {
      console.error("Error reloading users from API:", err);
    }
  };

  useEffect(() => {
    let intervalId: any;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        console.log("Firebase Auth detected logged-in user:", firebaseUser.email, firebaseUser.uid);
        await reloadUsersFromApi();
        intervalId = setInterval(reloadUsersFromApi, 5000);

        // Sync user document ID for logged-in profile if different
        const allUsers = storageService.getUsers();
        let matchedUser = allUsers.find(
          u => u.email && u.email.toLowerCase().trim() === firebaseUser.email?.toLowerCase().trim()
        );
        
        if (matchedUser && matchedUser.id !== firebaseUser.uid) {
          console.log(`Syncing user document ID for ${matchedUser.email} from ${matchedUser.id} to ${firebaseUser.uid}`);
          const updatedUser = { ...matchedUser, id: firebaseUser.uid };
          try {
            await fetch('/api/users', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(updatedUser)
            });
            await reloadUsersFromApi();
          } catch (err) {
            console.error("Failed to write updated user profile on auth state change:", err);
          }
        }
      } else {
        const currentId = storageService.getCurrentUserId();
        if (currentId) {
          const allUsers = storageService.getUsers();
          const localUser = allUsers.find(u => u.id === currentId && u.statut === 'actif');
          if (localUser && localUser.password) {
            const userEmail = localUser.email || `${localUser.id}@zirara.ma`;
            try {
              console.log("Auto-restoring Firebase Auth session for:", userEmail);
              await signInWithEmailAndPassword(auth, userEmail, localUser.password);
            } catch (err) {
              console.error("Failed to auto-restore session:", err);
            }
          }
        }
      }
    });

    return () => {
      unsubscribeAuth();
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  const refreshUsers = () => {
    reloadUsersFromApi();
  };

  const login = async (emailOrCodeMassar: string, password?: string, roleHint?: Role): Promise<boolean> => {
    if (!emailOrCodeMassar || !emailOrCodeMassar.trim()) return false;
    const cleanId = emailOrCodeMassar.toLowerCase().trim();
    const cleanPassword = password ? password.trim() : '';

    // Find in user array
    let found = users.find(u => {
      if (u.statut !== 'actif') return false;
      if (roleHint && u.role !== roleHint) return false;
      const matchEmail = u.email && u.email.toLowerCase().trim() === cleanId;
      const matchName = u.nomComplet && u.nomComplet.toLowerCase().trim() === cleanId;
      const matchMassar = u.codeMassar && u.codeMassar.toLowerCase().trim() === cleanId;
      return matchEmail || matchName || matchMassar;
    });

    if (!found) {
      // Fallback to local storage cached users in case Firestore is empty, loading, or unseeded
      const cachedUsers = storageService.getUsers();
      found = cachedUsers.find(u => {
        if (u.statut !== 'actif') return false;
        if (roleHint && u.role !== roleHint) return false;
        const matchEmail = u.email && u.email.toLowerCase().trim() === cleanId;
        const matchName = u.nomComplet && u.nomComplet.toLowerCase().trim() === cleanId;
        const matchMassar = u.codeMassar && u.codeMassar.toLowerCase().trim() === cleanId;
        return matchEmail || matchName || matchMassar;
      });
    }

    if (!found && roleHint) {
      found = users.find(u => {
        if (u.statut !== 'actif') return false;
        const matchEmail = u.email && u.email.toLowerCase().trim() === cleanId;
        const matchName = u.nomComplet && u.nomComplet.toLowerCase().trim() === cleanId;
        const matchMassar = u.codeMassar && u.codeMassar.toLowerCase().trim() === cleanId;
        return matchEmail || matchName || matchMassar;
      });
      if (!found) {
        const cachedUsers = storageService.getUsers();
        found = cachedUsers.find(u => {
          if (u.statut !== 'actif') return false;
          const matchEmail = u.email && u.email.toLowerCase().trim() === cleanId;
          const matchName = u.nomComplet && u.nomComplet.toLowerCase().trim() === cleanId;
          const matchMassar = u.codeMassar && u.codeMassar.toLowerCase().trim() === cleanId;
          return matchEmail || matchName || matchMassar;
        });
      }
    }

    // Auto-provision user account if Code Massar matches a Beneficiaire without a user account
    if (!found) {
      const allBeneficiaires = storageService.getBeneficiaires();
      const matchedBen = allBeneficiaires.find(
        b => b.codeMassar.toLowerCase().trim() === cleanId && b.statut === 'Actif'
      );
      if (matchedBen) {
        const newUser: User = {
          id: `usr-ben-${matchedBen.id}`,
          email: `${matchedBen.codeMassar.toLowerCase()}@zirara.ma`,
          codeMassar: matchedBen.codeMassar,
          beneficiaireId: matchedBen.id,
          password: cleanPassword || '123',
          nom: matchedBen.nomFr,
          prenom: matchedBen.prenomFr,
          nomComplet: `${matchedBen.prenomFr} ${matchedBen.nomFr}`,
          nomCompletAr: `${matchedBen.prenomAr} ${matchedBen.nomAr}`,
          role: 'beneficiaire',
          telephone: matchedBen.telephone,
          filiereId: matchedBen.filiereId,
          classeId: matchedBen.classeId,
          filiereIds: [matchedBen.filiereId],
          classeIds: [matchedBen.classeId],
          statut: 'actif',
          avatar: matchedBen.photoUrl,
          permissions: getDefaultPermissionsForRole('beneficiaire')
        };
        
        await setDoc(doc(db, 'users', newUser.id), newUser);
        found = newUser;
      }
    }

    if (found) {
      const userEmail = found.email || `${found.id}@zirara.ma`;
      const passToUse = cleanPassword || '123';
      let firebaseUid = '';

      try {
        // Authenticate with Firebase Authentication
        const userCredential = await signInWithEmailAndPassword(auth, userEmail, passToUse);
        firebaseUid = userCredential.user.uid;
      } catch (err: any) {
        // Auto-provision inside Firebase Auth if password matches
        if (
          err.code === 'auth/user-not-found' || 
          err.code === 'auth/invalid-credential' || 
          err.code === 'auth/invalid-email' || 
          err.code === 'auth/user-disabled'
        ) {
          if (found.password === passToUse) {
            try {
              const userCredential = await createUserWithEmailAndPassword(auth, userEmail, passToUse);
              firebaseUid = userCredential.user.uid;
            } catch (createErr) {
              console.error("Firebase Auth user auto-creation failed:", createErr);
            }
          } else {
            return false;
          }
        } else {
          console.error("Firebase auth exception:", err);
          if (found.password !== passToUse) {
            return false;
          }
        }
      }

      // If we authenticated successfully with Firebase Auth and got a UID, map the user document ID
      if (firebaseUid && found.id !== firebaseUid) {
        try {
          const updatedUser = { ...found, id: firebaseUid };
          await setDoc(doc(db, 'users', firebaseUid), updatedUser);
          found = updatedUser;
        } catch (syncErr) {
          console.error("Failed to map user document with Firebase Auth UID:", syncErr);
        }
      }

      const userWithPerms: User = normalizeUser(found);
      setCurrentUser(userWithPerms);
      storageService.setCurrentUserId(found.id);

      // Trigger automatic seeding with active admin session authorization
      if (userWithPerms.role === 'admin') {
        initializeCollectionsIfEmpty().catch((err) => {
          console.error("Authorized database seeding failed:", err);
        });
      }

      return true;
    }
    return false;
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.error(e);
    }
    setCurrentUser(null);
    storageService.setCurrentUserId(null);
  };

  const resetUserPassword = async (userId: string, newPassword: string): Promise<boolean> => {
    if (!userId || !newPassword) return false;
    const target = users.find(u => u.id === userId);
    if (!target) return false;
    
    const updated = { ...target, password: newPassword.trim() };
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated)
    });
    if (res.ok) {
      await reloadUsersFromApi();
      return true;
    }
    return false;
  };

  const changeUserPassword = async (userId: string, oldPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> => {
    const target = users.find(u => u.id === userId);
    if (!target) {
      return { success: false, message: 'Utilisateur introuvable.' };
    }
    if (target.password && target.password !== oldPassword.trim()) {
      return { success: false, message: 'L\'ancien mot de passe est incorrect.' };
    }
    if (newPassword.trim().length < 3) {
      return { success: false, message: 'Le mot de passe doit comporter au moins 3 caractères.' };
    }

    const updated = { ...target, password: newPassword.trim() };
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated)
    });
    if (res.ok) {
      await reloadUsersFromApi();
      return { success: true, message: 'Mot de passe mis à jour avec succès.' };
    }
    return { success: false, message: 'Erreur lors de la mise à jour.' };
  };

  const switchUser = (userId: string) => {
    const found = users.find(u => u.id === userId && u.statut === 'actif');
    if (found) {
      const userWithPerms: User = normalizeUser(found);
      setCurrentUser(userWithPerms);
      storageService.setCurrentUserId(found.id);
    }
  };

  const updateUserPermissions = async (userId: string, newPermissions: UserPermissions) => {
    const target = users.find(u => u.id === userId);
    if (!target) return;
    const updated = {
      ...target,
      permissions: newPermissions
    };
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated)
    });
    if (res.ok) {
      await reloadUsersFromApi();
    }
  };

  const addUser = async (newUser: User) => {
    const userToSave: User = normalizeUser({
      ...newUser,
      permissions: newUser.permissions || getDefaultPermissionsForRole(newUser.role)
    });
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userToSave)
    });
    if (res.ok) {
      await reloadUsersFromApi();
    }
  };

  const updateUser = async (updatedUser: User) => {
    const target = users.find(u => u.id === updatedUser.id);
    const userToSave = normalizeUser({
      ...updatedUser,
      permissions: updatedUser.permissions || (target ? target.permissions : undefined) || getDefaultPermissionsForRole(updatedUser.role)
    });
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userToSave)
    });
    if (res.ok) {
      await reloadUsersFromApi();
    }
  };

  const deleteUser = async (userId: string): Promise<boolean> => {
    if (userId === 'usr-admin-1') return false; // Protected super admin
    const res = await fetch(`/api/users/${userId}`, { method: 'DELETE' });
    if (res.ok) {
      await reloadUsersFromApi();
      if (currentUser && currentUser.id === userId) {
        await logout();
      }
      return true;
    }
    return false;
  };

  const toggleUserStatus = async (userId: string) => {
    if (userId === 'usr-admin-1') return; // Protected
    const target = users.find(u => u.id === userId);
    if (!target) return;
    const nextStatus: User['statut'] = target.statut === 'actif' ? 'inactif' : 'actif';
    const updated = { ...target, statut: nextStatus };
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated)
    });
    if (res.ok) {
      await reloadUsersFromApi();
    }
  };

  const role = currentUser ? currentUser.role : null;
  const isAdmin = role === 'admin';
  const isAnimateur = role === 'animateur';
  const isBeneficiaire = role === 'beneficiaire';
  const isConsultation = role === 'consultation';
  const isAuthenticated = !!currentUser;
  const permissions = getUserPermissions(currentUser);

  const loginWithGitHub = async (githubUser: any): Promise<boolean> => {
    if (!githubUser || !githubUser.id) return false;
    const githubEmail = (githubUser.email || `${githubUser.login}@github.com`).toLowerCase();

    // Check if a user with this email or github ID already exists
    let matchedUser = users.find(
      u => (u.email && u.email.toLowerCase() === githubEmail) || u.id === `gh-${githubUser.id}`
    );

    if (!matchedUser) {
      // Auto-provision user account with admin role (or default role)
      matchedUser = {
        id: `gh-${githubUser.id}`,
        email: githubEmail,
        nom: githubUser.name?.split(' ')[1] || githubUser.login,
        prenom: githubUser.name?.split(' ')[0] || 'GitHub',
        nomComplet: githubUser.name || githubUser.login,
        nomCompletAr: githubUser.login,
        role: 'admin',
        telephone: '',
        statut: 'actif',
        avatar: githubUser.avatar_url,
        permissions: getDefaultPermissionsForRole('admin')
      };

      try {
        await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(matchedUser)
        });
      } catch (e) {
        console.error('Error auto-provisioning GitHub user in DB:', e);
      }
    }

    const normalized = normalizeUser(matchedUser);
    setCurrentUser(normalized);
    storageService.setCurrentUserId(matchedUser.id);
    return true;
  };

  const hasPermission = (perm: keyof UserPermissions): boolean => {
    if (!currentUser) return false;
    if (currentUser.role === 'admin') return true;
    return !!permissions[perm];
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated,
        isAdmin,
        isAnimateur,
        isBeneficiaire,
        isConsultation,
        role,
        permissions,
        hasPermission,
        login,
        loginWithGitHub,
        logout,
        switchUser,
        users,
        refreshUsers,
        updateUserPermissions,
        addUser,
        updateUser,
        deleteUser,
        toggleUserStatus,
        resetUserPassword,
        changeUserPassword
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
