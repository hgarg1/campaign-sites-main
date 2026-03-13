'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface PasswordStrength {
  score: number;
  label: string;
  color: string;
  requirements: {
    minLength: boolean;
    hasUppercase: boolean;
    hasLowercase: boolean;
    hasNumbers: boolean;
    hasSpecial: boolean;
  };
}

function calculatePasswordStrength(password: string): PasswordStrength {
  const requirements = {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumbers: /[0-9]/.test(password),
    hasSpecial: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
  };

  const metRequirements = Object.values(requirements).filter(Boolean).length;
  let score = 0;
  let label = 'Very Weak';
  let color = 'bg-red-500';

  if (metRequirements === 0) {
    score = 0;
    label = 'Very Weak';
    color = 'bg-red-500';
  } else if (metRequirements === 1) {
    score = 20;
    label = 'Weak';
    color = 'bg-orange-500';
  } else if (metRequirements === 2) {
    score = 40;
    label = 'Fair';
    color = 'bg-amber-500';
  } else if (metRequirements === 3) {
    score = 60;
    label = 'Good';
    color = 'bg-yellow-500';
  } else if (metRequirements === 4) {
    score = 80;
    label = 'Strong';
    color = 'bg-lime-500';
  } else {
    score = 100;
    label = 'Very Strong';
    color = 'bg-green-500';
  }

  return { score, label, color, requirements };
}

