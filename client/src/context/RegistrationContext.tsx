import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import i18n from '../i18n';
import { api, ApiError } from '../lib/api';
import { MAX_IMAGE_BYTES, MAX_PDF_BYTES, ACCEPTED_FILE_TYPES, type DocCategory } from '../lib/constants';
import { uid } from '../lib/utils';

export interface OwnerDraft {
  fullName: string;
  mobile: string;
  email: string;
  language: string;
  consent: boolean;
  mobileVerified: boolean;
  /** Mobile number that was actually verified by the backend (if any). */
  verifiedMobile?: string;
  photoDataUrl: string;
}

export interface BusinessDraft {
  legalName: string;
  displayName: string;
  category: string;
  type: string;
  structure: string;
  gstStatus: string;
  gstin: string;
  licenseType: string;
  licenseNumber: string;
  sameAsOwner: boolean;
  contactEmail: string;
  contactPhone: string;
}

export interface LocationDraft {
  country: string;
  state: string;
  city: string;
  locality: string;
  pincode: string;
  street: string;
  landmark: string;
  lat: number | null;
  lng: number | null;
}

export interface DraftDocument {
  id: string;
  serverId?: string;
  category: DocCategory;
  name: string;
  size: number;
  type: string;
  status: 'local' | 'uploading' | 'done' | 'error';
  progress: number;
}

export interface RegistrationDraft {
  owner: OwnerDraft;
  business: BusinessDraft;
  location: LocationDraft;
  documents: DraftDocument[];
  declarations: { d1: boolean; d2: boolean };
}

export interface ApplicationSummary {
  id: string;
  refId: string;
  status: string;
  submittedAt?: string | null;
  createdAt?: string;
  activationToken?: string | null;
}

const STORAGE_KEY = 'vyaparai_draft_v1';

function emptyDraft(): RegistrationDraft {
  return {
    owner: {
      fullName: '',
      mobile: '',
      email: '',
      language: i18n.language || 'hi',
      consent: false,
      mobileVerified: false,
      photoDataUrl: '',
    },
    business: {
      legalName: '',
      displayName: '',
      category: '',
      type: 'retail',
      structure: 'proprietorship',
      gstStatus: '',
      gstin: '',
      licenseType: '',
      licenseNumber: '',
      sameAsOwner: true,
      contactEmail: '',
      contactPhone: '',
    },
    location: {
      country: 'India',
      state: '',
      city: '',
      locality: '',
      pincode: '',
      street: '',
      landmark: '',
      lat: null,
      lng: null,
    },
    documents: [],
    declarations: { d1: false, d2: false },
  };
}

interface PersistedState {
  draft: RegistrationDraft;
  applicationId: string | null;
  refId: string | null;
  status: string | null;
}

interface RegistrationContextValue {
  draft: RegistrationDraft;
  applicationId: string | null;
  refId: string | null;
  status: string | null;
  hydrated: boolean;
  saving: boolean;
  patchDraft: (updater: (draft: RegistrationDraft) => RegistrationDraft) => void;
  saveDraft: (silent?: boolean) => void;
  ensureApplication: () => Promise<ApplicationSummary>;
  loadApplication: (id: string) => Promise<ApplicationSummary & { documents?: unknown[] }>;
  uploadDocument: (file: File, category: DocCategory) => Promise<void>;
  removeDocument: (localId: string) => Promise<void>;
  submitApplication: () => Promise<ApplicationSummary>;
  resetAll: () => void;
}

const RegistrationContext = createContext<RegistrationContextValue | null>(null);

function loadPersisted(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PersistedState>;
      if (parsed.draft && typeof parsed.draft === 'object') {
        const base = emptyDraft();
        return {
          draft: {
            owner: { ...base.owner, ...parsed.draft.owner },
            business: { ...base.business, ...parsed.draft.business },
            location: { ...base.location, ...parsed.draft.location },
            documents: Array.isArray(parsed.draft.documents) ? parsed.draft.documents : [],
            declarations: { ...base.declarations, ...parsed.draft.declarations },
          },
          applicationId: parsed.applicationId ?? null,
          refId: parsed.refId ?? null,
          status: parsed.status ?? null,
        };
      }
    }
  } catch {
    /* corrupted draft — start fresh */
  }
  const base = emptyDraft();
  return { draft: base, applicationId: null, refId: null, status: null };
}

