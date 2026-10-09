import crypto from 'node:crypto';
import mongoose from 'mongoose';
import config from './config.js';
import { memory } from './store.js';

let connected = false;

export async function connectDb() {
  if (!config.mongoUri) {
    console.warn('[db] MONGODB_URI not set — running with in-memory demo storage.');
    return false;
  }
  try {
    await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 4000 });
    connected = true;
    console.log('[db] Connected to MongoDB.');
  } catch (error) {
    console.warn(`[db] MongoDB unavailable (${error.message}) — falling back to in-memory demo storage.`);
    connected = false;
  }
  return connected;
}

export function isMongo() {
  return connected;
}

/* ------------------------------------------------------------------ *
 * Data layer. Every function works with either MongoDB (Mongoose) or  *
 * the in-memory demo store and returns plain serialisable objects.    *
 * ------------------------------------------------------------------ */

const oid = (value) => (value && typeof value === 'object' && '_id' in value ? String(value._id) : String(value ?? ''));

export function serializeUser(user) {
  if (!user) return null;
  const id = user.id ?? oid(user);
  return {
    id,
    userId: user.userId,
    name: user.name,
    email: user.email ?? '',
    mobile: user.mobile ?? '',
    language: user.language ?? 'hi',
    accountStatus: user.accountStatus ?? 'pending_verification',
    role: user.role ?? 'owner',
    createdAt: user.createdAt ?? null,
  };
}

function serializeBusiness(business) {
  if (!business) return null;
  return {
    legalName: business.legalName ?? '',
    displayName: business.displayName ?? '',
    category: business.category ?? '',
    type: business.type ?? '',
    structure: business.structure ?? '',
    gstStatus: business.gstStatus ?? '',
    gstin: business.gstin ?? '',
    licenseType: business.licenseType ?? '',
    licenseNumber: business.licenseNumber ?? '',
    businessEmail: business.businessEmail ?? '',
    businessPhone: business.businessPhone ?? '',
    address: business.address ?? {},
    coordinates: business.coordinates ?? { lat: null, lng: null },
    verificationStatus: business.verificationStatus ?? 'draft',
  };
}

export function serializeDocument(document) {
  if (!document) return null;
  return {
    id: document.id ?? oid(document),
    category: document.category,
    name: document.originalName,
    size: document.size,
    mimeType: document.mimeType,
    reviewStatus: document.reviewStatus ?? 'pending',
    uploadedAt: document.uploadedAt ?? document.createdAt ?? null,
  };
}

export function serializeApplication(application, documents = [], business = null, owner = null) {
  if (!application) return null;
  const biz = business ?? application.businessSnapshot ?? null;
  return {
    id: application.id ?? oid(application),
    refId: application.refId,
    status: application.status,
    ownerId: application.ownerId ?? (application.owner ? String(application.owner) : null),
    createdAt: application.createdAt ?? null,
    updatedAt: application.updatedAt ?? null,
    submittedAt: application.submittedAt ?? null,
    additionalInfo: application.additionalInfo ?? null,
    declarations: application.declarations ?? { d1: false, d2: false },
    reviewHistory: application.reviewHistory ?? [],
    owner: owner
      ? { fullName: owner.name, email: owner.email, mobile: owner.mobile }
      : (application.ownerSummary ?? null),
    business: biz
      ? {
          displayName: biz.displayName,
          gstStatus: biz.gstStatus,
          category: biz.category,
          type: biz.type,
          structure: biz.structure,
        }
      : null,
    location: application.locationSnapshot ?? null,
    documents: documents.map(serializeDocument),
  };
}

/* ------------------------------ users ---------------------------------- */

export async function findUserByIdentifier(identifier) {
  const value = String(identifier || '').trim().toLowerCase();
  if (isMongo()) {
    const { User } = await import('./models.js');
    return User.findOne({
      $or: [{ email: value }, { mobile: value }, { userId: identifier }],
    }).lean();
  }
  return (
    memory.users.find(
      (user) =>
        (user.email && user.email.toLowerCase() === value) ||
        (user.mobile && user.mobile === String(identifier).trim()) ||
        user.userId === identifier,
    ) ?? null
  );
}

export async function findUserById(id) {
  if (!id) return null;
  if (isMongo()) {
    if (!mongoose.isValidObjectId(id)) return null;
    const { User } = await import('./models.js');
    return User.findById(id).lean();
  }
  return memory.users.find((user) => user.id === id) ?? null;
}

export async function findUserByEmailOrMobile(email, mobile) {
  if (isMongo()) {
    const { User } = await import('./models.js');
    return User.findOne({ $or: [{ email }, { mobile }] }).lean();
  }
  return (
    memory.users.find(
      (user) =>
        (email && user.email === email) || (mobile && user.mobile === mobile),
    ) ?? null
  );
}

export async function createUser(data) {
  if (isMongo()) {
    const { User } = await import('./models.js');
    const created = await User.create(data);
    return created.toObject();
  }
  const user = {
    id: crypto.randomUUID(),
    verifiedMobiles: [],
    accountStatus: 'pending_verification',
    role: 'owner',
    language: 'hi',
    passwordHash: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...data,
  };
  memory.users.push(user);
  return user;
}

