'use client';

// =============================================================================
// app/dashboard/settings/page.tsx
// Layer: app  →  thin page assembler
//
// FSD Rule: pure UI assembly. Only shared/ui primitives are imported.
//   Limited profile and billing actions are wired here; deeper settings flows
//   still remain intentionally constrained until the product supports them.
//
// Layout: Three tabbed sections  ─  Profile  |  Preferences  |  Billing
// =============================================================================

import { useState, useContext, useEffect } from 'react';

import { useRouter } from 'next/navigation';

import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  signOut as firebaseSignOut,
  updatePassword,
  updateProfile as updateFirebaseProfile,
} from 'firebase/auth';

import { AuthContext } from '@/context/AuthContext';

import { auth, isFirebaseConfigured } from '@/shared/lib/firebase/client';
import type {
  DeleteProfileResponse,
  PaymentHistoryResponse,
  ProfileResponse,
  UpdateProfileResponse,
  UserProfile,
} from '@/shared/types/api';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Button,
  Input,
  Textarea,
  Badge,
} from '@/shared/ui';

import { VerificationBanner } from '@/features/identity/VerificationBanner';

// ── Page metadata (ignored in client components — kept for reference) ──────
// export const metadata: Metadata = {   // cannot export from 'use client' components
//   title:       'Settings · Exam-Killer',
//   description: 'Manage your profile, preferences, and billing.',
// }

// ── Types ─────────────────────────────────────────────────────────────────
type SettingsTab = 'profile' | 'preferences' | 'billing';

const TABS: { id: SettingsTab; label: string }[] = [
  { id: 'profile', label: 'Profile' },
  { id: 'preferences', label: 'Preferences' },
  { id: 'billing', label: 'Billing' },
];

const LEVEL_OPTIONS = ['100', '200', '300', '400', '500', '600', '700'] as const;
const TUTOR_PERSONALITIES = [
  { value: 'mentor', label: 'Mentor' },
  { value: 'drill', label: 'Drill Coach' },
  { value: 'peer', label: 'Study Peer' },
  { value: 'professor', label: 'Professor' },
  { value: 'storyteller', label: 'Storyteller' },
  { value: 'coach', label: 'Coach' },
] as const;

// ── Shared actions ──────────────────────────────────────────────────────────

function SignOutButton() {
  const router = useRouter();
  const authContext = useContext(AuthContext);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (!authContext?.logout) return;
    setIsLoggingOut(true);
    try {
      await authContext.logout();
      router.push('/');
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <Button variant="secondary" size="sm" onClick={handleLogout} disabled={isLoggingOut}>
      {isLoggingOut ? 'Signing out...' : 'Sign out'}
    </Button>
  );
}

// ── Section sub-components ─────────────────────────────────────────────────