export default function ChangePasswordPage() {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isFirstTimeChange, setIsFirstTimeChange] = useState(true);
  const [showPasswords, setShowPasswords] = useState(false);

  const passwordStrength = calculatePasswordStrength(newPassword);
  const passwordsMatch = newPassword && confirmPassword && newPassword === confirmPassword;
  const passwordsVisible = newPassword && confirmPassword;

  useEffect(() => {
    // Check if user is authenticated and if password change is required
    const checkPasswordChangeStatus = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const user = await res.json();
          if (user.passwordChangedAt !== null && user.passwordChangedAt !== undefined) {
            // Password already changed, redirect
            router.push('/admin/portal');
          }
        } else {
          // Not authenticated, redirect to login
          router.push('/auth/signin');
        }
      } catch {
        router.push('/auth/signin');
      }
    };

    checkPasswordChangeStatus();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!newPassword || !confirmPassword) {
      setError('Both password fields are required');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: '', // Not needed for first-time change
          newPassword,
          confirmPassword,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to change password');
        return;
      }

      setSuccess(true);
      setNewPassword('');
      setConfirmPassword('');

      // Redirect after 2 seconds
      setTimeout(() => {
        router.push('/admin/portal');
      }, 2000);
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isFirstTimeChange) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 flex items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
      </div>

      <div className="w-full max-w-2xl relative z-10">
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl p-8 md:p-12 border border-white/20">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-center mb-4">
              <div className="p-3 bg-gradient-to-br from-blue-400 to-purple-500 rounded-xl">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-white text-center mb-2">Secure Your Account</h1>
            <p className="text-blue-100 text-center">Set a strong password to protect your account</p>
          </div>

          {success ? (
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-green-400/20 to-emerald-400/20 border border-green-400/50 rounded-xl p-6 backdrop-blur-sm">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-green-400/30 rounded-lg">
                    <svg className="w-5 h-5 text-green-300" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <p className="text-green-200 font-semibold">Password changed successfully!</p>
                </div>
                <p className="text-green-100/80 text-sm">Redirecting to admin portal in a moment...</p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* New Password Field */}
              <div className="space-y-2">
                <label htmlFor="newPassword" className="block text-sm font-semibold text-white">
                  New Password
                </label>
                <div className="relative">
                  <input
                    id="newPassword"
                    type={showPasswords ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={loading}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent text-white placeholder-blue-200/50 disabled:opacity-50 transition"
                    placeholder="Enter a strong password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords(!showPasswords)}
                    className="absolute right-3 top-3 text-blue-200 hover:text-blue-100"
                  >
                    {showPasswords ? (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" fillRule="evenodd" />
                        <path d="M15.171 13.576l1.414 1.414a1 1 0 001.414-1.414l-14-14a1 1 0 00-1.414 1.414l2.854 2.854a10.047 10.047 0 013.864-1.27c4.478 0 8.268 2.943 9.542 7a9.972 9.972 0 01-1.313 3.476zM12.53 11.47a2 2 0 01-2.8 2.8l2.8-2.8z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                        <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                </div>

                {/* Password Strength Indicator */}
                {newPassword && (
                  <div className="space-y-3 mt-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-blue-200">Password Strength</span>
                      <span className={`text-xs font-semibold px-2 py-1 rounded ${
                        passwordStrength.score >= 100 ? 'bg-green-400/30 text-green-200' :
                        passwordStrength.score >= 80 ? 'bg-lime-400/30 text-lime-200' :
                        passwordStrength.score >= 60 ? 'bg-yellow-400/30 text-yellow-200' :
                        passwordStrength.score >= 40 ? 'bg-amber-400/30 text-amber-200' :
                        passwordStrength.score >= 20 ? 'bg-orange-400/30 text-orange-200' :
                        'bg-red-400/30 text-red-200'
                      }`}>
                        {passwordStrength.label}
                      </span>
                    </div>
                    
                    {/* Progress bar */}
                    <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full ${passwordStrength.color} transition-all duration-300`}
                        style={{ width: `${passwordStrength.score}%` }}
                      ></div>
                    </div>

                    {/* Requirements */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded-full flex items-center justify-center text-xs ${
                          passwordStrength.requirements.minLength 
                            ? 'bg-green-400/30 text-green-300' 
                            : 'bg-white/10 text-gray-400'
                        }`}>
                          {passwordStrength.requirements.minLength && '✓'}
                        </div>
                        <span className={`text-xs ${passwordStrength.requirements.minLength ? 'text-green-200' : 'text-blue-300'}`}>
                          At least 8 characters
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded-full flex items-center justify-center text-xs ${
                          passwordStrength.requirements.hasUppercase 
                            ? 'bg-green-400/30 text-green-300' 
                            : 'bg-white/10 text-gray-400'
                        }`}>
                          {passwordStrength.requirements.hasUppercase && '✓'}
                        </div>
                        <span className={`text-xs ${passwordStrength.requirements.hasUppercase ? 'text-green-200' : 'text-blue-300'}`}>
                          Uppercase letter (A-Z)
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded-full flex items-center justify-center text-xs ${
                          passwordStrength.requirements.hasLowercase 
                            ? 'bg-green-400/30 text-green-300' 
                            : 'bg-white/10 text-gray-400'
                        }`}>
                          {passwordStrength.requirements.hasLowercase && '✓'}
                        </div>
                        <span className={`text-xs ${passwordStrength.requirements.hasLowercase ? 'text-green-200' : 'text-blue-300'}`}>
                          Lowercase letter (a-z)
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded-full flex items-center justify-center text-xs ${
                          passwordStrength.requirements.hasNumbers 
                            ? 'bg-green-400/30 text-green-300' 
                            : 'bg-white/10 text-gray-400'
                        }`}>
                          {passwordStrength.requirements.hasNumbers && '✓'}
                        </div>
                        <span className={`text-xs ${passwordStrength.requirements.hasNumbers ? 'text-green-200' : 'text-blue-300'}`}>
                          Number (0-9)
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded-full flex items-center justify-center text-xs ${
                          passwordStrength.requirements.hasSpecial 
                            ? 'bg-green-400/30 text-green-300' 
                            : 'bg-white/10 text-gray-400'
                        }`}>
                          {passwordStrength.requirements.hasSpecial && '✓'}
                        </div>
                        <span className={`text-xs ${passwordStrength.requirements.hasSpecial ? 'text-green-200' : 'text-blue-300'}`}>
                          Special character (!@#$%^&*)
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password Field */}
              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="block text-sm font-semibold text-white">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    type={showPasswords ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={loading}
                    className={`w-full px-4 py-3 bg-white/10 border rounded-xl focus:outline-none focus:ring-2 focus:border-transparent text-white placeholder-blue-200/50 disabled:opacity-50 transition ${
                      passwordsVisible && !passwordsMatch
                        ? 'border-red-400/50 focus:ring-red-400'
                        : passwordsMatch
                        ? 'border-green-400/50 focus:ring-green-400'
                        : 'border-white/20 focus:ring-blue-400'
                    }`}
                    placeholder="Re-enter password"
                  />
                  {passwordsVisible && (
                    <div className="absolute right-3 top-3">
                      {passwordsMatch ? (
                        <div className="flex items-center gap-1 text-green-300">
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-red-300">
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-400/20 border border-red-400/50 rounded-xl p-4 backdrop-blur-sm">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-red-300 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <p className="text-red-200 text-sm">{error}</p>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || !passwordsMatch || !newPassword}
                className="w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:from-gray-500 disabled:to-gray-600 text-white font-semibold rounded-xl transition duration-200 transform hover:scale-105 disabled:scale-100 disabled:opacity-50 shadow-lg"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Securing Your Account...
                  </span>
                ) : (
                  'Change Password'
                )}
              </button>
            </form>
          )}

          {/* Footer */}
          <div className="mt-8 pt-8 border-t border-white/10">
            <Link href="/auth/logout" className="text-blue-300 hover:text-blue-200 text-sm font-medium transition">
              ← Sign out
            </Link>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes blob {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
      `}</style>
    </div>
  );
}