export async function updateUser(id, patch) {
  if (isMongo()) {
    const { User } = await import('./models.js');
    if (!mongoose.isValidObjectId(id)) return null;
    return User.findByIdAndUpdate(id, { $set: patch }, { new: true }).lean();
  }
  const user = memory.users.find((entry) => entry.id === id);
  if (!user) return null;
  Object.assign(user, patch, { updatedAt: new Date().toISOString() });
  return user;
}

/* --------------------------- businesses --------------------------------- */

export async function createBusiness(data) {
  if (isMongo()) {
    const { Business } = await import('./models.js');
    const created = await Business.create(data);
    return created.toObject();
  }
  const business = {
    id: crypto.randomUUID(),
    verificationStatus: 'draft',
    coordinates: { lat: null, lng: null },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...data,
  };
  memory.businesses.push(business);
  return business;
}

export async function updateBusiness(id, patch) {
  if (isMongo()) {
    const { Business } = await import('./models.js');
    if (!mongoose.isValidObjectId(id)) return null;
    return Business.findByIdAndUpdate(id, { $set: patch }, { new: true }).lean();
  }
  const business = memory.businesses.find((entry) => entry.id === id);
  if (!business) return null;
  Object.assign(business, patch, { updatedAt: new Date().toISOString() });
  return business;
}

export async function getBusinessById(id) {
  if (!id) return null;
  if (isMongo()) {
    const { Business } = await import('./models.js');
    if (!mongoose.isValidObjectId(id)) return null;
    return Business.findById(id).lean();
  }
  return memory.businesses.find((entry) => entry.id === id) ?? null;
}

/* --------------------------- applications -------------------------------- */

export async function createApplication(data) {
  if (isMongo()) {
    const { RegistrationApplication } = await import('./models.js');
    const created = await RegistrationApplication.create(data);
    return created.toObject();
  }
  const application = {
    id: crypto.randomUUID(),
    status: 'draft',
    reviewHistory: [],
    submittedAt: null,
    additionalInfo: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...data,
  };
  memory.applications.push(application);
  return application;
}

export async function getApplicationById(id) {
  if (!id) return null;
  if (isMongo()) {
    const { RegistrationApplication } = await import('./models.js');
    if (!mongoose.isValidObjectId(id)) return null;
    return RegistrationApplication.findById(id).lean();
  }
  return memory.applications.find((entry) => entry.id === id) ?? null;
}

/** Accepts either the Mongo id or the human-facing reference id. */
export async function getApplicationByIdOrRef(idOrRef) {
  const direct = await getApplicationById(idOrRef);
  if (direct) return direct;
  if (isMongo()) {
    const { RegistrationApplication } = await import('./models.js');
    return RegistrationApplication.findOne({ refId: idOrRef }).lean();
  }
  return memory.applications.find((entry) => entry.refId === idOrRef) ?? null;
}

export async function updateApplication(id, patch) {
  if (isMongo()) {
    const { RegistrationApplication } = await import('./models.js');
    if (!mongoose.isValidObjectId(id)) return null;
    return RegistrationApplication.findByIdAndUpdate(id, { $set: patch }, { new: true }).lean();
  }
  const application = memory.applications.find((entry) => entry.id === id);
  if (!application) return null;
  Object.assign(application, patch, { updatedAt: new Date().toISOString() });
  return application;
}

/* ----------------------------- documents --------------------------------- */

export async function createDocument(data) {
  if (isMongo()) {
    const { BusinessDocument } = await import('./models.js');
    const created = await BusinessDocument.create(data);
    return created.toObject();
  }
  const document = {
    id: crypto.randomUUID(),
    reviewStatus: 'pending',
    uploadedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    ...data,
  };
  memory.documents.push(document);
  return document;
}

export async function listDocuments(applicationId) {
  if (isMongo()) {
    const { BusinessDocument } = await import('./models.js');
    if (!mongoose.isValidObjectId(applicationId)) return [];
    return BusinessDocument.find({ application: applicationId }).lean();
  }
  return memory.documents.filter((document) => String(document.application) === String(applicationId));
}

export async function getDocument(documentId) {
  if (!documentId) return null;
  if (isMongo()) {
    const { BusinessDocument } = await import('./models.js');
    if (!mongoose.isValidObjectId(documentId)) return null;
    return BusinessDocument.findById(documentId).lean();
  }
  return memory.documents.find((document) => document.id === documentId) ?? null;
}

export async function deleteDocument(documentId) {
  if (isMongo()) {
    const { BusinessDocument } = await import('./models.js');
    if (!mongoose.isValidObjectId(documentId)) return false;
    const result = await BusinessDocument.findByIdAndDelete(documentId);
    return Boolean(result);
  }
  const index = memory.documents.findIndex((document) => document.id === documentId);
  if (index === -1) return false;
  memory.documents.splice(index, 1);
  return true;
}
