import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import config from '../config.js';
import {
  ApiError,
  asyncHandler,
  notFound,
  setCookie,
  validate,
} from '../middleware.js';
import { hashToken, newRefId, randomToken, createSingleUseToken, verifiedMobiles, demoActivationTokens } from '../store.js';
import {
  createApplication,
  createBusiness,
  createUser,
  deleteDocument,
  findUserById,
  findUserByIdentifier,
  getApplicationByIdOrRef,
  getBusinessById,
  getDocument,
  listDocuments,
  serializeApplication,
  updateApplication,
  updateBusiness,
  updateUser,
  createDocument,
} from '../db.js';
import { newUserId } from '../store.js';

export const businessRouter = Router();

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const MAX_IMAGE = 5 * 1024 * 1024;
const MAX_PDF = 10 * 1024 * 1024;

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).slice(0, 10).replace(/[^.a-z0-9]/gi, '');
    cb(null, `${crypto.randomBytes(18).toString('hex')}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_PDF, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!ACCEPTED_TYPES.includes(file.mimetype)) {
      return cb(new ApiError(400, 'file_type', 'Unsupported file type'));
    }
    const limit = file.mimetype === 'application/pdf' ? MAX_PDF : MAX_IMAGE;
    if (file.size && file.size > limit) {
      return cb(new ApiError(400, 'file_too_large', 'File too large'));
    }
    cb(null, true);
  },
});

/* ------------------------------ schemas --------------------------------- */

const mobileSchema = z.string().trim().regex(/^[6-9]\d{9}$/, 'Invalid mobile number');
const emailSchema = z.string().trim().email('Invalid email');

const ownerSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  mobile: mobileSchema,
  email: emailSchema,
  language: z.enum(['en', 'hi', 'bho', 'awa', 'ur']).default('hi'),
  consent: z.boolean().optional(),
  mobileVerified: z.boolean().optional(),
  photoDataUrl: z.string().max(1_500_000).optional(),
});

const businessSchema = z.object({
  legalName: z.string().max(200).optional(),
  displayName: z.string().max(200).optional(),
  category: z.string().max(80).optional(),
  type: z.string().max(60).optional(),
  structure: z.string().max(60).optional(),
  gstStatus: z.enum(['registered', 'notRegistered', 'notApplicable', '']).optional(),
  gstin: z.string().max(20).optional(),
  licenseType: z.string().max(80).optional(),
  licenseNumber: z.string().max(80).optional(),
  sameAsOwner: z.boolean().optional(),
  contactEmail: z.string().max(120).optional(),
  contactPhone: z.string().max(20).optional(),
});

const locationSchema = z.object({
  country: z.string().max(60).optional(),
  state: z.string().max(80).optional(),
  city: z.string().max(120).optional(),
  locality: z.string().max(160).optional(),
  pincode: z.string().max(10).optional(),
  street: z.string().max(300).optional(),
  landmark: z.string().max(200).optional(),
  lat: z.number().nullable().optional(),
  lng: z.number().nullable().optional(),
});

const createApplicationSchema = z.object({
  owner: ownerSchema,
  business: businessSchema.partial().default({}),
  location: locationSchema.partial().default({}),
  language: z.enum(['en', 'hi', 'bho', 'awa', 'ur']).optional(),
});

/* --------------------------- access control ------------------------------ */

async function loadApplication(req) {
  const application = await getApplicationByIdOrRef(req.params.id);
  if (!application) throw notFound('Application not found');

  const ownerId = application.owner ? String(application.owner) : application.ownerId ?? null;
  const sessionOwner =
    req.user && ownerId && String(req.user.id ?? req.user._id) === String(ownerId);

  const draftToken = req.cookies?.vyaparai_draft;
  const draftOwner =
    draftToken && application.draftTokenHash && hashToken(draftToken) === application.draftTokenHash;

  if (!sessionOwner && !draftOwner) {
    throw new ApiError(403, 'forbidden', 'Not authorised to view this application');
  }
  return application;
}

async function applicationPayload(application, { includeToken = false } = {}) {
  const documents = await listDocuments(application.id ?? application._id);
  const owner = application.owner ? await findUserById(application.owner) : null;
  const payload = serializeApplication(application, documents, application.businessSnapshot, owner);
  const appId = String(application.id ?? application._id);
  if (includeToken && config.demoMode && demoActivationTokens.has(appId)) {
    payload.activationToken = demoActivationTokens.get(appId);
  }
  return payload;
}

/* ---------------------------- create (draft) ------------------------------ */

businessRouter.post(
  '/applications',
  asyncHandler(async (req, res) => {
    const body = validate(req, createApplicationSchema);

    // Pending owner account (no password until activation).
    let user = await findUserByIdentifier(body.owner.email);
    const byMobile = await findUserByIdentifier(body.owner.mobile);
    if (!user && byMobile && byMobile.email && byMobile.email !== body.owner.email) {
      throw new ApiError(409, 'duplicate_mobile', 'Mobile already registered');
    }
    if (!user) user = byMobile;
    if (!user) {
      user = await createUser({
        userId: newUserId(),
        name: body.owner.fullName,
        email: body.owner.email,
        mobile: body.owner.mobile,
        language: body.owner.language,
        accountStatus: 'pending_verification',
        role: 'owner',
        passwordHash: null,
      });
    }

    const business = await createBusiness({
      owner: user.id ?? user._id,
      ...body.business,
      address: {
        country: body.location.country ?? 'India',
        state: body.location.state ?? '',
        city: body.location.city ?? '',
        locality: body.location.locality ?? '',
        pincode: body.location.pincode ?? '',
        street: body.location.street ?? '',
        landmark: body.location.landmark ?? '',
      },
      coordinates: { lat: body.location.lat ?? null, lng: body.location.lng ?? null },
      verificationStatus: 'draft',
    });

    const draftToken = randomToken();
    const application = await createApplication({
      refId: newRefId(),
      owner: user.id ?? user._id,
      business: business.id ?? business._id,
      language: body.language ?? body.owner.language,
      status: 'draft',
      submittedAt: null,
      additionalInfo: null,
      reviewHistory: [{ status: 'draft', at: new Date(), note: 'Draft created', by: 'system' }],
      declarations: { d1: false, d2: false },
      activation: { tokenHash: null, expiresAt: null, usedAt: null },
      draftTokenHash: hashToken(draftToken),
      demo: config.demoMode,
      ownerSummary: {
        name: body.owner.fullName,
        email: body.owner.email,
        mobile: body.owner.mobile,
        language: body.owner.language,
        consent: Boolean(body.owner.consent),
        mobileVerified: Boolean(body.owner.mobileVerified),
        photoDataUrl: body.owner.photoDataUrl ?? '',
      },
      businessSnapshot: { ...body.business },
      locationSnapshot: { country: 'India', ...body.location },
    });

    setCookie(res, 'vyaparai_draft', draftToken, 7 * 24 * 60 * 60 * 1000);

    res.status(201).json({ application: await applicationPayload(application) });
  }),
);

/* ------------------------------- read / update ---------------------------- */

businessRouter.get(
  '/applications/:id',
  asyncHandler(async (req, res) => {
    const application = await loadApplication(req);
    res.json({ application: await applicationPayload(application) });
  }),
);

businessRouter.get(
  '/applications/:id/status',
  asyncHandler(async (req, res) => {
    const application = await loadApplication(req);
    res.json({ application: await applicationPayload(application, { includeToken: true }) });
  }),
);

businessRouter.patch(
  '/applications/:id',
  asyncHandler(async (req, res) => {
    const application = await loadApplication(req);
    if (application.status !== 'draft') {
      throw new ApiError(409, 'application_locked', 'Application already submitted');
    }

    const body = validate(req, 
      z.object({
        owner: ownerSchema.partial().optional(),
        business: businessSchema.partial().optional(),
        location: locationSchema.partial().optional(),
        declarations: z.object({ d1: z.boolean(), d2: z.boolean() }).optional(),
      }),
    );

    const patch = {};
    if (body.owner) {
      const summary = { ...(application.ownerSummary ?? {}), ...body.owner };
      patch.ownerSummary = summary;
      if (summary.email && summary.mobile && summary.name) {
        await updateUser(application.owner, {
          name: summary.name,
          email: summary.email,
          mobile: summary.mobile,
          language: summary.language ?? 'hi',
        });
      }
    }
    if (body.business) {
      patch.businessSnapshot = { ...(application.businessSnapshot ?? {}), ...body.business };
      if (application.business) await updateBusiness(application.business, body.business);
    }
    if (body.location) {
      patch.locationSnapshot = { ...(application.locationSnapshot ?? {}), ...body.location };
      if (application.business) {
        await updateBusiness(application.business, {
          address: {
            country: body.location.country ?? 'India',
            state: body.location.state ?? '',
            city: body.location.city ?? '',
            locality: body.location.locality ?? '',
            pincode: body.location.pincode ?? '',
            street: body.location.street ?? '',
            landmark: body.location.landmark ?? '',
          },
          coordinates: { lat: body.location.lat ?? null, lng: body.location.lng ?? null },
        });
      }
    }
    if (body.declarations) patch.declarations = body.declarations;

    const updated = await updateApplication(application.id ?? application._id, patch);
    res.json({ application: await applicationPayload(updated) });
  }),
);

/* ------------------------------- documents -------------------------------- */

businessRouter.post(
  '/applications/:id/documents',
  (req, res, next) => {
    loadApplication(req)
      .then((application) => {
        if (application.status !== 'draft' && application.status !== 'additional') {
          throw new ApiError(409, 'application_locked', 'Application is not accepting documents');
        }
        req.application = application;
        next();
      })
      .catch(next);
  },
  (req, res, next) => {
    upload.single('file')(req, res, (error) => {
      if (error instanceof ApiError) {
        return res.status(error.status).json({ error: { code: error.code, message: error.message } });
      }
      next(error);
    });
  },
  asyncHandler(async (req, res) => {
    if (!req.file) throw new ApiError(400, 'validation_error', 'File is required');

    const category = validate(req, 
      z.enum(['shopPhoto', 'registrationCert', 'gstCert', 'licence', 'other']),
      () => req.body.category,
    );

    const application = req.application;
    const businessId = application.business;
    const document = await createDocument({
      business: businessId ?? null,
      application: application.id ?? application._id,
      category,
      storage: { provider: config.providers.storage.provider, key: req.file.filename },
      originalName: Buffer.from(req.file.originalname, 'latin1').toString('utf8'),
      mimeType: req.file.mimetype,
      size: req.file.size,
      reviewStatus: 'pending',
    });

    res.status(201).json({ document: { id: document.id ?? document._id, category } });
  }),
);

businessRouter.get(
  '/applications/:id/documents/:docId/file',
  asyncHandler(async (req, res) => {
    const application = await loadApplication(req);
    const document = await getDocument(req.params.docId);
    if (!document || String(document.application) !== String(application.id ?? application._id)) {
      throw notFound('Document not found');
    }
    const filePath = path.join(UPLOAD_DIR, path.basename(document.storage.key));
    if (!fs.existsSync(filePath)) throw notFound('File missing');

    res.setHeader('Content-Type', document.mimeType);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(document.originalName)}"`);
    res.setHeader('Cache-Control', 'private, no-store');
    fs.createReadStream(filePath).pipe(res);
  }),
);

