import { getAdminStorage } from '@/shared/lib/firebase/admin';
import { getCurrentUser } from '@/shared/lib/firebase/server-auth';
import {
  checkMatricNumberEligibility,
  registerMatricNumber,
  updateUserSubscription,
} from '@/shared/lib/paystack/db';
import { apiError, apiSuccess } from '@/shared/lib/rebuild/api/responses';
import { AuthenticationError, ConfigurationError, ValidationError } from '@/shared/lib/rebuild/errors';

const MAX_VERIFICATION_FILE_SIZE = 5 * 1024 * 1024;

function readStringFormField(formData: FormData, field: string): string {
  const value = formData.get(field);
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new ValidationError(`${field} is required`);
  }
  return value.trim();
}

export async function POST(request: Request): Promise<Response> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new AuthenticationError('Authentication required');
    }

    const formData = await request.formData();
    const institution = readStringFormField(formData, 'institution');
    const matricField = formData.get('matric_number') ?? formData.get('matricNumber');
    if (typeof matricField !== 'string' || matricField.trim().length === 0) {
      throw new ValidationError('matric_number is required');
    }
    const matricNumber = matricField.trim();
    const media = formData.get('media');

    if (!(media instanceof File)) {
      throw new ValidationError('Verification media is required');
    }

    if (media.size > MAX_VERIFICATION_FILE_SIZE) {
      throw new ValidationError('Verification media must be 5MB or smaller');
    }

    const eligibility = await checkMatricNumberEligibility(institution, matricNumber);
    if (!eligibility.eligible && eligibility.userId !== user.uid) {
      throw new ValidationError('This matric number is already in use by another account.');
    }

    const storage = getAdminStorage();
    if (!storage) {
      throw new ConfigurationError('Storage is not configured');
    }

    const bucket = storage.bucket();
    const fileExtension = media.name.split('.').pop()?.toLowerCase() ?? 'jpg';
    const fileName = `verifications/${user.uid}_${Date.now()}.${fileExtension}`;
    const fileRef = bucket.file(fileName);
    const buffer = Buffer.from(await media.arrayBuffer());

    await fileRef.save(buffer, {
      metadata: { contentType: media.type || 'application/octet-stream' },
      public: true,
    });

    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
    const subscriptionUpdated = await updateUserSubscription(user.uid, {
      institution,
      matric_number: matricNumber,
      verification_status: 'pending',
      verification_media_url: publicUrl,
      verification_submitted_at: new Date(),
    });

    if (!subscriptionUpdated) {
      throw new ConfigurationError('Failed to persist verification submission');
    }

    const matricRegistered = await registerMatricNumber(institution, matricNumber, user.uid);
    if (!matricRegistered) {
      throw new ConfigurationError('Failed to register matric number');
    }

    return apiSuccess({
      submitted: true,
      status: 'pending',
      message: 'Verification submitted successfully. An admin will review it shortly.',
    });
  } catch (error) {
    return apiError(error);
  }
}
