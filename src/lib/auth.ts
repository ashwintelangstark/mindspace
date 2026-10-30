export interface MindspaceUser {
  username: string;
  email: string;
  createdAt: string;
  rememberMe?: boolean;
}

interface StoredUserAccount {
  username: string;
  usernameLower: string;
  email: string;
  password: string;
  createdAt: string;
}

const USERS_STORAGE_KEY = "mindspace_registered_users_v1";
const ACTIVE_SESSION_KEY = "mindspace_active_session_user_v1";
const REMEMBERED_CREDS_KEY = "mindspace_remembered_credentials_v1";

type AuthListener = (user: MindspaceUser | null) => void;
const listeners = new Set<AuthListener>();

function notifyAuthListeners(user: MindspaceUser | null) {
  for (const listener of listeners) {
    try {
      listener(user);
    } catch {
      // ignore listener errors
    }
  }
}

export function subscribeAuth(listener: AuthListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function loadStoredUsers(): StoredUserAccount[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveStoredUsers(users: StoredUserAccount[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  } catch {
    // ignore storage quota errors
  }
}

export function getCurrentUser(): MindspaceUser | null {
  if (typeof window === "undefined") return null;
  try {
    const sessionRaw = sessionStorage.getItem(ACTIVE_SESSION_KEY);
    if (sessionRaw) {
      return JSON.parse(sessionRaw) as MindspaceUser;
    }
    const localRaw = localStorage.getItem(ACTIVE_SESSION_KEY);
    if (localRaw) {
      return JSON.parse(localRaw) as MindspaceUser;
    }
  } catch {
    // ignore
  }
  return null;
}

export function getActiveUsername(): string {
  const user = getCurrentUser();
  return user?.username ? user.username.trim().toLowerCase() : "guest";
}

export function getRememberedCredentials(): {
  username: string;
  password: string;
  email?: string;
  rememberMe: boolean;
} | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(REMEMBERED_CREDS_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function registerMindspaceUser(params: {
  username: string;
  email: string;
  password: string;
  rememberMe: boolean;
}): { ok: boolean; user?: MindspaceUser; error?: string } {
  const cleanUsername = params.username.trim();
  const cleanEmail = params.email.trim();
  const password = params.password;

  if (!cleanUsername || cleanUsername.length < 2) {
    return { ok: false, error: "Username must be at least 2 characters long." };
  }
  if (!cleanEmail || !cleanEmail.includes("@")) {
    return { ok: false, error: "Please enter a valid email address." };
  }
  if (!password || password.length < 4) {
    return { ok: false, error: "Password must be at least 4 characters long." };
  }

  const users = loadStoredUsers();
  const usernameLower = cleanUsername.toLowerCase();

  const existing = users.find((u) => u.usernameLower === usernameLower);
  if (existing) {
    return {
      ok: false,
      error: `Username "${cleanUsername}" is already registered. Please sign in on the Login tab.`,
    };
  }

  const createdAt = new Date().toISOString();
  const newAccount: StoredUserAccount = {
    username: cleanUsername,
    usernameLower,
    email: cleanEmail,
    password,
    createdAt,
  };

  users.push(newAccount);
  saveStoredUsers(users);

  const sessionUser: MindspaceUser = {
    username: cleanUsername,
    email: cleanEmail,
    createdAt,
    rememberMe: params.rememberMe,
  };

  if (typeof window !== "undefined") {
    sessionStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(sessionUser));
    if (params.rememberMe) {
      localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(sessionUser));
      localStorage.setItem(
        REMEMBERED_CREDS_KEY,
        JSON.stringify({
          username: cleanUsername,
          password,
          email: cleanEmail,
          rememberMe: true,
        }),
      );
    } else {
      localStorage.removeItem(ACTIVE_SESSION_KEY);
      localStorage.removeItem(REMEMBERED_CREDS_KEY);
    }
  }

  notifyAuthListeners(sessionUser);
  return { ok: true, user: sessionUser };
}

export function loginMindspaceUser(params: {
  username: string;
  password: string;
  rememberMe: boolean;
}): { ok: boolean; user?: MindspaceUser; error?: string } {
  const cleanUsername = params.username.trim();
  const password = params.password;

  if (!cleanUsername) {
    return { ok: false, error: "Please enter your username." };
  }
  if (!password) {
    return { ok: false, error: "Please enter your password." };
  }

  const users = loadStoredUsers();
  const usernameLower = cleanUsername.toLowerCase();
  const account = users.find((u) => u.usernameLower === usernameLower);

  if (!account) {
    return {
      ok: false,
      error: `No account found for username "${cleanUsername}". Please register first.`,
    };
  }

  if (account.password !== password) {
    return {
      ok: false,
      error: "Invalid username or password. Please check your credentials and try again.",
    };
  }

  const sessionUser: MindspaceUser = {
    username: account.username,
    email: account.email,
    createdAt: account.createdAt,
    rememberMe: params.rememberMe,
  };

  if (typeof window !== "undefined") {
    sessionStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(sessionUser));
    if (params.rememberMe) {
      localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(sessionUser));
      localStorage.setItem(
        REMEMBERED_CREDS_KEY,
        JSON.stringify({
          username: account.username,
          password: account.password,
          email: account.email,
          rememberMe: true,
        }),
      );
    } else {
      localStorage.removeItem(ACTIVE_SESSION_KEY);
      localStorage.removeItem(REMEMBERED_CREDS_KEY);
    }
  }

  notifyAuthListeners(sessionUser);
  return { ok: true, user: sessionUser };
}

export function logoutMindspaceUser(): void {
  if (typeof window !== "undefined") {
    sessionStorage.removeItem(ACTIVE_SESSION_KEY);
    localStorage.removeItem(ACTIVE_SESSION_KEY);
  }
  notifyAuthListeners(null);
}
