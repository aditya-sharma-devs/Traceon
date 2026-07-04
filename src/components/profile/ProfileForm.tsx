"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { useSession, signOut } from "next-auth/react";
import { Session } from "next-auth";
import {
  Camera,
  Save,
  Lock,
  User,
  Github,
  BarChart3,
  Trash2,
  AlertTriangle,
  Link as LinkIcon,
  FileCode,
  Calendar,
} from "lucide-react";

interface ProfileStats {
  reposAnalyzed: number;
  totalFilesScanned: number;
  memberSince: string;
}

export default function ProfileForm({ session }: { session: Session }) {
  const { update } = useSession();

  // State for general info
  const [name, setName] = useState(session?.user?.name || "");
  const [imagePreview, setImagePreview] = useState<string | null>(
    session?.user?.image || null,
  );
  const [base64Image, setBase64Image] = useState<string | null>(null);

  // State for security
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  // State for GitHub linking
  const [githubUsername, setGithubUsername] = useState("");
  const [isLinkingGH, setIsLinkingGH] = useState(false);

  // State for stats
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // State for danger zone
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  // State for submission
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch profile data (stats + githubUsername)
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch("/api/user/profile");
        if (res.ok) {
          const data = await res.json();
          setStats(data.stats);
          if (data.user.githubUsername) {
            setGithubUsername(data.user.githubUsername);
          }
        }
      } catch (err) {
        console.error("Failed to fetch profile:", err);
      } finally {
        setStatsLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be under 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setBase64Image(base64String);
      setImagePreview(base64String);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const payload: Record<string, string> = {};

    if (name !== session?.user?.name) payload.name = name;
    if (base64Image) payload.image = base64Image;
    if (currentPassword && newPassword) {
      payload.currentPassword = currentPassword;
      payload.newPassword = newPassword;
    }

    if (Object.keys(payload).length === 0) {
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/user/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 413) {
          throw new Error("Image must be under 5MB.");
        }

        throw new Error(data.message || "Failed to update profile");
      }

      await update({
        name: data.user.name,
        image: data.user.image,
      });

      setSuccess("Profile updated successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setBase64Image(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleLinkGitHub = async () => {
    if (!githubUsername.trim()) return;
    setIsLinkingGH(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/user/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ githubUsername: githubUsername.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to link GitHub");
      setSuccess("GitHub username linked successfully!");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to link GitHub");
    } finally {
      setIsLinkingGH(false);
    }
  };

  const handleUnlinkGitHub = async () => {
    setIsLinkingGH(true);
    setError(null);
    try {
      const res = await fetch("/api/user/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ githubUsername: "" }),
      });
      if (!res.ok) throw new Error("Failed to unlink");
      setGithubUsername("");
      setSuccess("GitHub username unlinked.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to unlink GitHub");
    } finally {
      setIsLinkingGH(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText.trim() !== "DELETE") return;
    setIsDeleting(true);
    try {
      const res = await fetch("/api/user/profile", { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to delete account");
      }
      // Sign out and redirect
      await signOut({ callbackUrl: "/" });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete account");
      setIsDeleting(false);
    }
  };

  const isCredentialsUser = session?.user?.provider === "credentials";

  return (
    <form onSubmit={handleSave} className="space-y-8 pb-12">
      {error && (
        <div className="p-4 rounded-xl bg-rose/5 border border-rose/10 text-rose font-mono text-sm">
          ! {error}
        </div>
      )}
      {success && (
        <div className="p-4 rounded-xl bg-emerald/5 border border-emerald/10 text-emerald font-mono text-sm">
          ✓ {success}
        </div>
      )}

      {/* ─── General Information ─── */}
      <div className="card p-6 border-stroke">
        <div className="flex items-center gap-2 mb-6">
          <User className="w-5 h-5 text-emerald" />
          <h2 className="text-xl font-mono text-text-0">General Information</h2>
        </div>

        <div className="flex flex-col md:flex-row gap-8 items-start">
          <div className="flex flex-col items-center gap-4">
            <div className="relative w-32 h-32 rounded-full border-2 border-stroke bg-surface-1 overflow-hidden group">
              {imagePreview ? (
                <Image
                  src={imagePreview}
                  alt="Profile"
                  width={128}
                  height={128}
                  className="w-full h-full object-cover"
                  unoptimized
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-surface-2 text-text-3 text-4xl font-display">
                  {name.charAt(0).toUpperCase()}
                </div>
              )}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer backdrop-blur-sm"
              >
                <Camera className="w-8 h-8 text-white mb-2" />
                <span className="text-white text-xs font-mono">Upload</span>
              </div>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageChange}
              accept="image/*"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-xs text-text-2 hover:text-emerald transition-colors font-mono"
            >
              Change Picture
            </button>
          </div>

          <div className="flex-1 space-y-4 w-full">
            <div>
              <label className="block text-sm font-mono text-text-2 mb-2">
                Display Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-surface-0 border border-stroke rounded-lg px-4 py-2 text-text-0 focus:border-emerald outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-mono text-text-2 mb-2">
                Email Address
              </label>
              <input
                type="text"
                value={session?.user?.email || ""}
                disabled
                className="w-full bg-surface-1 border border-stroke rounded-lg px-4 py-2 text-text-3 cursor-not-allowed opacity-70"
              />
            </div>
            <div>
              <label className="block text-sm font-mono text-text-2 mb-2">
                Authentication Provider
              </label>
              <div className="inline-flex items-center px-3 py-1 rounded-full border border-stroke bg-surface-1 text-xs font-mono capitalize">
                {session?.user?.provider || "Native"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Account Stats ─── */}
      <div className="card p-6 border-stroke">
        <div className="flex items-center gap-2 mb-6">
          <BarChart3 className="w-5 h-5 text-sky-400" />
          <h2 className="text-xl font-mono text-text-0">Account Stats</h2>
        </div>
        {statsLoading ? (
          <div className="flex items-center gap-3 text-text-3 font-mono text-sm">
            <span className="w-4 h-4 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
            Loading stats...
          </div>
        ) : stats ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-surface-1 border border-stroke">
              <div className="flex items-center gap-2 mb-2">
                <Github className="w-4 h-4 text-text-2" />
                <p className="text-xs text-text-3 font-mono uppercase tracking-wider">
                  Repos Analyzed
                </p>
              </div>
              <p className="text-3xl font-display font-bold text-text-0">
                {stats.reposAnalyzed}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-surface-1 border border-stroke">
              <div className="flex items-center gap-2 mb-2">
                <FileCode className="w-4 h-4 text-text-2" />
                <p className="text-xs text-text-3 font-mono uppercase tracking-wider">
                  Files Scanned
                </p>
              </div>
              <p className="text-3xl font-display font-bold text-text-0">
                {stats.totalFilesScanned.toLocaleString()}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-surface-1 border border-stroke">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-text-2" />
                <p className="text-xs text-text-3 font-mono uppercase tracking-wider">
                  Member Since
                </p>
              </div>
              <p className="text-lg font-mono font-bold text-text-0">
                {new Date(stats.memberSince).toLocaleDateString("en-US", {
                  month: "short",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-text-3 font-mono">Could not load stats.</p>
        )}
      </div>

      {/* ─── GitHub Connection ─── */}
      <div className="card p-6 border-stroke">
        <div className="flex items-center gap-2 mb-6">
          <Github className="w-5 h-5 text-emerald" />
          <h2 className="text-xl font-mono text-text-0">GitHub Connection</h2>
        </div>
        <p className="text-sm text-text-2 mb-4 leading-relaxed">
          Link your GitHub username to analyze your public repositories directly
          from the dashboard.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 max-w-lg">
          <input
            type="text"
            value={githubUsername}
            onChange={(e) => setGithubUsername(e.target.value)}
            placeholder="Enter GitHub username..."
            disabled={isLinkingGH}
            className="flex-1 bg-surface-0 border border-stroke rounded-lg px-4 py-2 text-sm font-mono text-text-0 placeholder:text-text-3 outline-none focus:border-emerald transition-colors disabled:opacity-50"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleLinkGitHub}
              disabled={isLinkingGH || !githubUsername.trim()}
              className="btn-cta !py-2 !px-5 !text-sm whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isLinkingGH ? (
                <span className="w-4 h-4 border-2 border-surface-0 border-t-transparent rounded-full animate-spin" />
              ) : (
                <LinkIcon className="w-4 h-4" />
              )}
              {githubUsername ? "Update" : "Connect"}
            </button>
            {githubUsername && (
              <button
                type="button"
                onClick={handleUnlinkGitHub}
                disabled={isLinkingGH}
                className="px-4 py-2 rounded-lg border border-stroke bg-surface-1 hover:bg-surface-2 transition-colors text-sm font-mono text-text-2 disabled:opacity-50"
              >
                Unlink
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ─── Change Password (Credentials users only) ─── */}
      {isCredentialsUser && (
        <div className="card p-6 border-stroke">
          <div className="flex items-center gap-2 mb-6">
            <Lock className="w-5 h-5 text-amber" />
            <h2 className="text-xl font-mono text-text-0">Change Password</h2>
          </div>
          <div className="space-y-4 max-w-md">
            <div>
              <label className="block text-sm font-mono text-text-2 mb-2">
                Current Password
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full bg-surface-0 border border-stroke rounded-lg px-4 py-2 text-text-0 focus:border-amber outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-mono text-text-2 mb-2">
                New Password{" "}
                <span className="text-text-3 font-sans text-xs">
                  (min 6 chars)
                </span>
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-surface-0 border border-stroke rounded-lg px-4 py-2 text-text-0 focus:border-amber outline-none transition-colors"
              />
            </div>
          </div>
        </div>
      )}

      {/* ─── Save Button ─── */}
      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={
            loading ||
            (!base64Image && name === session?.user?.name && !newPassword)
          }
          className="btn-cta flex items-center gap-2 !px-8 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <span className="w-5 h-5 border-2 border-surface-0 border-t-transparent rounded-full animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              Save Changes
            </>
          )}
        </button>
      </div>

      {/* ─── Danger Zone ─── */}
      <div className="card p-6 border-2 border-rose/20 bg-rose/[0.02]">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-5 h-5 text-rose" />
          <h2 className="text-xl font-mono text-rose">Danger Zone</h2>
        </div>
        <p className="text-sm text-text-2 leading-relaxed mb-4">
          Permanently delete your account and all associated data, including all
          repositories and analysis results.{" "}
          <strong className="text-rose">This action cannot be undone.</strong>
        </p>

        {!showDeleteConfirm ? (
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-2 px-5 py-2 rounded-lg border border-rose/30 bg-rose/5 hover:bg-rose/10 transition-colors text-sm font-mono text-rose"
          >
            <Trash2 className="w-4 h-4" />
            Delete Account
          </button>
        ) : (
          <div className="p-4 rounded-xl border border-rose/20 bg-rose/5 space-y-4 max-w-md">
            <p className="text-sm font-mono text-text-1">
              Type <span className="text-rose font-bold">DELETE</span> to
              confirm:
            </p>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="DELETE"
              className="w-full bg-surface-0 border border-rose/30 rounded-lg px-4 py-2 text-sm font-mono text-text-0 placeholder:text-text-3 outline-none focus:border-rose transition-colors"
            />
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deleteConfirmText.trim() !== "DELETE" || isDeleting}
                className="flex items-center gap-2 px-5 py-2 rounded-lg bg-rose text-white text-sm font-mono hover:bg-rose/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDeleting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Permanently Delete
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteConfirmText("");
                }}
                className="px-4 py-2 rounded-lg border border-stroke bg-surface-1 hover:bg-surface-2 transition-colors text-sm font-mono text-text-2"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </form>
  );
}
