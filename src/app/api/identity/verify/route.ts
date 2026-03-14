import { NextRequest } from 'next/server';

import { withAuth, errorResponse, successResponse, StatusCodes } from '@/shared/lib/api/auth';
import { getAdminStorage } from '@/shared/lib/firebase/admin';
import {
  updateUserSubscription,
  registerMatricNumber,
  checkMatricNumberEligibility,
} from '@/shared/lib/paystack/db';

export const POST = withAuth(async (request, { userId }) => {
  try {
    const formData = await request.formData();
    const institution = formData.get('institution') as string;
    const matricNumber = formData.get('matricNumber') as string;
    const file = formData.get('media') as File;

    if (!institution || !matricNumber || !file) {
      return errorResponse(
        'Institution, matric number, and verification media are required',
        StatusCodes.BAD_REQUEST,
      );
    }

    // 1. Check eligibility again (just in case)
    const eligibility = await checkMatricNumberEligibility(institution, matricNumber);
    if (!eligibility.eligible && eligibility.userId !== userId) {
      return errorResponse(
        'This matric number is already in use by another account.',
        StatusCodes.BAD_REQUEST,
      );
    }

    // 2. Upload file to Firebase Storage
    const storage = getAdminStorage();
    if (!storage) {
      return errorResponse('Storage not configured', StatusCodes.INTERNAL_ERROR);
    }

    const bucket = storage.bucket();
    // Use a public or restricted bucket depending on config. Assuming default bucket.
    // In production, you might want a private path.
    const fileExtension = file.name.split('.').pop();
    const fileName = `verifications/${userId}_${Date.now()}.${fileExtension}`;
    const fileRef = bucket.file(fileName);

    const buffer = Buffer.from(await file.arrayBuffer());
    await fileRef.save(buffer, {
      metadata: { contentType: file.type },
      public: true, // For simplicity in this demo, but should be handled securely
    });

    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;

    // 3. Update user doc
    await updateUserSubscription(userId, {
      institution,
      matric_number: matricNumber,
      verification_status: 'pending',
      verification_media_url: publicUrl,
      verification_submitted_at: new Date(),
    });

    // 4. Register matric number to prevent others from using it
    await registerMatricNumber(institution, matricNumber, userId);

    return successResponse({
      success: true,
      message: 'Verification submitted successfully. An admin will review it shortly.',
      status: 'pending',
    });
  } catch (err) {
    console.error('Verification submission error:', err);
    return errorResponse('Failed to submit verification', StatusCodes.INTERNAL_ERROR);
  }
});