businessRouter.delete(
  '/applications/:id/documents/:docId',
  asyncHandler(async (req, res) => {
    const application = await loadApplication(req);
    if (application.status !== 'draft' && application.status !== 'additional') {
      throw new ApiError(409, 'application_locked', 'Application already submitted');
    }
    const document = await getDocument(req.params.docId);
    if (!document || String(document.application) !== String(application.id ?? application._id)) {
      throw notFound('Document not found');
    }
    const filePath = path.join(UPLOAD_DIR, path.basename(document.storage.key));
    fs.rm(filePath, { force: true }, () => {});
    await deleteDocument(document.id ?? document._id);
    res.json({ ok: true });
  }),
);

/* -------------------------------- submit ----------------------------------- */

const GSTIN_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

businessRouter.post(
  '/applications/:id/submit',
  asyncHandler(async (req, res) => {
    const application = await loadApplication(req);
    if (application.status !== 'draft') {
      throw new ApiError(409, 'application_locked', 'Application already submitted');
    }

    const body = validate(req, 
      z.object({
        owner: ownerSchema.partial().optional(),
        business: businessSchema.partial().optional(),
        location: locationSchema.partial().optional(),
        documents: z.array(z.string()).optional(),
        declarations: z.object({ d1: z.boolean(), d2: z.boolean() }),
      }),
    );

    // Merge any final client state, then validate strictly.
    const owner = { ...(application.ownerSummary ?? {}), ...(body.owner ?? {}) };
    const business = { ...(application.businessSnapshot ?? {}), ...(body.business ?? {}) };
    const location = { ...(application.locationSnapshot ?? {}), ...(body.location ?? {}) };

    const details = {};
    const require = (condition, field, message) => {
      if (!condition) details[field] = [message];
    };

    require((owner.name ?? '').trim().length >= 2, 'owner.fullName', 'Owner name is required');
    require(/^[6-9]\d{9}$/.test(owner.mobile ?? ''), 'owner.mobile', 'Valid mobile number is required');
    require(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(owner.email ?? ''), 'owner.email', 'Valid email is required');
    require(owner.consent === true, 'owner.consent', 'Consent is required');
    require(Boolean(business.displayName), 'business.displayName', 'Business name is required');
    require(Boolean(business.category), 'business.category', 'Category is required');
    require(Boolean(business.gstStatus), 'business.gstStatus', 'GST status is required');
    if (business.gstStatus === 'registered') {
      require(GSTIN_PATTERN.test((business.gstin ?? '').toUpperCase()), 'business.gstin', 'Valid GSTIN required');
    }
    require(Boolean(location.state), 'location.state', 'State is required');
    require(Boolean(location.city), 'location.city', 'City is required');
    require(Boolean(location.locality), 'location.locality', 'Locality is required');
    require(/^\d{6}$/.test(location.pincode ?? ''), 'location.pincode', 'Valid PIN code required');
    require(Boolean(location.street), 'location.street', 'Street address is required');
    require(body.declarations.d1 === true, 'declarations.d1', 'Declaration 1 is required');
    require(body.declarations.d2 === true, 'declarations.d2', 'Declaration 2 is required');

    // Documents are optional — they speed up review but nothing is forced.

    if (Object.keys(details).length > 0) {
      throw new ApiError(400, 'validation_error', 'Validation failed', details);
    }

    // Independent OTP confirmation check (never trusted from the client alone).
    const mobileOtpVerified =
      (owner.mobile && verifiedMobiles.has(owner.mobile)) ||
      (application.owner && (await findUserById(application.owner))?.verifiedMobiles?.includes(owner.mobile));
    owner.mobileVerified = Boolean(mobileOtpVerified);

    const updated = await updateApplication(application.id ?? application._id, {
      ownerSummary: owner,
      businessSnapshot: business,
      locationSnapshot: location,
      declarations: body.declarations,
      status: 'submitted',
      submittedAt: new Date(),
      reviewHistory: [
        ...(application.reviewHistory ?? []),
        { status: 'submitted', at: new Date(), note: 'Application submitted by owner', by: 'system' },
      ],
    });

    if (application.business) {
      await updateBusiness(application.business, { verificationStatus: 'submitted' });
    }

    // Demo mode: queue for "verification" shortly after submission (simulated).
    if (config.demoMode) {
      const applicationId = application.id ?? application._id;
      setTimeout(async () => {
        try {
          const current = await getApplicationByIdOrRef(applicationId);
          if (current && current.status === 'submitted') {
            await updateApplication(applicationId, {
              status: 'pending',
              reviewHistory: [
                ...(current.reviewHistory ?? []),
                {
                  status: 'pending',
                  at: new Date(),
                  note: 'DEMO — simulated queueing for verification (not an official review)',
                  by: 'demo',
                },
              ],
            });
            if (current.business) await updateBusiness(current.business, { verificationStatus: 'pending' });
          }
        } catch (error) {
          console.warn('[demo] pending transition failed:', error.message);
        }
      }, 5000);
    }

    res.json({ application: await applicationPayload(updated) });
  }),
);

