"use client";

import { useState } from "react";
import type { UploadListingMediaResponse } from "@homemall/shared";
import { Button } from "@/components/ui/button";
import { clientApi } from "@/lib/client-api";

interface AccountProfileFormProps {
  email: string;
  displayName?: string;
  avatarUrl?: string;
  contactPhone?: string;
  contactWhatsApp?: string;
  contactInstagram?: string;
  contactFacebook?: string;
}

interface UpdateMeResponse {
  user: {
    id: string;
    email: string;
    role: string;
    createdAt: string;
    displayName?: string;
    avatarUrl?: string;
    contactPhone?: string;
    contactWhatsApp?: string;
    contactInstagram?: string;
    contactFacebook?: string;
  };
}

export function AccountProfileForm({
  email,
  displayName,
  avatarUrl,
  contactPhone,
  contactWhatsApp,
  contactInstagram,
  contactFacebook,
}: AccountProfileFormProps) {
  const maxAvatarUploadSizeBytes = 15 * 1024 * 1024;
  const [name, setName] = useState(displayName ?? "");
  const [avatar, setAvatar] = useState(avatarUrl ?? "");
  const [phone, setPhone] = useState(contactPhone ?? "");
  const [whatsApp, setWhatsApp] = useState(contactWhatsApp ?? "");
  const [instagram, setInstagram] = useState(contactInstagram ?? "");
  const [facebook, setFacebook] = useState(contactFacebook ?? "");
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [currentName, setCurrentName] = useState(displayName ?? "");
  const [currentAvatar, setCurrentAvatar] = useState(avatarUrl ?? "");
  const [currentPhone, setCurrentPhone] = useState(contactPhone ?? "");
  const [currentWhatsApp, setCurrentWhatsApp] = useState(contactWhatsApp ?? "");
  const [currentInstagram, setCurrentInstagram] = useState(contactInstagram ?? "");
  const [currentFacebook, setCurrentFacebook] = useState(contactFacebook ?? "");

  const importAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setFeedback("Only image files are allowed for profile photo.");
      return;
    }

    if (file.size > maxAvatarUploadSizeBytes) {
      setFeedback("Profile image must be 15 MB or smaller.");
      return;
    }

    setUploadingAvatar(true);
    setFeedback(null);

    try {
      const formData = new FormData();
      formData.append("files", file);
      const uploadResponse = await clientApi<UploadListingMediaResponse>(
        "/api/listings/upload",
        {
          method: "POST",
          body: formData,
        },
      );
      const uploadedImage = uploadResponse.files.find((item) =>
        item.mimeType.startsWith("image/"),
      );
      if (!uploadedImage) {
        throw new Error("Upload succeeded but no image URL was returned.");
      }
      setAvatar(uploadedImage.url);
      setFeedback("Image imported. Click Save profile to apply it.");
    } catch (error) {
      setFeedback(
        error instanceof Error ? error.message : "Failed to import profile image.",
      );
    } finally {
      setUploadingAvatar(false);
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setFeedback(null);

    try {
      const payload: Record<string, string> = {};
      const trimmedName = name.trim();
      const trimmedAvatar = avatar.trim();

      if (trimmedName !== (currentName || "")) {
        payload.displayName = trimmedName;
      }
      if (trimmedAvatar !== (currentAvatar || "")) {
        payload.avatarUrl = trimmedAvatar;
      }
      const trimmedPhone = phone.trim();
      if (trimmedPhone !== (currentPhone || "")) {
        payload.contactPhone = trimmedPhone;
      }
      const trimmedWhatsApp = whatsApp.trim();
      if (trimmedWhatsApp !== (currentWhatsApp || "")) {
        payload.contactWhatsApp = trimmedWhatsApp;
      }
      const trimmedInstagram = instagram.trim();
      if (trimmedInstagram !== (currentInstagram || "")) {
        payload.contactInstagram = trimmedInstagram;
      }
      const trimmedFacebook = facebook.trim();
      if (trimmedFacebook !== (currentFacebook || "")) {
        payload.contactFacebook = trimmedFacebook;
      }

      if (!Object.keys(payload).length) {
        throw new Error("No profile changes to save.");
      }

      const response = await clientApi<UpdateMeResponse>("/api/auth/me", {
        method: "PATCH",
        body: JSON.stringify(payload),
      });

      setCurrentName(response.user.displayName ?? "");
      setCurrentAvatar(response.user.avatarUrl ?? "");
      setCurrentPhone(response.user.contactPhone ?? "");
      setCurrentWhatsApp(response.user.contactWhatsApp ?? "");
      setCurrentInstagram(response.user.contactInstagram ?? "");
      setCurrentFacebook(response.user.contactFacebook ?? "");
      setName(response.user.displayName ?? "");
      setAvatar(response.user.avatarUrl ?? "");
      setPhone(response.user.contactPhone ?? "");
      setWhatsApp(response.user.contactWhatsApp ?? "");
      setInstagram(response.user.contactInstagram ?? "");
      setFacebook(response.user.contactFacebook ?? "");
      setFeedback("Profile updated.");
    } catch (error) {
      setFeedback(
        error instanceof Error ? error.message : "Failed to update profile.",
      );
    } finally {
      setSaving(false);
    }
  };

  const initials = (currentName || email)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  const previewAvatar = avatar.trim() || currentAvatar;

  return (
    <form className="mt-4 space-y-3" onSubmit={submit}>
      <div className="flex items-center gap-3">
        {previewAvatar ? (
          <img
            src={previewAvatar}
            alt={currentName || email}
            className="h-14 w-14 rounded-full border border-brand-200 object-cover"
          />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-brand-200 bg-brand-50 text-sm font-semibold text-brand-900">
            {initials}
          </div>
        )}
        <p className="text-sm text-brand-700">{email}</p>
      </div>

      <label className="block text-sm text-brand-800">
        Display name
        <input
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="mt-1 w-full rounded-xl border border-brand-200 px-3 py-2"
          placeholder="Your public name"
        />
      </label>

      <label className="block text-sm text-brand-800">
        Import profile image
        <input
          type="file"
          accept="image/*"
          onChange={importAvatar}
          disabled={uploadingAvatar || saving}
          className="mt-1 block w-full rounded-xl border border-brand-200 bg-white px-3 py-2 text-sm"
        />
        <span className="mt-1 block text-xs text-brand-600">
          {uploadingAvatar
            ? "Uploading image..."
            : "Choose image from your device"}
        </span>
      </label>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="block text-sm text-brand-800">
          Phone
          <input
            type="text"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            className="mt-1 w-full rounded-xl border border-brand-200 px-3 py-2"
            placeholder="+212..."
          />
        </label>

        <label className="block text-sm text-brand-800">
          WhatsApp
          <input
            type="text"
            value={whatsApp}
            onChange={(event) => setWhatsApp(event.target.value)}
            className="mt-1 w-full rounded-xl border border-brand-200 px-3 py-2"
            placeholder="+212..."
          />
        </label>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="block text-sm text-brand-800">
          Instagram
          <input
            type="text"
            value={instagram}
            onChange={(event) => setInstagram(event.target.value)}
            className="mt-1 w-full rounded-xl border border-brand-200 px-3 py-2"
            placeholder="your.handle"
          />
        </label>

        <label className="block text-sm text-brand-800">
          Facebook
          <input
            type="text"
            value={facebook}
            onChange={(event) => setFacebook(event.target.value)}
            className="mt-1 w-full rounded-xl border border-brand-200 px-3 py-2"
            placeholder="profile/page"
          />
        </label>
      </div>

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={saving}>
          {saving ? "Saving..." : "Save profile"}
        </Button>
        {feedback ? <p className="text-sm text-brand-700">{feedback}</p> : null}
      </div>
    </form>
  );
}