export function RegistrationProvider({ children }: { children: ReactNode }) {
  const initial = useRef(loadPersisted());
  const [draft, setDraft] = useState<RegistrationDraft>(initial.current.draft);
  const [applicationId, setApplicationId] = useState<string | null>(initial.current.applicationId);
  const [refId, setRefId] = useState<string | null>(initial.current.refId);
  const [status, setStatus] = useState<string | null>(initial.current.status);
  const [hydrated, setHydrated] = useState(false);
  const [saving, setSaving] = useState(false);
  const files = useRef<Map<string, File>>(new Map());

  const persist = useCallback((state: PersistedState) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* quota exceeded / private mode — in-memory only */
    }
  }, []);

  const patchDraft = useCallback(
    (updater: (draft: RegistrationDraft) => RegistrationDraft) => {
      setDraft((current) => {
        const next = updater(current);
        // File objects must not be serialised.
        const serialisable: RegistrationDraft = {
          ...next,
          documents: next.documents.filter((doc) => doc.status === 'done' || doc.serverId),
        };
        persist({ draft: serialisable, applicationId, refId, status });
        return next;
      });
    },
    [applicationId, refId, status, persist],
  );

  const saveDraft = useCallback(
    (silent = false) => {
      setSaving(true);
      persist({ draft, applicationId, refId, status });
      window.setTimeout(() => setSaving(false), 350);
      if (!silent) {
        window.dispatchEvent(new CustomEvent('vyaparai:draft-saved'));
      }
    },
    [draft, applicationId, refId, status, persist],
  );

  // Restore flag after mount (avoids SSR/hydration style mismatch — here just ordering).
  useEffect(() => {
    setHydrated(true);
  }, []);

  /** Create the server-side draft application if it does not exist yet. */
  const ensureApplication = useCallback(async (): Promise<ApplicationSummary> => {
    if (applicationId && refId) {
      return { id: applicationId, refId, status: status ?? 'draft' };
    }
    const res = await api.post<{ application: ApplicationSummary }>('/api/business/applications', {
      owner: draft.owner,
      business: draft.business,
      location: draft.location,
      language: draft.owner.language,
    });
    const app = res.application;
    setApplicationId(app.id);
    setRefId(app.refId);
    setStatus(app.status);
    persist({ draft, applicationId: app.id, refId: app.refId, status: app.status });
    return app;
  }, [applicationId, refId, status, draft, persist]);

  const loadApplication = useCallback(
    async (id: string) => {
      const res = await api.get<ApplicationSummary & { documents?: unknown[]; owner?: unknown; business?: unknown; location?: unknown }>(
        `/api/business/applications/${encodeURIComponent(id)}`,
      );
      setApplicationId(res.id);
      setRefId(res.refId);
      setStatus(res.status);
      persist({ draft, applicationId: res.id, refId: res.refId, status: res.status });
      return res;
    },
    [draft, persist],
  );

  const uploadDocument = useCallback(
    async (file: File, category: DocCategory) => {
      const isPdf = file.type === 'application/pdf';
      const limit = isPdf ? MAX_PDF_BYTES : MAX_IMAGE_BYTES;
      if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
        throw new ApiError(400, 'file_type', 'Unsupported file type');
      }
      if (file.size > limit) {
        throw new ApiError(400, 'file_too_large', 'File too large');
      }

      const localId = uid('doc');
      patchDraft((current) => ({
        ...current,
        documents: [
          ...current.documents,
          {
            id: localId,
            category,
            name: file.name,
            size: file.size,
            type: file.type,
            status: 'uploading',
            progress: 0,
          },
        ],
      }));
      files.current.set(localId, file);

      try {
        const app = await ensureApplication();
        const formData = new FormData();
        formData.append('category', category);
        formData.append('file', file, file.name);

        const res = await api.upload<{ document: { id: string } }>(
          `/api/business/applications/${encodeURIComponent(app.id)}/documents`,
          formData,
          (percent) => {
            patchDraft((current) => ({
              ...current,
              documents: current.documents.map((doc) =>
                doc.id === localId ? { ...doc, progress: percent } : doc,
              ),
            }));
          },
        );

        patchDraft((current) => ({
          ...current,
          documents: current.documents.map((doc) =>
            doc.id === localId
              ? { ...doc, status: 'done', progress: 100, serverId: res.document.id }
              : doc,
          ),
        }));
      } catch (err) {
        patchDraft((current) => ({
          ...current,
          documents: current.documents.map((doc) =>
            doc.id === localId ? { ...doc, status: 'error', progress: 0 } : doc,
          ),
        }));
        throw err;
      } finally {
        files.current.delete(localId);
      }
    },
    [patchDraft, ensureApplication],
  );

  const removeDocument = useCallback(
    async (localId: string) => {
      const doc = draft.documents.find((d) => d.id === localId);
      patchDraft((current) => ({
        ...current,
        documents: current.documents.filter((d) => d.id !== localId),
      }));
      if (doc?.serverId && applicationId) {
        try {
          await api.del(
            `/api/business/applications/${encodeURIComponent(applicationId)}/documents/${doc.serverId}`,
          );
        } catch {
          /* already gone or not authorised — local list stays consistent */
        }
      }
    },
    [draft.documents, applicationId, patchDraft],
  );

  const submitApplication = useCallback(async (): Promise<ApplicationSummary> => {
    const app = await ensureApplication();
    const res = await api.post<{ application: ApplicationSummary }>(
      `/api/business/applications/${encodeURIComponent(app.id)}/submit`,
      {
        owner: draft.owner,
        business: draft.business,
        location: draft.location,
        documents: draft.documents.filter((d) => d.status === 'done').map((d) => d.serverId),
        declarations: draft.declarations,
      },
    );
    const summary = res.application;
    setApplicationId(summary.id);
    setRefId(summary.refId);
    setStatus(summary.status);
    persist({ draft, applicationId: summary.id, refId: summary.refId, status: summary.status });
    return summary;
  }, [ensureApplication, draft, persist]);

  const resetAll = useCallback(() => {
    const fresh = emptyDraft();
    setDraft(fresh);
    setApplicationId(null);
    setRefId(null);
    setStatus(null);
    files.current.clear();
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo<RegistrationContextValue>(
    () => ({
      draft,
      applicationId,
      refId,
      status,
      hydrated,
      saving,
      patchDraft,
      saveDraft,
      ensureApplication,
      loadApplication,
      uploadDocument,
      removeDocument,
      submitApplication,
      resetAll,
    }),
    [
      draft,
      applicationId,
      refId,
      status,
      hydrated,
      saving,
      patchDraft,
      saveDraft,
      ensureApplication,
      loadApplication,
      uploadDocument,
      removeDocument,
      submitApplication,
      resetAll,
    ],
  );

  return <RegistrationContext.Provider value={value}>{children}</RegistrationContext.Provider>;
}

export function useRegistration(): RegistrationContextValue {
  const ctx = useContext(RegistrationContext);
  if (!ctx) throw new Error('useRegistration must be used inside RegistrationProvider');
  return ctx;
}
