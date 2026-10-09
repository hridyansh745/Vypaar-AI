import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const timestamps = { timestamps: true };

/* ------------------------------- User ---------------------------------- */
const userSchema = new Schema(
  {
    userId: { type: String, required: true, unique: true, index: true }, // VY-XXXXXX
    name: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true, unique: true, sparse: true },
    mobile: { type: String, trim: true, unique: true, sparse: true },
    passwordHash: { type: String, default: null },
    language: { type: String, default: 'hi', enum: ['en', 'hi', 'bho', 'awa', 'ur'] },
    accountStatus: {
      type: String,
      enum: ['pending_verification', 'active', 'suspended', 'closed'],
      default: 'pending_verification',
    },
    role: { type: String, enum: ['owner', 'reviewer', 'admin'], default: 'owner' },
    verifiedMobiles: { type: [String], default: [] },
    lastLoginAt: { type: Date, default: null },
  },
  timestamps,
);

/* ------------------------------ Business -------------------------------- */
const addressSchema = new Schema(
  {
    country: { type: String, default: 'India' },
    state: { type: String, default: '' },
    city: { type: String, default: '' },
    locality: { type: String, default: '' },
    pincode: { type: String, default: '' },
    street: { type: String, default: '' },
    landmark: { type: String, default: '' },
  },
  { _id: false },
);

const businessSchema = new Schema(
  {
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    legalName: { type: String, default: '' },
    displayName: { type: String, default: '' },
    category: { type: String, default: '' },
    type: { type: String, default: '' },
    structure: { type: String, default: '' },
    gstStatus: { type: String, enum: ['registered', 'notRegistered', 'notApplicable', ''], default: '' },
    gstin: { type: String, default: '', uppercase: true, trim: true },
    licenseType: { type: String, default: '' },
    licenseNumber: { type: String, default: '' },
    businessEmail: { type: String, default: '' },
    businessPhone: { type: String, default: '' },
    address: { type: addressSchema, default: () => ({}) },
    coordinates: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
    },
    verificationStatus: {
      type: String,
      enum: ['draft', 'submitted', 'pending', 'additional', 'approved', 'rejected'],
      default: 'draft',
    },
  },
  timestamps,
);

/* --------------------------- BusinessDocument --------------------------- */
const businessDocumentSchema = new Schema(
  {
    business: { type: Schema.Types.ObjectId, ref: 'Business', default: null },
    application: { type: Schema.Types.ObjectId, ref: 'RegistrationApplication', required: true },
    category: {
      type: String,
      enum: ['shopPhoto', 'registrationCert', 'gstCert', 'licence', 'other'],
      required: true,
    },
    storage: {
      provider: { type: String, default: 'local-private' },
      key: { type: String, required: true }, // private filename, never a public URL
    },
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    reviewStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'needs_info'],
      default: 'pending',
    },
    reviewerNotes: { type: String, default: '' },
    uploadedAt: { type: Date, default: Date.now },
  },
  timestamps,
);

/* ------------------------ RegistrationApplication ----------------------- */
const reviewEventSchema = new Schema(
  {
    status: { type: String, required: true },
    at: { type: Date, default: Date.now },
    note: { type: String, default: '' },
    by: { type: String, default: 'system' }, // 'system' | 'reviewer' | 'demo'
  },
  { _id: false },
);

const registrationApplicationSchema = new Schema(
  {
    refId: { type: String, required: true, unique: true, index: true }, // VYAPP-XXXXXXXX
    owner: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    business: { type: Schema.Types.ObjectId, ref: 'Business', default: null },
    language: { type: String, default: 'hi' },
    status: {
      type: String,
      enum: ['draft', 'submitted', 'pending', 'additional', 'approved', 'rejected'],
      default: 'draft',
      index: true,
    },
    submittedAt: { type: Date, default: null },
    additionalInfo: {
      reason: { type: String, default: '' },
      requestedAt: { type: Date, default: null },
    },
    reviewHistory: { type: [reviewEventSchema], default: [] },
    declarations: {
      d1: { type: Boolean, default: false },
      d2: { type: Boolean, default: false },
    },
    // Activation tokens are stored hashed, expiring and single-use.
    activation: {
      tokenHash: { type: String, default: null },
      expiresAt: { type: Date, default: null },
      usedAt: { type: Date, default: null },
    },
    draftTokenHash: { type: String, default: null, index: true },
    ownerSummary: { type: Schema.Types.Mixed, default: null },
    businessSnapshot: { type: Schema.Types.Mixed, default: null },
    locationSnapshot: { type: Schema.Types.Mixed, default: null },
    demo: { type: Boolean, default: false },
  },
  timestamps,
);

export const User = model('User', userSchema);
export const Business = model('Business', businessSchema);
export const BusinessDocument = model('BusinessDocument', businessDocumentSchema);
export const RegistrationApplication = model(
  'RegistrationApplication',
  registrationApplicationSchema,
);