/* ---------------------------- demo reviewer ------------------------------- */

businessRouter.post(
  '/applications/:id/demo-action',
  asyncHandler(async (req, res) => {
    if (!config.demoMode) throw new ApiError(404, 'not_found', 'Demo actions are disabled');

    const application = await loadApplication(req);
    const body = validate(req, 
      z.object({
        action: z.enum(['approve', 'reject', 'request_info']),
        reason: z.string().max(500).optional(),
      }),
    );

    const statusMap = { approve: 'approved', reject: 'rejected', request_info: 'additional' };
    const nextStatus = statusMap[body.action];
    const reason =
      body.reason?.trim() ||
      (nextStatus === 'additional'
        ? 'Please upload a clearer shop photograph and your latest licence.'
        : nextStatus === 'rejected'
          ? 'Documents submitted did not match the business details provided.'
          : 'Demo review completed — details accepted (simulated).');

    const patch = {
      status: nextStatus,
      additionalInfo:
        nextStatus === 'additional'
          ? { reason, requestedAt: new Date() }
          : nextStatus === 'rejected'
            ? { reason, requestedAt: new Date() }
            : null,
      reviewHistory: [
        ...(application.reviewHistory ?? []),
        {
          status: nextStatus,
          at: new Date(),
          note: `DEMO — simulated reviewer action "${body.action}": ${reason}`,
          by: 'demo',
        },
      ],
    };

    let activationToken = null;
    if (nextStatus === 'approved') {
      activationToken = createSingleUseToken(
        'activation',
        { applicationId: application.id ?? application._id },
        24 * 60 * 60 * 1000, // expiring, single-use
      );
      patch.activation = { tokenHash: hashToken(activationToken), expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), usedAt: null };
      demoActivationTokens.set(String(application.id ?? application._id), activationToken);
    }

    const updated = await updateApplication(application.id ?? application._id, patch);
    if (application.business) {
      await updateBusiness(application.business, {
        verificationStatus: nextStatus === 'additional' ? 'pending' : nextStatus,
      });
    }

    res.json({
      application: await applicationPayload(updated, { includeToken: true }),
      activationToken: config.demoMode ? activationToken : null,
      demo: true,
    });
  }),
);

export default businessRouter;