function ProfileSection() {
  const router = useRouter();
  const authContext = useContext(AuthContext);
  const user = authContext?.user;
  const subscription = authContext?.subscription;
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const fallbackDisplayName = user?.displayName || '';
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    department: '',
    level: '',
    bio: '',
    preferredTutorPersonality: 'mentor',
  });
  const [deleteEmail, setDeleteEmail] = useState('');
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [deleteCurrentPassword, setDeleteCurrentPassword] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteSuccess, setDeleteSuccess] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      try {
        const response = await fetch('/api/profile');
        const data = (await response.json()) as ProfileResponse & { error?: string };

        if (!response.ok) {
          throw new Error(data.error || 'Failed to load profile');
        }

        if (isMounted) {
          setProfile(data.profile);
          const nameParts = (data.profile.full_name || fallbackDisplayName)
            .trim()
            .split(/\s+/)
            .filter(Boolean);
          setFormData({
            firstName: nameParts[0] ?? '',
            lastName: nameParts.slice(1).join(' '),
            department: data.profile.department ?? '',
            level: data.profile.level ? String(data.profile.level) : '',
            bio: data.profile.bio ?? '',
            preferredTutorPersonality: data.profile.preferred_tutor_personality ?? 'mentor',
          });
        }
      } catch (error) {
        console.error('Failed to load profile:', error);
      } finally {
        if (isMounted) {
          setProfileLoading(false);
        }
      }
    };

    void loadProfile();

    return () => {
      isMounted = false;
    };
  }, [fallbackDisplayName]);

  const fullName = profile?.full_name || user?.displayName || '';
  const [firstName = '', ...restNameParts] = fullName.trim().split(/\s+/).filter(Boolean);
  const lastName = restNameParts.join(' ');
  const initials =
    (formData.firstName || formData.lastName
      ? `${formData.firstName} ${formData.lastName}`.trim()
      : fullName
    )
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || 'U';
  const profileEmail = profile?.email || user?.email || '';
  const canReset =
    formData.firstName !== firstName ||
    formData.lastName !== lastName ||
    formData.department !== (profile?.department ?? '') ||
    formData.level !== (profile?.level ? String(profile.level) : '') ||
    formData.bio !== (profile?.bio ?? '') ||
    formData.preferredTutorPersonality !== (profile?.preferred_tutor_personality ?? 'mentor');

  const handleFieldChange = (field: keyof typeof formData, value: string) => {
    setSaveError(null);
    setSaveSuccess(null);
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const handleReset = () => {
    setSaveError(null);
    setSaveSuccess(null);
    setFormData({
      firstName,
      lastName,
      department: profile?.department ?? '',
      level: profile?.level ? String(profile.level) : '',
      bio: profile?.bio ?? '',
      preferredTutorPersonality: profile?.preferred_tutor_personality ?? 'mentor',
    });
  };

  const handleSave = async () => {
    const mergedName = `${formData.firstName} ${formData.lastName}`.trim();

    if (!mergedName) {
      setSaveError('Enter at least a first or last name before saving.');
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(null);

    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: mergedName,
          department: formData.department.trim(),
          level: formData.level ? Number(formData.level) : null,
          bio: formData.bio.trim() || null,
          preferred_tutor_personality: formData.preferredTutorPersonality,
        }),
      });
      const data = (await response.json()) as UpdateProfileResponse & { error?: string };

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update profile');
      }

      if (user) {
        await updateFirebaseProfile(user, { displayName: mergedName });
      }

      setProfile(data.profile);
      setSaveSuccess('Profile updated successfully.');
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const supportsPasswordChange =
    user?.providerData?.some((provider) => provider.providerId === 'password') ?? false;

  const handleDeleteAccount = async () => {
    if (!user?.email) {
      setDeleteError('No authenticated user is available.');
      return;
    }

    if (deleteEmail.trim().toLowerCase() !== user.email.toLowerCase()) {
      setDeleteError('Enter your account email exactly to continue.');
      return;
    }

    if (deleteConfirmationText.trim() !== 'DELETE MY ACCOUNT') {
      setDeleteError('Type DELETE MY ACCOUNT to confirm permanent deletion.');
      return;
    }

    setDeleteError(null);
    setDeleteSuccess(null);
    setIsDeleting(true);

    try {
      if (supportsPasswordChange) {
        if (!deleteCurrentPassword) {
          throw new Error('Enter your current password before deleting your account.');
        }

        const credential = EmailAuthProvider.credential(user.email, deleteCurrentPassword);
        await reauthenticateWithCredential(user, credential);
      }

      const response = await fetch('/api/profile', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: deleteEmail.trim(),
          confirmation_text: deleteConfirmationText.trim(),
        }),
      });

      const data = (await response.json()) as DeleteProfileResponse & { error?: string };

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete account');
      }

      setDeleteSuccess('Account deleted. Redirecting...');

      await fetch('/api/auth/session', { method: 'DELETE' }).catch(() => undefined);

      if (isFirebaseConfigured && auth) {
        await firebaseSignOut(auth).catch(() => undefined);
      }

      router.replace('/');
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'Failed to delete account');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Avatar row */}
      <Card>
        <CardContent style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
            {/* Avatar placeholder */}
            <div
              aria-hidden="true"
              style={{
                width: '72px',
                height: '72px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--color-primary), #6366F1)',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '28px',
                fontWeight: 700,
                color: '#fff',
                userSelect: 'none',
              }}
            >
              {initials}
            </div>
            <div style={{ flex: 1, minWidth: '200px' }}>
              <p style={{ color: 'var(--color-text-primary)', fontWeight: 500, margin: '0 0 4px' }}>
                Profile photo
              </p>
              <p
                style={{
                  color: 'var(--color-text-secondary)',
                  fontSize: 'var(--text-sm)',
                  margin: '0 0 16px',
                }}
              >
                {profileLoading
                  ? 'Loading your profile data...'
                  : 'Profile photos are not part of the product yet. Your initials are used consistently across the app.'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Identity fields */}
      <Card>
        <CardHeader style={{ padding: '24px 24px 0' }}>
          <CardTitle style={{ fontSize: 'var(--text-base)', fontWeight: 600 }}>
            Personal information
          </CardTitle>
        </CardHeader>
        <CardContent
          style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}
        >
          {profileLoading && <Badge variant="outline">Loading account details</Badge>}
          {saveError && <Badge variant="error">{saveError}</Badge>}
          {saveSuccess && <Badge variant="success">{saveSuccess}</Badge>}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input
              id="settings-first-name"
              label="First name"
              placeholder="Ada"
              value={formData.firstName}
              onChange={(event) => handleFieldChange('firstName', event.target.value)}
            />
            <Input
              id="settings-last-name"
              label="Last name"
              placeholder="Lovelace"
              value={formData.lastName}
              onChange={(event) => handleFieldChange('lastName', event.target.value)}
            />
          </div>

          <Input
            id="settings-email"
            label="Email address"
            type="email"
            placeholder="ada@university.edu"
            value={profileEmail}
            readOnly
            hint="Used for login and notifications. Email changes are not supported here yet."
          />

          <Input
            id="settings-institution"
            label="Institution"
            placeholder="University of Lagos"
            value={subscription?.institution || ''}
            readOnly
          />

          <Input
            id="settings-matric"
            label="Matric / Student ID Number"
            placeholder="170805011"
            value={subscription?.matricNumber || ''}
            readOnly
          />

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input
              id="settings-department"
              label="Department"
              placeholder="Computer Science"
              value={formData.department}
              onChange={(event) => handleFieldChange('department', event.target.value)}
            />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label
                htmlFor="settings-level"
                style={{
                  fontSize: 'var(--text-sm)',
                  color: 'var(--color-text-secondary)',
                  fontWeight: 500,
                }}
              >
                Level
              </label>
              <select
                id="settings-level"
                value={formData.level}
                onChange={(event) => handleFieldChange('level', event.target.value)}
                style={{
                  minHeight: '42px',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-bg-surface)',
                  color: 'var(--color-text-primary)',
                  padding: '0 12px',
                  fontSize: 'var(--text-sm)',
                }}
              >
                <option value="">Select level</option>
                {LEVEL_OPTIONS.map((levelOption) => (
                  <option key={levelOption} value={levelOption}>
                    {levelOption} Level
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label
              htmlFor="settings-personality"
              style={{
                fontSize: 'var(--text-sm)',
                color: 'var(--color-text-secondary)',
                fontWeight: 500,
              }}
            >
              Preferred tutor style
            </label>
            <select
              id="settings-personality"
              value={formData.preferredTutorPersonality}
              onChange={(event) =>
                handleFieldChange('preferredTutorPersonality', event.target.value)
              }
              style={{
                minHeight: '42px',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--color-border)',
                background: 'var(--color-bg-surface)',
                color: 'var(--color-text-primary)',
                padding: '0 12px',
                fontSize: 'var(--text-sm)',
              }}
            >
              {TUTOR_PERSONALITIES.map((personality) => (
                <option key={personality.value} value={personality.value}>
                  {personality.label}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label
              htmlFor="settings-bio"
              style={{
                fontSize: 'var(--text-sm)',
                color: 'var(--color-text-secondary)',
                fontWeight: 500,
              }}
            >
              Bio <span style={{ opacity: 0.6 }}>(optional)</span>
            </label>
            <Textarea
              id="settings-bio"
              placeholder="Tell your future self what you are studying or optimizing for."
              rows={3}
              value={formData.bio}
              onChange={(event) => handleFieldChange('bio', event.target.value)}
              hint="Optional. Shown only in your own settings for now."
            />
          </div>
        </CardContent>
        <CardFooter style={{ padding: '16px 24px', justifyContent: 'flex-end', gap: '8px' }}>
          <Button variant="ghost" size="sm" onClick={handleReset} disabled={!canReset || isSaving}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={handleSave} loading={isSaving}>
            Save changes
          </Button>
        </CardFooter>
      </Card>

      <SecuritySection />

      {/* Account actions */}
      <Card>
        <CardHeader style={{ padding: '24px 24px 0' }}>
          <CardTitle style={{ fontSize: 'var(--text-base)', fontWeight: 600 }}>
            Account Actions
          </CardTitle>
        </CardHeader>
        <CardContent style={{ padding: '16px 24px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '16px',
            }}
          >
            <div>
              <p style={{ color: 'var(--color-text-primary)', fontWeight: 500, margin: '0 0 4px' }}>
                Sign out
              </p>
              <p
                style={{
                  color: 'var(--color-text-secondary)',
                  fontSize: 'var(--text-sm)',
                  margin: 0,
                }}
              >
                Log out of your account on this device.
              </p>
            </div>
            <SignOutButton />
          </div>
        </CardContent>
      </Card>

      {/* Danger zone */}
      <Card style={{ borderColor: 'rgba(244,63,94,0.25)' }}>
        <CardHeader style={{ padding: '24px 24px 0' }}>
          <CardTitle
            style={{
              fontSize: 'var(--text-base)',
              fontWeight: 600,
              color: 'var(--color-accent-rose)',
            }}
          >
            Danger zone
          </CardTitle>
        </CardHeader>
        <CardContent
          style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: '12px' }}
        >
          {deleteError && <Badge variant="error">{deleteError}</Badge>}
          {deleteSuccess && <Badge variant="success">{deleteSuccess}</Badge>}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '16px',
            }}
          >
            <div>
              <p style={{ color: 'var(--color-text-primary)', fontWeight: 500, margin: '0 0 4px' }}>
                Delete account
              </p>
              <p
                style={{
                  color: 'var(--color-text-secondary)',
                  fontSize: 'var(--text-sm)',
                  margin: 0,
                }}
              >
                Permanently remove your account and associated data. This cannot be undone.
              </p>
            </div>
          </div>
          <Input
            id="settings-delete-email"
            label="Confirm your email"
            type="email"
            placeholder="you@example.com"
            value={deleteEmail}
            onChange={(event) => setDeleteEmail(event.target.value)}
            disabled={isDeleting}
          />
          <Input
            id="settings-delete-confirmation"
            label="Type DELETE MY ACCOUNT"
            placeholder="DELETE MY ACCOUNT"
            value={deleteConfirmationText}
            onChange={(event) => setDeleteConfirmationText(event.target.value)}
            disabled={isDeleting}
          />
          {supportsPasswordChange && (
            <Input
              id="settings-delete-password"
              label="Current password"
              type="password"
              placeholder="••••••••"
              value={deleteCurrentPassword}
              onChange={(event) => setDeleteCurrentPassword(event.target.value)}
              disabled={isDeleting}
            />
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteAccount}
              loading={isDeleting}
            >
              Delete account permanently
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PreferencesSection() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [preferencesLoading, setPreferencesLoading] = useState(true);
  const [preferencesSaving, setPreferencesSaving] = useState(false);
  const [preferencesError, setPreferencesError] = useState<string | null>(null);
  const [preferencesSuccess, setPreferencesSuccess] = useState<string | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light' | 'system'>('dark');
  const [density, setDensity] = useState<'comfortable' | 'compact'>('comfortable');
  const [notifications, setNotifications] = useState({
    due_cards: true,
    streaks: true,
    exam_countdowns: true,
    workspace_invitations: true,
  });

  useEffect(() => {
    let isMounted = true;

    const loadPreferences = async () => {
      try {
        const response = await fetch('/api/profile');
        const data = (await response.json()) as ProfileResponse & { error?: string };

        if (!response.ok) {
          throw new Error(data.error || 'Failed to load preferences');
        }

        if (isMounted) {
          setProfile(data.profile);
          setTheme(data.profile.theme_preference ?? 'dark');
          setDensity(data.profile.content_density ?? 'comfortable');
          setNotifications(
            data.profile.notification_preferences ?? {
              due_cards: true,
              streaks: true,
              exam_countdowns: true,
              workspace_invitations: true,
            },
          );
        }
      } catch (error) {
        if (isMounted) {
          setPreferencesError(
            error instanceof Error ? error.message : 'Failed to load preferences',
          );
        }
      } finally {
        if (isMounted) {
          setPreferencesLoading(false);
        }
      }
    };

    void loadPreferences();

    return () => {
      isMounted = false;
    };
  }, []);

  const applyTheme = (preference: 'dark' | 'light' | 'system') => {
    const resolved =
      preference === 'system'
        ? window.matchMedia('(prefers-color-scheme: light)').matches
          ? 'light'
          : 'dark'
        : preference;
    document.documentElement.setAttribute('data-theme', resolved);
    document.documentElement.style.colorScheme = resolved;
    window.localStorage.setItem('exam-killer-theme', preference);
  };

  const applyDensity = (preference: 'comfortable' | 'compact') => {
    document.documentElement.setAttribute('data-density', preference);
    window.localStorage.setItem('exam-killer-density', preference);
  };

  const savePreferences = async () => {
    setPreferencesSaving(true);
    setPreferencesError(null);
    setPreferencesSuccess(null);

    try {
      const patchResponse = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: profile?.full_name,
          theme_preference: theme,
          content_density: density,
          notification_preferences: notifications,
        }),
      });
      const patchData = (await patchResponse.json()) as UpdateProfileResponse & { error?: string };

      if (!patchResponse.ok) {
        throw new Error(patchData.error || 'Failed to save preferences');
      }

      setProfile(patchData.profile);
      applyTheme(theme);
      applyDensity(density);
      window.localStorage.setItem('exam-killer-notifications', JSON.stringify(notifications));
      setPreferencesSuccess('Preferences saved.');
    } catch (error) {
      setPreferencesError(error instanceof Error ? error.message : 'Failed to save preferences');
    } finally {
      setPreferencesSaving(false);
    }
  };

  const notificationItems = [
    {
      id: 'due_cards' as const,
      label: 'Daily review reminders',
      description: 'Remind you when cards are due for review.',
    },
    {
      id: 'streaks' as const,
      label: 'Streak alerts',
      description: 'Alert before your study streak breaks.',
    },
    {
      id: 'exam_countdowns' as const,
      label: 'Exam countdown alerts',
      description: 'Notify 7 days and 1 day before exam dates.',
    },
    {
      id: 'workspace_invitations' as const,
      label: 'Workspace invitations',
      description: 'When a classmate invites you to a workspace.',
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Appearance */}
      <Card>
        <CardHeader style={{ padding: '24px 24px 0' }}>
          <CardTitle style={{ fontSize: 'var(--text-base)', fontWeight: 600 }}>
            Appearance
          </CardTitle>
          <CardDescription>Customise the look and feel of Exam-Killer.</CardDescription>
        </CardHeader>
        <CardContent
          style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: '20px' }}
        >
          {preferencesLoading && <Badge variant="outline">Loading preferences</Badge>}
          {preferencesError && <Badge variant="error">{preferencesError}</Badge>}
          {preferencesSuccess && <Badge variant="success">{preferencesSuccess}</Badge>}
          {/* Theme selector */}
          <div>
            <p
              style={{
                fontSize: 'var(--text-sm)',
                color: 'var(--color-text-secondary)',
                fontWeight: 500,
                marginBottom: '8px',
              }}
            >
              Theme
            </p>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {(
                [
                  { label: 'Dark', value: 'dark' },
                  { label: 'Light', value: 'light' },
                  { label: 'System', value: 'system' },
                ] as const
              ).map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setTheme(t.value)}
                  style={{
                    padding: '6px 16px',
                    borderRadius: 'var(--radius-md)',
                    border:
                      theme === t.value
                        ? '1px solid var(--color-border-accent)'
                        : '1px solid var(--color-border)',
                    background: theme === t.value ? 'var(--color-bg-surface)' : 'transparent',
                    color: 'var(--color-text-primary)',
                    cursor: 'pointer',
                    fontSize: 'var(--text-sm)',
                    fontFamily: 'var(--font-sans)',
                    flex: '1 1 auto',
                    minWidth: '80px',
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Content density */}
          <div>
            <p
              style={{
                fontSize: 'var(--text-sm)',
                color: 'var(--color-text-secondary)',
                fontWeight: 500,
                marginBottom: '8px',
              }}
            >
              Content density
            </p>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {(
                [
                  { label: 'Comfortable', value: 'comfortable' },
                  { label: 'Compact', value: 'compact' },
                ] as const
              ).map((d) => (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => setDensity(d.value)}
                  style={{
                    padding: '6px 16px',
                    borderRadius: 'var(--radius-md)',
                    border:
                      density === d.value
                        ? '1px solid var(--color-border-accent)'
                        : '1px solid var(--color-border)',
                    background: density === d.value ? 'var(--color-bg-surface)' : 'transparent',
                    color: 'var(--color-text-primary)',
                    cursor: 'pointer',
                    fontSize: 'var(--text-sm)',
                    fontFamily: 'var(--font-sans)',
                    flex: '1 1 auto',
                    minWidth: '120px',
                  }}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
        <CardFooter style={{ padding: '16px 24px', justifyContent: 'flex-end' }}>
          <Button variant="primary" size="sm" onClick={savePreferences} loading={preferencesSaving}>
            Save preferences
          </Button>
        </CardFooter>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader style={{ padding: '24px 24px 0' }}>
          <CardTitle style={{ fontSize: 'var(--text-base)', fontWeight: 600 }}>
            Notifications
          </CardTitle>
          <CardDescription>Choose what you want to be notified about.</CardDescription>
        </CardHeader>
        <CardContent
          style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: '12px' }}
        >
          {notificationItems.map(({ id, label, description }) => (
            <label
              key={id}
              htmlFor={`notif-${id}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '16px',
                cursor: 'pointer',
                padding: '12px 0',
                borderBottom: '1px solid var(--color-border)',
              }}
            >
              <span>
                <span
                  style={{
                    display: 'block',
                    color: 'var(--color-text-primary)',
                    fontWeight: 500,
                    fontSize: 'var(--text-sm)',
                  }}
                >
                  {label}
                </span>
                <span style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-xs)' }}>
                  {description}
                </span>
              </span>
              {/* Toggle — unstyled checkbox; real implementation should use Radix Switch */}
              <input
                id={`notif-${id}`}
                type="checkbox"
                checked={notifications[id]}
                onChange={(event) =>
                  setNotifications((current) => ({ ...current, [id]: event.target.checked }))
                }
                style={{
                  width: '20px',
                  height: '20px',
                  accentColor: 'var(--color-primary)',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              />
            </label>
          ))}
        </CardContent>
        <CardFooter style={{ padding: '16px 24px', justifyContent: 'flex-end' }}>
          <Button variant="primary" size="sm" onClick={savePreferences} loading={preferencesSaving}>
            Save notification settings
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

function BillingSection({ setActiveTab }: { setActiveTab: (tab: SettingsTab) => void }) {
  const authContext = useContext(AuthContext);
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isNavigatingToPayment, setIsNavigatingToPayment] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistoryResponse['payments']>([]);
  const [paymentHistoryLoading, setPaymentHistoryLoading] = useState(true);

  const handleSubscribe = async (plan: string, trial: boolean = false) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/payments/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, trial }),
      });
      const data = await response.json();
      if (!response.ok || !data.success)
        throw new Error(data.message || 'Failed to initialize payment');
      if (data.authorizationUrl) {
        setIsNavigatingToPayment(true);
        window.location.href = data.authorizationUrl;
        return;
      }
      setLoading(false);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const subscription = authContext?.subscription;
  const effectivePlan = subscription?.status === 'active' ? subscription.plan : ('free' as const);
  const currentPlanLabel =
    effectivePlan === 'premium_monthly'
      ? 'Premium Monthly Plan'
      : effectivePlan === 'premium_annual'
        ? 'Premium Annual Plan'
        : 'Free Plan';
  const currentPlanSummary =
    effectivePlan === 'premium_monthly'
      ? 'Unlimited workspaces · 50 AI queries/day · Flexible monthly billing'
      : effectivePlan === 'premium_annual'
        ? 'Unlimited workspaces · 100 AI queries/day · Best yearly value'
        : '1 workspace · 3 file uploads/month · 5 AI queries/day';

  useEffect(() => {
    let isMounted = true;

    const loadPaymentHistory = async () => {
      try {
        const response = await fetch('/api/payments/history');
        const data = (await response.json()) as PaymentHistoryResponse & { error?: string };

        if (!response.ok) {
          throw new Error(data.error || 'Failed to load payment history');
        }

        if (isMounted) {
          setPaymentHistory(data.payments);
        }
      } catch (historyError) {
        if (isMounted) {
          setError(
            historyError instanceof Error ? historyError.message : 'Failed to load payment history',
          );
        }
      } finally {
        if (isMounted) {
          setPaymentHistoryLoading(false);
        }
      }
    };

    void loadPaymentHistory();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Verification Banner */}
      {subscription && (
        <div className="mb-4">
          <VerificationBanner
            status={subscription.verificationStatus || 'none'}
            onVerifyClick={() => setActiveTab('profile')} // Or open a modal
          />
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'rgba(244, 63, 94, 0.1)',
            border: '1px solid rgba(244, 63, 94, 0.2)',
            color: 'var(--color-accent-rose)',
            fontSize: 'var(--text-sm)',
          }}
        >
          {error}
        </div>
      )}
      {/* Current plan */}
      <Card>
        <CardContent style={{ padding: '24px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '16px',
            }}
          >
            <div>
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}
              >
                <p
                  style={{
                    color: 'var(--color-text-primary)',
                    fontWeight: 600,
                    fontSize: 'var(--text-lg)',
                    margin: 0,
                  }}
                >
                  {currentPlanLabel}
                </p>
                <Badge variant="default">Current</Badge>
              </div>
              <p
                style={{
                  color: 'var(--color-text-secondary)',
                  fontSize: 'var(--text-sm)',
                  margin: 0,
                }}
              >
                {currentPlanSummary}
              </p>
            </div>
            <Button variant="primary" size="sm" onClick={() => router.push('/pricing')}>
              {effectivePlan === 'free' ? 'Upgrade to Premium' : 'Manage subscription'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Plan comparison */}
      <Card>
        <CardHeader style={{ padding: '24px 24px 0' }}>
          <CardTitle style={{ fontSize: 'var(--text-base)', fontWeight: 600 }}>
            Available plans
          </CardTitle>
        </CardHeader>
        <CardContent
          style={{ padding: '16px 24px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}
        >
          {[
            {
              name: 'Free',
              price: '₦0',
              period: 'forever',
              badge: null,
              features: [
                '1 workspace',
                '3 file uploads/month',
                '5 AI queries/day',
                '10 flashcards',
              ],
              current: true,
              cta: null,
              variant: 'ghost' as const,
              highlight: false,
            },
            {
              name: 'Premium Monthly',
              id: 'premium_monthly',
              price: '₦2,000',
              period: '/month',
              badge: 'Flexible monthly',
              features: [
                'Unlimited workspaces',
                'Unlimited flashcards',
                '50 AI queries/day',
                '2-day free trial',
                'All tutor personalities',
                'Ideal for month-to-month flexibility',
              ],
              cta: 'Start 2-Day Trial',
              variant: 'primary' as const,
              trial: true,
              highlight: false,
            },
            {
              name: 'Annual',
              id: 'premium_annual',
              price: '₦20,000',
              period: '/year',
              badge: 'Best value — Save ₦4,000/year',
              features: [
                'Everything in Monthly',
                '100 AI queries/day',
                '7-day free trial',
                'Priority support + early access',
              ],
              cta: 'Start 7-Day Trial',
              variant: 'secondary' as const,
              trial: true,
              highlight: true,
            },
          ].map((plan) => (
            <div
              key={plan.name}
              style={{
                flex: '1 1 220px',
                border: plan.highlight
                  ? '1px solid var(--color-border-accent)'
                  : '1px solid var(--color-border)',
                borderRadius: 'var(--radius-lg)',
                padding: '20px',
                background: plan.highlight ? 'var(--color-primary-glow)' : 'transparent',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
              >
                <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                  {plan.name}
                </span>
                {plan.badge && (
                  <Badge variant={plan.highlight ? 'warning' : 'primary'}>{plan.badge}</Badge>
                )}
              </div>
              <div>
                <span
                  style={{
                    fontSize: 'var(--text-2xl)',
                    fontWeight: 700,
                    color: 'var(--color-text-primary)',
                  }}
                >
                  {plan.price}
                </span>
                <span style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>
                  {plan.period}
                </span>
              </div>
              <ul
                style={{
                  listStyle: 'none',
                  padding: 0,
                  margin: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                {plan.features.map((f) => (
                  <li
                    key={f}
                    style={{
                      fontSize: 'var(--text-sm)',
                      color: 'var(--color-text-secondary)',
                      display: 'flex',
                      gap: '6px',
                    }}
                  >
                    <span style={{ color: 'var(--color-accent-emerald)' }} aria-hidden="true">
                      ✓
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
              {plan.cta ? (
                <Button
                  variant={plan.variant}
                  size="sm"
                  style={{ marginTop: 'auto' }}
                  onClick={() => handleSubscribe(plan.id!, plan.trial)}
                  disabled={loading || isNavigatingToPayment}
                  loading={loading || isNavigatingToPayment}
                >
                  {plan.cta}
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled
                  style={{ marginTop: 'auto', opacity: 0.5 }}
                >
                  Current plan
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Payment history */}
      <Card>
        <CardHeader style={{ padding: '24px 24px 0' }}>
          <CardTitle style={{ fontSize: 'var(--text-base)', fontWeight: 600 }}>
            Payment history
          </CardTitle>
          <CardDescription>
            Your recent transactions and trial activations appear here.
          </CardDescription>
        </CardHeader>
        <CardContent style={{ padding: '24px' }}>
          {paymentHistoryLoading ? (
            <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
              Loading payment history...
            </p>
          ) : paymentHistory.length === 0 ? (
            <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
              No payment records yet.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {paymentHistory.map((payment) => (
                <div
                  key={payment.reference}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '16px',
                    padding: '14px 16px',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-lg)',
                    background: 'var(--color-bg-surface)',
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ minWidth: '220px' }}>
                    <p style={{ color: 'var(--color-text-primary)', fontWeight: 600, margin: 0 }}>
                      {payment.plan === 'premium_annual'
                        ? 'Premium Annual'
                        : payment.plan === 'premium_monthly'
                          ? 'Premium Monthly'
                          : 'Free / Trial'}
                    </p>
                    <p
                      style={{
                        color: 'var(--color-text-secondary)',
                        fontSize: 'var(--text-xs)',
                        margin: '4px 0 0',
                      }}
                    >
                      Ref: {payment.reference}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ color: 'var(--color-text-primary)', fontWeight: 600, margin: 0 }}>
                      ₦{(payment.amount / 100).toLocaleString()}
                    </p>
                    <p
                      style={{
                        color: 'var(--color-text-secondary)',
                        fontSize: 'var(--text-xs)',
                        margin: '4px 0 0',
                      }}
                    >
                      {new Date(payment.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge
                    variant={
                      payment.status === 'success'
                        ? 'success'
                        : payment.status === 'failed'
                          ? 'error'
                          : 'warning'
                    }
                  >
                    {payment.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SecuritySection() {
  const authContext = useContext(AuthContext);
  const user = authContext?.user;
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const supportsPasswordChange =
    user?.providerData?.some((provider) => provider.providerId === 'password') ?? false;

  const handlePasswordUpdate = async () => {
    if (!user || !user.email) {
      setPasswordError('No authenticated user is available.');
      return;
    }

    if (!supportsPasswordChange) {
      setPasswordError('Password changes are only available for email/password accounts.');
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }

    setIsUpdatingPassword(true);
    setPasswordError(null);
    setPasswordSuccess(null);

    try {
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordSuccess('Password updated successfully.');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to update password. Try again.';
      setPasswordError(message);
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  return (
    <Card>
      <CardHeader style={{ padding: '24px 24px 0' }}>
        <CardTitle style={{ fontSize: 'var(--text-base)', fontWeight: 600 }}>Security</CardTitle>
        <CardDescription>Manage your password and login methods.</CardDescription>
      </CardHeader>
      <CardContent
        style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: '12px' }}
      >
        {!supportsPasswordChange && (
          <Badge variant="outline">
            This account uses Google sign-in. Password changes are unavailable.
          </Badge>
        )}
        {passwordError && <Badge variant="error">{passwordError}</Badge>}
        {passwordSuccess && <Badge variant="success">{passwordSuccess}</Badge>}
        <Input
          id="settings-current-password"
          label="Current password"
          type="password"
          placeholder="••••••••"
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
          disabled={!supportsPasswordChange || isUpdatingPassword}
        />
        <Input
          id="settings-new-password"
          label="New password"
          type="password"
          placeholder="••••••••"
          hint="Use at least 8 characters."
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          disabled={!supportsPasswordChange || isUpdatingPassword}
        />
        <Input
          id="settings-confirm-password"
          label="Confirm new password"
          type="password"
          placeholder="••••••••"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          disabled={!supportsPasswordChange || isUpdatingPassword}
        />
      </CardContent>
      <CardFooter style={{ padding: '16px 24px', justifyContent: 'flex-end', gap: '8px' }}>
        <Button
          variant="primary"
          size="sm"
          onClick={handlePasswordUpdate}
          loading={isUpdatingPassword}
          disabled={!supportsPasswordChange}
        >
          Update password
        </Button>
      </CardFooter>
    </Card>
  );
}

// ── Root page ──────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const authContext = useContext(AuthContext);
  const user = authContext?.user;

  return (
    <section
      className="px-4 py-8 sm:px-8 sm:py-12"
      style={{
        maxWidth: '900px',
        margin: '0 auto',
      }}
      aria-labelledby="settings-heading"
    >
      {/* ── Page header ─────────────────────────────────────────────────── */}
      <header
        style={{ marginBottom: '32px', display: 'flex', flexDirection: 'column', gap: '8px' }}
      >
        <h1
          id="settings-heading"
          style={{
            fontSize: 'var(--text-3xl)',
            fontWeight: 700,
            color: 'var(--color-text-primary)',
            letterSpacing: '-0.02em',
            lineHeight: 1.15,
            margin: 0,
          }}
        >
          Settings
        </h1>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', margin: 0 }}>
          Manage your profile, preferences, and subscription.
        </p>
        {user?.email && (
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', margin: 0 }}>
            Signed in as {user.email}
          </p>
        )}
        <div className="mt-2">
          <Badge variant="success">
            Profile, password, theme, notification, billing, and account-deletion flows are live.
          </Badge>
        </div>
      </header>

      {/* ── Tab bar ─────────────────────────────────────────────────────── */}
      <nav
        role="tablist"
        aria-label="Settings sections"
        style={{
          display: 'flex',
          gap: '2px',
          padding: '4px',
          background: 'var(--color-bg-elevated)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border)',
          width: 'fit-content',
          marginBottom: '32px',
        }}
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              aria-controls={`tabpanel-${tab.id}`}
              id={`tab-${tab.id}`}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '6px 20px',
                borderRadius: 'calc(var(--radius-lg) - 2px)',
                border: 'none',
                background: isActive ? 'var(--color-bg-surface)' : 'transparent',
                color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                fontWeight: isActive ? 600 : 400,
                fontSize: 'var(--text-sm)',
                cursor: 'pointer',
                fontFamily: 'var(--font-sans)',
                transition: 'all 150ms var(--ease-standard)',
                boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.3)' : 'none',
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>

      {/* ── Tab panels ──────────────────────────────────────────────────── */}
      <div role="tabpanel" id={`tabpanel-${activeTab}`} aria-labelledby={`tab-${activeTab}`}>
        {activeTab === 'profile' && <ProfileSection />}
        {activeTab === 'preferences' && <PreferencesSection />}
        {activeTab === 'billing' && <BillingSection setActiveTab={setActiveTab} />}
      </div>
    </section>
  );
}
